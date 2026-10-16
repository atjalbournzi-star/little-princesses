const { useState, useCallback } = React;

function derivePaymentMethod(acc) {
  const s = String(acc || '').toLowerCase();
  if (s.includes('101') || s.includes('صندوق') || s.includes('كاش') || s.includes('نقد')) return 'نقد (كاش)';
  if (s.includes('103') || s.includes('111') || s.includes('112') || s.includes('بنك') || s.includes('كريمي') || s.includes('حوالة')) return 'حوالة بنكية';
  if (s.includes('pos') || s.includes('شبكة')) return 'شبكة POS';
  if (s.includes('شيك')) return 'بنك / شيك';
  return 'نقد (كاش)';
}

function useExpenseActions({ accounts = [], setAccounts, setExpenses, setVouchers, setJournal, showToast, onExpenseSaved }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuickAddCat, setShowQuickAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [printVoucher, setPrintVoucher] = useState(null);

  const [formData, setFormData] = useState({
    exp_category: '502 - إيجار ورشة الخياطة والمعمل', cost_center: 'مشغل التفصيل والخياطة', cost_center_id: 'CC-01',
    beneficiary: '', reference_no: '', subtotal_amount: '', discount_amount: '', tax_amount: '', net_amount: '', amount: '',
    currency: 'YER', pay_method: 'نقد (كاش)', source_acc: '101.1 - صندوق الريال اليمني (YER)',
    date: typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10),
    notes: '', attachment_url: '', attachment_name: '', status: 'posted'
  });

  const handleQuickAddCategory = async (e) => {
    if (e) e.preventDefault();
    if (!newCatName.trim()) return showToast('يرجى كتابة اسم بند المصروف ⚠️', 'error');
    const utils = window.expenseAccountUtils;
    const newAcc = utils && utils.buildNewCategoryAccount
      ? utils.buildNewCategoryAccount(newCatName, newCatCode, accounts)
      : { code: '608', account_code: '608', name: newCatName.trim(), account_name: newCatName.trim(), account_type: 'مصروفات', current_balance: 0.0 };
    if (typeof setAccounts === 'function') setAccounts(prev => [...(prev || []), newAcc]);
    const fullLabel = `${newAcc.code} - ${newAcc.name}`;
    setFormData(prev => ({ ...prev, exp_category: fullLabel }));
    try {
      fetch('/api/accounts/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newAcc) }).catch(() => {});
      if (typeof window.callGAS === 'function') await window.callGAS('addAccount', newAcc);
      showToast(`تمت إضافة بند المصروف (${fullLabel}) بنجاح 💸`);
    } catch { showToast('تمت إضافة البند محلياً ⚡'); }
    finally { setShowQuickAddCat(false); setNewCatName(''); setNewCatCode(''); }
  };

  const handleSubmit = async (e, forcedStatus = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const subtotal = parseFloat(formData.subtotal_amount || formData.amount || 0);
    const discount = parseFloat(formData.discount_amount || 0);
    const tax = parseFloat(formData.tax_amount || 0);
    const net = Math.max(0, subtotal - discount + tax);
    const finalAmount = net > 0 ? net : subtotal;
    if (finalAmount <= 0) return showToast('يرجى إدخال مبلغ صحيح أكبر من الصفر ⚠️', 'error');

    const targetStatus = forcedStatus || formData.status || 'posted';
    setIsSubmitting(true);
    const utils = window.expenseAccountUtils;
    const subData = { ...formData, subtotal_amount: subtotal, discount_amount: discount, tax_amount: tax, net_amount: finalAmount, amount: finalAmount, status: targetStatus, pay_method: formData.pay_method || derivePaymentMethod(formData.source_acc) };
    const payloads = utils && utils.prepareExpensePayloads ? utils.prepareExpensePayloads(subData, accounts) : { newE: { id: `EXP-${Date.now()}`, expense_no: `EXP-${Date.now()}`, amount: finalAmount, status: targetStatus }, newVoucher: {}, newJEntry: {}, sourceCode: '', expCode: '', baseAmount: finalAmount };
    const { newE, newVoucher, newJEntry, sourceCode, expCode, baseAmount } = payloads;
    newE.subtotal_amount = subtotal; newE.discount_amount = discount; newE.tax_amount = tax; newE.net_amount = finalAmount; newE.status = targetStatus;
    subData.id = newE.id; subData.expense_no = newE.expense_no;

    if (setExpenses) setExpenses(prev => [newE, ...(prev || []).filter(item => item.id !== newE.id && item.expense_no !== newE.expense_no)]);
    if (targetStatus === 'posted') {
      if (setVouchers && newVoucher.v_no) setVouchers(prev => [newVoucher, ...(prev || [])]);
      if (setJournal && newJEntry.entry_no) setJournal(prev => [newJEntry, ...(prev || [])]);
      if (typeof setAccounts === 'function' && utils && utils.updateAccountsForExpense) {
        setAccounts(prev => utils.updateAccountsForExpense(prev, sourceCode, expCode, baseAmount));
      }
    }

    try {
      const sb = typeof window !== 'undefined' ? (window.supabaseClient || window.supabase) : null;
      if (sb && typeof sb.from === 'function') { await sb.from('expense_transactions').insert(newE); }
    } catch (_) {}

    try {
      if (window.expenseAPI && window.expenseAPI.createExpense) {
        await window.expenseAPI.createExpense(subData);
      } else {
        await fetch('/api/finance/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subData) });
      }
      showToast(targetStatus === 'draft' ? 'تم حفظ المصروف كمسودة بنجاح 📝' : 'تم حفظ المصروف وترحيل السند المالي والقيد اليومي بنجاح 💸', 'success');
      if (typeof onExpenseSaved === 'function') onExpenseSaved();
    } catch {
      showToast(targetStatus === 'draft' ? 'تم حفظ المسودة محلياً 📝' : 'تم حفظ المصروف محلياً وتحديث الأرصدة ⚡');
    } finally {
      setIsSubmitting(false);
      setFormData(prev => ({ ...prev, amount: '', subtotal_amount: '', discount_amount: '', tax_amount: '', net_amount: '', beneficiary: '', reference_no: '', notes: '', attachment_url: '', attachment_name: '', date: typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10) }));
    }
  };

  const handleApproveExpense = async (eItem) => {
    const targetId = eItem.id || eItem.expense_no;
    const utils = window.expenseAccountUtils;
    const built = utils && utils.buildVoucherAndJournalFromExistingExpense ? utils.buildVoucherAndJournalFromExistingExpense(eItem, accounts) : null;
    let sRes = null;

    try {
      if (window.expenseAPI && window.expenseAPI.approveExpense) {
        sRes = await window.expenseAPI.approveExpense({ id: targetId, ...eItem });
      } else {
        const res = await fetch('/api/finance/expenses/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: targetId, ...eItem }) });
        sRes = await res.json();
      }
    } catch (err) {
      console.warn('Backend approval fetch fallback:', err);
    }

    const finalV = (sRes && sRes.voucher) ? sRes.voucher : (built ? built.voucher : null);
    const finalJ = (sRes && sRes.journal_entry) ? sRes.journal_entry : (built ? built.journal : null);

    if (setExpenses) setExpenses(prev => (prev || []).map(e => (e.id === targetId || e.expense_no === targetId) ? { ...e, status: 'posted', approved_at: new Date().toISOString() } : e));
    if (setVouchers && finalV) setVouchers(prev => [finalV, ...(prev || []).filter(v => v.v_no !== finalV.v_no && v.id !== finalV.id)]);
    if (setJournal && finalJ) setJournal(prev => [finalJ, ...(prev || []).filter(j => j.entry_no !== finalJ.entry_no && j.id !== finalJ.id)]);
    if (typeof setAccounts === 'function' && utils && built) {
      setAccounts(prev => utils.updateAccountsForExpense(prev, built.sourceCode, built.expCode, built.baseAmount));
    }
    if (typeof window.loadAccounts === 'function') window.loadAccounts();

    try {
      const sb = typeof window !== 'undefined' ? (window.supabaseClient || window.supabase) : null;
      if (sb) await sb.from('expense_transactions').update({ status: 'posted', approved_at: new Date().toISOString() }).eq('id', targetId);
    } catch {}

    showToast('تم اعتماد المصروف وترحيله إلى السندات وشجرة الحسابات والدفاتر بنجاح 💸', 'success');
    if (typeof onExpenseSaved === 'function') onExpenseSaved();
  };

  const handleDeleteExpense = async (eItem) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف والسند المالي والقيد اليومي المرتبط به؟')) return;
    const targetId = eItem.id || eItem.expense_no;
    if (setExpenses) setExpenses(prev => (prev || []).filter(e => e.id !== eItem.id && e.expense_no !== eItem.expense_no));
    if (setVouchers) setVouchers(prev => (prev || []).filter(v => v.v_no !== `PV-${eItem.expense_no}` && v.v_no !== eItem.expense_no && v.id !== eItem.id));
    if (setJournal) setJournal(prev => (prev || []).filter(j => j.entry_no !== `JV-${eItem.expense_no}` && j.ref_id !== eItem.expense_no && j.id !== eItem.id));
    try {
      if (window.expenseAPI && window.expenseAPI.deleteExpense) await window.expenseAPI.deleteExpense(targetId);
      const sb = typeof window !== 'undefined' ? (window.supabaseClient || window.supabase) : null;
      if (sb) await sb.from('expense_transactions').delete().eq('id', targetId);
      showToast('تم حذف المصروف وإلغاء أثره المالي بنجاح 🗑️');
    } catch { showToast('تم حذف المصروف محلياً 🗑️'); }
  };

  const handlePrintExpense = useCallback((item) => {
    setPrintVoucher({
      v_no: item.expense_no || `EXP-${item.id}`,
      party: item.beneficiary || item.recipient || item.exp_category || item.category || 'بند مصروف تشغيلي',
      v_type: 'سند صرف مصروف',
      amount: parseFloat(item.net_amount || item.amount || 0),
      currency: item.currency || 'YER ﷼',
      date: item.date || item.expense_date || new Date().toISOString().slice(0, 10),
      notes: item.notes ? `${item.exp_category || ''} - ${item.notes}` : (item.exp_category || 'مصروف تشغيلي معتمد')
    });
  }, []);

  return {
    formData, setFormData, isSubmitting, showQuickAddCat, setShowQuickAddCat,
    newCatName, setNewCatName, newCatCode, setNewCatCode, handleQuickAddCategory,
    handleSubmit, handleApproveExpense, handleDeleteExpense, printVoucher,
    setPrintVoucher, handlePrintExpense, derivePaymentMethod
  };
}

window.useExpenseActions = useExpenseActions;
window.derivePaymentMethod = derivePaymentMethod;
window.approveExpense = async (rec) => {
  if (window.expenseAPI && window.expenseAPI.approveExpense) return await window.expenseAPI.approveExpense(rec);
  return { success: true };
};