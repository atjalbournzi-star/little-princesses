// AccountsTreeView.jsx - العرض الشجري التفاعلي لدليل الحسابات
// يعتمد على: cleanCode (accountHelpers.js) | Architectural Standard Compliant (< 220 lines)

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
    if (c.startsWith('1') || typeStr === 'أصول') return 'border-r-4 border-r-[#007F8C]';
    if (c.startsWith('2') || typeStr === 'خصوم') return 'border-r-4 border-r-[#C97300]';
    if (c.startsWith('3') || typeStr === 'حقوق ملكية') return 'border-r-4 border-r-[#8F2A87]';
    if (c.startsWith('4') || typeStr === 'إيرادات') return 'border-r-4 border-r-[#10b981]';
    if (c.startsWith('5') || c.startsWith('6') || typeStr === 'مصروفات') return 'border-r-4 border-r-[#D64545]';
    return 'border-r-4 border-r-[#8F2A87]';
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

    // Business Rules: منع حذف حساب له رصيد مالي أو تتفرع منه حسابات فرعية
    const hasBalance = Math.abs(parseFloat(acc.balance || 0)) > 0.001 || (isGroup && Math.abs(parseFloat(acc.rollupBalance || 0)) > 0.001);
    const cannotDelete = children.length > 0 || hasBalance;

    const shouldRenderChildren = children.length > 0 && (
      (maxDepthFilter === 'ALL' && isExpanded) ||
      (maxDepthFilter !== 'ALL' && Number(maxDepthFilter) > acc.level && isExpanded) ||
      searchTerm.trim()
    );

    return (
      <div key={`${acc.id || acc.code}-${cCode}`} className={`relative ${isSubChild ? "before:content-[''] before:absolute before:right-[-12px] md:before:right-[-16px] before:top-4 before:w-3 md:before:w-4 before:h-0 before:border-t-2 before:border-[#8F2A87]/20 dark:before:border-[#8F2A87]/30" : "my-1.5"}`}>
        <div className={`group/row flex items-center justify-between rounded-xl border transition-all ${
          isLevel1
            ? `bg-[#FAFAFB] dark:bg-[#25222E] border-[#E8E5EA] dark:border-[#2D2A36] p-3 shadow-xs font-bold ${getLevel1Border(cCode, acc.account_type)}`
            : isGroup
              ? 'bg-[#FAFAFB]/80 dark:bg-[#25222E]/80 border-[#E8E5EA] dark:border-[#2D2A36] py-2 px-3 font-bold'
              : 'bg-white dark:bg-[#1E1B24] border-[#E8E5EA] dark:border-[#2D2A36] hover:bg-[#FAFAFB] dark:hover:bg-[#25222E] py-1.5 px-3'
        } ${acc.is_active === 0 ? 'opacity-50 bg-rose-50/40 dark:bg-rose-950/20' : ''}`}>

          {/* تفاصيل الحساب والبادج */}
          <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
            {children.length > 0 ? (
              <button onClick={() => toggleExpand(acc.id || acc.code)}
                title={isExpanded ? "طي الفروع" : "فتح الفروع"}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-[#25222E] border border-[#E8E5EA] dark:border-[#2D2A36] text-[#25232A] dark:text-[#E2DFE7] hover:bg-[#FAFAFB] dark:hover:bg-[#2F2B3B] text-xs font-mono cursor-pointer transition shrink-0 shadow-2xs">
                {isExpanded ? '▼' : '◀'}
              </button>
            ) : (
              <span className="w-6 h-6 inline-flex items-center justify-center text-[#6F6B75] dark:text-[#9E9AA5] text-xs shrink-0">•</span>
            )}
            <div
              onClick={() => children.length > 0 && toggleExpand(acc.id || acc.code)}
              className={`flex items-center gap-1.5 min-w-0 ${children.length > 0 ? 'cursor-pointer hover:opacity-85 select-none' : ''}`}
              title={children.length > 0 ? (isExpanded ? "انقر للطي" : "انقر لعرض الفروع") : ""}>
              <span className="text-sm shrink-0">{isGroup ? '📁' : '📄'}</span>
              <span className="font-mono bg-[#F2E7F3]/70 dark:bg-[#38203B]/60 text-[#8F2A87] dark:text-[#E5CEE7] px-2 py-0.5 rounded-md text-xs font-bold tabular-nums shrink-0">{acc.code}</span>
              <span className={`truncate text-xs md:text-sm ${isGroup ? 'font-bold text-[#25232A] dark:text-[#F3F0F7]' : 'font-medium text-[#25232A] dark:text-[#E2DFE7]'}`}>{acc.name}</span>
              {children.length > 0 && (
                <span className="text-[10px] bg-[#F2E7F3]/50 dark:bg-[#38203B]/40 text-[#8F2A87] dark:text-[#E5CEE7] border border-[#E5CEE7]/60 dark:border-[#522956]/60 px-1.5 py-0.2 rounded-md font-mono font-bold shrink-0">
                  {children.length}
                </span>
              )}
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 ${
              isGroup
                ? 'bg-[#FFF1DC]/70 dark:bg-[#3A2D1B]/60 text-[#C97300] dark:text-[#E5A548] border border-[#FFE4B9]/60 dark:border-[#573F1C]'
                : 'bg-[#E2F5F7]/70 dark:bg-[#1B3439]/60 text-[#007F8C] dark:text-[#80D2DB] border border-[#C5ECF0]/60 dark:border-[#1E4D54]'
            }`}>
              {isGroup ? 'تجميعي' : 'حركة'}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 hidden sm:inline-block ${
              isDebit ? 'bg-[#E2F5F7]/70 dark:bg-[#1B3439]/60 text-[#007F8C] dark:text-[#80D2DB]' : 'bg-[#F2E7F3]/70 dark:bg-[#38203B]/60 text-[#8F2A87] dark:text-[#E5CEE7]'
            }`}>
              {isDebit ? 'مدين' : 'دائن'}
            </span>
            {acc.is_active === 0 && <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-[#D64545] dark:text-rose-300 px-2 py-0.5 rounded-md font-bold shrink-0">معطل</span>}
          </div>

          {/* الرصيد المالي + أزرار التحكم */}
          <div className="flex items-center gap-3 shrink-0 mr-2">
            <div className="text-left font-mono tabular-nums shrink-0 min-w-[130px] sm:min-w-[160px]">
              <div className="flex items-center justify-end gap-1.5">
                <span className={`text-xs md:text-sm font-extrabold ${Number(presentationBalance || 0) > 0 ? 'text-[#007F8C] dark:text-[#80D2DB]' : (Number(presentationBalance || 0) < 0 ? 'text-[#D64545] dark:text-rose-400' : 'text-[#6F6B75] dark:text-[#9E9AA5]')}`}>
                  {Number(presentationBalance || 0).toLocaleString('en-US', { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits })}
                </span>
                <span className="text-[10px] font-bold text-[#6F6B75] dark:text-[#A09CA6] inline-block text-left w-12 shrink-0">{safeCurr.code || 'YER'} {safeCurr.symbol || '﷼'}</span>
              </div>
              {!isBaseCurrency && Number(baseBalance || 0) !== 0 && (
                <div className="text-[10px] font-medium text-[#6F6B75] dark:text-[#9E9AA5] text-left truncate" title="الرصيد الدفتري الأساسي">
                  ({Number(baseBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} YER)
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Business Rule 1: حصر زر إضافة الفرع على الحسابات التجميعية فقط */}
              {isGroup && (
                <button
                  type="button"
                  onClick={() => onOpenAddModal(acc.id || acc.code)}
                  title="إضافة حساب فرعي تحت هذا الحساب التجميعي"
                  className="px-2 py-1 bg-[#8F2A87] hover:bg-[#782271] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition shrink-0"
                >
                  <span className="font-extrabold">+</span> <span>فرع</span>
                </button>
              )}

              {/* أزرار التحكم الثانوية: تظهر بنعومة عند تمرير الفأرة فوق السطر لتقليل التزاحم البصري */}
              <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                <button onClick={() => onOpenEditModal(acc)} title="تعديل الحساب" className="w-7 h-7 bg-[#FAFAFB] dark:bg-[#25222E] hover:bg-[#E8E5EA] dark:hover:bg-[#353040] text-[#25232A] dark:text-[#E2DFE7] rounded-lg text-xs font-bold border border-[#E8E5EA] dark:border-[#2D2A36] flex items-center justify-center cursor-pointer transition">✏️</button>
                <button onClick={() => onViewDetail(acc)} title="عرض التفاصيل وكشف الحساب" className="w-7 h-7 bg-[#E2F5F7]/70 dark:bg-[#1B3439]/50 hover:bg-[#C5ECF0] dark:hover:bg-[#1E4D54] text-[#007F8C] dark:text-[#80D2DB] rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition">👁️</button>
                <button onClick={() => onToggleStatus(acc)} title={acc.is_active === 1 ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                  className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition ${acc.is_active === 1 ? 'bg-[#FFF1DC]/70 dark:bg-[#3A2D1B]/50 hover:bg-[#FFE4B9] dark:hover:bg-[#4E3A20] text-[#C97300] dark:text-[#E5A548]' : 'bg-[#E2F5F7]/70 dark:bg-[#1B3439]/50 hover:bg-[#C5ECF0] dark:hover:bg-[#1E4D54] text-[#007F8C] dark:text-[#80D2DB]'}`}>
                  {acc.is_active === 1 ? '🚫' : '✅'}
                </button>

                {/* Business Rule 2: تعطيل زر الحذف إذا كان للحساب فروع أو رصيد مالي */}
                <button
                  onClick={() => !cannotDelete && onDeleteAccount(acc)}
                  disabled={cannotDelete}
                  title={cannotDelete ? (children.length > 0 ? "لا يمكن حذف حساب تتفرع منه حسابات تابعة" : "لا يمكن حذف حساب يحتوي على رصيد مالي مسجل") : "حذف الحساب"}
                  className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition ${
                    cannotDelete
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 opacity-40 cursor-not-allowed border border-gray-200 dark:border-gray-700'
                      : 'bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-[#D64545] dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 cursor-pointer'
                  }`}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* فروع الحساب التابعة مع خطوط الربط الشجرية الدقيقة */}
        {shouldRenderChildren && (
          <div className="relative border-r-2 border-[#8F2A87]/20 dark:border-[#8F2A87]/30 mr-3.5 md:mr-5 pr-3 md:pr-4 space-y-1.5 mt-1">
            {children
              .filter(child => maxDepthFilter === 'ALL' || child.level <= Number(maxDepthFilter))
              .map(child => renderTreeNode(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-[#1E1B24] rounded-2xl p-4 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#E8E5EA] dark:border-[#2D2A36] min-h-[400px]">
      {rootNodes.length === 0 ? (
        <div className="text-center py-16 text-[#6F6B75] dark:text-[#9E9AA5]">
          <p className="text-4xl mb-2">📄</p>
          <p className="text-sm font-bold">لا توجد حسابات مطابقة للبحث</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rootNodes.map(root => renderTreeNode(root, false))}
        </div>
      )}
    </div>
  );
}

window.AccountsTreeView = AccountsTreeView;

