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

  const selectCls = "h-10 px-3 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-semibold text-[#25232A] focus:bg-white focus:border-[#F28A00] outline-none transition cursor-pointer";

  return (
    <div className="flex flex-col gap-3 pb-3 border-b border-[#E8E5EA]">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={e => setSearch && setSearch(e.target.value)}
            placeholder="بحث بالبند، البيان، رقم المصروف، أو حساب الصرف..."
            className="w-full h-10 pr-9 pl-4 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#F28A00] outline-none transition text-right"
            dir="rtl"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6F6B75] pointer-events-none">
            <SearchIcon className="w-4 h-4" />
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
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
              className="h-10 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#D64545] border border-rose-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="إلغاء الفلترة"
            >
              <span>✕ تصفير</span>
            </button>
          )}

          {/* Results Badge */}
          <div className="h-10 px-3.5 rounded-xl bg-[#FFF1DC] text-[#C97300] border border-[#FFE4B9] flex items-center gap-1.5 text-xs font-bold">
            <span>النتائج:</span>
            <span className="font-mono">{filteredCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

window.ExpensesFilterBar = ExpensesFilterBar;
