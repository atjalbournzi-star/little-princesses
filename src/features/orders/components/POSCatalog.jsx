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

  const filteredProducts = React.useMemo(() => {
    return (products || []).filter(p => {
      const matchCat = !posCategory || posCategory === 'الكل' || p.category === posCategory;
      const s = (posSearch || '').toLowerCase().trim();
      return matchCat && (!s || (p.name || '').toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s) || (p.barcode || '').toLowerCase().includes(s));
    });
  }, [products, posCategory, posSearch]);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#111C38] border border-slate-800 rounded-xl p-2">
      {/* 1. Search & Category Row (Fixed, No Scroll) */}
      <div className="shrink-0 space-y-1.5 mb-1.5">
        <div className="h-8 px-2 flex items-center gap-2 bg-slate-900/60 rounded-lg border border-slate-800">
          <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={e => setBarcodeInput && setBarcodeInput(e.target.value)}
              placeholder="امسح بالباركود أو اكتب الرمز..."
              className="w-full h-7 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white pr-7 pl-14 outline-none focus:border-pink-500 font-medium"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-pink-400 text-xs pointer-events-none">🏷️</span>
            <button
              type="submit"
              className="absolute left-1 top-1/2 -translate-y-1/2 h-5 px-2 bg-pink-600 hover:bg-pink-700 text-white text-[10px] font-bold rounded cursor-pointer transition"
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
              className="w-full h-7 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white pr-7 pl-6 outline-none focus:border-pink-500 font-medium"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">🔍</span>
            {posSearch && (
              <button
                type="button"
                onClick={() => setPosSearch && setPosSearch('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category tabs: strictly single-line horizontal scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
          {posCategories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setPosCategory && setPosCategory(cat)}
              className={`text-[11px] font-medium px-2.5 py-0.5 rounded-md whitespace-nowrap cursor-pointer transition-colors ${
                posCategory === cat
                  ? 'bg-pink-600 text-white font-bold shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Product Cards Grid (The ONLY scrolling area) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-3 xl:grid-cols-4 gap-2 pr-1 pb-2">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full h-full flex flex-col items-center justify-center text-slate-400 text-xs font-semibold py-12">
            <span>🔍 لا توجد منتجات مطابقة في هذا التصنيف</span>
          </div>
        ) : (
          filteredProducts.map(prod => {
            const prodId = prod.id || prod.product_id;
            const price = parseFloat(prod.sell_price || prod.base_price || 0);
            const inCart = (cart || []).find(i => (prodId && i.product_id === prodId) || i.product_name === prod.name);

            return (
              <div
                key={prodId || prod.name}
                onClick={() => addToCart && addToCart(prod)}
                className="h-[122px] max-h-[122px] p-1.5 bg-[#111C38] border border-slate-800 hover:border-pink-500/50 rounded-xl flex flex-col justify-between transition-all relative group cursor-pointer"
              >
                {inCart && (
                  <div className="absolute top-1 left-1 bg-pink-600 text-white text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center z-10 shadow-xs">
                    {inCart.qty}
                  </div>
                )}

                {/* Product Image / Placeholder (h-[60px]) */}
                {prod.image_url ? (
                  <img src={prod.image_url} alt={prod.name} className="h-[60px] w-full object-cover rounded-lg shrink-0" />
                ) : (
                  <div className="h-[60px] w-full rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center border border-slate-800/80 shrink-0 text-slate-400">
                    <svg className="w-5 h-5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 2a2.5 2.5 0 0 0-2.5 2.5c0 .7.3 1.3.8 1.8L2 14v1a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1l-8.3-7.7a2.5 2.5 0 0 0 .8-1.8A2.5 2.5 0 0 0 12 2z"/>
                    </svg>
                  </div>
                )}

                {/* Title */}
                <h4 className="text-[10.5px] font-bold text-white truncate text-center mt-0.5 select-none px-1" title={prod.name || prod.model_name}>
                  {prod.name || prod.model_name || 'فستان'}
                </h4>

                {/* Price & Add Row */}
                <div className="h-5.5 flex items-center justify-between px-1.5 bg-slate-900/80 rounded-lg shrink-0">
                  <span className="text-[11px] font-black font-mono text-white">
                    {price.toLocaleString()} <span className="text-[8.5px] text-slate-400 font-sans">{currCode}</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); addToCart && addToCart(prod); }}
                    className="w-4.5 h-4.5 flex items-center justify-center rounded bg-pink-600 hover:bg-pink-700 text-white font-bold text-[11px] cursor-pointer transition shadow-2xs"
                    title="إضافة"
                  >
                    +
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
