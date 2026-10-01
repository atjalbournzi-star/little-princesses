// src/features/dashboard/components/UpcomingDeliveriesCard.jsx
// رادار المشغل ومواعيد التسليم القادمة (Level 3: Operations Radar & Pipeline - h-72)

function UpcomingDeliveriesCard({
  urgentOrders = [],
  watchdogData = null,
  onSendWhatsApp = () => {},
  setActiveTab = () => {}
}) {
  const getStageBadge = (statusStr) => {
    const s = String(statusStr || '').toLowerCase();
    if (/cutting|قص|تجهيز/i.test(s)) {
      return { label: 'تحضير ⚙️', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
    } else if (/sewing|خياطة|تجميع/i.test(s)) {
      return { label: 'تجميع 🛠️', color: 'bg-pink-500/10 text-pink-300 border-pink-500/30' };
    } else if (/embroidery|تطريز|شك/i.test(s)) {
      return { label: 'تشطيب 💎', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' };
    } else if (/quality|جودة|فحص/i.test(s)) {
      return { label: 'جودة 🔍', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' };
    } else if (/ready|جاهز/i.test(s)) {
      return { label: 'جاهز 📦', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
    }
    return { label: 'تشغيل', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
  };

  const fittingsToday = watchdogData?.fittings_today || [];

  return (
    <div className="bg-[#111C38] rounded-xl border border-slate-800 p-2.5 shadow-xs flex flex-col h-72 overflow-hidden transition-colors select-none">
      {/* الترويسة المدمجة للرادار */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-sm">⏳</span>
          <h3 className="font-bold text-white text-xs truncate">
            مواعيد التسليم ورادار المشغل (خلال 72 ساعة)
          </h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10.5px] shrink-0">
          {watchdogData?.urgent_count > 0 && (
            <span className="text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60 font-bold">
              {watchdogData.urgent_count} حرج ⚠️
            </span>
          )}
          <span className="text-slate-300 bg-[#0B132B] px-2 py-0.5 rounded border border-slate-800 font-medium">
            {urgentOrders.length} أوامر قادمة
          </span>
        </div>
      </div>

      {/* شريط سريع لبروفات اليوم إن وجدت بدون أي سكرول أفقي */}
      {fittingsToday.length > 0 && (
        <div className="flex items-center gap-1.5 pb-2 mb-1.5 border-b border-slate-800/80 overflow-hidden shrink-0 flex-wrap">
          <span className="text-[10px] font-bold text-amber-300 shrink-0">👗 بروفات اليوم:</span>
          {fittingsToday.slice(0, 3).map((fit) => (
            <div key={fit.id || fit.order_no} className="text-[10px] py-0.5 px-2 text-white bg-[#0B132B] border border-slate-700/60 rounded flex items-center gap-1 shrink-0 max-w-[170px] truncate">
              <span className="font-mono text-amber-400 font-bold shrink-0">#{fit.order_no}</span>
              <span className="truncate">{fit.customer_name}</span>
              {fit.phone && (
                <button
                  type="button"
                  onClick={() => onSendWhatsApp && onSendWhatsApp(fit.phone, fit.order_no)}
                  className="px-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] cursor-pointer shrink-0"
                  title="واتساب"
                >
                  💬
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* جدول الأوامر القادمة بدون أي سكرول أفقي نهائياً */}
      <div className="flex-1 max-h-52 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <table className="w-full table-fixed text-xs">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[26%]" />
            <col className="w-[28%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead className="sticky top-0 bg-[#111C38] z-10">
            <tr className="border-b border-slate-800 h-6">
              <th className="py-1 px-1.5 h-6 text-right truncate text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tight">الأمر</th>
              <th className="py-1 px-1.5 h-6 text-right truncate text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tight">العميل</th>
              <th className="py-1 px-1.5 h-6 text-right truncate text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tight">البند / الموديل</th>
              <th className="py-1 px-1.5 h-6 text-right truncate text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tight">الاستحقاق</th>
              <th className="py-1 px-1.5 h-6 text-right truncate text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tight">المرحلة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {urgentOrders.length > 0 ? (
              urgentOrders.map((o, i) => {
                const prodSt = String(o.production_status || o.status || '').toLowerCase();
                const stageBadge = getStageBadge(prodSt);
                return (
                  <tr
                    key={i}
                    onClick={() => setActiveTab('orders')}
                    className="h-7 max-h-7 hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    title="انقر للانتقال إلى تفاصيل الأمر"
                  >
                    <td className="h-7 max-h-7 py-0.5 px-1.5 truncate">
                      <span className="text-[10.5px] font-mono font-semibold text-slate-200 dark:text-white py-0.5 px-1 text-center bg-[#0B132B]/80 border border-slate-700/60 rounded inline-block truncate max-w-full">
                        {o.order_no}
                      </span>
                    </td>
                    <td className="h-7 max-h-7 py-0.5 px-1.5 text-[11px] font-medium text-slate-200 dark:text-white truncate max-w-[110px]" title={o.customer_name}>
                      {o.customer_name}
                    </td>
                    <td className="h-7 max-h-7 py-0.5 px-1.5 text-[11px] font-medium text-slate-200 dark:text-white truncate max-w-[110px]" title={o.product_name || o.item_name || 'بند تصنيع قياسي'}>
                      {o.product_name || o.item_name || 'بند تصنيع قياسي'}
                    </td>
                    <td className="h-7 max-h-7 py-0.5 px-1.5 text-[11px] font-medium font-mono text-slate-200 dark:text-white truncate">
                      {o.delivery_date ? String(o.delivery_date).split('T')[0] : '—'}
                    </td>
                    <td className="h-7 max-h-7 py-0.5 px-1.5 truncate">
                      <span className={`${stageBadge.color} border px-1.5 py-0.2 rounded text-[9.5px] font-bold inline-flex items-center gap-0.5 truncate`}>
                        {stageBadge.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400 font-medium text-xs">
                  جميع أوامر التشغيل مجدولة ومكتملة بنجاح ✨
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.UpcomingDeliveriesCard = window.LivePipeline = window.UrgentDeliveriesTable = UpcomingDeliveriesCard;
}

