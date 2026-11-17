// src/features/feedback/components/FeedbackTeamTab.jsx
// جداول أداء الكادر ومراحل الورشة والأقسام المتوافقة مع هوية السندات المالية

function FeedbackTeamTab({
  activeTab = 'team',
  tailorQualityProfiles = [],
  departmentQualityScores = []
}) {
  return (
    <div className="space-y-1.5 select-none text-right" dir="rtl">
      {/* 1. بطاقات تقييم مراحل خط الإنتاج والأقسام الخمسة المدمجة */}
      {departmentQualityScores.length > 0 && (
        <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-xs space-y-2">
          <h3 className="font-bold text-[11.5px] text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1.5 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>مراحل خط الإنتاج والأقسام</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
            {departmentQualityScores.map((dept, idx) => (
              <div key={idx} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B132B]/70 space-y-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{dept.name}</span>
                  <span className="font-mono font-bold text-[11px] text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/40 px-1.5 py-0.2 rounded border border-pink-200 dark:border-pink-800/60">{dept.score}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span>العينة: {dept.sampleSize}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{dept.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. جدول تقييم أداء كادر المشغل المدمج */}
      <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-xs space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-[11.5px] text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>تقييم أداء كادر المشغل والمراحل الخمس</span>
          </h3>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#0B132B] text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-700">
            {tailorQualityProfiles.length} موظف
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 custom-scrollbar">
          <table className="w-full text-right border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800">
              <tr className="h-7.5">
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">اسم الفني / التخصص</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">القطع المنفذة</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">العيوب المسجلة</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">معدل العيوب</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">نسبة النجاح الفوري (FPY)</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">درجة الجودة</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">العينة والثقة</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">التوصية التشغيلية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-transparent">
              {tailorQualityProfiles.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center bg-slate-50/50 dark:bg-[#0B132B]/50">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">لا توجد بيانات تشغيلية مسجلة لكادر المعمل حالياً</p>
                  </td>
                </tr>
              ) : (
                tailorQualityProfiles.map(t => (
                  <tr key={t.id} className="h-8 border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[11px] font-medium transition-colors">
                    <td className="py-1 px-2.5 font-bold text-slate-900 dark:text-white">{t.name}</td>
                    <td className="py-1 px-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-200">{t.completedOrders}</td>
                    <td className="py-1 px-2.5 text-center font-mono font-bold text-rose-600 dark:text-rose-400">{t.defectsCount}</td>
                    <td className="py-1 px-2.5 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{t.defectRate}%</td>
                    <td className="py-1 px-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{t.firstPassYield}</td>
                    <td className="py-1 px-2.5 text-center font-mono font-bold text-pink-600 dark:text-pink-400">
                      {t.qualityScore !== null ? `${t.qualityScore} / 100` : '--'}
                    </td>
                    <td className="py-1 px-2.5 text-center font-mono text-[10px] text-slate-500 dark:text-slate-400">{t.sampleSize} حالة ({t.confidence})</td>
                    <td className="py-1 px-2.5 text-center font-semibold text-[10.5px] text-slate-700 dark:text-slate-300">{t.trainingAlert}</td>
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
