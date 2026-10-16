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
  const currCode = (currencyDisplay || "YER").split(' ')[0];

  const dynamicCategories = React.useMemo(() => {
    if (posCategories && posCategories.length > 0) return posCategories;
    const cats = (products || []).map(p => p.category || p.classification).filter(Boolean);
    return ['الكل', ...Array.from(new Set(cats))];
  }, [posCategories, products]);

  const filteredProducts = React.useMemo(() => {
    return (products || []).filter(p => {
      const pCat = p.category || p.classification || '';
      const matchCat = !posCategory || posCategory === 'الكل' || pCat === posCategory;
      const s = (posSearch || '').toLowerCase().trim();
      return matchCat && (!s || (p.name || '').toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s) || (p.barcode || '').toLowerCase().includes(s));
    });
  }, [products, posCategory, posSearch]);

  return (
    <div className="w-full h-full flex flex-col min-w-0 overflow-hidden bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-xs transition-colors">
      {/* 1. Search & Category Row (Fixed, No Scroll) */}
      <div className="shrink-0 space-y-1.5 mb-1.5">
        <div className="h-8 px-2 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
          <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={e => setBarcodeInput && setBarcodeInput(e.target.value)}
              placeholder="امسح بالباركود أو اكتب الرمز..."
              className="w-full h-7 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white pr-7 pl-14 outline-none focus:border-pink-500 font-medium shadow-2xs transition-colors"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-pink-500 text-xs pointer-events-none">🏷️</span>
            <button
              type="submit"
              className="absolute left-1 top-1/2 -translate-y-1/2 h-5 px-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-[10px] font-bold rounded-md cursor-pointer transition shadow-2xs"
            >
              إضافة ↵
            </button>
          </form>

          <div className="relative w-44 sm:w-56 shrink-0">
            <input
              type="text"
              value={posSearch}
              onChange={e => setPosSearch && setPosSearch(e.target.value)}
              placeholder="بحث في الموديلات..."
              className="w-full h-7 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white pr-7 pl-6 outline-none focus:border-pink-500 font-medium shadow-2xs transition-colors"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">🔍</span>
            {posSearch && (
              <button
                type="button"
                onClick={() => setPosSearch && setPosSearch('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category tabs: strictly single-line horizontal scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
          {dynamicCategories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setPosCategory && setPosCategory(cat)}
              className={`text-[11px] font-medium px-2.5 py-0.5 rounded-md whitespace-nowrap cursor-pointer transition-all ${
                posCategory === cat
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Product Cards Grid (3:4 Vertical Portrait Aspect Ratio) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 pb-2">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-semibold py-16 select-none">
            <span className="text-2xl mb-1 opacity-70">👗</span>
            <span>لا توجد موديلات مطابقة في هذا التصنيف</span>
          </div>
        ) : (
          filteredProducts.map(prod => {
            const prodId = prod.id || prod.product_id;
            const price = parseFloat(prod.sell_price || prod.base_price || 0);
            const inCart = (cart || []).find(i => (prodId && i.product_id === prodId) || i.product_name === prod.name);
            const modelTitle = prod.name || prod.model_name || 'فستان ملكي راقي';

            return (
              <div
                key={prodId || prod.name}
                onClick={() => addToCart && addToCart(prod)}
                className="p-2 bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800 hover:border-pink-400 dark:hover:border-pink-500/50 rounded-xl flex flex-col justify-between transition-all duration-200 relative group cursor-pointer hover:shadow-md dark:hover:shadow-pink-950/20 select-none"
              >
                {/* Cart Quantity Badge (Top-Left) */}
                {inCart && (
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white text-[10px] font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center z-10 shadow-md ring-2 ring-white dark:ring-[#111C38]">
                    {inCart.qty}
                  </div>
                )}

                {/* 3:4 Vertical Portrait Image Container for Dress */}
                <div className="w-full aspect-[3/4] rounded-lg bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 overflow-hidden relative flex items-center justify-center">
                  {prod.image_url ? (
                    <img
                      src={prod.image_url}
                      alt={modelTitle}
                      className="w-full h-full object-cover object-top rounded-lg group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-pink-50/70 to-purple-50/40 dark:from-slate-900 dark:to-[#16203a] p-2 text-slate-400 dark:text-slate-500 group-hover:text-pink-500 transition-colors">
                      <div className="relative flex flex-col items-center mb-1">
                        <span className="text-sm -mb-1 opacity-85 filter drop-shadow-xs">👑</span>
                        <svg className="w-9 h-9 stroke-current fill-pink-500/10 dark:fill-pink-500/5" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a2.5 2.5 0 0 0-2.5 2.5c0 .7.3 1.3.8 1.8L2 14v1a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1l-8.3-7.7a2.5 2.5 0 0 0 .8-1.8A2.5 2.5 0 0 0 12 2z"/>
                        </svg>
                      </div>
                      <span className="text-[9.5px] font-bold opacity-75">فستان أميرات ملكي</span>
                    </div>
                  )}

                  {/* SKU Pill (Bottom-Right of Image) */}
                  {prod.sku && (
                    <span className="absolute bottom-1.5 right-1.5 bg-white/90 dark:bg-black/75 backdrop-blur-xs text-[8.5px] font-mono text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700/60 font-semibold shadow-2xs">
                      {prod.sku}
                    </span>
                  )}
                </div>

                {/* Model Title */}
                <h4 className="text-[11px] font-bold text-slate-800 dark:text-white truncate text-right mt-1.5 px-0.5 leading-tight" title={modelTitle}>
                  {modelTitle}
                </h4>

                {/* Price & Quick Add Button Strip */}
                <div className="h-6.5 px-1.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 rounded-lg text-slate-800 dark:text-white flex items-center justify-between mt-1.5 shrink-0 shadow-2xs">
                  <span className="font-mono font-bold text-[11px] text-slate-800 dark:text-white">
                    {price.toLocaleString()} <span className="text-[9px] text-pink-600 dark:text-pink-400 font-sans font-semibold">{currCode}</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); addToCart && addToCart(prod); }}
                    className="h-5 px-1.5 flex items-center justify-center rounded-md bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs cursor-pointer transition shadow-2xs active:scale-95 gap-0.5"
                    title="إضافة للسلة"
                  >
                    <span>+</span>
                    <span className="text-[9.5px]">إضافة</span>
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
