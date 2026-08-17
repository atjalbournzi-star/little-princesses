/**
 * Gets a sheet by name. If it doesn't exist, it creates it and sets the headers.
 * @param {string} sheetName 
 * @param {Array<string>} headers 
 * @returns {Sheet}
 */
function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#4c1130"); // Thematic dark pink/plum
      headerRange.setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }
  }
  
  return sheet;
}

/**
 * Reads all rows from a sheet and maps the Arabic headers to English keys.
 * @param {string} sheetName 
 * @param {Array<string>} arabicHeaders 
 * @param {Object} headerToKeyMap 
 * @returns {Array<Object>}
 */
function getRowsMapped(sheetName, arabicHeaders, headerToKeyMap) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Empty or only headers

  const sheetHeaders = data[0];
  const rows = data.slice(1);
  const result = [];

  // Map column index to English keys
  const colIndexMap = {};
  sheetHeaders.forEach((header, index) => {
    if (headerToKeyMap[header]) {
      colIndexMap[index] = headerToKeyMap[header];
    }
  });

  for (let i = 0; i < rows.length; i++) {
    const rowObj = {};
    const row = rows[i];
    let hasData = false;
    
    for (let j = 0; j < row.length; j++) {
      if (colIndexMap[j] !== undefined) {
        rowObj[colIndexMap[j]] = row[j];
        if (row[j] !== "") hasData = true;
      }
    }
    
    if (hasData) {
      result.push(rowObj);
    }
  }
  
  return result;
}

/**
 * Returns today's date in YYYY-MM-DD ISO format.
 * @returns {string}
 */
function todayISO() {
  const d = new Date();
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
}


/**
 * 👑 دالة الشحن والتطهير الكامل: حذف جميع الأوراق القديمة وتأسيس الجداول الـ 10 الجديدة كلياً
 * اختر هذه الدالة من القائمة المنسدلة في أعلى المحرر واضغط "تنفيذ" (Run)
 */
function resetAndSetupAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const officialSheets = [
    SHEET_CUSTOMERS, SHEET_ORDERS, SHEET_INVENTORY, SHEET_ACCOUNTS, 
    SHEET_VOUCHERS, SHEET_PURCHASES, SHEET_EXPENSES, SHEET_FACTORY, 
    SHEET_PRODUCTS, SHEET_JOURNAL
  ];

  // 1. التأسيس والإنشاء للجداول الـ 10 بالأسماء العربية والترويسات
  setupAllSheets();

  // 2. فحص وحذف أي ورقة قديمة ليست ضمن الجداول الـ 10 الأساسية
  const sheets = ss.getSheets();
  sheets.forEach(sheet => {
    const sName = sheet.getName();
    if (!officialSheets.includes(sName)) {
      try {
        ss.deleteSheet(sheet);
        Logger.log("🗑️ تم حذف الورقة القديمة: " + sName);
      } catch(e) {
        Logger.log("⚠️ يتعذر حذف الورقة: " + sName);
      }
    }
  });

  Logger.log("✨ تم إعادة الضبط بالكامل وإنشاء الجداول الـ 10 الجديدة بنجاح!");
}
