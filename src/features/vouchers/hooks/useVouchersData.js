const { useState, useEffect, useMemo, useCallback } = React;

function useVouchersData({ vouchers = [], setVouchers, accounts = [], setAccounts, currency }) {
  const currencyDisplay = currency?.display || "YER ﷼";
  const activeTargetCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(currency?.code || currencyDisplay) : (currency?.code || 'YER');
  const activeCurrencyDef = window.CurrencyService ? window.CurrencyService.getCurrencyDef(activeTargetCurr) : { display: activeTargetCurr, symbol: activeTargetCurr };
  const activeCurrencyDisplay = activeCurrencyDef?.display || `${activeTargetCurr} ${activeCurrencyDef?.symbol || ''}`;

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('الكل');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

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
    const rawNo = String(v.v_no || v.voucher_no || v.payment_no || v.reference_no || `VCH-${v.id || ''}`).trim();
    if (rawNo.toUpperCase().includes('TEST')) return null;

    const rawType = String(v.v_type || v.voucher_type || v.payment_type || v.type || '').trim();
    let isReceipt = v.isReceipt ?? (rawType.includes('قبض') || rawType.includes('إيداع') || rawType.toUpperCase().includes('RECEIPT') || rawNo.toUpperCase().includes('RV'));
    let isPayment = !isReceipt && (rawType.includes('صرف') || rawType.includes('مصروف') || rawType.toUpperCase().includes('PAYMENT') || rawNo.toUpperCase().includes('PV') || rawNo.toUpperCase().includes('EXP'));

    let typeLabel = rawType || (isReceipt ? 'سند قبض' : 'سند صرف');
    if (rawType.includes('إيداع') || (isReceipt && (v.notes || '').includes('رأس مال'))) { typeLabel = 'إيداع رأس مال'; isReceipt = true; }
    else if (rawType.includes('قبض')) { typeLabel = 'سند قبض'; isReceipt = true; }
    else if (rawType.includes('صرف')) { typeLabel = 'سند صرف'; isPayment = true; }

    const party = v.party || v.party_name || (isReceipt ? (v.customer_id || v.customer_name || 'عميلة عامة') : (v.supplier_id || v.supplier_name || 'مورد / مستفيد عام'));
    const amount = parseFloat(String(v.amount !== undefined ? v.amount : (v.base_amount || v.amt || 0)).replace(/,/g, '')) || 0;
    const curr = window.CurrencyService ? window.CurrencyService.normalizeCode(v.currency || currencyDisplay) : (v.currency || 'YER');
    const exRate = parseFloat(v.exchange_rate) || (window.CurrencyService ? window.CurrencyService.getRate(curr) : 1.0);
    const baseAmt = parseFloat(v.base_amount) || (amount * exRate);
    let dateStr = (v.date || v.date_created || v.created_at || new Date().toISOString().slice(0, 10)).split('T')[0];

    return {
      id: v.id || rawNo, v_no: rawNo, v_type: typeLabel, isReceipt, isPayment, party, amount, currency: curr,
      exchange_rate: exRate, base_amount: baseAmt, pay_method: v.pay_method || v.payment_method || 'نقدي',
      date: dateStr, notes: v.notes || v.note || v.description || '—',
      account: v.account || v.acc_code || v.payment_source || '101 - الصندوق الرئيسي',
      target_account: v.target_account || v.target_acc || (isReceipt ? '104 - ذمم العملاء' : '201 - ذمم الموردين'),
      status: v.status || 'Posted', reversal_reason: v.reversal_reason || '', reversal_entry_id: v.reversal_entry_id || '',
      image_path: v.image_path || v.receipt_url || ''
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
    setLoading(true);
    try {
      let combined = [];
      try {
        const beRes = await fetch('/api/vouchers').then(r => r.json());
        const beList = (beRes && Array.isArray(beRes.data)) ? beRes.data : (Array.isArray(beRes) ? beRes : []);
        if (beList.length > 0) combined.push(...beList);
      } catch (be) { console.warn("Local vouchers warning:", be); }
      try {
        const jRes = await fetch('/api/journal').then(r => r.json());
        const jList = (jRes && Array.isArray(jRes.data)) ? jRes.data : (Array.isArray(jRes) ? jRes : []);
        const exKeys = new Set(combined.map(v => String(v.v_no || v.voucher_no || v.payment_no || v.id || '').trim()));
        jList.forEach(j => {
          const jno = String(j.entry_no || j.id || '').trim(), ref = String(j.ref_id || '').trim(), rType = String(j.ref_type || '').trim();
          if (!jno || jno.startsWith('AUTO-VCH') || jno.startsWith('JV-PUR') || jno.startsWith('JV-PAY') || jno.startsWith('JV-ORD') || ['Payment', 'Receipt', 'Purchase', 'Order'].includes(rType)) return;
          if (exKeys.has(jno) || (ref && exKeys.has(ref)) || exKeys.has(jno.replace(/^AUTO-VCH-/, ''))) return;
          const amt = parseFloat(j.amount || j.total_amount) || 0;
          const jCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(j.currency || 'YER') : (j.currency || 'YER');
          const jRate = parseFloat(j.exchange_rate) || (window.CurrencyService ? window.CurrencyService.getRate(jCurr) : 1.0);
          const baseAmt = parseFloat(j.base_amount) || (amt * jRate);
          combined.push({
            id: j.id || jno, v_no: jno, v_type: 'قيد يومية', isReceipt: false, isPayment: false,
            party: j.description || 'قيد محاسبي يدوي',
            amount: amt, currency: jCurr, exchange_rate: jRate,
            base_amount: baseAmt, pay_method: 'قيد تسوية',
            date: j.date || new Date().toISOString().slice(0, 10),
            notes: j.description || 'قيد محاسبي يدوي', account: j.credit || 'ACC-201',
            target_account: j.debit || 'ACC-105', status: 'Posted'
          });
          exKeys.add(jno);
        });
      } catch (je) { console.warn("Journal check warning:", je); }
      if (typeof window.callGAS === 'function') {
        try {
          const gasRes = await window.callGAS('getVouchers');
          const gasList = (gasRes && Array.isArray(gasRes.data)) ? gasRes.data : (Array.isArray(gasRes) ? gasRes : []);
          if (gasList.length > 0) combined.push(...gasList);
        } catch (ge) { console.warn("GAS getVouchers warning:", ge); }
      }
      if (combined.length > 0) {
        const uniq = new Map();
        combined.forEach(v => {
          const key = String(v.v_no || v.voucher_no || v.payment_no || v.id || '').trim();
          if (key && !uniq.has(key)) uniq.set(key, v);
        });
        if (typeof setVouchers === 'function') setVouchers(Array.from(uniq.values()));
      }
      await loadLiveAccounts();
    } catch (err) {
      console.error("refreshVouchers error:", err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [setVouchers, loadLiveAccounts]);

  useEffect(() => {
    refreshVouchers();
    loadLiveAccounts();
  }, [refreshVouchers, loadLiveAccounts]);

  return {
    currencyDisplay, activeTargetCurr, activeCurrencyDef, activeCurrencyDisplay,
    search, setSearch, typeFilter, setTypeFilter, isRefreshing, loading, setLoading,
    partnerAccounts, getCleanPartnerName, findPartnerAccount,
    normalizeVoucher, filteredVouchers: filteredVouchers || [], totals: totals || { receipts: 0, payments: 0, net: 0, count: 0 },
    stats: stats || { totalCount: 0, totalIn: 0, totalOut: 0, netCash: 0 },
    loadLiveAccounts, refreshVouchers
  };
}

window.useVouchersData = useVouchersData;
