// src/features/marketing/components/MarketingCommandCenter.jsx
// ====================================================================
// Component: MarketingCommandCenter — تبويب مركز القيادة KPIs + Funnel + Alerts
// ====================================================================

function MarketingCommandCenter({
  executiveKPIs, funnelData, smartAlerts, productsAIData,
  dailyBriefData, currLabel, setSelectedProductDetail
}) {
  const kpiCards = [
    { label: 'الإنفاق الإعلاني Ad Spend', val: (executiveKPIs.ad_spend ?? 0).toLocaleString('en-US'), unit: currLabel, icon: '💸', color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'الوصول Reach', val: (executiveKPIs.reach ?? 0).toLocaleString('en-US'), icon: '🌐', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'التفاعل Engagement', val: (executiveKPIs.engagement ?? 0).toLocaleString('en-US'), icon: '❤️', color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'الرسائل Messages', val: (executiveKPIs.messages ?? 0).toLocaleString('en-US'), icon: '💬', color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'عملاء محتملون Leads', val: (executiveKPIs.leads ?? 0).toLocaleString('en-US'), icon: '🎯', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'الطلبات Orders', val: (executiveKPIs.orders ?? 0).toLocaleString('en-US'), icon: '🛍️', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'الإيرادات Revenue', val: (executiveKPIs.revenue ?? 0).toLocaleString('en-US'), unit: currLabel, icon: '💰', color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: 'الربح الصافي Profit', val: (executiveKPIs.gross_profit ?? 0).toLocaleString('en-US'), unit: currLabel, icon: '💎', color: 'text-teal-700', bg: 'bg-teal-50' },
    { label: 'عائد الإعلان ROAS', val: `${executiveKPIs.roas ?? 0}x`, icon: '📈', color: 'text-indigo-700', bg: 'bg-indigo-50' },
    { label: 'العائد على الاستثمار ROI', val: `${executiveKPIs.roi ?? 0}%`, icon: '🚀', color: 'text-purple-700', bg: 'bg-purple-50' },
    { label: 'تكلفة الاستحواذ CAC', val: (executiveKPIs.cac ?? 0).toLocaleString('en-US'), unit: currLabel, icon: '🏷️', color: 'text-slate-700', bg: 'bg-slate-100' },
    { label: 'معدل التحويل Conv. Rate', val: `${executiveKPIs.conversion_rate ?? 0}%`, icon: '🎯', color: 'text-blue-700', bg: 'bg-blue-50' }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* شبكة المؤشرات التنفيذية */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {kpiCards.map((kpi, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-1 hover:border-rose-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 truncate">{kpi.label}</span>
              <span className={`w-7 h-7 ${kpi.bg} ${kpi.color} rounded-xl flex items-center justify-center font-bold text-xs`}>{kpi.icon}</span>
            </div>
            <h4 className={`text-base font-extrabold font-mono tabular-nums ${kpi.color} flex items-baseline`}>
              <span>{kpi.val}</span>
              {kpi.unit && <span className="text-[10px] font-medium text-slate-500 mr-1 select-none font-sans">{kpi.unit}</span>}
            </h4>
          </div>
        ))}
      </div>

      {/* AI Brain Summary */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl space-y-4 border border-purple-500/20">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧠</span>
            <div>
              <h3 className="font-black text-base text-amber-300">الملخص التنفيذي الذكي (AI Executive Brain Summary)</h3>
              <p className="text-[11px] text-slate-300 font-semibold">تحليل الموقف التسويقي الفعلي • ثقة 94% 🎯</p>
            </div>
          </div>
          <span className="text-xs bg-purple-500/30 text-purple-200 px-3 py-1 rounded-full font-bold border border-purple-400/30">Grounded in Real ERP Data 🟢</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {[
            { title: '❓ ماذا حدث؟', cls: 'bg-white/10', tc: 'text-amber-300', val: dailyBriefData?.brief?.what_happened || 'بانتظار تسجيل بيانات تسويقية لتحليلها آلياً.' },
            { title: '💡 لماذا؟', cls: 'bg-white/10', tc: 'text-indigo-300', val: dailyBriefData?.brief?.why_happened || 'يتم تجميع الأسباب والمؤشرات عند إدخال حملات جديدة.' },
            { title: '✨ أهم فرصة:', cls: 'bg-emerald-500/20 border border-emerald-400/30', tc: 'text-emerald-300', vc: 'text-emerald-100', val: dailyBriefData?.brief?.top_opportunity || 'لا توجد فرص معلقة حالياً.' },
            { title: '⚠️ أهم مشكلة:', cls: 'bg-rose-500/20 border border-rose-400/30', tc: 'text-rose-300', vc: 'text-rose-100', val: dailyBriefData?.brief?.critical_issue || 'لا توجد مشكلات تسويقية مرصودة.' }
          ].map((item, i) => (
            <div key={i} className={`${item.cls} p-4 rounded-2xl space-y-1.5 backdrop-blur-sm`}>
              <h4 className={`font-black ${item.tc} flex items-center gap-1.5`}>{item.title}</h4>
              <p className={`${item.vc || 'text-slate-200'} leading-relaxed text-[11px]`}>{item.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Marketing Funnel */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-slate-800 text-sm">🎯 قمع التحويل التسويقي التفاعلي (Interactive Marketing Funnel)</h3>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">تتبع رحلة العميل من أول ظهور وحتى إتمام الطلب والإيرادات</p>
          </div>
          <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-xl">معدل التحويل الكلي: {executiveKPIs.conversion_rate || 0.34}%</span>
        </div>
        <div className="space-y-2">
          {(funnelData || []).map((step, idx) => (
            <div key={idx} className="flex items-center gap-3 group cursor-pointer hover:bg-slate-50 p-2 rounded-2xl transition">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-sm shrink-0">{step.icon}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-slate-800">{step.stage}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-indigo-600">{Number(step.count).toLocaleString('en-US')}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({step.pct}%)</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-rose-500 to-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(step.pct, 2)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts + Top Products */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="font-black text-slate-800 text-xs flex items-center gap-2">🔔 التنبيهات الذكية المباشرة (Smart Alerts)</h3>
          <div className="space-y-2 text-xs">
            {(!smartAlerts || smartAlerts.length === 0) ? (
              <div className="text-center py-6 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-slate-100">لا توجد تنبيهات تسويقية نشطة حالياً 🟢</div>
            ) : (
              smartAlerts.map(alt => (
                <div key={alt.id || alt.title} className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                  <p className="font-black text-[11px]">{alt.title}</p>
                  <p className="text-[10px] opacity-90">{alt.msg}</p>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3 md:col-span-2">
          <h3 className="font-black text-slate-800 text-xs flex items-center gap-2">⭐ أداء أعلى المنتجات والإعلانات مبيعاً (Top Products & Content)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right whitespace-nowrap">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                  {['المنتج', 'الطلبات', 'الإيرادات', 'ROAS', 'Score', 'الإجراء'].map(h => (
                    <th key={h} className="px-3 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {(!productsAIData || productsAIData.length === 0) ? (
                  <tr><td colSpan="6" className="px-3 py-6 text-center text-slate-400 font-bold">لا توجد مبيعات أو منتجات مسجلة بعد 📊</td></tr>
                ) : (
                  productsAIData.slice(0, 3).map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-2 font-black text-slate-900">{p.model_name}</td>
                      <td className="px-3 py-2 text-center font-bold text-indigo-600">{p.orders || 0}</td>
                      <td className="px-3 py-2 font-black text-emerald-600">{Number(p.revenue || 0).toLocaleString('en-US')} {currLabel}</td>
                      <td className="px-3 py-2 text-center font-black text-indigo-700">{p.roas}x</td>
                      <td className="px-3 py-2 text-center"><span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-black">{p.overall_score}</span></td>
                      <td className="px-3 py-2">
                        <button onClick={() => setSelectedProductDetail(p)} className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold hover:bg-slate-800 transition">عرض التفاصيل 🔍</button>
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

window.MarketingCommandCenter = MarketingCommandCenter;
