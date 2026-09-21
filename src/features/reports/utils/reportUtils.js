// src/features/reports/utils/reportUtils.js

const cleanCode = (val) => {
  if (!val) return '';
  let s = String(val).trim();
  if (s.includes(' - ')) s = s.split(' - ')[0].trim();
  if (s.startsWith('ACC-') || s.startsWith('ACC_')) s = s.slice(4).trim();
  return s;
};

const getAccountCategory = (acc) => {
  const rawType = String(acc?.account_type || acc?.acc_type || acc?.account_category || '').trim().toLowerCase();
  const rawCode = String(acc?.code || acc?.account_code || acc?.id || '').replace(/^ACC[-_]?/i, '').trim();

  if (rawType.includes('asset') || rawType.includes('أصول') || rawType.includes('اصول') || rawCode.startsWith('1')) return 'Assets';
  if (rawType.includes('liabilit') || rawType.includes('خصوم') || rawType.includes('التزام') || rawCode.startsWith('2')) return 'Liabilities';
  if (rawType.includes('equity') || rawType.includes('ملكي') || rawCode.startsWith('3')) return 'Equity';
  if (rawType.includes('revenu') || rawType.includes('إيراد') || rawType.includes('ايراد') || rawType.includes('مبيعات') || rawCode.startsWith('4')) return 'Revenue';
  if (rawType.includes('expens') || rawType.includes('مصروف') || rawType.includes('تكاليف') || rawType.includes('تكلفة') || rawCode.startsWith('5')) return 'Expenses';
  return 'Assets';
};

const isInDateRange = (dStr, dateRange) => {
  if (!dStr) return true;
  const d = String(dStr).split('T')[0];
  if (dateRange?.start && d < dateRange.start) return false;
  if (dateRange?.end && d > dateRange.end) return false;
  return true;
};

const toReportAmount = (origAmount, itemCurrency, itemRate, targetCode = 'YER') => {
  const num = parseFloat(origAmount) || 0;
  if (typeof window === 'undefined' || !window.CurrencyService) return num;
  const curr = window.CurrencyService.normalizeCode(itemCurrency || 'YER');
  const baseObj = window.CurrencyService.toBase(num, curr, itemRate);
  return window.CurrencyService.fromBase(baseObj.base_amount, targetCode);
};

const fmtMoney = (val, customDecimals, targetCode = 'YER') => {
  const num = parseFloat(val) || 0;
  const decimals = customDecimals !== undefined ? customDecimals : (targetCode === 'YER' ? 0 : 2);
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const computeLiveAccounts = (accounts = [], filteredJournal = [], targetCode = 'YER') => {
  const map = {}, uniqueAccounts = [];
  (accounts || []).forEach(a => {
    const accId = String(a.id || '').trim(), accCode = String(a.code || a.account_code || '').trim();
    const accObj = {
      ...a, id: accId || `ACC-${accCode}`, code: accCode || cleanCode(accId),
      name: a.account_name || a.name_ar || a.name || accCode || accId,
      account_type: a.account_type || a.acc_type || 'Assets',
      initial_balance: parseFloat(a.current_balance !== undefined ? a.current_balance : (a.balance || a.opening_balance || 0)) || 0,
      debit_base: 0, credit_base: 0, balance_base: 0, balance_target: 0
    };
    uniqueAccounts.push(accObj);
    if (accId) map[accId] = accObj;
    if (accCode) map[accCode] = accObj;
    const c1 = cleanCode(accId), c2 = cleanCode(accCode);
    if (c1) map[c1] = accObj;
    if (c2) map[c2] = accObj;
  });

  filteredJournal.forEach(j => {
    const rate = parseFloat(j.exchange_rate) || 1.0;
    if (Array.isArray(j.lines) && j.lines.length > 0) {
      j.lines.forEach(l => {
        const raw = String(l.account_id || '').trim();
        const obj = map[raw] || map[cleanCode(raw)];
        if (obj) {
          obj.debit_base += l.debit_base !== undefined ? parseFloat(l.debit_base) : ((parseFloat(l.debit) || 0) * rate);
          obj.credit_base += l.credit_base !== undefined ? parseFloat(l.credit_base) : ((parseFloat(l.credit) || 0) * rate);
        }
      });
    } else {
      const d = map[String(j.debit || j.debit_account_id || '').trim()], c = map[String(j.credit || j.credit_account_id || '').trim()];
      const amt = parseFloat(j.amount) || 0, baseAmt = parseFloat(j.base_amount) || (amt * rate);
      if (d) d.debit_base += baseAmt;
      if (c) c.credit_base += baseAmt;
    }
  });

  uniqueAccounts.forEach(acc => {
    const isCredit = ['liabilities', 'equity', 'revenue', 'خصوم', 'حقوق ملكية', 'إيرادات'].includes(String(acc.account_type || '').toLowerCase());
    const movement = isCredit ? (acc.credit_base - acc.debit_base) : (acc.debit_base - acc.credit_base);
    acc.balance_base = (acc.debit_base === 0 && acc.credit_base === 0 && acc.initial_balance !== 0) ? acc.initial_balance : movement;
    acc.balance_target = (typeof window !== 'undefined' && window.CurrencyService) ? window.CurrencyService.fromBase(acc.balance_base, targetCode) : acc.balance_base;
    acc.debit_target = (typeof window !== 'undefined' && window.CurrencyService) ? window.CurrencyService.fromBase(acc.debit_base, targetCode) : acc.debit_base;
    acc.credit_target = (typeof window !== 'undefined' && window.CurrencyService) ? window.CurrencyService.fromBase(acc.credit_base, targetCode) : acc.credit_base;
  });
  map.list = uniqueAccounts;
  return map;
};

const computeProductionStats = (orders = []) => {
  const ords = Array.isArray(orders) ? orders : [];
  const inProd = ords.filter(o => ['مرحلة القص ✂️', 'قيد الخياطة 🪡', 'تعديل مقاسات ورتوش 🪡', 'مرحلة التشطيب والشك 👑'].includes(o.status || o.stage || o.production_status));
  const completed = ords.filter(o => ['جاهز للتسليم 🎁', 'تم التسليم للعميل ✔️', 'جاهز للتسليم 📦', 'تم التسليم ✅'].includes(o.status || o.stage || o.production_status));
  return {
    totalOrders: ords.length, inProdCount: inProd.length, completedCount: completed.length,
    totalWages: ords.reduce((s, o) => s + (parseFloat(o.tailor_wage || o.tailor_fee || o.labor_cost || 0)), 0),
    totalFabricUsed: ords.reduce((s, o) => s + (parseFloat(o.fabric_meters || o.meters || 2.5)), 0)
  };
};

const computeInventoryStats = (inventory = []) => {
  const inv = Array.isArray(inventory) ? inventory : [];
  return {
    totalItems: inv.length,
    totalValuation: inv.reduce((s, item) => s + ((parseFloat(item.quantity || item.qty || 0)) * (parseFloat(item.cost_price || item.unit_price || item.price || 0))), 0),
    lowStockCount: inv.filter(item => (parseFloat(item.quantity || item.qty || 0)) <= (parseFloat(item.min_qty || item.alert_threshold || 5))).length,
    totalFabrics: inv.filter(item => String(item.category || item.type || '').includes('قماش') || String(item.name || '').includes('قماش')).reduce((s, item) => s + (parseFloat(item.quantity || item.qty || 0)), 0)
  };
};

if (typeof window !== 'undefined') {
  window.reportUtils = { cleanCode, getAccountCategory, isInDateRange, toReportAmount, fmtMoney, computeLiveAccounts, computeProductionStats, computeInventoryStats };
}
