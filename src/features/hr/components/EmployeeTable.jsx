// EmployeeTable.jsx - جدول واستعراض بطاقات الموظفين والخيارات الإدارية (نمط CRM المدمج)
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
      <div className="bg-[#111C38] border border-slate-800 rounded-xl p-8 text-center text-slate-400 font-medium select-none">
        <span className="text-3xl block mb-1">📭</span>
        <p className="text-xs font-bold text-white">لا يوجد موظفون يطابقون معايير البحث والفلترة</p>
        <p className="text-[11px] text-slate-400 mt-0.5">تأكد من شروط الفلتر أو أضف موظفاً جديداً.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className="p-2.5 rounded-xl bg-[#111C38] border border-slate-800/90 hover:border-slate-700/80 shadow-xs transition relative overflow-hidden flex flex-col justify-between"
          >
            <div
              className={`absolute top-0 right-0 w-1 h-full ${
                emp.status === "نشط" ? "bg-emerald-500" : "bg-rose-500"
              }`}
            ></div>

            <div>
              {/* ترويسة بطاقة الموظف */}
              <div className="h-6 mb-1 text-xs font-bold text-white flex items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <h4 className="font-bold text-white text-xs truncate">{emp.name}</h4>
                  <span className="text-[10px] font-bold text-pink-300 bg-pink-950/60 px-1.5 py-0.2 rounded border border-pink-800/40 shrink-0">
                    {emp.role}
                  </span>
                  <span
                    className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${
                      emp.status === "نشط"
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/40"
                        : "bg-rose-950/60 text-rose-300 border-rose-800/40"
                    }`}
                  >
                    {emp.status}
                  </span>
                </div>

                {calculateEmployeeCompletedTasks &&
                  ["خياط", "قصاص", "تشطيب", "تطريز", "تغليف"].includes(emp.role) && (
                    <div className="text-center bg-slate-900/80 px-1.5 py-0.2 rounded border border-slate-800 shrink-0">
                      <span className="text-[11px] font-bold font-mono text-pink-400">
                        {calculateEmployeeCompletedTasks(emp.name)}
                      </span>
                      <span className="text-[8.5px] text-slate-300 mr-1 font-medium">
                        مهمة
                      </span>
                    </div>
                  )}
              </div>

              {/* تفاصيل الموظف - شبكة ثنائية مدمجة تقضي على التشتت */}
              <div className="grid grid-cols-2 gap-1.5 my-2 text-[10.5px]">
                {/* الهاتف */}
                <div className="bg-[#0B132B]/70 border border-slate-800/80 rounded-md p-1.5 flex flex-col justify-center">
                  <span className="text-[9.5px] text-slate-400 font-sans mb-0.5">الهاتف</span>
                  <span dir="ltr" className="text-white font-mono font-bold truncate text-right">
                    {emp.phone || "—"}
                  </span>
                </div>

                {/* نظام الدفع */}
                <div className="bg-[#0B132B]/70 border border-slate-800/80 rounded-md p-1.5 flex flex-col justify-center">
                  <span className="text-[9.5px] text-slate-400 font-sans mb-0.5">نظام الدفع</span>
                  <span className="truncate">
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold border ${
                        emp.type === "بالقطعة"
                          ? "bg-amber-950/60 text-amber-300 border-amber-800/40"
                          : "bg-cyan-950/60 text-cyan-300 border-cyan-800/40"
                      }`}
                    >
                      {emp.type || "راتب شهري"}
                    </span>
                  </span>
                </div>

                {/* نظام الأجر / الراتب الأساسي */}
                <div className="bg-[#0B132B]/70 border border-slate-800/80 rounded-md p-1.5 flex flex-col justify-center">
                  <span className="text-[9.5px] text-slate-400 font-sans mb-0.5">
                    {emp.type === "بالقطعة" ? "نظام الأجر" : "الراتب الأساسي"}
                  </span>
                  <span className="text-white font-mono font-bold text-[10.5px] tabular-nums truncate">
                    {emp.type === "بالقطعة" && !(emp.baseSalary || emp.base_salary) ? (
                      <span className="text-pink-300 font-sans text-[9.5px]">تسعيرة BOM</span>
                    ) : (
                      <>
                        {(emp.baseSalary || emp.base_salary || 0).toLocaleString("en-US")}{" "}
                        <span className="text-[9px] font-bold text-slate-400 font-sans">
                          {currencyDisplay}
                        </span>
                      </>
                    )}
                  </span>
                </div>

                {/* تاريخ التعيين */}
                <div className="bg-[#0B132B]/70 border border-slate-800/80 rounded-md p-1.5 flex flex-col justify-center">
                  <span className="text-[9.5px] text-slate-400 font-sans mb-0.5">تاريخ التعيين</span>
                  <span className="text-white font-mono font-bold text-[10px] truncate">
                    {emp.hireDate || emp.hire_date || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* الأزرار الإدارية المتوازنة */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
              {onEditEmployee && (
                <button
                  type="button"
                  onClick={() => onEditEmployee(emp)}
                  className="h-6 px-2 flex-1 bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 rounded-md text-[10.5px] font-bold text-white transition cursor-pointer flex items-center justify-center gap-1"
                  title="تعديل بيانات الموظف"
                >
                  <span>✏️</span><span>تعديل</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => toggleEmpStatus(emp.id)}
                className={`h-6 px-2 flex-1 border rounded-md text-[10.5px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                  emp.status === "نشط"
                    ? "bg-slate-800/90 hover:bg-slate-700 border-slate-700/80 text-slate-200 hover:text-white"
                    : "bg-emerald-950/50 hover:bg-emerald-900/70 border-emerald-800/50 text-emerald-300"
                }`}
              >
                {emp.status === "نشط" ? "إيقاف مؤقت ⏸️" : "تنشيط ▶️"}
              </button>
              <button
                type="button"
                onClick={() => deleteEmp(emp.id)}
                className="w-6 h-6 shrink-0 flex items-center justify-center bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 rounded-md text-rose-400 hover:text-rose-200 transition cursor-pointer text-xs"
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

window.EmployeeTable = EmployeeTable;
window.EmployeeList = EmployeeTable;
