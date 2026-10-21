// src/features/feedback/components/FeedbackProfilesTab.jsx
// جداول جودة الخامات والأقمشة والموردين

function FeedbackProfilesTab({
  activeTab = 'materials',
  productQualityProfiles = [],
  fabricQualityProfiles = []
}) {
  return (
    <div className="space-y-4 select-none text-right" dir="rtl">
      {/* جدول ذكاء وتحليل جودة الأقمشة والخامات والموردين */}
      <div className="bg-[#111C38] rounded-2xl border border-slate-700/80 shadow-xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/80">
          <div>
            <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
              <span>🧵</span>
              <span>جودة الخامات والموردين (Fabric & Materials Quality Intelligence)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">مربوط ديناميكياً بفواتير التوريد والخامات الفعلية في المخزون والمشتريات</p>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#0B132B] text-cyan-400 border border-slate-700">
            {fabricQualityProfiles.length} خامة مسجلة
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-700/60 custom-scrollbar">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#0B132B] text-slate-300 font-bold border-b border-slate-700/80">
              <tr>
                <th className="py-2.5 px-3">اسم الخامة / القماش</th>
                <th className="py-2.5 px-3 text-center">الموديلات المرتبطة</th>
                <th className="py-2.5 px-3 text-center">إجمالي القطع المباعة</th>
                <th className="py-2.5 px-3 text-center">معدل العيوب</th>
                <th className="py-2.5 px-3 text-center">معدل المرتجعات</th>
                <th className="py-2.5 px-3 text-center">رضا العملاء</th>
                <th className="py-2.5 px-3 text-center">درجة الجودة</th>
                <th className="py-2.5 px-3 text-center">العينة والثقة</th>
                <th className="py-2.5 px-3 text-center">التقييم الفني</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {fabricQualityProfiles.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400 bg-[#0B132B]/60">
                    <span className="block text-xl mb-1">🧵</span>
                    لا توجد خامات أو فواتير توريد مسجلة حالياً بالمخزن
                  </td>
                </tr>
              ) : (
                fabricQualityProfiles.map((f, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 font-bold text-white">{f.name}</td>
                    <td className="py-2 px-3 text-center font-mono text-slate-300">{f.modelsUsed || 1}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-200">{f.totalSold || 0}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-rose-400">{f.defectRate}%</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-amber-400">{f.returnRate}%</td>
                    <td className="py-2 px-3 text-center font-bold text-cyan-400">{f.customerSatisfaction || '--'}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-lg font-bold font-mono text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {f.qualityScore !== null ? `${f.qualityScore} / 100` : '--'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-400">{f.sampleSize} حالة ({f.confidence})</td>
                    <td className="py-2 px-3 text-center font-semibold text-[11px] text-slate-300">{f.verdict || 'مطابق للمعايير'}</td>
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
