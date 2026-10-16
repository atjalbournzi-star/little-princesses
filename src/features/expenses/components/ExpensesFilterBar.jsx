/**
 * ExpensesFilterBar.jsx
 * شريط البحث والفلترة الذكية للمصروفات التشغيلية
 * Little Princesses ERP - Architectural Standards Compliant
 */

function ExpensesFilterBar({
  search = '',
  setSearch,
  categoryFilter = 'الكل',
  setCategoryFilter,
  accountFilter = 'الكل',
  setAccountFilter,
  dateFilter = 'all',
  setDateFilter,
  filterOptions = { categories: [], accounts: [] },
  filteredCount = 0
}) {
  const SearchIcon = (window.Icons && window.Icons.Search) || (() => <span>🔍</span>);

  const hasActiveFilters = search.trim() !== '' || categoryFilter !== 'الكل' || accountFilter !== 'الكل' || dateFilter !== 'all';

  const handleResetFilters = () => {
    if (setSearch) setSearch('');
    if (setCategoryFilter) setCategoryFilter('الكل');
    if (setAccountFilter) setAccountFilter('الكل');
    if (setDateFilter) setDateFilter('all');
  };

  const selectCls = "h-7 px-2 rounded-md border border-slate-700/80 bg-[#0F172A] text-[11px] font-medium text-white focus:border-amber-500 outline-none transition cursor-pointer";

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-1.5 pb-2 border-b border-slate-800">
      {/* Search Input */}
      <div className="relative flex-1">
        <input
          type="text"
          value={search}
          onChange={e => setSearch && setSearch(e.target.value)}
          placeholder="بحث بالبند، البيان، رقم المصروف، أو حساب الصرف..."
          className="w-full h-7 pr-7 pl-2.5 rounded-md border border-slate-700/80 bg-[#0F172A] text-[11px] font-medium text-white placeholder:text-slate-400 focus:border-amber-500 outline-none transition text-right"
          dir="rtl"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <SearchIcon className="w-3 h-3" />
        </div>
      </div>

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter && setCategoryFilter(e.target.value)}
          className={selectCls}
        >
          <option value="الكل">كل التصنيفات والبنود</option>
          {(filterOptions.categories || []).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Account Filter */}
        <select
          value={accountFilter}
          onChange={e => setAccountFilter && setAccountFilter(e.target.value)}
          className={selectCls}
        >
          <option value="الكل">كل حسابات الصرف</option>
          {(filterOptions.accounts || []).map(acc => (
            <option key={acc} value={acc}>{acc}</option>
          ))}
        </select>

        {/* Date Filter */}
        <select
          value={dateFilter}
          onChange={e => setDateFilter && setDateFilter(e.target.value)}
          className={selectCls}
        >
          <option value="all">كل الفترات</option>
          <option value="today">مصروفات اليوم</option>
          <option value="month">مصروفات هذا الشهر</option>
        </select>

        {/* Reset Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="h-7 px-2 rounded-md bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-[11px] font-medium transition flex items-center gap-1 cursor-pointer"
            title="إلغاء الفلترة"
          >
            <span>✕ تصفير</span>
          </button>
        )}

        {/* Results Badge */}
        <div className="h-7 px-2 rounded-md bg-slate-800/80 text-amber-400 border border-slate-700/60 flex items-center gap-1 text-[11px] font-bold">
          <span className="text-slate-400 text-[10px]">النتائج:</span>
          <span className="font-mono">{filteredCount}</span>
        </div>
      </div>
    </div>
  );
}

window.ExpensesFilterBar = ExpensesFilterBar;
