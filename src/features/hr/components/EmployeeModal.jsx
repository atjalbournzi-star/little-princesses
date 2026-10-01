// EmployeeModal.jsx - نافذة إضافة وتعديل بيانات الموظف والراتب وتفاصيل العقد
const { useState: useModalState, useEffect: useModalEffect } = React;

function EmployeeModal({
  isOpen,
  onClose,
  onSave,
  editingEmployee = null,
  currencyDisplay = "SAR",
}) {
  const [empName, setEmpName] = useModalState("");
  const [empRole, setEmpRole] = useModalState("خياط");
  const [empType, setEmpType] = useModalState("راتب شهري");
  const [empSalary, setEmpSalary] = useModalState("");
  const [empPhone, setEmpPhone] = useModalState("");
  const [empDate, setEmpDate] = useModalState(
    new Date().toISOString().split("T")[0]
  );
  const [empStatus, setEmpStatus] = useModalState("نشط");

  useModalEffect(() => {
    if (editingEmployee) {
      setEmpName(editingEmployee.name || "");
      setEmpRole(editingEmployee.role || "خياط");
      setEmpType(editingEmployee.type || "راتب شهري");
      setEmpSalary(
        editingEmployee.baseSalary || editingEmployee.base_salary || ""
      );
      setEmpPhone(editingEmployee.phone || "");
      setEmpDate(
        editingEmployee.hireDate ||
          editingEmployee.hire_date ||
          new Date().toISOString().split("T")[0]
      );
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

  const inputCls =
    "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(e, {
      id: editingEmployee ? editingEmployee.id : null,
      empName,
      empRole,
      empType,
      empSalary,
      empPhone,
      empDate,
      empStatus,
      resetForm: onClose,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-[#E8E5EA] shadow-2xl overflow-hidden animate-scaleUp">
        <div className="p-5 border-b border-[#E8E5EA] flex justify-between items-center bg-gradient-to-r from-[#F2E7F3] via-white to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8F2A87] text-white flex items-center justify-center text-lg font-bold">
              {editingEmployee ? "✏️" : "👤"}
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">
                {editingEmployee
                  ? "تعديل بيانات الموظف والعقد"
                  : "إضافة موظف أو فني جديد"}
              </h3>
              <p className="text-xs text-[#6F6B75]">
                تسجيل بيانات الكادر ونظام الرواتب والأجور
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#E8E5EA] flex items-center justify-center text-sm font-bold text-[#6F6B75] hover:bg-[#E8E5EA] transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-right">
          <div>
            <label className={labelCls}>
              الاسم الرباعي <span className="text-[#D64545] font-bold">*</span>
            </label>
            <input
              type="text"
              value={empName}
              onChange={(e) => setEmpName(e.target.value)}
              required
              className={inputCls}
              placeholder="اسم الموظف..."
            />
          </div>

          <div>
            <label className={labelCls}>رقم الهاتف</label>
            <input
              type="tel"
              value={empPhone}
              onChange={(e) => setEmpPhone(e.target.value)}
              placeholder="05XXXXXXXX"
              className={inputCls}
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>نظام الدفع</label>
              <select
                value={empType}
                onChange={(e) => setEmpType(e.target.value)}
                className={inputCls}
              >
                <option value="راتب شهري">راتب شهري ثابت</option>
                <option value="بالقطعة">أجر بالقطعة / الحبة</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>المسمى الوظيفي</label>
              <select
                value={empRole}
                onChange={(e) => setEmpRole(e.target.value)}
                className={inputCls}
              >
                <option value="خياط">خياط</option>
                <option value="قصاص">قصاص</option>
                <option value="تشطيب">تشطيب</option>
                <option value="تطريز">تطريز</option>
                <option value="إدارة">إدارة</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                {empType === "راتب شهري"
                  ? `الراتب الأساسي (${currencyDisplay}) *`
                  : `أجر القطعة (${currencyDisplay}) *`}
              </label>
              <input
                type="number"
                min="0"
                value={empSalary}
                onChange={(e) => setEmpSalary(e.target.value)}
                required
                className={`${inputCls} font-mono font-bold text-[#8F2A87]`}
              />
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

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] font-bold text-xs rounded-xl border border-[#E8E5EA] transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-2 py-3 bg-[#8F2A87] hover:bg-[#73216C] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>💾</span>
              <span>{editingEmployee ? "تحديث البيانات" : "حفظ الموظف"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
