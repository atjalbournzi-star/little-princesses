// PayoutVoucher.jsx - سند الصرف الملكي الرسمي المعتمد القابل للطباعة والتوقيع
function PayoutVoucher({ activeVoucherForPrint, onClose }) {
  if (!activeVoucherForPrint) return null;

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const p = activeVoucherForPrint;
  const netAmt = parseFloat(p.net_amount || 0).toLocaleString();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm select-none print:p-0 print:bg-white"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[85vh] bg-[#111C38] border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col text-right print:bg-white print:border-none print:shadow-none print:max-h-none print:w-full print:p-0 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* شريط الإجراءات العلوي */}
        <div className="h-8 px-3 shrink-0 flex items-center justify-between border-b border-slate-800 bg-[#0F172A] print:hidden">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>تم اعتماد وترحيل السند بنجاح • جاهز للطباعة</span>
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

        {/* جسم السند الرسمي القابل للطباعة والمضغوط بنسبة 40% */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-2.5 bg-white text-[#25232A] font-sans print:p-0 print:overflow-visible">
          {/* ترويسة السند */}
          <div className="flex justify-between items-start border-b-2 border-[#8F2A87] pb-2">
            <div>
              <h2 className="text-base font-black text-[#8F2A87] tracking-tight">
                معمل الأميرات الصغيرات للخياطة الراقية
              </h2>
              <p className="text-[10px] text-slate-500 font-medium">
                {p.title || "Little Princesses Atelier • سند صرف نقدي رسمي (Payment Voucher)"}
              </p>
            </div>
            <div className="text-left font-mono">
              <span className="text-[10px] text-slate-500 block leading-tight">رقم السند:</span>
              <span className="text-xs font-black text-slate-900 block leading-tight">{p.voucher_no}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">{p.date}</span>
            </div>
          </div>

          {/* شبكة البيانات الأساسية */}
          <div className="grid grid-cols-2 gap-2 bg-[#FAFAFB] p-2.5 rounded-lg border border-[#E8E5EA] text-[11px]">
            <div>
              <span className="text-slate-500 block">يصرف للأخ / الأخت:</span>
              <span className="font-bold text-xs text-slate-900 block mt-0.5">{p.employee_name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">طريقة الصرف والخزينة:</span>
              <span className="font-bold text-[11px] text-slate-900 block mt-0.5">{p.payment_method} ({p.account_id})</span>
            </div>
            <div>
              <span className="text-slate-500 block">إجمالي عدد القطع المشمولة:</span>
              <span className="font-mono font-bold text-xs text-[#8F2A87] block mt-0.5">{p.pieces_count || 0} قطعة</span>
            </div>
            <div>
              <span className="text-slate-500 block">رقم قيد اليومية المحاسبي:</span>
              <span className="font-mono font-bold text-[11px] text-slate-900 block mt-0.5">{p.entry_no}</span>
            </div>
          </div>

          {/* بوكس المبلغ الصافي */}
          <div className="bg-[#F2E7F3] p-2.5 rounded-lg border border-[#E5CEE7] flex justify-between items-center">
            <div>
              <span className="text-[11px] font-bold text-[#8F2A87] block">المبلغ الصافي المنصرف:</span>
              <span className="text-[10px] text-slate-600 block">{p.notes || "فقط وقدره أجور ومستحقات نقدية معتمدة"}</span>
            </div>
            <div className="text-left font-mono font-black text-xl text-[#8F2A87]">
              {netAmt} <span className="text-xs font-bold font-sans">{p.currency}</span>
            </div>
          </div>

          {/* جدول تفاصيل القطع المشمولة (إن وجدت) بدون أي إيموجي */}
          {p.pieces && p.pieces.length > 0 && (
            <div className="rounded-lg border border-[#E8E5EA] overflow-hidden">
              <table className="w-full text-right text-[10.5px]">
                <thead className="bg-[#FAFAFB] text-slate-600 font-semibold border-b border-[#E8E5EA]">
                  <tr>
                    <th className="py-1 px-2">رقم الأمر والموديل</th>
                    <th className="py-1 px-2">نوع الإنتاج</th>
                    <th className="py-1 px-2 text-center">الكمية</th>
                    <th className="py-1 px-2 text-left">الأجر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E5EA]">
                  {p.pieces.map((piece, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-1 px-2">
                        <span className="font-bold text-slate-800">{piece.product_name}</span>
                        <span className="text-[9.5px] text-slate-500 font-mono block">({piece.order_no})</span>
                      </td>
                      <td className="py-1 px-2 text-slate-700">
                        {piece.production_type === "stock" ? "إنتاج مخزني" : `تفصيل خاص: ${piece.child_name || "عميل"}`}
                      </td>
                      <td className="py-1 px-2 text-center font-mono font-bold text-slate-800">
                        {piece.pieces_count || 1}
                      </td>
                      <td className="py-1 px-2 text-left font-mono font-bold text-[#8F2A87]">
                        {parseFloat(piece.wage_amount).toLocaleString()} {p.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* توقيعات السند الرسمية المدمجة */}
          <div className="pt-2 border-t border-[#E8E5EA] grid grid-cols-3 gap-2 text-center text-[10.5px]">
            <div>
              <span className="text-slate-500 block font-bold mb-4">توقيع المستلم (الموظف)</span>
              <div className="border-t border-dashed border-slate-400 mx-2 pt-0.5 font-bold text-slate-800">
                {p.employee_name}
              </div>
            </div>
            <div>
              <span className="text-slate-500 block font-bold mb-4">المحاسب المالي</span>
              <div className="border-t border-dashed border-slate-400 mx-2 pt-0.5 font-bold text-slate-800">
                {p.created_by || "المحاسب المالي"}
              </div>
            </div>
            <div>
              <span className="text-slate-500 block font-bold mb-4">اعتماد المدير العام</span>
              <div className="border-t border-dashed border-slate-400 mx-2 pt-0.5 font-bold text-emerald-700">
                معتمد رسمياً
              </div>
            </div>
          </div>
        </div>

        {/* شريط الأزرار السفلي المحمي بالكامل داخل إطار الشاشة */}
        <div className="h-8 px-3 shrink-0 flex items-center justify-end gap-2 border-t border-slate-800 bg-[#0F172A] print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="h-6 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-md transition cursor-pointer"
          >
            إغلاق
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="h-6 px-3.5 bg-[#8F2A87] hover:bg-[#73216C] text-white font-bold text-xs rounded-md shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>طباعة السند</span>
          </button>
        </div>
      </div>
    </div>
  );
}

window.PayoutVoucher = PayoutVoucher;
window.TailorVoucherReceipt = PayoutVoucher;
