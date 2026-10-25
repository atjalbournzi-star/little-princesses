// src/features/orders/components/POSCatalog.jsx
// منطقة استعراض الكتالوج والبحث وقارئ الباركود لشاشة نقاط البيع

function POSCatalog({
  products = [],
  cart = [],
  addToCart,
  currencyDisplay = "YER ريال",
  posCategory = 'الكل',
  setPosCategory,
  posSearch = '',
  setPosSearch,
  barcodeInput = '',
  setBarcodeInput,
  handleBarcodeSubmit,
  barcodeInputRef,
  posCategories = []
}) {
  const currCode = typeof currencyDisplay === 'string'
    ? currencyDisplay.split(' ')[0]
    : (currencyDisplay?.code || currencyDisplay?.display?.split(' ')[0] || 'YER');

  const dynamicCategories = React.useMemo(() => {
    if (posCategories && posCategories.length > 0) return posCategories;
    const cats = (products || [])
      .filter(p => p && typeof p === 'object')
      .map(p => p.category || p.classification)
      .filter(Boolean);
    return ['الكل', ...Array.from(new Set(cats))];
  }, [posCategories, products]);

  const filteredProducts = React.useMemo(() => {
    return (products || [])
      .filter(p => p && typeof p === 'object')
      .filter(p => {
        const pCat = p.category || p.classification || '';
        const matchCat = !posCategory || posCategory === 'الكل' || pCat === posCategory;
        const s = (posSearch || '').toLowerCase().trim();
        return matchCat && (!s || (p.name || '').toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s) || (p.barcode || '').toLowerCase().includes(s));
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
                onChange={e => setBarcodeInput && setBarcodeInput(e.target.value)}
                placeholder="امسح بالباركود أو اكتب الرمز..."
                className="w-full h-6 text-[11px] bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 pr-6 pl-2 outline-none focus:border-pink-500 font-medium transition shadow-2xs"
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

          <div className="relative w-44 sm:w-56 shrink-0">
            <input
              type="text" value={posSearch}
              onChange={e => setPosSearch && setPosSearch(e.target.value)}
              placeholder="بحث في الموديلات..."
              className="w-full h-6 text-[11px] bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 pr-6 pl-6 outline-none focus:border-pink-500 font-medium transition shadow-2xs"
            />
            <svg className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {posSearch && (
              <button type="button" onClick={() => setPosSearch && setPosSearch('')} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white text-[10px] cursor-pointer font-bold">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category tabs: strictly single-line horizontal scroll with elegant pill shapes */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
          {dynamicCategories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setPosCategory && setPosCategory(cat)}
              className={`h-6 px-2.5 rounded-full text-[10.5px] font-medium whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${
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
            const prodId = prod.id || prod.product_id;
            const price = parseFloat(prod.sell_price || prod.base_price || 0) || 0;
            const inCart = (cart || []).find(i => i && ((prodId && i.product_id === prodId) || i.product_name === prod.name));
            const modelTitle = prod.name || prod.model_name || 'فستان ملكي راقي';

            return (
              <div
                key={prodId || prod.name}
                onClick={() => addToCart && addToCart(prod)}
                className="h-fit p-2 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700/80 hover:border-pink-500/70 dark:hover:border-pink-500/70 rounded-xl flex flex-col justify-start transition-all duration-200 relative group cursor-pointer shadow-xs hover:shadow-md select-none"
              >
                {/* Cart Quantity Badge (Top-Left) */}
                {inCart && (
                  <div className="absolute top-2.5 left-2.5 bg-pink-600 text-white text-[9.5px] font-mono font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center z-10 shadow-xs ring-1.5 ring-white dark:ring-slate-900">
                    {inCart.qty}
                  </div>
                )}

                {/* 3:4 Vertical Portrait Image Container for Dress */}
                <div className="w-full aspect-[3/4] rounded-md bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 overflow-hidden relative flex items-center justify-center shrink-0">
                  {prod.image_url ? (
                    <img
                      src={prod.image_url}
                      alt={modelTitle}
                      className="w-full h-full object-cover object-top rounded-md group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-pink-50/50 to-slate-100/50 dark:from-slate-900 dark:to-[#0F172A] p-2 text-slate-400 dark:text-slate-500 group-hover:text-pink-500 transition-colors">
                      <div className="relative flex flex-col items-center mb-1">
                        <span className="text-xs -mb-0.5 opacity-85">👑</span>
                        <svg className="w-7 h-7 stroke-current fill-pink-500/10 dark:fill-pink-500/5" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a2.5 2.5 0 0 0-2.5 2.5c0 .7.3 1.3.8 1.8L2 14v1a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1l-8.3-7.7a2.5 2.5 0 0 0 .8-1.8A2.5 2.5 0 0 0 12 2z"/>
                        </svg>
                      </div>
                      <span className="text-[9px] font-medium opacity-75">فستان أميرات ملكي</span>
                    </div>
                  )}

                  {/* SKU Pill (Bottom-Right of Image) */}
                  {prod.sku && (
                    <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-xs text-[8.5px] font-mono text-slate-200 px-1 py-0.2 rounded border border-white/10 font-bold">
                      {prod.sku}
                    </span>
                  )}
                </div>

                {/* Model Title */}
                <h4 className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 truncate text-right mt-2 px-0.5 leading-snug" title={modelTitle}>
                  {modelTitle}
                </h4>

                {/* Price & Quick Add Button Strip */}
                <div className="h-6.5 px-2 bg-slate-50 dark:bg-[#111C38] border border-slate-200/90 dark:border-slate-700/70 rounded-lg text-slate-800 dark:text-white flex items-center justify-between mt-1.5 shrink-0">
                  <span className="font-mono font-bold text-[11px] text-slate-900 dark:text-white tabular-nums">
                    {price.toLocaleString()} <span className="text-[9.5px] text-pink-600 dark:text-pink-400 font-sans font-bold mr-0.5">{currCode}</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); addToCart && addToCart(prod); }}
                    className="h-5 px-2 flex items-center justify-center rounded-md bg-pink-600 hover:bg-pink-700 active:scale-95 text-white font-bold text-[10px] cursor-pointer transition shadow-2xs gap-0.5"
                    title="إضافة للسلة"
                  >
                    <span>+</span>
                    <span>إضافة</span>
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
