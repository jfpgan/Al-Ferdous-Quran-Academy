/* Applies the website content saved by the Admin Panel.
   Order of sources: (1) content/content.js shipped with the site, (2) the last published content kept in the
   browser cache, (3) the live published content from the database (updates the page when it arrives).
   Inside the Admin Panel's page editor the unsaved draft is applied instead. */
(function () {
  var bn = document.documentElement.lang === 'bn';
  var P = bn ? '../' : '';
  var file = (location.pathname.split('/').pop() || 'index.html');
  if (file.indexOf('.') < 0) file = file + '.html';
  var pageKey = (bn ? 'bn/' : '') + file;
  var A = window.AF_APPLY = { pageKey: pageKey, orig: {}, origImg: {}, origLink: {}, pristine: {}, meta: {} };
  var inAdmin = false, getDraft = null;
  try { if (window.parent && window.parent !== window && window.parent.AF_DRAFT_PREVIEW) { inAdmin = true; getDraft = window.parent.AF_DRAFT_PREVIEW; } } catch (e) {}
  var CACHE = 'af_cms_published_v1';

  function path(p) {
    if (!p) return p;
    if (/^(https?:|data:|\/\/|mailto:|tel:|#)/.test(p)) return p;
    return P + p;
  }
  function norm(c) {
    c = c || {};
    return { text: c.text || {}, images: c.images || {}, links: c.links || {}, social: c.social || {}, videos: c.videos || null,
      theme: c.theme || {}, css: c.css || '', seo: c.seo || {}, lists: c.lists || {}, pages: c.pages || {} };
  }
  function readCache() { try { return JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch (e) { return null; } }
  function writeCache(d) { try { localStorage.setItem(CACHE, JSON.stringify(d)); } catch (e) {} }

  var builtinVideos = window.AF_VIDEOS ? window.AF_VIDEOS.slice() : [];
  var builtinLinks = window.AF_LINKS ? JSON.parse(JSON.stringify(window.AF_LINKS)) : {};

  function applyGlobal(C) {
    if (window.AF_LINKS) {
      for (var k in builtinLinks) window.AF_LINKS[k] = builtinLinks[k];
      for (var s in C.social) if (C.social[s]) window.AF_LINKS[s] = C.social[s];
    }
    if (window.AF_VIDEOS) {
      window.AF_VIDEOS.length = 0;
      var src = Array.isArray(C.videos) ? C.videos : builtinVideos;
      src.forEach(function (v) {
        var o = {}; for (var x in v) o[x] = v[x];
        if (o.thumbnail) o.thumbnail = path(o.thumbnail);
        window.AF_VIDEOS.push(o);
      });
    }
    var css = '', vars = '', t = C.theme;
    for (var n in t) if (n.indexOf('--') === 0 && t[n]) vars += n + ':' + t[n] + ';';
    if (vars) css += ':root{' + vars + '}';
    if (t.fontScale && +t.fontScale !== 100) css += 'html{font-size:' + (16 * t.fontScale / 100) + 'px}';
    if (t.btnRadius != null && t.btnRadius !== '') css += '.btn{border-radius:' + (+t.btnRadius) + 'px!important}';
    if (t.headerBg) css += 'header.site{background:' + t.headerBg + '!important}';
    if (t.footerBg) css += 'footer.site{background:' + t.footerBg + '!important}';
    if (t.pageBg) css += 'body{background:' + t.pageBg + '!important}';
    if (t.textColor) css += 'body{color:' + t.textColor + '!important}';
    if (t.fontFamily) css += 'body,.btn,input,textarea,select{font-family:' + t.fontFamily + '!important}';
    if (t.favicon) { var fi = document.head.querySelector('link[rel="icon"]'); if (!fi) { fi = document.createElement('link'); fi.rel = 'icon'; document.head.appendChild(fi); } fi.href = path(t.favicon); }
    if (C.css) css += C.css;
    var st = document.getElementById('af-content-css');
    if (css) {
      if (!st) { st = document.createElement('style'); st.id = 'af-content-css'; document.head.appendChild(st); }
      st.textContent = css;
    } else if (st) st.textContent = '';
  }

  /* repeated blocks: add / delete / duplicate / reorder / hide (cards, FAQ items, menu items, sections...) */
  function suffix(node, ck) {
    var els = [node].concat([].slice.call(node.querySelectorAll('[data-k],[data-ik],[data-lk],[data-list]')));
    els.forEach(function (e) {
      ['data-k', 'data-ik', 'data-lk', 'data-list'].forEach(function (a) { if (e.hasAttribute && e.hasAttribute(a)) e.setAttribute(a, e.getAttribute(a) + '@' + ck); });
    });
  }
  function itemsOf(c) { return [].slice.call(c.children).filter(function (x) { return x.hasAttribute('data-li'); }); }
  function applyLists(C) {
    var queue = [].slice.call(document.querySelectorAll('[data-list]')).filter(function (c) { return !c.parentElement.closest('[data-list]') || true; });
    var done = [];
    function proc(c) {
      var key = c.getAttribute('data-list');
      if (done.indexOf(c) >= 0) return; done.push(c);
      if (!A.pristine[key]) A.pristine[key] = itemsOf(c).map(function (n) { return n.cloneNode(true); });
      var spec = C.lists[key], pr = A.pristine[key];
      var cur = itemsOf(c);
      var build = null;
      if (spec) {
        build = [];
        spec.forEach(function (en) {
          var src = pr[en.f]; if (!src) return;
          var n = src.cloneNode(true);
          if (en.c) suffix(n, en.c);
          if (en.h) n.setAttribute('data-hidden', '1'); else n.removeAttribute('data-hidden');
          build.push(n);
        });
      } else if (c.__afSpec) {
        build = pr.map(function (s) { return s.cloneNode(true); });
      }
      c.__afSpec = !!spec;
      if (build) {
        var marker = document.createComment('af-list');
        if (cur.length) { cur[0].parentNode.insertBefore(marker, cur[0]); cur.forEach(function (n) { n.remove(); }); } else c.appendChild(marker);
        build.forEach(function (n) { marker.parentNode.insertBefore(n, marker); });
        marker.remove();
      }
      itemsOf(c).forEach(function (n) {
        if (n.getAttribute('data-hidden')) { if (!inAdmin) n.style.display = 'none'; else n.classList.add('af-hidden'); }
        else { n.style.display = ''; n.classList.remove('af-hidden'); }
      });
      [].slice.call(c.querySelectorAll('[data-list]')).forEach(function (x) { if (x !== c) proc(x); });
    }
    queue.forEach(function (c) { if (c.isConnected && !c.parentElement.closest('[data-list]')) proc(c); });
    queue.forEach(function (c) { if (c.isConnected) proc(c); });
  }

  function applyContent(C) {
    var i, els;
    applyGlobal(C);
    applyLists(C);
    els = document.querySelectorAll('[data-k]');
    for (i = 0; i < els.length; i++) {
      var k = els[i].getAttribute('data-k');
      if (!(k in A.orig)) A.orig[k] = els[i].innerHTML;
      var want = C.text[k] != null ? C.text[k] : A.orig[k];
      if (els[i].innerHTML !== want) els[i].innerHTML = want;
    }
    els = document.querySelectorAll('img[data-ik]');
    for (i = 0; i < els.length; i++) {
      var ik = els[i].getAttribute('data-ik');
      if (!(ik in A.origImg)) A.origImg[ik] = els[i].getAttribute('src');
      var wantI = C.images[ik] ? path(C.images[ik]) : A.origImg[ik];
      if (C.images[ik]) els[i].removeAttribute('loading');
      if (els[i].getAttribute('src') !== wantI) els[i].setAttribute('src', wantI);
    }
    els = document.querySelectorAll('a[data-lk]');
    for (i = 0; i < els.length; i++) {
      var lk = els[i].getAttribute('data-lk');
      if (!(lk in A.origLink)) A.origLink[lk] = els[i].getAttribute('href');
      var wantL = C.links[lk] || A.origLink[lk];
      if (els[i].getAttribute('href') !== wantL) els[i].setAttribute('href', wantL);
    }
    applySeo(C);
  }

  function meta(sel, attr, val) {
    var m = document.head.querySelector(sel);
    if (!val) return;
    if (!m) { m = document.createElement(sel.indexOf('link') === 0 ? 'link' : 'meta'); var mm = sel.match(/\[(\w+)="([^"]+)"\]/); m.setAttribute(mm[1], mm[2]); document.head.appendChild(m); }
    m.setAttribute(attr, val);
  }
  function applySeo(C) {
    if (!A.meta.t) A.meta.t = document.title;
    var s = C.seo[pageKey] || {};
    document.title = s.title || A.meta.t;
    if (s.description) { meta('meta[name="description"]', 'content', s.description); meta('meta[property="og:description"]', 'content', s.description); }
    if (s.title) meta('meta[property="og:title"]', 'content', s.title);
    if (s.keywords) meta('meta[name="keywords"]', 'content', s.keywords);
    if (s.ogImage) meta('meta[property="og:image"]', 'content', /^https?:/.test(s.ogImage) ? s.ogImage : new URL(path(s.ogImage), location.href).href);
    if (s.canonical) meta('link[rel="canonical"]', 'href', s.canonical);
  }

  function runAll(C) {
    C = norm(C);
    A.current = C;
    applyContent(C);
    document.dispatchEvent(new Event('af-content'));
    if (window.__afObserve) window.__afObserve(document);
  }
  A.run = runAll;
  A.applyContent = applyContent;

  if (inAdmin) { runAll(getDraft()); return; }

  /* 1+2: shipped content, or the cached published copy (instant), then 3: live from the database */
  var cached = readCache();
  runAll(cached || window.AF_CONTENT);
  if (window.AF_CMS && window.AF_CMS.enabled) {
    window.AF_CMS.fetchPublished().then(function (d) {
      if (!d) return;
      var s = JSON.stringify(d);
      if (cached && JSON.stringify(cached) === s) return;
      writeCache(d); runAll(d);
    }).catch(function () {});
  }
})();
