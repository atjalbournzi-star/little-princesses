// src/features/marketing/components/MarketingRecsWeights.jsx
// ====================================================================
// Component: MarketingRecsWeights — التوصيات والأوزان (AI Recs + Weight Engine)
// ====================================================================

function MarketingRecsWeights({
  aiRecsData, handleApproveRec,
  weightsMap, setWeightsMap, handleSaveWeights
}) {
  return (
    <div className="space-y-1.5 animate-fadeIn select-none">
      {/* كروت التوصيات القابلة للإقرار البشري */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 p-2.5 shadow-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            <h3 className="font-bold text-[11px] text-slate-800 dark:text-white">توصيات الذكاء الاصطناعي والإقرار البشري</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">يلزم الإقرار البشري</span>
        </div>
        {(!aiRecsData || aiRecsData.length === 0) ? (
          <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-[11px] font-medium bg-slate-50 dark:bg-[#0F172A] rounded-lg">
            لا توجد توصيات معلقة حالياً • ستظهر التوصيات الذكية تلقائياً عند تسجيل حملات ومبيعات
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(aiRecsData || []).map(rec => (
              <div key={rec.rec_id} className="bg-slate-50 dark:bg-[#0F172A] rounded-lg p-2.5 border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-[11px]">{rec.title}</span>
                    <span className="text-[10px] font-bold font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800">ثقة: {rec.confidence}%</span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-[#111C38] p-2 rounded-md border border-slate-200 dark:border-slate-800">
                    {rec.recommendation}
                  </p>
                  <div className="space-y-0.5 text-[10.5px] text-slate-600 dark:text-slate-300">
                    <p><span className="font-bold text-slate-700 dark:text-slate-200">السبب:</span> {rec.reason}</p>
                    <p><span className="font-bold text-emerald-600 dark:text-emerald-400">الأثر المتوقع:</span> {rec.expected_impact}</p>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md border ${rec.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800'}`}>
                    {rec.status === 'approved' ? 'تمت الموافقة' : 'قيد الانتظار'}
                  </span>
                  {rec.status !== 'approved' && (
                    <button
                      onClick={() => handleApproveRec(rec.rec_id)}
                      className="h-6 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] transition cursor-pointer"
                    >
                      إقرار وتنفيذ
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* لوحة تعديل الأوزان */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 p-2.5 shadow-xs space-y-2">
        <h3 className="font-bold text-[11px] text-slate-800 dark:text-white flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1">
          <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          <span>لوحة تعديل أوزان تفاعل الجودة ودرجات النية (Weight Engine)</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {Object.entries(weightsMap).map(([wKey, wVal]) => (
            <div key={wKey} className="bg-slate-50 dark:bg-[#0F172A] p-2 rounded-lg border border-slate-200 dark:border-slate-800 space-y-0.5">
              <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">{wKey.toUpperCase()}</label>
              <input
                type="number"
                step="any"
                value={wVal !== undefined && wVal !== null ? wVal : ''}
                placeholder="0"
                onChange={e => setWeightsMap({ ...weightsMap, [wKey]: e.target.value })}
                className="w-full h-6 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C38] font-bold text-slate-900 dark:text-white outline-none focus:border-pink-500 font-mono text-center text-[11px]"
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleSaveWeights}
          className="w-full h-7.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
        >
          حفظ وتطبيق الأوزان الجديدة فوراً
        </button>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.MarketingRecsWeights = MarketingRecsWeights;
}
