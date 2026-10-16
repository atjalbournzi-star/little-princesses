function FactoryHeader({
  factory = [],
  stages = [],
  activeMainTab = 'pipeline',
  setActiveMainTab,
  alterationsList = [],
  fetchAlterations,
  onOpenScanModal,
  onToggleOrderForm,
  showOrderForm
}) {
  const activeAlterations = (alterationsList || []).filter(a => a.status !== 'completed').length;

  const countCutter = factory.filter(f => (f.stage || '').includes('قص')).length;
  const countTailor = factory.filter(f => (f.stage || '').includes('خياطة')).length;
  const countEmbroidery = factory.filter(f => (f.stage || '').includes('تطريز') || (f.stage || '').includes('شك')).length;
  const countFinisher = factory.filter(f => (f.stage || '').includes('فحص') || (f.stage || '').includes('تشطيب')).length;
  const countReady = factory.filter(f => (f.stage || '').includes('جاهز') || (f.stage || '').includes('تسليم') || f.progress >= 100).length;

  return (
    <div className="h-11 px-3 bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-xl flex items-center justify-between mb-2.5 shadow-lg shadow-black/20 shrink-0 select-none text-right" dir="rtl">
      {/* Title & Haute Couture Badge */}
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
        </span>
        <h2 className="text-xs font-semibold text-slate-100 tracking-wide flex items-center gap-1.5">
          <span>معمل ومصنع الأميرات الصغيرات</span>
          <span className="text-slate-500 font-normal">| خطوط الإنتاج والتشغيل المباشر</span>
        </h2>
        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-medium bg-rose-500/10 text-rose-400 px-2.5 py-0.5 rounded-full border border-rose-500/20">
          <span className="font-bold">{factory.length}</span> طلب بالورشة 🧵
        </span>
      </div>

      {/* Live Telemetry KPI Badges */}
      <div className="hidden xl:flex items-center gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-amber-300 font-medium transition hover:bg-slate-800">
          <span className="text-[10px]">✂️ قص وتحضير:</span>
          <span className="font-mono font-bold text-amber-400">{countCutter}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-sky-300 font-medium transition hover:bg-slate-800">
          <span className="text-[10px]">🪡 خياطة:</span>
          <span className="font-mono font-bold text-sky-400">{countTailor}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-purple-300 font-medium transition hover:bg-slate-800">
          <span className="text-[10px]">✨ تطريز وشك:</span>
          <span className="font-mono font-bold text-purple-400">{countEmbroidery}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-emerald-300 font-medium transition hover:bg-slate-800">
          <span className="text-[10px]">🔍 تشطيب وفحص:</span>
          <span className="font-mono font-bold text-emerald-400">{countFinisher}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-rose-300 font-medium transition hover:bg-slate-800">
          <span className="text-[10px]">📦 جاهز للتسليم:</span>
          <span className="font-mono font-bold text-rose-400">{countReady}</span>
        </div>
      </div>

      {/* Action Buttons & Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleOrderForm}
          className={`h-7.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
            showOrderForm
              ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white ring-2 ring-rose-400/40 shadow-rose-900/30'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20'
          }`}
          title="فتح نموذج أمر التشغيل والتفصيل"
        >
          <span>✨ + أمر تشغيل فوري</span>
        </button>

        <button
          type="button"
          onClick={onOpenScanModal}
          className="h-7.5 px-2.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/70 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer active:scale-95"
          title="مسح باركود بطاقة الفستان"
        >
          <span>📷 مسح باركود</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-0.5 hidden sm:block"></div>

        {/* Segmented Control Tabs */}
        <div className="flex items-center bg-slate-950/60 p-0.5 rounded-lg border border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveMainTab('pipeline')}
            className={`h-6.5 px-2.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeMainTab === 'pipeline'
                ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700/60 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span>🧵 التشغيل</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('analytics')}
            className={`h-6.5 px-2.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeMainTab === 'analytics'
                ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700/60 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span>📊 التحليلات</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMainTab('alterations');
              if (typeof fetchAlterations === 'function') fetchAlterations();
            }}
            className={`h-6.5 px-2.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
              activeMainTab === 'alterations'
                ? 'bg-purple-900/60 text-purple-200 border border-purple-700/60 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span>✂️ البروفات</span>
            {activeAlterations > 0 && (
              <span className="bg-rose-500 text-white px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold animate-pulse">
                {activeAlterations}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

window.FactoryHeader = FactoryHeader;

