// HRHeader.jsx - ترويسة الموارد البشرية مع شريط التبويبات والمؤشرات الحية
function HRHeader({
  activeTab,
  setActiveTab,
  employees = [],
  payroll = [],
  currentPayroll = null,
  advances = [],
  commissions = [],
  tailorSummaries = [],
  currencyDisplay = "SAR",
}) {
  // 1. إجمالي الكادر الوظيفي
  const activeStaffCount = employees.filter(
    (e) => e.status === "نشط" || e.status === "active"
  ).length;

  // 2. مستحقات أجور القطع المعلقة (Approved & unpaid)
  const pendingCommissions = commissions.filter(
    (c) => (c.status === "Approved" || c.status === "معتمد") && !c.paid_at && c.status !== "Paid"
  );
  const unliquidatedPiecesSum = pendingCommissions.length > 0
    ? pendingCommissions.reduce((sum, c) => sum + (parseFloat(c.wage_amount) || 0), 0)
    : tailorSummaries.reduce((sum, t) => sum + (parseFloat(t.unpaid_total_amount) || 0), 0);
  const unliquidatedPiecesCount = pendingCommissions.length > 0
    ? pendingCommissions.reduce((sum, c) => sum + (parseInt(c.pieces_count) || 1), 0)
    : tailorSummaries.reduce((sum, t) => sum + (parseInt(t.unpaid_pieces_count) || 0), 0);

  // 3. إجمالي السلف القائمة
  const openAdvances = advances.filter(
    (a) => !a.is_settled && a.status !== "Settled" && !a.reversal_entry_id
  );
  const openAdvancesSum = openAdvances.reduce(
    (sum, a) => sum + (parseFloat(a.remaining_amount ?? a.amount) || 0),
    0
  );

  // 4. صافي المسير المستحق للصرف
  const payrollRecords = currentPayroll?.records || payroll;
  const pendingPayrollRecords = payrollRecords.filter(
    (p) => !p.status?.includes("تم الصرف") && p.status !== "Paid"
  );
  const netPayablePayrollSum = pendingPayrollRecords.reduce(
    (sum, p) => sum + (parseFloat(p.netSalary ?? p.net_amount ?? p.totalDue) || 0),
    0
  );

  const tabs = [
    { key: "employees", label: "سجل الموظفين", count: employees.length },
    { key: "commissions", label: "أجور وإنتاج القطع", count: unliquidatedPiecesCount },
    { key: "advances", label: "السلف والعهد النقدية", count: openAdvances.length },
    { key: "payroll", label: "مسير الرواتب المدمج", count: pendingPayrollRecords.length },
  ];

  return (
    <div className="shrink-0 flex flex-col mb-1">
      {/* 1. شريط التبويبات الموحد */}
      <div className="h-7 mb-1 shrink-0 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`h-6 px-2.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
                isActive
                  ? "bg-pink-600 text-white shadow-sm"
                  : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-1 py-0.2 rounded-full font-mono text-[9px] ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-900/60 text-slate-300"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 2. شريط المؤشرات الحية المصغر */}
      <div className="h-10 mb-1.5 grid grid-cols-2 lg:grid-cols-4 gap-1.5 shrink-0">
        <div className="bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded-lg flex items-center justify-between h-full">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium">الكادر:</span>
            <span className="text-xs font-mono font-bold text-white">{activeStaffCount}</span>
            <span className="text-[9px] text-slate-400">نشط</span>
          </div>
          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1 py-0.2 rounded">
            {employees.length} مسجل
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded-lg flex items-center justify-between h-full">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium">أجور القطع:</span>
            <span className="text-xs font-mono font-bold text-pink-400">
              {unliquidatedPiecesSum.toLocaleString("en-US")}
            </span>
            <span className="text-[9px] text-slate-400">{currencyDisplay}</span>
          </div>
          <span className="text-[9px] font-bold text-pink-400 bg-pink-950/60 border border-pink-800/40 px-1 py-0.2 rounded">
            {unliquidatedPiecesCount} معتمد
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded-lg flex items-center justify-between h-full">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium">السلف القائمة:</span>
            <span className="text-xs font-mono font-bold text-amber-400">
              {openAdvancesSum.toLocaleString("en-US")}
            </span>
            <span className="text-[9px] text-slate-400">{currencyDisplay}</span>
          </div>
          <span className="text-[9px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 px-1 py-0.2 rounded">
            {openAdvances.length} سلفة
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded-lg flex items-center justify-between h-full">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium">صافي المسير:</span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {netPayablePayrollSum.toLocaleString("en-US")}
            </span>
            <span className="text-[9px] text-slate-400">{currencyDisplay}</span>
          </div>
          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1 py-0.2 rounded">
            {pendingPayrollRecords.length} موظف
          </span>
        </div>
      </div>
    </div>
  );
}

window.HRHeader = HRHeader;
window.HRStatsHeader = HRHeader;
