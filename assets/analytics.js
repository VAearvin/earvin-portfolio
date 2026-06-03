/* ============================================================
   Earvin Laureano — site analytics (Vercel Web Analytics)
   Excludes Earvin's own visits via localStorage opt-out flag.

   How to exclude yourself from your own stats:
     Visit any page with ?me=1 once on each device/browser
     e.g. https://www.earvinlaureano.com/?me=1
     A flag is stored in localStorage; future visits never load
     the analytics script on that browser.

   To clear the opt-out (re-enable tracking on a device):
     localStorage.removeItem('va_internal') in DevTools console
   ============================================================ */
(function () {
  try {
    var params = new URLSearchParams(location.search);
    // 1) Visiting with ?me=1 sets the opt-out flag and skips loading.
    if (params.get('me') === '1') {
      localStorage.setItem('va_internal', '1');
      return;
    }
    // 2) If the opt-out flag is set, never load analytics on this browser.
    if (localStorage.getItem('va_internal') === '1') return;

    // 3) Otherwise, load Vercel Web Analytics.
    var s = document.createElement('script');
    s.defer = true;
    s.src = '/_vercel/insights/script.js';
    s.setAttribute('data-endpoint', '/_vercel/insights');
    document.head.appendChild(s);
  } catch (e) {
    // localStorage / URL may be unavailable in some embeds; fail silently.
  }
})();
