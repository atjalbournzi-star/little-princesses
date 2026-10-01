// src/features/inventory/components/InventoryTable.jsx
// جدول استعراض أصناف المخزون والأقمشة والمنتجات التامة، التكاليف، والأرصدة

function InventoryTable({
  items = [],
  activeCurrDef = { code: 'YER', display: 'YER ﷼' },
  isBaseCurrency = true,
  activeTargetCurr = 'YER',
  onOpenAdjust,
  onOpenTransfer,
  onOpenMovements
}) {
  const u = window.inventoryUtils || {};
  const getItemName = u.getItemName || (i => i?.item_name || i?.name || '');
  const getItemQty = u.getItemQty || (i => parseFloat(i?.qty || i?.quantity || 0) || 0);
  const getItemCost = u.getItemCost || (i => parseFloat(i?.unit_cost || i?.cost || 0) || 0);
  const getItemUnit = u.getItemUnit || (i => i?.unit || 'متر');
  const isLowStock = u.isItemLowStock || (() => false);
  const isOutOfStock = u.isItemOutOfStock || (() => false);

  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-12 text-center text-[#6F6B75] text-xs font-medium">
        لا توجد أصناف مسجلة في المخزون تطابق معايير الفلترة والبحث 📦
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs table-fixed border-collapse">
          <thead>
            <tr className="bg-[#FAFAFB] text-[#6F6B75] font-bold border-b border-[#E8E5EA]">
              <th className="px-2.5 py-3 text-right w-[7%]">الرمز</th>
              <th className="px-3 py-3 text-right w-[18%]">اسم الصنف / الخامة</th>
              <th className="px-2 py-3 text-right w-[10%]">التصنيف</th>
              <th className="px-2 py-3 text-right w-[11%]">الموقع / المستودع</th>
              <th className="px-2 py-3 text-left w-[9%]">الرصيد المتوفر</th>
              <th className="px-2 py-3 text-left w-[11%]">متوسط التكلفة</th>
              <th className="px-2 py-3 text-left w-[12%]">إجمالي القيمة</th>
              <th className="px-2 py-3 text-right w-[10%]">المورد</th>
              <th className="px-2 py-3 text-center w-[12%]">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E5EA] bg-white">
            {items.map((i, idx) => {
              const name = getItemName(i);
              const code = i.item_code || i.code || i.id || (idx + 1);
              const qty = getItemQty(i);
              const rawCost = getItemCost(i);
              const unit = getItemUnit(i);
              const loc = i.location || 'المستودع الرئيسي';
              const supplier = i.supplier_id || i.supplier || i.supplier_name || 'مورد عام';

              const iCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(i.currency || 'YER') : 'YER';
              const baseCost = iCurr === 'YER' ? rawCost : (window.CurrencyService ? window.CurrencyService.toBase(rawCost, iCurr).base_amount : rawCost);
              const baseTotal = (parseFloat(i.total_value) && iCurr === 'YER') ? parseFloat(i.total_value) : (qty * baseCost);

              const displayCost = isBaseCurrency ? baseCost : (window.CurrencyService ? window.CurrencyService.fromBase(baseCost, activeTargetCurr) : baseCost);
              const displayTotal = isBaseCurrency ? baseTotal : (window.CurrencyService ? window.CurrencyService.fromBase(baseTotal, activeTargetCurr) : baseTotal);

              const outOfStock = isOutOfStock(i);
              const lowStock = isLowStock(i);

              return (
                <tr key={i.id || name || idx} className="hover:bg-[#FAFAFB] transition-colors">
                  {/* رمز الصنف */}
                  <td className="px-2.5 py-2.5 font-mono text-[#8F2A87] font-bold text-xs text-right align-middle truncate" title={String(code)}>
                    {code}
                  </td>

                  {/* اسم الصنف وحالة التنبيه */}
                  <td className="px-3 py-2.5 font-bold text-[#25232A] text-right align-middle truncate" title={name}>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="truncate">{name}</span>
                      {outOfStock ? (
                        <span className="text-[9px] bg-rose-50 text-rose-600 border border-rose-200 px-1 py-0.2 rounded font-bold shrink-0">نفد 🚫</span>
                      ) : lowStock ? (
                        <span className="text-[9px] bg-[#FFF1DC] text-[#C97300] border border-[#FFE4B9] px-1 py-0.2 rounded font-bold shrink-0">منخفض ⚠️</span>
                      ) : null}
                    </div>
                  </td>

                  {/* التصنيف */}
                  <td className="px-2 py-2.5 text-right align-middle truncate">
                    <span className="bg-[#FAFAFB] text-[#25232A] border border-[#E8E5EA] px-1.5 py-0.5 rounded text-[10px] font-semibold inline-block truncate max-w-full">
                      {i.category || 'أقمشة وخامات'}
                    </span>
                  </td>

                  {/* الموقع / المستودع */}
                  <td className="px-2 py-2.5 text-[#6F6B75] text-[11px] text-right align-middle truncate" title={loc}>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-[#007F8C] text-[11px] truncate block">🏢 {loc}</span>
                      {i.warehouse_stocks && (
                        <div className="text-[9px] text-[#6F6B75] font-mono flex items-center gap-1 overflow-hidden" title="توزيع الرصيد: رئيسي | معمل | معرض">
                          <span className="text-cyan-700 font-bold">ر:{i.warehouse_stocks['WH-MAIN'] || 0}</span>
                          <span>·</span>
                          <span className="text-purple-700 font-bold">م:{i.warehouse_stocks['WH-WORKSHOP'] || 0}</span>
                          <span>·</span>
                          <span className="text-emerald-700 font-bold">ع:{i.warehouse_stocks['WH-SHOWROOM'] || 0}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* الرصيد المتوفر */}
                  <td className="px-2 py-2.5 text-left align-middle truncate">
                    <span className="font-bold font-mono text-[#25232A] tabular-nums dir-ltr">
                      {qty.toLocaleString('en-US', { minimumFractionDigits: unit === 'قطعة' ? 0 : 1, maximumFractionDigits: 1 })}
                    </span>
                    <span className="text-[10px] font-normal text-[#6F6B75] font-sans mr-0.5">
                      {unit}
                    </span>
                  </td>

                  {/* التكلفة */}
                  <td className="px-2 py-2.5 text-left align-middle truncate">
                    <span className="font-mono text-[#6F6B75] font-semibold tabular-nums dir-ltr">
                      {displayCost > 0 ? displayCost.toLocaleString('en-US', { minimumFractionDigits: isBaseCurrency ? 0 : 2, maximumFractionDigits: 2 }) : '0.00'}
                    </span>
                    <span className="text-[9.5px] font-normal font-sans text-[#6F6B75] mr-0.5">
                      {activeCurrDef.code}
                    </span>
                  </td>

                  {/* إجمالي القيمة */}
                  <td className="px-2 py-2.5 text-left align-middle truncate">
                    <span className="font-bold font-mono text-[#007F8C] tabular-nums dir-ltr">
                      {displayTotal > 0 ? displayTotal.toLocaleString('en-US', { minimumFractionDigits: isBaseCurrency ? 0 : 2, maximumFractionDigits: 2 }) : '0.00'}
                    </span>
                    <span className="text-[9.5px] font-normal font-sans text-[#007F8C] mr-0.5">
                      {activeCurrDef.code}
                    </span>
                  </td>

                  {/* المورد */}
                  <td className="px-2 py-2.5 text-[#25232A] font-medium text-right align-middle truncate text-[11px]" title={supplier}>
                    {supplier}
                  </td>

                  {/* الإجراءات السريعة */}
                  <td className="px-2 py-2.5 text-center align-middle">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenMovements && onOpenMovements(i)}
                        className="p-1.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] border border-[#E8E5EA] rounded-lg text-xs transition cursor-pointer"
                        title="كارت الصنف وسجل الحركات التاريخية"
                      >
                        📋
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenTransfer && onOpenTransfer(i)}
                        className="p-1.5 bg-[#FAFAFB] hover:bg-[#E2F5F7] text-[#007F8C] border border-[#E8E5EA] rounded-lg text-xs transition cursor-pointer"
                        title="مناقلة بين المستودعات والفروع"
                      >
                        🔄
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenAdjust && onOpenAdjust(i)}
                        className="px-2 py-1 bg-[#FAFAFB] hover:bg-[#FCE8F2] text-[#B0005A] border border-[#E8E5EA] hover:border-[#F2A4CB] rounded-lg text-[10.5px] font-bold transition cursor-pointer"
                        title="تسوية فروقات جردية أو إهلاك تالف"
                      >
                        <span>⚖️</span>
                        <span className="mr-0.5">تسوية</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.InventoryTable = InventoryTable;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InventoryTable;
}
