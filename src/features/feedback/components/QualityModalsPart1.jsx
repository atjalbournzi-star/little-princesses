// src/features/feedback/components/QualityModalsPart1.jsx
// نوافذ تسجيل التقييم في السجل الرئيسي وفحص الجودة الميداني

function QualityModalsPart1({
  activeModalType,
  onClose,
  products = [],
  masterEvalForm,
  setMasterEvalForm,
  onSubmitMasterEval,
  inspectionForm,
  setInspectionForm,
  onSubmitInspection,
  isSubmitting
}) {
  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#B0005A] focus:ring-2 focus:ring-[#FCE8F2] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <>
      {/* Modal: Master Evaluation */}
      {activeModalType === 'eval' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#E8E5EA] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <h3 className="font-bold text-sm text-[#25232A]">➕ تسجيل تقييم في سجل "الجودة والتقييمات" الرئيسي</h3>
              <button onClick={onClose} className="text-[#6F6B75] hover:text-[#25232A] font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={onSubmitMasterEval} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>نوع التقييم</label>
                  <select 
                    value={masterEvalForm.evaluation_type} 
                    onChange={e => setMasterEvalForm({ ...masterEvalForm, evaluation_type: e.target.value })} 
                    className={inputCls}
                  >
                    <option value="Customer">تقييم عميل</option>
                    <option value="Product">تقييم منتج / موديل</option>
                    <option value="Fabric">تقييم قماش / خامة</option>
                    <option value="Supplier">تقييم مورد</option>
                    <option value="Designer">تقييم مصمم</option>
                    <option value="Tailor">تقييم خياط / معمل</option>
                    <option value="Department">تقييم قسم</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>القسم المسؤول</label>
                  <select 
                    value={masterEvalForm.department} 
                    onChange={e => setMasterEvalForm({ ...masterEvalForm, department: e.target.value })} 
                    className={inputCls}
                  >
                    <option>التصميم والباترون</option>
                    <option>الإنتاج والخياطة</option>
                    <option>فحص الخامات</option>
                    <option>التشطيب والتغليف</option>
                    <option>خدمة العملاء</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>اسم الكيان المراد تقييمه</label>
                <input 
                  type="text" 
                  value={masterEvalForm.entity_name} 
                  onChange={e => setMasterEvalForm({ ...masterEvalForm, entity_name: e.target.value })} 
                  className={inputCls}
                  placeholder="اسم المنتج أو المورد أو الخياط..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>الدرجة الممنوحة</label>
                  <input type="number" min="0" max="100" value={masterEvalForm.score} onChange={e => setMasterEvalForm({ ...masterEvalForm, score: e.target.value })} className={inputCls + " text-center font-mono font-bold"} required />
                </div>
                <div>
                  <label className={labelCls}>الدرجة العظمى</label>
                  <input type="number" min="1" max="100" value={masterEvalForm.max_score} onChange={e => setMasterEvalForm({ ...masterEvalForm, max_score: e.target.value })} className={inputCls + " text-center font-mono font-bold"} required />
                </div>
              </div>
              <div>
                <label className={labelCls}>معيار التقييم والملاحظات</label>
                <textarea rows="3" value={masterEvalForm.comment} onChange={e => setMasterEvalForm({ ...masterEvalForm, comment: e.target.value })} className="w-full p-3 bg-white border border-[#E8E5EA] rounded-xl text-xs outline-none resize-none" placeholder="اكتب الملاحظات والتفاصيل..." />
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E8E5EA]">
                <button type="button" onClick={onClose} className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA] cursor-pointer">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer">
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ التقييم في سوبابيز 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Inspection */}
      {activeModalType === 'inspection' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#E8E5EA] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <h3 className="font-bold text-sm text-[#25232A]">➕ تسجيل فحص جودة جديد (Quality Inspection)</h3>
              <button onClick={onClose} className="text-[#6F6B75] hover:text-[#25232A] font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={onSubmitInspection} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>الموديل / الفستان</label>
                  <select value={inspectionForm.product_name} onChange={e => setInspectionForm({ ...inspectionForm, product_name: e.target.value })} className={inputCls} required>
                    <option value="">-- اختر الموديل --</option>
                    {products.map(p => <option key={p.id} value={p.name || p.model_name}>{p.name || p.model_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>مرحلة الإنتاج</label>
                  <select value={inspectionForm.production_stage} onChange={e => setInspectionForm({ ...inspectionForm, production_stage: e.target.value })} className={inputCls}>
                    <option>فحص الخامات</option>
                    <option>القص والباترون</option>
                    <option>الخياطة</option>
                    <option>التطريز والشك</option>
                    <option>الفحص النهائي</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className={labelCls}>الكمية المفحوصة</label>
                  <input type="number" min="1" value={inspectionForm.quantity_checked} onChange={e => setInspectionForm({ ...inspectionForm, quantity_checked: e.target.value })} className={inputCls + " text-center font-mono"} required />
                </div>
                <div>
                  <label className={labelCls}>الكمية الناجحة</label>
                  <input type="number" min="0" value={inspectionForm.quantity_passed} onChange={e => setInspectionForm({ ...inspectionForm, quantity_passed: e.target.value })} className={inputCls + " text-center font-mono"} required />
                </div>
                <div>
                  <label className={labelCls}>نتيجة الفحص</label>
                  <select value={inspectionForm.inspection_result} onChange={e => setInspectionForm({ ...inspectionForm, inspection_result: e.target.value })} className={inputCls}>
                    <option value="PASS">ناجح (PASS)</option>
                    <option value="FAIL">راسب (FAIL)</option>
                    <option value="REWORK">إعادة تشغيل (REWORK)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>ملاحظات المفتش</label>
                <textarea rows="3" value={inspectionForm.notes} onChange={e => setInspectionForm({ ...inspectionForm, notes: e.target.value })} className="w-full p-3 bg-white border border-[#E8E5EA] rounded-xl text-xs outline-none resize-none" placeholder="أي تفاصيل أو ملاحظات..." />
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E8E5EA]">
                <button type="button" onClick={onClose} className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA] cursor-pointer">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#B0005A] hover:bg-[#8E0049] text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer">
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ الفحص في سوبابيز 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

window.QualityModalsPart1 = QualityModalsPart1;
