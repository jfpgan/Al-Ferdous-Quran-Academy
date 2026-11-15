(function () {
  var burger = document.querySelector('.burger');
  var menu = document.querySelector('.menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
    });
  }

  // social icon links come from js/links.js (and the Admin Panel)
  function applySocial() {
    if (!window.AF_LINKS) return;
    document.querySelectorAll('a[data-link]').forEach(function (a) {
      var u = window.AF_LINKS[a.getAttribute('data-link')];
      if (u) a.setAttribute('href', u);
    });
  }
  applySocial();
  document.addEventListener('af-content', applySocial);

  var more = document.querySelector('.more');
  if (more) {
    var mb = more.querySelector('.morebtn');
    mb.addEventListener('click', function (ev) { ev.stopPropagation(); var o = more.classList.toggle('open'); mb.setAttribute('aria-expanded', o); });
    document.addEventListener('click', function () { more.classList.remove('open'); });
  }

  document.querySelectorAll('.faq-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      btn.parentElement.classList.toggle('open');
    });
  });

  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // Trial form: opens WhatsApp with the details filled in (English or Bangla message)
  var form = document.getElementById('trialForm');
  if (form) {
    var bn = document.documentElement.lang === 'bn';
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var d = new FormData(form);
      var none = bn ? 'উল্লেখ নেই' : 'Not mentioned';
      var fields = bn ? [
        'ট্রায়াল ক্লাস বুকিং',
        'নাম: ' + (d.get('name') || ''),
        'ফোন/WhatsApp: ' + (d.get('phone') || ''),
        'শিক্ষার্থীর ক্যাটাগরি: ' + (d.get('category') || none),
        'বয়স: ' + (d.get('age') || none),
        'সুবিধাজনক সময়: ' + (d.get('time') || none),
        'বর্তমান পড়ার অবস্থা: ' + (d.get('level') || none),
        'আগ্রহী কোর্স: ' + (d.get('course') || none),
        'বিশেষ জিজ্ঞাসা/প্রয়োজন: ' + (d.get('note') || 'নেই')
      ] : [
        'Free trial class booking',
        'Name: ' + (d.get('name') || ''),
        'Phone/WhatsApp: ' + (d.get('phone') || ''),
        'Student category: ' + (d.get('category') || none),
        'Age: ' + (d.get('age') || none),
        'Convenient time: ' + (d.get('time') || none),
        'Current reading level: ' + (d.get('level') || none),
        'Interested course: ' + (d.get('course') || none),
        'Special question/need: ' + (d.get('note') || 'None')
      ];
      if (window.AF_CMS && window.AF_CMS.submitApplication) {
        window.AF_CMS.submitApplication({
          student_name: d.get('name') || '', whatsapp: d.get('phone') || '', category: d.get('category') || '',
          age: d.get('age') || '', class_time: d.get('time') || '', level: d.get('level') || '',
          course: d.get('course') || '', message: d.get('note') || '', lang: bn ? 'bn' : 'en'
        });
      }
      window.open(((window.AF_LINKS&&window.AF_LINKS.whatsapp)||'https://wa.me/8801898208112').split('?')[0] + '?text=' + encodeURIComponent(fields.join('\n')), '_blank', 'noopener');
    });
  }

  // Pause decorative animations on boxes that are off-screen (keeps the page light)
  var heavy = '.card,.chip,.hadith,.photo,.report,.faq-i,.info,.formbox,.logo-box,.panel-side';
  var pio = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { en.target.classList.toggle('paused', !en.isIntersecting); });
  }, { rootMargin: '120px' }) : null;
  window.__afObserve = function (root) {
    if (!pio) return;
    (root || document).querySelectorAll(heavy).forEach(function (n) { pio.observe(n); });
  };
  window.__afObserve(document);
})();
