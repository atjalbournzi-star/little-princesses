// src/features/products/components/ProductsHeader.jsx
// ترويسة استوديو الموديلات ومواصفات التشغيل وبطاقات المؤشرات المدمجة (BOM Header)

function ProductsHeader({
  stats = {},
  onOpenAdd,
  viewMode = 'table',
  onViewModeChange
}) {
  const currCode = (stats.currencyDisplay || "YER ﷼").split(' ')[0];

  return (
    <div className="shrink-0 space-y-1 select-none" dir="rtl">
      {/* 1. Sleek Single-Line Header Row */}
      <div className="h-8 min-h-[32px] px-2.5 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between shrink-0">
        {/* Right: Title + BOM badge */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 shrink-0">
            <svg className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>المنتجات ومواصفات التشغيل (BOM)</span>
          </div>
          <span className="text-[9.5px] bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 font-bold px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800/50 font-mono shrink-0">
            BOM Studio
          </span>
        </div>

        {/* Left: مفتاح العرض (جدول / بطاقات) وزر إضافة موديل جديد */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="h-6 p-0.5 bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-md flex items-center gap-0.5 text-[10.5px] font-medium">
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`h-5 px-1.5 rounded transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'table' ? 'bg-teal-600 text-white font-bold shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="عرض جدول البيانات"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>جدول</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`h-5 px-1.5 rounded transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'grid' ? 'bg-teal-600 text-white font-bold shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="عرض البطاقات"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>بطاقات</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenAdd}
            className="h-6 px-2 text-[10.5px] font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer"
            title="إضافة موديل جديد"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>إضافة موديل جديد</span>
          </button>
        </div>
      </div>

      {/* 2. شريط المؤشرات الإحصائية الأربعة المدمج - صف أفقي واحد متناسق تماماً */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 my-0.5 shrink-0">
        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">إجمالي الموديلات</span>
          <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
            {(stats.totalModels || 0).toLocaleString('en-US')} <span className="text-[9.5px] text-slate-500 dark:text-slate-400">موديل</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">متوسط تكلفة التصنيع</span>
          <span dir="ltr" className="text-[11px] font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
            {(stats.avgCost || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} {currCode}
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">متوسط سعر البيع</span>
          <span dir="ltr" className="text-[11px] font-bold text-teal-600 dark:text-teal-400 font-mono tracking-tight">
            {(stats.avgSellPrice || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} {currCode}
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">متوسط هامش الربح</span>
          <span dir="ltr" className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            +{(stats.avgProfit || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} {currCode}
          </span>
        </div>
      </div>
    </div>
  );
}

window.ProductsHeader = ProductsHeader;
window.BOMHeader = ProductsHeader;
