/**
 * Free Website Audit — serverless handler (Vercel Node function).
 * Zero npm dependencies: everything uses the native global fetch.
 *
 * Environment variables (set in Vercel project settings → Environment Variables,
 * or a local .env loaded by dev-server.js). NONE are committed.
 *   PAGESPEED_API_KEY   — Google PageSpeed Insights API key (performance scores) [optional]
 *   SHEETS_WEBHOOK_URL  — Google Apps Script web-app URL. ONE call does three things:
 *                         logs the lead to the sheet, emails the visitor their report,
 *                         and emails Earvin a notification. No paid email service needed.
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
    runAiReadiness(htmlResult)
  ]);

  var performance = pick(settled[0], { status: 'error', mobile: null, desktop: null });
  var seo = pick(settled[1], { status: 'error', score: null, issues: [] });
  var technical = pick(settled[2], { status: 'error', score: null, issues: [] });
  var aiReadiness = pick(settled[3], { status: 'error', readiness: null });

  var checks = { performance: performance, seo: seo, technical: technical, aiReadiness: aiReadiness };
  var topFlags = buildTopFlags(checks).slice(0, 4);

  // --- Side effect: ONE webhook call logs the lead AND emails (visitor report + Earvin notification) ---
  var reportHtml = buildEmailHtml({ url: url, firstName: firstName, email: email, checks: checks, topFlags: topFlags });
  var leadSaved = false;
  try { leadSaved = await saveLead({ url: url, firstName: firstName, email: email, checks: checks, topFlags: topFlags, reportHtml: reportHtml }); } catch (e) {}
  var emailed = leadSaved; // the Apps Script webhook sends the visitor's report when the lead is saved

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

/* ---- AI Search Readiness (free, structural — no external API) ----
   Reads the page's own structure to judge whether AI search engines can
   understand and recommend the business. This is a structural snapshot,
   not a live ranking and not a guarantee. */
function runAiReadiness(htmlResult) {
  if (!htmlResult || !htmlResult.html) return { status: 'error', readiness: null };
  var html = htmlResult.html;
  var lower = html.toLowerCase();

  // structured data, with emphasis on the types AI engines lean on
  var jsonld = (html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || []).join(' ');
  var hasSchema = /application\/ld\+json/i.test(html) || /\bitemscope\b/i.test(html);
  var localBusiness = /"@type"\s*:\s*"(LocalBusiness|[A-Za-z]+Business|BeautySalon|HairSalon|Dentist|MedicalBusiness|HealthAndBeautyBusiness|Restaurant|ProfessionalService|Store|Organization)"/i.test(jsonld);
  var faqSchema = /"@type"\s*:\s*"FAQPage"/i.test(jsonld);

  // entity clarity — can a machine read who/where/how to reach the business?
  var hasPhone = /tel:\+?\d/.test(html) || /\b(\+?\d[\d\s().-]{7,}\d)\b/.test(html.replace(/<[^>]+>/g, ' '));
  var hasEmail = /mailto:/i.test(html);
  var hasAddressHint = /\b\d{1,5}\s+[\w.]+(\s+\w+){0,4}\s+(street|st|ave|avenue|road|rd|blvd|boulevard|lane|ln|drive|dr|suite|ste|unit|floor)\b/i.test(lower)
    || /\b(address|location|visit us|find us)\b/i.test(lower);
  var entityClarity = (hasPhone || hasEmail) && hasAddressHint;

  // FAQ / answer-style content AI can extract
  var faqContent = faqSchema || /frequently asked|\bfaq\b/i.test(lower);

  // clean semantic structure
  var semantic = /<(header|main|nav|footer|section|article)\b/i.test(html);
  var singleH1 = (html.match(/<h1[\s>]/gi) || []).length === 1;
  var goodStructure = semantic && singleH1;

  var score = 0;
  if (hasSchema) score += 30;
  if (localBusiness) score += 25;
  if (entityClarity) score += 20;
  if (faqContent) score += 15;
  if (goodStructure) score += 10;
  score = Math.min(100, score);
  var readiness = score >= 60 ? 'good' : 'needs work';

  var issues = [];
  if (!hasSchema) issues.push('No structured data — AI engines have nothing machine-readable to understand your business.');
  else if (!localBusiness) issues.push('No LocalBusiness schema — AI can’t clearly tell what you are or where you’re located.');
  if (!entityClarity) issues.push('Your name, location, and contact details aren’t clearly machine-readable.');
  if (!faqContent) issues.push('No FAQ / answer-style content for AI to pull from.');

  var line = readiness === 'good'
    ? 'Your site gives AI search engines clear signals to understand and recommend it.'
    : 'Your site isn’t structured for AI search engines to understand and recommend it.';

  return { status: 'ok', readiness: readiness, score: score,
           signals: { schema: hasSchema, localBusiness: localBusiness, entityClarity: entityClarity, faq: faqContent, structure: goodStructure },
           issues: issues, line: line };
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
  if (checks.aiReadiness && checks.aiReadiness.status === 'ok' && checks.aiReadiness.readiness === 'needs work') {
    flags.push('Not structured for AI search to understand and recommend you.');
  }
  return flags;
}

function buildEmailHtml(lead) {
  var c = lead.checks;
  var row = function (label, val) { return '<tr><td style="padding:6px 12px;color:#8d887f">' + label + '</td><td style="padding:6px 12px;color:#111;font-weight:600">' + val + '</td></tr>'; };
  var flags = (lead.topFlags || []).map(function (f) { return '<li style="margin:4px 0">' + esc(f) + '</li>'; }).join('') || '<li>No major red flags in the quick scan.</li>';
  var ai = c.aiReadiness && c.aiReadiness.status === 'ok'
    ? '<p style="color:#555"><strong>AI search readiness:</strong> ' +
      (c.aiReadiness.readiness === 'good' ? 'Good — ' : 'Needs work — ') + esc(c.aiReadiness.line) +
      ' <em>(A structural snapshot of how readable your site is to AI — not a live ranking.)</em></p>' : '';
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
    '<div style="margin-top:22px;padding:20px;border:1px solid #C7A97F;border-radius:6px;background:#fdfbf7">' +
      '<div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#a88a62;font-weight:700;margin-bottom:6px">That was the quick scan</div>' +
      '<strong style="color:#111;font-size:16px">Want the full picture — and exactly what to fix?</strong>' +
      '<p style="color:#555;margin:6px 0 12px">The free scan shows you what’s wrong. The full audit hands you the plan to fix it:</p>' +
      '<ul style="color:#333;padding-left:18px;margin:0 0 14px;line-height:1.7">' +
        '<li><strong>Find out if AI is recommending you — or your competitor.</strong></li>' +
        '<li><strong>Where you’re losing customers</strong> — the booking and conversion gaps.</li>' +
        '<li><strong>Why you’re not ranking on Google</strong> — the full SEO picture.</li>' +
        '<li><strong>What to fix first</strong> — a prioritized plan, ranked by impact.</li>' +
        '<li><strong>A 30-minute walkthrough call</strong> to talk through your priorities.</li>' +
      '</ul>' +
      '<p style="color:#111;margin:0 0 12px"><strong>Full Website Audit &amp; Action Plan — $600</strong> · credited toward any build.</p>' +
      '<a href="https://www.earvinlaureano.com/pricing.html#audit" style="background:#C7A97F;color:#0c0c0c;padding:10px 18px;border-radius:4px;text-decoration:none;font-weight:700">Book my full audit</a>' +
    '</div>' +
    '<p style="color:#999;font-size:12px;margin-top:18px">Automated snapshot from earvinlaureano.com · Reply to this email to reach Earvin directly.</p>' +
    '</div>';
}

/* ---- Lead storage + emails via Google Apps Script webhook ----
   One POST: the Apps Script appends the row, emails the visitor the report
   (reportHtml), and emails Earvin a notification. No paid email service. */
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
      flags: (lead.topFlags || []).join(' | '),
      subject: 'Your free website audit — ' + hostname(lead.url),
      reportHtml: lead.reportHtml || ''
    };
    var r = await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return r.ok;
  } catch (e) { return false; }
}

function hostname(u) { try { return new URL(u).hostname; } catch (e) { return u; } }
function fmt(n) { return (n === null || n === undefined) ? 'couldn’t check' : String(n); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (ch) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]; }); }
