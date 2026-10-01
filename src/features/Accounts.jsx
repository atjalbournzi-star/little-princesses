// Accounts.jsx - المنسق والمجمع الرئيسي لدليل الحسابات وشجرة الحسابات
// يعتمد على: accounts/hooks/ و accounts/components/ المحملة قبله في index.html
const { useState, useEffect } = React;

function Accounts({
  accounts = [], setAccounts,
  journal = [], setJournal,
  vouchers = [], setVouchers,
  showToast,
  currency = { display: 'YER ﷼', symbol: '﷼', code: 'YER' }
}) {
  // ── إعداد العملة ─────────────────────────────────────────────────────────
  const activeTargetCurr = window.CurrencyService
    ? window.CurrencyService.normalizeCode(currency)
    : (typeof currency === 'string' ? currency : (currency?.code || 'YER'));
  const isBaseCurrency = activeTargetCurr === 'YER';
  const currDef = window.CurrencyService
    ? window.CurrencyService.getCurrencyDef(activeTargetCurr)
    : { code: 'YER', display: 'YER ﷼', symbol: '﷼', decimals: 0 };

  // ── حالة واجهة المستخدم ───────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [maxDepthFilter, setMaxDepthFilter] = useState('ALL');
  const [expandedNodes, setExpandedNodes] = useState({
    '1': true, '2': true, '3': true, '4': true, '5': true,
    '101': true, '102': true, '103': true, '104': true, '105': true, '106': true,
    '201': true, '301': true, '302': true, '401': true, '402': true, '501': true, '502': true,
    '1111': true, '1112': true, '1121': true, '1131': true, '1141': true, '1151': true, '1152': true, '1153': true,
    '2111': true, '2121': true, '2131': true, '3111': true, '3112': true,
    '4111': true, '4121': true, '4211': true,
    '5111': true, '5121': true, '5211': true, '5221': true,
    'ACC-1': true, 'ACC-2': true, 'ACC-3': true, 'ACC-4': true, 'ACC-5': true,
    'ACC-101': true, 'ACC-102': true, 'ACC-201': true
  });

  // ── حالة النوافذ والنماذج ────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [editingAccount, setEditingAccount] = useState(null);
  const [selectedDetailAcc, setSelectedDetailAcc] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'table'

  // ── نموذج الإضافة والتعديل ────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    id: null, code: '', name: '', name_en: '',
    account_type: 'أصول', parent_id: '', nature: 'debit',
    is_group: 0, is_active: 1, balance: '0', notes: ''
  });

  // ── خطاف البيانات: التطبيع، الهيكلة الهرمية، الفلترة ──────────────────
  const { accountsWithRollupBalances, isChildOf, rootNodes, filterMatches } = useAccountsData({
    accounts, journal, searchTerm, filterType, maxDepthFilter
  });

  // ── التوسيع التلقائي للحسابات الأب عند تحميل البيانات ────────────────────
  useEffect(() => {
    if (accountsWithRollupBalances && accountsWithRollupBalances.length > 0) {
      setExpandedNodes(prev => {
        let changed = false;
        const next = { ...prev };
        accountsWithRollupBalances.forEach(a => {
          if (a.hasChildren || a.is_group === 1 || Number(a.level) <= 2) {
            const c = cleanCode(a.code || a.id);
            if (!next[c] || !next[a.id] || !next[`ACC-${c}`]) {
              next[c] = true; next[a.id] = true; next[`ACC-${c}`] = true;
              changed = true;
            }
          }
        });
        return changed ? next : prev;
      });
    }
  }, [accountsWithRollupBalances]);

  // ── خطاف الإجراءات: الحفظ، الحذف، المزامنة، فتح النوافذ ─────────────────
  const {
    fetchFreshAccounts, handleSyncCloudAccounts, handleCleanResetAccounts,
    handleOpenAddModal, handleOpenAddExpenseModal, handleOpenAddPartnerModal,
    handleOpenEditModal, handleParentChange, handleSaveAccount,
    handleToggleStatus, handleDeleteAccount, handleOpenAuditModal
  } = useAccountActions({
    accounts, setAccounts, setJournal, setVouchers, showToast,
    accountsWithRollupBalances, setExpandedNodes,
    formData, setFormData, editingAccount, setEditingAccount,
    setShowModal, setAuditLogs, setShowAuditModal, setIsSyncing, setIsResetting
  });

  // ── تحميل البيانات الأولي ────────────────────────────────────────────────
  useEffect(() => { fetchFreshAccounts(); }, []);

  // ── التحكم في طي/فتح العقد الشجرية ─────────────────────────────────────
  const toggleExpand = (codeOrId) => {
    const c = cleanCode(codeOrId);
    setExpandedNodes(prev => ({
      ...prev,
      [codeOrId]: !prev[codeOrId],
      [c]: !prev[c],
      [`ACC-${c}`]: !prev[`ACC-${c}`]
    }));
  };

  const expandAll = () => {
    const all = {};
    accountsWithRollupBalances.forEach(a => {
      const c = cleanCode(a.code || a.id);
      all[a.id] = true; all[a.code] = true; all[c] = true; all[`ACC-${c}`] = true;
    });
    setExpandedNodes(all);
  };

  const collapseAll = () => setExpandedNodes({});

  const handleMaxDepthChange = (depthVal) => {
    setMaxDepthFilter(depthVal);
    if (depthVal === '1') collapseAll();
    else if (depthVal === 'ALL' || depthVal === '4') expandAll();
    else {
      const maxLvl = Number(depthVal);
      const toExpand = {};
      accountsWithRollupBalances.forEach(a => {
        if (a.level < maxLvl) {
          const c = cleanCode(a.code || a.id);
          toExpand[a.id] = true; toExpand[a.code] = true; toExpand[c] = true; toExpand[`ACC-${c}`] = true;
        }
      });
      setExpandedNodes(toExpand);
    }
  };

  const handleFilterTypeChange = (typeVal) => {
    setFilterType(typeVal);
    if (typeVal !== 'ALL') expandAll();
  };

  // ── العرض ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">

      <AccountsHeader
        accountsWithRollupBalances={accountsWithRollupBalances}
        isSyncing={isSyncing} isResetting={isResetting}
        onSync={handleSyncCloudAccounts}
        onReset={handleCleanResetAccounts}
        onAddPartner={handleOpenAddPartnerModal}
        onAddExpense={handleOpenAddExpenseModal}
        onAddMain={() => handleOpenAddModal(null)}
        onAuditLog={handleOpenAuditModal}
        currency={activeTargetCurr} currDef={currDef} isBaseCurrency={isBaseCurrency}
      />

      <AccountsFilterBar
        searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        filterType={filterType} onFilterTypeChange={handleFilterTypeChange}
        maxDepthFilter={maxDepthFilter} onMaxDepthChange={handleMaxDepthChange}
        onExpandAll={expandAll} onCollapseAll={collapseAll}
        accountsWithRollupBalances={accountsWithRollupBalances}
      />

      {/* تبديل العرض: شجرة / جدول */}
      <div className="flex items-center gap-2">
        <button onClick={() => setViewMode('tree')} className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${viewMode === 'tree' ? 'bg-[#8F2A87] text-white border-[#8F2A87]' : 'bg-[#FAFAFB] text-[#25232A] border-[#E8E5EA] hover:bg-[#E8E5EA]'}`}>
          🌳 عرض شجري
        </button>
        <button onClick={() => setViewMode('table')} className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${viewMode === 'table' ? 'bg-[#8F2A87] text-white border-[#8F2A87]' : 'bg-[#FAFAFB] text-[#25232A] border-[#E8E5EA] hover:bg-[#E8E5EA]'}`}>
          📋 عرض جدولي
        </button>
      </div>

      {viewMode === 'tree' ? (
        <AccountsTreeView
          rootNodes={rootNodes}
          accountsWithRollupBalances={accountsWithRollupBalances}
          expandedNodes={expandedNodes} toggleExpand={toggleExpand}
          filterMatches={filterMatches} isChildOf={isChildOf}
          filterType={filterType} maxDepthFilter={maxDepthFilter} searchTerm={searchTerm}
          isBaseCurrency={isBaseCurrency} activeTargetCurr={activeTargetCurr} currDef={currDef}
          onOpenAddModal={handleOpenAddModal}
          onOpenAddExpenseModal={handleOpenAddExpenseModal}
          onOpenAddPartnerModal={handleOpenAddPartnerModal}
          onOpenEditModal={handleOpenEditModal}
          onToggleStatus={handleToggleStatus}
          onDeleteAccount={(acc) => handleDeleteAccount(acc, isChildOf)}
          onViewDetail={(acc) => setSelectedDetailAcc(acc)}
        />
      ) : (
        <AccountsTable
          accountsWithRollupBalances={accountsWithRollupBalances}
          isBaseCurrency={isBaseCurrency} activeTargetCurr={activeTargetCurr} currDef={currDef}
          onOpenEditModal={handleOpenEditModal}
          onToggleStatus={handleToggleStatus}
          onDeleteAccount={(acc) => handleDeleteAccount(acc, isChildOf)}
          onViewDetail={(acc) => setSelectedDetailAcc(acc)}
        />
      )}

      <AccountModal
        showModal={showModal} setShowModal={setShowModal}
        editingAccount={editingAccount}
        formData={formData} setFormData={setFormData}
        accountsWithRollupBalances={accountsWithRollupBalances}
        handleParentChange={handleParentChange}
        handleSaveAccount={handleSaveAccount}
      />

      <AccountStatementModal
        selectedDetailAcc={selectedDetailAcc} setSelectedDetailAcc={setSelectedDetailAcc}
        showAuditModal={showAuditModal} setShowAuditModal={setShowAuditModal}
        auditLogs={auditLogs}
        activeTargetCurr={activeTargetCurr} currDef={currDef} isBaseCurrency={isBaseCurrency}
      />

    </div>
  );
}
