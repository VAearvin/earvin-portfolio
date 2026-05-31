/**
 * Local dev server — preview the whole site INCLUDING the /api/audit function
 * without Vercel CLI. Uses only Node built-ins (no dependencies).
 *
 *   node dev-server.js        → http://localhost:8090
 *
 * It serves the static files (index.html, pricing.html, audit.html, …) and
 * routes POST /api/audit to the same handler Vercel runs in production.
 * It loads a local .env file (if present) so you can test with real API keys
 * locally. .env is gitignored and never committed.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// --- tiny .env loader (KEY=VALUE per line; # comments allowed) ---
(function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(function (line) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) return;
      let v = m[2].replace(/^["']|["']$/g, '');
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    });
    console.log('Loaded .env');
  } catch (e) {}
})();

const auditHandler = require('./api/audit.js');

const PORT = process.env.PORT || 8090;
const ROOT = __dirname;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json', '.ico': 'image/x-icon'
};

const server = http.createServer(function (req, res) {
  // --- API route ---
  if (req.url.split('?')[0] === '/api/audit') {
    let chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () {
      try { req.body = JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch (e) { req.body = {}; }
      Promise.resolve(auditHandler(req, res)).catch(function (err) {
        if (!res.headersSent) { res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); }
        res.end(JSON.stringify({ ok: false, error: 'Audit failed: ' + (err && err.message) }));
      });
    });
    return;
  }

  // --- static files ---
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  const filePath = path.join(ROOT, path.normalize(rel));
  if (!filePath.startsWith(ROOT)) { res.statusCode = 403; return res.end('Forbidden'); }
  fs.readFile(filePath, function (err, data) {
    if (err) { res.statusCode = 404; res.setHeader('Content-Type', 'text/plain'); return res.end('Not found'); }
    res.setHeader('Content-Type', TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    res.end(data);
  });
});

server.listen(PORT, function () {
  console.log('Dev server → http://localhost:' + PORT);
  console.log('  Home   : http://localhost:' + PORT + '/index.html');
  console.log('  Pricing: http://localhost:' + PORT + '/pricing.html');
  console.log('  Audit  : http://localhost:' + PORT + '/audit.html');
  const keys = ['PAGESPEED_API_KEY', 'RESEND_API_KEY', 'AUDIT_FROM_EMAIL', 'AUDIT_NOTIFY_EMAIL', 'SHEETS_WEBHOOK_URL'];
  console.log('Env configured:', keys.filter(function (k) { return process.env[k]; }).join(', ') || '(none — checks that need keys will say "couldn\'t check")');
});
