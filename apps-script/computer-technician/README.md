# שכבת תפעול — טכנאי מחשבים

מקור Google Apps Script עבור תרחיש טכנאי מחשבים ב־FlowPage Studio.

חשבון מימוש יחיד: `flowpagestudio@gmail.com`

## קבצים להעתקה יחד

| קובץ במאגר | שם בקובץ ב־Apps Script |
|---|---|
| `Code.gs` | `Code.gs` |
| `Index.html` | `Index` |
| `Management.html` | `Management` |
| `appsscript.json` | Manifest (`appsscript.json`) |

ראה `DEPLOYMENT.md` להוראות פריסה, בדיקת קצה־לקצה, ו־clasp.

## מה המערכת עושה

- קבלת פנייה ציבורית (`Index`) עם קבצים ל־Drive
- שמירה בגיליון `פניות` + התראת Gmail לבעל העסק
- ממשק ניהול (`?view=management`): סטטוסים + גלריה
- פיד גלריה ציבורי (`?view=gallery`) ל־GitHub Pages

## נכסי דמו

תמונות בסיס לגלריה מגיעות מ־[flowpage-assets](https://github.com/flowpagestudio/flowpage-assets).  
תמונות שהבעלים מעלה מהטלפון נשמרות ב־Drive של החשבון העסקי.
