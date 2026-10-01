// CommissionsView.jsx - واجهة عمولات وأجور الخياطين ومحفظة القطع وسجل الجودة
function CommissionsView({
  commissions = [], tailorSummaries = [], loadCommissions,
  loadTailorSummaries, onOpenPiecesModal, onOpenPayoutModal, currencyDisplay = "SAR",
}) {
  const totalApprovedCommissions = commissions.reduce((sum, c) => sum + (c.wage_amount || 0), 0);
  const onTimeCount = commissions.filter((c) => c.is_on_time !== false).length;
  const onTimeRate = commissions.length > 0 ? Math.round((onTimeCount / commissions.length) * 100) : 100;
  const avgQuality = commissions.length > 0 ? (commissions.reduce((sum, c) => sum + (c.quality_score || 5), 0) / commissions.length).toFixed(1) : "5.0";

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* بطاقات المؤشرات */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
          <span className="text-xs text-[#6F6B75] font-semibold block">إجمالي العمولات المعتمدة</span>
          <span className="text-xl font-black font-mono text-[#8F2A87] mt-1 block">
            {totalApprovedCommissions.toLocaleString()} <span className="text-xs text-[#6F6B75] font-sans">{currencyDisplay}</span>
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
          <span className="text-xs text-[#6F6B75] font-semibold block">القطع والمهام المعتمدة</span>
          <span className="text-xl font-black font-mono text-[#007F8C] mt-1 block">
            {commissions.length} <span className="text-xs font-sans text-[#6F6B75]">مهمة</span>
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
          <span className="text-xs text-[#6F6B75] font-semibold block">معدل الالتزام بالمواعيد ⏱️</span>
          <span className="text-xl font-black font-mono text-emerald-600 mt-1 block">{onTimeRate}%</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
          <span className="text-xs text-[#6F6B75] font-semibold block">متوسط تقييم الجودة ⭐</span>
          <span className="text-xl font-black font-mono text-amber-500 mt-1 block">{avgQuality} <span className="text-sm">★</span></span>
        </div>
      </div>

      {/* محفظة أجور القطع التراكمية للخياطين */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl text-[#8F2A87]">💼</span>
            <div>
              <h3 className="text-sm font-bold text-[#25232A]">محفظة أجور القطع التراكمية للخياطين (أمر المحاسب)</h3>
              <p className="text-xs text-[#6F6B75]">تجميع القطع المعتمدة من المعمل، وجاهزة للصرف بسند رسمي وتصفية فورية من الخزينة</p>
            </div>
          </div>
          <button type="button" onClick={() => { loadTailorSummaries(); loadCommissions(); }} className="px-3 py-1.5 rounded-xl bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] text-xs font-bold border border-[#E8E5EA] transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto">
            <span>🔄</span><span>تحديث المحفظة</span>
          </button>
        </div>

        {tailorSummaries.length === 0 ? (
          <div className="p-8 text-center text-[#6F6B75] bg-[#FAFAFB] rounded-xl border border-dashed border-[#E8E5EA]">
            <span className="text-3xl block mb-2">🧵</span>
            <p className="text-xs font-bold text-[#25232A]">لا توجد أجور قطع معلقة بانتظار الصرف حالياً</p>
            <p className="text-[11px] text-[#6F6B75] mt-0.5">عندما يعتمد المشرف جودة الفساتين في المعمل ستتجمع القطع هنا تلقائياً لكل خياط.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                <tr>
                  <th className="p-3">الفني / الخياط</th>
                  <th className="p-3 text-center">القطع المنجزة المعلقة</th>
                  <th className="p-3">المستحق المعلق (جاهز للصرف)</th>
                  <th className="p-3 text-center">متوسط الجودة</th>
                  <th className="p-3 text-center">نسبة الالتزام ⏱️</th>
                  <th className="p-3 text-center">القطع المصروفة سابقاً</th>
                  <th className="p-3 text-center">إجراءات المحاسب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white font-medium">
                {tailorSummaries.map((t, idx) => (
                  <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                    <td className="p-3">
                      <span className="font-bold text-[#25232A] block">{t.employee_name}</span>
                      <span className="text-[10px] text-[#8F2A87] bg-[#F2E7F3] px-2 py-0.5 rounded border border-[#E5CEE7] inline-block mt-0.5">{t.role || "خياط"}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`font-mono font-bold px-2.5 py-1 rounded-full text-xs ${t.unpaid_pieces_count > 0 ? "bg-[#F2E7F3] text-[#8F2A87] border border-[#E5CEE7]" : "bg-[#FAFAFB] text-[#6F6B75]"}`}>
                        {t.unpaid_pieces_count} قطعة
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold font-mono text-[#8F2A87] text-sm tabular-nums block">
                        {t.unpaid_total_amount.toLocaleString()} <span className="text-[10px] text-[#6F6B75] font-sans">{currencyDisplay}</span>
                      </span>
                      {t.unpaid_tasks_count > 0 && <span className="text-[10px] text-[#6F6B75]">({t.unpaid_tasks_count} أمر تشغيل)</span>}
                    </td>
                    <td className="p-3 text-center"><span className="text-amber-500 font-bold text-xs">★ {t.avg_quality || "5.0"}</span></td>
                    <td className="p-3 text-center">
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded ${t.on_time_rate >= 80 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{t.on_time_rate}%</span>
                    </td>
                    <td className="p-3 text-center text-[#6F6B75] font-mono text-[11px]">
                      {t.paid_pieces_count > 0 ? `${t.paid_pieces_count} قطعة (${t.paid_total_amount.toLocaleString()} ${currencyDisplay})` : "—"}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button type="button" onClick={() => onOpenPiecesModal(t)} className="px-2.5 py-1.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] border border-[#E8E5EA] rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer">
                          <span>👁️</span><span>كشف القطع</span>
                        </button>
                        {t.unpaid_pieces_count > 0 ? (
                          <button type="button" onClick={() => onOpenPayoutModal(t)} className="px-3 py-1.5 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-lg text-[11px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer">
                            <span>💵</span><span>صرف المستحقات</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md font-bold">مصفى بالكامل ✅</span>
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

      {/* سجل العمولات المعتمدة */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2.5">
            <span className="text-lg text-[#8F2A87]">📋</span>
            <div>
              <h3 className="text-sm font-bold text-[#25232A]">سجل عمولات وأجور الفنيين وتقييمات الجودة المعتمدة</h3>
              <p className="text-xs text-[#6F6B75]">مربوطة بأوامر المشغل وفحص جودة المقاسات وتوثيق سندات الصرف</p>
            </div>
          </div>
          <button type="button" onClick={loadCommissions} className="px-3 py-1.5 rounded-xl bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] text-xs font-bold border border-[#E8E5EA] transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto">
            <span>🔄</span><span>تحديث السجل</span>
          </button>
        </div>

        {commissions.length === 0 ? (
          <div className="p-12 text-center text-[#6F6B75]">
            <span className="text-5xl block mb-3">🧵</span>
            <h4 className="text-sm font-bold text-[#25232A]">لا توجد عمولات معتمدة مسجلة حتى الآن</h4>
            <p className="text-xs mt-1">عندما يعتمد المشرف الجودة، ستظهر العمولات والتقييمات هنا تلقائياً.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                <tr>
                  <th className="p-3">رقم الأمر والموديل</th>
                  <th className="p-3">الفني / الخياط</th>
                  <th className="p-3">نوع الإنتاج والقطع</th>
                  <th className="p-3">تاريخ الأمر والإنجاز</th>
                  <th className="p-3">الأجر المستحق</th>
                  <th className="p-3 text-center">حالة الصرف</th>
                  <th className="p-3 text-center">الجودة والالتزام</th>
                  <th className="p-3">ملاحظات الفحص والاعتماد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white font-medium">
                {commissions.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAFAFB] transition-colors">
                    <td className="p-3">
                      <span className="font-mono font-bold text-[#8F2A87] block">{c.order_no || c.production_order_id}</span>
                      <span className="text-[11px] text-[#25232A] font-bold mt-0.5 block">{c.product_name}</span>
                      <span className="text-[10px] text-[#6F6B75]">{c.stage}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-[#25232A] block">{c.employee_name || "الخياط"}</span>
                      <span className="text-[10px] text-[#6F6B75]">{c.role || "خياط"}</span>
                    </td>
                    <td className="p-3">
                      {c.production_type === "stock" || (!c.child_name || c.child_name.includes("مخزن")) ? (
                        <div>
                          <span className="text-[10.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md inline-block">🏭 إنتاج مخزني</span>
                          <span className="font-mono font-bold text-xs text-[#25232A] block mt-1">{c.pieces_count || 1} قطع</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10.5px] font-bold text-pink-700 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-md inline-block">👧 تفصيل خاص</span>
                          <span className="text-[11px] font-bold text-[#25232A] block mt-1">{c.child_name || "الأميرة"}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-[11px] font-mono">
                      <div className="text-[#6F6B75]">أمر: <span className="text-[#25232A] font-semibold">{c.order_date || (c.created_at ? c.created_at.slice(0, 10) : "—")}</span></div>
                      <div className="text-[#6F6B75]">إنجاز: <span className="text-emerald-700 font-semibold">{c.completed_at ? c.completed_at.slice(0, 10) : "—"}</span></div>
                    </td>
                    <td className="p-3 font-bold font-mono text-[#8F2A87] text-sm tabular-nums">
                      {parseFloat(c.wage_amount || 0).toLocaleString()} <span className="text-[10px] text-[#6F6B75] font-sans">{currencyDisplay}</span>
                    </td>
                    <td className="p-3 text-center">
                      {c.status === "Paid" || c.paid_at ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md inline-block">تم الصرف ✅</span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md inline-block">جاهز للصرف ⏳</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-0.5 text-amber-400 text-sm">
                        {Array.from({ length: Math.round(c.quality_score || 5) }).map((_, i) => (<span key={i}>★</span>))}
                      </div>
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block ${c.is_on_time !== false ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {c.is_on_time !== false ? "في الموعد ⏱️" : "متأخر ⚠️"}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="text-[11px] text-[#25232A] leading-tight max-w-xs">{c.quality_notes || "—"}</p>
                      <span className="text-[9.5px] text-[#6F6B75] mt-1 block">بواسطة: {c.approved_by || "المشرف"}</span>
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
