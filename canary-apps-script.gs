/* ============================================================
   CANARY ALERT RECEIVER — Google Apps Script (email-only)
   Emails Earvin when his site code runs on a domain that isn't
   his (i.e. someone copied the files onto their own site).

   Works as a STANDALONE Apps Script (no spreadsheet needed) —
   the alert emails themselves are your searchable log in Gmail.

   ── HOW TO DEPLOY ────────────────────────────────────────────
   1. script.google.com → New project.
   2. Replace Code.gs with this whole file.
   3. Set ALERT_EMAIL below if you want alerts somewhere else.
   4. Save.
   5. Deploy → New deployment → Web app:
        - Execute as: Me
        - Who has access: Anyone
   6. Copy the Web App URL (ends in /exec).
   7. Give that URL to Earvin's site → assets/analytics.js (CANARY_ENDPOINT).
   ============================================================ */

var ALERT_EMAIL = 'earvin.laureano@gmail.com';   // ← where alerts go

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    MailApp.sendEmail({
      to: ALERT_EMAIL,
      subject: '🚨 Canary: your site code is running on "' + (d.host || 'unknown') + '"',
      htmlBody:
        '<h2 style="font-family:Arial">Possible copy of your site detected</h2>' +
        '<p style="font-family:Arial">Your canary fired on a domain that isn\'t yours.</p>' +
        '<table cellpadding="8" style="border-collapse:collapse;font-family:Arial;font-size:14px">' +
        r('Domain', d.host) +
        r('Full URL', d.fullUrl) +
        r('Came from', d.referrer || '(direct/unknown)') +
        r('Browser', d.ua) +
        r('When', new Date()) +
        '</table>'
    });
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('Canary endpoint is live.');
}

function r(label, val) {
  var s = String(val == null ? '' : val).replace(/[&<>"]/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
  });
  return '<tr><td style="border:1px solid #eee"><b>' + label + '</b></td>' +
         '<td style="border:1px solid #eee">' + s + '</td></tr>';
}
