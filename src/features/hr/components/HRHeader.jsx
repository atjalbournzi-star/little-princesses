// HRHeader.jsx - ترويسة إدارة الموارد البشرية وبطاقات المؤشرات والتبويبات
function HRHeader({
  activeTab,
  setActiveTab,
  employees = [],
  payroll = [],
  advances = [],
  commissions = [],
  currencyDisplay = "SAR",
  onQuickAddEmployee,
  onQuickAddAdvance,
}) {
  const activeCount = employees.filter((e) => e.status === "نشط").length;
  const totalAdvancesSum = advances.reduce(
    (sum, a) => sum + (parseFloat(a.amount) || 0),
    0
  );
  const pendingPayrollCount = payroll.filter(
    (p) => !p.status?.includes("تم الصرف")
  ).length;
  const currentMonthPayrollTotal = payroll.reduce(
    (sum, p) => sum + (parseFloat(p.netSalary || p.net_amount) || 0),
    0
  );

  const tabBtn = (key, label, badge) => (
    <button
      key={key}
      onClick={() => setActiveTab(key)}
      className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
        activeTab === key
          ? "bg-[#8F2A87] text-white shadow-xs"
          : "bg-[#FAFAFB] text-[#25232A] hover:bg-[#E8E5EA] border border-[#E8E5EA]"
      }`}
    >
      {badge?.icon && <span>{badge.icon}</span>}
      <span>{label}</span>
      {badge && badge.count > 0 && (
        <span className="bg-white/20 px-1.5 py-0.2 rounded-full font-mono text-[10px]">
          {badge.count}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* الترويسة الرئيسية */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F2E7F3] text-[#8F2A87] border border-[#E5CEE7] flex items-center justify-center text-xl font-bold shadow-xs">
              {typeof Icons !== "undefined" && Icons.HR ? (
                <Icons.HR className="w-6 h-6" />
              ) : typeof Icons !== "undefined" && Icons.Users ? (
                <Icons.Users className="w-6 h-6" />
              ) : (
                <span>👥</span>
              )}
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#25232A]">
                إدارة الموارد البشرية والرواتب (HR & Payroll Studio)
              </h1>
              <p className="text-xs text-[#6F6B75] mt-0.5">
                سجل الكادر، احتساب أجور القطعة آلياً من الورشة، ومسير الرواتب المالي
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {tabBtn("employees", "سجل الموظفين")}
            {tabBtn("payroll", "مسير الرواتب المدمج")}
            {tabBtn("advances", "السلف والعهد النقدية", {
              icon: "💸",
              count: advances.length,
            })}
            {tabBtn("commissions", "عمولات وأجور الخياطين", {
              icon: "⭐",
              count: commissions.length,
            })}
          </div>
        </div>

        {/* بطاقات المؤشرات السريعة (KPI Strip) */}
        <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 bg-[#FAFAFB]">
          <div className="bg-white p-3.5 rounded-xl border border-[#E8E5EA] shadow-2xs">
            <span className="text-[11px] text-[#6F6B75] font-semibold block">
              إجمالي الكادر الوظيفي
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black font-mono text-[#8F2A87]">
                {employees.length}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                {activeCount} نشط
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#E8E5EA] shadow-2xs">
            <span className="text-[11px] text-[#6F6B75] font-semibold block">
              مسيرات الرواتب المسجلة
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black font-mono text-[#007F8C]">
                {currentMonthPayrollTotal.toLocaleString("en-US")}
              </span>
              <span className="text-[10px] font-sans text-[#6F6B75]">
                {currencyDisplay}
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#E8E5EA] shadow-2xs">
            <span className="text-[11px] text-[#6F6B75] font-semibold block">
              السلف والعهد القائمة
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black font-mono text-[#D64545]">
                {totalAdvancesSum.toLocaleString("en-US")}
              </span>
              <span className="text-[10px] font-sans text-[#6F6B75]">
                {currencyDisplay}
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#E8E5EA] shadow-2xs">
            <span className="text-[11px] text-[#6F6B75] font-semibold block">
              رواتب معلقة بانتظار الصرف
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black font-mono text-amber-600">
                {pendingPayrollCount}
              </span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                قيد الإجراء
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
