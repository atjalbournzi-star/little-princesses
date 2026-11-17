// src/features/feedback/components/FeedbackProfilesTab.jsx
// جداول جودة الخامات والأقمشة والموردين المتوافقة مع هوية السندات المالية

function FeedbackProfilesTab({
  activeTab = 'materials',
  productQualityProfiles = [],
  fabricQualityProfiles = []
}) {
  return (
    <div className="space-y-1.5 select-none text-right" dir="rtl">
      {/* جدول تحليل جودة الأقمشة والخامات والموردين المدمج */}
      <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-xs space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-[11.5px] text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>جودة الخامات والموردين</span>
          </h3>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#0B132B] text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-700">
            {fabricQualityProfiles.length} خامة مسجلة
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 custom-scrollbar">
          <table className="w-full text-right border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800">
              <tr className="h-7.5">
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">اسم الخامة / القماش</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">الموديلات المرتبطة</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">القطع المباعة</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">معدل العيوب</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">معدل المرتجعات</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">رضا العملاء</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">درجة الجودة</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">العينة والثقة</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">التقييم الفني</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-transparent">
              {fabricQualityProfiles.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center bg-slate-50/50 dark:bg-[#0B132B]/50">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">لا توجد خامات أو فواتير توريد مسجلة حالياً بالمخزن</p>
                  </td>
                </tr>
              ) : (
                fabricQualityProfiles.map((f, idx) => (
                  <tr key={idx} className="h-8 border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[11px] font-medium transition-colors">
                    <td className="py-1 px-2.5 font-bold text-slate-900 dark:text-white">{f.name}</td>
                    <td className="py-1 px-2.5 text-center font-mono text-slate-700 dark:text-slate-300">{f.modelsUsed || 1}</td>
                    <td className="py-1 px-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-200">{f.totalSold || 0}</td>
                    <td className="py-1 px-2.5 text-center font-mono font-bold text-rose-600 dark:text-rose-400">{f.defectRate}%</td>
                    <td className="py-1 px-2.5 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{f.returnRate}%</td>
                    <td className="py-1 px-2.5 text-center font-bold text-cyan-600 dark:text-cyan-400">{f.customerSatisfaction || '--'}</td>
                    <td className="py-1 px-2.5 text-center">
                      <span className="px-2 py-0.2 rounded font-bold font-mono text-[10.5px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        {f.qualityScore !== null ? `${f.qualityScore} / 100` : '--'}
                      </span>
                    </td>
                    <td className="py-1 px-2.5 text-center font-mono text-[10px] text-slate-500 dark:text-slate-400">{f.sampleSize} حالة ({f.confidence})</td>
                    <td className="py-1 px-2.5 text-center font-semibold text-[10.5px] text-slate-700 dark:text-slate-300">{f.verdict || 'مطابق للمعايير'}</td>
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

window.FeedbackProfilesTab = FeedbackProfilesTab;
