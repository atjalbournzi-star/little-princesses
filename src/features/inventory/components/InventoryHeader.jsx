// src/features/inventory/components/InventoryHeader.jsx
// ترويسة إدارة المخزون وبطاقات المؤشرات العليا وأزرار العمليات السريعة المدمجة

function InventoryHeader({
  stats = {},
  onOpenAdd,
  onReconcile,
  onOpenTransfer,
  onOpenAddWarehouse,
  onOpenManageWarehouses
}) {
  const currencyDisplay = (stats.currencyDisplay || 'YER').replace('﷼', '').trim();
  const isBaseCurrency = stats.isBaseCurrency ?? true;

  return (
    <div className="shrink-0 space-y-1 select-none text-right" dir="rtl">
      {/* 1. ترويسة مدمجة ورشيقة في سطر واحد مع أزرار الإجراءات المصغرة */}
      <div className="h-8 min-h-[32px] px-2.5 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between shrink-0">
        {/* Right: عنوان الشاشة المدمج وأيقونة هندسية خطية */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 shrink-0">
            <svg className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>إدارة المخزون وسلاسل الإمداد</span>
          </div>
        </div>

        {/* Left: أزرار العمليات الخمس المصغرة في صف أفقي واحد مدمج */}
        <div className="flex items-center gap-1 shrink-0 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={onOpenAdd}
            className="h-6 px-2 text-[10.5px] font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer"
            title="إضافة صنف مخزني جديد"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
            <span>إضافة صنف</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddWarehouse}
            className="h-6 px-2 text-[10.5px] font-medium bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/60 border border-fuchsia-200 dark:border-fuchsia-800/60 rounded-md flex items-center gap-1 transition cursor-pointer"
            title="إضافة مستودع أو فرع جديد"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            <span>مستودع جديد</span>
          </button>

          <button
            type="button"
            onClick={onOpenManageWarehouses}
            className="h-6 px-2 text-[10.5px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-md flex items-center gap-1 transition cursor-pointer"
            title="إدارة وتعديل المستودعات والفروع"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span>إدارة المستودعات</span>
          </button>

          <button
            type="button"
            onClick={onOpenTransfer}
            className="h-6 px-2 text-[10.5px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/60 rounded-md flex items-center gap-1 transition cursor-pointer"
            title="مناقلة مخزنية بين المستودعات والفروع"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            <span>مناقلة مخزنية</span>
          </button>

          <button
            type="button"
            onClick={onReconcile}
            className="h-6 px-2 text-[10.5px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/60 rounded-md flex items-center gap-1 transition cursor-pointer"
            title="مطابقة وتسوية أرصدة المخزون بالكامل"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
            <span>تسوية الحوكمة</span>
          </button>
        </div>
      </div>

      {/* 2. شريط المؤشرات الإحصائية الخمس المدمج - صف أفقي واحد متناسق تماماً */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 my-0.5 shrink-0">
        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs cursor-default">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">إجمالي الأصناف</span>
          <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
            {(stats.totalItems || 0).toLocaleString('en-US')} <span className="text-[9.5px] text-slate-500 dark:text-slate-400">صنف</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs cursor-default">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">أمتار الخامات والأقمشة</span>
          <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 font-mono tracking-tight">
            {(stats.totalFabricsMeters || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[9.5px] text-slate-500 dark:text-slate-400">متر</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs cursor-default">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">فساتين ومنتجات تامة</span>
          <span className="text-[11px] font-bold text-fuchsia-600 dark:text-fuchsia-400 font-mono tracking-tight">
            {(stats.totalReadyDresses || 0).toLocaleString('en-US')} <span className="text-[9.5px] text-slate-500 dark:text-slate-400">قطعة</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs cursor-default">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">إجمالي قيمة المخزون</span>
          <span dir="ltr" className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            {(stats.totalInventoryValue || 0).toLocaleString('en-US', { minimumFractionDigits: isBaseCurrency ? 0 : 2, maximumFractionDigits: 2 })} {currencyDisplay}
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs cursor-default col-span-2 sm:col-span-1">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">تنبيهات نقص المخزون</span>
          <span className={`text-[11px] font-bold font-mono tracking-tight ${(stats.lowStockCount || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {(stats.lowStockCount || 0).toLocaleString('en-US')} <span className="text-[9.5px] text-slate-500 dark:text-slate-400">صنف</span>
          </span>
        </div>
      </div>
    </div>
  );
}

window.InventoryHeader = InventoryHeader;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InventoryHeader;
}
