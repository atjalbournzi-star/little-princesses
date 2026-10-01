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
    <div className="shrink-0 space-y-1.5 select-none" dir="rtl">
      {/* 1. Sleek Single-Line Header Row */}
      <div className="h-10 min-h-[40px] px-3 bg-[#111C38] border border-slate-800 rounded-xl flex items-center justify-between shrink-0">
        {/* Right: Title + BOM badge */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-xs font-bold text-white flex items-center gap-2 shrink-0">
            <span className="text-pink-500">🧮</span>
            <span>المنتجات ومواصفات التشغيل (BOM)</span>
          </div>
          <span className="text-[10px] bg-purple-950/70 text-purple-300 font-bold px-2 py-0.5 rounded-md border border-purple-800/50 font-mono shrink-0">
            BOM Studio
          </span>
        </div>

        {/* Left: View toggles (جدول / بطاقات) + Primary button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-7 p-0.5 bg-slate-900/90 border border-slate-700 rounded-lg flex items-center gap-1 text-[11px] font-medium text-slate-300">
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`h-6 px-2 rounded-md transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'table' ? 'bg-pink-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="عرض جدول البيانات"
            >
              <span>☰</span>
              <span>جدول</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`h-6 px-2 rounded-md transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'grid' ? 'bg-pink-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="عرض البطاقات"
            >
              <span>⊞</span>
              <span>بطاقات</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenAdd}
            className="h-7 px-2.5 text-xs font-semibold bg-pink-600 hover:bg-pink-700 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>+</span>
            <span>إضافة موديل جديد</span>
          </button>
        </div>
      </div>

      {/* 2. Standardized 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 my-1 shrink-0">
        <div className="p-2 rounded-xl bg-[#111C38] border border-slate-800 flex items-center justify-between">
          <span className="text-[10.5px] font-semibold text-slate-300">إجمالي الموديلات</span>
          <span className="text-sm font-black text-white font-mono tracking-tight">
            {(stats.totalModels || 0).toLocaleString('en-US')}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-[#111C38] border border-slate-800 flex items-center justify-between">
          <span className="text-[10.5px] font-semibold text-slate-300">متوسط تكلفة التصنيع</span>
          <span dir="ltr" className="text-sm font-bold text-white font-mono tracking-tight">
            {(stats.avgCost || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} {currCode}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-[#111C38] border border-slate-800 flex items-center justify-between">
          <span className="text-[10.5px] font-semibold text-slate-300">متوسط سعر البيع</span>
          <span dir="ltr" className="text-sm font-bold text-white font-mono tracking-tight">
            {(stats.avgSellPrice || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} {currCode}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-[#111C38] border border-slate-800 flex items-center justify-between">
          <span className="text-[10.5px] font-semibold text-slate-300">متوسط هامش الربح</span>
          <span dir="ltr" className="text-sm font-bold text-emerald-400 font-mono tracking-tight">
            +{(stats.avgProfit || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} {currCode}
          </span>
        </div>
      </div>
    </div>
  );
}

window.ProductsHeader = ProductsHeader;
window.BOMHeader = ProductsHeader;
