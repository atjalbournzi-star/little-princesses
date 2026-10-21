// src/features/feedback/components/FeedbackStatsView.jsx
// شريط الأنماط والتنبيهات التشغيلية الذكية المدمج (Smart Quality Alerts Strip)

function FeedbackStatsView({
  alerts = [],
  onTriggerCapa
}) {
  if (!alerts || alerts.length === 0) return null;

  // إخفاء الحاوية عندما تكون المنظومة مستقرة وطبيعية تماماً لتوفير المساحة الرأسية
  const activeAlerts = alerts.filter(a => a.id !== 'ALT-NORMAL');
  if (activeAlerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {activeAlerts.map(alert => (
        <div
          key={alert.id}
          className="py-2 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#111C38] rounded-xl border border-slate-700/80 shadow-md text-xs"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-pink-400 text-sm">⚡</span>
            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
              alert.priority === 'Critical' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
              alert.priority === 'High' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
              'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
            }`}>
              {alert.priorityBadge}
            </span>
            <span className="font-bold text-white text-xs">{alert.title}</span>
            <span className="hidden md:inline text-slate-400 text-[11px] truncate max-w-md">
              {alert.description}
            </span>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
            {alert.financialImpact && alert.financialImpact !== '0.00 YER ريال' && (
              <span className="text-[11px] font-mono text-rose-400 font-bold">
                {alert.financialImpact}
              </span>
            )}
            <button
              type="button"
              onClick={() => onTriggerCapa(alert)}
              className="h-7 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg font-bold text-[11px] border border-slate-700 transition cursor-pointer flex items-center gap-1"
            >
              <span>{alert.actionLabel}</span>
              <span>⚙️</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

window.FeedbackStatsView = FeedbackStatsView;
