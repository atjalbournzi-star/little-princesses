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
    <div className="h-7 px-2 flex items-center gap-1.5 mb-1 shrink-0 bg-[#111C38] border border-slate-800 rounded-lg select-none" dir="rtl">
      {/* 1. Search Input */}
      <div className="relative flex-1 min-w-[150px]">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-6 pl-5 pr-6 rounded-md border border-slate-700 bg-slate-900 text-xs font-medium text-white placeholder:text-slate-400 outline-none focus:border-pink-500"
          placeholder="بحث بالاسم، الكود، الباركود، القماش..."
        />
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">🔍</span>
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* 2. Category Filter */}
      <select
        value={categoryFilter}
        onChange={e => setCategoryFilter(e.target.value)}
        className="h-6 px-1.5 rounded-md border border-slate-700 bg-slate-900 text-[10.5px] font-semibold text-white outline-none shrink-0 cursor-pointer"
      >
        <option value="الكل">جميع التصنيفات</option>
        {(availableCategories || []).map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* 3. Collection Filter */}
      <select
        value={collectionFilter}
        onChange={e => setCollectionFilter(e.target.value)}
        className="h-6 px-1.5 rounded-md border border-slate-700 bg-slate-900 text-[10.5px] font-semibold text-white outline-none shrink-0 cursor-pointer"
      >
        <option value="الكل">جميع التشكيلات</option>
        {(availableCollections || []).map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* 4. Sort Dropdown */}
      <select
        value={sortBy}
        onChange={e => setSortBy(e.target.value)}
        className="h-6 px-1.5 rounded-md border border-slate-700 bg-slate-900 text-[10.5px] font-semibold text-pink-400 outline-none shrink-0 cursor-pointer"
      >
        <option value="latest">الأحدث</option>
        <option value="name">الاسم</option>
        <option value="price_asc">السعر (الأقل)</option>
        <option value="price_desc">السعر (الأعلى)</option>
        <option value="profit_desc">الأعلى ربحاً</option>
      </select>

      {/* 5. Record Counter Chip */}
      <div className="h-6 px-2 rounded-md bg-pink-950/60 border border-pink-700/60 flex items-center justify-center text-[10.5px] font-bold text-pink-300 font-mono shrink-0">
        {filteredCount} / {totalCount}
      </div>
    </div>
  );
}

window.ProductsFilterBar = ProductsFilterBar;
