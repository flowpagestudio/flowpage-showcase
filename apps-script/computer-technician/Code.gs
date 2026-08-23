/**
 * FlowPage Studio — Computer Technician Operations
 * Configure the project once by running setupProject() from the Apps Script editor.
 */
const CONFIG = {
  SHEET_ID: '1vykF1rNH13FN3P5GM8ZEmU8uqImnKxosZQNdo0K94RA',
  SHEET_NAME: 'פניות',
  ATTACHMENTS_FOLDER_ID: '1iD6btMyEAOhPRWhAlJnV-f71VdkVMDky',
  OWNER_EMAIL: 'flowpagestudio@gmail.com',
  BUSINESS_NAME: 'טכנאי מחשבים',
  TIMEZONE: 'Asia/Jerusalem',
  CALENDAR_ID: 'primary',
  MAX_FILE_BYTES: 8 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'application/pdf']
};

const HEADERS = [
  'מזהה פנייה', 'תאריך קבלה', 'שם מלא', 'טלפון', 'אימייל', 'סוג תקלה',
  'מותג / דגם', 'תיאור התקלה', 'כתובת', 'סוג שירות', 'מועד מועדף',
  'סטטוס', 'מזהה אירוע ביומן', 'קבצים מצורפים', 'הודעת אישור', 'עדכון אחרון'
];

function doGet(e) {
  const view = e && e.parameter && e.parameter.view;
  if (view === 'management') return HtmlService.createTemplateFromFile('Management').evaluate().setTitle('ניהול המערכת');
  if (view === 'gallery') {
    const json = JSON.stringify({ items: getPublicGallery() });
    const callback = e.parameter.callback;
    return ContentService.createTextOutput(callback ? callback + '(' + json + ');' : json)
      .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
  }
  return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('פנייה לטכנאי מחשבים').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Run once manually from the Apps Script editor to verify the data layer.
 * Google will request Drive, Gmail and Calendar authorizations here.
 */
function setupProject() {
  const sheet = getSheet_();
  const headerValues = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (headerValues.join('|') !== HEADERS.join('|')) {
    throw new Error('מבנה הגיליון אינו תואם את שכבת התפעול.');
  }
  DriveApp.getFolderById(CONFIG.ATTACHMENTS_FOLDER_ID);
  GmailApp.getAliases();
  CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  return 'החיבור הושלם: Drive, Gmail ו-Calendar זמינים.';
}

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

function getSheet_() {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('גיליון הפניות לא נמצא.');
  return sheet;
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
    if (!CONFIG.ALLOWED_MIME_TYPES.includes(file.mimeType)) {
      throw new Error('סוג הקובץ אינו נתמך: ' + file.name);
    }
    if (file.size > CONFIG.MAX_FILE_BYTES) {
      throw new Error('גודל הקובץ המותר הוא עד 8MB: ' + file.name);
    }
    const bytes = Utilities.base64Decode(file.base64);
    const blob = Utilities.newBlob(bytes, file.mimeType, sanitizeFileName_(file.name));
    urls.push(folder.createFile(blob).getUrl());
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
    event ? '\nהביקור נוסף ליומן.' : ''
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

function getManagementData() {
  assertOwner_();
  const rows=getSheet_().getDataRange().getValues(), heads=rows.shift();
  const leads=rows.filter(r=>r[0]).map((r,i)=>{const x={};heads.forEach((h,j)=>x[h]=r[j]);return {row:i+2,id:x['מזהה פנייה'],name:x['שם מלא'],phone:x['טלפון'],email:x['אימייל'],issue:x['סוג תקלה'],description:x['תיאור התקלה'],status:x['סטטוס']||'חדש',eventId:x['מזהה אירוע ביומן'],files:String(x['קבצים מצורפים']||'').split('\n').filter(Boolean)}});
  return {leads:leads.reverse(),newCount:leads.filter(x=>x.status==='חדש').length};
}
function updateLeadStatus(id,status) {
  assertOwner_();
  const allowed=['חדש','בטיפול','נקבע ביומן','הושלם','בוטל']; if(!allowed.includes(status)) throw new Error('סטטוס לא תקין');
  const sh=getSheet_(), rows=sh.getDataRange().getValues(), i=rows.findIndex((r,n)=>n>0&&r[0]===id); if(i<1) throw new Error('פנייה לא נמצאה');
  sh.getRange(i+1,12).setValue(status); sh.getRange(i+1,16).setValue(new Date());
  GmailApp.sendEmail(rows[i][4],'עדכון לפנייה שלך | '+id,'שלום '+rows[i][2]+',\n\nסטטוס הפנייה עודכן ל: '+status+'\n\nתודה,\n'+CONFIG.BUSINESS_NAME);
  return {ok:true};
}
function assertOwner_() {
  // DEMO MODE: deliberately public so visitors can see the live workflow.
  // Before handing this system to a real client, restore an email-based check here
  // and deploy the management view with "Only myself".
  return true;
}


function getGalleryData(){const sh=SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName('גלריה');const v=sh.getDataRange().getValues();return v.slice(1).map((r,i)=>({row:i+2,slot:r[0],title:r[1],description:r[2],fileId:r[3],url:r[4],active:r[5]}));}

function replaceGalleryImage(slot,file){const sh=SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName('גלריה');const v=sh.getDataRange().getValues();const i=v.findIndex((r,n)=>n>0&&r[0]===slot);if(i<1)throw new Error('מיקום גלריה לא נמצא');const blob=Utilities.newBlob(Utilities.base64Decode(file.base64),file.mimeType,file.name);const saved=DriveApp.getFolderById(CONFIG.ATTACHMENTS_FOLDER_ID).createFile(blob);sh.getRange(i+1,4).setValue(saved.getId());sh.getRange(i+1,5).setValue('https://drive.google.com/thumbnail?id='+saved.getId()+'&sz=w1600');return getGalleryData();}

function getPublicGallery(){return getGalleryData().filter(x=>x.active==='כן').map(x=>({slot:x.slot,url:x.url,title:x.title,description:x.description}));}
