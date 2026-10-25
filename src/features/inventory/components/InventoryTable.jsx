// src/features/inventory/components/InventoryTable.jsx
// جدول استعراض أصناف المخزون والأقمشة والمنتجات التامة المتطابق مع معيار جدول السندات

function InventoryTable({
  items = [],
  activeCurrDef = { code: 'YER', display: 'YER' },
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
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-slate-700 dark:text-white text-xs font-semibold select-none">
        <svg className="w-7 h-7 text-slate-400 dark:text-slate-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <span>لا توجد أصناف مسجلة في المخزون تطابق معايير الفلترة والبحث</span>
      </div>
    );
  }

  const currCode = (activeCurrDef?.code || activeTargetCurr || 'YER').replace('﷼', '').trim();

  const columns = [
    { key: 'code', label: 'الرمز', width: 'w-[75px]', align: 'text-right' },
    { key: 'name', label: 'اسم الصنف / الخامة', width: 'w-[20%]', align: 'text-right' },
    { key: 'category', label: 'التصنيف', width: 'w-[100px]', align: 'text-right' },
    { key: 'location', label: 'المستودع / الموقع', width: 'w-[135px]', align: 'text-right' },
    { key: 'qty', label: 'الرصيد المتوفر', width: 'w-[95px]', align: 'text-left' },
    { key: 'cost', label: `متوسط التكلفة (${currCode})`, width: 'w-[110px]', align: 'text-left' },
    { key: 'total', label: `إجمالي القيمة (${currCode})`, width: 'w-[115px]', align: 'text-left' },
    { key: 'supplier', label: 'المورد', width: 'w-[110px]', align: 'text-right' },
    { key: 'actions', label: 'الإجراءات', width: 'w-[85px]', align: 'text-center sticky left-0 z-10 bg-slate-50 dark:bg-[#0F172A]' }
  ];

  return (
    <div className="overflow-x-auto custom-scrollbar rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 select-none">
      <table className="w-full min-w-[980px] table-fixed text-right border-collapse">
        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 shadow-xs">
          <tr className="h-7.5">
            {columns.map(c => (
              <th
                key={c.key}
                className={`h-7.5 py-1.5 px-2 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden ${c.width} ${c.align}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-transparent">
          {items.map((i, idx) => {
            const name = getItemName(i);
            const code = i.item_code || i.code || i.id || (idx + 1);
            const qty = getItemQty(i);
            const rawCost = getItemCost(i);
            const unit = getItemUnit(i);
            const loc = i.location || i.warehouse_name || (Array.isArray(i.warehouse_details) && i.warehouse_details[0]?.warehouse_name) || '—';
            const supplier = i.supplier_name || i.supplier || i.supplier_id || 'مورد عام';

            const iCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(i.currency || 'YER') : 'YER';
            const baseCost = iCurr === 'YER' ? rawCost : (window.CurrencyService ? window.CurrencyService.toBase(rawCost, iCurr).base_amount : rawCost);
            const baseTotal = (parseFloat(i.total_value) && iCurr === 'YER') ? parseFloat(i.total_value) : (qty * baseCost);

            const displayCost = isBaseCurrency ? baseCost : (window.CurrencyService ? window.CurrencyService.fromBase(baseCost, activeTargetCurr) : baseCost);
            const displayTotal = isBaseCurrency ? baseTotal : (window.CurrencyService ? window.CurrencyService.fromBase(baseTotal, activeTargetCurr) : baseTotal);

            const outOfStock = isOutOfStock(i);
            const lowStock = isLowStock(i);

            return (
              <tr key={i.id || name || idx} className="h-8 border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[11px] font-medium transition-colors group">
                {/* 1. رمز الصنف */}
                <td className="w-[75px] py-1.5 px-2 text-right font-mono text-slate-500 dark:text-slate-400 text-[11px] truncate" title={String(code)}>
                  {code}
                </td>

                {/* 2. اسم الصنف وحالة التنبيه */}
                <td className="w-[20%] py-1.5 px-2 text-right font-semibold text-slate-900 dark:text-white text-[11px] truncate" title={name}>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="truncate">{name}</span>
                    {outOfStock ? (
                      <span className="text-[9px] bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 px-1 py-0.2 rounded font-bold shrink-0">نفد</span>
                    ) : lowStock ? (
                      <span className="text-[9px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 px-1 py-0.2 rounded font-bold shrink-0">منخفض</span>
                    ) : null}
                  </div>
                </td>

                {/* 3. التصنيف */}
                <td className="w-[100px] py-1.5 px-2 text-right truncate">
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 rounded text-[10px] font-medium inline-block truncate max-w-full">
                    {i.category || 'أقمشة وخامات'}
                  </span>
                </td>

                {/* 4. الموقع / المستودع */}
                <td className="w-[135px] py-1.5 px-2 text-right truncate" title={loc}>
                  <div className="flex flex-col gap-0.5 truncate">
                    <span className="font-semibold text-teal-700 dark:text-teal-400 text-[10.5px] truncate">{loc}</span>
                    {Array.isArray(i.warehouse_details) && i.warehouse_details.length > 0 && (
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 overflow-hidden truncate">
                        {i.warehouse_details.map((wd, wIdx) => (
                          <span key={wd.warehouse_id || wIdx} className="inline-flex items-center gap-0.5">
                            <span>{wd.warehouse_name || wd.warehouse_code}:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{wd.quantity}</span>
                            {wIdx < i.warehouse_details.length - 1 && <span className="text-slate-400 mr-0.5">·</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>

                {/* 5. الرصيد المتوفر */}
                <td className="w-[95px] py-1.5 px-2 text-left truncate">
                  <span className="font-bold font-mono text-slate-900 dark:text-white text-xs tabular-nums dir-ltr">
                    {qty.toLocaleString('en-US', { minimumFractionDigits: unit === 'قطعة' ? 0 : 1, maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 mr-0.5">
                    {unit}
                  </span>
                </td>

                {/* 6. متوسط التكلفة */}
                <td className="w-[110px] py-1.5 px-2 text-left font-mono text-xs text-slate-800 dark:text-slate-200 tabular-nums dir-ltr truncate">
                  {displayCost > 0 ? displayCost.toLocaleString('en-US', { minimumFractionDigits: isBaseCurrency ? 0 : 2, maximumFractionDigits: 2 }) : '0.00'}
                </td>

                {/* 7. إجمالي القيمة */}
                <td className="w-[115px] py-1.5 px-2 text-left font-bold font-mono text-xs text-slate-900 dark:text-white tabular-nums dir-ltr truncate">
                  {displayTotal > 0 ? displayTotal.toLocaleString('en-US', { minimumFractionDigits: isBaseCurrency ? 0 : 2, maximumFractionDigits: 2 }) : '0.00'}
                </td>

                {/* 8. المورد */}
                <td className="w-[110px] py-1.5 px-2 text-right font-mono text-slate-500 dark:text-slate-400 text-[11px] truncate" title={supplier}>
                  {supplier}
                </td>

                {/* 9. الإجراءات السريعة - 3 أيقونات مدمجة متطابقة مع السندات */}
                <td className="w-[85px] py-1.5 px-2 text-center whitespace-nowrap sticky left-0 z-10 bg-white dark:bg-[#111C38] group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 border-r border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenMovements && onOpenMovements(i)}
                      className="w-5.5 h-5.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-md transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                      title="كارت الصنف وسجل الحركات التاريخية"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenTransfer && onOpenTransfer(i)}
                      className="w-5.5 h-5.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded-md transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                      title="مناقلة بين المستودعات والفروع"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenAdjust && onOpenAdjust(i)}
                      className="w-5.5 h-5.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-md transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                      title="تسوية فروقات جردية أو إهلاك تالف"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

window.InventoryTable = InventoryTable;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InventoryTable;
}
