/* Wealthwise — 9-page Challenge funnel interactions (demo, no live webhook).
   Flow: Register → VIP upsell → VIP order → Confirmation
         → Bridge → Replay → Paid Sales → Paid Order → Paid Confirmation.
   Carries name across pages for message-match. */
(function () {
  var qs = function (s, r) { return (r || document).querySelector(s); };
  var params = new URLSearchParams(location.search);
  var nameParam = params.get('name') || '';

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

  /* prefill name on any checkout that has #fn (from param) */
  if (nameParam && qs('#fn') && !qs('#regForm')) { qs('#fn').value = nameParam; }

  /* PAGE 1: register -> VIP upsell */
  window.chRegister = function (e) {
    e.preventDefault();
    var name = (qs('#fn').value || '').trim();
    window.location.href = '/work/challenge/vip.html?name=' + encodeURIComponent(name);
    return false;
  };

  /* PAGE 2: VIP upsell -> order (accept) or confirmation (decline) */
  window.chVip = function (add) {
    if (add) {
      var btn = qs('#addBtn'); if (btn) { btn.textContent = 'Loading checkout…'; btn.disabled = true; }
      window.location.href = '/work/challenge/order.html?name=' + encodeURIComponent(nameParam);
    } else {
      window.location.href = '/work/challenge/confirmation.html?name=' + encodeURIComponent(nameParam) + '&vip=0';
    }
  };

  /* PAGE 3: VIP order -> confirmation (vip=1) */
  window.chOrder = function (e) {
    e.preventDefault();
    var name = (qs('#fn').value || '').trim() || nameParam;
    var btn = qs('#orderForm').querySelector('button[type="submit"]');
    if (btn) { btn.textContent = 'Processing…'; btn.disabled = true; }
    setTimeout(function () {
      window.location.href = '/work/challenge/confirmation.html?name=' + encodeURIComponent(name) + '&vip=1';
    }, 500);
    return false;
  };

  /* PAGE 8: paid-offer order -> final confirmation */
  window.chOfferOrder = function (e) {
    e.preventDefault();
    var name = (qs('#fn').value || '').trim() || nameParam;
    var btn = qs('#offerForm').querySelector('button[type="submit"]');
    if (btn) { btn.textContent = 'Processing…'; btn.disabled = true; }
    setTimeout(function () {
      window.location.href = '/work/challenge/offer-confirmation.html?name=' + encodeURIComponent(name);
    }, 500);
    return false;
  };
})();
