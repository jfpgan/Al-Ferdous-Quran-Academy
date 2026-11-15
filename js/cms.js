/* Tiny Supabase REST client for the public website (no external library).
   Reads the published content and stores admission-form submissions. */
(function () {
  var C = window.AF_CMS_CONFIG || {};
  var ok = !!(C.url && C.anonKey);
  function base() { return C.url.replace(/\/+$/, ''); }
  function hdr(extra) {
    var h = { apikey: C.anonKey };
    if (/^eyJ/.test(C.anonKey)) h.Authorization = 'Bearer ' + C.anonKey; /* new sb_publishable_ keys are not JWTs: apikey header only */
    for (var k in extra) h[k] = extra[k];
    return h;
  }
  window.AF_CMS = {
    enabled: ok,
    publicUrl: function (path) { return base() + '/storage/v1/object/public/media/' + path; },
    fetchPublished: function () {
      if (!ok) return Promise.reject(new Error('not configured'));
      return fetch(base() + '/rest/v1/site_content?id=eq.published&select=data', { headers: hdr({}) })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (rows) { return rows && rows[0] ? rows[0].data : null; });
    },
    submitApplication: function (row) {
      if (!ok) return Promise.resolve(false);
      return fetch(base() + '/rest/v1/applications', {
        method: 'POST', keepalive: true,
        headers: hdr({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify(row)
      }).then(function (r) { return r.ok; }).catch(function () { return false; });
    }
  };
})();
