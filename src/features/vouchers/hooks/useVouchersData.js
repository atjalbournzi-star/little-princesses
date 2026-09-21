const { useState, useEffect, useMemo, useCallback } = React;

function useVouchersData({ vouchers = [], setVouchers, accounts = [], setAccounts, currency }) {
  const currencyDisplay = currency?.display || "YER ﷼";
  const activeTargetCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(currency?.code || currencyDisplay) : (currency?.code || 'YER');
  const activeCurrencyDef = window.CurrencyService ? window.CurrencyService.getCurrencyDef(activeTargetCurr) : { display: activeTargetCurr, symbol: activeTargetCurr };
  const activeCurrencyDisplay = activeCurrencyDef?.display || `${activeTargetCurr} ${activeCurrencyDef?.symbol || ''}`;

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('الكل');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // استخراج الاسم النظيف للشريك بدون بادئات
  const getCleanPartnerName = useCallback((acc) => {
    if (!acc) return '';
    const raw = String(acc.name || acc.account_name || acc.name_ar || acc.code || '').trim();
    return raw.replace(/^(راس\s*مال|رأس\s*مال|حصة|شريك|المساهم)\s*/i, '').trim() || raw;
  }, []);

  // استخراج قائمة شركاء وحسابات رأس المال المباشر ديناميكياً من شجرة الحسابات
  const partnerAccounts = useMemo(() => {
    return (accounts || []).filter(a => {
      const code = String(a.code || a.acc_code || a.id || '').trim();
      const name = String(a.name || a.account_name || a.name_ar || '').trim();
      const isLeaf = (!a.is_group || a.is_group === 0 || a.is_leaf === 1 || a.is_postable === 1) && a.account_type !== 'تجميعي';
      if (!isLeaf) return false;
      if (code === '3' || code === '301' || code === '3111') return false;
      if (code.startsWith('301.') || code.startsWith('3111.') || a.parent_id === '301' || a.parent_id === '3111') return true;
      if (code.startsWith('3') && (name.includes('مال') || name.includes('شريك') || name.includes('مؤسس') || name.includes('حصة'))) {
        return code !== '302' && !name.includes('أرباح') && !name.includes('خسائر') && !name.includes('مرحلة');
      }
      return false;
    }).sort((x, y) => String(x.code || x.acc_code || '').localeCompare(String(y.code || y.acc_code || ''), undefined, { numeric: true, sensitivity: 'base' }));
  }, [accounts]);

  // دالة البحث والربط التلقائي لحساب الشريك المقابل
  const findPartnerAccount = useCallback((val) => {
    if (!val) return null;
    const str = String(val).trim().toLowerCase();
    return partnerAccounts.find(p => {
      const code = String(p.code || p.acc_code || '').toLowerCase();
      const rawName = String(p.name || p.account_name || p.name_ar || '').toLowerCase();
      const clean = getCleanPartnerName(p).toLowerCase();
      return str === clean || str === rawName || str === code || str.includes(code) || (clean && str.includes(clean)) || (rawName && str.includes(rawName));
    }) || null;
  }, [partnerAccounts, getCleanPartnerName]);

  const normalizeVoucher = useCallback((v) => {
    if (!v) return null;
    const rawNo = String(v.v_no || v.voucher_no || v.payment_no || v.reference_no || `VCH-${v.id || ''}`).trim();
    if (rawNo.includes('TEST') || rawNo.includes('test')) return null;
    const rawType = v.v_type || v.voucher_type || v.payment_type || v.type || (String(rawNo).includes('PV') || String(rawNo).includes('EXP') ? 'سند صرف' : 'سند قبض');
    const isReceipt = rawType === 'سند قبض' || rawType === 'RECEIPT' || rawType === 'قبض' || String(rawNo).includes('RV');
    const typeLabel = isReceipt ? 'سند قبض' : 'سند صرف';
    
    let party = v.party || v.party_name || '';
    if (!party) {
      party = isReceipt ? (v.customer_id || v.customer_name || v.customer || 'عميلة عامة') : (v.supplier_id || v.supplier_name || v.supplier || v.beneficiary || v.recipient || 'مورد / مستفيد عام');
    }
    
    const payMethod = v.pay_method || v.payment_method || v.pay_type || 'نقدي';
    const amount = parseFloat(String(v.amount !== undefined ? v.amount : (v.base_amount || v.amt || 0)).replace(/,/g, '')) || 0;
    const curr = window.CurrencyService ? window.CurrencyService.normalizeCode(v.currency || currencyDisplay) : (v.currency || 'YER');
    const exRate = parseFloat(v.exchange_rate) || (window.CurrencyService ? window.CurrencyService.getRate(curr) : 1.0);
    const baseAmt = parseFloat(v.base_amount) || (amount * exRate);
    let dateStr = v.date || v.date_created || v.created_at || (typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10));
    if (dateStr && String(dateStr).includes('T')) dateStr = String(dateStr).split('T')[0];
    const notes = v.notes || v.note || v.description || '—';
    const account = v.acc_code || v.account_id || v.payment_source || '101 - الصندوق الرئيسي';
    const targetAccount = v.target_acc || v.debit_account || v.credit_account || (isReceipt ? '104 - ذمم العملاء' : '201 - ذمم الموردين');

    return {
      id: v.id || rawNo,
      v_no: rawNo,
      v_type: typeLabel,
      isReceipt,
      party,
      amount,
      currency: curr,
      exchange_rate: exRate,
      base_amount: baseAmt,
      pay_method: payMethod,
      date: dateStr,
      notes,
      account,
      target_account: targetAccount,
      status: v.status || 'Posted',
      reversal_reason: v.reversal_reason || '',
      reversal_entry_id: v.reversal_entry_id || '',
      image_path: v.image_path || v.receipt_url || ''
    };
  }, [currencyDisplay]);

  const filteredVouchers = useMemo(() => {
    return (vouchers || []).map(normalizeVoucher).filter(v => {
      if (!v) return false;
      const matchType = typeFilter === 'الكل' || v.v_type === typeFilter;
      const q = (search || '').toLowerCase();
      const matchSearch = !search ||
        String(v.v_no || '').toLowerCase().includes(q) ||
        String(v.party || '').toLowerCase().includes(q) ||
        String(v.notes || '').toLowerCase().includes(q) ||
        String(v.account || '').toLowerCase().includes(q) ||
        String(v.pay_method || '').toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [vouchers, search, typeFilter, normalizeVoucher]);

  const totals = useMemo(() => {
    let receipts = 0, payments = 0;
    (vouchers || []).forEach(item => {
      const v = normalizeVoucher(item);
      if (v && v.status !== 'reversed') {
        const vCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(v.currency) : (v.currency || 'YER');
        let converted = v.amount;
        if (window.CurrencyService) {
          converted = window.CurrencyService.convert(v.amount, vCurr, activeTargetCurr, v.exchange_rate);
        }
        if (v.isReceipt) receipts += converted;
        else payments += converted;
      }
    });
    return { receipts, payments, net: receipts - payments, targetCode: activeTargetCurr };
  }, [vouchers, activeTargetCurr, normalizeVoucher]);

  const loadLiveAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts/list').then(r => r.json());
      const list = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
      if (list.length > 0 && typeof setAccounts === 'function') {
        setAccounts(list);
      }
    } catch (e) {
      console.warn("Vouchers accounts sync warning:", e);
    }
  }, [setAccounts]);

  const refreshVouchers = useCallback(async () => {
    setIsRefreshing(true);
    try {
      let combined = [];
      if (typeof window.callGAS === 'function') {
        try {
          const gasRes = await window.callGAS('getVouchers');
          const gasList = (gasRes && Array.isArray(gasRes.data)) ? gasRes.data : (Array.isArray(gasRes) ? gasRes : []);
          if (gasList.length > 0) combined.push(...gasList);
        } catch (ge) {
          console.warn("GAS getVouchers warning:", ge);
        }
      }
      try {
        const beRes = await fetch('/api/vouchers').then(r => r.json());
        const beList = (beRes && Array.isArray(beRes.data)) ? beRes.data : (Array.isArray(beRes) ? beRes : []);
        if (beList.length > 0) combined.push(...beList);
      } catch (be) {
        console.warn("Local vouchers fetch warning:", be);
      }

      if (combined.length > 0) {
        const uniq = new Map();
        combined.forEach(v => {
          const key = String(v.v_no || v.voucher_no || v.payment_no || v.id || '').trim();
          if (key && !uniq.has(key)) uniq.set(key, v);
        });
        if (setVouchers) setVouchers(Array.from(uniq.values()));
      }
      await loadLiveAccounts();
    } catch (err) {
      console.error("refreshVouchers error:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [setVouchers, loadLiveAccounts]);

  useEffect(() => {
    refreshVouchers();
    loadLiveAccounts();
  }, [refreshVouchers, loadLiveAccounts]);

  return {
    currencyDisplay,
    activeTargetCurr,
    activeCurrencyDef,
    activeCurrencyDisplay,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    isRefreshing,
    partnerAccounts,
    getCleanPartnerName,
    findPartnerAccount,
    normalizeVoucher,
    filteredVouchers,
    totals,
    loadLiveAccounts,
    refreshVouchers
  };
}

window.useVouchersData = useVouchersData;
