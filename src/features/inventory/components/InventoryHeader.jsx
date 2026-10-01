// src/features/inventory/components/InventoryHeader.jsx
// ترويسة إدارة المخزون وبطاقات المؤشرات العليا وأزرار العمليات السريعة

function InventoryHeader({ stats = {}, onOpenAdd, onReconcile, onRefresh, isRefreshing, onOpenTransfer, onOpenAddWarehouse, onOpenManageWarehouses }) {
  const currencyDisplay = stats.currencyDisplay || 'YER ﷼';
  const isBaseCurrency = stats.isBaseCurrency ?? true;
  const Icons = window.Icons || {};

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="p-6 border-b border-[#E8E5EA] flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#E2F5F7] text-[#007F8C] border border-[#C5ECF0] flex items-center justify-center text-xl font-bold shadow-xs">
            {Icons.Purchases ? <Icons.Purchases className="w-6 h-6" /> : '📦'}
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold text-[#25232A]">
              إدارة المخزون والمستودعات والتوريدات (Inventory & Warehouse Hub)
            </h1>
            <p className="text-xs text-[#6F6B75] mt-0.5">
              منظومة مزدوجة للأقمشة والخامات والمنتجات التامة، المناقلات بين الفروع، والتسويات الجردية
            </p>
          </div>
        </div>

        {/* أزرار الإجراءات السريعة */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenAdd}
            className="h-10 px-4 rounded-xl font-bold text-xs text-white bg-[#009FAE] hover:bg-[#007F8C] transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>➕</span>
            <span>إضافة صنف</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddWarehouse}
            className="h-10 px-3.5 bg-[#F2E7F3] hover:bg-[#E5CEE7] text-[#8F2A87] border border-[#E5CEE7] rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>🏢</span>
            <span className="hidden sm:inline">مستودع جديد</span>
          </button>

          <button
            type="button"
            onClick={onOpenManageWarehouses}
            title="إدارة المستودعات وتعديلها وتعطيلها وحذفها"
            className="h-10 px-3 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#6F6B75] hover:text-[#25232A] border border-[#E8E5EA] rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>⚙️</span>
            <span className="hidden sm:inline">إدارة المستودعات</span>
          </button>

          <button
            type="button"
            onClick={onOpenTransfer}
            className="h-10 px-3.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] border border-[#E8E5EA] rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">مناقلة مخزنية</span>
          </button>

          <button
            type="button"
            onClick={onReconcile}
            disabled={isRefreshing}
            title="مطابقة وتسوية أرصدة المخزون بالكامل مع الفواتير وسجل الحركات الرقابي"
            className="h-10 px-3.5 bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C] border border-[#B2E6EB] rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <span>⚖️</span>
            <span className="hidden sm:inline">تسوية الحوكمة</span>
          </button>

          <button
            type="button"
            onClick={() => onRefresh && onRefresh(true)}
            disabled={isRefreshing}
            title="تحديث ومزامنة المخزون من السحابة"
            className="h-10 px-3.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#007F8C] border border-[#E8E5EA] rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
            <span className="hidden sm:inline">{isRefreshing ? 'جاري التحديث...' : 'مزامنة'}</span>
          </button>
        </div>
      </div>

      {/* شريط بطاقات المؤشرات (KPI Strip) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-[#E8E5EA] bg-[#FAFAFB] divide-x divide-x-reverse divide-[#E8E5EA]">
        <div className="p-4 text-center">
          <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي أصناف المخزون</span>
          <span className="text-xl font-extrabold font-mono tabular-nums text-[#25232A] mt-1 block">
            {(stats.totalItems || 0).toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">صنف</span>
          </span>
        </div>

        <div className="p-4 text-center">
          <span className="text-xs font-semibold text-[#6F6B75] block">أمتار الأقمشة والخامات</span>
          <span className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] mt-1 block">
            {(stats.totalFabricsMeters || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-xs font-medium text-[#6F6B75]">متر</span>
          </span>
        </div>

        <div className="p-4 text-center">
          <span className="text-xs font-semibold text-[#6F6B75] block">فساتين ومنتجات جاهزة</span>
          <span className="text-xl font-extrabold font-mono tabular-nums text-[#8F2A87] mt-1 block">
            {(stats.totalReadyDresses || 0).toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">قطعة</span>
          </span>
        </div>

        <div className="p-4 text-center">
          <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي قيمة المخزون</span>
          <span className="text-xl font-extrabold font-mono tabular-nums text-[#009FAE] mt-1 block">
            {(stats.totalInventoryValue || 0).toLocaleString('en-US', { minimumFractionDigits: isBaseCurrency ? 0 : 2, maximumFractionDigits: 2 })} <span className="text-xs font-medium text-[#6F6B75]">{currencyDisplay}</span>
          </span>
          {!isBaseCurrency && (
            <span className="text-[10.5px] font-mono text-[#6F6B75] block mt-0.5">
              ({(stats.totalInventoryValueBase || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} YER ﷼)
            </span>
          )}
        </div>

        <div className="p-4 text-center col-span-2 sm:col-span-1">
          <span className="text-xs font-semibold text-[#6F6B75] block">تنبيهات نقص المخزون</span>
          <span className={`text-xl font-extrabold font-mono tabular-nums mt-1 block ${(stats.lowStockCount || 0) > 0 ? 'text-[#D64545]' : 'text-emerald-600'}`}>
            {(stats.lowStockCount || 0).toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">صنف</span>
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
