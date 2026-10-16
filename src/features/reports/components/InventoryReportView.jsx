// src/features/reports/components/InventoryReportView.jsx

function InventoryReportView({ inventoryStats, inventory = [], reportCurrency, fmtMoney }) {
  const inv = Array.isArray(inventory) ? inventory : [];
  const totalValuation = inv.reduce((s, item) => {
    const qty = parseFloat(item.quantity || item.qty || 0);
    const cost = parseFloat(item.unit_cost !== undefined && item.unit_cost !== null && item.unit_cost !== '' ? item.unit_cost : (item.cost !== undefined && item.cost !== null && item.cost !== '' ? item.cost : (item.cost_price || item.unit_price || item.price || 0)));
    const total = parseFloat(item.total_value !== undefined && item.total_value !== null ? item.total_value : (qty * cost));
    return s + (isNaN(total) ? 0 : total);
  }, 0) || inventoryStats.totalValuation || 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* بطاقات المؤشرات المالية والكمية للمخزون بخط أبيض ناصع وأيقونات رقيقة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">إجمالي تقييم المخزون</span>
            <span className="w-6 h-6 rounded-md bg-slate-800/80 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">💎</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {fmtMoney(totalValuation)}
            <span className="text-xs font-sans text-white mr-1.5">{reportCurrency}</span>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">عدد الأصناف والبنود</span>
            <span className="w-6 h-6 rounded-md bg-slate-800/80 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">📦</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {inventoryStats.totalItems}
            <span className="text-xs font-sans text-white mr-1.5">صنف مسجل</span>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">مخزون الأقمشة والخامات</span>
            <span className="w-6 h-6 rounded-md bg-slate-800/80 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">🧵</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {inventoryStats.totalFabrics.toFixed(1)}
            <span className="text-xs font-sans text-white mr-1.5">{reportCurrency}</span>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">تنبيهات النواقص</span>
            <span className="w-6 h-6 rounded-md bg-slate-800/80 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">⚠️</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {inventoryStats.lowStockCount}
            <span className="text-xs font-sans text-white mr-1.5">صنف ناقص</span>
          </div>
        </div>
      </div>

      {/* جدول حركة وتقييم المخزون وتنبيهات النواقص بخطوط بيضاء ناصعة */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xs">
        <div className="p-4.5 bg-slate-900 border-b border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📦</span>
              <span>جدول حركة وتقييم المخزون وتنبيهات النواقص (Stock Inventory & Valuation)</span>
            </h3>
            <p className="text-[11px] text-white mt-0.5">مراقبة الأرصدة المتوفرة، سعر التكلفة، القيمة المالية الإجمالية، وحدود الأمان</p>
          </div>
          <span className="text-xs font-mono font-bold text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
            {inv.length} صنف مسجل
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-white">
                <th className="px-4 py-3 font-medium text-white">اسم الصنف / الخامة</th>
                <th className="px-4 py-3 font-medium text-white">التصنيف</th>
                <th className="px-4 py-3 font-medium text-white text-center">الكمية المتوفرة</th>
                <th className="px-4 py-3 font-medium text-white text-left">سعر التكلفة</th>
                <th className="px-4 py-3 font-medium text-white text-left">القيمة الإجمالية</th>
                <th className="px-4 py-3 font-medium text-white text-center">حد الطلب</th>
                <th className="px-4 py-3 font-medium text-white text-center">حالة التوفر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/60">
              {inv.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-white font-medium">لا توجد أصناف مخزنية مسجلة 📦</td></tr>
              ) : (
                inv.map((item, idx) => {
                  const qty = parseFloat(item.quantity || item.qty || 0);
                  const cost = parseFloat(item.unit_cost !== undefined && item.unit_cost !== null && item.unit_cost !== '' ? item.unit_cost : (item.cost !== undefined && item.cost !== null && item.cost !== '' ? item.cost : (item.cost_price || item.unit_price || item.price || 0)));
                  const total = parseFloat(item.total_value !== undefined && item.total_value !== null ? item.total_value : (qty * cost));
                  const minQty = parseFloat(item.min_qty || item.alert_threshold || 5);
                  const isLow = qty <= minQty;

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                        <span>{String(item.category || '').includes('قماش') ? '🧵' : '✨'}</span>
                        <span>{item.name || item.item_name || item.fabric_name}</span>
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{item.category || item.type || 'أقمشة وخامات'}</td>
                      <td className="px-4 py-3 text-center font-mono font-medium text-white">
                        {qty} {item.unit || 'متر'}
                      </td>
                      <td className="px-4 py-3 text-left font-mono font-medium text-white">
                        {fmtMoney(cost)} {reportCurrency}
                      </td>
                      <td className="px-4 py-3 text-left font-mono font-medium text-white">
                        {fmtMoney(total)} {reportCurrency}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-white font-medium">{minQty}</td>
                      <td className="px-4 py-3 text-center">
                        {isLow ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-800">
                            ⚠️ نقص في المخزون
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800">
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
