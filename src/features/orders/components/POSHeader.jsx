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
  const user = window.currentUser || { full_name: 'الصالة' };
  const cashierName = user.full_name || user.username || 'الصالة';
  const currCode = typeof currencyDisplay === 'string'
    ? currencyDisplay.split(' ')[0]
    : (currencyDisplay?.code || currencyDisplay?.display?.split(' ')[0] || 'YER');

  const [isZenMode, setIsZenMode] = React.useState(() => {
    try { return localStorage.getItem('erp_sidebar_collapsed') === 'true'; } catch(e) { return false; }
  });

  const toggleZenMode = () => {
    const next = !isZenMode;
    setIsZenMode(next);
    window.dispatchEvent(new CustomEvent('erp:sidebarToggle', { detail: { isCollapsed: next } }));
  };

  const totalOrders = Number(stats.totalOrders ?? ordersCount ?? 0).toLocaleString('en-US');
  const totalSales = Number(stats.totalSales || 0).toLocaleString('en-US');
  const totalPaid = Number(stats.totalPaid || 0).toLocaleString('en-US');

  return (
    <div className="h-8 min-h-[32px] mb-1.5 flex items-center justify-between px-2.5 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg shrink-0 select-none shadow-xs transition-colors" dir="rtl">
      {/* Right side: Title + Active Cashier badge + Mode switcher + Focus Mode */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 shrink-0">
          <svg className="w-3.5 h-3.5 text-pink-600 fill-pink-600 shrink-0" viewBox="0 0 24 24">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          نقطة البيع السريع
        </span>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-mono font-bold shrink-0">
          الكاشير: {cashierName}
        </span>

        {/* Zen / Focus Mode Toggle */}
        <button
          type="button"
          onClick={toggleZenMode}
          className={`flex items-center gap-1 h-6 px-2 text-[10.5px] font-medium rounded-md border transition cursor-pointer ${
            isZenMode
              ? 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/60 dark:text-pink-300 dark:border-pink-800 shadow-2xs'
              : 'bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700'
          }`}
          title={isZenMode ? "إظهار القائمة الجانبية" : "وضع التركيز (طي القائمة لتوسيع مساحة الشاشة)"}
        >
          <span>{isZenMode ? "🖥️ وضع عادي" : "⚡ وضع التركيز"}</span>
        </button>

        {setActiveMode && (
          <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-900/90 p-0.5 rounded-md border border-slate-200 dark:border-slate-700/80 shrink-0 mr-1">
            <button
              type="button"
              onClick={() => setActiveMode('pos')}
              className={`h-5 px-2 rounded text-[10px] font-medium transition cursor-pointer flex items-center ${
                activeMode === 'pos' ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>كاشير</span>
              {cartCount > 0 && <span className="mr-1 bg-white text-pink-600 px-1 rounded-full text-[8.5px] font-mono">{cartCount}</span>}
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('archive')}
              className={`h-5 px-2 rounded text-[10px] font-medium transition cursor-pointer flex items-center ${
                activeMode === 'archive' ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>الأرشيف ({ordersCount})</span>
            </button>
          </div>
        )}

        {onOpenScanDeliver && (
          <button
            type="button"
            onClick={onOpenScanDeliver}
            className="hidden md:flex items-center gap-1 h-6 px-2 text-[10.5px] font-medium rounded-md bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-700/60 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 cursor-pointer shrink-0 transition"
            title="تسليم فوري بالمسح"
          >
            <span>📷</span>
            <span>مسح تسليم</span>
          </button>
        )}
      </div>

      {/* Left side: Luxury KPI Pills */}
      <div className="flex items-center gap-1.5 text-[10.5px] shrink-0">
        <span className="h-6 px-2.5 rounded-md bg-white dark:bg-[#111C38] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 flex items-center gap-1 text-[11px] font-medium shadow-2xs">
          <span>الطلبات:</span> <b className="text-slate-900 dark:text-white font-mono font-bold">{totalOrders}</b>
        </span>
        <span className="h-6 px-2.5 rounded-md bg-pink-50/70 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-900/60 flex items-center gap-1 text-[11px] font-medium shadow-2xs">
          <span>المبيعات:</span> <b className="font-mono font-bold text-pink-600 dark:text-pink-400">{totalSales} {currCode}</b>
        </span>
        <span className="h-6 px-2.5 rounded-md bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-1 text-[11px] font-medium shadow-2xs">
          <span>المحصل:</span> <b className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{totalPaid} {currCode}</b>
        </span>
      </div>
    </div>
  );
}

window.POSHeader = POSHeader;
