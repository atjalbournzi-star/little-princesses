// PiecesModal.jsx - نافذة كشف تفصيلي بالقطع المنجزة للخياط
function PiecesModal({
  selectedTailorForPieces,
  onClose,
  loadingPieces,
  tailorPieces = [],
  currencyDisplay = "SAR",
  onProceedToPayout,
}) {
  if (!selectedTailorForPieces) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-[#E8E5EA] shadow-2xl overflow-hidden animate-scaleUp">
        <div className="p-5 border-b border-[#E8E5EA] flex justify-between items-center bg-[#FAFAFB]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">
                كشف تفصيلي بالقطع المنجزة: {selectedTailorForPieces.employee_name}
              </h3>
              <p className="text-xs text-[#6F6B75]">
                عدد القطع المعلقة:{" "}
                <span className="font-bold text-[#8F2A87] font-mono">
                  {selectedTailorForPieces.unpaid_pieces_count} قطعة
                </span>{" "}
                | إجمالي المستحق:{" "}
                <span className="font-bold text-[#8F2A87] font-mono">
                  {selectedTailorForPieces.unpaid_total_amount.toLocaleString()}{" "}
                  {currencyDisplay}
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

        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {loadingPieces ? (
            <div className="p-12 text-center text-[#6F6B75]">
              جاري تحميل كشف القطع... ⏳
            </div>
          ) : tailorPieces.length === 0 ? (
            <div className="p-8 text-center text-[#6F6B75]">
              لا توجد قطع معلقة لهذا الخياط
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <tr>
                    <th className="p-2.5">رقم الأمر والموديل</th>
                    <th className="p-2.5">نوع الإنتاج</th>
                    <th className="p-2.5 text-center">الكمية</th>
                    <th className="p-2.5">تاريخ الأمر</th>
                    <th className="p-2.5">تاريخ الإنجاز</th>
                    <th className="p-2.5 text-center">الجودة</th>
                    <th className="p-2.5">الأجر المستحق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E5EA]">
                  {tailorPieces.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FAFAFB]">
                      <td className="p-2.5">
                        <span className="font-mono font-bold text-[#8F2A87] block">
                          {p.order_no}
                        </span>
                        <span className="text-[11px] text-[#25232A] font-bold">
                          {p.product_name}
                        </span>
                      </td>
                      <td className="p-2.5">
                        {p.production_type === "stock" ? (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                            🏭 إنتاج مخزني
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-pink-700 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded">
                            👧 {p.child_name || "تفصيل خاص"}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold">
                        {p.pieces_count || 1}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-[#6F6B75]">
                        {p.order_date || "—"}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-emerald-700 font-semibold">
                        {p.completed_at ? p.completed_at.slice(0, 10) : "—"}
                      </td>
                      <td className="p-2.5 text-center text-amber-500 font-bold">
                        ★ {p.quality_score || 5}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-[#8F2A87]">
                        {parseFloat(p.wage_amount || 0).toLocaleString()}{" "}
                        {currencyDisplay}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#E8E5EA] bg-[#FAFAFB] flex justify-between items-center">
          <span className="text-xs text-[#6F6B75]">
            جاهزة للاعتماد والصرف في سند واحد
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-[#E8E5EA] rounded-xl text-xs font-bold text-[#25232A] hover:bg-[#E8E5EA] transition cursor-pointer"
            >
              إغلاق
            </button>
            {selectedTailorForPieces.unpaid_pieces_count > 0 && (
              <button
                type="button"
                onClick={() => onProceedToPayout(selectedTailorForPieces)}
                className="px-4 py-2 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>💵</span>
                <span>الانتقال لصرف هذا الكشف</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
