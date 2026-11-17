// src/features/marketing/components/MarketingPlatforms.jsx
// ====================================================================
// Component: MarketingPlatforms — تبويبات المنصات + مصفوفة + المحتوى + Webhooks
// ====================================================================

function MarketingPlatforms({
  activeTab, platformsData, matrixData, contentData, webhookLogs,
  handleTogglePlatform, handleOAuthConnect, currLabel
}) {
  // ─── تبويب المنصات ───
  if (activeTab === 'platforms') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 animate-fadeIn select-none">
        {(platformsData || []).map(p => (
          <div key={p.platform_id} className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-xs space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${p.status === 'connected' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs">{p.platform_name}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">({p.platform_type})</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md border ${p.status === 'connected' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                  {p.status === 'connected' ? 'متصل' : 'غير متصل'}
                </span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-700 dark:text-slate-200 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                <p><span className="font-bold text-slate-500 dark:text-slate-400">الحساب:</span> {p.account_name || '— (غير مرتبط)'}</p>
                <p><span className="font-bold text-slate-500 dark:text-slate-400">Webhook:</span> <span className={`font-bold ${p.webhook_status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>{p.webhook_status === 'active' ? 'نشط' : 'غير نشط'}</span></p>
                <p><span className="font-bold text-slate-500 dark:text-slate-400">آخر مزامنة:</span> <span className="font-mono text-[10.5px]">{p.last_sync || 'لم تتم بعد'}</span></p>
              </div>
            </div>
            <div className="flex gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <button onClick={() => handleTogglePlatform(p.platform_name, p.status)}
                className={`flex-1 h-6.5 rounded-md text-[11px] font-bold transition cursor-pointer ${p.status === 'connected' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-500/20'}`}>
                {p.status === 'connected' ? 'فصل المنصة' : 'ربط المنصة'}
              </button>
              <button onClick={() => handleOAuthConnect(p.platform_name)}
                className="h-6.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-md text-[11px] font-bold border border-slate-200 dark:border-slate-700/60 transition cursor-pointer">
                OAuth
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─── تبويب مصفوفة الإمكانيات ───
  if (activeTab === 'matrix') {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 shadow-xs overflow-hidden animate-fadeIn select-none">
        <div className="h-7.5 px-3 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-[11px] text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            <span>مصفوفة الإمكانيات الرسمية للمنصات (Capability Matrix)</span>
          </h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-[11px] text-center border-collapse">
            <thead>
              <tr className="h-7.5 bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="px-2.5 py-1 text-right">المنصة</th>
                {['منشورات', 'ريلز', 'ستوري', 'تعليقات', 'رسائل', 'تحليلات', 'إعلانات', 'Webhooks'].map(h => (
                  <th key={h} className="px-2 py-1">{h}</th>
                ))}
                <th className="px-2.5 py-1 text-right">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
              {(matrixData || []).map((row, idx) => (
                <tr key={idx} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="px-2.5 py-1 text-right font-bold text-slate-800 dark:text-white">{row.platform}</td>
                  {['posts', 'reels', 'stories', 'comments', 'messages', 'insights', 'ads', 'webhooks'].map(cap => (
                    <td key={cap} className="px-2 py-1">
                      {row[cap] === 1
                        ? <span className="inline-block bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.2 rounded text-[10px] font-bold">مدعوم</span>
                        : <span className="inline-block text-slate-400 text-[10px]">—</span>
                      }
                    </td>
                  ))}
                  <td className="px-2.5 py-1 text-right text-[10px] text-slate-500 dark:text-slate-400">{row.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── تبويب المحتوى ───
  if (activeTab === 'content') {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 shadow-xs overflow-hidden animate-fadeIn select-none">
        <div className="h-7.5 px-3 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-[11px] text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
            <span>المحتوى المنشور والمقاييس التاريخية (Content & Metrics)</span>
          </h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-[11px] text-right">
            <thead>
              <tr className="h-7.5 bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                {['المحتوى / الكابشن', 'المنصة والنوع', 'المنتج المرتبط', 'الوصول والتفاعل', 'المبيعات'].map(h => (
                  <th key={h} className="px-2.5 py-1">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
              {(contentData || []).length === 0 ? (
                <tr><td colSpan="5" className="px-3 py-6 text-center text-slate-500 dark:text-slate-400 font-medium">لا يوجد محتوى مسجل حالياً</td></tr>
              ) : (
                contentData.map((cnt, i) => (
                  <tr key={cnt.content_id || i} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-2.5 py-1 font-bold text-slate-800 dark:text-white">{cnt.caption || '—'}</td>
                    <td className="px-2.5 py-1"><span className="text-[10px] font-bold text-pink-600 dark:text-pink-300">{cnt.platform}</span> ({cnt.content_type})</td>
                    <td className="px-2.5 py-1 text-slate-700 dark:text-slate-300 font-medium">{cnt.product_name || '—'}</td>
                    <td className="px-2.5 py-1 text-center font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                      {cnt.metrics_history ? cnt.metrics_history.reduce((a, b) => a + (b.reach || 0), 0).toLocaleString('en-US') : 0}
                    </td>
                    <td className="px-2.5 py-1 text-center font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {cnt.metrics_history ? cnt.metrics_history.reduce((a, b) => a + (b.revenue || 0), 0).toLocaleString('en-US') : 0} {currLabel}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── تبويب Webhooks ───
  if (activeTab === 'webhooks') {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 shadow-xs overflow-hidden animate-fadeIn select-none">
        <div className="h-7.5 px-3 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-[11px] text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            <span>سجل طبقة الأحداث المباشرة (Webhook Events)</span>
          </h3>
          <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-300 px-2 py-0.2 rounded-md border border-amber-200 dark:border-amber-800">POST /api/webhooks/:platform</span>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-[11px] text-right font-mono">
            <thead>
              <tr className="h-7.5 bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                {['Event ID', 'المنصة', 'نوع الحدث', 'Idempotency', 'تاريخ الاستلام', 'الحالة'].map(h => (
                  <th key={h} className="px-2.5 py-1">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
              {(webhookLogs || []).length === 0 ? (
                <tr><td colSpan="6" className="px-3 py-6 text-center text-slate-500 dark:text-slate-400 font-sans font-medium">لا توجد أحداث webhook مسجلة بعد</td></tr>
              ) : (
                webhookLogs.map((log, idx) => (
                  <tr key={log.event_id || idx} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-2.5 py-1 text-slate-800 dark:text-white font-bold">{log.event_id}</td>
                    <td className="px-2.5 py-1 text-indigo-600 dark:text-indigo-400 font-bold">{log.platform}</td>
                    <td className="px-2.5 py-1 text-slate-700 dark:text-slate-300">{log.event_type}</td>
                    <td className="px-2.5 py-1 text-slate-400 text-[10px]">{log.idempotency_key}</td>
                    <td className="px-2.5 py-1 text-slate-500 dark:text-slate-400 tabular-nums">{log.received_at}</td>
                    <td className="px-2.5 py-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${log.status === 'processed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800'}`}>{log.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}

if (typeof window !== 'undefined') {
  window.MarketingPlatforms = MarketingPlatforms;
}
