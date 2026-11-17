// src/features/reports/components/InventoryReportView.jsx
// عرض تقارير حركة وتقييم المخزون وتنبيهات النواقص (Inventory Views)

function InventoryReportView({ inventoryStats = {}, inventory = [], reportCurrency, fmtMoney }) {
  const inv = Array.isArray(inventory) ? inventory : [];
  const totalValuation = inv.reduce((s, item) => {
    const qty = parseFloat(item.quantity || item.qty || 0);
    const cost = parseFloat(item.unit_cost !== undefined && item.unit_cost !== null && item.unit_cost !== '' ? item.unit_cost : (item.cost !== undefined && item.cost !== null && item.cost !== '' ? item.cost : (item.cost_price || item.unit_price || item.price || 0)));
    const total = parseFloat(item.total_value !== undefined && item.total_value !== null ? item.total_value : (qty * cost));
    return s + (isNaN(total) ? 0 : total);
  }, 0) || inventoryStats?.totalValuation || 0;

  return (
    <div className="space-y-1.5 animate-fadeIn select-none">
      {/* بطاقات المؤشرات المالية والكمية للمخزون */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 my-0.5 shrink-0">
        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">تقييم المخزون</span>
          <span className="text-[11px] font-bold text-slate-900 dark:text-white font-mono tracking-tight tabular-nums">
            {fmtMoney(totalValuation)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">الأصناف والبنود</span>
          <span className="text-[11px] font-bold text-slate-900 dark:text-white font-mono tracking-tight tabular-nums">
            {inventoryStats?.totalItems ?? 0} <span className="text-[10px] text-slate-400 font-sans">صنف</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">مخزون الأقمشة</span>
          <span className="text-[11px] font-bold text-slate-900 dark:text-white font-mono tracking-tight tabular-nums">
            {(inventoryStats?.totalFabrics || 0).toFixed(1)} <span className="text-[10px] text-slate-400 font-sans">متر</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">تنبيهات النواقص</span>
            {(inventoryStats?.lowStockCount || 0) > 0 && (
              <span className="text-[9.5px] font-bold px-1 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-mono">
                تنبيه
              </span>
            )}
          </div>
          <span className={`text-[11px] font-bold font-mono tracking-tight tabular-nums ${(inventoryStats?.lowStockCount || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
            {inventoryStats?.lowStockCount ?? 0} <span className="text-[10px] text-slate-400 font-sans">صنف</span>
          </span>
        </div>
      </div>

      {/* جدول حركة وتقييم المخزون وتنبيهات النواقص */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 overflow-hidden shadow-xs">
        <div className="h-7.5 px-3 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            <span>جدول حركة وتقييم المخزون وتنبيهات النواقص (Stock Inventory & Valuation)</span>
          </h3>
          <span className="text-[10px] font-mono font-bold text-pink-600 dark:text-pink-300 bg-pink-500/10 px-2 py-0.2 rounded-md border border-pink-200 dark:border-pink-700/60 shrink-0">
            {inv.length} صنف مسجل
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right text-[11px]">
            <thead>
              <tr className="h-7.5 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <th className="px-2.5 py-1">اسم الصنف / الخامة</th>
                <th className="px-2.5 py-1">التصنيف</th>
                <th className="px-2.5 py-1 text-center font-mono">الكمية المتوفرة</th>
                <th className="px-2.5 py-1 text-left font-mono">سعر التكلفة</th>
                <th className="px-2.5 py-1 text-left font-mono">القيمة الإجمالية</th>
                <th className="px-2.5 py-1 text-center font-mono">حد الطلب</th>
                <th className="px-2.5 py-1 text-center">حالة التوفر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
              {inv.length === 0 ? (
                <tr><td colSpan="7" className="p-5 text-center text-slate-500 dark:text-slate-400 font-medium">لا توجد أصناف مخزنية مسجلة 📦</td></tr>
              ) : (
                inv.map((item, idx) => {
                  const qty = parseFloat(item.quantity || item.qty || 0);
                  const cost = parseFloat(item.unit_cost !== undefined && item.unit_cost !== null && item.unit_cost !== '' ? item.unit_cost : (item.cost !== undefined && item.cost !== null && item.cost !== '' ? item.cost : (item.cost_price || item.unit_price || item.price || 0)));
                  const total = parseFloat(item.total_value !== undefined && item.total_value !== null ? item.total_value : (qty * cost));
                  const minQty = parseFloat(item.min_qty || item.alert_threshold || 5);
                  const isLow = qty <= minQty;

                  return (
                    <tr key={idx} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-2.5 py-1 font-bold text-slate-800 dark:text-white">
                        {item.name || item.item_name || item.fabric_name}
                      </td>
                      <td className="px-2.5 py-1 text-slate-600 dark:text-slate-300">{item.category || item.type || 'أقمشة وخامات'}</td>
                      <td className="px-2.5 py-1 text-center font-mono text-[11px] font-bold text-slate-900 dark:text-white tabular-nums">
                        {Number(qty.toFixed(2))} {item.unit || 'متر'}
                      </td>
                      <td className="px-2.5 py-1 text-left font-mono text-[11px] font-medium text-slate-800 dark:text-white tabular-nums">
                        {fmtMoney(cost)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span>
                      </td>
                      <td className="px-2.5 py-1 text-left font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {fmtMoney(total)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span>
                      </td>
                      <td className="px-2.5 py-1 text-center font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">{minQty}</td>
                      <td className="px-2.5 py-1 text-center">
                        {isLow ? (
                          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            نقص بالمخزون
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            متوفر كافي
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
