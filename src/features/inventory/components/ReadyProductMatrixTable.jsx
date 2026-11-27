// src/features/inventory/components/ReadyProductMatrixTable.jsx
// جدول مصفوفة الأعمار والألوان السريع لإدخال المقاسات والكميات والأسعار وتوليد الباركود

function ReadyProductMatrixTable({
  variants = [],
  onUpdateRow,
  onRemoveRow,
  styleCodePreview = 'LP-RD-NEW',
  currencyCode = 'YER'
}) {
  if (!variants || variants.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
        اختر عمراً أو أكثر من الشريط أعلاه لبناء مصفوفة المقاسات والباركود التلقائي
      </div>
    );
  }

  const cellInp = "w-full h-7 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-[11px] font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-pink-500";

  return (
    <div className="overflow-x-auto custom-scrollbar rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A]">
      <table className="w-full min-w-[680px] text-right border-collapse text-[11px]">
        <thead className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
          <tr className="h-7">
            <th className="px-2 py-1">المقاس / العمر</th>
            <th className="px-2 py-1">اللون</th>
            <th className="px-2 py-1 w-20">الكمية</th>
            <th className="px-2 py-1 w-24">التكلفة ({currencyCode})</th>
            <th className="px-2 py-1 w-24">سعر البيع ({currencyCode})</th>
            <th className="px-2 py-1 w-20">حد التنبيه</th>
            <th className="px-2 py-1">SKU / باركود تلقائي</th>
            <th className="px-2 py-1 w-10 text-center">حذف</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {variants.map((v, idx) => (
            <tr key={v._key || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
              <td className="px-2 py-1.5 font-bold text-pink-700 dark:text-pink-300 whitespace-nowrap">
                <input
                  type="text"
                  value={v.age_size}
                  onChange={e => onUpdateRow(idx, 'age_size', e.target.value)}
                  className="w-24 h-7 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-[11px] font-bold text-pink-700 dark:text-pink-300 outline-none focus:border-pink-500"
                />
              </td>
              <td className="px-2 py-1.5">
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    value={v.color_hex || '#D00070'}
                    onChange={e => onUpdateRow(idx, 'color_hex', e.target.value)}
                    className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 cursor-pointer bg-transparent p-0 shrink-0"
                    title="لون الفستان"
                  />
                  <input
                    type="text"
                    value={v.color_name || ''}
                    placeholder="موف / وردي"
                    onChange={e => onUpdateRow(idx, 'color_name', e.target.value)}
                    className="w-20 h-7 px-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-[11px] text-slate-900 dark:text-white outline-none focus:border-pink-500"
                  />
                </div>
              </td>
              <td className="px-2 py-1.5">
                <input
                  type="number"
                  min="0"
                  step="1"
                  dir="ltr"
                  value={v.stock_qty}
                  onChange={e => onUpdateRow(idx, 'stock_qty', e.target.value)}
                  className={cellInp + " text-center tabular-nums"}
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  dir="ltr"
                  value={v.cost_price}
                  onChange={e => onUpdateRow(idx, 'cost_price', e.target.value)}
                  className={cellInp + " text-left tabular-nums"}
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  dir="ltr"
                  value={v.selling_price}
                  onChange={e => onUpdateRow(idx, 'selling_price', e.target.value)}
                  className={cellInp + " text-left tabular-nums text-emerald-700 dark:text-emerald-400"}
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  type="number"
                  min="0"
                  step="1"
                  dir="ltr"
                  value={v.min_stock}
                  onChange={e => onUpdateRow(idx, 'min_stock', e.target.value)}
                  className={cellInp + " text-center tabular-nums"}
                />
              </td>
              <td className="px-2 py-1.5 font-mono text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap" dir="ltr">
                {v.sku || `${styleCodePreview}-${idx + 1}`} · {v.barcode || 'تلقائي'}
              </td>
              <td className="px-2 py-1.5 text-center">
                <button
                  type="button"
                  onClick={() => onRemoveRow(idx)}
                  className="w-6 h-6 rounded-md bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold cursor-pointer"
                  title="إزالة السطر"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

window.ReadyProductMatrixTable = ReadyProductMatrixTable;
