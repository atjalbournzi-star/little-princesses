// src/features/feedback/components/FeedbackTeamTab.jsx
// جداول أداء الكادر ومراحل الورشة والأقسام

function FeedbackTeamTab({
  activeTab = 'team',
  tailorQualityProfiles = [],
  departmentQualityScores = []
}) {
  return (
    <div className="space-y-4 select-none text-right" dir="rtl">
      {/* 1. بطاقات تقييم مراحل خط الإنتاج والأقسام الخمسة */}
      {departmentQualityScores.length > 0 && (
        <div className="bg-[#111C38] rounded-2xl border border-slate-700/80 p-4 shadow-xl space-y-3">
          <h3 className="font-bold text-xs text-white border-b border-slate-700/80 pb-2.5 flex items-center gap-1.5">
            <span>🏢</span>
            <span>مراحل خط الإنتاج والأقسام (Quality Pipeline & Stages)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {departmentQualityScores.map((dept, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-slate-700/70 bg-[#0B132B]/70 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xl">{dept.icon}</span>
                  <span className="font-mono font-bold text-xs text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-md border border-pink-500/20">{dept.score}</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">{dept.name}</h4>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">حجم العينة: {dept.sampleSize}</p>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10.5px]">
                  <span className="text-slate-400">ملاحظات: {dept.activeIssues}</span>
                  <span className="font-bold text-emerald-400">{dept.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. جدول تقييم أداء كادر المشغل والمراحل الخمس */}
      <div className="bg-[#111C38] rounded-2xl border border-slate-700/80 shadow-xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/80">
          <div>
            <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
              <span>👥</span>
              <span>تقييم أداء كادر المشغل والمراحل الخمس (Staff & Tailors Intelligence)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">مربوط ديناميكياً بموظفي المراحل الخمس الفعليين في جدول الموارد البشرية</p>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#0B132B] text-cyan-400 border border-slate-700">
            {tailorQualityProfiles.length} موظف
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-700/60 custom-scrollbar">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#0B132B] text-slate-300 font-bold border-b border-slate-700/80">
              <tr>
                <th className="py-2.5 px-3">اسم الفني / التخصص</th>
                <th className="py-2.5 px-3 text-center">القطع المنفذة</th>
                <th className="py-2.5 px-3 text-center">العيوب المسجلة</th>
                <th className="py-2.5 px-3 text-center">معدل العيوب</th>
                <th className="py-2.5 px-3 text-center">نسبة النجاح الفوري (FPY)</th>
                <th className="py-2.5 px-3 text-center">درجة الجودة</th>
                <th className="py-2.5 px-3 text-center">العينة والثقة</th>
                <th className="py-2.5 px-3 text-center">التوصية التشغيلية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {tailorQualityProfiles.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400 bg-[#0B132B]/60">
                    <span className="block text-xl mb-1">✂️</span>
                    لا توجد بيانات تشغيلية مسجلة لكادر المعمل حالياً
                  </td>
                </tr>
              ) : (
                tailorQualityProfiles.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 font-bold text-white">{t.name}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-200">{t.completedOrders}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-rose-400">{t.defectsCount}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-amber-400">{t.defectRate}%</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-emerald-400">{t.firstPassYield}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-pink-400">
                      {t.qualityScore !== null ? `${t.qualityScore} / 100` : '--'}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-400">{t.sampleSize} حالة ({t.confidence})</td>
                    <td className="py-2 px-3 text-center font-semibold text-[11px] text-slate-300">{t.trainingAlert}</td>
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

window.FeedbackTeamTab = FeedbackTeamTab;
