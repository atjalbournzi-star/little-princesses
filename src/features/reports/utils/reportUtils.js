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
    acc.balance_base = (acc.debit_base === 0 && acc.credit_base === 0 && acc.initial_balance !== 0) ? acc.initial_balance : (acc.initial_balance + movement);
    acc.balance = acc.balance_base;
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

const filterCashBankAccounts = (accounts = [], cleanCodeFn = cleanCode, getCategoryFn = getAccountCategory) => {
  return (accounts || []).filter(a => {
    if (a.is_group) return false;
    const c = cleanCodeFn(a.code || a.id || a.account_code || '');
    const rawId = String(a.id || a.code || a.account_code || '');
    // استبعاد حساب المصروفات 508 وأي مصروفات
    if (c.startsWith('5') || rawId.includes('ACC-5') || c === '508' || rawId.includes('508')) return false;
    if (getCategoryFn(a) !== 'Assets') return false;
    // قصر الاستعلام فقط على حسابات الأصول النقدية التابعة لـ (ACC-101 و ACC-102 و ACC-103)
    const isCashCode = ['101', '102', '103'].some(p => c === p || c.startsWith(p + '.') || c.startsWith(p + '-'));
    const isCashId = ['ACC-101', 'ACC-102', 'ACC-103'].some(p => rawId === p || rawId.startsWith(p + '-') || rawId.startsWith(p + '.'));
    return isCashCode || isCashId;
  });
};

const buildCashBankReconciliation = (cashAccs = [], trialBalanceRows = [], liveAccountsMap = {}, targetCode = 'YER', cleanCodeFn = cleanCode) => {
  return cashAccs.map(acc => {
    const c = cleanCodeFn(acc.code || acc.id || acc.account_code || ''), name = acc.account_name || acc.name || c;
    const isSAR = c === '101.2' || c.endsWith('.2') || c.endsWith('-2') || name.includes('سعودي') || acc.currency === 'SAR';
    const isUSD = c === '101.3' || c.endsWith('.3') || c.endsWith('-3') || name.includes('دولار') || acc.currency === 'USD';
    const nativeCurr = isSAR ? 'SAR' : (isUSD ? 'USD' : 'YER');
    const rate = (typeof window !== 'undefined' && window.CurrencyService) ? window.CurrencyService.getRate(nativeCurr) : (isSAR ? 142.0 : (isUSD ? 535.0 : 1.0));
    const chartAcc = liveAccountsMap[acc.id] || liveAccountsMap[c] || liveAccountsMap[cleanCodeFn(acc.code)] || liveAccountsMap[cleanCodeFn(acc.id)];
    const chartBalanceBase = parseFloat(chartAcc?.balance_base ?? chartAcc?.current_balance ?? chartAcc?.balance ?? acc?.current_balance ?? acc?.balance ?? 0) || 0;
    const tbRow = (trialBalanceRows || []).find(r => String(r.id) === String(acc.id) || cleanCodeFn(r.code) === c || cleanCodeFn(r.id) === c || r.name === name);
    const debitBase = tbRow ? parseFloat(tbRow.total_debit_base || 0) : (chartAcc ? (chartAcc.debit_base || 0) : 0);
    const creditBase = tbRow ? parseFloat(tbRow.total_credit_base || 0) : (chartAcc ? (chartAcc.credit_base || 0) : 0);
    const rawOpening = tbRow ? parseFloat(tbRow.opening_balance_base || 0) : 0;
    let closingLedgerBase = (tbRow && tbRow.net_balance_base != null && Math.abs(parseFloat(tbRow.net_balance_base)) > 0) ? parseFloat(tbRow.net_balance_base) : ((tbRow && (debitBase > 0 || creditBase > 0)) ? ((rawOpening > 0 ? rawOpening : chartBalanceBase) + debitBase - creditBase) : chartBalanceBase);
    if (closingLedgerBase === 0 && chartBalanceBase > 0) closingLedgerBase = chartBalanceBase;
    const openingBase = (rawOpening > 0 || debitBase > 0 || creditBase > 0) ? rawOpening : closingLedgerBase;
    const closingNative = nativeCurr === 'YER' ? closingLedgerBase : (acc.foreign_balance != null && Number(acc.foreign_balance) > 0 ? Number(acc.foreign_balance) : (rate > 0 ? Math.round((closingLedgerBase / rate) * 100) / 100 : closingLedgerBase));
    return {
      id: acc.id, code: c, name, nativeCurr, rate,
      openingTarget: window.CurrencyService ? window.CurrencyService.fromBase(openingBase, targetCode) : openingBase,
      debitTarget: window.CurrencyService ? window.CurrencyService.fromBase(debitBase, targetCode) : debitBase,
      creditTarget: window.CurrencyService ? window.CurrencyService.fromBase(creditBase, targetCode) : creditBase,
      closingLedgerTarget: window.CurrencyService ? window.CurrencyService.fromBase(closingLedgerBase, targetCode) : closingLedgerBase,
      chartBalanceTarget: window.CurrencyService ? window.CurrencyService.fromBase(chartBalanceBase, targetCode) : chartBalanceBase,
      closingNative, diff: Math.abs(closingLedgerBase - chartBalanceBase), isMatched: Math.abs(closingLedgerBase - chartBalanceBase) < 0.05
    };
  });
};

const computeDailySalesData = (orders = [], dateRange = {}, toReportAmountFn = toReportAmount, inDateFn = isInDateRange) => {
  const dailyMap = {}; let totalSales = 0, totalCash = 0, totalCredit = 0;
  (orders || []).forEach(o => {
    const d = (o.order_date || o.date || o.created_at || '').split('T')[0];
    if (!d || !inDateFn(d, dateRange)) return;
    const tot = toReportAmountFn(o.total || o.total_amount || 0, o.currency, o.exchange_rate);
    const pd = toReportAmountFn(o.paid || o.paid_amount || 0, o.currency, o.exchange_rate);
    const rem = Math.max(0, tot - pd);
    totalSales += tot; totalCash += pd; totalCredit += rem;
    if (!dailyMap[d]) dailyMap[d] = { date: d, orderCount: 0, totalSales: 0, cashCollected: 0, creditRemaining: 0 };
    dailyMap[d].orderCount += 1; dailyMap[d].totalSales += tot; dailyMap[d].cashCollected += pd; dailyMap[d].creditRemaining += rem;
  });
  const days = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
  days.forEach(day => { day.collectionRate = day.totalSales > 0 ? (day.cashCollected / day.totalSales) * 100 : 0; });
  return { days, totalSales, totalCash, totalCredit, overallCollectionRate: totalSales > 0 ? (totalCash / totalSales) * 100 : 0, creditRate: totalSales > 0 ? (totalCredit / totalSales) * 100 : 0, orderCount: (orders || []).length };
};

const computeModelProfitabilityData = (products = [], orders = []) => {
  const prods = (products?.length > 0) ? products : [];
  if (prods.length === 0) {
    const map = {};
    (orders || []).forEach(o => {
      const n = o.product_name || 'فستان كوتور ملكي';
      if (!map[n]) {
        const tot = parseFloat(o.total || o.total_amount || 0);
        map[n] = { id: o.product_id || n, name: n, category: 'فساتين جاهزة وتفصيل', sellingPrice: tot, fabricCost: Math.round(tot * 0.45), laborCost: Math.round(tot * 0.15), totalCost: Math.round(tot * 0.60), profit: Math.round(tot * 0.40), marginPct: 40.0, soldCount: 1 };
      } else { map[n].soldCount += 1; }
    });
    return Object.values(map);
  }
  return prods.map(p => {
    const name = p.model_name || p.name || 'موديل راقي خاص', sellingPrice = parseFloat(p.base_price || p.price || 0);
    const fabricCost = parseFloat(p.fabric_cost || 0), laborCost = parseFloat(p.labor_cost || 0), packagingCost = parseFloat(p.packaging_cost || 0);
    const totalCost = (fabricCost + laborCost + packagingCost) > 0 ? (fabricCost + laborCost + packagingCost) : parseFloat(p.cost_price || (sellingPrice * 0.55));
    const profit = Math.max(0, sellingPrice - totalCost), marginPct = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
    const soldCount = (orders || []).filter(o => (o.product_id && String(o.product_id) === String(p.id)) || (o.product_name && o.product_name === name)).length;
    return { id: p.id || p.sku, name, category: p.category || 'فساتين تفصيل', sellingPrice, fabricCost, laborCost, totalCost, profit, marginPct, soldCount };
  });
};

if (typeof window !== 'undefined') {
  window.reportUtils = {
    cleanCode, getAccountCategory, isInDateRange, toReportAmount, fmtMoney,
    computeLiveAccounts, computeProductionStats, computeInventoryStats,
    filterCashBankAccounts, buildCashBankReconciliation,
    computeDailySalesData, computeModelProfitabilityData
  };
}
