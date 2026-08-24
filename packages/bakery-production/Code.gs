const BF = {
  SHEETS: {
    PRODUCTS: 'מוצרים', INGREDIENTS: 'חומרי גלם', RECIPES: 'מתכונים', STEPS: 'שלבי עבודה',
    ORDERS: 'הזמנות', ORDER_LINES: 'שורות הזמנה', PLANS: 'תוכניות ייצור', BATCHES: 'אצוות ייצור'
  },
  STATUS: ['ממתינה', 'מתוכננת', 'בייצור', 'מוכנה לאריזה', 'מוכנה למסירה', 'נמסרה']
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Management')
    .setTitle('BakeFlow | ניהול ייצור')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function setupBakeFlow() {
  const ss = SpreadsheetApp.getActive();
  const schemas = {};
  schemas[BF.SHEETS.PRODUCTS] = ['מזהה מוצר','שם מוצר','יחידת ייצור','עלות יעד ליחידה','זמן הכנה בדקות','פעיל'];
  schemas[BF.SHEETS.INGREDIENTS] = ['מזהה חומר','שם חומר','יחידת מידה','עלות ליחידה','ספק'];
  schemas[BF.SHEETS.RECIPES] = ['מזהה מוצר','מזהה חומר','כמות ליחידת מוצר'];
  schemas[BF.SHEETS.STEPS] = ['מזהה מוצר','סדר','שלב עבודה','משך בדקות','הערה'];
  schemas[BF.SHEETS.ORDERS] = ['מזהה הזמנה','תאריך הזמנה','לקוח','טלפון','תאריך מסירה','סטטוס','הערות'];
  schemas[BF.SHEETS.ORDER_LINES] = ['מזהה הזמנה','מזהה מוצר','כמות','הערת אריזה'];
  schemas[BF.SHEETS.PLANS] = ['מזהה תוכנית','מתאריך','עד תאריך','נוצר בתאריך','סטטוס'];
  schemas[BF.SHEETS.BATCHES] = ['מזהה אצווה','מזהה תוכנית','מזהה מוצר','כמות מתוכננת','סטטוס'];
  Object.keys(schemas).forEach(name => ensureSheet_(ss, name, schemas[name]));
  seedDemoData_(ss);
  return {ok: true, message: 'BakeFlow הוקמה בהצלחה. נתוני הדגמה נוספו לגיליונות.'};
}

function getAppData() {
  const ss = SpreadsheetApp.getActive();
  assertSetup_(ss);
  const orders = getOrders_().filter(o => o.status !== 'נמסרה');
  const batches = rows_(ss, BF.SHEETS.BATCHES).map(rowToBatch_);
  const counts = BF.STATUS.reduce((acc, status) => (acc[status] = orders.filter(o => o.status === status).length, acc), {});
  return {
    dashboard: { openOrders: orders.length, production: batches.filter(b => b.status === 'בייצור').length,
      packing: orders.filter(o => o.status === 'מוכנה לאריזה').length, counts },
    products: products_(), orders: getOrders_(), plans: rows_(ss, BF.SHEETS.PLANS).map(rowToPlan_).reverse()
  };
}

function saveOrder(payload) {
  const ss = SpreadsheetApp.getActive(); assertSetup_(ss);
  if (!payload || !payload.customer || !payload.deliveryDate || !payload.lines || !payload.lines.length) throw new Error('יש למלא לקוח, תאריך מסירה ולפחות פריט אחד.');
  const id = 'ORD-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  append_(ss, BF.SHEETS.ORDERS, [id, new Date(), clean_(payload.customer), clean_(payload.phone), payload.deliveryDate, 'ממתינה', clean_(payload.notes)]);
  payload.lines.filter(l => l.productId && Number(l.quantity) > 0).forEach(l => append_(ss, BF.SHEETS.ORDER_LINES, [id, l.productId, Number(l.quantity), clean_(l.packingNote)]));
  return {ok:true, id};
}

function createProductionPlan(fromDate, toDate) {
  const ss = SpreadsheetApp.getActive(); assertSetup_(ss);
  if (!fromDate || !toDate) throw new Error('יש לבחור טווח תאריכים לתוכנית.');
  const start = new Date(fromDate); const end = endOfDay_(new Date(toDate));
  if (start > end) throw new Error('תאריך ההתחלה חייב להיות לפני תאריך הסיום.');
  const relevant = getOrders_().filter(o => { const d = new Date(o.deliveryDate); return d >= start && d <= end && o.status !== 'נמסרה'; });
  if (!relevant.length) throw new Error('לא נמצאו הזמנות פתוחות בטווח שנבחר.');
  const totals = {};
  relevant.forEach(o => o.lines.forEach(line => totals[line.productId] = (totals[line.productId] || 0) + Number(line.quantity)));
  const planId = 'PLAN-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  append_(ss, BF.SHEETS.PLANS, [planId, fromDate, toDate, new Date(), 'פעילה']);
  Object.keys(totals).forEach(productId => append_(ss, BF.SHEETS.BATCHES, ['BAT-' + Utilities.getUuid().slice(0,8).toUpperCase(), planId, productId, totals[productId], 'מתוכננת']));
  relevant.forEach(o => updateOrderStatus_(ss, o.id, 'מתוכננת'));
  return getPlanDetails(planId);
}

function getPlanDetails(planId) {
  const ss = SpreadsheetApp.getActive(); assertSetup_(ss);
  const plan = rows_(ss, BF.SHEETS.PLANS).map(rowToPlan_).find(p => p.id === planId) || rows_(ss, BF.SHEETS.PLANS).map(rowToPlan_).slice(-1)[0];
  if (!plan) return null;
  const products = indexBy_(products_(), 'id');
  const ingredients = indexBy_(ingredients_(), 'id');
  const recipeRows = rows_(ss, BF.SHEETS.RECIPES);
  const steps = rows_(ss, BF.SHEETS.STEPS);
  const batches = rows_(ss, BF.SHEETS.BATCHES).map(rowToBatch_).filter(b => b.planId === plan.id).map(b => {
    const product = products[b.productId];
    const scaledRecipe = recipeRows.filter(r => r[0] === b.productId).map(r => ({
      name: ingredients[r[1]]?.name || r[1], unit: ingredients[r[1]]?.unit || '', quantity: Number(r[2]) * Number(b.quantity), cost: Number(r[2]) * Number(b.quantity) * Number(ingredients[r[1]]?.cost || 0)
    }));
    return {...b, productName: product?.name || b.productId, unit: product?.unit || 'יח׳', recipe: scaledRecipe,
      steps: steps.filter(s => s[0] === b.productId).sort((a,b) => Number(a[1])-Number(b[1])).map(s => ({title:s[2], minutes:Number(s[3]), note:s[4] || ''}))};
  });
  const shoppingMap = {};
  batches.forEach(b => b.recipe.forEach(i => { const k = i.name + '|' + i.unit; if (!shoppingMap[k]) shoppingMap[k] = {...i}; else { shoppingMap[k].quantity += i.quantity; shoppingMap[k].cost += i.cost; }}));
  const orders = getOrders_().filter(o => { const d = new Date(o.deliveryDate); return d >= new Date(plan.from) && d <= endOfDay_(new Date(plan.to)) && o.status !== 'נמסרה'; });
  return {plan, batches, shopping: Object.values(shoppingMap).sort((a,b)=>a.name.localeCompare(b.name)), totalCost: Object.values(shoppingMap).reduce((s,i)=>s+i.cost,0), packing: orders};
}

function setBatchStatus(batchId, status) {
  if (!['מתוכננת','בייצור','מוכנה'].includes(status)) throw new Error('סטטוס אצווה לא תקין.');
  const ss = SpreadsheetApp.getActive(); const sh = ss.getSheetByName(BF.SHEETS.BATCHES); const values = sh.getDataRange().getValues();
  const row = values.findIndex((r,i) => i && r[0] === batchId); if (row < 1) throw new Error('האצווה לא נמצאה.');
  sh.getRange(row + 1, 5).setValue(status);
  return {ok:true};
}

function setOrderStatus(orderId, status) {
  if (!BF.STATUS.includes(status)) throw new Error('סטטוס הזמנה לא תקין.');
  const ss = SpreadsheetApp.getActive(); updateOrderStatus_(ss, orderId, status); return {ok:true};
}

function getOrders_() {
  const ss = SpreadsheetApp.getActive(); const lines = rows_(ss, BF.SHEETS.ORDER_LINES); const products = indexBy_(products_(), 'id');
  return rows_(ss, BF.SHEETS.ORDERS).map(r => ({id:r[0], created:r[1], customer:r[2], phone:r[3], deliveryDate:formatDate_(r[4]), status:r[5], notes:r[6],
    lines: lines.filter(l => l[0] === r[0]).map(l => ({productId:l[1], productName:products[l[1]]?.name || l[1], quantity:Number(l[2]), packingNote:l[3] || ''}))})).reverse();
}
function products_() { return rows_(SpreadsheetApp.getActive(), BF.SHEETS.PRODUCTS).filter(r => String(r[5]).toLowerCase() !== 'לא').map(r => ({id:r[0],name:r[1],unit:r[2],targetCost:Number(r[3]),minutes:Number(r[4])})); }
function ingredients_() { return rows_(SpreadsheetApp.getActive(), BF.SHEETS.INGREDIENTS).map(r => ({id:r[0],name:r[1],unit:r[2],cost:Number(r[3]),supplier:r[4]})); }
function ensureSheet_(ss,name,headers) { const sh = ss.getSheetByName(name) || ss.insertSheet(name); if (sh.getLastRow() === 0) { sh.appendRow(headers); sh.setFrozenRows(1); sh.getRange(1,1,1,headers.length).setBackground('#4a2c21').setFontColor('#ffffff').setFontWeight('bold'); sh.autoResizeColumns(1,headers.length); } }
function seedDemoData_(ss) {
  if (rows_(ss, BF.SHEETS.PRODUCTS).length) return;
  [['P-CHOC','עוגת שוקולד חגיגית','עוגה',42,55,'כן'],['P-CHEESE','עוגת גבינה אפויה','עוגה',54,75,'כן'],['P-COOKIE','מארז עוגיות חמאה','מארז',28,40,'כן']].forEach(r=>append_(ss,BF.SHEETS.PRODUCTS,r));
  [['I-FLOUR','קמח','ק״ג',6.5,'ספק אפייה'],['I-SUGAR','סוכר','ק״ג',5.8,'ספק אפייה'],['I-EGG','ביצים','יח׳',1.1,'מכולת'],['I-CHOC','שוקולד מריר','ק״ג',43,'ספק אפייה'],['I-CHEESE','גבינת שמנת','ק״ג',31,'מחלבה'],['I-BUTTER','חמאה','ק״ג',38,'מחלבה']].forEach(r=>append_(ss,BF.SHEETS.INGREDIENTS,r));
  [['P-CHOC','I-FLOUR',0.35],['P-CHOC','I-SUGAR',0.28],['P-CHOC','I-EGG',4],['P-CHOC','I-CHOC',0.25],['P-CHEESE','I-FLOUR',0.12],['P-CHEESE','I-SUGAR',0.2],['P-CHEESE','I-EGG',5],['P-CHEESE','I-CHEESE',0.65],['P-COOKIE','I-FLOUR',0.3],['P-COOKIE','I-SUGAR',0.18],['P-COOKIE','I-BUTTER',0.22],['P-COOKIE','I-EGG',1]].forEach(r=>append_(ss,BF.SHEETS.RECIPES,r));
  [['P-CHOC',1,'שקילה והכנת בלילה',15,''],['P-CHOC',2,'אפייה',35,'לבדוק עם קיסם'],['P-CHOC',3,'קירור וקישוט',20,''],['P-CHEESE',1,'הכנת בסיס ומלית',25,''],['P-CHEESE',2,'אפייה וקירור',50,'קירור מלא לפני אריזה'],['P-COOKIE',1,'הכנת בצק',15,''],['P-COOKIE',2,'אפייה וחלוקה למארזים',25,'']].forEach(r=>append_(ss,BF.SHEETS.STEPS,r));
}
function rows_(ss,name) { const sh=ss.getSheetByName(name); if (!sh || sh.getLastRow()<2) return []; return sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues(); }
function append_(ss,name,row) { ss.getSheetByName(name).appendRow(row); }
function assertSetup_(ss) { if (!ss.getSheetByName(BF.SHEETS.PRODUCTS)) throw new Error('יש להריץ תחילה את setupBakeFlow.'); }
function rowToPlan_(r) { return {id:r[0],from:formatDate_(r[1]),to:formatDate_(r[2]),created:formatDate_(r[3]),status:r[4]}; }
function rowToBatch_(r) { return {id:r[0],planId:r[1],productId:r[2],quantity:Number(r[3]),status:r[4]}; }
function updateOrderStatus_(ss,id,status) { const sh=ss.getSheetByName(BF.SHEETS.ORDERS); const values=sh.getDataRange().getValues(); const row=values.findIndex((r,i)=>i&&r[0]===id); if(row<1) throw new Error('הזמנה לא נמצאה.'); sh.getRange(row+1,6).setValue(status); }
function indexBy_(arr,key) { return arr.reduce((m,x)=>(m[x[key]]=x,m),{}); }
function clean_(x) { return String(x || '').trim(); }
function formatDate_(d) { return d ? Utilities.formatDate(new Date(d), Session.getScriptTimeZone() || 'Asia/Jerusalem', 'yyyy-MM-dd') : ''; }
function endOfDay_(d) { d.setHours(23,59,59,999); return d; }
