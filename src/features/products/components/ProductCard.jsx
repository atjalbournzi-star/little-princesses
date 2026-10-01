// src/features/products/components/ProductCard.jsx
// بطاقة العرض البصري الجذابة للموديل (Grid View Card - Dark Mode Ready)

function ProductCard({
  product,
  onEdit,
  onDelete,
  onShowQr,
  currencyLabel = "YER ﷼"
}) {
  const p = product || {};
  const curr = p.currency || currencyLabel;
  const seg = p.target_segment || 'kids';
  const segLabel = seg === 'women_adults' ? '👗 نسائي وكبار' : (seg === 'custom_free' ? '✂️ تفصيل حر' : '👧 أطفال');

  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#E8E5EA] dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-[#E5CEE7] dark:hover:border-purple-800/50 transition-all flex flex-col justify-between overflow-hidden group">
      {/* رأس البطاقة والشارات */}
      <div className="p-5 border-b border-[#E8E5EA] dark:border-slate-800 bg-gradient-to-b from-[#FAFAFB] to-white dark:from-slate-900 dark:to-[#0f172a]">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-xs font-bold text-[#8F2A87] dark:text-purple-300 bg-[#F2E7F3] dark:bg-purple-950/50 px-2 py-0.5 rounded-lg border border-[#E5CEE7] dark:border-purple-800/40">
              #{p.id}
            </span>
            {p.sku && (
              <span className="font-mono text-[10.5px] text-[#6F6B75] dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                {p.sku}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            <span className="bg-[#F2E7F3] dark:bg-purple-950/40 text-[#8F2A87] dark:text-purple-300 border border-[#E5CEE7] dark:border-purple-800/40 px-2 py-0.5 rounded-md text-[10px] font-bold">
              {segLabel}
            </span>
            {p.collection && (
              <span className="bg-[#FEF6EE] dark:bg-amber-950/40 text-[#B54708] dark:text-amber-300 border border-[#F9DBAF] dark:border-amber-800/40 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                🏷️ {p.collection}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#F2E7F3] dark:bg-purple-950/40 border border-[#E5CEE7] dark:border-purple-800/40 flex items-center justify-center text-xl shrink-0 overflow-hidden shadow-2xs">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <span>👗</span>
            )}
          </div>
          <div className="overflow-hidden">
            <h3 className="text-sm font-bold text-[#25232A] dark:text-slate-100 truncate" title={p.name}>
              {p.name}
            </h3>
            <span className="text-[11px] font-semibold text-[#8F2A87] dark:text-purple-300 inline-block mt-0.5">
              {p.category || 'تصنيف عام'}
            </span>
          </div>
        </div>
      </div>

      {/* تفاصيل القماش ومقاييس التكلفة والتسعير */}
      <div className="p-5 space-y-3 flex-1 text-xs">
        {/* ملخص الأقمشة */}
        <div className="bg-[#FAFAFB] dark:bg-slate-900/60 p-2.5 rounded-xl border border-[#E8E5EA] dark:border-slate-800 space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[#6F6B75] dark:text-slate-400 font-medium">🧵 القماش:</span>
            <span className="font-mono font-bold text-[#25232A] dark:text-slate-200">
              {(parseFloat(p.yards_used) || 0).toFixed(1)} م
            </span>
          </div>
          <p className="text-[11px] text-[#25232A] dark:text-slate-300 truncate" title={p.fabric_name}>
            {p.fabric_name || 'لم يحدد قماش'}
          </p>
        </div>

        {/* شبكة الأسعار والأرباح */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-[#6F6B75] dark:text-slate-400 block">التكلفة</span>
            <span className="font-bold font-mono text-[#25232A] dark:text-slate-100 block mt-0.5 text-[11.5px]">
              {(parseFloat(p.total_cost || p.cost_price) || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })}
            </span>
          </div>
          <div className="bg-[#E2F5F7] dark:bg-cyan-950/40 p-2 rounded-xl border border-[#C5ECF0] dark:border-cyan-800/40">
            <span className="text-[10px] text-[#007F8C] dark:text-cyan-300 block font-semibold">سعر البيع</span>
            <span className="font-bold font-mono text-[#007F8C] dark:text-cyan-300 block mt-0.5 text-[11.5px]">
              {(parseFloat(p.sell_price || p.base_price) || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })}
            </span>
          </div>
          <div className="bg-[#F2E7F3] dark:bg-purple-950/40 p-2 rounded-xl border border-[#E5CEE7] dark:border-purple-800/40">
            <span className="text-[10px] text-[#8F2A87] dark:text-purple-300 block font-semibold">الربح</span>
            <span className="font-bold font-mono text-[#8F2A87] dark:text-purple-300 block mt-0.5 text-[11.5px]">
              +{(parseFloat(p.profit) || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })}
            </span>
          </div>
        </div>

        {p.barcode && (
          <div className="text-[10.5px] font-mono text-[#6F6B75] dark:text-slate-400 flex items-center justify-between border-t border-[#E8E5EA] dark:border-slate-800 pt-2">
            <span>الباركود:</span>
            <span className="font-bold text-[#25232A] dark:text-slate-200">{p.barcode}</span>
          </div>
        )}
      </div>

      {/* أزرار الإجراءات */}
      <div className="p-3 bg-[#FAFAFB] dark:bg-slate-900/60 border-t border-[#E8E5EA] dark:border-slate-800 flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={() => onShowQr && onShowQr(p)}
          className="h-8 px-2.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-[#F2E7F3] dark:hover:bg-purple-950/50 text-[#8F2A87] dark:text-purple-300 border border-[#E8E5EA] dark:border-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
          title="عرض وطباعة رمز QR وتكت الفستان"
        >
          <span>🏷️</span>
          <span>QR / تكت</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(p)}
            className="h-8 px-2.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-[#F2E7F3] dark:hover:bg-purple-950/50 text-[#8F2A87] dark:text-purple-300 border border-[#E8E5EA] dark:border-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <span>✏️</span>
            <span>تعديل</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(p.id)}
            className="h-8 px-2.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-[#D64545] dark:text-rose-400 border border-[#E8E5EA] dark:border-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <span>🗑️</span>
            <span>حذف</span>
          </button>
        </div>
      </div>
    </div>
  );
}

window.ProductCard = ProductCard;
