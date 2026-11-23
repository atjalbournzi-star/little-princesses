const { useState, useEffect, useMemo, useCallback, useRef } = React;

function useVouchersData({ vouchers = [], setVouchers, accounts = [], setAccounts, currency }) {
  const currencyDisplay = currency?.display || "YER ﷼";
  const activeTargetCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(currency?.code || currencyDisplay) : (currency?.code || 'YER');
  const activeCurrencyDef = window.CurrencyService ? window.CurrencyService.getCurrencyDef(activeTargetCurr) : { display: activeTargetCurr, symbol: activeTargetCurr };
  const activeCurrencyDisplay = activeCurrencyDef?.display || `${activeTargetCurr} ${activeCurrencyDef?.symbol || ''}`;

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('الكل');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const getCleanPartnerName = useCallback((acc) => {
    if (!acc) return '';
    const raw = String(acc.name || acc.account_name || acc.name_ar || acc.code || '').trim();
    return raw.replace(/^(راس\s*مال|رأس\s*مال|حصة|شريك|المساهم)\s*/i, '').trim() || raw;
  }, []);

  const partnerAccounts = useMemo(() => (accounts || []).filter(a => {
    const code = String(a.code || a.acc_code || a.id || '').trim();
    const name = String(a.name || a.account_name || a.name_ar || '').trim();
    if ((a.is_group && a.is_group !== 0) || a.account_type === 'تجميعي' || ['3', '301', '3111'].includes(code)) return false;
    if (code.startsWith('301.') || code.startsWith('3111.') || a.parent_id === '301' || a.parent_id === '3111') return true;
    return code.startsWith('3') && code !== '302' && ['مال', 'شريك', 'مؤسس', 'حصة'].some(k => name.includes(k)) && !['أرباح', 'خسائر', 'مرحلة'].some(k => name.includes(k));
  }).sort((x, y) => String(x.code || x.acc_code || '').localeCompare(String(y.code || y.acc_code || ''), undefined, { numeric: true })), [accounts]);

  const findPartnerAccount = useCallback((val) => {
    if (!val) return null;
    const str = String(val).trim().toLowerCase();
    return partnerAccounts.find(p => {
      const code = String(p.code || p.acc_code || '').toLowerCase(), raw = String(p.name || p.account_name || '').toLowerCase(), cln = getCleanPartnerName(p).toLowerCase();
      return str === cln || str === raw || str === code || str.includes(code) || (cln && str.includes(cln));
    }) || null;
  }, [partnerAccounts, getCleanPartnerName]);

  const normalizeVoucher = useCallback((v) => {
    if (!v) return null;
    const no = String(v.v_no || v.voucher_no || v.payment_no || v.id || '').trim();
    if (no.toUpperCase().includes('TEST')) return null;

    const vType = v.v_type || v.voucher_type || (v.isReceipt ? 'سند قبض' : 'سند صرف');
    const isReceipt = v.isReceipt ?? (vType === 'سند قبض' || vType === 'إيداع رأس مال');
    const isPayment = v.isPayment ?? (vType === 'سند صرف');
    const amt = parseFloat(v.amount) || 0;
    const curr = window.CurrencyService ? window.CurrencyService.normalizeCode(v.currency || currencyDisplay) : (v.currency || 'YER');
    const exRate = parseFloat(v.exchange_rate) || (window.CurrencyService ? window.CurrencyService.getRate(curr) : 1.0);
    const baseAmt = parseFloat(v.base_amount) || (amt * exRate);
    const dateStr = String(v.date || v.date_created || '').split('T')[0] || new Date().toISOString().slice(0, 10);

    return {
      id: v.id || no, v_no: no, v_type: vType, isReceipt, isPayment,
      party: v.party || v.party_name || '', amount: amt, currency: curr,
      exchange_rate: exRate, base_amount: baseAmt, pay_method: v.pay_method || '',
      date: dateStr, notes: v.notes || '',
      account: v.account || v.account_id || '',
      target_account: v.target_account || v.target_acc || '',
      status: v.status || 'Confirmed',
      reversal_reason: v.reversal_reason || '',
      reversal_entry_id: v.reversal_entry_id || '',
      image_path: v.image_path || ''
    };
  }, [currencyDisplay]);

  const filteredVouchers = useMemo(() => (vouchers || []).map(normalizeVoucher).filter(v => {
    if (!v) return false;
    const matchType = typeFilter === 'الكل' || v.v_type === typeFilter ||
      (typeFilter === 'سند قبض' && (v.isReceipt || v.v_type === 'سند قبض' || v.v_type === 'إيداع رأس مال')) ||
      (typeFilter === 'سند صرف' && (!v.isReceipt || v.v_type === 'سند صرف')) ||
      (typeFilter === 'إيداع رأس مال' && (v.v_type === 'إيداع رأس مال' || (v.notes && v.notes.includes('رأس مال')))) ||
      (typeFilter === 'قيود يومية' && (v.v_type.includes('قيد') || v.v_type.includes('تسوية')));
    const q = (search || '').toLowerCase().trim();
    const matchSearch = !q || [v.v_no, v.party, v.notes, v.account, v.target_account, v.pay_method, String(v.amount)].some(s => String(s || '').toLowerCase().includes(q));
    return matchType && matchSearch;
  }), [vouchers, search, typeFilter, normalizeVoucher]);

  const totals = useMemo(() => {
    let receipts = 0, payments = 0;
    (vouchers || []).forEach(item => {
      const v = normalizeVoucher(item);
      if (v && v.status !== 'reversed') {
        const vCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(v.currency) : (v.currency || 'YER');
        const converted = window.CurrencyService ? window.CurrencyService.convert(v.amount, vCurr, activeTargetCurr, v.exchange_rate) : (v.base_amount || v.amount);
        if (v.isReceipt) receipts += converted;
        else if (v.v_type === 'سند صرف' || v.isPayment) payments += converted;
      }
    });
    return { receipts, payments, net: receipts - payments, targetCode: activeTargetCurr, count: (vouchers || []).length };
  }, [vouchers, activeTargetCurr, normalizeVoucher]);

  const stats = useMemo(() => ({
    totalCount: totals.count || 0, totalIn: totals.receipts || 0,
    totalOut: totals.payments || 0, netCash: totals.net || 0, targetCode: activeTargetCurr
  }), [totals, activeTargetCurr]);

  const loadLiveAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts/list').then(r => r.json());
      const list = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
      if (list.length > 0 && typeof setAccounts === 'function') setAccounts(list);
    } catch (e) { console.warn("Vouchers accounts sync warning:", e); }
  }, [setAccounts]);

  const refreshVouchers = useCallback(async () => {
    setIsRefreshing(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/vouchers').then(r => r.json());
      if (res && res.success === false) {
        throw new Error(res.error || 'تعذر جلب السندات والمعاملات المالية');
      }
      const vList = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
      if (typeof setVouchers === 'function') setVouchers(vList);
    } catch (err) {
      console.error("refreshVouchers error:", err);
      setFetchError(err.message || 'حدث خطأ في الاتصال بالخادم لجلب السندات');
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [setVouchers]);

  const initialLoadedRef = useRef(false);
  const refreshRef = useRef(refreshVouchers);
  refreshRef.current = refreshVouchers;

  useEffect(() => {
    if (!initialLoadedRef.current) {
      initialLoadedRef.current = true;
      if (typeof refreshRef.current === 'function') refreshRef.current();
      if ((!accounts || accounts.length === 0) && typeof loadLiveAccounts === 'function') {
        loadLiveAccounts();
      }
    }
  }, [accounts, loadLiveAccounts]);

  return {
    currencyDisplay, activeTargetCurr, activeCurrencyDef, activeCurrencyDisplay,
    search, setSearch, typeFilter, setTypeFilter, isRefreshing, loading, setLoading, fetchError,
    partnerAccounts, getCleanPartnerName, findPartnerAccount,
    normalizeVoucher, filteredVouchers: filteredVouchers || [], totals: totals || { receipts: 0, payments: 0, net: 0, count: 0 },
    stats: stats || { totalCount: 0, totalIn: 0, totalOut: 0, netCash: 0 },
    loadLiveAccounts, refreshVouchers
  };
}

window.useVouchersData = useVouchersData;
