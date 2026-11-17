// src/features/marketing/components/MarketingCommandCenter.jsx
// ====================================================================
// Component: MarketingCommandCenter — تبويب مركز القيادة KPIs + Funnel + Alerts
// ====================================================================

function MarketingCommandCenter({
  executiveKPIs, funnelData, smartAlerts, productsAIData,
  dailyBriefData, currLabel, setSelectedProductDetail
}) {
  const kpiCards = [
    { label: 'الإنفاق الإعلاني', val: (executiveKPIs.ad_spend ?? 0).toLocaleString('en-US'), unit: currLabel, color: 'text-rose-600 dark:text-rose-400' },
    { label: 'الوصول Reach', val: (executiveKPIs.reach ?? 0).toLocaleString('en-US'), color: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'التفاعل Engagement', val: (executiveKPIs.engagement ?? 0).toLocaleString('en-US'), color: 'text-pink-600 dark:text-pink-400' },
    { label: 'الرسائل Messages', val: (executiveKPIs.messages ?? 0).toLocaleString('en-US'), color: 'text-purple-600 dark:text-purple-400' },
    { label: 'عملاء محتملون Leads', val: (executiveKPIs.leads ?? 0).toLocaleString('en-US'), color: 'text-amber-600 dark:text-amber-400' },
    { label: 'الطلبات Orders', val: (executiveKPIs.orders ?? 0).toLocaleString('en-US'), color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'الإيرادات Revenue', val: (executiveKPIs.revenue ?? 0).toLocaleString('en-US'), unit: currLabel, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'الربح الصافي Profit', val: (executiveKPIs.gross_profit ?? 0).toLocaleString('en-US'), unit: currLabel, color: 'text-teal-600 dark:text-teal-400' },
    { label: 'عائد الإعلان ROAS', val: `${executiveKPIs.roas ?? 0}x`, color: 'text-sky-600 dark:text-sky-400' },
    { label: 'العائد على الاستثمار ROI', val: `${executiveKPIs.roi ?? 0}%`, color: 'text-pink-600 dark:text-pink-400' },
    { label: 'تكلفة الاستحواذ CAC', val: (executiveKPIs.cac ?? 0).toLocaleString('en-US'), unit: currLabel, color: 'text-slate-800 dark:text-slate-200' },
    { label: 'معدل التحويل Conv.', val: `${executiveKPIs.conversion_rate ?? 0}%`, color: 'text-blue-600 dark:text-blue-400' }
  ];

  return (
    <div className="space-y-1.5 animate-fadeIn select-none">
      {/* شبكة المؤشرات التنفيذية */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1.5 my-0.5 shrink-0">
        {kpiCards.map((kpi, idx) => (
          <div key={idx} className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
            <span className="text-[10.5px] font-bold text-slate-700 dark:text-slate-200 truncate">{kpi.label}</span>
            <span className={`text-[11px] font-bold font-mono tabular-nums tracking-tight ${kpi.color}`}>
              {kpi.val} {kpi.unit && <span className="text-[9.5px] font-normal text-slate-400 font-sans mr-0.5">{kpi.unit}</span>}
            </span>
          </div>
        ))}
      </div>

      {/* AI Brain Summary */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 p-2.5 shadow-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            <h3 className="font-bold text-[11px] text-slate-800 dark:text-white">الملخص التنفيذي الذكي (AI Executive Brain Summary)</h3>
          </div>
          <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-300 px-2 py-0.2 rounded-md font-bold border border-purple-200 dark:border-purple-800">بيانات ERP الحقيقية</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
          {[
            { title: 'ماذا حدث؟', tc: 'text-amber-600 dark:text-amber-300', val: dailyBriefData?.brief?.what_happened || 'بانتظار تسجيل بيانات تسويقية لتحليلها آلياً.' },
            { title: 'لماذا؟', tc: 'text-indigo-600 dark:text-indigo-300', val: dailyBriefData?.brief?.why_happened || 'يتم تجميع الأسباب والمؤشرات عند إدخال حملات جديدة.' },
            { title: 'أهم فرصة:', tc: 'text-emerald-600 dark:text-emerald-300', val: dailyBriefData?.brief?.top_opportunity || 'لا توجد فرص معلقة حالياً.' },
            { title: 'أهم مشكلة:', tc: 'text-rose-600 dark:text-rose-300', val: dailyBriefData?.brief?.critical_issue || 'لا توجد مشكلات تسويقية مرصودة.' }
          ].map((item, i) => (
            <div key={i} className="bg-slate-50 dark:bg-[#0F172A] p-2 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
              <h4 className={`font-bold text-[10.5px] ${item.tc}`}>{item.title}</h4>
              <p className="text-slate-700 dark:text-slate-300 leading-snug text-[10.5px]">{item.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Marketing Funnel */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 p-2.5 shadow-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            <h3 className="font-bold text-[11px] text-slate-800 dark:text-white">قمع التحويل التسويقي (Marketing Funnel)</h3>
          </div>
          <span className="text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-2 py-0.2 rounded-md border border-indigo-200 dark:border-indigo-800">معدل التحويل: {executiveKPIs.conversion_rate || 0.34}%</span>
        </div>
        <div className="space-y-1">
          {(funnelData || []).map((step, idx) => (
            <div key={idx} className="flex items-center gap-2 p-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 w-32 shrink-0 truncate">{step.stage}</span>
              <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-pink-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(step.pct, 2)}%` }} />
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono text-[10.5px]">
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">{Number(step.count).toLocaleString('en-US')}</span>
                <span className="text-slate-400">({step.pct}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts + Top Products */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 p-2.5 shadow-xs space-y-2">
          <h3 className="font-bold text-[11px] text-slate-800 dark:text-white flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            <span>التنبيهات الذكية (Smart Alerts)</span>
          </h3>
          <div className="space-y-1.5 text-xs">
            {(!smartAlerts || smartAlerts.length === 0) ? (
              <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-[11px] font-medium bg-slate-50 dark:bg-[#0F172A] rounded-lg">لا توجد تنبيهات تسويقية نشطة حالياً</div>
            ) : (
              smartAlerts.map(alt => (
                <div key={alt.id || alt.title} className="p-2 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 space-y-0.5">
                  <p className="font-bold text-[11px]">{alt.title}</p>
                  <p className="text-[10px] opacity-90">{alt.msg}</p>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 p-2.5 shadow-xs space-y-2 md:col-span-2">
          <h3 className="font-bold text-[11px] text-slate-800 dark:text-white flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            <span>أداء أعلى المنتجات والإعلانات مبيعاً (Top Products)</span>
          </h3>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-[11px] text-right whitespace-nowrap">
              <thead>
                <tr className="h-7.5 bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  {['المنتج', 'الطلبات', 'الإيرادات', 'ROAS', 'Score', 'الإجراء'].map(h => (
                    <th key={h} className="px-2.5 py-1">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
                {(!productsAIData || productsAIData.length === 0) ? (
                  <tr><td colSpan="6" className="px-3 py-4 text-center text-slate-500 dark:text-slate-400 font-medium">لا توجد مبيعات أو منتجات مسجلة بعد</td></tr>
                ) : (
                  productsAIData.slice(0, 3).map((p, i) => (
                    <tr key={i} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-2.5 py-1 font-bold text-slate-800 dark:text-white">{p.model_name}</td>
                      <td className="px-2.5 py-1 text-center font-bold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">{p.orders || 0}</td>
                      <td className="px-2.5 py-1 font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{Number(p.revenue || 0).toLocaleString('en-US')} {currLabel}</td>
                      <td className="px-2.5 py-1 text-center font-bold text-sky-600 dark:text-sky-400 font-mono tabular-nums">{p.roas}x</td>
                      <td className="px-2.5 py-1 text-center"><span className="bg-pink-500/10 text-pink-600 dark:text-pink-300 px-1.5 py-0.2 rounded border border-pink-200 dark:border-pink-800 text-[10px] font-bold font-mono">{p.overall_score}</span></td>
                      <td className="px-2.5 py-1">
                        <button onClick={() => setSelectedProductDetail(p)} className="h-5.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded text-[10px] font-bold border border-slate-200 dark:border-slate-700/60 transition cursor-pointer">التفاصيل</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.MarketingCommandCenter = MarketingCommandCenter;
}
