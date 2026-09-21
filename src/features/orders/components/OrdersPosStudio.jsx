// src/features/orders/components/OrdersPosStudio.jsx
const { useState, useMemo, useRef } = React;

function OrdersPosStudio({ products = [], customers = [], currencyDisplay = "YER ريال", cart = [], setCart, onCheckout, isSubmittingPOS, showToast }) {
  const getCustName = window.getCustomerName || ((c) => c?.name || '');
  const [posCategory, setPosCategory] = useState('الكل'), [posSearch, setPosSearch] = useState(''), [barcodeInput, setBarcodeInput] = useState('');
  const [posCustomerName, setPosCustomerName] = useState('عميل عام / زائر صالة العرض'), [posChildName, setPosChildName] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState('نقد (كاش)'), [posDiscount, setPosDiscount] = useState('0'), [posCashReceived, setPosCashReceived] = useState('');
  const barcodeInputRef = useRef(null);

  const posSubtotal = useMemo(() => cart.reduce((s, itm) => s + ((parseFloat(itm.unit_price) || 0) * (parseInt(itm.qty) || 1)), 0), [cart]);
  const posDiscountNum = Math.max(0, parseFloat(posDiscount) || 0), posNetTotal = Math.max(0, posSubtotal - posDiscountNum);
  const posReceivedNum = posCashReceived !== '' ? (parseFloat(posCashReceived) || 0) : posNetTotal;

  const posCategories = useMemo(() => {
    const baseCats = ['الكل', 'منتجات جاهزة', 'تفصيل مخصص', 'طلبات خاصة', 'إكسسوارات ومكملات'];
    return Array.from(new Set([...baseCats, ...(products || []).map(p => p.category).filter(Boolean)]));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return (products || []).filter(p => {
      const matchCat = posCategory === 'الكل' || p.category === posCategory;
      const s = posSearch.toLowerCase();
      return matchCat && (!posSearch || (p.name || '').toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s) || (p.barcode || '').toLowerCase().includes(s));
    });
  }, [products, posCategory, posSearch]);

  const addToCart = (product) => {
    const prodId = product.id || product.product_id, prodName = product.name || product.model_name || 'موديل راقي', price = parseFloat(product.sell_price || product.base_price || 0);
    setCart(prev => {
      const existingIdx = prev.findIndex(item => (prodId && item.product_id === prodId) || item.product_name === prodName);
      if (existingIdx > -1) {
        const updated = [...prev], nextQty = (updated[existingIdx].qty || 1) + 1;
        updated[existingIdx] = { ...updated[existingIdx], qty: nextQty, total_price: nextQty * updated[existingIdx].unit_price };
        return updated;
      }
      return [...prev, { product_id: prodId, product_name: prodName, sku: product.sku || `SKU-${prodId || Date.now().toString().slice(-4)}`, category: product.category || 'عام', unit_price: price, qty: 1, total_price: price, image_url: product.image_url || '' }];
    });
  };

  const updateCartQty = (idx, delta) => {
    setCart(prev => {
      const updated = [...prev], nextQty = (updated[idx].qty || 1) + delta;
      if (nextQty <= 0) return prev.filter((_, i) => i !== idx);
      updated[idx] = { ...updated[idx], qty: nextQty, total_price: nextQty * updated[idx].unit_price };
      return updated;
    });
  };

  const handleBarcodeSubmit = (e) => {
    if (e) e.preventDefault();
    const code = (barcodeInput || '').trim().toLowerCase();
    if (!code) return;
    const matched = (products || []).find(p => (p.sku && p.sku.toLowerCase() === code) || (p.barcode && p.barcode.toLowerCase() === code) || (p.id && String(p.id).toLowerCase() === code) || (p.name && p.name.toLowerCase() === code));
    if (matched) { addToCart(matched); showToast && showToast(`تم إضافة ${matched.name} إلى السلة 🛍️`); setBarcodeInput(''); }
    else { showToast && showToast(`لم يتم العثور على صنف بالباركود: ${barcodeInput} ⚠️`, 'error'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
      {/* Right Column: Catalog & Barcode */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#E8E5EA] dark:border-slate-800 p-4 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
          <form onSubmit={handleBarcodeSubmit} className="relative flex-1 w-full">
            <input ref={barcodeInputRef} type="text" value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} placeholder="امسح بقارئ الباركود أو اكتب رمز الصنف..." className="w-full h-11 pl-16 pr-10 py-2.5 rounded-xl border-2 border-dashed border-[#B0005A]/40 bg-[#FFF9FC] dark:bg-slate-900 text-xs font-bold text-[#25232A] dark:text-slate-100 outline-none" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0005A] pointer-events-none">🏷️</span>
            <button type="submit" className="absolute left-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#B0005A] text-white text-[11px] font-extrabold rounded-lg cursor-pointer">إضافة ⏎</button>
          </form>
          <div className="relative w-full sm:w-56">
            <input type="text" value={posSearch} onChange={e => setPosSearch(e.target.value)} placeholder="بحث في المنتجات..." className="w-full h-11 pl-3 pr-9 py-2 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-[#FAFAFB] dark:bg-slate-900 text-xs text-[#25232A] dark:text-slate-100 outline-none" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6F6B75] text-xs pointer-events-none">🔍</span>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap items-center gap-2 pb-1.5">
          {posCategories.map(cat => (
            <button key={cat} type="button" onClick={() => setPosCategory(cat)} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${posCategory === cat ? 'bg-[#B0005A] text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-[#6F6B75] dark:text-slate-300 border border-[#E8E5EA] dark:border-slate-700'}`}>{cat}</button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#E8E5EA] dark:border-slate-800 p-4 min-h-[440px]">
          {filteredProducts.length === 0 ? <div className="py-20 text-center text-[#6F6B75] text-xs font-bold">لا توجد منتجات تطابق البحث</div> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {filteredProducts.map(prod => {
                const price = parseFloat(prod.sell_price || prod.base_price || 0), inCart = cart.find(i => (prod.id && i.product_id === prod.id) || i.product_name === prod.name);
                return (
                  <div key={prod.id || prod.name} onClick={() => addToCart(prod)} className={`group relative bg-[#FAFAFB] dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800 border rounded-2xl p-3 flex flex-col justify-between transition-all cursor-pointer shadow-2xs hover:border-[#B0005A] ${inCart ? 'border-[#B0005A] bg-[#FFF9FC] dark:bg-rose-950/20' : 'border-[#E8E5EA] dark:border-slate-800'}`}>
                    {inCart && <div className="absolute top-2 left-2 bg-[#B0005A] text-white text-[10px] font-mono font-extrabold w-5 h-5 rounded-full flex items-center justify-center">{inCart.qty}</div>}
                    <div className="space-y-2">
                      <div className="w-full h-24 rounded-xl bg-gradient-to-tr from-[#FCE8F2] to-[#F2E7F3] dark:from-slate-800 flex items-center justify-center text-3xl overflow-hidden">
                        {prod.image_url ? <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" /> : <span>📦</span>}
                      </div>
                      <h4 className="font-bold text-xs text-[#25232A] dark:text-slate-100 line-clamp-1">{prod.name || prod.model_name}</h4>
                    </div>
                    <div className="mt-3 pt-2 border-t border-[#E8E5EA] dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-black font-mono text-[#007F8C] dark:text-cyan-400">{price.toLocaleString()} {currencyDisplay.split(' ')[0]}</span>
                      <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-[#E8E5EA] dark:border-slate-700 flex items-center justify-center text-xs font-bold">+</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Left Column: Cart & Cash Register */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#E8E5EA] dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#E8E5EA] dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-extrabold text-sm text-[#25232A] dark:text-slate-100">
                <span>🛒 سلة المشتريات</span>
                <span className="text-xs bg-[#FCE8F2] dark:bg-rose-950/50 text-[#B0005A] font-bold px-2 py-0.5 rounded-full font-mono">{cart.reduce((s, i) => s + (i.qty || 1), 0)}</span>
              </div>
              {cart.length > 0 && <button type="button" onClick={() => setCart([])} className="text-[11px] text-[#D64545] border border-rose-200 px-2 py-1 rounded-lg">إفراغ 🗑️</button>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <select value={posCustomerName} onChange={e => setPosCustomerName(e.target.value)} className="w-full h-9 px-2 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#25232A] dark:text-slate-100">
                <option value="عميل عام / زائر صالة العرض">عميل عام / زائر صالة العرض</option>
                {(customers || []).map(c => { const n = getCustName(c); return n ? <option key={c.id || n} value={n}>{n}</option> : null; })}
              </select>
              <input type="text" value={posChildName} onChange={e => setPosChildName(e.target.value)} placeholder="اسم المستفيد / ملاحظات..." className="w-full h-9 px-2 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-[#25232A] dark:text-slate-100" />
            </div>
          </div>

          {/* Cart items */}
          <div className="p-4 max-h-[260px] overflow-y-auto space-y-2 border-b border-[#E8E5EA] dark:border-slate-800 divide-y divide-[#E8E5EA]/60 dark:divide-slate-800">
            {cart.length === 0 ? <div className="py-10 text-center text-[#6F6B75] text-xs font-bold">السلة فارغة حالياً 🛍️</div> : (
              cart.map((item, idx) => (
                <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 flex-1 truncate"><h5 className="font-bold text-[#25232A] dark:text-slate-100 truncate">{item.product_name}</h5><span className="font-mono text-[10.5px] text-[#007F8C]">{item.unit_price} {currencyDisplay.split(' ')[0]}</span></div>
                  <div className="flex items-center gap-1 border border-[#E8E5EA] dark:border-slate-700 p-0.5 rounded-lg">
                    <button type="button" onClick={() => updateCartQty(idx, -1)} className="w-5 h-5 rounded font-bold hover:bg-rose-50">-</button>
                    <span className="w-6 text-center font-mono font-bold">{item.qty}</span>
                    <button type="button" onClick={() => updateCartQty(idx, 1)} className="w-5 h-5 rounded font-bold hover:bg-emerald-50">+</button>
                  </div>
                  <span className="font-mono font-bold w-16 text-left">{(item.unit_price * item.qty).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>

          {/* Summary */}
          <div className="p-4 bg-[#FAFAFB] dark:bg-slate-900/60 border-b border-[#E8E5EA] dark:border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between font-semibold text-gray-500"><span>المجموع الفرعي:</span><span className="font-mono font-bold text-gray-800 dark:text-slate-200">{posSubtotal.toLocaleString()} {currencyDisplay.split(' ')[0]}</span></div>
            <div className="flex items-center justify-between gap-2"><span>الخصم:</span><input type="number" min="0" value={posDiscount} onChange={e => setPosDiscount(e.target.value)} className="w-24 h-7 px-2 rounded-lg border border-[#E8E5EA] dark:border-slate-700 text-xs font-mono font-bold text-center" /></div>
            <div className="pt-2 border-t border-[#E8E5EA] dark:border-slate-800 flex justify-between font-black text-sm text-[#B0005A] dark:text-rose-400"><span>الإجمالي الصافي:</span><span className="font-mono text-base">{posNetTotal.toLocaleString()} {currencyDisplay}</span></div>
          </div>

          {/* Tender & Checkout */}
          <div className="p-4 space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              {['نقد (كاش)', 'شبكة / مدى', 'آجل / جزئي'].map(t => (
                <button key={t} type="button" onClick={() => setPosPaymentMethod(t)} className={`py-2 rounded-xl font-bold border transition cursor-pointer ${posPaymentMethod === t ? 'bg-[#B0005A] text-white border-[#B0005A]' : 'bg-white dark:bg-slate-800 border-[#E8E5EA] dark:border-slate-700 text-gray-600 dark:text-slate-300'}`}>{t}</button>
              ))}
            </div>
            {posPaymentMethod === 'نقد (كاش)' && posNetTotal > 0 && (
              <div className="p-2 rounded-xl bg-gray-50 dark:bg-slate-900 flex items-center justify-between font-bold">
                <span>المبلغ المستلم:</span><input type="number" value={posCashReceived} onChange={e => setPosCashReceived(e.target.value)} placeholder={posNetTotal.toString()} className="w-28 h-7 text-center font-mono font-black border rounded-lg" />
              </div>
            )}
            <button type="button" onClick={() => onCheckout({ cart, posCustomerName, posChildName, posPaymentMethod, posDiscountNum, posSubtotal, posNetTotal, posCashReceived, posReceivedNum, clearCart: () => { setCart([]); setPosDiscount('0'); setPosCashReceived(''); } })} disabled={cart.length === 0 || isSubmittingPOS} className="w-full py-3.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-[#B0005A] to-[#8F2A87] hover:opacity-95 transition shadow-md cursor-pointer disabled:opacity-50">
              {isSubmittingPOS ? 'جاري تسجيل الفاتورة... ⏳' : '⚡ إتمام البيع والطباعة الفورية'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.OrdersPosStudio = OrdersPosStudio;
