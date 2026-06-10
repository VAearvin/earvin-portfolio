/* LUMÉ — E-commerce funnel interactions (demo, no real payment).
   Carries plan + qty + bump + upsell across pages, per the Master System. */
(function () {
  var qs = function (s, r) { return (r || document).querySelector(s); };
  var params = new URLSearchParams(location.search);
  var PRICE = { sub: 29, once: 39 };
  var BUMP = 19, UPSELL = 49;

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

  /* ===== PRODUCT PAGE ===== */
  var buyForm = qs('#buyForm');
  if (buyForm) {
    var plan = 'sub', qty = 1;
    // gallery thumbs
    document.querySelectorAll('.gallery .thumbs img').forEach(function (t) {
      t.addEventListener('click', function () {
        document.querySelectorAll('.gallery .thumbs img').forEach(function (x) { x.classList.remove('sel'); });
        t.classList.add('sel');
        qs('#mainImg').src = t.getAttribute('data-src');
      });
    });
    var refresh = function () {
      qs('#qty').textContent = qty;
      qs('#ctaPrice').textContent = '$' + (PRICE[plan] * qty);
    };
    document.querySelectorAll('.opt').forEach(function (o) {
      o.addEventListener('click', function () {
        document.querySelectorAll('.opt').forEach(function (x) { x.classList.remove('sel'); });
        o.classList.add('sel');
        plan = o.getAttribute('data-plan');
        refresh();
      });
    });
    window.lumeQty = function (d) { qty = Math.max(1, qty + d); refresh(); };
    window.lumeAdd = function (e) {
      e.preventDefault();
      window.location.href = '/work/skincare/checkout.html?plan=' + plan + '&qty=' + qty;
      return false;
    };
  }

  /* ===== CHECKOUT PAGE ===== */
  var coForm = qs('#coForm');
  if (coForm) {
    var cplan = params.get('plan') === 'once' ? 'once' : 'sub';
    var cqty = Math.max(1, parseInt(params.get('qty') || '1', 10));
    var unit = PRICE[cplan];
    var subtotal = unit * cqty;
    qs('#sumPlan').innerHTML = cplan === 'once' ? 'One-time purchase' : 'Subscribe &amp; Save · 25% off';
    qs('#sumLine').textContent = 'Serum × ' + cqty;
    qs('#sumSubtotal').textContent = '$' + subtotal + '.00';
    var setTotal = function () {
      var t = subtotal + (qs('#bump').checked ? BUMP : 0);
      qs('#orderTotal').textContent = '$' + t + '.00';
      qs('#bumpLine').style.display = qs('#bump').checked ? 'flex' : 'none';
    };
    qs('#bump').addEventListener('change', setTotal);
    setTotal();
    window.lumeCheckout = function (e) {
      e.preventDefault();
      var name = (qs('#fn').value || '').trim();
      var b = qs('#bump').checked ? '1' : '0';
      var btn = coForm.querySelector('button[type="submit"]');
      if (btn) { btn.textContent = 'Processing…'; btn.disabled = true; }
      /* Real build: charge Stripe + create order/subscription here. */
      setTimeout(function () {
        window.location.href = '/work/skincare/upsell.html?name=' + encodeURIComponent(name) +
          '&plan=' + cplan + '&qty=' + cqty + '&bump=' + b;
      }, 500);
      return false;
    };
  }

  /* ===== UPSELL PAGE ===== */
  window.lumeUpsell = function (add) {
    var base = '/work/skincare/thank-you.html?name=' + encodeURIComponent(params.get('name') || '') +
      '&plan=' + (params.get('plan') || 'sub') + '&qty=' + (params.get('qty') || '1') +
      '&bump=' + (params.get('bump') || '0') + '&upsell=' + (add ? '1' : '0');
    if (add) { var btn = qs('#addBtn'); if (btn) { btn.textContent = 'Adding…'; btn.disabled = true; } }
    setTimeout(function () { window.location.href = base; }, add ? 450 : 0);
  };
})();
