// PayoutModal.jsx - نافذة إصدار سند الصرف النقدي للمحاسب
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

  const inputCls =
    "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  const netAmount =
    selectedTailorForPayout.unpaid_total_amount -
    (parseFloat(payoutDeductions) || 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-[#E8E5EA] shadow-2xl overflow-hidden animate-scaleUp">
        <div className="p-5 border-b border-[#E8E5EA] flex justify-between items-center bg-gradient-to-r from-[#F2E7F3] via-white to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8F2A87] text-white flex items-center justify-center text-lg font-bold">
              💵
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">
                إصدار سند صرف مستحقات (أمر المحاسب)
              </h3>
              <p className="text-xs text-[#6F6B75]">
                الخياط:{" "}
                <span className="font-bold text-[#8F2A87]">
                  {selectedTailorForPayout.employee_name}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#E8E5EA] flex items-center justify-center text-sm font-bold text-[#6F6B75] hover:bg-[#E8E5EA] transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmitPayout} className="p-6 space-y-4 text-right">
          <div className="bg-[#FAFAFB] p-4 rounded-xl border border-[#E8E5EA] grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#6F6B75] block">القطع المنجزة المعتمدة:</span>
              <span className="font-mono font-bold text-sm text-[#25232A] mt-0.5 block">
                {selectedTailorForPayout.unpaid_pieces_count} قطعة
              </span>
            </div>
            <div>
              <span className="text-[#6F6B75] block">إجمالي أجور القطع:</span>
              <span className="font-mono font-bold text-sm text-[#8F2A87] mt-0.5 block">
                {selectedTailorForPayout.unpaid_total_amount.toLocaleString()}{" "}
                {currencyDisplay}
              </span>
            </div>
          </div>

          <div>
            <label className={labelCls}>
              الخزينة / الصندوق المنصرف منه <span className="text-[#D64545]">*</span>
            </label>
            <select
              value={payoutCashAccount}
              onChange={(e) => setPayoutCashAccount(e.target.value)}
              className={inputCls}
              required
            >
              <option value="ACC-101">الصندوق الرئيسي (خزينة الورشة) - ACC-101</option>
              <option value="ACC-101-1">صندوق الريال اليمني (YER) - ACC-101.1</option>
              <option value="ACC-103">حساب بنك الكريمي (YER) - ACC-103</option>
              <option value="ACC-101-2">صندوق الريال السعودي (SAR) - ACC-101.2</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                placeholder="0"
                value={payoutDeductions}
                onChange={(e) => setPayoutDeductions(e.target.value)}
                className={`${inputCls} font-mono font-bold text-[#D64545]`}
              />
            </div>
          </div>

          <div className="bg-[#F2E7F3] p-4 rounded-xl border border-[#E5CEE7] flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-[#8F2A87] block">
                صافي المبلغ المنصرف للخياط:
              </span>
              <span className="text-[11px] text-[#6F6B75]">
                يخصم مباشرة من الخزينة ويقيد أجور تشغيل
              </span>
            </div>
            <div className="text-left font-mono font-black text-lg text-[#8F2A87]">
              {netAmount.toLocaleString()} {currencyDisplay}
            </div>
          </div>

          <div>
            <label className={labelCls}>ملاحظات وبيان السند</label>
            <textarea
              rows="2"
              value={payoutNotes}
              onChange={(e) => setPayoutNotes(e.target.value)}
              placeholder="مثال: صرف مستحقات تفصيل فساتين دفعة منتصف الشهر..."
              className={`${inputCls} h-auto py-2`}
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] font-bold text-xs rounded-xl border border-[#E8E5EA] transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submittingPayout}
              className="flex-2 py-3 bg-[#8F2A87] hover:bg-[#73216C] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>💸</span>
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
