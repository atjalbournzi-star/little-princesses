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

function toStandardDigits(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[٠-٩]/g, c => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(c)]);
}

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];
const ARABIC_DAYS = [
  "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"
];

function formatDateDisplay(dateStr) {
  if (!dateStr) return TODAY_STR_DISPLAY;
  if (dateStr instanceof Date) {
    const d = String(dateStr.getDate()).padStart(2, '0');
    const m = String(dateStr.getMonth() + 1).padStart(2, '0');
    const y = dateStr.getFullYear();
    return `${d}/${m}/${y}`;
  }
  let s = toStandardDigits(String(dateStr).trim());
  if (s.includes('T')) s = s.split('T')[0];
  if (s.includes(' ')) s = s.split(' ')[0];
  if (s.includes('/')) {
    const p = s.split('/');
    if (p.length === 3) {
      if (p[0].length === 4) {
        return `${p[2].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[0]}`;
      }
      return `${p[0].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[2]}`;
    }
    return s;
  }
  const parts = s.split('-');
  if (parts.length === 3) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  return s;
}

function formatDateArabic(dateStr, withDayName = false) {
  if (!dateStr) return '';
  let d = null;
  if (dateStr instanceof Date) {
    d = dateStr;
  } else {
    let s = toStandardDigits(String(dateStr).trim());
    if (s.includes('T')) s = s.split('T')[0];
    if (s.includes(' ')) s = s.split(' ')[0];
    if (s.includes('-')) {
      const p = s.split('-');
      if (p.length === 3) d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    } else if (s.includes('/')) {
      const p = s.split('/');
      if (p.length === 3) {
        if (p[0].length === 4) d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
        else d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
      }
    }
  }
  if (!d || isNaN(d.getTime())) return formatDateDisplay(dateStr);
  const day = d.getDate();
  const month = ARABIC_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const dayName = ARABIC_DAYS[d.getDay()];
  return withDayName ? `${dayName}، ${day} ${month} ${year}` : `${day} ${month} ${year}`;
}

const GAS_WEB_APP_URL = "http://127.0.0.1:5000/api/gas";

const ORG_NAME = (typeof window !== 'undefined' && window.BrandService) 
  ? window.BrandService.getProfile().name 
  : "نظام الإدارة المتكامل الذكي | ERP Master";
const ORG_SHORT_TITLE = (typeof window !== 'undefined' && window.BrandService) 
  ? window.BrandService.getProfile().shortName 
  : "ERP Master 🏢";

const PLATFORMS = [
  "انستغرام (Instagram)", "فيسبوك (Facebook)", "واتساب (WhatsApp)",
  "تيك توك (TikTok)", "سناب شات (Snapchat)", "تليجرام (Telegram)", "مباشر / زيارة المحل"
];

const CURRENCIES = ["YER ﷼", "SAR ﷼", "USD $"];

const FABRIC_CATEGORIES = ["أقمشة سهرة", "أقمشة فاخرة", "أقمشة خفيفة", "أقمشة مدرسية", "دانتيل وإكسسوارات", "مستلزمات خياطة"];

const PRODUCT_CATEGORIES = ["فساتين وبدلات خاصة", "فساتين سهرة", "فساتين زفاف", "فساتين خطوبة", "زي مدرسي للأطفال"];

const FACTORY_STAGES = [
  "مرحلة القص والتحضير ✂️", "مرحلة الخياطة والتجميع 🪡",
  "مرحلة التطريز والتركيب والشك 🧵", "مرحلة الكي والتغليف 🎁", "جاهز للتسليم للعميلة ✨"
];

// ── CANONICAL TAILORING ORDER STAGES & STATE MACHINE (Single Source of Truth) ──
const TAILORING_STAGES = {
  DRAFT: "DRAFT",
  MEASURED: "MEASURED",
  CONFIRMED: "CONFIRMED",
  WAITING_MATERIAL: "WAITING_MATERIAL",
  CUTTING: "CUTTING",
  SEWING: "SEWING",
  FITTING: "FITTING",
  ALTERATION: "ALTERATION",
  FINISHING: "FINISHING",
  QUALITY_CHECK: "QUALITY_CHECK",
  READY: "READY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED"
};

const STAGE_LABELS = {
  DRAFT: "مسودة 📝",
  MEASURED: "تم أخذ المقاسات 📐",
  CONFIRMED: "مؤكد ومحجوز 🏷️",
  WAITING_MATERIAL: "بانتظار توفر الأقمشة ⏳",
  CUTTING: "مرحلة القص ✂️",
  SEWING: "قيد الخياطة 🪡",
  FITTING: "جلسة تجربة وقياس 👗",
  ALTERATION: "تعديل مقاسات ورتوش 🪡",
  FINISHING: "مرحلة التشطيب والشك 👑",
  QUALITY_CHECK: "فحص الجودة والمطابقة 🔍",
  READY: "جاهز للتسليم 🎁",
  DELIVERED: "تم التسليم للعميل ✔️",
  CANCELLED: "ملغي ❌"
};

const ORDER_STATUSES = Object.values(STAGE_LABELS);

const EXPENSE_CATEGORIES = [
  "5111 - تكلفة الأقمشة والمواد المباعة",
  "5121 - أجور خياطة وتصنيع مباشرة",
  "5211 - مصاريف تشغيل وصيانة الورشة",
  "5221 - خسائر وفروقات عجز الجرد"
];

const ACCOUNT_TYPES = ["أصول", "خصوم", "حقوق ملكية", "إيرادات", "تكلفة المبيعات", "مصروفات", "أخرى"];

const PAY_METHODS = ["نقد (كاش)", "حوالة بنكية", "آجل (على الحساب)"];

const INITIAL_ACCOUNTS = (typeof window !== 'undefined' && window.INITIAL_ACCOUNTS) 
  ? window.INITIAL_ACCOUNTS 
  : [];


// ── Universal Numeric & Currency Formatting Helpers (Western Tabular Numerals) ──

function formatNumber(val, decimals = 0) {
  if (val === null || val === undefined || val === '') return '0';
  if (typeof val === 'string' && /[٠-٩]/.test(val)) {
    val = toStandardDigits(val);
  }
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
window.formatDateArabic = formatDateArabic;
window.ARABIC_MONTHS = ARABIC_MONTHS;
window.ARABIC_DAYS = ARABIC_DAYS;
window.toStandardDigits = toStandardDigits;
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
window.TAILORING_STAGES = TAILORING_STAGES;
window.STAGE_LABELS = STAGE_LABELS;
window.ORDER_STATUSES = ORDER_STATUSES;
window.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
window.ACCOUNT_TYPES = ACCOUNT_TYPES;
window.PAY_METHODS = PAY_METHODS;
window.INITIAL_ACCOUNTS = INITIAL_ACCOUNTS;
