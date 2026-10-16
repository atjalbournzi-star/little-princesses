// EmployeeModal.jsx - نافذة إضافة وتعديل بيانات الموظف والراتب وتفاصيل العقد
const { useState: useModalState, useEffect: useModalEffect } = React;

function EmployeeModal({
  isOpen, onClose, onSave, editingEmployee = null, currencyDisplay = "SAR"
}) {
  const [empName, setEmpName] = useModalState("");
  const [empRole, setEmpRole] = useModalState("خياط");
  const [empType, setEmpType] = useModalState("راتب شهري");
  const [empSalary, setEmpSalary] = useModalState("");
  const [empPhone, setEmpPhone] = useModalState("");
  const [empDate, setEmpDate] = useModalState(new Date().toISOString().split("T")[0]);
  const [empStatus, setEmpStatus] = useModalState("نشط");
  const [isSubmitting, setIsSubmitting] = useModalState(false);

  useModalEffect(() => {
    setIsSubmitting(false);
    if (editingEmployee) {
      setEmpName(editingEmployee.name || "");
      setEmpRole(editingEmployee.role || "خياط");
      setEmpType(editingEmployee.type || "راتب شهري");
      setEmpSalary(editingEmployee.baseSalary || editingEmployee.base_salary || "");
      setEmpPhone(editingEmployee.phone || "");
      setEmpDate(editingEmployee.hireDate || editingEmployee.hire_date || new Date().toISOString().split("T")[0]);
      setEmpStatus(editingEmployee.status || "نشط");
    } else {
      setEmpName("");
      setEmpRole("خياط");
      setEmpType("راتب شهري");
      setEmpSalary("");
      setEmpPhone("");
      setEmpDate(new Date().toISOString().split("T")[0]);
      setEmpStatus("نشط");
    }
  }, [editingEmployee, isOpen]);

  if (!isOpen) return null;

  const inputCls = "w-full h-7 px-2.5 rounded-lg border border-slate-700 bg-[#0F172A] text-white text-xs font-medium focus:border-pink-500 outline-none transition";
  const labelCls = "block text-[11px] font-semibold text-slate-300 mb-0.5";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSave(e, {
        id: editingEmployee ? editingEmployee.id : null,
        empName, empRole, empType,
        empSalary: empType === "بالقطعة" ? (empSalary || 0) : empSalary,
        empPhone, empDate, empStatus,
        resetForm: onClose
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm select-none" dir="rtl">
      <div className="w-full max-w-lg bg-[#111C38] border border-slate-700 rounded-xl shadow-2xl overflow-hidden p-0 flex flex-col text-right animate-scaleUp">
        {/* ترويسة النافذة المدمجة */}
        <div className="h-8 px-3.5 flex items-center justify-between border-b border-slate-800 bg-[#0F172A] shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="font-bold text-xs text-white">
              {editingEmployee ? "تعديل بيانات الموظف والعقد" : "إضافة موظف أو فني جديد"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* نموذج البيانات المضغوط والخالي من النصوص المؤقتة */}
        <form onSubmit={handleSubmit} className="p-3 space-y-2 text-right">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>
                الاسم الرباعي <span className="text-rose-400 font-bold">*</span>
              </label>
              <input
                type="text"
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>رقم الهاتف</label>
              <input
                type="tel"
                value={empPhone}
                onChange={(e) => setEmpPhone(e.target.value)}
                className={inputCls}
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>نظام الدفع</label>
              <select value={empType} onChange={(e) => setEmpType(e.target.value)} className={inputCls + " cursor-pointer"}>
                <option value="راتب شهري">راتب شهري ثابت</option>
                <option value="بالقطعة">أجر بالقطعة / بالإنتاج (BOM)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>المسمى والتخصص الفني</label>
              <select value={empRole} onChange={(e) => setEmpRole(e.target.value)} className={inputCls + " cursor-pointer"}>
                <option value="خياط">خياط (خياطة وتفصيل)</option>
                <option value="قصاص">قصاص (قص وباترون)</option>
                <option value="تطريز">فني تطريز وشك</option>
                <option value="تشطيب">فني تشطيب وكي</option>
                <option value="تغليف">فني تغليف وإكسسوار</option>
                <option value="إدارة">إدارة وإشراف عام</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>
                {empType === "راتب شهري" ? `الراتب الأساسي (${currencyDisplay}) *` : `نظام الاستحقاق المالي`}
              </label>
              {empType === "راتب شهري" ? (
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={empSalary}
                  onChange={(e) => setEmpSalary(e.target.value)}
                  required
                  className={`${inputCls} font-mono font-bold text-white`}
                />
              ) : (
                <div className="w-full h-7 px-2 rounded-lg border border-pink-500/40 bg-pink-950/20 text-pink-300 text-[11px] font-bold flex items-center justify-between select-none">
                  <span>تسعيرة BOM من الموديل</span>
                  <span className="text-[10px] text-pink-400">تلقائي ⚡</span>
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>تاريخ التعيين</label>
              <input
                type="date"
                lang="en-GB"
                dir="ltr"
                value={empDate}
                onChange={(e) => setEmpDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>حالة الموظف</label>
              <select value={empStatus} onChange={(e) => setEmpStatus(e.target.value)} className={inputCls}>
                <option value="نشط">نشط ✅</option>
                <option value="موقوف">موقوف مؤقتاً ⏸️</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="w-full h-7 px-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">العملة:</span>
                <span className="font-mono font-bold text-pink-400">{currencyDisplay}</span>
              </div>
            </div>
          </div>

          {/* شريط الأزرار السفلي المدمج */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="h-6.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-md transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`h-6.5 px-3.5 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-md shadow-xs transition flex items-center justify-center gap-1.5 ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <svg className={`w-3.5 h-3.5 text-white shrink-0 ${isSubmitting ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                {isSubmitting ? (
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                )}
              </svg>
              <span>{isSubmitting ? "جارٍ الحفظ..." : (editingEmployee ? "تحديث البيانات" : "حفظ الموظف")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.EmployeeModal = EmployeeModal;
