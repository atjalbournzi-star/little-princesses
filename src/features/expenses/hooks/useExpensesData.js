const { useState, useEffect, useMemo, useCallback } = React;

function useExpensesData({ expenses = [], setExpenses, accounts = [], vouchers = [], currency }) {
  const currencyDisplay = currency?.display || "YER ﷼";
  const activeTargetCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(currency?.code || currencyDisplay) : (currency?.code || 'YER');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('الكل');
  const [accountFilter, setAccountFilter] = useState('الكل');
  const [dateFilter, setDateFilter] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchFreshExpenses = useCallback(async () => {
    setIsSyncing(true);
    try {
      if (window.expenseAPI && window.expenseAPI.getExpenses) {
        const data = await window.expenseAPI.getExpenses();
        if (Array.isArray(data) && setExpenses) setExpenses(data);
      } else {
        const res = await fetch('/api/finance/expenses').then(r => r.json());
        if (res && res.data && setExpenses) setExpenses(res.data);
      }
    } catch (e) {
      console.warn("fetchFreshExpenses error:", e);
    } finally {
      setIsSyncing(false);
    }
  }, [setExpenses]);

  useEffect(() => {
    fetchFreshExpenses();
  }, [fetchFreshExpenses]);

  // عرض جميع المصروفات المسجلة مباشرة أو المسجلة عبر سندات الصرف
  const allDisplayedExpenses = useMemo(() => {
    const list = [...(expenses || [])];
    const seenNos = new Set(list.map(e => String(e.expense_no || e.id || '')));

    (vouchers || []).forEach(v => {
      const vNo = String(v.v_no || v.voucher_no || v.payment_no || v.id || '');
      const rawType = v.v_type || v.voucher_type || (vNo.includes('PV') ? 'سند صرف' : 'سند قبض');
      const targetAcc = String(v.target_acc || v.debit_account || v.party || '');
      const isExpVoucher = rawType === 'سند صرف' && (
        targetAcc.includes('50') ||
        targetAcc.includes('6') ||
        targetAcc.includes('مصروف') ||
        String(v.notes || '').includes('مصروف') ||
        String(v.party || '').includes('بقالة')
      );

      if (isExpVoucher && !seenNos.has(vNo) && !seenNos.has(`PV-${vNo}`) && !vNo.startsWith('PV-EXP-')) {
        seenNos.add(vNo);
        list.push({
          id: v.id || vNo,
          expense_no: vNo,
          category: targetAcc || '6 - المصروفات',
          exp_category: targetAcc || '6 - المصروفات',
          amount: v.amount,
          currency: v.currency || 'YER',
          account_id: v.acc_code || v.account_id || '101 - الصندوق الرئيسي',
          payment_source: v.acc_code || v.account_id || '101 - الصندوق الرئيسي',
          payment_method: v.pay_method || v.payment_method || 'نقدي',
          date: v.date || (typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10)),
          notes: v.notes || (v.party ? `سند صرف: ${v.party}` : '—'),
          isVoucher: true
        });
      }
    });

    return list;
  }, [expenses, vouchers]);

  // الفلترة الذكية للمصروفات
  const filteredExpenses = useMemo(() => {
    const todayStr = typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10);
    const currMonthStr = todayStr.substring(0, 7);

    return (allDisplayedExpenses || []).filter(item => {
      const cat = String(item.exp_category || item.category || '').toLowerCase();
      const notes = String(item.notes || '').toLowerCase();
      const no = String(item.expense_no || item.id || '').toLowerCase();
      const acc = String(item.account_id || item.payment_source || '').toLowerCase();
      const q = search.trim().toLowerCase();

      if (q && !cat.includes(q) && !notes.includes(q) && !no.includes(q) && !acc.includes(q)) return false;
      if (categoryFilter !== 'الكل' && !cat.includes(categoryFilter.toLowerCase())) return false;
      if (accountFilter !== 'الكل' && !acc.includes(accountFilter.toLowerCase())) return false;

      if (dateFilter === 'today' && item.date !== todayStr) return false;
      if (dateFilter === 'month' && !String(item.date || '').startsWith(currMonthStr)) return false;

      return true;
    });
  }, [allDisplayedExpenses, search, categoryFilter, accountFilter, dateFilter]);

  // المؤشرات المالية المجمعة بدقة مالية (Decimal Precision)
  const stats = useMemo(() => {
    const todayStr = typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10);
    const currMonthStr = todayStr.substring(0, 7);

    let total = 0;
    let todayTotal = 0;
    let monthTotal = 0;
    let pendingCount = 0;

    (allDisplayedExpenses || []).forEach(e => {
      const amt = parseFloat(e.amount) || 0;
      total += amt;
      if (e.date === todayStr) todayTotal += amt;
      if (String(e.date || '').startsWith(currMonthStr)) monthTotal += amt;
      if (e.status === 'pending' || e.status === 'draft') pendingCount++;
    });

    return {
      total: Math.round(total * 100) / 100,
      todayTotal: Math.round(todayTotal * 100) / 100,
      monthTotal: Math.round(monthTotal * 100) / 100,
      pendingCount,
      count: allDisplayedExpenses.length
    };
  }, [allDisplayedExpenses]);

  // قائمة بنود المصروفات وحسابات الصرف للفلترة
  const filterOptions = useMemo(() => {
    const cats = new Set();
    const accs = new Set();
    allDisplayedExpenses.forEach(e => {
      if (e.exp_category || e.category) cats.add(e.exp_category || e.category);
      if (e.account_id || e.payment_source) accs.add(e.account_id || e.payment_source);
    });
    return {
      categories: Array.from(cats),
      accounts: Array.from(accs)
    };
  }, [allDisplayedExpenses]);

  return {
    allDisplayedExpenses,
    filteredExpenses,
    stats,
    filterOptions,
    isSyncing,
    fetchFreshExpenses,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    accountFilter,
    setAccountFilter,
    dateFilter,
    setDateFilter,
    currencyDisplay,
    activeTargetCurr
  };
}

window.useExpensesData = useExpensesData;
