// src/features/feedback/components/FeedbackStatsView.jsx
// بطاقات الأنماط المكتشفة والتنبيهات التشغيلية الذكية (Smart Quality Alerts)

function FeedbackStatsView({
  alerts = [],
  onTriggerCapa
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-[#25232A] flex items-center gap-2">
          <span className="text-[#B0005A]">⚡</span>
          الأنماط المكتشفة والتنبيهات التشغيلية (Smart Quality Alerts)
        </h3>
        <span className="text-xs text-[#6F6B75]">مستنتجة آلياً عبر خوارزميات إحصائية ومصفوفات الارتباط</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className="bg-white rounded-2xl border border-[#E8E5EA] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-3 relative overflow-hidden"
          >
            <div
              className={`absolute top-0 right-0 w-1.5 h-full ${
                alert.priority === 'Critical' ? 'bg-[#D64545]' :
                alert.priority === 'High' ? 'bg-[#F28A00]' : 'bg-[#009FAE]'
              }`}
            ></div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#25232A]">{alert.title}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FAFAFB] border border-[#E8E5EA]">
                  {alert.priorityBadge}
                </span>
              </div>
              <p className="text-[11.5px] text-[#6F6B75] leading-relaxed">{alert.description}</p>
            </div>

            <div className="pt-3 border-t border-[#E8E5EA] flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-[#6F6B75] block">الأثر المالي:</span>
                <span className="font-bold font-mono text-[#D64545]">{alert.financialImpact}</span>
              </div>
              <button
                onClick={() => onTriggerCapa(alert)}
                className="px-3 py-1.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA] transition cursor-pointer"
              >
                {alert.actionLabel} ⚙️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.FeedbackStatsView = FeedbackStatsView;
