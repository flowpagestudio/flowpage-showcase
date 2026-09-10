/**
 * Daily Reminders — canonical sheet headers.
 * Do not change existing names without a schema migration.
 */

var SHEET_HEADERS = {
  Reminders: [
    'reminderId', 'title', 'details', 'recurrenceType', 'recurrenceValue',
    'selectedDays', 'startDate', 'startTime', 'endDate', 'timezone',
    'status', 'generationWindowDays', 'lastGeneratedUntil', 'calendarId',
    'createdAt', 'updatedAt', 'version', 'createdBy', 'notes'
  ],
  ReminderInstances: [
    'instanceId', 'reminderId', 'scheduledDate', 'scheduledTime',
    'scheduledDateTime', 'originalDateTime', 'status', 'isException',
    'exceptionType', 'snoozedUntil', 'calendarEventId', 'syncStatus',
    'lastSyncAt', 'syncError', 'completedAt', 'cancelledAt',
    'createdAt', 'updatedAt', 'version'
  ],
  Settings: ['key', 'value', 'description'],
  Logs: [
    'logId', 'timestamp', 'action', 'entityType', 'entityId',
    'result', 'message', 'errorCode', 'payloadSummary', 'executionId'
  ]
};

function getHeadersForSheet_(sheetName) {
  if (!Object.prototype.hasOwnProperty.call(SHEET_HEADERS, sheetName)) {
    throw new Error('UNKNOWN_SHEET: ' + sheetName);
  }
  return SHEET_HEADERS[sheetName].slice();
}

function validateHeaders_(sheet, expectedHeaders) {
  var lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    return { valid: true, missing: expectedHeaders.slice(), duplicates: [] };
  }

  var actual = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map(function(value) { return String(value).trim(); });

  var duplicates = actual.filter(function(value, index) {
    return value && actual.indexOf(value) !== index;
  });

  var missing = expectedHeaders.filter(function(header) {
    return actual.indexOf(header) === -1;
  });

  return {
    valid: missing.length === 0 && duplicates.length === 0,
    missing: missing,
    duplicates: duplicates
  };
}

function ensureHeaders_(sheet, expectedHeaders) {
  var validation = validateHeaders_(sheet, expectedHeaders);

  if (sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    sheet.setFrozenRows(1);
    return { created: true, validation: validateHeaders_(sheet, expectedHeaders) };
  }

  if (!validation.valid) {
    throw new Error(
      'SCHEMA_INVALID: ' + sheet.getName() +
      ' missing=[' + validation.missing.join(',') +
      '] duplicates=[' + validation.duplicates.join(',') + ']'
    );
  }

  sheet.setFrozenRows(1);
  return { created: false, validation: validation };
}
