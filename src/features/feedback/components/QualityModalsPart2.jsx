// src/features/feedback/components/QualityModalsPart2.jsx
// نوافذ تسجيل عيوب الجودة وإجراءات التصحيح والوقاية (CAPA)

function QualityModalsPart2({
  activeModalType,
  onClose,
  products = [],
  defectForm,
  setDefectForm,
  onSubmitDefect,
  capaForm,
  setCapaForm,
  onSubmitCAPA,
  currencyDisplay = "YER ريال",
  isSubmitting
}) {
  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#B0005A] focus:ring-2 focus:ring-[#FCE8F2] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <>
      {/* Modal: Add Defect */}
      {activeModalType === 'defect' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#E8E5EA] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <h3 className="font-bold text-sm text-[#25232A]">⚠️ تسجيل عيب جودة وتكلفة الإصلاح (Quality Defect)</h3>
              <button onClick={onClose} className="text-[#6F6B75] hover:text-[#25232A] font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={onSubmitDefect} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>الموديل / الفستان</label>
                  <select value={defectForm.product_name} onChange={e => setDefectForm({ ...defectForm, product_name: e.target.value })} className={inputCls} required>
                    <option value="">-- اختر الموديل --</option>
                    {products.map(p => <option key={p.id} value={p.name || p.model_name}>{p.name || p.model_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>نوع العيب</label>
                  <select value={defectForm.defect_type} onChange={e => setDefectForm({ ...defectForm, defect_type: e.target.value })} className={inputCls}>
                    <option>عيب خياطة</option>
                    <option>عيب قص</option>
                    <option>عيب تشطيب</option>
                    <option>عيب قماش</option>
                    <option>عيب مقاس</option>
                    <option>عيب تطريز</option>
                    <option>عيب تغليف</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>الدرجة (Severity)</label>
                  <select value={defectForm.severity} onChange={e => setDefectForm({ ...defectForm, severity: e.target.value })} className={inputCls}>
                    <option value="Critical">حرج (Critical)</option>
                    <option value="High">مرتفع (High)</option>
                    <option value="Medium">متوسط (Medium)</option>
                    <option value="Low">منخفض (Low)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>تكلفة الإصلاح التقديرية ({currencyDisplay})</label>
                  <input type="number" min="0" value={defectForm.rework_cost} onChange={e => setDefectForm({ ...defectForm, rework_cost: e.target.value })} className={inputCls + " font-mono font-bold text-[#D64545]"} />
                </div>
              </div>
              <div>
                <label className={labelCls}>السبب الجذري للمشكلة (Root Cause)</label>
                <input type="text" value={defectForm.root_cause} onChange={e => setDefectForm({ ...defectForm, root_cause: e.target.value })} className={inputCls} placeholder="مثال: شد الخيط زائد، خطأ باترون..." />
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E8E5EA]">
                <button type="button" onClick={onClose} className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA] cursor-pointer">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#F28A00] hover:bg-[#C97300] text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer">
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ العيب في سوبابيز 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add CAPA */}
      {activeModalType === 'capa' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#E8E5EA] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <h3 className="font-bold text-sm text-[#25232A]">🛡️ تسجيل إجراء تصحيحي ووقائي (CAPA)</h3>
              <button onClick={onClose} className="text-[#6F6B75] hover:text-[#25232A] font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={onSubmitCAPA} className="space-y-4">
              <div>
                <label className={labelCls}>المشكلة المرصودة</label>
                <input type="text" value={capaForm.problem} onChange={e => setCapaForm({ ...capaForm, problem: e.target.value })} className={inputCls} required placeholder="وصف المشكلة بدقة..." />
              </div>
              <div>
                <label className={labelCls}>السبب الجذري للمشكلة (Root Cause)</label>
                <input type="text" value={capaForm.root_cause} onChange={e => setCapaForm({ ...capaForm, root_cause: e.target.value })} className={inputCls} placeholder="السبب الجذري..." />
              </div>
              <div>
                <label className={labelCls}>الإجراء المعتمد لتفادي التكرار</label>
                <textarea rows="3" value={capaForm.action_description} onChange={e => setCapaForm({ ...capaForm, action_description: e.target.value })} className="w-full p-3 bg-white border border-[#E8E5EA] rounded-xl text-xs outline-none resize-none" required placeholder="خطوات الإجراء الوقائي..." />
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E8E5EA]">
                <button type="button" onClick={onClose} className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA] cursor-pointer">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer">
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ الإجراء في سوبابيز 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

window.QualityModalsPart2 = QualityModalsPart2;
