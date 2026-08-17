const SHEET_CUSTOMERS = 'العملاء';
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
