// src/features/dashboard/components/DashboardHeader.jsx
// شريط المؤشرات التنفيذية والتنبيهات المدمج (Level 1: Sleek Top Filter & Alerts Bar)

function DashboardHeader({
  timeHorizon = 'all',
  setTimeHorizon = () => {},
  watchdogData = null,
  urgentOrders = []
}) {
  const horizons = [
    { id: 'today', label: 'اليوم' },
    { id: 'week', label: 'الأسبوع' },
    { id: 'month', label: 'الشهر' },
    { id: 'all', label: 'الكل' }
  ];

  const criticalCount = watchdogData?.urgent_count ?? (watchdogData?.criticalIssues?.length ?? urgentOrders.length ?? 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDeliveries = watchdogData?.fittings_today_count ?? urgentOrders.filter(o => o.delivery_date && String(o.delivery_date).split('T')[0] === todayStr).length;

  return (
    <div className="min-h-9 py-1 flex flex-wrap items-center justify-between gap-2 px-3 bg-white dark:bg-[#111C38] rounded-xl border border-[#E2E8F0] dark:border-[#263248] shadow-xs transition-colors select-none">
      {/* الجانب الأيمن: عنوان مقتضب وشارة التنبيهات العاجلة */}
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        <h1 className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5 truncate">
          <span>📊</span>
          <span>لوحة المؤشرات التنفيذية</span>
        </h1>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${
          criticalCount > 0 || todayDeliveries > 0
            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${criticalCount > 0 || todayDeliveries > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
          <span className="ltr-num">{criticalCount}</span>
          <span>حرج /</span>
          <span className="ltr-num">{todayDeliveries}</span>
          <span>تسليم اليوم</span>
        </span>
      </div>

      {/* الجانب الأيسر: كبسولات فلترة الفترة المدمجة */}
      <div className="flex items-center gap-1 bg-[#F8FAFC] dark:bg-[#0F172A] p-0.5 rounded-lg border border-[#E2E8F0] dark:border-[#263248] overflow-hidden shrink-0">
        {horizons.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTimeHorizon(t.id)}
            className={`h-7 px-2.5 py-0.5 text-[11px] font-medium transition-all cursor-pointer rounded-md whitespace-nowrap shrink-0 ${
              timeHorizon === t.id
                ? 'bg-[#E11D48] text-white font-bold shadow-xs dark:bg-purple-600/30 dark:border dark:border-purple-500/40'
                : 'text-[#475569] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.DashboardHeader = DashboardHeader;
  window.DashboardHero = DashboardHeader;
}

