// ============================================================
// EARVIN LAUREANO — Contact Form → Google Sheets
// ============================================================
// HOW TO SET THIS UP:
//
// 1. Go to Google Sheets → create a new sheet
//    Name the columns in Row 1:
//    Timestamp | Name | Email | Company | Service | Message
//
// 2. Click Extensions → Apps Script
//
// 3. Delete everything in the editor and paste this entire file
//
// 4. Click Save (floppy disk icon)
//
// 5. Click Deploy → New Deployment
//    - Type: Web App
//    - Execute as: Me
//    - Who has access: Anyone
//    Click Deploy → Copy the Web App URL
//
// 6. Paste that URL into index.html where it says:
//    const SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
//
// 7. Done! Test by submitting your contact form.
// ============================================================

const SHEET_NAME = 'Inquiries'; // Change if your sheet tab has a different name
const NOTIFY_EMAIL = 'services.earvinlaureano@gmail.com';

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
                  || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Add headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Name', 'Email', 'Company / Role', 'Service', 'Message']);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    }

    const data = JSON.parse(e.postData.contents);

    // Append the new inquiry row
    sheet.appendRow([
      data.timestamp || new Date().toLocaleString(),
      data.name      || '',
      data.email     || '',
      data.company   || '',
      data.service   || '',
      data.message   || ''
    ]);

    // Send email notification
    GmailApp.sendEmail(
      NOTIFY_EMAIL,
      '📬 New Inquiry — ' + (data.name || 'Someone') + ' via earvinlaureano.com',
      [
        'You have a new inquiry from your website.',
        '',
        'Name:     ' + (data.name    || '—'),
        'Email:    ' + (data.email   || '—'),
        'Company:  ' + (data.company || '—'),
        'Service:  ' + (data.service || '—'),
        '',
        'Message:',
        (data.message || '—'),
        '',
        '—',
        'Sent automatically from earvinlaureano.com'
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

// Test this function manually inside Apps Script editor
function testSetup() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  Logger.log('Sheet name: ' + sheet.getName());
  Logger.log('Setup looks good!');
}
