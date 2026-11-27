// src/features/reports/hooks/useReportsData.js
const { useState, useEffect, useMemo, useCallback } = React;

function useReportsData({ orders = [], expenses = [], vouchers = [], journal = [], accounts = [], purchases = [], customers = [], inventory = [], products = [], currency }) {
  const u = (typeof window !== 'undefined' && window.reportUtils) ? window.reportUtils : {};
  const cleanCode = u.cleanCode || ((v) => String(v || '').replace(/^ACC[-_]?/i, '').trim());
  const cleanCurrencyName = u.cleanCurrencyName || ((v) => { const s = String(v?.display || v?.label || v || '').trim(); return s.includes('سعودي') || s.includes('SAR') ? 'ريال سعودي' : (s.includes('دولار') || s.includes('USD') || s.includes('$') ? 'دولار أمريكي' : 'ريال يمني'); });
  const getAccountCategory = u.getAccountCategory || (() => 'Assets');
  const isInDateRange = (dStr) => (u.isInDateRange ? u.isInDateRange(dStr, dateRange) : true);

  const [activeTab, setActiveTab] = useState('financial'), [financialSubTab, setFinancialSubTab] = useState('pnl'), [periodPreset, setPeriodPreset] = useState('this_month');
  const [dateRange, setDateRange] = useState({ start: '', end: (typeof window !== 'undefined' && window.TODAY_STR_ISO) || new Date().toISOString().split('T')[0] });
  const [reportCurrency, setReportCurrencyRaw] = useState(() => cleanCurrencyName(currency));
  const setReportCurrency = useCallback((val) => setReportCurrencyRaw(cleanCurrencyName(val)), [cleanCurrencyName]);
  const [selectedLedgerAcc, setSelectedLedgerAcc] = useState(''), [statementType, setStatementType] = useState('treasury'), [selectedPartyId, setSelectedPartyId] = useState('');

  useEffect(() => {
    if (accounts?.length > 0 && (!selectedLedgerAcc || selectedLedgerAcc === '1111')) {
      const def = accounts.find(a => !a.is_group && (a.id === 'ACC-101' || cleanCode(a.code || a.id) === '101')) || accounts.find(a => !a.is_group) || accounts[0];
      if (def) setSelectedLedgerAcc(def.id || def.code);
    }
  }, [accounts, selectedLedgerAcc, cleanCode]);

  useEffect(() => {
    const today = new Date(), y = today.getFullYear(), m = today.getMonth();
    const toYMD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (periodPreset === 'all') setDateRange({ start: '', end: '' });
    else if (periodPreset === 'today') { const iso = toYMD(today); setDateRange({ start: iso, end: iso }); }
    else if (periodPreset === 'this_month') setDateRange({ start: toYMD(new Date(y, m, 1)), end: toYMD(new Date(y, m + 1, 0)) });
    else if (periodPreset === 'this_quarter') { const q = Math.floor(m / 3) * 3; setDateRange({ start: toYMD(new Date(y, q, 1)), end: toYMD(new Date(y, q + 3, 0)) }); }
    else if (periodPreset === 'this_year') setDateRange({ start: `${y}-01-01`, end: `${y}-12-31` });
  }, [periodPreset]);

  useEffect(() => { if (currency) setReportCurrencyRaw(cleanCurrencyName(currency)); }, [currency, cleanCurrencyName]);

  const targetCode = (typeof window !== 'undefined' && window.CurrencyService) ? window.CurrencyService.normalizeCode(reportCurrency) : 'YER';
  const toReportAmount = useCallback((orig, curr, rate) => u.toReportAmount ? u.toReportAmount(orig, curr, rate, targetCode) : (parseFloat(orig) || 0), [targetCode, u]);
  const fmtMoney = useCallback((val, dec) => u.fmtMoney ? u.fmtMoney(val, dec, targetCode) : String(val), [targetCode, u]);

  const filteredJournal = useMemo(() => (Array.isArray(journal) ? journal : []).filter(j => {
    const d = (j.date || j.entry_date || '').split('T')[0];
    return (!dateRange.start || d >= dateRange.start) && (!dateRange.end || d <= dateRange.end);
  }), [journal, dateRange]);

  const liveAccountsMap = useMemo(() => u.computeLiveAccounts ? u.computeLiveAccounts(accounts, filteredJournal, targetCode) : { list: [] }, [accounts, filteredJournal, targetCode, u]);

  const [serverTB, setServerTB] = useState(null), [serverIS, setServerIS] = useState(null), [serverBS, setServerBS] = useState(null);
  const [isTBLoading, setIsTBLoading] = useState(false), [serverGL, setServerGL] = useState(null), [isGLLoading, setIsGLLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (activeTab === 'financial') {
      const qStart = dateRange.start ? `?start_date=${encodeURIComponent(dateRange.start)}` : '';
      const qs = `${qStart}${dateRange.end ? `${qStart ? '&' : '?'}end_date=${encodeURIComponent(dateRange.end)}` : ''}`;
      if (financialSubTab === 'pnl' || financialSubTab === 'balance_sheet') fetch(`/api/reports/income-statement${qs}`).then(r => r.json()).then(res => { if (active && res?.success && res.data) setServerIS(res.data); }).catch(e => console.warn(e));
      if (financialSubTab === 'balance_sheet') fetch(`/api/reports/balance-sheet${qs}`).then(r => r.json()).then(res => { if (active && res?.success && res.data) setServerBS(res.data); }).catch(e => console.warn(e));
      if (financialSubTab === 'trial_balance' || financialSubTab === 'balance_sheet') {
        setIsTBLoading(true);
        fetch(`/api/reports/trial-balance${qs}`).then(r => r.json()).then(res => { if (active && res?.success && res.data) setServerTB(res.data); }).catch(e => console.warn(e)).finally(() => { if (active) setIsTBLoading(false); });
      }
    }
    return () => { active = false; };
  }, [activeTab, financialSubTab, dateRange]);

  useEffect(() => {
    let active = true;
    if (activeTab === 'financial' && financialSubTab === 'general_ledger' && selectedLedgerAcc) {
      setIsGLLoading(true);
      const qAcc = encodeURIComponent(selectedLedgerAcc), qStart = dateRange.start ? `&start_date=${encodeURIComponent(dateRange.start)}` : '', qEnd = dateRange.end ? `&end_date=${encodeURIComponent(dateRange.end)}` : '';
      fetch(`/api/reports/general-ledger?account=${qAcc}${qStart}${qEnd}`).then(r => r.json()).then(res => { if (active && res?.success && res.data) setServerGL(Array.isArray(res.data.rows) ? res.data.rows : []); }).catch(e => console.warn(e)).finally(() => setIsGLLoading(false));
    } else setIsGLLoading(false);
    return () => { active = false; setIsGLLoading(false); };
  }, [activeTab, financialSubTab, selectedLedgerAcc, dateRange]);

  const toTgtExact = useCallback((amt) => (window.CurrencyService ? window.CurrencyService.fromBase(amt, targetCode, null, true) : (parseFloat(amt) || 0)), [targetCode]);

  const pnlData = useMemo(() => {
    if (serverIS && Array.isArray(serverIS.revAccounts)) {
      const revAccounts = serverIS.revAccounts.map(r => ({ ...r, amount: toTgtExact(r.amount) }));
      const cogsAccounts = (serverIS.cogsAccounts || []).map(c => ({ ...c, amount: toTgtExact(c.amount) })), opexAccounts = (serverIS.opexAccounts || []).map(o => ({ ...o, amount: toTgtExact(o.amount) }));
      const totalRevenue = toTgtExact(serverIS.totalRevenue), totalCOGS = toTgtExact(serverIS.totalCOGS);
      const grossProfit = serverIS.grossProfit !== undefined ? toTgtExact(serverIS.grossProfit) : (totalRevenue - totalCOGS);
      const totalOPEX = toTgtExact(serverIS.totalOPEX);
      const totalExpenses = serverIS.totalExpenses !== undefined ? toTgtExact(serverIS.totalExpenses) : (totalCOGS + totalOPEX);
      const netProfit = serverIS.netProfit !== undefined ? toTgtExact(serverIS.netProfit) : (grossProfit - totalOPEX);
      return { revAccounts, totalRevenue, cogsAccounts, totalCOGS, grossProfit, grossMarginPct: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0, opexAccounts, totalOPEX, totalExpenses, netProfit, netMarginPct: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0 };
    }
    const accs = liveAccountsMap.list || [], hasJ = filteredJournal.length > 0;
    const revAccounts = accs.filter(a => !a.is_group && getAccountCategory(a) === 'Revenue').map(a => ({ id: a.id, code: a.code || a.id, name: a.name, amount: Math.max(0, a.balance_target || 0) }));
    const ordersRev = (!hasJ && orders.length > 0) ? orders.filter(o => isInDateRange(o.order_date || o.created_at || o.date)).reduce((s, o) => s + toReportAmount(o.total || o.total_amount, o.currency, o.exchange_rate), 0) : 0;
    let totalRevenue = revAccounts.reduce((s, r) => s + r.amount, 0);
    if (!hasJ && totalRevenue === 0 && ordersRev > 0 && revAccounts.length > 0) { revAccounts[0].amount = ordersRev; totalRevenue = ordersRev; }
    const allExpenses = accs.filter(a => !a.is_group && getAccountCategory(a) === 'Expenses').map(a => ({ id: a.id, code: a.code || a.id, name: a.name, amount: Math.max(0, a.balance_target || 0), type: a.account_type || '' }));
    const cogsAccounts = allExpenses.filter(a => ['501', '504', '5111', '5121'].includes(String(a.code)) || String(a.type).includes('تكلفة') || String(a.type).includes('عمالة') || a.name.includes('أجور') || a.name.includes('تكلفة'));
    const totalCOGS = cogsAccounts.reduce((s, c) => s + c.amount, 0), grossProfit = totalRevenue - totalCOGS, grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const opexAccounts = allExpenses.filter(a => !cogsAccounts.some(c => c.id === a.id));
    const dirExp = (!hasJ && expenses.length > 0) ? expenses.filter(e => isInDateRange(e.date || e.created_at)).reduce((s, e) => s + toReportAmount(e.amount, e.currency, e.exchange_rate), 0) : 0;
    let totalOPEX = opexAccounts.reduce((s, o) => s + o.amount, 0);
    if (!hasJ && totalOPEX === 0 && dirExp > 0 && opexAccounts.length > 0) { opexAccounts[0].amount = dirExp; totalOPEX = dirExp; }
    const totalExpenses = totalCOGS + totalOPEX, netProfit = totalRevenue - totalExpenses, netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    return { revAccounts, totalRevenue, cogsAccounts, totalCOGS, grossProfit, grossMarginPct, opexAccounts, totalOPEX, totalExpenses, netProfit, netMarginPct };
  }, [serverIS, liveAccountsMap, filteredJournal, orders, expenses, dateRange, toReportAmount, getAccountCategory, toTgtExact]);

  const balanceSheetData = useMemo(() => {
    if (serverBS && Array.isArray(serverBS.currentAssets)) {
      const currentAssets = serverBS.currentAssets.map(a => ({ ...a, amount: toTgtExact(a.amount) })), fixedAssets = (serverBS.fixedAssets || []).map(f => ({ ...f, amount: toTgtExact(f.amount) }));
      const totalCurrentAssets = serverBS.totalCurrentAssets !== undefined ? toTgtExact(serverBS.totalCurrentAssets) : currentAssets.reduce((s, a) => s + a.amount, 0);
      const totalFixedAssets = serverBS.totalFixedAssets !== undefined ? toTgtExact(serverBS.totalFixedAssets) : fixedAssets.reduce((s, a) => s + a.amount, 0);
      const totalAssets = serverBS.totalAssets !== undefined ? toTgtExact(serverBS.totalAssets) : (totalCurrentAssets + totalFixedAssets);
      const currentLiabilities = (serverBS.currentLiabilities || []).map(l => ({ ...l, amount: toTgtExact(l.amount) }));
      const totalLiabilities = serverBS.totalLiabilities !== undefined ? toTgtExact(serverBS.totalLiabilities) : currentLiabilities.reduce((s, l) => s + l.amount, 0);
      const equityAccounts = (serverBS.equityAccounts || []).map(e => ({ ...e, amount: toTgtExact(e.amount) }));
      const totalEquityAccounts = serverBS.totalEquityAccounts !== undefined ? toTgtExact(serverBS.totalEquityAccounts) : equityAccounts.reduce((s, e) => s + e.amount, 0);
      const periodProfit = serverBS.periodProfit !== undefined ? toTgtExact(serverBS.periodProfit) : pnlData.netProfit;
      const totalEquity = serverBS.totalEquity !== undefined ? toTgtExact(serverBS.totalEquity) : (totalEquityAccounts + periodProfit);
      const totalLiabilitiesAndEquity = serverBS.totalLiabilitiesAndEquity !== undefined ? toTgtExact(serverBS.totalLiabilitiesAndEquity) : (totalLiabilities + totalEquity);
      const diff = Math.round(Math.abs(totalAssets - totalLiabilitiesAndEquity) * 100) / 100;
      return { currentAssets, totalCurrentAssets, fixedAssets, totalFixedAssets, totalAssets, currentLiabilities, totalLiabilities, equityAccounts, totalEquityAccounts, periodProfit, totalEquity, totalLiabilitiesAndEquity, isBalanced: diff < 0.05, diff };
    }
    const accs = liveAccountsMap.list || [];
    const allAssets = accs.filter(a => !a.is_group && getAccountCategory(a) === 'Assets').map(a => ({ id: a.id, code: a.code || a.id, name: a.name, amount: Math.max(0, a.balance_target || 0) }));
    const fixedAssets = allAssets.filter(a => ['106', '1211'].includes(String(a.code)) || a.name.includes('أصول ثابتة') || a.name.includes('ماكينات'));
    const currentAssets = allAssets.filter(a => !fixedAssets.some(f => f.id === a.id));
    const totalCurrentAssets = currentAssets.reduce((s, a) => s + a.amount, 0), totalFixedAssets = fixedAssets.reduce((s, a) => s + a.amount, 0), totalAssets = totalCurrentAssets + totalFixedAssets;
    const currentLiabilities = accs.filter(a => !a.is_group && getAccountCategory(a) === 'Liabilities').map(l => ({ id: l.id, code: l.code || l.id, name: l.name, amount: Math.max(0, l.balance_target || 0) }));
    const totalLiabilities = currentLiabilities.reduce((s, l) => s + l.amount, 0);
    const equityAccounts = accs.filter(a => !a.is_group && getAccountCategory(a) === 'Equity').map(e => ({ id: e.id, code: e.code || e.id, name: e.name, amount: Math.max(0, e.balance_target || 0) }));
    const periodProfit = pnlData.netProfit, totalEquityAccounts = equityAccounts.reduce((s, e) => s + e.amount, 0), totalEquity = totalEquityAccounts + periodProfit, totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const diff = Math.round(Math.abs(totalAssets - totalLiabilitiesAndEquity) * 100) / 100;
    return { currentAssets, totalCurrentAssets, fixedAssets, totalFixedAssets, totalAssets, currentLiabilities, totalLiabilities, equityAccounts, totalEquityAccounts, periodProfit, totalEquity, totalLiabilitiesAndEquity, isBalanced: diff < 0.05, diff };
  }, [serverBS, liveAccountsMap, pnlData.netProfit, getAccountCategory, toTgtExact]);

  const trialBalanceData = useMemo(() => {
    const rawTB = serverTB || (window.AccountingEngine?.generateTrialBalance ? window.AccountingEngine.generateTrialBalance(journal, accounts, dateRange) : { rows: [] });
    const rows = (rawTB.rows || []).map(r => ({
      ...r,
      opening_target: toTgtExact(r.opening_balance_base || 0),
      total_debit_target: toTgtExact(r.total_debit_base || 0),
      total_credit_target: toTgtExact(r.total_credit_base || 0),
      debit_balance_target: toTgtExact(r.debit_balance_base || 0),
      credit_balance_target: toTgtExact(r.credit_balance_base || 0)
    }));
    const hasSrvTotals = rawTB.grand_total_debit !== undefined && rawTB.grand_total_credit !== undefined;
    const grandOpening = hasSrvTotals ? toTgtExact(rawTB.grand_total_opening || 0) : rows.reduce((s, r) => s + r.opening_target, 0);
    const grandDebit = hasSrvTotals ? toTgtExact(rawTB.grand_total_debit || 0) : rows.reduce((s, r) => s + r.total_debit_target, 0);
    const grandCredit = hasSrvTotals ? toTgtExact(rawTB.grand_total_credit || 0) : rows.reduce((s, r) => s + r.total_credit_target, 0);
    const grandDebitBal = hasSrvTotals ? toTgtExact(rawTB.grand_total_debit_balance || 0) : rows.reduce((s, r) => s + r.debit_balance_target, 0);
    const grandCreditBal = hasSrvTotals ? toTgtExact(rawTB.grand_total_credit_balance || 0) : rows.reduce((s, r) => s + r.credit_balance_target, 0);
    return { rows, grandOpening, grandDebit, grandCredit, grandDebitBal, grandCreditBal, isBalanced: Math.abs(grandDebit - grandCredit) < 0.05 && Math.abs(grandDebitBal - grandCreditBal) < 0.05 };
  }, [serverTB, journal, accounts, dateRange, toTgtExact]);

  const generalLedgerRows = useMemo(() => {
    if (serverGL !== null) {
      return serverGL.map(r => ({
        ...r,
        debit_target: toTgtExact(r.debit_base || 0),
        credit_target: toTgtExact(r.credit_base || 0),
        running_target: toTgtExact(r.running_balance_base !== undefined ? r.running_balance_base : (r.running_target || 0))
      }));
    }
    if (typeof window !== 'undefined' && window.AccountingEngine?.generateGeneralLedger) {
      return window.AccountingEngine.generateGeneralLedger(journal, accounts, selectedLedgerAcc, dateRange).map(r => ({
        ...r,
        debit_target: toTgtExact(r.debit_base),
        credit_target: toTgtExact(r.credit_base),
        running_target: toTgtExact(r.running_balance_base)
      }));
    }
    return [];
  }, [serverGL, journal, accounts, selectedLedgerAcc, dateRange, toTgtExact]);

  const cashBankReconciliation = useMemo(() => {
    if (u.buildCashBankReconciliation && u.filterCashBankAccounts) {
      const cashAccs = u.filterCashBankAccounts(accounts, cleanCode, getAccountCategory);
      return u.buildCashBankReconciliation(cashAccs, trialBalanceData?.rows || [], liveAccountsMap, targetCode, cleanCode);
    }
    const cashAccs = (accounts || []).filter(a => !a.is_group && ['101', '102'].some(p => cleanCode(a.code || a.id).startsWith(p)) && !cleanCode(a.code || a.id).startsWith('5'));
    return cashAccs.map(acc => ({ id: acc.id, code: cleanCode(acc.code || acc.id), name: acc.name, nativeCurr: 'YER', rate: 1, openingTarget: 0, debitTarget: 0, creditTarget: 0, closingLedgerTarget: parseFloat(acc.current_balance) || 0, chartBalanceTarget: parseFloat(acc.current_balance) || 0, closingNative: parseFloat(acc.current_balance) || 0, diff: 0, isMatched: true }));
  }, [accounts, trialBalanceData, liveAccountsMap, targetCode, cleanCode, getAccountCategory, u]);

  const statementData = useMemo(() => {
    if (statementType === 'customer') {
      return (customers || []).filter(c => !selectedPartyId || String(c.id || c.name) === String(selectedPartyId)).map(cust => {
        const cOrders = (orders || []).filter(o => (String(o.customer_id || o.customer_name || o.client_name) === String(cust.id) || String(o.customer_name) === String(cust.name)) && isInDateRange(o.order_date || o.date || o.created_at));
        const cVouchers = (vouchers || []).filter(v => (v.v_type === 'سند قبض' || v.voucher_type === 'سند قبض' || v.payment_type === 'Receipt') && (String(v.party || v.party_name) === String(cust.name) || String(v.customer_id) === String(cust.id)) && isInDateRange(v.date || v.voucher_date || v.created_at));
        return { id: cust.id, name: cust.name, phone: cust.phone || '—', ordersCount: cOrders.length, totalSales: cOrders.reduce((s, o) => s + toReportAmount(o.total || o.total_amount, o.currency, o.exchange_rate), 0), totalPaid: cVouchers.reduce((s, v) => s + toReportAmount(v.amount, v.currency, v.exchange_rate), 0), balanceDue: Math.max(0, cOrders.reduce((s, o) => s + toReportAmount(o.total || o.total_amount, o.currency, o.exchange_rate), 0) - cVouchers.reduce((s, v) => s + toReportAmount(v.amount, v.currency, v.exchange_rate), 0)) };
      });
    }
    const supMap = {};
    (purchases || []).forEach(p => { const n = String(p.supplier || p.supplier_name || p.vendor_name || '').trim(); if (n && !supMap[n]) supMap[n] = { id: p.supplier_id || n, name: n, phone: p.supplier_phone || p.phone || '—' }; });
    (vouchers || []).forEach(v => { const isPay = v.v_type === 'سند صرف' || v.voucher_type === 'سند صرف' || v.payment_type === 'Payment', p = String(v.party || v.party_name || '').trim(); if (isPay && p && !supMap[p]) supMap[p] = { id: v.supplier_id || p, name: p, phone: '—' }; });
    return Object.values(supMap).filter(s => !selectedPartyId || s.name === selectedPartyId || s.id === selectedPartyId).map(sup => {
      const sPurchases = (purchases || []).filter(p => (String(p.supplier || p.supplier_name || p.vendor_name || '').trim() === sup.name || (sup.id && String(p.supplier_id || '') === sup.id)) && isInDateRange(p.invoice_date || p.date || p.created_at));
      const sVouchers = (vouchers || []).filter(v => (v.v_type === 'سند صرف' || v.voucher_type === 'سند صرف' || v.payment_type === 'Payment') && (String(v.party || v.party_name || '').includes(sup.name) || (sup.id && String(v.supplier_id || '') === sup.id)) && isInDateRange(v.date || v.voucher_date || v.created_at));
      let cashPur = 0, credPur = 0, totPur = 0;
      sPurchases.forEach(p => { const amt = toReportAmount(p.total || p.amount || p.total_amount, p.currency, p.exchange_rate); totPur += amt; if (String(p.payment_method || '').includes('آجل')) credPur += amt; else cashPur += amt; });
      const vPaid = sVouchers.reduce((s, v) => s + toReportAmount(v.amount, v.currency, v.exchange_rate), 0), totPaid = cashPur + vPaid;
      return { id: sup.id, name: sup.name, phone: sup.phone, purchasesCount: sPurchases.length, totalPurchases: totPur, cashPurchases: cashPur, creditPurchases: credPur, vouchersPaid: vPaid, totalPaid: totPaid, balanceDue: Math.max(0, totPur - totPaid), advancePaid: Math.max(0, totPaid - totPur) };
    });
  }, [statementType, selectedPartyId, customers, purchases, orders, vouchers, toReportAmount, dateRange]);

  const dailySalesData = useMemo(() => (u.computeDailySalesData ? u.computeDailySalesData(orders, dateRange, toReportAmount, isInDateRange) : { days: [], totalSales: 0, totalCash: 0, totalCredit: 0, overallCollectionRate: 0, creditRate: 0, orderCount: (orders || []).length }), [orders, dateRange, toReportAmount, u]);
  const modelProfitabilityData = useMemo(() => (u.computeModelProfitabilityData ? u.computeModelProfitabilityData(products, orders) : []), [products, orders, u]);
  const productionStats = useMemo(() => (u.computeProductionStats ? u.computeProductionStats(orders) : null) || { totalOrders: 0, inProdCount: 0, completedCount: 0, totalWages: 0, totalFabricUsed: 0 }, [orders, u]);
  const inventoryStats = useMemo(() => (u.computeInventoryStats ? u.computeInventoryStats(inventory) : null) || { totalItems: 0, totalValuation: 0, lowStockCount: 0, totalFabrics: 0 }, [inventory, u]);

  return {
    activeTab, setActiveTab, financialSubTab, setFinancialSubTab, periodPreset, setPeriodPreset, dateRange, setDateRange,
    reportCurrency, setReportCurrency, selectedLedgerAcc, setSelectedLedgerAcc, statementType, setStatementType, selectedPartyId, setSelectedPartyId,
    targetCode, toReportAmount, fmtMoney, filteredJournal, liveAccountsMap, pnlData, balanceSheetData, trialBalanceData,
    generalLedgerRows, cashBankReconciliation, statementData, dailySalesData, modelProfitabilityData, productionStats, inventoryStats, isTBLoading, isGLLoading
  };
}
if (typeof window !== 'undefined') window.useReportsData = useReportsData;
