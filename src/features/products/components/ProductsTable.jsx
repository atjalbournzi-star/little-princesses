// src/features/products/components/ProductsTable.jsx
// جدول استعراض الموديلات والفساتين التفصيلي مع التكاليف وهوامش الربح (Dark Mode Ready)

function ProductsTable({
  products = [],
  onEdit,
  onDelete,
  onShowQr,
  currencyLabel = "YER ﷼"
}) {
  const columns = [
    { key: 'sku', label: 'الكود / SKU', width: 'w-[110px]', align: 'text-right' },
    { key: 'image', label: 'الصورة', width: 'w-[48px]', align: 'text-center' },
    { key: 'name', label: 'اسم الموديل', width: 'w-auto', align: 'text-right' },
    { key: 'colors', label: 'الألوان المعتمدة', width: 'w-[160px]', align: 'text-center' },
    { key: 'collection', label: 'التشكيلة', width: 'w-[130px]', align: 'text-center' },
    { key: 'bom', label: 'الخامات (BOM)', width: 'w-[125px]', align: 'text-center' },
    { key: 'cost', label: `التكلفة (${(currencyLabel || 'YER').split(' ')[0]})`, width: 'w-[95px]', align: 'text-left' },
    { key: 'actions', label: 'إجراءات', width: 'w-[95px]', align: 'text-center' }
  ];

  if (!products || products.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-slate-700 dark:text-white text-xs font-semibold select-none">
        <svg className="w-7 h-7 text-slate-400 dark:text-slate-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span>لا توجد موديلات مسجلة تطابق معايير البحث والتصفية</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto custom-scrollbar rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 select-none">
      <table className="w-full min-w-[960px] table-fixed text-right border-collapse">
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
          {products.map(p => {
            const cleanName = (p.name || '').replace(/\[.*?\]/g, '').trim() || p.name || 'موديل راقي';
            const pImage = p.image_url || p.image || p.image_data || '';
            const pColors = Array.isArray(p.colors) && p.colors.length ? p.colors : (Array.isArray(p.approved_colors) ? p.approved_colors : []);
            const costVal = parseFloat(p.total_cost || p.cost_price || p.fabric_cost) || 0;
            const formattedCost = costVal.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2
            });

            return (
              <tr
                key={p.id}
                onClick={() => onEdit && onEdit(p)}
                title="انقر لتعديل مواصفات الموديل (BOM)"
                className="h-8 border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[11px] font-medium transition-colors cursor-pointer"
              >
                {/* 1. الكود / SKU */}
                <td className="w-[110px] py-1.5 px-2 text-right truncate overflow-hidden whitespace-nowrap select-all" dir="ltr" title={p.sku || p.code || `LP-${p.id}`}>
                  <span className="font-mono text-slate-600 dark:text-slate-400 font-medium text-[11px] block truncate">
                    {p.sku || p.code || `LP-${String(p.id).padStart(4, '0')}`}
                  </span>
                </td>

                {/* 2. الصورة المصغرة */}
                <td className="w-[48px] py-1 px-1 text-center whitespace-nowrap">
                  <div className="w-6.5 h-6.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700/80 flex items-center justify-center text-slate-400 mx-auto overflow-hidden">
                    {pImage ? (
                      <img src={pImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    )}
                  </div>
                </td>

                {/* 3. اسم الموديل - ساطع وأبيض واضح */}
                <td className="w-auto py-1.5 px-2 text-right truncate overflow-hidden whitespace-nowrap" title={cleanName}>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-[11px] block truncate">
                    {cleanName}
                  </span>
                </td>

                {/* 4. الألوان المعتمدة - شارات متناسقة مع ألوان السندات */}
                <td className="w-[160px] py-1.5 px-1.5 text-center truncate overflow-hidden whitespace-nowrap">
                  {pColors.length > 0 ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60 whitespace-nowrap" title={pColors.join('، ')}>
                      <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4 8.014 8.014 0 014.288-7.07 7.974 7.974 0 015.656-1.92c4.418 0 8 3.582 8 8a4 4 0 01-4 4h-2a2 2 0 00-2 2 2 2 0 01-2 2H7z" /></svg>
                      <span>{pColors.slice(0, 2).join('، ')}{pColors.length > 2 ? ` (+${pColors.length - 2})` : ''}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 text-[10px]">—</span>
                  )}
                </td>

                {/* 5. التشكيلة - شارة عنبرية بدون اقتطاع */}
                <td className="w-[130px] py-1.5 px-1.5 text-center truncate overflow-hidden whitespace-nowrap">
                  {p.collection ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 whitespace-nowrap">
                      <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                      <span>{p.collection}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 text-[10px]">—</span>
                  )}
                </td>

                {/* 6. الخامات (BOM) - شارة نيلية بدون اقتطاع */}
                <td className="w-[125px] py-1.5 px-1.5 text-center truncate overflow-hidden whitespace-nowrap">
                  {Array.isArray(p.bom) && p.bom.length > 0 ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 whitespace-nowrap">
                      <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      <span>{p.bom.length} خامات</span>
                    </span>
                  ) : p.fabric_name ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 whitespace-nowrap" title={p.fabric_name}>
                      <span>{p.fabric_name}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] font-medium">تفصيل حر</span>
                  )}
                </td>

                {/* 7. التكلفة - أبيض ناصع tabular-nums مطابق للسندات */}
                <td className="w-[95px] py-1.5 px-2 text-left truncate overflow-hidden whitespace-nowrap dir-ltr">
                  <span className="font-mono font-bold text-xs tabular-nums block truncate text-slate-900 dark:text-white">
                    {formattedCost}
                  </span>
                </td>

                {/* 8. إجراءات - 3 أزرار مصغرة هندسية مطابقة للسندات تماماً */}
                <td className="w-[95px] py-1.5 px-2 text-center whitespace-nowrap overflow-hidden">
                  <div className="flex items-center justify-center gap-1.5">
                    {/* 1. تعديل */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEdit && onEdit(p); }}
                      title="تعديل مواصفات الموديل (BOM)"
                      className="w-5.5 h-5.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60 rounded transition cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>

                    {/* 2. تكت / QR */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onShowQr && onShowQr(p); }}
                      title="عرض وطباعة بطاقة وتكت الفستان"
                      className="w-5.5 h-5.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded transition cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                    </button>

                    {/* 3. حذف */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDelete && onDelete(p.id); }}
                      title="حذف الموديل"
                      className="w-5.5 h-5.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded transition cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

window.ProductsTable = ProductsTable;
window.BOMTable = ProductsTable;
