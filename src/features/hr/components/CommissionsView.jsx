// CommissionsView.jsx - واجهة عمولات وأجور الخياطين ومحفظة القطع (نمط CRM المدمج)
function CommissionsView({
  commissions = [],
  tailorSummaries = [],
  loadCommissions,
  loadTailorSummaries,
  onOpenPiecesModal,
  onOpenPayoutModal,
  currencyDisplay = "SAR",
}) {
  return (
    <div className="h-full min-h-0 flex flex-col gap-2 animate-fadeIn select-none">
      {/* محفظة أجور القطع التراكمية للخياطين */}
      <div className="flex-1 min-h-0 flex flex-col bg-[#111C38] p-3 rounded-xl border border-slate-800 shadow-xs gap-2">
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base text-pink-400">💼</span>
            <div>
              <h3 className="text-xs font-bold text-white">محفظة أجور القطع التراكمية للخياطين (أمر المحاسب)</h3>
              <p className="text-[11px] text-slate-400">القطع المعتمدة من المعمل، جاهزة للصرف بسند رسمي وتصفية فورية من الخزينة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { loadTailorSummaries(); loadCommissions && loadCommissions(); }}
            className="h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>🔄</span>
            <span>تحديث المحفظة</span>
          </button>
        </div>

        {tailorSummaries.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900/60 rounded-xl border border-dashed border-slate-800 my-auto">
            <span className="text-3xl block mb-2">🧵</span>
            <p className="text-xs font-bold text-white">لا توجد أجور قطع معلقة بانتظار الصرف حالياً</p>
            <p className="text-[11px] text-slate-400 mt-0.5">عندما يعتمد المشرف جودة الفساتين ستتجمع القطع هنا تلقائياً لكل خياط.</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar rounded-xl border border-slate-800">
            <table className="w-full text-right text-xs">
              <thead className="sticky top-0 z-10 bg-slate-900/90 text-white font-bold border-b border-slate-800">
                <tr>
                  <th className="py-1.5 px-2 text-[11px] text-white font-bold">الفني / الخياط</th>
                  <th className="py-1.5 px-2 text-[11px] text-center text-white font-bold">القطع المنجزة المعلقة</th>
                  <th className="py-1.5 px-2 text-[11px] text-white font-bold">المستحق المعلق (جاهز للصرف)</th>
                  <th className="py-1.5 px-2 text-[11px] text-center text-white font-bold">متوسط الجودة</th>
                  <th className="py-1.5 px-2 text-[11px] text-center text-white font-bold">نسبة الالتزام ⏱️</th>
                  <th className="py-1.5 px-2 text-[11px] text-center text-white font-bold">القطع المصروفة سابقاً</th>
                  <th className="py-1.5 px-2 text-[11px] text-center text-white font-bold">إجراءات المحاسب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#111C38] font-medium">
                {tailorSummaries.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-1 px-2">
                      <span className="font-bold text-white block text-xs">{t.employee_name}</span>
                      <span className="text-[10px] font-bold text-pink-300 bg-pink-950/60 px-1.5 py-0.2 rounded border border-pink-800/40 inline-block mt-0.5">{t.role || "خياط"}</span>
                    </td>
                    <td className="py-1 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => onOpenPiecesModal(t)}
                        title="عرض كشف القطع التفصيلي برقم أمر التشغيل"
                        className={`font-mono font-bold px-2 py-0.5 rounded-full text-xs cursor-pointer transition hover:ring-1 hover:ring-pink-500 ${
                          t.unpaid_pieces_count > 0 ? "bg-pink-950/60 text-pink-300 border border-pink-800/40" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {t.unpaid_pieces_count} قطعة 🔍
                      </button>
                    </td>
                    <td className="py-1 px-2">
                      <span className="font-bold font-mono text-pink-400 text-xs tabular-nums block">
                        {t.unpaid_total_amount.toLocaleString()} <span className="text-[10px] text-slate-300 font-sans">{currencyDisplay}</span>
                      </span>
                      {t.unpaid_tasks_count > 0 && <span className="text-[10px] text-slate-400">({t.unpaid_tasks_count} أمر تشغيل)</span>}
                    </td>
                    <td className="py-1 px-2 text-center"><span className="text-amber-400 font-bold text-xs">★ {t.avg_quality || "5.0"}</span></td>
                    <td className="py-1 px-2 text-center">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.on_time_rate >= 80 ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40" : "bg-rose-950/60 text-rose-300 border border-rose-800/40"}`}>{t.on_time_rate}%</span>
                    </td>
                    <td className="py-1 px-2 text-center text-slate-400 font-mono text-[11px]">
                      {t.paid_pieces_count > 0 ? `${t.paid_pieces_count} قطعة (${t.paid_total_amount.toLocaleString()} ${currencyDisplay})` : "—"}
                    </td>
                    <td className="py-1 px-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenPiecesModal(t)}
                          className="h-6 px-2 text-[10px] font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center justify-center gap-1 shrink-0 transition cursor-pointer"
                        >
                          <span className="text-[10px]">👁️</span><span>كشف القطع</span>
                        </button>
                        {t.unpaid_pieces_count > 0 ? (
                          <button
                            type="button"
                            onClick={() => onOpenPayoutModal(t)}
                            className="h-6 px-2 text-[10px] font-bold rounded-md bg-pink-600 hover:bg-pink-700 text-white flex items-center justify-center gap-1 shrink-0 shadow-sm transition cursor-pointer"
                          >
                            <span className="text-[10px]">💵</span><span>صرف المستحقات</span>
                          </button>
                        ) : (
                          <span className="text-[9.5px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded-full font-bold">مصفى بالكامل ✅</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

window.CommissionsView = CommissionsView;
window.TailorCommissionTable = CommissionsView;
