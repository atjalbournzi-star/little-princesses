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
  "5111 - تكلفة الأقمشة والمواد المباعة (COGS)",
  "5121 - أجور خياطة وتصنيع مباشرة (Direct Wages)",
  "5211 - مصاريف تشغيل وصيانة الورشة (Workshop Opex)",
  "5221 - خسائر وفروقات عجز الجرد (Inventory Shrinkage)"
];

const ACCOUNT_TYPES = ["أصول", "خصوم", "حقوق ملكية", "إيرادات", "تكلفة المبيعات", "مصروفات", "أخرى"];

const PAY_METHODS = ["نقد (كاش)", "حوالة بنكية", "آجل (على الحساب)"];

const INITIAL_ACCOUNTS = [
  // ── 1. الأصول (Assets) ──
  { id: "ACC-1", code: "1", name: "الأصول", name_en: "Assets", account_type: "أصول", parent_id: null, level: 1, nature: "debit", is_group: 1, is_active: 1, balance: 0.0 },
  { id: "ACC-1111", code: "1111", name: "الصندوق الرئيسي", name_en: "Main Cash", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-1112", code: "1112", name: "البنك / الشبكة وPOS", name_en: "Bank & POS", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-1121", code: "1121", name: "عهد الورشة والمشغل", name_en: "Workshop Custody", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-1131", code: "1131", name: "ذمم العميلات", name_en: "Accounts Receivable", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-1141", code: "1141", name: "سلف الخياطين والعاملين", name_en: "Tailor Advances", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-1151", code: "1151", name: "مخزون الأقمشة والخامات", name_en: "Fabric Inventory", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-1152", code: "1152", name: "إنتاج تحت التشغيل (WIP)", name_en: "Work in Progress - WIP", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-1153", code: "1153", name: "مخزون الفساتين التامة", name_en: "Finished Dresses", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },

  // ── 2. الخصوم (Liabilities) ──
  { id: "ACC-2", code: "2", name: "الالتزامات (الخصوم)", name_en: "Liabilities", account_type: "خصوم", parent_id: null, level: 1, nature: "credit", is_group: 1, is_active: 1, balance: 0.0 },
  { id: "ACC-2111", code: "2111", name: "ذمم الموردين ومحلات الأقمشة", name_en: "Accounts Payable", account_type: "خصوم", parent_id: "2", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-2121", code: "2121", name: "دفعات مقدمة وعرابين حجز", name_en: "Customer Deposits", account_type: "خصوم", parent_id: "2", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-2131", code: "2131", name: "مستحقات وأجور الخياطين", name_en: "Accrued Tailor Wages", account_type: "خصوم", parent_id: "2", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },

  // ── 3. حقوق الملكية (Equity) ──
  { id: "ACC-3", code: "3", name: "حقوق الملكية", name_en: "Equity", account_type: "حقوق ملكية", parent_id: null, level: 1, nature: "credit", is_group: 1, is_active: 1, balance: 0.0 },
  { id: "ACC-3111", code: "3111", name: "رأس المال المباشر Little Princesses", name_en: "Paid Capital", account_type: "حقوق ملكية", parent_id: "3", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-3112", code: "3112", name: "الأرباح المبقاة / المحتجزة", name_en: "Retained Earnings", account_type: "حقوق ملكية", parent_id: "3", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },

  // ── 4. الإيرادات (Revenue) ──
  { id: "ACC-4", code: "4", name: "الإيرادات", name_en: "Revenue", account_type: "إيرادات", parent_id: null, level: 1, nature: "credit", is_group: 1, is_active: 1, balance: 0.0 },
  { id: "ACC-4111", code: "4111", name: "إيرادات تفصيل وتصميم الفساتين", name_en: "Custom Tailoring Revenue", account_type: "إيرادات", parent_id: "4", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-4121", code: "4121", name: "إيرادات مبيعات فساتين المعرض", name_en: "Showroom Sales", account_type: "إيرادات", parent_id: "4", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-4211", code: "4211", name: "أرباح تسويات المخزون", name_en: "Inventory Surplus Gain", account_type: "إيرادات", parent_id: "4", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },

  // ── 5. المصروفات وتكاليف الإنتاج (Expenses & Production) ──
  { id: "ACC-5", code: "5", name: "المصروفات وتكاليف الإنتاج", name_en: "Expenses & Production", account_type: "مصروفات", parent_id: null, level: 1, nature: "debit", is_group: 1, is_active: 1, balance: 0.0 },
  { id: "ACC-5111", code: "5111", name: "تكلفة الأقمشة والمواد المباعة", name_en: "Cost of Goods Sold", account_type: "تكلفة المبيعات", parent_id: "5", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-5121", code: "5121", name: "أجور خياطة وتصنيع مباشرة", name_en: "Direct Tailoring Wages", account_type: "تكلفة المبيعات", parent_id: "5", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-5211", code: "5211", name: "مصاريف تشغيل وصيانة الورشة", name_en: "Workshop Operating Expenses", account_type: "مصروفات", parent_id: "5", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
  { id: "ACC-5221", code: "5221", name: "خسائر وفروقات عجز الجرد", name_en: "Inventory Shrinkage / Loss", account_type: "مصروفات", parent_id: "5", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 }
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
