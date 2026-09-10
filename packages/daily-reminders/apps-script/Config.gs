/**
 * Daily Reminders — configuration access.
 *
 * The spreadsheet ID is intentionally kept outside the source code.
 * Set it in Script Properties before running setup.
 */

function getScriptProperties_() {
  return PropertiesService.getScriptProperties();
}

function getSpreadsheetId_() {
  var id = getScriptProperties_().getProperty(SCRIPT_PROPERTY_KEYS.SPREADSHEET_ID);
  if (!id) {
    throw new Error('SPREADSHEET_ID_REQUIRED: הגדר את מזהה Google Sheets ב־Script Properties.');
  }
  return id;
}

function getDataSpreadsheet_() {
  return SpreadsheetApp.openById(getSpreadsheetId_());
}

function getConfiguredCalendarId_() {
  return getScriptProperties_().getProperty(SCRIPT_PROPERTY_KEYS.CALENDAR_ID) || '';
}

function setConfiguredCalendarId_(calendarId) {
  if (!calendarId) {
    throw new Error('CALENDAR_ID_REQUIRED: לא ניתן לשמור מזהה יומן ריק.');
  }
  getScriptProperties_().setProperty(SCRIPT_PROPERTY_KEYS.CALENDAR_ID, calendarId);
}

function getAppConfig_() {
  return {
    name: APP.NAME,
    version: APP.VERSION,
    schemaVersion: APP.SCHEMA_VERSION,
    timezone: APP.TIMEZONE,
    spreadsheetId: getSpreadsheetId_(),
    calendarId: getConfiguredCalendarId_()
  };
}

function getDefaultSettings_() {
  return Object.assign({}, DEFAULT_SETTINGS);
}

function getSettingValue_(settingsMap, key, fallback) {
  if (settingsMap && Object.prototype.hasOwnProperty.call(settingsMap, key)) {
    return settingsMap[key];
  }
  return fallback;
}
