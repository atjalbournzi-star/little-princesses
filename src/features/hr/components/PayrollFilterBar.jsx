// PayrollFilterBar.jsx - شريط الفلترة متعددة المعايير وزر الصرف المجمع لمسير الرواتب
function PayrollFilterBar({
  filterType = "all",
  setFilterType,
  filterRole = "all",
  setFilterRole,
  filterStatus = "all",
  setFilterStatus,
  roles = [],
  pendingCount = 0,
  isSubmitting = false,
  onDisburseBulk,
}) {
  return (
    <div className="h-9 shrink-0 mb-2 flex items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 px-3 rounded-xl select-none">
      {/* اليمين: الفلاتر متعددة المعايير */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-0.5">
        <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
          <span>🔍</span> تصفية المسير:
        </span>

        {/* 1. نوع الأجر */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-6 px-2 text-[11px] font-bold bg-slate-800 text-slate-200 border border-slate-700 rounded-md outline-none focus:border-pink-500 cursor-pointer"
        >
          <option value="all">نوع الأجر: الكل</option>
          <option value="بالقطعة">بالقطعة (Piece Rate)</option>
          <option value="راتب شهري">راتب شهري (Monthly)</option>
        </select>

        {/* 2. القسم / التخصص */}
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="h-6 px-2 text-[11px] font-bold bg-slate-800 text-slate-200 border border-slate-700 rounded-md outline-none focus:border-pink-500 cursor-pointer"
        >
          <option value="all">القسم / الدور: الكل</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {/* 3. حالة الصرف */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-6 px-2 text-[11px] font-bold bg-slate-800 text-slate-200 border border-slate-700 rounded-md outline-none focus:border-pink-500 cursor-pointer"
        >
          <option value="all">حالة الصرف: الكل</option>
          <option value="معلق">بانتظار الصرف ({pendingCount})</option>
          <option value="تم الصرف">تم الصرف ✅</option>
        </select>
      </div>

      {/* اليسار: زر الصرف المجمع */}
      <div className="shrink-0 flex items-center">
        <button
          type="button"
          onClick={onDisburseBulk}
          disabled={pendingCount === 0 || isSubmitting}
          className="h-7 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          title={
            pendingCount === 0
              ? "لا توجد رواتب معلقة للصرف المجمع"
              : "صرف واعتماد كافة الرواتب المعلقة المحددة بالقيد الآلي"
          }
        >
          <span>{isSubmitting ? "⏳ جاري الصرف..." : "⚡ اعتماد وصرف المسير المجمع"}</span>
          {pendingCount > 0 && !isSubmitting && (
            <span className="bg-white/20 px-1.5 py-0.2 rounded-full font-mono text-[10px]">
              {pendingCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

window.PayrollFilterBar = PayrollFilterBar;
