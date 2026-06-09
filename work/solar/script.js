/* SunPath Solar — funnel interactions (demo, no live webhook).
   Carries name/bill across pages for message-match, per the Master System. */
(function () {
  var qs = function (s, r) { return (r || document).querySelector(s); };
  var params = new URLSearchParams(location.search);

  /* ---------- reveal on scroll ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  }

  /* ---------- FAQ accordion ---------- */
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

  /* ---------- PAGE 1: opt-in -> invitation ---------- */
  window.solarOptin = function (e) {
    e.preventDefault();
    var name = (qs('#fn').value || '').trim();
    var bill = qs('#bill').value || '';
    var q = '?name=' + encodeURIComponent(name) + '&bill=' + encodeURIComponent(bill);
    window.location.href = '/work/solar/invitation.html' + q;
    return false;
  };

  /* ---------- PAGE 2: invitation personalization + carry params to booking ---------- */
  if (location.pathname.indexOf('/invitation') !== -1) {
    var nm = params.get('name');
    if (nm) {
      var gn = qs('#goodNews');
      if (gn) gn.innerHTML = '✓ Good news, ' + nm.replace(/[<>]/g, '') + ' — your area qualifies';
    }
    var carry = '?name=' + encodeURIComponent(params.get('name') || '') + '&bill=' + encodeURIComponent(params.get('bill') || '');
    document.querySelectorAll('a.go-book').forEach(function (a) { a.setAttribute('href', '/work/solar/book.html' + carry); });
  }

  /* ---------- PAGE 3: booking slot picker + submit -> confirmation ---------- */
  var slots = qs('#slots');
  if (slots) {
    // prefill first name from param
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
  window.solarBook = function (e) {
    e.preventDefault();
    if (!qs('#slot').value) { alert('Please pick a day & time for your call.'); return false; }
    var name = (qs('#fn').value || '').trim();
    var slot = qs('#slot').value;
    var btn = qs('#bookForm').querySelector('button[type="submit"]');
    if (btn) { btn.textContent = 'Confirming…'; btn.disabled = true; }
    /* Real build: POST to Google Apps Script / CRM webhook here. */
    setTimeout(function () {
      window.location.href = '/work/solar/thank-you.html?name=' + encodeURIComponent(name) + '&slot=' + encodeURIComponent(slot);
    }, 450);
    return false;
  };
})();
