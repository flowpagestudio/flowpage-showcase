/**
 * Daily Reminders — date and time utilities.
 * All business dates are handled in the configured Israel timezone.
 */

function nowIso_() {
  return Utilities.formatDate(new Date(), APP.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
}

function todayDateString_() {
  return Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy-MM-dd');
}

function formatDateInTimezone_(date, pattern) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('INVALID_DATE_OBJECT');
  }
  return Utilities.formatDate(date, APP.TIMEZONE, pattern);
}

function parseDateString_(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateString))) {
    throw new Error('INVALID_DATE: ' + dateString);
  }

  var parts = String(dateString).split('-').map(Number);
  var date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));

  if (
    date.getUTCFullYear() !== parts[0] ||
    date.getUTCMonth() !== parts[1] - 1 ||
    date.getUTCDate() !== parts[2]
  ) {
    throw new Error('INVALID_DATE: ' + dateString);
  }

  return date;
}

function validateTimeString_(timeString) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(timeString))) {
    throw new Error('INVALID_TIME: ' + timeString);
  }
  return true;
}

function validateDateString_(dateString) {
  parseDateString_(dateString);
  return true;
}

function addDaysToDateString_(dateString, days) {
  var date = parseDateString_(dateString);
  date.setUTCDate(date.getUTCDate() + Number(days));
  return Utilities.formatDate(date, 'UTC', 'yyyy-MM-dd');
}

function compareDateStrings_(left, right) {
  var leftDate = parseDateString_(left).getTime();
  var rightDate = parseDateString_(right).getTime();
  return leftDate === rightDate ? 0 : (leftDate < rightDate ? -1 : 1);
}

function combineDateAndTime_(dateString, timeString) {
  validateDateString_(dateString);
  validateTimeString_(timeString);
  return dateString + 'T' + timeString + ':00';
}

function isDateTimeInPast_(dateString, timeString) {
  var candidate = combineDateAndTime_(dateString, timeString);
  var current = nowIso_();
  return candidate <= current;
}
