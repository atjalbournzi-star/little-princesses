const { useState, useEffect, useMemo, useCallback, useRef } = React;

function Reports({ orders = [], expenses = [], vouchers = [], journal = [], accounts = [], purchases = [], customers = [], inventory = [], showToast, currency }) {
  const currencyDisplay = currency?.display || 'YER ﷼';
  const [activeTab, setActiveTab] = useState('pnl'); // 'pnl', 'balance_sheet', 'trial_balance', 'general_ledger', 'statements'
  const [periodPreset, setPeriodPreset] = useState('this_month');
  const [dateRange, setDateRange] = useState({ start: '', end: window.TODAY_STR_ISO || new Date().toISOString().split('T')[0] });
  const [reportCurrency, setReportCurrency] = useState(currencyDisplay);
  
  // Sub-filters for Ledger & Statements
  const [selectedLedgerAcc, setSelectedLedgerAcc] = useState('101');
  const [statementType, setStatementType] = useState('customer'); // 'customer', 'supplier'
  const [selectedPartyId, setSelectedPartyId] = useState('');

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

  // Compute live account movements & balances from journal entries
  const liveAccountsMap = useMemo(() => {
    const map = {};
    (accounts || []).forEach(a => {
      const code = cleanCode(a.code || a.acc_code || a.id);
      map[code] = {
        ...a,
        code,
        debit_base: 0,
        credit_base: 0,
        balance_base: 0
      };
    });

    filteredJournal.forEach(j => {
      const dCode = cleanCode(j.debit_code || j.debit || j.debit_account_id);
      const cCode = cleanCode(j.credit_code || j.credit || j.credit_account_id);
      
      const amt = parseFloat(j.amount) || 0;
      const curr = j.currency || 'YER';
      const rate = parseFloat(j.exchange_rate) || 1.0;
      const baseAmt = parseFloat(j.base_amount) || (amt * rate);

      if (map[dCode]) map[dCode].debit_base += baseAmt;
      if (map[cCode]) map[cCode].credit_base += baseAmt;
    });

    Object.values(map).forEach(acc => {
      const nature = acc.nature || (['خصوم', 'حقوق ملكية', 'إيرادات'].includes(acc.account_type || acc.acc_type) ? 'credit' : 'debit');
      if (nature === 'credit') {
        acc.balance_base = acc.credit_base - acc.debit_base;
      } else {
        acc.balance_base = acc.debit_base - acc.credit_base;
      }
      acc.balance_target = window.CurrencyService ? window.CurrencyService.fromBase(acc.balance_base, targetCode) : acc.balance_base;
      acc.debit_target = window.CurrencyService ? window.CurrencyService.fromBase(acc.debit_base, targetCode) : acc.debit_base;
      acc.credit_target = window.CurrencyService ? window.CurrencyService.fromBase(acc.credit_base, targetCode) : acc.credit_base;
    });

    return map;
  }, [accounts, filteredJournal, targetCode]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DATA COMPUTATION: P&L (قائمة الدخل والأرباح والخسائر)
  // ─────────────────────────────────────────────────────────────────────────────
  const pnlData = useMemo(() => {
    // 4. Revenues
    const revAccounts = [
      { code: '401', name: 'إيرادات مبيعات الفساتين والزي المدرسي', defaultName: 'إيرادات مبيعات الفساتين والزي' },
      { code: '402', name: 'أرباح فروق أسعار صرف العملات', defaultName: 'أرباح فروق أسعار صرف العملات' }
    ].map(item => {
      const acc = liveAccountsMap[item.code] || {};
      const amt = Math.max(0, acc.balance_target || 0);
      return { ...item, amount: amt };
    });

    // Also fallback to sum of orders if journal not populated
    const ordersRevTarget = (orders || []).filter(o => {
      const d = (o.order_date || o.created_at || o.date || '').split('T')[0];
      if (dateRange.start && d < dateRange.start) return false;
      if (dateRange.end && d > dateRange.end) return false;
      return true;
    }).reduce((sum, o) => sum + toReportAmount(o.total || o.total_amount, o.currency, o.exchange_rate), 0);

    if (revAccounts[0].amount === 0 && ordersRevTarget > 0) {
      revAccounts[0].amount = ordersRevTarget;
    }

    const totalRevenue = revAccounts.reduce((sum, r) => sum + r.amount, 0);

    // 5. Cost of Goods Sold (COGS)
    const cogsAccounts = [
      { code: '501', name: 'تكلفة الأقمشة والمواد الخام المباشرة' },
      { code: '502', name: 'تكلفة مستلزمات الخياطة والإكسسوارات والشك' },
      { code: '503', name: 'تكلفة التغليف وعلب الفساتين الفاخرة' }
    ].map(item => {
      const acc = liveAccountsMap[item.code] || {};
      return { ...item, amount: Math.max(0, acc.balance_target || 0) };
    });

    const totalCOGS = cogsAccounts.reduce((sum, c) => sum + c.amount, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // 6. Operating Expenses (OPEX)
    const opexAccounts = [
      { code: '601', name: 'أجور ورواتب الخياطين والمطرزين والموظفين' },
      { code: '602', name: 'إيجار المقرات والمعارض والورش' },
      { code: '603', name: 'مصاريف كهرباء وماء وإنترنت ومرافق' },
      { code: '604', name: 'مصاريف التسويق والإعلانات الممولة' },
      { code: '605', name: 'مصاريف الصيانة وقطع غيار الآلات' },
      { code: '606', name: 'خسائر فروق أسعار صرف العملات' },
      { code: '607', name: 'مصروفات إدارية وعمومية متنوعة' }
    ].map(item => {
      const acc = liveAccountsMap[item.code] || {};
      return { ...item, amount: Math.max(0, acc.balance_target || 0) };
    });

    // Fallback: incorporate recorded expenses if journal has no lines for 6xx
    const directExpensesTotal = (expenses || []).filter(e => {
      const d = (e.date || e.created_at || '').split('T')[0];
      if (dateRange.start && d < dateRange.start) return false;
      if (dateRange.end && d > dateRange.end) return false;
      return true;
    }).reduce((sum, e) => sum + toReportAmount(e.amount, e.currency, e.exchange_rate), 0);

    const calculatedOpexTotal = opexAccounts.reduce((sum, o) => sum + o.amount, 0);
    const finalOpexTotal = Math.max(calculatedOpexTotal, directExpensesTotal);

    const netProfit = grossProfit - finalOpexTotal;
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
      netProfit,
      netMarginPct
    };
  }, [liveAccountsMap, orders, expenses, dateRange, toReportAmount]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. DATA COMPUTATION: BALANCE SHEET (الميزانية العمومية / المركز المالي)
  // ─────────────────────────────────────────────────────────────────────────────
  const balanceSheetData = useMemo(() => {
    // Current Assets
    const currentAssets = [
      { code: '101.01', name: 'صندوق فرع الورشة والمعمل (صنعاء)' },
      { code: '101.02', name: 'صندوق محمد فلاح' },
      { code: '101.03', name: 'صندوق الريال السعودي (SAR)' },
      { code: '101.04', name: 'صندوق الدولار الأمريكي (USD)' },
      { code: '102', name: 'مخزون الأقمشة والمستلزمات' },
      { code: '103', name: 'الحساب البنكي والمحافظ الإلكترونية' },
      { code: '104', name: 'ذمم العملاء (مستحقات آجلة)' }
    ].map(item => {
      const acc = liveAccountsMap[item.code] || {};
      return { ...item, amount: Math.max(0, acc.balance_target || 0) };
    });

    // Fixed Assets
    const fixedAssets = [
      { code: '105', name: 'الأصول الثابتة (آلات ومعدات الخياطة)' }
    ].map(item => {
      const acc = liveAccountsMap[item.code] || {};
      return { ...item, amount: Math.max(0, acc.balance_target || 0) };
    });

    const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + a.amount, 0);
    const totalFixedAssets = fixedAssets.reduce((sum, a) => sum + a.amount, 0);
    const totalAssets = totalCurrentAssets + totalFixedAssets;

    // Current Liabilities
    const currentLiabilities = [
      { code: '201', name: 'ذمم الموردين ومحلات الأقمشة (آجل)' },
      { code: '202', name: 'عرابين وأمانات العملاء' }
    ].map(item => {
      const acc = liveAccountsMap[item.code] || {};
      return { ...item, amount: Math.max(0, acc.balance_target || 0) };
    });

    const totalLiabilities = currentLiabilities.reduce((sum, l) => sum + l.amount, 0);

    // Equity
    const equityAccounts = [
      { code: '301.01', name: 'حصة الشريك محمد فلاح في رأس المال' },
      { code: '301.02', name: 'حصة الشريك محمد علي في رأس المال' },
      { code: '301.03', name: 'حصة الشريك صادق في رأس المال' },
      { code: '302', name: 'الأرباح المبقاة / المحتجزة' }
    ].map(item => {
      const acc = liveAccountsMap[item.code] || {};
      return { ...item, amount: Math.max(0, acc.balance_target || 0) };
    });

    // Net Profit of the period flows into Equity
    const periodProfit = pnlData.netProfit;
    const totalEquity = equityAccounts.reduce((sum, e) => sum + e.amount, 0) + periodProfit;
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
      const tb = window.AccountingEngine.generateTrialBalance(filteredJournal, accounts);
      const convertedRows = (tb.rows || []).map(r => ({
        ...r,
        total_debit_target: window.CurrencyService ? window.CurrencyService.fromBase(r.total_debit_base, targetCode) : r.total_debit_base,
        total_credit_target: window.CurrencyService ? window.CurrencyService.fromBase(r.total_credit_base, targetCode) : r.total_credit_base,
        debit_balance_target: window.CurrencyService ? window.CurrencyService.fromBase(r.debit_balance_base, targetCode) : r.debit_balance_base,
        credit_balance_target: window.CurrencyService ? window.CurrencyService.fromBase(r.credit_balance_base, targetCode) : r.credit_balance_base
      }));

      const grandDebitTarget = convertedRows.reduce((sum, r) => sum + r.total_debit_target, 0);
      const grandCreditTarget = convertedRows.reduce((sum, r) => sum + r.total_credit_target, 0);
      const grandDebitBalTarget = convertedRows.reduce((sum, r) => sum + r.debit_balance_target, 0);
      const grandCreditBalTarget = convertedRows.reduce((sum, r) => sum + r.credit_balance_target, 0);

      return {
        rows: convertedRows,
        grandDebit: grandDebitTarget,
        grandCredit: grandCreditTarget,
        grandDebitBal: grandDebitBalTarget,
        grandCreditBal: grandCreditBalTarget,
        isBalanced: Math.abs(grandDebitTarget - grandCreditTarget) < 0.05 && Math.abs(grandDebitBalTarget - grandCreditBalTarget) < 0.05
      };
    }
    return { rows: [], grandDebit: 0, grandCredit: 0, grandDebitBal: 0, grandCreditBal: 0, isBalanced: true };
  }, [filteredJournal, accounts, targetCode]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. DATA COMPUTATION: GENERAL LEDGER (دفتر الأستاذ العام)
  // ─────────────────────────────────────────────────────────────────────────────
  const generalLedgerRows = useMemo(() => {
    if (window.AccountingEngine && typeof window.AccountingEngine.generateGeneralLedger === 'function') {
      const rawRows = window.AccountingEngine.generateGeneralLedger(filteredJournal, accounts, selectedLedgerAcc, dateRange);
      return rawRows.map(r => ({
        ...r,
        debit_target: window.CurrencyService ? window.CurrencyService.fromBase(r.debit_base, targetCode) : r.debit_base,
        credit_target: window.CurrencyService ? window.CurrencyService.fromBase(r.credit_base, targetCode) : r.credit_base,
        running_target: window.CurrencyService ? window.CurrencyService.fromBase(r.running_balance_base, targetCode) : r.running_balance_base
      }));
    }
    return [];
  }, [filteredJournal, accounts, selectedLedgerAcc, dateRange, targetCode]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. DATA COMPUTATION: SUB-LEDGER STATEMENTS (كشوف الحسابات والمطابقات)
  // ─────────────────────────────────────────────────────────────────────────────
  const statementData = useMemo(() => {
    if (statementType === 'customer') {
      const list = (customers || []).filter(c => !selectedPartyId || String(c.id || c.name) === String(selectedPartyId));
      return list.map(cust => {
        const custOrders = (orders || []).filter(o => String(o.customer_id || o.customer_name || o.client_name) === String(cust.id) || String(o.customer_name) === String(cust.name));
        const custVouchers = (vouchers || []).filter(v => (v.v_type === 'سند قبض' || v.voucher_type === 'سند قبض') && (String(v.party || v.party_name) === String(cust.name) || String(v.customer_id) === String(cust.id)));
        
        const totalSalesTarget = custOrders.reduce((sum, o) => sum + toReportAmount(o.total || o.total_amount, o.currency, o.exchange_rate), 0);
        const totalPaidTarget = custVouchers.reduce((sum, v) => sum + toReportAmount(v.amount, v.currency, v.exchange_rate), 0);
        const balanceDue = totalSalesTarget - totalPaidTarget;

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
      const supplierNames = [...new Set((purchases || []).map(p => p.supplier || p.vendor_name).filter(Boolean))];
      return supplierNames.filter(s => !selectedPartyId || s === selectedPartyId).map(supName => {
        const supPurchases = (purchases || []).filter(p => (p.supplier || p.vendor_name) === supName);
        const supVouchers = (vouchers || []).filter(v => (v.v_type === 'سند صرف' || v.voucher_type === 'سند صرف') && String(v.party || v.party_name).includes(supName));

        const totalPurchasesTarget = supPurchases.reduce((sum, p) => sum + toReportAmount(p.total || p.amount, p.currency, p.exchange_rate), 0);
        const totalPaidTarget = supVouchers.reduce((sum, v) => sum + toReportAmount(v.amount, v.currency, v.exchange_rate), 0);
        const balanceDue = totalPurchasesTarget - totalPaidTarget;

        return {
          id: supName,
          name: supName,
          purchasesCount: supPurchases.length,
          totalPurchases: totalPurchasesTarget,
          totalPaid: totalPaidTarget,
          balanceDue
        };
      });
    }
  }, [statementType, selectedPartyId, customers, purchases, orders, vouchers, toReportAmount]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. EXCEL (XLS) & PRINT ENGINE
  // ─────────────────────────────────────────────────────────────────────────────
  const getTabTitle = () => {
    switch (activeTab) {
      case 'pnl': return 'قائمة الدخل والأرباح والخسائر (P&L)';
      case 'balance_sheet': return 'الميزانية العمومية والمركز المالي (Balance Sheet)';
      case 'trial_balance': return 'ميزان المراجعة بالمجاميع والأرصدة الختامية';
      case 'general_ledger': return `كشف حركة دفتر الأستاذ العام (حساب ${selectedLedgerAcc})`;
      case 'statements': return statementType === 'customer' ? 'كشف حساب ومطابقات العميلات' : 'كشف حساب ومطابقات موردي الأقمشة';
      default: return 'التقرير المالي والختامي';
    }
  };

  const handleExportExcel = useCallback(() => {
    let tableHtml = '';
    let filename = `Little_Princesses_${activeTab}_${dateRange.start || 'all'}_${dateRange.end || 'all'}.xls`;

    if (activeTab === 'pnl') {
      filename = `قائمة_الدخل_والأرباح_P&L_${reportCurrency.replace(/[^a-zA-Z]/g, '')}.xls`;
      tableHtml = `
        <tr style="background-color:#007F8C;color:#ffffff;"><th colspan="3" style="font-size:16px;padding:10px;">مؤسسة Little Princesses للأزياء الراقية - قائمة الدخل والأرباح (P&L)</th></tr>
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
        <tr style="background-color:#007F8C;color:#ffffff;"><th colspan="3" style="font-size:16px;padding:10px;">مؤسسة Little Princesses للأزياء الراقية - الميزانية العمومية والمركز المالي</th></tr>
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
        <tr style="background-color:#007F8C;color:#ffffff;"><th colspan="8" style="font-size:16px;padding:10px;">مؤسسة Little Princesses للأزياء الراقية - ميزان المراجعة بالمجاميع والأرصدة</th></tr>
        <tr style="background-color:#f9fafb;"><td colspan="8">الفترة: من ${dateRange.start || 'البداية'} إلى ${dateRange.end || 'اليوم'} | العملة: ${reportCurrency}</td></tr>
        <tr><th>كود الحساب</th><th>اسم الحساب</th><th>النوع</th><th>الطبيعة</th><th>مجموع المدين</th><th>مجموع الدائن</th><th>رصيد مدين</th><th>رصيد دائن</th></tr>
        ${trialBalanceData.rows.map(r => `
          <tr>
            <td style="text-align:center;">${r.code}</td>
            <td>${r.name}</td>
            <td style="text-align:center;">${r.type}</td>
            <td style="text-align:center;">${r.nature === 'debit' ? 'مدين' : 'دائن'}</td>
            <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${r.total_debit_target}</td>
            <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${r.total_credit_target}</td>
            <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${r.debit_balance_target}</td>
            <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${r.credit_balance_target}</td>
          </tr>
        `).join('')}
        <tr style="background-color:#E2F5F7;font-weight:bold;font-size:13px;">
          <td colspan="4" style="text-align:center;">المجاميع الإجمالية وتأكيد التوازن:</td>
          <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${trialBalanceData.grandDebit}</td>
          <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${trialBalanceData.grandCredit}</td>
          <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${trialBalanceData.grandDebitBal}</td>
          <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${trialBalanceData.grandCreditBal}</td>
        </tr>
      `;
    } else if (activeTab === 'general_ledger') {
      filename = `دفتر_الأستاذ_العام_حساب_${selectedLedgerAcc}.xls`;
      tableHtml = `
        <tr style="background-color:#007F8C;color:#ffffff;"><th colspan="6" style="font-size:16px;padding:10px;">مؤسسة Little Princesses للأزياء الراقية - كشف حركة دفتر الأستاذ العام</th></tr>
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
      filename = `كشف_حساب_${statementType === 'customer' ? 'العميلات' : 'الموردين'}.xls`;
      tableHtml = `
        <tr style="background-color:#007F8C;color:#ffffff;"><th colspan="5" style="font-size:16px;padding:10px;">مؤسسة Little Princesses للأزياء الراقية - ${statementType === 'customer' ? 'كشف حساب ومطابقات العميلات' : 'كشف حساب ومطابقات موردي الأقمشة'}</th></tr>
        <tr style="background-color:#f9fafb;"><td colspan="5">العملة: ${reportCurrency}</td></tr>
        <tr><th>الاسم / الطرف</th><th>${statementType === 'customer' ? 'عدد الطلبات' : 'عدد فواتير الشراء'}</th><th>${statementType === 'customer' ? 'إجمالي المبيعات' : 'إجمالي المشتريات'}</th><th>إجمالي المدفوع / المسدد</th><th>الرصيد المتبقي (Due)</th></tr>
        ${statementData.map(s => `
          <tr>
            <td>${s.name}</td>
            <td style="text-align:center;">${statementType === 'customer' ? s.ordersCount : s.purchasesCount}</td>
            <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${statementType === 'customer' ? s.totalSales : s.totalPurchases}</td>
            <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';">${s.totalPaid}</td>
            <td style="text-align:left;mso-number-format:'\\#\\,\\#\\#0\\.00';font-weight:bold;">${s.balanceDue}</td>
          </tr>
        `).join('')}
      `;
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
          <div>
            <h1 className="text-xl font-bold text-[#000000]">مؤسسة Little Princesses للأزياء الراقية 👑</h1>
            <p className="text-xs text-[#555555]">Haute Couture & Luxury Fashion ERP System</p>
            <h2 className="text-base font-bold text-[#007F8C] mt-2">{getTabTitle()}</h2>
          </div>
          <div className="text-left text-xs text-[#444444] space-y-1">
            <p><strong>تاريخ الاستخراج:</strong> {window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]}</p>
            <p><strong>نطاق الفترة:</strong> من {dateRange.start || 'البداية'} إلى {dateRange.end || 'اليوم'}</p>
            <p><strong>العملة المعتمدة:</strong> {reportCurrency}</p>
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
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#6F6B75] mb-1.5">من تاريخ 📅</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={e => { setPeriodPreset('custom'); setDateRange({ ...dateRange, start: e.target.value }); }}
                className={`w-full ${inputCls}`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#6F6B75] mb-1.5">إلى تاريخ 📅</label>
              <input
                type="date"
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
                  <span>👑 صافي الربح الفعلي للفترة (Net Profit / Loss)</span>
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
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${balanceSheetData.isBalanced ? 'bg-[#E2F5F7] border-[#C5ECF0] text-[#007F8C]' : 'bg-rose-50 border-rose-200 text-[#D64545]'}`}>
            <div className="flex items-center gap-2.5 font-bold text-xs">
              <span>{balanceSheetData.isBalanced ? '✅' : '⚠️'}</span>
              <span>حالة الميزانية العمومية: {balanceSheetData.isBalanced ? 'متزنة ومطابقة تماماً (الأصول = الخصوم + حقوق الملكية)' : 'يوجد فارق غير متزن'}</span>
            </div>
            <div className="font-mono text-xs font-bold">
              <span>الأصول: {fmtMoney(balanceSheetData.totalAssets)}</span> | <span>الخصوم والملكية: {fmtMoney(balanceSheetData.totalLiabilitiesAndEquity)}</span>
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
                        <td className="px-4 py-2.5 text-[#007F8C]">أرباح / (خسائر) الفترة الحالية المحققة</td>
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
                  <th className="px-4 py-3 text-left font-mono">مجموع المدين ({targetCode})</th>
                  <th className="px-4 py-3 text-left font-mono">مجموع الدائن ({targetCode})</th>
                  <th className="px-4 py-3 text-left font-mono">رصيد مدين</th>
                  <th className="px-4 py-3 text-left font-mono">رصيد دائن</th>
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
                {(accounts || []).map(a => {
                  const code = cleanCode(a.code || a.acc_code || a.id);
                  const name = a.name || a.account_name || code;
                  return <option key={code} value={code}>{code} - {name}</option>;
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
          التبويب 5: كشوفات المطابقات والعملاء والموردين (Sub-Ledger Statements)
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'statements' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E5EA]">
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">كشوفات الحسابات والمطابقات (العملاء والموردون)</h3>
              <p className="text-[11px] text-[#6F6B75]">متابعة الأرصدة الآجلة، المبيعات، المشتريات، وسندات السداد والتحصيل</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-[#FAFAFB] p-1 rounded-xl border border-[#E8E5EA]">
                <button
                  type="button"
                  onClick={() => { setStatementType('customer'); setSelectedPartyId(''); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${statementType === 'customer' ? 'bg-white shadow-xs text-[#007F8C]' : 'text-[#6F6B75]'}`}
                >
                  كشف حساب عميلات 👗
                </button>
                <button
                  type="button"
                  onClick={() => { setStatementType('supplier'); setSelectedPartyId(''); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${statementType === 'supplier' ? 'bg-white shadow-xs text-[#8F2A87]' : 'text-[#6F6B75]'}`}
                >
                  كشف حساب موردين 🧵
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#E8E5EA] overflow-hidden">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="px-4 py-3 text-right">الاسم / الطرف</th>
                  <th className="px-4 py-3 text-center">{statementType === 'customer' ? 'عدد الطلبات' : 'عدد فواتير الشراء'}</th>
                  <th className="px-4 py-3 text-left font-mono">{statementType === 'customer' ? 'إجمالي المبيعات' : 'إجمالي المشتريات'}</th>
                  <th className="px-4 py-3 text-left font-mono">إجمالي المدفوع / المسدد</th>
                  <th className="px-4 py-3 text-left font-mono">الرصيد المتبقي (Due)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {statementData.map(item => (
                  <tr key={item.id} className="hover:bg-[#FAFAFB] transition-colors">
                    <td className="px-4 py-3 font-bold text-[#25232A]">{item.name}</td>
                    <td className="px-4 py-3 text-center font-mono font-semibold">{statementType === 'customer' ? item.ordersCount : item.purchasesCount}</td>
                    <td className="px-4 py-3 text-left font-mono font-bold text-[#007F8C]">{fmtMoney(statementType === 'customer' ? item.totalSales : item.totalPurchases)}</td>
                    <td className="px-4 py-3 text-left font-mono font-bold text-[#25232A]">{fmtMoney(item.totalPaid)}</td>
                    <td className={`px-4 py-3 text-left font-mono font-extrabold ${item.balanceDue > 0 ? 'text-[#D64545]' : 'text-[#007F8C]'}`}>
                      {fmtMoney(item.balanceDue)} {reportCurrency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── صندوق الاعتمادات والتوقيعات الرسمية المخصص للطباعة والـ PDF ── */}
      <div className="mt-8 pt-6 border-t-2 border-dashed border-[#E8E5EA]">
        <div className="bg-white rounded-2xl border border-[#E8E5EA] p-6 shadow-2xs">
          <div className="text-center mb-6">
            <h4 className="text-xs font-bold text-[#25232A]">صندوق الاعتماد والتدقيق المالي الرسمي 👑</h4>
            <p className="text-[11px] text-[#6F6B75]">مؤسسة Little Princesses للأزياء الراقية والفساتين الفاخرة</p>
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
              <span className="block text-[10px] text-[#888]">الختم الرسمي للمؤسسة 👑</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

