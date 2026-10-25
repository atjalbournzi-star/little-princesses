// src/features/inventory/components/InventoryFilterBar.jsx
// شريط التبويبات والبحث والتصفية متعددة المستويات المدمج لمنظومة المخزون

function InventoryFilterBar({
  activeTab,
  setActiveTab,
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  warehouseFilter,
  setWarehouseFilter,
  stockAlertFilter,
  setStockAlertFilter,
  counts = {},
  onRefresh,
  isRefreshing
}) {
  const u = window.inventoryUtils || {};
  const warehouses = Array.isArray(u.WAREHOUSES) ? u.WAREHOUSES : [];
  const categories = u.INVENTORY_CATEGORIES || ['أقمشة', 'بطانات', 'كلف وتطريز', 'إكسسوارات', 'فساتين جاهزة'];

  return (
    <div className="space-y-1.5 pb-1 select-none border-b border-slate-200 dark:border-slate-800 text-right" dir="rtl">
      {/* صف التبويبات الرئيسية المدمج */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5">
        <div className="h-7 p-0.5 bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-0.5 text-[10.5px] font-medium shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`h-6 px-2 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'stock' ? 'bg-teal-600 text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 4v16M8 4v16M4 8h16M4 16h16" /></svg>
            <span>الأقمشة والخامات</span>
            <span className={`text-[9.5px] px-1 py-0.1 rounded-full font-mono font-bold ${
              activeTab === 'stock' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {counts.fabricsCount || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ready_dresses')}
            className={`h-6 px-2 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'ready_dresses' ? 'bg-fuchsia-700 text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            <span>المنتجات والفساتين التامة</span>
            <span className={`text-[9.5px] px-1 py-0.1 rounded-full font-mono font-bold ${
              activeTab === 'ready_dresses' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {counts.readyDressesCount || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('purchases')}
            className={`h-6 px-2 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'purchases' ? 'bg-teal-600 text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span>فواتير التوريد</span>
            <span className={`text-[9.5px] px-1 py-0.1 rounded-full font-mono font-bold ${
              activeTab === 'purchases' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {counts.purchasesCount || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('movements')}
            className={`h-6 px-2 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'movements' ? 'bg-slate-800 text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            <span>سجل الحركات والمناقلات</span>
            <span className={`text-[9.5px] px-1 py-0.1 rounded-full font-mono font-bold ${
              activeTab === 'movements' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {counts.txnsCount || 0}
            </span>
          </button>
        </div>
      </div>

      {/* صف الفلاتر والبحث في نسق مدمج ورشيق */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 pt-0.5">
        <div className="relative flex-1 w-full sm:w-auto">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث في أصناف وخامات المخزون..."
            className="pl-2 pr-6 h-6 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-medium w-full text-slate-900 dark:text-white focus:border-teal-600 dark:focus:border-teal-500 outline-none transition"
          />
          <svg className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-1 w-full sm:w-auto flex-wrap justify-end">
          {/* فلتر المستودعات */}
          <select
            value={warehouseFilter}
            onChange={e => setWarehouseFilter(e.target.value)}
            className="h-6 px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-semibold text-teal-700 dark:text-teal-400 outline-none cursor-pointer transition"
          >
            <option value="الكل">جميع المستودعات</option>
            {warehouses.map(w => {
              const code = typeof w === 'object' ? (w.code || w.id) : w;
              const name = typeof w === 'object' ? w.name : w;
              return <option key={code} value={code}>{name} ({code})</option>;
            })}
          </select>

          {/* فلتر التصنيف */}
          {(activeTab === 'stock' || activeTab === 'ready_dresses') && (
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="h-6 px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer transition"
            >
              <option value="الكل">جميع التصنيفات</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* فلتر تنبيهات النقص */}
          {(activeTab === 'stock' || activeTab === 'ready_dresses') && (
            <select
              value={stockAlertFilter}
              onChange={e => setStockAlertFilter(e.target.value)}
              className="h-6 px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer transition"
            >
              <option value="all">حالة التوفر (الكل)</option>
              <option value="low">منخفض / قرب النفاد</option>
              <option value="out_of_stock">نفد من المخزون</option>
              <option value="normal">متوفر بشكل كافٍ</option>
            </select>
          )}

          {/* زر التحديث المنقول هنا */}
          <button
            type="button"
            onClick={() => onRefresh && onRefresh(true)}
            disabled={isRefreshing}
            title="تحديث ومزامنة المخزون من السحابة"
            className="h-6 px-2 bg-white hover:bg-slate-50 dark:bg-[#0F172A] dark:hover:bg-slate-800 text-teal-600 dark:text-teal-400 border border-slate-200 dark:border-slate-800 rounded-md text-[10.5px] font-medium flex items-center gap-1 transition cursor-pointer disabled:opacity-50 shrink-0"
          >
            <svg className={`w-2.5 h-2.5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">{isRefreshing ? 'تحديث...' : 'تحديث'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

window.InventoryFilterBar = InventoryFilterBar;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InventoryFilterBar;
}
