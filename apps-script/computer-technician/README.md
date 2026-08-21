# שכבת תפעול — טכנאי מחשבים

מקור Google Apps Script עבור תרחיש טכנאי מחשבים ב־FlowPage Studio.

## קבצים

- `Code.gs` — פנייה, Drive, Gmail ו־Calendar.
- `Index.html` — Web App בעברית.
- `appsscript.json` — הגדרות הפרויקט.

## חיבור לפרויקט Apps Script

1. פתח את פרויקט Apps Script העסקי.
2. החלף את תוכן `Code.gs` בקובץ המקביל כאן.
3. צור קובץ HTML בשם `Index` והדבק את `Index.html`.
4. הגדר את Manifest דרך Project Settings → Show appsscript.json והדבק את הקובץ.
5. שמור והריץ פעם אחת את `setupProject` — אשר את הרשאות Drive, Gmail ו־Calendar.
6. Deploy → New deployment → Web app:
   - Execute as: Me
   - Who has access: Anyone
7. העתק את כתובת ה־Web App לשדה המתאים בדף הטכנאי.

הנתונים נשמרים בגיליון העסקי, והקבצים המצורפים נשמרים תחת תיקיית Drive ייעודית עבור כל פנייה.
