// src/features/orders/components/OrdersHeader.jsx

function OrdersHeader({
  activeMode,
  setActiveMode,
  cartCount = 0,
  ordersCount = 0,
  onOpenScanDeliver,
  isEditing,
  onCancelEdit,
  onOpenNewOrder,
  stats = {}
}) {
  const currencyDisplay = stats.currencyDisplay || "YER ريال";
  const POSHeaderComp = window.POSHeader;

  if (activeMode === 'pos' && POSHeaderComp) {
    return (
      <POSHeaderComp
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        cartCount={cartCount}
        ordersCount={ordersCount}
        onOpenScanDeliver={onOpenScanDeliver}
        stats={stats}
        currencyDisplay={currencyDisplay}
      />
    );
  }

  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#E8E5EA] dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="p-6 border-b border-[#E8E5EA] dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white dark:from-[#0f172a] dark:via-[#131d31] dark:to-[#0f172a]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FCE8F2] dark:bg-rose-950/40 text-[#B0005A] dark:text-rose-300 border border-[#F2A4CB] dark:border-rose-900/50 flex items-center justify-center text-xl font-bold shadow-xs">
            {window.Icons?.ShoppingBag ? <window.Icons.ShoppingBag className="w-6 h-6" /> : "🛍️"}
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold text-[#25232A] dark:text-slate-100">
              استوديو المبيعات ونقاط البيع والكاشير السريع (Fashion POS & Sales Studio)
            </h1>
            <p className="text-xs text-[#6F6B75] dark:text-slate-400 mt-0.5">
              كاشير لمسي سريع، قارئ باركود، طباعة حرارية 80mm فورية، وأرشيف متكامل لأوامر المبيعات والتوريد
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher Buttons */}
          <div className="flex items-center bg-[#FAFAFB] dark:bg-slate-800/80 p-1 rounded-2xl border border-[#E8E5EA] dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveMode('pos')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMode === 'pos'
                  ? 'bg-[#B0005A] text-white shadow-xs'
                  : 'text-[#6F6B75] dark:text-slate-400 hover:text-[#25232A] dark:hover:text-slate-100'
              }`}
            >
              <span>⚡ كاشير ونقاط البيع (POS)</span>
              {cartCount > 0 && (
                <span className="bg-white text-[#B0005A] px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('archive')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMode === 'archive'
                  ? 'bg-[#B0005A] text-white shadow-xs'
                  : 'text-[#6F6B75] dark:text-slate-400 hover:text-[#25232A] dark:hover:text-slate-100'
              }`}
            >
              <span>📑 سجل الفواتير والأرشيف</span>
              <span className="bg-[#E8E5EA] dark:bg-slate-700 text-[#25232A] dark:text-slate-200 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                {ordersCount}
              </span>
            </button>
          </div>

          {/* Quick Scan-to-Deliver Button */}
          <button
            type="button"
            onClick={onOpenScanDeliver}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            title="تسليم فوري بالمسح وقراءة الباركود (Scan to Deliver)"
          >
            <span>📷🏷️</span>
            <span>تسليم بالمسح</span>
          </button>

          {/* New Order Modal Button */}
          {onOpenNewOrder && activeMode === 'archive' && !isEditing && (
            <button
              type="button"
              onClick={onOpenNewOrder}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#B0005A] hover:bg-[#8E0049] text-white shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>➕</span>
              <span>طلب جديد</span>
            </button>
          )}

          {isEditing && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="text-xs px-4 py-2 bg-white dark:bg-slate-800 text-[#D64545] border border-rose-200 dark:border-rose-900/50 rounded-xl font-bold hover:bg-rose-50 dark:hover:bg-rose-900/30 transition cursor-pointer"
            >
              إلغاء التعديل ✕
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#E8E5EA] dark:border-slate-800 bg-[#FAFAFB] dark:bg-slate-900/60 divide-x divide-x-reverse divide-[#E8E5EA] dark:divide-slate-800">
        <div className="p-4 text-center">
          <span className="text-xs font-semibold text-[#6F6B75] dark:text-slate-400 block">إجمالي الطلبيات</span>
          <span className="text-xl font-extrabold font-mono tabular-nums text-[#25232A] dark:text-slate-100 mt-1 block">
            {(stats.totalOrders || 0).toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75] dark:text-slate-500">طلب</span>
          </span>
        </div>
        <div className="p-4 text-center">
          <span className="text-xs font-semibold text-[#6F6B75] dark:text-slate-400 block">إجمالي المبيعات</span>
          <span className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] dark:text-cyan-400 mt-1 block">
            {(stats.totalSales || 0).toLocaleString("en-US")} <span className="text-xs font-medium text-[#6F6B75] dark:text-slate-500">{currencyDisplay}</span>
          </span>
        </div>
        <div className="p-4 text-center">
          <span className="text-xs font-semibold text-[#6F6B75] dark:text-slate-400 block">إجمالي المحصل</span>
          <span className="text-xl font-extrabold font-mono tabular-nums text-[#B0005A] dark:text-rose-400 mt-1 block">
            {(stats.totalPaid || 0).toLocaleString("en-US")} <span className="text-xs font-medium text-[#6F6B75] dark:text-slate-500">{currencyDisplay}</span>
          </span>
        </div>
        <div className="p-4 text-center">
          <span className="text-xs font-semibold text-[#6F6B75] dark:text-slate-400 block">المستحقات المتبقية</span>
          <span className="text-xl font-extrabold font-mono tabular-nums text-[#F28A00] dark:text-amber-400 mt-1 block">
            {(stats.pendingReceivables || 0).toLocaleString("en-US")} <span className="text-xs font-medium text-[#6F6B75] dark:text-slate-500">{currencyDisplay}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

window.OrdersHeader = OrdersHeader;
