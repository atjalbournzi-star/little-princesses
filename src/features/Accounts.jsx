const { useState, useEffect, useMemo, useCallback, useRef } = React;
function Accounts({ accounts = [], setAccounts, showToast, currency = { display: '$' } }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState('ALL');
  const [expandedNodes, setExpandedNodes] = React.useState({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true });
  const [maxDepthFilter, setMaxDepthFilter] = React.useState('ALL');

  // Modals state
  const [showModal, setShowModal] = React.useState(false);
  const [showAuditModal, setShowAuditModal] = React.useState(false);
  const [auditLogs, setAuditLogs] = React.useState([]);
  const [editingAccount, setEditingAccount] = React.useState(null);
  const [selectedDetailAcc, setSelectedDetailAcc] = React.useState(null);

  // Form State
  const [formData, setFormData] = React.useState({
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

  const accountTypesList = typeof ACCOUNT_TYPES !== 'undefined' ? ACCOUNT_TYPES : ['أصول', 'خصوم', 'حقوق ملكية', 'إيرادات', 'تكلفة المبيعات', 'مصروفات', 'أخرى'];

  // Normalize accounts list
  const normalizedAccounts = React.useMemo(() => {
    return (accounts || []).map(a => {
      const id = a.id || a.acc_code || a.code;
      const code = String(a.code || a.acc_code || id || '');
      const name = a.name || a.acc_name || code;
      const type = a.account_type || a.acc_type || 'أصول';
      const parent_id = (a.parent_id !== undefined && a.parent_id !== null && a.parent_id !== '' && a.parent_id !== '0') ? a.parent_id : null;
      const level = a.level || (code.includes('.') ? code.split('.').length : (code.length > 2 ? 3 : (code.length === 1 ? 1 : 2)));
      const is_group = a.is_group !== undefined ? Number(a.is_group) : (code.length <= 1 ? 1 : 0);
      const nature = a.nature || (['خصوم', 'حقوق ملكية', 'إيرادات'].includes(type) ? 'credit' : 'debit');
      const is_active = a.is_active !== undefined ? Number(a.is_active) : 1;
      const balance = parseFloat(a.balance) || 0.0;
      return { ...a, id, code, name, name_en: a.name_en || '', account_type: type, parent_id, level, is_group, nature, is_active, balance };
    });
  }, [accounts]);

  // Compute Recursive Balances for Parent Accounts
  const accountsWithRollupBalances = React.useMemo(() => {
    const map = {};
    normalizedAccounts.forEach(a => { map[a.id] = { ...a, rollupBalance: a.balance }; });

    // Sum child balances into parent nodes
    const calcRollup = (accId) => {
      const children = Object.values(map).filter(c => String(c.parent_id) === String(accId));
      let sum = 0;
      children.forEach(child => {
        if (child.is_group === 1) {
          sum += calcRollup(child.id);
        } else {
          sum += child.balance;
        }
      });
      if (map[accId] && children.length > 0) {
        map[accId].rollupBalance = sum;
      }
      return map[accId] ? map[accId].rollupBalance : 0;
    };

    Object.values(map).filter(a => a.is_group === 1 && !a.parent_id).forEach(root => {
      calcRollup(root.id);
    });

    return Object.values(map);
  }, [normalizedAccounts]);

  // Handle Dynamic Code Auto-Suggestion
  const handleParentChange = async (parentIdVal) => {
    const parentId = parentIdVal === '' ? null : parentIdVal;
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
      nature: newNature
    }));
  };

  // Open Modal to Add New Account
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
      is_group: 0,
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
      is_group: acc.is_group,
      is_active: acc.is_active,
      balance: String(acc.balance || 0),
      notes: acc.notes || ''
    });
    setShowModal(true);
  };

  // Handle Save (Add/Update)
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return showToast('اسم الحساب مطلوب', 'error');
    if (!formData.code.trim()) return showToast('كود الحساب مطلوب', 'error');

    // Prevent duplicate code check
    const existing = accountsWithRollupBalances.find(a => String(a.code) === String(formData.code) && String(a.id) !== String(formData.id));
    if (existing) {
      return showToast(`كود الحساب ${formData.code} مستخدم بالفعل للحساب (${existing.name})`, 'error');
    }

    // Prevent circular reference
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
          // Update local state
          const updatedList = accountsWithRollupBalances.filter(a => String(a.id) !== String(payload.id));
          setAccounts([payload, ...updatedList]);
          setShowModal(false);
        } else {
          showToast(res.error || 'فشل حفظ الحساب', 'error');
        }
      } else {
        setAccounts([payload, ...accountsWithRollupBalances]);
        showToast('تم إضافة الحساب محلياً', 'success');
        setShowModal(false);
      }
    } catch (err) {
      showToast(err.message || 'حدث خطأ أثناء حفظ الحساب', 'error');
    }
  };

  // Toggle Disable / Enable Account
  const handleToggleStatus = async (acc) => {
    const newStatus = acc.is_active === 1 ? 0 : 1;
    const actionText = newStatus === 1 ? 'تفعيل' : 'تعطيل';
    if (!confirm(`هل أنت تأكد من رغبتك في ${actionText} الحساب (${acc.code} - ${acc.name})؟`)) return;

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

  // Delete Account
  const handleDeleteAccount = async (acc) => {
    if (!confirm(`هل أنت تأكد من حذف الحساب (${acc.code} - ${acc.name}) نهائياً؟`)) return;

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

  // Fetch Audit Logs
  const handleOpenAuditModal = async () => {
    if (window.getAccountAuditLogs) {
      const logs = await window.getAccountAuditLogs();
      setAuditLogs(logs);
    }
    setShowAuditModal(true);
  };

  // Toggle Tree Node Expand
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

  // Tree View Filtering & Building
  const filterMatches = React.useCallback((acc) => {
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

  // Render Single Tree Node Item Recursively
  const renderTreeNode = (acc) => {
    const children = accountsWithRollupBalances.filter(c => String(c.parent_id) === String(acc.id));
    const isExpanded = !!expandedNodes[acc.id];
    const isMatching = filterMatches(acc);
    const hasMatchingChild = children.some(c => filterMatches(c));

    if (!isMatching && !hasMatchingChild && searchTerm.trim()) return null;

    const isGroup = acc.is_group === 1;
    const isDebit = acc.nature === 'debit';
    const displayBalance = isGroup ? acc.rollupBalance : acc.balance;

    return (
      <div key={acc.id} className="mr-2 md:mr-4 my-1">
        <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
          isGroup ? 'bg-slate-100/90 border-slate-300 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50'
        } ${acc.is_active === 0 ? 'opacity-50 bg-red-50/40' : ''}`}>
          
          {/* Left: Code, Name, Badges */}
          <div className="flex items-center gap-2 overflow-hidden">
            {children.length > 0 ? (
              <button onClick={() => toggleExpand(acc.id)} className="w-6 h-6 flex items-center justify-center rounded bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-mono">
                {isExpanded ? '▼' : '◀'}
              </button>
            ) : (
              <span className="w-6 h-6 inline-block text-center text-slate-400 text-xs">•</span>
            )}

            <span className="text-base">{isGroup ? '📁' : '📄'}</span>
            <span className="font-mono bg-purple-100 text-purple-950 px-2 py-0.5 rounded text-xs font-bold">{acc.code}</span>
            <span className={`text-sm ${isGroup ? 'font-black text-slate-900' : 'font-medium text-slate-800'}`}>{acc.name}</span>

            {acc.name_en && <span className="text-xs text-slate-400 font-mono hidden md:inline">({acc.name_en})</span>}

            {/* Status Pills */}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              isGroup ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-200'
            }`}>
              {isGroup ? 'تجميعي' : 'حركة'}
            </span>

            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              isDebit ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
            }`}>
              {isDebit ? 'مدين' : 'دائن'}
            </span>

            {acc.is_active === 0 && (
              <span className="text-[10px] bg-red-200 text-red-900 px-2 py-0.5 rounded-full font-bold">معطل</span>
            )}
          </div>

          {/* Right: Balance & Action Controls */}
          <div className="flex items-center gap-3">
            <div className="text-left font-mono">
              <span className={`text-sm font-bold ${displayBalance > 0 ? 'text-emerald-700' : (displayBalance < 0 ? 'text-red-700' : 'text-slate-500')}`}>
                {displayBalance.toLocaleString('en-US')} {(currency && currency.display) ? currency.display : '$'}
              </span>
              {isGroup && <span className="block text-[9px] text-slate-400 text-center">إجمالي الفرع</span>}
            </div>

            {/* Actions Menu */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleOpenAddModal(acc.id)}
                title="إضافة حساب فرعي تحته"
                className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
              >
                + فرع
              </button>

              <button
                onClick={() => handleOpenEditModal(acc)}
                title="تعديل الحساب"
                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold"
              >
                ✏️
              </button>

              <button
                onClick={() => setSelectedDetailAcc(acc)}
                title="عرض التفاصيل"
                className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg text-xs font-bold"
              >
                👁️
              </button>

              <button
                onClick={() => handleToggleStatus(acc)}
                title={acc.is_active === 1 ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                className={`p-1.5 rounded-lg text-xs font-bold ${acc.is_active === 1 ? 'bg-amber-100 hover:bg-amber-200 text-amber-900' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900'}`}
              >
                {acc.is_active === 1 ? '🚫' : '✅'}
              </button>

              <button
                onClick={() => handleDeleteAccount(acc)}
                title="حذف الحساب"
                className="p-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>

        {/* Children Render */}
        {children.length > 0 && (isExpanded || searchTerm.trim()) && (
          <div className="border-r-2 border-purple-200 pr-2 md:pr-4 mt-1 space-y-1">
            {children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  const rootNodes = accountsWithRollupBalances.filter(a => !a.parent_id || a.level === 1);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-lg border border-purple-800/40">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-3">
              <span className="p-2 bg-purple-800/50 rounded-xl border border-purple-500/30">👑</span>
              الدليل المحاسبي وشجرة الحسابات الديناميكية
            </h1>
            <p className="text-purple-200 text-sm mt-1">
              شجرة محاسبية هرمية مرنة وغير محدودة الفروع مع الترقيم التوقعي التلقائي وإدارة الأرصدة التجميعية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenAddModal(null)}
              className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-black px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 min-h-[44px]"
            >
              <span>+</span> إضافة حساب رئيسي
            </button>

            <button
              onClick={handleOpenAuditModal}
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-xl border border-white/20 flex items-center gap-2 min-h-[44px]"
            >
              📋 سجل التعديلات
            </button>
          </div>
        </div>
      </div>

      {/* Control & Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <input
              type="text"
              placeholder="🔍 ابحث برقم الكود، اسم الحساب، أو النوع..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-purple-500 min-h-[44px]"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 text-xs font-bold">
                ✕ تفريغ
              </button>
            )}
          </div>

          {/* Account Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-purple-500 min-h-[44px]"
            >
              <option value="ALL">جميع أنواع الحسابات</option>
              {accountTypesList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Max Level Depth Filter */}
          <div>
            <select
              value={maxDepthFilter}
              onChange={e => setMaxDepthFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-purple-500 min-h-[44px]"
            >
              <option value="ALL">عرض جميع المستويات</option>
              <option value="1">المستوى 1 (الرئيسي)</option>
              <option value="2">حتى المستوى 2</option>
              <option value="3">حتى المستوى 3</option>
              <option value="4">حتى المستوى 4</option>
            </select>
          </div>
        </div>

        {/* Tree Tools Shortcuts */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button onClick={expandAll} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold">
              📂 فتح الكل
            </button>
            <button onClick={collapseAll} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold">
              📁 إغلاق الكل
            </button>
          </div>

          <div className="text-xs text-slate-500 font-bold">
            إجمالي الحسابات: <span className="text-purple-900 font-mono text-sm">{accountsWithRollupBalances.length}</span> (تجميعي: {accountsWithRollupBalances.filter(a=>a.is_group===1).length} | حركة: {accountsWithRollupBalances.filter(a=>a.is_group===0).length})
          </div>
        </div>
      </div>

      {/* Main Hierarchical Tree View Container */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 min-h-[400px]">
        {rootNodes.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-2">📄</p>
            <p className="text-lg font-bold">لا توجد حسابات مطابقة للبحث</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rootNodes.map(root => renderTreeNode(root))}
          </div>
        )}
      </div>

      {/* MODAL: Add / Edit Account */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn my-8">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span>{editingAccount ? '✏️ تعديل بيانات حساب' : '✨ إضافة حساب محاسبي جديد'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-xl font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Parent Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">الحساب الأب (Parent Account)</label>
                <select
                  value={formData.parent_id}
                  onChange={e => handleParentChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-medium bg-slate-50 focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                >
                  <option value="">-- حساب رئيسي بدون أب (Level 1) --</option>
                  {accountsWithRollupBalances.filter(a => String(a.id) !== String(formData.id)).map(a => (
                    <option key={a.id} value={a.id}>
                      { '—'.repeat(Math.max(0, (parseInt(a.level) || 1) - 1)) } {a.code} - {a.name} ({a.account_type})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">تغيير الحساب الأب يحدد نوع الحساب ويقترح الكود التلقائي المناسب.</span>
              </div>

              {/* Code & Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">كود الحساب (رمز الترقيم) *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="مثال: 1.01.01"
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-sm font-bold bg-white focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">اسم الحساب (عربي) *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: صندوق فرع المعرض"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-medium bg-white focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                  />
                </div>
              </div>

              {/* English Name & Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">اسم الحساب (بالإنجليزية اختياري)</label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                    placeholder="e.g. Showroom Cash Box"
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-sm bg-white focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">نوع الحساب</label>
                  <select
                    value={formData.account_type}
                    onChange={e => setFormData({ ...formData, account_type: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-medium bg-white focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                  >
                    {accountTypesList.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Nature & Group/Posting Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">طبيعة الحساب</label>
                  <select
                    value={formData.nature}
                    onChange={e => setFormData({ ...formData, nature: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-medium bg-white focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                  >
                    <option value="debit">مدين (Debit)</option>
                    <option value="credit">دائن (Credit)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">فئة الحساب</label>
                  <select
                    value={formData.is_group}
                    onChange={e => setFormData({ ...formData, is_group: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-medium bg-white focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                  >
                    <option value={0}>حساب حركة / مباشر (Posting Account)</option>
                    <option value={1}>حساب تجميعي / أب (Group Account)</option>
                  </select>
                </div>
              </div>

              {/* Balance & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">الرصيد الافتتاحي</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.balance}
                    onChange={e => setFormData({ ...formData, balance: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-sm bg-white focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">حالة الحساب</label>
                  <select
                    value={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-medium bg-white focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                  >
                    <option value={1}>نشط (Active)</option>
                    <option value={0}>معطل (Disabled)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">ملاحظات / وصف الحساب</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أدخل أي تفاصيل أو ملاحظات إضافية..."
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-sm min-h-[44px]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-sm shadow-md min-h-[44px]"
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
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <h3 className="text-lg font-bold">👁️ تفاصيل الحساب المحاسبي</h3>
              <button onClick={() => setSelectedDetailAcc(null)} className="text-slate-400 hover:text-white text-xl font-bold">✕</button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-bold">كود الحساب:</span>
                <span className="font-mono font-bold text-purple-900">{selectedDetailAcc.code}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-bold">اسم الحساب:</span>
                <span className="font-bold text-slate-900">{selectedDetailAcc.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-bold">نوع الحساب:</span>
                <span>{selectedDetailAcc.account_type}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-bold">الفئة:</span>
                <span>{selectedDetailAcc.is_group === 1 ? 'حساب تجميعي (Group)' : 'حساب حركة (Posting)'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-bold">الطبيعة المحاسبية:</span>
                <span>{selectedDetailAcc.nature === 'debit' ? 'مدين (Debit)' : 'دائن (Credit)'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-bold">الرصيد:</span>
                <span className="font-bold font-mono text-emerald-700">{selectedDetailAcc.rollupBalance || selectedDetailAcc.balance} {(currency && currency.display) ? currency.display : '$'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-bold">الحالة:</span>
                <span>{selectedDetailAcc.is_active === 1 ? 'نشط' : 'معطل'}</span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t text-left">
              <button onClick={() => setSelectedDetailAcc(null)} className="px-5 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Audit Logs */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <h3 className="text-lg font-bold">📋 سجل التعديلات المحاسبية (Audit Log)</h3>
              <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-white text-xl font-bold">✕</button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {auditLogs.length === 0 ? (
                <p className="text-center text-slate-400 py-8 font-bold">لا توجد سجلات تعديلات سابقة.</p>
              ) : (
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 border-b">
                    <tr>
                      <th className="p-2">التاريخ</th>
                      <th className="p-2">المستخدم</th>
                      <th className="p-2">كود الحساب</th>
                      <th className="p-2">الإجراء</th>
                      <th className="p-2">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-2 font-mono">{log.created_at}</td>
                        <td className="p-2 font-bold">{log.user_name || 'المستخدم'}</td>
                        <td className="p-2 font-mono font-bold text-purple-900">{log.account_code}</td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action === 'create' ? 'bg-emerald-100 text-emerald-800' :
                            log.action === 'update' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-2 truncate max-w-xs">{log.new_value || log.old_value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t text-left">
              <button onClick={() => setShowAuditModal(false)} className="px-5 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm">إغلاق</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
