// src/features/customers/components/CustomersFilterBar.jsx
// شريط البحث الموحد والفلترة والفرز لشاشة العملاء (CRM)

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
    <div className="h-8 px-2 flex items-center gap-1.5 mb-1 shrink-0 bg-[#111C38] border border-slate-800 rounded-lg select-none" dir="rtl">
      {/* حقل البحث الذكي النظيف بدون placeholder مع أيقونة SVG خطية نحيفة */}
      <div className="relative flex-1 min-w-[140px]">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-6 pl-5 pr-6 rounded-md border border-slate-700/80 bg-[#0F172A] text-[11px] font-medium text-white placeholder-slate-400 outline-none focus:border-pink-500 transition"
          dir="rtl"
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white cursor-pointer font-bold"
            title="مسح البحث"
          >
            ✕
          </button>
        )}
      </div>

      {/* أزرار الفلترة حسب الفئة والفرز بارتفاع مدمج h-6 */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center gap-1">
          {categories.map(cat => {
            const isSelected = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`h-6 text-[10.5px] px-2 rounded-md border font-medium transition cursor-pointer whitespace-nowrap flex items-center ${
                  isSelected
                    ? 'border-pink-500/80 bg-pink-600 text-white shadow-xs'
                    : 'border-slate-700/80 bg-[#0F172A] text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* قائمة الترتيب والفرز بارتفاع مدمج h-6 */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="h-6 text-[11px] px-2 rounded-md border border-slate-700/80 bg-[#0F172A] font-medium text-slate-200 outline-none cursor-pointer transition hover:border-slate-600 focus:border-pink-500"
        >
          <option value="recent">الأحدث تسجيلاً</option>
          <option value="oldest">الأقدم تسجيلاً</option>
          <option value="name">الاسم أبجدياً</option>
          <option value="remaining">الأعلى متبقياً</option>
        </select>

        {/* شارة عدد النتائج المؤطرة في أقصى اليسار بارتفاع مدمج h-6 */}
        <div className="h-6 px-2 rounded-md bg-pink-950/70 border border-pink-800/60 flex items-center justify-center text-[10px] font-bold text-pink-200 font-mono shrink-0">
          {filteredCount} / {totalCount} عميل
        </div>
      </div>
    </div>
  );
}

window.CustomersFilterBar = CustomersFilterBar;
