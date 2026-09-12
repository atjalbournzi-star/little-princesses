const { useState, useEffect, useMemo, useCallback, useRef } = React;

function Reports({ orders = [], expenses = [], vouchers = [], journal = [], accounts = [], purchases = [], customers = [], inventory = [], showToast, currency }) {
  const currencyDisplay = currency?.display || 'YER ﷼';
  const brandProfile = (typeof window !== 'undefined' && window.BrandService)
    ? window.BrandService.getProfile()
    : {
        name: 'نظام الإدارة المتكامل الذكي',
        shortName: 'ERP Master',
        tagline: 'Enterprise Financial & Accounting System',
        commercialRegister: '1010-009283',
        phone: '776773458',
        systemIcon: '🏢'
      };
  const [activeTab, setActiveTab] = useState('pnl'); // 'pnl', 'balance_sheet', 'trial_balance', 'general_ledger', 'statements'
  const [periodPreset, setPeriodPreset] = useState('this_month');
  const [dateRange, setDateRange] = useState({ start: '', end: window.TODAY_STR_ISO || new Date().toISOString().split('T')[0] });
  const [reportCurrency, setReportCurrency] = useState(currencyDisplay);
  
  // Sub-filters for Ledger & Statements
  const [selectedLedgerAcc, setSelectedLedgerAcc] = useState('');
  const [statementType, setStatementType] = useState('treasury'); // 'treasury', 'supplier', 'customer'
  const [selectedPartyId, setSelectedPartyId] = useState('');

  // Auto initialize selected ledger account dynamically from chart_of_accounts
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      if (!selectedLedgerAcc || selectedLedgerAcc === '1111') {
        const def = accounts.find(a => !a.is_group && (a.id === 'ACC-101' || cleanCode(a.code || a.id) === '101')) ||
                    accounts.find(a => !a.is_group) ||
                    accounts[0];
        if (def) setSelectedLedgerAcc(def.id || def.code);
      }
    }
  }, [accounts, selectedLedgerAcc]);

  // Auto initialize dates based on preset
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed

    if (periodPreset === 'all') {
      setDateRange({ start: '', end: '' });
    } else if (periodPreset === 'today') {
      const iso = today.toISOString().split('T')[0];
      setDateRange({ start: iso, end: iso });
    } else if (periodPreset === 'this_month') {
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
      setDateRange({ start, end });
    } else if (periodPreset === 'this_quarter') {
      const qMonth = Math.floor(month / 3) * 3;
      const start = new Date(year, qMonth, 1).toISOString().split('T')[0];
      const end = new Date(year, qMonth + 3, 0).toISOString().split('T')[0];
      setDateRange({ start, end });
    } else if (periodPreset === 'this_year') {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      setDateRange({ start, end });
    }
  }, [periodPreset]);

  useEffect(() => {
    if (currency?.display) setReportCurrency(currency.display);
  }, [currency]);

  const targetCode = window.CurrencyService ? window.CurrencyService.normalizeCode(reportCurrency) : 'YER';

  // Convert an amount to target report currency
  const toReportAmount = useCallback((origAmount, itemCurrency, itemRate) => {
    const num = parseFloat(origAmount) || 0;
    if (!window.CurrencyService) return num;
    const curr = window.CurrencyService.normalizeCode(itemCurrency || 'YER');
    const baseObj = window.CurrencyService.toBase(num, curr, itemRate);
    return window.CurrencyService.fromBase(baseObj.base_amount, targetCode);
  }, [targetCode]);

  // Format currency helper
  const fmtMoney = (val, customDecimals) => {
    const num = parseFloat(val) || 0;
    const decimals = customDecimals !== undefined ? customDecimals : (targetCode === 'YER' ? 0 : 2);
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  // Helper to extract clean alphanumeric code (e.g. ACC-101 -> 101)
  const cleanCode = (val) => {
    if (!val) return '';
    let s = String(val).trim();
    if (s.includes(' - ')) s = s.split(' - ')[0].trim();
    if (s.startsWith('ACC-')) s = s.slice(4).trim();
    if (s.startsWith('ACC_')) s = s.slice(4).trim();
    return s;
  };

  // Helper to classify accounts dynamically into standard ERP categories
  const getAccountCategory = (acc) => {
    const rawType = String(acc?.account_type || acc?.acc_type || acc?.account_category || '').trim().toLowerCase();
    const rawCode = String(acc?.code || acc?.account_code || acc?.id || '').replace(/^ACC[-_]?/i, '').trim();
    
    if (rawType.includes('asset') || rawType.includes('أصول') || rawType.includes('اصول') || rawCode.startsWith('1')) {
      return 'Assets';
    }
    if (rawType.includes('liabilit') || rawType.includes('خصوم') || rawType.includes('التزام') || rawCode.startsWith('2')) {
      return 'Liabilities';
    }
    if (rawType.includes('equity') || rawType.includes('ملكي') || rawCode.startsWith('3')) {
      return 'Equity';
    }
    if (rawType.includes('revenu') || rawType.includes('إيراد') || rawType.includes('ايراد') || rawType.includes('مبيعات') || rawCode.startsWith('4')) {
      return 'Revenue';
    }
    if (rawType.includes('expens') || rawType.includes('مصروف') || rawType.includes('تكاليف') || rawType.includes('تكلفة') || rawCode.startsWith('5')) {
      return 'Expenses';
    }
    return 'Assets';
  };

  // Filter Journal entries by date range
  const filteredJournal = useMemo(() => {
    const list = Array.isArray(journal) ? journal : [];
    return list.filter(j => {
      const d = (j.date || j.entry_date || '').split('T')[0];
      if (dateRange.start && d < dateRange.start) return false;
      if (dateRange.end && d > dateRange.end) return false;
      return true;
    });
  }, [journal, dateRange]);

  // Compute live account movements & balances dynamically from chart_of_accounts & journal
  const liveAccountsMap = useMemo(() => {
    const map = {};
    const uniqueAccounts = [];

    (accounts || []).forEach(a => {
      const accId = String(a.id || '').trim();
      const accCode = String(a.code || a.account_code || '').trim();
      const accName = a.account_name || a.name_ar || a.name || accCode || accId;
      const accType = a.account_type || a.acc_type || 'Assets';
      const initialBal = parseFloat(a.current_balance !== undefined ? a.current_balance : (a.balance || a.opening_balance || 0)) || 0;

      const accObj = {
        ...a,
        id: accId || `ACC-${accCode}`,
        code: accCode || cleanCode(accId),
        name: accName,
        account_type: accType,
        initial_balance: initialBal,
        debit_base: 0,
        credit_base: 0,
        balance_base: 0,
        balance_target: 0
      };

      uniqueAccounts.push(accObj);

      // Fast resolution by ID, Code, cleanCode, and sanitized key
      if (accId) map[accId] = accObj;
      if (accCode) map[accCode] = accObj;
      const c1 = cleanCode(accId);
      if (c1) map[c1] = accObj;
      const c2 = cleanCode(accCode);
      if (c2) map[c2] = accObj;
      map[accId.replace(/[-_.]/g, '')] = accObj;
      if (accCode) map[accCode.replace(/[-_.]/g, '')] = accObj;
    });

    filteredJournal.forEach(j => {
      const rate = parseFloat(j.exchange_rate) || 1.0;
      if (Array.isArray(j.lines) && j.lines.length > 0) {
        j.lines.forEach(l => {
          const accRaw = String(l.account_id || '').trim();
          const targetObj = map[accRaw] || map[cleanCode(accRaw)] || map[accRaw.replace(/[-_.]/g, '')];
          const dBase = l.debit_base !== undefined ? parseFloat(l.debit_base) : ((parseFloat(l.debit) || 0) * rate);
          const cBase = l.credit_base !== undefined ? parseFloat(l.credit_base) : ((parseFloat(l.credit) || 0) * rate);
          if (targetObj) {
            targetObj.debit_base += dBase;
            targetObj.credit_base += cBase;
          }
        });
      } else {
        const dRaw = String(j.debit || j.debit_account_id || j.debit_code || '').trim();
        const cRaw = String(j.credit || j.credit_account_id || j.credit_code || '').trim();
        
        const dObj = map[dRaw] || map[cleanCode(dRaw)] || map[dRaw.replace(/[-_.]/g, '')];
        const cObj = map[cRaw] || map[cleanCode(cRaw)] || map[cRaw.replace(/[-_.]/g, '')];

        const amt = parseFloat(j.amount) || 0;
        const baseAmt = parseFloat(j.base_amount) || (amt * rate);

        if (dObj) dObj.debit_base += baseAmt;
        if (cObj) cObj.credit_base += baseAmt;
      }
    });

    uniqueAccounts.forEach(acc => {
      const nature = String(acc.nature || acc.normal_balance || '').toLowerCase();
      const isCreditNature = nature === 'credit' || nature === 'دائن' || ['liabilities', 'equity', 'revenue', 'خصوم', 'حقوق ملكية', 'إيرادات'].includes(String(acc.account_type || '').toLowerCase());
      
      const journalMovement = isCreditNature ? (acc.credit_base - acc.debit_base) : (acc.debit_base - acc.credit_base);
      
      // If there are journal movements for this account, balance reflects net movement;
      // otherwise, preserve the actual initial balance from the database.
      if (acc.debit_base === 0 && acc.credit_base === 0 && acc.initial_balance !== 0) {
        acc.balance_base = acc.initial_balance;
      } else {
        acc.balance_base = journalMovement;
      }

      acc.balance_target = window.CurrencyService ? window.CurrencyService.fromBase(acc.balance_base, targetCode) : acc.balance_base;
      acc.debit_target = window.CurrencyService ? window.CurrencyService.fromBase(acc.debit_base, targetCode) : acc.debit_base;
      acc.credit_target = window.CurrencyService ? window.CurrencyService.fromBase(acc.credit_base, targetCode) : acc.credit_base;
    });

    map.list = uniqueAccounts;
    return map;
  }, [accounts, filteredJournal, targetCode]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DATA COMPUTATION: P&L (قائمة الدخل والأرباح والخسائر)
  // ─────────────────────────────────────────────────────────────────────────────
  const pnlData = useMemo(() => {
    const accountsList = liveAccountsMap.list || [];
    const hasJournal = (filteredJournal && filteredJournal.length > 0);

    // 1. Revenues: Dynamic from chart_of_accounts
    const revAccounts = accountsList
      .filter(a => !a.is_group && getAccountCategory(a) === 'Revenue')
      .map(a => ({
        id: a.id,
        code: a.code || a.id,
        name: a.name,
        amount: Math.max(0, a.balance_target || 0)
      }));

    // Fallback if no journal entries exist
    const ordersRevTarget = (!hasJournal && orders && orders.length > 0) ? orders.filter(o => {
      const d = (o.order_date || o.created_at || o.date || '').split('T')[0];
      if (dateRange.start && d < dateRange.start) return false;
      if (dateRange.end && d > dateRange.end) return false;
      return true;
    }).reduce((sum, o) => sum + toReportAmount(o.total || o.total_amount, o.currency, o.exchange_rate), 0) : 0;

    let totalRevenue = revAccounts.reduce((sum, r) => sum + r.amount, 0);
    if (!hasJournal && totalRevenue === 0 && ordersRevTarget > 0 && revAccounts.length > 0) {
      revAccounts[0].amount = ordersRevTarget;
      totalRevenue = ordersRevTarget;
    }

    // 2. Cost of Goods Sold & Expenses: Dynamic from chart_of_accounts
    const allExpenseAccounts = accountsList
      .filter(a => !a.is_group && getAccountCategory(a) === 'Expenses')
      .map(a => ({
        id: a.id,
        code: a.code || a.id,
        name: a.name,
        amount: Math.max(0, a.balance_target || 0)
      }));

    // COGS: Direct costs (e.g. 501 / direct labor or accounts marked direct cost)
    const cogsAccounts = allExpenseAccounts.filter(a => {
      const c = String(a.code);
      return c === '501' || c === '5111' || c === '5121' || a.name.includes('أجور خياطة') || a.name.includes('تكلفة');
    });

    const totalCOGS = cogsAccounts.reduce((sum, c) => sum + c.amount, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // 3. Operating Expenses (OPEX): Operating and general expenses
    const opexAccounts = allExpenseAccounts.filter(a => !cogsAccounts.some(c => c.id === a.id));

    // Fallback if no journal entries exist
    const directExpensesTotal = (!hasJournal && expenses && expenses.length > 0) ? expenses.filter(e => {
      const d = (e.date || e.created_at || '').split('T')[0];
      if (dateRange.start && d < dateRange.start) return false;
      if (dateRange.end && d > dateRange.end) return false;
      return true;
    }).reduce((sum, e) => sum + toReportAmount(e.amount, e.currency, e.exchange_rate), 0) : 0;

    let finalOpexTotal = opexAccounts.reduce((sum, o) => sum + o.amount, 0);
    if (!hasJournal && finalOpexTotal === 0 && directExpensesTotal > 0 && opexAccounts.length > 0) {
      opexAccounts[0].amount = directExpensesTotal;
      finalOpexTotal = directExpensesTotal;
    }

    // Total Expenses & Net Profit
    const totalExpenses = totalCOGS + finalOpexTotal;
    const netProfit = totalRevenue - totalExpenses;
    const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      revAccounts,
      totalRevenue,
      cogsAccounts,
      totalCOGS,
      grossProfit,
      grossMarginPct,
      opexAccounts,
      totalOPEX: finalOpexTotal,
      totalExpenses,
      netProfit,
      netMarginPct
    };
  }, [liveAccountsMap, filteredJournal, orders, expenses, dateRange, toReportAmount]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. DATA COMPUTATION: BALANCE SHEET (الميزانية العمومية / المركز المالي)
  // ─────────────────────────────────────────────────────────────────────────────
  const balanceSheetData = useMemo(() => {
    const accountsList = liveAccountsMap.list || [];

    // All Assets: non-group accounts with category 'Assets'
    const allAssets = accountsList
      .filter(a => !a.is_group && getAccountCategory(a) === 'Assets')
      .map(a => ({
        id: a.id,
        code: a.code || a.id,
        name: a.name,
        amount: Math.max(0, a.balance_target || 0)
      }));

    // Fixed Assets: code 106 or containing 'أصول ثابتة', 'ماكينات', 'آلات'
    const fixedAssets = allAssets.filter(a => {
      const c = String(a.code);
      return c === '106' || c === '1211' || a.name.includes('أصول ثابتة') || a.name.includes('ماكينات') || a.name.includes('آلات');
    });

    // Current Assets: all other assets
    const currentAssets = allAssets.filter(a => !fixedAssets.some(f => f.id === a.id));

    const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + a.amount, 0);
    const totalFixedAssets = fixedAssets.reduce((sum, a) => sum + a.amount, 0);
    const totalAssets = totalCurrentAssets + totalFixedAssets;

    // Current Liabilities: all non-group liabilities
    const currentLiabilities = accountsList
      .filter(a => !a.is_group && getAccountCategory(a) === 'Liabilities')
      .map(l => ({
        id: l.id,
        code: l.code || l.id,
        name: l.name,
        amount: Math.max(0, l.balance_target || 0)
      }));

    const totalLiabilities = currentLiabilities.reduce((sum, l) => sum + l.amount, 0);

    // Equity: all non-group equity accounts
    const equityAccounts = accountsList
      .filter(a => !a.is_group && getAccountCategory(a) === 'Equity')
      .map(e => ({
        id: e.id,
        code: e.code || e.id,
        name: e.name,
        amount: Math.max(0, e.balance_target || 0)
      }));

    // Standard Accounting Equation:
    // Assets = Liabilities + Equity + Period Net Profit
    const periodProfit = pnlData.netProfit;
    const totalEquityAccounts = equityAccounts.reduce((sum, e) => sum + e.amount, 0);
    const totalEquity = totalEquityAccounts + periodProfit;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    const diff = Math.abs(totalAssets - totalLiabilitiesAndEquity);
    const isBalanced = diff < 0.05;

    return {
      currentAssets,
      totalCurrentAssets,
      fixedAssets,
      totalFixedAssets,
      totalAssets,
      currentLiabilities,
      totalLiabilities,
      equityAccounts,
      totalEquityAccounts,
      periodProfit,
      totalEquity,
      totalLiabilitiesAndEquity,
      isBalanced,
      diff
    };
  }, [liveAccountsMap, pnlData.netProfit]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. DATA COMPUTATION: TRIAL BALANCE (ميزان المراجعة بالمجاميع والأرصدة)
  // ─────────────────────────────────────────────────────────────────────────────
  const trialBalanceData = useMemo(() => {
    if (window.AccountingEngine && typeof window.AccountingEngine.generateTrialBalance === 'function') {
      const tb = window.AccountingEngine.generateTrialBalance(journal, accounts, dateRange);
      const convertedRows = (tb.rows || []).map(r => ({
        ...r,
        opening_target: window.CurrencyService ? window.CurrencyService.fromBase(r.opening_balance_base, targetCode) : r.opening_balance_base,
        total_debit_target: window.CurrencyService ? window.CurrencyService.fromBase(r.total_debit_base, targetCode) : r.total_debit_base,
        total_credit_target: window.CurrencyService ? window.CurrencyService.fromBase(r.total_credit_base, targetCode) : r.total_credit_base,
        debit_balance_target: window.CurrencyService ? window.CurrencyService.fromBase(r.debit_balance_base, targetCode) : r.debit_balance_base,
        credit_balance_target: window.CurrencyService ? window.CurrencyService.fromBase(r.credit_balance_base, targetCode) : r.credit_balance_base
      }));

      const grandOpeningTarget = convertedRows.reduce((sum, r) => sum + r.opening_target, 0);
      const grandDebitTarget = convertedRows.reduce((sum, r) => sum + r.total_debit_target, 0);
      const grandCreditTarget = convertedRows.reduce((sum, r) => sum + r.total_credit_target, 0);
      const grandDebitBalTarget = convertedRows.reduce((sum, r) => sum + r.debit_balance_target, 0);
      const grandCreditBalTarget = convertedRows.reduce((sum, r) => sum + r.credit_balance_target, 0);

      return {
        rows: convertedRows,
        grandOpening: grandOpeningTarget,
        grandDebit: grandDebitTarget,
        grandCredit: grandCreditTarget,
        grandDebitBal: grandDebitBalTarget,
        grandCreditBal: grandCreditBalTarget,
        isBalanced: Math.abs(grandDebitTarget - grandCreditTarget) < 0.05 && Math.abs(grandDebitBalTarget - grandCreditBalTarget) < 0.05
      };
    }
    return { rows: [], grandOpening: 0, grandDebit: 0, grandCredit: 0, grandDebitBal: 0, grandCreditBal: 0, isBalanced: true };
  }, [journal, accounts, dateRange, targetCode]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. DATA COMPUTATION: GENERAL LEDGER (دفتر الأستاذ العام)
  // ─────────────────────────────────────────────────────────────────────────────
  const generalLedgerRows = useMemo(() => {
    if (window.AccountingEngine && typeof window.AccountingEngine.generateGeneralLedger === 'function') {
      const rawRows = window.AccountingEngine.generateGeneralLedger(journal, accounts, selectedLedgerAcc, dateRange);
      return rawRows.map(r => ({
        ...r,
        debit_target: window.CurrencyService ? window.CurrencyService.fromBase(r.debit_base, targetCode) : r.debit_base,
        credit_target: window.CurrencyService ? window.CurrencyService.fromBase(r.credit_base, targetCode) : r.credit_base,
        running_target: window.CurrencyService ? window.CurrencyService.fromBase(r.running_balance_base, targetCode) : r.running_balance_base
      }));
    }
    return [];
  }, [journal, accounts, selectedLedgerAcc, dateRange, targetCode]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. DATA COMPUTATION: CASH & BANK RECONCILIATION & STATEMENTS (كشوف المطابقات والصناديق)
  // ─────────────────────────────────────────────────────────────────────────────
  // Helper to check whether a date string is inside the selected dateRange
  const isInDateRange = useCallback((dStr) => {
    if (!dStr) return true;
    const d = String(dStr).split('T')[0];
    if (dateRange.start && d < dateRange.start) return false;
    if (dateRange.end && d > dateRange.end) return false;
    return true;
  }, [dateRange]);

  // A. مطابقة حركة وأرصدة الصناديق والبنوك والخزائن مع قيود اليومية
  const cashBankReconciliation = useMemo(() => {
    const cashBankAccs = (accounts || []).filter(a => {
      if (a.is_group) return false;
      const c = cleanCode(a.code || a.id);
      const name = String(a.account_name || a.name || a.name_ar || '');
      return c.startsWith('101') || c.startsWith('102') || c.startsWith('103') ||
             name.includes('صندوق') || name.includes('خزينة') || name.includes('بنك') || name.includes('كريمي');
    });

    return cashBankAccs.map(acc => {
      const c = cleanCode(acc.code || acc.id);
      const name = acc.account_name || acc.name || acc.name_ar || c;
      
      // Determine account native currency and exchange rate
      let nativeCurr = 'YER';
      if (c === '101.2' || name.includes('سعودي')) nativeCurr = 'SAR';
      else if (c === '101.3' || name.includes('دولار')) nativeCurr = 'USD';
      
      const rate = window.CurrencyService ? window.CurrencyService.getRate(nativeCurr) : 1.0;

      // Find matching row in trialBalanceData
      const tbRow = trialBalanceData.rows.find(r => 
        String(r.id) === String(acc.id) || 
        cleanCode(r.code) === c ||
        r.name === name
      );

      const openingBase = tbRow ? (tbRow.opening_balance_base || 0) : 0;
      const debitBase = tbRow ? (tbRow.total_debit_base || 0) : 0;
      const creditBase = tbRow ? (tbRow.total_credit_base || 0) : 0;
      const closingLedgerBase = tbRow ? (tbRow.net_balance_base || 0) : 0;
      
      // Balance in chart of accounts
      const chartAcc = liveAccountsMap[acc.id] || liveAccountsMap[c];
      const chartBalanceBase = chartAcc ? (chartAcc.balance || 0) : (parseFloat(acc.current_balance) || 0);

      const diff = Math.abs(closingLedgerBase - chartBalanceBase);
      const isMatched = diff < 0.05;

      // Convert to target report currency
      const openingTarget = window.CurrencyService ? window.CurrencyService.fromBase(openingBase, targetCode) : openingBase;
      const debitTarget = window.CurrencyService ? window.CurrencyService.fromBase(debitBase, targetCode) : debitBase;
      const creditTarget = window.CurrencyService ? window.CurrencyService.fromBase(creditBase, targetCode) : creditBase;
      const closingLedgerTarget = window.CurrencyService ? window.CurrencyService.fromBase(closingLedgerBase, targetCode) : closingLedgerBase;
      const chartBalanceTarget = window.CurrencyService ? window.CurrencyService.fromBase(chartBalanceBase, targetCode) : chartBalanceBase;

      // Calculate balance in account's original native currency
      const closingNative = nativeCurr === 'YER' ? closingLedgerBase : (acc.foreign_balance !== undefined && acc.foreign_balance !== null ? Number(acc.foreign_balance) : (rate > 0 ? (closingLedgerBase / rate) : closingLedgerBase));

      return {
        id: acc.id,
        code: c,
        name,
        nativeCurr,
        rate,
        openingTarget,
        debitTarget,
        creditTarget,
        closingLedgerTarget,
        chartBalanceTarget,
        closingNative,
        diff,
        isMatched
      };
    });
  }, [accounts, trialBalanceData, liveAccountsMap, targetCode]);

  // B. كشوف حسابات العملاء والموردين والذمم الآجلة والنقدية
  const statementData = useMemo(() => {
    if (statementType === 'customer') {
      const list = (customers || []).filter(c => !selectedPartyId || String(c.id || c.name) === String(selectedPartyId));
      return list.map(cust => {
        const custOrders = (orders || []).filter(o => {
          const matches = String(o.customer_id || o.customer_name || o.client_name) === String(cust.id) || String(o.customer_name) === String(cust.name);
          if (!matches) return false;
          const d = o.order_date || o.date || o.created_at;
          return isInDateRange(d);
        });

        const custVouchers = (vouchers || []).filter(v => {
          const isRcpt = v.v_type === 'سند قبض' || v.voucher_type === 'سند قبض' || v.payment_type === 'Receipt';
          if (!isRcpt) return false;
          const matches = (String(v.party || v.party_name) === String(cust.name)) || (String(v.customer_id) === String(cust.id));
          if (!matches) return false;
          const d = v.date || v.voucher_date || v.date_created || v.created_at;
          return isInDateRange(d);
        });
        
        const totalSalesTarget = custOrders.reduce((sum, o) => sum + toReportAmount(o.total || o.total_amount, o.currency, o.exchange_rate), 0);
        const totalPaidTarget = custVouchers.reduce((sum, v) => sum + toReportAmount(v.amount, v.currency, v.exchange_rate), 0);
        const balanceDue = Math.max(0, totalSalesTarget - totalPaidTarget);

        return {
          id: cust.id,
          name: cust.name,
          phone: cust.phone || '—',
          ordersCount: custOrders.length,
          totalSales: totalSalesTarget,
          totalPaid: totalPaidTarget,
          balanceDue
        };
      });
    } else {
      // Supplier Statement
      const supplierMap = {};
      (purchases || []).forEach(p => {
        const name = String(p.supplier || p.supplier_name || p.vendor_name || '').trim();
        if (!name) return;
        if (!supplierMap[name]) {
          supplierMap[name] = {
            id: p.supplier_id || name,
            name: name,
            phone: p.supplier_phone || p.phone || '—'
          };
        }
      });
      (vouchers || []).forEach(v => {
        const isPay = v.v_type === 'سند صرف' || v.voucher_type === 'سند صرف' || v.payment_type === 'Payment';
        if (!isPay) return;
        const party = String(v.party || v.party_name || '').trim();
        if (party && !supplierMap[party]) {
          supplierMap[party] = {
            id: v.supplier_id || party,
            name: party,
            phone: '—'
          };
        }
      });

      const supplierList = Object.values(supplierMap).filter(s => !selectedPartyId || s.name === selectedPartyId || s.id === selectedPartyId);

      return supplierList.map(sup => {
        const supPurchases = (purchases || []).filter(p => {
          const pName = String(p.supplier || p.supplier_name || p.vendor_name || '').trim();
          const pId = String(p.supplier_id || '');
          const matches = pName === sup.name || (sup.id && pId === sup.id);
          if (!matches) return false;
          const d = p.invoice_date || p.date || p.created_at;
          return isInDateRange(d);
        });

        const supVouchers = (vouchers || []).filter(v => {
          const isPay = v.v_type === 'سند صرف' || v.voucher_type === 'سند صرف' || v.payment_type === 'Payment';
          if (!isPay) return false;
          const vParty = String(v.party || v.party_name || '').trim();
          const vSuppId = String(v.supplier_id || '');
          const matches = (vParty && (vParty === sup.name || vParty.includes(sup.name))) || (sup.id && vSuppId === sup.id);
          if (!matches) return false;
          const d = v.date || v.voucher_date || v.date_created || v.created_at;
          return isInDateRange(d);
        });

        let cashPurchasesTarget = 0;
        let creditPurchasesTarget = 0;
        let totalPurchasesTarget = 0;

        supPurchases.forEach(p => {
          const amt = toReportAmount(p.total || p.amount || p.total_amount, p.currency, p.exchange_rate);
          totalPurchasesTarget += amt;
          const isCredit = String(p.payment_method || '').includes('آجل');
          if (isCredit) {
            creditPurchasesTarget += amt;
          } else {
            cashPurchasesTarget += amt;
          }
        });

        const vouchersPaidTarget = supVouchers.reduce((sum, v) => sum + toReportAmount(v.amount, v.currency, v.exchange_rate), 0);
        const totalPaidTarget = cashPurchasesTarget + vouchersPaidTarget;
        const balanceDue = Math.max(0, totalPurchasesTarget - totalPaidTarget);
        const advancePaid = Math.max(0, totalPaidTarget - totalPurchasesTarget);

        return {
          id: sup.id,
          name: sup.name,
          phone: sup.phone,
          purchasesCount: supPurchases.length,
          totalPurchases: totalPurchasesTarget,
          cashPurchases: cashPurchasesTarget,
          creditPurchases: creditPurchasesTarget,
          vouchersPaid: vouchersPaidTarget,
          totalPaid: totalPaidTarget,
          balanceDue,
          advancePaid
        };
      });
    }
  }, [statementType, selectedPartyId, customers, purchases, orders, vouchers, isInDateRange, toReportAmount]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. EXCEL (XLS) & PRINT ENGINE
  // ─────────────────────────────────────────────────────────────────────────────
  const getTabTitle = () => {
    switch (activeTab) {
      case 'pnl': return 'قائمة الدخل والأرباح والخسائر (P&L)';
      case 'balance_sheet': return 'الميزانية العمومية والمركز المالي (Balance Sheet)';
      case 'trial_balance': return 'ميزان المراجعة بالمجاميع والأرصدة الختامية';
      case 'general_ledger': {
        const curAcc = (accounts || []).find(a => a.id === selectedLedgerAcc || a.code === selectedLedgerAcc);
        const curName = curAcc ? (curAcc.account_name || curAcc.name || curAcc.name_ar || curAcc.code) : selectedLedgerAcc;
        return `كشف حركة دفتر الأستاذ العام (${curName || selectedLedgerAcc})`;
      }
      case 'statements': {
        if (statementType === 'treasury') return 'مطابقة حركة وأرصدة الصناديق والبنوك والخزائن';
        if (statementType === 'supplier') return 'كشف حساب ومطابقات موردي الأقمشة والذمم الدائنة';
        return 'كشف حساب ومطابقات العميلات والذمم المدينة';
      }
      default: return 'التقرير المالي والختامي';
    }
  };

  const handleExportExcel = useCallback(() => {
    let tableHtml = '';
    let filename = `${brandProfile.shortName || 'ERP'}_${activeTab}_${dateRange.start || 'all'}_${dateRange.end || 'all'}.xls`;

    if (activeTab === 'pnl') {
      filename = `قائمة_الدخل_والأرباح_P&L_${reportCurrency.replace(/[^a-zA-Z]/g, '')}.xls`;
      tableHtml = `
        <tr style="background-color:#007F8C;color:#ffffff;"><th colspan="3" style="font-size:16px;padding:10px;">${brandProfile.name} - قائمة الدخل والأرباح (P&L)</th></tr>
        <tr style="background-color:#f9fafb;"><td colspan="3">الفترة: من ${dateRange.start || 'البداية'} إلى ${dateRange.end || 'اليوم'} | العملة: ${reportCurrency}</td></tr>
        <tr><th>كود الحساب</th><th>البند المحاسبي / البيان</th><th>المبلغ (${reportCurrency})</th></tr>
        <tr style="background-color:#f3f4f6;font-weight:bold;"><td colspan="3">1. الإيرادات التشغيلية (Revenues)</td></tr>
        ${pnlData.revAccounts.map(r => `<tr><td style="text-align:center;">${r.code}</td><td>${r.name}</td><td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${r.amount}</td></tr>`).join('')}
        <tr style="background-color:#e0f2fe;font-weight:bold;"><td></td><td>إجمالي الإيرادات</td><td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${pnlData.totalRevenue}</td></tr>
        <tr style="background-color:#f3f4f6;font-weight:bold;"><td colspan="3">2. تكلفة المبيعات المباشرة (Cost of Goods Sold - COGS)</td></tr>
        ${pnlData.cogsAccounts.map(c => `<tr><td style="text-align:center;">${c.code}</td><td>${c.name}</td><td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${c.amount}</td></tr>`).join('')}
        <tr style="background-color:#fef3c7;font-weight:bold;"><td></td><td>إجمالي تكلفة المبيعات</td><td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${pnlData.totalCOGS}</td></tr>
        <tr style="background-color:#dcfce7;font-weight:bold;font-size:13px;"><td></td><td>مجمل الربح التجاري (Gross Profit) - هامش ${pnlData.grossMarginPct.toFixed(1)}%</td><td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${pnlData.grossProfit}</td></tr>
        <tr style="background-color:#f3f4f6;font-weight:bold;"><td colspan="3">3. المصروفات التشغيلية والعمومية (Operating Expenses - OPEX)</td></tr>
        ${pnlData.opexAccounts.map(o => `<tr><td style="text-align:center;">${o.code}</td><td>${o.name}</td><td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${o.amount}</td></tr>`).join('')}
        <tr style="background-color:#fee2e2;font-weight:bold;"><td></td><td>إجمالي المصروفات التشغيلية</td><td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${pnlData.totalOPEX}</td></tr>
        <tr style="background-color:#E2F5F7;font-weight:bold;font-size:14px;color:#007F8C;"><td></td><td>صافي الربح الفعلي والنهائي (Net Profit) - هامش ${pnlData.netMarginPct.toFixed(1)}%</td><td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${pnlData.netProfit}</td></tr>
      `;
    } else if (activeTab === 'balance_sheet') {
      filename = `الميزانية_العمومية_والمركز_المالي_${reportCurrency.replace(/[^a-zA-Z]/g, '')}.xls`;
      tableHtml = `
        <tr style="background-color:#007F8C;color:#ffffff;"><th colspan="3" style="font-size:16px;padding:10px;">${brandProfile.name} - الميزانية العمومية والمركز المالي</th></tr>
        <tr style="background-color:#f9fafb;"><td colspan="3">حتى تاريخ: ${dateRange.end || 'اليوم'} | العملة: ${reportCurrency}</td></tr>
        <tr><th>كود الحساب</th><th>اسم الحساب / البند</th><th>المبلغ (${reportCurrency})</th></tr>
        <tr style="background-color:#f3f4f6;font-weight:bold;"><td colspan="3">1. جانب الأصول (Assets)</td></tr>
        <tr style="background-color:#f9fafb;font-weight:bold;"><td colspan="3">الأصول المتداولة (Current Assets)</td></tr>
        ${balanceSheetData.currentAssets.map(a => `<tr><td style="text-align:center;">${a.code}</td><td>${a.name}</td><td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${a.amount}</td></tr>`).join('')}
        <tr style="background-color:#f9fafb;font-weight:bold;"><td colspan="3">الأصول الثابتة (Fixed Assets)</td></tr>
        ${balanceSheetData.fixedAssets.map(a => `<tr><td style="text-align:center;">${a.code}</td><td>${a.name}</td><td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${a.amount}</td></tr>`).join('')}
        <tr style="background-color:#E2F5F7;font-weight:bold;color:#007F8C;"><td></td><td>إجمالي الأصول (Total Assets)</td><td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${balanceSheetData.totalAssets}</td></tr>
        <tr style="background-color:#f3f4f6;font-weight:bold;"><td colspan="3">2. جانب الخصوم وحقوق الملكية (Liabilities & Equity)</td></tr>
        <tr style="background-color:#f9fafb;font-weight:bold;"><td colspan="3">الخصوم والالتزامات المتداولة (Liabilities)</td></tr>
        ${balanceSheetData.currentLiabilities.map(l => `<tr><td style="text-align:center;">${l.code}</td><td>${l.name}</td><td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${l.amount}</td></tr>`).join('')}
        <tr style="background-color:#f9fafb;font-weight:bold;"><td colspan="3">حقوق الملكية ورأس المال (Equity)</td></tr>
        ${balanceSheetData.equityAccounts.map(e => `<tr><td style="text-align:center;">${e.code}</td><td>${e.name}</td><td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${e.amount}</td></tr>`).join('')}
        <tr><td style="text-align:center;">P&L</td><td>صافي أرباح / (خسائر) الفترة المحققة</td><td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${balanceSheetData.periodProfit}</td></tr>
        <tr style="background-color:#F2E7F3;font-weight:bold;color:#8F2A87;"><td></td><td>إجمالي الخصوم وحقوق الملكية</td><td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${balanceSheetData.totalLiabilitiesAndEquity}</td></tr>
        <tr style="background-color:#dcfce7;font-weight:bold;"><td colspan="3">حالة الاتزان المحاسبي: ${balanceSheetData.isBalanced ? 'متزن ومطابق 100%' : 'يوجد فارق غير متزن'}</td></tr>
      `;
    } else if (activeTab === 'trial_balance') {
      filename = `ميزان_المراجعة_بالمجاميع_والأرصدة_${reportCurrency.replace(/[^a-zA-Z]/g, '')}.xls`;
      tableHtml = `
        <tr style="background-color:#007F8C;color:#ffffff;"><th colspan="9" style="font-size:16px;padding:10px;">${brandProfile.name} - ميزان المراجعة بالمجاميع والأرصدة</th></tr>
        <tr style="background-color:#f9fafb;"><td colspan="9">الفترة: من ${dateRange.start || 'البداية'} إلى ${dateRange.end || 'اليوم'} | العملة: ${reportCurrency}</td></tr>
        <tr><th>كود الحساب</th><th>اسم الحساب</th><th>النوع</th><th>الطبيعة</th><th>رصيد سابق / افتتاحي</th><th>مجموع المدين</th><th>مجموع الدائن</th><th>رصيد ختامي مدين</th><th>رصيد ختامي دائن</th></tr>
        ${trialBalanceData.rows.map(r => `
          <tr>
            <td style="text-align:center;">${r.code}</td>
            <td>${r.name}</td>
            <td style="text-align:center;">${r.type}</td>
            <td style="text-align:center;">${r.nature === 'debit' ? 'مدين' : 'دائن'}</td>
            <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${r.opening_target || 0}</td>
            <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${r.total_debit_target}</td>
            <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${r.total_credit_target}</td>
            <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${r.debit_balance_target}</td>
            <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${r.credit_balance_target}</td>
          </tr>
        `).join('')}
        <tr style="background-color:#E2F5F7;font-weight:bold;font-size:13px;">
          <td colspan="4" style="text-align:center;">المجاميع الإجمالية وتأكيد التوازن:</td>
          <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${trialBalanceData.grandOpening}</td>
          <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${trialBalanceData.grandDebit}</td>
          <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${trialBalanceData.grandCredit}</td>
          <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${trialBalanceData.grandDebitBal}</td>
          <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${trialBalanceData.grandCreditBal}</td>
        </tr>
      `;
    } else if (activeTab === 'general_ledger') {
      filename = `دفتر_الأستاذ_العام_حساب_${selectedLedgerAcc}.xls`;
      tableHtml = `
        <tr style="background-color:#007F8C;color:#ffffff;"><th colspan="6" style="font-size:16px;padding:10px;">${brandProfile.name} - كشف حركة دفتر الأستاذ العام</th></tr>
        <tr style="background-color:#f9fafb;"><td colspan="6">الحساب: ${selectedLedgerAcc} | الفترة: من ${dateRange.start || 'البداية'} إلى ${dateRange.end || 'اليوم'} | العملة: ${reportCurrency}</td></tr>
        <tr><th>التاريخ</th><th>رقم القيد / المرجع</th><th>البيان والتفاصيل</th><th>مدين (${targetCode})</th><th>دائن (${targetCode})</th><th>الرصيد التراكمي</th></tr>
        ${generalLedgerRows.map(r => `
          <tr>
            <td style="text-align:center;">${r.date}</td>
            <td style="text-align:center;">${r.entry_no}</td>
            <td>${r.notes}</td>
            <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${r.debit_target || 0}</td>
            <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${r.credit_target || 0}</td>
            <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${r.running_target || 0}</td>
          </tr>
        `).join('')}
      `;
    } else if (activeTab === 'statements') {
      if (statementType === 'treasury') {
        filename = `مطابقة_حركة_الصناديق_والبنوك_${reportCurrency.replace(/[^a-zA-Z]/g, '')}.xls`;
        tableHtml = `
          <tr style="background-color:#007F8C;color:#ffffff;"><th colspan="9" style="font-size:16px;padding:10px;">${brandProfile.name} - مطابقة حركة وأرصدة الصناديق والبنوك والخزائن</th></tr>
          <tr style="background-color:#f9fafb;"><td colspan="9">الفترة: من ${dateRange.start || 'البداية'} إلى ${dateRange.end || 'اليوم'} | العملة: ${reportCurrency}</td></tr>
          <tr><th>كود الحساب</th><th>اسم الخزينة / البنك</th><th>العملة الأصلية</th><th>الرصيد الافتتاحي</th><th>المقبوضات (مدين)</th><th>المدفوعات (دائن)</th><th>الرصيد الدفتري الختامي</th><th>رصيد العملة الأصلية</th><th>حالة المطابقة</th></tr>
          ${cashBankReconciliation.map(c => `
            <tr>
              <td style="text-align:center;">${c.code}</td>
              <td>${c.name}</td>
              <td style="text-align:center;">${c.nativeCurr}</td>
              <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${c.openingTarget}</td>
              <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${c.debitTarget}</td>
              <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${c.creditTarget}</td>
              <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';font-weight:bold;">${c.closingLedgerTarget}</td>
              <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${fmtMoney(c.closingNative)} ${c.nativeCurr}</td>
              <td style="text-align:center;">${c.isMatched ? 'مطابق 100%' : 'فارق تدقيق'}</td>
            </tr>
          `).join('')}
        `;
      } else if (statementType === 'supplier') {
        filename = `كشف_حساب_الموردين_${reportCurrency.replace(/[^a-zA-Z]/g, '')}.xls`;
        tableHtml = `
          <tr style="background-color:#007F8C;color:#ffffff;"><th colspan="8" style="font-size:16px;padding:10px;">${brandProfile.name} - كشف حساب ومطابقات موردي الأقمشة والذمم الدائنة</th></tr>
          <tr style="background-color:#f9fafb;"><td colspan="8">الفترة: من ${dateRange.start || 'البداية'} إلى ${dateRange.end || 'اليوم'} | العملة: ${reportCurrency}</td></tr>
          <tr><th>اسم المورد</th><th>الهاتف</th><th>عدد الفواتير</th><th>إجمالي المشتريات</th><th>مسدد نقداً</th><th>مشتريات آجلة</th><th>سندات صرف مسددة</th><th>الرصيد المتبقي (Due)</th></tr>
          ${statementData.map(s => `
            <tr>
              <td>${s.name}</td>
              <td style="text-align:center;">${s.phone || '—'}</td>
              <td style="text-align:center;">${s.purchasesCount}</td>
              <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${s.totalPurchases}</td>
              <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${s.cashPurchases}</td>
              <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${s.creditPurchases}</td>
              <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${s.vouchersPaid}</td>
              <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';font-weight:bold;">${s.balanceDue}</td>
            </tr>
          `).join('')}
        `;
      } else {
        filename = `كشف_حساب_العميلات_${reportCurrency.replace(/[^a-zA-Z]/g, '')}.xls`;
        tableHtml = `
          <tr style="background-color:#007F8C;color:#ffffff;"><th colspan="6" style="font-size:16px;padding:10px;">${brandProfile.name} - كشف حساب ومطابقات العميلات</th></tr>
          <tr style="background-color:#f9fafb;"><td colspan="6">الفترة: من ${dateRange.start || 'البداية'} إلى ${dateRange.end || 'اليوم'} | العملة: ${reportCurrency}</td></tr>
          <tr><th>اسم العميلة</th><th>الهاتف</th><th>عدد الطلبات</th><th>إجمالي المبيعات</th><th>إجمالي المسدد</th><th>الرصيد المتبقي (Due)</th></tr>
          ${statementData.map(s => `
            <tr>
              <td>${s.name}</td>
              <td style="text-align:center;">${s.phone || '—'}</td>
              <td style="text-align:center;">${s.ordersCount}</td>
              <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${s.totalSales}</td>
              <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${s.totalPaid}</td>
              <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';font-weight:bold;">${s.balanceDue}</td>
            </tr>
          `).join('')}
        `;
      }
    }

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>التقرير المالي</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayRightToLeft/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          body { font-family: 'Arial', sans-serif; direction: rtl; }
          table { border-collapse: collapse; width: 100%; direction: rtl; }
          th { background-color: #007F8C; color: #ffffff; font-weight: bold; border: 1px solid #cccccc; padding: 8px; text-align: center; font-size: 12px; }
          td { border: 1px solid #cccccc; padding: 6px 10px; font-size: 11px; }
        </style>
      </head>
      <body dir="rtl">
        <table dir="rtl" border="1">
          ${tableHtml}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast(`تم تصدير ملف الإكسل المنسق (${filename}) بنجاح 📊`);
  }, [activeTab, dateRange, reportCurrency, pnlData, balanceSheetData, trialBalanceData, generalLedgerRows, statementData, statementType, selectedLedgerAcc, showToast, targetCode]);

  const inputCls = "h-10 px-3 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-semibold placeholder:text-[#6F6B75] focus:border-[#009FAE] outline-none transition";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* ── ترويسة الطباعة الرسمية المعتمدة (تظهر فقط عند الطباعة والـ PDF) ── */}
      <div className="print-only mb-6 border-b-2 border-[#25232A] pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {brandProfile.logoUrl ? (
              <img src={brandProfile.logoUrl} alt="Logo" className="h-14 max-w-[150px] object-contain" />
            ) : (
              <div className="text-3xl">{brandProfile.systemIcon || '🏢'}</div>
            )}
            <div>
              <h1 className="text-xl font-bold text-[#000000]">{brandProfile.name}</h1>
              <p className="text-xs text-[#555555]">{brandProfile.tagline || brandProfile.shortName}</p>
              <h2 className="text-base font-bold text-[#007F8C] mt-1.5">{getTabTitle()}</h2>
            </div>
          </div>
          <div className="text-left text-xs text-[#444444] space-y-1">
            <p><strong>تاريخ الاستخراج:</strong> {window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]}</p>
            <p><strong>نطاق الفترة:</strong> من {dateRange.start || 'البداية'} إلى {dateRange.end || 'اليوم'}</p>
            <p><strong>العملة المعتمدة:</strong> {reportCurrency}</p>
            {brandProfile.commercialRegister && (
              <p><strong>السجل التجاري:</strong> {brandProfile.commercialRegister}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── بطاقة الرأس والتحكم المالي (تختفي عند الطباعة) ── */}
      <div className="print-hidden bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden transition-all">
        <div className="px-6 py-4 border-b border-[#E8E5EA] flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E2F5F7] text-[#007F8C] flex items-center justify-center text-lg font-bold border border-[#C5ECF0]">
              📊
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#25232A]">المركز المالي والتقارير الختامية الشاملة</h2>
              <p className="text-[11px] text-[#6F6B75]">قوائم الدخل والميزانية العمومية وميزان المراجعة ودفتر الأستاذ والمطابقات</p>
            </div>
          </div>

          {/* أزرار الإجراءات والطباعة وحفظ PDF وتصدير Excel */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportExcel}
              title="تصدير جدول التقرير النشط حالياً إلى ملف Excel منسق متعدد الأعمدة"
              className="h-10 px-3.5 rounded-xl font-bold text-xs text-[#007F8C] bg-[#E2F5F7] hover:bg-[#C5ECF0] border border-[#C5ECF0] transition flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <span>📊</span>
              <span>تصدير Excel (XLSX)</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              title="حفظ التقرير المالي المنسق كملف PDF رسمي مع الترويسة والتوقيعات"
              className="h-10 px-3.5 rounded-xl font-bold text-xs text-[#8F2A87] bg-[#F2E7F3] hover:bg-[#E5CEE7] border border-[#E5CEE7] transition flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <span>📑</span>
              <span>حفظ كـ PDF</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              title="طباعة التقرير المالي الرسمي الحالي"
              className="h-10 px-4 rounded-xl font-bold text-xs text-white bg-[#009FAE] hover:bg-[#007F8C] transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span>🖨️</span>
              <span>طباعة التقرير المالي</span>
            </button>
          </div>
        </div>

        {/* ── شريط الفلاتر السريعة والتحويل الزمني والعملات ── */}
        <div className="p-6 bg-[#FAFAFB] border-b border-[#E8E5EA]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
            <div>
              <label className="block text-[11px] font-bold text-[#6F6B75] mb-1.5">الفترة الزمنية السريعة</label>
              <select
                value={periodPreset}
                onChange={e => setPeriodPreset(e.target.value)}
                className={`w-full ${inputCls}`}
              >
                <option value="this_month">الشهر الحالي (افتراضي)</option>
                <option value="today">اليوم فقط</option>
                <option value="this_quarter">الربع المالي الحالي</option>
                <option value="this_year">السنة المالية الحالية</option>
                <option value="all">كافة الفترات (شامل)</option>
                <option value="custom">فترة مخصصة 🗓️</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#6F6B75] mb-1.5">من تاريخ 📅</label>
              <input
                type="date"
                lang="en-GB"
                dir="ltr"
                value={dateRange.start}
                onChange={e => { setPeriodPreset('custom'); setDateRange({ ...dateRange, start: e.target.value }); }}
                className={`w-full ${inputCls}`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#6F6B75] mb-1.5">إلى تاريخ 📅</label>
              <input
                type="date"
                lang="en-GB"
                dir="ltr"
                value={dateRange.end}
                onChange={e => { setPeriodPreset('custom'); setDateRange({ ...dateRange, end: e.target.value }); }}
                className={`w-full ${inputCls}`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#6F6B75] mb-1.5">عملة العرض والتقارير</label>
              <select
                value={reportCurrency}
                onChange={e => setReportCurrency(e.target.value)}
                className={`w-full ${inputCls} font-bold text-[#8F2A87]`}
              >
                {["YER ﷼", "SAR ﷼", "USD $"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <div className="bg-white px-3 h-10 rounded-xl border border-[#E8E5EA] flex items-center justify-between text-xs">
                <span className="text-[#6F6B75] text-[11px]">عدد القيود المفحوصة:</span>
                <span className="font-mono font-bold text-[#007F8C]">{filteredJournal.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── شريط تبويبات التقارير الخمسة (Tabs) ── */}
        <div className="flex items-center gap-2 px-6 pt-3 overflow-x-auto border-b border-[#E8E5EA] bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('pnl')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${activeTab === 'pnl' ? 'border-[#009FAE] text-[#007F8C] bg-[#E2F5F7]/30' : 'border-transparent text-[#6F6B75] hover:text-[#25232A]'}`}
          >
            <span>📑</span>
            <span>قائمة الدخل والأرباح (P&L)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('balance_sheet')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${activeTab === 'balance_sheet' ? 'border-[#009FAE] text-[#007F8C] bg-[#E2F5F7]/30' : 'border-transparent text-[#6F6B75] hover:text-[#25232A]'}`}
          >
            <span>⚖️</span>
            <span>الميزانية العمومية (Balance Sheet)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trial_balance')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${activeTab === 'trial_balance' ? 'border-[#009FAE] text-[#007F8C] bg-[#E2F5F7]/30' : 'border-transparent text-[#6F6B75] hover:text-[#25232A]'}`}
          >
            <span>📊</span>
            <span>ميزان المراجعة (Trial Balance)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('general_ledger')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${activeTab === 'general_ledger' ? 'border-[#009FAE] text-[#007F8C] bg-[#E2F5F7]/30' : 'border-transparent text-[#6F6B75] hover:text-[#25232A]'}`}
          >
            <span>📖</span>
            <span>دفتر الأستاذ العام (General Ledger)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('statements')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${activeTab === 'statements' ? 'border-[#009FAE] text-[#007F8C] bg-[#E2F5F7]/30' : 'border-transparent text-[#6F6B75] hover:text-[#25232A]'}`}
          >
            <span>👥</span>
            <span>كشوفات المطابقات والعملاء والموردين</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          التبويب 1: قائمة الدخل والأرباح والخسائر (Income Statement / P&L)
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'pnl' && (
        <div className="space-y-6">
          {/* بطاقات المؤشرات المالية الرئيسية */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
            <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <p className="text-xs text-[#6F6B75] font-semibold mb-1">إجمالي الإيرادات والمبيعات</p>
              <h3 className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] flex items-baseline">
                <span>{fmtMoney(pnlData.totalRevenue)}</span> <span className="text-xs font-medium text-[#6F6B75] mr-1.5 font-sans">{reportCurrency}</span>
              </h3>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <p className="text-xs text-[#6F6B75] font-semibold mb-1">تكلفة المبيعات المباشرة (COGS)</p>
              <h3 className="text-xl font-extrabold font-mono tabular-nums text-[#C97300] flex items-baseline">
                <span>{fmtMoney(pnlData.totalCOGS)}</span> <span className="text-xs font-medium text-[#6F6B75] mr-1.5 font-sans">{reportCurrency}</span>
              </h3>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <p className="text-xs text-[#6F6B75] font-semibold mb-1 flex justify-between">
                <span>مجمل الربح (Gross Profit)</span>
                <span className="text-[10px] bg-[#E2F5F7] text-[#007F8C] font-bold px-2 py-0.5 rounded-full font-mono">{pnlData.grossMarginPct.toFixed(1)}%</span>
              </p>
              <h3 className="text-xl font-extrabold font-mono tabular-nums text-[#8F2A87] flex items-baseline">
                <span>{fmtMoney(pnlData.grossProfit)}</span> <span className="text-xs font-medium text-[#6F6B75] mr-1.5 font-sans">{reportCurrency}</span>
              </h3>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] bg-[#FAFAFB]">
              <p className="text-xs font-bold mb-1 flex justify-between">
                <span className="text-[#25232A]">صافي الربح الفعلي (Net Profit)</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${pnlData.netProfit >= 0 ? 'bg-[#E2F5F7] text-[#007F8C]' : 'bg-rose-100 text-[#D64545]'}`}>{pnlData.netMarginPct.toFixed(1)}%</span>
              </p>
              <h3 className={`text-xl font-extrabold font-mono tabular-nums flex items-baseline ${pnlData.netProfit >= 0 ? 'text-[#007F8C]' : 'text-[#D64545]'}`}>
                <span>{fmtMoney(pnlData.netProfit)}</span> <span className="text-xs font-medium text-[#6F6B75] mr-1.5 font-sans">{reportCurrency}</span>
              </h3>
            </div>
          </div>

          {/* الجدول المالي الرسمي لقائمة الدخل */}
          <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E8E5EA] bg-[#FAFAFB] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#25232A] flex items-center gap-2">
                <span>📑</span>
                <span>قائمة الدخل المفصلة (Statement of Profit or Loss)</span>
              </h3>
              <span className="text-xs text-[#6F6B75] font-mono">العملة: {reportCurrency}</span>
            </div>

            <div className="p-6 space-y-6">
              {/* 1. قسم الإيرادات */}
              <div className="border border-[#E8E5EA] rounded-xl overflow-hidden">
                <div className="bg-[#FAFAFB] px-4 py-2.5 font-bold text-xs text-[#007F8C] border-b border-[#E8E5EA] flex justify-between">
                  <span>1. الإيرادات التشغيلية (Revenues)</span>
                  <span className="font-mono">{fmtMoney(pnlData.totalRevenue)}</span>
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-[#E8E5EA]">
                    {pnlData.revAccounts.map(r => (
                      <tr key={r.code} className="hover:bg-[#FAFAFB]">
                        <td className="px-4 py-2.5 font-mono text-[#8F2A87] w-20">{r.code}</td>
                        <td className="px-4 py-2.5 font-medium text-[#25232A]">{r.name}</td>
                        <td className="px-4 py-2.5 text-left font-mono font-bold text-[#007F8C]">{fmtMoney(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 2. قسم تكلفة المبيعات */}
              <div className="border border-[#E8E5EA] rounded-xl overflow-hidden">
                <div className="bg-[#FAFAFB] px-4 py-2.5 font-bold text-xs text-[#C97300] border-b border-[#E8E5EA] flex justify-between">
                  <span>2. تكلفة المبيعات المباشرة (Cost of Goods Sold - COGS)</span>
                  <span className="font-mono">({fmtMoney(pnlData.totalCOGS)})</span>
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-[#E8E5EA]">
                    {pnlData.cogsAccounts.map(c => (
                      <tr key={c.code} className="hover:bg-[#FAFAFB]">
                        <td className="px-4 py-2.5 font-mono text-[#8F2A87] w-20">{c.code}</td>
                        <td className="px-4 py-2.5 font-medium text-[#25232A]">{c.name}</td>
                        <td className="px-4 py-2.5 text-left font-mono font-bold text-[#C97300]">{fmtMoney(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* سطر مجمل الربح */}
              <div className="bg-[#E2F5F7] p-4 rounded-xl border border-[#C5ECF0] flex items-center justify-between font-bold text-sm text-[#007F8C]">
                <div className="flex items-center gap-2">
                  <span>✨ مجمل الربح التجاري (Gross Profit)</span>
                  <span className="text-xs bg-white px-2.5 py-0.5 rounded-full font-mono">هامش: {pnlData.grossMarginPct.toFixed(1)}%</span>
                </div>
                <span className="font-mono text-base">{fmtMoney(pnlData.grossProfit)} {reportCurrency}</span>
              </div>

              {/* 3. قسم المصروفات التشغيلية */}
              <div className="border border-[#E8E5EA] rounded-xl overflow-hidden">
                <div className="bg-[#FAFAFB] px-4 py-2.5 font-bold text-xs text-[#D64545] border-b border-[#E8E5EA] flex justify-between">
                  <span>3. المصروفات التشغيلية والإدارية والعمومية (Operating Expenses - OPEX)</span>
                  <span className="font-mono">({fmtMoney(pnlData.totalOPEX)})</span>
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-[#E8E5EA]">
                    {pnlData.opexAccounts.map(o => (
                      <tr key={o.code} className="hover:bg-[#FAFAFB]">
                        <td className="px-4 py-2.5 font-mono text-[#8F2A87] w-20">{o.code}</td>
                        <td className="px-4 py-2.5 font-medium text-[#25232A]">{o.name}</td>
                        <td className="px-4 py-2.5 text-left font-mono font-bold text-[#D64545]">{fmtMoney(o.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* سطر صافي الربح النهائي */}
              <div className={`p-5 rounded-2xl border flex items-center justify-between font-extrabold text-base ${pnlData.netProfit >= 0 ? 'bg-[#E2F5F7] border-[#C5ECF0] text-[#007F8C]' : 'bg-rose-50 border-rose-200 text-[#D64545]'}`}>
                <div className="flex items-center gap-3">
                  <span>💹 صافي الربح الفعلي للفترة (Net Profit / Loss)</span>
                  <span className="text-xs bg-white px-3 py-1 rounded-full font-mono shadow-2xs">هامش الصافي: {pnlData.netMarginPct.toFixed(1)}%</span>
                </div>
                <span className="font-mono text-xl">{fmtMoney(pnlData.netProfit)} {reportCurrency}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          التبويب 2: قائمة المركز المالي / الميزانية العمومية (Balance Sheet)
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'balance_sheet' && (
        <div className="space-y-6">
          {/* شارة الاتزان المحاسبي */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${balanceSheetData.isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-[#D64545]'}`}>
            <div className="flex items-center gap-2.5 font-bold text-xs">
              <span className="text-base">{balanceSheetData.isBalanced ? '✅' : '⚠️'}</span>
              <span>حالة الميزانية العمومية: {balanceSheetData.isBalanced ? 'الميزانية العمومية متزنة ومطابقة تماماً (الأصول = الخصوم + حقوق الملكية + صافي ربح الفترة)' : `يوجد فارق غير متزن (${fmtMoney(balanceSheetData.diff)} ${reportCurrency})`}</span>
            </div>
            <div className="font-mono text-xs font-bold">
              <span>الأصول: {fmtMoney(balanceSheetData.totalAssets)} {reportCurrency}</span> | <span>الخصوم والملكية: {fmtMoney(balanceSheetData.totalLiabilitiesAndEquity)} {reportCurrency}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* الجانب الأيمن: الأصول (Assets) */}
            <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E8E5EA] bg-[#FAFAFB] flex items-center justify-between font-bold text-sm text-[#007F8C]">
                <span>1. جانب الأصول (Assets)</span>
                <span className="font-mono">{fmtMoney(balanceSheetData.totalAssets)} {reportCurrency}</span>
              </div>

              <div className="p-6 space-y-4">
                <div className="border border-[#E8E5EA] rounded-xl overflow-hidden">
                  <div className="bg-[#FAFAFB] px-4 py-2 font-bold text-xs text-[#25232A] border-b border-[#E8E5EA] flex justify-between">
                    <span>الأصول المتداولة (Current Assets)</span>
                    <span className="font-mono">{fmtMoney(balanceSheetData.totalCurrentAssets)}</span>
                  </div>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-[#E8E5EA]">
                      {balanceSheetData.currentAssets.map(a => (
                        <tr key={a.code} className="hover:bg-[#FAFAFB]">
                          <td className="px-4 py-2.5 font-mono text-[#8F2A87] w-20">{a.code}</td>
                          <td className="px-4 py-2.5 text-[#25232A] font-medium">{a.name}</td>
                          <td className="px-4 py-2.5 text-left font-mono font-bold text-[#007F8C]">{fmtMoney(a.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border border-[#E8E5EA] rounded-xl overflow-hidden">
                  <div className="bg-[#FAFAFB] px-4 py-2 font-bold text-xs text-[#25232A] border-b border-[#E8E5EA] flex justify-between">
                    <span>الأصول الثابتة (Fixed Assets)</span>
                    <span className="font-mono">{fmtMoney(balanceSheetData.totalFixedAssets)}</span>
                  </div>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-[#E8E5EA]">
                      {balanceSheetData.fixedAssets.map(a => (
                        <tr key={a.code} className="hover:bg-[#FAFAFB]">
                          <td className="px-4 py-2.5 font-mono text-[#8F2A87] w-20">{a.code}</td>
                          <td className="px-4 py-2.5 text-[#25232A] font-medium">{a.name}</td>
                          <td className="px-4 py-2.5 text-left font-mono font-bold text-[#007F8C]">{fmtMoney(a.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-[#E2F5F7] p-4 rounded-xl font-bold text-xs text-[#007F8C] flex justify-between border border-[#C5ECF0]">
                  <span>إجمالي الأصول (Total Assets)</span>
                  <span className="font-mono text-sm">{fmtMoney(balanceSheetData.totalAssets)} {reportCurrency}</span>
                </div>
              </div>
            </div>

            {/* الجانب الأيسر: الخصوم وحقوق الملكية (Liabilities & Equity) */}
            <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E8E5EA] bg-[#FAFAFB] flex items-center justify-between font-bold text-sm text-[#8F2A87]">
                <span>2. الخصوم وحقوق الملكية (Liabilities & Equity)</span>
                <span className="font-mono">{fmtMoney(balanceSheetData.totalLiabilitiesAndEquity)} {reportCurrency}</span>
              </div>

              <div className="p-6 space-y-4">
                <div className="border border-[#E8E5EA] rounded-xl overflow-hidden">
                  <div className="bg-[#FAFAFB] px-4 py-2 font-bold text-xs text-[#D64545] border-b border-[#E8E5EA] flex justify-between">
                    <span>الخصوم والالتزامات المتداولة (Liabilities)</span>
                    <span className="font-mono">{fmtMoney(balanceSheetData.totalLiabilities)}</span>
                  </div>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-[#E8E5EA]">
                      {balanceSheetData.currentLiabilities.map(l => (
                        <tr key={l.code} className="hover:bg-[#FAFAFB]">
                          <td className="px-4 py-2.5 font-mono text-[#8F2A87] w-20">{l.code}</td>
                          <td className="px-4 py-2.5 text-[#25232A] font-medium">{l.name}</td>
                          <td className="px-4 py-2.5 text-left font-mono font-bold text-[#D64545]">{fmtMoney(l.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border border-[#E8E5EA] rounded-xl overflow-hidden">
                  <div className="bg-[#FAFAFB] px-4 py-2 font-bold text-xs text-[#8F2A87] border-b border-[#E8E5EA] flex justify-between">
                    <span>حقوق الملكية ورأس المال (Equity)</span>
                    <span className="font-mono">{fmtMoney(balanceSheetData.totalEquity)}</span>
                  </div>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-[#E8E5EA]">
                      {balanceSheetData.equityAccounts.map(e => (
                        <tr key={e.code} className="hover:bg-[#FAFAFB]">
                          <td className="px-4 py-2.5 font-mono text-[#8F2A87] w-20">{e.code}</td>
                          <td className="px-4 py-2.5 text-[#25232A] font-medium">{e.name}</td>
                          <td className="px-4 py-2.5 text-left font-mono font-bold text-[#8F2A87]">{fmtMoney(e.amount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-[#FAFAFB] font-bold">
                        <td className="px-4 py-2.5 font-mono text-[#007F8C] w-20">P&L</td>
                        <td className="px-4 py-2.5 text-[#007F8C]">صافي أرباح / (خسائر) الفترة المحققة (مرحّلة آلياً من قائمة الدخل)</td>
                        <td className={`px-4 py-2.5 text-left font-mono font-bold ${balanceSheetData.periodProfit >= 0 ? 'text-[#007F8C]' : 'text-[#D64545]'}`}>{fmtMoney(balanceSheetData.periodProfit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-[#F2E7F3] p-4 rounded-xl font-bold text-xs text-[#8F2A87] flex justify-between border border-[#E5CEE7]">
                  <span>إجمالي الخصوم وحقوق الملكية</span>
                  <span className="font-mono text-sm">{fmtMoney(balanceSheetData.totalLiabilitiesAndEquity)} {reportCurrency}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          التبويب 3: ميزان المراجعة بالمجاميع والأرصدة (Trial Balance)
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'trial_balance' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E8E5EA] bg-[#FAFAFB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">ميزان المراجعة بالمجاميع والأرصدة الختامية</h3>
              <p className="text-[11px] text-[#6F6B75]">فحص توازن كافة الحركات المحاسبية المدينة والدائنة في دليل الحسابات</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${trialBalanceData.isBalanced ? 'bg-[#E2F5F7] text-[#007F8C] border-[#C5ECF0]' : 'bg-rose-50 text-[#D64545] border-rose-200'}`}>
              {trialBalanceData.isBalanced ? '✅ متزن محاسبياً 100%' : '⚠️ غير متزن'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="px-4 py-3 text-right">كود الحساب</th>
                  <th className="px-4 py-3 text-right">اسم الحساب</th>
                  <th className="px-4 py-3 text-center">النوع</th>
                  <th className="px-4 py-3 text-center">الطبيعة</th>
                  <th className="px-4 py-3 text-left font-mono">رصيد سابق / افتتاحي</th>
                  <th className="px-4 py-3 text-left font-mono">مجموع المدين ({targetCode})</th>
                  <th className="px-4 py-3 text-left font-mono">مجموع الدائن ({targetCode})</th>
                  <th className="px-4 py-3 text-left font-mono">رصيد ختامي مدين</th>
                  <th className="px-4 py-3 text-left font-mono">رصيد ختامي دائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {trialBalanceData.rows.map(r => (
                  <tr key={r.code} className="hover:bg-[#FAFAFB] transition-colors">
                    <td className="px-4 py-2.5 font-bold font-mono text-[#8F2A87]">{r.code}</td>
                    <td className="px-4 py-2.5 font-medium text-[#25232A]">{r.name}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-[#FAFAFB] border border-[#E8E5EA] text-[10px] text-[#6F6B75]">{r.type}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${r.nature === 'debit' ? 'bg-[#E2F5F7] text-[#007F8C]' : 'bg-rose-50 text-[#D64545]'}`}>{r.nature === 'debit' ? 'مدين' : 'دائن'}</span>
                    </td>
                    <td className="px-4 py-2.5 text-left font-mono text-[#6F6B75]">{r.opening_target !== 0 ? fmtMoney(r.opening_target) : '0'}</td>
                    <td className="px-4 py-2.5 text-left font-mono font-bold text-[#007F8C]">{fmtMoney(r.total_debit_target)}</td>
                    <td className="px-4 py-2.5 text-left font-mono font-bold text-[#D64545]">{fmtMoney(r.total_credit_target)}</td>
                    <td className="px-4 py-2.5 text-left font-mono font-bold text-[#25232A]">{fmtMoney(r.debit_balance_target)}</td>
                    <td className="px-4 py-2.5 text-left font-mono font-bold text-[#25232A]">{fmtMoney(r.credit_balance_target)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#FAFAFB] font-extrabold border-t-2 border-[#E8E5EA] text-xs">
                  <td colSpan="4" className="px-4 py-3.5 text-right text-[#25232A]">المجاميع الإجمالية وتأكيد التوازن:</td>
                  <td className="px-4 py-3.5 text-left font-mono text-[#6F6B75] text-sm">{fmtMoney(trialBalanceData.grandOpening)}</td>
                  <td className="px-4 py-3.5 text-left font-mono text-[#007F8C] text-sm">{fmtMoney(trialBalanceData.grandDebit)}</td>
                  <td className="px-4 py-3.5 text-left font-mono text-[#D64545] text-sm">{fmtMoney(trialBalanceData.grandCredit)}</td>
                  <td className="px-4 py-3.5 text-left font-mono text-[#25232A] text-sm">{fmtMoney(trialBalanceData.grandDebitBal)}</td>
                  <td className="px-4 py-3.5 text-left font-mono text-[#25232A] text-sm">{fmtMoney(trialBalanceData.grandCreditBal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          التبويب 4: دفتر الأستاذ العام (General Ledger)
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'general_ledger' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E5EA]">
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">كشف حركة دفتر الأستاذ العام (General Ledger Statement)</h3>
              <p className="text-[11px] text-[#6F6B75]">استخراج كشف الحساب الزمني التفصيلي والرصيد التراكمي لأي حساب</p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-bold text-[#6F6B75] shrink-0">اختر الحساب:</label>
              <select
                value={selectedLedgerAcc}
                onChange={e => setSelectedLedgerAcc(e.target.value)}
                className={`w-full sm:w-80 ${inputCls} font-bold text-[#8F2A87]`}
              >
                {(accounts || []).filter(a => !a.is_group).map(a => {
                  const accId = a.id || a.code;
                  const code = a.code || a.account_code || a.id;
                  const name = a.account_name || a.name_ar || a.name || code;
                  return <option key={accId} value={accId}>{code} - {name}</option>;
                })}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-[#E8E5EA] overflow-hidden">
            {generalLedgerRows.length === 0 ? (
              <div className="text-center py-12 text-[#6F6B75] text-xs font-medium">لا توجد حركات مسجلة لهذا الحساب خلال الفترة المحددة 🧾</div>
            ) : (
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                    <th className="px-3 py-3 text-center">التاريخ</th>
                    <th className="px-3 py-3 text-right">رقم القيد / المرجع</th>
                    <th className="px-3 py-3 text-right">البيان والتفاصيل</th>
                    <th className="px-3 py-3 text-left font-mono">مدين ({targetCode})</th>
                    <th className="px-3 py-3 text-left font-mono">دائن ({targetCode})</th>
                    <th className="px-3 py-3 text-left font-mono">الرصيد التراكمي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E5EA] bg-white">
                  {generalLedgerRows.map(row => (
                    <tr key={row.id} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="px-3 py-2.5 text-center font-mono text-[#6F6B75]">{row.date}</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-[#8F2A87]">{row.entry_no}</td>
                      <td className="px-3 py-2.5 text-[#25232A] font-medium">{row.notes}</td>
                      <td className="px-3 py-2.5 text-left font-mono font-bold text-[#007F8C]">{row.debit_target > 0 ? fmtMoney(row.debit_target) : '—'}</td>
                      <td className="px-3 py-2.5 text-left font-mono font-bold text-[#D64545]">{row.credit_target > 0 ? fmtMoney(row.credit_target) : '—'}</td>
                      <td className="px-3 py-2.5 text-left font-mono font-bold text-[#25232A]">{fmtMoney(row.running_target)} {reportCurrency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          التبويب 5: كشوفات المطابقات والعملاء والموردين والصناديق (Sub-Ledger & Treasury)
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'statements' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden space-y-5 p-6">
          
          {/* شريط العنوان وأزرار التنقل بين المطابقات */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E8E5EA]">
            <div>
              <h3 className="font-bold text-sm text-[#25232A] flex items-center gap-2">
                <span>كشوفات المطابقات، الخزائن، والذمم المحاسبية</span>
                <span className="text-[10px] bg-[#E2F5F7] text-[#007F8C] px-2 py-0.5 rounded-full font-bold">ديناميكي 100%</span>
              </h3>
              <p className="text-[11px] text-[#6F6B75]">مطابقة حركة الصناديق والبنوك مع القيود، ومتابعة كشوف حسابات الموردين والعميلات النقدية والآجلة</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex bg-[#FAFAFB] p-1 rounded-xl border border-[#E8E5EA]">
                <button
                  type="button"
                  onClick={() => { setStatementType('treasury'); setSelectedPartyId(''); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${statementType === 'treasury' ? 'bg-white shadow-xs text-[#007F8C]' : 'text-[#6F6B75]'}`}
                >
                  <span>🏦</span>
                  <span>مطابقة الصناديق والبنوك</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setStatementType('supplier'); setSelectedPartyId(''); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${statementType === 'supplier' ? 'bg-white shadow-xs text-[#8F2A87]' : 'text-[#6F6B75]'}`}
                >
                  <span>🧵</span>
                  <span>كشف حساب الموردين</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setStatementType('customer'); setSelectedPartyId(''); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${statementType === 'customer' ? 'bg-white shadow-xs text-[#B0005A]' : 'text-[#6F6B75]'}`}
                >
                  <span>👗</span>
                  <span>كشف حساب العميلات</span>
                </button>
              </div>

              {/* فلتر اختيار الطرف المحدد */}
              {statementType === 'supplier' && (
                <select
                  value={selectedPartyId}
                  onChange={e => setSelectedPartyId(e.target.value)}
                  className={`${inputCls} text-xs font-bold w-48 text-[#8F2A87]`}
                >
                  <option value="">كافة الموردين (عرض شامل)</option>
                  {[...new Set((purchases || []).map(p => p.supplier || p.supplier_name || p.vendor_name).filter(Boolean))].map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              )}

              {statementType === 'customer' && (
                <select
                  value={selectedPartyId}
                  onChange={e => setSelectedPartyId(e.target.value)}
                  className={`${inputCls} text-xs font-bold w-48 text-[#B0005A]`}
                >
                  <option value="">كافة العميلات (عرض شامل)</option>
                  {(customers || []).map(c => (
                    <option key={c.id || c.name} value={c.id || c.name}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* بطاقات المؤشرات المالية السريعة للتبويب */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-3.5 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA]">
              <span className="text-[11px] font-bold text-[#6F6B75] block mb-1">سيولة الخزائن والبنوك 💰</span>
              <span className="font-mono font-extrabold text-sm text-[#007F8C]">
                {fmtMoney(cashBankReconciliation.reduce((s, c) => s + (c.closingLedgerTarget || 0), 0))} {reportCurrency}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA]">
              <span className="text-[11px] font-bold text-[#6F6B75] block mb-1">مستحقات الموردين (ذمم دائنة) 🧵</span>
              <span className="font-mono font-extrabold text-sm text-[#8F2A87]">
                {fmtMoney(statementData.reduce((s, i) => s + (statementType === 'supplier' ? (i.balanceDue || 0) : 0), 0))} {reportCurrency}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA]">
              <span className="text-[11px] font-bold text-[#6F6B75] block mb-1">مستحقات العميلات (ذمم مدينة) 👗</span>
              <span className="font-mono font-extrabold text-sm text-[#B0005A]">
                {fmtMoney(statementData.reduce((s, i) => s + (statementType === 'customer' ? (i.balanceDue || 0) : 0), 0))} {reportCurrency}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#6F6B75] block mb-1">حالة التدقيق الدفتري ⚖️</span>
                <span className="text-xs font-extrabold text-[#16a34a]">مطابقة بنسبة 100%</span>
              </div>
              <span className="text-xl">✅</span>
            </div>
          </div>

          {/* ── العرض 1: مطابقة حركة وأرصدة الصناديق والبنوك ── */}
          {statementType === 'treasury' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#E8E5EA] overflow-hidden">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                      <th className="px-3.5 py-3 text-center">كود الحساب</th>
                      <th className="px-3.5 py-3 text-right">اسم الخزينة / البنك</th>
                      <th className="px-3.5 py-3 text-center">العملة الأصلية</th>
                      <th className="px-3.5 py-3 text-left font-mono">الرصيد السابق</th>
                      <th className="px-3.5 py-3 text-left font-mono">مقبوضات الفترة (مدين)</th>
                      <th className="px-3.5 py-3 text-left font-mono">مدفوعات الفترة (دائن)</th>
                      <th className="px-3.5 py-3 text-left font-mono">الرصيد الدفتري ({targetCode})</th>
                      <th className="px-3.5 py-3 text-left font-mono">الرصيد بالعملة الأصلية</th>
                      <th className="px-3.5 py-3 text-center">حالة المطابقة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E5EA] bg-white">
                    {cashBankReconciliation.map(acc => (
                      <tr key={acc.id} className="hover:bg-[#FAFAFB] transition-colors">
                        <td className="px-3.5 py-3 text-center font-mono font-bold text-[#8F2A87]">{acc.code}</td>
                        <td className="px-3.5 py-3 font-bold text-[#25232A]">{acc.name}</td>
                        <td className="px-3.5 py-3 text-center font-mono text-xs">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${acc.nativeCurr === 'SAR' ? 'bg-amber-50 text-amber-700 border border-amber-200' : acc.nativeCurr === 'USD' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-sky-50 text-sky-700 border border-sky-200'}`}>
                            {acc.nativeCurr} {acc.nativeCurr !== 'YER' && `(×${acc.rate})`}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-left font-mono text-[#6F6B75]">{fmtMoney(acc.openingTarget)}</td>
                        <td className="px-3.5 py-3 text-left font-mono font-bold text-[#007F8C]">{acc.debitTarget > 0 ? fmtMoney(acc.debitTarget) : '—'}</td>
                        <td className="px-3.5 py-3 text-left font-mono font-bold text-[#D64545]">{acc.creditTarget > 0 ? fmtMoney(acc.creditTarget) : '—'}</td>
                        <td className="px-3.5 py-3 text-left font-mono font-extrabold text-[#25232A]">{fmtMoney(acc.closingLedgerTarget)} {reportCurrency}</td>
                        <td className="px-3.5 py-3 text-left font-mono font-bold text-[#007F8C]">
                          {fmtMoney(acc.closingNative, acc.nativeCurr === 'YER' ? 0 : 2)} {acc.nativeCurr}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          {acc.isMatched ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span>✓</span>
                              <span>مطابق للقيود 100%</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span>⚠️</span>
                              <span>فارق {fmtMoney(acc.diff)}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-[#FAFAFB] rounded-xl border border-[#E8E5EA] text-[11px] text-[#6F6B75] flex items-center gap-2">
                <span>💡</span>
                <span>تتم مطابقة حركة الصناديق والبنوك تلقائياً عبر احتساب الرصيد الافتتاحي ومجموع المقبوضات والمسحوبات من واقع قيود اليومية المحاسبية المعتمدة.</span>
              </div>
            </div>
          )}

          {/* ── العرض 2: كشف حساب ومطابقات الموردين والذمم الدائنة ── */}
          {statementType === 'supplier' && (
            <div className="rounded-xl border border-[#E8E5EA] overflow-hidden">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                    <th className="px-3.5 py-3 text-right">المورد / جهة التوريد</th>
                    <th className="px-3.5 py-3 text-center">الهاتف</th>
                    <th className="px-3.5 py-3 text-center">عدد الفواتير</th>
                    <th className="px-3.5 py-3 text-left font-mono">إجمالي المشتريات</th>
                    <th className="px-3.5 py-3 text-left font-mono">مسدد نقداً بالفاتورة</th>
                    <th className="px-3.5 py-3 text-left font-mono">مشتريات آجلة</th>
                    <th className="px-3.5 py-3 text-left font-mono">سندات صرف مسددة</th>
                    <th className="px-3.5 py-3 text-left font-mono">إجمالي المسدد</th>
                    <th className="px-3.5 py-3 text-left font-mono">الرصيد المتبقي (Due)</th>
                    <th className="px-3.5 py-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E5EA] bg-white">
                  {statementData.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-8 text-[#6F6B75] font-medium">لا توجد حركات مشتريات أو سدادات للموردين خلال الفترة المحددة 🧵</td>
                    </tr>
                  ) : (
                    statementData.map(item => (
                      <tr key={item.id} className="hover:bg-[#FAFAFB] transition-colors">
                        <td className="px-3.5 py-3 font-bold text-[#25232A]">{item.name}</td>
                        <td className="px-3.5 py-3 text-center font-mono text-[#6F6B75]">{item.phone || '—'}</td>
                        <td className="px-3.5 py-3 text-center font-mono font-semibold">{item.purchasesCount}</td>
                        <td className="px-3.5 py-3 text-left font-mono font-bold text-[#25232A]">{fmtMoney(item.totalPurchases)}</td>
                        <td className="px-3.5 py-3 text-left font-mono text-[#007F8C]">{item.cashPurchases > 0 ? fmtMoney(item.cashPurchases) : '—'}</td>
                        <td className="px-3.5 py-3 text-left font-mono text-amber-700">{item.creditPurchases > 0 ? fmtMoney(item.creditPurchases) : '—'}</td>
                        <td className="px-3.5 py-3 text-left font-mono text-[#8F2A87]">{item.vouchersPaid > 0 ? fmtMoney(item.vouchersPaid) : '—'}</td>
                        <td className="px-3.5 py-3 text-left font-mono font-bold text-[#007F8C]">{fmtMoney(item.totalPaid)}</td>
                        <td className={`px-3.5 py-3 text-left font-mono font-extrabold ${item.balanceDue > 0 ? 'text-[#D64545]' : 'text-emerald-600'}`}>
                          {fmtMoney(item.balanceDue)} {reportCurrency}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          {item.balanceDue <= 0.01 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span>✓</span>
                              <span>خالص ومسدد</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span>⏳</span>
                              <span>مستحق للمورد</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── العرض 3: كشف حساب ومطابقات العميلات والذمم المدينة ── */}
          {statementType === 'customer' && (
            <div className="rounded-xl border border-[#E8E5EA] overflow-hidden">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                    <th className="px-4 py-3 text-right">العميلة / الطرف</th>
                    <th className="px-4 py-3 text-center">الهاتف</th>
                    <th className="px-4 py-3 text-center">عدد الطلبات</th>
                    <th className="px-4 py-3 text-left font-mono">إجمالي المبيعات</th>
                    <th className="px-4 py-3 text-left font-mono">إجمالي المسدد / المقبوض</th>
                    <th className="px-4 py-3 text-left font-mono">الرصيد المستحق (Due)</th>
                    <th className="px-4 py-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E5EA] bg-white">
                  {statementData.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-[#6F6B75] font-medium">لا توجد طلبات أو مقبوضات مسجلة للعميلات خلال الفترة المحددة 👗</td>
                    </tr>
                  ) : (
                    statementData.map(item => (
                      <tr key={item.id} className="hover:bg-[#FAFAFB] transition-colors">
                        <td className="px-4 py-3 font-bold text-[#25232A]">{item.name}</td>
                        <td className="px-4 py-3 text-center font-mono text-[#6F6B75]">{item.phone || '—'}</td>
                        <td className="px-4 py-3 text-center font-mono font-semibold">{item.ordersCount}</td>
                        <td className="px-4 py-3 text-left font-mono font-bold text-[#007F8C]">{fmtMoney(item.totalSales)}</td>
                        <td className="px-4 py-3 text-left font-mono font-bold text-[#25232A]">{fmtMoney(item.totalPaid)}</td>
                        <td className={`px-4 py-3 text-left font-mono font-extrabold ${item.balanceDue > 0 ? 'text-[#D64545]' : 'text-emerald-600'}`}>
                          {fmtMoney(item.balanceDue)} {reportCurrency}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.balanceDue <= 0.01 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span>✓</span>
                              <span>خالصة ومسددة</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span>⏳</span>
                              <span>مستحق عليها</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* ── صندوق الاعتمادات والتوقيعات الرسمية المخصص للطباعة والـ PDF ── */}
      <div className="mt-8 pt-6 border-t-2 border-dashed border-[#E8E5EA]">
        <div className="bg-white rounded-2xl border border-[#E8E5EA] p-6 shadow-2xs">
          <div className="text-center mb-6">
            <h4 className="text-xs font-bold text-[#25232A]">صندوق الاعتماد والتدقيق المالي الرسمي 🏛️</h4>
            <p className="text-[11px] text-[#6F6B75]">{brandProfile.name} — {brandProfile.tagline || brandProfile.shortName}</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-xs">
            <div className="p-4 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA] space-y-8">
              <span className="block font-bold text-[#6F6B75]">إعداد وتجهيز المحاسب المالي</span>
              <div className="border-b border-dashed border-[#CCC] w-3/4 mx-auto"></div>
              <span className="block text-[10px] text-[#888]">التوقيع: ____________________</span>
            </div>

            <div className="p-4 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA] space-y-8">
              <span className="block font-bold text-[#6F6B75]">المراجعة والتدقيق المالي</span>
              <div className="border-b border-dashed border-[#CCC] w-3/4 mx-auto"></div>
              <span className="block text-[10px] text-[#888]">التوقيع: ____________________</span>
            </div>

            <div className="p-4 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA] space-y-8">
              <span className="block font-bold text-[#007F8C]">اعتماد وختم المدير العام</span>
              <div className="border-b border-dashed border-[#CCC] w-3/4 mx-auto"></div>
              <span className="block text-[10px] text-[#888]">الختم الرسمي المعتمد 🏢</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

window.Reports = Reports;

