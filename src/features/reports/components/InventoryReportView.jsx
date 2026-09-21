// src/features/reports/components/InventoryReportView.jsx

function InventoryReportView({ inventoryStats, inventory = [], reportCurrency, fmtMoney }) {
  const inv = Array.isArray(inventory) ? inventory : [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* بطاقات المؤشرات المالية والكمية للمخزون */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#6F6B75]">إجمالي تقييم المخزون</span>
            <span className="w-8 h-8 rounded-xl bg-[#E2F5F7] text-[#007F8C] flex items-center justify-center text-sm font-bold">💎</span>
          </div>
          <div className="text-xl font-black text-[#007F8C] font-mono">
            {fmtMoney(inventoryStats.totalValuation)}
            <span className="text-xs font-sans text-[#6F6B75] mr-1.5">{reportCurrency}</span>
          </div>
          <p className="text-[11px] text-[#6F6B75] mt-1">تقييم بسعر التكلفة الدفترية</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#6F6B75]">عدد الأصناف والبنود</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-[#8F2A87] flex items-center justify-center text-sm font-bold">📦</span>
          </div>
          <div className="text-xl font-black text-[#25232A] font-mono">
            {inventoryStats.totalItems}
            <span className="text-xs font-sans text-[#6F6B75] mr-1.5">صنف مسجل</span>
          </div>
          <p className="text-[11px] text-[#6F6B75] mt-1">أقمشة، كلف، وإكسسوارات تفصيل</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#6F6B75]">مخزون الأقمشة والخامات</span>
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-sm font-bold">🧵</span>
          </div>
          <div className="text-xl font-black text-indigo-900 font-mono">
            {inventoryStats.totalFabrics.toFixed(1)}
            <span className="text-xs font-sans text-[#6F6B75] mr-1.5">متر متوفر</span>
          </div>
          <p className="text-[11px] text-[#6F6B75] mt-1">جاهز لقص وتفصيل الفساتين</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#6F6B75]">تنبيهات النواقص</span>
            <span className="w-8 h-8 rounded-xl bg-rose-50 text-[#D64545] flex items-center justify-center text-sm font-bold">⚠️</span>
          </div>
          <div className={`text-xl font-black font-mono ${inventoryStats.lowStockCount > 0 ? 'text-[#D64545]' : 'text-emerald-700'}`}>
            {inventoryStats.lowStockCount}
            <span className="text-xs font-sans text-[#6F6B75] mr-1.5">صنف ناقص</span>
          </div>
          <p className="text-[11px] mt-1">
            {inventoryStats.lowStockCount > 0 ? (
              <span className="text-[#D64545] font-bold">يحتاج إلى إعادة طلب فوري!</span>
            ) : (
              <span className="text-emerald-700 font-semibold">المخزون متوفر بالكامل</span>
            )}
          </p>
        </div>
      </div>

      {/* جدول حركة وتقييم المخزون وتنبيهات النواقص */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] overflow-hidden shadow-2xs">
        <div className="p-4.5 bg-gradient-to-r from-[#FAFAFB] to-white border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#25232A] flex items-center gap-2">
              <span>📦</span>
              <span>جدول حركة وتقييم المخزون وتنبيهات النواقص (Stock Inventory & Valuation)</span>
            </h3>
            <p className="text-[11px] text-[#6F6B75] mt-0.5">مراقبة الأرصدة المتوفرة، سعر التكلفة، القيمة المالية الإجمالية، وحدود الأمان</p>
          </div>
          <span className="text-xs font-mono font-bold text-[#007F8C] bg-[#E2F5F7] px-3 py-1 rounded-lg">
            {inv.length} صنف مسجل
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#FAFAFB] border-b border-[#E8E5EA] text-[#6F6B75]">
                <th className="px-4 py-3 font-bold">اسم الصنف / الخامة</th>
                <th className="px-4 py-3 font-bold">التصنيف</th>
                <th className="px-4 py-3 font-bold text-center">الكمية المتوفرة</th>
                <th className="px-4 py-3 font-bold text-left">سعر التكلفة</th>
                <th className="px-4 py-3 font-bold text-left">القيمة الإجمالية</th>
                <th className="px-4 py-3 font-bold text-center">حد الطلب</th>
                <th className="px-4 py-3 font-bold text-center">حالة التوفر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5EA]">
              {inv.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-[#6F6B75]">لا توجد أصناف مخزنية مسجلة 📦</td></tr>
              ) : (
                inv.map((item, idx) => {
                  const qty = parseFloat(item.quantity || item.qty || 0);
                  const cost = parseFloat(item.cost_price || item.unit_price || item.price || 0);
                  const total = qty * cost;
                  const minQty = parseFloat(item.min_qty || item.alert_threshold || 5);
                  const isLow = qty <= minQty;

                  return (
                    <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="px-4 py-3 font-bold text-[#25232A] flex items-center gap-2">
                        <span>{String(item.category || '').includes('قماش') ? '🧵' : '✨'}</span>
                        <span>{item.name || item.item_name || item.fabric_name}</span>
                      </td>
                      <td className="px-4 py-3 text-[#6F6B75]">{item.category || item.type || 'أقمشة وخامات'}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-[#25232A]">
                        {qty} {item.unit || 'متر'}
                      </td>
                      <td className="px-4 py-3 text-left font-mono font-bold text-[#6F6B75]">
                        {fmtMoney(cost)} {reportCurrency}
                      </td>
                      <td className="px-4 py-3 text-left font-mono font-bold text-[#007F8C]">
                        {fmtMoney(total)} {reportCurrency}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-[#6F6B75]">{minQty}</td>
                      <td className="px-4 py-3 text-center">
                        {isLow ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            ⚠️ نقص في المخزون
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
