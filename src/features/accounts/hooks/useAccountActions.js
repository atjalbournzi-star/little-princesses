// useAccountActions.js - خطاف إجراءات دليل الحسابات: الإضافة، التعديل، الحذف، المزامنة
// يعتمد على: cleanCode, getSmartSuggestedAccountCode (accountHelpers.js)
const { useCallback } = React;

function useAccountActions({
  accounts, setAccounts, setJournal, setVouchers, showToast,
  accountsWithRollupBalances, setExpandedNodes,
  formData, setFormData, editingAccount, setEditingAccount,
  setShowModal, setAuditLogs, setShowAuditModal, setIsSyncing, setIsResetting
}) {

  // ── جلب الحسابات والقيود من قاعدة البيانات ────────────────────────────────
  const fetchFreshAccounts = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/accounts/list').then(r => r.json());
      const list = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
      if (list.length > 0 && setAccounts) setAccounts(list);
      try {
        const jRes = await fetch('/api/journal').then(r => r.json());
        const jList = (jRes && Array.isArray(jRes.data)) ? jRes.data : (Array.isArray(jRes) ? jRes : []);
        if (setJournal) setJournal(jList);
      } catch (jErr) { console.warn("Journal fetch warning:", jErr); }
    } catch (e) { console.error("fetchFreshAccounts error:", e); }
    finally { setIsSyncing(false); }
  }, [setAccounts, setJournal, setIsSyncing]);

  // ── مزامنة مع قاعدة البيانات السحابية ──────────────────────────────────────
  const handleSyncCloudAccounts = async () => {
    setIsSyncing(true);
    try {
      const beRes = await fetch('/api/accounts/list').then(r => r.json());
      const list = (beRes && Array.isArray(beRes.data)) ? beRes.data : (Array.isArray(beRes) ? beRes : []);
      let jList = [];
      try { const jRes = await fetch('/api/journal').then(r => r.json()); jList = (jRes && Array.isArray(jRes.data)) ? jRes.data : (Array.isArray(jRes) ? jRes : []); } catch (jErr) {}
      if (list.length > 0) {
        if (setAccounts) setAccounts(list);
        if (setJournal) setJournal(jList);
        if (showToast) showToast('تمت مزامنة شجرة الحسابات والقيود مع قاعدة البيانات السحابية (PostgreSQL) بنجاح ⚡', 'success');
      } else {
        if (showToast) showToast('لم يتم العثور على حسابات لمزامنتها', 'info');
      }
    } catch (err) {
      console.error("Sync error:", err);
      if (showToast) showToast('حدث خطأ أثناء مزامنة دليل الحسابات مع السحابة', 'error');
    } finally { setIsSyncing(false); }
  };

  // ── تصفير شجرة الحسابات والبيانات التجريبية ───────────────────────────────
  const handleCleanResetAccounts = async () => {
    if (!window.confirm('⚠️ تحذير: هل أنت متأكد من رغبتك في تصفير شجرة الحسابات وتصفير كافة الأرصدة والمبالغ التجريبية إلى 0.00 في قاعدة البيانات؟\n\n(سيتم تصفير الأرصدة إلى 0.00 ومسح كافة القيود والسندات التجريبية دون التأثير على العملاء أو الأقسام الأخرى)')) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/accounts/clean-reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.data)) setAccounts(data.data);
        if (setJournal) setJournal([]);
        if (setVouchers) setVouchers([]);
        showToast('✅ تم تصفير شجرة الحسابات وتصفير كافة الأرصدة إلى 0.00 ومسح القيود التجريبية بنجاح ⚡');
      } else { showToast(data.error || 'فشل التصفير', 'error'); }
    } catch (err) { console.error(err); showToast('حدث خطأ أثناء الاتصال بالخادم للتصفير', 'error'); }
    finally { setIsResetting(false); }
  };

  // ── فتح نافذة إضافة حساب جديد ──────────────────────────────────────────────
  const handleOpenAddModal = async (presetParentId = null) => {
    setEditingAccount(null);
    let parentId = '', parentCode = '', initialType = 'أصول', initialNature = 'debit';
    if (presetParentId) {
      const pAcc = accountsWithRollupBalances.find(a => String(a.id) === String(presetParentId) || String(a.code) === String(presetParentId) || String(a.account_id) === String(presetParentId) || cleanCode(a.code) === cleanCode(presetParentId));
      if (pAcc) { parentId = cleanCode(pAcc.code || pAcc.id); parentCode = parentId; initialType = pAcc.account_type || 'أصول'; initialNature = pAcc.nature || 'debit'; }
      else { parentId = cleanCode(presetParentId); parentCode = parentId; }
    }
    if (parentCode.startsWith('3') || parentId.startsWith('3')) { initialType = 'حقوق ملكية'; initialNature = 'credit'; }
    else if (parentCode.startsWith('1') || parentId.startsWith('1')) { initialType = 'أصول'; initialNature = 'debit'; }
    else if (parentCode.startsWith('2') || parentId.startsWith('2')) { initialType = 'خصوم'; initialNature = 'credit'; }
    else if (parentCode.startsWith('4') || parentId.startsWith('4')) { initialType = 'إيرادات'; initialNature = 'credit'; }
    else if (parentCode.startsWith('5') || parentId.startsWith('5') || parentCode.startsWith('6') || parentId.startsWith('6')) { initialType = 'مصروفات'; initialNature = 'debit'; }
    let initialCode = getSmartSuggestedAccountCode(parentCode || parentId, accountsWithRollupBalances);
    if (window.suggestAccountCode && (parentCode || parentId)) {
      try { const beCode = await window.suggestAccountCode(parentCode || parentId); if (beCode && beCode !== '101' && !accountsWithRollupBalances.some(a => cleanCode(a.code || a.account_code) === cleanCode(beCode))) initialCode = beCode; } catch (e) {}
    }
    setFormData({ id: null, code: initialCode, name: '', name_en: '', account_type: initialType, parent_id: parentId, nature: initialNature, is_group: 0, is_active: 1, balance: '0', notes: '' });
    setShowModal(true);
  };

  // ── فتح نافذة إضافة بند مصروف ──────────────────────────────────────────────
  const handleOpenAddExpenseModal = async () => {
    setEditingAccount(null);
    const expRoot = accountsWithRollupBalances.find(a => cleanCode(a.code || a.id) === '6' || a.name.includes('المصروفات') || a.account_type === 'مصروفات');
    const parentId = expRoot ? String(expRoot.id || expRoot.code || '6') : '6';
    let initialCode = '608';
    try {
      const expCodes = accountsWithRollupBalances.filter(a => a.account_type === 'مصروفات' || cleanCode(a.code).startsWith('6')).map(a => parseInt(cleanCode(a.code))).filter(n => !isNaN(n) && n >= 600 && n < 700);
      const maxCode = expCodes.length > 0 ? Math.max(...expCodes) : 607;
      initialCode = String(maxCode + 1);
    } catch (e) { initialCode = '608'; }
    setFormData({ id: null, code: initialCode, name: '', name_en: '', account_type: 'مصروفات', parent_id: parentId, nature: 'debit', is_group: 0, is_active: 1, balance: '0', notes: 'بند مصروف تشغيلي معتمد' });
    setShowModal(true);
  };

  // ── فتح نافذة إضافة شريك رأس مال ──────────────────────────────────────────
  const handleOpenAddPartnerModal = async () => {
    setEditingAccount(null);
    const partnerRoot = accountsWithRollupBalances.find(a => cleanCode(a.code || a.id) === '301' || a.name.includes('رأس المال المباشر'));
    const parentId = partnerRoot ? cleanCode(partnerRoot.code || partnerRoot.id || '301') : '301';
    let initialCode = getSmartSuggestedAccountCode(parentId, accountsWithRollupBalances);
    if (window.suggestAccountCode) {
      try { const beCode = await window.suggestAccountCode(parentId); if (beCode && beCode.startsWith('301.') && !accountsWithRollupBalances.some(a => cleanCode(a.code || a.account_code) === cleanCode(beCode))) initialCode = beCode; } catch (e) {}
    }
    setFormData({ id: null, code: initialCode || '301.04', name: '', name_en: '', account_type: 'حقوق ملكية', parent_id: parentId, nature: 'credit', is_group: 0, is_active: 1, balance: '0', notes: 'حساب رأس مال شريك في المؤسسة' });
    setShowModal(true);
  };

  // ── فتح نافذة تعديل حساب ────────────────────────────────────────────────────
  const handleOpenEditModal = (acc) => {
    setEditingAccount(acc);
    setFormData({ id: acc.id || acc.account_id || acc.code, account_id: acc.account_id || acc.id || '', code: acc.code || acc.account_code || '', name: acc.name || acc.account_name || '', name_en: acc.name_en || acc.account_name_en || '', account_type: acc.account_type || acc.type || 'مصروفات', parent_id: acc.parent_id !== null && acc.parent_id !== undefined ? String(acc.parent_id) : (acc.parent_account_id || ''), nature: acc.nature || acc.normal_balance || 'debit', is_group: acc.hasChildren ? 1 : Number(acc.is_group || 0), is_active: Number(acc.is_active !== undefined ? acc.is_active : 1), balance: String(acc.opening_balance ?? acc.balance ?? 0), notes: acc.notes || '' });
    setShowModal(true);
  };

  // ── معالجة تغيير الحساب الأب في النموذج ────────────────────────────────────
  const handleParentChange = async (parentIdVal) => {
    const parentId = (parentIdVal === '' || parentIdVal === '0') ? null : parentIdVal;
    let newType = formData.account_type, newNature = formData.nature, parentCode = '';
    if (parentId) {
      const parentAcc = accountsWithRollupBalances.find(a => String(a.id) === String(parentId) || String(a.code) === String(parentId) || cleanCode(a.code) === cleanCode(parentId));
      if (parentAcc) { newType = parentAcc.account_type; newNature = parentAcc.nature; parentCode = cleanCode(parentAcc.code || parentAcc.id); }
      else parentCode = cleanCode(parentId);
    }
    if (parentCode.startsWith('3')) { newType = 'حقوق ملكية'; newNature = 'credit'; }
    else if (parentCode.startsWith('1')) { newType = 'أصول'; newNature = 'debit'; }
    else if (parentCode.startsWith('2')) { newType = 'خصوم'; newNature = 'credit'; }
    else if (parentCode.startsWith('4')) { newType = 'إيرادات'; newNature = 'credit'; }
    else if (parentCode.startsWith('5') || parentCode.startsWith('6')) { newType = 'مصروفات'; newNature = 'debit'; }
    let suggestedCode = getSmartSuggestedAccountCode(parentCode, accountsWithRollupBalances);
    if (window.suggestAccountCode && parentCode) {
      try { const beCode = await window.suggestAccountCode(parentCode); if (beCode && beCode !== '101' && !accountsWithRollupBalances.some(a => cleanCode(a.code || a.account_code) === cleanCode(beCode))) suggestedCode = beCode; } catch (e) {}
    }
    setFormData(prev => ({ ...prev, parent_id: parentCode || parentIdVal, code: suggestedCode, account_type: newType, nature: newNature, is_group: 0 }));
  };

  // ── حفظ الحساب (إضافة / تعديل) ────────────────────────────────────────────
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return showToast('اسم الحساب مطلوب', 'error');
    if (!formData.code.trim()) return showToast('كود الحساب مطلوب', 'error');
    const isEditingThisAccount = editingAccount && (String(editingAccount.code || editingAccount.account_code) === String(formData.code) || (editingAccount.id && String(editingAccount.id) === String(formData.id)) || (editingAccount.account_id && String(editingAccount.account_id) === String(formData.account_id)));
    const existing = accountsWithRollupBalances.find(a => { const sameCode = String(a.code || a.account_code) === String(formData.code); if (!sameCode) return false; if (isEditingThisAccount && (String(a.code || a.account_code) === String(editingAccount.code || editingAccount.account_code) || String(a.id) === String(editingAccount.id) || String(a.account_id || '') === String(editingAccount.account_id || ''))) return false; return true; });
    if (existing) return showToast(`كود الحساب ${formData.code} مستخدم بالفعل للحساب (${existing.name})`, 'error');
    if (formData.id && formData.parent_id && String(formData.id) === String(formData.parent_id)) return showToast('لا يمكن جعل الحساب أباً لنفسه', 'error');
    const cleanC = cleanCode(formData.code);
    let finalType = formData.account_type, finalNature = formData.nature;
    if (cleanC.startsWith('3')) { finalType = 'حقوق ملكية'; finalNature = 'credit'; }
    else if (cleanC.startsWith('1')) { finalType = 'أصول'; finalNature = 'debit'; }
    else if (cleanC.startsWith('2')) { finalType = 'خصوم'; finalNature = 'credit'; }
    else if (cleanC.startsWith('4')) { finalType = 'إيرادات'; finalNature = 'credit'; }
    else if (cleanC.startsWith('5') || cleanC.startsWith('6')) { finalType = 'مصروفات'; finalNature = 'debit'; }
    const payload = { ...formData, account_type: finalType, nature: finalNature, balance: editingAccount ? (parseFloat(editingAccount.balance) || 0.0) : 0.0, opening_balance: 0.0, current_balance: editingAccount ? (parseFloat(editingAccount.balance) || 0.0) : 0.0, is_group: Number(formData.is_group), is_active: Number(formData.is_active) };
    try {
      const res = await fetch('/api/accounts/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json());
      if (res && res.success !== false) {
        showToast(res.message || 'تم حفظ الحساب بنجاح ⚡', 'success');
        if (payload.parent_id) { const pClean = cleanCode(payload.parent_id); setExpandedNodes(prev => ({ ...prev, [payload.parent_id]: true, [pClean]: true, [`ACC-${pClean}`]: true })); }
        const updatedList = accountsWithRollupBalances.map(a => { if (payload.parent_id && (String(a.id) === String(payload.parent_id) || String(a.code) === String(payload.parent_id) || cleanCode(a.code) === cleanCode(payload.parent_id))) return { ...a, is_group: 1, is_postable: 0 }; if (String(a.code || a.account_code) === String(payload.code) || String(a.id) === String(payload.id)) return { ...a, ...payload }; return a; });
        const existsInList = updatedList.some(a => String(a.code || a.account_code) === String(payload.code));
        setAccounts(existsInList ? updatedList : [payload, ...updatedList]);
        setShowModal(false); setEditingAccount(null);
        fetchFreshAccounts();
      } else { showToast((res && (res.error || res.message)) || 'فشل حفظ الحساب', 'error'); }
    } catch (err) { showToast(err.message || 'حدث خطأ أثناء حفظ الحساب', 'error'); }
  };

  // ── تفعيل أو تعطيل الحساب ─────────────────────────────────────────────────
  const handleToggleStatus = async (acc) => {
    const newStatus = acc.is_active === 1 ? 0 : 1;
    const actionText = newStatus === 1 ? 'تفعيل' : 'تعطيل';
    if (!confirm(`هل أنت متأكد من رغبتك في ${actionText} الحساب (${acc.code} - ${acc.name})؟`)) return;
    const payload = { ...acc, is_active: newStatus };
    try {
      if (window.saveAccount) await window.saveAccount(payload);
      setAccounts(accountsWithRollupBalances.map(a => String(a.id) === String(acc.id) ? payload : a));
      showToast(`تم ${actionText} الحساب بنجاح`, 'success');
    } catch (err) { showToast(`فشل ${actionText} الحساب`, 'error'); }
  };

  // ── حذف الحساب مع التحقق من الفروع ────────────────────────────────────────
  const handleDeleteAccount = async (acc, isChildOf) => {
    const hasChildrenFlag = (accountsWithRollupBalances || []).some(a => isChildOf(a, acc));
    if (hasChildrenFlag) return showToast(`لا يمكن حذف الحساب (${acc.code} - ${acc.name}) لأنه حساب رئيسي يحتوي على حسابات فرعية تحته. يرجى حذف أو نقل الفروع أولاً.`, 'error');
    if (!confirm(`هل أنت متأكد من حذف الحساب (${acc.code} - ${acc.name}) نهائياً؟`)) return;
    try {
      const payload = { id: acc.id, code: acc.code, account_code: acc.code, name: acc.name, account_name: acc.name };
      let res;
      if (window.deleteAccount) res = await window.deleteAccount(payload);
      else res = await fetch('/api/accounts/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json());
      if (res && res.success !== false) {
        showToast(`تم حذف الحساب (${acc.code} - ${acc.name}) بنجاح من النظام وقاعدة البيانات 🗑️`, 'success');
        setAccounts(prev => (prev || []).filter(a => cleanCode(a.code) !== cleanCode(acc.code) && String(a.id) !== String(acc.id)));
        await fetchFreshAccounts();
      } else { showToast((res && (res.error || res.message)) || 'لا يمكن حذف الحساب', 'error'); }
    } catch (err) { showToast(err.message || 'فشل حذف الحساب', 'error'); }
  };

  // ── فتح سجل التعديلات المحاسبية ────────────────────────────────────────────
  const handleOpenAuditModal = async () => {
    if (window.getAccountAuditLogs) { const logs = await window.getAccountAuditLogs(); setAuditLogs(logs); }
    setShowAuditModal(true);
  };

  return { fetchFreshAccounts, handleSyncCloudAccounts, handleCleanResetAccounts, handleOpenAddModal, handleOpenAddExpenseModal, handleOpenAddPartnerModal, handleOpenEditModal, handleParentChange, handleSaveAccount, handleToggleStatus, handleDeleteAccount, handleOpenAuditModal };
}
