/**
 * ExpensesHeader.jsx
 * بطاقات المؤشرات المالية العليا وإجراءات المصاريف
 * Little Princesses ERP - Architectural Standards Compliant
 */

function ExpensesHeader({ stats = {}, currencyDisplay = "YER ﷼", isSyncing = false, onRefresh, onOpenAddModal }) {
  const RefreshIcon = (window.Icons && window.Icons.Refresh) || (() => <span>🔄</span>);
  const PlusIcon = (window.Icons && window.Icons.Plus) || (() => <span>+</span>);

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#FFF1DC] text-[#C97300] flex items-center justify-center text-lg font-bold border border-[#FFE4B9]">
            💸
          </div>
          <div>
            <h2 className="text-base font-bold text-[#25232A]">إدارة المصاريف التشغيلية</h2>
            <p className="text-xs text-[#6F6B75] font-normal">تسجيل ومتابعة مصروفات الإيجار والكهرباء والتشغيل مع ترحيل السندات والقيود</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isSyncing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#FAFAFB] hover:bg-[#F2F1F4] border border-[#E8E5EA] text-xs font-bold text-[#25232A] cursor-pointer transition"
            title="تحديث البيانات من السيرفر وقوقل شيتس"
          >
            <RefreshIcon className={`w-3.5 h-3.5 text-[#6F6B75] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'جاري التحديث...' : 'تحديث السجل 🔄'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#F28A00] hover:bg-[#D97706] transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>تسجيل مصروف جديد 💸</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E8E5EA] p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition hover:shadow-md">
          <div className="flex items-center justify-between text-[#6F6B75] text-xs font-semibold mb-2">
            <span>إجمالي المصروفات التراكمية</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">📊</span>
          </div>
          <div className="text-xl font-bold font-mono text-[#D64545] tabular-nums">
            {(stats.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#6F6B75] mt-1 font-medium">{currencyDisplay}</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E5EA] p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition hover:shadow-md">
          <div className="flex items-center justify-between text-[#6F6B75] text-xs font-semibold mb-2">
            <span>مصروفات اليوم</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">📅</span>
          </div>
          <div className="text-xl font-bold font-mono text-[#C97300] tabular-nums">
            {(stats.todayTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#6F6B75] mt-1 font-medium">{currencyDisplay}</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E5EA] p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition hover:shadow-md">
          <div className="flex items-center justify-between text-[#6F6B75] text-xs font-semibold mb-2">
            <span>مصروفات الشهر الجاري</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">📆</span>
          </div>
          <div className="text-xl font-bold font-mono text-indigo-700 tabular-nums">
            {(stats.monthTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#6F6B75] mt-1 font-medium">{currencyDisplay}</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E5EA] p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition hover:shadow-md">
          <div className="flex items-center justify-between text-[#6F6B75] text-xs font-semibold mb-2">
            <span>إجمالي البنود المسجلة</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">📑</span>
          </div>
          <div className="text-xl font-bold font-mono text-[#25232A] tabular-nums">
            {stats.count || 0}
          </div>
          <div className="text-[11px] text-[#6F6B75] mt-1 font-medium">سند وبند مصروف</div>
        </div>
      </div>
    </div>
  );
}

window.ExpensesHeader = ExpensesHeader;
