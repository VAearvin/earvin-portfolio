// ============================================================
// EARVIN LAUREANO — Free Website Audit → Google Sheets (Audit Leads tab)
// ============================================================
// This is SEPARATE from your contact-form script, so it does NOT touch it.
// It writes audit leads into a new "Audit Leads" tab on your EXISTING sheet.
//
// SETUP (5 minutes):
//
// 1. Open your existing Google Sheet, copy its ID from the URL:
//       https://docs.google.com/spreadsheets/d/THIS_LONG_ID_HERE/edit
//
// 2. Go to https://script.google.com  → New project
//    (a STANDALONE project — do NOT paste this into your contact-form script)
//
// 3. Delete everything in the editor, paste this entire file.
//
// 4. Below, replace PASTE_YOUR_SHEET_ID_HERE with the ID from step 1.
//
// 5. Click Save (floppy icon). Then Run ▶ the "testSetup" function once and
//    approve the permissions prompt (it just needs Sheets + Gmail access).
//
// 6. Deploy → New deployment
//      - Type: Web app
//      - Execute as: Me
//      - Who has access: Anyone
//    Click Deploy → copy the Web App URL.
//
// 7. Send that URL to Claude / set it as the SHEETS_WEBHOOK_URL env var in Vercel.
//
// 8. Done — the "Audit Leads" tab is created automatically on the first lead.
// ============================================================

const SPREADSHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';
const TAB_NAME       = 'Audit Leads';
const NOTIFY_EMAIL   = 'services.earvinlaureano@gmail.com';

function doPost(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(TAB_NAME);
    if (!sheet) sheet = ss.insertSheet(TAB_NAME); // auto-create the tab

    // Header row if the tab is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'First Name', 'Email', 'URL',
                       'Mobile', 'Desktop', 'SEO', 'Technical', 'Flags']);
      sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    }

    const d = JSON.parse(e.postData.contents);

    sheet.appendRow([
      d.timestamp      || new Date().toISOString(),
      d.firstName      || '',
      d.email          || '',
      d.url            || '',
      (d.perfMobile    === null || d.perfMobile    === undefined) ? '—' : d.perfMobile,
      (d.perfDesktop   === null || d.perfDesktop   === undefined) ? '—' : d.perfDesktop,
      (d.seoScore      === null || d.seoScore      === undefined) ? '—' : d.seoScore,
      (d.technicalScore=== null || d.technicalScore=== undefined) ? '—' : d.technicalScore,
      d.flags          || ''
    ]);

    // 1) Email the VISITOR their full report (HTML). Sent from this Gmail account.
    if (d.email && d.reportHtml) {
      GmailApp.sendEmail(
        d.email,
        d.subject || 'Your free website audit',
        'Open this email in an HTML-capable client to view your audit snapshot.',
        { htmlBody: d.reportHtml, name: 'Earvin Laureano' }
      );
    }

    // 2) Notify Earvin (optional — remove this block if you don't want the email)
    GmailApp.sendEmail(
      NOTIFY_EMAIL,
      '🔍 New Audit Lead — ' + (d.firstName || 'Someone') + ' (' + (d.url || '') + ')',
      [
        'New free-audit lead from your website:',
        '',
        'Name:   ' + (d.firstName || '—'),
        'Email:  ' + (d.email || '—'),
        'URL:    ' + (d.url || '—'),
        'Mobile: ' + (d.perfMobile ?? '—') + '   Desktop: ' + (d.perfDesktop ?? '—'),
        'SEO:    ' + (d.seoScore ?? '—') + '   Technical: ' + (d.technicalScore ?? '—'),
        '',
        'Flags:',
        (d.flags || '—'),
        '',
        '—',
        'Logged to the "Audit Leads" tab automatically.'
      ].join('\n')
    );

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Run this once from the editor to grant permissions and confirm the ID works.
function testSetup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TAB_NAME) || ss.insertSheet(TAB_NAME);
  Logger.log('Connected to: ' + ss.getName() + ' → tab "' + sheet.getName() + '"');
  Logger.log('Setup looks good!');
}
