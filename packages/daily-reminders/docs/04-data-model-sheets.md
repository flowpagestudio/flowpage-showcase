# Daily Reminders — מודל נתונים ו־Google Sheets

## 1. מטרת המבנה

Google Sheets ישמש כמסד הנתונים הראשון של המערכת.

המבנה צריך לאפשר:

- שמירת התראות ראשיות.
- שמירת מופעים של התראות.
- שמירת חריגים.
- ניהול סטטוסים.
- סנכרון מול Google Calendar.
- שמירת היסטוריה.
- תיעוד פעולות ושגיאות.
- שינוי עתידי של המערכת בלי שבירת נתונים קיימים.

## 2. עקרונות מסד הנתונים

- כל רשומה מקבלת מזהה ייחודי.
- אין להסתמך על מספר שורה כמזהה.
- תאריכים נשמרים בפורמט ISO.
- שעות נשמרות בפורמט 24 שעות.
- אזור הזמן הקבוע הוא Asia/Jerusalem.
- נתוני עבר אינם נמחקים בפעולות רגילות.
- סטטוס נשמר בשדה ייעודי.
- מזהי Google Calendar נשמרים בנפרד.
- כל טבלה מקבלת שורת כותרות קבועה.
- אין לשנות שמות עמודות לאחר שהקוד התחיל להשתמש בהן בלי מנגנון הגירה.

## 3. שמות הגיליונות

המערכת תשתמש בגיליונות הבאים:

1. Reminders
2. ReminderInstances
3. Settings
4. Logs

## 4. גיליון Reminders

גיליון זה מכיל את ההתראה הראשית ואת כלל החזרתיות.

### 4.1 עמודות

| מס׳ | שם שדה | חובה | תיאור |
|---:|---|---|---|
| 1 | reminderId | כן | מזהה ייחודי להתראה הראשית |
| 2 | title | כן | כותרת ההתראה |
| 3 | details | לא | פירוט נוסף |
| 4 | recurrenceType | כן | סוג החזרתיות |
| 5 | recurrenceValue | לא | מספר שעות או ימים |
| 6 | selectedDays | לא | ימים קבועים בשבוע |
| 7 | startDate | כן | תאריך תחילת ההתראה |
| 8 | startTime | כן | שעת ההתראה |
| 9 | endDate | לא | תאריך סיום |
| 10 | timezone | כן | אזור הזמן |
| 11 | status | כן | מצב ההתראה הראשית |
| 12 | generationWindowDays | כן | מספר ימים ליצירת מופעים קדימה |
| 13 | lastGeneratedUntil | לא | עד איזה מועד נוצרו מופעים |
| 14 | calendarId | לא | מזהה היומן ב־Google Calendar |
| 15 | createdAt | כן | מועד יצירת הרשומה |
| 16 | updatedAt | כן | מועד עדכון הרשומה |
| 17 | version | כן | מספר גרסת הרשומה |
| 18 | createdBy | לא | משתמש יוצר, לעתיד |
| 19 | notes | לא | הערות מערכת פנימיות |

### 4.2 ערכי recurrenceType

- NONE
- HOURLY_INTERVAL
- DAILY_INTERVAL
- WEEKLY_DAYS

### 4.3 ערכי status

- ACTIVE
- PAUSED
- CANCELLED
- COMPLETED
- ARCHIVED

### 4.4 דוגמאות

#### התראה חד־פעמית

- recurrenceType: NONE
- recurrenceValue: ריק
- selectedDays: ריק

#### כל שעתיים

- recurrenceType: HOURLY_INTERVAL
- recurrenceValue: 2
- selectedDays: ריק

#### כל שלושה ימים

- recurrenceType: DAILY_INTERVAL
- recurrenceValue: 3
- selectedDays: ריק

#### ימים נבחרים

- recurrenceType: WEEKLY_DAYS
- recurrenceValue: ריק
- selectedDays: 0,2,4

## 5. גיליון ReminderInstances

גיליון זה מכיל כל מופע מתוזמן בפועל.

### 5.1 עמודות

| מס׳ | שם שדה | חובה | תיאור |
|---:|---|---|---|
| 1 | instanceId | כן | מזהה ייחודי למופע |
| 2 | reminderId | כן | קישור להתראה הראשית |
| 3 | scheduledDate | כן | תאריך המופע |
| 4 | scheduledTime | כן | שעת המופע |
| 5 | scheduledDateTime | כן | תאריך ושעה מלאים |
| 6 | originalDateTime | כן | המועד המקורי לפני חריגה |
| 7 | status | כן | מצב המופע |
| 8 | isException | כן | האם המופע שונה מהרצף |
| 9 | exceptionType | לא | סוג החריגה |
| 10 | snoozedUntil | לא | מועד חדש לאחר דחייה |
| 11 | calendarEventId | לא | מזהה אירוע ב־Calendar |
| 12 | syncStatus | כן | מצב הסנכרון |
| 13 | lastSyncAt | לא | מועד סנכרון אחרון |
| 14 | syncError | לא | תיאור שגיאת סנכרון |
| 15 | completedAt | לא | מועד סימון כבוצע |
| 16 | cancelledAt | לא | מועד ביטול |
| 17 | createdAt | כן | מועד יצירת המופע |
| 18 | updatedAt | כן | מועד עדכון המופע |
| 19 | version | כן | מספר גרסת המופע |

### 5.2 ערכי status

- SCHEDULED
- COMPLETED
- SNOOZED
- CANCELLED
- PAUSED
- EXCEPTION

### 5.3 ערכי exceptionType

- RESCHEDULED
- EDITED
- SKIPPED
- CANCELLED
- SNOOZED

### 5.4 ערכי syncStatus

- NOT_SYNCED
- SYNCED
- SYNC_ERROR
- DELETE_PENDING
- DELETED

## 6. מפתח מניעת כפילויות

המפתח הלוגי של מופע יהיה:

reminderId + scheduledDateTime

לפני יצירת מופע חדש המערכת תבדוק אם כבר קיימת רשומה פעילה עם אותו צירוף.

אין להשתמש ב־instanceId לבדיקת כפילות, משום שכל ניסיון יצירה עלול להפיק מזהה חדש.

## 7. גיליון Settings

גיליון ההגדרות יכיל זוגות של מפתח וערך.

| key | value | description |
|---|---|---|
| APP_NAME | Daily Reminders | שם המערכת |
| TIMEZONE | Asia/Jerusalem | אזור הזמן |
| DEFAULT_GENERATION_WINDOW | 30 | מספר ימים קדימה |
| MIN_SNOOZE_MINUTES | 1 | זמן דחייה מינימלי |
| DEFAULT_CALENDAR_ID |  | יומן ברירת מחדל |
| DEFAULT_NOTIFICATION_MINUTES | 0 | התראה בזמן האירוע |
| VERSION | 1.0.0 | גרסת מערכת |
| INITIALIZED | false | האם האתחול הושלם |

## 8. גיליון Logs

גיליון זה ישמש לתיעוד פעולות ושגיאות.

| מס׳ | שם שדה | תיאור |
|---:|---|---|
| 1 | logId | מזהה רישום |
| 2 | timestamp | מועד הפעולה |
| 3 | action | סוג הפעולה |
| 4 | entityType | Reminder או Instance |
| 5 | entityId | מזהה הרשומה |
| 6 | result | SUCCESS או ERROR |
| 7 | message | הודעה |
| 8 | errorCode | קוד שגיאה |
| 9 | payloadSummary | תקציר הנתונים |
| 10 | executionId | מזהה ריצת Apps Script |

## 9. פורמטי תאריך ושעה

### תאריך

YYYY-MM-DD

דוגמה:

2026-09-10

### שעה

HH:mm

דוגמה:

08:30

### תאריך ושעה מלאים

YYYY-MM-DDTHH:mm:ss

דוגמה:

2026-09-10T08:30:00

### כללי שמירה

- אין לשמור תאריך בפורמט תצוגה עברי בתוך שדה הנתונים.
- תצוגה עברית תיווצר רק בממשק.
- כל המרות התאריך ירוכזו ב־DateTimeService.
- אין לחשב יום באמצעות מניפולציות מחרוזת לא מבוקרות.

## 10. קשרים בין הגיליונות

Reminders
    |
    └── reminderId
            |
            └── ReminderInstances
                    |
                    └── calendarEventId

Settings — הגדרות כלליות
Logs     — תיעוד פעולות מכל המערכת

## 11. כללי שמירה

### יצירת התראה

1. יצירת reminderId.
2. שמירת ההתראה הראשית.
3. יצירת מופע או מופעים.
4. ניסיון סנכרון.
5. עדכון מצב הסנכרון.
6. כתיבת Log.

### עדכון התראה

- עדכון updatedAt.
- הגדלת version.
- שמירת ההחלטה על היקף השינוי.
- עדכון המופעים הרלוונטיים.
- סנכרון מחדש.
- כתיבת Log.

### מחיקה

- אין מחיקה פיזית כברירת מחדל.
- שינוי סטטוס ל־CANCELLED.
- ביטול אירועי Calendar.
- שמירת היסטוריה.
- כתיבת Log.

## 12. כללי ניהול שורות

- שורת הכותרות היא שורה 1.
- אין להוסיף שורות ידנית לפני שורת הכותרות.
- אין למיין את הגיליון ידנית לאחר שהמערכת התחילה לפעול.
- מיון יתבצע באמצעות הקוד או בתצוגה נפרדת.
- שורות ריקות יימנעו ככל האפשר.
- כל גישה לעמודות תתבצע לפי שמות כותרות ולא לפי מספרים קשיחים.

## 13. אתחול ראשוני

פונקציית Setup תבצע:

1. בדיקה אם הגיליון קיים.
2. יצירת גיליונות חסרים.
3. יצירת כותרות.
4. הכנסת הגדרות ברירת מחדל.
5. בדיקת תקינות הכותרות.
6. סימון INITIALIZED.
7. כתיבת Log.

האתחול לא ימחק גיליון קיים ולא ידרוס נתונים קיימים.

## 14. תנאי קבלה

- קיימים ארבעה גיליונות מוגדרים.
- לכל גיליון יש כותרות קבועות.
- כל התראה מקבלת reminderId.
- כל מופע מקבל instanceId.
- כל מופע מקושר להתראה ראשית.
- ניתן לזהות מופע לפי reminderId ו־scheduledDateTime.
- נשמרים status ו־syncStatus.
- נשמרים createdAt ו־updatedAt.
- נשמרת version לכל רשומה.
- ניתן לשמור היסטוריה.
- קיימת טבלת הגדרות.
- קיימת טבלת Logs.
- Setup אינו מוחק נתונים קיימים.
- המבנה תומך בחד־פעמי, חזרתיות וחריגים.

## 15. החלטות לפרק הבא

בפעימה הבאה יש להגדיר:

- פונקציות CRUD.
- פעולות Repository.
- כללי עדכון שורות.
- כללי חיפוש וסינון.
- מנגנון נעילה.
- טיפול בגרסאות.
- חוזה התשובות בין Apps Script לממשק.
