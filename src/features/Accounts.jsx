const { useState, useEffect, useMemo, useCallback, useRef } = React;

function Accounts({ accounts = [], setAccounts, journal = [], setJournal, vouchers = [], setVouchers, showToast, currency = { display: 'YER ﷼', symbol: '﷼', code: 'YER' } }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [expandedNodes, setExpandedNodes] = useState({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true });
  const [maxDepthFilter, setMaxDepthFilter] = useState('ALL');

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [editingAccount, setEditingAccount] = useState(null);
  const [selectedDetailAcc, setSelectedDetailAcc] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    code: '',
    name: '',
    name_en: '',
    account_type: 'أصول',
    parent_id: '',
    nature: 'debit',
    is_group: 0,
    is_active: 1,
    balance: '0',
    notes: ''
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleCleanResetAccounts = async () => {
    if (!window.confirm('⚠️ تحذير: هل أنت متأكد من رغبتك في تصفير شجرة الحسابات ومسح كافة الحسابات والمبالغ التجريبية في النظام وقوقل شيتس؟\n\n(سيتم تصفير الأرصدة إلى 0.00 وإعادة الهيكلية القياسية النظيفة دون التأثير على العملاء أو الأقسام الأخرى)')) {
      return;
    }

    setIsResetting(true);
    try {
      // 1. Trigger Google Apps Script Cloud Reset directly from browser
      const gasUrl = window.GAS_URL || 'https://script.google.com/macros/s/AKfycbziv1-w2mgI8_Q33eNsYLX4TDQB8ykebh5sm2Ig6kqNdbzb8IMIYLly31K5Sw3IMMGacw/exec';
      try {
        if (typeof window.callGAS === 'function') {
          await window.callGAS({ action: 'resetCleanChartOfAccounts' });
        }
        await fetch(`${gasUrl}?action=resetCleanChartOfAccounts`, { mode: 'no-cors' });
      } catch(gasErr) {
        console.warn("GAS reset direct call:", gasErr);
      }

      // 2. Trigger Local Backend Reset
      const res = await fetch('/api/accounts/clean-reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.data)) {
          setAccounts(data.data);
        }
        if (setJournal) setJournal([]);
        if (setVouchers) setVouchers([]);
        showToast('✅ تم تصفير شجرة الحسابات ومسح كافة المبالغ والسندات في قوقل شيتس والنظام بنجاح 👑');
      } else {
        showToast(data.error || 'فشل التصفير', 'error');
      }
    } catch(err) {
      console.error(err);
      showToast('حدث خطأ أثناء الاتصال بالخادم للتصفير', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const fetchFreshAccounts = useCallback(async () => {
    setIsSyncing(true);
    try {
      let list = [];
      // 1. Try local backend
      try {
        const res = await fetch('/api/accounts/list').then(r => r.json());
        if (res && Array.isArray(res.data) && res.data.length > 0) {
          list = res.data;
        } else if (Array.isArray(res) && res.length > 0) {
          list = res;
        }
      } catch (beErr) {
        console.warn("Local accounts fetch warning:", beErr);
      }

      // 2. Try Google Apps Script if local empty or names corrupted
      if (list.length === 0 || !list.some(a => a.name && a.name.length > 1 && !a.name.includes('?'))) {
        try {
          if (typeof window.callGAS === 'function') {
            const gasRes = await window.callGAS('getAccounts');
            const gasList = (gasRes && Array.isArray(gasRes.data)) ? gasRes.data : (Array.isArray(gasRes) ? gasRes : []);
            if (gasList.length > 0) list = gasList;
          }
        } catch (gasErr) {
          console.warn("GAS getAccounts warning:", gasErr);
        }
      }

      if (list.length > 0 && setAccounts) {
        setAccounts(list);
      }
    } catch (e) {
      console.error("fetchFreshAccounts error:", e);
    } finally {
      setIsSyncing(false);
    }
  }, [setAccounts]);

  useEffect(() => {
    if (!accounts || accounts.length === 0 || !accounts.some(a => a.name && a.name.length > 1 && !a.name.includes('?'))) {
      fetchFreshAccounts();
    }
  }, []);

  const handleSyncCloudAccounts = async () => {
    setIsSyncing(true);
    try {
      let list = [];
      try {
        if (typeof window.callGAS === 'function') {
          const gasRes = await window.callGAS('getAccounts');
          const gasList = (gasRes && Array.isArray(gasRes.data)) ? gasRes.data : (Array.isArray(gasRes) ? gasRes : []);
          if (gasList.length > 0) list = gasList;
        }
      } catch (ge) {}

      if (list.length === 0) {
        const beRes = await fetch('/api/accounts/list').then(r => r.json());
        list = (beRes && Array.isArray(beRes.data)) ? beRes.data : (Array.isArray(beRes) ? beRes : []);
      }

      if (list.length > 0) {
        if (setAccounts) setAccounts(list);
        if (showToast) showToast(`تمت مزامنة كافة الحسابات الـ ${list.length} وتحديث الأرصدة بنجاح 👑`, 'success');
      } else {
        if (showToast) showToast('لم يتم العثور على حسابات لمزامنتها', 'info');
      }
    } catch(err) {
      console.error("Sync error:", err);
      if (showToast) showToast('حدث خطأ أثناء مزامنة دليل الحسابات مع السحابة', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const accountTypesList = typeof ACCOUNT_TYPES !== 'undefined' ? ACCOUNT_TYPES : ['أصول', 'خصوم', 'حقوق ملكية', 'إيرادات', 'تكلفة المبيعات', 'مصروفات', 'أخرى'];

  // Normalize accounts list with dynamic balance calculation from Journal Entries
  const normalizedAccounts = useMemo(() => {
    const jList = Array.isArray(journal) ? journal : [];

    return (accounts || []).map(a => {
      const id = a.id || a.acc_code || a.code;
      const code = String(a.code || a.acc_code || id || '').trim();
      const name = String(a.name || a.acc_name || code).trim();
      const type = a.account_type || a.acc_type || 'أصول';
      const parent_id = (a.parent_id !== undefined && a.parent_id !== null && a.parent_id !== '' && a.parent_id !== '0') ? a.parent_id : null;
      const level = a.level || (code.includes('.') ? code.split('.').length : (code.length > 2 ? 3 : (code.length === 1 ? 1 : 2)));
      const is_group = a.is_group !== undefined ? Number(a.is_group) : (code.length <= 1 ? 1 : 0);
      const nature = a.nature || (['خصوم', 'حقوق ملكية', 'إيرادات'].includes(type) ? 'credit' : 'debit');
      const is_active = a.is_active !== undefined ? Number(a.is_active) : 1;
      const openingBal = parseFloat(a.opening_balance || a.open_bal || 0.0);

      // Compute ledger movements from journal entries in base currency (YER)
      let totalDebit = 0.0;
      let totalCredit = 0.0;
      let hasMovements = false;

      jList.forEach(j => {
        const dStr = String(j.debit || j.debit_account_id || '').trim();
        const cStr = String(j.credit || j.credit_account_id || '').trim();
        const baseAmt = parseFloat(j.base_amount) || ((parseFloat(j.amount) || 0) * (parseFloat(j.exchange_rate) || 1.0));

        const matchesDebit = dStr === code || dStr === String(id) || dStr.startsWith(code + ' ') || dStr.startsWith(code + '-') || (name && dStr.includes(name));
        const matchesCredit = cStr === code || cStr === String(id) || cStr.startsWith(code + ' ') || cStr.startsWith(code + '-') || (name && cStr.includes(name));

        if (matchesDebit) {
          totalDebit += baseAmt;
          hasMovements = true;
        }
        if (matchesCredit) {
          totalCredit += baseAmt;
          hasMovements = true;
        }
      });

      let calculatedBal = 0.0;
      if (hasMovements) {
        if (nature === 'credit') {
          calculatedBal = openingBal + (totalCredit - totalDebit);
        } else {
          calculatedBal = openingBal + (totalDebit - totalCredit);
        }
      } else {
        calculatedBal = parseFloat(a.balance || a.current_balance || openingBal) || 0.0;
      }

      return {
        ...a,
        id,
        code,
        name,
        name_en: a.name_en || '',
        account_type: type,
        parent_id,
        level,
        is_group,
        nature,
        is_active,
        balance: calculatedBal,
        opening_balance: openingBal,
        total_debit: totalDebit,
        total_credit: totalCredit
      };
    });
  }, [accounts, journal]);

  // Compute Dynamic Recursive Balances for Parent Accounts (Standard ERP Rollup)
  const accountsWithRollupBalances = useMemo(() => {
    const accList = normalizedAccounts;

    // Helper: Identify all direct children of an account
    const getDirectChildren = (parentAcc) => {
      return accList.filter(c => {
        if (String(c.id) === String(parentAcc.id) || String(c.code) === String(parentAcc.code)) return false;
        if (c.parent_id !== null && c.parent_id !== undefined && c.parent_id !== '' && c.parent_id !== '0') {
          return String(c.parent_id) === String(parentAcc.id) || String(c.parent_id) === String(parentAcc.code);
        }
        // Fallback hierarchical dot-notation (e.g. 101.01 child of 101)
        if (parentAcc.code && c.code && c.code.startsWith(parentAcc.code + '.')) {
          const rest = c.code.slice(parentAcc.code.length + 1);
          return !rest.includes('.');
        }
        return false;
      });
    };

    // Recursive calculation: Leaves provide their balance, Parents sum their children's recursive rollups
    const memoSum = {};
    const calcNodeRollup = (acc) => {
      const key = String(acc.id || acc.code);
      if (memoSum[key] !== undefined) return memoSum[key];

      const children = getDirectChildren(acc);
      if (children.length === 0) {
        // Leaf movement account -> balance is its own transactional balance
        memoSum[key] = parseFloat(acc.balance) || 0.0;
        return memoSum[key];
      }

      // Summary/Parent account -> recursive sum of all sub-accounts
      let total = 0.0;
      children.forEach(child => {
        total += calcNodeRollup(child);
      });

      memoSum[key] = total;
      return total;
    };

    return accList.map(a => {
      const children = getDirectChildren(a);
      const hasChildren = children.length > 0;
      const rollup = calcNodeRollup(a);
      return {
        ...a,
        is_group: hasChildren ? 1 : (a.is_group !== undefined ? Number(a.is_group) : 0),
        is_postable: hasChildren ? 0 : 1,
        rollupBalance: hasChildren ? rollup : (parseFloat(a.balance) || 0.0),
        hasChildren
      };
    });
  }, [normalizedAccounts]);

  // Handle Dynamic Code Auto-Suggestion
  const handleParentChange = async (parentIdVal) => {
    const parentId = (parentIdVal === '' || parentIdVal === '0') ? null : parentIdVal;
    let newType = formData.account_type;
    let newNature = formData.nature;

    if (parentId) {
      const parentAcc = accountsWithRollupBalances.find(a => String(a.id) === String(parentId) || String(a.code) === String(parentId));
      if (parentAcc) {
        newType = parentAcc.account_type;
        newNature = parentAcc.nature;
      }
    }

    let suggestedCode = '';
    if (window.suggestAccountCode) {
      suggestedCode = await window.suggestAccountCode(parentId);
    } else {
      suggestedCode = parentId ? `${parentId}.01` : '1';
    }

    setFormData(prev => ({
      ...prev,
      parent_id: parentIdVal,
      code: suggestedCode,
      account_type: newType,
      nature: newNature,
      is_group: 0 // New child defaults to transactional
    }));
  };

  // Open Modal to Add New Account (+ فرع)
  const handleOpenAddModal = async (presetParentId = null) => {
    setEditingAccount(null);
    const parentId = presetParentId ? String(presetParentId) : '';
    let initialCode = '';
    let initialType = 'أصول';
    let initialNature = 'debit';

    if (parentId) {
      const pAcc = accountsWithRollupBalances.find(a => String(a.id) === String(parentId) || String(a.code) === String(parentId));
      if (pAcc) {
        initialType = pAcc.account_type;
        initialNature = pAcc.nature;
      }
    }

    if (window.suggestAccountCode) {
      initialCode = await window.suggestAccountCode(parentId);
    } else {
      initialCode = parentId ? `${parentId}.01` : '101';
    }

    setFormData({
      id: null,
      code: initialCode,
      name: '',
      name_en: '',
      account_type: initialType,
      parent_id: parentId,
      nature: initialNature,
      is_group: 0, // Child accounts default to transactional
      is_active: 1,
      balance: '0',
      notes: ''
    });
    setShowModal(true);
  };

  // Open Modal to Edit Existing Account
  const handleOpenEditModal = (acc) => {
    setEditingAccount(acc);
    setFormData({
      id: acc.id,
      code: acc.code,
      name: acc.name,
      name_en: acc.name_en || '',
      account_type: acc.account_type,
      parent_id: acc.parent_id !== null && acc.parent_id !== undefined ? String(acc.parent_id) : '',
      nature: acc.nature || 'debit',
      is_group: acc.hasChildren ? 1 : Number(acc.is_group || 0),
      is_active: acc.is_active,
      balance: String(acc.balance || 0),
      notes: acc.notes || ''
    });
    setShowModal(true);
  };

  // Handle Save (Add/Update) with Parent-Child Auto-Switching
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return showToast('اسم الحساب مطلوب', 'error');
    if (!formData.code.trim()) return showToast('كود الحساب مطلوب', 'error');

    const existing = accountsWithRollupBalances.find(a => String(a.code) === String(formData.code) && String(a.id) !== String(formData.id));
    if (existing) {
      return showToast(`كود الحساب ${formData.code} مستخدم بالفعل للحساب (${existing.name})`, 'error');
    }

    if (formData.id && formData.parent_id) {
      if (String(formData.id) === String(formData.parent_id)) {
        return showToast('لا يمكن جعل الحساب أباً لنفسه', 'error');
      }
    }

    const payload = {
      ...formData,
      balance: parseFloat(formData.balance) || 0.0,
      is_group: Number(formData.is_group),
      is_active: Number(formData.is_active)
    };

    try {
      if (window.saveAccount) {
        const res = await window.saveAccount(payload);
        if (res.success !== false) {
          showToast(res.message || 'تم حفظ الحساب بنجاح 👑', 'success');
          
          // Auto-switch parent account to is_group=1 in local state
          const updatedList = accountsWithRollupBalances.map(a => {
            if (payload.parent_id && (String(a.id) === String(payload.parent_id) || String(a.code) === String(payload.parent_id))) {
              return { ...a, is_group: 1, is_postable: 0 };
            }
            return a;
          }).filter(a => String(a.id) !== String(payload.id));

          setAccounts([payload, ...updatedList]);
          setShowModal(false);
        } else {
          showToast(res.error || 'فشل حفظ الحساب', 'error');
        }
      } else {
        const updatedList = accountsWithRollupBalances.map(a => {
          if (payload.parent_id && (String(a.id) === String(payload.parent_id) || String(a.code) === String(payload.parent_id))) {
            return { ...a, is_group: 1, is_postable: 0 };
          }
          return a;
        });
        setAccounts([payload, ...updatedList]);
        showToast('تم إضافة الحساب محلياً', 'success');
        setShowModal(false);
      }
    } catch (err) {
      showToast(err.message || 'حدث خطأ أثناء حفظ الحساب', 'error');
    }
  };

  const handleToggleStatus = async (acc) => {
    const newStatus = acc.is_active === 1 ? 0 : 1;
    const actionText = newStatus === 1 ? 'تفعيل' : 'تعطيل';
    if (!confirm(`هل أنت متأكد من رغبتك في ${actionText} الحساب (${acc.code} - ${acc.name})؟`)) return;

    const payload = { ...acc, is_active: newStatus };
    try {
      if (window.saveAccount) {
        await window.saveAccount(payload);
      }
      setAccounts(accountsWithRollupBalances.map(a => String(a.id) === String(acc.id) ? payload : a));
      showToast(`تم ${actionText} الحساب بنجاح`, 'success');
    } catch (err) {
      showToast(`فشل ${actionText} الحساب`, 'error');
    }
  };

  const handleDeleteAccount = async (acc) => {
    if (!confirm(`هل أنت متأكد من حذف الحساب (${acc.code} - ${acc.name}) نهائياً؟`)) return;

    try {
      if (window.deleteAccount) {
        const res = await window.deleteAccount({ id: acc.id, code: acc.code });
        if (res.success !== false) {
          showToast('تم حذف الحساب بنجاح', 'success');
          setAccounts(accountsWithRollupBalances.filter(a => String(a.id) !== String(acc.id)));
        } else {
          showToast(res.error || 'لا يمكن حذف الحساب', 'error');
        }
      } else {
        setAccounts(accountsWithRollupBalances.filter(a => String(a.id) !== String(acc.id)));
        showToast('تم حذف الحساب محلياً', 'success');
      }
    } catch (err) {
      showToast(err.message || 'فشل حذف الحساب', 'error');
    }
  };

  const handleOpenAuditModal = async () => {
    if (window.getAccountAuditLogs) {
      const logs = await window.getAccountAuditLogs();
      setAuditLogs(logs);
    }
    setShowAuditModal(true);
  };

  const toggleExpand = (id) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all = {};
    accountsWithRollupBalances.forEach(a => { all[a.id] = true; });
    setExpandedNodes(all);
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

  const filterMatches = useCallback((acc) => {
    if (filterType !== 'ALL' && acc.account_type !== filterType) return false;
    if (maxDepthFilter !== 'ALL' && acc.level > Number(maxDepthFilter)) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      acc.code.toLowerCase().includes(term) ||
      acc.name.toLowerCase().includes(term) ||
      acc.name_en.toLowerCase().includes(term) ||
      acc.account_type.toLowerCase().includes(term)
    );
  }, [searchTerm, filterType, maxDepthFilter]);

  const getChildrenOfNode = useCallback((parentAcc) => {
    return accountsWithRollupBalances.filter(c => {
      if (String(c.id) === String(parentAcc.id) || String(c.code) === String(parentAcc.code)) return false;
      if (c.parent_id !== null && c.parent_id !== undefined && c.parent_id !== '' && c.parent_id !== '0') {
        return String(c.parent_id) === String(parentAcc.id) || String(c.parent_id) === String(parentAcc.code);
      }
      if (parentAcc.code && c.code && c.code.startsWith(parentAcc.code + '.')) {
        const rest = c.code.slice(parentAcc.code.length + 1);
        return !rest.includes('.');
      }
      return false;
    });
  }, [accountsWithRollupBalances]);

  const renderTreeNode = (acc) => {
    const children = getChildrenOfNode(acc);
    const isExpanded = !!expandedNodes[acc.id] || !!expandedNodes[acc.code];
    const isMatching = filterMatches(acc);
    const hasMatchingChild = children.some(c => filterMatches(c));

    if (!isMatching && !hasMatchingChild && searchTerm.trim()) return null;

    const isGroup = acc.is_group === 1 || children.length > 0;
    const isDebit = acc.nature === 'debit';
    const displayBalance = isGroup ? acc.rollupBalance : acc.balance;

    return (
      <div key={acc.id || acc.code} className="mr-2 md:mr-3.5 my-1.5">
        <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
          isGroup ? 'bg-[#FAFAFB] border-[#E8E5EA] font-bold' : 'bg-white border-[#E8E5EA] hover:bg-[#FAFAFB]'
        } ${acc.is_active === 0 ? 'opacity-50 bg-rose-50/40' : ''}`}>
          
          <div className="flex items-center gap-2.5 overflow-hidden">
            {children.length > 0 ? (
              <button onClick={() => toggleExpand(acc.id || acc.code)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-[#E8E5EA] text-[#25232A] hover:bg-[#FAFAFB] text-xs font-mono cursor-pointer">
                {isExpanded ? '▼' : '◀'}
              </button>
            ) : (
              <span className="w-6 h-6 inline-block text-center text-[#6F6B75] text-xs">•</span>
            )}

            <span className="text-base">{isGroup ? '📁' : '📄'}</span>
            <span className="font-mono bg-[#F2E7F3] text-[#8F2A87] px-2 py-0.5 rounded-md text-xs font-bold">{acc.code}</span>
            <span className={`text-xs md:text-sm ${isGroup ? 'font-bold text-[#25232A]' : 'font-medium text-[#25232A]'}`}>{acc.name}</span>

            {acc.name_en && <span className="text-[11px] text-[#6F6B75] font-mono hidden md:inline">({acc.name_en})</span>}

            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
              isGroup ? 'bg-[#FFF1DC] text-[#C97300] border border-[#FFE4B9]' : 'bg-[#E2F5F7] text-[#007F8C] border border-[#C5ECF0]'
            }`}>
              {isGroup ? 'تجميعي' : 'حركة'}
            </span>

            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
              isDebit ? 'bg-[#E2F5F7] text-[#007F8C]' : 'bg-[#F2E7F3] text-[#8F2A87]'
            }`}>
              {isDebit ? 'مدين' : 'دائن'}
            </span>

            {acc.is_active === 0 && (
              <span className="text-[10px] bg-rose-100 text-[#D64545] px-2 py-0.5 rounded-md font-bold">معطل</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left font-mono tabular-nums">
              <span className={`text-xs md:text-sm font-extrabold ${displayBalance > 0 ? 'text-[#007F8C]' : (displayBalance < 0 ? 'text-[#D64545]' : 'text-[#6F6B75]')}`}>
                {displayBalance.toLocaleString('en-US')} <span className="text-[10px] font-medium text-[#6F6B75]">{(currency && currency.display) ? currency.display : 'YER ﷼'}</span>
              </span>
              {isGroup && <span className="block text-[9px] text-[#6F6B75] text-center font-sans">إجمالي الفرع</span>}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleOpenAddModal(acc.id || acc.code)}
                title="إضافة حساب فرعي تحته (+ فرع)"
                className="px-2.5 py-1 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                + فرع
              </button>

              <button
                onClick={() => handleOpenEditModal(acc)}
                title="تعديل الحساب"
                className="w-7 h-7 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-lg text-xs font-bold border border-[#E8E5EA] flex items-center justify-center cursor-pointer"
              >
                ✏️
              </button>

              <button
                onClick={() => setSelectedDetailAcc(acc)}
                title="عرض التفاصيل"
                className="w-7 h-7 bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C] rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer"
              >
                👁️
              </button>

              <button
                onClick={() => handleToggleStatus(acc)}
                title={acc.is_active === 1 ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer ${acc.is_active === 1 ? 'bg-[#FFF1DC] hover:bg-[#FFE4B9] text-[#C97300]' : 'bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C]'}`}
              >
                {acc.is_active === 1 ? '🚫' : '✅'}
              </button>

              <button
                onClick={() => handleDeleteAccount(acc)}
                title="حذف الحساب"
                className="w-7 h-7 bg-rose-50 hover:bg-rose-100 text-[#D64545] rounded-lg text-xs font-bold border border-rose-200 flex items-center justify-center cursor-pointer"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>

        {children.length > 0 && (isExpanded || searchTerm.trim()) && (
          <div className="border-r-2 border-[#E5CEE7] pr-2 md:pr-4 mt-1 space-y-1">
            {children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  const rootNodes = useMemo(() => {
    return accountsWithRollupBalances.filter(a => {
      if (!a.parent_id || a.parent_id === '0' || a.level === 1) return true;
      const parentExists = accountsWithRollupBalances.some(p => 
        (String(p.id) === String(a.parent_id) || String(p.code) === String(a.parent_id)) && String(p.id) !== String(a.id)
      );
      return !parentExists;
    });
  }, [accountsWithRollupBalances]);

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F2E7F3] text-[#8F2A87] border border-[#E5CEE7] flex items-center justify-center text-xl font-bold shadow-xs">
              <Icons.Accounts className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#25232A]">
                الدليل المحاسبي وشجرة الحسابات (Chart of Accounts)
              </h1>
              <p className="text-xs text-[#6F6B75] mt-0.5">
                شجرة محاسبية هرمية مرنة مع الترقيم التلقائي وإدارة الأرصدة التجميعية
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCleanResetAccounts}
              disabled={isResetting}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3 py-2.5 rounded-xl border border-rose-200 flex items-center gap-1.5 text-xs cursor-pointer transition shadow-xs disabled:opacity-50"
              title="تصفير ومسح الحسابات والمبالغ التجريبية"
            >
              <span>{isResetting ? '⏳ جاري التصفير...' : '🧹 تصفير دليل الحسابات'}</span>
            </button>

            <button
              onClick={handleSyncCloudAccounts}
              disabled={isSyncing}
              className="bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#8F2A87] font-bold px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] flex items-center gap-1.5 text-xs cursor-pointer transition shadow-xs disabled:opacity-50"
            >
              <span className={isSyncing ? "animate-spin" : ""}>🔄</span>
              <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة دليل الحسابات مع السحابة ☁️'}</span>
            </button>

            <button
              onClick={() => handleOpenAddModal(null)}
              className="bg-[#B0005A] hover:bg-[#8E0049] text-white font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 text-xs cursor-pointer"
            >
              <span>+</span> إضافة حساب رئيسي
            </button>

            <button
              onClick={handleOpenAuditModal}
              className="bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] font-bold px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] flex items-center gap-1.5 text-xs cursor-pointer"
            >
              📋 سجل التعديلات
            </button>
          </div>
        </div>
      </div>

      {/* Control & Search Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#E8E5EA] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          <div className="md:col-span-2 relative">
            <input
              type="text"
              placeholder="🔍 ابحث برقم الكود، اسم الحساب، أو النوع..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl px-4 py-2.5 text-xs font-medium focus:bg-white focus:border-[#8F2A87] outline-none h-11"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute left-3 top-3 text-[#6F6B75] hover:text-[#25232A] text-xs font-bold">
                ✕ تفريغ
              </button>
            )}
          </div>

          <div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl px-3 py-2.5 text-xs font-medium focus:bg-white focus:border-[#8F2A87] outline-none h-11"
            >
              <option value="ALL">جميع أنواع الحسابات</option>
              {accountTypesList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <select
              value={maxDepthFilter}
              onChange={e => setMaxDepthFilter(e.target.value)}
              className="w-full bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl px-3 py-2.5 text-xs font-medium focus:bg-white focus:border-[#8F2A87] outline-none h-11"
            >
              <option value="ALL">عرض جميع المستويات</option>
              <option value="1">المستوى 1 (الرئيسي)</option>
              <option value="2">حتى المستوى 2</option>
              <option value="3">حتى المستوى 3</option>
              <option value="4">حتى المستوى 4</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E8E5EA]">
          <div className="flex items-center gap-2">
            <button onClick={expandAll} className="px-3 py-1.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-lg text-xs font-bold border border-[#E8E5EA] cursor-pointer">
              📂 فتح الكل
            </button>
            <button onClick={collapseAll} className="px-3 py-1.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-lg text-xs font-bold border border-[#E8E5EA] cursor-pointer">
              📁 إغلاق الكل
            </button>
          </div>

          <div className="text-xs text-[#6F6B75] font-bold">
            إجمالي الحسابات: <span className="text-[#8F2A87] font-mono text-xs">{accountsWithRollupBalances.length}</span> (تجميعي: {accountsWithRollupBalances.filter(a=>a.is_group===1).length} | حركة: {accountsWithRollupBalances.filter(a=>a.is_group===0).length})
          </div>
        </div>
      </div>

      {/* Main Hierarchical Tree View Container */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#E8E5EA] min-h-[400px]">
        {rootNodes.length === 0 ? (
          <div className="text-center py-16 text-[#6F6B75]">
            <p className="text-4xl mb-2">📄</p>
            <p className="text-sm font-bold">لا توجد حسابات مطابقة للبحث</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rootNodes.map(root => renderTreeNode(root))}
          </div>
        )}
      </div>

      {/* MODAL: Add / Edit Account */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#E8E5EA] overflow-hidden animate-fadeIn my-8">
            <div className="bg-[#FAFAFB] p-5 border-b border-[#E8E5EA] flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#25232A] flex items-center gap-2">
                <span>{editingAccount ? '✏️ تعديل بيانات حساب' : '✨ إضافة حساب محاسبي جديد'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#6F6B75] hover:text-[#25232A] text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-[#25232A] mb-1.5">الحساب الأب (Parent Account)</label>
                <select
                  value={formData.parent_id}
                  onChange={e => handleParentChange(e.target.value)}
                  className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs font-medium bg-[#FAFAFB] focus:bg-white focus:border-[#8F2A87] outline-none h-11"
                >
                  <option value="">-- حساب رئيسي بدون أب (Level 1) --</option>
                  {accountsWithRollupBalances.filter(a => String(a.id) !== String(formData.id)).map(a => (
                    <option key={a.id} value={a.id}>
                      { '—'.repeat(Math.max(0, (parseInt(a.level) || 1) - 1)) } {a.code} - {a.name} ({a.account_type})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-[#6F6B75] mt-1 block">تغيير الحساب الأب يحدد نوع الحساب ويقترح الكود التلقائي المناسب.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#25232A] mb-1.5">كود الحساب (رمز الترقيم) *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder=""
                    className="w-full border border-[#E8E5EA] rounded-xl p-2.5 font-mono text-xs font-bold bg-white focus:border-[#8F2A87] outline-none h-11"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#25232A] mb-1.5">اسم الحساب (عربي) *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder=""
                    className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs font-medium bg-white focus:border-[#8F2A87] outline-none h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#25232A] mb-1.5">اسم الحساب (بالإنجليزية اختياري)</label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                    placeholder="e.g. Showroom Cash Box"
                    className="w-full border border-[#E8E5EA] rounded-xl p-2.5 font-mono text-xs bg-white focus:border-[#8F2A87] outline-none h-11"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#25232A] mb-1.5">نوع الحساب</label>
                  <select
                    value={formData.account_type}
                    onChange={e => setFormData({ ...formData, account_type: e.target.value })}
                    className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs font-medium bg-white focus:border-[#8F2A87] outline-none h-11"
                  >
                    {accountTypesList.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#25232A] mb-1.5">طبيعة الحساب</label>
                  <select
                    value={formData.nature}
                    onChange={e => setFormData({ ...formData, nature: e.target.value })}
                    className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs font-medium bg-white focus:border-[#8F2A87] outline-none h-11"
                  >
                    <option value="debit">مدين (Debit)</option>
                    <option value="credit">دائن (Credit)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#25232A] mb-1.5">فئة الحساب</label>
                  <select
                    value={formData.is_group}
                    onChange={e => setFormData({ ...formData, is_group: Number(e.target.value) })}
                    className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs font-medium bg-white focus:border-[#8F2A87] outline-none h-11"
                  >
                    <option value={0}>حساب حركة / مباشر (Posting Account)</option>
                    <option value={1}>حساب تجميعي / أب (Group Account)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#25232A] mb-1.5">الرصيد الافتتاحي</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.balance}
                    onChange={e => setFormData({ ...formData, balance: e.target.value })}
                    className="w-full border border-[#E8E5EA] rounded-xl p-2.5 font-mono text-xs bg-white focus:border-[#8F2A87] outline-none h-11"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#25232A] mb-1.5">حالة الحساب</label>
                  <select
                    value={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: Number(e.target.value) })}
                    className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs font-medium bg-white focus:border-[#8F2A87] outline-none h-11"
                  >
                    <option value={1}>نشط (Active)</option>
                    <option value={0}>معطل (Disabled)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#25232A] mb-1.5">ملاحظات / وصف الحساب</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أدخل أي تفاصيل أو ملاحظات إضافية..."
                  className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs bg-white focus:border-[#8F2A87] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E8E5EA]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-xl font-bold text-xs shadow-xs"
                >
                  {editingAccount ? 'حفظ التعديلات' : 'إضافة الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Account Detail View */}
      {selectedDetailAcc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E8E5EA] overflow-hidden animate-fadeIn">
            <div className="bg-[#FAFAFB] p-5 border-b border-[#E8E5EA] flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#25232A]">👁️ تفاصيل الحساب المحاسبي</h3>
              <button onClick={() => setSelectedDetailAcc(null)} className="text-[#6F6B75] hover:text-[#25232A] font-bold">✕</button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">كود الحساب:</span>
                <span className="font-mono font-bold text-[#8F2A87]">{selectedDetailAcc.code}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">اسم الحساب:</span>
                <span className="font-bold text-[#25232A]">{selectedDetailAcc.name}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">نوع الحساب:</span>
                <span>{selectedDetailAcc.account_type}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">الفئة:</span>
                <span>{selectedDetailAcc.is_group === 1 ? 'حساب تجميعي (Group)' : 'حساب حركة (Posting)'}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">الطبيعة المحاسبية:</span>
                <span>{selectedDetailAcc.nature === 'debit' ? 'مدين (Debit)' : 'دائن (Credit)'}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">الرصيد:</span>
                <span className="font-bold font-mono text-[#007F8C]">{selectedDetailAcc.rollupBalance || selectedDetailAcc.balance} {(currency && currency.display) ? currency.display : 'YER ﷼'}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">الحالة:</span>
                <span>{selectedDetailAcc.is_active === 1 ? 'نشط' : 'معطل'}</span>
              </div>
            </div>
            <div className="p-4 bg-[#FAFAFB] border-t border-[#E8E5EA] text-left">
              <button onClick={() => setSelectedDetailAcc(null)} className="px-5 py-2 bg-[#25232A] text-white rounded-xl font-bold text-xs">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Audit Logs */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-[#E8E5EA] overflow-hidden animate-fadeIn">
            <div className="bg-[#FAFAFB] p-5 border-b border-[#E8E5EA] flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#25232A]">📋 سجل التعديلات المحاسبية (Audit Log)</h3>
              <button onClick={() => setShowAuditModal(false)} className="text-[#6F6B75] hover:text-[#25232A] font-bold">✕</button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {auditLogs.length === 0 ? (
                <p className="text-center text-[#6F6B75] py-8 font-bold">لا توجد سجلات تعديلات سابقة.</p>
              ) : (
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAFAFB] border-b border-[#E8E5EA]">
                    <tr>
                      <th className="p-2.5">التاريخ</th>
                      <th className="p-2.5">المستخدم</th>
                      <th className="p-2.5">كود الحساب</th>
                      <th className="p-2.5">الإجراء</th>
                      <th className="p-2.5">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, idx) => (
                      <tr key={idx} className="border-b border-[#E8E5EA] hover:bg-[#FAFAFB]">
                        <td className="p-2.5 font-mono text-[#6F6B75]">{log.created_at}</td>
                        <td className="p-2.5 font-bold text-[#25232A]">{log.user_name || 'المستخدم'}</td>
                        <td className="p-2.5 font-mono font-bold text-[#8F2A87]">{log.account_code}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            log.action === 'create' ? 'bg-[#E2F5F7] text-[#007F8C]' :
                            log.action === 'update' ? 'bg-[#F2E7F3] text-[#8F2A87]' : 'bg-rose-100 text-[#D64545]'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-2.5 truncate max-w-xs text-[#6F6B75]">{log.new_value || log.old_value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 bg-[#FAFAFB] border-t border-[#E8E5EA] text-left">
              <button onClick={() => setShowAuditModal(false)} className="px-5 py-2 bg-[#25232A] text-white rounded-xl font-bold text-xs">إغلاق</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
