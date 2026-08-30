/**
 * FlowPage Studio — Pedicure & Manicure
 * One Apps Script Web App: public booking, owner management and gallery feed.
 * Run setupProject() once while signed in as flowpagestudio@gmail.com.
 */
const PM = {
  TZ: 'Asia/Jerusalem',
  BUSINESS: 'פדיקור ומניקור',
  // Demo mode: the management screen opens directly from its private URL.
  // Set to false before handing the system to a real business.
  OPEN_MANAGEMENT: true,
  DAYS: [0, 1, 2, 3, 4], // Sun–Thu
  OPEN: 16 * 60,
  CLOSE: 21 * 60,
  BUFFER: 5,
  MAX_IMAGE: 8 * 1024 * 1024,
  SERVICES: [
    { id: 'pedicure', name: 'פדיקור רגיל', minutes: 40 },
    { id: 'gel-pedicure', name: 'פדיקור ג׳ל', minutes: 90 },
    { id: 'manicure', name: 'מניקור', minutes: 40 },
    { id: 'nail-building', name: 'בניית ציפורניים', minutes: 80 }
  ],
  STATUSES: ['נקבע', 'הושלם', 'בוטל', 'לא הגיעה']
};
const BOOKING_HEADERS = ['מזהה', 'נוצר', 'שם', 'טלפון', 'אימייל', 'שירות', 'משך בדקות', 'התחלה', 'סיום', 'סטטוס', 'מזהה אירוע', 'עודכן'];
const GALLERY_HEADERS = ['מזהה', 'קטגוריה', 'כותרת', 'מזהה קובץ', 'כתובת תמונה', 'פעיל', 'עודכן'];
const SETTINGS_HEADERS = ['מפתח', 'ערך'];
const GALLERY_SEED = [
  ['gallery-1', 'פדיקור', 'פדיקור טבעי', '', 'https://raw.githubusercontent.com/flowpagestudio/flowpage-assets/main/02_scenarios/pedicure-manicure/gallery/pedicure-natural-v1.png', 'כן'],
  ['gallery-2', 'מניקור', 'מניקור טבעי', '', 'https://raw.githubusercontent.com/flowpagestudio/flowpage-assets/main/02_scenarios/pedicure-manicure/gallery/manicure-natural-v1.png', 'כן'],
  ['gallery-3', 'בניית ציפורניים', 'מיקרו פרנץ׳', '', 'https://raw.githubusercontent.com/flowpagestudio/flowpage-assets/main/02_scenarios/pedicure-manicure/gallery/nail-building-micro-french-v1.png', 'כן'],
  ['gallery-4', 'לק ג׳ל', 'ורוד אבקתי', '', 'https://raw.githubusercontent.com/flowpagestudio/flowpage-assets/main/02_scenarios/pedicure-manicure/gallery/gel-polish-dusty-rose-v1.png', 'כן']
];

function doGet(e) {
  const view = (e && e.parameter && e.parameter.view) || '';
  if (view === 'management') return HtmlService.createHtmlOutputFromFile('Management').setTitle('ניהול | פדיקור ומניקור');
  if (view === 'gallery') return json_(getPublicGallery(), e.parameter.callback);
  if (view === 'health') return json_({ ok: true, business: PM.BUSINESS });
  return HtmlService.createHtmlOutputFromFile('Index').setTitle(PM.BUSINESS);
}

/** Creates a dedicated Sheet and Drive folder automatically, without IDs in code. */
function setupProject() {
  const p = props_();
  if (!p.getProperty('SPREADSHEET_ID')) {
    const ss = SpreadsheetApp.create('FlowPage | פדיקור ומניקור');
    p.setProperty('SPREADSHEET_ID', ss.getId());
    const root = DriveApp.createFolder('FlowPage | פדיקור ומניקור');
    p.setProperty('ROOT_FOLDER_ID', root.getId());
  }
  ensureData_();
  if (!p.getProperty('OWNER_EMAIL')) p.setProperty('OWNER_EMAIL', Session.getEffectiveUser().getEmail());
  return 'המערכת מוכנה. הגדירו PIN בעזרת setAdminPin("קוד-חזק") ואז פרסמו Web App.';
}

/** Run once from the editor. The PIN protects the management surface. */
function setAdminPin(pin) {
  if (!String(pin || '').match(/^.{8,}$/)) throw new Error('יש לבחור קוד ניהול של לפחות 8 תווים.');
  props_().setProperty('ADMIN_PIN_HASH', sha_(String(pin)));
  return 'קוד הניהול נשמר.';
}

function getPublicConfig() { return { services: PM.SERVICES, policyHours: 'א׳–ה׳, 16:00–21:00', cancellationHours: 48 }; }

function getAvailableSlots(dateText, serviceId) {
  const service = service_(serviceId);
  const date = parseDate_(dateText);
  assertBusinessDay_(date);
  const calendar = calendar_();
  const startDay = new Date(date); startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(date); endDay.setHours(23, 59, 59, 999);
  const events = calendar.getEvents(startDay, endDay);
  const slots = [];
  for (let minute = PM.OPEN; minute + service.minutes <= PM.CLOSE; minute += 5) {
    const start = new Date(date); start.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
    const end = new Date(start.getTime() + (service.minutes + PM.BUFFER) * 60000);
    if (!events.some(function(ev) { return ev.getStartTime() < end && ev.getEndTime() > start; })) slots.push(formatTime_(start));
  }
  return slots;
}

function bookAppointment(data) {
  validateBooking_(data);
  const service = service_(data.serviceId);
  const start = parseDateTime_(data.date, data.time);
  assertBusinessDay_(start);
  const minutes = start.getHours() * 60 + start.getMinutes();
  if (minutes < PM.OPEN || minutes + service.minutes > PM.CLOSE) throw new Error('השעה שנבחרה מחוץ לשעות הפעילות.');
  if (start.getTime() < Date.now()) throw new Error('לא ניתן לקבוע תור במועד שכבר עבר.');
  const end = new Date(start.getTime() + service.minutes * 60000);
  const busyEnd = new Date(end.getTime() + PM.BUFFER * 60000);
  const cal = calendar_();
  if (cal.getEvents(start, busyEnd).some(function(ev) { return ev.getStartTime() < busyEnd && ev.getEndTime() > start; })) throw new Error('המועד נתפס עכשיו. בחרי שעה אחרת.');
  const id = 'PM-' + Utilities.formatDate(new Date(), PM.TZ, 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
  const description = ['מזהה: ' + id, 'טלפון: ' + data.phone, 'אימייל: ' + (data.email || '-')].join('\n');
  const event = cal.createEvent(service.name + ' — ' + data.fullName, start, busyEnd, { description: description });
  const now = new Date();
  bookings_().appendRow([id, now, data.fullName, data.phone, data.email || '', service.name, service.minutes, start, end, 'נקבע', event.getId(), now]);
  notifyOwner_('תור חדש: ' + service.name, appointmentText_(data.fullName, data.phone, data.email, service.name, start));
  if (data.email) GmailApp.sendEmail(data.email, 'אישור תור | ' + PM.BUSINESS, 'שלום ' + data.fullName + ',\n\nהתור נקבע: ' + service.name + '\n' + formatDateTime_(start) + '\n\nשינוי או ביטול אפשריים עד 48 שעות לפני המועד.');
  return { ok: true, id: id, start: formatDateTime_(start), service: service.name };
}

/* ---------- Owner management ---------- */
function adminLogin(pin) { assertPin_(pin); return getManagementData(pin); }
function getManagementData(pin) {
  assertPin_(pin);
  const rows = bookings_().getDataRange().getDisplayValues().slice(1).filter(function(r) { return r[0]; }).map(function(r) {
    return { id:r[0], created:r[1], name:r[2], phone:r[3], email:r[4], service:r[5], duration:r[6], start:r[7], end:r[8], status:r[9], eventId:r[10], updated:r[11] };
  }).reverse();
  const today = Utilities.formatDate(new Date(), PM.TZ, 'yyyy-MM-dd');
  return { ok:true, appointments:rows, todayCount:rows.filter(function(x){return x.start.indexOf(today) === 0 && x.status === 'נקבע';}).length, activeCount:rows.filter(function(x){return x.status === 'נקבע';}).length, statuses:PM.STATUSES, settings:getSettings_() };
}

function updateAppointmentStatus(pin, id, status) {
  assertPin_(pin); if (PM.STATUSES.indexOf(status) < 0) throw new Error('סטטוס לא תקין.');
  const sh = bookings_(), rows = sh.getDataRange().getValues(), i = rows.findIndex(function(r,n){return n && r[0] === id;});
  if (i < 1) throw new Error('התור לא נמצא.');
  const oldStatus = rows[i][9];
  if (oldStatus === status) return { ok:true };
  const eventId = rows[i][10];
  if (status === 'בוטל' && oldStatus !== 'בוטל' && eventId) { const event = calendar_().getEventById(eventId); if (event) event.deleteEvent(); }
  sh.getRange(i + 1, 10).setValue(status); sh.getRange(i + 1, 12).setValue(new Date());
  if (rows[i][4] && (status === 'בוטל' || status === 'הושלם')) GmailApp.sendEmail(rows[i][4], 'עדכון תור | ' + PM.BUSINESS, 'שלום ' + rows[i][2] + ',\n\nסטטוס התור שלך עודכן: ' + status + '.');
  return { ok:true };
}

function getGalleryData(pin) { assertPin_(pin); return galleryRows_(); }
function saveGalleryItem(pin, item) {
  assertPin_(pin); const sh = gallery_(), rows = sh.getDataRange().getValues(), i = rows.findIndex(function(r,n){return n && r[0] === item.id;});
  if (i < 1) throw new Error('פריט גלריה לא נמצא.');
  sh.getRange(i+1, 2, 1, 2).setValues([[String(item.category || ''), String(item.title || '')]]);
  sh.getRange(i+1, 6).setValue(item.active ? 'כן' : 'לא'); sh.getRange(i+1, 7).setValue(new Date()); return galleryRows_();
}
function replaceGalleryImage(pin, id, file) {
  assertPin_(pin); if (!file || !file.base64 || !/^image\/(jpeg|png|webp)$/.test(file.mimeType || '')) throw new Error('מותר להעלות JPG, PNG או WEBP בלבד.'); if (file.size > PM.MAX_IMAGE) throw new Error('התמונה מוגבלת ל־8MB.');
  const sh = gallery_(), rows = sh.getDataRange().getValues(), i = rows.findIndex(function(r,n){return n && r[0] === id;}); if (i < 1) throw new Error('פריט גלריה לא נמצא.');
  const blob = Utilities.newBlob(Utilities.base64Decode(file.base64), file.mimeType, String(file.name || id).replace(/[\\/:*?"<>|]/g, '_'));
  const saved = galleryFolder_().createFile(blob); saved.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  sh.getRange(i+1, 4, 1, 2).setValues([[saved.getId(), 'https://drive.google.com/thumbnail?id=' + saved.getId() + '&sz=w1600']]); sh.getRange(i+1, 7).setValue(new Date()); return galleryRows_();
}
function saveSettings(pin, values) { assertPin_(pin); ['OWNER_EMAIL','CALENDAR_ID'].forEach(function(k){if(values[k] != null) setSetting_(k, String(values[k]).trim());}); return getSettings_(); }
function getPublicGallery() { return galleryRows_().filter(function(x){return x.active;}).map(function(x){return { category:x.category, title:x.title, url:x.url };}); }

/* ---------- Data and helpers ---------- */
function ensureData_() { const ss = ss_(); ensureSheet_(ss, 'תורים', BOOKING_HEADERS); ensureSheet_(ss, 'גלריה', GALLERY_HEADERS); ensureSheet_(ss, 'הגדרות', SETTINGS_HEADERS); if (!galleryRows_().length) { gallery_().getRange(2,1,GALLERY_SEED.length,6).setValues(GALLERY_SEED); } [['OWNER_EMAIL', props_().getProperty('OWNER_EMAIL') || ''],['CALENDAR_ID','primary']].forEach(function(x){if(getSetting_(x[0]) === null) setSetting_(x[0],x[1]);}); }
function ensureSheet_(ss,name,headers) { let sh=ss.getSheetByName(name); if(!sh) sh=ss.insertSheet(name); if(sh.getLastRow()===0) sh.appendRow(headers); return sh; }
function ss_(){ const id=props_().getProperty('SPREADSHEET_ID'); if(!id) throw new Error('יש להריץ setupProject() פעם אחת.'); return SpreadsheetApp.openById(id); }
function bookings_(){return ss_().getSheetByName('תורים');} function gallery_(){return ss_().getSheetByName('גלריה');} function settings_(){return ss_().getSheetByName('הגדרות');} function props_(){return PropertiesService.getScriptProperties();}
function galleryRows_(){return gallery_().getDataRange().getValues().slice(1).filter(function(r){return r[0];}).map(function(r){return {id:String(r[0]),category:String(r[1]||''),title:String(r[2]||''),url:String(r[4]||''),active:r[5]===true||r[5]==='כן'};});}
function getSetting_(key){const rows=settings_().getDataRange().getValues();for(let i=1;i<rows.length;i++)if(rows[i][0]===key)return rows[i][1];return null;} function setSetting_(key,val){const sh=settings_(),rows=sh.getDataRange().getValues(),i=rows.findIndex(function(r,n){return n&&r[0]===key;});if(i>0)sh.getRange(i+1,2).setValue(val);else sh.appendRow([key,val]);} function getSettings_(){return {OWNER_EMAIL:String(getSetting_('OWNER_EMAIL')||''),CALENDAR_ID:String(getSetting_('CALENDAR_ID')||'primary')};}
function galleryFolder_(){const p=props_(),id=p.getProperty('GALLERY_FOLDER_ID');if(id)return DriveApp.getFolderById(id);const f=DriveApp.getFolderById(p.getProperty('ROOT_FOLDER_ID')).createFolder('גלריה');p.setProperty('GALLERY_FOLDER_ID',f.getId());return f;}
function calendar_(){const c=CalendarApp.getCalendarById(getSetting_('CALENDAR_ID')||'primary');if(!c)throw new Error('היומן שהוגדר לא נמצא.');return c;} function service_(id){const s=PM.SERVICES.filter(function(x){return x.id===id;})[0];if(!s)throw new Error('הטיפול לא תקין.');return s;}
function validateBooking_(x){['fullName','phone','serviceId','date','time'].forEach(function(k){if(!String(x[k]||'').trim())throw new Error('חסר שדה: '+k);});if(x.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email))throw new Error('כתובת המייל אינה תקינה.');}
function parseDate_(x){if(!/^\d{4}-\d{2}-\d{2}$/.test(x||''))throw new Error('תאריך לא תקין.');const d=new Date(x+'T12:00:00');if(isNaN(d))throw new Error('תאריך לא תקין.');return d;} function parseDateTime_(d,t){if(!/^\d{2}:\d{2}$/.test(t||''))throw new Error('שעה לא תקינה.');return new Date(d+'T'+t+':00');} function assertBusinessDay_(d){if(PM.DAYS.indexOf(d.getDay())<0)throw new Error('העסק פתוח בימים א׳–ה׳ בלבד.');}
function formatTime_(d){return Utilities.formatDate(d,PM.TZ,'HH:mm');} function formatDateTime_(d){return Utilities.formatDate(d,PM.TZ,'yyyy-MM-dd HH:mm');} function appointmentText_(n,p,e,s,d){return 'לקוחה: '+n+'\nטלפון: '+p+'\nאימייל: '+(e||'-')+'\nטיפול: '+s+'\nמועד: '+formatDateTime_(d);} function notifyOwner_(subject,body){const e=getSetting_('OWNER_EMAIL');if(e)GmailApp.sendEmail(e,subject,body);}
function sha_(text){return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text));} function assertPin_(pin){if(PM.OPEN_MANAGEMENT)return true;const expected=props_().getProperty('ADMIN_PIN_HASH');if(!expected)throw new Error('טרם הוגדר קוד ניהול. הריצו setAdminPin(...) בעורך Apps Script.');if(sha_(String(pin||'')).toString()!==expected)throw new Error('קוד הניהול שגוי.');}
function json_(obj,callback){const body=JSON.stringify(obj);return ContentService.createTextOutput(callback ? String(callback).replace(/[^A-Za-z0-9_$]/g,'')+'('+body+');':body).setMimeType(callback?ContentService.MimeType.JAVASCRIPT:ContentService.MimeType.JSON);}
