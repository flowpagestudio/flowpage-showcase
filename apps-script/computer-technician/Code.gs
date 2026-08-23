/**
 * FlowPage Studio — Computer Technician Operations
 * Unified Web App: public intake, owner management, gallery API.
 *
 * Account: flowpagestudio@gmail.com only.
 * Run setupProject() once from the Apps Script editor after paste/deploy.
 */
const CONFIG = {
  SHEET_ID: '1vykF1rNH13FN3P5GM8ZEmU8uqImnKxosZQNdo0K94RA',
  SHEET_NAME: 'פניות',
  GALLERY_SHEET_NAME: 'גלריה',
  SETTINGS_SHEET_NAME: 'הגדרות',
  ATTACHMENTS_FOLDER_ID: '1iD6btMyEAOhPRWhAlJnV-f71VdkVMDky',
  OWNER_EMAIL: 'flowpagestudio@gmail.com',
  BUSINESS_NAME: 'טכנאי מחשבים',
  TIMEZONE: 'Asia/Jerusalem',
  CALENDAR_ID: 'primary',
  MAX_FILE_BYTES: 8 * 1024 * 1024,
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'video/mp4',
    'video/quicktime'
  ],
  GALLERY_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  GALLERY_SLOTS: 5
};

const HEADERS = [
  'מזהה פנייה', 'תאריך קבלה', 'שם מלא', 'טלפון', 'אימייל', 'סוג תקלה',
  'מותג / דגם', 'תיאור התקלה', 'כתובת', 'סוג שירות', 'מועד מועדף',
  'סטטוס', 'מזהה אירוע ביומן', 'קבצים מצורפים', 'הודעת אישור', 'עדכון אחרון'
];

const GALLERY_HEADERS = [
  'מיקום', 'כותרת', 'תיאור', 'מזהה קובץ', 'כתובת הצגה', 'פעיל'
];

const SETTINGS_HEADERS = ['מפתח', 'ערך'];

const GALLERY_SEED = [
  {
    slot: 'gallery-1',
    title: 'שדרוג עמדת עבודה',
    description: 'שדרוג עמדת עבודה ביתית',
    url: 'https://raw.githubusercontent.com/flowpagestudio/flowpage-assets/main/02_scenarios/computer-technician/gallery/home-workstation-upgrade-v1.png'
  },
  {
    slot: 'gallery-2',
    title: 'התקנת רשת ביתית',
    description: 'התקנת רשת ביתית',
    url: 'https://raw.githubusercontent.com/flowpagestudio/flowpage-assets/main/02_scenarios/computer-technician/gallery/home-network-installation-v1.png'
  },
  {
    slot: 'gallery-3',
    title: 'סידור תשתית וכבלים',
    description: 'סידור כבלים ועמדת מחשב',
    url: 'https://raw.githubusercontent.com/flowpagestudio/flowpage-assets/main/02_scenarios/computer-technician/gallery/cable-management-v1.png'
  },
  {
    slot: 'gallery-4',
    title: 'מחשב מוכן לעבודה',
    description: 'מחשב נייח מוכן לעבודה',
    url: 'https://raw.githubusercontent.com/flowpagestudio/flowpage-assets/main/02_scenarios/computer-technician/gallery/desktop-ready-v1.png'
  },
  {
    slot: 'gallery-5',
    title: 'מחשב נייד חזר לפעילות',
    description: 'מחשב נייד חזר לפעילות',
    url: 'https://raw.githubusercontent.com/flowpagestudio/flowpage-assets/main/02_scenarios/computer-technician/gallery/laptop-returned-to-work-v1.png'
  }
];

const LEAD_STATUSES = ['חדש', 'בטיפול', 'נקבע ביומן', 'הושלם', 'בוטל'];

/* ========== Web App entry ========== */

function doGet(e) {
  const view = (e && e.parameter && e.parameter.view) || '';

  if (view === 'management') {
    try {
      return HtmlService.createHtmlOutputFromFile('Management')
        .setTitle('ניהול המערכת')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err) {
      return HtmlService.createHtmlOutput(
        '<!doctype html><meta charset="utf-8"><body dir="rtl" style="font-family:Arial;padding:40px">' +
        '<h1>קובץ Management חסר בפרויקט</h1>' +
        '<p>ב־Apps Script צריך קובץ HTML בשם בדיוק <b>Management</b> (הדביקו את Management.html מהמאגר).</p>' +
        '<p>לאחר מכן Save → Deploy → New version.</p>' +
        '<pre>' + String(err && err.message ? err.message : err) + '</pre>' +
        '</body>'
      ).setTitle('שגיאת ניהול');
    }
  }

  if (view === 'gallery') {
    const payload = { ok: true, items: getPublicGallery() };
    const json = JSON.stringify(payload);
    const callback = e.parameter.callback;
    if (callback) {
      return ContentService
        .createTextOutput(sanitizeCallback_(callback) + '(' + json + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (view === 'health') {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        business: CONFIG.BUSINESS_NAME,
        sheets: {
          leads: CONFIG.SHEET_NAME,
          gallery: CONFIG.GALLERY_SHEET_NAME,
          settings: CONFIG.SETTINGS_SHEET_NAME
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('פנייה לטכנאי מחשבים')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return HtmlService.createHtmlOutput(
      '<!doctype html><meta charset="utf-8"><body dir="rtl" style="font-family:Arial;padding:40px">' +
      '<h1>קובץ Index חסר בפרויקט</h1>' +
      '<p>הדביקו את Index.html מהמאגר לקובץ HTML בשם <b>Index</b>, שמרו ופרסמו גרסה חדשה.</p>' +
      '<pre>' + String(err && err.message ? err.message : err) + '</pre>' +
      '</body>'
    ).setTitle('שגיאת טופס');
  }
}

/**
 * Run once from the Apps Script editor.
 * Creates missing sheets, seeds gallery slots, and authorizes Drive/Gmail/Calendar.
 */
function setupProject() {
  ensureWorkbook_();
  DriveApp.getFolderById(CONFIG.ATTACHMENTS_FOLDER_ID);
  GmailApp.getAliases();
  CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  return 'החיבור הושלם: Sheets, Drive, Gmail ו-Calendar זמינים.';
}

/* ========== Public lead intake ========== */

function submitLead(payload) {
  validatePayload_(payload);
  const leadId = 'TC-' + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss') +
    '-' + Math.floor(100 + Math.random() * 900);

  const attachments = saveAttachments_(leadId, payload.attachments || []);
  const calendarEvent = shouldBookImmediately_(payload)
    ? createCalendarEvent_(leadId, payload, attachments.urls)
    : null;

  const now = new Date();
  const status = calendarEvent ? 'נקבע ביומן' : 'חדש';
  const row = [
    leadId, now, payload.fullName, payload.phone, payload.email, payload.issueType,
    payload.deviceModel || '', payload.description, payload.address || '', payload.serviceType,
    payload.preferredDateTime || '', status, calendarEvent ? calendarEvent.getId() : '',
    attachments.urls.join('\n'), 'נשלחה', now
  ];

  getSheet_().appendRow(row);
  notifyOwner_(leadId, payload, attachments.urls, calendarEvent);
  notifyCustomer_(leadId, payload, calendarEvent);

  return {
    ok: true,
    leadId: leadId,
    booked: Boolean(calendarEvent),
    message: calendarEvent
      ? 'הפנייה נקלטה והביקור נוסף ליומן.'
      : 'הפנייה נקלטה. נחזור אליך בהקדם לתיאום.'
  };
}

/* ========== Owner management ========== */

function getManagementData() {
  assertOwner_();
  const rows = getSheet_().getDataRange().getValues();
  const heads = rows.shift() || HEADERS;
  const leads = rows
    .filter(function(r) { return r[0]; })
    .map(function(r, i) {
      const x = {};
      heads.forEach(function(h, j) { x[h] = r[j]; });
      return {
        row: i + 2,
        id: x['מזהה פנייה'],
        name: x['שם מלא'],
        phone: x['טלפון'],
        email: x['אימייל'],
        issue: x['סוג תקלה'],
        device: x['מותג / דגם'] || '',
        description: x['תיאור התקלה'],
        address: x['כתובת'] || '',
        serviceType: x['סוג שירות'] || '',
        preferredDateTime: x['מועד מועדף'] || '',
        status: x['סטטוס'] || 'חדש',
        eventId: x['מזהה אירוע ביומן'] || '',
        files: String(x['קבצים מצורפים'] || '').split('\n').filter(Boolean),
        updatedAt: x['עדכון אחרון'] || ''
      };
    })
    .reverse();

  return {
    ok: true,
    leads: leads,
    newCount: leads.filter(function(x) { return x.status === 'חדש'; }).length,
    activeCount: leads.filter(function(x) {
      return x.status === 'חדש' || x.status === 'בטיפול' || x.status === 'נקבע ביומן';
    }).length,
    statuses: LEAD_STATUSES
  };
}

function updateLeadStatus(id, status) {
  assertOwner_();
  if (LEAD_STATUSES.indexOf(status) === -1) throw new Error('סטטוס לא תקין');

  const sh = getSheet_();
  const rows = sh.getDataRange().getValues();
  const i = rows.findIndex(function(r, n) { return n > 0 && r[0] === id; });
  if (i < 1) throw new Error('פנייה לא נמצאה');

  sh.getRange(i + 1, 12).setValue(status);
  sh.getRange(i + 1, 16).setValue(new Date());

  const email = rows[i][4];
  const name = rows[i][2];
  if (email) {
    GmailApp.sendEmail(
      email,
      'עדכון לפנייה שלך | ' + id,
      'שלום ' + name + ',\n\nסטטוס הפנייה עודכן ל: ' + status + '\n\nתודה,\n' + CONFIG.BUSINESS_NAME
    );
  }
  return { ok: true, id: id, status: status };
}

/* ========== Gallery ========== */

function getGalleryData() {
  assertOwner_();
  return readGalleryRows_();
}

function getPublicGallery() {
  return readGalleryRows_()
    .filter(function(x) { return isActive_(x.active); })
    .map(function(x) {
      return {
        slot: x.slot,
        url: x.url,
        title: x.title,
        description: x.description
      };
    });
}

function replaceGalleryImage(slot, file) {
  assertOwner_();
  if (!file || !file.base64) throw new Error('לא התקבל קובץ תמונה.');
  if (CONFIG.GALLERY_MIME_TYPES.indexOf(file.mimeType) === -1) {
    throw new Error('לגלריה מותרים רק JPG, PNG או WEBP.');
  }
  if (file.size && file.size > CONFIG.MAX_FILE_BYTES) {
    throw new Error('גודל הקובץ המותר הוא עד 8MB.');
  }

  const sh = getGallerySheet_();
  const values = sh.getDataRange().getValues();
  const i = values.findIndex(function(r, n) { return n > 0 && r[0] === slot; });
  if (i < 1) throw new Error('מיקום גלריה לא נמצא: ' + slot);

  const blob = Utilities.newBlob(
    Utilities.base64Decode(file.base64),
    file.mimeType,
    sanitizeFileName_(file.name || slot + '.jpg')
  );
  const folder = getGalleryFolder_();
  const saved = folder.createFile(blob);
  saved.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const url = driveDisplayUrl_(saved.getId());
  sh.getRange(i + 1, 4).setValue(saved.getId());
  sh.getRange(i + 1, 5).setValue(url);
  if (!values[i][5]) sh.getRange(i + 1, 6).setValue('כן');

  return readGalleryRows_();
}

function setGalleryActive(slot, active) {
  assertOwner_();
  const sh = getGallerySheet_();
  const values = sh.getDataRange().getValues();
  const i = values.findIndex(function(r, n) { return n > 0 && r[0] === slot; });
  if (i < 1) throw new Error('מיקום גלריה לא נמצא: ' + slot);
  sh.getRange(i + 1, 6).setValue(active ? 'כן' : 'לא');
  return readGalleryRows_();
}

function updateGalleryMeta(slot, title, description) {
  assertOwner_();
  const sh = getGallerySheet_();
  const values = sh.getDataRange().getValues();
  const i = values.findIndex(function(r, n) { return n > 0 && r[0] === slot; });
  if (i < 1) throw new Error('מיקום גלריה לא נמצא: ' + slot);
  if (title != null) sh.getRange(i + 1, 2).setValue(String(title));
  if (description != null) sh.getRange(i + 1, 3).setValue(String(description));
  return readGalleryRows_();
}

/* ========== Sheet bootstrap ========== */

function ensureWorkbook_() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  ensureLeadsSheet_(ss);
  ensureGallerySheet_(ss);
  ensureSettingsSheet_(ss);
}

function ensureLeadsSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  const headerValues = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (headerValues.join('|') !== HEADERS.join('|')) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
}

function ensureGallerySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.GALLERY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.GALLERY_SHEET_NAME);

  const headerValues = sheet.getRange(1, 1, 1, GALLERY_HEADERS.length).getValues()[0];
  if (headerValues.join('|') !== GALLERY_HEADERS.join('|')) {
    sheet.clear();
    sheet.getRange(1, 1, 1, GALLERY_HEADERS.length).setValues([GALLERY_HEADERS]);
  }

  const existing = sheet.getDataRange().getValues().slice(1).map(function(r) { return r[0]; });
  GALLERY_SEED.forEach(function(seed) {
    if (existing.indexOf(seed.slot) === -1) {
      sheet.appendRow([seed.slot, seed.title, seed.description, '', seed.url, 'כן']);
    }
  });
}

function ensureSettingsSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.SETTINGS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SETTINGS_SHEET_NAME);

  const headerValues = sheet.getRange(1, 1, 1, SETTINGS_HEADERS.length).getValues()[0];
  if (headerValues.join('|') !== SETTINGS_HEADERS.join('|')) {
    sheet.getRange(1, 1, 1, SETTINGS_HEADERS.length).setValues([SETTINGS_HEADERS]);
  }

  const defaults = {
    OWNER_EMAIL: CONFIG.OWNER_EMAIL,
    ATTACHMENTS_FOLDER_ID: CONFIG.ATTACHMENTS_FOLDER_ID,
    BUSINESS_NAME: CONFIG.BUSINESS_NAME,
    GALLERY_FOLDER_ID: ''
  };

  Object.keys(defaults).forEach(function(key) {
    if (getSetting_(key) === null) setSetting_(key, defaults[key]);
  });
}

/* ========== Private helpers ========== */

function getSheet_() {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('גיליון הפניות לא נמצא. הריצו setupProject().');
  return sheet;
}

function getGallerySheet_() {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.GALLERY_SHEET_NAME);
  if (!sheet) throw new Error('גיליון הגלריה לא נמצא. הריצו setupProject().');
  return sheet;
}

function getSettingsSheet_() {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SETTINGS_SHEET_NAME);
  if (!sheet) throw new Error('גיליון ההגדרות לא נמצא. הריצו setupProject().');
  return sheet;
}

function getSetting_(key) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SETTINGS_SHEET_NAME);
  if (!sheet) return null;
  const values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === key) return values[i][1];
  }
  return null;
}

function setSetting_(key, value) {
  const sheet = getSettingsSheet_();
  const values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function readGalleryRows_() {
  const values = getGallerySheet_().getDataRange().getValues();
  return values.slice(1)
    .filter(function(r) { return r[0]; })
    .map(function(r, i) {
      return {
        row: i + 2,
        slot: r[0],
        title: r[1] || '',
        description: r[2] || '',
        fileId: r[3] || '',
        url: r[4] || '',
        active: r[5]
      };
    });
}

function getGalleryFolder_() {
  const configured = getSetting_('GALLERY_FOLDER_ID');
  if (configured) {
    try {
      return DriveApp.getFolderById(String(configured));
    } catch (err) {
      // fall through to attachments root
    }
  }
  const root = DriveApp.getFolderById(CONFIG.ATTACHMENTS_FOLDER_ID);
  const folders = root.getFoldersByName('gallery');
  if (folders.hasNext()) {
    const existing = folders.next();
    setSetting_('GALLERY_FOLDER_ID', existing.getId());
    return existing;
  }
  const created = root.createFolder('gallery');
  setSetting_('GALLERY_FOLDER_ID', created.getId());
  return created;
}

function driveDisplayUrl_(fileId) {
  return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1600';
}

function isActive_(value) {
  return value === true || value === 'כן' || value === 'YES' || value === 'yes' || value === 1;
}

function validatePayload_(p) {
  ['fullName', 'phone', 'email', 'issueType', 'description', 'serviceType'].forEach(function(key) {
    if (!String(p[key] || '').trim()) throw new Error('חסר שדה חובה: ' + key);
  });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) throw new Error('כתובת אימייל אינה תקינה.');
  if (shouldBookImmediately_(p) && !p.preferredDateTime) {
    throw new Error('לביקור טכנאי יש לבחור מועד.');
  }
}

function shouldBookImmediately_(p) {
  return p.serviceType === 'ביקור טכנאי' && Boolean(p.preferredDateTime);
}

function saveAttachments_(leadId, attachments) {
  if (!attachments.length) return { urls: [] };
  const root = DriveApp.getFolderById(CONFIG.ATTACHMENTS_FOLDER_ID);
  const folder = root.createFolder(leadId);
  const urls = [];

  attachments.forEach(function(file) {
    if (CONFIG.ALLOWED_MIME_TYPES.indexOf(file.mimeType) === -1) {
      throw new Error('סוג הקובץ אינו נתמך: ' + file.name);
    }
    if (file.size > CONFIG.MAX_FILE_BYTES) {
      throw new Error('גודל הקובץ המותר הוא עד 8MB: ' + file.name);
    }
    const bytes = Utilities.base64Decode(file.base64);
    const blob = Utilities.newBlob(bytes, file.mimeType, sanitizeFileName_(file.name));
    const saved = folder.createFile(blob);
    urls.push(saved.getUrl());
  });
  return { urls: urls };
}

function createCalendarEvent_(leadId, p, attachmentUrls) {
  const start = new Date(p.preferredDateTime);
  if (isNaN(start.getTime()) || start.getTime() < Date.now()) {
    throw new Error('המועד שנבחר אינו תקין או כבר עבר.');
  }
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const details = [
    'פנייה: ' + leadId,
    'לקוח: ' + p.fullName,
    'טלפון: ' + p.phone,
    'אימייל: ' + p.email,
    'סוג תקלה: ' + p.issueType,
    'מכשיר: ' + (p.deviceModel || '-'),
    'כתובת: ' + (p.address || '-'),
    '',
    'תיאור:',
    p.description,
    attachmentUrls.length ? '\nקבצים:\n' + attachmentUrls.join('\n') : ''
  ].join('\n');

  return CalendarApp.getCalendarById(CONFIG.CALENDAR_ID).createEvent(
    'ביקור טכנאי — ' + p.fullName + ' (' + leadId + ')',
    start,
    end,
    { description: details, location: p.address || '' }
  );
}

function notifyOwner_(leadId, p, attachmentUrls, event) {
  const subject = 'פנייה חדשה: ' + p.fullName + ' | ' + leadId;
  const body = [
    'התקבלה פנייה חדשה.',
    '',
    'מזהה: ' + leadId,
    'לקוח: ' + p.fullName,
    'טלפון: ' + p.phone,
    'אימייל: ' + p.email,
    'תקלה: ' + p.issueType,
    'מכשיר: ' + (p.deviceModel || '-'),
    'שירות: ' + p.serviceType,
    'מועד מועדף: ' + (p.preferredDateTime || '-'),
    'כתובת: ' + (p.address || '-'),
    '',
    p.description,
    attachmentUrls.length ? '\nקבצים:\n' + attachmentUrls.join('\n') : '',
    event ? '\nהביקור נוסף ליומן.' : '',
    '',
    'ניהול: פתחו את ה-Web App עם ?view=management'
  ].join('\n');
  GmailApp.sendEmail(CONFIG.OWNER_EMAIL, subject, body);
}

function notifyCustomer_(leadId, p, event) {
  const body = event
    ? 'שלום ' + p.fullName + ',\n\nפנייתך נקלטה והביקור נוסף ליומן.\nמספר פנייה: ' + leadId + '\n\nתודה,\n' + CONFIG.BUSINESS_NAME
    : 'שלום ' + p.fullName + ',\n\nפנייתך נקלטה בהצלחה. נחזור אליך בהקדם לתיאום.\nמספר פנייה: ' + leadId + '\n\nתודה,\n' + CONFIG.BUSINESS_NAME;
  GmailApp.sendEmail(p.email, 'אישור קבלת פנייה | ' + leadId, body);
}

function sanitizeFileName_(name) {
  return String(name || 'attachment').replace(/[\\/:*?"<>|]/g, '_');
}

function sanitizeCallback_(name) {
  if (!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(name)) {
    throw new Error('callback לא תקין');
  }
  return name;
}

function assertOwner_() {
  // DEMO MODE: public so visitors can see the live workflow.
  // Before a real client handoff, restore Session.getActiveUser().getEmail()
  // check against CONFIG.OWNER_EMAIL and deploy management as "Only myself".
  return true;
}
