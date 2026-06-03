/* ============================================================
   CANARY ALERT ENDPOINT — Google Apps Script
   Receives a ping when Earvin's site code runs on a domain that
   isn't his, logs it to a "Canary Alerts" sheet tab, and emails him.

   ── HOW TO DEPLOY ────────────────────────────────────────────
   1. Open a Google Sheet (you can reuse your audit-leads sheet).
   2. Extensions → Apps Script.
   3. Paste this whole file in, replacing anything there.
   4. Set ALERT_EMAIL below to where you want alerts.
   5. Deploy → New deployment → type "Web app":
        - Execute as: Me
        - Who has access: Anyone
   6. Copy the Web App URL (ends in /exec).
   7. Paste that URL into assets/analytics.js → CANARY_ENDPOINT.
   ============================================================ */

var ALERT_EMAIL = 'earvin.laureano@gmail.com';   // ← where alerts go
var SHEET_NAME  = 'Canary Alerts';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Domain (where your code ran)', 'Full URL', 'Referrer', 'User Agent']);
      sheet.getRange('A1:E1').setFontWeight('bold');
    }
    sheet.appendRow([
      new Date(),
      data.host || '',
      data.fullUrl || '',
      data.referrer || '(direct / unknown)',
      data.ua || ''
    ]);

    MailApp.sendEmail({
      to: ALERT_EMAIL,
      subject: '🚨 Canary: your website code is running on "' + (data.host || 'an unknown domain') + '"',
      htmlBody:
        '<h2 style="font-family:Arial">Possible copy of your site detected</h2>' +
        '<p style="font-family:Arial">Your website\'s canary fired on a domain that isn\'t yours — ' +
        'someone may be running a copy of your code.</p>' +
        '<table cellpadding="8" style="border-collapse:collapse;font-family:Arial;font-size:14px">' +
        row('Domain', data.host) +
        row('Full URL', data.fullUrl) +
        row('Came from', data.referrer || '(direct / unknown)') +
        row('Browser', data.ua) +
        row('When', new Date()) +
        '</table>' +
        '<p style="font-family:Arial;color:#888;font-size:12px">Logged to your "' + SHEET_NAME + '" tab. ' +
        'Note: a referrer + domain is strong evidence of a copy-paste, but verify before acting.</p>'
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

function row(label, value) {
  var esc = String(value == null ? '' : value).replace(/[&<>"]/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
  });
  return '<tr><td style="border:1px solid #eee"><b>' + label + '</b></td>' +
         '<td style="border:1px solid #eee">' + esc + '</td></tr>';
}
