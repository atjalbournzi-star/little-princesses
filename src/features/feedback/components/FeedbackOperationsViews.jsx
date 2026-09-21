// src/features/feedback/components/FeedbackOperationsViews.jsx
// جداول عمليات فحص الجودة الميدانية وعيوب التصنيع

function FeedbackOperationsViews({
  activeTab,
  inspections = [],
  defects = [],
  currencyDisplay = "YER ريال",
  onOpenModal,
  onOpenCertModal
}) {
  return (
    <div className="space-y-6">
      {/* 1. تبويب عمليات الفحص (Inspections) */}
      {activeTab === 'inspections' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">سجل عمليات فحص الجودة الميدانية (Quality Inspections)</h3>
              <p className="text-xs text-[#6F6B75] mt-0.5">سجل حقيقي متصل بقاعدة بيانات PostgreSQL السحابية (سوبابيز) وموثق لكل فستان</p>
            </div>
            <button
              onClick={() => onOpenModal('inspection')}
              className="px-4 py-2 bg-[#B0005A] hover:bg-[#8E0049] text-white rounded-xl text-xs font-bold cursor-pointer transition"
            >
              ➕ فحص جودة جديد
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="p-3">رقم الفحص والتاريخ</th>
                  <th className="p-3">المنتج / الطلب</th>
                  <th className="p-3">مرحلة الإنتاج</th>
                  <th className="p-3 text-center">المفحوص</th>
                  <th className="p-3 text-center">الناجح</th>
                  <th className="p-3 text-center">المعيب</th>
                  <th className="p-3 text-center">النتيجة</th>
                  <th className="p-3">المفتش والملاحظات</th>
                  <th className="p-3 text-center">شهادة الجودة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {inspections.length === 0 ? (
                  <tr><td colSpan="9" className="p-10 text-center text-[#6F6B75]">لا توجد عمليات فحص مسجلة حتى الآن</td></tr>
                ) : (
                  inspections.map((insp, idx) => (
                    <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="p-3">
                        <div className="font-bold font-mono text-[#8F2A87]">#{insp.inspection_id || insp.Inspection_ID || insp.id}</div>
                        <div className="text-[11px] text-[#6F6B75] font-mono">{String(insp.inspection_date || insp.Inspection_Date || '').split('T')[0]}</div>
                      </td>
                      <td className="p-3 font-bold text-[#25232A]">{insp.product_name || insp.Product_Name || 'طلب عام'}</td>
                      <td className="p-3 text-[#6F6B75]">{insp.production_stage || insp.Production_Stage}</td>
                      <td className="p-3 text-center font-mono">{insp.quantity_checked || insp.Quantity_Checked || 1}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#007F8C]">{insp.quantity_passed || insp.Quantity_Passed || 1}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#D64545]">{insp.quantity_failed || insp.Quantity_Failed || 0}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                          String(insp.inspection_result || insp.Inspection_Result || '').toUpperCase() === 'PASS' ? 'bg-[#E2F5F7] text-[#007F8C]' : 'bg-rose-50 text-[#D64545]'
                        }`}>
                          {insp.inspection_result || insp.Inspection_Result || 'PASS'}
                        </span>
                      </td>
                      <td className="p-3 text-[#6F6B75] max-w-xs truncate">{insp.notes || insp.Notes || '--'}</td>
                      <td className="p-3 text-center">
                        {String(insp.inspection_result || insp.Inspection_Result || '').toUpperCase() === 'PASS' ? (
                          <button
                            onClick={() => onOpenCertModal(insp)}
                            className="px-2.5 py-1 bg-[#FCE8F2] hover:bg-[#F2A4CB] text-[#B0005A] rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>🎖️ كرت الفحص</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#6F6B75]">--</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. تبويب العيوب والتكاليف (Defects) */}
      {activeTab === 'defects' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">سجل عيوب التصنيع وتكلفة COPQ (Quality Defects)</h3>
              <p className="text-xs text-[#6F6B75] mt-0.5">سجل حقيقي متصل بقاعدة بيانات PostgreSQL السحابية (سوبابيز) وتوثيق التكاليف</p>
            </div>
            <button
              onClick={() => onOpenModal('defect')}
              className="px-4 py-2 bg-[#F28A00] hover:bg-[#C97300] text-white rounded-xl text-xs font-bold cursor-pointer transition"
            >
              ➕ تسجيل عيب
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="p-3">رقم العيب والتاريخ</th>
                  <th className="p-3">المنتج والمرحلة</th>
                  <th className="p-3">نوع العيب</th>
                  <th className="p-3 text-center">الدرجة</th>
                  <th className="p-3 text-center">تكلفة الإصلاح</th>
                  <th className="p-3">السبب الجذري</th>
                  <th className="p-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {defects.length === 0 ? (
                  <tr><td colSpan="7" className="p-10 text-center text-[#6F6B75]">لا توجد عيوب مسجلة حتى الآن</td></tr>
                ) : (
                  defects.map((def, idx) => (
                    <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="p-3">
                        <div className="font-bold font-mono text-[#D64545]">#{def.defect_id || def.Defect_ID}</div>
                        <div className="text-[11px] text-[#6F6B75] font-mono">{String(def.defect_date || def.Defect_Date || '').split('T')[0]}</div>
                      </td>
                      <td className="p-3 font-bold text-[#25232A]">{def.product_name || def.Product_Name || 'فستان'} • {def.production_stage || def.Production_Stage}</td>
                      <td className="p-3 text-[#6F6B75]">{def.defect_type || def.Defect_Type}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (def.severity || def.Severity) === 'Critical' ? 'bg-rose-100 text-[#D64545]' : (def.severity || def.Severity) === 'High' ? 'bg-amber-100 text-[#C97300]' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {def.severity || def.Severity || 'Medium'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-[#D64545]">
                        {(parseFloat(def.rework_cost || def.Rework_Cost || 0)).toLocaleString('en-US')} {currencyDisplay}
                      </td>
                      <td className="p-3 text-[#6F6B75] max-w-xs truncate">{def.root_cause || def.Root_Cause || '--'}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-[#FAFAFB] border border-[#E8E5EA] text-[10.5px] font-bold">
                          {def.status || def.Status || 'Open'}
                        </span>
                      </td>
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

window.FeedbackOperationsViews = FeedbackOperationsViews;
