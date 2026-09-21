/**
 * ModelCostTable - جدول التكلفة الفعلية وهوامش الربحية للموديلات
 * جزء من لوحة تحليلات ورشة الإنتاج (Factory Analytics)
 */
function ModelCostTable({ modelsCosting = [], onRefresh }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📊</span>
          <div>
            <h3 className="font-bold text-sm text-[#25232A]">جدول التكلفة الفعلية وهوامش الربحية للموديلات (Cost & Margin Sheet)</h3>
            <p className="text-xs text-[#6F6B75] mt-0.5">احتساب تكلفة القماش + أجور الفنيين الأربعة ومقارنتها بسعر البيع ونسبة هامش الربح</p>
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="px-3.5 py-1.5 rounded-xl bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] font-bold text-xs border border-[#E8E5EA] transition flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
          >
            <span>🔄</span>
            <span>تحديث البيانات من سوبابيز</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
              <th className="px-4 py-3.5 text-right whitespace-nowrap">اسم الموديل والتصنيف</th>
              <th className="px-4 py-3.5 text-center whitespace-nowrap">القطع المنجزة</th>
              <th className="px-4 py-3.5 text-center whitespace-nowrap">متوسط القماش</th>
              <th className="px-4 py-3.5 text-center whitespace-nowrap">تكلفة القماش</th>
              <th className="px-4 py-3.5 text-center whitespace-nowrap">أجور الفنيين (4 مراحل)</th>
              <th className="px-4 py-3.5 text-center whitespace-nowrap bg-purple-50/50">إجمالي التكلفة الفعلية</th>
              <th className="px-4 py-3.5 text-center whitespace-nowrap">سعر البيع للجمهور</th>
              <th className="px-4 py-3.5 text-center whitespace-nowrap bg-emerald-50/50">صافي الربح / فستان</th>
              <th className="px-4 py-3.5 text-center whitespace-nowrap">نسبة الهامش %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E5EA] bg-white">
            {modelsCosting.length === 0 ? (
              <tr>
                <td colSpan="9" className="p-10 text-center text-[#6F6B75] font-medium">
                  لا توجد بيانات تكاليف كافية حالياً، يتم الاحتساب تلقائياً مع تنفيذ أوامر التشغيل 🧵
                </td>
              </tr>
            ) : (
              modelsCosting.map((m, idx) => (
                <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-[#25232A] text-xs">{m.product_name}</div>
                    <div className="text-[10px] text-[#6F6B75] mt-0.5">{m.category || 'موديل تفصيل'}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-[#8F2A87]">
                    {m.total_pieces_produced} قطعة
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-[#25232A]">
                    {m.avg_cut_meters} م
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-[#6F6B75]">
                    {m.fabric_cost?.toLocaleString()} ر.ي
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="font-mono font-bold text-[#8F2A87]">{m.labor_cost?.toLocaleString()} ر.ي</div>
                    <div className="text-[9.5px] text-[#6F6B75]">قص {m.cutter_wage} • خياطة {m.tailor_wage}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-black text-purple-900 bg-purple-50/50">
                    {m.unit_cost?.toLocaleString()} ر.ي
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-[#007F8C]">
                    {m.selling_price?.toLocaleString()} ر.ي
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-black text-emerald-800 bg-emerald-50/50">
                    +{m.unit_profit?.toLocaleString()} ر.ي
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-black font-mono ${
                      m.margin_pct >= 50 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                      (m.margin_pct >= 30 ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-amber-100 text-amber-800 border border-amber-300')
                    }`}>
                      {m.margin_pct}% {m.margin_rating}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.ModelCostTable = ModelCostTable;
}
