/**
 * ExpensesHeader.jsx
 * شريط الإجراءات المدمج والمؤشرات المالية للمصروفات التشغيلية
 * Little Princesses ERP - Architectural Standards Compliant
 */

function ExpensesHeader({
  stats = {},
  filteredCount = 0,
  currencyDisplay = "YER ﷼",
  isSyncing = false,
  onRefresh,
  onExportExcel,
  onPrint,
  onOpenAddModal
}) {
  const RefreshIcon = (window.Icons && window.Icons.Refresh) || (() => <span>🔄</span>);
  const PlusIcon = (window.Icons && window.Icons.Plus) || (() => <span>+</span>);

  const totalAmt = stats.total || 0;
  const todayAmt = stats.todayTotal || 0;
  const monthAmt = stats.monthTotal || 0;
  const totalCount = filteredCount || stats.count || 0;

  return (
    <div className="space-y-1.5 select-none" dir="rtl">
      {/* 1. Ultra-Compact Single-Row Action Header */}
      <div className="h-8 mb-1.5 shrink-0 flex items-center justify-between gap-2 px-1">
        {/* Right: Main Title with Count Pill */}
        <div className="text-xs font-bold text-white flex items-center gap-1.5 shrink-0">
          <span className="text-xs">💸</span>
          <span>المصروفات التشغيلية</span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-[#111C38] text-amber-400 border border-slate-700">
            {totalCount} بند
          </span>
        </div>

        {/* Left: Actions Group */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Refresh Action */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isSyncing}
            className="h-6.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md text-[11px] flex items-center gap-1 border border-slate-700 transition cursor-pointer"
            title="تحديث سجل المصروفات"
          >
            <RefreshIcon className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isSyncing ? "جاري التحديث..." : "تحديث السجل"}</span>
          </button>

          {/* Export to Excel Action */}
          {onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              className="h-6.5 px-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded-md text-[11px] flex items-center gap-1 border border-slate-700 transition cursor-pointer"
              title="تصدير السجل المفلتر إلى ملف Excel (.xlsx)"
            >
              <span>📊</span>
              <span>تصدير Excel</span>
            </button>
          )}

          {/* Print Action */}
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="h-6.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md text-[11px] flex items-center gap-1 border border-slate-700 transition cursor-pointer"
              title="طباعة كشف المصروفات الحالي"
            >
              <span>🖨️</span>
              <span>طباعة الكشف</span>
            </button>
          )}

          {/* Primary New Expense Action */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="h-6.5 px-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[11px] font-bold shadow-xs flex items-center gap-1 transition cursor-pointer"
          >
            <PlusIcon className="w-3 h-3" />
            <span>تسجيل مصروف جديد</span>
          </button>
        </div>
      </div>

      {/* 2. Ultra-Compact Financial KPI Cards Strip (h-12 py-1 px-2.5) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="h-12 py-1 px-2.5 bg-[#111C38] rounded-lg border border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between leading-none">
            <span>إجمالي المصروفات</span>
            <span className="text-[10px]">📊</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-mono font-bold text-white tabular-nums">
              {totalAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800/80 text-amber-400 border border-slate-700/60 font-mono">
              {currencyDisplay}
            </span>
          </div>
        </div>

        <div className="h-12 py-1 px-2.5 bg-[#111C38] rounded-lg border border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between leading-none">
            <span>مصروفات اليوم</span>
            <span className="text-[10px]">📅</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-mono font-bold text-white tabular-nums">
              {todayAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800/80 text-amber-400 border border-slate-700/60 font-mono">
              {currencyDisplay}
            </span>
          </div>
        </div>

        <div className="h-12 py-1 px-2.5 bg-[#111C38] rounded-lg border border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between leading-none">
            <span>مصروفات الشهر</span>
            <span className="text-[10px]">📆</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-mono font-bold text-white tabular-nums">
              {monthAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800/80 text-amber-400 border border-slate-700/60 font-mono">
              {currencyDisplay}
            </span>
          </div>
        </div>

        <div className="h-12 py-1 px-2.5 bg-[#111C38] rounded-lg border border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between leading-none">
            <span>إجمالي البنود</span>
            <span className="text-[10px]">📑</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-mono font-bold text-white tabular-nums">
              {totalCount}
            </span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 font-sans">
              سند وبند
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

window.ExpensesHeader = ExpensesHeader;