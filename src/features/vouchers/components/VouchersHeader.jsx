function VouchersHeader({
  totals,
  vouchersCount = 0,
  onOpenReceiptModal,
  onOpenPaymentModal,
  onOpenCompoundModal,
  onOpenCapitalDeposit
}) {
  const targetCurr = totals?.targetCode || 'YER';

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-5 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#E2F5F7] text-[#007F8C] border border-[#C5ECF0] flex items-center justify-center text-xl font-bold shadow-xs">
              🧾
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#25232A]">
                السندات المالية والقبض والصرف (Financial Vouchers & Cash Management)
              </h1>
              <p className="text-xs text-[#6F6B75] mt-0.5">
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
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>📑</span>
              <span>قيد مركب</span>
            </button>
            <button
              type="button"
              onClick={onOpenCapitalDeposit}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>💼</span>
              <span>إيداع رأس مال</span>
            </button>
          </div>
        </div>

        {/* ── KPI Strip — الجامع المالي المحول آلياً ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 bg-[#FAFAFB] divide-x divide-x-reverse divide-[#E8E5EA]">
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي السندات المسجلة</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#25232A] mt-1 block">
              {vouchersCount.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">سند</span>
            </span>
          </div>

          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي المقبوضات (تحصيل)</span>
              <span className="text-[10px] bg-[#E2F5F7] text-[#007F8C] px-1.5 py-0.2 rounded font-bold">مصارفة ⚡</span>
            </div>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] mt-1 block">
              {(totals?.receipts || 0).toLocaleString('en-US', { minimumFractionDigits: targetCurr === 'YER' ? 0 : 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-[#007F8C]">{targetCurr}</span>
            </span>
          </div>

          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي المدفوعات (صرف)</span>
              <span className="text-[10px] bg-rose-50 text-[#D64545] px-1.5 py-0.2 rounded font-bold">مصارفة ⚡</span>
            </div>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#D64545] mt-1 block">
              {(totals?.payments || 0).toLocaleString('en-US', { minimumFractionDigits: targetCurr === 'YER' ? 0 : 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-[#D64545]">{targetCurr}</span>
            </span>
          </div>

          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs font-semibold text-[#6F6B75] block">صافي الحركة النقدية</span>
              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-bold">الجامع</span>
            </div>
            <span className={`text-xl font-extrabold font-mono tabular-nums mt-1 block ${(totals?.net || 0) >= 0 ? 'text-[#137333]' : 'text-[#D64545]'}`}>
              {(totals?.net || 0).toLocaleString('en-US', { minimumFractionDigits: targetCurr === 'YER' ? 0 : 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-[#6F6B75]">{targetCurr}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

window.VouchersHeader = VouchersHeader;
