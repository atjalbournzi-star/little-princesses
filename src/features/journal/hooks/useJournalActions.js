// src/features/journal/hooks/useJournalActions.js
// All mutation handlers: simple entry, edit, delete, and compound entry

function useJournalActions({ journal, setJournal, accounts, setAccounts, vouchers, setVouchers, showToast, customers, purchases, employees }) {
  const TODAY_STR_ISO = new Date().toISOString().split('T')[0];
  const { buildEntryObject, buildUpdatedEntry } = window.JournalUtils || {};

  // ── Simple entry form state ──
  const [formData, setFormData] = React.useState({
    entry_no: '', debit: '', credit: '', amount: '',
    currency: 'YER ﷼', exchange_rate: '', date: TODAY_STR_ISO, notes: '', ref_type: 'قيد يدوي'
  });

  // ── Compound entry state ──
  const [showCompoundModal, setShowCompoundModal]       = React.useState(false);
  const [isSubmittingCompound, setIsSubmittingCompound] = React.useState(false);
  const [compoundForm, setCompoundForm] = React.useState({
    entry_no: '', date: TODAY_STR_ISO, currency: 'YER ﷼', exchange_rate: '1.0', ref_type: 'قيد مركب', ref_id: '', general_notes: ''
  });
  const defaultLine = () => ({ id: Date.now() + Math.random(), account_code: '', link_subparty: false, party_type: 'customer', party_id: '', debit: '', credit: '', notes: '' });
  const [compoundLines, setCompoundLines] = React.useState([defaultLine(), defaultLine()]);

  // ── Edit modal state ──
  const [editingEntry,    setEditingEntry]    = React.useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false);
  const [isDeletingId,    setIsDeletingId]    = React.useState(null);
  const [editFormData, setEditFormData] = React.useState({
    id: null, entry_no: '', debit: '', credit: '', amount: '',
    currency: 'YER ﷼', exchange_rate: '1.0', date: TODAY_STR_ISO, notes: '', ref_type: 'قيد يدوي', ref_id: ''
  });

  const currencyCode    = window.CurrencyService ? window.CurrencyService.normalizeCode(formData.currency)    : 'YER';
  const compoundCurrCode = window.CurrencyService ? window.CurrencyService.normalizeCode(compoundForm.currency) : 'YER';
  const isBaseCurrency  = currencyCode === 'YER';

  React.useEffect(() => {
    if (window.CurrencyService) setFormData(p => ({ ...p, exchange_rate: String(window.CurrencyService.getRate(currencyCode)) }));
  }, [formData.currency]);

  React.useEffect(() => {
    if (window.CurrencyService) setCompoundForm(p => ({ ...p, exchange_rate: String(window.CurrencyService.getRate(compoundCurrCode)) }));
  }, [compoundForm.currency]);

  // Compound totals (memoized)
  const compoundTotals = React.useMemo(() => {
    const totalDebit  = compoundLines.reduce((s, r) => s + (parseFloat(r.debit)  || 0), 0);
    const totalCredit = compoundLines.reduce((s, r) => s + (parseFloat(r.credit) || 0), 0);
    const diff = Math.abs(totalDebit - totalCredit);
    return { totalDebit, totalCredit, diff, isBalanced: diff < 0.01 && totalDebit > 0 };
  }, [compoundLines]);

  // ── Compound line handlers ──
  const handleAddCompoundLine = () => setCompoundLines(p => [...p, defaultLine()]);
  const handleDuplicateCompoundLine = (idx) => {
    const next = [...compoundLines]; next.splice(idx + 1, 0, { ...compoundLines[idx], id: Date.now() + Math.random() }); setCompoundLines(next);
  };
  const handleDeleteCompoundLine = (idx) => {
    if (compoundLines.length <= 2) return showToast('يجب أن يحتوي القيد المركب على سطرين على الأقل ⚠️', 'warning');
    setCompoundLines(p => p.filter((_, i) => i !== idx));
  };
  const handleCompoundLineChange = (idx, field, val) => setCompoundLines(p => {
    const copy = [...p]; const row = { ...copy[idx], [field]: val };
    if (field === 'debit'  && val && parseFloat(val) > 0) row.credit = '';
    if (field === 'credit' && val && parseFloat(val) > 0) row.debit  = '';
    copy[idx] = row; return copy;
  });

  const handleOpenCompoundModal = () => {
    setCompoundForm({ entry_no: `JV-CMP-${Date.now().toString().slice(-5)}`, date: TODAY_STR_ISO, currency: 'YER ﷼', exchange_rate: '1.0', ref_type: 'قيد مركب', ref_id: '', general_notes: '' });
    setCompoundLines([defaultLine(), defaultLine()]);
    setShowCompoundModal(true);
  };

  // ── Simple entry submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.debit || !formData.credit || !formData.amount)
      return showToast('الطرف المدين، الدائن، والمبلغ مطلوبة ⚠️', 'error');
    if (formData.debit === formData.credit)
      return showToast('الطرف المدين والدائن يجب أن يكونا مختلفين ⚠️', 'error');
    const validation = window.AccountingEngine ? window.AccountingEngine.validateEntry({ ...formData, exchange_rate: parseFloat(formData.exchange_rate) || 1 }, accounts) : { valid: true };
    if (!validation.valid) return showToast(validation.error || 'خطأ في التحقق', 'error');
    const newJ = buildEntryObject(formData, currencyCode, accounts);
    if (setJournal) setJournal(p => [newJ, ...(p || [])]);
    try {
      fetch('/api/journal/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newJ) }).catch(() => {});
      const res = await callGAS('addJournalEntry', newJ);
      showToast((res.status === 'success' || res.id) ? 'تم حفظ القيد المحاسبي بنجاح 📑' : 'حدث خطأ أثناء الحفظ', (res.status === 'success' || res.id) ? 'success' : 'error');
    } catch { showToast('تم حفظ القيد محلياً ⚡'); }
    setFormData({ entry_no: '', debit: '', credit: '', amount: '', currency: 'YER ﷼', exchange_rate: '1.0', date: TODAY_STR_ISO, notes: '', ref_type: 'قيد يدوي' });
  };

  // ── Edit handlers ──
  const handleOpenEdit = (entry) => {
    if (!entry) return;
    const dCode = entry.debit_code  || String(entry.debit  || '').split(' - ')[0].trim();
    const cCode = entry.credit_code || String(entry.credit || '').split(' - ')[0].trim();
    const curr  = window.CurrencyService ? window.CurrencyService.normalizeCode(entry.currency || 'YER') : (entry.currency || 'YER');
    setEditingEntry(entry);
    setEditFormData({ id: entry.id, entry_no: entry.entry_no || `JV-${entry.id}`, debit: dCode, credit: cCode, amount: String(entry.amount || ''), currency: curr === 'USD' ? 'USD $' : (curr === 'SAR' ? 'SAR ﷼' : 'YER ﷼'), exchange_rate: String(entry.exchange_rate || 1), date: (entry.date || entry.entry_date || TODAY_STR_ISO).split('T')[0], notes: entry.notes || entry.statement || '', ref_type: entry.ref_type || 'قيد يدوي', ref_id: entry.ref_id || '' });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editFormData.debit || !editFormData.credit || !editFormData.amount) return showToast('الطرف المدين، الدائن، والمبلغ مطلوبة ⚠️', 'error');
    if (editFormData.debit === editFormData.credit) return showToast('الطرف المدين والدائن يجب أن يكونا مختلفين ⚠️', 'error');
    setIsSubmittingEdit(true);
    try {
      const updatedJ = buildUpdatedEntry(editingEntry, editFormData, accounts);
      if (setJournal) setJournal(p => (p || []).map(j => (j.id === editingEntry.id || j.entry_no === editingEntry.entry_no) ? updatedJ : j));
      try { await fetch('/api/journal/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedJ) }); } catch {}
      if (setVouchers && editFormData.ref_id) setVouchers(p => (p || []).map(v => (v.voucher_no === editFormData.ref_id || v.id === editFormData.ref_id) ? { ...v, amount: updatedJ.amount, currency: updatedJ.currency, exchange_rate: updatedJ.exchange_rate, base_amount: updatedJ.base_amount, notes: editFormData.notes, date: editFormData.date } : v));
      try { if (typeof window.callGAS === 'function') await window.callGAS('updateJournalEntry', updatedJ); } catch {}
      showToast('✅ تم تعديل القيد وتحديث الأستاذ بنجاح ✏️');
      setEditingEntry(null);
    } catch (err) { showToast('حدث خطأ أثناء حفظ التعديل', 'error'); }
    finally { setIsSubmittingEdit(false); }
  };

  // ── Delete handler ──
  const handleDeleteEntry = async (entry) => {
    if (!entry) return;
    if (!window.confirm(`⚠️ هل أنت متأكد من حذف القيد رقم (${entry.entry_no || entry.id})؟`)) return;
    setIsDeletingId(entry.id);
    try {
      if (setJournal) setJournal(p => (p || []).filter(j => j.id !== entry.id && j.entry_no !== entry.entry_no));
      const refNo = entry.ref_id || entry.entry_no;
      if (setVouchers && refNo) setVouchers(p => (p || []).filter(v => v.voucher_no !== refNo && v.id !== refNo && v.id !== entry.id));
      try { await fetch('/api/journal/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entry.id, entry_no: entry.entry_no, ref_id: entry.ref_id }) }); } catch {}
      try { if (typeof window.callGAS === 'function') await window.callGAS('deleteJournalEntry', { id: entry.id, entry_no: entry.entry_no }); } catch {}
      showToast('✅ تم حذف القيد وتحديث الأستاذ بنجاح 🗑️');
    } catch { showToast('حدث خطأ أثناء حذف القيد', 'error'); }
    finally { setIsDeletingId(null); }
  };

  // ── Compound submit ──
  const handleSubmitCompound = async (e) => {
    if (e) e.preventDefault();
    if (!compoundTotals.isBalanced) return showToast('⚠️ القيد غير متزن! يجب أن يتساوى المدين مع الدائن تماماً.', 'error');
    const invalidRow = compoundLines.find(r => !r.account_code || ((parseFloat(r.debit) || 0) === 0 && (parseFloat(r.credit) || 0) === 0));
    if (invalidRow) return showToast('⚠️ يرجى التأكد من اختيار الحساب والمبلغ لجميع الأسطر.', 'error');
    setIsSubmittingCompound(true);
    try {
      const entryNo   = compoundForm.entry_no || `JV-CMP-${Date.now().toString().slice(-6)}`;
      const cRate     = parseFloat(compoundForm.exchange_rate) || 1.0;
      const txId      = `TX-CMP-${Date.now()}`;
      const debitLines  = compoundLines.filter(r => (parseFloat(r.debit)  || 0) > 0);
      const creditLines = compoundLines.filter(r => (parseFloat(r.credit) || 0) > 0);
      const generatedEntries = [];
      debitLines.forEach(d => {
        const dAmt = parseFloat(d.debit) || 0;
        const dLabel = window.JournalUtils.resolveAccLabel(d.account_code, accounts);
        creditLines.forEach(c => {
          const portion = (dAmt * (parseFloat(c.credit) || 0)) / compoundTotals.totalDebit;
          const cLabel  = window.JournalUtils.resolveAccLabel(c.account_code, accounts);
          const baseObj = window.CurrencyService ? window.CurrencyService.toBase(portion, compoundCurrCode, cRate) : { base_amount: portion * cRate };
          const combinedNotes = [compoundForm.general_notes, d.notes ? `(مدين: ${d.notes})` : '', c.notes ? `(دائن: ${c.notes})` : ''].filter(Boolean).join(' | ');
          generatedEntries.push({ id: Date.now() + Math.random(), transaction_id: txId, entry_no: entryNo, debit: dLabel, credit: cLabel, debit_account_id: dLabel, credit_account_id: cLabel, debit_code: d.account_code, credit_code: c.account_code, amount: portion, currency: compoundCurrCode, exchange_rate: cRate, base_amount: baseObj.base_amount, ref_type: compoundForm.ref_type || 'قيد مركب', ref_id: compoundForm.ref_id || '', date: compoundForm.date || new Date().toISOString().split('T')[0], notes: combinedNotes || 'قيد يومية مركب متعدد الأطراف', statement: combinedNotes || 'قيد يومية مركب متعدد الأطراف', status: 'posted' });
        });
      });
      if (setJournal) setJournal(p => [...generatedEntries, ...(p || [])]);
      for (const entry of generatedEntries) {
        fetch('/api/journal/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) }).catch(() => {});
        if (typeof window.callGAS === 'function') window.callGAS('addJournalEntry', entry).catch(() => {});
      }
      showToast(`تم اعتماد القيد المركب (${entryNo}) بنجاح 📑✨`);
      setShowCompoundModal(false);
    } catch (err) { showToast('حدث خطأ أثناء اعتماد القيد المركب', 'error'); }
    finally { setIsSubmittingCompound(false); }
  };

  return {
    formData, setFormData, currencyCode, isBaseCurrency,
    showCompoundModal, setShowCompoundModal, compoundForm, setCompoundForm,
    compoundLines, setCompoundLines, compoundTotals, compoundCurrCode,
    isSubmittingCompound,
    editingEntry, setEditingEntry, editFormData, setEditFormData,
    isSubmittingEdit, isDeletingId,
    handleSubmit, handleOpenEdit, handleSaveEdit, handleDeleteEntry,
    handleOpenCompoundModal, handleAddCompoundLine,
    handleDuplicateCompoundLine, handleDeleteCompoundLine,
    handleCompoundLineChange, handleSubmitCompound
  };
}

window.useJournalActions = useJournalActions;
