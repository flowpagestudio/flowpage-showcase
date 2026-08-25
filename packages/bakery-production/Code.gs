const BF = {
  SHEETS: {
    CUSTOMERS: 'לקוחות', PRODUCTS: 'מוצרים', INGREDIENTS: 'חומרי גלם', RECIPES: 'מתכונים', STEPS: 'שלבי עבודה', RECIPE_MEDIA: 'מדיה למתכונים',
    ORDERS: 'הזמנות', ORDER_LINES: 'שורות הזמנה', PLANS: 'תוכניות ייצור', BATCHES: 'אצוות ייצור'
  },
  STATUS: ['ממתינה', 'מתוכננת', 'בייצור', 'מוכנה לאריזה', 'מוכנה למסירה', 'נמסרה']
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Management')
    .setTitle('BakeFlow | ניהול ייצור')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Returns the spreadsheet that stores BakeFlow data in both bound and standalone projects. */
function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const storedId = props.getProperty('BAKEFLOW_SPREADSHEET_ID');
  if (storedId) return SpreadsheetApp.openById(storedId);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    props.setProperty('BAKEFLOW_SPREADSHEET_ID', active.getId());
    return active;
  }
  const created = SpreadsheetApp.create('BakeFlow - ניהול ייצור');
  props.setProperty('BAKEFLOW_SPREADSHEET_ID', created.getId());
  return created;
}

function setupBakeFlow() {
  const ss = getSpreadsheet_();
  const schemas = {};
  schemas[BF.SHEETS.CUSTOMERS] = ['מזהה לקוח','שם לקוח','טלפון','אימייל','כתובת','הערות','פעיל'];
  schemas[BF.SHEETS.PRODUCTS] = ['מזהה מוצר','שם מוצר','יחידת ייצור','עלות יעד ליחידה','זמן הכנה בדקות','פעיל','מחיר מכירה','קטגוריה'];
  schemas[BF.SHEETS.INGREDIENTS] = ['מזהה חומר','שם חומר','יחידת מידה','עלות ליחידה','ספק'];
  schemas[BF.SHEETS.RECIPES] = ['מזהה מוצר','מזהה חומר','כמות ליחידת מוצר'];
  schemas[BF.SHEETS.STEPS] = ['מזהה מוצר','סדר','שלב עבודה','משך בדקות','הערה'];
  schemas[BF.SHEETS.RECIPE_MEDIA] = ['מזהה מדיה','מזהה מוצר','כותרת','כתובת קובץ ב-Drive','הערה','נוצר בתאריך'];
  schemas[BF.SHEETS.ORDERS] = ['מזהה הזמנה','תאריך הזמנה','לקוח','טלפון','תאריך מסירה','סטטוס','הערות'];
  schemas[BF.SHEETS.ORDER_LINES] = ['מזהה הזמנה','מזהה מוצר','כמות','הערת אריזה'];
  schemas[BF.SHEETS.PLANS] = ['מזהה תוכנית','מתאריך','עד תאריך','נוצר בתאריך','סטטוס'];
  schemas[BF.SHEETS.BATCHES] = ['מזהה אצווה','מזהה תוכנית','מזהה מוצר','כמות מתוכננת','סטטוס'];
  Object.keys(schemas).forEach(name => ensureSheet_(ss, name, schemas[name]));
  seedDemoData_(ss);
  return {ok: true, message: 'BakeFlow הוקמה בהצלחה. נתוני הדגמה נוספו לגיליונות.', spreadsheetUrl: ss.getUrl()};
}

function getAppData() {
  const ss = getSpreadsheet_();
  assertSetup_(ss);
  // The showcase catalog is intentionally returned directly from code.
  // This keeps the demo visible even if a Sheet was created or linked incorrectly.
  const demo = demoCatalog_();
  const orders = getOrders_().filter(o => o.status !== 'נמסרה');
  const batches = rows_(ss, BF.SHEETS.BATCHES).map(rowToBatch_);
  const counts = BF.STATUS.reduce((acc, status) => (acc[status] = orders.filter(o => o.status === status).length, acc), {});
  return {
    dashboard: { openOrders: orders.length, production: batches.filter(b => b.status === 'בייצור').length,
      packing: orders.filter(o => o.status === 'מוכנה לאריזה').length, counts },
    products: demo.products, ingredients: demo.ingredients, customers: customers_(), orders: getOrders_(), plans: rows_(ss, BF.SHEETS.PLANS).map(rowToPlan_).reverse(), recipeMedia: recipeMedia_(), recipeIngredients: demo.recipeIngredients
  };
}

function getAppDataSafe() {
  try {
    return {ok:true, data:getAppData()};
  } catch (error) {
    let spreadsheet = '';
    let sheets = [];
    try { const ss=getSpreadsheet_(); spreadsheet=ss.getUrl(); sheets=ss.getSheets().map(sh=>sh.getName()); } catch (ignored) {}
    return {ok:false, error:String(error && error.message ? error.message : error), spreadsheet, sheets};
  }
}

function saveOrder(payload) {
  const ss = getSpreadsheet_(); assertSetup_(ss);
  if (!payload || !payload.customer || !payload.deliveryDate || !payload.lines || !payload.lines.length) throw new Error('יש למלא לקוח, תאריך מסירה ולפחות פריט אחד.');
  let customer = payload.customer;
  let phone = payload.phone;
  if (payload.customerId) { const c = customers_().find(x => x.id === payload.customerId); if (c) { customer = c.name; phone = c.phone; } }
  const id = 'ORD-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  append_(ss, BF.SHEETS.ORDERS, [id, new Date(), clean_(customer), clean_(phone), payload.deliveryDate, 'ממתינה', clean_(payload.notes)]);
  payload.lines.filter(l => l.productId && Number(l.quantity) > 0).forEach(l => append_(ss, BF.SHEETS.ORDER_LINES, [id, l.productId, Number(l.quantity), clean_(l.packingNote)]));
  return {ok:true, id, message: 'ההזמנה נשמרה בהצלחה'};
}

function saveCustomer(payload) {
  const ss = getSpreadsheet_(); assertSetup_(ss);
  if (!payload || !clean_(payload.name)) throw new Error('יש להזין שם לקוח.');
  const id = 'CUS-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  append_(ss, BF.SHEETS.CUSTOMERS, [id, clean_(payload.name), clean_(payload.phone), clean_(payload.email), clean_(payload.address), clean_(payload.notes), 'כן']);
  return {ok:true, id};
}

function saveProduct(payload) {
  const ss = getSpreadsheet_(); assertSetup_(ss);
  if (!payload || !clean_(payload.name) || !clean_(payload.unit)) throw new Error('יש להזין שם מוצר ויחידת ייצור.');
  const id = 'P-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  append_(ss, BF.SHEETS.PRODUCTS, [id, clean_(payload.name), clean_(payload.unit), Number(payload.targetCost || 0), Number(payload.minutes || 0), 'כן', Number(payload.salePrice || 0), clean_(payload.category)]);
  return {ok:true, id};
}

function saveIngredient(payload) {
  const ss = getSpreadsheet_(); assertSetup_(ss);
  if (!payload || !clean_(payload.name) || !clean_(payload.unit)) throw new Error('יש להזין שם חומר גלם ויחידת מידה.');
  const id = 'I-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  append_(ss, BF.SHEETS.INGREDIENTS, [id, clean_(payload.name), clean_(payload.unit), Number(payload.cost || 0), clean_(payload.supplier)]);
  return {ok:true, id};
}

function saveRecipeStep(payload) {
  const ss = getSpreadsheet_(); assertSetup_(ss);
  if (!payload || !payload.productId || !clean_(payload.title)) throw new Error('יש לבחור מוצר ולהזין שלב עבודה.');
  const existing = rows_(ss, BF.SHEETS.STEPS).filter(r => r[0] === payload.productId);
  append_(ss, BF.SHEETS.STEPS, [payload.productId, Number(payload.order || existing.length + 1), clean_(payload.title), Number(payload.minutes || 0), clean_(payload.note)]);
  return {ok:true};
}

function saveRecipeIngredient(payload) {
  const ss = getSpreadsheet_(); assertSetup_(ss);
  if (!payload || !payload.productId || !payload.ingredientId || Number(payload.quantity) <= 0) throw new Error('יש לבחור מוצר, חומר גלם וכמות תקינה.');
  append_(ss, BF.SHEETS.RECIPES, [payload.productId, payload.ingredientId, Number(payload.quantity)]);
  return {ok:true};
}

function updateRecipeIngredient(rowNumber, quantity) {
  const ss = getSpreadsheet_(); assertSetup_(ss);
  const row = Number(rowNumber); const qty = Number(quantity);
  if (row < 2 || qty <= 0) throw new Error('כמות המרכיב חייבת להיות גדולה מאפס.');
  ss.getSheetByName(BF.SHEETS.RECIPES).getRange(row, 3).setValue(qty);
  return {ok:true};
}

function deleteRecipeIngredient(rowNumber) {
  const ss = getSpreadsheet_(); assertSetup_(ss);
  const row = Number(rowNumber);
  if (row < 2) throw new Error('שורת מתכון לא תקינה.');
  ss.getSheetByName(BF.SHEETS.RECIPES).deleteRow(row);
  return {ok:true};
}

function loadBakeryDemoData() {
  const ss = getSpreadsheet_(); assertSetup_(ss);
  const added = loadBakeryDemoData_(ss, true);
  return {ok:true, added};
}

function uploadRecipeImage(payload) {
  const ss = getSpreadsheet_(); assertSetup_(ss);
  if (!payload || !payload.productId || !payload.base64 || !payload.fileName) throw new Error('יש לבחור מוצר וקובץ תמונה.');
  const folders = DriveApp.getFoldersByName('BakeFlow - מתכונים');
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('BakeFlow - מתכונים');
  const bytes = Utilities.base64Decode(payload.base64);
  const file = folder.createFile(Utilities.newBlob(bytes, payload.mimeType || 'image/jpeg', payload.fileName));
  append_(ss, BF.SHEETS.RECIPE_MEDIA, ['MED-' + Utilities.getUuid().slice(0,8).toUpperCase(), payload.productId, clean_(payload.title) || payload.fileName, file.getUrl(), clean_(payload.note), new Date()]);
  return {ok:true, url:file.getUrl()};
}

function createProductionPlan(fromDate, toDate) {
  const ss = getSpreadsheet_(); assertSetup_(ss);
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
  const ss = getSpreadsheet_(); assertSetup_(ss);
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
  const ss = getSpreadsheet_(); const sh = ss.getSheetByName(BF.SHEETS.BATCHES); const values = sh.getDataRange().getValues();
  const row = values.findIndex((r,i) => i && r[0] === batchId); if (row < 1) throw new Error('האצווה לא נמצאה.');
  sh.getRange(row + 1, 5).setValue(status);
  return {ok:true};
}

function setOrderStatus(orderId, status) {
  if (!BF.STATUS.includes(status)) throw new Error('סטטוס הזמנה לא תקין.');
  const ss = getSpreadsheet_(); updateOrderStatus_(ss, orderId, status); return {ok:true};
}

function getOrders_() {
  const ss = getSpreadsheet_(); const lines = rows_(ss, BF.SHEETS.ORDER_LINES); const products = indexBy_(products_(), 'id');
  return rows_(ss, BF.SHEETS.ORDERS).map(r => ({id:r[0], created:r[1], customer:r[2], phone:r[3], deliveryDate:formatDate_(r[4]), status:r[5], notes:r[6],
    lines: lines.filter(l => l[0] === r[0]).map(l => ({productId:l[1], productName:products[l[1]]?.name || l[1], quantity:Number(l[2]), packingNote:l[3] || ''}))})).reverse();
}
function customers_() { return rows_(getSpreadsheet_(), BF.SHEETS.CUSTOMERS).filter(r => String(r[6]).toLowerCase() !== 'לא').map(r => ({id:r[0],name:r[1],phone:r[2],email:r[3],address:r[4],notes:r[5]})); }
function products_() { return rows_(getSpreadsheet_(), BF.SHEETS.PRODUCTS).filter(r => String(r[5]).toLowerCase() !== 'לא').map(r => ({id:r[0],name:r[1],unit:r[2],targetCost:Number(r[3]),minutes:Number(r[4]),salePrice:Number(r[6]),category:r[7] || ''})); }
function ingredients_() { return rows_(getSpreadsheet_(), BF.SHEETS.INGREDIENTS).map(r => ({id:r[0],name:r[1],unit:r[2],cost:Number(r[3]),supplier:r[4]})); }
function recipeMedia_() { return rows_(getSpreadsheet_(), BF.SHEETS.RECIPE_MEDIA).map(r => ({id:r[0],productId:r[1],title:r[2],url:r[3],note:r[4],created:formatDate_(r[5])})); }
function recipeIngredients_() { const ss=getSpreadsheet_(); const ingredients=indexBy_(ingredients_(), 'id'); const sh=ss.getSheetByName(BF.SHEETS.RECIPES); if (!sh || sh.getLastRow()<2) return []; return sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues().map((r,index) => ({rowNumber:index+2,productId:r[0],ingredientId:r[1],name:ingredients[r[1]]?.name || r[1],unit:ingredients[r[1]]?.unit || '',quantity:Number(r[2]),unitCost:Number(ingredients[r[1]]?.cost || 0),cost:Number(r[2]) * Number(ingredients[r[1]]?.cost || 0)})); }
function ensureSheet_(ss,name,headers) { const sh = ss.getSheetByName(name) || ss.insertSheet(name); if (sh.getLastRow() === 0) { sh.appendRow(headers); sh.setFrozenRows(1); sh.getRange(1,1,1,headers.length).setBackground('#4a2c21').setFontColor('#ffffff').setFontWeight('bold'); sh.autoResizeColumns(1,headers.length); } else { const current=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0]; headers.slice(current.length).forEach((header,index)=>sh.getRange(1,current.length+index+1).setValue(header)); } }
function seedDemoData_(ss) {
  if (rows_(ss, BF.SHEETS.PRODUCTS).length) return;
  [['CUS-001','משפחת כהן','050-0000001','cohen@example.com','בית שמש','איסוף ביום שישי','כן'],['CUS-002','דנה לוי','050-0000002','dana@example.com','ירושלים','ללא אגוזים','כן']].forEach(r=>append_(ss,BF.SHEETS.CUSTOMERS,r));
  loadBakeryDemoData_(ss);
}
function loadBakeryDemoData_(ss, replaceDemoRecipes) {
  const products=[['P-CHOC','עוגת שוקולד חגיגית','עוגה',42,55,'כן',120,'עוגות'],['P-CHEESE','עוגת גבינה אפויה','עוגה',54,75,'כן',145,'עוגות'],['P-COOKIE','מארז עוגיות חמאה','מארז',28,40,'כן',75,'מארזים']];
  const ingredients=[['I-FLOUR','קמח','ק״ג',6.5,'ספק אפייה'],['I-SUGAR','סוכר','ק״ג',5.8,'ספק אפייה'],['I-EGG','ביצים','יח׳',1.1,'מכולת'],['I-CHOC','שוקולד מריר','ק״ג',43,'ספק אפייה'],['I-COCOA','אבקת קקאו','ק״ג',52,'ספק אפייה'],['I-OIL','שמן','ליטר',11,'מכולת'],['I-BAKING','אבקת אפייה','ק״ג',24,'ספק אפייה'],['I-CHEESE','גבינת שמנת','ק״ג',31,'מחלבה'],['I-BUTTER','חמאה','ק״ג',38,'מחלבה'],['I-BISCUIT','ביסקוויטים','ק״ג',24,'ספק אפייה'],['I-CREAM','שמנת חמוצה','ק״ג',18,'מחלבה'],['I-VANILLA','תמצית וניל','ליטר',160,'ספק אפייה']];
  const recipes=[['P-CHOC','I-FLOUR',0.30],['P-CHOC','I-SUGAR',0.25],['P-CHOC','I-EGG',4],['P-CHOC','I-CHOC',0.22],['P-CHOC','I-COCOA',0.06],['P-CHOC','I-OIL',0.18],['P-CHOC','I-BAKING',0.012],['P-CHEESE','I-BISCUIT',0.25],['P-CHEESE','I-BUTTER',0.12],['P-CHEESE','I-CHEESE',0.75],['P-CHEESE','I-SUGAR',0.18],['P-CHEESE','I-EGG',5],['P-CHEESE','I-CREAM',0.20],['P-CHEESE','I-VANILLA',0.006],['P-COOKIE','I-FLOUR',0.35],['P-COOKIE','I-BUTTER',0.22],['P-COOKIE','I-SUGAR',0.15],['P-COOKIE','I-EGG',1],['P-COOKIE','I-VANILLA',0.004],['P-COOKIE','I-BAKING',0.008]];
  let added=0;
  products.forEach(r=>{if(!hasId_(ss,BF.SHEETS.PRODUCTS,r[0])){append_(ss,BF.SHEETS.PRODUCTS,r);added++;}});
  ingredients.forEach(r=>{if(!hasId_(ss,BF.SHEETS.INGREDIENTS,r[0])){append_(ss,BF.SHEETS.INGREDIENTS,r);added++;}});
  if (replaceDemoRecipes) {
    const sh=ss.getSheetByName(BF.SHEETS.RECIPES); const demoProducts={'P-CHOC':true,'P-CHEESE':true,'P-COOKIE':true};
    const values=sh.getDataRange().getValues();
    for(let i=values.length-1;i>=1;i--) if(demoProducts[values[i][0]]) sh.deleteRow(i+1);
  }
  const existing=rows_(ss,BF.SHEETS.RECIPES).map(r=>r.slice(0,3).join('|'));
  recipes.forEach(r=>{if(!existing.includes(r.join('|'))){append_(ss,BF.SHEETS.RECIPES,r);added++;}});
  return added;
}
function hasId_(ss,sheetName,id) { return rows_(ss,sheetName).some(r=>r[0]===id); }
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

function demoCatalog_() {
  const products=[
    {id:'P-CHOC',name:'עוגת שמרים שוקולד',category:'עוגות שמרים',unit:'עוגה',salePrice:95},
    {id:'P-CHEESE',name:'עוגת גבינה פירורים',category:'עוגות גבינה',unit:'עוגה',salePrice:125},
    {id:'P-COOKIE',name:'מארז עוגיות חמאה',category:'מארזים',unit:'מארז',salePrice:65}
  ];
  const ingredients=[
    {id:'I-FLOUR',name:'קמח',unit:'ק״ג',cost:6.5},{id:'I-YEAST',name:'שמרים יבשים',unit:'ק״ג',cost:48},
    {id:'I-SUGAR',name:'סוכר',unit:'ק״ג',cost:5.8},{id:'I-EGG',name:'ביצים',unit:'יח׳',cost:1.1},
    {id:'I-BUTTER',name:'חמאה',unit:'ק״ג',cost:38},{id:'I-MILK',name:'חלב',unit:'ליטר',cost:7},
    {id:'I-CHOC',name:'שוקולד מריר',unit:'ק״ג',cost:43},{id:'I-CHEESE',name:'גבינת שמנת',unit:'ק״ג',cost:31},
    {id:'I-BISCUIT',name:'ביסקוויטים',unit:'ק״ג',cost:24},{id:'I-CREAM',name:'שמנת חמוצה',unit:'ק״ג',cost:18},
    {id:'I-VANILLA',name:'תמצית וניל',unit:'ליטר',cost:160},{id:'I-BAKING',name:'אבקת אפייה',unit:'ק״ג',cost:24}
  ];
  const bom=[
    ['P-CHOC','I-FLOUR',0.50],['P-CHOC','I-YEAST',0.012],['P-CHOC','I-SUGAR',0.10],['P-CHOC','I-EGG',2],['P-CHOC','I-BUTTER',0.12],['P-CHOC','I-MILK',0.18],['P-CHOC','I-CHOC',0.20],
    ['P-CHEESE','I-BISCUIT',0.25],['P-CHEESE','I-BUTTER',0.12],['P-CHEESE','I-CHEESE',0.75],['P-CHEESE','I-SUGAR',0.18],['P-CHEESE','I-EGG',5],['P-CHEESE','I-CREAM',0.20],['P-CHEESE','I-VANILLA',0.006],
    ['P-COOKIE','I-FLOUR',0.35],['P-COOKIE','I-BUTTER',0.22],['P-COOKIE','I-SUGAR',0.15],['P-COOKIE','I-EGG',1],['P-COOKIE','I-VANILLA',0.004],['P-COOKIE','I-BAKING',0.008]
  ];
  const index=indexBy_(ingredients,'id');
  const recipeIngredients=bom.map((r,i)=>({rowNumber:i+2,productId:r[0],ingredientId:r[1],name:index[r[1]].name,unit:index[r[1]].unit,quantity:r[2],unitCost:index[r[1]].cost,cost:r[2]*index[r[1]].cost}));
  return {products,ingredients,recipeIngredients};
}
