/**
 * ============================================================================
 * HeaderNotificationCenter.jsx — Atelier Watchdog Radar & Due Dates Bell
 * Architecture: Modular Header Component | Little Princesses ERP
 * ============================================================================
 */

function HeaderNotificationCenter({ watchdogData, totalAlerts, setActiveTab }) {
  const [watchdogDropdown, setWatchdogDropdown] = React.useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setWatchdogDropdown(!watchdogDropdown)}
        className={`p-2 rounded-xl border transition shadow-2xs cursor-pointer flex items-center justify-center relative ${
          totalAlerts > 0
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 animate-pulse'
            : 'bg-[#FAFAFB] dark:bg-slate-900 border-[#E8E5EA] dark:border-slate-800 text-[#25232A] dark:text-slate-200 hover:text-[#B0005A] dark:hover:text-purple-400 hover:bg-white'
        }`}
        title="رادار ومواعيد تسليم المشغل والبروفات (Atelier Radar & Due Dates)"
      >
        <Icons.Bell className="w-4 h-4" />
        {totalAlerts > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#B0005A] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
            {totalAlerts > 9 ? '+9' : totalAlerts}
          </span>
        )}
      </button>

      {/* Watchdog Dropdown Menu */}
      {watchdogDropdown && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-[#E8E5EA] dark:border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn space-y-2 text-right">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E5EA] dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#25232A] dark:text-slate-100">
              <span>🔔</span>
              <span>رادار المشغل ومواعيد البروفات والتسليم</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FCE8F2] dark:bg-purple-950 text-[#B0005A] dark:text-purple-300">
              {totalAlerts} تنبيه
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 py-1">
            {/* Today's Fittings / Deliveries */}
            {watchdogData?.fittings_today?.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <span>👗</span>
                  <span>بروفات واستلامات اليوم ({watchdogData.fittings_today.length}):</span>
                </div>
                {watchdogData.fittings_today.map(item => (
                  <div key={item.id} className="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-[#25232A] dark:text-slate-100 flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-amber-700 dark:text-amber-300">#{item.order_no}</span>
                        <span>{item.customer_name || 'عميل'}</span>
                      </div>
                      <div className="text-[10.5px] text-[#6F6B75] dark:text-slate-400">
                        {item.dress_type || 'فستان'} - موعد: {item.delivery_date}
                      </div>
                    </div>
                    {item.phone && (
                      <a
                        href={`https://wa.me/${String(item.phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`أهلاً بكِ في مشغل الأميرات الصغيرات 👑\nنود تذكيركِ بموعد تسليم/بروفة فستانكِ الراقي (طلب #${item.order_no}) اليوم. يسعدنا تشريفكِ!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                        title="إرسال تذكير واتساب فوري"
                      >
                        <span>واتساب</span>
                        <span>💬</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Urgent / Overdue */}
            {watchdogData?.urgent_orders?.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>طلبات عاجلة أو متأخرة ({watchdogData.urgent_orders.length}):</span>
                </div>
                {watchdogData.urgent_orders.map(item => (
                  <div key={item.id} className="p-2 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-[#25232A] dark:text-slate-100 flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-rose-700 dark:text-rose-300">#{item.order_no}</span>
                        <span>{item.customer_name || 'عميل'}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                          {item.days_remaining < 0 ? `متأخر ${Math.abs(item.days_remaining)} يوم` : (item.days_remaining === 0 ? 'اليوم' : `باقي ${item.days_remaining} يوم`)}
                        </span>
                      </div>
                      <div className="text-[10.5px] text-[#6F6B75] dark:text-slate-400">
                        المرحلة: {item.stage || 'قيد التنفيذ'} - {item.dress_type || ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setWatchdogDropdown(false); setActiveTab('factory'); }}
                      className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold"
                    >
                      المشغل ⚙️
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Alterations */}
            {watchdogData?.alterations_pending?.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <span>✂️</span>
                  <span>تعديلات بروفات قيد المعالجة ({watchdogData.alterations_pending.length}):</span>
                </div>
                {watchdogData.alterations_pending.map(item => (
                  <div key={item.id} className="p-2 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-[#25232A] dark:text-slate-100 flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-purple-700 dark:text-purple-300">#{item.order_no}</span>
                        <span>{item.customer_name || 'عميلة'}</span>
                      </div>
                      <div className="text-[10.5px] text-[#6F6B75] dark:text-slate-400 truncate max-w-[200px]">
                        {item.alteration_reason}: {item.adjustment_notes}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                      {item.status === 'in_progress' ? 'قيد الخياطة 🪡' : 'معلق ⏳'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {totalAlerts === 0 && (
              <div className="text-center py-6 text-xs text-[#6F6B75] dark:text-slate-400">
                <div className="text-2xl mb-1">✨</div>
                <div>لا توجد تنبيهات تسليم حرجة</div>
                <div className="text-[10px] text-[#007F8C] mt-1 font-bold">جميع مواعيد التسليم والبروفات منضبطة 👑</div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#E8E5EA] dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => { setWatchdogDropdown(false); setActiveTab('orders'); }}
              className="text-xs font-bold text-[#B0005A] dark:text-purple-300 hover:underline"
            >
              أوامر المبيعات ←
            </button>
            <button
              type="button"
              onClick={() => { setWatchdogDropdown(false); setActiveTab('factory'); }}
              className="text-xs font-bold text-[#007F8C] dark:text-cyan-300 hover:underline"
            >
              صالة التشغيل ⚙️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

window.HeaderNotificationCenter = HeaderNotificationCenter;
