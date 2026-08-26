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
  // ── 1. الأصول (Assets) ──
  { id: "ACC-1", code: "1", name: "الأصول", name_en: "Assets", account_type: "أصول", parent_id: null, level: 1, nature: "debit", is_group: 1, is_active: 1, balance: 0.0 },
  { id: "ACC-101", code: "101", name: "الصندوق / الخزينة الرئيسية", name_en: "Main Cash", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 1, is_active: 1, balance: 0.0 },
  { id: "ACC-101.01", code: "101.01", name: "صندوق فرع الورشة والمعمل (صنعاء)", name_en: "Workshop Cash", account_type: "أصول", parent_id: "101", level: 3, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-101.02", code: "101.02", name: "صندوق محمد فلاح", name_en: "Mohammed Falah Cash", account_type: "أصول", parent_id: "101", level: 3, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-101.2", code: "101.2", name: "صندوق الريال السعودي (SAR)", name_en: "SAR Cash Box", account_type: "أصول", parent_id: "101", level: 3, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-101.3", code: "101.3", name: "صندوق الدولار الأمريكي (USD)", name_en: "USD Cash Box", account_type: "أصول", parent_id: "101", level: 3, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-102", code: "102", name: "مخزون الأقمشة والمستلزمات", name_en: "Inventory", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-103", code: "103", name: "الحساب البنكي / الحوالات والمحافظ", name_en: "Bank & Wallets", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-104", code: "104", name: "ذمم العملاء (مستحقات خارجية)", name_en: "Accounts Receivable", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-105", code: "105", name: "الأصول الثابتة (آلات ومعدات)", name_en: "Fixed Assets", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },

  // ── 2. الخصوم (Liabilities) ──
  { id: "ACC-2", code: "2", name: "الخصوم (الالتزامات)", name_en: "Liabilities", account_type: "خصوم", parent_id: null, level: 1, nature: "credit", is_group: 1, is_active: 1, balance: 0.0 },
  { id: "ACC-201", code: "201", name: "ذمم الموردين ومحلات الأقمشة (آجل)", name_en: "Accounts Payable", account_type: "خصوم", parent_id: "2", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-202", code: "202", name: "عرابين وأمانات العملاء", name_en: "Customer Deposits", account_type: "خصوم", parent_id: "2", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },

  // ── 3. حقوق الملكية (Equity) ──
  { id: "ACC-3", code: "3", name: "حقوق الملكية", name_en: "Equity", account_type: "حقوق ملكية", parent_id: null, level: 1, nature: "credit", is_group: 1, is_active: 1, balance: 0.0 },
  { id: "ACC-301", code: "301", name: "رأس المال المباشر لمؤسسة Little Princesses", name_en: "Capital", account_type: "حقوق ملكية", parent_id: "3", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-302", code: "302", name: "الأرباح المبقاة / المحتجزة", name_en: "Retained Earnings", account_type: "حقوق ملكية", parent_id: "3", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },

  // ── 4. الإيرادات (Revenue) ──
  { id: "ACC-4", code: "4", name: "الإيرادات", name_en: "Revenue", account_type: "إيرادات", parent_id: null, level: 1, nature: "credit", is_group: 1, is_active: 1, balance: 0.0 },
  { id: "ACC-401", code: "401", name: "إيرادات مبيعات الفساتين والزي", name_en: "Sales Revenue", account_type: "إيرادات", parent_id: "4", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-402", code: "402", name: "أرباح فروق أسعار صرف العملات", name_en: "Forex Gains", account_type: "إيرادات", parent_id: "4", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },

  // ── 5. تكلفة المبيعات (Cost of Sales) ──
  { id: "ACC-5", code: "5", name: "تكلفة المبيعات", name_en: "Cost of Sales", account_type: "تكلفة المبيعات", parent_id: null, level: 1, nature: "debit", is_group: 1, is_active: 1, balance: 0.0 },

  // ── 6. المصروفات (Expenses) ──
  { id: "ACC-6", code: "6", name: "المصروفات", name_en: "Expenses", account_type: "مصروفات", parent_id: null, level: 1, nature: "debit", is_group: 1, is_active: 1, balance: 0.0 },
  { id: "ACC-501", code: "501", name: "أجور ورواتب الخياطين والمطرزين", name_en: "Salaries & Wages", account_type: "مصروفات", parent_id: "6", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-502", code: "502", name: "إيجار الورشة والمعمل والمحل الرئيسي", name_en: "Workshop Rent", account_type: "مصروفات", parent_id: "6", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-503", code: "503", name: "إيجار المحل والورشة", name_en: "Shop Rent", account_type: "مصروفات", parent_id: "6", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-504", code: "504", name: "مصاريف كهرباء وماء وإنترنت", name_en: "Utilities", account_type: "مصروفات", parent_id: "6", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-505", code: "505", name: "مصاريف التسويق والإعلانات الممولة", name_en: "Marketing", account_type: "مصروفات", parent_id: "6", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-506", code: "506", name: "خسائر فروق أسعار صرف العملات", name_en: "Forex Losses", account_type: "مصروفات", parent_id: "6", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },

  // ── 7. حسابات أخرى ──
  { id: "ACC-7", code: "7", name: "حسابات أخرى", name_en: "Other Accounts", account_type: "أخرى", parent_id: null, level: 1, nature: "debit", is_group: 1, is_active: 1, balance: 0.0 }
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
