// PieceRateDetailsModal.jsx - كشف القطع التفصيلي وضبط الجودة والربط المحاسبي
const { useState } = React;

const getPieceQaStatus = (row) => String((row && row.order_stages && row.order_stages.qa_status) || (row && row.qa_status) || "").trim().toLowerCase();
const isPieceQaApproved = (row) => ["approved", "passed"].includes(getPieceQaStatus(row));
const isPieceQaRejected = (row) => ["rejected", "failed", "fail", "rework"].includes(getPieceQaStatus(row));
const isPiecePaid = (row) => Boolean(row && (row.payment_status === "paid" || row.paid_at || row.status === "Paid"));
const getPieceTotalAmount = (row) => (parseFloat((row && (row.piece_rate_amount != null ? row.piece_rate_amount : row.wage_amount)) || 0) || 0) * (parseInt((row && row.pieces_count) || 1, 10) || 1);

function PieceRateDetailsModal({
  selectedTailorForPieces,
  onClose,
  loadingPieces,
  tailorPieces = [],
  piecesError = null,
  currencyDisplay = "YER",
  onLiquidatePieces,
  onProceedToPayout
}) {
  const [submitting, setSubmitting] = useState(false);
  if (!selectedTailorForPieces) return null;

  const workerName = selectedTailorForPieces.employee_name || selectedTailorForPieces.name || "الفني";
  const workerId = selectedTailorForPieces.employee_id || selectedTailorForPieces.id;
  const items = tailorPieces || [];

  const approvedItems = items.filter((p) => isPieceQaApproved(p) && !isPiecePaid(p));
  const reworkItems = items.filter((p) => !isPieceQaApproved(p));
  const eligibleTotal = approvedItems.reduce((sum, p) => sum + getPieceTotalAmount(p), 0);

  const handleDisburse = async () => {
    if (eligibleTotal <= 0 || approvedItems.length === 0) return;
    if (!confirm(`اعتماد وصرف ${approvedItems.length} قطعة مستحقة بمبلغ ${eligibleTotal.toLocaleString()} ${currencyDisplay}؟`)) return;

    setSubmitting(true);
    try {
      if (onLiquidatePieces) {
        await onLiquidatePieces(workerId, approvedItems.map((p) => p.id));
      } else {
        const res = await fetch("/api/hr/liquidate-pieces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ worker_id: workerId, item_ids: approvedItems.map((p) => p.id) })
        }).then((r) => r.json());
        if (res.success) {
          if (onClose) onClose();
          if (window.showToast) window.showToast(res.message || "تم اعتماد وصرف الأجور بنجاح 💸", "success");
        } else {
          alert(res.message || "تعذر اعتماد وصرف القطع");
        }
      }
    } catch (e) {
      alert("حدث خطأ أثناء الصرف: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-hidden animate-fadeIn">
      <div className="w-full max-w-3xl max-h-[80vh] flex flex-col justify-between bg-[#111C38] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-auto animate-scaleUp">
        {/* Header */}
        <div className="h-10 px-4 bg-[#0F172A] border-b border-slate-800 flex items-center justify-between text-xs font-bold text-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">🧵</span>
            <span>كشف القطع التفصيلي - {workerName}</span>
          </div>
          <button type="button" onClick={onClose} className="w-6 h-6 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer">
            ✕
          </button>
        </div>

        {/* KPI Strip */}
        <div className="px-4 py-2 bg-[#0B132B]/80 border-b border-slate-800 grid grid-cols-4 gap-2 text-center text-xs shrink-0">
          <div className="bg-slate-800/40 p-1.5 rounded-lg border border-slate-700/50">
            <span className="text-[10px] text-slate-400 block">إجمالي القطع</span>
            <span className="font-bold font-mono text-white text-xs">{items.length} قطعة</span>
          </div>
          <div className="bg-emerald-950/30 p-1.5 rounded-lg border border-emerald-800/40">
            <span className="text-[10px] text-emerald-400 block">مطابق للجودة ✓</span>
            <span className="font-bold font-mono text-emerald-300 text-xs">{approvedItems.length} قطعة</span>
          </div>
          <div className="bg-rose-950/30 p-1.5 rounded-lg border border-rose-800/40">
            <span className="text-[10px] text-rose-400 block">مستبعد / تعديل ✕</span>
            <span className="font-bold font-mono text-rose-300 text-xs">{reworkItems.length} قطعة</span>
          </div>
          <div className="bg-amber-950/30 p-1.5 rounded-lg border border-amber-800/40">
            <span className="text-[10px] text-amber-400 block">المستحق المعتمد</span>
            <span className="font-bold font-mono text-amber-300 text-xs">{eligibleTotal.toLocaleString()} {currencyDisplay}</span>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 min-h-0">
          {loadingPieces ? (
            <div className="p-12 text-center text-slate-400 text-xs">جاري فحص كشف الجودة والقطع... ⏳</div>
          ) : piecesError ? (
            <div className="p-8 text-center text-rose-300 text-xs font-bold">تعذر جلب كشف القطع من أوامر التشغيل ⚠️ ({piecesError})</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">لا توجد قطع معلقة غير مصفّاة لهذا الفني</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700/60">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#0F172A] text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">رقم أمر التشغيل</th>
                    <th className="p-2.5">اسم الموديل والتفصيل</th>
                    <th className="p-2.5">المرحلة الحرفية</th>
                    <th className="p-2.5 text-center">تاريخ الإنجاز</th>
                    <th className="p-2.5 text-center">حالة الجودة (QA)</th>
                    <th className="p-2.5">سعر القطعة</th>
                    <th className="p-2.5 text-center">حالة الاستحقاق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-[#111C38] text-slate-200">
                  {items.map((p) => {
                    const po = p.production_orders || {};
                    const isApproved = isPieceQaApproved(p);
                    const isRejected = !isApproved && isPieceQaRejected(p);
                    const isPaid = isPiecePaid(p);
                    const amt = getPieceTotalAmount(p);

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-2.5 font-mono text-amber-400 font-bold">
                          {po.order_number || p.production_order_no || p.order_no || p.production_order_id || "—"}
                        </td>
                        <td className="p-2.5 font-bold text-white text-[11px]">
                          {po.product_name || p.product_name || p.child_name || "تفصيل مخصص"}
                        </td>
                        <td className="p-2.5 text-slate-300">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] border border-slate-700">
                            {p.stage_name || p.stage || "خياطة"}
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-400 text-[11px]">
                          {(p.completed_at || "").slice(0, 10) || "—"}
                        </td>
                        <td className="p-2.5 text-center">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs">✓ معتمد</span>
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs">✕ مرفوض / تعديل</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs">⏳ بانتظار الفحص</span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-xs">
                          {isApproved ? (
                            <span className="font-bold text-amber-300">{amt.toLocaleString()} {currencyDisplay}</span>
                          ) : (
                            <div>
                              <span className={isRejected ? "line-through text-slate-500" : "text-slate-400"}>{amt.toLocaleString()}</span>
                              <span className={`text-[9px] block font-sans ${isRejected ? "text-rose-400" : "text-amber-400"}`}>
                                {isRejected ? "مستبعد من الصرف" : "معلق للفحص"}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-center text-[10px] font-bold">
                          {isPaid ? (
                            <span className="text-emerald-400">مصفى بسند ✓</span>
                          ) : isApproved ? (
                            <span className="text-amber-400">جاهز للصرف ⏳</span>
                          ) : isRejected ? (
                            <span className="text-slate-500">موقوف للجودة ✕</span>
                          ) : (
                            <span className="text-amber-300/80">معلق للاعتماد ⏳</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pinned Footer */}
        <div className="h-14 px-4 bg-[#0F172A] border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs">
            <span className="text-slate-400">المبلغ الصافي المؤهل للصرف: </span>
            <span className="font-mono font-bold text-emerald-400 text-sm">{eligibleTotal.toLocaleString()} {currencyDisplay}</span>
            <span className="text-[10px] text-slate-500 mr-2">({approvedItems.length} من {items.length} قطعة)</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer">
              إلغاء
            </button>
            <button
              type="button"
              disabled={submitting || eligibleTotal <= 0}
              onClick={handleDisburse}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                submitting || eligibleTotal <= 0
                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
              }`}
            >
              {submitting ? (
                <><span>⏳</span><span>جاري الصرف والتسوية...</span></>
              ) : (
                <><span>💸</span><span>اعتماد وصرف المستحقات ({eligibleTotal.toLocaleString()} {currencyDisplay})</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.PieceRateDetailsModal = PieceRateDetailsModal;
window.PiecesModal = PieceRateDetailsModal;