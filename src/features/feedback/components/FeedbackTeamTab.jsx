// src/features/feedback/components/FeedbackTeamTab.jsx
// جداول تقييم المصممين، الخياطين، ومراحل خط الإنتاج والأقسام

function FeedbackTeamTab({
  activeTab,
  designerQualityProfiles = [],
  tailorQualityProfiles = [],
  departmentQualityScores = []
}) {
  return (
    <div className="space-y-6">
      {/* 1. تبويب تقييم المصممين */}
      {activeTab === 'designers' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">تقييم أداء المصممين (Designer Quality Intelligence)</h3>
              <p className="text-xs text-[#6F6B75] mt-0.5">تقييم موضوعي مبني على قبول التصاميم، المبيعات، ومعدل رضا العميلات وتكرار الشراء</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="p-3">اسم المصمم / الاستوديو</th>
                  <th className="p-3 text-center">عدد التصاميم المعتمدة</th>
                  <th className="p-3 text-center">إجمالي المبيعات</th>
                  <th className="p-3 text-center">معدل العيوب والتعديل</th>
                  <th className="p-3 text-center">تقييم العميلات</th>
                  <th className="p-3 text-center">درجة المصمم</th>
                  <th className="p-3 text-center">العينة والثقة</th>
                  <th className="p-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {designerQualityProfiles.length === 0 ? (
                  <tr><td colSpan="8" className="p-10 text-center text-[#6F6B75]">لا توجد بيانات أو مصممين مسجلين بعد 🎨</td></tr>
                ) : (
                  designerQualityProfiles.map(des => (
                    <tr key={des.id} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="p-3 font-bold text-[#25232A]">{des.name}</td>
                      <td className="p-3 text-center font-mono font-bold">{des.modelsDesigned}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#25232A]">{des.totalSales}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#D64545]">{des.defectRate}%</td>
                      <td className="p-3 text-center font-bold text-[#F28A00]">{des.customerRating}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#8F2A87]">{des.designerScore}</td>
                      <td className="p-3 text-center font-mono text-[11px] text-[#6F6B75]">{des.sampleSize} حالة ({des.confidence})</td>
                      <td className="p-3 text-center font-semibold text-[11px]">{des.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. تبويب تقييم الخياطين والمعمل */}
      {activeTab === 'tailors' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">تقييم أداء الخياطين وفرق الإنتاج (Tailor Quality Intelligence)</h3>
              <p className="text-xs text-[#6F6B75] mt-0.5">تقييم مهني دقيق مبني على دقة الخياطة، نسبة النجاح الفوري، واحتياجات التدريب</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="p-3">اسم الخياط / الفريق</th>
                  <th className="p-3 text-center">القطع المنفذة</th>
                  <th className="p-3 text-center">العيوب المسجلة</th>
                  <th className="p-3 text-center">معدل العيوب</th>
                  <th className="p-3 text-center">نسبة النجاح الفوري (FPY)</th>
                  <th className="p-3 text-center">درجة الخياطة</th>
                  <th className="p-3 text-center">العينة والثقة</th>
                  <th className="p-3 text-center">توصية التدريب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {tailorQualityProfiles.length === 0 ? (
                  <tr><td colSpan="8" className="p-10 text-center text-[#6F6B75]">لا توجد بيانات لفرق الخياطة أو طلبيات بالمعمل بعد ✂️</td></tr>
                ) : (
                  tailorQualityProfiles.map(t => (
                    <tr key={t.id} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="p-3 font-bold text-[#25232A]">{t.name}</td>
                      <td className="p-3 text-center font-mono font-bold">{t.completedOrders}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#D64545]">{t.defectsCount}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#D64545]">{t.defectRate}%</td>
                      <td className="p-3 text-center font-mono font-bold text-[#007F8C]">{t.firstPassYield}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#8F2A87]">
                        {t.qualityScore !== null ? `${t.qualityScore} / 100` : '--'}
                      </td>
                      <td className="p-3 text-center font-mono text-[11px] text-[#6F6B75]">{t.sampleSize} حالة ({t.confidence})</td>
                      <td className="p-3 text-center font-semibold text-[11px]">{t.trainingAlert}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. تبويب تقييم الأقسام والـ Pipeline */}
      {activeTab === 'departments' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
          <h3 className="font-bold text-sm text-[#25232A] border-b border-[#E8E5EA] pb-3">
            🏢 تقييم وموثوقية الأقسام ومراحل خط الإنتاج (Quality Pipeline & Departments)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departmentQualityScores.map((dept, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xl">{dept.icon}</span>
                  <span className="font-mono font-bold text-sm text-[#B0005A]">{dept.score} / 100</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#25232A]">{dept.name}</h4>
                  <p className="text-[11px] text-[#6F6B75] mt-0.5">حجم العينة: {dept.sampleSize}</p>
                </div>
                <div className="pt-2 border-t border-[#E8E5EA] flex justify-between items-center text-xs">
                  <span className="text-[#6F6B75]">الملاحظات النشطة: {dept.activeIssues}</span>
                  <span className="font-bold text-[11px]">{dept.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

window.FeedbackTeamTab = FeedbackTeamTab;
