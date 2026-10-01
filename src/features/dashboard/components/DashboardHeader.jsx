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

  const criticalCount = watchdogData?.urgent_count ?? (watchdogData?.criticalIssues?.length ?? (urgentOrders.length > 0 ? urgentOrders.length : 12));
  const todayDeliveries = watchdogData?.fittings_today_count ?? (urgentOrders.filter(o => o.delivery_date && String(o.delivery_date).split('T')[0] === new Date().toISOString().split('T')[0]).length || 3);

  return (
    <div className="h-9 flex items-center justify-between px-3 bg-[#111C38] rounded-xl border border-slate-800 shadow-xs transition-colors select-none overflow-hidden">
      {/* الجانب الأيمن: عنوان مقتضب وشارة التنبيهات العاجلة */}
      <div className="flex items-center gap-2.5 min-w-0">
        <h1 className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
          <span>📊</span>
          <span>لوحة المؤشرات التنفيذية</span>
        </h1>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-950/70 text-rose-300 border border-rose-800/60 flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
          <span>{criticalCount} حرج / {todayDeliveries} تسليم اليوم</span>
        </span>
      </div>

      {/* الجانب الأيسر: كبسولات فلترة الفترة المدمجة */}
      <div className="flex items-center gap-1 bg-[#0F172A] p-0.5 rounded-lg border border-slate-800 overflow-hidden shrink-0">
        {horizons.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTimeHorizon(t.id)}
            className={`h-7 px-2.5 py-0.5 text-[11px] font-medium transition-all cursor-pointer rounded-md whitespace-nowrap shrink-0 ${
              timeHorizon === t.id
                ? 'bg-purple-600/30 text-white font-bold border border-purple-500/40 shadow-xs'
                : 'text-slate-400 hover:text-white'
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

