/**
 * 👑 Little Princesses ERP - Google Apps Script (GAS) Full Cloud Backend v2.0
 * 
 * FIXED: Returns English-keyed JSON for frontend compatibility
 * ADDED: Products & JournalEntries controllers
 * IMPROVED: DashboardController with financial aggregation
 */

// ==========================================
// 1. HTTP ROUTER & REQUEST HANDLERS
// ==========================================

function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
    var action = (e && e.parameter && e.parameter.action) || payload.action;
    if (!action) {
      return responseJSON({ status: "error", message: "Missing 'action' parameter." });
    }

    switch (action) {
      // --- READ actions via POST (CORS bypass) ---
      case "getCustomers":
        return responseJSON({ status: "success", data: CustomerController.getCustomers() });
      case "getOrders":
        return responseJSON({ status: "success", data: OrderController.getOrders() });
      case "getInventory":
        return responseJSON({ status: "success", data: InventoryController.getInventory() });
      case "getAccounts":
        return responseJSON({ status: "success", data: AccountingController.getAccounts() });
      case "getVouchers":
        return responseJSON({ status: "success", data: AccountingController.getVouchers() });
      case "getPurchases":
        return responseJSON({ status: "success", data: PurchaseController.getPurchases() });
      case "getExpenses":
        return responseJSON({ status: "success", data: ExpenseController.getExpenses() });
      case "getFactory":
        return responseJSON({ status: "success", data: FactoryController.getFactory() });
      case "getProducts":
        return responseJSON({ status: "success", data: ProductController.getProducts() });
      case "getJournalEntries":
        return responseJSON({ status: "success", data: JournalController.getJournalEntries() });
      case "getEmployees":
        return responseJSON({ status: "success", data: HRController.getEmployees() });
      case "getPayroll":
        return responseJSON({ status: "success", data: HRController.getPayroll() });
      case "getDashboardStats":
        return responseJSON({ status: "success", data: DashboardController.getStats() });
      case "setupSheets":
        return responseJSON({ status: "success", data: setupSheets() });

      // --- WRITE actions ---
      case "addCustomer":
        return responseJSON({ status: "success", data: CustomerController.addCustomer(payload) });
      case "createInvoice":
      case "addOrder":
        return responseJSON({ status: "success", data: OrderController.addOrder(payload) });
      case "updateOrder":
        return responseJSON({ status: "success", data: OrderController.updateOrder(payload) });
      case "deleteOrder":
        return responseJSON({ status: "success", data: OrderController.deleteOrder(payload) });
      case "addInventory":
        return responseJSON({ status: "success", data: InventoryController.addInventory(payload) });
      case "updateInventoryQty":
        return responseJSON({ status: "success", data: InventoryController.updateInventoryQty(payload) });
      case "addAccount":
        return responseJSON({ status: "success", data: AccountingController.addAccount(payload) });
      case "addVoucher":
        return responseJSON({ status: "success", data: AccountingController.addVoucher(payload) });
      case "addPurchase":
        return responseJSON({ status: "success", data: PurchaseController.addPurchase(payload) });
      case "addExpense":
        return responseJSON({ status: "success", data: ExpenseController.addExpense(payload) });
      case "updateFactory":
        return responseJSON({ status: "success", data: FactoryController.updateFactory(payload) });
      case "addProduct":
        return responseJSON({ status: "success", data: ProductController.addProduct(payload) });
      case "updateProduct":
        return responseJSON({ status: "success", data: ProductController.updateProduct(payload) });
      case "deleteProduct":
        return responseJSON({ status: "success", data: ProductController.deleteProduct(payload) });
      case "addJournalEntry":
        return responseJSON({ status: "success", data: JournalController.addJournalEntry(payload) });
      case "addEmployee":
        return responseJSON({ status: "success", data: HRController.addEmployee(payload) });
      case "updateEmployee":
        return responseJSON({ status: "success", data: HRController.updateEmployee(payload) });
      case "deleteEmployee":
        return responseJSON({ status: "success", data: HRController.deleteEmployee(payload) });
      case "addPayrollBatch":
        return responseJSON({ status: "success", data: HRController.addPayrollBatch(payload) });
      case "updatePayrollRecord":
        return responseJSON({ status: "success", data: HRController.updatePayrollRecord(payload) });

      default:
        return responseJSON({ status: "error", message: "Invalid action: " + action });
    }
  } catch (error) {
    Logger.log("doPost Error: " + error.toString());
    return responseJSON({ status: "error", message: "Server Error: " + error.toString() });
  }
}

function doGet(e) {
  try {
    var action = e && e.parameter && e.parameter.action;
    if (!action) {
      return responseJSON({ status: "success", message: "Little Princesses ERP API v2.0 Online ☁️" });
    }
    // Route all GET actions through the same switch as POST for simplicity
    return doPost({ parameter: e.parameter, postData: { contents: JSON.stringify({ action: action }) } });
  } catch (error) {
    Logger.log("doGet Error: " + error.toString());
    return responseJSON({ status: "error", message: "Server Error: " + error.toString() });
  }
}

function responseJSON(dataObj) {
  return ContentService.createTextOutput(JSON.stringify(dataObj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 2. SHEET DATABASE UTILITIES
// ==========================================

function getOrCreateSheet(sheetName, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#312E81").setFontColor("#FDE047");
    }
  } else if (headers && headers.length > 0) {
    var lastCol = sheet.getLastColumn();
    var firstRowValues = sheet.getLastRow() > 0 ? sheet.getRange(1, 1, 1, Math.max(lastCol, headers.length)).getValues()[0] : [];
    if (lastCol < headers.length || firstRowValues[0] !== headers[0]) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#312E81").setFontColor("#FDE047");
    }
  }
  return sheet;
}

function setupSheets() {
  getOrCreateSheet(CustomerController.sheetName, CustomerController.headers);
  getOrCreateSheet(OrderController.sheetName, OrderController.headers);
  getOrCreateSheet(InventoryController.sheetName, InventoryController.headers);
  getOrCreateSheet(AccountingController.accSheet, AccountingController.accHeaders);
  getOrCreateSheet(AccountingController.vouchSheet, AccountingController.vouchHeaders);
  getOrCreateSheet(PurchaseController.sheetName, PurchaseController.headers);
  getOrCreateSheet(ExpenseController.sheetName, ExpenseController.headers);
  getOrCreateSheet(FactoryController.sheetName, FactoryController.headers);
  getOrCreateSheet(ProductController.sheetName, ProductController.headers);
  getOrCreateSheet(JournalController.sheetName, JournalController.headers);
  getOrCreateSheet(HRController.employeesSheetName, HRController.employeesHeaders);
  getOrCreateSheet(HRController.payrollSheetName, HRController.payrollHeaders);
  
  // Marketing Phase 1, 2, & 3 Sheets (All 14 Tables)
  getOrCreateSheet("marketing_campaigns", ["campaign_id", "campaign_name", "campaign_code", "platform", "campaign_type", "objective", "product_id", "product_name", "audience_id", "payment_account_id", "budget", "daily_budget", "total_spend", "expected_sales", "actual_sales", "expected_revenue", "actual_revenue", "expected_roas", "actual_roas", "start_date", "end_date", "status", "notes", "created_by", "created_at", "updated_at"]);
  getOrCreateSheet("marketing_platforms", ["platform_id", "platform_name", "platform_type", "account_id", "account_name", "account_username", "page_name", "status", "connection_status", "permissions", "token_status", "token_expiry", "webhook_status", "last_sync", "created_at", "updated_at"]);
  getOrCreateSheet("marketing_content", ["content_id", "content_code", "platform", "platform_content_id", "content_type", "campaign_id", "product_id", "product_name", "caption", "media_url", "thumbnail_url", "publish_date", "status", "created_by", "created_at", "updated_at"]);
  getOrCreateSheet("content_metrics", ["metric_id", "content_id", "platform", "metric_date", "reach", "impressions", "views", "likes", "comments", "shares", "saves", "clicks", "profile_visits", "messages", "leads", "orders", "revenue", "spend", "engagement_rate", "save_rate", "share_rate", "conversion_rate", "created_at"]);
  getOrCreateSheet("marketing_ads", ["ad_id", "ad_code", "campaign_id", "platform", "ad_account_id", "ad_set_id", "content_id", "product_id", "ad_name", "objective", "audience", "budget", "spend", "impressions", "reach", "clicks", "ctr", "cpc", "cpm", "messages", "leads", "orders", "revenue", "roas", "status", "start_date", "end_date", "created_at", "updated_at"]);
  getOrCreateSheet("marketing_comments", ["comment_id", "platform", "platform_comment_id", "content_id", "campaign_id", "product_id", "customer_id", "customer_name", "comment_text", "parent_comment_id", "comment_date", "sentiment", "intent", "created_at", "updated_at"]);
  getOrCreateSheet("marketing_conversations", ["conversation_id", "platform", "customer_id", "customer_name", "customer_phone_reference", "product_id", "campaign_id", "channel", "started_at", "last_message_at", "status", "lead_status", "created_at", "updated_at"]);
  getOrCreateSheet("marketing_messages", ["message_id", "conversation_id", "platform", "platform_message_id", "customer_id", "sender_type", "message_text", "message_type", "message_timestamp", "product_id", "campaign_id", "created_at"]);
  getOrCreateSheet("marketing_leads", ["lead_id", "customer_id", "source_platform", "source_campaign_id", "source_content_id", "product_id", "lead_source", "lead_status", "lead_score", "purchase_intent", "created_at", "updated_at", "converted_to_order", "order_id", "conversion_date"]);
  getOrCreateSheet("marketing_attribution", ["attribution_id", "customer_id", "order_id", "product_id", "campaign_id", "content_id", "ad_id", "platform", "attribution_model", "attribution_type", "attributed_revenue", "attributed_profit", "attribution_confidence", "created_at"]);
  getOrCreateSheet("marketing_daily_summary", ["date", "platform", "total_campaigns", "active_campaigns", "spend", "reach", "impressions", "views", "likes", "comments", "shares", "saves", "clicks", "messages", "leads", "orders", "revenue", "gross_profit", "roas", "roi", "cac", "conversion_rate"]);
  getOrCreateSheet("marketing_sync_logs", ["sync_id", "sync_type", "platform", "started_at", "completed_at", "records_received", "records_created", "records_updated", "records_failed", "status", "error_message"]);
  getOrCreateSheet("marketing_webhook_events", ["event_id", "platform", "event_type", "external_event_id", "payload_reference", "received_at", "processed_at", "processing_status", "retry_count", "error_message"]);
  getOrCreateSheet("marketing_ai_insights", ["insight_id", "insight_type", "entity_type", "entity_id", "insight_title", "insight_text", "confidence", "evidence", "recommendation", "priority", "created_at", "expires_at"]);
  
  return { success: true, message: "تم تحديث وإنشاء جميع الجداول بما فيها شجرة الحسابات والـ 14 جدولاً لقسم التسويق بنجاح!" };
}

/**
 * Reads sheet rows and maps Arabic headers to English keys
 * @param {string} sheetName - Sheet tab name
 * @param {Array} arabicHeaders - Arabic column headers for auto-creation
 * @param {Object} headerToKeyMap - Maps Arabic header → English key
 */
function getRowsMapped(sheetName, arabicHeaders, headerToKeyMap) {
  var sheet = getOrCreateSheet(sheetName, arabicHeaders);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var englishKey = headerToKeyMap[headers[j]] || headers[j];
      obj[englishKey] = row[j];
    }
    result.push(obj);
  }
  return result;
}

// ==========================================
// 3. CONTROLLERS — ALL ERP MODULES
// ==========================================

// --- CUSTOMERS ---
var CustomerController = {
  sheetName: "العملاء",
  headers: ["Customer ID", "اسم العميلة", "هاتف (واتساب)", "هاتف بديل", "المنصة", "اسم الحساب", "الفئة", "المدينة", "الشارع", "تاريخ التسجيل", "ملاحظات", "عدد الأطفال"],
  keyMap: {
    "Customer ID": "customer_id", "اسم العميلة": "name", "هاتف (واتساب)": "phone",
    "هاتف بديل": "phone_alt", "المنصة": "platform", "اسم الحساب": "handle",
    "الفئة": "category", "المدينة": "city", "الشارع": "street",
    "تاريخ التسجيل": "reg_date", "ملاحظات": "notes", "عدد الأطفال": "children_count",
    "اسم العميل": "name"
  },

  getCustomers: function() {
    var customers = getRowsMapped(this.sheetName, this.headers, this.keyMap);

    
    // Fetch Measurements
    var measHeaders = ["Customer ID", "اسم العميلة", "اسم الطفلة", "تاريخ القياس", "الوحدة", "الطول الكلي", "طول الفستان", "طول الصدر", "طول التنورة", "طول الكم", "محيط الصدر", "محيط الخصر", "عرض الكتفين", "محيط الإبط", "محيط الرقبة", "اسم الموديل", "عمر الطفل", "صورة الموديل", "تاريخ التسليم", "تفضيلات الراحة", "ملاحظات الخياطة"];
    var measKeyMap = {
      "Customer ID": "customer_id", "اسم العميلة": "customer_name", "اسم الطفلة": "child_name", "تاريخ القياس": "meas_date", "الوحدة": "unit",
      "الطول الكلي": "total_height", "طول الفستان": "dress_length", "طول الصدر": "chest_length", "طول التنورة": "skirt_length", "طول الكم": "sleeve_length",
      "محيط الصدر": "chest_circ", "محيط الخصر": "waist_circ", "عرض الكتفين": "shoulder_width", "محيط الإبط": "armhole_circ", "محيط الرقبة": "neck_circ",
      "اسم الموديل": "selected_model", "عمر الطفل": "estimated_age", "صورة الموديل": "model_image", "تاريخ التسليم": "event_date",
      "تفضيلات الراحة": "comfort_profile", "ملاحظات الخياطة": "sewing_notes"
    };
    var measurements = getRowsMapped("سجل_المقاسات", measHeaders, measKeyMap);
    
    // Fetch Ledger
    var ledgerHeaders = ["Customer ID", "اسم العميلة", "إجمالي المبيعات", "إجمالي المدفوعات", "العربون المدفوع", "كلفة التوصيل", "طريقة الدفع", "رابط_صورة_السند", "المبلغ المتبقي", "تاريخ التحديث"];
    var ledgerKeyMap = {
      "Customer ID": "customer_id", "إجمالي المبيعات": "total_sales", "إجمالي المدفوعات": "total_paid", "العربون المدفوع": "deposit",
      "كلفة التوصيل": "delivery", "طريقة الدفع": "pay_method", "رابط_صورة_السند": "receipt_b64", "المبلغ المتبقي": "remaining", "تاريخ التحديث": "updated_at"
    };
    var ledgers = getRowsMapped("كشف_حساب_العملاء", ledgerHeaders, ledgerKeyMap);

    // Grouping
    for (var i = 0; i < customers.length; i++) {
      var cid = customers[i].customer_id;
      
      // Attach measurements
      customers[i].measurements = [];
      for (var m = 0; m < measurements.length; m++) {
        if (measurements[m].customer_id == cid) {
           var measObj = measurements[m];
           if (measObj.comfort_profile) measObj.comfort_profile = measObj.comfort_profile.split(',').map(function(s){return s.trim();});
           // Extract URL from =IMAGE("url")
           if (measObj.model_image && measObj.model_image.toString().indexOf('IMAGE("') !== -1) {
              var urlMatch = measObj.model_image.toString().match(/IMAGE\("([^"]+)"\)/);
              if (urlMatch) measObj.model_image = urlMatch[1];
           }
           customers[i].measurements.push(measObj);
        }
      }
      
      // Attach ledger
      for (var l = 0; l < ledgers.length; l++) {
        if (ledgers[l].customer_id == cid) {
           customers[i].ledger = ledgers[l];
           break;
        }
      }
    }
    
    return customers;
  },

  addCustomer: function(data) {
    // 1. العملاء
    var sheetCustomers = getOrCreateSheet(this.sheetName, this.headers);
    var newId = data.customer_id || data.id || new Date().getTime();
    var childrenCount = (data.measurements && data.measurements.length) ? data.measurements.length : 0;
    
    sheetCustomers.appendRow([
      newId, data.name || "", data.phone || "", data.phone_alt || "",
      data.platform || "", data.handle || "", data.category || "",
      data.city || "", data.street || "", data.reg_date || new Date().toISOString().split('T')[0],
      data.notes || "", childrenCount
    ]);

    // 2. سجل_المقاسات
    if (data.measurements && data.measurements.length > 0) {
      var measHeaders = ["Customer ID", "اسم العميلة", "اسم الطفلة", "تاريخ القياس", "الوحدة", "الطول الكلي", "طول الفستان", "طول الصدر", "طول التنورة", "طول الكم", "محيط الصدر", "محيط الخصر", "عرض الكتفين", "محيط الإبط", "محيط الرقبة", "اسم الموديل", "عمر الطفل", "صورة الموديل", "تاريخ التسليم", "تفضيلات الراحة", "ملاحظات الخياطة"];
      var sheetMeas = getOrCreateSheet("سجل_المقاسات", measHeaders);
      
      // Setup Drive folder for images
      var imgFolder = null;
      try {
         var fName = "صور_موديلات_العملاء";
         var fIter = DriveApp.getFoldersByName(fName);
         imgFolder = fIter.hasNext() ? fIter.next() : DriveApp.createFolder(fName);
      } catch(e) {}
      
      for (var i = 0; i < data.measurements.length; i++) {
        var m = data.measurements[i];
        
        var imgUrl = m.model_image || "";
        var fallbackImg = "https://dummyimage.com/150x150/f8fafc/64748b.png&text=No+Model";
        
        // If image is base64, save to drive and get Direct Link
        if (imgUrl.indexOf("data:image") === 0 && imgFolder) {
           try {
             var b64 = imgUrl.split(",")[1];
             var blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/png', 'Model_' + newId + '_' + i + '.png');
             var file = imgFolder.createFile(blob);
             file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
             // CRITICAL: use direct download URL for Google Sheets =IMAGE
             imgUrl = "https://drive.google.com/uc?export=download&id=" + file.getId();
             m.model_image = imgUrl; // update for frontend return
           } catch(e) {}
        }
        
        var finalUrl = imgUrl || fallbackImg;
        var imgFormula = '=IMAGE("' + finalUrl + '")';
        var comfortStr = (m.comfort_profile && m.comfort_profile.join) ? m.comfort_profile.join(', ') : "";

        sheetMeas.appendRow([
          newId, data.name || "", m.child_name || "", m.meas_date || "", m.unit || "",
          m.total_height || "", m.dress_length || "", m.chest_length || "", m.skirt_length || "", m.sleeve_length || "",
          m.chest_circ || "", m.waist_circ || "", m.shoulder_width || "", m.armhole_circ || "", m.neck_circ || "",
          m.selected_model || "", m.estimated_age || "", imgFormula, m.event_date || "", comfortStr, m.sewing_notes || ""
        ]);
      }
    }

    // 3. كشف_حساب_العملاء
    if (data.ledger) {
      var ledgerHeaders = ["Customer ID", "اسم العميلة", "إجمالي المبيعات", "إجمالي المدفوعات", "العربون المدفوع", "كلفة التوصيل", "طريقة الدفع", "رابط_صورة_السند", "المبلغ المتبقي", "تاريخ التحديث"];
      var sheetLedger = getOrCreateSheet("كشف_حساب_العملاء", ledgerHeaders);
      
      var fileUrl = "";
      if (data.ledger.receipt_b64) {
        try {
          var folderName = "سندات_Little_Princesses";
          var folders = DriveApp.getFoldersByName(folderName);
          var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
          
          var b64Data = data.ledger.receipt_b64;
          if (b64Data.indexOf(",") !== -1) {
             b64Data = b64Data.split(",")[1];
          }
          
          var blob = Utilities.newBlob(Utilities.base64Decode(b64Data), 'image/png', 'Receipt_' + newId + '.png');
          var file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          fileUrl = file.getUrl();
        } catch(e) {
          fileUrl = "Error: " + e.message;
        }
      }
      
      sheetLedger.appendRow([
        newId, data.name || "", data.ledger.total_sales || 0, data.ledger.total_paid || 0,
        data.ledger.deposit || 0, data.ledger.delivery || 0, data.ledger.pay_method || "",
        fileUrl, data.ledger.remaining || 0, data.ledger.updated_at || new Date().toISOString().split('T')[0]
      ]);
    }

    // Return the updated data object so the frontend can append it to the list without reloading
    data.customer_id = newId;
    if (data.ledger) data.ledger.receipt_b64 = fileUrl; // Replace base64 with URL for frontend state
    
    return { id: newId, message: "تم حفظ العميل ومقاسات الأطفال وكشف الحساب بنجاح", data: data };
  }
};

// --- ORDERS ---
var OrderController = {
  sheetName: "الطلبات",
  headers: ["ID", "رقم الفاتورة", "اسم العميل", "اسم الطفلة", "اسم المنتج", "الكمية", "تاريخ الحجز", "موعد التسليم", "الإجمالي", "المدفوع", "المتبقي", "العملة", "الحالة"],
  keyMap: {
    "ID": "id", "رقم الفاتورة": "order_no", "اسم العميل": "customer_name", "اسم الطفلة": "child_name",
    "اسم المنتج": "product_name", "الكمية": "qty",
    "تاريخ الحجز": "order_date", "موعد التسليم": "delivery_date",
    "الإجمالي": "total", "المدفوع": "paid", "المتبقي": "remaining",
    "العملة": "currency", "الحالة": "status"
  },

  getOrders: function() {
    return getRowsMapped(this.sheetName, this.headers, this.keyMap);
  },

  addOrder: function(data) {
    var sheet = getOrCreateSheet(this.sheetName, this.headers);
    var newId = data.id || new Date().getTime();
    var orderNo = data.order_no || ("ORD-" + newId.toString().slice(-4));
    var total = Number(data.total) || 0;
    var paid = Number(data.paid) || 0;
    sheet.appendRow([
      newId, orderNo, data.customer_name || "", data.child_name || "", data.product_name || "",
      Number(data.qty) || 1, data.order_date || new Date().toISOString().split('T')[0],
      data.delivery_date || "", total, paid, total - paid,
      data.currency || "USD $", data.status || "قيد الخياطة 🪡"
    ]);
    return { id: newId, order_no: orderNo, message: "تم حفظ الطلب بنجاح" };
  },

  updateOrder: function(data) {
    var sheet = getOrCreateSheet(this.sheetName, this.headers);
    var rows = sheet.getDataRange().getValues();
    var updated = false;
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] == data.id) {
        if (typeof data.customer_name !== 'undefined') sheet.getRange(i + 1, 3).setValue(data.customer_name);
        if (typeof data.child_name !== 'undefined') sheet.getRange(i + 1, 4).setValue(data.child_name);
        if (typeof data.product_name !== 'undefined') sheet.getRange(i + 1, 5).setValue(data.product_name);
        if (typeof data.qty !== 'undefined') sheet.getRange(i + 1, 6).setValue(data.qty);
        if (typeof data.delivery_date !== 'undefined') sheet.getRange(i + 1, 8).setValue(data.delivery_date);
        if (typeof data.total !== 'undefined') sheet.getRange(i + 1, 9).setValue(data.total);
        if (typeof data.paid !== 'undefined') sheet.getRange(i + 1, 10).setValue(data.paid);
        if (typeof data.remaining !== 'undefined') sheet.getRange(i + 1, 11).setValue(data.remaining);
        if (typeof data.currency !== 'undefined') sheet.getRange(i + 1, 12).setValue(data.currency);
        if (typeof data.status !== 'undefined') sheet.getRange(i + 1, 13).setValue(data.status);
        updated = true;
        break;
      }
    }
    return { id: data.id, success: updated };
  },

  deleteOrder: function(data) {
    var sheet = getOrCreateSheet(this.sheetName, this.headers);
    var rows = sheet.getDataRange().getValues();
    var deleted = false;
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] == data.id) {
        sheet.deleteRow(i + 1);
        deleted = true;
        break;
      }
    }
    return { id: data.id, success: deleted };
  }
};

// --- INVENTORY ---
var InventoryController = {
  sheetName: "المخزون",
  headers: ["ID", "اسم القماش", "التصنيف", "الكمية بالمتر", "تكلفة الوحدة", "إجمالي القيمة", "العملة", "حد التنبيه", "تاريخ التوريد"],
  keyMap: {
    "ID": "id", "اسم القماش": "item_name", "التصنيف": "category",
    "الكمية بالمتر": "qty", "الكمية": "qty",
    "تكلفة المتر": "cost_per_unit", "تكلفة الوحدة": "cost_per_unit", "إجمالي القيمة": "total_value",
    "العملة": "currency", "حد التنبيه": "min_alert", "تاريخ التوريد": "supply_date"
  },

  getInventory: function() {
    return getRowsMapped(this.sheetName, this.headers, this.keyMap);
  },

  addInventory: function(data) {
    var sheet = getOrCreateSheet(this.sheetName, this.headers);
    var newId = data.id || new Date().getTime();
    sheet.appendRow([
      newId, data.item_name || "", data.category || "أقمشة",
      Number(data.qty) || 0, Number(data.cost_per_unit) || 0, Number(data.total_value) || 0,
      data.currency || "USD $", Number(data.min_alert) || 5,
      data.supply_date || new Date().toISOString().split('T')[0]
    ]);
    return { id: newId, message: "تم تحديث المخزون بنجاح" };
  },

  updateInventoryQty: function(data) {
    var sheet = getOrCreateSheet(this.sheetName, this.headers);
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
       if (rows[i][1] == data.item_name) {
          var currentQty = Number(rows[i][3]) || 0;
          var newQty = currentQty - (Number(data.qty_to_deduct) || 0);
          sheet.getRange(i + 1, 4).setValue(newQty);
          // Update total value as well based on cost_per_unit
          var cost = Number(rows[i][4]) || 0;
          var newTotal = newQty * cost;
          sheet.getRange(i + 1, 6).setValue(newTotal);
          return { success: true, new_qty: newQty, new_total: newTotal, message: "تم تحديث الكمية بنجاح" };
       }
    }
    return { success: false, message: "الصنف غير موجود في المخزون!" };
  }
};

// --- ACCOUNTS (24 COLUMNS ARABIC & ENGLISH BI-DIRECTIONAL) ---
var AccountingController = {
  accSheet: "شجرة_الحسابات",
  accHeaders: [
    "معرف الحساب (account_id)", "كود الحساب (account_code)", "اسم الحساب (account_name)", "الاسم بالإنجليزي (account_name_en)", "نوع الحساب (account_type)",
    "فئة الحساب (account_category)", "معرف الحساب الأب (parent_account_id)", "كود الحساب الأب (parent_account_code)", "المستوى (level)", "مسار الحساب (account_path)",
    "حساب رئيسي/تجميعي (is_group)", "قابل للترحيل (is_postable)", "حالة الحساب (is_active)", "طبيعة الحساب (normal_balance)", "الرصيد الافتتاحي (opening_balance)",
    "الرصيد الحالي (current_balance)", "نوع الرصيد (balance_type)", "العملة (currency)", "تاريخ التأسيس (establishment_date)", "ملاحظات (notes)",
    "تاريخ الإنشاء (created_at)", "تاريخ التحديث (updated_at)", "أنشئ بواسطة (created_by)", "حدث بواسطة (updated_by)"
  ],
  accKeyMap: {
    "معرف الحساب (account_id)": "account_id", "account_id": "account_id",
    "كود الحساب (account_code)": "account_code", "account_code": "account_code",
    "اسم الحساب (account_name)": "account_name", "account_name": "account_name",
    "الاسم بالإنجليزي (account_name_en)": "account_name_en", "account_name_en": "account_name_en",
    "نوع الحساب (account_type)": "account_type", "account_type": "account_type",
    "فئة الحساب (account_category)": "account_category", "account_category": "account_category",
    "معرف الحساب الأب (parent_account_id)": "parent_account_id", "parent_account_id": "parent_account_id",
    "كود الحساب الأب (parent_account_code)": "parent_account_code", "parent_account_code": "parent_account_code",
    "المستوى (level)": "level", "level": "level",
    "مسار الحساب (account_path)": "account_path", "account_path": "account_path",
    "حساب رئيسي/تجميعي (is_group)": "is_group", "is_group": "is_group",
    "قابل للترحيل (is_postable)": "is_postable", "is_postable": "is_postable",
    "حالة الحساب (is_active)": "is_active", "is_active": "is_active",
    "طبيعة الحساب (normal_balance)": "normal_balance", "normal_balance": "normal_balance",
    "الرصيد الافتتاحي (opening_balance)": "opening_balance", "opening_balance": "opening_balance",
    "الرصيد الحالي (current_balance)": "current_balance", "current_balance": "current_balance",
    "نوع الرصيد (balance_type)": "balance_type", "balance_type": "balance_type",
    "العملة (currency)": "currency", "currency": "currency",
    "تاريخ التأسيس (establishment_date)": "establishment_date", "establishment_date": "establishment_date",
    "ملاحظات (notes)": "notes", "notes": "notes",
    "تاريخ الإنشاء (created_at)": "created_at", "created_at": "created_at",
    "تاريخ التحديث (updated_at)": "updated_at", "updated_at": "updated_at",
    "أنشئ بواسطة (created_by)": "created_by", "created_by": "created_by",
    "حدث بواسطة (updated_by)": "updated_by", "updated_by": "updated_by"
  },

  vouchSheet: "السندات المالية",
  vouchHeaders: ["رقم السند", "نوع السند", "الجهة / العميل", "المبلغ", "العملة", "طريقة الدفع", "رقم الحوالة", "الحساب المرتبط", "التاريخ", "البيان"],
  vouchKeyMap: {
    "رقم السند": "voucher_no", "نوع السند": "type",
    "الجهة / العميل": "party_name", "المبلغ": "amount",
    "العملة": "currency", "طريقة الدفع": "pay_method",
    "رقم الحوالة": "transfer_no", "الحساب المرتبط": "acc_code",
    "التاريخ": "date", "البيان": "notes"
  },

  getAccounts: function() {
    var rows = getRowsMapped(this.accSheet, this.accHeaders, this.accKeyMap);
    if (!rows || rows.length === 0) {
      rows = getRowsMapped("accounts", this.accHeaders, this.accKeyMap);
    }
    return rows;
  },

  addAccount: function(data) {
    var sheet = getOrCreateSheet(this.accSheet, this.accHeaders);
    var accId = data.account_id || ("ACC-" + String(new Date().getTime()).slice(-6));
    var accCode = String(data.account_code || data.code || data.acc_code || "").trim();
    var accName = String(data.account_name || data.name || data.acc_name || "").trim();
    var nowStr = new Date().toISOString();

    sheet.appendRow([
      accId, accCode, accName, data.account_name_en || "", data.account_type || "أصول",
      data.account_category || "", data.parent_account_id || "", data.parent_account_code || "",
      Number(data.level) || 1, data.account_path || accCode,
      (data.is_group ? 1 : 0), (data.is_postable !== undefined ? (data.is_postable ? 1 : 0) : 1),
      (data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1), data.normal_balance || "debit",
      Number(data.opening_balance) || 0, Number(data.current_balance || data.balance) || 0,
      data.balance_type || "debit", data.currency || "YER", data.establishment_date || "",
      data.notes || "", nowStr, nowStr, data.created_by || "النظام", data.updated_by || "النظام"
    ]);

    return { account_id: accId, account_code: accCode, success: true, message: "تم حفظ الحساب بنجاح في Google Sheets" };
  },

  getVouchers: function() {
    return getRowsMapped(this.vouchSheet, this.vouchHeaders, this.vouchKeyMap);
  },

  addVoucher: function(data) {
    var sheet = getOrCreateSheet(this.vouchSheet, this.vouchHeaders);
    sheet.appendRow([
      data.voucher_no || ("VOUCH-" + new Date().getTime().toString().slice(-4)),
      data.type || "سند قبض", data.party_name || "",
      Number(data.amount) || 0, data.currency || "USD $",
      data.pay_method || "نقد (كاش)", data.transfer_no || "",
      data.acc_code || "", data.date || new Date().toISOString().split('T')[0],
      data.notes || ""
    ]);
    return { message: "تم حفظ السند بنجاح" };
  }
};

// --- PURCHASES ---
var PurchaseController = {
  sheetName: "المشتريات",
  headers: ["ID", "رقم الفاتورة", "المورد", "الصنف", "الكمية", "سعر المتر", "تكلفة النقل", "العملة", "طريقة الدفع", "رقم الحوالة", "حساب الدفع", "التاريخ"],
  keyMap: {
    "ID": "id", "رقم الفاتورة": "bill_no", "المورد": "supplier",
    "الصنف": "item", "الكمية": "qty", "سعر المتر": "price", "تكلفة النقل": "freight_cost",
    "العملة": "currency", "طريقة الدفع": "pay_type",
    "رقم الحوالة": "transfer_no", "حساب الدفع": "payment_source",
    "التاريخ": "date"
  },

  getPurchases: function() {
    return getRowsMapped(this.sheetName, this.headers, this.keyMap);
  },

  addPurchase: function(data) {
    var sheet = getOrCreateSheet(this.sheetName, this.headers);
    var newId = data.id || new Date().getTime();
    sheet.appendRow([
      newId, data.bill_no || ("BILL-" + new Date().getTime().toString().slice(-4)),
      data.supplier || "", data.item || "",
      Number(data.qty) || 0, Number(data.price) || 0, Number(data.freight_cost) || 0,
      data.currency || "USD $", data.pay_type || "نقد (كاش)",
      data.transfer_no || "", data.payment_source || "",
      data.date || new Date().toISOString().split('T')[0]
    ]);
    return { id: newId, message: "تم حفظ فاتورة الشراء بنجاح" };
  }
};

// --- EXPENSES ---
var ExpenseController = {
  sheetName: "المصاريف",
  headers: ["ID", "نوع المصروف", "المبلغ", "العملة", "طريقة الدفع", "حساب الدفع", "التاريخ", "ملاحظات"],
  keyMap: {
    "ID": "id", "نوع المصروف": "exp_type", "المبلغ": "amount",
    "العملة": "currency", "طريقة الدفع": "pay_method",
    "حساب الدفع": "source_acc", "التاريخ": "date", "ملاحظات": "notes"
  },

  getExpenses: function() {
    return getRowsMapped(this.sheetName, this.headers, this.keyMap);
  },

  addExpense: function(data) {
    var sheet = getOrCreateSheet(this.sheetName, this.headers);
    var newId = data.id || new Date().getTime();
    sheet.appendRow([
      newId, data.exp_type || "", Number(data.amount) || 0,
      data.currency || "USD $", data.pay_method || "نقد (كاش)",
      data.source_acc || "", data.date || new Date().toISOString().split('T')[0],
      data.notes || ""
    ]);
    return { id: newId, message: "تم تسجيل المصروف بنجاح" };
  }
};

// --- FACTORY ---
var FactoryController = {
  sheetName: "حالة_الورشة_والإنتاج",
  headers: ["ID", "رقم الطلب", "اسم العميلة", "اسم الفستان", "الخياط", "المرحلة", "نسبة الإنجاز", "تاريخ البدء", "تاريخ التسليم", "ملاحظات"],
  keyMap: {
    "ID": "id", "رقم الطلب": "order_no", "اسم العميلة": "customer_name",
    "اسم الفستان": "product_name", "الخياط": "tailor",
    "المرحلة": "stage", "نسبة الإنجاز": "progress",
    "تاريخ البدء": "start_date", "تاريخ التسليم": "due_date",
    "ملاحظات": "notes"
  },

  getFactory: function() {
    return getRowsMapped(this.sheetName, this.headers, this.keyMap);
  },

  updateFactory: function(data) {
    var sheet = getOrCreateSheet(this.sheetName, this.headers);
    var rows = sheet.getDataRange().getValues();
    var foundIndex = -1;
    
    // Look for existing order_no
    if (data.order_no) {
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][1] == data.order_no) { // Column B is order_no
          foundIndex = i + 1; // 1-based for getRange
          break;
        }
      }
    }
    
    var newId = data.id || new Date().getTime();
    var rowData = [
      newId, data.order_no || "", data.customer_name || "",
      data.product_name || "", data.tailor || "",
      data.stage || "مرحلة القص ✂️", Number(data.progress) || 0,
      data.start_date || new Date().toISOString().split('T')[0],
      data.due_date || "", data.notes || ""
    ];

    if (foundIndex !== -1) {
      // Keep original ID and start date if they exist in the sheet
      rowData[0] = rows[foundIndex - 1][0] || rowData[0];
      rowData[7] = rows[foundIndex - 1][7] || rowData[7];
      sheet.getRange(foundIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    
    return { id: rowData[0], message: "تم تحديث مرحلة المعمل بنجاح" };
  }
};

// --- PRODUCTS (NEW) ---
var ProductController = {
  sheetName: "المنتجات",
  headers: ["ID", "اسم الموديل", "التصنيف", "اسم القماش", "الأمتار", "تكلفة القماش", "أجرة الخياطة", "التغليف", "إجمالي التكلفة", "سعر البيع", "العملة", "الربح", "تاريخ الحساب"],
  keyMap: {
    "ID": "id", "اسم الموديل": "name", "التصنيف": "category",
    "اسم القماش": "fabric_name", "الأمتار": "yards_used",
    "تكلفة القماش": "fabric_cost", "أجرة الخياطة": "labor_cost",
    "التغليف": "packaging_cost", "إجمالي التكلفة": "total_cost",
    "سعر البيع": "sell_price", "العملة": "currency",
    "الربح": "profit", "تاريخ الحساب": "calc_date"
  },

  getProducts: function() {
    return getRowsMapped(this.sheetName, this.headers, this.keyMap);
  },

    addProduct: function(data) {
      var sheet = getOrCreateSheet(this.sheetName, this.headers);
      var newId = data.id || new Date().getTime();
      var bomStr = data.bom ? JSON.stringify(data.bom) : "[]";
      var ageChartStr = data.age_chart ? JSON.stringify(data.age_chart) : "[]";
      sheet.appendRow([
        newId, data.name || "", data.category || "",
        data.fabric_name || "", Number(data.yards_used) || 0,
        Number(data.fabric_cost) || 0, Number(data.labor_cost) || 0,
        Number(data.packaging_cost) || 0, Number(data.total_cost) || 0,
        Number(data.sell_price) || 0, data.currency || "USD $",
        Number(data.profit) || 0, data.calc_date || new Date().toISOString().split('T')[0],
        bomStr, ageChartStr
      ]);
      return { id: newId };
    },

    updateProduct: function(data) {
      var sheet = getOrCreateSheet(this.sheetName, this.headers);
      var rows = sheet.getDataRange().getValues();
      var bomStr = data.bom ? JSON.stringify(data.bom) : "[]";
      var ageChartStr = data.age_chart ? JSON.stringify(data.age_chart) : "[]";
      var updated = false;
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] == data.id) {
          sheet.getRange(i + 1, 2).setValue(data.name || "");
          sheet.getRange(i + 1, 3).setValue(data.category || "");
          sheet.getRange(i + 1, 4).setValue(data.fabric_name || "");
          sheet.getRange(i + 1, 5).setValue(Number(data.yards_used) || 0);
          sheet.getRange(i + 1, 6).setValue(Number(data.fabric_cost) || 0);
          sheet.getRange(i + 1, 7).setValue(Number(data.labor_cost) || 0);
          sheet.getRange(i + 1, 8).setValue(Number(data.packaging_cost) || 0);
          sheet.getRange(i + 1, 9).setValue(Number(data.total_cost) || 0);
          sheet.getRange(i + 1, 10).setValue(Number(data.sell_price) || 0);
          sheet.getRange(i + 1, 11).setValue(data.currency || "USD $");
          sheet.getRange(i + 1, 12).setValue(Number(data.profit) || 0);
          sheet.getRange(i + 1, 13).setValue(data.calc_date || new Date().toISOString().split('T')[0]);
          sheet.getRange(i + 1, 14).setValue(bomStr);
          sheet.getRange(i + 1, 15).setValue(ageChartStr);
          updated = true;
          break;
        }
      }
      return { id: data.id, success: updated };
    },

    deleteProduct: function(data) {
      var sheet = getOrCreateSheet(this.sheetName, this.headers);
      var rows = sheet.getDataRange().getValues();
      var deleted = false;
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] == data.id) {
          sheet.deleteRow(i + 1);
          deleted = true;
          break;
        }
      }
      return { id: data.id, success: deleted };
    }
};

var JournalController = {
  sheetName: "القيود اليومية",
  headers: ["ID", "رقم القيد", "المدين (Debit)", "الدائن (Credit)", "المبلغ", "العملة", "المرجع", "التاريخ", "البيان"],
  keyMap: {
    "ID": "id", "رقم القيد": "entry_no", "المدين (Debit)": "debit", "الدائن (Credit)": "credit",
    "المبلغ": "amount", "العملة": "currency", "المرجع": "ref_type", "التاريخ": "date", "البيان": "notes"
  },

  getJournalEntries: function() {
    return getRowsMapped(this.sheetName, this.headers, this.keyMap);
  },

  addJournalEntry: function(data) {
    var sheet = getOrCreateSheet(this.sheetName, this.headers);
    var newId = data.id || new Date().getTime();
    sheet.appendRow([
      newId, data.entry_no || ("ENT-" + new Date().getTime().toString().slice(-4)),
      data.debit || "", data.credit || "",
      Number(data.amount) || 0, data.currency || "USD $",
      data.ref_type || "فاتورة مبيعات",
      data.date || new Date().toISOString().split('T')[0],
      data.notes || ""
    ]);
    return { id: newId, message: "تم ترحيل القيد بنجاح" };
  }
};

// --- HR & PAYROLL ---
var HRController = {
  empSheetName: "الموارد_البشرية",
  empHeaders: ["ID", "اسم الموظف", "المسمى الوظيفي", "نظام الدفع", "القيمة الأساسية", "رقم الهاتف", "تاريخ التعيين", "الحالة"],
  empKeyMap: {
    "ID": "id", "اسم الموظف": "name", "المسمى الوظيفي": "role", "نظام الدفع": "type",
    "القيمة الأساسية": "baseSalary", "رقم الهاتف": "phone", "تاريخ التعيين": "hireDate", "الحالة": "status"
  },

  payrollSheetName: "مسير_الرواتب",
  payrollHeaders: ["ID", "شهر الرواتب", "اسم الموظف", "نظام الدفع", "القيمة_الأساسية", "القطع_المنجزة_شهرياً", "إجمالي_المستحقات", "إجمالي_السلف_والخصومات", "المكافآت", "صافي_الراتب_المستحق", "حالة_الصرف", "بيان_القطع"],
  payrollKeyMap: {
    "ID": "id", "شهر الرواتب": "month", "اسم الموظف": "empName", "نظام الدفع": "type",
    "القيمة_الأساسية": "baseValue", "القطع_المنجزة_شهرياً": "piecesCount",
    "إجمالي_المستحقات": "totalDue", "إجمالي_السلف_والخصومات": "deductions",
    "المكافآت": "bonus", "صافي_الراتب_المستحق": "netSalary", "حالة_الصرف": "status", "بيان_القطع": "piecesStatement"
  },

  getEmployees: function() {
    return getRowsMapped(this.empSheetName, this.empHeaders, this.empKeyMap).map(function(e) {
      e.baseSalary = Number(e.baseSalary) || 0;
      return e;
    });
  },

  addEmployee: function(data) {
    var sheet = getOrCreateSheet(this.empSheetName, this.empHeaders);
    var newId = data.id || new Date().getTime();
    sheet.appendRow([
      newId, data.name || "", data.role || "", data.type || "راتب شهري",
      Number(data.baseSalary) || 0, data.phone || "", data.hireDate || "", data.status || "نشط"
    ]);
    return { id: newId };
  },

  updateEmployee: function(data) {
    var sheet = getOrCreateSheet(this.empSheetName, this.empHeaders);
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] == data.id) {
        if (data.name !== undefined) sheet.getRange(i + 1, 2).setValue(data.name);
        if (data.role !== undefined) sheet.getRange(i + 1, 3).setValue(data.role);
        if (data.type !== undefined) sheet.getRange(i + 1, 4).setValue(data.type);
        if (data.baseSalary !== undefined) sheet.getRange(i + 1, 5).setValue(Number(data.baseSalary));
        if (data.phone !== undefined) sheet.getRange(i + 1, 6).setValue(data.phone);
        if (data.hireDate !== undefined) sheet.getRange(i + 1, 7).setValue(data.hireDate);
        if (data.status !== undefined) sheet.getRange(i + 1, 8).setValue(data.status);
        return { success: true };
      }
    }
    return { success: false };
  },

  deleteEmployee: function(data) {
    var sheet = getOrCreateSheet(this.empSheetName, this.empHeaders);
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] == data.id) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { success: false };
  },

  getPayroll: function() {
    return getRowsMapped(this.payrollSheetName, this.payrollHeaders, this.payrollKeyMap).map(function(p) {
      p.baseValue = Number(p.baseValue) || 0;
      p.piecesCount = Number(p.piecesCount) || 0;
      p.totalDue = Number(p.totalDue) || 0;
      p.deductions = Number(p.deductions) || 0;
      p.bonus = Number(p.bonus) || 0;
      p.netSalary = Number(p.netSalary) || 0;
      p.piecesStatement = p.piecesStatement || "";
      return p;
    });
  },

  addPayrollBatch: function(data) {
    var sheet = getOrCreateSheet(this.payrollSheetName, this.payrollHeaders);
    var records = data.records || [];
    var newRows = [];
    for(var i = 0; i < records.length; i++) {
       var r = records[i];
       var newId = r.id || (new Date().getTime() + i);
       newRows.push([
         newId, r.month || "", r.empName || "", r.type || "",
         Number(r.baseValue) || 0, Number(r.piecesCount) || 0,
         Number(r.totalDue) || 0, Number(r.deductions) || 0,
         Number(r.bonus) || 0, Number(r.netSalary) || 0,
         r.status || "معلق", r.piecesStatement || ""
       ]);
    }
    if (newRows.length > 0) {
       for (var r = 0; r < newRows.length; r++) {
         sheet.appendRow(newRows[r]);
       }
    }
    return { success: true, count: newRows.length };
  },

  updatePayrollRecord: function(data) {
    var sheet = getOrCreateSheet(this.payrollSheetName, this.payrollHeaders);
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] == data.id) {
        if (data.deductions !== undefined) sheet.getRange(i + 1, 8).setValue(Number(data.deductions));
        if (data.bonus !== undefined) sheet.getRange(i + 1, 9).setValue(Number(data.bonus));
        if (data.netSalary !== undefined) sheet.getRange(i + 1, 10).setValue(Number(data.netSalary));
        if (data.status !== undefined) sheet.getRange(i + 1, 11).setValue(data.status);
        return { success: true };
      }
    }
    return { success: false };
  }
};

// --- DASHBOARD ---
var DashboardController = {
  getStats: function() {
    var customers = CustomerController.getCustomers();
    var orders = OrderController.getOrders();
    var inventory = InventoryController.getInventory();
    var purchases = PurchaseController.getPurchases();
    var expenses = ExpenseController.getExpenses();

    var totalSales = 0, totalPaid = 0, lowStock = 0, activeTailoring = 0;
    for (var i = 0; i < orders.length; i++) {
      totalSales += Number(orders[i].total) || 0;
      totalPaid += Number(orders[i].paid) || 0;
      var st = orders[i].status || "";
      if (st.indexOf("خياطة") > -1 || st.indexOf("قص") > -1 || st.indexOf("تطريز") > -1) {
        activeTailoring++;
      }
    }
    for (var j = 0; j < inventory.length; j++) {
      if ((Number(inventory[j].qty) || 0) <= (Number(inventory[j].min_alert) || 5)) {
        lowStock++;
      }
    }
    var totalExpenses = 0;
    for (var k = 0; k < expenses.length; k++) {
      totalExpenses += Number(expenses[k].amount) || 0;
    }

    return {
      total_customers: customers.length,
      total_orders: orders.length,
      total_sales: totalSales,
      total_paid: totalPaid,
      total_remaining: totalSales - totalPaid,
      low_stock_alerts: lowStock,
      active_tailoring: activeTailoring,
      total_expenses: totalExpenses,
      total_inventory: inventory.length,
      total_purchases: purchases.length,
      net_profit: totalSales - totalExpenses,
      status: "Online 24/7 Cloud ☁️"
    };
  }
};
