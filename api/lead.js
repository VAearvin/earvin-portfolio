/**
 * Lead capture (Airtable + optional Apps Script mirror).
 *
 * Single endpoint for every lead form on the site. Routes by `source`:
 *   - "website-audit-57"    : $57 comprehensive website audit (tripwire)
 *   - "funnel-audit-57"     : $57 funnel audit (tripwire)
 *   - "guide-philippines"   : free 5-page hiring guide opt-in
 *   - "contact"             : homepage contact form
 *
 * Environment variables (set in Vercel → Project → Settings → Environment Variables):
 *   AIRTABLE_TOKEN         (required) — personal access token, scoped to one base, with data.records:write
 *   AIRTABLE_BASE_ID       (required) — base id, starts with "app"
 *   AIRTABLE_TABLE_LEADS   (optional, default "Leads") — name of the table to write to
 *   LEADS_WEBHOOK_URL      (optional) — Apps Script URL for leads. Logs the lead to a sheet AND,
 *                          for guide opt-ins, emails the visitor the download link. Runs in parallel.
 *                          Keep this SEPARATE from the audit's SHEETS_WEBHOOK_URL — different shapes.
 *
 * All forms post JSON to /api/lead. Honeypot field `company_website` silently drops bots.
 */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  var body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  if (body.company_website) {
    return json(res, 200, { ok: true, skipped: 'bot' });
  }

  var ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
        || (req.socket && req.socket.remoteAddress) || 'unknown';
  if (rateLimited(ip)) return json(res, 429, { ok: false, error: 'Too many submissions. Please try again later.' });

  var source = String(body.source || '').slice(0, 40);
  var name   = String(body.name || body.firstName || '').trim().slice(0, 120);
  var email  = String(body.email || '').trim().slice(0, 160);
  var phone  = String(body.phone || '').trim().slice(0, 40);
  var url    = String(body.url || body.website || '').trim().slice(0, 300);
  var note   = String(body.message || body.note || '').trim().slice(0, 4000);
  var company = String(body.company || '').trim().slice(0, 160);
  var serviceInterest = String(body.service || '').trim().slice(0, 120);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(res, 400, { ok: false, error: 'A valid email is required.' });
  }
  if (!source) {
    return json(res, 400, { ok: false, error: 'Missing source.' });
  }

  var record = {
    Source: source,
    Name: name,
    Email: email,
    Phone: phone,
    Website: url,
    Company: company,
    Service: serviceInterest,
    Notes: note,
    Status: 'new',
    SubmittedAt: new Date().toISOString(),
    IP: ip,
    UserAgent: String(req.headers['user-agent'] || '').slice(0, 240)
  };

  var airtablePromise = writeToAirtable(record).catch(function (err) {
    console.error('airtable error', err && err.message);
    return { ok: false, error: 'airtable' };
  });

  var sheetsPromise = process.env.LEADS_WEBHOOK_URL
    ? mirrorToSheets(record).catch(function (err) {
        console.error('leads webhook error', err && err.message);
        return { ok: false, error: 'sheets' };
      })
    : Promise.resolve({ ok: true, skipped: true });

  var results = await Promise.all([airtablePromise, sheetsPromise]);
  var atOk = results[0] && results[0].ok;
  var shOk = results[1] && (results[1].ok || results[1].skipped);

  if (!atOk && !shOk) {
    return json(res, 500, { ok: false, error: 'Lead capture failed. Please email inquire@earvinlaureano.com directly.' });
  }

  return json(res, 200, { ok: true, airtable: atOk, sheets: shOk });
};

async function writeToAirtable(record) {
  var token = process.env.AIRTABLE_TOKEN;
  var baseId = process.env.AIRTABLE_BASE_ID;
  var table = process.env.AIRTABLE_TABLE_LEADS || 'Leads';
  if (!token || !baseId) throw new Error('Airtable not configured');

  var endpoint = 'https://api.airtable.com/v0/' + baseId + '/' + encodeURIComponent(table);
  var res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      records: [{ fields: record }],
      typecast: true
    })
  });
  if (!res.ok) {
    var text = await res.text();
    throw new Error('Airtable ' + res.status + ' ' + text.slice(0, 200));
  }
  return { ok: true };
}

async function mirrorToSheets(record) {
  var url = process.env.LEADS_WEBHOOK_URL;
  var res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  });
  if (!res.ok) throw new Error('Leads webhook ' + res.status);
  return { ok: true };
}

var rateBucket = {};
function rateLimited(ip) {
  var now = Date.now();
  var win = 5 * 60 * 1000;
  var max = 8;
  for (var k in rateBucket) { if (now - rateBucket[k].t > win) delete rateBucket[k]; }
  var b = rateBucket[ip] || { n: 0, t: now };
  if (now - b.t > win) { b = { n: 0, t: now }; }
  b.n += 1; b.t = now;
  rateBucket[ip] = b;
  return b.n > max;
}

function json(res, code, payload) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(payload));
}
