/**
 * Leads webhook — Google Apps Script.
 *
 * One endpoint for every lead form on earvinlaureano.com that posts to /api/lead.
 * It does two jobs:
 *   1. Logs every lead to a "Leads" tab in your Google Sheet.
 *   2. For guide opt-ins (Source = "guide-philippines"), emails the visitor a
 *      download link for the PDF, and notifies you. Sent from THIS Gmail account.
 *
 * This is SEPARATE from your audit Apps Script. Deploy it as its own web app and
 * put the resulting URL in Vercel as the env var  LEADS_WEBHOOK_URL.
 *
 * ── SETUP ─────────────────────────────────────────────────────────────────
 * 1. Open the Google Sheet you want leads in (or make a new one).
 * 2. Extensions → Apps Script. Paste this whole file in, replacing anything there.
 * 3. Set SPREADSHEET_ID below to your sheet's id (the long string in its URL).
 * 4. Set NOTIFY_EMAIL to where you want lead alerts (your own inbox).
 * 5. Click Save. Run ▶ the "testSetup" function once and grant permissions.
 * 6. Deploy → New deployment → type "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 *    Copy the web-app URL.
 * 7. In Vercel → Project → Settings → Environment Variables, add:
 *      LEADS_WEBHOOK_URL = <that URL>
 *    Redeploy. Done.
 * ──────────────────────────────────────────────────────────────────────────
 */

var SPREADSHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';
var TAB_NAME       = 'Leads';
var NOTIFY_EMAIL   = 'services.elaureano@gmail.com';   // where YOU get lead alerts (your inbox)
var REPLY_TO       = 'inquire@earvinlaureano.com';     // what the LEAD sees as reply-to on auto-replies
// Note: the "From" address is whatever Google account runs this script. To make the From itself
// show inquire@earvinlaureano.com, add it as a verified "Send mail as" alias in that Gmail account
// (Settings -> Accounts -> Send mail as), then add  from: REPLY_TO  to the sendEmail options below.

// Map a lead Source to the file it should email out. Add more as you build more guides.
var GUIDES = {
  'guide-philippines': {
    subject: 'Your guide: How to Hire an Executive Partner from the Philippines',
    title:   'How to Hire an Executive Partner from the Philippines',
    url:     'https://www.earvinlaureano.com/guides/hire-executive-partner-philippines/guide.pdf',
    webUrl:  'https://www.earvinlaureano.com/guides/hire-executive-partner-philippines'
  }
};

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);

    // 1) OPTIONAL backup: also log to a Google Sheet, only if SPREADSHEET_ID is set.
    //    Your leads already go to Airtable, so you can skip this entirely.
    if (SPREADSHEET_ID && SPREADSHEET_ID.indexOf('PASTE') === -1) {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var sheet = ss.getSheetByName(TAB_NAME) || ss.insertSheet(TAB_NAME);
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Timestamp', 'Source', 'Name', 'Email', 'Phone',
                         'Website', 'Company', 'Service', 'Notes', 'Status']);
        sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
      }
      sheet.appendRow([
        d.SubmittedAt || new Date().toISOString(),
        d.Source || '', d.Name || '', d.Email || '', d.Phone || '',
        d.Website || '', d.Company || '', d.Service || '', d.Notes || '',
        d.Status || 'new'
      ]);
    }

    // 2) If this is a guide opt-in, email the visitor the download link
    var guide = GUIDES[d.Source];
    if (guide && d.Email) {
      GmailApp.sendEmail(
        d.Email,
        guide.subject,
        guideEmailText(d.Name, guide),               // plain-text fallback
        { htmlBody: guideEmailHtml(d.Name, guide), name: 'Earvin Laureano', replyTo: REPLY_TO }
      );
    }

    // 2b) For every other lead (book-a-call, audit, contact): auto-reply confirmation.
    else if (d.Email) {
      GmailApp.sendEmail(
        d.Email,
        "Got it, I'll be in touch soon",
        confirmText(d.Name),
        { htmlBody: confirmHtml(d.Name), name: 'Earvin Laureano', replyTo: REPLY_TO }
      );
    }

    // 3) Notify you of any new lead
    GmailApp.sendEmail(
      NOTIFY_EMAIL,
      'New lead — ' + (d.Source || 'unknown') + ' — ' + (d.Name || 'Someone'),
      [
        'New lead from your website:',
        '',
        'Source:  ' + (d.Source || '—'),
        'Name:    ' + (d.Name || '—'),
        'Email:   ' + (d.Email || '—'),
        'Phone:   ' + (d.Phone || '—'),
        'Website: ' + (d.Website || '—'),
        'Notes:   ' + (d.Notes || '—'),
        '',
        '— Logged to the "' + TAB_NAME + '" tab automatically.'
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

function confirmText(name) {
  return [
    'Hi ' + (name || 'there') + ',',
    '',
    'Thanks for reaching out. I have your request, and I will get back to you',
    'within one business day, usually sooner.',
    '',
    'If anything is urgent in the meantime, just reply to this email.',
    '',
    'Talk soon,',
    'Earvin Laureano',
    'Websites · Funnels · Digital Systems'
  ].join('\n');
}

function confirmHtml(name) {
  return [
    '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;line-height:1.65;">',
      '<p style="font-size:15px;">Hi ' + escapeHtml(name || 'there') + ',</p>',
      '<p style="font-size:15px;">Thanks for reaching out. I have your request, and I will get back to you <strong>within one business day</strong>, usually sooner.</p>',
      '<p style="font-size:14px;color:#555;">If anything is urgent in the meantime, just reply to this email.</p>',
      '<p style="font-size:14px;margin-top:24px;">Talk soon,<br/>Earvin Laureano<br/>',
        '<span style="color:#8a6a3f;">Websites · Funnels · Digital Systems</span></p>',
    '</div>'
  ].join('');
}

function guideEmailText(name, guide) {
  return [
    'Hi ' + (name || 'there') + ',',
    '',
    'Thanks for grabbing the guide. Here is your download:',
    guide.url,
    '',
    'Prefer to read it on the web? ' + guide.webUrl,
    '',
    'No drip sequence coming. The guide is the thing. If you read it and want to',
    'talk through whether this role fits your business, just reply to this email.',
    '',
    'Earvin Laureano',
    'Websites · Funnels · Digital Systems'
  ].join('\n');
}

function guideEmailHtml(name, guide) {
  return [
    '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;line-height:1.65;">',
      '<p style="font-size:15px;">Hi ' + escapeHtml(name || 'there') + ',</p>',
      '<p style="font-size:15px;">Thanks for grabbing the guide. Here it is, ready to download:</p>',
      '<p style="margin:26px 0;">',
        '<a href="' + guide.url + '" ',
          'style="display:inline-block;background:#C7A97F;color:#0c0c0c;text-decoration:none;',
          'font-weight:700;font-size:13px;letter-spacing:0.04em;padding:14px 28px;border-radius:4px;">',
          'Download the PDF',
        '</a>',
      '</p>',
      '<p style="font-size:14px;color:#555;">Prefer to read it on the web? ',
        '<a href="' + guide.webUrl + '" style="color:#8a6a3f;">Open the web version</a>.</p>',
      '<p style="font-size:14px;">No drip sequence coming. The guide is the thing. If you read it and ',
        'want to talk through whether this role fits your business, just reply to this email.</p>',
      '<p style="font-size:14px;margin-top:26px;">Earvin Laureano<br/>',
        '<span style="color:#8a6a3f;">Websites · Funnels · Digital Systems</span></p>',
    '</div>'
  ].join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// Run this ONCE from the editor. It asks for Gmail permission, then emails you a
// test message so you know notifications work. Check your inbox after running.
function testSetup() {
  GmailApp.sendEmail(
    NOTIFY_EMAIL,
    'Test: your lead emails are working',
    'If you are reading this, your lead notifications are set up correctly. You can delete this.'
  );
  Logger.log('Sent a test email to ' + NOTIFY_EMAIL + '. Check that inbox.');
}
