// src/features/feedback/components/FeedbackStandardsTab.jsx
// معايير الفحص ونقاط التفتيش والمستهدفات وسجل الجودة والتقارير الرئيسي

function FeedbackStandardsTab({
  activeTab,
  checkpoints = [],
  qualitySettings = [],
  masterEvaluations = [],
  onOpenModal
}) {
  return (
    <div className="space-y-6">
      {/* 1. تبويب نقاط التفتيش والمعايير والمستهدفات */}
      {activeTab === 'standards' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
              <div>
                <h3 className="font-bold text-sm text-[#25232A]">نقاط التفتيش ومعايير الفحص المعتمدة (Quality Checkpoints)</h3>
                <p className="text-xs text-[#6F6B75] mt-0.5">معايير فحص إجبارية واختيارية مبرمجة في خط الإنتاج ومعمل الخياطة الفاخرة</p>
              </div>
              <span className="text-xs font-bold text-[#B0005A] bg-[#FCE8F2] px-3 py-1 rounded-xl">
                {checkpoints.length} نقاط تفتيش نشطة
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                    <th className="p-3">المرحلة الإنتاجية</th>
                    <th className="p-3">اسم معيار الفحص</th>
                    <th className="p-3">الوصف والشروط</th>
                    <th className="p-3 text-center">التفاوت المسموح (Tolerance)</th>
                    <th className="p-3 text-center">إلزامي</th>
                    <th className="p-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E5EA] bg-white">
                  {checkpoints.length === 0 ? (
                    <tr><td colSpan="6" className="p-10 text-center text-[#6F6B75]">جاري تحميل نقاط التفتيش من سوبابيز...</td></tr>
                  ) : (
                    checkpoints.map((chk, idx) => (
                      <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                        <td className="p-3 font-bold text-[#8F2A87]">{chk.production_stage || 'الفحص النهائي'}</td>
                        <td className="p-3 font-bold text-[#25232A]">{chk.checkpoint_name}</td>
                        <td className="p-3 text-[#6F6B75] max-w-xs">{chk.criteria || chk.description || '--'}</td>
                        <td className="p-3 text-center font-mono font-bold text-[#007F8C]">±{chk.tolerance || 0} سم</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${chk.required !== false ? 'bg-rose-50 text-[#D64545]' : 'bg-slate-100 text-slate-700'}`}>
                            {chk.required !== false ? 'إلزامي ⚠️' : 'إرشادي ℹ️'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                            نشط 🟢
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* مستهدفات الأداء والمؤشرات */}
          <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
            <div className="pb-3 border-b border-[#E8E5EA]">
              <h3 className="font-bold text-sm text-[#25232A]">مستهدفات ومحددات الجودة الإدارية (Quality Thresholds & Settings)</h3>
              <p className="text-xs text-[#6F6B75] mt-0.5">المستهدفات والحدود الحرجة المعتمدة لاحتساب كفاءة المعمل ومؤشر OQS</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {qualitySettings.map((s, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#25232A]">{s.metric_name}</span>
                    <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-[#E8E5EA] text-[#8F2A87] font-bold">{s.metric_code}</span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-[11px] text-[#6F6B75]">المستهدف القياسي:</span>
                    <span className="font-mono font-bold text-sm text-[#007F8C]">{s.target}%</span>
                  </div>
                  <div className="flex items-baseline justify-between text-[11px] text-[#6F6B75]">
                    <span>الحد التحذيري:</span>
                    <span className="font-mono text-amber-600 font-bold">{s.warning_threshold}%</span>
                  </div>
                  <div className="flex items-baseline justify-between text-[11px] text-[#6F6B75]">
                    <span>الحد الحرج:</span>
                    <span className="font-mono text-[#D64545] font-bold">{s.critical_threshold}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. تبويب سجل الجودة الرئيسي */}
      {activeTab === 'master_ledger' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E8E5EA]">
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">سجل الجودة والتقييمات الرئيسي (Master Quality Ledger)</h3>
              <p className="text-xs text-[#6F6B75] mt-0.5">سجل الجودة المؤسسي المعتمد بجميع المعايير القياسية (سوبابيز)</p>
            </div>
            <button
              onClick={() => onOpenModal('eval')}
              className="px-4 py-2 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-xl text-xs font-bold cursor-pointer transition"
            >
              ➕ إضافة تقييم للسجل الرئيسي
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="p-3">رقم التقييم والتاريخ</th>
                  <th className="p-3">نوع التقييم والكيان</th>
                  <th className="p-3">القسم</th>
                  <th className="p-3 text-center">الدرجة</th>
                  <th className="p-3 text-center">النسبة %</th>
                  <th className="p-3">المعيار والتعليق</th>
                  <th className="p-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {masterEvaluations.length === 0 ? (
                  <tr><td colSpan="7" className="p-10 text-center text-[#6F6B75]">لا توجد تقييمات رئيسية مسجلة حتى الآن</td></tr>
                ) : (
                  masterEvaluations.map((ev, idx) => (
                    <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="p-3">
                        <div className="font-bold font-mono text-[#8F2A87]">#{ev.record_id || ev.Record_ID}</div>
                        <div className="text-[11px] text-[#6F6B75] font-mono">{String(ev.record_date || ev.Record_Date || '').split('T')[0]}</div>
                      </td>
                      <td className="p-3 font-bold text-[#25232A]">{ev.evaluation_type || ev.Evaluation_Type}: {ev.entity_name || ev.Entity_Name || 'عام'}</td>
                      <td className="p-3 text-[#6F6B75]">{ev.department || ev.Department || 'الإنتاج'}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#F28A00]">{ev.score || ev.Score} / {ev.max_score || ev.Max_Score || 5}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#007F8C]">{ev.percentage || ev.Percentage}%</td>
                      <td className="p-3 text-[#6F6B75] max-w-xs truncate">{ev.quality_criteria || ev.Quality_Criteria} • {ev.comment || ev.Comment || '--'}</td>
                      <td className="p-3 text-center font-bold">{ev.status || ev.Status || 'Active'}</td>
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

window.FeedbackStandardsTab = FeedbackStandardsTab;
