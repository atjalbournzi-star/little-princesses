// src/features/marketing/components/MarketingRecsWeights.jsx
// ====================================================================
// Component: MarketingRecsWeights — التوصيات والأوزان (AI Recs + Weight Engine)
// ====================================================================

function MarketingRecsWeights({
  aiRecsData, handleApproveRec,
  weightsMap, setWeightsMap, handleSaveWeights
}) {
  return (
    <div className="space-y-5 animate-fadeIn">
      {/* كروت التوصيات القابلة للإقرار البشري */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div>
          <h3 className="font-black text-slate-800 text-sm">💡 توصيات الذكاء الاصطناعي مع درجات الثقة والإقرار البشري</h3>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">لن يتم تنفيذ أي إجراء مالي تلقائياً إلا بعد ضغط زر الموافقة البشرية الصريحة</p>
        </div>
        {(!aiRecsData || aiRecsData.length === 0) ? (
          <div className="text-center py-8 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-slate-200">
            لا توجد توصيات معلقة حالياً • ستظهر التوصيات الذكية تلقائياً عند تسجيل حملات ومبيعات 💡
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(aiRecsData || []).map(rec => (
              <div key={rec.rec_id} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-xs">{rec.title}</span>
                    <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-lg">ثقة: {rec.confidence}% 🎯</span>
                  </div>
                  <p className="text-xs font-bold text-indigo-700 bg-white p-3 rounded-xl border border-slate-200">
                    👉 {rec.recommendation}
                  </p>
                  <div className="space-y-1 text-[11px] text-slate-600">
                    <p><span className="font-black text-slate-700">السبب العلمي:</span> {rec.reason}</p>
                    <p><span className="font-black text-emerald-700">الأثر المتوقع:</span> {rec.expected_impact}</p>
                    <p><span className="font-black text-slate-500">الدليل القاطع:</span> {rec.evidence}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${rec.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                    {rec.status === 'approved' ? '🟢 تمت الموافقة والتنفيذ' : '⏳ قيد الانتظار'}
                  </span>
                  {rec.status !== 'approved' && (
                    <button
                      onClick={() => handleApproveRec(rec.rec_id)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-xs hover:opacity-90 transition shadow-sm"
                    >
                      ✔ إقرار وتنفيذ الموافقة البشرية
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* لوحة تعديل الأوزان */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div>
          <h3 className="font-black text-slate-800 text-sm">⚙️ لوحة تعديل أوزان تفاعل الجودة ودرجات النية (Configurable Weight Engine)</h3>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">يمكنك تغيير الأوزان في أي وقت وتطبيقها فوراً دون أي قيم ثابته أو عشوائية</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {Object.entries(weightsMap).map(([wKey, wVal]) => (
            <div key={wKey} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
              <label className="block text-[10px] font-extrabold text-slate-600">{wKey.toUpperCase()}</label>
              <input
                type="number"
                step="any"
                value={wVal !== undefined && wVal !== null ? wVal : ''}
                placeholder="0"
                onChange={e => setWeightsMap({ ...weightsMap, [wKey]: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-300 bg-white font-black text-slate-800 outline-none focus:border-rose-400 font-mono text-center"
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleSaveWeights}
          className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800 transition shadow-md"
        >
          💾 حفظ وتطبيق الأوزان الجديدة فوراً
        </button>
      </div>
    </div>
  );
}

window.MarketingRecsWeights = MarketingRecsWeights;
