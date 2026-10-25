// src/features/products/components/ProductsFilterBar.jsx
// شريط البحث والتصفية والفرز لكتالوج الموديلات (Compact BOM Toolbar)

function ProductsFilterBar({
  search = "",
  setSearch,
  categoryFilter = "الكل",
  setCategoryFilter,
  collectionFilter = "الكل",
  setCollectionFilter,
  sortBy = "latest",
  setSortBy,
  availableCategories = [],
  availableCollections = [],
  filteredCount = 0,
  totalCount = 0
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800 shrink-0 select-none" dir="rtl">
      {/* Right: عنوان شريط السجل والعدد المصفى */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto">
        <h3 className="font-bold text-[11.5px] text-slate-800 dark:text-slate-100 whitespace-nowrap">
          سجل الموديلات والمنتجات
        </h3>
        <span className="text-[9.5px] bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 font-bold px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800/50 font-mono">
          {filteredCount} / {totalCount}
        </span>
      </div>

      {/* Left: أدوات التصفية والبحث في نسق مدمج ورشيق */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
        {/* 1. Category Filter */}
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="h-6 px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer transition hover:border-slate-300 dark:hover:border-slate-700"
        >
          <option value="الكل">جميع التصنيفات</option>
          {(availableCategories || []).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* 2. Collection Filter */}
        <select
          value={collectionFilter}
          onChange={e => setCollectionFilter(e.target.value)}
          className="h-6 px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer transition hover:border-slate-300 dark:hover:border-slate-700"
        >
          <option value="الكل">جميع التشكيلات</option>
          {(availableCollections || []).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* 3. Sort Dropdown */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="h-6 px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer transition hover:border-slate-300 dark:hover:border-slate-700"
        >
          <option value="latest">الأحدث</option>
          <option value="name">الاسم</option>
          <option value="price_asc">السعر (الأقل)</option>
          <option value="price_desc">السعر (الأعلى)</option>
          <option value="profit_desc">الأعلى ربحاً</option>
        </select>

        {/* 4. Search Input with linear geometric SVG icon */}
        <div className="relative flex-1 sm:w-48">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث في الموديلات..."
            className="pl-5 pr-6 h-6 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-medium w-full text-slate-900 dark:text-white focus:border-teal-600 dark:focus:border-teal-500 outline-none transition"
          />
          <svg className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

window.ProductsFilterBar = ProductsFilterBar;
