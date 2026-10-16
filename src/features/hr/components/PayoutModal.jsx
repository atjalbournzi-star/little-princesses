// PayoutModal.jsx - نافذة إصدار سند صرف مستحقات القطع للمحاسب
function PayoutModal({
  selectedTailorForPayout,
  onClose,
  onSubmitPayout,
  payoutCashAccount,
  setPayoutCashAccount,
  payoutMethod,
  setPayoutMethod,
  payoutDeductions,
  setPayoutDeductions,
  payoutNotes,
  setPayoutNotes,
  submittingPayout,
  currencyDisplay = "SAR",
}) {
  if (!selectedTailorForPayout) return null;

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const inputCls =
    "w-full h-7 px-2.5 rounded-lg border border-slate-700 bg-[#0F172A] text-white text-xs font-medium placeholder:text-slate-500 focus:border-pink-500 outline-none transition";
  const labelCls = "block text-[11px] font-semibold text-slate-300 mb-0.5";

  const totalAmount = parseFloat(selectedTailorForPayout.unpaid_total_amount || 0);
  const deductions = parseFloat(payoutDeductions) || 0;
  const netAmount = Math.max(0, totalAmount - deductions);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm select-none"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#111C38] border border-slate-700 rounded-xl shadow-2xl overflow-hidden p-0 flex flex-col select-none text-right animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ترويسة داكنة مدمجة */}
        <div className="h-8 px-3.5 flex items-center justify-between border-b border-slate-800 bg-[#0F172A] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
            <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-bold text-xs text-white">
              إصدار سند صرف مستحقات (أمر المحاسب)
            </h3>
            <span className="text-[11px] text-slate-400 font-medium truncate max-w-[140px]">
              • {selectedTailorForPayout.employee_name}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
            title="إغلاق (Esc)"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* نموذج صرف المستحقات المدمج */}
        <form onSubmit={onSubmitPayout} className="p-3 space-y-2 text-right">
          {/* شريط الإحصائيات المدمج للقطع المنجزة */}
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10.5px] text-slate-400 block">القطع المنجزة المعتمدة:</span>
              <span className="font-mono font-bold text-xs text-white mt-0.5 block">
                {selectedTailorForPayout.unpaid_pieces_count || 0} قطعة
              </span>
            </div>
            <div>
              <span className="text-[10.5px] text-slate-400 block">إجمالي أجور القطع:</span>
              <span className="font-mono font-bold text-xs text-pink-400 mt-0.5 block">
                {totalAmount.toLocaleString()} {currencyDisplay}
              </span>
            </div>
          </div>

          <div>
            <label className={labelCls}>
              الخزينة / الصندوق المنصرف منه <span className="text-rose-400 font-bold">*</span>
            </label>
            <select
              value={payoutCashAccount}
              onChange={(e) => setPayoutCashAccount(e.target.value)}
              className={inputCls}
              required
            >
              <option value="ACC-101">الصندوق الرئيسي (خزينة الورشة) - ACC-101</option>
              <option value="ACC-101-1">صندوق الريال اليمني (YER) - ACC-101.1</option>
              <option value="ACC-102-2">حساب بنك الكريمي (YER) - 102.02</option>
              <option value="ACC-101-2">صندوق الريال السعودي (SAR) - ACC-101.2</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>طريقة الدفع</label>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
                className={inputCls}
              >
                <option value="نقدي / كاش">نقدي / كاش</option>
                <option value="تحويل بنكي / كريمي">تحويل بنكي / كريمي</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>سلف أو خصميات (إن وجدت)</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={payoutDeductions}
                onChange={(e) => setPayoutDeductions(e.target.value)}
                className={`${inputCls} font-mono font-bold text-rose-400`}
              />
            </div>
          </div>

          {/* شريط الملخص المالي الزمردي المدمج */}
          <div className="bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-lg flex justify-between items-center">
            <div>
              <span className="text-[11px] font-bold text-emerald-400 block">
                صافي المبلغ المنصرف للخياط:
              </span>
              <span className="text-[10px] text-slate-400 block">
                يخصم مباشرة من الخزينة ويقيد أجور تشغيل
              </span>
            </div>
            <div className="text-left font-mono font-black text-base text-emerald-400">
              {netAmount.toLocaleString()}{" "}
              <span className="text-xs font-bold font-sans">{currencyDisplay}</span>
            </div>
          </div>

          <div>
            <label className={labelCls}>ملاحظات وبيان السند</label>
            <input
              type="text"
              value={payoutNotes}
              onChange={(e) => setPayoutNotes(e.target.value)}
              placeholder="مثال: صرف مستحقات تفصيل فساتين دفعة منتصف الشهر..."
              className={inputCls}
            />
          </div>

          {/* شريط الأزرار السفلي المحمي داخل إطار الشاشة */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="h-6.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-md transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submittingPayout}
              className="h-6.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" />
              </svg>
              <span>
                {submittingPayout
                  ? "جاري الترحيل..."
                  : "تأكيد الصرف وترحيل السند للخزينة"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.PayoutModal = PayoutModal;
window.DisburseCommissionModal = PayoutModal;
