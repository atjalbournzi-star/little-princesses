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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
        {(platformsData || []).map(p => (
          <div key={p.platform_id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🌐</span>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{p.platform_name}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold">{p.platform_type.toUpperCase()}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${p.status === 'connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {p.status === 'connected' ? '🟢 متصل' : '🔴 غير متصل'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <p><span className="font-extrabold text-slate-500">اسم الحساب:</span> {p.account_name || '— (غير مرتبط)'}</p>
                <p><span className="font-extrabold text-slate-500">حالة Webhook:</span> <span className={`font-bold ${p.webhook_status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>{p.webhook_status === 'active' ? 'نشط 🟢' : 'غير نشط'}</span></p>
                <p><span className="font-extrabold text-slate-500">آخر مزامنة:</span> {p.last_sync || 'لم تتم بعد'}</p>
                <p><span className="font-extrabold text-slate-500">الصلاحيات:</span> <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">{p.status === 'connected' ? (p.permissions || '[]') : 'بانتظار المصادقة'}</span></p>
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => handleTogglePlatform(p.platform_name, p.status)}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition ${p.status === 'connected' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                {p.status === 'connected' ? 'فصل المنصة' : 'ربط المنصة'}
              </button>
              <button onClick={() => handleOAuthConnect(p.platform_name)}
                className="px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-black transition">
                🔑 OAuth
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
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-100">
          <h3 className="font-black text-slate-800 text-sm">🧩 مصفوفة الإمكانيات الرسمية للمنصات الـ 8 (Capability Matrix)</h3>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">تعكس الإمكانيات المتاحة فعلياً بكل منصة لمنع أي بيانات وهمية</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                <th className="px-4 py-3 text-right">المنصة</th>
                {['منشورات (Posts)', 'ريلز (Reels)', 'ستوري (Stories)', 'تعليقات (Comments)', 'رسائل (Messages)', 'تحليلات (Insights)', 'إعلانات (Ads)', 'Webhooks'].map(h => (
                  <th key={h} className="px-3 py-3">{h}</th>
                ))}
                <th className="px-4 py-3 text-right">ملاحظات الفحص والربط</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold">
              {(matrixData || []).map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 text-right font-black text-slate-900">{row.platform}</td>
                  {['posts', 'reels', 'stories', 'comments', 'messages', 'insights', 'ads', 'webhooks'].map(cap => (
                    <td key={cap} className="px-3 py-3">
                      {row[cap] === 1
                        ? <span className="inline-block bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[11px] font-black">✔ مدعوم</span>
                        : <span className="inline-block bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md text-[11px]">✖ غير متاح</span>
                      }
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right text-[11px] text-slate-500 font-normal">{row.notes || '—'}</td>
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
      <div className="space-y-5 animate-fadeIn">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-5 py-4 border-b border-slate-100">
            <h3 className="font-black text-slate-800 text-sm">📊 المحتوى المنشور والمقاييس التاريخية (Content & Time-Series Metrics)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-100">
                  {['المحتوى / الكابشن', 'المنصة والنوع', 'المنتج المرتبط', 'الوصول والتفاعل التاريخي', 'المبيعات الإجمالية'].map(h => (
                    <th key={h} className="px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {(contentData || []).length === 0 ? (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-400">لا يوجد محتوى مسجل حالياً</td></tr>
                ) : (
                  contentData.map((cnt, i) => (
                    <tr key={cnt.content_id || i} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3"><p className="font-black text-slate-900">{cnt.caption || '—'}</p><p className="text-[10px] font-mono text-slate-400">{cnt.content_id}</p></td>
                      <td className="px-4 py-3"><span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold">{cnt.platform}</span><span className="mr-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">{cnt.content_type}</span></td>
                      <td className="px-4 py-3 text-slate-700 font-bold">{cnt.product_name || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {cnt.metrics_history && cnt.metrics_history.length > 0 ? (
                          <div className="text-[11px] flex items-center justify-center gap-2 flex-wrap">
                            <span className="font-black text-indigo-600" title="الوصول">👁️ {cnt.metrics_history.reduce((a, b) => a + (b.reach || 0), 0).toLocaleString('en-US')}</span>
                            <span className="font-black text-emerald-600" title="الإعجابات">👍 {cnt.metrics_history.reduce((a, b) => a + (b.likes || 0), 0).toLocaleString('en-US')}</span>
                            <span className="font-black text-amber-600" title="الحفظ">🔖 {cnt.metrics_history.reduce((a, b) => a + (b.saves || 0), 0).toLocaleString('en-US')}</span>
                          </div>
                        ) : <span className="text-slate-400 text-[10px]">لا توجد قراءات بعد</span>}
                      </td>
                      <td className="px-4 py-3 text-center font-black text-emerald-600">
                        {cnt.metrics_history ? cnt.metrics_history.reduce((a, b) => a + (b.revenue || 0), 0).toLocaleString('en-US') : 0} {currLabel}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── تبويب Webhooks ───
  if (activeTab === 'webhooks') {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-800 text-sm">🔌 سجل طبقة الأحداث المباشرة (Raw Platform Webhook Events)</h3>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">يدعم تلقي الأحداث، Idempotency، وإعادة المحاولة Retry بدون تقديم بيانات fake</p>
          </div>
          <span className="text-xs font-mono font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-xl">POST /api/webhooks/:platform</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right font-mono">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                {['Event ID', 'المنصة', 'نوع الحدث', 'مفتاح Idempotency', 'تاريخ الاستلام', 'الحالة'].map(h => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(webhookLogs || []).length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-400 font-sans font-bold">لا يوجد أحداث webhook مسجلة بعد</td></tr>
              ) : (
                webhookLogs.map((log, idx) => (
                  <tr key={log.event_id || idx} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-800 font-bold">{log.event_id}</td>
                    <td className="px-4 py-3 text-indigo-600 font-bold">{log.platform}</td>
                    <td className="px-4 py-3 text-slate-700">{log.event_type}</td>
                    <td className="px-4 py-3 text-slate-400 text-[10px]">{log.idempotency_key}</td>
                    <td className="px-4 py-3 text-slate-500">{log.received_at}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${log.status === 'processed' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-amber-100 text-amber-700 border-amber-300'}`}>{log.status}</span>
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

window.MarketingPlatforms = MarketingPlatforms;
