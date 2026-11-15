/* Admin Panel: dashboard, media library, applications, version history, backup, account. */
(function () {
  'use strict';
  var A = window.__AF; if (!A) return;
  var h = A.h, rest = A.rest, toast = A.toast, W = A.WIDE;
  function fmt(d) { try { return new Date(d).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return d || ''; } }
  function head(w, title, sub) { w.appendChild(h('h2', { text: title, style: 'color:#0a3a82;margin:0 0 4px' })); if (sub) w.appendChild(h('p', { class: 'muted', text: sub })); }
  function count(table, filter) {
    return A.api('/rest/v1/' + table + '?select=id' + (filter || '') + '&limit=1', { headers: { Prefer: 'count=exact', Range: '0-0' } })
      .then(function (r) { var cr = r.headers.get('content-range') || ''; var n = parseInt(cr.split('/')[1], 10); return isNaN(n) ? 0 : n; }).catch(function () { return null; });
  }

  /* ---------- dashboard ---------- */
  W.dash = function (w) {
    head(w, 'ড্যাশবোর্ড', 'সব সংখ্যা সরাসরি ডাটাবেস থেকে আসে।');
    var cards = h('div', { class: 'cards' }); w.appendChild(cards);
    function stat(label, val) { cards.appendChild(h('div', { class: 'stat' }, [h('b', { text: val == null ? '—' : String(val) }), h('span', { text: label })])); }
    var D = A.getD(), pub = A.getPub();
    var vids = (D.videos || window.AF_VIDEOS || []).filter(function (v) { return v.published !== false && v.url; }).length;
    Promise.all([count('applications'), count('applications', '&status=eq.new'), count('content_versions')]).then(function (c) {
      stat('মোট ভর্তির আবেদন', c[0]); stat('নতুন (অপেক্ষমাণ) আবেদন', c[1]); stat('প্রকাশিত ভিডিও', vids); stat('সেভ করা ভার্সন', c[2]);
      stat('অপ্রকাশিত পরিবর্তন', pub.json === JSON.stringify(A.getD()) ? 'নেই' : 'আছে');
      stat('সর্বশেষ প্রকাশ', pub.at ? fmt(pub.at) : 'এখনো নয়');
    });
    w.appendChild(h('div', { class: 'box tip' }, [h('b', { text: 'কীভাবে কাজ করে: ' }), 'উপরের “পেজ এডিটর” থেকে বদল করুন → “খসড়া সেভ” → “প্রকাশ করুন (Publish)”। প্রকাশ না করা পর্যন্ত লাইভ সাইট বদলায় না। ভুল হলে “ভার্সন ইতিহাস” থেকে আগের অবস্থায় ফিরতে পারবেন।']));
    var go = h('div', { class: 'tools' }, [
      h('button', { class: 'btn', text: 'পেজ এডিটর খুলুন', onclick: function () { A.go('page'); } }),
      h('button', { class: 'btn ghost', text: 'ভর্তির আবেদন দেখুন', onclick: function () { A.go('apps'); } })]);
    w.appendChild(go);
  };

  /* ---------- media library ---------- */
  W.media = function (w) {
    head(w, 'মিডিয়া লাইব্রেরি', 'Supabase Storage-এ আপলোড করা সব ছবি। ছবি বদলাতে “পেজ এডিটর”-এ ছবিতে ক্লিক করুন।');
    var tools = h('div', { class: 'tools' }); w.appendChild(tools);
    var grid = h('div', { class: 'mgrid' }); w.appendChild(grid);
    tools.appendChild(h('button', { class: 'btn', text: '+ ছবি আপলোড', onclick: function () { A.pickImage(1600).then(function () { W.media((w.innerHTML = '', w)); }).catch(function () {}); } }));
    A.api('/storage/v1/object/list/media', { method: 'POST', json: { prefix: 'uploads', limit: 300, sortBy: { column: 'created_at', order: 'desc' } } }).then(function (r) {
      var files = (r.data || []).filter(function (f) { return f.name && f.id !== null; });
      if (!files.length) grid.appendChild(h('p', { class: 'muted', text: 'এখনো কোনো ছবি আপলোড হয়নি।' }));
      files.forEach(function (f) {
        var path = 'uploads/' + f.name, url = window.AF_CMS.publicUrl(path);
        grid.appendChild(h('div', { class: 'mi' }, [h('img', { src: url, alt: '', loading: 'lazy' }), h('div', { text: f.name }),
          h('div', { class: 'tools' }, [
            h('button', { class: 'btn sm ghost', text: 'লিংক কপি', onclick: function () { navigator.clipboard && navigator.clipboard.writeText(url); toast('লিংক কপি হয়েছে'); } }),
            h('button', { class: 'btn sm red', text: 'মুছুন', onclick: function () {
              if (!confirm('ছবিটি স্থায়ীভাবে মুছবেন? সাইটে এটি ব্যবহার হলে ছবি ভেঙে যাবে।')) return;
              A.api('/storage/v1/object/media/' + path, { method: 'DELETE' }).then(function () { toast('মুছে ফেলা হয়েছে'); w.innerHTML = ''; W.media(w); }).catch(function (e) { toast(e.message, true); });
            } })])]));
      });
    }).catch(function (e) { grid.appendChild(h('p', { class: 'err', text: 'তালিকা আনা যায়নি: ' + e.message })); });
  };

  /* ---------- applications ---------- */
  W.apps = function (w) {
    head(w, 'ভর্তির আবেদন', 'ফ্রি ট্রায়াল ফর্মে যারা আবেদন করেছেন (শুধু আপনি দেখতে পারবেন)।');
    var sel = h('select', { style: 'width:auto' }, [['', 'সব'], ['new', 'নতুন'], ['contacted', 'যোগাযোগ হয়েছে'], ['approved', 'অনুমোদিত'], ['rejected', 'বাতিল']].map(function (o) { return h('option', { value: o[0], text: o[1] }); }));
    var tools = h('div', { class: 'tools' }, [sel, h('button', { class: 'btn sm ghost', text: 'CSV এক্সপোর্ট', onclick: exportCsv })]); w.appendChild(tools);
    var box = h('div'); w.appendChild(box); var rows = [];
    function load() {
      box.innerHTML = '';
      rest('applications?select=*&order=created_at.desc&limit=1000' + (sel.value ? '&status=eq.' + sel.value : '')).then(function (r) { rows = r || []; draw(); })
        .catch(function (e) { box.appendChild(h('p', { class: 'err', text: e.message })); });
    }
    sel.addEventListener('change', load);
    function draw() {
      box.innerHTML = '';
      if (!rows.length) { box.appendChild(h('p', { class: 'muted', text: 'এখনো কোনো আবেদন নেই।' })); return; }
      var t = h('table', { class: 't' }); t.appendChild(h('tr', {}, ['তারিখ', 'শিক্ষার্থী', 'WhatsApp', 'কোর্স/ক্যাটাগরি', 'বয়স / সময়', 'বার্তা', 'অবস্থা', ''].map(function (x) { return h('th', { text: x }); })));
      rows.forEach(function (r) {
        var st = h('select', { style: 'width:auto' }, [['new', 'নতুন'], ['contacted', 'যোগাযোগ হয়েছে'], ['approved', 'অনুমোদন'], ['rejected', 'বাতিল']].map(function (o) { var op = h('option', { value: o[0], text: o[1] }); if (o[0] === r.status) op.selected = true; return op; }));
        st.addEventListener('change', function () { rest('applications?id=eq.' + r.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, json: { status: st.value } }).then(function () { r.status = st.value; toast('অবস্থা বদলেছে ✓'); }).catch(function (e) { toast(e.message, true); }); });
        t.appendChild(h('tr', {}, [
          h('td', { text: fmt(r.created_at) }), h('td', { text: r.student_name }),
          h('td', {}, [h('a', { href: 'https://wa.me/' + String(r.whatsapp).replace(/[^0-9]/g, ''), target: '_blank', rel: 'noopener', text: r.whatsapp })]),
          h('td', { text: [r.course, r.category].filter(Boolean).join(' / ') }), h('td', { text: [r.age, r.class_time].filter(Boolean).join(' / ') }),
          h('td', { text: (r.message || '') + (r.level ? ' [স্তর: ' + r.level + ']' : '') }), h('td', {}, [st]),
          h('td', {}, [h('button', { class: 'btn sm red', text: '✕', onclick: function () { if (confirm('আবেদনটি মুছবেন?')) rest('applications?id=eq.' + r.id, { method: 'DELETE' }).then(load).catch(function (e) { toast(e.message, true); }); } })])]));
      });
      box.appendChild(h('div', { style: 'overflow:auto' }, [t]));
    }
    function exportCsv() {
      var cols = ['id', 'created_at', 'student_name', 'whatsapp', 'category', 'age', 'class_time', 'level', 'course', 'message', 'lang', 'status'];
      var csv = [cols.join(',')].concat(rows.map(function (r) { return cols.map(function (c) { var v = String(r[c] == null ? '' : r[c]).replace(/"/g, '""'); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v + '"'; }).join(','); })).join('\n');
      dl('applications.csv', '﻿' + csv, 'text/csv');
    }
    load();
  };
  function dl(name, text, type) { var a = h('a', { href: URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' })), download: name }); document.body.appendChild(a); a.click(); a.remove(); }

  /* ---------- version history ---------- */
  W.hist = function (w) {
    head(w, 'ভার্সন ইতিহাস', 'প্রতিবার “প্রকাশ” করলে একটি ভার্সন সেভ হয়। যেকোনোটি খসড়ায় ফিরিয়ে এনে দেখে তারপর আবার প্রকাশ করতে পারবেন।');
    var box = h('div'); w.appendChild(box);
    rest('content_versions?select=id,label,created_at,created_by&order=created_at.desc&limit=100').then(function (rows) {
      if (!rows.length) { box.appendChild(h('p', { class: 'muted', text: 'এখনো কোনো প্রকাশিত ভার্সন নেই।' })); return; }
      var t = h('table', { class: 't' }); t.appendChild(h('tr', {}, ['#', 'তারিখ', 'নাম', 'কে', ''].map(function (x) { return h('th', { text: x }); })));
      rows.forEach(function (r) {
        t.appendChild(h('tr', {}, [h('td', { text: r.id }), h('td', { text: fmt(r.created_at) }), h('td', { text: r.label || '—' }), h('td', { text: r.created_by || '' }),
          h('td', {}, [h('button', { class: 'btn sm ghost', text: 'খসড়ায় ফিরিয়ে আনুন', onclick: function () {
            if (!confirm('এই ভার্সনটি এখন খসড়া হিসেবে লোড হবে (বর্তমান অসেভ বদল হারাবে)। লাইভ সাইট প্রকাশ না করা পর্যন্ত বদলাবে না। চালিয়ে যাবেন?')) return;
            rest('content_versions?id=eq.' + r.id + '&select=data').then(function (x) { A.setD(x[0].data); toast('খসড়ায় লোড হয়েছে। এখন “প্রকাশ করুন” চাপলে লাইভ হবে।'); A.go('dash'); }).catch(function (e) { toast(e.message, true); });
          } })])]));
      });
      box.appendChild(h('div', { style: 'overflow:auto' }, [t]));
    }).catch(function (e) { box.appendChild(h('p', { class: 'err', text: e.message })); });
  };

  /* ---------- backup ---------- */
  W.backup = function (w) {
    head(w, 'ব্যাকআপ ও রিস্টোর', 'পুরো ওয়েবসাইট কনটেন্ট (লেখা, ছবির লিংক, ডিজাইন, ভিডিও, SEO) এক ফাইলে। ছবিগুলো Supabase Storage-এ থাকে।');
    w.appendChild(h('div', { class: 'tools' }, [
      h('button', { class: 'btn', text: '⬇ ব্যাকআপ ডাউনলোড', onclick: function () {
        Promise.all([rest('site_content?select=*'), rest('content_versions?select=*&order=id.asc'), rest('applications?select=*&order=id.asc')]).then(function (r) {
          dl('al-ferdous-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ app: 'al-ferdous-cms', version: 1, exported_at: new Date().toISOString(), site_content: r[0], content_versions: r[1], applications: r[2] }, null, 1), 'application/json');
        }).catch(function (e) { toast(e.message, true); });
      } }),
      h('button', { class: 'btn ghost', text: 'ব্যাকআপ ফাইল থেকে রিস্টোর', onclick: function () { var f = document.getElementById('restoreFile'); f.value = ''; f.onchange = restore; f.click(); } })]));
    w.appendChild(h('p', { class: 'fine', text: 'রিস্টোর শুধু খসড়ায় লোড করে। লাইভ সাইট তখনই বদলায় যখন আপনি “প্রকাশ করুন” চাপেন। ভর্তির আবেদনের তথ্য ব্যাকআপে থাকে, কিন্তু রিস্টোরে ফেরানো হয় না।' }));
    function restore() {
      var f = this.files[0]; if (!f) return; var rd = new FileReader();
      rd.onload = function () {
        try {
          var j = JSON.parse(rd.result); if (j.app !== 'al-ferdous-cms') throw new Error('এটি এই সাইটের ব্যাকআপ নয়');
          var rows = j.site_content || [], pub = rows.filter(function (x) { return x.id === 'published'; })[0], dr = rows.filter(function (x) { return x.id === 'draft'; })[0];
          var data = (dr && Object.keys(dr.data || {}).length ? dr : pub).data;
          if (!confirm('ব্যাকআপের কনটেন্ট খসড়ায় লোড হবে (বর্তমান অসেভ বদল হারাবে)। নিশ্চিত?')) return;
          A.setD(data); toast('রিস্টোর হয়েছে (খসড়ায়)। প্রকাশ করলে লাইভ হবে।'); A.go('dash');
        } catch (e) { toast('রিস্টোর হয়নি: ' + e.message, true); }
      };
      rd.readAsText(f);
    }
  };

  /* ---------- account ---------- */
  W.acct = function (w) {
    head(w, 'পাসওয়ার্ড ও নিরাপত্তা', 'লগইন করা আছে: ' + A.email());
    var p1 = h('input', { type: 'password', placeholder: 'নতুন পাসওয়ার্ড (কমপক্ষে ১০ অক্ষর)', autocomplete: 'new-password' });
    var p2 = h('input', { type: 'password', placeholder: 'আবার লিখুন', autocomplete: 'new-password' });
    var msg = h('p', { class: 'err' });
    w.appendChild(h('div', { style: 'max-width:420px' }, [p1, p2, msg, h('button', { class: 'btn', text: 'পাসওয়ার্ড বদলান', onclick: function () {
      if (p1.value.length < 10) { msg.textContent = 'কমপক্ষে ১০ অক্ষর দিন।'; return; }
      if (p1.value !== p2.value) { msg.textContent = 'দুটি মেলেনি।'; return; }
      A.token().then(function (t) {
        return fetch(A.base + '/auth/v1/user', { method: 'PUT', headers: { apikey: A.cfg.anonKey, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: p1.value }) });
      }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.msg || j.message || j.error_description || 'HTTP ' + r.status); }); })
        .then(function () { msg.style.color = '#16723e'; msg.textContent = 'পাসওয়ার্ড বদলেছে ✓'; p1.value = p2.value = ''; })
        .catch(function (e) { msg.style.color = ''; msg.textContent = e.message; });
    } })]));
    w.appendChild(h('div', { class: 'box', style: 'margin-top:20px' }, [h('b', { text: 'নিরাপত্তা সম্পর্কে: ' }),
      'পাসওয়ার্ড সার্ভারে (Supabase Auth) হ্যাশ করে রাখা হয়। অ্যাডমিন ছাড়া কেউ লেখা, ছবি বা আবেদনের তথ্য বদলাতে/দেখতে পারে না, কারণ ডাটাবেসের নিয়ম (RLS) সার্ভারেই যাচাই হয়। ১ ঘণ্টা নিষ্ক্রিয় থাকলে স্বয়ংক্রিয় লগআউট হয়।']));
  };
})();
