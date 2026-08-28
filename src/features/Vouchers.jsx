const { useState, useEffect, useMemo, useCallback, useRef } = React;

function Vouchers({ vouchers = [], setVouchers, accounts = [], setAccounts, journal = [], setJournal, showToast, customers = [], setCustomers, orders = [], setOrders, currency, expenses = [], setExpenses }) {
  const currencyDisplay = currency?.display || "SAR";

  const [formData, setFormData] = useState({
    v_no: '',
    v_type: 'سند صرف',
    party: '',
    amount: '',
    currency: typeof CURRENCIES !== 'undefined' ? (typeof CURRENCIES[0] === 'object' ? CURRENCIES[0].value : CURRENCIES[0]) : 'SAR',
    date: TODAY_STR_ISO,
    notes: '',
    pay_method: typeof PAY_METHODS !== 'undefined' ? PAY_METHODS[0] : 'نقدي',
    acc_code: '101 - الصندوق الرئيسي',
    target_acc: '201 - ذمم الموردين'
  });
  
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedOrder, setSelectedOrder] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('الكل'); // 'الكل' | 'سند قبض' | 'سند صرف'
  const [viewVoucher, setViewVoucher] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // حالة تعديل وحذف السند المالي
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [editVoucherData, setEditVoucherData] = useState({
    id: null,
    v_no: '',
    v_type: 'سند صرف',
    party: '',
    amount: '',
    currency: 'YER ﷼',
    exchange_rate: '1.0',
    pay_method: 'نقدي',
    acc_code: '101 - الصندوق الرئيسي',
    target_acc: '201 - ذمم الموردين',
    date: TODAY_STR_ISO,
    notes: ''
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);

  const normalizeVoucher = (v) => {
    if (!v) return null;
    const rawNo = String(v.v_no || v.voucher_no || v.payment_no || v.reference_no || `VCH-${v.id || ''}`).trim();
    if (rawNo.includes('TEST') || rawNo.includes('test')) return null;
    const rawType = v.v_type || v.voucher_type || v.payment_type || v.type || (String(rawNo).includes('PV') || String(rawNo).includes('EXP') ? 'سند صرف' : 'سند قبض');
    const isReceipt = rawType === 'سند قبض' || rawType === 'RECEIPT' || rawType === 'قبض' || String(rawNo).includes('RV');
    const typeLabel = isReceipt ? 'سند قبض' : 'سند صرف';
    
    // الطرف: العميل في القبض، المورد أو المستفيد في الصرف
    let party = v.party || v.party_name || '';
    if (!party) {
      if (isReceipt) party = v.customer_id || v.customer_name || v.customer || '';
      else party = v.supplier_id || v.supplier_name || v.supplier || v.beneficiary || v.recipient || '';
    }
    if (!party) party = isReceipt ? 'عميلة عامة' : 'مورد / مستفيد عام';
    
    const payMethod = v.pay_method || v.payment_method || v.pay_type || 'نقدي';
    const amount = parseFloat(String(v.amount !== undefined ? v.amount : (v.base_amount || v.amt || 0)).replace(/,/g, '')) || 0;
    const curr = v.currency || currencyDisplay;
    let dateStr = v.date || v.date_created || v.created_at || TODAY_STR_ISO;
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
      pay_method: payMethod,
      date: dateStr,
      notes,
      account,
      target_account: targetAccount,
      image_path: v.image_path || v.receipt_url || ''
    };
  };

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
  }, [vouchers, search, typeFilter]);

  const totals = useMemo(() => {
    let receipts = 0, payments = 0;
    (vouchers || []).forEach(item => {
      const v = normalizeVoucher(item);
      if (v) {
        if (v.isReceipt) receipts += v.amount;
        else payments += v.amount;
      }
    });
    return { receipts, payments, net: receipts - payments };
  }, [vouchers]);

  // ── إعادة جلب ومزامنة السندات المالية فوراً من السيرفر وشيت السندات_المالية ──
  const refreshVouchers = useCallback(async () => {
    setIsRefreshing(true);
    try {
      let combined = [];
      // 1. Live Google Sheets
      try {
        if (typeof window.callGAS === 'function') {
          const gasRes = await window.callGAS('getVouchers');
          const gasList = (gasRes && Array.isArray(gasRes.data)) ? gasRes.data : (Array.isArray(gasRes) ? gasRes : []);
          if (gasList.length > 0) combined.push(...gasList);
        }
      } catch (ge) {
        console.warn("GAS getVouchers warning:", ge);
      }

      // 2. Local Backend
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
        const mergedList = Array.from(uniq.values());
        if (setVouchers) setVouchers(mergedList);
      }
    } catch (err) {
      console.error("refreshVouchers error:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [setVouchers]);

  useEffect(() => {
    refreshVouchers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.party || !formData.amount) return showToast('الطرف والمبلغ مطلوبان ⚠️', 'error');
    
    const voucherNo = formData.v_no || `${formData.v_type === 'سند قبض' ? 'RV' : 'PV'}-${Date.now().toString().slice(-6)}`;
    const vCurrCode = window.CurrencyService ? window.CurrencyService.normalizeCode(formData.currency) : 'YER';
    const vRate = window.CurrencyService ? window.CurrencyService.getRate(vCurrCode) : 1.0;
    const vBaseObj = window.CurrencyService ? window.CurrencyService.toBase(formData.amount, vCurrCode, vRate) : { base_amount: parseFloat(formData.amount) || 0, exchange_rate: vRate };

    const selectedCashAcc = formData.acc_code ? formData.acc_code.split(' - ')[0].trim() : '101';
    const defaultTarget = formData.v_type === 'سند صرف' ? '201' : '104';
    const selectedTargetAcc = formData.target_acc ? formData.target_acc.split(' - ')[0].trim() : defaultTarget;

    const isReceipt = formData.v_type === 'سند قبض';
    // Fix 1: Auto-Debit in Payment Voucher posts to user-selected target account (e.g. 502, 201, 102, etc.)
    const debitAccCode = isReceipt ? selectedCashAcc : selectedTargetAcc;
    const creditAccCode = isReceipt ? selectedTargetAcc : selectedCashAcc;

    const debitAccObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(debitAccCode));
    const creditAccObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(creditAccCode));
    const debitAccLabel = debitAccObj ? `${debitAccObj.code || debitAccObj.acc_code} - ${debitAccObj.name || debitAccObj.account_name}` : debitAccCode;
    const creditAccLabel = creditAccObj ? `${creditAccObj.code || creditAccObj.acc_code} - ${creditAccObj.name || creditAccObj.account_name}` : creditAccCode;

    const newV = {
      id: Date.now(),
      v_no: voucherNo,
      voucher_no: voucherNo,
      payment_no: voucherNo,
      v_type: formData.v_type,
      voucher_type: formData.v_type,
      payment_type: formData.v_type,
      party: formData.party,
      party_name: formData.party,
      amount: parseFloat(formData.amount) || 0,
      currency: vCurrCode,
      exchange_rate: vRate,
      base_amount: vBaseObj.base_amount,
      date: formData.date || TODAY_STR_ISO,
      date_created: formData.date || TODAY_STR_ISO,
      notes: formData.notes,
      pay_method: formData.pay_method,
      payment_method: formData.pay_method,
      acc_code: formData.acc_code || '101 - الصندوق الرئيسي',
      account_id: formData.acc_code || '101 - الصندوق الرئيسي',
      payment_source: formData.acc_code || '101 - الصندوق الرئيسي',
      target_acc: formData.target_acc || (isReceipt ? '104 - ذمم العملاء' : '201 - ذمم الموردين'),
      debit_account: debitAccLabel,
      credit_account: creditAccLabel,
      customer_id: isReceipt ? formData.party : '',
      supplier_id: !isReceipt ? formData.party : ''
    };
    
    // Optimistic UI updates
    if (setVouchers) setVouchers([newV, ...(vouchers || [])]);

    const newJEntry = {
        id: Date.now() + 1,
        transaction_id: `TX-VCH-${voucherNo}`,
        entry_no: 'AUTO-VCH-' + voucherNo,
        debit: debitAccLabel,
        credit: creditAccLabel,
        debit_account_id: debitAccLabel,
        credit_account_id: creditAccLabel,
        amount: newV.amount,
        currency: vCurrCode,
        exchange_rate: vRate,
        base_amount: vBaseObj.base_amount,
        ref_type: isReceipt ? 'RECEIPT_VOUCHER' : 'PAYMENT_VOUCHER',
        ref_id: voucherNo,
        date: newV.date,
        notes: `قيد آلي: ${newV.notes || newV.v_type + ' - ' + newV.party}`,
        status: 'posted'
    };
    if (setJournal) setJournal(prev => [newJEntry, ...(prev || [])]);

    // If payment voucher is for an expense account, add to expenses
    let newExp = null;
    if (!isReceipt && (debitAccLabel.startsWith('5') || debitAccLabel.startsWith('6') || debitAccLabel.includes('مصروف'))) {
      newExp = {
        id: Date.now() + 2,
        expense_no: voucherNo,
        category: debitAccLabel,
        exp_category: debitAccLabel,
        amount: parseFloat(newV.amount) || 0,
        currency: vCurrCode,
        exchange_rate: vRate,
        base_amount: vBaseObj.base_amount,
        date: newV.date,
        payment_method: newV.pay_method,
        pay_method: newV.pay_method,
        account_id: creditAccLabel,
        payment_source: creditAccLabel,
        recipient: newV.party,
        notes: newV.notes || `سند صرف: ${newV.party}`,
        status: 'posted'
      };
      if (setExpenses) setExpenses(prev => [newExp, ...(prev || [])]);
    }

    // Dynamic accounts balance update in React state
    if (typeof setAccounts === 'function') {
      setAccounts(prev => (prev || []).map(acc => {
        const c = String(acc.code || acc.acc_code || '');
        if (c === selectedCashAcc || (selectedCashAcc && c.startsWith(selectedCashAcc))) {
          const delta = isReceipt ? vBaseObj.base_amount : -vBaseObj.base_amount;
          const curBal = (parseFloat(acc.current_balance ?? acc.balance) || 0) + delta;
          return { ...acc, current_balance: curBal, balance: curBal };
        }
        if (c === selectedTargetAcc || (selectedTargetAcc && c.startsWith(selectedTargetAcc))) {
          const delta = isReceipt ? -vBaseObj.base_amount : vBaseObj.base_amount;
          const curBal = (parseFloat(acc.current_balance ?? acc.balance) || 0) + delta;
          return { ...acc, current_balance: curBal, balance: curBal };
        }
        return acc;
      }));
    }

    try {
      // 1. Post to local backend
      fetch('/api/vouchers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newV)
      }).catch(err => console.warn('Local voucher save error:', err));

      // 2. Post to GAS
      const res = await callGAS('addVoucher', newV);
      callGAS('addJournalEntry', newJEntry).catch(e => console.error(e));
      if (newExp) {
        callGAS('addExpense', newExp).catch(e => console.error(e));
      }

      if (newV.v_type === 'سند قبض' && selectedCustomer) {
          if (selectedOrder && setOrders) {
              setOrders((orders || []).map(o => {
                if (o.order_no === selectedOrder) {
                   const newPaid = (o.paid || 0) + parseFloat(newV.amount);
                   return { ...o, paid: newPaid, remaining: Math.max(0, o.total - newPaid) };
                }
                return o;
              }));
          }
          
          if (setCustomers) {
              setCustomers((customers || []).map(c => {
                 if (c.name === selectedCustomer) {
                     const cSales = c.ledger?.total_sales || 0;
                     const cDeliv = c.ledger?.delivery || 0;
                     const cPaid = (c.ledger?.total_paid || 0) + parseFloat(newV.amount);
                     return {
                        ...c,
                        ledger: {
                            ...c.ledger,
                            total_paid: cPaid,
                            remaining: Math.max(0, (cSales + cDeliv) - cPaid)
                        }
                     }
                 }
                 return c;
              }));
          }
          
          fetch('/api/gas', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
              body: JSON.stringify({
                  action: 'addOrderPayment',
                  customer_name: selectedCustomer,
                  order_no: selectedOrder,
                  amount: newV.amount,
                  currency: newV.currency,
                  notes: newV.notes
              })
          }).catch(e => console.error(e));
      }

      showToast('تم حفظ السند وترحيل القيد بنجاح 🧾');
      setFormData(prev => ({...prev, amount: '', notes: '', v_no: '', party: ''}));
      setSelectedCustomer('');
      setSelectedOrder('');
    } catch (err) {
      console.warn("Voucher save fallback:", err);
      showToast('تم الحفظ محلياً ⚡');
    }
  };

  const handleOpenEditVoucher = (v) => {
    if (!v) return;
    const norm = normalizeVoucher(v);
    const vCurrCode = window.CurrencyService ? window.CurrencyService.normalizeCode(norm.currency) : (norm.currency || 'YER');
    const vRate = v.exchange_rate || (window.CurrencyService ? window.CurrencyService.getRate(vCurrCode) : 1.0);

    setEditingVoucher(v);
    setEditVoucherData({
      id: norm.id,
      v_no: norm.v_no,
      v_type: norm.v_type,
      party: norm.party,
      amount: String(norm.amount || ''),
      currency: vCurrCode === 'USD' ? 'USD $' : (vCurrCode === 'SAR' ? 'SAR ﷼' : 'YER ﷼'),
      exchange_rate: String(vRate),
      pay_method: norm.pay_method || 'نقدي',
      acc_code: norm.account || '101 - الصندوق الرئيسي',
      target_acc: norm.target_account || (norm.v_type === 'سند صرف' ? '201 - ذمم الموردين' : '104 - ذمم العملاء'),
      date: norm.date || TODAY_STR_ISO,
      notes: norm.notes === '—' ? '' : norm.notes
    });
  };

  const handleSaveEditVoucher = async (e) => {
    e.preventDefault();
    if (!editVoucherData.party || !editVoucherData.amount) {
      return showToast('الطرف والمبلغ مطلوبان ⚠️', 'error');
    }

    setIsSubmittingEdit(true);
    try {
      const vCurrCode = window.CurrencyService ? window.CurrencyService.normalizeCode(editVoucherData.currency) : 'YER';
      const vRate = parseFloat(editVoucherData.exchange_rate) || (window.CurrencyService ? window.CurrencyService.getRate(vCurrCode) : 1.0);
      const amt = parseFloat(editVoucherData.amount) || 0;
      const vBaseObj = window.CurrencyService ? window.CurrencyService.toBase(amt, vCurrCode, vRate) : { base_amount: amt * vRate, exchange_rate: vRate };
      
      const selectedCashAcc = editVoucherData.acc_code ? editVoucherData.acc_code.split(' - ')[0].trim() : '101';
      const defaultTarget = editVoucherData.v_type === 'سند صرف' ? '201' : '104';
      const selectedTargetAcc = editVoucherData.target_acc ? editVoucherData.target_acc.split(' - ')[0].trim() : defaultTarget;
      
      const isReceipt = editVoucherData.v_type === 'سند قبض';
      const debitAccCode = isReceipt ? selectedCashAcc : selectedTargetAcc;
      const creditAccCode = isReceipt ? selectedTargetAcc : selectedCashAcc;

      const debitAccObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(debitAccCode));
      const creditAccObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(creditAccCode));
      const debitLabel = debitAccObj ? `${debitAccObj.code || debitAccObj.acc_code} - ${debitAccObj.name || debitAccObj.account_name}` : debitAccCode;
      const creditLabel = creditAccObj ? `${creditAccObj.code || creditAccObj.acc_code} - ${creditAccObj.name || creditAccObj.account_name}` : creditAccCode;

      const updatedV = {
        ...editingVoucher,
        id: editingVoucher.id || editVoucherData.v_no,
        v_no: editVoucherData.v_no,
        voucher_no: editVoucherData.v_no,
        payment_no: editVoucherData.v_no,
        v_type: editVoucherData.v_type,
        voucher_type: editVoucherData.v_type,
        payment_type: editVoucherData.v_type,
        party: editVoucherData.party,
        party_name: editVoucherData.party,
        amount: amt,
        currency: vCurrCode,
        exchange_rate: vRate,
        base_amount: vBaseObj.base_amount,
        date: editVoucherData.date,
        date_created: editVoucherData.date,
        notes: editVoucherData.notes,
        pay_method: editVoucherData.pay_method,
        payment_method: editVoucherData.pay_method,
        acc_code: editVoucherData.acc_code,
        account_id: editVoucherData.acc_code,
        payment_source: editVoucherData.acc_code,
        target_acc: editVoucherData.target_acc || (isReceipt ? '104 - ذمم العملاء' : '201 - ذمم الموردين'),
        debit_account: debitLabel,
        credit_account: creditLabel
      };

      // 1. Update vouchers in UI state
      if (setVouchers) {
        setVouchers(prev => (prev || []).map(v => {
          const curNo = v.v_no || v.voucher_no || v.payment_no || v.id;
          return (curNo === editVoucherData.v_no || v.id === editingVoucher.id) ? updatedV : v;
        }));
      }

      // 2. Update linked Journal Entry in UI state
      if (setJournal) {
        setJournal(prev => (prev || []).map(j => {
          const isLinked = j.ref_id === editVoucherData.v_no || j.entry_no === 'AUTO-VCH-' + editVoucherData.v_no || j.entry_no === 'JV-PUR-' + editVoucherData.v_no || j.ref_id === editingVoucher.id;
          if (isLinked) {
            return {
              ...j,
              debit: debitLabel,
              credit: creditLabel,
              amount: amt,
              currency: vCurrCode,
              exchange_rate: vRate,
              base_amount: vBaseObj.base_amount,
              date: editVoucherData.date,
              notes: `قيد آلي: ${editVoucherData.notes || editVoucherData.v_type + ' - ' + editVoucherData.party}`
            };
          }
          return j;
        }));
      }

      // 3. Update local backend
      try {
        await fetch('/api/vouchers/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedV)
        });
      } catch(beErr) {
        console.warn("Backend voucher update warning:", beErr);
      }

      // 4. Update Google Apps Script
      try {
        if (typeof window.callGAS === 'function') {
          await window.callGAS('updateVoucher', updatedV);
        }
      } catch(gasErr) {
        console.warn("GAS voucher update warning:", gasErr);
      }

      showToast('✅ تم تعديل السند المالي ومزامنة القيود والأستاذ العام بنجاح ✏️');
      setEditingVoucher(null);
    } catch(err) {
      console.error("Save edit voucher error:", err);
      showToast('حدث خطأ أثناء تعديل السند', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteVoucher = async (v) => {
    if (!v) return;
    const norm = normalizeVoucher(v);
    if (!window.confirm(`⚠️ هل أنت متأكد من حذف ${norm.v_type} رقم (${norm.v_no})؟\n\n(سيتم حذف السند وإلغاء وعكس أثره المالي فوراً من دفتر الأستاذ والقيود اليومية وشجرة الحسابات)`)) {
      return;
    }

    setIsDeletingId(norm.id);
    try {
      // 1. Remove from vouchers state
      if (setVouchers) {
        setVouchers(prev => (prev || []).filter(item => {
          const curNo = item.v_no || item.voucher_no || item.payment_no || item.id;
          return curNo !== norm.v_no && item.id !== norm.id;
        }));
      }

      // 2. Remove linked journal entry from journal state
      if (setJournal) {
        setJournal(prev => (prev || []).filter(j => {
          const isLinked = j.ref_id === norm.v_no || j.entry_no === 'AUTO-VCH-' + norm.v_no || j.entry_no === 'JV-PUR-' + norm.v_no || j.ref_id === norm.id;
          return !isLinked;
        }));
      }

      // 3. Delete from Local Backend
      try {
        await fetch('/api/vouchers/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: norm.id, voucher_no: norm.v_no })
        });
      } catch(beErr) {
        console.warn("Backend voucher delete warning:", beErr);
      }

      // 4. Delete from Google Apps Script
      try {
        if (typeof window.callGAS === 'function') {
          await window.callGAS('deleteVoucher', { id: norm.id, voucher_no: norm.v_no });
          await window.callGAS('deleteJournalEntry', { ref_id: norm.v_no, entry_no: 'AUTO-VCH-' + norm.v_no });
        }
      } catch(gasErr) {
        console.warn("GAS voucher delete warning:", gasErr);
      }

      showToast('✅ تم حذف السند المالي وتحديث الأستاذ العام وشجرة الحسابات بنجاح 🗑️');
    } catch(err) {
      console.error("Delete voucher error:", err);
      showToast('حدث خطأ أثناء حذف السند', 'error');
    } finally {
      setIsDeletingId(null);
    }
  };

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#009FAE] focus:ring-2 focus:ring-[#E2F5F7] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* نافذة معاينة وطباعة تفاصيل السند المالي */}
      {viewVoucher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setViewVoucher(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-[#E8E5EA] space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{viewVoucher.isReceipt ? '📥' : '📤'}</span>
                <div>
                  <h3 className="font-bold text-sm text-[#25232A]">تفاصيل {viewVoucher.v_type}</h3>
                  <span className="text-xs font-mono font-bold text-[#8F2A87]">{viewVoucher.v_no}</span>
                </div>
              </div>
              <button onClick={() => setViewVoucher(null)} className="text-[#6F6B75] hover:text-[#25232A] font-bold p-1">✕</button>
            </div>

            <div className="space-y-3 bg-[#FAFAFB] p-4 rounded-xl border border-[#E8E5EA] text-xs">
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-semibold">{viewVoucher.isReceipt ? 'استلمنا من:' : 'صرفنا إلى (المستفيد):'}</span>
                <span className="font-bold text-[#25232A] text-sm">{viewVoucher.party}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-semibold">المبلغ:</span>
                <span className="font-bold font-mono text-base text-[#007F8C]">
                  {viewVoucher.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {viewVoucher.currency}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-semibold">طريقة الدفع:</span>
                <span className="font-bold text-[#25232A]">{viewVoucher.pay_method}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-semibold">الحساب المالي:</span>
                <span className="font-bold text-[#25232A]">{viewVoucher.account}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-semibold">تاريخ السند:</span>
                <span className="font-mono text-[#25232A]">{viewVoucher.date}</span>
              </div>
              <div>
                <span className="text-[#6F6B75] font-semibold block mb-1">البيان والملاحظات:</span>
                <p className="text-[#25232A] font-medium bg-white p-2 rounded-lg border border-[#E8E5EA]">{viewVoucher.notes}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => window.print()} 
                className="flex-1 py-2.5 bg-[#009FAE] hover:bg-[#007F8C] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🖨️</span>
                <span>طباعة السند</span>
              </button>
              <button 
                onClick={() => setViewVoucher(null)} 
                className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] font-bold text-xs rounded-xl border border-[#E8E5EA] cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── بطاقة إحصائيات السندات المالية ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#E2F5F7] text-[#007F8C] border border-[#C5ECF0] flex items-center justify-center text-xl font-bold shadow-xs">
              🧾
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#25232A]">
                السندات المالية والقبض والصرف (Financial Vouchers & Cash Management)
              </h1>
              <p className="text-xs text-[#6F6B75] mt-0.5">
                إدارة سندات القبض وسندات الصرف وتتبع المدفوعات للموردين والمقبوضات من العملاء
              </p>
            </div>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#E8E5EA] bg-[#FAFAFB] divide-x divide-x-reverse divide-[#E8E5EA]">
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي السندات</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#25232A] mt-1 block">
              {(vouchers || []).length.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">سند</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي سندات القبض (مقبوضات)</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] mt-1 block">
              {totals.receipts.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">{currencyDisplay}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي سندات الصرف (مدفوعات)</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#D64545] mt-1 block">
              {totals.payments.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">{currencyDisplay}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">صافي الحركة النقدية</span>
            <span className={`text-xl font-extrabold font-mono tabular-nums mt-1 block ${totals.net >= 0 ? 'text-[#137333]' : 'text-[#D64545]'}`}>
              {totals.net.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">{currencyDisplay}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── نموذج إضافة سند مالي جديد ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden transition-all">
        <div className="px-6 py-4 border-b border-[#E8E5EA] flex items-center justify-between bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3">
            <span className="text-lg">{formData.v_type === 'سند قبض' ? '📥' : '📤'}</span>
            <div>
              <h2 className="text-sm font-bold text-[#25232A]">إضافة سند مالي جديد ({formData.v_type})</h2>
              <p className="text-[11px] text-[#6F6B75] font-normal">تسجيل المقبوضات والمدفوعات وربطها بالصناديق وشجرة الحسابات</p>
            </div>
          </div>
          <span className="text-xs text-[#6F6B75]">
            <span className="text-[#D64545] font-bold">*</span> الحقول الإلزامية
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* الصف الأول: نوع السند | رقم السند (تلقائي) | اسم المستفيد/العميل | المبلغ والعملة */}
            <div>
              <label className={labelCls}>نوع السند <span className="text-[#D64545] font-bold">*</span></label>
              <select className={inputCls} value={formData.v_type} onChange={e => { setFormData({...formData, v_type: e.target.value}); setSelectedCustomer(''); setSelectedOrder(''); }}>
                <option value="سند صرف">سند صرف (دفع / مشتريات / مصاريف)</option>
                <option value="سند قبض">سند قبض (استلام نقدية / حوالة)</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>رقم السند (تلقائي)</label>
              <input type="text" className={inputCls + " font-mono"} placeholder="تلقائي..." value={formData.v_no} onChange={e => setFormData({...formData, v_no: e.target.value})} />
            </div>
            
            <div>
              <label className={labelCls}>
                {formData.v_type === 'سند قبض' ? 'اسم العميلة (استلمنا من)' : 'اسم المستفيد / المورد'} <span className="text-[#D64545] font-bold">*</span>
              </label>
              {formData.v_type === 'سند قبض' ? (
                <select 
                  className={inputCls}
                  value={selectedCustomer}
                  onChange={(e) => {
                    setSelectedCustomer(e.target.value);
                    setFormData({...formData, party: e.target.value});
                    setSelectedOrder('');
                  }}
                >
                  <option value="">-- اختر العميلة من السجل --</option>
                  {(customers || []).map(c => <option key={c.customer_id || c.id || c.name} value={c.name}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                </select>
              ) : (
                <input type="text" required className={inputCls} placeholder="اسم المورد أو المستفيد..." value={formData.party} onChange={e => setFormData({...formData, party: e.target.value})} />
              )}
            </div>

            <div>
              <label className={labelCls}>المبلغ والعملة <span className="text-[#D64545] font-bold">*</span></label>
              <div className="flex gap-2">
                <input type="number" step="0.01" required className={inputCls + " flex-1 font-mono font-bold text-[#25232A]"} placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                <select className={inputCls + " w-24 shrink-0 font-medium"} value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                  {(typeof CURRENCIES !== 'undefined' ? CURRENCIES : ['SAR','USD','YER']).map(c => <option key={typeof c === "object" ? c.value : c} value={typeof c === "object" ? c.value : c}>{typeof c === "object" ? c.label : c}</option>)}
                </select>
              </div>
            </div>

            {/* الصف الثاني: طريقة الدفع | حساب الصندوق/البنك | الحساب المدين/المقابل | تاريخ السند */}
            <div>
              <label className={labelCls}>طريقة الدفع</label>
              <select className={inputCls} value={formData.pay_method} onChange={e => setFormData({...formData, pay_method: e.target.value})}>
                {(typeof PAY_METHODS !== 'undefined' ? PAY_METHODS : ['نقدي','حوالة بنكية','تحويل إلكتروني']).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>حساب الصندوق / البنك (الدفع/الاستلام)</label>
              <select className={inputCls} value={formData.acc_code} onChange={e => setFormData({...formData, acc_code: e.target.value})}>
                <option value="">-- اختر حساب --</option>
                {accounts.map(a => {
                  const code = a.code || a.acc_code || a.id;
                  const rawName = a.name || a.account_name || a.acc_name || '';
                  const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                  const label = `${code} - ${name}`;
                  return <option key={code} value={label}>{label}</option>;
                })}
              </select>
            </div>

            <div>
              <label className={labelCls}>
                {formData.v_type === 'سند صرف' ? 'الحساب المدين (بند المصروف / المورد)' : 'الحساب الدائن (العميل / الإيراد)'} <span className="text-[#D64545] font-bold">*</span>
              </label>
              <select className={inputCls} value={formData.target_acc} onChange={e => setFormData({...formData, target_acc: e.target.value})}>
                <option value="">-- اختر الحساب المقابل --</option>
                {accounts.map(a => {
                  const code = a.code || a.acc_code || a.id;
                  const rawName = a.name || a.account_name || a.acc_name || '';
                  const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                  const label = `${code} - ${name}`;
                  return <option key={code} value={label}>{label}</option>;
                })}
              </select>
            </div>

            <div>
              <label className={labelCls}>تاريخ السند</label>
              <input type="date" className={inputCls + " font-mono text-center dir-ltr"} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>

            {/* الصف الثالث: البيان وملاحظات السند (كامل العرض col-span-full) */}
            <div className="col-span-1 md:col-span-4">
              <label className={labelCls}>البيان وملاحظات السند</label>
              <input type="text" className={inputCls} placeholder="ملاحظات وتفاصيل الدفعة..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>

            {/* ربط اختياري بطلب في حال سند قبض */}
            {formData.v_type === 'سند قبض' && selectedCustomer && (
              <div className="col-span-1 md:col-span-4">
                <label className={labelCls}>ربط بطلب محدد للعميلة (اختياري)</label>
                <select
                  className={inputCls}
                  value={selectedOrder}
                  onChange={(e) => setSelectedOrder(e.target.value)}
                >
                  <option value="">-- اختياري: غير مربوط بطلب معين --</option>
                  {(orders || []).filter(o => o.customer_name === selectedCustomer).map(o => (
                    <option key={o.order_no} value={o.order_no}>
                      {o.order_no} - {o.product_name} (متبقي: {(o.remaining || 0)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs text-white bg-[#009FAE] hover:bg-[#007F8C] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer">
              <Icons.Check className="w-4 h-4" />
              <span>حفظ السند المالي 💾</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── جدول سجل السندات المالية ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <h3 className="font-bold text-sm text-[#25232A]">سجل السندات المالية</h3>
            <span className="text-xs bg-[#E2F5F7] text-[#007F8C] font-bold px-2.5 py-0.5 rounded-full font-mono">{filteredVouchers.length}</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-semibold text-[#25232A] outline-none cursor-pointer"
            >
              <option value="الكل">جميع السندات</option>
              <option value="سند قبض">سندات القبض (مقبوضات)</option>
              <option value="سند صرف">سندات الصرف (مدفوعات)</option>
            </select>

            <div className="relative flex-1 sm:w-64">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-3 pr-8 h-10 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-medium w-full focus:bg-white focus:border-[#009FAE] outline-none"
                placeholder="بحث برقم السند أو اسم الطرف..."
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] text-xs pointer-events-none">🔍</span>
            </div>

            <button
              type="button"
              onClick={refreshVouchers}
              disabled={isRefreshing}
              title="تحديث ومزامنة السندات من السحابة"
              className="h-10 px-3 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#007F8C] border border-[#E8E5EA] rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
            >
              <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
              <span className="text-xs hidden sm:inline">{isRefreshing ? 'جاري التحديث...' : 'تحديث'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E8E5EA] bg-white">
          {filteredVouchers.length === 0 ? (
            <div className="text-center py-12 text-[#6F6B75] text-xs font-medium">لا توجد سندات مسجلة تطابق البحث 🧾</div>
          ) : (
            <table className="w-full min-w-[950px] text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA] h-11">
                  <th className="px-3 py-2.5 text-right w-[10%]">النوع</th>
                  <th className="px-3 py-2.5 text-right w-[14%]">رقم السند</th>
                  <th className="px-3 py-2.5 text-right w-[17%]">الطرف (المستفيد / العميل)</th>
                  <th className="px-3 py-2.5 text-left w-[14%]">المبلغ</th>
                  <th className="px-3 py-2.5 text-right w-[11%]">طريقة الدفع</th>
                  <th className="px-3 py-2.5 text-right w-[20%]">الحساب المالي</th>
                  <th className="px-3 py-2.5 text-center w-[8%]">التاريخ</th>
                  <th className="px-3 py-2.5 text-center w-[6%]">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {filteredVouchers.map(v => {
                  const accLabel = (() => {
                    const rawAcc = v.account || v.acc_code || v.account_id || v.payment_source || '';
                    if (!rawAcc) return '101 - الصندوق الرئيسي';
                    const cleanStr = String(rawAcc).trim();
                    const accCodeOnly = cleanStr.split(' - ')[0].trim();
                    const match = (accounts || []).find(a => String(a.code || a.acc_code || a.id) === accCodeOnly);
                    if (match) {
                      const rawName = match.name || match.account_name || match.acc_name || '';
                      const name = (rawName && !rawName.includes('???')) ? rawName : (match.name_en || match.code);
                      return `${match.code || match.acc_code} - ${name}`;
                    }
                    return cleanStr;
                  })();

                  return (
                    <tr key={v.id || v.v_no} className="hover:bg-[#FAFAFB] transition-colors border-b border-[#E8E5EA] h-12">
                      {/* الخلية 1 (النوع): شارة نوع السند (سند صرف / قبض) فقط */}
                      <td className="px-3 py-2.5 text-right align-middle whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border whitespace-nowrap ${v.isReceipt ? 'bg-[#E2F5F7] text-[#007F8C] border-[#C5ECF0]' : 'bg-rose-50 text-[#D64545] border-rose-200'}`}>
                          {v.v_type}
                        </span>
                      </td>

                      {/* الخلية 2 (رقم السند): كود ورقم السند كاملاً */}
                      <td className="px-3 py-2.5 text-right align-middle font-mono font-bold text-[#8F2A87] text-xs whitespace-nowrap">
                        {v.v_no}
                      </td>

                      {/* الخلية 3 (الطرف): اسم المستفيد / العميل (محاذاة يمين text-right) */}
                      <td className="px-3 py-2.5 text-right align-middle font-bold text-[#25232A] text-xs whitespace-nowrap" title={v.party}>
                        {v.party || '—'}
                      </td>

                      {/* الخلية 4 (المبلغ): المبلغ والعملة (محاذاة يسار text-left font-mono tabular-nums) */}
                      <td className="px-3 py-2.5 text-left align-middle font-mono font-bold tabular-nums text-xs text-[#25232A] whitespace-nowrap dir-ltr">
                        {(parseFloat(v.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-normal text-[#6F6B75] font-sans mr-0.5">{v.currency || currencyDisplay}</span>
                      </td>

                      {/* الخلية 5 (طريقة الدفع): طريقة الدفع فقط (نص أو شارة مستقلة) */}
                      <td className="px-3 py-2.5 text-right align-middle text-[#25232A] text-xs font-medium whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-[#FAFAFB] border border-[#E8E5EA] text-[#25232A] text-[11px]">
                          {v.pay_method || 'نقدي'}
                        </span>
                      </td>

                      {/* الخلية 6 (الحساب المالي): اسم الحساب المالي / الصندوق (فصل التاريخ عنه تماماً) */}
                      <td className="px-3 py-2.5 text-right align-middle text-[#25232A] text-xs font-mono whitespace-nowrap" title={accLabel}>
                        {accLabel || '101 - الصندوق الرئيسي'}
                      </td>

                      {/* الخلية 7 (التاريخ): تاريخ السند فقط (محاذاة وسط text-center font-mono) */}
                      <td className="px-3 py-2.5 text-center align-middle font-mono text-[#6F6B75] text-xs tabular-nums whitespace-nowrap">
                        {v.date || '—'}
                      </td>

                      {/* الخلية 8 (إجراءات - أقصى اليسار): أزرار الإجراءات (معاينة، تعديل، حذف) */}
                      <td className="px-3 py-2.5 text-center align-middle whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            type="button"
                            onClick={() => setViewVoucher(v)} 
                            title="معاينة وطباعة السند"
                            className="p-1.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#007F8C] border border-[#E8E5EA] rounded-lg font-bold text-[11px] transition cursor-pointer"
                          >
                            👁️
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleOpenEditVoucher(v)} 
                            title="تعديل السند المالي ومزامنة القيود"
                            className="p-1.5 bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C] border border-[#C5ECF0] rounded-lg font-bold text-[11px] transition cursor-pointer"
                          >
                            <Icons.Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteVoucher(v)} 
                            disabled={isDeletingId === (v.id || v.v_no)}
                            title="حذف السند وعكس أثره المالي"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-[#D64545] border border-rose-200 rounded-lg font-bold text-[11px] transition cursor-pointer disabled:opacity-50"
                          >
                            <Icons.Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modal تعديل السند المالي ومزامنة القيود والأستاذ العام ── */}
      {editingVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-2xl max-w-xl w-full overflow-hidden text-right" dir="rtl">
            <div className="px-6 py-4 border-b border-[#E8E5EA] flex items-center justify-between bg-gradient-to-r from-white via-[#FAFAFB] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E2F5F7] text-[#007F8C] flex items-center justify-center text-sm font-bold border border-[#C5ECF0]">
                  ✏️
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#25232A]">تعديل {editVoucherData.v_type}: {editVoucherData.v_no}</h2>
                  <p className="text-[11px] text-[#6F6B75]">تعديل المبالغ والأطراف وتحديث دفتر الأستاذ والقيود اليومية آلياً</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingVoucher(null)}
                className="w-8 h-8 rounded-lg text-[#6F6B75] hover:bg-[#F3F2F5] hover:text-[#25232A] flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditVoucher} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>رقم السند</label>
                  <input
                    type="text"
                    className={inputCls + " font-mono"}
                    value={editVoucherData.v_no}
                    onChange={e => setEditVoucherData({ ...editVoucherData, v_no: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>نوع السند</label>
                  <select
                    className={inputCls}
                    value={editVoucherData.v_type}
                    onChange={e => setEditVoucherData({ ...editVoucherData, v_type: e.target.value })}
                  >
                    <option value="سند قبض">سند قبض (استلام نقدية)</option>
                    <option value="سند صرف">سند صرف (دفع نقدية)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelCls}>
                    {editVoucherData.v_type === 'سند قبض' ? 'حساب الزبون / العميلة (استلمنا من) *' : 'صرفنا إلى (الطرف المستفيد / المورد) *'}
                  </label>
                  <input
                    type="text"
                    required
                    className={inputCls}
                    value={editVoucherData.party}
                    onChange={e => setEditVoucherData({ ...editVoucherData, party: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelCls}>المبلغ <span className="text-[#D64545] font-bold">*</span></label>
                  <input
                    type="number"
                    step="any"
                    required
                    className={inputCls + " font-mono font-bold text-[#25232A]"}
                    value={editVoucherData.amount}
                    onChange={e => setEditVoucherData({ ...editVoucherData, amount: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelCls}>العملة <span className="text-[#D64545] font-bold">*</span></label>
                  <select
                    className={inputCls}
                    value={editVoucherData.currency}
                    onChange={e => {
                      const newCurr = e.target.value;
                      const cCode = window.CurrencyService ? window.CurrencyService.normalizeCode(newCurr) : 'YER';
                      const newRate = window.CurrencyService ? window.CurrencyService.getRate(cCode) : 1.0;
                      setEditVoucherData({ ...editVoucherData, currency: newCurr, exchange_rate: String(newRate) });
                    }}
                  >
                    {["YER ﷼", "SAR ﷼", "USD $"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {window.CurrencyService && window.CurrencyService.normalizeCode(editVoucherData.currency) !== 'YER' && (
                  <div>
                    <label className={labelCls}>سعر الصرف وقت العملية (مقابل YER)</label>
                    <input
                      type="number"
                      step="any"
                      className={inputCls + " font-mono font-bold text-[#8F2A87]"}
                      value={editVoucherData.exchange_rate}
                      onChange={e => setEditVoucherData({ ...editVoucherData, exchange_rate: e.target.value })}
                    />
                  </div>
                )}

                <div>
                  <label className={labelCls}>طريقة الدفع</label>
                  <select
                    className={inputCls}
                    value={editVoucherData.pay_method}
                    onChange={e => setEditVoucherData({ ...editVoucherData, pay_method: e.target.value })}
                  >
                    {["نقدي", "حوالة بنكية", "تحويل إلكتروني"].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>حساب الصندوق / البنك (الدفع/الاستلام)</label>
                  <select
                    className={inputCls}
                    value={editVoucherData.acc_code}
                    onChange={e => setEditVoucherData({ ...editVoucherData, acc_code: e.target.value })}
                  >
                    <option value="">-- اختر حساب --</option>
                    {accounts.map(a => {
                      const code = a.code || a.acc_code || a.id;
                      const rawName = a.name || a.account_name || a.acc_name || '';
                      const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                      const label = `${code} - ${name}`;
                      return <option key={code} value={label}>{label}</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>
                    {editVoucherData.v_type === 'سند صرف' ? 'الحساب المدين (بند المصروف / المورد / الأصل)' : 'الحساب الدائن (حساب العميل / الإيراد)'}
                  </label>
                  <select
                    className={inputCls}
                    value={editVoucherData.target_acc}
                    onChange={e => setEditVoucherData({ ...editVoucherData, target_acc: e.target.value })}
                  >
                    <option value="">-- اختر الحساب المقابل --</option>
                    {accounts.map(a => {
                      const code = a.code || a.acc_code || a.id;
                      const rawName = a.name || a.account_name || a.acc_name || '';
                      const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                      const label = `${code} - ${name}`;
                      return <option key={code} value={label}>{label}</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>تاريخ السند</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={editVoucherData.date}
                    onChange={e => setEditVoucherData({ ...editVoucherData, date: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelCls}>البيان / ملاحظات السند</label>
                  <input
                    type="text"
                    className={inputCls}
                    value={editVoucherData.notes}
                    onChange={e => setEditVoucherData({ ...editVoucherData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E5EA]">
                <button
                  type="button"
                  onClick={() => setEditingVoucher(null)}
                  className="px-5 py-2.5 rounded-xl border border-[#E8E5EA] text-[#6F6B75] hover:bg-[#FAFAFB] font-bold text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-[#009FAE] hover:bg-[#007F8C] transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Icons.Check className="w-4 h-4" />
                  <span>{isSubmittingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات والمزامنة 💾'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
