/* ============================================================
   Earvin Laureano — site analytics + copy "canary"
   Loaded on every page. Two independent jobs:

   1) CANARY — if this exact code ends up running on a domain
      that ISN'T yours (i.e. someone copied your files and put
      them on their own site / funnel-builder preview), it quietly
      pings your endpoint with the offending domain so you find out.
      Does nothing on your own domains. Catches lazy copy-paste.

   2) ANALYTICS — loads Vercel Web Analytics, unless you've opted
      your own browser out (visit any page with ?me=1 once).
   ============================================================ */
(function () {

  /* ---------- 1) CANARY: detect unauthorized copies ---------- */
  try {
    var host = (location.hostname || '').toLowerCase();

    // Your own domains — the canary stays silent on these.
    var OWN = ['earvinlaureano.com', 'www.earvinlaureano.com', 'localhost', '127.0.0.1', '0.0.0.0'];
    // Your own Vercel preview deployments (adjust the prefix if your
    // Vercel project slug isn't "earvin-portfolio").
    var ownPreview = host.indexOf('earvin-portfolio') === 0 && host.lastIndexOf('.vercel.app') === host.length - 11;

    if (OWN.indexOf(host) === -1 && !ownPreview) {
      // Report once per browser session, so we don't spam.
      if (!sessionStorage.getItem('cnry')) {
        sessionStorage.setItem('cnry', '1');

        // PASTE your deployed Canary Apps Script web-app URL here:
        var CANARY_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwguiSNP1H4pxSaqt8h5lKto_XwGpYZHHi47wOOXuxaDvmFmvOKW7XLaJoH1y5eFmLtww/exec';

        if (CANARY_ENDPOINT.indexOf('PASTE_') !== 0) {
          var body = JSON.stringify({
            host: host,
            fullUrl: location.href,
            referrer: document.referrer || '',
            ua: navigator.userAgent || '',
            ts: new Date().toISOString()
          });
          // sendBeacon = fire-and-forget, survives navigation, no CORS needed.
          if (navigator.sendBeacon) {
            navigator.sendBeacon(CANARY_ENDPOINT, body);
          } else {
            fetch(CANARY_ENDPOINT, { method: 'POST', mode: 'no-cors', keepalive: true, body: body });
          }
        }
      }
    }
  } catch (e) { /* never break the page */ }

  /* ---------- 2) ANALYTICS: Vercel Web Analytics + self opt-out ---------- */
  try {
    var params = new URLSearchParams(location.search);
    // Visiting ?me=1 marks this browser as internal (your own) and stops tracking.
    if (params.get('me') === '1') {
      localStorage.setItem('va_internal', '1');
      return;
    }
    if (localStorage.getItem('va_internal') === '1') return;

    var s = document.createElement('script');
    s.defer = true;
    s.src = '/_vercel/insights/script.js';
    s.setAttribute('data-endpoint', '/_vercel/insights');
    document.head.appendChild(s);
  } catch (e) { /* fail silently */ }
})();
