// EmployeeTable.jsx - جدول واستعراض بطاقات الموظفين والخيارات الإدارية

function EmployeeTable({
  employees = [],
  currencyDisplay = "SAR",
  calculateEmployeeCompletedTasks,
  toggleEmpStatus,
  deleteEmp,
  onEditEmployee,
}) {
  if (employees.length === 0) {
    return (
      <div className="bg-white border border-[#E8E5EA] rounded-2xl p-12 text-center text-[#6F6B75] font-medium shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <span className="text-4xl block mb-2">📭</span>
        <p className="text-sm font-bold text-[#25232A]">لا يوجد موظفون يطابقون معايير البحث والفلترة</p>
        <p className="text-xs text-[#6F6B75] mt-1">تأكد من شروط الفلتر أو أضف موظفاً جديداً.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
          >
            <div
              className={`absolute top-0 right-0 w-1.5 h-full ${
                emp.status === "نشط" ? "bg-[#009FAE]" : "bg-[#D64545]"
              }`}
            ></div>

            <div>
              {/* ترويسة بطاقة الموظف */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-[#25232A] text-sm">{emp.name}</h4>
                  <div className="flex gap-2 items-center mt-1">
                    <span className="text-[11px] font-bold text-[#8F2A87] bg-[#F2E7F3] px-2 py-0.5 rounded-md border border-[#E5CEE7]">
                      {emp.role}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        emp.status === "نشط"
                          ? "bg-[#E2F5F7] text-[#007F8C]"
                          : "bg-rose-50 text-[#D64545]"
                      }`}
                    >
                      {emp.status}
                    </span>
                  </div>
                </div>

                {calculateEmployeeCompletedTasks &&
                  ["خياط", "قصاص", "تشطيب", "تطريز"].includes(emp.role) && (
                    <div className="text-center bg-[#F2E7F3] px-3 py-1 rounded-xl border border-[#E5CEE7]">
                      <div className="text-xl font-bold font-mono text-[#8F2A87]">
                        {calculateEmployeeCompletedTasks(emp.name)}
                      </div>
                      <div className="text-[9px] text-[#8F2A87] font-semibold">
                        مهام منجزة
                      </div>
                    </div>
                  )}
              </div>

              {/* تفاصيل الموظف */}
              <div className="space-y-1.5 mb-4 text-xs">
                {emp.phone && (
                  <div className="flex justify-between font-medium">
                    <span className="text-[#6F6B75]">رقم الهاتف:</span>
                    <span className="text-[#25232A] font-mono" dir="ltr">
                      {emp.phone}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-medium">
                  <span className="text-[#6F6B75]">نظام الدفع:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                      emp.type === "بالقطعة"
                        ? "bg-[#FFF1DC] text-[#C97300]"
                        : "bg-[#E2F5F7] text-[#007F8C]"
                    }`}
                  >
                    {emp.type || "راتب شهري"}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-[#6F6B75]">
                    {emp.type === "بالقطعة" ? "أجر القطعة:" : "الراتب الأساسي:"}
                  </span>
                  <span className="text-[#25232A] font-bold font-mono tabular-nums">
                    {(emp.baseSalary || emp.base_salary || 0).toLocaleString("en-US")}{" "}
                    <span className="text-[10px] font-medium text-[#6F6B75] font-sans">
                      {currencyDisplay}
                    </span>
                  </span>
                </div>
                {(emp.hireDate || emp.hire_date) && (
                  <div className="flex justify-between font-medium text-[11px] text-[#6F6B75]">
                    <span>تاريخ التعيين:</span>
                    <span className="font-mono">
                      {emp.hireDate || emp.hire_date}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* الأزرار الإدارية */}
            <div className="flex items-center gap-2 pt-3 border-t border-[#E8E5EA]">
              {onEditEmployee && (
                <button
                  type="button"
                  onClick={() => onEditEmployee(emp)}
                  className="p-1.5 px-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] border border-[#E8E5EA] rounded-lg text-xs font-bold text-[#8F2A87] transition cursor-pointer"
                  title="تعديل بيانات الموظف"
                >
                  ✏️ تعديل
                </button>
              )}
              <button
                type="button"
                onClick={() => toggleEmpStatus(emp.id)}
                className="flex-1 py-1.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] border border-[#E8E5EA] rounded-lg text-xs font-bold text-[#25232A] transition cursor-pointer"
              >
                {emp.status === "نشط" ? "إيقاف مؤقت ⏸️" : "تنشيط ▶️"}
              </button>
              <button
                type="button"
                onClick={() => deleteEmp(emp.id)}
                className="w-8 h-8 flex items-center justify-center bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-[#D64545] transition cursor-pointer"
                title="حذف الموظف نهائياً"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
