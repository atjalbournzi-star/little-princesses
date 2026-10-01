// src/features/dashboard/components/WatchdogAlertBanner.jsx
// رادار المشغل ومواعيد البروفات والتسليم العاجلة (Urgent Radar)

function WatchdogAlertBanner({ watchdogData, onSendWhatsApp }) {
  if (!watchdogData) return null;
  const { urgent_count = 0, fittings_today_count = 0, alterations_pending_count = 0, fittings_today = [] } = watchdogData;
  if (urgent_count === 0 && fittings_today_count === 0 && alterations_pending_count === 0) return null;

  return (
    <div className="rounded-xl bg-[#111C38] border border-slate-800 p-3 shadow-xs transition-all space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2.5">
          <span className="text-base">🔔</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-white">
                رادار المشغل ومواعيد البروفات والتسليم العاجلة
              </h2>
              <span className="text-[10px] px-2 py-0.5 font-bold rounded-full bg-rose-950 text-rose-300 animate-pulse border border-rose-800/40">
                مباشر ⚡
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {fittings_today_count > 0 && (
            <span className="text-[10px] px-2 py-0.5 font-bold rounded-lg bg-amber-950/70 border border-amber-700/80 text-amber-200">
              👗 {fittings_today_count} بروفة اليوم
            </span>
          )}
          {urgent_count > 0 && (
            <span className="text-[10px] px-2 py-0.5 font-bold rounded-lg bg-rose-950/70 border border-rose-700/80 text-rose-200">
              ⚠️ {urgent_count} طلب حرج
            </span>
          )}
          {alterations_pending_count > 0 && (
            <span className="text-[10px] px-2 py-0.5 font-bold rounded-lg bg-purple-950/70 border border-purple-700/80 text-purple-200">
              ✂️ {alterations_pending_count} تعديل
            </span>
          )}
        </div>
      </div>

      {/* شرائح المواعيد المستحقة مع أوامر العمل */}
      {fittings_today?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {fittings_today.slice(0, 3).map((item) => (
            <div key={item.id} className="text-[11px] py-1 px-2.5 text-white font-medium bg-[#0B132B]/80 border border-slate-700/60 rounded-lg flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono text-amber-400 font-bold shrink-0">#{item.order_no}</span>
                <span className="truncate">{item.customer_name || 'عميل'}</span>
                <span className="text-[10px] text-slate-400 truncate">({item.dress_type || 'فستان'})</span>
              </div>
              {item.phone && (
                <button
                  type="button"
                  onClick={() => onSendWhatsApp && onSendWhatsApp(item.phone, item.order_no)}
                  className="h-6 px-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer transition"
                  title="إرسال تذكير واتساب"
                >
                  <span>واتساب</span>
                  <span>💬</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.WatchdogAlertBanner = WatchdogAlertBanner;
  window.UrgentRadar = WatchdogAlertBanner;
}
