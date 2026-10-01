// AccountsTreeView.jsx - العرض الشجري التفاعلي لدليل الحسابات
// يعتمد على: cleanCode (accountHelpers.js)

function AccountsTreeView({
  rootNodes, accountsWithRollupBalances,
  expandedNodes, toggleExpand,
  filterMatches, isChildOf,
  filterType, maxDepthFilter, searchTerm,
  isBaseCurrency, activeTargetCurr, currDef,
  onOpenAddModal, onOpenAddExpenseModal, onOpenAddPartnerModal,
  onOpenEditModal, onToggleStatus, onDeleteAccount, onViewDetail
}) {

  const getChildrenOfNode = (parentAcc) =>
    accountsWithRollupBalances.filter(c => isChildOf(c, parentAcc));

  const renderTreeNode = (acc) => {
    const children = getChildrenOfNode(acc);
    const cCode = cleanCode(acc.code || acc.acc_code || acc.id);
    const isExpanded = !!expandedNodes[acc.id] || !!expandedNodes[acc.code] || !!expandedNodes[cCode] || !!expandedNodes[`ACC-${cCode}`];
    const isMatching = filterMatches(acc);
    const hasMatchingChild = children.some(c => filterMatches(c));

    if (maxDepthFilter !== 'ALL' && acc.level > Number(maxDepthFilter)) return null;
    if (filterType !== 'ALL' && !isMatching && !hasMatchingChild) return null;
    if (searchTerm.trim() && !isMatching && !hasMatchingChild) return null;

    const isGroup = acc.is_group === 1 || children.length > 0;
    const isDebit = acc.nature === 'debit';
    const baseBalance = isGroup ? acc.rollupBalance : acc.balance;
    const presentationBalance = isBaseCurrency
      ? baseBalance
      : (window.CurrencyService ? window.CurrencyService.fromBase(baseBalance, activeTargetCurr) : baseBalance);

    const shouldRenderChildren = children.length > 0 && (
      (maxDepthFilter === 'ALL' && isExpanded) ||
      (maxDepthFilter !== 'ALL' && Number(maxDepthFilter) > acc.level && isExpanded) ||
      searchTerm.trim()
    );

    return (
      <div key={`${acc.id || acc.code}-${cCode}`} className="mr-2 md:mr-3.5 my-1.5">
        <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
          isGroup ? 'bg-[#FAFAFB] border-[#E8E5EA] font-bold' : 'bg-white border-[#E8E5EA] hover:bg-[#FAFAFB]'
        } ${acc.is_active === 0 ? 'opacity-50 bg-rose-50/40' : ''}`}>

          <div className="flex items-center gap-2.5 overflow-hidden">
            {children.length > 0 ? (
              <button onClick={() => toggleExpand(acc.id || acc.code)}
                title={isExpanded ? "طي الحسابات الفرعية" : "فتح الحسابات الفرعية"}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-[#E8E5EA] text-[#25232A] hover:bg-[#FAFAFB] text-xs font-mono cursor-pointer transition shadow-2xs">
                {isExpanded ? '▼' : '◀'}
              </button>
            ) : (
              <span className="w-6 h-6 inline-block text-center text-[#6F6B75] text-xs">•</span>
            )}
            <div
              onClick={() => children.length > 0 && toggleExpand(acc.id || acc.code)}
              className={`flex items-center gap-2 ${children.length > 0 ? 'cursor-pointer hover:opacity-85 select-none transition' : ''}`}
              title={children.length > 0 ? (isExpanded ? "انقر للطي" : "انقر لعرض الفروع") : ""}>
              <span className="text-base">{isGroup ? '📁' : '📄'}</span>
              <span className="font-mono bg-[#F2E7F3] text-[#8F2A87] px-2 py-0.5 rounded-md text-xs font-bold">{acc.code}</span>
              <span className={`text-xs md:text-sm ${isGroup ? 'font-bold text-[#25232A]' : 'font-medium text-[#25232A]'}`}>{acc.name}</span>
              {children.length > 0 && (
                <span className="text-[10px] bg-[#F2E7F3] text-[#8F2A87] border border-[#E5CEE7] px-1.5 py-0.5 rounded-md font-mono font-bold">
                  {children.length} {children.length === 1 ? 'فرع' : 'فروع'}
                </span>
              )}
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${isGroup ? 'bg-[#FFF1DC] text-[#C97300] border border-[#FFE4B9]' : 'bg-[#E2F5F7] text-[#007F8C] border border-[#C5ECF0]'}`}>
              {isGroup ? 'تجميعي' : 'حركة'}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${isDebit ? 'bg-[#E2F5F7] text-[#007F8C]' : 'bg-[#F2E7F3] text-[#8F2A87]'}`}>
              {isDebit ? 'مدين' : 'دائن'}
            </span>
            {acc.is_active === 0 && <span className="text-[10px] bg-rose-100 text-[#D64545] px-2 py-0.5 rounded-md font-bold">معطل</span>}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left font-mono tabular-nums">
              <span className={`text-xs md:text-sm font-extrabold ${presentationBalance > 0 ? 'text-[#007F8C]' : (presentationBalance < 0 ? 'text-[#D64545]' : 'text-[#6F6B75]')}`}>
                {presentationBalance.toLocaleString('en-US', { minimumFractionDigits: isBaseCurrency ? 0 : (currDef.decimals || 2), maximumFractionDigits: (currDef.decimals !== undefined ? currDef.decimals : 2) })}{' '}
                <span className="text-[10px] font-medium text-[#6F6B75]">{currDef.display}</span>
              </span>
              {!isBaseCurrency && baseBalance !== 0 && (
                <span className="block text-[10px] font-medium text-[#6F6B75] font-mono" title="الرصيد الدفتري الأساسي بالريال اليمني">
                  ({baseBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} YER ﷼)
                </span>
              )}
              {acc.currency && acc.currency !== 'YER' && !isGroup && baseBalance !== 0 && (
                <span className="block text-[10px] font-bold text-amber-600 font-mono">
                  (الرصيد الأصلي: {Number(acc.foreign_balance !== undefined && acc.foreign_balance !== null ? acc.foreign_balance : (window.CurrencyService ? window.CurrencyService.fromBase(baseBalance, acc.currency) : (baseBalance / 142))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {acc.currency})
                </span>
              )}
              {isGroup && <span className="block text-[9px] text-[#6F6B75] text-center font-sans">إجمالي الفرع</span>}
            </div>

            <div className="flex items-center gap-1">
              {cleanCode(acc.code) === '6' || acc.name === 'المصروفات' ? (
                <button onClick={() => onOpenAddExpenseModal()} title="إضافة بند مصروف تشغيلي جديد" className="px-2.5 py-1 bg-[#C97300] hover:bg-[#A35D00] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition">
                  <span>💸</span> + بند مصروف
                </button>
              ) : cleanCode(acc.code) === '301' || acc.name.includes('رأس المال المباشر') ? (
                <>
                  <button onClick={() => onOpenAddPartnerModal()} title="إضافة شريك جديد (301.xx)" className="px-2.5 py-1 bg-[#007F8C] hover:bg-[#006670] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition">
                    <span>🤝</span> + شريك
                  </button>
                  <button onClick={() => onOpenAddModal(acc.id || acc.code)} className="px-2.5 py-1 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer">+ فرع</button>
                </>
              ) : (
                <button onClick={() => onOpenAddModal(acc.id || acc.code)} className="px-2.5 py-1 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer">+ فرع</button>
              )}
              <button onClick={() => onOpenEditModal(acc)} title="تعديل الحساب" className="w-7 h-7 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-lg text-xs font-bold border border-[#E8E5EA] flex items-center justify-center cursor-pointer">✏️</button>
              <button onClick={() => onViewDetail(acc)} title="عرض التفاصيل" className="w-7 h-7 bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C] rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer">👁️</button>
              <button onClick={() => onToggleStatus(acc)} title={acc.is_active === 1 ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer ${acc.is_active === 1 ? 'bg-[#FFF1DC] hover:bg-[#FFE4B9] text-[#C97300]' : 'bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C]'}`}>
                {acc.is_active === 1 ? '🚫' : '✅'}
              </button>
              <button onClick={() => onDeleteAccount(acc)} title="حذف الحساب" className="w-7 h-7 bg-rose-50 hover:bg-rose-100 text-[#D64545] rounded-lg text-xs font-bold border border-rose-200 flex items-center justify-center cursor-pointer">🗑️</button>
            </div>
          </div>
        </div>

        {shouldRenderChildren && (
          <div className="border-r-2 border-[#E5CEE7] pr-2 md:pr-4 mt-1 space-y-1">
            {children
              .filter(child => maxDepthFilter === 'ALL' || child.level <= Number(maxDepthFilter))
              .map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
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
  );
}
