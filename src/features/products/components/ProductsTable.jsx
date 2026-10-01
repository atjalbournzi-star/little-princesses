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
    { key: 'sku', label: 'الكود / SKU', width: 'w-[22%]', align: 'text-right' },
    { key: 'image', label: 'الصورة', width: 'w-[5%]', align: 'text-center' },
    { key: 'name', label: 'اسم الموديل', width: 'w-[21%]', align: 'text-right' },
    { key: 'collection', label: 'التشكيلة', width: 'w-[11%]', align: 'text-center' },
    { key: 'category', label: 'التصنيف', width: 'w-[15%]', align: 'text-center' },
    { key: 'bom', label: 'الخامات (BOM)', width: 'w-[10%]', align: 'text-center' },
    { key: 'yards', label: 'الأمتار', width: 'w-[8%]', align: 'text-center' },
    { key: 'fabric', label: 'القماش', width: 'w-[8%]', align: 'text-center' }
  ];

  if (!products || products.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#111C38] rounded-xl border border-slate-800 p-8 text-slate-400 text-xs font-semibold select-none">
        <span className="text-2xl mb-1">👗</span>
        <span>لا توجد موديلات تطابق معايير البحث والتصفية</span>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar border border-slate-800 rounded-xl bg-[#111C38]/90 select-none">
      <table className="w-full table-fixed text-right border-collapse">
        <thead className="sticky top-0 z-20 bg-[#0F172A] border-b border-slate-800 shadow-xs">
          <tr className="h-6">
            {columns.map(c => (
              <th
                key={c.key}
                className={`h-6 py-0.5 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap ${c.width} ${c.align}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {products.map(p => {
            const seg = p.target_segment || 'kids';
            const segLabel = seg === 'women_adults' ? '👗 نسائي' : (seg === 'custom_free' ? '✂️ تفصيل' : '👧 أطفال');
            const cleanName = (p.name || '').replace(/\[.*?\]/g, '').trim() || p.name || 'موديل راقي';

            return (
              <tr
                key={p.id}
                onClick={() => onEdit && onEdit(p)}
                title="انقر لتعديل مواصفات الموديل (BOM)"
                className="h-7.5 max-h-7.5 border-b border-slate-800/60 hover:bg-slate-800/30 text-[11px] font-medium text-white transition-colors group cursor-pointer"
              >
                {/* 1. الكود / SKU (22%) */}
                <td className="w-[22%] py-0.5 px-2 font-mono text-[10.5px] font-medium text-slate-300 tracking-tight whitespace-nowrap truncate">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10.5px] font-medium text-slate-300 tracking-tight truncate select-all" title={p.sku || p.code || `LP-${p.id}`}>
                      {p.sku || p.code || `LP-${String(p.id).padStart(4, '0')}`}
                    </span>
                    <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onShowQr && onShowQr(p); }}
                        className="w-4.5 h-4.5 rounded bg-slate-800 hover:bg-purple-950 text-slate-300 hover:text-purple-300 flex items-center justify-center text-[9px] cursor-pointer"
                        title="تكت QR"
                      >
                        🏷️
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDelete && onDelete(p.id); }}
                        className="w-4.5 h-4.5 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 flex items-center justify-center text-[9px] cursor-pointer"
                        title="حذف"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </td>

                {/* 2. الصورة (5%) */}
                <td className="w-[5%] py-0.5 px-1 text-center whitespace-nowrap">
                  <div className="w-7 h-7 rounded-md bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-slate-400 group-hover:text-pink-400 mx-auto transition-colors overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a2.5 2.5 0 0 0-2.5 2.5c0 .7.3 1.3.8 1.8L2 14v1a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1l-8.3-7.7a2.5 2.5 0 0 0 .8-1.8A2.5 2.5 0 0 0 12 2z"/>
                      </svg>
                    )}
                  </div>
                </td>

                {/* 3. اسم الموديل (21%) */}
                <td className="w-[21%] py-0.5 px-2 text-right whitespace-nowrap truncate" title={cleanName}>
                  <span className="font-bold text-white text-[11.5px] leading-tight truncate block">
                    {cleanName}
                  </span>
                </td>

                {/* 4. التشكيلة (11%) */}
                <td className="w-[11%] py-0.5 px-1 text-center whitespace-nowrap truncate">
                  {p.collection ? (
                    <span className="bg-amber-950/40 text-amber-300 border border-amber-800/40 px-1.5 py-0.2 rounded text-[10px] font-medium inline-block truncate max-w-full">
                      🏷️ {p.collection}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[10px]">—</span>
                  )}
                </td>

                {/* 5. التصنيف (15%) */}
                <td className="w-[15%] py-0.5 px-1 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1 overflow-hidden">
                    <span className="text-[9.5px] px-1.5 py-0.5 rounded font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1 whitespace-nowrap truncate max-w-[105px]" title={p.category || 'عام'}>
                      {p.category || 'عام'}
                    </span>
                    <span className="text-[9.5px] px-1.5 py-0.5 rounded font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60 flex items-center gap-1 whitespace-nowrap shrink-0">
                      {segLabel}
                    </span>
                  </div>
                </td>

                {/* 6. الخامات BOM (10%) */}
                <td className="w-[10%] py-0.5 px-1 text-center font-bold text-[10px] whitespace-nowrap truncate">
                  {Array.isArray(p.bom) && p.bom.length > 0 ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-950/60 text-purple-200 border border-purple-800/40 font-bold inline-block">
                      🧵 {p.bom.length} خامات
                    </span>
                  ) : p.fabric_name ? (
                    <span className="text-[10px] text-cyan-300 font-bold truncate inline-block max-w-full" title={p.fabric_name}>
                      🧵 {p.fabric_name}
                    </span>
                  ) : (
                    <span className="text-[9.5px] text-slate-400">✂️ تفصيل</span>
                  )}
                </td>

                {/* 7. الأمتار (8%) */}
                <td className="w-[8%] py-0.5 px-1 text-center font-mono text-[11px] text-white font-bold whitespace-nowrap">
                  {(parseFloat(p.yards_used) || 0).toFixed(1)} م
                </td>

                {/* 8. القماش (8%) */}
                <td className="w-[8%] py-0.5 px-1 text-center font-mono text-[11px] text-white font-bold whitespace-nowrap">
                  {(parseFloat(p.fabric_cost) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
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
