// src/features/feedback/components/FeedbackStatsView.jsx
// شريط التنبيهات التشغيلية المدمج المتوافق مع هوية السندات المالية

function FeedbackStatsView({
  alerts = [],
  onTriggerCapa
}) {
  if (!alerts || alerts.length === 0) return null;

  const activeAlerts = alerts.filter(a => a.id !== 'ALT-NORMAL');
  if (activeAlerts.length === 0) return null;

  return (
    <div className="space-y-1 select-none" dir="rtl">
      {activeAlerts.map(alert => (
        <div
          key={alert.id}
          className="h-8 min-h-[32px] px-2.5 bg-white dark:bg-[#111C38] rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs shadow-xs"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold border ${
              alert.priority === 'Critical' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800/60' :
              alert.priority === 'High' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60' :
              'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60'
            }`}>
              {alert.priorityBadge}
            </span>
            <span className="font-bold text-slate-900 dark:text-white text-[11px] truncate">{alert.title}</span>
            <span className="hidden md:inline text-slate-500 dark:text-slate-400 text-[10.5px] truncate max-w-md">
              {alert.description}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {alert.financialImpact && alert.financialImpact !== '0.00 YER ريال' && (
              <span className="text-[10.5px] font-mono text-rose-600 dark:text-rose-400 font-bold">
                {alert.financialImpact}
              </span>
            )}
            <button
              type="button"
              onClick={() => onTriggerCapa(alert)}
              className="h-6 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-medium text-[10.5px] border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <span>{alert.actionLabel}</span>
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

window.FeedbackStatsView = FeedbackStatsView;
