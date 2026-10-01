// PayoutVoucher.jsx - سند الصرف الملكي الرسمي القابل للطباعة والتوقيع
function PayoutVoucher({ activeVoucherForPrint, onClose }) {
  if (!activeVoucherForPrint) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#E8E5EA] shadow-2xl overflow-hidden print:border-none print:shadow-none animate-scaleUp">
        {/* شريط الإجراءات قبل الطباعة (يختفي عند الطباعة) */}
        <div className="p-4 bg-[#FAFAFB] border-b border-[#E8E5EA] flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
            <span>✅</span>
            <span>تم حفظ القيد وترحيل السند بنجاح! جاهز للطباعة والتوقيع:</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-[#8F2A87] hover:bg-[#73216C] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>🖨️</span>
              <span>طباعة السند</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white border border-[#E8E5EA] flex items-center justify-center text-sm font-bold text-[#6F6B75] hover:bg-[#E8E5EA] transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* جسم السند الرسمي */}
        <div className="p-8 space-y-6 text-right font-sans">
          <div className="flex justify-between items-start border-b-2 border-[#8F2A87] pb-4">
            <div>
              <h2 className="text-xl font-black text-[#8F2A87] flex items-center gap-2">
                <span>👑</span>
                <span>معمل الأميرات الصغيرات للخياطة الراقية</span>
              </h2>
              <p className="text-[11px] text-[#6F6B75] mt-0.5">
                {activeVoucherForPrint.title ||
                  "Little Princesses Atelier • سند صرف نقدي رسمي (Payment Voucher)"}
              </p>
            </div>
            <div className="text-left font-mono">
              <span className="text-xs text-[#6F6B75] block">رقم السند:</span>
              <span className="text-sm font-black text-[#25232A] block">
                {activeVoucherForPrint.voucher_no}
              </span>
              <span className="text-[11px] text-[#6F6B75] block mt-0.5">
                {activeVoucherForPrint.date}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-[#FAFAFB] p-4 rounded-2xl border border-[#E8E5EA] text-xs">
            <div>
              <span className="text-[#6F6B75] block">يصرف للأخ / الأخت:</span>
              <span className="font-bold text-sm text-[#25232A] mt-0.5 block">
                {activeVoucherForPrint.employee_name}
              </span>
            </div>
            <div>
              <span className="text-[#6F6B75] block">طريقة الصرف والخزينة:</span>
              <span className="font-bold text-xs text-[#25232A] mt-0.5 block">
                {activeVoucherForPrint.payment_method} (
                {activeVoucherForPrint.account_id})
              </span>
            </div>
            <div>
              <span className="text-[#6F6B75] block">إجمالي عدد القطع المشمولة:</span>
              <span className="font-mono font-bold text-sm text-[#8F2A87] mt-0.5 block">
                {activeVoucherForPrint.pieces_count || 0} قطعة
              </span>
            </div>
            <div>
              <span className="text-[#6F6B75] block">رقم قيد اليومية المحاسبي:</span>
              <span className="font-mono font-bold text-xs text-[#25232A] mt-0.5 block">
                {activeVoucherForPrint.entry_no}
              </span>
            </div>
          </div>

          <div className="bg-[#F2E7F3] p-5 rounded-2xl border border-[#E5CEE7] flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-[#8F2A87] block">
                المبلغ الصافي المنصرف:
              </span>
              <span className="text-xs text-[#6F6B75] mt-0.5 block">
                {activeVoucherForPrint.notes ||
                  "فقط وقدره أجور ومستحقات نقدية معتمدة"}
              </span>
            </div>
            <div className="text-left font-mono font-black text-2xl text-[#8F2A87]">
              {parseFloat(activeVoucherForPrint.net_amount || 0).toLocaleString()}{" "}
              <span className="text-sm font-bold font-sans">
                {activeVoucherForPrint.currency}
              </span>
            </div>
          </div>

          {activeVoucherForPrint.pieces &&
            activeVoucherForPrint.pieces.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
                <table className="w-full text-right text-[11px]">
                  <thead className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                    <tr>
                      <th className="p-2">رقم الأمر والموديل</th>
                      <th className="p-2">نوع الإنتاج</th>
                      <th className="p-2 text-center">الكمية</th>
                      <th className="p-2">الأجر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E5EA]">
                    {activeVoucherForPrint.pieces.map((p, i) => (
                      <tr key={i}>
                        <td className="p-2">
                          <span className="font-bold text-[#25232A]">
                            {p.product_name}
                          </span>
                          <span className="text-[10px] text-[#6F6B75] font-mono block">
                            ({p.order_no})
                          </span>
                        </td>
                        <td className="p-2">
                          {p.production_type === "stock"
                            ? "🏭 إنتاج مخزني"
                            : `👧 ${p.child_name || "تفصيل خاص"}`}
                        </td>
                        <td className="p-2 text-center font-mono font-bold">
                          {p.pieces_count || 1}
                        </td>
                        <td className="p-2 font-mono font-bold text-[#8F2A87]">
                          {parseFloat(p.wage_amount).toLocaleString()}{" "}
                          {activeVoucherForPrint.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          <div className="pt-8 border-t border-[#E8E5EA] grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <span className="text-[#6F6B75] block font-bold mb-8">
                توقيع المستلم (الموظف)
              </span>
              <div className="border-t border-dashed border-[#6F6B75] mx-4 pt-1 font-bold text-[#25232A]">
                {activeVoucherForPrint.employee_name}
              </div>
            </div>
            <div>
              <span className="text-[#6F6B75] block font-bold mb-8">
                المحاسب المالي
              </span>
              <div className="border-t border-dashed border-[#6F6B75] mx-4 pt-1 font-bold text-[#25232A]">
                {activeVoucherForPrint.created_by || "المحاسب المالي"}
              </div>
            </div>
            <div>
              <span className="text-[#6F6B75] block font-bold mb-8">
                اعتماد المدير العام
              </span>
              <div className="border-t border-dashed border-[#6F6B75] mx-4 pt-1 font-bold text-[#25232A]">
                معتمد ✅
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
