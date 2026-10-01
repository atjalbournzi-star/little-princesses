// src/features/customers/components/CustomersFilterBar.jsx

function CustomersFilterBar({
  search, setSearch,
  categoryFilter, setCategoryFilter,
  sortBy, setSortBy,
  filteredCount = 0,
  totalCount = 0
}) {
  const categories = [
    { id: 'all', label: 'كافة العملاء' },
    { id: 'جديد', label: 'جدد' },
    { id: 'دائم', label: 'دائمون' },
    { id: 'VIP', label: 'VIP' }
  ];

  return (
    <div className="h-8 flex items-center gap-2 bg-[#111C38] border border-slate-800 rounded-xl px-2 shadow-xs select-none">
      {/* حقل البحث الذكي الفوري */}
      <div className="relative flex-1 min-w-[140px]">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث سريع بالاسم، الهاتف، أو كود العميل..."
          className="w-full h-6 pl-6 pr-6 rounded-lg bg-[#0F172A] border border-slate-700 text-xs font-medium text-slate-100 placeholder-slate-400 focus:border-pink-500 outline-none transition-all"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] pointer-events-none">
          🔍
        </span>
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-[10px] cursor-pointer"
            title="مسح البحث"
          >
            ✕
          </button>
        )}
      </div>

      {/* أزرار الفلترة حسب الفئة (كافة العملاء، جدد، دائمون، VIP) */}
      <div className="flex items-center gap-1 shrink-0">
        {categories.map(cat => {
          const isSelected = categoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`h-6 px-2.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center ${
                isSelected
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'bg-[#0F172A] text-slate-300 border border-slate-700/60 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* الترتيب وقائمة الفرز */}
      <div className="flex items-center gap-1 shrink-0">
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="h-6 px-1.5 rounded-lg bg-[#0F172A] border border-slate-700/60 text-[10.5px] font-semibold text-slate-200 outline-none cursor-pointer"
        >
          <option value="recent">الأحدث تسجيلاً ⏳</option>
          <option value="oldest">الأقدم تسجيلاً 📅</option>
          <option value="name">الاسم أبجدياً 🔤</option>
          <option value="remaining">الأعلى متبقياً 💰</option>
        </select>
      </div>

      {/* عداد النتائج المطابقة */}
      <div className="shrink-0 hidden sm:flex items-center bg-[#0F172A] px-2 py-0.5 rounded-md border border-slate-700/60" dir="rtl">
        <span className="text-[11px] text-slate-400 font-medium">{filteredCount} من {totalCount} عميل</span>
      </div>
    </div>
  );
}

window.CustomersFilterBar = CustomersFilterBar;
