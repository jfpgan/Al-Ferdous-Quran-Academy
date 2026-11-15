/* Al-Ferdous Academy: Video Gallery (Facebook videos) */
(function () {
  var cfg = window.AF_SITE || {};
  var BN = document.documentElement.lang === 'bn';
  var T = BN ? {
    player: 'ভিডিও প্লেয়ার', close: 'ভিডিও বন্ধ করুন', fb: 'ফেসবুকে দেখুন ↗', hint: 'ভিডিও এখানে চলছে না? ফেসবুকে খুলুন।',
    video: 'ভিডিও', play: 'ভিডিও চালান: ', watch: 'ভিডিও দেখুন →', watchFb: 'ফেসবুকে দেখুন ↗', all: 'সব',
    soon: 'ভিডিও শীঘ্রই আসছে', soonP: 'আমাদের পাঠ ও আপডেট এখানে দেখা যাবে। ততক্ষণ ফেসবুক পেজে আমাদের অনুসরণ করুন।',
    visit: 'আমাদের ফেসবুক পেজে যান', more: 'ফেসবুক পেজে আরও ভিডিও ↗'
  } : {
    player: 'Video player', close: 'Close video', fb: 'Watch on Facebook ↗', hint: 'Video not playing here? Open it on Facebook.',
    video: 'Video', play: 'Play video: ', watch: 'Watch video →', watchFb: 'Watch on Facebook ↗', all: 'All',
    soon: 'Videos are coming soon', soonP: 'Our lessons and updates will appear here. In the meantime, you can follow the academy on Facebook.',
    visit: 'Visit our Facebook Page', more: 'More videos on our Facebook Page ↗'
  };
  function getAll() { return (window.AF_VIDEOS || []).filter(function (v) { return v && v.url && v.title && v.published !== false; }); }
  var all = getAll();

  function info(u) {
    var x;
    try { x = new URL(u); } catch (e) { return { fb: false, embed: false, vertical: false }; }
    var h = x.hostname.replace(/^(www|m|web|mbasic)\./, '');
    var fb = /(^|\.)facebook\.com$/.test(h);
    return { fb: fb, embed: fb, vertical: /\/reel\//.test(x.pathname) };
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- player modal ---------- */
  var modal, frameWrap, mTitle, mDesc, mCat, mLink, lastFocus;
  function buildModal() {
    modal = el('div', 'vmodal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', T.player);
    var box = el('div', 'vbox');
    var close = el('button', 'vclose', '×');
    close.type = 'button';
    close.setAttribute('aria-label', T.close);
    frameWrap = el('div', 'vframe');
    var inf = el('div', 'vinfo');
    mCat = el('span', 'vcat static');
    mTitle = el('h3');
    mDesc = el('p');
    var row = el('div', 'vrow');
    mLink = el('a', 'btn btn-blue btn-sm', T.fb);
    mLink.target = '_blank';
    mLink.rel = 'noopener';
    var hint = el('span', 'vhint', T.hint);
    row.appendChild(mLink); row.appendChild(hint);
    inf.appendChild(mCat); inf.appendChild(mTitle); inf.appendChild(mDesc); inf.appendChild(row);
    box.appendChild(close); box.appendChild(frameWrap); box.appendChild(inf);
    modal.appendChild(box);
    document.body.appendChild(modal);
    close.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
  }
  function openModal(v) {
    if (!modal) buildModal();
    lastFocus = document.activeElement;
    var i = info(v.url);
    frameWrap.innerHTML = '';
    var vw = Math.min(window.innerWidth * 0.92, 860);
    var w, h;
    if (i.vertical) { h = Math.min(window.innerHeight * 0.62, 600); w = Math.round(h * 9 / 16); }
    else { w = Math.round(vw - 6); h = Math.round(w * 9 / 16); }
    var f = document.createElement('iframe');
    f.src = 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(v.url) +
      '&show_text=false&autoplay=true&width=' + w + '&height=' + h;
    f.width = w; f.height = h;
    f.title = v.title;
    f.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen');
    f.setAttribute('allowfullscreen', 'true');
    f.setAttribute('scrolling', 'no');
    frameWrap.appendChild(f);
    mCat.textContent = v.category || T.video;
    mTitle.textContent = v.title;
    mDesc.textContent = v.description || '';
    mDesc.style.display = v.description ? '' : 'none';
    mLink.href = v.url;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    modal.querySelector('.vclose').focus();
  }
  function closeModal() {
    modal.classList.remove('open');
    frameWrap.innerHTML = '';   // stops playback
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- cards ---------- */
  function card(v) {
    var i = info(v.url);
    var canEmbed = i.embed && v.embed !== false;
    var c = canEmbed ? el('article', 'card vcard') : el('a', 'card vcard');
    if (canEmbed) {
      c.tabIndex = 0;
      c.setAttribute('role', 'button');
      c.setAttribute('aria-label', T.play + v.title);
      c.addEventListener('click', function () { openModal(v); });
      c.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(v); }
      });
    } else {
      c.href = v.url; c.target = '_blank'; c.rel = 'noopener';
    }
    var t = el('div', 'vthumb' + (v.thumbnail ? '' : ' ph'));
    if (v.thumbnail) {
      var img = document.createElement('img');
      img.src = v.thumbnail; img.alt = ''; img.loading = 'lazy';
      img.onerror = function () { t.classList.add('ph'); img.remove(); };
      t.appendChild(img);
    } else {
      t.appendChild(el('i', 'geo'));
      if (canEmbed && v.preview !== false) {
        /* Facebook's own player shows the video's first picture (poster); we use it as the card thumbnail. */
        t.classList.add('reel');
        var pf = document.createElement('iframe');
        pf.className = 'vprev';
        pf.src = 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(v.url) +
          '&show_text=false&autoplay=false&mute=1&width=450&height=800';
        pf.width = 450; pf.height = 800;
        pf.loading = 'lazy'; pf.tabIndex = -1;
        pf.setAttribute('aria-hidden', 'true');
        pf.setAttribute('scrolling', 'no');
        pf.setAttribute('title', '');
        pf.addEventListener('load', function () { pf.classList.add('on'); });
        t.appendChild(pf);
        var fit = function () { var w = t.clientWidth; if (w) pf.style.transform = 'translate(-50%,-50%) scale(' + (w / 450) * (v.zoom || 1) + ')'; };
        fit();
        window.addEventListener('resize', fit);
        if (window.ResizeObserver) new ResizeObserver(fit).observe(t);
      }
    }
    t.appendChild(el('span', 'vcat', v.category || T.video));
    t.appendChild(el('span', 'vplay'));
    var b = el('div', 'vbody');
    b.appendChild(el('h3', null, v.title));
    if (v.description) b.appendChild(el('p', null, v.description));
    b.appendChild(el('span', 'vwatch', canEmbed ? T.watch : T.watchFb));
    c.appendChild(t); c.appendChild(b);
    return c;
  }

  function cats(list) {
    var seen = [];
    list.forEach(function (v) { var c = v.category || T.video; if (seen.indexOf(c) < 0) seen.push(c); });
    return seen;
  }

  function render(root) {
    var limit = parseInt(root.getAttribute('data-limit'), 10) || 0;
    var showTabs = root.getAttribute('data-tabs') !== 'off';
    root.innerHTML = '';
    var list = limit ? all.slice(0, limit) : all.slice();
    if (!list.length) {
      var sec = document.getElementById('video-section');
      if (sec && root.hasAttribute('data-hide-empty')) { sec.style.display = 'none'; return; }
      var e = el('div', 'v-empty');
      e.appendChild(el('h3', null, T.soon));
      e.appendChild(el('p', null, T.soonP));
      if (cfg.facebookPage) {
        var a = el('a', 'btn btn-blue', T.visit);
        a.href = cfg.facebookPage; a.target = '_blank'; a.rel = 'noopener';
        e.appendChild(a);
      }
      root.appendChild(e);
      return;
    }
    var grid = el('div', 'vgrid');
    function draw(cat) {
      grid.innerHTML = '';
      list.filter(function (v) { return cat === T.all || (v.category || T.video) === cat; })
        .forEach(function (v) { grid.appendChild(card(v)); });
      if (window.__afObserve) window.__afObserve(grid);
    }
    var cs = cats(list);
    if (showTabs && cs.length > 1) {
      var tabs = el('div', 'vtabs');
      [T.all].concat(cs).forEach(function (name, idx) {
        var b = el('button', 'vtab' + (idx === 0 ? ' on' : ''), name);
        b.type = 'button';
        b.addEventListener('click', function () {
          tabs.querySelectorAll('.vtab').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          draw(name);
        });
        tabs.appendChild(b);
      });
      root.appendChild(tabs);
    }
    root.appendChild(grid);
    draw(T.all);
    if (cfg.facebookPage) {
      var more = el('p', 'center vmore');
      var fa = el('a', 'btn btn-line', T.more);
      fa.href = cfg.facebookPage; fa.target = '_blank'; fa.rel = 'noopener';
      more.appendChild(fa); root.appendChild(more);
    }
  }

  document.querySelectorAll('[data-video-gallery]').forEach(render);
  /* content from the CMS arrived or changed: draw the gallery again */
  document.addEventListener('af-content', function () {
    all = getAll();
    document.querySelectorAll('[data-video-gallery]').forEach(render);
  });
})();
