function VouchersHeader({
  totals,
  stats,
  vouchersCount = 0,
  onOpenReceiptModal,
  onOpenPaymentModal,
  onOpenCompoundModal,
  onOpenCapitalDeposit
}) {
  const targetCurr = totals?.targetCode || stats?.targetCode || 'YER';
  const count = vouchersCount || totals?.count || stats?.totalCount || 0;
  const receipts = totals?.receipts ?? stats?.totalIn ?? 0;
  const payments = totals?.payments ?? stats?.totalOut ?? 0;
  const net = totals?.net ?? stats?.netCash ?? (receipts - payments);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-800/40 dark:to-slate-900">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-xl font-bold shadow-xs">
              🧾
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                السندات المالية والقبض والصرف (Financial Vouchers & Cash Management)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                إدارة سندات القبض وسندات الصرف وتتبع المدفوعات للموردين والمقبوضات من العملاء
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onOpenReceiptModal}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>+</span>
              <span>سند قبض 📥</span>
            </button>
            <button
              type="button"
              onClick={onOpenPaymentModal}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>+</span>
              <span>سند صرف 📤</span>
            </button>
            <button
              type="button"
              onClick={onOpenCompoundModal}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 border border-cyan-200 dark:border-cyan-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>📑</span>
              <span>قيد مركب</span>
            </button>
            <button
              type="button"
              onClick={onOpenCapitalDeposit}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>💼</span>
              <span>إيداع رأس مال</span>
            </button>
          </div>
        </div>

        {/* ── KPI Strip — الجامع المالي المحول آلياً ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-50/80 dark:bg-slate-900/60 divide-x divide-x-reverse divide-slate-200 dark:divide-slate-800">
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">إجمالي السندات المسجلة</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-1 block">
              {count.toLocaleString('en-US')} <span className="text-xs font-medium text-slate-500 dark:text-slate-400">سند</span>
            </span>
          </div>

          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">إجمالي المقبوضات (تحصيل)</span>
              <span className="text-[10px] bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 px-1.5 py-0.5 rounded font-bold">مصارفة ⚡</span>
            </div>
            <span className="text-xl font-extrabold font-mono tabular-nums text-teal-700 dark:text-teal-400 mt-1 block">
              {receipts.toLocaleString('en-US', { minimumFractionDigits: targetCurr === 'YER' ? 0 : 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-teal-700 dark:text-teal-400">{targetCurr}</span>
            </span>
          </div>

          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">إجمالي المدفوعات (صرف)</span>
              <span className="text-[10px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold">مصارفة ⚡</span>
            </div>
            <span className="text-xl font-extrabold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1 block">
              {payments.toLocaleString('en-US', { minimumFractionDigits: targetCurr === 'YER' ? 0 : 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{targetCurr}</span>
            </span>
          </div>

          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">صافي الحركة النقدية</span>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">الجامع</span>
            </div>
            <span className={`text-xl font-extrabold font-mono tabular-nums mt-1 block ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {net.toLocaleString('en-US', { minimumFractionDigits: targetCurr === 'YER' ? 0 : 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{targetCurr}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

window.VouchersHeader = VouchersHeader;
