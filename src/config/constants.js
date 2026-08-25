window.useState = React.useState;
window.useEffect = React.useEffect;
window.useCallback = React.useCallback;
window.useMemo = React.useMemo;
window.useRef = React.useRef;

const TODAY_DATE = new Date();
const DAY_STR = String(TODAY_DATE.getDate()).padStart(2, '0');
const MONTH_STR = String(TODAY_DATE.getMonth() + 1).padStart(2, '0');
const YEAR_STR = TODAY_DATE.getFullYear();
const TODAY_STR_ISO = `${YEAR_STR}-${MONTH_STR}-${DAY_STR}`;
const TODAY_STR = TODAY_STR_ISO;
const TODAY_STR_DISPLAY = `${DAY_STR}/${MONTH_STR}/${YEAR_STR}`;

function formatDateDisplay(dateStr) {
  if (!dateStr) return TODAY_STR_DISPLAY;
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  return dateStr;
}

const GAS_WEB_APP_URL = "http://127.0.0.1:5000/api/gas";

const ORG_NAME = "Little Princesses Organization - Specializing in Children's Garments";
const ORG_SHORT_TITLE = "Little Princesses Organisation | ERP 👑";

const PLATFORMS = [
  "انستغرام (Instagram)", "فيسبوك (Facebook)", "واتساب (WhatsApp)",
  "تيك توك (TikTok)", "سناب شات (Snapchat)", "تليجرام (Telegram)", "مباشر / زيارة المحل"
];

const CURRENCIES = ["YER ﷼", "SAR ﷼", "USD $"];

const FABRIC_CATEGORIES = ["أقمشة سهرة", "أقمشة فاخرة", "أقمشة خفيفة", "أقمشة مدرسية", "دانتيل وإكسسوارات", "مستلزمات خياطة"];

const PRODUCT_CATEGORIES = ["(Princess) فستان أميرة", "فساتين سهرة", "فساتين زفاف", "فساتين خطوبة", "زي مدرسي للأطفال"];

const FACTORY_STAGES = [
  "مرحلة القص والتحضير ✂️", "مرحلة الخياطة والتجميع 🪡",
  "مرحلة التطريز والتركيب 👑", "مرحلة الكي والتغليف 🎁", "جاهز للتسليم للعميلة ✨"
];

const EXPENSE_CATEGORIES = [
  "502 - إيجار الورشة والمعمل والمحل الرئيسي",
  "503 - كهرباء وماء وإنترنت واستضافة المتجر",
  "501 - أجور ورواتب الخياطين والمطرزين والعاملين",
  "504 - تسويق وإعلانات وممول التواصل الاجتماعي",
  "505 - مصاريف شحن وتغليف وأكياس المتجر",
  "506 - خسائر فروق أسعار الصرف"
];

const ACCOUNT_TYPES = ["أصول", "خصوم", "حقوق ملكية", "إيرادات", "تكلفة المبيعات", "مصروفات", "أخرى"];

const PAY_METHODS = ["نقد (كاش)", "حوالة بنكية", "آجل (على الحساب)"];

const INITIAL_ACCOUNTS = [
  // Root Groups (Level 1)
  { id: 1, code: "1", name: "الأصول", name_en: "Assets", account_type: "أصول", parent_id: null, level: 1, nature: "debit", is_group: 1, is_active: 1, balance: 0.0, acc_code: "1", acc_name: "الأصول", acc_type: "أصول" },
  { id: 2, code: "2", name: "الخصوم (الالتزامات)", name_en: "Liabilities", account_type: "خصوم", parent_id: null, level: 1, nature: "credit", is_group: 1, is_active: 1, balance: 0.0, acc_code: "2", acc_name: "الخصوم", acc_type: "خصوم" },
  { id: 3, code: "3", name: "حقوق الملكية", name_en: "Equity", account_type: "حقوق ملكية", parent_id: null, level: 1, nature: "credit", is_group: 1, is_active: 1, balance: 0.0, acc_code: "3", acc_name: "حقوق الملكية", acc_type: "حقوق ملكية" },
  { id: 4, code: "4", name: "الإيرادات", name_en: "Revenue", account_type: "إيرادات", parent_id: null, level: 1, nature: "credit", is_group: 1, is_active: 1, balance: 0.0, acc_code: "4", acc_name: "الإيرادات", acc_type: "إيرادات" },
  { id: 5, code: "5", name: "تكلفة المبيعات", name_en: "Cost of Sales", account_type: "تكلفة المبيعات", parent_id: null, level: 1, nature: "debit", is_group: 1, is_active: 1, balance: 0.0, acc_code: "5", acc_name: "تكلفة المبيعات", acc_type: "تكلفة المبيعات" },
  { id: 6, code: "6", name: "المصروفات", name_en: "Expenses", account_type: "مصروفات", parent_id: null, level: 1, nature: "debit", is_group: 1, is_active: 1, balance: 0.0, acc_code: "6", acc_name: "المصروفات", acc_type: "مصروفات" },

  // Posting Accounts (Level 2 & Currency Sub-Accounts)
  { id: 101, code: "101", name: "الصندوق / الخزينة الرئيسية (YER)", account_type: "أصول", parent_id: 1, level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0, created_date: TODAY_STR_DISPLAY, acc_code: "101", acc_name: "الصندوق / الخزينة الرئيسية (YER)", acc_type: "أصول", currency: "YER" },
  { id: 1012, code: "101.2", name: "صندوق الريال السعودي (SAR)", account_type: "أصول", parent_id: 1, level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0, created_date: TODAY_STR_DISPLAY, acc_code: "101.2", acc_name: "صندوق الريال السعودي (SAR)", acc_type: "أصول", currency: "SAR" },
  { id: 1013, code: "101.3", name: "صندوق الدولار الأمريكي (USD)", account_type: "أصول", parent_id: 1, level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0, created_date: TODAY_STR_DISPLAY, acc_code: "101.3", acc_name: "صندوق الدولار الأمريكي (USD)", acc_type: "أصول", currency: "USD" },
  { id: 102, code: "102", name: "مخزون الأقمشة والمستلزمات", account_type: "أصول", parent_id: 1, level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0, created_date: TODAY_STR_DISPLAY, acc_code: "102", acc_name: "مخزون الأقمشة والمستلزمات", acc_type: "أصول", currency: "YER" },
  { id: 103, code: "103", name: "الحساب البنكي / الحوالات والمحافظ (YER)", account_type: "أصول", parent_id: 1, level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0, created_date: TODAY_STR_DISPLAY, acc_code: "103", acc_name: "الحساب البنكي / الحوالات والمحافظ (YER)", acc_type: "أصول", currency: "YER" },
  { id: 1032, code: "103.2", name: "حساب بنكي بالريال السعودي (SAR)", account_type: "أصول", parent_id: 1, level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0, created_date: TODAY_STR_DISPLAY, acc_code: "103.2", acc_name: "حساب بنكي بالريال السعودي (SAR)", acc_type: "أصول", currency: "SAR" },
  { id: 1033, code: "103.3", name: "حساب بنكي بالدولار الأمريكي (USD)", account_type: "أصول", parent_id: 1, level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0, created_date: TODAY_STR_DISPLAY, acc_code: "103.3", acc_name: "حساب بنكي بالدولار الأمريكي (USD)", acc_type: "أصول", currency: "USD" },
  { id: 104, code: "104", name: "ذمم العملاء (مستحقات خارجية)", account_type: "أصول", parent_id: 1, level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0, created_date: TODAY_STR_DISPLAY, acc_code: "104", acc_name: "ذمم العملاء (مستحقات خارجية)", acc_type: "أصول", currency: "YER" },
  { id: 201, code: "201", name: "ذمم الموردين ومحلات الأقمشة (آجل)", account_type: "خصوم", parent_id: 2, level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0, created_date: TODAY_STR_DISPLAY, acc_code: "201", acc_name: "ذمم الموردين ومحلات الأقمشة (آجل)", acc_type: "خصوم", currency: "YER" },
  { id: 301, code: "301", name: "رأس المال المباشر لمؤسسة Little Princesses", account_type: "حقوق ملكية", parent_id: 3, level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0, created_date: TODAY_STR_DISPLAY, acc_code: "301", acc_name: "رأس المال المباشر لمؤسسة Little Princesses", acc_type: "حقوق ملكية", currency: "YER" },
  { id: 401, code: "401", name: "إيرادات مبيعات الفساتين والزي", account_type: "إيرادات", parent_id: 4, level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0, created_date: TODAY_STR_DISPLAY, acc_code: "401", acc_name: "إيرادات مبيعات الفساتين والزي", acc_type: "إيرادات", currency: "YER" },
  { id: 402, code: "402", name: "أرباح فروق أسعار الصرف", account_type: "إيرادات", parent_id: 4, level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0, created_date: TODAY_STR_DISPLAY, acc_code: "402", acc_name: "أرباح فروق أسعار الصرف", acc_type: "إيرادات", currency: "YER" },
  { id: 501, code: "501", name: "أجور ورواتب الخياطين والمطرزين", account_type: "مصاريف", parent_id: 6, level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0, created_date: TODAY_STR_DISPLAY, acc_code: "501", acc_name: "أجور ورواتب الخياطين والمطرزين", acc_type: "مصاريف", currency: "YER" },
  { id: 502, code: "502", name: "إيجار الورشة والمعمل والمحل الرئيسي", account_type: "مصاريف", parent_id: 6, level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0, created_date: TODAY_STR_DISPLAY, acc_code: "502", acc_name: "إيجار الورشة والمعمل والمحل الرئيسي", acc_type: "مصاريف", currency: "YER" },
  { id: 506, code: "506", name: "خسائر فروق أسعار الصرف", account_type: "مصاريف", parent_id: 6, level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0, created_date: TODAY_STR_DISPLAY, acc_code: "506", acc_name: "خسائر فروق أسعار الصرف", acc_type: "مصاريف", currency: "YER" }
];

// ── Universal Numeric & Currency Formatting Helpers (Western Tabular Numerals) ──
function formatNumber(val, decimals = 0) {
  if (val === null || val === undefined || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatCurrency(val, curr = null, decimals = undefined) {
  if (window.CurrencyService && typeof window.CurrencyService.format === 'function') {
    return window.CurrencyService.format(val, curr, decimals);
  }
  const formatted = formatNumber(val, decimals !== undefined ? decimals : 0);
  const symbol = (curr && (typeof curr === 'object' ? (curr.display || curr.symbol) : curr)) || 'YER ﷼';
  return `${formatted} ${symbol}`;
}

function formatPercent(val, decimals = 1) {
  if (val === null || val === undefined || val === '') return '0%';
  const num = Number(val);
  if (isNaN(num)) return '0%';
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals })}%`;
}

window.TODAY_DATE = TODAY_DATE;
window.DAY_STR = DAY_STR;
window.MONTH_STR = MONTH_STR;
window.YEAR_STR = YEAR_STR;
window.TODAY_STR_ISO = TODAY_STR_ISO;
window.TODAY_STR = TODAY_STR;
window.TODAY_STR_DISPLAY = TODAY_STR_DISPLAY;
window.formatDateDisplay = formatDateDisplay;
window.formatNumber = formatNumber;
window.formatCurrency = formatCurrency;
window.formatPercent = formatPercent;
window.GAS_WEB_APP_URL = GAS_WEB_APP_URL;
window.ORG_NAME = ORG_NAME;
window.ORG_SHORT_TITLE = ORG_SHORT_TITLE;
window.PLATFORMS = PLATFORMS;
window.CURRENCIES = CURRENCIES;
window.FABRIC_CATEGORIES = FABRIC_CATEGORIES;
window.PRODUCT_CATEGORIES = PRODUCT_CATEGORIES;
window.FACTORY_STAGES = FACTORY_STAGES;
window.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
window.ACCOUNT_TYPES = ACCOUNT_TYPES;
window.PAY_METHODS = PAY_METHODS;
window.INITIAL_ACCOUNTS = INITIAL_ACCOUNTS;
