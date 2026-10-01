// AccountsFilterBar.jsx - شريط الفلترة والبحث في دليل الحسابات
// يعتمد على: ACCOUNT_TYPES (constants.js)

function AccountsFilterBar({
  searchTerm, setSearchTerm,
  filterType, onFilterTypeChange,
  maxDepthFilter, onMaxDepthChange,
  onExpandAll, onCollapseAll,
  accountsWithRollupBalances
}) {
  const accountTypesList = typeof ACCOUNT_TYPES !== 'undefined'
    ? ACCOUNT_TYPES
    : ['أصول', 'خصوم', 'حقوق ملكية', 'إيرادات', 'تكلفة المبيعات', 'مصروفات', 'أخرى'];

  const totalCount = accountsWithRollupBalances.length;
  const groupCount = accountsWithRollupBalances.filter(a => a.is_group === 1).length;
  const postingCount = accountsWithRollupBalances.filter(a => a.is_group === 0).length;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#E8E5EA] space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        {/* حقل البحث */}
        <div className="md:col-span-2 relative">
          <input
            type="text"
            placeholder="🔍 ابحث برقم الكود، اسم الحساب، أو النوع..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl px-4 py-2.5 text-xs font-medium focus:bg-white focus:border-[#8F2A87] outline-none h-11"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3 top-3 text-[#6F6B75] hover:text-[#25232A] text-xs font-bold"
            >
              ✕ تفريغ
            </button>
          )}
        </div>

        {/* فلتر النوع */}
        <div>
          <select
            value={filterType}
            onChange={e => onFilterTypeChange(e.target.value)}
            className="w-full bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl px-3 py-2.5 text-xs font-medium focus:bg-white focus:border-[#8F2A87] outline-none h-11"
          >
            <option value="ALL">جميع أنواع الحسابات</option>
            {accountTypesList.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* فلتر المستوى */}
        <div>
          <select
            value={maxDepthFilter}
            onChange={e => onMaxDepthChange(e.target.value)}
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

      {/* شريط التحكم في الطي والفتح + الإحصاء */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E8E5EA]">
        <div className="flex items-center gap-2">
          <button
            onClick={onExpandAll}
            className="px-3 py-1.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-lg text-xs font-bold border border-[#E8E5EA] cursor-pointer"
          >
            📂 فتح الكل
          </button>
          <button
            onClick={onCollapseAll}
            className="px-3 py-1.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-lg text-xs font-bold border border-[#E8E5EA] cursor-pointer"
          >
            📁 إغلاق الكل
          </button>
        </div>

        <div className="text-xs text-[#6F6B75] font-bold">
          إجمالي الحسابات:{' '}
          <span className="text-[#8F2A87] font-mono text-xs">{totalCount}</span>
          {' '}(تجميعي: {groupCount} | حركة: {postingCount})
        </div>
      </div>
    </div>
  );
}
