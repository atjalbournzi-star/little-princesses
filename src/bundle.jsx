var { useState, useEffect, useCallback, useMemo, useRef } = React;

// === FILE: src/config/constants.js ===
const TODAY_STR = TODAY_STR_ISO;
const TODAY_DATE = new Date();
const DAY_STR = String(TODAY_DATE.getDate()).padStart(2, '0');
const MONTH_STR = String(TODAY_DATE.getMonth() + 1).padStart(2, '0');
const YEAR_STR = TODAY_DATE.getFullYear();
const TODAY_STR_ISO = `${YEAR_STR}-${MONTH_STR}-${DAY_STR}`;
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

const CURRENCIES = ["USD $", "YER ﷼", "SAR ﷼"];

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
  "505 - مصاريف شحن وتغليف وأكياس المتجر"
];

const ACCOUNT_TYPES = ["أصول", "خصوم", "حقوق ملكية", "إيرادات", "مصاريف"];

const PAY_METHODS = ["نقد (كاش)", "حوالة بنكية", "آجل (على الحساب)"];

const INITIAL_ACCOUNTS = [
  { acc_code: "101", acc_name: "الصندوق / الخزينة الرئيسية", acc_type: "أصول", balance: 0.0, created_date: TODAY_STR_DISPLAY },
  { acc_code: "102", acc_name: "مخزون الأقمشة والمستلزمات", acc_type: "أصول", balance: 0.0, created_date: TODAY_STR_DISPLAY },
  { acc_code: "103", acc_name: "الحساب البنكي / الحوالات والمحافظ", acc_type: "أصول", balance: 0.0, created_date: TODAY_STR_DISPLAY },
  { acc_code: "104", acc_name: "ذمم العملاء (مستحقات خارجية)", acc_type: "أصول", balance: 0.0, created_date: TODAY_STR_DISPLAY },
  { acc_code: "201", acc_name: "ذمم الموردين ومحلات الأقمشة (آجل)", acc_type: "خصوم", balance: 0.0, created_date: TODAY_STR_DISPLAY },
  { acc_code: "301", acc_name: "رأس المال المباشر لمؤسسة Little Princesses", acc_type: "حقوق ملكية", balance: 0.0, created_date: TODAY_STR_DISPLAY },
  { acc_code: "401", acc_name: "إيرادات مبيعات الفساتين والزي", acc_type: "إيرادات", balance: 0.0, created_date: TODAY_STR_DISPLAY },
  { acc_code: "501", acc_name: "أجور ورواتب الخياطين والمطرزين", acc_type: "مصاريف", balance: 0.0, created_date: TODAY_STR_DISPLAY },
  { acc_code: "502", acc_name: "إيجار الورشة والمعمل والمحل الرئيسي", acc_type: "مصاريف", balance: 0.0, created_date: TODAY_STR_DISPLAY }
];


// === FILE: src/config/useCurrency.js ===
// ============================================================
// useCurrency.js — Global Currency State (localStorage + Events)
// ============================================================

var CURRENCY_STORAGE_KEY = 'erp_system_currency';
var CURRENCY_CHANGE_EVENT = 'erp:currencyChanged';

var SYSTEM_CURRENCY_OPTIONS = [
  { code: 'USD', symbol: '$',  label: 'دولار أمريكي',  display: 'USD $' },
  { code: 'YER', symbol: '﷼', label: 'ريال يمني',    display: 'YER ﷼' },
  { code: 'SAR', symbol: '﷼', label: 'ريال سعودي',   display: 'SAR ﷼' }
];

function getStoredCurrency() {
  try {
    var stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (stored) {
      var found = SYSTEM_CURRENCY_OPTIONS.find(function(c) { return c.code === stored; });
      if (found) return found;
    }
  } catch (e) {}
  return SYSTEM_CURRENCY_OPTIONS[0];
}

function setStoredCurrency(code) {
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, code);
    window.dispatchEvent(new CustomEvent(CURRENCY_CHANGE_EVENT, { detail: { code: code } }));
  } catch (e) {}
}

function useCurrency() {
  var pair = useState(getStoredCurrency);
  var currency = pair[0];
  var setCurrency = pair[1];

  useEffect(function() {
    function handleChange(e) {
      var found = SYSTEM_CURRENCY_OPTIONS.find(function(c) { return c.code === e.detail.code; });
      if (found) setCurrency(found);
    }
    window.addEventListener(CURRENCY_CHANGE_EVENT, handleChange);
    return function() { window.removeEventListener(CURRENCY_CHANGE_EVENT, handleChange); };
  }, []);

  function updateCurrency(code) {
    var found = SYSTEM_CURRENCY_OPTIONS.find(function(c) { return c.code === code; });
    if (found) {
      setCurrency(found);
      setStoredCurrency(code);
    }
  }

  return { currency: currency, updateCurrency: updateCurrency, SYSTEM_CURRENCY_OPTIONS: SYSTEM_CURRENCY_OPTIONS };
}


// === FILE: src/services/api.js ===
// GAS is called via our local Python server proxy (/api/gas) to bypass CORS.
// The Python server forwards the request to Google Apps Script server-side.
const GAS_PROXY_URL = window.location.origin + '/api/gas';

async function callGAS(action, payload = {}) {
  const body = JSON.stringify({ action, data: payload, ...payload });
  console.log("[GAS PROXY] Calling action:", action);

  const res = await fetch(GAS_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "No response body");
    console.error("[GAS PROXY] HTTP Error:", res.status, errText);
    throw new Error(`Proxy HTTP ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  console.log("[GAS PROXY] Response:", json);

  if (json && json.success === false) {
    throw new Error(json.error || json.message || "GAS returned success:false");
  }

  return json;
}


async function loadAllData() {
  try {
    const [cRes, iRes, aRes, pRes, oRes, puRes, fRes, vRes, eRes, jRes] = await Promise.allSettled([
      callGAS("getCustomers"),
      callGAS("getInventory"),
      callGAS("getAccounts"),
      callGAS("getProducts"),
      callGAS("getOrders"),
      callGAS("getPurchases"),
      callGAS("getFactory"),
      callGAS("getVouchers"),
      callGAS("getExpenses"),
      callGAS("getJournalEntries")
    ]);

    return {
      customers: (cRes.status === "fulfilled" && cRes.value?.data && Array.isArray(cRes.value.data)) ? cRes.value.data : [],
      inventory: (iRes.status === "fulfilled" && iRes.value?.data && Array.isArray(iRes.value.data)) ? iRes.value.data : [],
      accounts: (aRes.status === "fulfilled" && aRes.value?.data && Array.isArray(aRes.value.data) && aRes.value.data.length > 0) ? aRes.value.data : (typeof INITIAL_ACCOUNTS !== 'undefined' ? INITIAL_ACCOUNTS : []),
      products: (pRes.status === "fulfilled" && pRes.value?.data && Array.isArray(pRes.value.data)) ? pRes.value.data : [],
      orders: (oRes.status === "fulfilled" && oRes.value?.data && Array.isArray(oRes.value.data)) ? oRes.value.data : [],
      purchases: (puRes.status === "fulfilled" && puRes.value?.data && Array.isArray(puRes.value.data)) ? puRes.value.data : [],
      factory: (fRes.status === "fulfilled" && fRes.value?.data && Array.isArray(fRes.value.data)) ? fRes.value.data : [],
      vouchers: (vRes.status === "fulfilled" && vRes.value?.data && Array.isArray(vRes.value.data)) ? vRes.value.data : [],
      expenses: (eRes.status === "fulfilled" && eRes.value?.data && Array.isArray(eRes.value.data)) ? eRes.value.data : [],
      journal: (jRes.status === "fulfilled" && jRes.value?.data && Array.isArray(jRes.value.data)) ? jRes.value.data : []
    };
  } catch (err) {
    console.warn("loadAllData failed:", err);
    return {};
  }
}

window.callGAS = callGAS;
window.loadAllData = loadAllData;


// === FILE: src/components/Icons.jsx ===
const Icons = {
  Dashboard: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Users: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Calculator: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  ShoppingBag: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  Purchases: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  ),
  Scissors: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 0A3 3 0 104.5 4.5a3 3 0 004.621 4.621zM9.121 14.879A3 3 0 104.5 19.5a3 3 0 004.621-4.621z" />
    </svg>
  ),
  Accounts: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Factory: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Vouchers: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Expenses: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Journal: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Reports: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
};

// Aliases for subagent lowercase references
Icons.dashboard = Icons.Dashboard;
Icons.users = Icons.Users;
Icons.cart = Icons.ShoppingBag;
Icons.box = Icons.Scissors;
Icons.factory = Icons.Factory;
Icons.briefcase = Icons.Accounts;
Icons.receipt = Icons.Vouchers;
Icons.chart = Icons.Reports;
Icons.settings = Icons.Settings;


// === FILE: src/components/Toast.jsx ===
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const msgText = typeof toast === 'object' ? (toast.message || String(toast)) : String(toast);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] p-4 rounded-2xl shadow-2xl bg-slate-900 text-amber-300 border border-purple-500/40 flex items-center justify-between text-xs font-bold animate-fadeIn">
      <span className="flex items-center gap-2">✨ {msgText}</span>
      <button onClick={onClose} className="text-white hover:text-amber-400 font-black px-2 text-sm">✕</button>
    </div>
  );
}


// === FILE: src/components/Header.jsx ===
function Header({ activeTab, setActiveTab, allTabs, menuDrawer, setMenuDrawer }) {
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleDropdown = (name) => setOpenDropdown(prev => prev === name ? null : name);
  const closeDropdowns = () => setOpenDropdown(null);

  const prodTabs = [
    { id: 'inventory', label: 'المخزون الخام', icon: Icons.Scissors },
    { id: 'factory', label: 'متابعة الورشة والإنتاج', icon: Icons.Factory }
  ];

  const finTabs = [
    { id: 'purchases', label: 'المشتريات والتوريد', icon: Icons.Purchases },
    { id: 'vouchers', label: 'السندات المالية', icon: Icons.Vouchers },
    { id: 'expenses', label: 'المصاريف التشغيلية', icon: Icons.Expenses },
    { id: 'accounts', label: 'شجرة الحسابات', icon: Icons.Accounts },
    { id: 'journal', label: 'القيود اليومية', icon: Icons.Journal },
    { id: 'reports', label: 'التقارير المالية', icon: Icons.Reports }
  ];

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-slate-950 via-purple-950 to-indigo-950 shadow-xl border-b border-purple-900/50 backdrop-blur-md" dir="rtl">
      <div className="flex items-center justify-between px-4 py-3 md:px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMenuDrawer(!menuDrawer)}
            className="p-2.5 rounded-2xl bg-white/10 text-white border border-white/15 md:hidden min-h-[44px]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuDrawer ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
          
          <div className="flex flex-col">
            <h1 className="text-base md:text-xl font-black text-amber-300 drop-shadow-sm flex items-center gap-2">
              <span>👑</span> مؤسسة الأميرات الصغيرات | ERP
            </h1>
            <span className="text-[10px] md:text-xs font-bold text-purple-200/90 tracking-wide">
              متخصصون في فساتين وأزياء الأطفال الفاخرة
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/40 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-300 shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>متصل سحابياً 🟢</span>
          </div>
        </div>
      </div>

      {menuDrawer && (
        <div className="md:hidden border-t border-purple-800/60 bg-indigo-950/95 backdrop-blur-xl p-4 animate-fadeIn">
          <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
            {allTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMenuDrawer(false); }}
                className={`flex items-center gap-2.5 p-3 rounded-2xl text-xs font-bold min-h-[44px] ${activeTab === tab.id ? 'bg-rose-600 text-white font-black' : 'bg-purple-900/60 text-purple-100'}`}
              >
                {typeof tab.icon === 'function' ? tab.icon() : tab.icon}
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Streamlined Desktop Dropdown Navigation */}
      <div className="hidden md:block border-t border-purple-800/40 bg-purple-950/90 py-2.5 px-6">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full relative">
          
          <button onClick={() => { setActiveTab('dashboard'); closeDropdowns(); }} className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all min-h-[42px] border ${activeTab === 'dashboard' ? 'bg-rose-600 text-white border-rose-500 shadow font-black' : 'bg-white/5 text-purple-100 border-white/10 hover:bg-white/15'}`}>
            {Icons.Dashboard()}<span>الرئيسية</span>
          </button>

          <button onClick={() => { setActiveTab('customers'); closeDropdowns(); }} className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all min-h-[42px] border ${activeTab === 'customers' ? 'bg-rose-600 text-white border-rose-500 shadow font-black' : 'bg-white/5 text-purple-100 border-white/10 hover:bg-white/15'}`}>
            {Icons.Users()}<span>العملاء والمقاسات</span>
          </button>

          <button onClick={() => { setActiveTab('products'); closeDropdowns(); }} className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all min-h-[42px] border ${activeTab === 'products' ? 'bg-rose-600 text-white border-rose-500 shadow font-black' : 'bg-white/5 text-purple-100 border-white/10 hover:bg-white/15'}`}>
            {Icons.Calculator()}<span>المنتجات والتسعير</span>
          </button>

          <button onClick={() => { setActiveTab('orders'); closeDropdowns(); }} className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all min-h-[42px] border ${activeTab === 'orders' ? 'bg-rose-600 text-white border-rose-500 shadow font-black' : 'bg-white/5 text-purple-100 border-white/10 hover:bg-white/15'}`}>
            {Icons.ShoppingBag()}<span>الطلبات والفواتير</span>
          </button>

          {/* Production Dropdown */}
          <div className="relative">
            <button onClick={() => toggleDropdown('production')} className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all min-h-[42px] border ${['inventory', 'factory'].includes(activeTab) ? 'bg-purple-800 text-white border-purple-500 shadow font-black' : 'bg-white/5 text-purple-100 border-white/10 hover:bg-white/15'}`}>
              {Icons.Factory()}<span>المخزون والإنتاج</span><span className="text-[10px]">▾</span>
            </button>

            {openDropdown === 'production' && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-purple-700/60 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn space-y-1">
                {prodTabs.map(t => (
                  <button key={t.id} onClick={() => { setActiveTab(t.id); closeDropdowns(); }} className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${activeTab === t.id ? 'bg-rose-600 text-white font-black' : 'text-purple-100 hover:bg-purple-800'}`}>
                    {typeof t.icon === 'function' ? t.icon() : t.icon}<span>{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Financials Dropdown */}
          <div className="relative">
            <button onClick={() => toggleDropdown('financials')} className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all min-h-[42px] border ${['purchases', 'vouchers', 'expenses', 'accounts', 'journal', 'reports'].includes(activeTab) ? 'bg-purple-800 text-white border-purple-500 shadow font-black' : 'bg-white/5 text-purple-100 border-white/10 hover:bg-white/15'}`}>
              {Icons.Accounts()}<span>المالية والحسابات</span><span className="text-[10px]">▾</span>
            </button>

            {openDropdown === 'financials' && (
              <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-purple-700/60 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn space-y-1">
                {finTabs.map(t => (
                  <button key={t.id} onClick={() => { setActiveTab(t.id); closeDropdowns(); }} className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${activeTab === t.id ? 'bg-rose-600 text-white font-black' : 'text-purple-100 hover:bg-purple-800'}`}>
                    {typeof t.icon === 'function' ? t.icon() : t.icon}<span>{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => { setActiveTab('settings'); closeDropdowns(); }} className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all min-h-[42px] border ${activeTab === 'settings' ? 'bg-rose-600 text-white border-rose-500 shadow font-black' : 'bg-white/5 text-purple-100 border-white/10 hover:bg-white/15'}`}>
            {Icons.Settings()}<span>الإعدادات</span>
          </button>

        </div>
      </div>
    </header>
  );
}


// === FILE: src/components/MobileNav.jsx ===
function MobileNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: Icons.Dashboard },
    { id: 'customers', label: 'العملاء', icon: Icons.Users },
    { id: 'purchases', label: 'المشتريات', icon: Icons.Purchases },
    { id: 'factory', label: 'الورشة', icon: Icons.Factory }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 w-full z-40 bg-slate-950/90 backdrop-blur-lg border-t border-purple-900/50 pb-safe">
      <div className="flex items-center justify-around p-2">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-tr from-purple-600/20 to-indigo-600/20 text-amber-300 scale-105' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className={`${isActive ? 'animate-bounce-slight' : ''}`}>
                <item.icon />
              </div>
              <span className={`text-[10px] font-bold mt-1 ${isActive ? 'text-amber-300' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}


// === FILE: src/features/Dashboard.jsx ===
function Dashboard({ setActiveTab }) {
  const cards = [
    {
      id: "customers",
      title: "إدارة العملاء والمقاسات",
      desc: "تسجيل بيانات العملاء ومقاسات الجسم التفصيلية",
      icon: Icons.Users,
      bgClass: "bg-purple-50/90 hover:bg-purple-100 border-purple-200 text-purple-950"
    },
    {
      id: "factory",
      title: "متابعة الورشة والإنتاج",
      desc: "إسناد المراحل للورشة ومتابعة نسب الإنجاز الخياطة",
      icon: Icons.Factory,
      bgClass: "bg-amber-50/90 hover:bg-amber-100 border-amber-200 text-amber-950"
    },
    {
      id: "purchases",
      title: "المشتريات والتوريد",
      desc: "تسديد المشتريات والربط التلقائي بمخزون أقمشة الأطفال",
      icon: Icons.Purchases,
      bgClass: "bg-indigo-50/90 hover:bg-indigo-100 border-indigo-200 text-indigo-950"
    },
    {
      id: "vouchers",
      title: "السندات والمعاملات المالية",
      desc: "إصدار السندات المالية والربط بشجرة الحسابات",
      icon: Icons.Vouchers,
      bgClass: "bg-emerald-50/90 hover:bg-emerald-100 border-emerald-200 text-emerald-950"
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn text-xs" dir="rtl">
      {/* Main Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-purple-950 to-indigo-950 text-white p-6 md:p-8 rounded-3xl shadow-xl border border-purple-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-extrabold px-3 py-1 rounded-full inline-block mb-2">
              اللوحة التنفيذية الموحدة 👑
            </span>
            <h1 className="text-xl md:text-2xl font-black text-amber-300 leading-snug">
              مؤسسة الأميرات الصغيرات - المتخصصة في أزياء الأطفال
            </h1>
            <p className="text-xs md:text-sm text-purple-200 mt-1.5 font-semibold">
              إدارة العمليات الإنتاجية والمحاسبية والمقاسات الذكية
            </p>
          </div>

          <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 rounded-2xl text-xs font-black text-amber-200 shadow-inner shrink-0 min-h-[44px]">
            {Icons.Calendar()}
            <span>تاريخ اليوم: {TODAY_STR_DISPLAY}</span>
          </div>
        </div>
      </div>

      {/* Refined Quick Access Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={() => setActiveTab(card.id)}
            className={`group cursor-pointer p-5 rounded-3xl border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 ${card.bgClass}`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-white shadow-sm group-hover:scale-110 transition-transform">
                  {typeof card.icon === 'function' ? card.icon() : card.icon}
                </div>
              </div>

              <h3 className="text-base font-black text-slate-900 group-hover:text-rose-950 transition-colors leading-snug">
                {card.title}
              </h3>
              <p className="text-[11.5px] font-medium text-slate-600 mt-1.5 leading-relaxed">
                {card.desc}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs font-black text-rose-700">
              <span className="inline-flex items-center gap-1.5 group-hover:text-rose-900 transition-colors">
                الانتقال للقسم ←
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ============================================================
// Customers.jsx - قسم العملاء والمقاسات والحسابات
// Three integrated sections: Info + Measurements + Ledger
// ============================================================

// ============================================================
// Customers.jsx - قسم العملاء والمقاسات والحسابات
// Three integrated sections: Info + Measurements + Ledger
// ============================================================

// === FILE: src/features/JobCardModal.jsx ===
const JobCardModal = ({ customer, onClose }) => {
  if (!customer) return null;

  const handlePrint = () => {
    window.print();
  };
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 print:bg-white print:z-auto backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl relative flex flex-col my-auto print:shadow-none print:m-0 print:w-full">
        {/* Header */}
        <div className="p-6 border-b print:hidden flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-800">بطاقة المعمل والقص (Work Order)</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">طباعة (Print)</button>
            <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">إغلاق</button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="p-8 print:p-0" dir="rtl">
          <div className="flex justify-between items-start mb-8 border-b-2 border-indigo-900 pb-4">
            <div>
              <h1 className="text-3xl font-black text-indigo-900 mb-2">مؤسسة الأميرات الصغيرات</h1>
              <p className="text-lg text-slate-600 font-semibold">بطاقة أمر تشغيل ومعمل (Work Order Job Card)</p>
            </div>
            <div className="text-left">
              <p className="text-sm text-slate-500 mb-1">تاريخ الطلب: {customer.reg_date}</p>
              <p className="text-sm text-slate-500 mb-1">العميل: {customer.name}</p>
              <p className="text-lg font-bold text-indigo-900 border border-indigo-200 px-3 py-1 rounded-lg bg-indigo-50 mt-2">طلب رقم: {customer.customer_id}</p>
            </div>
          </div>

          <div className="space-y-12">
            {customer.measurements && customer.measurements.map((m, idx) => (
              <div key={idx} className="border-2 border-slate-200 rounded-xl p-6 bg-slate-50 break-inside-avoid">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                  <h3 className="text-2xl font-bold text-slate-800 bg-white px-4 py-1 rounded-lg shadow-sm border border-slate-200">
                    الطفلة: {m.child_name || 'غير محدد'}
                  </h3>
                  <div className="flex gap-4">
                    <div className="text-center bg-white p-2 rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-500 mb-1">موعد التسليم</p>
                      <p className="font-bold text-red-600">{m.event_date || 'غير محدد'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-center">
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">الطول الكلي</p>
                    <p className="font-bold text-lg">{m.total_height || '-'} {m.unit}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">طول الفستان</p>
                    <p className="font-bold text-lg">{m.dress_length || '-'} {m.unit}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">محيط الصدر</p>
                    <p className="font-bold text-lg">{m.chest_circ || '-'} {m.unit}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">محيط الخصر</p>
                    <p className="font-bold text-lg">{m.waist_circ || '-'} {m.unit}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">طول الصدر</p>
                    <p className="font-bold text-lg">{m.chest_length || '-'} {m.unit}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">طول التنورة</p>
                    <p className="font-bold text-lg">{m.skirt_length || '-'} {m.unit}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">طول الكم</p>
                    <p className="font-bold text-lg">{m.sleeve_length || '-'} {m.unit}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">عرض الكتفين</p>
                    <p className="font-bold text-lg">{m.shoulder_width || '-'} {m.unit}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Comfort Profile */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                    <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      تفضيلات الراحة والأقمشة
                    </h4>
                    {m.comfort_profile && m.comfort_profile.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {m.comfort_profile.map((pref, i) => (
                          <span key={i} className="px-3 py-1 bg-white border border-indigo-200 text-indigo-700 text-sm font-medium rounded-full shadow-sm">
                            {pref}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm italic">لا توجد تفضيلات محددة</p>
                    )}
                  </div>

                  {/* Sewing Notes */}
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <h4 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      ملاحظات الخياطة
                    </h4>
                    <p className="text-slate-700 whitespace-pre-wrap">{m.sewing_notes || <span className="text-slate-500 text-sm italic">لا توجد ملاحظات إضافية</span>}</p>
                  </div>
                </div>

                {/* Tracking QR Code */}
                <div className="mt-6 flex justify-end">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent('رقم الطلب: ' + customer.customer_id + '\nالطفلة: ' + (m.child_name || ''))}`} alt="QR Code" className="w-20 h-20 rounded-lg border-2 border-slate-200" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center border-t-2 border-slate-200 pt-4 pb-4">
             <p className="text-slate-500 text-sm">مؤسسة الأميرات الصغيرات للأزياء - يرجى تسليم القطعة للمشرف بعد الانتهاء من العمل.</p>
          </div>
        </div>
      </div>
    </div>
  );
};


// === FILE: src/features/InvoiceModal.jsx ===
function InvoiceModal({ customer, onClose }) {
  if (!customer) return null;

  const { ledger = {}, measurements = [] } = customer;
  const qrText = 'رقم الفاتورة: ' + customer.customer_id + '\\nالعميل: ' + customer.name + '\\nالمتبقي: ' + (ledger.remaining || 0) + ' YER';
  const qrData = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrText)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const text = 'مرحباً ' + customer.name + '،\\n\\nنشكركم لاختيار مؤسسة الأميرات الصغيرات للأزياء الفاخرة.\\n\\nرقم الفاتورة: ' + customer.customer_id + '\\nإجمالي المبيعات: ' + (ledger.total_sales || 0) + '\\nكلفة التوصيل: ' + (ledger.delivery || 0) + '\\nالعربون المدفوع: ' + (ledger.deposit || 0) + '\\n*المبلغ المتبقي: ' + (ledger.remaining || 0) + '*\\n\\nنسعد بخدمتكم دائماً! 👑';
    const url = `https://wa.me/${String(customer.phone||'').replace(/^0+/, '967').replace(/\\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:p-0 print:bg-white print:block">
      
      {/* Container */}
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-w-none print:rounded-none print:shadow-none print:max-h-none print:overflow-visible relative">
        
        {/* Close Button (Hidden in Print) */}
        <button onClick={onClose} className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full transition z-10 print:hidden">
          ✕
        </button>

        <div className="overflow-y-auto print:overflow-visible p-8 sm:p-10">
          
          {/* Header */}
          <div className="border-b-4 border-rose-900 pb-6 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-black text-rose-900 mb-1">مؤسسة الأميرات الصغيرات</h1>
              <p className="text-sm font-bold text-slate-500 tracking-wider">لـلأزيـاء الفــاخـــرة 👑</p>
            </div>
            <div className="text-left">
              <div className="inline-block bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 text-rose-900">
                <p className="text-xs font-bold text-rose-700 mb-1">فاتورة إلكترونية / INVOICE</p>
                <p className="text-lg font-black font-mono">{customer.customer_id}</p>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100 print:border-none print:bg-transparent print:p-0">
            <div>
              <p className="text-[10px] font-black text-slate-400 mb-1">بيانات العميل / CUSTOMER INFO</p>
              <h3 className="text-lg font-black text-slate-800">{customer.name}</h3>
              <p className="text-sm font-bold text-slate-600 flex items-center gap-2 mt-1">📞 {customer.phone}</p>
              <p className="text-sm font-bold text-slate-600 flex items-center gap-2 mt-1">📍 {customer.city} {customer.street ? `- ${customer.street}` : ''}</p>
            </div>
            <div className="sm:text-left">
              <p className="text-[10px] font-black text-slate-400 mb-1">تواريخ الفاتورة / DATES</p>
              <div className="space-y-2 mt-1">
                <p className="text-sm font-bold text-slate-600"><span className="inline-block w-24 text-slate-400">تاريخ الإصدار:</span> {customer.reg_date || customer.ledger?.updated_at || '—'}</p>
                <p className="text-sm font-bold text-slate-600"><span className="inline-block w-24 text-slate-400">الاستلام المتوقع:</span> {measurements[0]?.event_date || 'غير محدد'}</p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mb-8 rounded-2xl overflow-hidden border border-slate-200 print:border-none">
            <table className="w-full text-sm">
              <thead className="bg-rose-900 text-white">
                <tr>
                  <th className="py-3 px-4 text-right font-black">البيان / تفاصيل الفستان</th>
                  <th className="py-3 px-4 text-center font-black">الكمية</th>
                  <th className="py-3 px-4 text-right font-black">الإجمالي (غير شامل التوصيل)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {measurements.map((m, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="py-4 px-4">
                      <p className="font-black text-slate-800 text-base mb-1">فستان فاخر - تفصيل خاص</p>
                      <p className="text-xs font-bold text-slate-500">👧 الطفلة: {m.child_name || 'غير مسجل'}</p>
                      <p className="text-[10px] text-slate-400 mt-1">المقاسات: (الطول: {m.total_height||'-'} | الصدر: {m.chest_circ||'-'} | الخصر: {m.waist_circ||'-'})</p>
                    </td>
                    <td className="py-4 px-4 text-center font-black text-slate-700">1</td>
                    {idx === 0 ? (
                      <td rowSpan={measurements.length} className="py-4 px-4 text-right font-black text-lg text-slate-800 align-top border-r border-slate-100">
                        {ledger.total_sales || 0} <span className="text-xs text-slate-500">YER</span>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="flex flex-col sm:flex-row gap-6 mb-8">
            <div className="flex-1 print:hidden">
              {/* Optional notes block could go here */}
            </div>
            <div className="w-full sm:w-80 bg-slate-900 text-white p-6 rounded-2xl shadow-xl print:shadow-none print:border print:border-slate-800 print:text-black print:bg-transparent">
              <p className="text-[10px] font-black text-slate-400 mb-4 print:text-slate-500">ملخص الحساب / FINANCIAL SUMMARY</p>
              <div className="space-y-3 text-sm font-bold">
                <div className="flex justify-between">
                  <span className="text-slate-300 print:text-slate-600">إجمالي الفساتين:</span>
                  <span>{ledger.total_sales || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300 print:text-slate-600">رسوم التوصيل:</span>
                  <span>{ledger.delivery || 0}</span>
                </div>
                <div className="flex justify-between border-b border-slate-700 print:border-slate-200 pb-3">
                  <span className="text-slate-300 print:text-slate-600">العربون المدفوع:</span>
                  <span className="text-emerald-400 print:text-emerald-700">-{ledger.deposit || 0}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-base text-rose-200 print:text-rose-900 font-black">المبلغ المتبقي:</span>
                  <span className="text-2xl font-black text-white print:text-black">{ledger.remaining || 0} <span className="text-xs font-bold">YER</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer & QR */}
          <div className="border-t-2 border-dashed border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-right">
              <p className="text-base font-black text-rose-900 mb-2">شكراً لاختياركم مؤسسة الأميرات الصغيرات</p>
              <p className="text-xs font-bold text-slate-500">" ننسج أحلام أميرتكم بحب وعناية فائقة 🎀 "</p>
            </div>
            <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm print:border-none print:shadow-none">
              <img src={qrData} alt="QR Code" className="w-20 h-20" />
            </div>
          </div>

        </div>

        {/* Actions (Hidden in Print) */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex gap-3 justify-end print:hidden">
          <button onClick={handleWhatsApp} className="px-5 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-black text-sm rounded-xl transition flex items-center gap-2">
            📱 إرسال واتساب
          </button>
          <button onClick={handlePrint} className="px-5 py-2.5 bg-rose-900 hover:bg-rose-800 text-white font-black text-sm rounded-xl transition shadow-lg shadow-rose-900/30 flex items-center gap-2">
            🖨️ طباعة / حفظ PDF
          </button>
        </div>

      </div>
    </div>
  );
}


// === FILE: src/features/Customers.jsx ===
// ============================================================
// Customers.jsx - قسم العملاء والمقاسات والحسابات
// Three integrated sections: Info + Measurements + Ledger
// ============================================================

function Customers({ customers = [], setCustomers, showToast }) {

  // ── توليد Customer ID تلقائياً ──
  const genCustId = () => {
    const lastNum = (customers || []).reduce((acc, c) => {
      const match = String(c.customer_id || '').match(/CUST-(\d+)/);
      return match ? Math.max(acc, parseInt(match[1])) : acc;
    }, 1000);
    return `CUST-${lastNum + 1}`;
  };

  // ── حالات القسم الأول: بيانات العميل ──
  const [custId]      = useState(genCustId);
  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');
  const [phoneAlt, setPhoneAlt]   = useState('');
  const [platform, setPlatform]   = useState('واتساب (WhatsApp)');
  const [handle, setHandle]       = useState('');
  const [city, setCity]           = useState('');
  const [street, setStreet]       = useState('');
  const [category, setCategory]   = useState('جديد');
  const [regDate, setRegDate]     = useState(TODAY_STR_ISO);
  const [notes, setNotes]         = useState('');

  // ── حالات القسم الثاني: مقاسات الأطفال (متعددة) ──

  const isOlderThan90Days = (dateStr) => {
    if (!dateStr) return false;
    const diff = (new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24);
    return diff > 90;
  };

  const emptyMeasurement = () => ({
    id: Date.now() + Math.floor(Math.random() * 999),
    child_name: '',
    event_date: '',
    meas_date: TODAY_STR_ISO,
    unit: 'سم',
    total_height: '',
    dress_length: '',
    chest_length: '',
    skirt_length: '',
    sleeve_length: '',
    chest_circ: '',
    waist_circ: '',
    shoulder_width: '',
    armhole_circ: '',
    neck_circ: '',
    comfort_profile: [],
    sewing_notes: '',
    model_image: '',
    dress_color: ''
  });

  const [measurements, setMeasurements] = useState([emptyMeasurement()]);

  const addChildCard = () => {
    setMeasurements(prev => [...prev, emptyMeasurement()]);
    showToast('تمت إضافة بطاقة طفلة جديدة ➕');
  };

  const removeChildCard = (idx) => {
    if (measurements.length <= 1) return showToast('يجب أن تبقى بطاقة مقاس واحدة على الأقل ⚠️', 'error');
    setMeasurements(prev => prev.filter((_, i) => i !== idx));
  };

  const updateMeasurement = (idx, field, value) => {
    setMeasurements(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  // تحويل وحدة القياس (سم ↔ إنش)
  const toggleUnit = (idx) => {
    const m = measurements[idx];
    const factor = m.unit === 'سم' ? (1 / 2.54) : 2.54;
    const fields = ['total_height','dress_length','chest_length','skirt_length','sleeve_length','chest_circ','waist_circ','shoulder_width','armhole_circ','neck_circ'];
    const updated = { ...m, unit: m.unit === 'سم' ? 'إنش' : 'سم' };
    fields.forEach(f => {
      if (m[f] !== '' && !isNaN(parseFloat(m[f]))) {
        updated[f] = (parseFloat(m[f]) * factor).toFixed(1);
      }
    });
    setMeasurements(prev => prev.map((item, i) => i === idx ? updated : item));
  };

  // ── حالات القسم الثالث: كشف الحساب ──
  const [totalSales, setTotalSales]     = useState('');
  const [totalPaid, setTotalPaid]       = useState('');
  const [deposit, setDeposit]           = useState('');
  const [payMethod, setPayMethod]       = useState('نقد (كاش)');
  const [receiptFile, setReceiptFile]   = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [delivery, setDelivery]         = useState('');

  const remaining = (() => {
    const s = Number(totalSales) || 0;
    const c = Number(delivery) || 0;
    const d = Number(deposit) || 0;
    return (s + c) > 0 ? ((s + c) - d).toFixed(2) : '';
  })();

  const handleReceiptChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setReceiptFile(ev.target.result); // base64
      setReceiptPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  // ── حالة الحفظ وعرض السجلات ──
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedJobCard, setSelectedJobCard] = useState(null);

  // ── دالة الحفظ الرئيسية ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return showToast('اسم العميلة مطلوب ⚠️', 'error');
    if (!phone.trim()) return showToast('رقم الهاتف مطلوب ⚠️', 'error');
    setLoading(true);

    const payload = {
      customer_id:     custId,
      name:            name.trim(),
      phone:           phone.trim(),
      phone_alt:       phoneAlt.trim(),
      platform,
      handle:          handle.trim(),
      city:            city.trim(),
      street:          street.trim(),
      category,
      reg_date:        regDate,
      purchase_count:  0,
      items_count:     0,
      notes:           notes.trim(),
      measurements:    measurements.map((m, idx) => ({...m, child_name: m.child_name.trim() || 'طفلة ' + (idx + 1)})),
      ledger: {
        total_sales:   parseFloat(totalSales) || 0,
        total_paid:    parseFloat(totalPaid) || 0,
        deposit:       parseFloat(deposit) || 0,
        pay_method:    payMethod,
        receipt_b64:   receiptFile || '',
        remaining:     Number(remaining) || 0,
        delivery:      Number(delivery) || 0,
        updated_at:    TODAY_STR_ISO
      }
    };

    try {
      const response = await callGAS('addCustomer', payload);
      const newRecord = (response && response.data) ? response.data : { ...payload, id: custId };
      if (setCustomers) setCustomers(prev => [newRecord, ...(prev || [])]);
      
      showToast(`✅ تم حفظ بيانات ${name} سحابياً في Google Sheets 👑`);

    } catch (err) {
      console.error(err);
      const localRecord = { ...payload, id: custId };
      if (setCustomers) setCustomers(prev => [localRecord, ...(prev || [])]);
      showToast('تم الحفظ محلياً ⚡ — يُرجى مراجعة الاتصال', 'warning');
    } finally {
      setLoading(false);
      // إعادة تهيئة النموذج
      setName(''); setPhone(''); setPhoneAlt(''); setHandle('');
      setCity(''); setStreet(''); setNotes('');
      setTotalSales(''); setTotalPaid(''); setDeposit(''); setDelivery('');
      setReceiptFile(null); setReceiptPreview(null);
      setMeasurements([emptyMeasurement()]);
    }
  };

  // ── فلترة قائمة العملاء ──
  const filtered = (customers || []).filter(c =>
    !search || (c.name || '').includes(search) || (c.phone || '').includes(search) || (c.customer_id || '').includes(search)
  );

  const catColor = (cat) => ({
    'جديد': 'bg-blue-100 text-blue-700 border-blue-300',
    'دائم': 'bg-emerald-100 text-emerald-700 border-emerald-300',
    'VIP':  'bg-amber-100 text-amber-700 border-amber-300'
  }[cat] || 'bg-slate-100 text-slate-600');

  const inputCls = "w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:border-rose-300 focus:ring-1 focus:ring-rose-200 transition outline-none min-h-[42px]";
  const labelCls = "block text-[11px] font-extrabold text-slate-700 mb-1";

  return (
    <div className="space-y-5 animate-fadeIn">

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ══════════════════════════════════════════
            🟣 البطاقة الأولى: بيانات العميل الأساسية
            ══════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-l from-rose-700 to-rose-900 px-5 py-3.5 flex items-center justify-between">
            <h2 className="text-white font-black text-xs flex items-center gap-2">
              👤 بيانات العميلة الأساسية
              <span className="text-[10px] bg-white/20 rounded-full px-2 py-0.5 font-bold">{custId}</span>
            </h2>
            <span className="text-[10px] text-rose-200 font-bold">* الحقول الإلزامية</span>
          </div>

          <div className="p-5 space-y-4">
            {/* الصف الأول */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>اسم العميل (الأب / الأم) <span className="text-rose-600">*</span></label>
                <input required value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="مثال: أم محمد الأهدل" />
              </div>
              <div>
                <label className={labelCls}>الهاتف الرئيسي (واتساب) <span className="text-rose-600">*</span></label>
                <div className="relative">
                  <input required value={phone} onChange={e => setPhone(e.target.value)} className={inputCls + " pr-10 pl-2"} placeholder="77XXXXXXX" type="tel" dir="ltr" style={{textAlign:'right'}} />
                  {phone && (
                    <a href={`https://wa.me/${String(phone).replace(/^0+/, '967').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" 
                       className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-emerald-100 hover:bg-emerald-200 text-emerald-600 rounded-xl transition" title="مراسلة واتساب">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </a>
                  )}
                </div>
              </div>
              <div>
                <label className={labelCls}>الهاتف البديل الخطي</label>
                <input value={phoneAlt} onChange={e => setPhoneAlt(e.target.value)} className={inputCls} placeholder="71XXXXXXX (اختياري)" type="tel" />
              </div>
              <div>
                <label className={labelCls}>منصة التواصل الاجتماعي</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} className={inputCls}>
                  {['واتساب (WhatsApp)','انستغرام (Instagram)','فيسبوك (Facebook)','تيك توك (TikTok)','سناب شات (Snapchat)','تليجرام (Telegram)','مباشر / زيارة المحل'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>اسم الحساب / المعرف</label>
                <input value={handle} onChange={e => setHandle(e.target.value)} className={inputCls} placeholder="@username" />
              </div>
              <div>
                <label className={labelCls}>فئة العميل (CRM)</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                  {['جديد','دائم','VIP'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>المدينة / المنطقة</label>
                <input value={city} onChange={e => setCity(e.target.value)} className={inputCls} placeholder="مثال: صنعاء - حدة" />
              </div>
              <div>
                <label className={labelCls}>الشارع / المبنى</label>
                <input value={street} onChange={e => setStreet(e.target.value)} className={inputCls} placeholder="مثال: شارع الستين - بناية الأمين" />
              </div>
              <div>
                <label className={labelCls}>تاريخ التسجيل</label>
                <input type="date" value={regDate} onChange={e => setRegDate(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>ملاحظات إضافية</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls + " resize-none"} placeholder="أي ملاحظات خاصة بالعميلة أو تفضيلاتها..." />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            📏 البطاقة الثانية: مقاسات الأطفال
            ══════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-l from-violet-700 to-violet-900 px-5 py-3.5 flex items-center justify-between">
            <h2 className="text-white font-black text-xs">📏 مقاسات الأطفال (بطاقات متعددة)</h2>
            <button type="button" onClick={addChildCard}
              className="text-[11px] bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-1.5 rounded-xl border border-white/30 transition flex items-center gap-1">
              ➕ إضافة طفلة
            </button>
          </div>

          <div className="p-5 space-y-4">
            {measurements.map((m, idx) => (
              <div key={m.id} className="border border-violet-200 rounded-2xl overflow-hidden">
                {/* رأس بطاقة الطفلة */}
                <div className="bg-violet-50 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[11px] font-black text-violet-800">
                    👧 طفلة {idx + 1}{m.child_name ? `: ${m.child_name}` : ''}
                  </span>
                  {isOlderThan90Days(m.meas_date) && (
                    <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold ml-2">
                      ⚠️ أكثر من 90 يوم
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => toggleUnit(idx)}
                      className="text-[10px] bg-violet-600 text-white px-2.5 py-1 rounded-lg font-bold hover:bg-violet-700 transition">
                      تحويل → {m.unit === 'سم' ? 'إنش' : 'سم'}
                    </button>
                    {measurements.length > 1 && (
                      <button type="button" onClick={() => removeChildCard(idx)}
                        className="text-[10px] bg-red-100 text-red-600 px-2.5 py-1 rounded-lg font-bold hover:bg-red-200 transition">
                        🗑 حذف
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {/* معلومات الطفلة */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>اسم الطفلة <span className="text-rose-600">*</span></label>
                      <input value={m.child_name} onChange={e => updateMeasurement(idx,'child_name',e.target.value)} className={inputCls} placeholder="مثال: لين" />
                    </div>
                    <div>
                      <label className={labelCls}>تاريخ أخذ المقاس</label>
                      <input type="date" value={m.meas_date} onChange={e => updateMeasurement(idx,'meas_date',e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>تاريخ المناسبة / التسليم</label>
                      <input type="date" value={m.event_date} onChange={e => updateMeasurement(idx,'event_date',e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>لون الفستان المختار</label>
                      <input type="text" value={m.dress_color || ''} onChange={e => updateMeasurement(idx,'dress_color',e.target.value)} className={inputCls} placeholder="مثال: أحمر / كحلي" />
                    </div>
                    <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                      <label className={labelCls}>صورة الموديل (اختياري)</label>
                      <div className="flex gap-2 items-center">
                        <input type="file" accept="image/*" onChange={(e) => {
                          const file = e.target.files[0];
                          if(file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => updateMeasurement(idx, 'model_image', ev.target.result);
                            reader.readAsDataURL(file);
                          }
                        }} className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-slate-200 rounded-lg p-1 bg-white cursor-pointer" />
                        {m.model_image && <img src={m.model_image} alt="معاينة" className="w-10 h-10 object-cover rounded shadow-sm border border-slate-200" />}
                      </div>
                    </div>
                  </div>

                  {/* المقاسات الطولية */}
                  <div>
                    <p className="text-[10px] font-black text-slate-500 mb-2 flex items-center gap-1">📐 المقاسات الطولية ({m.unit})</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                      {[
                        ['total_height','الطول الكلي للطفلة'],
                        ['dress_length','طول الفستان الكلي'],
                        ['chest_length','طول الصدر'],
                        ['skirt_length','طول التنورة'],
                        ['sleeve_length','طول الكم']
                      ].map(([field, lbl]) => (
                        <div key={field}>
                          <label className={labelCls}>{lbl}</label>
                          <input type="number" step="0.1" value={m[field]} onChange={e => updateMeasurement(idx,field,e.target.value)} className={inputCls} placeholder="0" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* المقاسات العرضية والمحيطية */}
                  <div>
                    <p className="text-[10px] font-black text-slate-500 mb-2 flex items-center gap-1">🔄 المقاسات المحيطية ({m.unit})</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                      {[
                        ['chest_circ','محيط الصدر (Chest)'],
                        ['waist_circ','محيط الخصر (Waist)'],
                        ['shoulder_width','عرض الكتفين (Shoulder)'],
                        ['armhole_circ','محيط الإبط (Armhole)'],
                        ['neck_circ','محيط الرقبة (Neck)']
                      ].map(([field, lbl]) => (
                        <div key={field}>
                          <label className={labelCls}>{lbl}</label>
                          <input type="number" step="0.1" value={m[field]} onChange={e => updateMeasurement(idx,field,e.target.value)} className={inputCls} placeholder="0" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {/* Comfort Profile */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                      <label className="block text-xs font-bold text-indigo-900 mb-3 flex items-center gap-2">تفضيلات الراحة والأقمشة (اختيار متعدد)</label>
                      <div className="flex flex-wrap gap-2">
                        {['حساسية من التل', 'بطانة قطن ناعم', 'فتحة سحاب مخفي', 'كشكشة مضاعفة'].map(pref => (
                          <label key={pref} className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" 
                              checked={(m.comfort_profile || []).includes(pref)}
                              onChange={(e) => {
                                const current = m.comfort_profile || [];
                                const updated = e.target.checked ? [...current, pref] : current.filter(p => p !== pref);
                                updateMeasurement(idx, 'comfort_profile', updated);
                              }}
                            />
                            <span className="text-[10px] text-indigo-800 font-medium">{pref}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Sewing Notes */}
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex flex-col">
                      <label className="block text-xs font-bold text-amber-900 mb-2 flex items-center gap-2">ملاحظات الخياطة الإضافية</label>
                      <textarea 
                        className="w-full p-2 text-xs border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white flex-1 resize-none" 
                        placeholder="أضف أي ملاحظات خاصة بالمعمل أو تفضيلات إضافية هنا..." 
                        value={m.sewing_notes || ''} 
                        onChange={e => updateMeasurement(idx, 'sewing_notes', e.target.value)}
                        rows={2}
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            💰 البطاقة الثالثة: كشف الحساب المالي
            ══════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-l from-emerald-700 to-emerald-900 px-5 py-3.5">
            <h2 className="text-white font-black text-xs">💰 كشف الحساب المالي والطلبات</h2>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className={labelCls}>إجمالي المبيعات</label>
                <input type="number" step="0.01" value={totalSales} onChange={e => setTotalSales(e.target.value)} className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>إجمالي المدفوعات</label>
                <input type="number" step="0.01" value={totalPaid} onChange={e => setTotalPaid(e.target.value)} className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>العربون المدفوع</label>
                <input type="number" step="0.01" value={deposit} onChange={e => setDeposit(e.target.value)} className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>كلفة التوصيل</label>
                <input type="number" step="0.01" value={delivery} onChange={e => setDelivery(e.target.value)} className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>المبلغ المتبقي (آلي)</label>
                <div className={`w-full p-3 rounded-2xl border min-h-[42px] font-black text-xs flex items-center justify-center ${parseFloat(remaining) > 0 ? 'bg-red-50 border-red-300 text-red-700' : 'bg-emerald-50 border-emerald-300 text-emerald-700'}`}>
                  {remaining ? `${remaining}` : '—'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>طريقة الدفع</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className={inputCls}>
                  {['نقد (كاش)','حوالة بنكية','آجل (على الحساب)','تحويل إلكتروني'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>📎 رفع صورة السند / الإيصال</label>
                <input type="file" accept="image/*" onChange={handleReceiptChange}
                  className="w-full p-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold cursor-pointer file:mr-2 file:text-xs file:font-bold file:text-rose-700 file:bg-rose-50 file:border-0 file:rounded-lg file:px-2 file:py-1" />
                {/* معاينة صورة السند - فورية أسفل الحقل */}
                {receiptPreview && (
                  <div className="mt-2 flex items-start gap-3 p-2 bg-white rounded-xl border border-emerald-100 shadow-sm">
                    <img src={receiptPreview} alt="معاينة السند" className="w-16 h-16 object-cover rounded-lg border-2 border-emerald-300" />
                    <div className="text-[10px] text-slate-600 font-semibold flex-1 flex flex-col justify-center h-16">
                      <p className="text-emerald-700 font-black mb-1">✅ تم الرفع</p>
                      <button type="button" onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                        className="text-red-500 hover:underline self-start">🗑 إزالة الصورة</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── زر الحفظ الرئيسي ── */}
        <button type="submit" disabled={loading}
          className="w-full py-4 rounded-3xl font-black text-sm text-white transition-all shadow-lg disabled:opacity-60"
          style={{background: loading ? '#9ca3af' : 'linear-gradient(135deg, #be123c, #7c3aed)'}}>
          {loading
            ? '⏳ جاري الحفظ في Google Sheets...'
            : `☁️ حفظ ملف العميلة بالكامل - ${measurements.length} طفلة`}
        </button>
      </form>

      {/* ══════════════════════════════════════════
          📜 سجل العملاء (تحديث لحظي)
          ══════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-black text-xs text-slate-800">📋 سجل العملاء ({filtered.length} عميلة)</h3>
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold w-48 focus:outline-none focus:border-rose-300"
            placeholder="🔍 بحث بالاسم أو الهاتف..." />
        </div>

        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-bold">
              لا يوجد عملاء مسجلون بعد 👤
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-extrabold">
                  {['الكود','اسم العميلة','الهاتف','المنصة','المدينة','الفئة','التسجيل','الأطفال','المتبقي','الإجراءات'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-right whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id || c.customer_id || i} className="border-t hover:bg-slate-50 transition">
                    <td className="px-3 py-2.5 font-mono text-[10px] text-rose-700 font-black whitespace-nowrap">{c.customer_id || `CUST-${i+1001}`}</td>
                    <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap">{c.name || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{c.phone || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{c.platform ? c.platform.split(' ')[0] : '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{c.city || c.address || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${catColor(c.category)}`}>{c.category || 'جديد'}</span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{c.reg_date || '—'}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-violet-700 whitespace-nowrap">
                      {c.measurements && c.measurements.length > 0 ? (
                        <div className="flex flex-col gap-1 items-center">
                          {c.measurements.map((m, idx) => {
                            const isStale = m.meas_date ? isMeasurementStale(m.meas_date) : false;
                            return (
                              <span key={idx} className="bg-violet-50 px-2 py-0.5 rounded-md text-xs font-medium border border-violet-100 shadow-sm flex items-center justify-between gap-2 min-w-[80px]">
                                <span>{m.child_name || 'بدون اسم'}</span>
                                {isStale && <span title="المقاس قديم (مر عليه أكثر من 90 يوماً)" className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                              </span>
                            );
                          })}
                        </div>
                      ) : '—'}
                    </td>
                    <td className={`px-3 py-2.5 text-center font-black whitespace-nowrap ${c.ledger?.remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {c.ledger?.remaining ? `${c.ledger.remaining}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 flex items-center gap-1 justify-center whitespace-nowrap">
                      <button onClick={() => setSelectedInvoice(c)} title="طباعة فاتورة مالية (PDF)" className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg></button>
                      <button onClick={() => setSelectedJobCard(c)} title="بطاقة المعمل (Job Card)" className="p-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg></button>
                      <a href={`https://wa.me/${String(c.phone||'').replace(/^0+/, '967').replace(/\D/g,'')}?text=${encodeURIComponent('مرحباً ' + c.name + '، إليك كشف الحساب الخاص بك من مؤسسة الأميرات الصغيرات.')}`} target="_blank" title="إرسال كشف واتساب" className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>
                      <button onClick={() => alert('سيتم تفعيل التعديل لاحقاً')} title="تعديل" className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                      <button onClick={() => alert('سيتم تفعيل الحذف لاحقاً')} title="حذف" className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {selectedInvoice && ReactDOM.createPortal(
        <InvoiceModal customer={selectedInvoice} onClose={() => setSelectedInvoice(null)} />,
        document.body
      )}
      {selectedJobCard && ReactDOM.createPortal(
        <JobCardModal customer={selectedJobCard} onClose={() => setSelectedJobCard(null)} />
      , document.body)}
    </div>
  );
}


// === FILE: src/features/Products.jsx ===
function Products({ products = [], setProducts, inventory = [], showToast, currency }) {
  const currencyDisplay = currency?.display || "USD $";

  const [modelName, setModelName] = useState("");
  const [category, setCategory] = useState("(Princess) فستان أميرة");
  const [selectedFabric, setSelectedFabric] = useState("");
  const [yardsUsed, setYardsUsed] = useState("3.5");
  const [laborCost, setLaborCost] = useState("70.0");
  const [packagingCost, setPackagingCost] = useState("10.0");
  const [sellPrice, setSellPrice] = useState("180.0");
  const [formCurrency, setFormCurrency] = useState(currencyDisplay);
  const [calcDate, setCalcDate] = useState(TODAY_STR_ISO);

  useEffect(() => {
    if (currency?.display) {
      setFormCurrency(currency.display);
    }
  }, [currency]);

  const fabricItem = (inventory || []).find(inv => inv.item_name === selectedFabric) || (inventory || [])[0];
  const unitCost = fabricItem ? (parseFloat(fabricItem.cost_per_meter) || 12.0) : 12.0;
  const computedFabricTotal = (parseFloat(yardsUsed || 0) * unitCost);
  const computedTotalCost = computedFabricTotal + parseFloat(laborCost || 0) + parseFloat(packagingCost || 0);
  const computedProfit = parseFloat(sellPrice || 0) - computedTotalCost;

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!modelName.trim()) return showToast("اسم الموديل مطلوب ⚠️", "error");

    const newP = {
      id: Date.now(),
      name: modelName.trim(),
      category,
      fabric_name: selectedFabric || (fabricItem ? fabricItem.item_name : "حرير فاخر"),
      yards_used: parseFloat(yardsUsed || 0),
      fabric_cost: computedFabricTotal,
      labor_cost: parseFloat(laborCost || 0),
      packaging_cost: parseFloat(packagingCost || 0),
      total_cost: computedTotalCost,
      sell_price: parseFloat(sellPrice || 0),
      currency: formCurrency,
      profit: computedProfit,
      calc_date: calcDate
    };

    if (setProducts) setProducts([newP, ...(products || [])]);

    try {
      await callGAS("addProduct", newP);
      showToast("تم إضافة وتوثيق الموديل وحساب التكلفة سحابياً ☁️🧮");
    } catch (err) {
      showToast("تم الحفظ محلياً 🧮");
    }

    setModelName("");
  };

  return (
    <div className="space-y-6 animate-fadeIn text-xs">
      <div className="bg-white p-5 md:p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="border-b pb-3 flex items-center justify-between">
          <h2 className="font-black text-sm md:text-base text-slate-900 flex items-center gap-2">
            {Icons.Calculator()} حاسبة وتكلفة موديلات أزياء الأطفال (Add New Model/Product) 🧮
          </h2>
          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            * الحقول المطلوبة
          </span>
        </div>

        <form onSubmit={handleAddProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">
                اسم الموديل <span className="text-rose-600 font-black">*</span>
              </label>
              <input required type="text" value={modelName} onChange={e=>setModelName(e.target.value)} className="w-full p-3.5 rounded-2xl border bg-slate-50 font-semibold min-h-[44px]" placeholder="اسم الموديل *" />
            </div>
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">التصنيف</label>
              <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full p-3.5 rounded-2xl border bg-slate-50 font-semibold min-h-[44px]">
                {(PRODUCT_CATEGORIES || []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">تاريخ الحساب 📅</label>
              <input type="date" value={calcDate} onChange={e=>setCalcDate(e.target.value)} className="w-full p-3.5 rounded-2xl border bg-slate-50 font-bold text-purple-950 min-h-[44px]" />
            </div>
          </div>

          {/* Costing Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 bg-amber-50/80 rounded-3xl border border-amber-200/80">
            <div>
              <label className="block font-extrabold text-amber-950 mb-1">اختر القماش المستخدم من المخزون</label>
              <select value={selectedFabric} onChange={e=>setSelectedFabric(e.target.value)} className="w-full p-3.5 rounded-2xl border bg-white font-bold text-slate-900 min-h-[44px]">
                {(inventory || []).map(inv => (
                  <option key={inv.id} value={inv.item_name}>{inv.item_name} ({inv.cost_per_meter || 12} {currencyDisplay} / متر)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-extrabold text-amber-950 mb-1">كمية القماش المستخدمة (بالأمتار/م)</label>
              <input type="number" step="0.1" value={yardsUsed} onChange={e=>setYardsUsed(e.target.value)} className="w-full p-3.5 rounded-2xl border text-center font-black text-slate-900 min-h-[44px] bg-white" placeholder="3.5 م" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">تكلفة القماش ({currencyDisplay})</label>
              <input readOnly type="number" value={computedFabricTotal.toFixed(1)} className="w-full p-3.5 rounded-2xl border bg-slate-100 text-center font-black text-purple-950 min-h-[44px]" />
            </div>
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">أجرة الخياطة والعمالة ({currencyDisplay})</label>
              <input type="number" value={laborCost} onChange={e=>setLaborCost(e.target.value)} className="w-full p-3.5 rounded-2xl border text-center font-bold min-h-[44px]" />
            </div>
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">التغليف والإكسسوارات ({currencyDisplay})</label>
              <input type="number" value={packagingCost} onChange={e=>setPackagingCost(e.target.value)} className="w-full p-3.5 rounded-2xl border text-center font-bold min-h-[44px]" />
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="grid grid-cols-3 gap-3.5 p-5 bg-purple-950 text-white rounded-3xl font-extrabold text-center shadow-inner">
            <div>
              <span className="block text-[11px] text-purple-200 mb-1">إجمالي التكلفة الحسابية</span>
              <span className="text-amber-300 text-sm font-black">{computedTotalCost.toFixed(1)} {currencyDisplay}</span>
            </div>
            <div>
              <label className="block text-[11px] text-purple-200 mb-1">سعر البيع المقترح ({currencyDisplay})</label>
              <input type="number" value={sellPrice} onChange={e=>setSellPrice(e.target.value)} className="w-full p-2 text-slate-900 rounded-xl text-center font-black bg-white" />
            </div>
            <div>
              <span className="block text-[11px] text-purple-200 mb-1">هامش صافي الربح</span>
              <span className="text-emerald-400 text-sm font-black">{computedProfit.toFixed(1)} {currencyDisplay}</span>
            </div>
          </div>

          <button type="submit" className="w-full py-4 min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-2xl shadow-md hover:shadow-lg transition-all">
            حفظ الموديل والتكلفة سحابياً ➕
          </button>
        </form>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-x-auto w-full">
        <table className="w-full text-right text-[11.5px] min-w-[750px]">
          <thead>
            <tr className="bg-slate-100 text-slate-800 font-black border-b">
              <th className="p-3.5">ID</th>
              <th className="p-3.5">اسم الموديل</th>
              <th className="p-3.5">التصنيف</th>
              <th className="p-3.5">اسم القماش</th>
              <th className="p-3.5">التكلفة الإجمالية</th>
              <th className="p-3.5">سعر البيع</th>
              <th className="p-3.5">الربح المتوقع</th>
              <th className="p-3.5">العملة</th>
            </tr>
          </thead>
          <tbody className="divide-y font-semibold">
            {(products || []).map(p => (
              <tr key={p.id} className="hover:bg-purple-50/50 transition-colors">
                <td className="p-3.5 font-bold text-purple-950">#{p.id}</td>
                <td className="p-3.5 font-black text-slate-900">{p.name}</td>
                <td className="p-3.5"><span className="bg-purple-100 text-purple-900 px-2.5 py-1 rounded-lg font-bold">{p.category}</span></td>
                <td className="p-3.5">{p.fabric_name}</td>
                <td className="p-3.5 font-bold text-slate-900">{p.total_cost} {p.currency || currencyDisplay}</td>
                <td className="p-3.5 font-black text-emerald-700">{p.sell_price} {p.currency || currencyDisplay}</td>
                <td className="p-3.5 font-black text-purple-900">+{p.profit} {p.currency || currencyDisplay}</td>
                <td className="p-3.5 font-bold">{p.currency || currencyDisplay}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// === FILE: src/features/Orders.jsx ===
function Orders({ orders = [], setOrders, customers = [], products = [], showToast, currency }) {
  const currencyDisplay = currency?.display || "USD $";

  const [customerName, setCustomerName] = useState("");
  const [productName, setProductName] = useState("");
  const [qty, setQty] = useState("1");
  const [total, setTotal] = useState("180");
  const [paid, setPaid] = useState("100");
  const [formCurrency, setFormCurrency] = useState(currencyDisplay);
  const [orderDate, setOrderDate] = useState(TODAY_STR_ISO);
  const [deliveryDate, setDeliveryDate] = useState(TODAY_STR_ISO);

  useEffect(() => {
    if (currency?.display) {
      setFormCurrency(currency.display);
    }
  }, [currency]);

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (!customerName || !productName) return showToast("يرجى اختيار العميلة والمنتج ⚠️", "error");

    const tot = parseFloat(total || 0);
    const pd = parseFloat(paid || 0);
    const newOrd = {
      id: Date.now(),
      order_no: `ORD-${Date.now().toString().slice(-4)}`,
      customer_name: customerName,
      product_name: productName,
      qty: parseInt(qty || 1),
      order_date: orderDate,
      delivery_date: deliveryDate,
      total: tot,
      paid: pd,
      remaining: tot - pd,
      currency: formCurrency,
      status: "قيد الخياطة 🪡"
    };

    if (setOrders) setOrders([newOrd, ...(orders || [])]);

    try {
      await callGAS("addOrder", newOrd);
      showToast("تم إصدار وحفظ الفاتورة سحابياً وتوليد QR بنجاح ☁️📄");
    } catch (err) {
      showToast("تم الحفظ محلياً 📄");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-xs">
      <div className="bg-white p-5 md:p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="border-b pb-3 flex items-center justify-between">
          <h2 className="font-black text-sm md:text-base text-slate-900 flex items-center gap-2">
            {Icons.ShoppingBag()} حجز فستان / إصدار فاتورة جديدة (Add New Order) 📄
          </h2>
        </div>

        <form onSubmit={handleSaveInvoice} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">اختر العميلة من السجل</label>
              <select value={customerName} onChange={e=>setCustomerName(e.target.value)} className="w-full p-3.5 rounded-2xl border bg-slate-50 font-bold min-h-[44px]">
                <option value="">-- Select Customer / اختر العميلة --</option>
                {(customers || []).map(c => <option key={c.id} value={c.name}>{c.name} ({c.phone || 'بدون هاتف'})</option>)}
              </select>
            </div>
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">اختر الفستان / الموديل</label>
              <select value={productName} onChange={e=>setProductName(e.target.value)} className="w-full p-3.5 rounded-2xl border bg-slate-50 font-bold min-h-[44px]">
                <option value="">-- Select Product / اختر الفستان --</option>
                {(products || []).map(p => <option key={p.id} value={p.name}>{p.name} ({p.sell_price} {currencyDisplay})</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">تاريخ الفاتورة/الحجز 📅</label>
              <input type="date" value={orderDate} onChange={e=>setOrderDate(e.target.value)} className="w-full p-3.5 rounded-2xl border font-bold text-purple-950 min-h-[44px]" />
            </div>
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">موعد التسليم المتوقع 📅</label>
              <input type="date" value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)} className="w-full p-3.5 rounded-2xl border font-bold text-sky-950 min-h-[44px]" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">الكمية (عدد)</label>
              <input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} className="w-full p-3.5 rounded-2xl border text-center font-extrabold min-h-[44px]" />
            </div>
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">الإجمالي الكلي ({currencyDisplay})</label>
              <input type="number" value={total} onChange={e=>setTotal(e.target.value)} className="w-full p-3.5 rounded-2xl border text-center font-black text-slate-900 min-h-[44px]" placeholder="الإجمالي" />
            </div>
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">المدفوع / العربون ({currencyDisplay})</label>
              <input type="number" value={paid} onChange={e=>setPaid(e.target.value)} className="w-full p-3.5 rounded-2xl border text-center font-black text-emerald-700 min-h-[44px]" placeholder="العربون" />
            </div>
          </div>

          <button type="submit" className="w-full py-4 min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-2xl shadow-md hover:shadow-lg transition-all">
            حفظ الفاتورة وتوليد QR Code سحابياً 📄
          </button>
        </form>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-x-auto w-full">
        {(!orders || orders.length === 0) ? (
          <div className="p-12 text-center text-slate-400 font-bold space-y-2">
            <span className="text-3xl block">📄</span>
            <p className="text-sm">No Orders Yet / لا توجد طلبات مسجلة بعد</p>
          </div>
        ) : (
          <table className="w-full text-right text-[11.5px] min-w-[700px]">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-black border-b">
                <th className="p-3.5">Order ID</th>
                <th className="p-3.5">Customer / العميلة</th>
                <th className="p-3.5">Product / الفستان</th>
                <th className="p-3.5">Quantity / العدد</th>
                <th className="p-3.5">Total / الإجمالي</th>
                <th className="p-3.5">Remaining / المتبقي</th>
                <th className="p-3.5">Delivery Date / التسليم</th>
                <th className="p-3.5">Status / الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y font-semibold">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-rose-50/40 transition-colors">
                  <td className="p-3.5 font-bold text-rose-950">{o.order_no}</td>
                  <td className="p-3.5 font-black text-slate-900">{o.customer_name}</td>
                  <td className="p-3.5 font-bold">{o.product_name}</td>
                  <td className="p-3.5 font-bold text-center">{o.qty}</td>
                  <td className="p-3.5 font-black text-slate-900">{o.total} {o.currency || currencyDisplay}</td>
                  <td className="p-3.5 font-black text-rose-700">{(o.total || 0) - (o.paid || 0)} {o.currency || currencyDisplay}</td>
                  <td className="p-3.5 text-amber-900 font-bold">{formatDateDisplay(o.delivery_date)}</td>
                  <td className="p-3.5"><span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-xl font-bold">{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


// === FILE: src/features/Purchases.jsx ===
function Purchases({ purchases = [], setPurchases, inventory = [], setInventory, accounts = [], showToast, currency }) {
  const UNITS = ['متر', 'وار (ياردة)', 'سم', 'حبة (قطعة)', 'رول (طاقة)'];
  const VALID_UNITS = ['متر', 'وار (ياردة)', 'سم', 'حبة (قطعة)', 'رول (طاقة)', 'يارده', 'وار'];
  const genBillNo = () => `PUR-${Math.floor(1000 + Math.random() * 9000)}`;
  const defaultCurrency = (typeof CURRENCIES !== 'undefined' ? (typeof CURRENCIES[0] === 'object' ? CURRENCIES[0].value : CURRENCIES[0]) : 'YER ﷼');
  const defaultPayType = (typeof PAY_METHODS !== 'undefined' ? PAY_METHODS[0] : 'نقدي');

  const emptyHeader = () => ({ bill_no: genBillNo(), supplier: '', currency: defaultCurrency, pay_type: defaultPayType, transfer_no: '', payment_source: '', receipt_url: '', date: TODAY_STR_ISO });
  const emptyItem = () => ({ item: '', unit: 'متر', qty: '', price: '', total: '' });

  const [headerData, setHeaderData] = React.useState(emptyHeader);
  const [itemData, setItemData] = React.useState(emptyItem);
  const [editingIndex, setEditingIndex] = React.useState(null);
  const [billItems, setBillItems] = React.useState([]);
  const [previewImage, setPreviewImage] = React.useState(null);

  // ── نافذة تعديل سجل موجود ──
  const [editRecord, setEditRecord] = React.useState(null); // السجل المفتوح للتعديل
  const [editSaving, setEditSaving] = React.useState(false);

  // ── رفع صورة السند ──
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return showToast('حجم الصورة كبير جداً (أقصاه 5 ميجابايت) ⚠️', 'error');
    const reader = new FileReader();
    reader.onloadend = () => { setHeaderData(prev => ({ ...prev, receipt_url: reader.result })); showToast('تم إرفاق صورة السند من الاستوديو 🖼️'); };
    reader.readAsDataURL(file);
  };

  // ── الحاسبة التفاعلية ──
  const handleQtyChange = (val) => { const q = parseFloat(val)||0, p = parseFloat(itemData.price)||0; setItemData(prev => ({ ...prev, qty: val, total: q>0&&p>0 ? String((q*p).toFixed(2)) : prev.total })); };
  const handlePriceChange = (val) => { const p = parseFloat(val)||0, q = parseFloat(itemData.qty)||0; setItemData(prev => ({ ...prev, price: val, total: q>0&&p>0 ? String((q*p).toFixed(2)) : prev.total })); };
  const handleTotalChange = (val) => { const tot = parseFloat(val)||0, q = parseFloat(itemData.qty)||0; setItemData(prev => ({ ...prev, total: val, price: q>0&&tot>0 ? String((tot/q).toFixed(2)) : prev.price })); };

  // ── إضافة / تعديل صنف ──
  const handleAddOrUpdateItem = (e) => {
    e.preventDefault();
    if (!itemData.item.trim()) return showToast('اسم الصنف مطلوب ⚠️', 'error');
    const q = parseFloat(itemData.qty); if (!q || q <= 0) return showToast('الكمية مطلوبة ⚠️', 'error');
    let p = parseFloat(itemData.price)||0, tot = parseFloat(itemData.total)||0;
    if (tot>0&&p<=0) p=tot/q; else if (p>0&&tot<=0) tot=q*p;
    if (p<=0&&tot<=0) return showToast('السعر أو الإجمالي مطلوب ⚠️', 'error');
    const obj = { item: itemData.item.trim(), unit: itemData.unit||'متر', qty: q, price: parseFloat(p.toFixed(2)), total: parseFloat(tot.toFixed(2)) };
    if (editingIndex !== null) { const u=[...billItems]; u[editingIndex]=obj; setBillItems(u); setEditingIndex(null); showToast('تم تحديث الصنف ✏️'); }
    else { setBillItems(prev=>[...prev,obj]); showToast('تمت إضافة الصنف ➕'); }
    setItemData(emptyItem());
  };

  const grandTotal = billItems.reduce((acc,curr)=>acc+(parseFloat(curr.total)||0),0);

  // ── حفظ الفاتورة الجديدة ──
  const handleSaveFullBill = async () => {
    if (!headerData.supplier.trim()) return showToast('اسم المورد مطلوب ⚠️', 'error');
    if (billItems.length === 0) return showToast('الفاتورة فارغة! أضف صنفاً ⚠️', 'error');
    try {
      const saved = [];
      const updatedInventory = [...(inventory||[])];
      for (const itm of billItems) {
        const qty=parseFloat(itm.qty)||0, price=parseFloat(itm.price)||0, total=parseFloat(itm.total)||(qty*price);
        const record = { id: Date.now()+Math.floor(Math.random()*999), bill_no: headerData.bill_no, supplier: headerData.supplier, item: itm.item, item_name: itm.item, unit: itm.unit||'متر', qty, price, total, currency: headerData.currency||defaultCurrency, pay_type: headerData.pay_type||defaultPayType, transfer_no: headerData.transfer_no||'', payment_source: headerData.payment_source||'', receipt_url: headerData.receipt_url||'', date: headerData.date||TODAY_STR_ISO };
        await callGAS('addPurchase', record);
        saved.push(record);
        const ei = updatedInventory.findIndex(inv=>inv.item_name===itm.item);
        if (ei>=0) { updatedInventory[ei] = { ...updatedInventory[ei], qty: (parseFloat(updatedInventory[ei].qty||0))+qty }; }
        else { const ni={id:Date.now()+Math.floor(Math.random()*999),item_name:itm.item,category:'أقمشة ومستلزمات',qty,quantity_meters:qty,unit:itm.unit,cost_per_meter:price,currency:record.currency,supply_date:record.date}; await callGAS('addInventory',ni); updatedInventory.push(ni); }
      }
      if (setPurchases) setPurchases(prev=>[...saved,...(prev||[])]);
      if (setInventory) setInventory(updatedInventory);
      const nextNo = genBillNo();
      showToast(`✅ تم حفظ الفاتورة ${headerData.bill_no} سحابياً 👑`);
      setHeaderData({bill_no:nextNo,supplier:'',currency:defaultCurrency,pay_type:defaultPayType,transfer_no:'',payment_source:'',receipt_url:'',date:TODAY_STR_ISO});
      setBillItems([]); setItemData(emptyItem()); setEditingIndex(null);
    } catch(err) { console.error(err); showToast('خطأ أثناء الحفظ ⚠️ تأكد من الاتصال', 'error'); }
  };

  // ── تعديل سجل موجود وحفظه في Google Sheets مباشرة ──
  const handleOpenEdit = (p) => {
    const VALID_UNITS_CHECK = ['متر', 'وار (ياردة)', 'سم', 'حبة (قطعة)', 'رول (طاقة)', 'يارده', 'وار'];
    let rawUnit=p.unit, rawQty=p.qty, rawPrice=p.price, rawTotal=p.total;
    const unitIsNum = rawUnit!==undefined && rawUnit!=='' && !isNaN(parseFloat(rawUnit)) && !VALID_UNITS_CHECK.includes(String(rawUnit));
    if (unitIsNum) { rawQty=parseFloat(rawUnit); rawPrice=parseFloat(p.qty)||0; rawTotal=parseFloat(p.price)||0; rawUnit='متر'; }
    setEditRecord({ ...p, item: p.item||p.item_name||'', unit: rawUnit||'متر', qty: rawQty||'', price: rawPrice||'', total: rawTotal||'' });
  };

  const handleEditRecordChange = (field, val) => {
    setEditRecord(prev => {
      const updated = { ...prev, [field]: val };
      if (field==='qty'||field==='price') { const q=parseFloat(updated.qty)||0, p2=parseFloat(updated.price)||0; if(q>0&&p2>0) updated.total=String((q*p2).toFixed(2)); }
      if (field==='total') { const tot=parseFloat(val)||0, q=parseFloat(updated.qty)||0; if(q>0&&tot>0) updated.price=String((tot/q).toFixed(2)); }
      return updated;
    });
  };

  const handleSaveEditRecord = async () => {
    if (!editRecord) return;
    if (!editRecord.item || !String(editRecord.item).trim()) return showToast('اسم الصنف مطلوب ⚠️', 'error');
    const qty = parseFloat(editRecord.qty)||0;
    if (qty <= 0) return showToast('الكمية مطلوبة ⚠️', 'error');
    let price = parseFloat(editRecord.price)||0, total = parseFloat(editRecord.total)||0;
    if (total>0&&price<=0) price=total/qty;
    else if (price>0&&total<=0) total=qty*price;
    setEditSaving(true);
    try {
      const payload = { id: String(editRecord.id), bill_no: editRecord.bill_no, supplier: editRecord.supplier, item: String(editRecord.item).trim(), item_name: String(editRecord.item).trim(), unit: editRecord.unit||'متر', qty, price: parseFloat(price.toFixed(2)), total: parseFloat(total.toFixed(2)), currency: editRecord.currency, pay_type: editRecord.pay_type, transfer_no: editRecord.transfer_no||'', payment_source: editRecord.payment_source||'', date: editRecord.date };
      await callGAS('updatePurchase', payload);
      if (setPurchases) setPurchases(prev => prev.map(r => String(r.id)===String(editRecord.id) ? { ...r, ...payload } : r));
      showToast('✅ تم تحديث السجل في Google Sheets بنجاح');
      setEditRecord(null);
    } catch(err) { console.error(err); showToast('خطأ أثناء التحديث ⚠️', 'error'); }
    setEditSaving(false);
  };

  const handleDeleteRecord = async (p) => {
    if (!window.confirm(`هل أنت متأكد من حذف الفاتورة ${p.bill_no||p.id}؟`)) return;
    try {
      await callGAS('deletePurchase', { id: String(p.id) });
      if (setPurchases) setPurchases(prev => prev.filter(r => String(r.id) !== String(p.id)));
      showToast('🗑️ تم حذف السجل من Google Sheets');
    } catch(err) { showToast('خطأ أثناء الحذف ⚠️', 'error'); }
  };

  // ── تطبيع البيانات القديمة ──
  const normalizePurchase = (p) => {
    let rawUnit=p.unit, rawQty=p.qty, rawPrice=p.price, rawTotal=p.total, rawDate=p.date, rawTransfer=p.transfer_no;
    const unitIsNum = rawUnit!==undefined && rawUnit!=='' && !isNaN(parseFloat(rawUnit)) && !VALID_UNITS.includes(String(rawUnit));
    if (unitIsNum) { rawQty=parseFloat(rawUnit); rawPrice=parseFloat(p.qty)||0; rawTotal=parseFloat(p.price)||0; rawUnit='متر'; }
    const transferIsDate = rawTransfer && /^\d{4}-\d{2}-\d{2}/.test(String(rawTransfer));
    if (transferIsDate) { if (!rawDate||rawDate==='') rawDate=String(rawTransfer).slice(0,10); rawTransfer=''; }
    if (rawDate && String(rawDate).includes('T')) rawDate=String(rawDate).slice(0,10);
    const qty=parseFloat(rawQty||0), price=parseFloat(rawPrice||0);
    let total=parseFloat(rawTotal||0); if(total<=0&&qty>0&&price>0) total=qty*price;
    return { qty, price, total, unit: VALID_UNITS.includes(String(rawUnit)) ? rawUnit : (rawUnit||'متر'), date: rawDate||'', transfer: rawTransfer||'' };
  };

  return (
    <div className="space-y-6 animate-fadeIn text-xs" dir="rtl">

      {/* نافذة معاينة الصورة */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setPreviewImage(null)}>
          <div className="relative max-w-2xl w-full bg-white p-3 rounded-3xl" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-2 mb-2">
              <span className="font-black text-slate-900 text-xs">🖼️ صورة السند المرفق</span>
              <button onClick={()=>setPreviewImage(null)} className="text-rose-600 font-black px-2">✕</button>
            </div>
            <img src={previewImage} alt="السند" className="w-full max-h-[75vh] object-contain rounded-2xl border" />
          </div>
        </div>
      )}

      {/* ── نافذة تعديل سجل موجود ── */}
      {editRecord && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3" onClick={()=>setEditRecord(null)}>
          <div className="bg-white rounded-3xl p-5 w-full max-w-xl shadow-2xl space-y-4" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-purple-950 text-sm">✏️ تعديل سجل — {editRecord.bill_no||editRecord.id}</h3>
              <button onClick={()=>setEditRecord(null)} className="text-rose-500 font-black text-lg leading-none">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1">📦 اسم الصنف / القماش *</label>
                <input type="text" className="w-full p-2.5 rounded-xl border font-bold bg-purple-50 border-purple-300" placeholder="أدخل اسم الصنف" value={editRecord.item||''} onChange={e=>handleEditRecordChange('item',e.target.value)} />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">📐 وحدة القياس</label>
                <select className="w-full p-2.5 rounded-xl border font-bold bg-white" value={editRecord.unit||'متر'} onChange={e=>handleEditRecordChange('unit',e.target.value)}>
                  {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">الكمية *</label>
                <input type="number" step="0.01" min="0" className="w-full p-2.5 rounded-xl border font-bold bg-white text-center" value={editRecord.qty||''} onChange={e=>handleEditRecordChange('qty',e.target.value)} />
              </div>
              <div>
                <label className="block font-bold text-purple-800 mb-1">🏷️ السعر الإفرادي</label>
                <input type="number" step="0.01" min="0" className="w-full p-2.5 rounded-xl border font-bold text-center text-purple-900" value={editRecord.price||''} onChange={e=>handleEditRecordChange('price',e.target.value)} />
              </div>
              <div>
                <label className="block font-bold text-emerald-800 mb-1">💰 الإجمالي</label>
                <input type="number" step="0.01" min="0" className="w-full p-2.5 rounded-xl border font-bold text-center text-emerald-800 bg-emerald-50" value={editRecord.total||''} onChange={e=>handleEditRecordChange('total',e.target.value)} />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المورد</label>
                <input type="text" className="w-full p-2.5 rounded-xl border font-bold bg-white" value={editRecord.supplier||''} onChange={e=>handleEditRecordChange('supplier',e.target.value)} />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">📲 رقم الحوالة</label>
                <input type="text" className="w-full p-2.5 rounded-xl border font-bold bg-white" placeholder="TRF-12345" value={editRecord.transfer_no||''} onChange={e=>handleEditRecordChange('transfer_no',e.target.value)} />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">حساب الدفع</label>
                <select className="w-full p-2.5 rounded-xl border font-bold bg-white" value={editRecord.payment_source||''} onChange={e=>handleEditRecordChange('payment_source',e.target.value)}>
                  <option value="">-- اختر --</option>
                  {(accounts||[]).map(a=>{const c=a.acc_code||a.code||'',n=a.acc_name||a.name||'';return <option key={c} value={String(c)}>{c} - {n}</option>;})}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">📅 التاريخ</label>
                <input type="date" className="w-full p-2.5 rounded-xl border font-bold bg-white" value={editRecord.date||''} onChange={e=>handleEditRecordChange('date',e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <button onClick={handleSaveEditRecord} disabled={editSaving} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl transition">
                {editSaving ? '⏳ جاري الحفظ...' : '☁️ حفظ التعديلات في Google Sheets'}
              </button>
              <button onClick={()=>setEditRecord(null)} className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ── بطاقة الفاتورة الجديدة ── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="border-b pb-3">
          <h2 className="font-black text-sm text-slate-900">🛍️ فاتورة مشتريات جديدة — رقم: <span className="text-purple-900">{headerData.bill_no}</span></h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border">
          <div><label className="block font-bold text-slate-700 mb-1">رقم الفاتورة</label><input type="text" className="w-full p-2.5 rounded-xl border font-bold bg-white" value={headerData.bill_no} onChange={e=>setHeaderData(p=>({...p,bill_no:e.target.value}))} /></div>
          <div><label className="block font-bold text-slate-700 mb-1">اسم المورد *</label><input type="text" className="w-full p-2.5 rounded-xl border font-bold bg-white" placeholder="بن محمود للأقمشة" value={headerData.supplier} onChange={e=>setHeaderData(p=>({...p,supplier:e.target.value}))} /></div>
          <div><label className="block font-bold text-slate-700 mb-1">العملة</label>
            <select className="w-full p-2.5 rounded-xl border font-bold bg-white" value={headerData.currency} onChange={e=>setHeaderData(p=>({...p,currency:e.target.value}))}>
              {(CURRENCIES||['YER ﷼','USD $','SAR ﷼']).map(c=>{const v=typeof c==='object'?c.value:c,l=typeof c==='object'?c.label:c;return <option key={v} value={v}>{l}</option>;})}
            </select>
          </div>
          <div><label className="block font-bold text-slate-700 mb-1">طريقة الدفع</label>
            <select className="w-full p-2.5 rounded-xl border font-bold bg-white" value={headerData.pay_type} onChange={e=>setHeaderData(p=>({...p,pay_type:e.target.value}))}>
              {(typeof PAY_METHODS!=='undefined'?PAY_METHODS:['نقدي','حوالة بنكية','آجل']).map(pt=><option key={pt} value={pt}>{pt}</option>)}
            </select>
          </div>
          <div><label className="block font-bold text-slate-700 mb-1">حساب الدفع</label>
            <select className="w-full p-2.5 rounded-xl border font-bold bg-white" value={headerData.payment_source} onChange={e=>setHeaderData(p=>({...p,payment_source:e.target.value}))}>
              <option value="">-- اختر حساب الدفع --</option>
              {(accounts||[]).map(a=>{const c=a.acc_code||a.code||'',n=a.acc_name||a.name||'';return <option key={c} value={String(c)}>{c} - {n}</option>;})}
            </select>
          </div>
          <div><label className="block font-bold text-slate-700 mb-1">📲 رقم الحوالة</label><input type="text" className="w-full p-2.5 rounded-xl border font-bold bg-white text-purple-900" placeholder="TRF-12345" value={headerData.transfer_no} onChange={e=>setHeaderData(p=>({...p,transfer_no:e.target.value}))} /></div>
          <div><label className="block font-bold text-slate-700 mb-1">🖼️ إرفاق صورة السند</label>
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-900 font-bold p-2.5 rounded-xl text-center flex items-center justify-center">📷 اختر صورة<input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></label>
              {headerData.receipt_url && <button type="button" onClick={()=>setPreviewImage(headerData.receipt_url)} className="p-2 bg-emerald-100 text-emerald-900 rounded-xl font-black">🖼️</button>}
            </div>
          </div>
          <div><label className="block font-bold text-slate-700 mb-1">📅 تاريخ الفاتورة</label><input type="date" className="w-full p-2.5 rounded-xl border font-bold bg-white" value={headerData.date} onChange={e=>setHeaderData(p=>({...p,date:e.target.value}))} /></div>
        </div>

        {/* نموذج الصنف */}
        <form onSubmit={handleAddOrUpdateItem} className="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-3">
          <div className="flex justify-between items-center border-b border-purple-200 pb-2">
            <span className="font-black text-purple-950">{editingIndex!==null?'✏️ تعديل الصنف':'➕ إضافة صنف جديد'}</span>
            {editingIndex!==null&&<button type="button" onClick={()=>{setEditingIndex(null);setItemData(emptyItem());}} className="text-rose-500 font-bold underline">إلغاء</button>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-end">
            <div className="col-span-2 sm:col-span-2"><label className="block font-bold text-slate-700 mb-1">اسم الصنف / القماش *</label><input type="text" required className="w-full p-2.5 rounded-xl border bg-white font-bold" placeholder="تفتة تركي / تل ناعم فسفوري..." value={itemData.item} onChange={e=>setItemData(p=>({...p,item:e.target.value}))} /></div>
            <div><label className="block font-bold text-slate-700 mb-1">📐 وحدة القياس</label><select className="w-full p-2.5 rounded-xl border bg-white font-bold" value={itemData.unit} onChange={e=>setItemData(p=>({...p,unit:e.target.value}))}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
            <div><label className="block font-bold text-slate-700 mb-1">الكمية</label><input type="number" step="0.01" min="0" className="w-full p-2.5 rounded-xl border bg-white text-center font-bold" placeholder="الكمية" value={itemData.qty} onChange={e=>handleQtyChange(e.target.value)} /></div>
            <div><label className="block font-bold text-purple-800 mb-1">🏷️ السعر الإفرادي</label><input type="number" step="0.01" min="0" className="w-full p-2.5 rounded-xl border bg-white text-center font-black text-purple-900" placeholder="سعر الوحدة" value={itemData.price} onChange={e=>handlePriceChange(e.target.value)} /></div>
            <div><label className="block font-bold text-emerald-800 mb-1">💰 الإجمالي</label><input type="number" step="0.01" min="0" className="w-full p-2.5 rounded-xl border bg-emerald-50 text-center font-black text-emerald-800 border-emerald-300" placeholder="الإجمالي" value={itemData.total} onChange={e=>handleTotalChange(e.target.value)} /></div>
          </div>
          <button type="submit" className={`w-full py-3 font-black text-xs rounded-xl transition shadow ${editingIndex!==null?'bg-amber-500 hover:bg-amber-600 text-white':'bg-purple-900 hover:bg-purple-950 text-white'}`}>{editingIndex!==null?'💾 تحديث الصنف':'➕ إضافة الصنف إلى الفاتورة'}</button>
        </form>

        {/* مسودة الفاتورة */}
        {billItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between"><span className="font-black text-slate-900">📋 أصناف الفاتورة ({billItems.length} صنف)</span><span className="font-extrabold text-purple-900">إجمالي: {grandTotal.toLocaleString()} {headerData.currency}</span></div>
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full text-right text-[11px]">
                <thead><tr className="bg-purple-950 text-white font-black"><th className="p-2">#</th><th className="p-2">الصنف</th><th className="p-2 text-center">الوحدة</th><th className="p-2 text-center">الكمية</th><th className="p-2 text-center">السعر</th><th className="p-2 text-center">الإجمالي</th><th className="p-2 text-center">إجراءات</th></tr></thead>
                <tbody className="divide-y">
                  {billItems.map((bi,idx)=>(
                    <tr key={idx} className={editingIndex===idx?'bg-amber-50':'hover:bg-slate-50'}>
                      <td className="p-2 text-slate-400">{idx+1}</td>
                      <td className="p-2 font-black text-purple-900">{bi.item}</td>
                      <td className="p-2 text-center"><span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded text-[10px] font-bold">{bi.unit}</span></td>
                      <td className="p-2 text-center font-bold">{bi.qty}</td>
                      <td className="p-2 text-center text-purple-800 font-bold">{bi.price} {headerData.currency}</td>
                      <td className="p-2 text-center font-black text-emerald-700">{parseFloat(bi.total).toLocaleString()} {headerData.currency}</td>
                      <td className="p-2 text-center space-x-1 space-x-reverse">
                        <button type="button" onClick={()=>{setItemData({item:bi.item,unit:bi.unit||'متر',qty:String(bi.qty),price:String(bi.price),total:String(bi.total)});setEditingIndex(idx);}} className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-black text-[10px]">✏️</button>
                        <button type="button" onClick={()=>{setBillItems(prev=>prev.filter((_,i)=>i!==idx));if(editingIndex===idx){setEditingIndex(null);setItemData(emptyItem());}}} className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded font-black text-[10px]">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={handleSaveFullBill} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg transition">
              ☁️ حفظ الفاتورة بالكامل في Google Sheets ({billItems.length} أصناف) — الإجمالي: {grandTotal.toLocaleString()} {headerData.currency}
            </button>
          </div>
        )}
      </div>

      {/* ── سجل المشتريات ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-3">
        <h3 className="font-black text-slate-900 text-xs">📜 سجل المشتريات والفواتير السحابية ({purchases.length} سجل)</h3>
        {purchases.length === 0 ? (
          <div className="text-center py-10 text-slate-400 font-bold"><p className="text-2xl mb-2">🛍️</p><p>لا توجد فواتير مسجلة بعد</p></div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-right text-[11px] min-w-[900px]">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-black border-b">
                  <th className="p-2.5">رقم الفاتورة</th><th className="p-2.5">المورد</th><th className="p-2.5">الصنف / القماش</th>
                  <th className="p-2.5 text-center">وحدة القياس</th><th className="p-2.5 text-center">الكمية</th>
                  <th className="p-2.5 text-center">السعر الإفرادي</th><th className="p-2.5 text-center">الإجمالي</th>
                  <th className="p-2.5">رقم الحوالة</th><th className="p-2.5">حساب الدفع</th>
                  <th className="p-2.5 text-center">السند</th><th className="p-2.5">التاريخ</th>
                  <th className="p-2.5 text-center">تعديل</th>
                </tr>
              </thead>
              <tbody className="divide-y font-semibold">
                {purchases.map((p, idx) => {
                  const n = normalizePurchase(p);
                  const itemName = p.item || p.item_name || '';
                  const paymentSrc = String(p.payment_source||'');
                  const accObj = (accounts||[]).find(a=>String(a.acc_code||a.code)===paymentSrc);
                  const accLabel = accObj ? `${accObj.acc_code||accObj.code} - ${accObj.acc_name||accObj.name}` : (paymentSrc||'');
                  return (
                    <tr key={p.id||idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-purple-900">{p.bill_no||'—'}</td>
                      <td className="p-2.5 font-black text-slate-900">{p.supplier||'—'}</td>
                      <td className="p-2.5 font-black text-purple-800">
                        {itemName ? itemName : <span className="text-rose-400 font-bold text-[10px] cursor-pointer underline" onClick={()=>handleOpenEdit(p)}>⚠️ فارغ — انقر للتعديل</span>}
                      </td>
                      <td className="p-2.5 text-center"><span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded text-[10px] font-bold">{n.unit}</span></td>
                      <td className="p-2.5 text-center font-bold">{n.qty>0?n.qty:'—'}</td>
                      <td className="p-2.5 text-center text-purple-800 font-bold">{n.price>0?`${n.price.toLocaleString()} ${p.currency||''}`:'—'}</td>
                      <td className="p-2.5 text-center font-black text-emerald-700">{n.total>0?`${n.total.toLocaleString()} ${p.currency||''}`:'—'}</td>
                      <td className="p-2.5 font-mono text-blue-900 text-[10px]">{n.transfer||'—'}</td>
                      <td className="p-2.5 text-slate-700 text-[10px]">{accLabel||'—'}</td>
                      <td className="p-2.5 text-center">
                        {p.receipt_url ? <button type="button" onClick={()=>setPreviewImage(p.receipt_url)} className="bg-sky-100 hover:bg-sky-200 text-sky-900 px-2 py-1 rounded font-black text-[10px]">🖼️ عرض</button> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="p-2.5 text-slate-500 font-bold">{n.date||'—'}</td>
                      <td className="p-2.5 text-center space-x-1 space-x-reverse">
                        <button type="button" onClick={()=>handleOpenEdit(p)} className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-black text-[10px]">✏️</button>
                        <button type="button" onClick={()=>handleDeleteRecord(p)} className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded font-black text-[10px]">🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


// === FILE: src/features/Inventory.jsx ===
function Inventory({ inventory, setInventory, showToast }) {
  const [formData, setFormData] = React.useState({
    item_name: '', category: FABRIC_CATEGORIES?.[0] || 'أقمشة', qty: '', cost: '', currency: CURRENCIES?.[0] || 'SAR', supply_date: TODAY_STR
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.item_name) return showToast('اسم الصنف مطلوب', 'error');
    
    const newItem = { id: Date.now(), ...formData };
    
    try {
      const res = await callGAS('addInventory', newItem);
      if (res.status === 'success') {
        setInventory([newItem, ...inventory]);
        showToast('تمت إضافة الصنف بنجاح');
      } else showToast('حدث خطأ', 'error');
    } catch (err) {
      showToast('فشل الاتصال', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">{Icons.box} إضافة للمخزون</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm mb-1">اسم الصنف *</label><input type="text" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})} /></div>
            <div><label className="block text-sm mb-1">التصنيف</label><select className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>{(typeof FABRIC_CATEGORIES !== 'undefined' ? FABRIC_CATEGORIES : ['أقمشة']).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="block text-sm mb-1">الكمية المتوفرة</label><input type="number" step="0.1" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.qty} onChange={e => setFormData({...formData, qty: e.target.value})} /></div>
            <div><label className="block text-sm mb-1">التكلفة (للمتر/الحبة)</label><input type="number" step="0.01" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} /></div>
            <div><label className="block text-sm mb-1">العملة</label><select className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>{(CURRENCIES || [currency.display, "YER ﷼", "SAR ﷼"]).map(c => <option key={typeof c === "object" ? c.value : c} value={typeof c === "object" ? c.value : c}>{typeof c === "object" ? c.label : c}</option>)}</select></div>
            <div><label className="block text-sm mb-1">تاريخ التوريد</label><input type="date" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.supply_date} onChange={e => setFormData({...formData, supply_date: e.target.value})} /></div>
          </div>
          
          <div className="flex justify-end"><button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-lg font-bold min-h-[44px]">حفظ الصنف</button></div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 border-b"><tr><th className="p-3">الصنف</th><th className="p-3">التصنيف</th><th className="p-3">الكمية</th><th className="p-3">التكلفة</th><th className="p-3">تاريخ التوريد</th></tr></thead>
          <tbody>
            {inventory.map(i => (
              <tr key={i.id} className="border-b hover:bg-slate-50">
                <td className="p-3 font-medium">{i.item_name}</td><td className="p-3">{i.category}</td><td className="p-3 font-bold">{i.qty}</td>
                <td className="p-3">{i.cost} {i.currency}</td><td className="p-3">{i.supply_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// === FILE: src/features/Accounts.jsx ===
function Accounts({ accounts, setAccounts, showToast }) {
  const [formData, setFormData] = React.useState({
    code: '', name: '', type: ACCOUNT_TYPES?.[0] || 'أصول', balance: '0', created_date: TODAY_STR
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.name) return showToast('الكود والاسم مطلوبان', 'error');
    
    const newAccount = { id: Date.now(), acc_code: formData.code, acc_name: formData.name, code: formData.code, name: formData.name, ...formData };
    
    try {
      const res = await callGAS('addAccount', newAccount);
      if (res.status === 'success') {
        setAccounts([newAccount, ...accounts]);
        showToast('تمت إضافة الحساب بنجاح');
      } else showToast('حدث خطأ', 'error');
    } catch (err) {
      showToast('فشل الاتصال', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">{Icons.briefcase} شجرة الحسابات</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div><label className="block text-sm mb-1">كود الحساب *</label><input type="text" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} /></div>
            <div className="md:col-span-2"><label className="block text-sm mb-1">اسم الحساب *</label><input type="text" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div><label className="block text-sm mb-1">النوع</label><select className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>{(typeof ACCOUNT_TYPES !== 'undefined' ? ACCOUNT_TYPES : ['أصول','خصوم','إيرادات','مصروفات']).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="block text-sm mb-1">الرصيد الافتتاحي</label><input type="number" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} /></div>
          </div>
          
          <div className="flex justify-end"><button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-lg font-bold min-h-[44px]">إضافة الحساب</button></div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 border-b"><tr><th className="p-3">الكود</th><th className="p-3">الاسم</th><th className="p-3">النوع</th><th className="p-3">الرصيد</th><th className="p-3">التاريخ</th></tr></thead>
          <tbody>
            {accounts.map(a => {
              const code = a.acc_code || a.code || a.id;
              const name = a.acc_name || a.name || code;
              return (
                <tr key={code} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-mono">{code}</td><td className="p-3 font-medium">{name}</td><td className="p-3">{a.acc_type || a.type}</td>
                  <td className="p-3 font-bold">{a.balance}</td><td className="p-3">{a.created_date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// === FILE: src/features/Factory.jsx ===
function Factory({ factory, setFactory, showToast }) {
  const [formData, setFormData] = React.useState({
    order_no: '', customer: '', product: '', tailor: '', stage: FACTORY_STAGES?.[0] || 'قص', progress: '0', start_date: TODAY_STR, due_date: TODAY_STR
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.order_no) return showToast('رقم الطلب مطلوب', 'error');
    
    const newF = { id: Date.now(), ...formData };
    
    try {
      const res = await callGAS('updateFactory', newF);
      if (res.status === 'success') {
        setFactory([newF, ...factory]);
        showToast('تم تحديث حالة المشغل');
      } else showToast('حدث خطأ', 'error');
    } catch (err) {
      showToast('فشل الاتصال', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">{Icons.factory} تحديث حالة المشغل</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="block text-sm mb-1">رقم الطلب *</label><input type="text" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.order_no} onChange={e => setFormData({...formData, order_no: e.target.value})} /></div>
            <div><label className="block text-sm mb-1">العميل</label><input type="text" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} /></div>
            <div><label className="block text-sm mb-1">المنتج</label><input type="text" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})} /></div>
            <div><label className="block text-sm mb-1">الخياط/الفني</label><input type="text" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.tailor} onChange={e => setFormData({...formData, tailor: e.target.value})} /></div>
            <div><label className="block text-sm mb-1">المرحلة</label><select className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.stage} onChange={e => setFormData({...formData, stage: e.target.value})}>{(typeof FACTORY_STAGES !== 'undefined' ? FACTORY_STAGES : ['قص', 'خياطة', 'تطريز', 'تشطيب']).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="block text-sm mb-1">نسبة الإنجاز (%)</label><input type="number" min="0" max="100" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.progress} onChange={e => setFormData({...formData, progress: e.target.value})} /></div>
            <div><label className="block text-sm mb-1">تاريخ البدء</label><input type="date" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} /></div>
            <div><label className="block text-sm mb-1">موعد التسليم</label><input type="date" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} /></div>
          </div>
          <div className="flex justify-end"><button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-lg font-bold min-h-[44px]">تحديث الحالة</button></div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {factory.map(f => (
          <div key={f.id} className="bg-white rounded-xl shadow-sm p-4 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-slate-800">طلب #{f.order_no}</span>
              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-bold">{f.stage}</span>
            </div>
            <div className="text-sm text-slate-600 mb-4 space-y-1">
              <p>العميل: {f.customer || '-'}</p>
              <p>المنتج: {f.product || '-'}</p>
              <p>الخياط: {f.tailor || '-'}</p>
              <p>التسليم: <span className="font-medium text-pink-600">{f.due_date}</span></p>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span>الإنجاز</span><span>{f.progress}%</span></div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{width: `${f.progress}%`}}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// === FILE: src/features/Vouchers.jsx ===
function Vouchers({ vouchers, setVouchers, accounts, showToast }) {
  const [formData, setFormData] = React.useState({
    v_no: '', v_type: 'سند قبض', party: '', amount: '', currency: CURRENCIES?.[0] || 'SAR', date: TODAY_STR, notes: '', pay_method: PAY_METHODS?.[0] || 'نقدي', acc_code: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.party || !formData.amount) return showToast('الطرف والمبلغ مطلوبان', 'error');
    
    const newV = { id: Date.now(), ...formData };
    
    try {
      const res = await callGAS('addVoucher', newV);
      if (res.status === 'success') {
        setVouchers([newV, ...vouchers]);
        showToast('تم حفظ السند بنجاح');
      } else showToast('حدث خطأ', 'error');
    } catch (err) {
      showToast('فشل الاتصال', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">{Icons.receipt} إضافة سند (قبض/صرف)</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="block text-sm mb-1">نوع السند</label><select className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.v_type} onChange={e => setFormData({...formData, v_type: e.target.value})}><option>سند قبض</option><option>سند صرف</option></select></div>
            <div><label className="block text-sm mb-1">رقم السند</label><input type="text" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.v_no} onChange={e => setFormData({...formData, v_no: e.target.value})} /></div>
            <div><label className="block text-sm mb-1">{formData.v_type === 'سند قبض' ? 'استلمنا من' : 'صرفنا إلى'} *</label><input type="text" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.party} onChange={e => setFormData({...formData, party: e.target.value})} /></div>
            <div><label className="block text-sm mb-1">المبلغ *</label><input type="number" step="0.01" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} /></div>
            <div><label className="block text-sm mb-1">العملة</label><select className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>{(CURRENCIES || [currency.display, "YER ﷼", "SAR ﷼"]).map(c => <option key={typeof c === "object" ? c.value : c} value={typeof c === "object" ? c.value : c}>{typeof c === "object" ? c.label : c}</option>)}</select></div>
            <div><label className="block text-sm mb-1">طريقة الدفع</label><select className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.pay_method} onChange={e => setFormData({...formData, pay_method: e.target.value})}>{(typeof PAY_METHODS !== 'undefined' ? PAY_METHODS : ['نقدي']).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div>
              <label className="block text-sm mb-1">حساب الصندوق/البنك</label>
              <select className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.acc_code} onChange={e => setFormData({...formData, acc_code: e.target.value})}>
                <option value="">-- اختر حساب --</option>
                {accounts.map(a => {
                  const code = a.acc_code || a.code || a.id;
                  const name = a.acc_name || a.name || code;
                  return <option key={code} value={code}>{code} - {name}</option>;
                })}
              </select>
            </div>
            <div><label className="block text-sm mb-1">التاريخ</label><input type="date" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
            <div className="md:col-span-2 lg:col-span-4"><label className="block text-sm mb-1">البيان / ملاحظات</label><input type="text" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
          </div>
          <div className="flex justify-end"><button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-lg font-bold min-h-[44px]">حفظ السند</button></div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 border-b"><tr><th className="p-3">النوع</th><th className="p-3">الرقم</th><th className="p-3">الطرف</th><th className="p-3">المبلغ</th><th className="p-3">طريقة الدفع</th><th className="p-3">التاريخ</th></tr></thead>
          <tbody>
            {vouchers.map(v => (
              <tr key={v.id} className="border-b hover:bg-slate-50">
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${v.v_type === 'سند قبض' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{v.v_type}</span></td>
                <td className="p-3">{v.v_no}</td><td className="p-3 font-medium">{v.party}</td><td className="p-3 font-bold">{v.amount} {v.currency}</td>
                <td className="p-3">{v.pay_method}</td><td className="p-3">{v.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// === FILE: src/features/Expenses.jsx ===
function Expenses({ expenses, setExpenses, accounts, showToast }) {
  const [formData, setFormData] = React.useState({
    exp_category: EXPENSE_CATEGORIES?.[0] || 'مصروفات تشغيل', amount: '', currency: CURRENCIES?.[0] || 'SAR', date: TODAY_STR, notes: '', pay_method: PAY_METHODS?.[0] || 'نقدي', source_acc: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount) return showToast('المبلغ مطلوب', 'error');
    
    const newE = { id: Date.now(), ...formData };
    
    try {
      const res = await callGAS('addExpense', newE);
      if (res.status === 'success') {
        setExpenses([newE, ...expenses]);
        showToast('تم حفظ المصروف بنجاح');
      } else showToast('حدث خطأ', 'error');
    } catch (err) {
      showToast('فشل الاتصال', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">{Icons.briefcase} تسجيل مصروف جديد</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="block text-sm mb-1">بند المصروف</label><select className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.exp_category} onChange={e => setFormData({...formData, exp_category: e.target.value})}>{(typeof EXPENSE_CATEGORIES !== 'undefined' ? EXPENSE_CATEGORIES : ['إيجار','كهرباء']).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="block text-sm mb-1">المبلغ *</label><input type="number" step="0.01" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} /></div>
            <div><label className="block text-sm mb-1">العملة</label><select className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>{(CURRENCIES || [currency.display, "YER ﷼", "SAR ﷼"]).map(c => <option key={typeof c === "object" ? c.value : c} value={typeof c === "object" ? c.value : c}>{typeof c === "object" ? c.label : c}</option>)}</select></div>
            <div><label className="block text-sm mb-1">طريقة الدفع</label><select className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.pay_method} onChange={e => setFormData({...formData, pay_method: e.target.value})}>{(typeof PAY_METHODS !== 'undefined' ? PAY_METHODS : ['نقدي']).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div>
              <label className="block text-sm mb-1">حساب الدفع</label>
              <select className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.source_acc} onChange={e => setFormData({...formData, source_acc: e.target.value})}>
                <option value="">-- اختر حساب --</option>
                {accounts.map(a => {
                  const code = a.acc_code || a.code || a.id;
                  const name = a.acc_name || a.name || code;
                  return <option key={code} value={code}>{code} - {name}</option>;
                })}
              </select>
            </div>
            <div><label className="block text-sm mb-1">التاريخ</label><input type="date" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
            <div className="md:col-span-2"><label className="block text-sm mb-1">البيان</label><input type="text" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
          </div>
          <div className="flex justify-end"><button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-lg font-bold min-h-[44px]">حفظ المصروف</button></div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 border-b"><tr><th className="p-3">البند</th><th className="p-3">البيان</th><th className="p-3">المبلغ</th><th className="p-3">الدفع</th><th className="p-3">التاريخ</th></tr></thead>
          <tbody>
            {expenses.map(e => (
              <tr key={e.id} className="border-b hover:bg-slate-50">
                <td className="p-3 font-medium">{e.exp_category}</td><td className="p-3">{e.notes}</td><td className="p-3 font-bold text-red-600">{e.amount} {e.currency}</td>
                <td className="p-3">{e.pay_method}</td><td className="p-3">{e.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// === FILE: src/features/Journal.jsx ===
function Journal({ journal, setJournal, accounts, showToast }) {
  const [formData, setFormData] = React.useState({
    entry_no: '', debit: '', credit: '', amount: '', currency: CURRENCIES?.[0] || 'SAR', date: TODAY_STR, notes: '', ref_type: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.debit || !formData.credit || !formData.amount) return showToast('الطرف المدين، الدائن، والمبلغ مطلوبة', 'error');
    if (formData.debit === formData.credit) return showToast('الطرف المدين والدائن يجب أن يكونا مختلفين', 'error');
    
    const newJ = { id: Date.now(), ...formData };
    
    try {
      const res = await callGAS('addJournalEntry', newJ);
      if (res.status === 'success') {
        setJournal([newJ, ...journal]);
        showToast('تم حفظ القيد بنجاح');
      } else showToast('حدث خطأ', 'error');
    } catch (err) {
      showToast('فشل الاتصال', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">{Icons.briefcase} إضافة قيد يومية</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="block text-sm mb-1">رقم القيد</label><input type="text" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.entry_no} onChange={e => setFormData({...formData, entry_no: e.target.value})} /></div>
            <div>
              <label className="block text-sm mb-1">من حساب (المدين) *</label>
              <select className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.debit} onChange={e => setFormData({...formData, debit: e.target.value})}>
                <option value="">-- اختر حساب --</option>
                {accounts.map(a => {
                  const code = a.acc_code || a.code || a.id;
                  const name = a.acc_name || a.name || code;
                  return <option key={code} value={code}>{code} - {name}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">إلى حساب (الدائن) *</label>
              <select className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.credit} onChange={e => setFormData({...formData, credit: e.target.value})}>
                <option value="">-- اختر حساب --</option>
                {accounts.map(a => {
                  const code = a.acc_code || a.code || a.id;
                  const name = a.acc_name || a.name || code;
                  return <option key={code} value={code}>{code} - {name}</option>;
                })}
              </select>
            </div>
            <div><label className="block text-sm mb-1">المبلغ *</label><input type="number" step="0.01" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} /></div>
            <div><label className="block text-sm mb-1">العملة</label><select className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>{(CURRENCIES || [currency.display, "YER ﷼", "SAR ﷼"]).map(c => <option key={typeof c === "object" ? c.value : c} value={typeof c === "object" ? c.value : c}>{typeof c === "object" ? c.label : c}</option>)}</select></div>
            <div><label className="block text-sm mb-1">التاريخ</label><input type="date" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
            <div className="md:col-span-2"><label className="block text-sm mb-1">البيان</label><input type="text" className="w-full border rounded-lg p-2 min-h-[44px]" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
          </div>
          <div className="flex justify-end"><button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-lg font-bold min-h-[44px]">حفظ القيد</button></div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 border-b"><tr><th className="p-3">رقم</th><th className="p-3">المدين</th><th className="p-3">الدائن</th><th className="p-3">المبلغ</th><th className="p-3">التاريخ</th><th className="p-3">البيان</th></tr></thead>
          <tbody>
            {journal.map(j => {
              const debitAcc = accounts.find(a => a.code == j.debit)?.name || j.debit;
              const creditAcc = accounts.find(a => a.code == j.credit)?.name || j.credit;
              return (
                <tr key={j.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-medium">{j.entry_no}</td><td className="p-3">{debitAcc}</td><td className="p-3">{creditAcc}</td>
                  <td className="p-3 font-bold">{j.amount} {j.currency}</td><td className="p-3">{j.date}</td><td className="p-3">{j.notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// === FILE: src/features/Reports.jsx ===
function Reports({ orders, expenses, showToast }) {
  const [dateRange, setDateRange] = React.useState({ start: '', end: TODAY_STR });
  const [currency, setCurrency] = React.useState(CURRENCIES?.[0] || 'SAR');

  const filteredOrders = orders.filter(o => o.currency === currency && (!dateRange.start || o.order_date >= dateRange.start) && (!dateRange.end || o.order_date <= dateRange.end));
  const filteredExpenses = expenses.filter(e => e.currency === currency && (!dateRange.start || e.date >= dateRange.start) && (!dateRange.end || e.date <= dateRange.end));

  const totalRev = filteredOrders.reduce((sum, o) => sum + (parseFloat(o.total)||0), 0);
  const totalExp = filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount)||0), 0);
  const netProfit = totalRev - totalExp;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">{Icons.chart} التقارير المالية</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div><label className="block text-sm mb-1">من تاريخ</label><input type="date" className="w-full border rounded-lg p-2 min-h-[44px]" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} /></div>
          <div><label className="block text-sm mb-1">إلى تاريخ</label><input type="date" className="w-full border rounded-lg p-2 min-h-[44px]" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} /></div>
          <div><label className="block text-sm mb-1">العملة</label><select className="w-full border rounded-lg p-2 min-h-[44px]" value={currency} onChange={e => setCurrency(e.target.value)}>{(CURRENCIES || ["USD $", "YER ﷼", "SAR ﷼"]).map(c => <option key={typeof c === "object" ? c.value : c} value={typeof c === "object" ? c.value : c}>{typeof c === "object" ? c.label : c}</option>)}</select></div>
          <div><button className="w-full bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-bold min-h-[44px]">تصفية</button></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm mb-1">إجمالي الإيرادات</p>
          <h3 className="text-2xl font-bold text-green-600">{totalRev.toLocaleString()} <span className="text-sm">{currency}</span></h3>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm mb-1">إجمالي المصروفات</p>
          <h3 className="text-2xl font-bold text-red-600">{totalExp.toLocaleString()} <span className="text-sm">{currency}</span></h3>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm mb-1">صافي الربح</p>
          <h3 className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{netProfit.toLocaleString()} <span className="text-sm">{currency}</span></h3>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm mb-1">عدد الطلبات</p>
          <h3 className="text-2xl font-bold text-slate-800">{filteredOrders.length}</h3>
        </div>
      </div>
    </div>
  );
}


// === FILE: src/features/Settings.jsx ===
function Settings({ showToast }) {
  const [formData, setFormData] = useState({
    companyName: localStorage.getItem('erp_company_name') || 'مؤسسة الأميرات الصغيرات',
    phone:       localStorage.getItem('erp_phone')        || '+966xxxxxxxxx',
    address:     localStorage.getItem('erp_address')      || 'الرياض',
    fiscalDate:  localStorage.getItem('erp_fiscal_date')  || '2026-01-01'
  });

  // ── العملة الافتراضية ──────────────────────────────────
  const { currency, updateCurrency, SYSTEM_CURRENCY_OPTIONS: currencyOpts } = useCurrency();

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('erp_company_name', formData.companyName);
    localStorage.setItem('erp_phone',        formData.phone);
    localStorage.setItem('erp_address',      formData.address);
    localStorage.setItem('erp_fiscal_date',  formData.fiscalDate);
    showToast('✅ تم حفظ الإعدادات بنجاح وتطبيقها على كامل النظام');
  };

  return (
    <div className="space-y-6 animate-fadeIn text-xs" dir="rtl">

      {/* بطاقة بيانات المؤسسة */}
      <div className="bg-white rounded-3xl shadow-sm p-6 border border-slate-200 space-y-5">
        <div className="border-b pb-3 flex items-center gap-2">
          <h2 className="font-black text-sm md:text-base text-slate-900 flex items-center gap-2">
            {Icons.Settings()} إعدادات المؤسسة والنظام
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">اسم المؤسسة</label>
              <input type="text" className="w-full p-3.5 rounded-2xl border bg-slate-50 font-semibold min-h-[44px] focus:bg-white transition" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
            </div>
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">رقم الهاتف</label>
              <input type="text" className="w-full p-3.5 rounded-2xl border bg-slate-50 font-semibold min-h-[44px] focus:bg-white transition" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">العنوان</label>
              <input type="text" className="w-full p-3.5 rounded-2xl border bg-slate-50 font-semibold min-h-[44px] focus:bg-white transition" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">بداية السنة المالية 📅</label>
              <input type="date" className="w-full p-3.5 rounded-2xl border bg-slate-50 font-bold text-purple-950 min-h-[44px]" value={formData.fiscalDate} onChange={e => setFormData({...formData, fiscalDate: e.target.value})} />
            </div>
          </div>

          {/* ── قسم العملة الافتراضية ── */}
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-amber-200 pb-2">
              <span className="text-lg">💱</span>
              <h3 className="font-black text-amber-950 text-sm">العملة الافتراضية للنظام</h3>
            </div>
            <p className="text-[11px] text-amber-800 font-semibold">
              سيتم تطبيق هذه العملة تلقائياً على جميع الشاشات: المنتجات، الطلبات، المشتريات، السندات، والتقارير.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(currencyOpts || []).map(opt => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => updateCurrency(opt.code)}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 font-black transition-all min-h-[60px] ${
                    currency.code === opt.code
                      ? 'bg-amber-400 border-amber-500 text-amber-950 shadow-md scale-[1.02]'
                      : 'bg-white border-amber-200 text-slate-700 hover:border-amber-400 hover:bg-amber-50'
                  }`}
                >
                  <div className="text-right">
                    <div className="text-base font-black">{opt.symbol} {opt.code}</div>
                    <div className="text-[10px] font-semibold opacity-75">{opt.label}</div>
                  </div>
                  {currency.code === opt.code && (
                    <span className="text-amber-700 text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-white border border-amber-300 rounded-2xl px-4 py-2.5">
              <span className="text-amber-600">⚡</span>
              <span className="text-[11px] font-bold text-amber-900">
                العملة الحالية المفعّلة في كامل النظام:
                <span className="text-amber-700 font-black mr-1">{currency.display} — {currency.label}</span>
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="px-8 py-3 min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-2xl shadow-md transition-all">
              💾 حفظ جميع الإعدادات
            </button>
          </div>
        </form>
      </div>

      {/* بطاقة النسخ الاحتياطي */}
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-700 text-white space-y-3">
        <h3 className="font-black text-amber-300 flex items-center gap-2">☁️ النسخ الاحتياطي السحابي</h3>
        <p className="text-sm text-slate-300 font-semibold">
          النظام متصل بجداول بيانات Google Sheets، وجميع البيانات تُحفظ تلقائياً في السحابة لحظةً بلحظة.
        </p>
        <button
          onClick={() => showToast('☁️ البيانات متزامنة مع Google Sheets بنجاح')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs min-h-[44px] transition"
        >
          🔄 تزامن الآن مع Google Sheets
        </button>
      </div>
    </div>
  );
}


// === FILE: src/App.jsx ===
function App() {
  const { useState, useEffect, useCallback } = React;
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [menuDrawer, setMenuDrawer] = useState(false);
  const [toast, setToast] = useState(null);

  // ── العملة الافتراضية — تُحمَّل من localStorage عند أول تشغيل ──
  const [systemCurrency, setSystemCurrency] = useState(() => {
    try {
      const stored = localStorage.getItem('erp_system_currency');
      const opts = [{code:'USD',symbol:'$',label:'دولار أمريكي',display:'USD $'},{code:'YER',symbol:'﷼',label:'ريال يمني',display:'YER ﷼'},{code:'SAR',symbol:'﷼',label:'ريال سعودي',display:'SAR ﷼'}];
      return opts.find(c => c.code === stored) || opts[0];
    } catch(e) { return {code:'USD',symbol:'$',label:'دولار أمريكي',display:'USD $'}; }
  });

  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [accounts, setAccounts] = useState(typeof INITIAL_ACCOUNTS !== 'undefined' ? INITIAL_ACCOUNTS : []);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [factory, setFactory] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [journal, setJournal] = useState([]);

  const showToast = useCallback((msg, type = 'success') => {
    const text = typeof msg === 'object' ? (msg.message || String(msg)) : String(msg);
    setToast(text);
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    const initData = async () => {
      try {
        if (typeof window.loadAllData === 'function') {
          const data = await window.loadAllData();
          if (data) {
            setCustomers(data.customers || []);
            setInventory(data.inventory || []);
            setAccounts(data.accounts || []);
            setProducts(data.products || []);
            setOrders(data.orders || []);
            setPurchases(data.purchases || []);
            setFactory(data.factory || []);
            setVouchers(data.vouchers || []);
            setExpenses(data.expenses || []);
            setJournal(data.journal || []);
          }
        }
      } catch (e) {
        console.error('Failed to load initial data', e);
      }
    };
    initData();

    // ── الاستماع لتغيير العملة من شاشة الإعدادات ──
    const handleCurrencyChange = (e) => {
      const opts = [{code:'USD',symbol:'$',label:'دولار أمريكي',display:'USD $'},{code:'YER',symbol:'﷼',label:'ريال يمني',display:'YER ﷼'},{code:'SAR',symbol:'﷼',label:'ريال سعودي',display:'SAR ﷼'}];
      const found = opts.find(c => c.code === e.detail.code);
      if (found) setSystemCurrency(found);
    };
    window.addEventListener('erp:currencyChanged', handleCurrencyChange);
    return () => window.removeEventListener('erp:currencyChanged', handleCurrencyChange);
  }, []);

    const allTabs = [
    { id: 'dashboard', label: 'الرئيسية', icon: Icons.Dashboard },
    { id: 'customers', label: 'العملاء والمقاسات', icon: Icons.Users },
    { id: 'products', label: 'المنتجات والتسعير', icon: Icons.Calculator },
    { id: 'orders', label: 'الطلبات والفواتير', icon: Icons.ShoppingBag },
    { id: 'purchases', label: 'المشتريات والتوريد', icon: Icons.Purchases },
    { id: 'inventory', label: 'المخزون الخام', icon: Icons.Scissors },
    { id: 'accounts', label: 'شجرة الحسابات', icon: Icons.Accounts },
    { id: 'factory', label: 'الورشة والإنتاج', icon: Icons.Factory },
    { id: 'vouchers', label: 'السندات المالية', icon: Icons.Vouchers },
    { id: 'expenses', label: 'المصاريف التشغيلية', icon: Icons.Expenses },
    { id: 'journal', label: 'القيود اليومية', icon: Icons.Journal },
    { id: 'reports', label: 'التقارير المالية', icon: Icons.Reports },
    { id: 'settings', label: 'الإعدادات', icon: Icons.Settings }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full overflow-x-hidden text-right" dir="rtl">
      {typeof Toast !== 'undefined' && <Toast toast={toast} onClose={() => setToast(null)} />}
      
      {typeof Header !== 'undefined' && (
        <Header 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          allTabs={allTabs} 
          menuDrawer={menuDrawer} 
          setMenuDrawer={setMenuDrawer} 
        />
      )}
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 pb-28">
        {activeTab === "dashboard"  && <Dashboard setActiveTab={setActiveTab} />}
        {activeTab === "customers"  && <Customers customers={customers} setCustomers={setCustomers} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "products"   && <Products products={products} setProducts={setProducts} inventory={inventory} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "orders"     && <Orders orders={orders} setOrders={setOrders} customers={customers} products={products} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "purchases"  && <Purchases purchases={purchases} setPurchases={setPurchases} inventory={inventory} setInventory={setInventory} accounts={accounts} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "inventory"  && <Inventory inventory={inventory} setInventory={setInventory} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "accounts"   && <Accounts accounts={accounts} setAccounts={setAccounts} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "factory"    && <Factory factory={factory} setFactory={setFactory} showToast={showToast} />}
        {activeTab === "vouchers"   && <Vouchers vouchers={vouchers} setVouchers={setVouchers} accounts={accounts} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "expenses"   && <Expenses expenses={expenses} setExpenses={setExpenses} accounts={accounts} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "journal"    && <Journal journal={journal} setJournal={setJournal} accounts={accounts} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "reports"    && <Reports orders={orders} expenses={expenses} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "settings"   && <Settings showToast={showToast} />}
      </main>

      <footer className="bg-slate-950 text-slate-400 py-6 border-t border-purple-900/40 text-center text-xs font-semibold space-y-1">
        <p className="text-amber-300 font-bold">Little Princesses Organization - Specializing in Children's Garments 👑</p>
        <p className="text-slate-400">النظام المحاسبي والإداري والإنتاجي المتكامل للـ 13 قسماً | دعم سحابي مباشر 24/7</p>
      </footer>

      {typeof MobileNav !== 'undefined' && (
        <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
    </div>
  );
}

if (typeof ReactDOM !== 'undefined') {
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
}


