/* The Vitality Reset — funnel interactions (demo, no live webhook). */
(function () {
  /* ---- FAQ accordion ---- */
  var faq = document.getElementById('faq');
  if (faq) {
    faq.querySelectorAll('.q button').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.parentElement;
        var open = q.classList.contains('open');
        faq.querySelectorAll('.q').forEach(function (x) { x.classList.remove('open'); });
        if (!open) q.classList.add('open');
      });
    });
  }

  /* ---- Countdown to next Monday 9:00am ---- */
  var dd = document.getElementById('cd-d');
  if (dd) {
    var target = (function () {
      var n = new Date();
      var day = n.getDay();                 // 0 Sun … 6 Sat
      var add = (8 - day) % 7; if (add === 0) add = 7;
      var t = new Date(n.getFullYear(), n.getMonth(), n.getDate() + add, 9, 0, 0);
      return t;
    })();
    var pad = function (x) { return (x < 10 ? '0' : '') + x; };
    var tick = function () {
      var diff = Math.max(0, target - new Date());
      var s = Math.floor(diff / 1000);
      document.getElementById('cd-d').textContent = pad(Math.floor(s / 86400));
      document.getElementById('cd-h').textContent = pad(Math.floor((s % 86400) / 3600));
      document.getElementById('cd-m').textContent = pad(Math.floor((s % 3600) / 60));
      document.getElementById('cd-s').textContent = pad(s % 60);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---- Application submit -> thank-you (demo) ---- */
  var form = document.getElementById('applyForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fn = (document.getElementById('fn').value || '').trim();
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
      /* In a real build: fetch() POST to a Google Apps Script / CRM webhook here. */
      setTimeout(function () {
        window.location.href = '/work/wellness/thank-you' + (fn ? ('?name=' + encodeURIComponent(fn)) : '');
      }, 500);
    });
  }
})();
