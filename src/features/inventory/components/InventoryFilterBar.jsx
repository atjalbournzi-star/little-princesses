// src/features/inventory/components/InventoryFilterBar.jsx
// شريط التبويبات والبحث والتصفية متعددة المستويات لمنظومة المخزون والمستودعات

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
  counts = {}
}) {
  const u = window.inventoryUtils || {};
  const warehouses = u.WAREHOUSES || [
    { id: 'WH-MAIN', code: 'WH-MAIN', name: 'المستودع الرئيسي' },
    { id: 'WH-WORKSHOP', code: 'WH-WORKSHOP', name: 'معمل وورشة الخياطة' },
    { id: 'WH-SHOWROOM', code: 'WH-SHOWROOM', name: 'معرض وصالة التسليم' }
  ];
  const categories = u.INVENTORY_CATEGORIES || ['أقمشة', 'بطانات', 'كلف وتطريز', 'إكسسوارات', 'فساتين جاهزة'];

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-4 space-y-4">
      {/* صف التبويبات الرئيسية */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center bg-[#FAFAFB] p-1.5 rounded-xl border border-[#E8E5EA] gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'stock' ? 'bg-[#009FAE] text-white shadow-xs' : 'text-[#6F6B75] hover:text-[#25232A]'
            }`}
          >
            <span>🧵</span>
            <span>الأقمشة والخامات</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'stock' ? 'bg-white/20 text-white' : 'bg-[#E8E5EA] text-[#25232A]'
            }`}>
              {counts.fabricsCount || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ready_dresses')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ready_dresses' ? 'bg-[#8F2A87] text-white shadow-xs' : 'text-[#6F6B75] hover:text-[#25232A]'
            }`}
          >
            <span>👗</span>
            <span>المنتجات والفساتين التامة</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'ready_dresses' ? 'bg-white/20 text-white' : 'bg-[#E8E5EA] text-[#25232A]'
            }`}>
              {counts.readyDressesCount || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('purchases')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'purchases' ? 'bg-[#009FAE] text-white shadow-xs' : 'text-[#6F6B75] hover:text-[#25232A]'
            }`}
          >
            <span>🧾</span>
            <span>فواتير التوريد</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'purchases' ? 'bg-white/20 text-white' : 'bg-[#E8E5EA] text-[#25232A]'
            }`}>
              {counts.purchasesCount || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('movements')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'movements' ? 'bg-[#25232A] text-white shadow-xs' : 'text-[#6F6B75] hover:text-[#25232A]'
            }`}
          >
            <span>📊</span>
            <span>سجل الحركات والمناقلات</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'movements' ? 'bg-white/20 text-white' : 'bg-[#E8E5EA] text-[#25232A]'
            }`}>
              {counts.txnsCount || 0}
            </span>
          </button>
        </div>
      </div>

      {/* صف الفلاتر والبحث */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-2.5 pt-1">
        <div className="relative flex-1 w-full md:w-auto">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-3 pr-8 h-10 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-medium w-full focus:bg-white focus:border-[#009FAE] outline-none"
            placeholder="بحث باسم الصنف، الرمز، المورد، أو الموقع..."
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] text-xs pointer-events-none">🔍</span>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          {/* فلتر المستودعات */}
          <select
            value={warehouseFilter}
            onChange={e => setWarehouseFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-semibold text-[#007F8C] outline-none cursor-pointer"
          >
            <option value="الكل">🏢 جميع المستودعات (الإجمالي العام)</option>
            {warehouses.map(w => {
              const code = typeof w === 'object' ? (w.code || w.id) : w;
              const name = typeof w === 'object' ? w.name : w;
              return <option key={code} value={code}>🏢 {name} ({code})</option>;
            })}
          </select>

          {/* فلتر التصنيف */}
          {(activeTab === 'stock' || activeTab === 'ready_dresses') && (
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-semibold text-[#25232A] outline-none cursor-pointer"
            >
              <option value="الكل">🏷️ جميع التصنيفات</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* فلتر تنبيهات النقص */}
          {(activeTab === 'stock' || activeTab === 'ready_dresses') && (
            <select
              value={stockAlertFilter}
              onChange={e => setStockAlertFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-semibold text-[#25232A] outline-none cursor-pointer"
            >
              <option value="all">⚡ حالة التوفر (الكل)</option>
              <option value="low">⚠️ منخفض / قرب النفاد</option>
              <option value="out_of_stock">🚫 نفد من المخزون</option>
              <option value="normal">✅ متوفر بشكل كافٍ</option>
            </select>
          )}
        </div>
      </div>
    </div>
  );
}

window.InventoryFilterBar = InventoryFilterBar;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InventoryFilterBar;
}
