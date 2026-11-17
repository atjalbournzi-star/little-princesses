// AccountsTreeView.jsx - العرض الشجري التفاعلي لدليل الحسابات
// الهوية البصرية المطابقة لشاشة السندات والمعاملات المالية | Standard Compliant (< 220 lines)

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
    if (c.startsWith('1') || typeStr === 'أصول') return 'border-r-2 border-r-teal-600 dark:border-r-teal-400';
    if (c.startsWith('2') || typeStr === 'خصوم') return 'border-r-2 border-r-amber-500';
    if (c.startsWith('3') || typeStr === 'حقوق ملكية') return 'border-r-2 border-r-indigo-500';
    if (c.startsWith('4') || typeStr === 'إيرادات') return 'border-r-2 border-r-emerald-500';
    if (c.startsWith('5') || c.startsWith('6') || typeStr === 'مصروفات') return 'border-r-2 border-r-rose-500';
    return 'border-r-2 border-r-teal-500';
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
      <div key={`${acc.id || acc.code}-${cCode}`} className={`relative ${isSubChild ? "before:content-[''] before:absolute before:right-[-10px] md:before:right-[-14px] before:top-4 before:w-2.5 md:before:w-3.5 before:h-0 before:border-t before:border-slate-300 dark:before:border-slate-700" : ""}`}>
        <div className={`group/row h-8 min-h-[32px] border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[11px] font-medium transition-colors flex items-center justify-between px-2 ${
          isLevel1 ? `bg-slate-50/70 dark:bg-slate-900/60 font-bold ${getLevel1Border(cCode, acc.account_type)}` : isGroup ? 'bg-slate-50/30 dark:bg-slate-900/30 font-semibold' : ''
        } ${acc.is_active === 0 ? 'opacity-40 bg-rose-50/20 dark:bg-rose-950/10' : ''}`}>

          {/* 1. تفاصيل الحساب: زر الطي + الأيقونة الخطية + الكود + الاسم كاملاً + الشارات */}
          <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
            {children.length > 0 ? (
              <button type="button" onClick={() => toggleExpand(acc.id || acc.code)} title={isExpanded ? "طي الفروع" : "فتح الفروع"} className="w-4.5 h-4.5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition cursor-pointer shrink-0">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={isExpanded ? "M19 9l-7 7-7-7" : "M15 19l-7-7 7-7"} /></svg>
              </button>
            ) : (
              <span className="w-4.5 h-4.5 inline-flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs shrink-0">•</span>
            )}

            <div onClick={() => children.length > 0 && toggleExpand(acc.id || acc.code)} className={`flex items-center gap-1.5 min-w-0 ${children.length > 0 ? 'cursor-pointer select-none' : ''}`} title={children.length > 0 ? (isExpanded ? "انقر للطي" : "انقر لعرض الفروع") : ""}>
              {isGroup ? (
                <svg className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              )}

              <span className="font-mono text-slate-600 dark:text-slate-400 font-medium text-[11px] shrink-0" dir="ltr">
                {acc.code}
              </span>

              <span className={`text-[11px] truncate ${isLevel1 ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-800 dark:text-slate-200'}`} title={acc.name}>
                {acc.name}
              </span>

              {children.length > 0 && (
                <span className="text-[9.5px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1 py-0.2 rounded font-mono font-medium shrink-0">
                  {children.length}
                </span>
              )}
            </div>

            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border shrink-0 ${isGroup ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60' : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60'}`}>
              {isGroup ? 'تجميعي' : 'حركة'}
            </span>

            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border shrink-0 hidden sm:inline-block ${isDebit ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60' : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'}`}>
              {isDebit ? 'مدين' : 'دائن'}
            </span>

            {acc.is_active === 0 && (
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded font-bold shrink-0">
                معطل
              </span>
            )}
          </div>

          {/* 2. الرصيد المالي + أزرار الإجراءات المهذبة */}
          <div className="flex items-center gap-1.5 shrink-0 mr-2">
            <div className="text-left font-mono tabular-nums shrink-0 min-w-[95px] sm:min-w-[125px]">
              <div className="flex items-center justify-end gap-1">
                <span className="text-xs font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                  {Number(presentationBalance || 0).toLocaleString('en-US', { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits })}
                </span>
                <span className="text-[9.5px] font-mono text-slate-500 dark:text-slate-400 w-7 shrink-0 text-left">
                  {safeCurr.code || 'YER'}
                </span>
              </div>
              {!isBaseCurrency && Number(baseBalance || 0) !== 0 && (
                <div className="text-[9.5px] text-slate-400 dark:text-slate-500 text-left truncate font-mono">
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
                  className="h-5 px-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 rounded border border-teal-200 dark:border-teal-800/60 text-[9.5px] font-medium flex items-center gap-0.5 transition cursor-pointer shrink-0"
                >
                  <span className="font-bold">+</span>
                  <span>فرع</span>
                </button>
              )}

              <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity">
                <button type="button" onClick={() => onOpenEditModal(acc)} title="تعديل الحساب" className="w-5.5 h-5.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center transition cursor-pointer shrink-0">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button type="button" onClick={() => onViewDetail(acc)} title="كشف الحساب" className="w-5.5 h-5.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-600 dark:text-teal-400 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center transition cursor-pointer shrink-0">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </button>
                <button type="button" onClick={() => onToggleStatus(acc)} title={acc.is_active === 1 ? 'تعطيل الحساب' : 'تفعيل الحساب'} className="w-5.5 h-5.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center transition cursor-pointer shrink-0">
                  {acc.is_active === 1 ? (
                    <svg className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  ) : (
                    <svg className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  )}
                </button>
                <button type="button" onClick={() => !cannotDelete && onDeleteAccount(acc)} disabled={cannotDelete} title={cannotDelete ? (children.length > 0 ? "لا يمكن حذف حساب تتفرع منه فروع" : "لا يمكن حذف حساب به رصيد") : "حذف"} className={`w-5.5 h-5.5 rounded flex items-center justify-center transition shrink-0 ${cannotDelete ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-40' : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 cursor-pointer'}`}>
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {shouldRenderChildren && (
          <div className="relative border-r border-slate-200 dark:border-slate-700/60 mr-2.5 sm:mr-3.5 pr-1.5 sm:pr-2.5 transition-all">
            {children
              .filter(child => maxDepthFilter === 'ALL' || child.level <= Number(maxDepthFilter))
              .map(child => renderTreeNode(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[400px] select-none">
      {rootNodes.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <svg className="w-7 h-7 mx-auto mb-1 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">لا توجد حسابات مطابقة للبحث والتصفية</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-800/60">
          {rootNodes.map(root => renderTreeNode(root, false))}
        </div>
      )}
    </div>
  );
}

window.AccountsTreeView = AccountsTreeView;
