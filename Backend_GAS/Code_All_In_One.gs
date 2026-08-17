/**
 * 👑 Little Princesses ERP - Google Apps Script (GAS) Unified Master Backend
 * All modular controllers combined into a single production file for 1-click paste.
 */

// ==========================================
// SECTION: config.gs
// ==========================================

const SHEET_CUSTOMERS = 'العملاء';
const SHEET_MEASUREMENTS = 'مقاسات_الأطفال';
const SHEET_CUSTOMER_LEDGER = 'كشف_حساب_العملاء';
const SHEET_ORDERS = 'الطلبات';
const SHEET_INVENTORY = 'المخزون';
const SHEET_ACCOUNTS = 'شجرة الحسابات';
const SHEET_VOUCHERS = 'السندات المالية';
const SHEET_PURCHASES = 'المشتريات';
const SHEET_EXPENSES = 'المصاريف';
const SHEET_FACTORY = 'متابعة الخياطة';
const SHEET_PRODUCTS = 'المنتجات';
const SHEET_JOURNAL = 'القيود اليومية';

/**
 * Helper to return a JSON response for the Web App
 * @param {Object} dataObj The object to serialize
 * @returns {TextOutput} The TextOutput object with JSON MIME type
 */
function responseJSON(dataObj) {
  return ContentService.createTextOutput(JSON.stringify(dataObj))
    .setMimeType(ContentService.MimeType.JSON);
}


// ==========================================
// SECTION: utils.gs
// ==========================================

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
  }
  
  if (headers && headers.length > 0) {
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4c1130"); // Thematic dark pink/plum
    headerRange.setFontColor("#ffffff");
    sheet.setFrozenRows(1);
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
    const hStr = String(header).trim();
    if (headerToKeyMap[hStr]) {
      colIndexMap[index] = headerToKeyMap[hStr];
    } else if (headerToKeyMap[header]) {
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


// ==========================================
// SECTION: main.gs
// ==========================================

/**
 * Handles GET requests (for testing or lightweight fetching)
 */
function doGet(e) {
  return handleRequest(e);
}

/**
 * Handles POST requests (for data submission and fetching)
 */
function doPost(e) {
  return handleRequest(e);
}

/**
 * Core request router
 */
function handleRequest(e) {
  try {
    let params = {};
    
    if (e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (err) {
        params = e.parameter || {};
      }
    } else {
      params = e.parameter || {};
    }

    const action = params.action;
    const data = (params.data && typeof params.data === 'object' && Object.keys(params.data).length > 0) ? params.data : params;

    let result = { success: false, message: "Unknown action" };

    switch (action) {
      case 'addCustomer': result = CustomerController.addCustomer(data); break;
      case 'addOrUpdateCustomer': result = CustomerController.addOrUpdateCustomer(data); break;
      case 'getCustomers': result = { success: true, data: CustomerController.getCustomers() }; break;

      case 'addOrder':
      case 'createInvoice': result = OrderController.addOrder(data); break;
      case 'getOrders': result = { success: true, data: OrderController.getOrders() }; break;

      case 'addInventory': result = InventoryController.addInventory(data); break;
      case 'getInventory': result = { success: true, data: InventoryController.getInventory() }; break;

      case 'addAccount': result = AccountingController.addAccount(data); break;
      case 'getAccounts': result = { success: true, data: AccountingController.getAccounts() }; break;

      case 'addVoucher': result = VoucherController.addVoucher(data); break;
      case 'getVouchers': result = { success: true, data: VoucherController.getVouchers() }; break;

      case 'addPurchase': result = PurchaseController.addPurchase(data); break;
      case 'getPurchases': result = { success: true, data: PurchaseController.getPurchases() }; break;
      case 'updatePurchase': result = PurchaseController.updatePurchase(data); break;
      case 'deletePurchase': result = PurchaseController.deletePurchase(data); break;

      case 'addExpense': result = ExpenseController.addExpense(data); break;
      case 'getExpenses': result = { success: true, data: ExpenseController.getExpenses() }; break;

      case 'updateFactory': result = FactoryController.updateFactory(data); break;
      case 'getFactory': result = { success: true, data: FactoryController.getFactory() }; break;

      case 'addProduct': result = ProductController.addProduct(data); break;
      case 'getProducts': result = { success: true, data: ProductController.getProducts() }; break;

      case 'addJournalEntry': result = JournalController.addJournalEntry(data); break;
      case 'getJournalEntries': result = { success: true, data: JournalController.getJournalEntries() }; break;

      case 'getDashboardStats': result = { success: true, data: DashboardController.getStats() }; break;

      default:
        result = { success: false, message: "Action not supported: " + action };
    }
    
    return responseJSON(result);

  } catch (error) {
    return responseJSON({ success: false, message: error.toString() });
  }
}



/**
 * Saves a base64 encoded image to a specific Google Drive folder.
 * @param {string} base64Data
 * @param {string} fileName
 * @param {string} folderName
 * @returns {string} The public view URL of the uploaded image
 */
function saveImageToDrive(base64Data, fileName, folderName) {
  if (!base64Data) return '';
  try {
    let folders = DriveApp.getFoldersByName(folderName);
    let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    
    // Strip metadata like 'data:image/png;base64,'
    let data = base64Data;
    let mimeType = 'image/png';
    if (base64Data.indexOf('data:') === 0) {
      let parts = base64Data.split(';base64,');
      mimeType = parts[0].split(':')[1];
      data = parts[1];
    }
    
    let blob = Utilities.newBlob(Utilities.base64Decode(data), mimeType, fileName);
    let file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    Logger.log('Drive Upload Error: ' + e.toString());
    return '';
  }
}

// ==========================================
// SECTION: customerController.gs
// ==========================================


const CustomerController = {
  HEADERS_CUSTOMERS: ["Customer_ID", "اسم_العميل", "الهاتف_الرئيسي", "الهاتف_الخطي_البديل", "منصة_التواصل", "اسم_الحساب", "المدينة_المنطقة", "الشارع_المبنى", "فئة_العميل", "تاريخ_التسجيل", "عدد_المشتريات", "عدد_القطع", "ملاحظات"],
  HEADERS_MEASUREMENTS: ["Measurement_ID", "Customer_ID", "اسم_الطفلة", "تاريخ_تحديث_المقاس", "وحدة_القياس", "الطول_الكلي", "طول_الفستان", "طول_الصدر", "طول_التنورة", "طول_الكم", "محيط_الصدر", "محيط_الخصر", "عرض_الكتفين", "محيط_الإبط", "محيط_الرقبة", "تفضيلات_الراحة", "ملاحظات_الخياطة", "صورة_الموديل", "لون_الفستان"],
  HEADERS_LEDGER: ["Ledger_ID", "Customer_ID", "رقم_الطلب", "إجمالي_المبيعات_التاريخية", "إجمالي_المدفوعات", "العربون_المدفوع", "طريقة_الدفع", "رابط_صورة_السند", "المبلغ_المتبقي", "كلفة_التوصيل", "تاريخ_التحديث"],
  
  KEY_MAP: {
    "Customer_ID": "customer_id",
    "اسم_العميل": "name",
    "الهاتف_الرئيسي": "phone",
    "تاريخ_التسجيل": "reg_date"
  },

  getCustomers: function() {
    getOrCreateSheet(SHEET_CUSTOMERS, this.HEADERS_CUSTOMERS);
    return getRowsMapped(SHEET_CUSTOMERS, this.HEADERS_CUSTOMERS, this.KEY_MAP);
  },

  addCustomer: function(data) {
    return this.addOrUpdateCustomer(data);
  },

  addOrUpdateCustomer: function(data) {
    try {
      const sheetCust = getOrCreateSheet(SHEET_CUSTOMERS, this.HEADERS_CUSTOMERS);
      const sheetMeas = getOrCreateSheet(SHEET_MEASUREMENTS, this.HEADERS_MEASUREMENTS);
      const sheetLedger = getOrCreateSheet(SHEET_CUSTOMER_LEDGER, this.HEADERS_LEDGER);

      const custId = data.customer_id || "CUST-" + Math.floor(Math.random() * 10000);
      const date = data.reg_date || todayISO();

      // 1. Handle Customer Basic Info
      sheetCust.appendRow([
        custId, data.name || "", data.phone || "", data.phone_alt || "", data.platform || "",
        data.handle || "", data.city || "", data.street || "", data.category || "جديد",
        date, data.purchase_count || 0, data.items_count || 0, data.notes || ""
      ]);

      // 2. Handle Measurements
      if (data.measurements && Array.isArray(data.measurements)) {
        data.measurements.forEach(m => {
          if (m.child_name) {
            let modelUrl = '';
            if (m.model_image && m.model_image.startsWith('data:image')) {
              modelUrl = saveImageToDrive(m.model_image, 'Model_' + custId + '_' + m.child_name + '.png', 'Little_Princesses_ERP_Attachments');
            } else if (m.model_image) {
               modelUrl = m.model_image; // Already a URL
            }

            let comfort = Array.isArray(m.comfort_profile) ? m.comfort_profile.join(" | ") : (m.comfort_profile || "");
            
            sheetMeas.appendRow([
              Utilities.getUuid(), custId, m.child_name, m.meas_date || date, m.unit || "سم",
              m.total_height || "", m.dress_length || "", m.chest_length || "", m.skirt_length || "",
              m.sleeve_length || "", m.chest_circ || "", m.waist_circ || "", m.shoulder_width || "",
              m.armhole_circ || "", m.neck_circ || "", comfort, m.sewing_notes || "", modelUrl, m.dress_color || ""
            ]);
          }
        });
      }

      // 3. Handle Ledger
      if (data.ledger) {
        let receiptUrl = '';
        if (data.ledger.receipt_b64) {
          receiptUrl = saveImageToDrive(data.ledger.receipt_b64, 'Receipt_' + custId + '.png', 'Little_Princesses_ERP_Attachments');
        }

        sheetLedger.appendRow([
          Utilities.getUuid(), custId, data.ledger.order_no || "", data.ledger.total_sales || 0,
          data.ledger.paid || 0, data.ledger.paid || 0, data.ledger.payment_method || "", receiptUrl,
          data.ledger.remaining || 0, data.ledger.delivery || 0, date
        ]);
      }

      return { success: true, message: "Customer and measurements saved successfully", id: custId };
    } catch (e) {
      Logger.log("Save Error: " + e.toString());
      return { success: false, message: e.toString() };
    }
  }
};
// ==========================================
// SECTION: orderController.gs
// ==========================================

const OrderController = {
  HEADERS: ["ID", "رقم الفاتورة", "اسم العميل", "اسم المنتج", "الكمية", "تاريخ الحجز", "موعد التسليم", "الإجمالي", "المدفوع", "المتبقي", "العملة", "الحالة"],
  
  KEY_MAP: {
    "ID": "id",
    "رقم الفاتورة": "order_no",
    "اسم العميل": "customer_name",
    "اسم المنتج": "product_name",
    "الكمية": "qty",
    "تاريخ الحجز": "order_date",
    "موعد التسليم": "delivery_date",
    "الإجمالي": "total",
    "المدفوع": "paid",
    "المتبقي": "remaining",
    "العملة": "currency",
    "الحالة": "status"
  },

  getOrders: function() {
    getOrCreateSheet(SHEET_ORDERS, this.HEADERS);
    return getRowsMapped(SHEET_ORDERS, this.HEADERS, this.KEY_MAP);
  },

  addOrder: function(data) {
    const sheet = getOrCreateSheet(SHEET_ORDERS, this.HEADERS);
    const newId = Utilities.getUuid();
    
    const total = parseFloat(data.total) || 0;
    const paid = parseFloat(data.paid) || 0;
    const remaining = total - paid;
    const date = data.order_date || todayISO();

    const rowData = [
      newId,
      data.order_no || "",
      data.customer_name || "",
      data.product_name || "",
      data.qty || 1,
      date,
      data.delivery_date || "",
      total,
      paid,
      remaining,
      data.currency || "USD",
      data.status || "New"
    ];
    
    sheet.appendRow(rowData);
    return { success: true, message: "Order added successfully", id: newId };
  }
};


// ==========================================
// SECTION: inventoryController.gs
// ==========================================

const InventoryController = {
  HEADERS: ["ID", "اسم القماش", "التصنيف", "الكمية بالمتر", "تكلفة المتر", "العملة", "حد التنبيه", "تاريخ التوريد"],
  
  KEY_MAP: {
    "ID": "id",
    "اسم القماش": "item_name",
    "التصنيف": "category",
    "الكمية بالمتر": "qty",
    "تكلفة المتر": "cost_per_meter",
    "العملة": "currency",
    "حد التنبيه": "min_alert",
    "تاريخ التوريد": "supply_date"
  },

  getInventory: function() {
    getOrCreateSheet(SHEET_INVENTORY, this.HEADERS);
    return getRowsMapped(SHEET_INVENTORY, this.HEADERS, this.KEY_MAP);
  },

  addInventory: function(data) {
    const sheet = getOrCreateSheet(SHEET_INVENTORY, this.HEADERS);
    const newId = Utilities.getUuid();
    const date = data.supply_date || todayISO();

    const rowData = [
      newId,
      data.item_name || "",
      data.category || "",
      data.qty || 0,
      data.cost_per_meter || 0,
      data.currency || "USD",
      data.min_alert || 0,
      date
    ];
    
    sheet.appendRow(rowData);
    return { success: true, message: "Inventory item added successfully", id: newId };
  }
};


// ==========================================
// SECTION: financialController.gs
// ==========================================

const AccountingController = {
  HEADERS: ["رمز الحساب", "اسم الحساب", "نوع الحساب", "الرصيد", "تاريخ التأسيس"],
  KEY_MAP: { "رمز الحساب": "acc_code", "اسم الحساب": "acc_name", "نوع الحساب": "acc_type", "الرصيد": "balance", "تاريخ التأسيس": "created_date" },
  
  getAccounts: function() {
    getOrCreateSheet(SHEET_ACCOUNTS, this.HEADERS);
    return getRowsMapped(SHEET_ACCOUNTS, this.HEADERS, this.KEY_MAP);
  },
  
  addAccount: function(data) {
    const sheet = getOrCreateSheet(SHEET_ACCOUNTS, this.HEADERS);
    sheet.appendRow([data.acc_code || "", data.acc_name || "", data.acc_type || "", data.balance || 0, data.created_date || todayISO()]);
    return { success: true, message: "Account added successfully" };
  }
};

const VoucherController = {
  HEADERS: ["رقم السند", "نوع السند", "الجهة / العميل", "المبلغ", "العملة", "طريقة الدفع", "رقم الحوالة", "الحساب المرتبط", "التاريخ", "البيان"],
  KEY_MAP: { "رقم السند": "voucher_no", "نوع السند": "type", "الجهة / العميل": "party_name", "المبلغ": "amount", "العملة": "currency", "طريقة الدفع": "pay_method", "رقم الحوالة": "transfer_no", "الحساب المرتبط": "acc_code", "التاريخ": "date", "البيان": "notes" },
  
  getVouchers: function() {
    getOrCreateSheet(SHEET_VOUCHERS, this.HEADERS);
    return getRowsMapped(SHEET_VOUCHERS, this.HEADERS, this.KEY_MAP);
  },
  
  addVoucher: function(data) {
    const sheet = getOrCreateSheet(SHEET_VOUCHERS, this.HEADERS);
    sheet.appendRow([data.voucher_no || "", data.type || "", data.party_name || "", data.amount || 0, data.currency || "USD", data.pay_method || "", data.transfer_no || "", data.acc_code || "", data.date || todayISO(), data.notes || ""]);
    return { success: true, message: "Voucher added successfully" };
  }
};

const PurchaseController = {
  HEADERS: ["ID", "رقم الفاتورة", "اسم المورد", "الصنف / القماش", "وحدة القياس", "الكمية", "السعر الإفرادي", "الإجمالي", "العملة", "طريقة الدفع", "رقم الحوالة", "حساب الدفع", "صورة السند", "تاريخ الفاتورة"],
  KEY_MAP: {
    "ID": "id",
    "رقم الفاتورة": "bill_no",
    "اسم المورد": "supplier",
    "الصنف / القماش": "item",
    "الصنف": "item",
    "وحدة القياس": "unit",
    "الكمية": "qty",
    "الكمية بالمتر": "qty",
    "السعر الإفرادي": "price",
    "السعر": "price",
    "الإجمالي": "total",
    "إجمالي المبلغ": "total",
    "العملة": "currency",
    "طريقة الدفع": "pay_type",
    "رقم الحوالة": "transfer_no",
    "حساب الدفع": "payment_source",
    "صورة السند": "receipt_url",
    "رابط صورة السند": "receipt_url",
    "رابط/صورة السند": "receipt_url",
    "تاريخ الفاتورة": "date",
    "التاريخ": "date"
  },
  
  getPurchases: function() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_PURCHASES);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_PURCHASES);
      const hr = sheet.getRange(1, 1, 1, this.HEADERS.length);
      hr.setValues([this.HEADERS]);
      hr.setFontWeight("bold").setBackground("#4c1130").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }
    return getRowsMapped(SHEET_PURCHASES, this.HEADERS, this.KEY_MAP);
  },
  
  addPurchase: function(data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_PURCHASES);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_PURCHASES);
      const hr = sheet.getRange(1, 1, 1, this.HEADERS.length);
      hr.setValues([this.HEADERS]);
      hr.setFontWeight("bold").setBackground("#4c1130").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }

    const newId = data.id ? String(data.id) : Utilities.getUuid();
    const item = (data.item && String(data.item).trim()) || (data.item_name && String(data.item_name).trim()) || "";
    const qty = parseFloat(data.qty) || 0;
    const price = parseFloat(data.price) || 0;
    const total = data.total ? parseFloat(data.total) : (qty * price);
    const unit = (data.unit && String(data.unit).trim()) || "متر";
    const billNo = data.bill_no ? String(data.bill_no) : "";
    const transfer = data.transfer_no ? String(data.transfer_no) : "";
    const paymentSrc = data.payment_source ? String(data.payment_source) : "";

    // Get current row 1 to know which column order the sheet uses
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newHeaders = this.HEADERS;

    // If headers mismatch (old sheet), use positional append based on current headers
    const colMap = {};
    currentHeaders.forEach(function(h, i) { colMap[String(h).trim()] = i; });

    const rowData = new Array(newHeaders.length).fill("");
    // Map by header name to position in newHeaders
    const hIdx = {};
    newHeaders.forEach(function(h, i) { hIdx[h] = i; });

    if (colMap["ID"] !== undefined) {
      // Sheet already has structured headers - write using current column positions
      const writeRow = new Array(Math.max(currentHeaders.length, newHeaders.length)).fill("");
      const fieldMap = {
        "ID": newId, "رقم الفاتورة": billNo, "اسم المورد": data.supplier || "",
        "الصنف / القماش": item, "الصنف": item,
        "وحدة القياس": unit, "الكمية": qty, "الكمية بالمتر": qty,
        "السعر الإفرادي": price, "السعر": price,
        "الإجمالي": total, "إجمالي المبلغ": total,
        "العملة": data.currency || "YER ﷼",
        "طريقة الدفع": data.pay_type || "نقدي",
        "رقم الحوالة": transfer, "حساب الدفع": paymentSrc,
        "صورة السند": data.receipt_url || "", "رابط صورة السند": data.receipt_url || "",
        "تاريخ الفاتورة": data.date || todayISO(), "التاريخ": data.date || todayISO()
      };
      currentHeaders.forEach(function(h, i) {
        const key = String(h).trim();
        if (fieldMap[key] !== undefined) writeRow[i] = fieldMap[key];
      });
      sheet.appendRow(writeRow);
    } else {
      // Fresh sheet - write in new order
      sheet.appendRow([newId, billNo, data.supplier || "", item, unit, qty, price, total,
        data.currency || "YER ﷼", data.pay_type || "نقدي", transfer, paymentSrc,
        data.receipt_url || "", data.date || todayISO()]);
    }

    return { success: true, message: "تم تسجيل فاتورة الشراء", id: newId };
  },

  updatePurchase: function(data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_PURCHASES);
    if (!sheet) return { success: false, message: "الشيت غير موجود" };

    const targetId = String(data.id || "");
    if (!targetId) return { success: false, message: "ID مطلوب للتعديل" };

    const sheetData = sheet.getDataRange().getValues();
    const headers = sheetData[0];

    // Build header→colIndex map
    const hMap = {};
    headers.forEach(function(h, i) { hMap[String(h).trim()] = i; });

    // Build fieldMap from incoming data
    const item = (data.item && String(data.item).trim()) || (data.item_name && String(data.item_name).trim()) || "";
    const qty = data.qty !== undefined ? parseFloat(data.qty) : null;
    const price = data.price !== undefined ? parseFloat(data.price) : null;
    const total = data.total ? parseFloat(data.total) : (qty !== null && price !== null ? qty * price : null);
    const unit = (data.unit && String(data.unit).trim()) || "";

    const fieldMap = {
      "رقم الفاتورة": data.bill_no || null,
      "اسم المورد": data.supplier || null,
      "الصنف / القماش": item || null, "الصنف": item || null,
      "وحدة القياس": unit || null,
      "الكمية": qty, "الكمية بالمتر": qty,
      "السعر الإفرادي": price, "السعر": price,
      "الإجمالي": total, "إجمالي المبلغ": total,
      "العملة": data.currency || null,
      "طريقة الدفع": data.pay_type || null,
      "رقم الحوالة": data.transfer_no !== undefined ? String(data.transfer_no) : null,
      "حساب الدفع": data.payment_source !== undefined ? String(data.payment_source) : null,
      "صورة السند": data.receipt_url !== undefined ? data.receipt_url : null,
      "تاريخ الفاتورة": data.date || null, "التاريخ": data.date || null
    };

    // Find the row with matching ID
    for (let r = 1; r < sheetData.length; r++) {
      if (String(sheetData[r][hMap["ID"] || 0]).trim() === targetId) {
        const rowNum = r + 1;
        // Update only non-null fields
        Object.keys(fieldMap).forEach(function(headerName) {
          const val = fieldMap[headerName];
          const colIdx = hMap[headerName];
          if (val !== null && val !== undefined && colIdx !== undefined) {
            sheet.getRange(rowNum, colIdx + 1).setValue(val);
          }
        });
        return { success: true, message: "تم تحديث سجل المشتريات بنجاح", id: targetId };
      }
    }
    return { success: false, message: "السجل غير موجود - ID: " + targetId };
  },

  deletePurchase: function(data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_PURCHASES);
    if (!sheet) return { success: false, message: "الشيت غير موجود" };
    const targetId = String(data.id || "");
    if (!targetId) return { success: false, message: "ID مطلوب للحذف" };
    const sheetData = sheet.getDataRange().getValues();
    const idColIdx = 0; // ID is always column A
    for (let r = 1; r < sheetData.length; r++) {
      if (String(sheetData[r][idColIdx]).trim() === targetId) {
        sheet.deleteRow(r + 1);
        return { success: true, message: "تم حذف السجل بنجاح" };
      }
    }
    return { success: false, message: "السجل غير موجود" };
  }
};


const ExpenseController = {
  HEADERS: ["ID", "نوع المصروف", "المبلغ", "العملة", "طريقة الدفع", "حساب الدفع", "التاريخ", "ملاحظات"],
  KEY_MAP: { "ID": "id", "نوع المصروف": "exp_type", "المبلغ": "amount", "العملة": "currency", "طريقة الدفع": "pay_method", "حساب الدفع": "source_acc", "التاريخ": "date", "ملاحظات": "notes" },
  
  getExpenses: function() {
    getOrCreateSheet(SHEET_EXPENSES, this.HEADERS);
    return getRowsMapped(SHEET_EXPENSES, this.HEADERS, this.KEY_MAP);
  },
  
  addExpense: function(data) {
    const sheet = getOrCreateSheet(SHEET_EXPENSES, this.HEADERS);
    const newId = Utilities.getUuid();
    sheet.appendRow([newId, data.exp_type || "", data.amount || 0, data.currency || "USD", data.pay_method || "", data.source_acc || "", data.date || todayISO(), data.notes || ""]);
    return { success: true, message: "Expense added successfully", id: newId };
  }
};

const JournalController = {
  HEADERS: ["ID", "رقم القيد", "المدين", "الدائن", "المبلغ", "العملة", "نوع المرجع", "التاريخ", "الشرح"],
  KEY_MAP: { "ID": "id", "رقم القيد": "entry_no", "المدين": "debit", "الدائن": "credit", "المبلغ": "amount", "العملة": "currency", "نوع المرجع": "ref_type", "التاريخ": "date", "الشرح": "notes" },
  
  getJournalEntries: function() {
    getOrCreateSheet(SHEET_JOURNAL, this.HEADERS);
    return getRowsMapped(SHEET_JOURNAL, this.HEADERS, this.KEY_MAP);
  },
  
  addJournalEntry: function(data) {
    const sheet = getOrCreateSheet(SHEET_JOURNAL, this.HEADERS);
    const newId = Utilities.getUuid();
    sheet.appendRow([newId, data.entry_no || "", data.debit || "", data.credit || "", data.amount || 0, data.currency || "USD", data.ref_type || "", data.date || todayISO(), data.notes || ""]);
    return { success: true, message: "Journal entry added successfully", id: newId };
  }
};


// ==========================================
// SECTION: productController.gs
// ==========================================

const ProductController = {
  HEADERS: ["ID", "اسم الموديل", "التصنيف", "اسم القماش", "الأمتار", "تكلفة القماش", "أجرة الخياطة", "التغليف", "إجمالي التكلفة", "سعر البيع", "العملة", "الربح", "تاريخ الحساب"],
  
  KEY_MAP: {
    "ID": "id",
    "اسم الموديل": "name",
    "التصنيف": "category",
    "اسم القماش": "fabric_name",
    "الأمتار": "yards_used",
    "تكلفة القماش": "fabric_cost",
    "أجرة الخياطة": "labor_cost",
    "التغليف": "packaging_cost",
    "إجمالي التكلفة": "total_cost",
    "سعر البيع": "sell_price",
    "العملة": "currency",
    "الربح": "profit",
    "تاريخ الحساب": "calc_date"
  },

  getProducts: function() {
    getOrCreateSheet(SHEET_PRODUCTS, this.HEADERS);
    return getRowsMapped(SHEET_PRODUCTS, this.HEADERS, this.KEY_MAP);
  },

  addProduct: function(data) {
    const sheet = getOrCreateSheet(SHEET_PRODUCTS, this.HEADERS);
    const newId = Utilities.getUuid();
    
    const fabric_cost = parseFloat(data.fabric_cost) || 0;
    const labor_cost = parseFloat(data.labor_cost) || 0;
    const packaging_cost = parseFloat(data.packaging_cost) || 0;
    const total_cost = fabric_cost + labor_cost + packaging_cost;
    
    const sell_price = parseFloat(data.sell_price) || 0;
    const profit = sell_price - total_cost;
    const date = data.calc_date || todayISO();

    const rowData = [
      newId,
      data.name || "",
      data.category || "",
      data.fabric_name || "",
      data.yards_used || 0,
      fabric_cost,
      labor_cost,
      packaging_cost,
      total_cost,
      sell_price,
      data.currency || "USD",
      profit,
      date
    ];
    
    sheet.appendRow(rowData);
    return { success: true, message: "Product added successfully", id: newId };
  }
};


// ==========================================
// SECTION: productionController.gs
// ==========================================

const FactoryController = {
  HEADERS: ["ID", "رقم الطلب", "اسم العميلة", "اسم الفستان", "الخياط", "المرحلة", "نسبة الإنجاز", "تاريخ البدء", "تاريخ التسليم", "ملاحظات"],
  
  KEY_MAP: {
    "ID": "id",
    "رقم الطلب": "order_no",
    "اسم العميلة": "customer_name",
    "اسم الفستان": "product_name",
    "الخياط": "tailor",
    "المرحلة": "stage",
    "نسبة الإنجاز": "progress",
    "تاريخ البدء": "start_date",
    "تاريخ التسليم": "due_date",
    "ملاحظات": "notes"
  },

  getFactory: function() {
    getOrCreateSheet(SHEET_FACTORY, this.HEADERS);
    return getRowsMapped(SHEET_FACTORY, this.HEADERS, this.KEY_MAP);
  },

  updateFactory: function(data) {
    const sheet = getOrCreateSheet(SHEET_FACTORY, this.HEADERS);
    const date = data.start_date || todayISO();
    
    if (data.id) {
       const dataRange = sheet.getDataRange();
       const values = dataRange.getValues();
       
       for (let i = 1; i < values.length; i++) {
         if (values[i][0] == data.id) {
           sheet.getRange(i + 1, 2, 1, 9).setValues([[
             data.order_no || values[i][1],
             data.customer_name || values[i][2],
             data.product_name || values[i][3],
             data.tailor || values[i][4],
             data.stage || values[i][5],
             data.progress || values[i][6],
             data.start_date || values[i][7],
             data.due_date || values[i][8],
             data.notes || values[i][9]
           ]]);
           return { success: true, message: "Factory record updated successfully" };
         }
       }
    }

    const newId = Utilities.getUuid();
    const rowData = [
      newId,
      data.order_no || "",
      data.customer_name || "",
      data.product_name || "",
      data.tailor || "",
      data.stage || "جديد",
      data.progress || "0%",
      date,
      data.due_date || "",
      data.notes || ""
    ];
    
    sheet.appendRow(rowData);
    return { success: true, message: "Factory record added successfully", id: newId };
  }
};


// ==========================================
// SECTION: dashboardController.gs
// ==========================================

const DashboardController = {
  getStats: function() {
    const customers = CustomerController.getCustomers();
    const orders = OrderController.getOrders();
    const inventory = InventoryController.getInventory();
    const expenses = ExpenseController.getExpenses();

    let total_sales = 0;
    let total_paid = 0;
    let total_remaining = 0;
    let active_tailoring = 0;

    orders.forEach(o => {
      total_sales += parseFloat(o.total) || 0;
      total_paid += parseFloat(o.paid) || 0;
      total_remaining += parseFloat(o.remaining) || 0;
      
      const statusStr = (o.status || "").toLowerCase();
      if (statusStr.includes('خياطة') || statusStr.includes('قص') || statusStr.includes('تطريز')) {
        active_tailoring++;
      }
    });

    let low_stock_alerts = 0;
    inventory.forEach(i => {
      if (parseFloat(i.qty) <= parseFloat(i.min_alert)) {
        low_stock_alerts++;
      }
    });

    let total_expenses = 0;
    expenses.forEach(e => {
      total_expenses += parseFloat(e.amount) || 0;
    });

    // Dummy values for unimplemented features that were requested in requirements
    let total_purchases = 0; 
    let total_inventory = inventory.length;

    const net_profit = total_sales - (total_expenses + total_purchases);

    return {
      total_customers: customers.length,
      total_orders: orders.length,
      total_sales: total_sales,
      total_paid: total_paid,
      total_remaining: total_remaining,
      low_stock_alerts: low_stock_alerts,
      active_tailoring: active_tailoring,
      total_expenses: total_expenses,
      total_purchases: total_purchases,
      total_inventory: total_inventory,
      net_profit: net_profit
    };
  }
};




// ==========================================
// SECTION: Setup Utility (إنشاء كافة الجداول الـ 10 بضغطة زر)
// ==========================================

/**
 * 👑 دالة التأسيس والإنشاء التلقائي لجميع الأوراق والجداول الـ 10 بالأسماء العربية الموحدة
 * اختر هذه الدالة من القائمة المنسدلة في أعلى المحرر واضغط "تنفيذ" (Run)
 */
function setupAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. العملاء
  const sheetCustomers = getOrCreateSheet(SHEET_CUSTOMERS, [
    "ID", "اسم العميل", "رقم الهاتف", "منصة التواصل", "اسم الحساب", "العنوان", "الوحدة", 
    "الطول الكلي", "عرض الكتف", "دوران الصدر", "دوران الخصر", "طول الكم", "طول الصدر", "تاريخ التسجيل"
  ]);

  // 2. مقاسات الأطفال (الجديد)
  const sheetMeasurements = getOrCreateSheet(SHEET_MEASUREMENTS, CustomerController.HEADERS_MEASUREMENTS);

  // 3. كشف حساب العملاء (الجديد)
  const sheetCustomerLedger = getOrCreateSheet(SHEET_CUSTOMER_LEDGER, CustomerController.HEADERS_LEDGER);

  // 4. الطلبات
  const sheetOrders = getOrCreateSheet(SHEET_ORDERS, OrderController.HEADERS);

  // 5. المخزون
  const sheetInventory = getOrCreateSheet(SHEET_INVENTORY, [
    "رمز المادة", "اسم المادة / القماش", "التصنيف", "الوحدة", "الكمية المتوفرة", "كلفة الوحدة", "إجمالي الكلفة", "تاريخ آخر شراء", "المورد المفضل"
  ]);

  // 6. شجرة الحسابات
  const sheetAccounts = getOrCreateSheet(SHEET_ACCOUNTS, [
    "رمز الحساب", "اسم الحساب", "نوع الحساب", "الرصيد", "تاريخ التأسيس"
  ]);
  // إضافة الحسابات الافتراضية إذا كانت الورقة جديدة
  if (sheetAccounts.getLastRow() === 1) {
    sheetAccounts.appendRow(["101", "الصندوق / الخزينة الرئيسية", "أصول", 0.0, "2026-07-31"]);
    sheetAccounts.appendRow(["102", "مخزون الأقمشة والمستلزمات", "أصول", 0.0, "2026-07-31"]);
    sheetAccounts.appendRow(["103", "الحساب البنكي / الحوالات والمحافظ", "أصول", 0.0, "2026-07-31"]);
    sheetAccounts.appendRow(["104", "ذمم العملاء (مستحقات خارجية)", "أصول", 0.0, "2026-07-31"]);
    sheetAccounts.appendRow(["201", "ذمم الموردين ومحلات الأقمشة (آجل)", "خصوم", 0.0, "2026-07-31"]);
    sheetAccounts.appendRow(["301", "رأس المال المباشر لمؤسسة Little Princesses", "حقوق ملكية", 0.0, "2026-07-31"]);
    sheetAccounts.appendRow(["401", "إيرادات مبيعات الفساتين والزي", "إيرادات", 0.0, "2026-07-31"]);
    sheetAccounts.appendRow(["501", "أجور ورواتب الخياطين والمطرزين", "مصاريف", 0.0, "2026-07-31"]);
    sheetAccounts.appendRow(["502", "إيجار الورشة والمعمل والمحل الرئيسي", "مصاريف", 0.0, "2026-07-31"]);
  }

  // 7. السندات المالية
  const sheetVouchers = getOrCreateSheet(SHEET_VOUCHERS, [
    "رقم السند", "نوع السند", "الجهة / العميل", "المبلغ", "العملة", "طريقة الدفع", "رقم الحوالة", "الحساب المرتبط", "التاريخ", "البيان"
  ]);

  // 8. المشتريات
  const sheetPurchases = getOrCreateSheet(SHEET_PURCHASES, PurchaseController.HEADERS);

  // 9. المصاريف
  const sheetExpenses = getOrCreateSheet(SHEET_EXPENSES, [
    "ID", "نوع المصروف", "المبلغ", "العملة", "طريقة الدفع", "حساب الدفع", "التاريخ", "ملاحظات"
  ]);

  // 10. متابعة الخياطة
  const sheetFactory = getOrCreateSheet(SHEET_FACTORY, [
    "ID", "رقم الطلب", "اسم العميلة", "اسم الفستان", "الخياط", "المرحلة", "نسبة الإنجاز", "تاريخ البدء", "تاريخ التسليم", "ملاحظات"
  ]);

  // 11. المنتجات
  const sheetProducts = getOrCreateSheet(SHEET_PRODUCTS, [
    "ID", "اسم الموديل", "التصنيف", "اسم القماش", "الأمتار", "تكلفة القماش", "أجرة الخياطة", "التغليف", "إجمالي التكلفة", "سعر البيع", "العملة", "الربح", "تاريخ الحساب"
  ]);

  // 12. القيود اليومية
  const sheetJournal = getOrCreateSheet(SHEET_JOURNAL, [
    "ID", "رقم القيد", "المدين", "الدائن", "المبلغ", "العملة", "نوع المرجع", "التاريخ", "الشرح"
  ]);

  Logger.log("✨ تم التأسيس والتجهيز لكافة الأوراق والجداول الـ 12 بنجاح!");
}


/**
 * 👑 دالة الشحن والتطهير الكامل: حذف جميع الأوراق القديمة وتأسيس الجداول الـ 12 الجديدة كلياً
 * اختر هذه الدالة من القائمة المنسدلة في أعلى المحرر واضغط "تنفيذ" (Run)
 */
function resetAndSetupAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const officialSheets = [
    SHEET_CUSTOMERS, SHEET_MEASUREMENTS, SHEET_CUSTOMER_LEDGER, SHEET_ORDERS, SHEET_INVENTORY, SHEET_ACCOUNTS, 
    SHEET_VOUCHERS, SHEET_PURCHASES, SHEET_EXPENSES, SHEET_FACTORY, 
    SHEET_PRODUCTS, SHEET_JOURNAL
  ];

  // 1. التأسيس والإنشاء للجداول الـ 12 بالأسماء العربية والترويسات
  setupAllSheets();

  // 2. فحص وحذف أي ورقة قديمة ليست ضمن الجداول الـ 12 الأساسية
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

  Logger.log("✨ تم إعادة الضبط بالكامل وإنشاء الجداول الـ 12 الجديدة بنجاح!");
}

/**
 * 👑 دالة إعادة مسح وتأسيس أوراق قسم العملاء من الصفر
 */
function recreateCustomersModuleFresh() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  [
    { name: SHEET_CUSTOMERS, headers: CustomerController.HEADERS_CUSTOMERS },
    { name: SHEET_MEASUREMENTS, headers: CustomerController.HEADERS_MEASUREMENTS },
    { name: SHEET_CUSTOMER_LEDGER, headers: CustomerController.HEADERS_LEDGER }
  ].forEach(sheetInfo => {
    let sheet = ss.getSheetByName(sheetInfo.name);
    if (sheet) {
      sheet.clear();
    } else {
      sheet = ss.insertSheet(sheetInfo.name);
    }
    const hr = sheet.getRange(1, 1, 1, sheetInfo.headers.length);
    hr.setValues([sheetInfo.headers]);
    hr.setFontWeight("bold").setBackground("#4c1130").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  });
  
  Logger.log("✅ تم إعادة إنشاء شيتات العملاء من الصفر بنجاح!");
}

/**
 * 👑 دالة إعادة مسح وتأسيس ورقة المشتريات من الصفر (حذف كل البيانات القديمة وإنشاء الهيكل الجديد الخالي 100%)
 */
function recreatePurchasesSheetFresh() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_PURCHASES);
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(SHEET_PURCHASES);
  }
  const headers = PurchaseController.HEADERS;
  const hr = sheet.getRange(1, 1, 1, headers.length);
  hr.setValues([headers]);
  hr.setFontWeight("bold").setBackground("#4c1130").setFontColor("#ffffff");
  sheet.setFrozenRows(1);
  Logger.log("✅ تم إعادة إنشاء شيت المشتريات من الصفر بنجاح!");
}


/**
 * 👑 دالة إصلاح وتحديث ورقة المشتريات فقط لتحديث رؤوس الأعمدة الـ 14 المحدثة
 */
function fixAndAlignPurchaseSheet() {
  migratePurchaseSheet();
}

/**
 * 👑 دالة ترحيل البيانات القديمة وإعادة بناء شيت المشتريات بالأعمدة الـ 14 الصحيحة
 * قم بتشغيلها مرة واحدة من محرر Apps Script لإصلاح البيانات القديمة
 */
function migratePurchaseSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_PURCHASES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_PURCHASES);
    const hr = sheet.getRange(1, 1, 1, PurchaseController.HEADERS.length);
    hr.setValues([PurchaseController.HEADERS]);
    hr.setFontWeight("bold").setBackground("#4c1130").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    Logger.log("✅ ورقة المشتريات جديدة - تم التأسيس بنجاح");
    return;
  }

  const newHeaders = PurchaseController.HEADERS;
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    // Empty - just update headers
    const hr = sheet.getRange(1, 1, 1, newHeaders.length);
    hr.setValues([newHeaders]);
    hr.setFontWeight("bold").setBackground("#4c1130").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    Logger.log("✅ تم تحديث رؤوس الجدول (لا توجد بيانات)");
    return;
  }

  const oldHeaders = data[0];
  const rows = data.slice(1);

  // Build old->new column mapping
  // Old possible formats - detect by checking if col count < 14
  const isOldFormat = oldHeaders.length < newHeaders.length;
  Logger.log("🔍 الأعمدة الحالية: " + oldHeaders.length + " | مطلوبة: " + newHeaders.length + " | صيغة قديمة: " + isOldFormat);

  // Map each old header to a key
  const KEY_MAP = PurchaseController.KEY_MAP;
  const oldColToKey = {};
  oldHeaders.forEach(function(h, i) {
    const key = KEY_MAP[String(h).trim()];
    if (key) oldColToKey[i] = key;
    Logger.log("  عمود " + i + ": '" + h + "' → " + (key || "غير محدد"));
  });

  // Map new header to key
  const newHeaderToKey = {};
  newHeaders.forEach(function(h, i) {
    const key = KEY_MAP[h];
    if (key) newHeaderToKey[key] = i;
  });

  // Rebuild rows in new format
  const newRows = rows.map(function(row) {
    const newRow = new Array(newHeaders.length).fill("");
    // Extract values by old column key
    Object.keys(oldColToKey).forEach(function(colIdx) {
      const key = oldColToKey[colIdx];
      const newIdx = newHeaderToKey[key];
      if (newIdx !== undefined && row[colIdx] !== "") {
        newRow[newIdx] = row[colIdx];
      }
    });
    return newRow;
  });

  // Clear the sheet and rewrite
  sheet.clearContents();
  const headerRange = sheet.getRange(1, 1, 1, newHeaders.length);
  headerRange.setValues([newHeaders]);
  headerRange.setFontWeight("bold").setBackground("#4c1130").setFontColor("#ffffff");
  sheet.setFrozenRows(1);

  if (newRows.length > 0) {
    sheet.getRange(2, 1, newRows.length, newHeaders.length).setValues(newRows);
  }

  Logger.log("✨ تم ترحيل " + newRows.length + " سجل بنجاح إلى البنية الجديدة الـ 14 أعمدة!");
}

/**
 * 🔧 cleanPurchaseData - شغّلها مرة واحدة لإصلاح البيانات الفاسدة
 * تقوم بـ:
 * 1. حذف الصفوف الفارغة (UUID + كمية=0)
 * 2. نقل التاريخ من خانة "رقم الحوالة" إلى "تاريخ الفاتورة"
 * 3. نقل كود الحساب من "طريقة الدفع" إلى "حساب الدفع"
 */
function cleanPurchaseData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PURCHASES);
  if (!sheet || sheet.getLastRow() <= 1) { Logger.log("لا توجد بيانات"); return; }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  function ci(name) { for (let i=0;i<headers.length;i++) if(String(headers[i]).trim()===name) return i; return -1; }

  const idC = ci("ID"), itemC = ci("الصنف / القماش"), qtyC = ci("الكمية");
  const trnC = ci("رقم الحوالة"), dateC = ci("تاريخ الفاتورة");
  const payTC = ci("طريقة الدفع"), payPC = ci("حساب الدفع");

  Logger.log("أعمدة: ID="+idC+" صنف="+itemC+" كمية="+qtyC+" حوالة="+trnC+" تاريخ="+dateC);

  function isDateLike(v) { if(!v) return false; const s=String(v); return /^\d{4}-\d{2}-\d{2}/.test(s)||s.includes("T"); }
  function fmtDate(v) { if(v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(),"yyyy-MM-dd"); const m=String(v).match(/^(\d{4}-\d{2}-\d{2})/); return m?m[1]:String(v); }

  const lastRow = sheet.getLastRow();
  const toDelete = [];
  let fixed = 0;

  for (let r = lastRow; r >= 2; r--) {
    const row = sheet.getRange(r, 1, 1, sheet.getLastColumn()).getValues()[0];
    const idVal = String(row[idC]||"");
    const qtyVal = parseFloat(row[qtyC]||0);
    const itemVal = String(row[itemC]||"").trim();

    // حذف الصفوف الفارغة (UUID + صفر)
    const isUUID = idVal.includes("-") && idVal.length > 20;
    if (isUUID && qtyVal === 0 && (itemVal==="" || itemVal==="متر")) {
      sheet.deleteRow(r);
      Logger.log("🗑️ حذف صف فارغ: "+r);
      continue;
    }

    // إصلاح: رقم الحوالة يحتوي تاريخ → نقل إلى تاريخ الفاتورة
    if (trnC>=0 && dateC>=0) {
      const trnVal = row[trnC];
      const dtVal  = row[dateC];
      if (isDateLike(trnVal)) {
        if (!dtVal || dtVal==="") sheet.getRange(r, dateC+1).setValue(fmtDate(trnVal));
        sheet.getRange(r, trnC+1).setValue("");
        Logger.log("📅 صف "+r+": نقل التاريخ "+fmtDate(trnVal)+" من حوالة إلى تاريخ");
        fixed++;
      }
    }

    // إصلاح: طريقة الدفع تحتوي كود حساب → نقل إلى حساب الدفع
    if (payTC>=0 && payPC>=0) {
      const pt = String(row[payTC]||"").trim();
      const pp = String(row[payPC]||"").trim();
      if (/^\d+$/.test(pt) && pp==="") {
        sheet.getRange(r, payPC+1).setValue(pt);
        sheet.getRange(r, payTC+1).setValue("نقدي");
        Logger.log("🔧 صف "+r+": نقل كود الحساب "+pt+" إلى حساب الدفع");
        fixed++;
      }
    }
  }

  Logger.log("✅ الانتهاء! أُصلح "+fixed+" صف");
  try { SpreadsheetApp.getUi().alert("✅ تم التنظيف!\nأُصلح: "+fixed+" صف"); } catch(e){}
}



