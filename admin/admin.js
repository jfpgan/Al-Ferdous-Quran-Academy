/* Al-Ferdous Admin Panel. Talks to Supabase (Auth, Database, Storage) with plain fetch(). No secrets here. */
(function () {
  'use strict';
  var CFG = window.AF_CMS_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  function h(tag, attrs, kids) {
    var n = document.createElement(tag);
    for (var k in (attrs || {})) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k]);
    }
    [].concat(kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  var BASE = (CFG.url || '').replace(/\/+$/, '');
  function toast(msg, bad) {
    var t = $('#toast'); t.textContent = msg; t.className = 'toast' + (bad ? ' bad' : ''); t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, bad ? 6000 : 3000);
  }
  function show(id) { ['setup', 'login', 'app'].forEach(function (x) { $('#' + x).hidden = x !== id; }); }

  if (!CFG.url || !CFG.anonKey) { show('setup'); return; }

  /* ================= Supabase session (Auth) ================= */
  var SKEY = 'af_admin_session_v1', sess = null, idleTimer = null;
  function loadSess() { try { sess = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { sess = null; } }
  function saveSess(s) {
    sess = s ? { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || (Math.floor(Date.now() / 1000) + (s.expires_in || 3600)), email: (s.user && s.user.email) || (sess && sess.email) } : null;
    try { if (sess) localStorage.setItem(SKEY, JSON.stringify(sess)); else localStorage.removeItem(SKEY); } catch (e) {}
  }
  function authFetch(path, body, token, method) {
    return fetch(BASE + '/auth/v1/' + path, {
      method: method || 'POST',
      headers: Object.assign({ apikey: CFG.anonKey, 'Content-Type': 'application/json' }, (token || /^eyJ/.test(CFG.anonKey)) ? { Authorization: 'Bearer ' + (token || CFG.anonKey) } : {}),
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error_description || j.msg || j.message || ('HTTP ' + r.status)); return j; }); });
  }
  function refresh() {
    if (!sess || !sess.refresh_token) return Promise.reject(new Error('no session'));
    return authFetch('token?grant_type=refresh_token', { refresh_token: sess.refresh_token }).then(function (j) { saveSess(j); return sess; });
  }
  function token() {
    if (!sess) return Promise.reject(new Error('not logged in'));
    if (sess.expires_at - 60 < Date.now() / 1000) return refresh().then(function () { return sess.access_token; });
    return Promise.resolve(sess.access_token);
  }
  function api(path, opt) {
    opt = opt || {};
    return token().then(function (t) {
      var hd = { apikey: CFG.anonKey, Authorization: 'Bearer ' + t };
      for (var k in (opt.headers || {})) hd[k] = opt.headers[k];
      if (opt.json !== undefined) { hd['Content-Type'] = 'application/json'; opt.body = JSON.stringify(opt.json); }
      return fetch(BASE + path, { method: opt.method || 'GET', headers: hd, body: opt.body }).then(function (r) {
        if (r.status === 401) { saveSess(null); location.reload(); throw new Error('session expired'); }
        return r.text().then(function (txt) {
          var j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { j = txt; }
          if (!r.ok) throw new Error((j && (j.message || j.error || j.msg)) || ('HTTP ' + r.status));
          return { data: j, headers: r.headers };
        });
      });
    });
  }
  var rest = function (p, o) { return api('/rest/v1/' + p, o).then(function (x) { return x.data; }); };

  /* ================= state ================= */
  var D = null;            // the draft content being edited
  var savedJson = '', publishedJson = '', dirty = false, lastPublishedAt = null;
  function blank() { return { text: {}, images: {}, links: {}, social: {}, videos: null, theme: {}, css: '', seo: {}, lists: {}, pages: {} }; }
  function fill(d) { var b = blank(); for (var k in (d || {})) b[k] = d[k]; return b; }
  window.AF_DRAFT_PREVIEW = function () { return D; };
  function markDirty() {
    dirty = JSON.stringify(D) !== savedJson;
    $('#status').className = 'status' + (dirty ? ' dirty' : '');
    $('#stxt').textContent = dirty ? 'অসেভ করা পরিবর্তন আছে' : (publishedJson === savedJson ? 'সব প্রকাশিত' : 'খসড়া সেভ আছে, এখনো প্রকাশ হয়নি');
    $('#bSave').disabled = !dirty;
  }
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ================= login ================= */
  $('#lforgot').addEventListener('click', function (e) {
    e.preventDefault();
    var em = $('#lem').value.trim();
    if (!em) { $('#lerr').textContent = 'আগে ইমেইল লিখুন, তারপর এখানে চাপুন।'; return; }
    authFetch('recover?redirect_to=' + encodeURIComponent(location.href.split('#')[0]), { email: em })
      .then(function () { $('#lerr').style.color = '#16723e'; $('#lerr').textContent = 'পাসওয়ার্ড রিসেটের লিংক ইমেইলে পাঠানো হয়েছে।'; })
      .catch(function (er) { $('#lerr').style.color = ''; $('#lerr').textContent = er.message; });
  });
  $('#lform').addEventListener('submit', function (e) {
    e.preventDefault();
    var b = $('#lbtn'); b.disabled = true; $('#lerr').style.color = ''; $('#lerr').textContent = '';
    authFetch('token?grant_type=password', { email: $('#lem').value.trim(), password: $('#lpw').value })
      .then(function (j) { saveSess(j); return boot(); })
      .catch(function (er) { $('#lerr').textContent = /invalid/i.test(er.message) ? 'ইমেইল বা পাসওয়ার্ড ভুল।' : er.message; })
      .then(function () { b.disabled = false; });
  });
  $('#rform').addEventListener('submit', function (e) {
    e.preventDefault();
    var p1 = $('#rp1').value, p2 = $('#rp2').value;
    if (p1.length < 10) { $('#rerr').textContent = 'পাসওয়ার্ড কমপক্ষে ১০ অক্ষর হতে হবে।'; return; }
    if (p1 !== p2) { $('#rerr').textContent = 'দুটি পাসওয়ার্ড মেলেনি।'; return; }
    authFetch('user', { password: p1 }, recoveryToken, 'PUT').then(function () {
      history.replaceState(null, '', location.pathname); recoveryToken = null;
      $('#rform').hidden = true; $('#lform').hidden = false; $('#lerr').style.color = '#16723e'; $('#lerr').textContent = 'পাসওয়ার্ড বদলেছে। এখন লগইন করুন।';
    }).catch(function (er) { $('#rerr').textContent = er.message; });
  });
  $('#bOut').addEventListener('click', logout);
  function logout() {
    var t = sess && sess.access_token;
    (t ? authFetch('logout', null, t).catch(function () {}) : Promise.resolve()).then(function () { saveSess(null); location.reload(); });
  }
  function idleReset() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { toast('নিষ্ক্রিয়তার কারণে লগআউট হচ্ছে…', true); setTimeout(logout, 1500); }, 60 * 60 * 1000);
  }
  ['click', 'keydown', 'mousemove'].forEach(function (ev) { document.addEventListener(ev, idleReset, { passive: true }); });

  var recoveryToken = null;
  (function () {
    var m = (location.hash || '').match(/access_token=([^&]+).*type=recovery|type=recovery.*access_token=([^&]+)/);
    if (m) { recoveryToken = decodeURIComponent(m[1] || m[2]); show('login'); $('#lform').hidden = true; $('#rform').hidden = false; }
  })();

  /* ================= boot ================= */
  function boot() {
    loadSess();
    if (!sess) { show('login'); return Promise.resolve(); }
    return rest('rpc/is_admin', { method: 'POST', json: {} }).then(function (ok) {
      if (ok !== true) { toast('এই ইমেইলের অ্যাডমিন অনুমতি নেই।', true); return logout(); }
      return Promise.all([
        rest('site_content?select=id,data,updated_at').catch(function () { return []; })
      ]).then(function (r) {
        var rows = r[0] || [], pub = null, dr = null;
        rows.forEach(function (x) { if (x.id === 'published') { pub = x; } if (x.id === 'draft') { dr = x; } });
        lastPublishedAt = pub && pub.updated_at;
        var pubData = (pub && pub.data && Object.keys(pub.data).length) ? pub.data : null;
        var drData = (dr && dr.data && Object.keys(dr.data).length) ? dr.data : pubData;
        D = fill(drData);
        savedJson = JSON.stringify(D);
        publishedJson = JSON.stringify(fill(pubData));
        show('app');
        wire(); markDirty(); go('dash');
        idleReset();
      });
    }).catch(function (er) {
      if (/session|not logged/.test(er.message)) { show('login'); return; }
      show('login'); $('#lerr').textContent = 'লোড করা যায়নি: ' + er.message;
    });
  }

  /* ================= save / publish ================= */
  function email() { return (sess && sess.email) || ''; }
  function saveDraft(silent) {
    return rest('site_content?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      json: { id: 'draft', data: D, updated_at: new Date().toISOString(), updated_by: email() } })
      .then(function () { savedJson = JSON.stringify(D); markDirty(); if (!silent) toast('খসড়া সেভ হয়েছে ✓'); })
      .catch(function (er) { toast('সেভ হয়নি: ' + er.message, true); throw er; });
  }
  function publish() {
    if (!confirm('এই পরিবর্তনগুলো লাইভ ওয়েবসাইটে প্রকাশ করবেন?')) return;
    var label = prompt('এই ভার্সনের একটি ছোট নাম দিন (ঐচ্ছিক):', '') || '';
    var snap = JSON.parse(JSON.stringify(D));
    saveDraft(true).then(function () {
      return rest('site_content?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        json: { id: 'published', data: snap, updated_at: new Date().toISOString(), updated_by: email() } });
    }).then(function () {
      return rest('content_versions', { method: 'POST', headers: { Prefer: 'return=minimal' }, json: { data: snap, label: label || null, created_by: email() } });
    }).then(function () {
      publishedJson = JSON.stringify(fill(snap)); lastPublishedAt = new Date().toISOString(); markDirty();
      toast('প্রকাশিত হয়েছে ✓ লাইভ সাইটে কয়েক সেকেন্ডের মধ্যে দেখা যাবে।');
      if (view === 'dash') go('dash');
    }).catch(function (er) { toast('প্রকাশ হয়নি: ' + er.message, true); });
  }
  $('#bSave').addEventListener('click', function () { saveDraft(); });
  $('#bPub').addEventListener('click', publish);

  /* ================= navigation ================= */
  var view = '';
  function wire() {
    if (wire.done) return; wire.done = true;
    $$('#nav button').forEach(function (b) { b.addEventListener('click', function () { go(b.getAttribute('data-v')); }); });
    initEditor();
  }
  function go(v) {
    view = v;
    $$('#nav button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === v); });
    var ed = ['page', 'videos', 'social', 'design'].indexOf(v) >= 0;
    $('#editor').hidden = !ed; $('#wide').hidden = ed;
    if (ed) {
      $$('.pane').forEach(function (p) { p.hidden = p.id !== 'p-' + v; });
      if (v === 'videos') { pgSel.value = 'video-gallery.html'; loadFrame(); renderVideos(); }
      else if (!frameLoaded) loadFrame();
      if (v === 'social') fillSocial();
      if (v === 'design') fillDesign();
    } else {
      var w = $('#wide'); w.innerHTML = '';
      (WIDE[v] || function () {})(w);
    }
  }
  var WIDE = {};
  window.__AF = { h: h, $: $, $$: $$, rest: rest, api: api, toast: toast, go: go, WIDE: WIDE, getD: function () { return D; }, setD: function (d) { D = fill(d); markDirty(); },
    markDirty: markDirty, saveDraft: saveDraft, publish: publish, getPub: function () { return { at: lastPublishedAt, json: publishedJson, saved: savedJson }; },
    email: email, base: BASE, cfg: CFG, token: token, refreshFrame: function () { loadFrame(true); }, uploadImage: null };

  /* ================= images -> Supabase Storage ================= */
  function slug(s) { return (s || 'image').toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'image'; }
  function shrink(file, max) {
    return new Promise(function (res, rej) {
      if (/svg|gif|icon/.test(file.type)) { res({ blob: file, ext: (file.name.match(/\.[a-z0-9]+$/i) || ['.png'])[0].toLowerCase() }); return; }
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var k = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var png = /png|webp/.test(file.type);
        c.toBlob(function (b) { URL.revokeObjectURL(u); b ? res({ blob: b, ext: png ? '.png' : '.jpg' }) : rej(new Error('ছবি প্রসেস হয়নি')); }, png ? 'image/png' : 'image/jpeg', 0.88);
      };
      img.onerror = function () { rej(new Error('এটি ছবি নয়')); };
      img.src = u;
    });
  }
  function upload(file, max) {
    if (!file) return Promise.reject(new Error('no file'));
    return shrink(file, max || 1600).then(function (r) {
      if (r.blob.size > 5 * 1024 * 1024) throw new Error('ছবি ৫ MB-এর বেশি। ছোট ছবি দিন।');
      var path = 'uploads/' + Date.now().toString(36) + '-' + slug(file.name) + r.ext;
      return token().then(function (t) {
        return fetch(BASE + '/storage/v1/object/media/' + path, { method: 'POST',
          headers: { apikey: CFG.anonKey, Authorization: 'Bearer ' + t, 'Content-Type': r.blob.type || 'application/octet-stream', 'x-upsert': 'true', 'cache-control': 'max-age=31536000' }, body: r.blob });
      }).then(function (resp) { return resp.json().catch(function () { return {}; }).then(function (j) { if (!resp.ok) throw new Error(j.message || j.error || ('আপলোড ব্যর্থ HTTP ' + resp.status)); return window.AF_CMS.publicUrl(path); }); });
    });
  }
  window.__AF.uploadImage = upload;
  function pickImage(max) {
    return new Promise(function (res, rej) {
      var inp = $('#imgPick'); inp.value = '';
      inp.onchange = function () { var f = inp.files[0]; if (!f) return; toast('আপলোড হচ্ছে…'); upload(f, max).then(function (u) { toast('ছবি আপলোড হয়েছে ✓'); res(u); }).catch(function (e) { toast(e.message, true); rej(e); }); };
      inp.click();
    });
  }
  window.__AF.pickImage = pickImage;

  /* ================= page editor (iframe) ================= */
  var frame = $('#frame'), pgSel = $('#pgSel'), lang = 'en', frameLoaded = false, fwin = null, fdoc = null;
  var PAGES = [['index.html', 'হোম'], ['about.html', 'আমাদের সম্পর্কে'], ['courses.html', 'কোর্সসমূহ'], ['why-us.html', 'কেন আমরা'], ['teachers.html', 'শিক্ষকবৃন্দ'],
    ['video-gallery.html', 'ভিডিও গ্যালারি'], ['faq.html', 'প্রশ্নোত্তর'], ['contact.html', 'যোগাযোগ'], ['free-trial.html', 'ফ্রি ট্রায়াল'],
    ['learning-journey.html', 'শিক্ষাযাত্রা'], ['worldwide.html', 'বিশ্বজুড়ে'], ['careers.html', 'ক্যারিয়ার']];
  function initEditor() {
    PAGES.forEach(function (p) { pgSel.appendChild(h('option', { value: p[0], text: p[1] + ' (' + p[0] + ')' })); });
    pgSel.addEventListener('change', function () { loadFrame(); });
    $$('#langSeg button').forEach(function (b) { b.addEventListener('click', function () { lang = b.getAttribute('data-l'); $$('#langSeg button').forEach(function (x) { x.classList.toggle('on', x === b); }); loadFrame(); }); });
    $$('#devSeg button').forEach(function (b) { b.addEventListener('click', function () { $$('#devSeg button').forEach(function (x) { x.classList.toggle('on', x === b); }); frame.style.width = b.getAttribute('data-w'); }); });
    $('#reload').addEventListener('click', function () { loadFrame(); });
    frame.addEventListener('load', onFrame);
    $('#txtSearch').addEventListener('input', renderTexts);
    initSocial(); initDesign();
  }
  function loadFrame() { frameLoaded = true; frame.src = '../' + (lang === 'bn' ? 'bn/' : '') + pgSel.value + '?_=' + Date.now(); }
  function pageKey() { return (lang === 'bn' ? 'bn/' : '') + pgSel.value; }
  var EDITCSS = '[data-k]{transition:outline-color .15s}[data-k]:hover{outline:2px dashed #f28c18;outline-offset:2px;cursor:text}[data-k]:focus{outline:2px solid #0b57b8;outline-offset:2px}' +
    'img[data-ik]{cursor:pointer}img[data-ik]:hover{outline:3px solid #f28c18;outline-offset:2px}.reveal{opacity:1!important;transform:none!important}' +
    '.af-hidden{opacity:.35;outline:2px dashed #888}#af-bar{position:absolute;z-index:99999;display:none;background:#0a3a82;border-radius:9px;padding:3px;box-shadow:0 6px 18px rgba(0,0,0,.35);font:12px sans-serif}' +
    '#af-bar button{background:transparent;color:#fff;border:0;padding:4px 8px;cursor:pointer;font-size:14px;border-radius:6px}#af-bar button:hover{background:#f28c18}#af-bar span{color:#cfe0ff;padding:0 6px;font-size:11px}';
  function onFrame() {
    try { fwin = frame.contentWindow; fdoc = frame.contentDocument; fdoc.body; } catch (e) { toast('প্রিভিউ খোলা যায়নি। অ্যাডমিন প্যানেলটি আপনার সাইটের https ঠিকানা থেকে খুলুন।', true); return; }
    if (!fwin.AF_APPLY) { setTimeout(onFrame, 150); return; }
    var st = fdoc.createElement('style'); st.id = 'af-edit-css'; st.textContent = EDITCSS; fdoc.head.appendChild(st);
    var bar = fdoc.createElement('div'); bar.id = 'af-bar'; fdoc.body.appendChild(bar);
    prep();
    fdoc.addEventListener('input', onInput, true);
    fdoc.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.closest && e.target.closest('[data-k]')) { e.preventDefault(); fdoc.execCommand('insertLineBreak'); } }, true);
    fdoc.addEventListener('paste', function (e) { if (e.target.closest && e.target.closest('[data-k]')) { e.preventDefault(); fdoc.execCommand('insertText', false, (e.clipboardData || fwin.clipboardData).getData('text')); } }, true);
    fdoc.addEventListener('click', function (e) {
      var img = e.target.closest && e.target.closest('img[data-ik]');
      if (img) { e.preventDefault(); e.stopPropagation(); changeImage(img.getAttribute('data-ik')); return; }
      var a = e.target.closest && e.target.closest('a'); if (a) e.preventDefault();
    }, true);
    fdoc.addEventListener('submit', function (e) { e.preventDefault(); }, true);
    fdoc.addEventListener('mouseover', function (e) { hoverItem(e.target); }, true);
    renderPanel();
  }
  function prep() {
    $$('[data-k]', fdoc).forEach(function (el) { el.setAttribute('contenteditable', 'true'); el.setAttribute('spellcheck', 'false'); });
  }
  function onInput(e) {
    var el = e.target.closest && e.target.closest('[data-k]'); if (!el) return;
    setText(el.getAttribute('data-k'), el.innerHTML.replace(/<br\s*\/?>\s*$/i, ''), el);
  }
  function setText(k, html, from) {
    var orig = fwin.AF_APPLY.orig[k];
    if (html === orig) delete D.text[k]; else D.text[k] = html;
    $$('[data-k="' + k + '"]', fdoc).forEach(function (o) { if (o !== from && o.innerHTML !== html) o.innerHTML = html; });
    markDirty();
  }
  function setImage(ik, url) {
    if (url) D.images[ik] = url; else delete D.images[ik];
    fwin.AF_APPLY.run(D); prep(); markDirty(); renderPanel();
  }
  function changeImage(ik) { pickImage(1600).then(function (u) { setImage(ik, u); }).catch(function () {}); }

  /* ----- hover toolbar for repeated blocks ----- */
  var curItem = null;
  function hoverItem(t) {
    var bar = fdoc.getElementById('af-bar');
    if (bar.contains(t)) return;
    var it = t.closest && t.closest('[data-li]');
    if (!it || !it.parentElement.hasAttribute('data-list')) { return; }
    if (it === curItem) return;
    curItem = it;
    var r = it.getBoundingClientRect();
    bar.innerHTML = '';
    var small = it.tagName === 'SECTION' ? 'সেকশন' : 'আইটেম';
    bar.appendChild(h('span', { text: small }));
    [['↑', 'উপরে', 'up'], ['↓', 'নিচে', 'down'], ['⧉', 'কপি', 'dup'], [it.getAttribute('data-hidden') ? '👁' : '🙈', 'লুকান/দেখান', 'hide'], ['✕', 'মুছুন', 'del']].forEach(function (b) {
      var bt = fdoc.createElement('button'); bt.textContent = b[0]; bt.title = b[1];
      bt.addEventListener('mousedown', function (ev) { ev.preventDefault(); ev.stopPropagation(); listOp(it, b[2]); bar.style.display = 'none'; curItem = null; });
      bar.appendChild(bt);
    });
    bar.style.display = 'block';
    bar.style.top = (fwin.scrollY + Math.max(r.top, 0) + 4) + 'px';
    bar.style.left = Math.max(fwin.scrollX + r.right - 190, fwin.scrollX + 4) + 'px';
  }
  function specOf(cont) {
    var key = cont.getAttribute('data-list');
    if (!D.lists[key]) { var n = (fwin.AF_APPLY.pristine[key] || []).length; D.lists[key] = []; for (var i = 0; i < n; i++) D.lists[key].push({ f: i, c: '', h: 0 }); }
    return D.lists[key];
  }
  function listOp(item, op) {
    var cont = item.parentElement, spec = specOf(cont), key = cont.getAttribute('data-list');
    var items = [].slice.call(cont.children).filter(function (x) { return x.hasAttribute('data-li'); });
    var i = items.indexOf(item); if (i < 0 || !spec[i]) return;
    if (op === 'up' && i > 0) { var a = spec[i]; spec[i] = spec[i - 1]; spec[i - 1] = a; }
    else if (op === 'down' && i < spec.length - 1) { var b = spec[i]; spec[i] = spec[i + 1]; spec[i + 1] = b; }
    else if (op === 'hide') spec[i].h = spec[i].h ? 0 : 1;
    else if (op === 'del') { if (!confirm('এই আইটেমটি মুছে ফেলবেন? (প্রকাশের আগে ফেরানো যাবে: “ডিজাইন/ভার্সন ইতিহাস” থেকে)')) return; spec.splice(i, 1); }
    else if (op === 'dup') {
      var ck = 'c' + Date.now().toString(36) + Math.floor(Math.random() * 99);
      spec.splice(i + 1, 0, { f: spec[i].f, c: ck, h: 0 });
      $$('[data-k]', item).concat(item.hasAttribute('data-k') ? [item] : []).forEach(function (e) { D.text[e.getAttribute('data-k').split('@')[0] + '@' + ck] = e.innerHTML; });
      $$('img[data-ik]', item).forEach(function (e) { var base = e.getAttribute('data-ik').split('@')[0]; if (D.images[e.getAttribute('data-ik')]) D.images[base + '@' + ck] = D.images[e.getAttribute('data-ik')]; });
      $$('a[data-lk]', item).forEach(function (e) { var base = e.getAttribute('data-lk').split('@')[0]; if (D.links[e.getAttribute('data-lk')]) D.links[base + '@' + ck] = D.links[e.getAttribute('data-lk')]; });
    }
    var restoreScroll = fwin.scrollY;
    fwin.AF_APPLY.run(D); prep(); fwin.scrollTo(0, restoreScroll); markDirty(); renderPanel();
  }

  /* ----- side panel for the current page ----- */
  function renderPanel() { if (!fdoc) return; renderSeo(); renderSections(); renderImages(); renderLinks(); renderTexts(); }
  function renderSeo() {
    var box = $('#seoBox'); box.innerHTML = ''; var k = pageKey(), s = D.seo[k] = D.seo[k] || {};
    function f(label, name, ta) {
      var inp = h(ta ? 'textarea' : 'input', { rows: ta ? 3 : undefined });
      inp.value = s[name] || '';
      inp.addEventListener('input', function () { if (inp.value) s[name] = inp.value; else delete s[name]; if (!Object.keys(s).length) delete D.seo[k]; fwin.AF_APPLY.run(D); prep(); markDirty(); });
      box.appendChild(h('label', { text: label })); box.appendChild(inp);
    }
    f('SEO শিরোনাম (ব্রাউজার ট্যাব ও গুগল)', 'title'); f('মেটা বর্ণনা', 'description', true); f('কীওয়ার্ড (কমা দিয়ে)', 'keywords'); f('ক্যানোনিকাল URL', 'canonical');
    var og = h('input'); og.value = s.ogImage || ''; og.placeholder = 'শেয়ারিং ছবির লিংক বা আপলোড';
    og.addEventListener('input', function () { if (og.value) s.ogImage = og.value; else delete s.ogImage; markDirty(); });
    box.appendChild(h('label', { text: 'সোশ্যাল শেয়ার (OG) ছবি' })); box.appendChild(og);
    box.appendChild(h('button', { class: 'btn sm ghost', text: 'ছবি আপলোড', onclick: function () { pickImage(1600).then(function (u) { og.value = u; s.ogImage = u; markDirty(); }).catch(function () {}); } }));
  }
  function secLabel(sec) {
    var e = sec.querySelector('h1,h2,h3,.kicker') ; return (e ? e.textContent : sec.className || 'সেকশন').trim().slice(0, 50);
  }
  function renderSections() {
    var box = $('#secList'); box.innerHTML = '';
    var body = $$('body[data-list]', fdoc)[0]; if (!body) { $('#nSec').textContent = '(0)'; return; }
    var items = [].slice.call(body.children).filter(function (x) { return x.hasAttribute('data-li'); });
    $('#nSec').textContent = '(' + items.length + ')';
    items.forEach(function (sec) {
      var hid = !!sec.getAttribute('data-hidden');
      box.appendChild(h('div', { class: 'row' }, [h('div', { class: 'g' }, [h('b', { text: secLabel(sec) }), hid ? h('small', { text: 'লুকানো' }) : null]),
        h('button', { class: 'btn sm ghost', title: 'উপরে', text: '↑', onclick: function () { listOp(sec, 'up'); } }),
        h('button', { class: 'btn sm ghost', title: 'নিচে', text: '↓', onclick: function () { listOp(sec, 'down'); } }),
        h('button', { class: 'btn sm ghost', title: 'কপি', text: '⧉', onclick: function () { listOp(sec, 'dup'); } }),
        h('button', { class: 'btn sm ghost', title: 'লুকান/দেখান', text: hid ? 'দেখান' : 'লুকান', onclick: function () { listOp(sec, 'hide'); } }),
        h('button', { class: 'btn sm red', title: 'মুছুন', text: '✕', onclick: function () { listOp(sec, 'del'); } })]));
    });
  }
  function uniq(list, keyFn) { var seen = {}, out = []; list.forEach(function (x) { var k = keyFn(x); if (!seen[k]) { seen[k] = 1; out.push(x); } }); return out; }
  function renderImages() {
    var box = $('#imgList'); box.innerHTML = '';
    var imgs = uniq($$('img[data-ik]', fdoc), function (i) { return i.getAttribute('data-ik'); });
    $('#nImg').textContent = '(' + imgs.length + ')';
    imgs.forEach(function (im) {
      var ik = im.getAttribute('data-ik');
      box.appendChild(h('div', { class: 'row' }, [h('img', { src: im.src, alt: '' }),
        h('div', { class: 'g' }, [h('b', { text: (im.getAttribute('alt') || ik) }), h('small', { text: D.images[ik] ? 'নতুন ছবি' : 'মূল ছবি' })]),
        h('button', { class: 'btn sm ghost', text: 'বদলান', onclick: function () { changeImage(ik); } }),
        D.images[ik] ? h('button', { class: 'btn sm red', text: 'মূল', onclick: function () { setImage(ik, null); } }) : null]));
    });
  }
  function renderLinks() {
    var box = $('#lnkList'); box.innerHTML = '';
    var as = uniq($$('a[data-lk]', fdoc), function (a) { return a.getAttribute('data-lk'); });
    $('#nLnk').textContent = '(' + as.length + ')';
    as.forEach(function (a) {
      var lk = a.getAttribute('data-lk'), orig = fwin.AF_APPLY.origLink[lk];
      var inp = h('input'); inp.value = D.links[lk] || orig || '';
      inp.addEventListener('input', function () { if (!inp.value || inp.value === orig) delete D.links[lk]; else D.links[lk] = inp.value; $$('a[data-lk="' + lk + '"]', fdoc).forEach(function (x) { x.setAttribute('href', inp.value || orig); }); markDirty(); });
      box.appendChild(h('div', { class: 'txt' }, [h('small', { text: (a.textContent || a.getAttribute('aria-label') || '(আইকন)').trim().slice(0, 40) }), inp]));
    });
  }
  function renderTexts() {
    var box = $('#txtList'); box.innerHTML = ''; var q = ($('#txtSearch').value || '').toLowerCase();
    var els = uniq($$('[data-k]', fdoc), function (e) { return e.getAttribute('data-k'); }).filter(function (e) { return !/<svg|<img/.test(fwin.AF_APPLY.orig[e.getAttribute('data-k')] || ''); });
    $('#nTxt').textContent = '(' + els.length + ')';
    els.slice(0, 400).forEach(function (e) {
      var k = e.getAttribute('data-k'), cur = D.text[k] != null ? D.text[k] : fwin.AF_APPLY.orig[k];
      if (q && cur.toLowerCase().indexOf(q) < 0) return;
      var ta = h('textarea', { rows: Math.min(5, Math.ceil(cur.length / 38) || 1) }); ta.value = cur;
      ta.addEventListener('input', function () { setText(k, ta.value); });
      box.appendChild(h('div', { class: 'txt' }, [ta]));
    });
  }

  /* ----- videos ----- */
  var V = null;
  function vlist() { if (!V) V = D.videos ? JSON.parse(JSON.stringify(D.videos)) : JSON.parse(JSON.stringify(window.AF_VIDEOS || [])); return V; }
  function vcommit() { D.videos = JSON.parse(JSON.stringify(V)); markDirty(); clearTimeout(vcommit.t); vcommit.t = setTimeout(function () { if (fwin && fwin.AF_APPLY) { fwin.AF_APPLY.run(D); prep(); } }, 500); }
  var vQ = '', vCat = '', vOpen = -1, vDrag = -1;
  function vKey(u) {
    u = String(u || '').trim(); if (!u) return '';
    var m = u.match(/(?:reel|reels|videos?|watch)\/?(?:\?v=)?(\d{6,})/i) || u.match(/[?&]v=(\d{6,})/i);
    if (m) return m[1];
    return u.toLowerCase().replace(/^https?:\/\/(www\.|m\.|web\.)?/, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
  }
  function vIsFb(u) { try { var x = new URL(u); return /(^|\.)(facebook\.com|fb\.watch|fb\.com)$/.test(x.hostname); } catch (e) { return false; } }
  function vThumb(u) { return !u ? '' : (/^(https?:|data:|\/)/.test(u) ? u : '../' + u); }
  function vDup(L, i) { var k = vKey(L[i].url); if (!k) return -1; for (var j = 0; j < L.length; j++) if (j !== i && vKey(L[j].url) === k) return j; return -1; }
  function vDownload(name, text, type) {
    var a = h('a', { href: URL.createObjectURL(new Blob([text], { type: type })), download: name });
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function vClean(L) { return L.filter(function (v) { return v.url; }).map(function (v) { var o = {}; for (var k in v) if (v[k] !== '' && v[k] != null) o[k] = v[k]; return o; }); }
  function renderVideos() {
    var box = $('#vList'); box.innerHTML = ''; V = null; var L = vlist();
    var cats = []; L.forEach(function (v) { var c = v.category || ''; if (c && cats.indexOf(c) < 0) cats.push(c); });
    var filtered = !!(vQ || vCat);
    var dl = h('datalist', { id: 'vCats' }, cats.map(function (c) { return h('option', { value: c }); }));
    var q = h('input', { type: 'search', placeholder: 'খুঁজুন (শিরোনাম, লিংক, ক্যাটাগরি)…' }); q.value = vQ;
    q.addEventListener('input', function () { vQ = q.value; var pos = q.selectionStart; renderVideos(); var n = $('#vList input[type=search]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } });
    var cs = h('select', {}, [h('option', { value: '', text: 'সব ক্যাটাগরি' })].concat(cats.map(function (c) { return h('option', { value: c, text: c }); })));
    cs.value = vCat; cs.addEventListener('change', function () { vCat = cs.value; renderVideos(); });
    box.appendChild(h('div', { class: 'vtools' }, [q, cs, dl]));
    box.appendChild(h('div', { class: 'vbar' }, [
      h('span', { class: 'muted', text: L.filter(function (v) { return v.url; }).length + ' টি ভিডিও' + (filtered ? ' (ফিল্টার চালু: ক্রম বদল বন্ধ)' : '') }),
      h('button', { class: 'btn sm ghost', text: 'JSON ডাউনলোড', onclick: function () { vDownload('videos.json', JSON.stringify(vClean(L), null, 2), 'application/json'); toast('videos.json ডাউনলোড হয়েছে ✓'); } }),
      h('button', { class: 'btn sm ghost', text: 'JS ডাউনলোড', onclick: function () { vDownload('videos.js', 'window.AF_VIDEOS = ' + JSON.stringify(vClean(L), null, 2) + ';\n', 'text/javascript'); toast('videos.js ডাউনলোড হয়েছে ✓'); } })
    ]));
    var shown = 0;
    L.forEach(function (v, i) {
      var hay = [v.title, v.description, v.url, v.category].join(' ').toLowerCase();
      if (vQ && hay.indexOf(vQ.toLowerCase()) < 0) return;
      if (vCat && (v.category || '') !== vCat) return;
      shown++;
      var warn = h('div', { class: 'vwarn' });
      function check() {
        var d = vDup(L, i), msg = '';
        if (!v.url) msg = 'লিংক দেওয়া হয়নি: লিংক না দিলে ভিডিও গ্যালারিতে দেখাবে না।';
        else if (d >= 0) msg = '⚠ এই ভিডিও ইতিমধ্যে ' + (d + 1) + ' নম্বরে আছে।';
        else if (!vIsFb(v.url)) msg = 'এটি Facebook লিংক নয়: সাইটের ভেতরে না চলে নতুন ট্যাবে খুলবে।';
        warn.textContent = msg; warn.hidden = !msg;
      }
      function fld(label, name, ph, extra) {
        var inp = h('input', { placeholder: ph || label }); inp.value = v[name] || '';
        if (extra) for (var k in extra) inp.setAttribute(k, extra[k]);
        inp.addEventListener('input', function () { v[name] = inp.value; vcommit(); });
        return [h('small', { text: label }), inp];
      }
      var urlInp = h('input', { placeholder: 'https://www.facebook.com/reel/…' }); urlInp.value = v.url || ''; var oldUrl = v.url || '';
      urlInp.addEventListener('change', function () {
        var nv = urlInp.value.trim(); v.url = nv;
        var d = vDup(L, i);
        if (nv && d >= 0) { toast('এই ভিডিও ইতিমধ্যে ' + (d + 1) + ' নম্বরে আছে: দুইবার যোগ করা যাবে না।', true); v.url = oldUrl; urlInp.value = oldUrl; check(); return; }
        oldUrl = nv; vcommit(); check();
      });
      var zoom = h('input', { type: 'number', min: '1', max: '3', step: '0.05', placeholder: '1 (স্বাভাবিক)' }); zoom.value = v.zoom || '';
      zoom.addEventListener('input', function () { var z = parseFloat(zoom.value); if (z >= 1 && z <= 3) v.zoom = z; else delete v.zoom; vcommit(); });
      var prev = h('div', { class: 'vprevbox' });
      var tsrc = vThumb(v.thumbnail);
      var det = h('details', { class: 'vedit' }, [
        h('summary', { text: 'সম্পাদনা' }),
        h('div', {}, [h('small', { text: 'ভিডিও লিংক (Facebook Reel/Video)' }), urlInp]), warn,
        h('div', {}, fld('শিরোনাম', 'title')), h('div', {}, fld('বর্ণনা', 'description')),
        h('div', {}, fld('ক্যাটাগরি (তালিকা থেকে বা নতুন লিখুন)', 'category', 'Video', { list: 'vCats' })),
        h('div', {}, fld('থাম্বনেইল (লিংক বা আপলোড)', 'thumbnail', 'https://…/ছবি.jpg')),
        h('div', {}, [h('small', { text: 'জুম (ভিডিও প্রিভিউ কার্ড ভরতে: ১ থেকে ৩)' }), zoom]),
        h('div', { class: 'acts' }, [
          h('button', { class: 'btn sm ghost', text: 'থাম্বনেইল আপলোড', onclick: function () { pickImage(900).then(function (u) { v.thumbnail = u; vOpen = i; vcommit(); renderVideos(); }).catch(function () {}); } }),
          v.thumbnail ? h('button', { class: 'btn sm red', text: 'থাম্বনেইল সরান', onclick: function () { delete v.thumbnail; vOpen = i; vcommit(); renderVideos(); } }) : null,
          h('label', { style: 'margin:0;font-weight:400' }, [h('input', { type: 'checkbox', checked: v.published !== false ? 'checked' : null, onchange: function (e) { v.published = e.target.checked; vcommit(); } }), ' প্রকাশিত']),
          h('label', { style: 'margin:0;font-weight:400' }, [h('input', { type: 'checkbox', checked: v.embed !== false ? 'checked' : null, onchange: function (e) { v.embed = e.target.checked; vcommit(); } }), ' সাইটের ভেতরে চলবে'])
        ]),
        h('div', { class: 'acts' }, [
          h('button', { class: 'btn sm ghost', text: 'প্রিভিউ দেখুন', onclick: function () {
            prev.innerHTML = '';
            if (!v.url) { toast('আগে ভিডিওর লিংক দিন।', true); return; }
            if (tsrc) prev.appendChild(h('img', { src: tsrc, alt: '' }));
            if (vIsFb(v.url)) prev.appendChild(h('iframe', { src: 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(v.url) + '&show_text=false&mute=1&width=270&height=480', width: '270', height: '480', scrolling: 'no', allowfullscreen: 'true', title: 'প্রিভিউ' }));
            else prev.appendChild(h('div', { class: 'muted', text: 'Facebook লিংক না হওয়ায় প্রিভিউ নেই।' }));
          } }),
          v.url ? h('a', { class: 'btn sm ghost', href: v.url, target: '_blank', rel: 'noopener', text: 'Facebook-এ খুলুন ↗' }) : null
        ]), prev
      ]);
      if (vOpen === i) det.setAttribute('open', '');
      det.addEventListener('toggle', function () { if (det.open) vOpen = i; else if (vOpen === i) vOpen = -1; });
      check();
      var card = h('div', { class: 'vcard', draggable: filtered ? null : 'true' }, [
        h('h4', {}, [
          h('span', { class: 'vgrip', title: 'টেনে সরান', text: filtered ? '' : '☰' }),
          tsrc ? h('img', { class: 'vth', src: tsrc, alt: '' }) : null,
          h('span', { class: 'vt' }, [(i + 1) + '. ' + (v.title || 'ভিডিও'), h('small', { text: (v.category || '—') + (v.published === false ? ' · লুকানো' : '') })]),
          h('button', { class: 'btn sm ghost', text: '↑', title: 'উপরে', onclick: function () { if (filtered) return toast('ফিল্টার বন্ধ করে ক্রম বদলান।', true); if (i > 0) { L.splice(i - 1, 0, L.splice(i, 1)[0]); vOpen = -1; vcommit(); renderVideos(); } } }),
          h('button', { class: 'btn sm ghost', text: '↓', title: 'নিচে', onclick: function () { if (filtered) return toast('ফিল্টার বন্ধ করে ক্রম বদলান।', true); if (i < L.length - 1) { L.splice(i + 1, 0, L.splice(i, 1)[0]); vOpen = -1; vcommit(); renderVideos(); } } }),
          h('button', { class: 'btn sm red', text: '✕', title: 'মুছুন', onclick: function () { if (confirm('“' + (v.title || 'ভিডিও') + '” মুছবেন?')) { L.splice(i, 1); vOpen = -1; vcommit(); renderVideos(); toast('ভিডিও মুছে ফেলা হয়েছে (প্রকাশ করলে সাইটে কার্যকর হবে)'); } } })]),
        det]);
      if (!filtered) {
        card.addEventListener('dragstart', function (e) { vDrag = i; card.classList.add('drag'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); } catch (x) {} });
        card.addEventListener('dragend', function () { vDrag = -1; card.classList.remove('drag'); $$('.vcard.over').forEach(function (n) { n.classList.remove('over'); }); });
        card.addEventListener('dragover', function (e) { if (vDrag < 0) return; e.preventDefault(); card.classList.add('over'); });
        card.addEventListener('dragleave', function () { card.classList.remove('over'); });
        card.addEventListener('drop', function (e) { e.preventDefault(); if (vDrag < 0 || vDrag === i) return; var from = vDrag; L.splice(i, 0, L.splice(from, 1)[0]); vDrag = -1; vOpen = -1; vcommit(); renderVideos(); toast('ক্রম বদলানো হয়েছে ✓'); });
      }
      box.appendChild(card);
    });
    if (!shown) box.appendChild(h('div', { class: 'box', text: L.length ? 'কোনো ভিডিও মেলেনি।' : 'কোনো ভিডিও নেই। “+ নতুন ভিডিও” চাপুন।' }));
  }
  $('#vAdd').addEventListener('click', function () { var L = vlist(); vQ = ''; vCat = ''; L.push({ url: '', title: 'নতুন ভিডিও', description: '', category: 'Video' }); vOpen = L.length - 1; vcommit(); renderVideos(); toast('নতুন ভিডিও যোগ হয়েছে: লিংক ও শিরোনাম দিন।'); var c = $$('#vList .vcard'); if (c.length) c[c.length - 1].scrollIntoView({ block: 'center' }); });

  /* ----- social ----- */
  function initSocial() { $$('[data-s]').forEach(function (i) { i.addEventListener('input', function () { var k = i.getAttribute('data-s'); if (i.value && i.value !== window.AF_LINKS[k]) D.social[k] = i.value; else delete D.social[k]; markDirty(); }); }); }
  function fillSocial() { $$('[data-s]').forEach(function (i) { var k = i.getAttribute('data-s'); i.value = D.social[k] || (window.AF_LINKS && window.AF_LINKS[k]) || ''; }); }

  /* ----- design ----- */
  var COLORS = [['--blue', 'প্রধান নীল'], ['--blue-deep', 'গাঢ় নীল'], ['--navy', 'নেভি'], ['--sky', 'হালকা নীল'], ['--orange', 'কমলা (অ্যাকসেন্ট)'], ['--yellow', 'হলুদ'], ['--red', 'লাল'], ['--lav', 'হালকা ব্যাকগ্রাউন্ড'], ['--ink', 'গাঢ় লেখা'], ['--muted', 'হালকা লেখা']];
  var DEF = { '--blue': '#0b57b8', '--blue-deep': '#0a3a82', '--navy': '#10305a', '--sky': '#4aa3ee', '--orange': '#f28c18', '--yellow': '#ffc928', '--red': '#d71920', '--lav': '#f3f4ff', '--ink': '#1c2a44', '--muted': '#56637c' };
  function liveTheme() { if (fwin && fwin.AF_APPLY) { fwin.AF_APPLY.run(D); prep(); } markDirty(); }
  function initDesign() {
    var box = $('#colors');
    COLORS.forEach(function (c) {
      var inp = h('input', { type: 'color', 'data-var': c[0] }); inp.value = DEF[c[0]];
      inp.addEventListener('input', function () { if (inp.value === DEF[c[0]]) delete D.theme[c[0]]; else D.theme[c[0]] = inp.value; liveTheme(); });
      box.appendChild(h('div', { class: 'colrow' }, [h('span', { text: c[1] }), h('code', { text: c[0] }), inp]));
    });
    $('#fs').addEventListener('input', function (e) { var v = +e.target.value; $('#fsv').textContent = v + '%'; if (v === 100) delete D.theme.fontScale; else D.theme.fontScale = v; liveTheme(); });
    $('#br').addEventListener('input', function (e) { $('#brv').textContent = e.target.value + 'px'; D.theme.btnRadius = +e.target.value; liveTheme(); });
    $$('[data-t]').forEach(function (i) { i.addEventListener('input', function () { D.theme[i.getAttribute('data-t')] = i.value; liveTheme(); }); });
    $('#fontFam').addEventListener('input', function (e) { if (e.target.value) D.theme.fontFamily = e.target.value; else delete D.theme.fontFamily; liveTheme(); });
    $('#cssBox').addEventListener('input', function (e) { D.css = e.target.value; liveTheme(); });
    $('#favBtn').addEventListener('click', function () { pickImage(256).then(function (u) { D.theme.favicon = u; $('#favPrev').src = u; liveTheme(); }).catch(function () {}); });
    $('#dReset').addEventListener('click', function () { if (confirm('সব ডিজাইন সেটিংস ডিফল্টে ফিরবে (লেখা ও ছবি অপরিবর্তিত)। নিশ্চিত?')) { D.theme = {}; D.css = ''; fillDesign(); liveTheme(); } });
  }
  function fillDesign() {
    var t = D.theme;
    $$('[data-var]').forEach(function (i) { i.value = t[i.getAttribute('data-var')] || DEF[i.getAttribute('data-var')]; });
    $('#fs').value = t.fontScale || 100; $('#fsv').textContent = (t.fontScale || 100) + '%';
    $('#br').value = t.btnRadius != null ? t.btnRadius : 12; $('#brv').textContent = t.btnRadius != null ? t.btnRadius + 'px' : 'ডিফল্ট';
    $$('[data-t]').forEach(function (i) { i.value = t[i.getAttribute('data-t')] || '#ffffff'; });
    $('#fontFam').value = t.fontFamily || ''; $('#cssBox').value = D.css || ''; $('#favPrev').src = t.favicon || '../images/logo.png';
  }

  /* hand over to the extra views (dashboard, media, applications, history, backup, account) */
  window.__AF.pageHelpers = { pageKey: pageKey };
  boot();
})();
