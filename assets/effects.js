/* Earvin Laureano — site-wide cursor micro-interactions.
   Loaded (deferred) on the brand pages. Gentle, GPU-only (transform/opacity).
   Touch devices opt out so there are no stuck hover states. */
(function () {
  if (!window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;

  // 1) Magnetic — the hero CTAs pull gently toward the cursor.
  document.querySelectorAll('.cat-hero-actions .btn-gold, .cat-hero-actions .btn-outline').forEach(function (btn) {
    btn.classList.add('fx-magnetic');
    btn.addEventListener('mousemove', function (e) {
      var r = btn.getBoundingClientRect();
      btn.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.25) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.25) + 'px)';
    });
    btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
  });

  // 2) 3D tilt — feature cards lean toward the cursor.
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
