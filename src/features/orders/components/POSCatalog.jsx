// src/features/orders/components/POSCatalog.jsx
// منطقة استعراض الكتالوج والبحث وقارئ الباركود لشاشة نقاط البيع

function POSCatalog({
  products = [],
  cart = [],
  onOpenPicker,
  onOpenHangtag,
  currencyDisplay = "YER ريال",
  posCategory = 'الكل',
  setPosCategory,
  posSearch = '',
  setPosSearch,
  barcodeInput = '',
  setBarcodeInput,
  handleBarcodeSubmit,
  barcodeInputRef,
  posCategories = [],
  onOpenNewOrder
}) {
  const currCode = typeof currencyDisplay === 'string'
    ? currencyDisplay.split(' ')[0]
    : (currencyDisplay?.code || currencyDisplay?.display?.split(' ')[0] || 'YER');

  const dynamicCategories = React.useMemo(() => {
    const srcList = (posCategories && posCategories.length > 0)
      ? posCategories
      : (products || []).filter(p => p && typeof p === 'object').map(p => p.category || p.classification);
    const cleanCats = srcList
      .filter(c => c && typeof c === 'string' && !c.includes('???') && c !== 'الكل')
      .map(c => c.trim())
      .filter(Boolean);
    return ['الكل', ...Array.from(new Set(cleanCats))];
  }, [posCategories, products]);

  const filteredProducts = React.useMemo(() => {
    return (products || [])
      .filter(p => p && typeof p === 'object')
      .filter(p => {
        const pCat = p.category || p.classification || '';
        const matchCat = !posCategory || posCategory === 'الكل' || pCat === posCategory;
        const s = (posSearch || '').toLowerCase().trim();
        const varMatch = (p.variants || []).some(v =>
          (v.sku || '').toLowerCase().includes(s) ||
          (v.barcode || '').toLowerCase().includes(s) ||
          (v.age_size || '').toLowerCase().includes(s) ||
          (v.color_name || '').toLowerCase().includes(s)
        );
        return matchCat && (!s || (p.name || '').toLowerCase().includes(s) || (p.style_code || '').toLowerCase().includes(s) || (p.season_collection || '').toLowerCase().includes(s) || varMatch);
      });
  }, [products, posCategory, posSearch]);

  return (
    <div className="w-full h-full flex flex-col min-w-0 overflow-hidden bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-xs transition-colors">
      {/* 1. Search & Category Row (Fixed, No Scroll) */}
      <div className="shrink-0 space-y-1 mb-1.5">
        <div className="h-8 px-2 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
          <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-1 flex-1">
            <div className="relative flex-1">
              <input
                ref={barcodeInputRef} type="text" value={barcodeInput}
                placeholder="امسح الباركود أو أدخل SKU..."
                onChange={e => setBarcodeInput && setBarcodeInput(e.target.value)}
                className="w-full h-6 text-[11px] bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white pr-6 pl-2 outline-none focus:border-pink-500 font-medium transition shadow-2xs"
              />
              <svg className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-pink-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 11h.01M7 15h.01M11 7h.01M11 11h.01M11 15h.01M15 7h.01M15 11h.01M15 15h.01M19 7h.01M19 11h.01M19 15h.01" />
              </svg>
            </div>
            <button type="submit" className="h-6 px-2.5 bg-pink-600 hover:bg-pink-700 active:scale-95 text-white text-[10.5px] font-bold rounded-md cursor-pointer transition shadow-xs flex items-center gap-0.5 shrink-0" title="إضافة الصنف">
              <span>+</span>
              <span>إضافة</span>
            </button>
          </form>

          <div className="relative w-40 sm:w-48 shrink-0">
            <input
              type="text" value={posSearch}
              placeholder="بحث بالاسم، الموسم، الموديل..."
              onChange={e => setPosSearch && setPosSearch(e.target.value)}
              className="w-full h-6 text-[11px] bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white pr-6 pl-6 outline-none focus:border-pink-500 font-medium transition shadow-2xs"
            />
            <svg className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {posSearch && (
              <button type="button" onClick={() => setPosSearch && setPosSearch('')} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white text-[10px] cursor-pointer font-bold">✕</button>
            )}
          </div>
          {onOpenNewOrder && (
            <button type="button" onClick={onOpenNewOrder} className="h-6 px-2.5 bg-[#B0005A] hover:bg-[#8E0049] active:scale-95 text-white text-[10.5px] font-bold rounded-md cursor-pointer transition shadow-xs shrink-0 whitespace-nowrap">
              + طلب تفصيل جديد (4 حالات)
            </button>
          )}
        </div>

        {/* Category tabs: strictly single-line horizontal scroll with elegant pill shapes */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
          {dynamicCategories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setPosCategory && setPosCategory(cat)}
              className={`h-6 px-2.5 rounded-full text-[10.5px] font-medium whitespace-nowrap cursor-pointer transition-all duration-150 active:scale-[0.98] hover:-translate-y-0.5 flex items-center gap-1 ${
                posCategory === cat
                  ? 'bg-pink-600 text-white font-bold shadow-xs ring-1 ring-pink-500/30'
                  : 'bg-slate-100 dark:bg-[#0F172A] text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-300/80 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 shadow-2xs'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Product Cards Grid (3:4 Vertical Portrait Aspect Ratio) */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 content-start auto-rows-max pb-2">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-semibold py-16 select-none">
            <span className="text-2xl mb-1 opacity-70">👗</span>
            <span>لا توجد موديلات مطابقة في هذا التصنيف</span>
          </div>
        ) : (
          filteredProducts.map(prod => {
            if (!prod) return null;
            const prodId = prod.id || prod.inventory_id;
            const price = parseFloat(prod.selling_price || prod.sell_price || prod.base_price || 0) || 0;
            const variants = Array.isArray(prod.variants) ? prod.variants : [];
            const inCartQty = (cart || []).filter(i => i && (i.inventory_id === prodId || i.product_id === prodId)).reduce((s, i) => s + (i.qty || 1), 0);
            const modelTitle = prod.name || prod.model_name || 'فستان ملكي راقي';

            return (
              <div
                key={prodId || prod.name}
                onClick={() => onOpenPicker && onOpenPicker(prod)}
                className="h-fit p-2 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700/80 hover:border-pink-500/70 dark:hover:border-pink-500/70 rounded-xl flex flex-col justify-start transition-all duration-150 active:scale-[0.98] hover:-translate-y-0.5 relative group cursor-pointer shadow-xs hover:shadow-md select-none"
              >
                {inCartQty > 0 && (
                  <div className="absolute top-2.5 left-2.5 bg-pink-600 text-white text-[9.5px] font-mono font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center z-10 shadow-xs ring-1.5 ring-white dark:ring-slate-900">
                    {inCartQty}
                  </div>
                )}

                {onOpenHangtag && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpenHangtag(prod); }}
                    className="absolute top-2.5 right-2.5 z-10 h-5 px-1.5 rounded bg-black/55 hover:bg-pink-600 text-white text-[9px] font-bold backdrop-blur-xs cursor-pointer transition"
                    title="طباعة ليبل الباركود والسعر (50×30mm)"
                  >
                    🏷️
                  </button>
                )}

                <div className="w-full aspect-[3/4] rounded-md bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 overflow-hidden relative flex items-center justify-center shrink-0">
                  {prod.image_url ? (
                    <img src={prod.image_url} alt={modelTitle} className="w-full h-full object-cover object-top rounded-md group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-pink-50/50 to-slate-100/50 dark:from-slate-900 dark:to-[#0F172A] p-2 text-slate-400 dark:text-slate-500 group-hover:text-pink-500 transition-colors">
                      <span className="text-2xl mb-1">👗</span>
                      <span className="text-[9px] font-medium opacity-75">فستان أميرات جاهز</span>
                    </div>
                  )}

                  {(prod.style_code || prod.season_collection) && (
                    <div className="absolute bottom-1 right-1 left-1 flex items-center justify-between gap-1 pointer-events-none">
                      {prod.style_code && (
                        <span dir="ltr" className="bg-black/65 backdrop-blur-xs text-[8.5px] font-mono text-slate-100 px-1.5 py-0.2 rounded border border-white/10 font-bold truncate">
                          {prod.style_code}
                        </span>
                      )}
                      {prod.season_collection && (
                        <span className="bg-pink-700/85 backdrop-blur-xs text-[8.5px] text-white px-1.5 py-0.2 rounded font-bold truncate">
                          {prod.season_collection}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <h4 className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 truncate text-right mt-2 px-0.5 leading-snug" title={modelTitle}>
                  {modelTitle}
                </h4>

                {variants.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5 px-0.5">
                    {variants.slice(0, 6).map(v => {
                      const isOut = (parseFloat(v.stock_qty) || 0) <= 0;
                      return (
                        <span key={v.id} title={isOut ? `${v.age_size}: نفد` : `${v.age_size}: متوفر ${v.stock_qty}`}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${isOut ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 line-through opacity-55' : 'bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800/60'}`}>
                          {v.age_size}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="h-6.5 px-2 bg-slate-50 dark:bg-[#111C38] border border-slate-200/90 dark:border-slate-700/70 rounded-lg text-slate-800 dark:text-white flex items-center justify-between mt-1.5 shrink-0">
                  <span dir="ltr" className="font-mono font-bold text-[11px] text-slate-900 dark:text-white tabular-nums">
                    {price.toLocaleString('en-US')} <span className="text-[9.5px] text-pink-600 dark:text-pink-400 font-sans font-bold ml-0.5">{currCode}</span>
                  </span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); onOpenPicker && onOpenPicker(prod); }} title="اختيار المقاس واللون"
                    className="h-5 px-2 flex items-center justify-center rounded-md bg-pink-600 hover:bg-pink-700 active:scale-95 text-white font-bold text-[10px] cursor-pointer transition shadow-2xs gap-0.5">
                    <span>اختيار المقاس</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

window.POSCatalog = POSCatalog;
