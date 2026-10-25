// AccountsTreeView.jsx - العرض الشجري التفاعلي لدليل الحسابات
// الهوية البصرية المدمجة المطابقة لشاشة المنتجات (BOM) | High-Density Compact Tree Rows (< 220 lines)

function AccountsTreeView({
  rootNodes, accountsWithRollupBalances,
  expandedNodes, toggleExpand,
  filterMatches, isChildOf,
  filterType, maxDepthFilter, searchTerm,
  isBaseCurrency, activeTargetCurr, currDef,
  onOpenAddModal, onOpenAddExpenseModal, onOpenAddPartnerModal,
  onOpenEditModal, onToggleStatus, onDeleteAccount, onViewDetail
}) {
  const safeCurr = currDef || {};
  const rawDec = safeCurr.decimals;
  const safeDecimals = (typeof rawDec === 'number' && rawDec >= 0 && rawDec <= 20) ? Math.min(Math.floor(rawDec), 2) : 2;
  const minDigits = isBaseCurrency ? 0 : safeDecimals;
  const maxDigits = Math.max(minDigits, safeDecimals);

  const getChildrenOfNode = (parentAcc) =>
    accountsWithRollupBalances.filter(c => isChildOf(c, parentAcc));

  const getLevel1Border = (codeStr, typeStr) => {
    const c = String(codeStr || '');
    if (c.startsWith('1') || typeStr === 'أصول') return 'border-r-2 border-r-cyan-500';
    if (c.startsWith('2') || typeStr === 'خصوم') return 'border-r-2 border-r-amber-500';
    if (c.startsWith('3') || typeStr === 'حقوق ملكية') return 'border-r-2 border-r-pink-500';
    if (c.startsWith('4') || typeStr === 'إيرادات') return 'border-r-2 border-r-emerald-500';
    if (c.startsWith('5') || c.startsWith('6') || typeStr === 'مصروفات') return 'border-r-2 border-r-rose-500';
    return 'border-r-2 border-r-pink-500';
  };

  const renderTreeNode = (acc, isSubChild = false) => {
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
    const isLevel1 = Number(acc.level) === 1 || ['1', '2', '3', '4', '5'].includes(cCode);
    const baseBalance = isGroup ? acc.rollupBalance : acc.balance;
    const presentationBalance = isBaseCurrency
      ? baseBalance
      : (window.CurrencyService ? window.CurrencyService.fromBase(baseBalance, activeTargetCurr) : baseBalance);

    const hasBalance = Math.abs(parseFloat(acc.balance || 0)) > 0.001 || (isGroup && Math.abs(parseFloat(acc.rollupBalance || 0)) > 0.001);
    const cannotDelete = children.length > 0 || hasBalance;

    const shouldRenderChildren = children.length > 0 && (
      (maxDepthFilter === 'ALL' && isExpanded) ||
      (maxDepthFilter !== 'ALL' && Number(maxDepthFilter) > acc.level && isExpanded) ||
      searchTerm.trim()
    );

    return (
      <div key={`${acc.id || acc.code}-${cCode}`} className={`relative ${isSubChild ? "before:content-[''] before:absolute before:right-[-10px] md:before:right-[-14px] before:top-3.5 before:w-2.5 md:before:w-3.5 before:h-0 before:border-t-2 before:border-slate-500/80" : "my-0.5"}`}>
        <div className={`group/row flex items-center justify-between rounded-lg border transition-all duration-150 ${
          isLevel1
            ? `bg-slate-900/95 border-slate-700 py-1.5 px-2.5 shadow-xs font-bold hover:border-slate-500 hover:bg-slate-800 ${getLevel1Border(cCode, acc.account_type)}`
            : isGroup
              ? 'bg-slate-900/80 border-slate-700/80 py-1 px-2.5 font-bold hover:border-slate-600 hover:bg-slate-800/60'
              : 'bg-slate-900/50 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/50 py-0.5 px-2.5'
        } ${acc.is_active === 0 ? 'opacity-40 bg-rose-950/20' : ''}`}>

          {/* 1. تفاصيل الحساب: زر الطي + الأيقونة الخطية + الكود + الاسم كاملاً + الشارات */}
          <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
            {children.length > 0 ? (
              <button
                type="button"
                onClick={() => toggleExpand(acc.id || acc.code)}
                title={isExpanded ? "طي الفروع" : "فتح الفروع"}
                className="w-5 h-5 flex items-center justify-center rounded-md bg-slate-800 border border-slate-600 text-slate-100 hover:text-white hover:bg-slate-700 text-xs font-mono font-bold cursor-pointer transition shrink-0 shadow-xs"
              >
                {isExpanded ? '▾' : '◂'}
              </button>
            ) : (
              <span className="w-5 h-5 inline-flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">•</span>
            )}

            <div
              onClick={() => children.length > 0 && toggleExpand(acc.id || acc.code)}
              className={`flex items-center gap-1.5 min-w-0 ${children.length > 0 ? 'cursor-pointer select-none' : ''}`}
              title={children.length > 0 ? (isExpanded ? "انقر للطي" : "انقر لعرض الفروع") : ""}
            >
              {isGroup ? (
                <svg className="w-4 h-4 text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
              ) : (
                <svg className="w-4 h-4 text-slate-200 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              )}

              <span className="font-mono bg-slate-800 text-pink-300 border border-slate-600 px-1.5 py-0.5 rounded text-[11px] font-extrabold tabular-nums shrink-0 shadow-xs">
                {acc.code}
              </span>

              <span className="text-[12.5px] font-semibold text-white truncate" title={acc.name}>
                {acc.name}
              </span>

              {children.length > 0 && (
                <span className="text-[10px] bg-slate-800 text-slate-200 border border-slate-600 px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
                  {children.length}
                </span>
              )}
            </div>

            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 ${isGroup ? 'bg-amber-950/70 text-amber-300 border border-amber-600/60' : 'bg-emerald-950/70 text-emerald-300 border border-emerald-600/60'}`}>
              {isGroup ? 'تجميعي' : 'حركة'}
            </span>

            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 hidden sm:inline-block ${isDebit ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-600/60' : 'bg-purple-950/70 text-purple-300 border border-purple-600/60'}`}>
              {isDebit ? 'مدين' : 'دائن'}
            </span>

            {acc.is_active === 0 && (
              <span className="text-[10px] bg-rose-950/80 text-rose-200 border border-rose-600/70 px-2 py-0.5 rounded-md font-bold shrink-0">
                معطل
              </span>
            )}
          </div>

          {/* 2. الرصيد المالي الواضح النقي + أزرار الإجراءات المهذبة */}
          <div className="flex items-center gap-2 shrink-0 mr-2">
            <div className="text-left font-mono tabular-nums shrink-0 min-w-[110px] sm:min-w-[140px]">
              <div className="flex items-center justify-end gap-1">
                <span className="text-[12.5px] font-bold font-mono tracking-tight text-white">
                  {Number(presentationBalance || 0).toLocaleString('en-US', { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits })}
                </span>
                <span className="text-[11px] font-bold text-slate-200 inline-block text-left w-10 shrink-0 font-mono">
                  {safeCurr.code || 'YER'}
                </span>
              </div>
              {!isBaseCurrency && Number(baseBalance || 0) !== 0 && (
                <div className="text-[10px] font-semibold text-slate-300 text-left truncate font-mono">
                  ({Number(baseBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} YER)
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {isGroup && (
                <button
                  type="button"
                  onClick={() => onOpenAddModal(acc.id || acc.code)}
                  title="إضافة حساب فرعي"
                  className="h-5.5 px-2 bg-pink-600/25 hover:bg-pink-600 text-pink-200 hover:text-white rounded border border-pink-500/60 text-[10px] font-bold flex items-center gap-0.5 transition cursor-pointer shrink-0 opacity-90 group-hover/row:opacity-100 shadow-xs"
                >
                  <span className="font-extrabold">+</span> <span>فرع</span>
                </button>
              )}

              <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                <button type="button" onClick={() => onOpenEditModal(acc)} title="تعديل" className="w-6 h-6 rounded-md bg-slate-900 border border-slate-600 hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-center text-[11px] cursor-pointer transition shadow-xs">✏️</button>
                <button type="button" onClick={() => onViewDetail(acc)} title="كشف الحساب" className="w-6 h-6 rounded-md bg-slate-900 border border-slate-600 hover:bg-slate-800 text-cyan-300 flex items-center justify-center text-[11px] cursor-pointer transition shadow-xs">👁️</button>
                <button type="button" onClick={() => onToggleStatus(acc)} title={acc.is_active === 1 ? 'تعطيل' : 'تفعيل'} className="w-6 h-6 rounded-md bg-slate-900 border border-slate-600 hover:bg-slate-800 text-amber-300 flex items-center justify-center text-[11px] cursor-pointer transition shadow-xs">{acc.is_active === 1 ? '🚫' : '✅'}</button>
                <button
                  type="button"
                  onClick={() => !cannotDelete && onDeleteAccount(acc)}
                  disabled={cannotDelete}
                  title={cannotDelete ? (children.length > 0 ? "لا يمكن حذف حساب تتفرع منه فروع" : "لا يمكن حذف حساب به رصيد") : "حذف"}
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] transition shadow-xs ${
                    cannotDelete
                      ? 'bg-slate-900/50 text-slate-600 opacity-40 cursor-not-allowed border border-slate-800'
                      : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 border border-rose-600/70 cursor-pointer'
                  }`}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>

        {shouldRenderChildren && (
          <div className="relative border-r-2 border-slate-600/70 mr-2.5 sm:mr-3.5 pr-2 sm:pr-3 space-y-0.5 mt-0.5 transition-all duration-200">
            {children
              .filter(child => maxDepthFilter === 'ALL' || child.level <= Number(maxDepthFilter))
              .map(child => renderTreeNode(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#111C38] rounded-xl p-2.5 sm:p-3 border border-slate-800 min-h-[400px] select-none">
      {rootNodes.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-2xl mb-1">📄</p>
          <p className="text-xs font-semibold">لا توجد حسابات مطابقة للبحث والتصفية</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {rootNodes.map(root => renderTreeNode(root, false))}
        </div>
      )}
    </div>
  );
}

window.AccountsTreeView = AccountsTreeView;
