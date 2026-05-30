/**
 * Free Website Audit — serverless handler (Vercel Node function).
 * Zero npm dependencies: everything uses the native global fetch.
 *
 * Environment variables (set in Vercel project settings → Environment Variables,
 * or a local .env loaded by dev-server.js). NONE are committed.
 *   PAGESPEED_API_KEY   — Google PageSpeed Insights API key (performance scores)
 *   ANTHROPIC_API_KEY   — Anthropic API key (AI-visibility snapshot)
 *   RESEND_API_KEY      — Resend API key (sends the report + notifies Earvin)
 *   AUDIT_FROM_EMAIL    — verified Resend sender, e.g. "Earvin <audit@earvinlaureano.com>"
 *   AUDIT_NOTIFY_EMAIL  — where lead notifications go, e.g. "inquire@earvinlaureano.com"
 *   SHEETS_WEBHOOK_URL  — Google Apps Script web-app URL that appends a row (lead storage)
 *
 * Every check degrades gracefully: if one fails or times out it is marked
 * "couldn't check" and the rest of the audit still returns.
 */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405; res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
  }

  var body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  // --- Honeypot: pretend success, do nothing ---
  if (body.company_website) {
    return json(res, 200, { ok: true, site: '', checks: {}, topFlags: [], emailed: false, leadSaved: false });
  }

  // --- Basic per-IP rate limit (in-memory; best-effort on warm instances) ---
  var ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || 'unknown';
  if (rateLimited(ip)) return json(res, 429, { ok: false, error: 'Too many audits. Please try again later.' });

  // --- Validate input ---
  var url = normalizeUrl(body.url);
  var firstName = (body.firstName || '').toString().trim().slice(0, 80);
  var email = (body.email || '').toString().trim().slice(0, 160);
  if (!url || !firstName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(res, 400, { ok: false, error: 'Please provide a valid URL, first name, and email.' });
  }

  // --- Run all checks in parallel, each self-contained & timeout-guarded ---
  var origin = new URL(url).origin;
  var htmlResult = await safe(fetchHtml(url));            // shared by SEO + technical + AI inference
  var settled = await Promise.allSettled([
    runPerformance(url),
    runSeo(url, origin, htmlResult),
    runTechnical(url, origin, htmlResult),
    runAiVisibility(htmlResult)
  ]);

  var performance = pick(settled[0], { status: 'error', mobile: null, desktop: null });
  var seo = pick(settled[1], { status: 'error', score: null, issues: [] });
  var technical = pick(settled[2], { status: 'error', score: null, issues: [] });
  var aiVisibility = pick(settled[3], { status: 'skipped', appeared: null });

  var checks = { performance: performance, seo: seo, technical: technical, aiVisibility: aiVisibility };
  var topFlags = buildTopFlags(checks).slice(0, 4);

  // --- Side effects (never block/break the response) ---
  var emailed = false, leadSaved = false;
  try { emailed = await sendReports({ url: url, firstName: firstName, email: email, checks: checks, topFlags: topFlags }); } catch (e) {}
  try { leadSaved = await saveLead({ url: url, firstName: firstName, email: email, checks: checks, topFlags: topFlags }); } catch (e) {}

  return json(res, 200, { ok: true, site: url, checks: checks, topFlags: topFlags, emailed: emailed, leadSaved: leadSaved });
};

// Allow longer execution for PageSpeed (Vercel: Hobby up to 60s).
module.exports.config = { maxDuration: 60 };

/* ----------------------------- helpers ----------------------------- */

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(obj));
}

function normalizeUrl(u) {
  u = (u || '').toString().trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { var x = new URL(u); return x.hostname.indexOf('.') > 0 ? x.href : null; } catch (e) { return null; }
}

function pick(settledItem, fallback) {
  return settledItem.status === 'fulfilled' && settledItem.value ? settledItem.value : fallback;
}
async function safe(p) { try { return await p; } catch (e) { return null; } }

async function withTimeout(promiseFactory, ms) {
  var ctrl = new AbortController();
  var t = setTimeout(function () { ctrl.abort(); }, ms);
  try { return await promiseFactory(ctrl.signal); }
  finally { clearTimeout(t); }
}

/* ---- rate limit (in-memory) ---- */
var RL = global.__auditRL || (global.__auditRL = new Map());
function rateLimited(ip) {
  var now = Date.now(), windowMs = 10 * 60 * 1000, max = 5;
  var arr = (RL.get(ip) || []).filter(function (t) { return now - t < windowMs; });
  arr.push(now); RL.set(ip, arr);
  return arr.length > max;
}

/* ---- shared HTML fetch ---- */
async function fetchHtml(url) {
  return withTimeout(async function (signal) {
    var r = await fetch(url, { signal: signal, redirect: 'follow', headers: { 'User-Agent': 'EarvinAuditBot/1.0' } });
    var html = await r.text();
    return { ok: r.ok, status: r.status, finalUrl: r.url, https: r.url.startsWith('https://'), html: html.slice(0, 600000) };
  }, 9000);
}

/* ---- Performance (PageSpeed Insights) ---- */
async function runPerformance(url) {
  var key = process.env.PAGESPEED_API_KEY;
  if (!key) return { status: 'skipped', mobile: null, desktop: null, note: 'PageSpeed key not configured' };
  async function one(strategy) {
    try {
      var api = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=' + encodeURIComponent(url) +
        '&strategy=' + strategy + '&category=performance&key=' + key;
      var data = await withTimeout(async function (signal) {
        var r = await fetch(api, { signal: signal });
        return r.json();
      }, 28000);
      var s = data && data.lighthouseResult && data.lighthouseResult.categories &&
        data.lighthouseResult.categories.performance && data.lighthouseResult.categories.performance.score;
      return (typeof s === 'number') ? Math.round(s * 100) : null;
    } catch (e) { return null; }
  }
  var pair = await Promise.all([one('mobile'), one('desktop')]);
  var status = (pair[0] === null && pair[1] === null) ? 'error' : 'ok';
  return { status: status, mobile: pair[0], desktop: pair[1] };
}

/* ---- On-page SEO basics ---- */
async function runSeo(url, origin, htmlResult) {
  if (!htmlResult || !htmlResult.html) return { status: 'error', score: null, issues: [] };
  var html = htmlResult.html;
  var title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  var hasTitle = !!(title && title.trim());
  var hasMeta = /<meta[^>]+name=["']description["'][^>]*content=["'][^"']+["']/i.test(html);
  var h1count = (html.match(/<h1[\s>]/gi) || []).length;
  var imgs = (html.match(/<img\b[^>]*>/gi) || []);
  var withAlt = imgs.filter(function (t) { return /\balt=["'][^"']+["']/i.test(t); }).length;
  var altCoverage = imgs.length ? Math.round((withAlt / imgs.length) * 100) : 100;

  var robots = await checkExists(origin + '/robots.txt');
  var sitemap = await checkExists(origin + '/sitemap.xml');

  var issues = [];
  if (!hasTitle) issues.push('Missing a page <title>.');
  if (!hasMeta) issues.push('No meta description — search and AI engines have less to show.');
  if (h1count === 0) issues.push('No H1 heading found.');
  else if (h1count > 1) issues.push(h1count + ' H1 headings — there should usually be one.');
  if (imgs.length && altCoverage < 80) issues.push((imgs.length - withAlt) + ' of ' + imgs.length + ' images missing alt text (' + altCoverage + '% covered).');
  if (!robots) issues.push('No robots.txt found.');
  if (!sitemap) issues.push('No sitemap.xml found.');

  // simple score: start 100, subtract per issue weight
  var score = 100;
  if (!hasTitle) score -= 20; if (!hasMeta) score -= 18; if (h1count !== 1) score -= 12;
  if (altCoverage < 80) score -= 12; if (!robots) score -= 8; if (!sitemap) score -= 10;
  score = Math.max(0, Math.min(100, score));

  return { status: 'ok', score: score, title: hasTitle, metaDescription: hasMeta, h1count: h1count,
           altCoverage: altCoverage, images: imgs.length, robots: robots, sitemap: sitemap, issues: issues };
}

/* ---- Technical: SSL, links, schema ---- */
async function runTechnical(url, origin, htmlResult) {
  if (!htmlResult) return { status: 'error', score: null, issues: [] };
  var https = htmlResult.https === true && htmlResult.ok;      // a successful https fetch implies a valid cert
  var html = htmlResult.html || '';
  var schema = /application\/ld\+json/i.test(html) || /\bitemscope\b/i.test(html);

  // broken-link check: sample up to 8 links
  var links = [];
  var re = /href=["']([^"'#]+)["']/gi, m;
  while ((m = re.exec(html)) && links.length < 25) {
    var href = m[1];
    if (/^(mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    try { links.push(new URL(href, origin).href); } catch (e) {}
  }
  links = Array.from(new Set(links)).slice(0, 8);
  var broken = [];
  await Promise.all(links.map(async function (l) {
    try {
      var st = await withTimeout(async function (signal) {
        var r = await fetch(l, { method: 'GET', signal: signal, redirect: 'follow', headers: { 'User-Agent': 'EarvinAuditBot/1.0' } });
        return r.status;
      }, 5000);
      if (st >= 400) broken.push({ url: l, status: st });
    } catch (e) { broken.push({ url: l, status: 'unreachable' }); }
  }));

  var issues = [];
  if (!https) issues.push('Site isn’t served securely over HTTPS (or the certificate didn’t validate).');
  if (!schema) issues.push('No structured data (schema markup) detected — this is key for AI search.');
  if (broken.length) issues.push(broken.length + ' link' + (broken.length > 1 ? 's' : '') + ' returned errors.');

  var score = 100;
  if (!https) score -= 35; if (!schema) score -= 25; score -= Math.min(30, broken.length * 10);
  score = Math.max(0, Math.min(100, score));

  return { status: 'ok', score: score, https: https, schema: schema, brokenLinks: broken, linksChecked: links.length, issues: issues };
}

/* ---- AI-visibility snapshot (Anthropic) ---- */
async function runAiVisibility(htmlResult) {
  var key = process.env.ANTHROPIC_API_KEY;
  if (!key || !htmlResult || !htmlResult.html) return { status: 'skipped', appeared: null };
  var html = htmlResult.html;
  var title = ((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim().slice(0, 160);
  var desc = ((html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i) || [])[1] || '').trim().slice(0, 300);
  var prompt = 'You are evaluating whether a local business would surface in an AI assistant answer. ' +
    'Here is the business, from its homepage:\nTitle: ' + title + '\nDescription: ' + desc + '\n\n' +
    'Infer the business type and location. Then decide: if a typical customer asked an AI assistant ' +
    '"best [business type] in [location]", is THIS specific business likely to be named today based only on this homepage signal? ' +
    'Be realistic and conservative. Respond ONLY as compact JSON: ' +
    '{"query":"best ... in ...","appeared":true|false,"reason":"one short sentence"}';
  try {
    var data = await withTimeout(async function (signal) {
      var r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: signal,
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-3-5-haiku-latest', max_tokens: 200,
          messages: [{ role: 'user', content: prompt }] })
      });
      return r.json();
    }, 15000);
    var text = data && data.content && data.content[0] && data.content[0].text || '';
    var parsed = JSON.parse((text.match(/\{[\s\S]*\}/) || ['{}'])[0]);
    return { status: 'ok', appeared: !!parsed.appeared, query: parsed.query || 'best business near you', reason: parsed.reason || '' };
  } catch (e) {
    return { status: 'error', appeared: null };
  }
}

async function checkExists(u) {
  try {
    return await withTimeout(async function (signal) {
      var r = await fetch(u, { method: 'GET', signal: signal, headers: { 'User-Agent': 'EarvinAuditBot/1.0' } });
      return r.status >= 200 && r.status < 400;
    }, 5000);
  } catch (e) { return false; }
}

function buildTopFlags(checks) {
  var flags = [];
  ['seo', 'technical'].forEach(function (k) { (checks[k] && checks[k].issues || []).forEach(function (i) { flags.push(i); }); });
  if (checks.performance && checks.performance.status === 'ok') {
    var worst = Math.min(
      checks.performance.mobile == null ? 101 : checks.performance.mobile,
      checks.performance.desktop == null ? 101 : checks.performance.desktop
    );
    if (worst <= 49) flags.unshift('Performance is slow (score ' + worst + ') — visitors and search engines notice.');
    else if (worst <= 89) flags.push('Performance has room to improve (score ' + worst + ').');
  }
  return flags;
}

/* ---- Emails via Resend (visitor report + Earvin notification) ---- */
async function sendReports(lead) {
  var key = process.env.RESEND_API_KEY;
  var from = process.env.AUDIT_FROM_EMAIL;
  var notify = process.env.AUDIT_NOTIFY_EMAIL;
  if (!key || !from) return false;

  var reportHtml = buildEmailHtml(lead);
  var sent = false;

  // 1) full report to the visitor
  sent = await resendSend(key, { from: from, to: lead.email, subject: 'Your free website audit — ' + hostname(lead.url), html: reportHtml }) || sent;

  // 2) lead notification to Earvin
  if (notify) {
    var note = '<p><strong>New audit lead</strong></p><ul>' +
      '<li>Name: ' + esc(lead.firstName) + '</li>' +
      '<li>Email: ' + esc(lead.email) + '</li>' +
      '<li>URL: ' + esc(lead.url) + '</li>' +
      '<li>Mobile: ' + fmt(lead.checks.performance.mobile) + ' · Desktop: ' + fmt(lead.checks.performance.desktop) + '</li>' +
      '</ul>' + reportHtml;
    await resendSend(key, { from: from, to: notify, subject: 'New audit lead — ' + esc(lead.firstName) + ' (' + hostname(lead.url) + ')', html: note });
  }
  return sent;
}
async function resendSend(key, payload) {
  try {
    var r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify(payload)
    });
    return r.ok;
  } catch (e) { return false; }
}

function buildEmailHtml(lead) {
  var c = lead.checks;
  var row = function (label, val) { return '<tr><td style="padding:6px 12px;color:#8d887f">' + label + '</td><td style="padding:6px 12px;color:#111;font-weight:600">' + val + '</td></tr>'; };
  var flags = (lead.topFlags || []).map(function (f) { return '<li style="margin:4px 0">' + esc(f) + '</li>'; }).join('') || '<li>No major red flags in the quick scan.</li>';
  var ai = c.aiVisibility && c.aiVisibility.status !== 'skipped'
    ? '<p style="color:#555"><strong>AI search snapshot:</strong> asking an AI assistant &ldquo;' + esc(c.aiVisibility.query || '') + '&rdquo; — ' +
      (c.aiVisibility.appeared === true ? 'your business came up.' : c.aiVisibility.appeared === false ? 'it did not come up this time.' : 'couldn’t check.') +
      ' <em>This is a one-time snapshot, not a ranking guarantee.</em></p>' : '';
  return '' +
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px">' +
    '<h2 style="color:#111">Your website audit snapshot</h2>' +
    '<p style="color:#555">Here’s what I found for <strong>' + esc(lead.url) + '</strong>:</p>' +
    '<table style="border-collapse:collapse;width:100%;background:#faf7f1;border-radius:6px">' +
      row('Performance · Mobile', fmt(c.performance.mobile)) +
      row('Performance · Desktop', fmt(c.performance.desktop)) +
      row('SEO basics', fmt(c.seo.score)) +
      row('Technical health', fmt(c.technical.score)) +
    '</table>' +
    '<h3 style="color:#111;margin-top:18px">Top things to look at</h3><ul style="color:#333">' + flags + '</ul>' +
    ai +
    '<div style="margin-top:22px;padding:18px;border:1px solid #C7A97F;border-radius:6px;background:#fdfbf7">' +
      '<strong style="color:#111">Want the complete picture?</strong>' +
      '<p style="color:#555;margin:6px 0 12px">The Full Website Audit &amp; Action Plan ($600, credited toward any build within 30 days) is a deep diagnostic with a prioritized plan and a walkthrough call.</p>' +
      '<a href="https://www.earvinlaureano.com/pricing.html#audit" style="background:#C7A97F;color:#0c0c0c;padding:10px 18px;border-radius:4px;text-decoration:none;font-weight:700">See the Full Audit</a>' +
    '</div>' +
    '<p style="color:#999;font-size:12px;margin-top:18px">Automated snapshot from earvinlaureano.com · Reply to this email to reach Earvin directly.</p>' +
    '</div>';
}

/* ---- Lead storage via Google Apps Script webhook ---- */
async function saveLead(lead) {
  var hook = process.env.SHEETS_WEBHOOK_URL;
  if (!hook) return false;
  try {
    var payload = {
      timestamp: new Date().toISOString(),
      firstName: lead.firstName,
      email: lead.email,
      url: lead.url,
      perfMobile: lead.checks.performance.mobile,
      perfDesktop: lead.checks.performance.desktop,
      seoScore: lead.checks.seo.score,
      technicalScore: lead.checks.technical.score,
      flags: (lead.topFlags || []).join(' | ')
    };
    var r = await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return r.ok;
  } catch (e) { return false; }
}

function hostname(u) { try { return new URL(u).hostname; } catch (e) { return u; } }
function fmt(n) { return (n === null || n === undefined) ? 'couldn’t check' : String(n); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (ch) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]; }); }
