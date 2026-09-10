# Daily Reminders — פעולות נתונים וחוזה Apps Script

## 1. מטרת המסמך

להגדיר את שכבת הנתונים ואת התקשורת בין ממשק המשתמש לבין Google Apps Script.

המסמך מגדיר:

- פעולות CRUD.
- שכבת Repository.
- פורמט בקשות.
- פורמט תשובות.
- אימות נתונים.
- נעילות.
- גרסאות.
- מניעת כפילויות.
- טיפול בשגיאות.

## 2. שכבות המערכת

המערכת תופרד לארבע שכבות:

### 2.1 UI

אוסף את נתוני המשתמש ומציג תוצאה.

### 2.2 API Router

מקבל פעולה ומעביר אותה לשירות המתאים.

### 2.3 Services

מיישם את חוקי העסק:

- יצירת התראה.
- חזרתיות.
- עריכה.
- מחיקה.
- דחייה.
- סנכרון.

### 2.4 Repository

אחראי לקריאה ולכתיבה בפועל ל־Google Sheets.

זרימת פעולה:

UI → API Router → Service → Repository → Google Sheets

## 3. פעולות API

### 3.1 getAppState

מחזירה את מצב הפתיחה:

- תאריך נוכחי.
- שעה נוכחית.
- התראות היום.
- התראות קרובות.
- הגדרות בסיסיות.
- מצב חיבור.

### 3.2 getTodayInstances

מחזירה את מופעי ההתראות של היום.

פרמטרים:

- date.
- includeCompleted.
- includeOverdue.

### 3.3 getUpcomingInstances

מחזירה מופעים לטווח תאריכים.

פרמטרים:

- fromDate.
- toDate.
- status.

### 3.4 getReminder

מחזירה התראה ראשית לפי reminderId.

### 3.5 createReminder

יוצרת התראה ראשית ומופע או מופעים.

### 3.6 updateReminder

מעדכנת התראה לפי היקף שנבחר.

### 3.7 updateInstance

מעדכנת מופע בודד ויוצרת חריג במידת הצורך.

### 3.8 completeInstance

מסמנת מופע כבוצע.

### 3.9 snoozeInstance

דוחה מופע למועד חדש.

### 3.10 pauseReminder

משהה התראה חוזרת.

### 3.11 resumeReminder

מפעילה מחדש התראה חוזרת.

### 3.12 deleteInstance

מוחקת או מבטלת מופע יחיד.

### 3.13 deleteReminderSeries

מוחקת את הרצף או את המופעים העתידיים.

### 3.14 syncInstance

מנסה לסנכרן מופע שלא הסתנכרן.

## 4. מבנה בקשה

כל בקשה תכיל:

- action.
- requestId.
- payload.
- clientTimestamp.
- clientVersion.

דוגמה:

{
  "action": "createReminder",
  "requestId": "req_123",
  "payload": {
    "title": "להתקשר לספק",
    "details": "",
    "startDate": "2026-09-10",
    "startTime": "08:30",
    "recurrenceType": "NONE"
  },
  "clientTimestamp": "2026-09-10T07:00:00",
  "clientVersion": "1.0.0"
}

## 5. מבנה תשובה מוצלחת

{
  "success": true,
  "requestId": "req_123",
  "data": {},
  "meta": {
    "serverTimestamp": "2026-09-10T07:00:01",
    "version": "1.0.0"
  }
}

## 6. מבנה תשובת שגיאה

{
  "success": false,
  "requestId": "req_123",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "יש להזין כותרת להתראה.",
    "field": "title",
    "retryable": false
  },
  "meta": {
    "serverTimestamp": "2026-09-10T07:00:01"
  }
}

## 7. קודי שגיאה

### שגיאות קלט

- VALIDATION_ERROR
- TITLE_REQUIRED
- DATE_REQUIRED
- TIME_REQUIRED
- INVALID_DATE
- INVALID_TIME
- INVALID_RECURRENCE
- INVALID_INTERVAL
- DAYS_REQUIRED

### שגיאות נתונים

- REMINDER_NOT_FOUND
- INSTANCE_NOT_FOUND
- DUPLICATE_INSTANCE
- VERSION_CONFLICT
- INVALID_STATUS_TRANSITION

### שגיאות הרשאה

- AUTH_REQUIRED
- SHEETS_PERMISSION_REQUIRED
- CALENDAR_PERMISSION_REQUIRED

### שגיאות מערכת

- SHEET_ERROR
- CALENDAR_ERROR
- LOCK_TIMEOUT
- INTERNAL_ERROR
- SYNC_ERROR

## 8. פעולות Repository

### 8.1 RemindersRepository

פעולות:

- findById(reminderId)
- findActive()
- findByStatus(status)
- insert(reminder)
- update(reminderId, values)
- softDelete(reminderId)
- incrementVersion(reminderId)

### 8.2 InstancesRepository

פעולות:

- findById(instanceId)
- findByReminderId(reminderId)
- findByDate(date)
- findByDateRange(fromDate, toDate)
- findDuplicate(reminderId, scheduledDateTime)
- insert(instance)
- insertMany(instances)
- update(instanceId, values)
- softDelete(instanceId)
- updateSyncStatus(instanceId, status)

### 8.3 SettingsRepository

פעולות:

- get(key)
- getAll()
- set(key, value)
- setMany(values)

### 8.4 LogsRepository

פעולות:

- write(logEntry)
- writeSuccess(action, entityId, message)
- writeError(action, entityId, error)

## 9. גישה לעמודות

אין להשתמש במספרי עמודות קשיחים בקוד העסקי.

באתחול:

1. קריאת שורת הכותרות.
2. יצירת מיפוי שם עמודה למספר.
3. בדיקת שדות חובה.
4. עצירת המערכת אם חסרה עמודה קריטית.

דוגמה לוגית:

headers.title
headers.reminderId
headers.updatedAt

## 10. יצירת מזהים

המזהים ייווצרו בצד השרת.

כללים:

- לא להשתמש במספר שורה.
- לא להשתמש בתאריך בלבד.
- לא להשתמש בכותרת כמזהה.
- המזהה חייב להיות ייחודי.
- המזהה לא משתנה לאחר יצירת הרשומה.

פורמט אפשרי:

- rem_YYYYMMDD_random
- ins_YYYYMMDD_random
- log_YYYYMMDD_random

## 11. מנגנון נעילה

פעולות כתיבה ישתמשו ב־Lock Service.

### פעולות הדורשות נעילה

- יצירת התראה.
- יצירת מופעים.
- עדכון רצף.
- מחיקת רצף.
- יצירת אירוע וסנכרון.
- יצירת מופעים באמצעות טריגר.

### תהליך

1. ניסיון לקבלת נעילה.
2. אם אין נעילה — המתנה קצרה.
3. אם לא התקבלה נעילה — שגיאת LOCK_TIMEOUT.
4. ביצוע הפעולה.
5. שחרור הנעילה גם במקרה של שגיאה.

## 12. מניעת כפילויות

כל בקשה תכיל requestId.

המערכת תוכל לבדוק:

- האם הבקשה כבר בוצעה.
- האם נוצר reminderId.
- האם נוצר instanceId.
- האם נוצר calendarEventId.

בנוסף, עבור מופע תתבצע בדיקה לפי:

reminderId + scheduledDateTime

## 13. טיפול בגרסאות

לכל התראה ולכל מופע יש version.

### בעת קריאה

ה־version נשלח לממשק.

### בעת עדכון

הממשק שולח את ה־version האחרון הידוע.

### בעת שמירה

- אם הגרסה זהה — העדכון מותר.
- אם הגרסה שונה — מוחזרת VERSION_CONFLICT.
- המשתמש מקבל אפשרות לרענן.

## 14. כלל אטומיות

יצירת התראה תטופל כפעולה לוגית אחת:

1. אימות.
2. יצירת התראה ראשית.
3. יצירת מופעים.
4. סנכרון ראשוני.
5. עדכון מצבי סנכרון.
6. כתיבת Log.

אם שלב Calendar נכשל:

- ההתראה נשארת.
- המופע נשמר.
- הסנכרון מסומן כשגיאה.
- הפעולה אינה מדווחת כהצלחה מלאה.

## 15. פעולת createReminder

### קלט

- title.
- details.
- startDate.
- startTime.
- recurrenceType.
- recurrenceValue.
- selectedDays.
- endDate.

### פלט

- reminder.
- instances שנוצרו.
- syncSummary.

### בדיקות

- כותרת קיימת.
- תאריך תקין.
- שעה תקינה.
- התראה להיום אינה בעבר.
- חזרתיות תקינה.
- ימים נבחרים קיימים כשנדרש.
- אין כפילות.

## 16. פעולת updateInstance

### קלט

- instanceId.
- title או details במידת הצורך.
- scheduledDate.
- scheduledTime.
- version.
- updateScope.

### updateScope

- INSTANCE_ONLY
- THIS_AND_FUTURE
- ENTIRE_SERIES

### כללים

- INSTANCE_ONLY יוצר חריג.
- THIS_AND_FUTURE שומר את העבר ומחשב מחדש את העתיד.
- ENTIRE_SERIES משנה את ההתראה הראשית.

## 17. פעולת deleteReminderSeries

### קלט

- reminderId.
- deleteScope.
- version.

### deleteScope

- INSTANCE_ONLY
- THIS_AND_FUTURE
- ENTIRE_SERIES

### פלט

- מספר מופעים שבוטלו.
- מספר אירועי Calendar שטופלו.
- מצב ההתראה הראשית.

## 18. פעולת snoozeInstance

### קלט

- instanceId.
- snoozeUntil.
- version.

### כללים

- רק המופע הנבחר משתנה.
- המופע מסומן כחריג.
- מופעים עתידיים אינם משתנים.
- האירוע ביומן מתעדכן.

## 19. פעולת syncInstance

### תהליך

1. טעינת המופע.
2. בדיקה אם קיים calendarEventId.
3. אם קיים — עדכון.
4. אם אינו קיים — יצירה.
5. שמירת מזהה האירוע.
6. עדכון syncStatus.
7. כתיבת Log.

## 20. פעולות קריאה

פעולות קריאה לא ישנו נתונים.

פעולות עיקריות:

- getAppState.
- getTodayInstances.
- getUpcomingInstances.
- getReminder.
- getSettings.
- getSyncErrors.

התוצאות יוחזרו ממוינות לפי scheduledDateTime.

## 21. טרנספורמציה ל־UI

ה־Service יחזיר נתונים המתאימים להצגה:

- timeLabel.
- dateLabel.
- relativeLabel.
- recurrenceLabel.
- statusLabel.
- canEdit.
- canDelete.
- canSnooze.
- canComplete.

כך הממשק לא יצטרך ליישם חוקי עסק.

## 22. תנאי קבלה

- לכל פעולה יש action מוגדר.
- לכל בקשה יש requestId.
- לכל תשובה יש success.
- שגיאה מכילה code ו־message.
- פעולות כתיבה משתמשות בנעילה.
- אין שימוש במספר שורה כמזהה.
- קיימת בדיקת version.
- קיימת בדיקת כפילות.
- כשל Calendar אינו מוחק נתונים.
- כל פעולה משמעותית נרשמת ב־Logs.
- ממשק המשתמש אינו ניגש ישירות ל־Sheets.
- כל שינוי עובר דרך Service מתאים.

## 23. החלטות לפרק הבא

בפרק הבא יש ליישם:

- Setup.gs.
- Config.gs.
- Headers.gs.
- DateTimeService.gs.
- LogsRepository.gs.
- RemindersRepository.gs.
- InstancesRepository.gs.
- פונקציות בסיסיות לקריאה ולכתיבה.
