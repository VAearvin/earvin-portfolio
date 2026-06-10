/* Booked & Busy — Webinar/VSL funnel interactions (demo, no live webhook).
   Register → VSL → Book → Confirmation, carrying name for message-match. */
(function () {
  var qs = function (s, r) { return (r || document).querySelector(s); };
  var params = new URLSearchParams(location.search);

  /* reveal */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  }

  /* FAQ */
  var faq = qs('#faq');
  if (faq) {
    faq.querySelectorAll('.q button').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.parentElement, open = q.classList.contains('open');
        faq.querySelectorAll('.q').forEach(function (x) { x.classList.remove('open'); });
        if (!open) q.classList.add('open');
      });
    });
  }

  /* PAGE 1: register -> vsl */
  window.mcRegister = function (e) {
    e.preventDefault();
    var name = (qs('#fn').value || '').trim();
    window.location.href = '/work/masterclass/vsl.html?name=' + encodeURIComponent(name);
    return false;
  };

  /* PAGE 2: vsl personalization + carry name to booking */
  if (location.pathname.indexOf('/vsl') !== -1) {
    var nm = params.get('name');
    if (nm) {
      var w = qs('#welcome');
      if (w) w.innerHTML = '✓ You’re in, ' + nm.replace(/[<>]/g, '') + ' — your masterclass is ready';
    }
    var carry = '?name=' + encodeURIComponent(params.get('name') || '');
    document.querySelectorAll('a.go-book').forEach(function (a) { a.setAttribute('href', '/work/masterclass/book.html' + carry); });
  }

  /* PAGE 3: booking slot picker + submit -> confirmation */
  var slots = qs('#slots');
  if (slots) {
    var pn = params.get('name');
    if (pn && qs('#fn')) qs('#fn').value = pn;
    slots.querySelectorAll('.slot').forEach(function (s) {
      s.addEventListener('click', function () {
        slots.querySelectorAll('.slot').forEach(function (x) { x.classList.remove('sel'); });
        s.classList.add('sel');
        qs('#slot').value = s.getAttribute('data-slot');
      });
    });
  }
  window.mcBook = function (e) {
    e.preventDefault();
    if (!qs('#slot').value) { alert('Please pick a day & time for your call.'); return false; }
    var name = (qs('#fn').value || '').trim();
    var slot = qs('#slot').value;
    var btn = qs('#bookForm').querySelector('button[type="submit"]');
    if (btn) { btn.textContent = 'Confirming…'; btn.disabled = true; }
    setTimeout(function () {
      window.location.href = '/work/masterclass/thank-you.html?name=' + encodeURIComponent(name) + '&slot=' + encodeURIComponent(slot);
    }, 450);
    return false;
  };
})();
