// src/features/orders/components/POSVariantPicker.jsx
// منتقي المقاس واللون الفاخر لشاشة نقاط البيع مع عرض الرصيد الحي وزر طباعة الليبل

function POSVariantPicker({
  product,
  isOpen,
  onClose,
  onSelectVariant,
  onOpenHangtag,
  currCode = 'YER'
}) {
  if (!isOpen || !product) return null;

  const variants = Array.isArray(product.variants) ? product.variants : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn" dir="rtl" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 bg-gradient-to-l from-pink-700 via-rose-700 to-purple-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-14 rounded-lg bg-white/10 overflow-hidden border border-white/20 shrink-0 flex items-center justify-center">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover object-top" />
              ) : (
                <span className="text-xl">👗</span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold truncate">{product.name}</h3>
              <div className="flex items-center gap-2 text-[10.5px] text-pink-100 mt-0.5">
                {product.style_code && <span dir="ltr" className="font-mono bg-black/25 px-1.5 py-0.2 rounded">{product.style_code}</span>}
                {product.season_collection && <span>✨ {product.season_collection}</span>}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-sm cursor-pointer">✕</button>
        </div>

        <div className="p-4 max-h-[65vh] overflow-y-auto custom-scrollbar space-y-2.5">
          {variants.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">لا توجد مقاسات مسجلة لهذا الموديل</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {variants.map(v => {
                const avail = parseFloat(v.stock_qty || 0);
                const isOut = avail <= 0;
                const price = parseFloat(v.selling_price || product.selling_price || 0) || 0;

                return (
                  <div
                    key={v.id}
                    onClick={() => !isOut && onSelectVariant && onSelectVariant(product, v)}
                    className={`p-3 rounded-xl border transition flex items-center justify-between gap-2 ${
                      isOut
                        ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-50 cursor-not-allowed'
                        : 'bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-700 hover:border-pink-500 hover:shadow-sm cursor-pointer'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">{v.age_size}</span>
                        {v.color_name && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                            <span className="w-2.5 h-2.5 rounded-full border border-black/15" style={{ backgroundColor: v.color_hex || '#D00070' }} />
                            <span>{v.color_name}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400" dir="ltr">
                        {v.sku} · {v.barcode}
                      </div>
                      <div className="flex items-center gap-2 text-[10.5px]">
                        <span className={`font-bold px-1.5 py-0.2 rounded ${isOut ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                          {isOut ? 'نفد (0)' : `متوفر: ${avail}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span dir="ltr" className="font-mono font-black text-xs text-pink-600 dark:text-pink-400 tabular-nums">
                        {price.toLocaleString('en-US')} {currCode}
                      </span>
                      <div className="flex items-center gap-1">
                        {onOpenHangtag && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onOpenHangtag(product, v); }}
                            className="h-6 px-2 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold cursor-pointer"
                            title="طباعة ليبل الباركود والسعر"
                          >
                            🏷️
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isOut}
                          onClick={(e) => { e.stopPropagation(); !isOut && onSelectVariant && onSelectVariant(product, v); }}
                          className={`h-6 px-2.5 rounded-md text-[10.5px] font-bold transition ${
                            isOut ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-700 text-white cursor-pointer'
                          }`}
                        >
                          + للسلة
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

window.POSVariantPicker = POSVariantPicker;
