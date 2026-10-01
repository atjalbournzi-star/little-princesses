const { useState, useCallback } = React;

function useExpenseActions({ accounts = [], setAccounts, setExpenses, setVouchers, setJournal, showToast }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuickAddCat, setShowQuickAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [printVoucher, setPrintVoucher] = useState(null);

  const [formData, setFormData] = useState({
    exp_category: typeof EXPENSE_CATEGORIES !== 'undefined' ? EXPENSE_CATEGORIES[0] : '5211 - مصاريف تشغيل وصيانة الورشة',
    amount: '',
    currency: 'YER ﷼',
    date: typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10),
    notes: '',
    pay_method: typeof PAY_METHODS !== 'undefined' ? PAY_METHODS[0] : 'نقد (كاش)',
    source_acc: '101.1 - صندوق الريال اليمني (YER)'
  });

  const handleQuickAddCategory = async (e) => {
    if (e) e.preventDefault();
    if (!newCatName.trim()) return showToast('يرجى كتابة اسم بند المصروف ⚠️', 'error');

    const utils = window.expenseAccountUtils;
    const newAcc = utils && utils.buildNewCategoryAccount
      ? utils.buildNewCategoryAccount(newCatName, newCatCode, accounts)
      : { code: '608', account_code: '608', name: newCatName.trim(), account_name: newCatName.trim(), account_type: 'مصروفات', parent_id: '6', current_balance: 0.0 };

    if (typeof setAccounts === 'function') {
      setAccounts(prev => [...(prev || []), newAcc]);
    }

    const fullLabel = `${newAcc.code} - ${newAcc.name}`;
    setFormData(prev => ({ ...prev, exp_category: fullLabel }));

    try {
      fetch('/api/accounts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAcc)
      }).catch(err => console.warn('Save account note:', err));

      if (typeof window.callGAS === 'function') {
        await window.callGAS('addAccount', newAcc);
      }

      showToast(`تمت إضافة بند المصروف (${fullLabel}) إلى شجرة الحسابات بنجاح 💸`);
      setShowQuickAddCat(false);
      setNewCatName('');
      setNewCatCode('');
    } catch (err) {
      console.warn('Quick add expense account warning:', err);
      showToast('تمت إضافة البند محلياً ⚡');
      setShowQuickAddCat(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return showToast('يرجى إدخال مبلغ صحيح أكبر من الصفر ⚠️', 'error');
    }

    setIsSubmitting(true);
    const utils = window.expenseAccountUtils;
    const payloads = utils && utils.prepareExpensePayloads
      ? utils.prepareExpensePayloads(formData, accounts)
      : { newE: { id: Date.now(), amount: parseFloat(formData.amount) }, newVoucher: {}, newJEntry: {}, sourceCode: '', expCode: '', baseAmount: parseFloat(formData.amount) };

    const { newE, newVoucher, newJEntry, sourceCode, expCode, baseAmount } = payloads;

    // تحديثات متفائلة للحالة المالية (Optimistic Updates)
    if (setExpenses) setExpenses(prev => [newE, ...(prev || [])]);
    if (setVouchers && newVoucher.v_no) setVouchers(prev => [newVoucher, ...(prev || [])]);
    if (setJournal && newJEntry.entry_no) setJournal(prev => [newJEntry, ...(prev || [])]);

    if (typeof setAccounts === 'function') {
      if (utils && utils.updateAccountsForExpense) {
        setAccounts(prev => utils.updateAccountsForExpense(prev, sourceCode, expCode, baseAmount));
      }
    }

    try {
      if (window.expenseAPI && window.expenseAPI.createExpense) {
        await window.expenseAPI.createExpense(newE);
      } else {
        await fetch('/api/finance/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newE)
        });
      }
      showToast('تم حفظ المصروف وترحيل السند المالي والقيد اليومي بنجاح 💸');
    } catch (err) {
      console.warn("Expense save error:", err);
      showToast('تم حفظ المصروف محلياً وتحديث الأرصدة ⚡');
    } finally {
      setIsSubmitting(false);
      setFormData(prev => ({
        ...prev,
        amount: '',
        notes: '',
        date: typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10)
      }));
    }
  };

  const handleDeleteExpense = async (eItem) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف والسند المالي والقيد اليومي المرتبط به؟')) return;
    const targetId = eItem.id || eItem.expense_no;

    if (setExpenses) {
      setExpenses(prev => (prev || []).filter(e => (e.id !== eItem.id && e.expense_no !== eItem.expense_no)));
    }
    if (setVouchers) {
      setVouchers(prev => (prev || []).filter(v => (v.v_no !== `PV-${eItem.expense_no}` && v.v_no !== eItem.expense_no && v.id !== eItem.id)));
    }
    if (setJournal) {
      setJournal(prev => (prev || []).filter(j => (j.entry_no !== `JV-${eItem.expense_no}` && j.ref_id !== eItem.expense_no && j.id !== eItem.id)));
    }

    try {
      if (window.expenseAPI && window.expenseAPI.deleteExpense) {
        await window.expenseAPI.deleteExpense({ id: targetId, expense_no: eItem.expense_no || targetId });
      } else {
        await fetch('/api/finance/expenses/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: targetId, expense_no: eItem.expense_no || targetId })
        });
      }
      showToast('تم حذف المصروف وإلغاء أثره المالي بنجاح 🗑️');
    } catch (err) {
      console.error(err);
      showToast('تم حذف المصروف محلياً 🗑️');
    }
  };

  const handlePrintExpense = useCallback((item) => {
    setPrintVoucher({
      v_no: item.expense_no || `EXP-${item.id}`,
      party: item.exp_category || item.category || 'بند مصروف تشغيلي',
      v_type: 'سند صرف مصروف',
      amount: item.amount,
      currency: item.currency || 'YER ﷼',
      date: item.date || new Date().toISOString().slice(0, 10),
      notes: item.notes || item.exp_category || 'مصروف تشغيلي معتمد'
    });
  }, []);

  return {
    formData,
    setFormData,
    isSubmitting,
    showQuickAddCat,
    setShowQuickAddCat,
    newCatName,
    setNewCatName,
    newCatCode,
    setNewCatCode,
    handleQuickAddCategory,
    handleSubmit,
    handleDeleteExpense,
    printVoucher,
    setPrintVoucher,
    handlePrintExpense
  };
}

window.useExpenseActions = useExpenseActions;
