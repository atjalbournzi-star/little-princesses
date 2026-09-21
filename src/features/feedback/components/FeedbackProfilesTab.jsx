// src/features/feedback/components/FeedbackProfilesTab.jsx
// جداول موثوقية الموديلات وتحليل جودة الأقمشة والخامات

function FeedbackProfilesTab({
  activeTab,
  productQualityProfiles = [],
  fabricQualityProfiles = []
}) {
  return (
    <div className="space-y-6">
      {/* 1. تبويب موثوقية الموديلات */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">سجل درجات موثوقية الموديلات (Product Quality Intelligence)</h3>
              <p className="text-xs text-[#6F6B75] mt-0.5">تقييم موضوعي مستنتج من المبيعات، العيوب، التقييمات، والمرتجعات الفعلية</p>
            </div>
            <span className="text-xs bg-[#FCE8F2] text-[#B0005A] font-bold px-2.5 py-0.5 rounded-full font-mono">
              {productQualityProfiles.length} موديل
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="p-3">اسم الموديل والتصميم</th>
                  <th className="p-3">الخامة المعتمدة</th>
                  <th className="p-3 text-center">المبيعات</th>
                  <th className="p-3 text-center">العيوب المسجلة</th>
                  <th className="p-3 text-center">المرتجعات</th>
                  <th className="p-3 text-center">التقييم</th>
                  <th className="p-3 text-center">درجة الجودة</th>
                  <th className="p-3 text-center">العينة والثقة</th>
                  <th className="p-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {productQualityProfiles.length === 0 ? (
                  <tr><td colSpan="9" className="p-10 text-center text-[#6F6B75]">لا توجد موديلات أو مبيعات مسجلة بعد 👗</td></tr>
                ) : (
                  productQualityProfiles.map(p => (
                    <tr key={p.id} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="p-3 font-bold text-[#25232A]">{p.name}</td>
                      <td className="p-3 text-[#6F6B75]">{p.fabric}</td>
                      <td className="p-3 text-center font-mono font-bold">{p.totalSold}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#D64545]">{p.defectsCount} ({p.defectRate}%)</td>
                      <td className="p-3 text-center font-mono font-bold text-[#C97300]">{p.returnsCount} ({p.returnRate}%)</td>
                      <td className="p-3 text-center font-mono font-bold text-[#F28A00]">{p.avgRating}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-lg font-bold font-mono text-xs ${
                          p.qualityScore >= 90 ? 'bg-[#E2F5F7] text-[#007F8C]' : p.qualityScore >= 75 ? 'bg-[#FFF1DC] text-[#C97300]' : 'bg-rose-50 text-[#D64545]'
                        }`}>
                          {p.qualityScore !== null ? `${p.qualityScore} / 100` : '--'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-[11px] text-[#6F6B75]">{p.sampleSize} حالة ({p.confidence})</td>
                      <td className="p-3 text-center font-semibold text-[11px]">{p.trend}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. تبويب تقييم الأقمشة والخامات */}
      {activeTab === 'fabrics' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">ذكاء وتحليل جودة الأقمشة والخامات (Fabric Quality Intelligence)</h3>
              <p className="text-xs text-[#6F6B75] mt-0.5">استنتاج تلقائي لأداء كل خامة من واقع المبيعات والعيوب والمرتجعات ورضا العملاء</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="p-3">اسم الخامة / القماش</th>
                  <th className="p-3 text-center">الموديلات المستخدمة</th>
                  <th className="p-3 text-center">إجمالي القطع المباعة</th>
                  <th className="p-3 text-center">معدل العيوب</th>
                  <th className="p-3 text-center">معدل المرتجعات</th>
                  <th className="p-3 text-center">رضا العملاء</th>
                  <th className="p-3 text-center">درجة الجودة</th>
                  <th className="p-3 text-center">العينة والثقة</th>
                  <th className="p-3 text-center">التقييم الفني</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {fabricQualityProfiles.length === 0 ? (
                  <tr><td colSpan="9" className="p-10 text-center text-[#6F6B75]">لا توجد أقمشة أو خامات مسجلة بعد 🧵</td></tr>
                ) : (
                  fabricQualityProfiles.map((f, idx) => (
                    <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="p-3 font-bold text-[#25232A]">{f.name}</td>
                      <td className="p-3 text-center font-mono font-bold">{f.modelsCount} موديل</td>
                      <td className="p-3 text-center font-mono font-bold text-[#25232A]">{f.totalSold}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#D64545]">{f.defectRate}%</td>
                      <td className="p-3 text-center font-mono font-bold text-[#C97300]">{f.returnRate}%</td>
                      <td className="p-3 text-center font-bold text-[#F28A00]">{f.customerSat}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#007F8C]">
                        {f.qualityScore !== null ? `${f.qualityScore} / 100` : '--'}
                      </td>
                      <td className="p-3 text-center font-mono text-[11px] text-[#6F6B75]">{f.sampleSize} عينة ({f.confidence})</td>
                      <td className="p-3 text-center font-semibold text-[11px]">{f.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

window.FeedbackProfilesTab = FeedbackProfilesTab;
