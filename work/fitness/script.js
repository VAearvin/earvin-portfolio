/* VOLT 21 — Low Ticket funnel interactions (demo, no real payment).
   Carries name + bump + upsell choices across pages, per the Master System. */
(function () {
  var qs = function (s, r) { return (r || document).querySelector(s); };
  var params = new URLSearchParams(location.search);

  /* reveal on scroll */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  }

  /* FAQ accordion */
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

  /* ORDER PAGE — live total with order bump, then submit -> upsell */
  var bump = qs('#bump');
  if (bump) {
    bump.addEventListener('change', function () {
      var on = bump.checked;
      qs('#bumpLine').style.display = on ? 'flex' : 'none';
      qs('#orderTotal').textContent = on ? '$36.00' : '$27.00';
    });
  }
  window.voltOrder = function (e) {
    e.preventDefault();
    var name = (qs('#fn').value || '').trim();
    var b = qs('#bump') && qs('#bump').checked ? '1' : '0';
    var btn = qs('#orderForm').querySelector('button[type="submit"]');
    if (btn) { btn.textContent = 'Processing…'; btn.disabled = true; }
    /* Real build: charge via Stripe + create the order here. */
    setTimeout(function () {
      window.location.href = '/work/fitness/upsell.html?name=' + encodeURIComponent(name) + '&bump=' + b;
    }, 500);
    return false;
  };

  /* UPSELL PAGE — accept/decline -> confirmation (carries name + bump) */
  window.voltUpsell = function (add) {
    var name = params.get('name') || '';
    var b = params.get('bump') || '0';
    if (add) {
      var btn = qs('#addBtn');
      if (btn) { btn.textContent = 'Adding…'; btn.disabled = true; }
    }
    setTimeout(function () {
      window.location.href = '/work/fitness/thank-you.html?name=' + encodeURIComponent(name) +
        '&bump=' + b + '&upsell=' + (add ? '1' : '0');
    }, add ? 450 : 0);
  };
})();
