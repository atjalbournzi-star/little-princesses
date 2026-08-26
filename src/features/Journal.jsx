function Journal({ journal = [], setJournal, accounts = [], setAccounts, vouchers = [], setVouchers, showToast, currency }) {
  const [activeSubTab, setActiveSubTab] = useState('entries'); // 'entries' | 'ledger' | 'trial_balance'
  
  // Journal Form State
  const [formData, setFormData] = useState({
    entry_no: '',
    debit: '',
    credit: '',
    amount: '',
    currency: 'YER ﷼',
    exchange_rate: '',
    date: TODAY_STR_ISO,
    notes: '',
    ref_type: 'قيد يدوي'
  });

  // Edit Modal State
  const [editingEntry, setEditingEntry] = useState(null);
  const [editFormData, setEditFormData] = useState({
    id: null,
    entry_no: '',
    debit: '',
    credit: '',
    amount: '',
    currency: 'YER ﷼',
    exchange_rate: '1.0',
    date: TODAY_STR_ISO,
    notes: '',
    ref_type: 'قيد يدوي',
    ref_id: ''
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);

  // General Ledger Filters
  const [ledgerAccount, setLedgerAccount] = useState('ALL');
  const [ledgerDateRange, setLedgerDateRange] = useState({ start: '', end: TODAY_STR_ISO });
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Selected Currency helper
  const currencyCode = window.CurrencyService ? window.CurrencyService.normalizeCode(formData.currency) : 'YER';
  const isBaseCurrency = currencyCode === 'YER';

  // Automatically update exchange rate when currency changes
  useEffect(() => {
    if (window.CurrencyService) {
      const rate = window.CurrencyService.getRate(currencyCode);
      setFormData(prev => ({ ...prev, exchange_rate: String(rate) }));
    }
  }, [formData.currency, currencyCode]);

  const postingAccounts = useMemo(() => {
    return (accounts || []).filter(a => Number(a.is_group) !== 1 && Number(a.is_active) !== 0);
  }, [accounts]);

  // Derived General Ledger Rows
  const ledgerRows = useMemo(() => {
    if (window.AccountingEngine && typeof window.AccountingEngine.generateGeneralLedger === 'function') {
      const filterId = ledgerAccount === 'ALL' ? null : ledgerAccount;
      return window.AccountingEngine.generateGeneralLedger(journal, accounts, filterId, ledgerDateRange);
    }
    return [];
  }, [journal, accounts, ledgerAccount, ledgerDateRange]);

  const filteredLedgerRows = useMemo(() => {
    if (!ledgerSearch.trim()) return ledgerRows;
    const q = ledgerSearch.toLowerCase();
    return ledgerRows.filter(r => 
      r.entry_no.toLowerCase().includes(q) ||
      r.account_name.toLowerCase().includes(q) ||
      r.account_code.toLowerCase().includes(q) ||
      (r.notes && r.notes.toLowerCase().includes(q))
    );
  }, [ledgerRows, ledgerSearch]);

  // Derived Trial Balance
  const trialBalance = useMemo(() => {
    if (window.AccountingEngine && typeof window.AccountingEngine.generateTrialBalance === 'function') {
      return window.AccountingEngine.generateTrialBalance(journal, accounts);
    }
    return { rows: [], grand_total_debit: 0, grand_total_credit: 0, is_balanced: true, diff: 0 };
  }, [journal, accounts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.debit || !formData.credit || !formData.amount) {
      return showToast('الطرف المدين، الدائن، والمبلغ مطلوبة ⚠️', 'error');
    }
    if (formData.debit === formData.credit) {
      return showToast('الطرف المدين والدائن يجب أن يكونا مختلفين ⚠️', 'error');
    }

    const rate = parseFloat(formData.exchange_rate) || (window.CurrencyService ? window.CurrencyService.getRate(currencyCode) : 1.0);
    const validation = window.AccountingEngine ? window.AccountingEngine.validateEntry({
      ...formData,
      exchange_rate: rate
    }, accounts) : { valid: true };

    if (!validation.valid) {
      return showToast(validation.error || 'خطأ في التحقق من صحة القيد المحاسبي', 'error');
    }

    const entryNo = formData.entry_no || `JV-${Date.now().toString().slice(-6)}`;
    const baseObj = window.CurrencyService ? window.CurrencyService.toBase(formData.amount, currencyCode, rate) : { base_amount: parseFloat(formData.amount) || 0, exchange_rate: rate };

    const debitAccObj = (accounts || []).find(a => String(a.code || a.acc_code || a.id) === String(formData.debit));
    const creditAccObj = (accounts || []).find(a => String(a.code || a.acc_code || a.id) === String(formData.credit));
    const getCleanAccName = (acc) => {
      if (!acc) return '';
      const raw = acc.name || acc.account_name || acc.acc_name || '';
      return (raw && !raw.includes('???')) ? raw : (acc.name_en || acc.code || acc.acc_code || '');
    };
    const debitLabel = debitAccObj ? `${debitAccObj.code || debitAccObj.acc_code} - ${getCleanAccName(debitAccObj)}` : formData.debit;
    const creditLabel = creditAccObj ? `${creditAccObj.code || creditAccObj.acc_code} - ${getCleanAccName(creditAccObj)}` : formData.credit;

    const newJ = {
      id: Date.now(),
      transaction_id: `TX-JV-${Date.now()}`,
      entry_no: entryNo,
      debit: debitLabel,
      credit: creditLabel,
      debit_account_id: debitLabel,
      credit_account_id: creditLabel,
      debit_code: formData.debit,
      credit_code: formData.credit,
      amount: parseFloat(formData.amount) || 0,
      currency: currencyCode,
      exchange_rate: rate,
      base_amount: baseObj.base_amount,
      ref_type: formData.ref_type || 'قيد يدوي',
      ref_id: formData.ref_id || '',
      date: formData.date || TODAY_STR_ISO,
      notes: formData.notes || '',
      statement: formData.notes || '',
      status: 'posted'
    };

    try {
      const res = await callGAS('addJournalEntry', newJ);
      if (res.status === 'success' || res.id || !res.error) {
        if (setJournal) setJournal(prev => [newJ, ...(prev || [])]);
        showToast('تم حفظ القيد المحاسبي المزدوج وتحديث شجرة الحسابات ودفتر الأستاذ بنجاح 📑');
      } else {
        showToast('حدث خطأ أثناء الحفظ', 'error');
      }
    } catch (err) {
      if (setJournal) setJournal(prev => [newJ, ...(prev || [])]);
      showToast('تم حفظ القيد محلياً وتحديث شجرة الحسابات ودفتر الأستاذ ⚡');
    } finally {
      setFormData({
        entry_no: '',
        debit: '',
        credit: '',
        amount: '',
        currency: 'YER ﷼',
        exchange_rate: '1.0',
        date: TODAY_STR_ISO,
        notes: '',
        ref_type: 'قيد يدوي'
      });
    }
  };

  const handleOpenEdit = (entry) => {
    if (!entry) return;
    const dCode = entry.debit_code || String(entry.debit || '').split(' - ')[0].trim();
    const cCode = entry.credit_code || String(entry.credit || '').split(' - ')[0].trim();
    const curr = window.CurrencyService ? window.CurrencyService.normalizeCode(entry.currency || 'YER') : (entry.currency || 'YER');
    const rate = entry.exchange_rate || (window.CurrencyService ? window.CurrencyService.getRate(curr) : 1.0);

    setEditingEntry(entry);
    setEditFormData({
      id: entry.id,
      entry_no: entry.entry_no || `JV-${entry.id}`,
      debit: dCode,
      credit: cCode,
      amount: String(entry.amount || ''),
      currency: curr === 'USD' ? 'USD $' : (curr === 'SAR' ? 'SAR ﷼' : 'YER ﷼'),
      exchange_rate: String(rate),
      date: (entry.date || entry.entry_date || TODAY_STR_ISO).split('T')[0],
      notes: entry.notes || entry.statement || '',
      ref_type: entry.ref_type || 'قيد يدوي',
      ref_id: entry.ref_id || ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editFormData.debit || !editFormData.credit || !editFormData.amount) {
      return showToast('الطرف المدين، الدائن، والمبلغ مطلوبة ⚠️', 'error');
    }
    if (editFormData.debit === editFormData.credit) {
      return showToast('الطرف المدين والدائن يجب أن يكونا مختلفين ⚠️', 'error');
    }

    setIsSubmittingEdit(true);
    try {
      const editCurrencyCode = window.CurrencyService ? window.CurrencyService.normalizeCode(editFormData.currency) : 'YER';
      const rate = parseFloat(editFormData.exchange_rate) || (window.CurrencyService ? window.CurrencyService.getRate(editCurrencyCode) : 1.0);
      const amt = parseFloat(editFormData.amount) || 0;
      const baseObj = window.CurrencyService ? window.CurrencyService.toBase(amt, editCurrencyCode, rate) : { base_amount: amt * rate, exchange_rate: rate };

      const debitAccObj = (accounts || []).find(a => String(a.code || a.acc_code || a.id) === String(editFormData.debit));
      const creditAccObj = (accounts || []).find(a => String(a.code || a.acc_code || a.id) === String(editFormData.credit));
      const getCleanAccName = (acc) => {
        if (!acc) return '';
        const raw = acc.name || acc.account_name || acc.acc_name || '';
        return (raw && !raw.includes('???')) ? raw : (acc.name_en || acc.code || acc.acc_code || '');
      };
      const debitLabel = debitAccObj ? `${debitAccObj.code || debitAccObj.acc_code} - ${getCleanAccName(debitAccObj)}` : editFormData.debit;
      const creditLabel = creditAccObj ? `${creditAccObj.code || creditAccObj.acc_code} - ${getCleanAccName(creditAccObj)}` : editFormData.credit;

      const updatedJ = {
        ...editingEntry,
        id: editingEntry.id,
        entry_no: editFormData.entry_no,
        debit: debitLabel,
        credit: creditLabel,
        debit_account_id: debitLabel,
        credit_account_id: creditLabel,
        debit_code: editFormData.debit,
        credit_code: editFormData.credit,
        amount: amt,
        currency: editCurrencyCode,
        exchange_rate: rate,
        base_amount: baseObj.base_amount,
        ref_type: editFormData.ref_type || 'قيد يدوي',
        ref_id: editFormData.ref_id || '',
        date: editFormData.date,
        notes: editFormData.notes,
        statement: editFormData.notes
      };

      // 1. Update local journal state
      if (setJournal) {
        setJournal(prev => (prev || []).map(j => (j.id === editingEntry.id || j.entry_no === editingEntry.entry_no) ? updatedJ : j));
      }

      // 2. Update local backend
      try {
        await fetch('/api/journal/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedJ)
        });
      } catch(beErr) {
        console.warn("Backend journal update warning:", beErr);
      }

      // 3. Update linked voucher if exists
      if (setVouchers && editFormData.ref_id) {
        setVouchers(prev => (prev || []).map(v => {
          if (v.voucher_no === editFormData.ref_id || v.payment_no === editFormData.ref_id || v.id === editFormData.ref_id) {
            return { ...v, amount: amt, currency: editCurrencyCode, exchange_rate: rate, base_amount: baseObj.base_amount, notes: editFormData.notes, date: editFormData.date };
          }
          return v;
        }));
      }

      // 4. Sync to Google Apps Script Web App
      try {
        if (typeof window.callGAS === 'function') {
          await window.callGAS('updateJournalEntry', updatedJ);
        }
      } catch(gasErr) {
        console.warn("GAS journal update warning:", gasErr);
      }

      showToast('✅ تم تعديل القيد وتحديث الأستاذ العام وشجرة الحسابات والسندات بنجاح ✏️');
      setEditingEntry(null);
    } catch(err) {
      console.error("Save edit error:", err);
      showToast('حدث خطأ أثناء حفظ تعديل القيد', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteEntry = async (entry) => {
    if (!entry) return;
    if (!window.confirm(`⚠️ هل أنت متأكد من حذف القيد المحاسبي رقم (${entry.entry_no || entry.id})؟\n\n(سيتم حذف القيد وعكس أثره المالي فوراً من دفتر الأستاذ وميزان المراجعة والسندات المرتبطة)`)) {
      return;
    }

    setIsDeletingId(entry.id);
    try {
      // 1. Remove from local state
      if (setJournal) {
        setJournal(prev => (prev || []).filter(j => j.id !== entry.id && j.entry_no !== entry.entry_no));
      }

      // 2. Remove linked voucher if exists
      const refNo = entry.ref_id || entry.entry_no;
      if (setVouchers && refNo) {
        setVouchers(prev => (prev || []).filter(v => v.voucher_no !== refNo && v.payment_no !== refNo && v.id !== refNo && v.id !== entry.id));
      }

      // 3. Delete from Local Backend
      try {
        await fetch('/api/journal/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: entry.id, entry_no: entry.entry_no, ref_id: entry.ref_id })
        });
      } catch(beErr) {
        console.warn("Backend journal delete warning:", beErr);
      }

      // 4. Delete from Google Apps Script
      try {
        if (typeof window.callGAS === 'function') {
          await window.callGAS('deleteJournalEntry', { id: entry.id, entry_no: entry.entry_no, ref_id: entry.ref_id });
        }
      } catch(gasErr) {
        console.warn("GAS journal delete warning:", gasErr);
      }

      showToast('✅ تم حذف القيد وتحديث الأستاذ العام وشجرة الحسابات والسندات بنجاح 🗑️');
    } catch(err) {
      console.error("Delete error:", err);
      showToast('حدث خطأ أثناء حذف القيد', 'error');
    } finally {
      setIsDeletingId(null);
    }
  };

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* ── رأس الصفحة وشريط التبويبات الثلاثية ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F2E7F3] text-[#8F2A87] border border-[#E5CEE7] flex items-center justify-center text-xl font-bold shadow-xs">
              📑
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#25232A]">
                نظام المحاسبة والقيود اليومية ودفتر الأستاذ (General Ledger & Double-Entry)
              </h1>
              <p className="text-xs text-[#6F6B75] mt-0.5">
                إدارة القيود المحاسبية المزدوجة المتوازنة بالريال اليمني والعملات الأجنبية وتتبع حركة الحسابات
              </p>
            </div>
          </div>

          {/* تبويبات التنقل */}
          <div className="flex bg-[#FAFAFB] p-1 rounded-xl border border-[#E8E5EA] gap-1">
            <button
              onClick={() => setActiveSubTab('entries')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'entries'
                  ? 'bg-white text-[#8F2A87] shadow-xs border border-[#E8E5EA]'
                  : 'text-[#6F6B75] hover:text-[#25232A]'
              }`}
            >
              <span>📑</span>
              <span>القيود اليومية ({journal.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('ledger')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'ledger'
                  ? 'bg-white text-[#8F2A87] shadow-xs border border-[#E8E5EA]'
                  : 'text-[#6F6B75] hover:text-[#25232A]'
              }`}
            >
              <span>📖</span>
              <span>دفتر الأستاذ العام</span>
            </button>
            <button
              onClick={() => setActiveSubTab('trial_balance')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'trial_balance'
                  ? 'bg-white text-[#8F2A87] shadow-xs border border-[#E8E5EA]'
                  : 'text-[#6F6B75] hover:text-[#25232A]'
              }`}
            >
              <span>⚖️</span>
              <span>ميزان المراجعة</span>
            </button>
          </div>
        </div>

        {/* شريط المؤشرات السريعة */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#E8E5EA] bg-[#FAFAFB] divide-x divide-x-reverse divide-[#E8E5EA]">
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي القيود المرحلة</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#25232A] mt-1 block">
              {journal.length} <span className="text-xs font-medium text-[#6F6B75]">قيد</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي مدين ميزان المراجعة</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] mt-1 block">
              {trialBalance.grand_total_debit.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">YER ﷼</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي دائن ميزان المراجعة</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] mt-1 block">
              {trialBalance.grand_total_credit.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">YER ﷼</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">حالة توازن النظام المحاسبي</span>
            <span className={`text-sm font-bold mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${
              trialBalance.is_balanced ? 'bg-emerald-50 text-[#137333] border border-emerald-200' : 'bg-rose-50 text-[#D64545] border border-rose-200'
            }`}>
              {trialBalance.is_balanced ? '✓ متوازن تماماً (0.00 فرق)' : `⚠️ غير متوازن (فرق: ${trialBalance.diff})`}
            </span>
          </div>
        </div>
      </div>

      {/* ── التبويب الأول: القيود اليومية ── */}
      {activeSubTab === 'entries' && (
        <div className="space-y-6">
          {/* نموذج إضافة قيد يومية */}
          <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden transition-all">
            <div className="px-6 py-4 border-b border-[#E8E5EA] flex items-center justify-between bg-gradient-to-r from-white via-[#FAFAFB] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F2E7F3] text-[#8F2A87] flex items-center justify-center text-sm font-bold border border-[#E5CEE7]">
                  ✨
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#25232A]">إضافة قيد يومية محاسبي مزدوج (Double-Entry)</h2>
                  <p className="text-[11px] text-[#6F6B75] font-normal">تسجيل العمليات المالية المزدوجة مع التثبيت الآلي لسعر الصرف والمكافئ بالريال اليمني</p>
                </div>
              </div>
              <span className="text-xs text-[#6F6B75]">
                <span className="text-[#D64545] font-bold">*</span> الحقول الإلزامية
              </span>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
                <div>
                  <label className={labelCls}>رقم القيد</label>
                  <input type="text" className={inputCls + " font-mono"} placeholder="تلقائي..." value={formData.entry_no} onChange={e => setFormData({...formData, entry_no: e.target.value})} />
                </div>
                <div>
                  <label className={labelCls}>من حساب (المدين Debit) <span className="text-[#D64545] font-bold">*</span></label>
                  <select className={inputCls} value={formData.debit} onChange={e => setFormData({...formData, debit: e.target.value})}>
                    <option value="">-- اختر حساب حركة --</option>
                    {postingAccounts.map(a => {
                      const code = a.code || a.acc_code || a.id;
                      const rawName = a.name || a.account_name || a.acc_name || '';
                      const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                      return <option key={code} value={code}>{code} - {name}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>إلى حساب (الدائن Credit) <span className="text-[#D64545] font-bold">*</span></label>
                  <select className={inputCls} value={formData.credit} onChange={e => setFormData({...formData, credit: e.target.value})}>
                    <option value="">-- اختر حساب حركة --</option>
                    {postingAccounts.map(a => {
                      const code = a.code || a.acc_code || a.id;
                      const rawName = a.name || a.account_name || a.acc_name || '';
                      const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                      return <option key={code} value={code}>{code} - {name}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>العملة <span className="text-[#D64545] font-bold">*</span></label>
                  <select className={inputCls} value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                    {["YER ﷼", "SAR ﷼", "USD $"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>المبلغ بالعملة المختارة <span className="text-[#D64545] font-bold">*</span></label>
                  <input type="number" step="any" required className={inputCls + " font-mono font-bold text-[#25232A]"} placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>

                {!isBaseCurrency && (
                  <div>
                    <label className={labelCls}>سعر الصرف وقت العملية (مقابل YER) <span className="text-[#D64545] font-bold">*</span></label>
                    <input type="number" step="any" required className={inputCls + " font-mono font-bold text-[#8F2A87]"} placeholder="سعر الصرف..." value={formData.exchange_rate} onChange={e => setFormData({...formData, exchange_rate: e.target.value})} />
                  </div>
                )}

                <div>
                  <label className={labelCls}>المبلغ المكافئ بالريال اليمني (YER)</label>
                  <div className="h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] font-mono font-extrabold text-xs text-[#007F8C] flex items-center">
                    {formData.amount ? (
                      isBaseCurrency
                        ? `${(parseFloat(formData.amount) || 0).toLocaleString('en-US')} YER ﷼`
                        : `${((parseFloat(formData.amount) || 0) * (parseFloat(formData.exchange_rate) || 1)).toLocaleString('en-US')} YER ﷼`
                    ) : '0.00 YER ﷼'}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>تاريخ القيد</label>
                  <input type="date" className={inputCls} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>

                <div>
                  <label className={labelCls}>نوع المرجع</label>
                  <select className={inputCls} value={formData.ref_type} onChange={e => setFormData({...formData, ref_type: e.target.value})}>
                    {["قيد يدوي", "إيجارات", "مرتبات وأجور", "مشتريات", "مصروفات تشغيلية", "سند صرف", "سند قبض", "تسوية"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>رقم المرجع / السند</label>
                  <input type="text" className={inputCls + " font-mono"} placeholder="" value={formData.ref_id || ''} onChange={e => setFormData({...formData, ref_id: e.target.value})} />
                </div>

                <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                  <label className={labelCls}>البيان والشرح المحاسبي <span className="text-[#D64545] font-bold">*</span></label>
                  <input type="text" className={inputCls} placeholder="" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs text-white bg-[#8F2A87] hover:bg-[#73216C] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer">
                  <Icons.Check className="w-4 h-4" />
                  <span>حفظ وترحيل القيد المحاسبي 📑</span>
                </button>
              </div>
            </form>
          </div>

          {/* جدول سجل القيود اليومية */}
          <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
              <div className="flex items-center gap-2.5">
                <h3 className="font-bold text-sm text-[#25232A]">سجل القيود اليومية المرحلة</h3>
                <span className="text-xs bg-[#F2E7F3] text-[#8F2A87] font-bold px-2.5 py-0.5 rounded-full font-mono">{journal.length}</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
              {(!journal || journal.length === 0) ? (
                <div className="text-center py-12 text-[#6F6B75] text-xs font-medium">لا توجد قيود مسجلة بعد 📑</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                      <th className="px-4 py-3 text-right">رقم القيد</th>
                      <th className="px-4 py-3 text-right">المدين (من حساب)</th>
                      <th className="px-4 py-3 text-right">الدائن (إلى حساب)</th>
                      <th className="px-4 py-3 text-right">المبلغ الأصلي</th>
                      <th className="px-4 py-3 text-right">سعر الصرف</th>
                      <th className="px-4 py-3 text-right">القيمة بالريال اليمني (YER)</th>
                      <th className="px-4 py-3 text-right">المرجع</th>
                      <th className="px-4 py-3 text-right">البيان والشرح</th>
                      <th className="px-4 py-3 text-right">التاريخ</th>
                      <th className="px-4 py-3 text-center w-28">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E5EA] bg-white">
                    {journal.map(j => {
                      const debitAcc = accounts.find(a => String(a.code || a.acc_code) === String(j.debit))?.name || j.debit;
                      const creditAcc = accounts.find(a => String(a.code || a.acc_code) === String(j.credit))?.name || j.credit;
                      const origAmt = parseFloat(j.amount) || 0;
                      const curr = j.currency || 'YER';
                      const rate = parseFloat(j.exchange_rate) || 1.0;
                      const baseAmt = parseFloat(j.base_amount) || (curr === 'YER' ? origAmt : origAmt * rate);
                      const refInfo = [j.ref_type, j.ref_id].filter(Boolean).join(' - ') || 'قيد يدوي';

                      return (
                        <tr key={j.id} className="hover:bg-[#FAFAFB] transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-[#8F2A87]">{j.entry_no || `JRN-${j.id}`}</td>
                          <td className="px-4 py-3 font-bold text-[#25232A]">{debitAcc}</td>
                          <td className="px-4 py-3 font-bold text-[#25232A]">{creditAcc}</td>
                          <td className="px-4 py-3 font-bold font-mono text-[#25232A]">
                            {origAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] text-[#6F6B75] font-sans">{curr}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[#6F6B75]">{rate > 1 ? rate.toLocaleString('en-US') : '1.0'}</td>
                          <td className="px-4 py-3 font-bold font-mono text-[#007F8C]">
                            {baseAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-sans">YER ﷼</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-[#FAFAFB] border border-[#E8E5EA] text-[#6F6B75] px-2 py-0.5 rounded text-[11px] font-semibold">
                              {refInfo}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#25232A] max-w-[220px]">
                            {j.notes || j.statement || '—'}
                          </td>
                          <td className="px-4 py-3 text-[#6F6B75] font-mono whitespace-nowrap">{j.date || j.entry_date}</td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(j)}
                                title="تعديل القيد المحاسبي ومزامنة السندات"
                                className="p-1.5 text-[#007F8C] hover:bg-[#E2F5F7] rounded-lg transition-colors cursor-pointer"
                              >
                                <Icons.Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(j)}
                                title="حذف القيد المحاسبي وعكس أثره"
                                disabled={isDeletingId === j.id}
                                className="p-1.5 text-[#D64545] hover:bg-[#FDE8E8] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Icons.Trash className="w-4 h-4" />
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
        </div>
      )}

      {/* ── التبويب الثاني: دفتر الأستاذ العام (General Ledger) ── */}
      {activeSubTab === 'ledger' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📖</span>
                <div>
                  <h3 className="font-bold text-sm text-[#25232A]">دفتر الأستاذ العام (General Ledger)</h3>
                  <p className="text-[11px] text-[#6F6B75]">عرض وتتبع الحركات والرصيد التراكمي لكل حساب مشتقاً من القيود اليومية</p>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] border border-[#E8E5EA] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>🖨️</span>
                <span>طباعة كشف الأستاذ</span>
              </button>
            </div>

            {/* الفلاتر */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className={labelCls}>تصفية بالحساب المحاسبي</label>
                <select
                  value={ledgerAccount}
                  onChange={e => setLedgerAccount(e.target.value)}
                  className={inputCls}
                >
                  <option value="ALL">-- جميع الحسابات المحاسبية --</option>
                  {postingAccounts.map(a => {
                    const code = a.code || a.acc_code || a.id;
                    const rawName = a.name || a.account_name || a.acc_name || '';
                    const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                    return <option key={code} value={code}>{code} - {name}</option>;
                  })}
                </select>
              </div>

              <div>
                <label className={labelCls}>من تاريخ</label>
                <input
                  type="date"
                  value={ledgerDateRange.start}
                  onChange={e => setLedgerDateRange({...ledgerDateRange, start: e.target.value})}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>إلى تاريخ</label>
                <input
                  type="date"
                  value={ledgerDateRange.end}
                  onChange={e => setLedgerDateRange({...ledgerDateRange, end: e.target.value})}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
              {filteredLedgerRows.length === 0 ? (
                <div className="text-center py-12 text-[#6F6B75] text-xs font-medium">لا توجد حركات في دفتر الأستاذ للفترة أو الحساب المختار 📖</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                      <th className="px-3.5 py-3 text-right">التاريخ</th>
                      <th className="px-3.5 py-3 text-right">رقم القيد</th>
                      <th className="px-3.5 py-3 text-right">الحساب</th>
                      <th className="px-3.5 py-3 text-right">البيان</th>
                      <th className="px-3.5 py-3 text-right">العملة</th>
                      <th className="px-3.5 py-3 text-right">مدين (أصلي)</th>
                      <th className="px-3.5 py-3 text-right">دائن (أصلي)</th>
                      <th className="px-3.5 py-3 text-right">مدين (YER)</th>
                      <th className="px-3.5 py-3 text-right">دائن (YER)</th>
                      <th className="px-3.5 py-3 text-right">الرصيد التراكمي (YER)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E5EA] bg-white">
                    {filteredLedgerRows.map(r => (
                      <tr key={r.id} className="hover:bg-[#FAFAFB] transition-colors">
                        <td className="px-3.5 py-2.5 font-mono text-[#6F6B75]">{r.date}</td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-[#8F2A87]">{r.entry_no}</td>
                        <td className="px-3.5 py-2.5 font-bold text-[#25232A]">
                          <span className="font-mono text-[#8F2A87] text-[11px] ml-1">{r.account_code}</span>
                          {r.account_name}
                        </td>
                        <td className="px-3.5 py-2.5 text-[#6F6B75] max-w-[200px] truncate">{r.notes}</td>
                        <td className="px-3.5 py-2.5 font-mono">{r.currency}</td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-[#007F8C]">
                          {r.debit_orig > 0 ? r.debit_orig.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-[#D64545]">
                          {r.credit_orig > 0 ? r.credit_orig.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-[#007F8C] bg-[#E2F5F7]/30">
                          {r.debit_base > 0 ? r.debit_base.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-[#D64545] bg-rose-50/30">
                          {r.credit_base > 0 ? r.credit_base.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className={`px-3.5 py-2.5 font-mono font-extrabold ${r.running_balance_base >= 0 ? 'text-[#007F8C]' : 'text-[#D64545]'}`}>
                          {r.running_balance_base.toLocaleString('en-US', { minimumFractionDigits: 2 })} YER
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── التبويب الثالث: ميزان المراجعة (Trial Balance) ── */}
      {activeSubTab === 'trial_balance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚖️</span>
                <div>
                  <h3 className="font-bold text-sm text-[#25232A]">ميزان المراجعة بالمجاميع والأرصدة (Trial Balance)</h3>
                  <p className="text-[11px] text-[#6F6B75]">تقرير توازن الحسابات المحاسبية الموحد بالعملة الأساسية (الريال اليمني YER)</p>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>🖨️</span>
                <span>طباعة ميزان المراجعة</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                    <th className="px-4 py-3 text-right">كود الحساب</th>
                    <th className="px-4 py-3 text-right">اسم الحساب</th>
                    <th className="px-4 py-3 text-right">النوع</th>
                    <th className="px-4 py-3 text-right">الطبيعة</th>
                    <th className="px-4 py-3 text-right">مجموع المدين (YER)</th>
                    <th className="px-4 py-3 text-right">مجموع الدائن (YER)</th>
                    <th className="px-4 py-3 text-right">صافي الرصيد المدين</th>
                    <th className="px-4 py-3 text-right">صافي الرصيد الدائن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E5EA] bg-white">
                  {trialBalance.rows.map(r => (
                    <tr key={r.code} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="px-4 py-2.5 font-mono font-bold text-[#8F2A87]">{r.code}</td>
                      <td className="px-4 py-2.5 font-bold text-[#25232A]">{r.name}</td>
                      <td className="px-4 py-2.5 text-[#6F6B75]">{r.type}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.nature === 'debit' ? 'bg-[#E2F5F7] text-[#007F8C]' : 'bg-[#F2E7F3] text-[#8F2A87]'}`}>
                          {r.nature === 'debit' ? 'مدين' : 'دائن'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-[#007F8C]">
                        {r.total_debit_base > 0 ? r.total_debit_base.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-[#D64545]">
                        {r.total_credit_base > 0 ? r.total_credit_base.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-[#007F8C]">
                        {r.nature === 'debit' && r.net_balance_base > 0 ? r.net_balance_base.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-[#D64545]">
                        {r.nature === 'credit' && r.net_balance_base > 0 ? r.net_balance_base.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#FAFAFB] border-t-2 border-[#E8E5EA] font-extrabold text-[#25232A]">
                    <td colSpan={4} className="px-4 py-3 text-left">الإجمالي العام لميزان المراجعة (YER ﷼):</td>
                    <td className="px-4 py-3 font-mono text-[#007F8C] text-sm">
                      {trialBalance.grand_total_debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#D64545] text-sm">
                      {trialBalance.grand_total_credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={2} className="px-4 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        trialBalance.is_balanced ? 'bg-emerald-100 text-[#137333]' : 'bg-rose-100 text-[#D64545]'
                      }`}>
                        {trialBalance.is_balanced ? '✓ الميزان متوازن تماماً' : `⚠️ فارق: ${trialBalance.diff}`}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal تعديل القيد المحاسبي ومزامنة السندات والأستاذ ── */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-2xl max-w-2xl w-full overflow-hidden text-right" dir="rtl">
            <div className="px-6 py-4 border-b border-[#E8E5EA] flex items-center justify-between bg-gradient-to-r from-white via-[#FAFAFB] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E2F5F7] text-[#007F8C] flex items-center justify-center text-sm font-bold border border-[#C5EDF0]">
                  ✏️
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#25232A]">تعديل القيد المحاسبي: {editFormData.entry_no}</h2>
                  <p className="text-[11px] text-[#6F6B75]">تعديل الحسابات والمبالغ وتحديث دفتر الأستاذ والسندات المالية آلياً</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="w-8 h-8 rounded-lg text-[#6F6B75] hover:bg-[#F3F2F5] hover:text-[#25232A] flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>رقم القيد</label>
                  <input
                    type="text"
                    className={inputCls + " font-mono"}
                    value={editFormData.entry_no}
                    onChange={e => setEditFormData({ ...editFormData, entry_no: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>تاريخ القيد</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={editFormData.date}
                    onChange={e => setEditFormData({ ...editFormData, date: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelCls}>من حساب (المدين Debit) <span className="text-[#D64545] font-bold">*</span></label>
                  <select
                    className={inputCls}
                    value={editFormData.debit}
                    onChange={e => setEditFormData({ ...editFormData, debit: e.target.value })}
                  >
                    <option value="">-- اختر حساب حركة --</option>
                    {postingAccounts.map(a => {
                      const code = a.code || a.acc_code || a.id;
                      const rawName = a.name || a.account_name || a.acc_name || '';
                      const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                      return <option key={code} value={code}>{code} - {name}</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>إلى حساب (الدائن Credit) <span className="text-[#D64545] font-bold">*</span></label>
                  <select
                    className={inputCls}
                    value={editFormData.credit}
                    onChange={e => setEditFormData({ ...editFormData, credit: e.target.value })}
                  >
                    <option value="">-- اختر حساب حركة --</option>
                    {postingAccounts.map(a => {
                      const code = a.code || a.acc_code || a.id;
                      const rawName = a.name || a.account_name || a.acc_name || '';
                      const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                      return <option key={code} value={code}>{code} - {name}</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>العملة <span className="text-[#D64545] font-bold">*</span></label>
                  <select
                    className={inputCls}
                    value={editFormData.currency}
                    onChange={e => {
                      const newCurr = e.target.value;
                      const cCode = window.CurrencyService ? window.CurrencyService.normalizeCode(newCurr) : 'YER';
                      const newRate = window.CurrencyService ? window.CurrencyService.getRate(cCode) : 1.0;
                      setEditFormData({ ...editFormData, currency: newCurr, exchange_rate: String(newRate) });
                    }}
                  >
                    {["YER ﷼", "SAR ﷼", "USD $"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>المبلغ بالعملة المختارة <span className="text-[#D64545] font-bold">*</span></label>
                  <input
                    type="number"
                    step="any"
                    required
                    className={inputCls + " font-mono font-bold text-[#25232A]"}
                    value={editFormData.amount}
                    onChange={e => setEditFormData({ ...editFormData, amount: e.target.value })}
                  />
                </div>

                {window.CurrencyService && window.CurrencyService.normalizeCode(editFormData.currency) !== 'YER' && (
                  <div>
                    <label className={labelCls}>سعر الصرف وقت العملية (مقابل YER) <span className="text-[#D64545] font-bold">*</span></label>
                    <input
                      type="number"
                      step="any"
                      required
                      className={inputCls + " font-mono font-bold text-[#8F2A87]"}
                      value={editFormData.exchange_rate}
                      onChange={e => setEditFormData({ ...editFormData, exchange_rate: e.target.value })}
                    />
                  </div>
                )}

                <div>
                  <label className={labelCls}>نوع المرجع</label>
                  <select
                    className={inputCls}
                    value={editFormData.ref_type}
                    onChange={e => setEditFormData({ ...editFormData, ref_type: e.target.value })}
                  >
                    {["قيد يدوي", "إيجارات", "مرتبات وأجور", "مشتريات", "مصروفات تشغيلية", "سند صرف", "سند قبض", "تسوية"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>رقم المرجع / السند</label>
                  <input
                    type="text"
                    className={inputCls + " font-mono"}
                    value={editFormData.ref_id}
                    onChange={e => setEditFormData({ ...editFormData, ref_id: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelCls}>البيان والشرح المحاسبي <span className="text-[#D64545] font-bold">*</span></label>
                  <input
                    type="text"
                    className={inputCls}
                    value={editFormData.notes}
                    onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E5EA]">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-5 py-2.5 rounded-xl border border-[#E8E5EA] text-[#6F6B75] hover:bg-[#FAFAFB] font-bold text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-[#007F8C] hover:bg-[#006A75] transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
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
