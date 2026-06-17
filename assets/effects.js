/* Earvin Laureano — site-wide cursor micro-interactions.
   Loaded (deferred) on the brand pages. Gentle, GPU-only (transform/opacity).
   Touch devices opt out so there are no stuck hover states. */
(function () {
  if (!window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;

  // 1) Hero spotlight — a soft gold glow follows the cursor across the hero.
  var hero = document.querySelector('.cat-hero, .chooser-hero');
  if (hero) {
    if (getComputedStyle(hero).position === 'static') hero.style.position = 'relative';
    hero.style.overflow = 'hidden';
    var inner = hero.querySelector('.cat-hero-inner, .chooser-hero-inner');
    if (inner) {
      if (getComputedStyle(inner).position === 'static') inner.style.position = 'relative';
      inner.style.zIndex = '2';
    }
    var spot = document.createElement('div');
    spot.className = 'fx-spotlight';
    hero.insertBefore(spot, hero.firstChild);
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      spot.style.setProperty('--spot-x', (e.clientX - r.left) + 'px');
      spot.style.setProperty('--spot-y', (e.clientY - r.top) + 'px');
    });
  }

  // 2) Magnetic — the hero CTAs pull gently toward the cursor.
  document.querySelectorAll('.cat-hero-actions .btn-gold, .cat-hero-actions .btn-outline').forEach(function (btn) {
    btn.classList.add('fx-magnetic');
    btn.addEventListener('mousemove', function (e) {
      var r = btn.getBoundingClientRect();
      btn.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.25) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.25) + 'px)';
    });
    btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
  });

  // 3) 3D tilt — feature cards lean toward the cursor.
  document.querySelectorAll('.demo-card, .rev-card, .ch-card, .tier-card, .wcard, .wfeature').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      var rx = ((e.clientY - r.top) / r.height - 0.5) * -6;
      var ry = ((e.clientX - r.left) / r.width - 0.5) * 6;
      card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
    });
    card.addEventListener('mouseleave', function () { card.style.transform = ''; });
  });
})();
