// src/features/orders/components/POSHeader.jsx
// شريط ترويسة ومؤشرات نقاط البيع والكاشير السريع محكم الارتفاع

function POSHeader({
  activeMode = 'pos',
  setActiveMode,
  cartCount = 0,
  ordersCount = 0,
  onOpenScanDeliver,
  stats = {},
  currencyDisplay = "YER ريال"
}) {
  const user = window.currentUser || { full_name: 'كاشير الصالة' };
  const cashierName = user.full_name || user.username || 'كاشير الصالة';
  const currCode = (currencyDisplay || "YER").split(' ')[0];

  return (
    <div className="h-9 min-h-[36px] px-3 bg-[#111C38] border border-slate-800 rounded-xl flex items-center justify-between shrink-0 select-none" dir="rtl">
      {/* Right side: Title + Active Cashier badge + Mode switcher */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="text-[11px] font-bold text-white flex items-center gap-1.5 shrink-0">
          <span className="text-pink-500">⚡</span>
          <span>نقاط البيع والكاشير السريع</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-[10px] text-emerald-300 font-semibold shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>الكاشير: {cashierName}</span>
        </div>

        {setActiveMode && (
          <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setActiveMode('pos')}
              className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                activeMode === 'pos' ? 'bg-pink-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              كاشير
              {cartCount > 0 && <span className="mr-1 bg-white text-pink-600 px-1 rounded-full text-[8.5px] font-mono">{cartCount}</span>}
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('archive')}
              className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                activeMode === 'archive' ? 'bg-pink-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              الأرشيف ({ordersCount})
            </button>
          </div>
        )}

        {onOpenScanDeliver && (
          <button
            type="button"
            onClick={onOpenScanDeliver}
            className="hidden md:flex items-center gap-1 h-6 px-2 text-[10px] font-bold rounded-lg bg-cyan-950/60 border border-cyan-700/60 text-cyan-300 hover:bg-cyan-900/50 cursor-pointer shrink-0"
            title="تسليم فوري بالمسح"
          >
            <span>📷</span>
            <span>مسح تسليم</span>
          </button>
        )}
      </div>

      {/* Left side (KPIs): Consolidated inline stats (NO clipping, unified borders) */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="text-[10.5px] font-semibold text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
          <span className="text-slate-400">الطلبات:</span>
          <span className="text-white font-bold font-mono">{Number(stats.totalOrders ?? ordersCount ?? 0).toLocaleString('en-US')}</span>
        </div>
        <div className="text-[10.5px] font-semibold text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
          <span className="text-slate-400">المبيعات:</span>
          <span className="text-white font-bold font-mono">{Number(stats.totalSales || 0).toLocaleString('en-US')} {currCode}</span>
        </div>
        <div className="text-[10.5px] font-semibold text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
          <span className="text-slate-400">المحصل:</span>
          <span className="text-emerald-400 font-bold font-mono">{Number(stats.totalPaid || 0).toLocaleString('en-US')} {currCode}</span>
        </div>
      </div>
    </div>
  );
}

window.POSHeader = POSHeader;
