/**
 * Daily Reminders — idempotent setup.
 *
 * Run setupSystem once after configuring the spreadsheet ID in
 * Script Properties. Running it again must not delete or duplicate data.
 */

function setupSystem() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw new Error('LOCK_TIMEOUT: setup is already running.');
  }

  try {
    var spreadsheet = getDataSpreadsheet_();
    var result = {
      spreadsheetId: spreadsheet.getId(),
      sheets: [],
      settings: [],
      initialized: false
    };

    [SHEETS.REMINDERS, SHEETS.INSTANCES, SHEETS.SETTINGS, SHEETS.LOGS]
      .forEach(function(sheetName) {
        var sheet = spreadsheet.getSheetByName(sheetName);
        var created = false;

        if (!sheet) {
          sheet = spreadsheet.insertSheet(sheetName);
          created = true;
        }

        var headerResult = ensureHeaders_(
          sheet,
          getHeadersForSheet_(sheetName)
        );

        result.sheets.push({
          name: sheetName,
          created: created || headerResult.created,
          rows: Math.max(sheet.getLastRow() - 1, 0)
        });
      });

    var settingsResult = ensureDefaultSettings_(spreadsheet);
    result.settings = settingsResult;
    result.initialized = true;

    writeSetupProperty_('INITIALIZED', 'true');
    writeSetupProperty_('SCHEMA_VERSION', String(APP.SCHEMA_VERSION));

    return result;
  } finally {
    lock.releaseLock();
  }
}

function ensureDefaultSettings_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(SHEETS.SETTINGS);
  var headers = getHeadersForSheet_(SHEETS.SETTINGS);
  var values = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues()
    : [];

  var existingKeys = {};
  values.forEach(function(row) {
    if (row[0]) {
      existingKeys[String(row[0])] = true;
    }
  });

  var rowsToAdd = [];
  Object.keys(DEFAULT_SETTINGS).forEach(function(key) {
    if (!existingKeys[key]) {
      rowsToAdd.push([
        key,
        DEFAULT_SETTINGS[key],
        getSettingDescription_(key)
      ]);
    }
  });

  if (rowsToAdd.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, headers.length)
      .setValues(rowsToAdd);
  }

  return {
    added: rowsToAdd.length,
    total: Math.max(sheet.getLastRow() - 1, 0)
  };
}

function getSettingDescription_(key) {
  var descriptions = {
    APP_NAME: 'שם המערכת',
    TIMEZONE: 'אזור הזמן הראשי',
    DEFAULT_GENERATION_WINDOW: 'מספר ימים ליצירת מופעים קדימה',
    UPCOMING_VIEW_DAYS: 'מספר ימים לתצוגת התראות קרובות',
    MINIMUM_LEAD_MINUTES: 'זמן מינימלי לפני התראה',
    DEFAULT_NOTIFICATION_MINUTES: 'התראה לפני האירוע בדקות',
    CALENDAR_NAME: 'שם יומן Google Calendar',
    APP_VERSION: 'גרסת המערכת',
    SCHEMA_VERSION: 'גרסת מבנה הנתונים',
    INITIALIZED: 'האם האתחול הושלם'
  };
  return descriptions[key] || '';
}

function writeSetupProperty_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, String(value));
}

function getSetupStatus() {
  var spreadsheet = getDataSpreadsheet_();
  var sheetStatus = {};

  [SHEETS.REMINDERS, SHEETS.INSTANCES, SHEETS.SETTINGS, SHEETS.LOGS]
    .forEach(function(sheetName) {
      var sheet = spreadsheet.getSheetByName(sheetName);
      sheetStatus[sheetName] = sheet
        ? validateHeaders_(sheet, getHeadersForSheet_(sheetName))
        : { valid: false, missing: getHeadersForSheet_(sheetName) };
    });

  return {
    initialized: PropertiesService.getScriptProperties().getProperty('INITIALIZED') === 'true',
    schemaVersion: PropertiesService.getScriptProperties().getProperty('SCHEMA_VERSION') || '',
    spreadsheetId: spreadsheet.getId(),
    sheets: sheetStatus,
    checkedAt: nowIso_()
  };
}
