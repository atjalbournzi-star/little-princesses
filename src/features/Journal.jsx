function Journal({ journal = [], setJournal, accounts = [], setAccounts, vouchers = [], setVouchers, showToast, currency, customers = [], purchases = [], employees = [] }) {
  const [activeSubTab, setActiveSubTab] = useState('entries'); // 'entries' | 'ledger' | 'trial_balance'
  
  // Journal Form State (Simple 2-Leg Entry)
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

  // ── محرر قيد اليومية المركب (Compound Multi-Leg Balanced Journal) ──
  const [showCompoundModal, setShowCompoundModal] = useState(false);
  const [compoundForm, setCompoundForm] = useState({
    entry_no: '',
    date: TODAY_STR_ISO,
    currency: 'YER ﷼',
    exchange_rate: '1.0',
    ref_type: 'قيد مركب',
    ref_id: '',
    general_notes: ''
  });
  const [compoundLines, setCompoundLines] = useState([
    { id: 1, account_code: '', link_subparty: false, party_type: 'customer', party_id: '', debit: '', credit: '', notes: '' },
    { id: 2, account_code: '', link_subparty: false, party_type: 'supplier', party_id: '', debit: '', credit: '', notes: '' }
  ]);
  const [isSubmittingCompound, setIsSubmittingCompound] = useState(false);

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

  // Compound Currency helper
  const compoundCurrCode = window.CurrencyService ? window.CurrencyService.normalizeCode(compoundForm.currency) : 'YER';

  // Automatically update exchange rate when currency changes
  useEffect(() => {
    if (window.CurrencyService) {
      const rate = window.CurrencyService.getRate(currencyCode);
      setFormData(prev => ({ ...prev, exchange_rate: String(rate) }));
    }
  }, [formData.currency, currencyCode]);

  useEffect(() => {
    if (window.CurrencyService) {
      const rate = window.CurrencyService.getRate(compoundCurrCode);
      setCompoundForm(prev => ({ ...prev, exchange_rate: String(rate) }));
    }
  }, [compoundForm.currency, compoundCurrCode]);

  // ── دوال إدارة أسطر القيد المركب ──
  const handleAddCompoundLine = () => {
    setCompoundLines(prev => [
      ...prev,
      { id: Date.now() + Math.random(), account_code: '', link_subparty: false, party_type: 'customer', party_id: '', debit: '', credit: '', notes: '' }
    ]);
  };

  const handleDuplicateCompoundLine = (idx) => {
    const target = compoundLines[idx];
    if (!target) return;
    const duplicated = { ...target, id: Date.now() + Math.random() };
    const next = [...compoundLines];
    next.splice(idx + 1, 0, duplicated);
    setCompoundLines(next);
  };

  const handleDeleteCompoundLine = (idx) => {
    if (compoundLines.length <= 2) {
      showToast('يجب أن يحتوي القيد المركب على سطرين على الأقل ⚠️', 'warning');
      return;
    }
    setCompoundLines(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCompoundLineChange = (idx, field, val) => {
    setCompoundLines(prev => {
      const copy = [...prev];
      const row = { ...copy[idx], [field]: val };
      if (field === 'debit' && val && parseFloat(val) > 0) row.credit = '';
      if (field === 'credit' && val && parseFloat(val) > 0) row.debit = '';
      copy[idx] = row;
      return copy;
    });
  };

  // مجاميع القيد المركب والاتزان
  const compoundTotals = useMemo(() => {
    const totalDebit = compoundLines.reduce((s, r) => s + (parseFloat(r.debit) || 0), 0);
    const totalCredit = compoundLines.reduce((s, r) => s + (parseFloat(r.credit) || 0), 0);
    const diff = Math.abs(totalDebit - totalCredit);
    const isBalanced = diff < 0.01 && totalDebit > 0;
    return { totalDebit, totalCredit, diff, isBalanced };
  }, [compoundLines]);

  const handleOpenCompoundModal = () => {
    setCompoundForm({
      entry_no: `JV-CMP-${Date.now().toString().slice(-5)}`,
      date: TODAY_STR_ISO,
      currency: 'YER ﷼',
      exchange_rate: '1.0',
      ref_type: 'قيد مركب',
      ref_id: '',
      general_notes: ''
    });
    setCompoundLines([
      { id: 1, account_code: '', link_subparty: false, party_type: 'customer', party_id: '', debit: '', credit: '', notes: '' },
      { id: 2, account_code: '', link_subparty: false, party_type: 'supplier', party_id: '', debit: '', credit: '', notes: '' }
    ]);
    setShowCompoundModal(true);
  };

  // اعتماد وترحيل القيد المركب
  const handleSubmitCompound = async (e) => {
    if (e) e.preventDefault();
    if (!compoundTotals.isBalanced) {
      return showToast('⚠️ القيد غير متزن! يجب أن يتساوى إجمالي المدين مع إجمالي الدائن تماماً (الفرق = 0).', 'error');
    }

    const invalidRow = compoundLines.find(r => !r.account_code || ((parseFloat(r.debit) || 0) === 0 && (parseFloat(r.credit) || 0) === 0));
    if (invalidRow) {
      return showToast('⚠️ يرجى التأكد من اختيار الحساب وكتابة المبلغ (مدين أو دائن) لجميع الأسطر.', 'error');
    }

    setIsSubmittingCompound(true);
    try {
      const entryNo = compoundForm.entry_no || `JV-CMP-${Date.now().toString().slice(-6)}`;
      const cRate = parseFloat(compoundForm.exchange_rate) || 1.0;
      const txId = `TX-CMP-${Date.now()}`;

      // Pair debits and credits into balanced double-entry rows or multi-legs
      const debitLines = compoundLines.filter(r => (parseFloat(r.debit) || 0) > 0);
      const creditLines = compoundLines.filter(r => (parseFloat(r.credit) || 0) > 0);

      const generatedEntries = [];

      // If 1-to-Many or Many-to-1 or Many-to-Many
      debitLines.forEach(d => {
        const dAmt = parseFloat(d.debit) || 0;
        const dAccObj = (accounts || []).find(a => String(a.code || a.acc_code || a.id) === String(d.account_code));
        const dLabel = dAccObj ? `${dAccObj.code || dAccObj.acc_code} - ${dAccObj.name || dAccObj.account_name}` : d.account_code;
        
        creditLines.forEach(c => {
          const cAmt = parseFloat(c.credit) || 0;
          const portion = (dAmt * cAmt) / compoundTotals.totalDebit;
          const cAccObj = (accounts || []).find(a => String(a.code || a.acc_code || a.id) === String(c.account_code));
          const cLabel = cAccObj ? `${cAccObj.code || cAccObj.acc_code} - ${cAccObj.name || cAccObj.account_name}` : c.account_code;

          const baseObj = window.CurrencyService ? window.CurrencyService.toBase(portion, compoundCurrCode, cRate) : { base_amount: portion * cRate, exchange_rate: cRate };

          const combinedNotes = [
            compoundForm.general_notes,
            d.notes ? `(مدين: ${d.notes})` : '',
            c.notes ? `(دائن: ${c.notes})` : ''
          ].filter(Boolean).join(' | ');

          generatedEntries.push({
            id: Date.now() + Math.random(),
            transaction_id: txId,
            entry_no: entryNo,
            debit: dLabel,
            credit: cLabel,
            debit_account_id: dLabel,
            credit_account_id: cLabel,
            debit_code: d.account_code,
            credit_code: c.account_code,
            amount: portion,
            currency: compoundCurrCode,
            exchange_rate: cRate,
            base_amount: baseObj.base_amount,
            ref_type: compoundForm.ref_type || 'قيد مركب',
            ref_id: compoundForm.ref_id || '',
            date: compoundForm.date || TODAY_STR_ISO,
            notes: combinedNotes || 'قيد يومية مركب متعدد الأطراف',
            statement: combinedNotes || 'قيد يومية مركب متعدد الأطراف',
            status: 'posted'
          });
        });
      });

      if (setJournal) {
        setJournal(prev => [...generatedEntries, ...(prev || [])]);
      }

      // Save to local backend
      for (const entryItem of generatedEntries) {
        fetch('/api/journal/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entryItem)
        }).catch(err => console.warn('Compound local save error:', err));
        
        if (typeof window.callGAS === 'function') {
          window.callGAS('addJournalEntry', entryItem).catch(err => console.warn('GAS compound save error:', err));
        }
      }

      showToast(`تم اعتماد وترحيل القيد المركب (${entryNo}) المتزن وتحديث كافة الحسابات بنجاح 👑✨`);
      setShowCompoundModal(false);
    } catch (err) {
      console.error("Compound entry error:", err);
      showToast('حدث خطأ أثناء اعتماد القيد المركب', 'error');
    } finally {
      setIsSubmittingCompound(false);
    }
  };
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

  // Grouped General Ledger Accounts
  const groupedLedgerAccounts = useMemo(() => {
    if (!filteredLedgerRows || filteredLedgerRows.length === 0) return [];
    const groups = {};
    filteredLedgerRows.forEach(r => {
      const code = r.account_code;
      if (!groups[code]) {
        groups[code] = {
          account_code: code,
          account_name: r.account_name,
          account_nature: r.account_nature,
          rows: [],
          final_balance_base: 0,
          final_balance_orig: 0,
          primary_currency: 'YER',
          has_foreign: false
        };
      }
      groups[code].rows.push(r);
      groups[code].final_balance_base = r.running_balance_base;
      groups[code].final_balance_orig = r.running_balance_orig;
      const c = r.currency || 'YER';
      if (c && !String(c).includes('YER')) {
        groups[code].has_foreign = true;
        groups[code].primary_currency = c;
      }
    });
    return Object.values(groups);
  }, [filteredLedgerRows]);

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

    if (setJournal) setJournal(prev => [newJ, ...(prev || [])]);

    try {
      fetch('/api/journal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJ)
      }).catch(err => console.warn('Local journal save error:', err));

      const res = await callGAS('addJournalEntry', newJ);
      if (res.status === 'success' || res.id || !res.error) {
        showToast('تم حفظ القيد المحاسبي المزدوج وتحديث شجرة الحسابات ودفتر الأستاذ بنجاح 📑');
      } else {
        showToast('حدث خطأ أثناء الحفظ', 'error');
      }
    } catch (err) {
      console.warn("Journal save fallback:", err);
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
            <div className="px-6 py-4 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F2E7F3] text-[#8F2A87] flex items-center justify-center text-sm font-bold border border-[#E5CEE7]">
                  ✨
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#25232A]">إضافة وتمرير القيود المحاسبية</h2>
                  <p className="text-[11px] text-[#6F6B75] font-normal">تسجيل العمليات المالية المزدوجة والمركبة مع التثبيت الآلي لسعر الصرف والمكافئ</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleOpenCompoundModal}
                  className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#8F2A87] to-[#B0005A] hover:opacity-95 transition shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>📑</span>
                  <span>+ محرر قيد اليومية المركب (متعدد الأطراف)</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* ── الصف الأول (4 أعمدة) ── */}
                <div>
                  <label className={labelCls}>رقم القيد (تلقائي)</label>
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

                {/* ── الصف الثاني (4 أعمدة) ── */}
                <div>
                  <label className={labelCls}>المبلغ بالعملة المختارة <span className="text-[#D64545] font-bold">*</span></label>
                  <input type="number" step="any" required className={inputCls + " font-mono font-bold text-[#25232A] text-left tabular-nums"} placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>

                <div>
                  <label className={labelCls}>
                    {isBaseCurrency ? 'المبلغ المكافئ بالريال اليمني (YER)' : 'سعر الصرف / المكافئ (YER)'}
                  </label>
                  {isBaseCurrency ? (
                    <div className="h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] font-mono font-extrabold text-xs text-[#007F8C] flex items-center justify-start text-left tabular-nums">
                      {formData.amount ? `${(parseFloat(formData.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} YER ﷼` : '0.00 YER ﷼'}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input type="number" step="any" required className={inputCls + " font-mono font-bold text-[#8F2A87] w-1/2 text-left tabular-nums"} placeholder="سعر الصرف..." value={formData.exchange_rate} onChange={e => setFormData({...formData, exchange_rate: e.target.value})} title="سعر الصرف وقت العملية" />
                      <div className="h-11 px-2.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] font-mono font-extrabold text-[11px] text-[#007F8C] flex items-center justify-start text-left tabular-nums w-1/2 truncate" title="المكافئ بالريال اليمني">
                        {formData.amount ? `${((parseFloat(formData.amount) || 0) * (parseFloat(formData.exchange_rate) || 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })} ﷼` : '0.00 ﷼'}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className={labelCls}>تاريخ القيد</label>
                  <input type="date" className={inputCls + " font-mono text-center dir-ltr tabular-nums"} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>

                <div>
                  <label className={labelCls}>نوع المرجع</label>
                  <select className={inputCls} value={formData.ref_type} onChange={e => setFormData({...formData, ref_type: e.target.value})}>
                    {["قيد يدوي", "إيجارات", "مرتبات وأجور", "مشتريات", "مصروفات تشغيلية", "سند صرف", "سند قبض", "تسوية"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* ── الصف الثالث: البيان ورقم المرجع ── */}
                <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                  <label className={labelCls}>البيان والشرح المحاسبي <span className="text-[#D64545] font-bold">*</span></label>
                  <input type="text" className={inputCls} placeholder="شرح تفصيلي للعملية المالية المحاسبية..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>

                <div className="col-span-1">
                  <label className={labelCls}>رقم المرجع / السند</label>
                  <input type="text" className={inputCls + " font-mono"} placeholder="مثال: REF-1002" value={formData.ref_id || ''} onChange={e => setFormData({...formData, ref_id: e.target.value})} />
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
                <table className="w-full text-xs table-fixed border-collapse">
                  <thead>
                    <tr className="bg-[#FAFAFB] text-[#6F6B75] font-bold border-b border-[#E8E5EA]">
                      <th className="px-3.5 py-3 text-right w-[15%]">رقم القيد والتاريخ</th>
                      <th className="px-3.5 py-3 text-right w-[30%]">الحساب المدين والدائن</th>
                      <th className="px-3.5 py-3 text-right w-[20%]">البيان ونوع المرجع</th>
                      <th className="px-3.5 py-3 text-left w-[20%]">المبالغ وسعر الصرف</th>
                      <th className="px-3.5 py-3 text-center w-[15%]">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E5EA] bg-white">
                    {journal.map(j => {
                      const getAccLabel = (rawVal, rawCode) => {
                        const s = String(rawCode || rawVal || '').trim();
                        const c = s.split(' - ')[0].trim();
                        const found = (accounts || []).find(a => String(a.code || a.acc_code || a.id).trim() === c || String(a.code || a.acc_code || a.id).trim() === s);
                        if (found) {
                          const n = found.name || found.account_name || found.acc_name || found.name_en || '';
                          return `${found.code || found.acc_code} - ${n}`;
                        }
                        return s;
                      };

                      const debitLabel = getAccLabel(j.debit, j.debit_code);
                      const creditLabel = getAccLabel(j.credit, j.credit_code);
                      const origAmt = parseFloat(j.amount) || 0;
                      const curr = j.currency || 'YER';
                      const isForeign = !String(curr).includes('YER');
                      const rate = parseFloat(j.exchange_rate) || 1.0;
                      const baseAmt = parseFloat(j.base_amount) || (curr === 'YER' ? origAmt : origAmt * rate);
                      const refInfo = [j.ref_type, j.ref_id].filter(Boolean).join(' - ') || 'قيد يدوي';

                      return (
                        <tr key={j.id} className="hover:bg-[#FAFAFB] transition-colors border-b border-[#E8E5EA]/60">
                          {/* 1. رقم القيد والتاريخ (15%) */}
                          <td className="px-3.5 py-3 text-right">
                            <div className="font-mono font-bold text-xs text-[#8F2A87] truncate" title={j.entry_no || `JRN-${j.id}`}>
                              {j.entry_no || `JRN-${j.id}`}
                            </div>
                            <div className="font-mono text-[11px] text-[#6F6B75] mt-0.5 tabular-nums flex items-center gap-1">
                              <span>📅</span>
                              <span>{j.date || j.entry_date || '—'}</span>
                            </div>
                          </td>

                          {/* 2. الحساب المدين والدائن (30%) */}
                          <td className="px-3.5 py-3 text-right">
                            <div className="font-bold text-xs text-[#25232A] truncate flex items-center gap-1.5" title={`المدين: ${debitLabel}`}>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E2F5F7] text-[#007F8C] shrink-0">مدين</span>
                              <span className="truncate">{debitLabel}</span>
                            </div>
                            <div className="font-medium text-[11px] text-[#6F6B75] mt-1 truncate flex items-center gap-1.5" title={`الدائن: ${creditLabel}`}>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F2E7F3] text-[#8F2A87] shrink-0">دائن</span>
                              <span className="truncate">{creditLabel}</span>
                            </div>
                          </td>

                          {/* 3. البيان ونوع المرجع (20%) */}
                          <td className="px-3.5 py-3 text-right">
                            <div className="font-semibold text-xs text-[#25232A] truncate" title={j.notes || j.statement || ''}>
                              {j.notes || j.statement || '—'}
                            </div>
                            <div className="mt-1">
                              <span className="bg-[#FAFAFB] border border-[#E8E5EA] text-[#6F6B75] px-2 py-0.5 rounded text-[10.5px] font-medium inline-block truncate max-w-full" title={refInfo}>
                                🏷️ {refInfo}
                              </span>
                            </div>
                          </td>

                          {/* 4. المبالغ وسعر الصرف (20%) */}
                          <td className="px-3.5 py-3 text-left tabular-nums">
                            <div className="font-mono font-bold text-xs text-[#25232A]">
                              {origAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] text-[#6F6B75] font-normal font-sans">{curr}</span>
                            </div>
                            {isForeign && (
                              <div className="text-[10.5px] font-mono text-[#007F8C] font-bold mt-0.5">
                                {baseAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-normal">YER</span>
                                {rate > 1 && <span className="text-[#6F6B75] text-[10px] font-normal mr-1">(@{rate})</span>}
                              </div>
                            )}
                          </td>

                          {/* 5. الإجراءات (15%) */}
                          <td className="px-3.5 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(j)}
                                title="تعديل القيد المحاسبي"
                                className="px-2.5 py-1 bg-[#E2F5F7] text-[#007F8C] hover:bg-[#C5EDF0] rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              >
                                <span>✏️</span>
                                <span>تعديل</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(j)}
                                title="حذف القيد المحاسبي"
                                disabled={isDeletingId === j.id}
                                className="px-2.5 py-1 bg-rose-50 text-[#D64545] hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                              >
                                <span>🗑️</span>
                                <span>حذف</span>
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
                  className={inputCls + " font-mono text-center dir-ltr tabular-nums"}
                />
              </div>

              <div>
                <label className={labelCls}>إلى تاريخ</label>
                <input
                  type="date"
                  value={ledgerDateRange.end}
                  onChange={e => setLedgerDateRange({...ledgerDateRange, end: e.target.value})}
                  className={inputCls + " font-mono text-center dir-ltr tabular-nums"}
                />
              </div>
            </div>

            {/* بطاقات دفتر الأستاذ العام مجمعة حسب الحساب */}
            {groupedLedgerAccounts.length === 0 ? (
              <div className="text-center py-12 text-[#6F6B75] text-xs font-medium">لا توجد حركات في دفتر الأستاذ للفترة أو الحساب المختار 📖</div>
            ) : (
              <div className="space-y-6">
                {groupedLedgerAccounts.map(accGroup => (
                  <div key={accGroup.account_code} className="rounded-2xl border border-[#E8E5EA] overflow-hidden bg-white shadow-xs">
                    {/* ترويسة الحساب القياسية */}
                    <div className="bg-[#FAFAFB] px-5 py-3.5 border-b border-[#E8E5EA] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#8F2A87]"></span>
                        <h4 className="font-bold text-xs sm:text-sm text-[#25232A]">
                          حساب: <span className="font-mono text-[#8F2A87] font-bold">{accGroup.account_code}</span> - {accGroup.account_name}
                        </h4>
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                          accGroup.account_nature === 'credit' ? 'bg-[#F2E7F3] text-[#8F2A87]' : 'bg-[#E2F5F7] text-[#007F8C]'
                        }`}>
                          طبيعة الحساب: {accGroup.account_nature === 'credit' ? 'دائن' : 'مدين'}
                        </span>
                      </div>
                      <div className="text-left">
                        {accGroup.has_foreign ? (
                          <div>
                            <div className="text-xs font-mono font-bold">
                              <span className="text-[#6F6B75] ml-1.5 font-sans">الرصيد التراكمي:</span>
                              <span className={accGroup.final_balance_orig >= 0 ? 'text-[#007F8C]' : 'text-[#D64545]'}>
                                {accGroup.final_balance_orig.toLocaleString('en-US', { minimumFractionDigits: 2 })} {accGroup.primary_currency}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-[#6F6B75] mt-0.5">
                              المكافئ: <span className="font-bold text-[#25232A]">{accGroup.final_balance_base.toLocaleString('en-US', { minimumFractionDigits: 2 })} YER ﷼</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs font-mono font-bold">
                            <span className="text-[#6F6B75] ml-1.5 font-sans">الرصيد التراكمي:</span>
                            <span className={accGroup.final_balance_base >= 0 ? 'text-[#007F8C]' : 'text-[#D64545]'}>
                              {accGroup.final_balance_base.toLocaleString('en-US', { minimumFractionDigits: 2 })} YER ﷼
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* جدول حركات الحساب (table-fixed 5 أعمدة) */}
                    <div className="overflow-x-auto rounded-none">
                      <table className="w-full text-xs table-fixed border-collapse">
                        <thead>
                          <tr className="bg-white text-[#6F6B75] font-bold border-b border-[#E8E5EA]">
                            <th className="px-3.5 py-3 text-right w-[20%]">التاريخ ورقم القيد</th>
                            <th className="px-3.5 py-3 text-right w-[30%]">البيان والشرح</th>
                            <th className="px-3.5 py-3 text-left w-[15%]">العملة الأصلية وسعر الصرف</th>
                            <th className="px-3.5 py-3 text-left w-[20%]">مدين / دائن (YER)</th>
                            <th className="px-3.5 py-3 text-left w-[15%]">الرصيد التراكمي (YER)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E5EA]">
                          {accGroup.rows.map(r => {
                            const origVal = r.debit_orig > 0 ? r.debit_orig : (r.credit_orig > 0 ? r.credit_orig : 0);
                            const isForeignRow = r.currency && !String(r.currency).includes('YER');
                            return (
                              <tr key={r.id} className="hover:bg-[#FAFAFB] transition-colors border-b border-[#E8E5EA]/60">
                                {/* 1. التاريخ ورقم القيد (20% - يمين) */}
                                <td className="px-3.5 py-2.5 text-right w-[20%]">
                                  <div className="font-mono text-[#6F6B75] text-[11px] tabular-nums flex items-center gap-1">
                                    <span>📅</span>
                                    <span>{r.date}</span>
                                  </div>
                                  <div className="font-mono font-bold text-xs text-[#8F2A87] mt-0.5 truncate" title={r.entry_no}>
                                    {r.entry_no}
                                  </div>
                                </td>

                                {/* 2. البيان والشرح (30% - يمين) */}
                                <td className="px-3.5 py-2.5 text-right w-[30%]">
                                  <div className="font-medium text-[#25232A] text-xs truncate" title={r.notes || ''}>
                                    {r.notes || '—'}
                                  </div>
                                </td>

                                {/* 3. العملة الأصلية وسعر الصرف (15% - يسار) */}
                                <td className="px-3.5 py-2.5 text-left w-[15%]">
                                  <div className="font-mono font-bold text-xs text-[#25232A] tabular-nums dir-ltr">
                                    {origVal.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] text-[#6F6B75] font-normal font-sans">{r.currency}</span>
                                  </div>
                                  <div className="text-[10.5px] font-mono text-[#6F6B75] mt-0.5 dir-ltr">
                                    سعر: {r.exchange_rate > 1 ? r.exchange_rate.toLocaleString('en-US') : '1.0'}
                                  </div>
                                </td>

                                {/* 4. مدين / دائن (20% - يسار) */}
                                <td className="px-3.5 py-2.5 text-left w-[20%]">
                                  <div className="flex items-center justify-start gap-2">
                                    <span className="text-[10.5px] font-bold text-[#007F8C] bg-[#E2F5F7] px-1.5 py-0.5 rounded shrink-0">مدين</span>
                                    <span className="font-mono font-bold text-xs text-[#007F8C] tabular-nums dir-ltr">
                                      {r.debit_base > 0 ? r.debit_base.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-start gap-2 mt-1">
                                    <span className="text-[10.5px] font-bold text-[#D64545] bg-rose-50 px-1.5 py-0.5 rounded shrink-0">دائن</span>
                                    <span className="font-mono font-bold text-xs text-[#D64545] tabular-nums dir-ltr">
                                      {r.credit_base > 0 ? r.credit_base.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                                    </span>
                                  </div>
                                </td>

                                {/* 5. الرصيد التراكمي (15% - يسار) */}
                                <td className="px-3.5 py-2.5 text-left w-[15%]">
                                  {isForeignRow ? (
                                    <div>
                                      <div className={`font-mono font-extrabold text-xs tabular-nums dir-ltr ${r.running_balance_orig >= 0 ? 'text-[#007F8C]' : 'text-[#D64545]'}`}>
                                        {r.running_balance_orig.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-normal font-sans text-[#25232A]">{r.currency}</span>
                                      </div>
                                      <div className="text-[10px] text-[#6F6B75] font-mono mt-0.5 dir-ltr tabular-nums">
                                        (≈ {r.running_balance_base.toLocaleString('en-US', { minimumFractionDigits: 2 })} YER)
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div className={`font-mono font-extrabold text-xs tabular-nums dir-ltr ${r.running_balance_base >= 0 ? 'text-[#007F8C]' : 'text-[#D64545]'}`}>
                                        {r.running_balance_base.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                      </div>
                                      <div className="text-[10px] text-[#6F6B75] font-sans mt-0.5">YER ﷼</div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── التبويب الثالث: ميزان المراجعة (Trial Balance Layout - 5 أعمدة محاسبية قياسية) ── */}
      {activeSubTab === 'trial_balance' && (
        <div className="space-y-6 pb-6">
          <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚖️</span>
                <div>
                  <h3 className="font-bold text-sm text-[#25232A]">جدول هيكلة ميزان المراجعة (Trial Balance Layout)</h3>
                  <p className="text-[11px] text-[#6F6B75]">تقرير ميزان المراجعة بالمجاميع والأرصدة بالريال اليمني (YER)</p>
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
              <table className="w-full text-xs table-fixed border-collapse">
                <thead className="bg-[#FAFAFB] text-[#6F6B75] font-bold border-b border-[#E8E5EA]">
                  <tr>
                    <th className="px-4 py-3 text-right w-[32%] whitespace-nowrap">كود واسم الحساب</th>
                    <th className="px-4 py-3 text-left w-[17%] whitespace-nowrap">مجموع حركات مدين (YER)</th>
                    <th className="px-4 py-3 text-left w-[17%] whitespace-nowrap">مجموع حركات دائن (YER)</th>
                    <th className="px-4 py-3 text-left w-[17%] whitespace-nowrap">رصيد مدين (YER)</th>
                    <th className="px-4 py-3 text-left w-[17%] whitespace-nowrap">رصيد دائن (YER)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {trialBalance.rows.map(r => (
                    <tr key={r.code} className="hover:bg-[#FAFAFB] transition-colors border-b border-[#E8E5EA]/60">
                      {/* الخلية 1: كود واسم الحساب وشارة النوع (32% - يمين) */}
                      <td className="px-4 py-3 text-right w-[32%] align-middle">
                        <div className="font-bold text-xs text-[#25232A] truncate">
                          <span className="font-mono font-bold text-[#8F2A87] ml-1.5">{r.code}</span>
                          <span>{r.name}</span>
                        </div>
                        <div className="mt-1">
                          <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-[#FAFAFB] border border-[#E8E5EA] text-[#6F6B75] font-medium inline-block">
                            {r.type}
                          </span>
                        </div>
                      </td>

                      {/* الخلية 2: مجموع حركات مدين (17% - يسار) */}
                      <td className="px-4 py-3 text-left w-[17%] align-middle">
                        <span className="font-mono font-bold text-xs text-[#007F8C] tabular-nums dir-ltr">
                          {r.total_debit_base > 0 ? r.total_debit_base.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                        </span>
                      </td>

                      {/* الخلية 3: مجموع حركات دائن (17% - يسار) */}
                      <td className="px-4 py-3 text-left w-[17%] align-middle">
                        <span className="font-mono font-bold text-xs text-[#D64545] tabular-nums dir-ltr">
                          {r.total_credit_base > 0 ? r.total_credit_base.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                        </span>
                      </td>

                      {/* الخلية 4: رصيد مدين (17% - يسار) */}
                      <td className="px-4 py-3 text-left w-[17%] align-middle">
                        {r.debit_balance_base > 0 ? (
                          <span className="font-mono font-bold text-xs text-[#007F8C] tabular-nums dir-ltr">
                            {r.debit_balance_base.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-xs text-[#9E9AA4]">-</span>
                        )}
                      </td>

                      {/* الخلية 5: رصيد دائن (17% - يسار) */}
                      <td className="px-4 py-3 text-left w-[17%] align-middle">
                        {r.credit_balance_base > 0 ? (
                          <span className="font-mono font-bold text-xs text-[#D64545] tabular-nums dir-ltr">
                            {r.credit_balance_base.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-xs text-[#9E9AA4]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#FAFAFB] border-t-2 border-[#E8E5EA] font-extrabold text-[#25232A]">
                    {/* تذييل 1: الإجمالي وحالة التوازن (32% - يمين) */}
                    <td className="px-4 py-3.5 text-right w-[32%] align-middle">
                      <div className="font-bold text-sm text-[#25232A]">الإجمالي العام</div>
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold ${
                          trialBalance.is_balanced ? 'bg-emerald-100 text-[#137333]' : 'bg-rose-100 text-[#D64545]'
                        }`}>
                          {trialBalance.is_balanced ? 'الميزان متوازن ✅' : `⚠️ غير متوازن (فرق: ${trialBalance.diff})`}
                        </span>
                      </div>
                    </td>

                    {/* تذييل 2: مجموع حركات مدين (17% - يسار) */}
                    <td className="px-4 py-3.5 text-left w-[17%] align-middle">
                      <span className="font-mono font-bold text-xs sm:text-sm text-[#007F8C] tabular-nums dir-ltr">
                        {trialBalance.grand_total_debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* تذييل 3: مجموع حركات دائن (17% - يسار) */}
                    <td className="px-4 py-3.5 text-left w-[17%] align-middle">
                      <span className="font-mono font-bold text-xs sm:text-sm text-[#D64545] tabular-nums dir-ltr">
                        {trialBalance.grand_total_credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* تذييل 4: مجموع الأرصدة المدينة (17% - يسار) */}
                    <td className="px-4 py-3.5 text-left w-[17%] align-middle">
                      <span className="font-mono font-bold text-xs sm:text-sm text-[#007F8C] tabular-nums dir-ltr">
                        {(trialBalance.grand_total_debit_balance || trialBalance.grand_total_debit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* تذييل 5: مجموع الأرصدة الدائنة (17% - يسار) */}
                    <td className="px-4 py-3.5 text-left w-[17%] align-middle">
                      <span className="font-mono font-bold text-xs sm:text-sm text-[#D64545] tabular-nums dir-ltr">
                        {(trialBalance.grand_total_credit_balance || trialBalance.grand_total_credit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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

      {/* ── نافذة محرر قيد اليومية المركب (القيود المزدوجة المتزنة) ── */}
      {showCompoundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto" dir="rtl">
          <div className="bg-[#1e2433] text-white rounded-3xl border border-[#2d3748] shadow-2xl w-full max-w-6xl overflow-hidden my-8 transition-all">
            
            {/* رأس النافذة */}
            <div className="px-6 py-4 border-b border-[#2d3748] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181d2a]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E2F5F7]/10 text-[#00E5FF] flex items-center justify-center text-lg font-bold border border-[#00E5FF]/20">
                  📑
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>محرر قيد اليومية المركب (القيود المزدوجة المتزنة)</span>
                    <span className="text-xs font-normal text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">متعدد الأطراف Multi-Leg</span>
                  </h3>
                  <p className="text-xs text-[#94a3b8]">إنشاء قيد محاسبي مركب من عدة أسطر مدينة ودائنة مع التحقق الفوري من التوازن</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAddCompoundLine}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#00E5FF] bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/30 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="text-base leading-none">+</span>
                  <span>إضافة سطر حساب</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowCompoundModal(false)}
                  className="w-9 h-9 rounded-xl bg-[#2d3748] hover:bg-[#374151] text-gray-300 flex items-center justify-center transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* بيانات رأس القيد العامة */}
            <div className="p-6 bg-[#181d2a]/60 border-b border-[#2d3748]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1.5">رقم القيد</label>
                  <input
                    type="text"
                    value={compoundForm.entry_no}
                    onChange={e => setCompoundForm({ ...compoundForm, entry_no: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-mono font-bold focus:border-[#00E5FF] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1.5">تاريخ القيد</label>
                  <input
                    type="date"
                    value={compoundForm.date}
                    onChange={e => setCompoundForm({ ...compoundForm, date: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-mono focus:border-[#00E5FF] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1.5">العملة</label>
                  <select
                    value={compoundForm.currency}
                    onChange={e => setCompoundForm({ ...compoundForm, currency: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-bold focus:border-[#00E5FF] outline-none"
                  >
                    {["YER ﷼", "SAR ﷼", "USD $"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1.5">سعر الصرف</label>
                  <input
                    type="number"
                    step="any"
                    value={compoundForm.exchange_rate}
                    onChange={e => setCompoundForm({ ...compoundForm, exchange_rate: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-mono font-bold text-amber-400 focus:border-[#00E5FF] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1.5">نوع المرجع / العملية</label>
                  <select
                    value={compoundForm.ref_type}
                    onChange={e => setCompoundForm({ ...compoundForm, ref_type: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs focus:border-[#00E5FF] outline-none"
                  >
                    {["قيد مركب", "تسوية شاملة", "توزيع أرباح", "رواتب مجمعة", "مشتريات أقمشة متعددة", "تسوية عهد ومصروفات"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="lg:col-span-5">
                  <label className="block text-[11px] font-bold text-gray-300 mb-1.5">البيان العام للقيد المركب</label>
                  <input
                    type="text"
                    placeholder="اكتب شرحاً عاماً وشاملاً لموضوع القيد المحاسبي المركب..."
                    value={compoundForm.general_notes}
                    onChange={e => setCompoundForm({ ...compoundForm, general_notes: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs focus:border-[#00E5FF] outline-none placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* جدول أسطر القيد المركب */}
            <div className="p-6 overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-[#111827] text-gray-300 font-bold border-b border-[#2d3748]">
                    <th className="px-3.5 py-3 text-right w-[30%]">رمز واسم الحساب في الدليل</th>
                    <th className="px-3.5 py-3 text-right w-[20%]">ربط جهة فرعية (اختياري)</th>
                    <th className="px-3.5 py-3 text-center w-[12%]">المدين (Debit)</th>
                    <th className="px-3.5 py-3 text-center w-[12%]">الدائن (Credit)</th>
                    <th className="px-3.5 py-3 text-right w-[20%]">شرح سطر الحساب</th>
                    <th className="px-3.5 py-3 text-center w-[6%]">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d3748] bg-[#1a202c]">
                  {compoundLines.map((line, idx) => (
                    <tr key={line.id} className="hover:bg-[#222a3a] transition-colors">
                      {/* اختيار الحساب */}
                      <td className="px-3.5 py-2.5">
                        <select
                          value={line.account_code}
                          onChange={e => handleCompoundLineChange(idx, 'account_code', e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-[#374151] bg-[#111827] text-white text-xs font-semibold focus:border-[#00E5FF] outline-none"
                        >
                          <option value="">-- اختر حساب من الدليل --</option>
                          {postingAccounts.map(a => {
                            const code = a.code || a.acc_code || a.id;
                            const rawName = a.name || a.account_name || a.acc_name || '';
                            const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                            return <option key={code} value={code}>{code} - {name}</option>;
                          })}
                        </select>
                      </td>

                      {/* ربط جهة فرعية */}
                      <td className="px-3.5 py-2.5">
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-1.5 text-[11px] text-gray-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={line.link_subparty}
                              onChange={e => handleCompoundLineChange(idx, 'link_subparty', e.target.checked)}
                              className="rounded accent-[#00E5FF]"
                            />
                            <span>ربط جهة فرعية</span>
                          </label>

                          {line.link_subparty && (
                            <div className="flex gap-1.5">
                              <select
                                value={line.party_type}
                                onChange={e => handleCompoundLineChange(idx, 'party_type', e.target.value)}
                                className="w-1/3 h-8 px-1.5 rounded-lg border border-[#374151] bg-[#111827] text-white text-[11px] outline-none"
                              >
                                <option value="customer">عميلة 👗</option>
                                <option value="supplier">مورد 🧵</option>
                                <option value="employee">موظف ✂️</option>
                              </select>

                              <select
                                value={line.party_id}
                                onChange={e => handleCompoundLineChange(idx, 'party_id', e.target.value)}
                                className="w-2/3 h-8 px-2 rounded-lg border border-[#374151] bg-[#111827] text-white text-[11px] outline-none"
                              >
                                <option value="">-- اختر الاسم --</option>
                                {line.party_type === 'customer' && (customers || []).map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                                {line.party_type === 'supplier' && [...new Set((purchases || []).map(p => p.supplier || p.vendor_name).filter(Boolean))].map(s => <option key={s} value={s}>{s}</option>)}
                                {line.party_type === 'employee' && (employees || []).map(emp => <option key={emp.id || emp.name} value={emp.name}>{emp.name}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* مدين */}
                      <td className="px-3.5 py-2.5">
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={line.debit}
                          onChange={e => handleCompoundLineChange(idx, 'debit', e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-[#374151] bg-[#111827] text-[#00E5FF] font-mono font-bold text-xs text-left focus:border-[#00E5FF] outline-none"
                        />
                      </td>

                      {/* دائن */}
                      <td className="px-3.5 py-2.5">
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={line.credit}
                          onChange={e => handleCompoundLineChange(idx, 'credit', e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-[#374151] bg-[#111827] text-amber-400 font-mono font-bold text-xs text-left focus:border-amber-400 outline-none"
                        />
                      </td>

                      {/* ملاحظات السطر */}
                      <td className="px-3.5 py-2.5">
                        <input
                          type="text"
                          placeholder="ملاحظات السطر..."
                          value={line.notes}
                          onChange={e => handleCompoundLineChange(idx, 'notes', e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-[#374151] bg-[#111827] text-white text-xs focus:border-[#00E5FF] outline-none placeholder:text-gray-500"
                        />
                      </td>

                      {/* إجراءات السطر */}
                      <td className="px-3.5 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDuplicateCompoundLine(idx)}
                            title="تكرار هذا السطر"
                            className="w-7 h-7 rounded-lg bg-[#2d3748] hover:bg-[#374151] text-gray-300 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCompoundLine(idx)}
                            title="حذف السطر"
                            className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs transition cursor-pointer"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* شريط المجاميع والتوازن وزر الاعتماد والترحيل (مطابق للصورة تماماً) */}
            <div className="px-6 py-4 border-t border-[#2d3748] bg-[#111827] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-xs">
                  <span className="text-gray-400 font-semibold">إجمالي المدين: </span>
                  <span className="font-mono font-bold text-[#00E5FF] text-sm">{compoundTotals.totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })} {compoundCurrCode}</span>
                </div>

                <div className="text-xs">
                  <span className="text-gray-400 font-semibold">إجمالي الدائن: </span>
                  <span className="font-mono font-bold text-amber-400 text-sm">{compoundTotals.totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })} {compoundCurrCode}</span>
                </div>

                <div className="text-xs">
                  <span className="text-gray-400 font-semibold">الفرق: </span>
                  <span className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-full ${
                    compoundTotals.isBalanced ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {compoundTotals.diff.toLocaleString('en-US', { minimumFractionDigits: 2 })} {compoundCurrCode} {compoundTotals.isBalanced ? '✓ متزن' : '⚠️ غير متزن'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCompoundModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#374151] text-gray-300 hover:bg-[#2d3748] font-bold text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={handleSubmitCompound}
                  disabled={!compoundTotals.isBalanced || isSubmittingCompound}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 transition flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>✓</span>
                  <span>{isSubmittingCompound ? 'جاري الاعتماد...' : 'اعتماد القيد المركب وترحيله'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
