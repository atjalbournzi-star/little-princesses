// src/features/reports/components/InventoryReportView.jsx
// عرض تقارير حركة وتقييم المخزون وتنبيهات النواقص (Inventory Views)

function InventoryReportView({ inventoryStats, inventory = [], reportCurrency, fmtMoney }) {
  const inv = Array.isArray(inventory) ? inventory : [];
  const totalValuation = inv.reduce((s, item) => {
    const qty = parseFloat(item.quantity || item.qty || 0);
    const cost = parseFloat(item.unit_cost !== undefined && item.unit_cost !== null && item.unit_cost !== '' ? item.unit_cost : (item.cost !== undefined && item.cost !== null && item.cost !== '' ? item.cost : (item.cost_price || item.unit_price || item.price || 0)));
    const total = parseFloat(item.total_value !== undefined && item.total_value !== null ? item.total_value : (qty * cost));
    return s + (isNaN(total) ? 0 : total);
  }, 0) || inventoryStats.totalValuation || 0;

  return (
    <div className="space-y-3 animate-fadeIn select-none">
      {/* بطاقات المؤشرات المالية والكمية للمخزون */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-[#111C38] p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-semibold text-slate-300">إجمالي تقييم المخزون</span>
            <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">💎</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-mono">
            {fmtMoney(totalValuation)}
            <span className="text-[10px] text-slate-400 mr-1">{reportCurrency}</span>
          </div>
        </div>

        <div className="bg-[#111C38] p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-semibold text-slate-300">عدد الأصناف والبنود</span>
            <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">📦</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-mono">
            {inventoryStats.totalItems}
            <span className="text-[10px] text-slate-400 mr-1 font-sans">صنف</span>
          </div>
        </div>

        <div className="bg-[#111C38] p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-semibold text-slate-300">مخزون الأقمشة والخامات</span>
            <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">🧵</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-mono">
            {inventoryStats.totalFabrics.toFixed(1)}
            <span className="text-[10px] text-slate-400 mr-1 font-sans">متر قماش</span>
          </div>
        </div>

        <div className="bg-[#111C38] p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-semibold text-slate-300">تنبيهات النواقص</span>
            <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">⚠️</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-mono">
            {inventoryStats.lowStockCount}
            <span className="text-[10px] text-slate-400 mr-1 font-sans">صنف ناقص</span>
          </div>
        </div>
      </div>

      {/* جدول حركة وتقييم المخزون وتنبيهات النواقص */}
      <div className="bg-[#111C38] rounded-xl border border-slate-800 overflow-hidden shadow-2xs">
        <div className="px-3.5 py-2 bg-[#0F172A] border-b border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <span className="text-pink-400">📦</span>
              <span>جدول حركة وتقييم المخزون وتنبيهات النواقص (Stock Inventory & Valuation)</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">مراقبة الأرصدة المتوفرة، سعر التكلفة، القيمة المالية الإجمالية، وحدود الأمان</p>
          </div>
          <span className="text-[10.5px] font-mono font-bold text-pink-300 bg-pink-950/60 px-2.5 py-0.5 rounded-lg border border-pink-700/60 shrink-0">
            {inv.length} صنف مسجل
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#0F172A] border-b border-slate-800 text-slate-400">
                <th className="px-3 py-2 text-[10.5px] font-bold">اسم الصنف / الخامة</th>
                <th className="px-3 py-2 text-[10.5px] font-bold">التصنيف</th>
                <th className="px-3 py-2 text-[10.5px] font-bold text-center">الكمية المتوفرة</th>
                <th className="px-3 py-2 text-[10.5px] font-bold text-left">سعر التكلفة</th>
                <th className="px-3 py-2 text-[10.5px] font-bold text-left">القيمة الإجمالية</th>
                <th className="px-3 py-2 text-[10.5px] font-bold text-center">حد الطلب</th>
                <th className="px-3 py-2 text-[10.5px] font-bold text-center">حالة التوفر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-[#111C38]/90">
              {inv.length === 0 ? (
                <tr><td colSpan="7" className="p-6 text-center text-slate-400 font-medium">لا توجد أصناف مخزنية مسجلة 📦</td></tr>
              ) : (
                inv.map((item, idx) => {
                  const qty = parseFloat(item.quantity || item.qty || 0);
                  const cost = parseFloat(item.unit_cost !== undefined && item.unit_cost !== null && item.unit_cost !== '' ? item.unit_cost : (item.cost !== undefined && item.cost !== null && item.cost !== '' ? item.cost : (item.cost_price || item.unit_price || item.price || 0)));
                  const total = parseFloat(item.total_value !== undefined && item.total_value !== null ? item.total_value : (qty * cost));
                  const minQty = parseFloat(item.min_qty || item.alert_threshold || 5);
                  const isLow = qty <= minQty;

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-1.5 font-medium text-white flex items-center gap-1.5">
                        <span className="text-xs">{String(item.category || '').includes('قماش') ? '🧵' : '✨'}</span>
                        <span className="text-xs font-bold text-white">{item.name || item.item_name || item.fabric_name}</span>
                      </td>
                      <td className="px-3 py-1.5 text-xs text-slate-300">{item.category || item.type || 'أقمشة وخامات'}</td>
                      <td className="px-3 py-1.5 text-center font-mono text-xs font-bold text-white">
                        {Number(qty.toFixed(2))} {item.unit || 'متر'}
                      </td>
                      <td className="px-3 py-1.5 text-left font-mono text-xs font-medium text-white">
                        {fmtMoney(cost)} <span className="text-[10px] text-slate-400 mr-1">{reportCurrency}</span>
                      </td>
                      <td className="px-3 py-1.5 text-left font-mono text-xs font-bold text-emerald-400">
                        {fmtMoney(total)} <span className="text-[10px] text-slate-400 mr-1">{reportCurrency}</span>
                      </td>
                      <td className="px-3 py-1.5 text-center font-mono text-xs text-slate-300">{minQty}</td>
                      <td className="px-3 py-1.5 text-center">
                        {isLow ? (
                          <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-rose-950/60 text-rose-300 border border-rose-800 font-mono">
                            ⚠️ نقص بالمخزون
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800 font-mono">
                            ✓ متوفر كافي
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.InventoryReportView = InventoryReportView;
}
