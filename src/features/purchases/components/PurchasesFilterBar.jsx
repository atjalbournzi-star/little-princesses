// src/features/purchases/components/PurchasesFilterBar.jsx
// شريط البحث والتصفية لسجل المشتريات (Compact Purchases Toolbar)

function PurchasesFilterBar({
  search = "",
  setSearch,
  payTypeFilter = "الكل",
  setPayTypeFilter,
  sortBy = "latest",
  setSortBy,
  filteredPurchasesCount = 0,
  totalCount = 0
}) {
  const count = filteredPurchasesCount || 0;
  const total = totalCount || count;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800 shrink-0 select-none" dir="rtl">
      {/* Right: عنوان شريط السجل والعدد المصفى */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto">
        <h3 className="font-bold text-[11.5px] text-slate-800 dark:text-slate-100 whitespace-nowrap">
          سجل فواتير المشتريات
        </h3>
        <span className="text-[9.5px] bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 font-bold px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800/50 font-mono">
          {count} {total > 0 && total !== count ? `/ ${total}` : ''}
        </span>
      </div>

      {/* Left: أدوات التصفية والبحث في نسق مدمج ورشيق */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
        {/* تصفية طريقة الدفع */}
        <select
          value={payTypeFilter}
          onChange={e => setPayTypeFilter && setPayTypeFilter(e.target.value)}
          className="h-6 px-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[10.5px] font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition"
        >
          <option value="الكل">جميع طرق الدفع</option>
          <option value="نقدي">نقدي</option>
          <option value="آجل">آجل (ذمم)</option>
          <option value="حوالة بنكية">حوالة بنكية</option>
        </select>

        {/* ترتيب النتائج */}
        <select
          value={sortBy}
          onChange={e => setSortBy && setSortBy(e.target.value)}
          className="h-6 px-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[10.5px] font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition"
        >
          <option value="latest">الأحدث</option>
          <option value="oldest">الأقدم</option>
          <option value="amount_desc">المبلغ (الأعلى)</option>
          <option value="amount_asc">المبلغ (الأقل)</option>
          <option value="supplier">المورد</option>
        </select>

        {/* حقل البحث */}
        <div className="relative flex-1 sm:w-44">
          <input
            type="text"
            value={search}
            placeholder="بحث برقم الفاتورة أو المورد..."
            onChange={e => setSearch(e.target.value)}
            className="w-full h-6 pl-5 pr-6 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-medium text-slate-900 dark:text-white focus:border-teal-600 dark:focus:border-teal-500 outline-none transition"
          />
          <svg className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

window.PurchasesFilterBar = PurchasesFilterBar;