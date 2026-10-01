// src/features/orders/components/POSCart.jsx
// عمود السلة والتحصيل المالي وتسوية الفاتورة الفورية لشاشة نقاط البيع

function POSCart({
  cart = [], setCart, customers = [], currencyDisplay = "YER ريال",
  onCheckout, isSubmittingPOS = false,
  posCustomerName = 'عميل عام / زائر صالة العرض', setPosCustomerName,
  posChildName = '', setPosChildName,
  posPaymentMethod = 'نقد (كاش)', setPosPaymentMethod,
  posDiscount = '0', setPosDiscount,
  posCashReceived = '', setPosCashReceived
}) {
  const currCode = (currencyDisplay || "YER").split(' ')[0];
  const getCustName = window.getCustomerName || ((c) => c?.name || c?.customer_name || '');

  const posSubtotal = React.useMemo(() => {
    return (cart || []).reduce((s, itm) => s + ((parseFloat(itm.unit_price) || 0) * (parseInt(itm.qty) || 1)), 0);
  }, [cart]);

  const posDiscountNum = Math.max(0, parseFloat(posDiscount) || 0);
  const posNetTotal = Math.max(0, posSubtotal - posDiscountNum);
  const posReceivedNum = posCashReceived !== '' ? (parseFloat(posCashReceived) || 0) : posNetTotal;

  const updateCartQty = (idx, delta) => {
    setCart && setCart(prev => {
      const updated = [...prev], nextQty = (updated[idx].qty || 1) + delta;
      if (nextQty <= 0) return prev.filter((_, i) => i !== idx);
      updated[idx] = { ...updated[idx], qty: nextQty, total_price: nextQty * updated[idx].unit_price };
      return updated;
    });
  };

  const clearCart = () => {
    setCart && setCart([]);
    setPosDiscount && setPosDiscount('0');
    setPosCashReceived && setPosCashReceived('');
  };

  const handleCheckoutClick = () => {
    onCheckout && onCheckout({
      cart, posCustomerName, posChildName, posPaymentMethod,
      posDiscountNum, posSubtotal, posNetTotal, posCashReceived, posReceivedNum, clearCart
    });
  };

  return (
    <div className="w-80 xl:w-96 h-full flex flex-col bg-[#111C38] border border-slate-800 rounded-xl overflow-hidden shrink-0">
      {/* 1. Cart Header */}
      <div className="p-2 border-b border-slate-800 bg-[#0F172A] shrink-0 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🛒</span>
            <span className="text-xs font-bold text-white">سلة الكاشير</span>
            <span className="text-[10px] bg-pink-600 text-white font-mono font-bold px-1.5 py-0.2 rounded-full">
              {(cart || []).reduce((s, i) => s + (i.qty || 1), 0)}
            </span>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-[10.5px] text-rose-400 hover:text-white hover:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40 transition cursor-pointer"
            >
              إفراغ السلة 🗑️
            </button>
          )}
        </div>

        {/* Customer selector & notes: h-7 text-xs bg-slate-900 border border-slate-700 rounded text-white */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <select
            value={posCustomerName}
            onChange={e => setPosCustomerName && setPosCustomerName(e.target.value)}
            className="w-full h-7 px-2 text-xs bg-slate-900 border border-slate-700 text-white rounded outline-none font-semibold cursor-pointer"
          >
            <option value="عميل عام / زائر صالة العرض">عميل عام / زائر صالة العرض</option>
            {(customers || []).map(c => {
              const n = getCustName(c);
              return n ? <option key={c.id || n} value={n}>{n}</option> : null;
            })}
          </select>

          <input
            type="text"
            value={posChildName}
            onChange={e => setPosChildName && setPosChildName(e.target.value)}
            placeholder="اسم المستفيد / ملاحظة..."
            className="w-full h-7 px-2 text-xs bg-slate-900 border border-slate-700 text-white rounded outline-none placeholder:text-slate-500 font-medium"
          />
        </div>
      </div>

      {/* 2. Cart Items List: flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 divide-y divide-slate-800/60">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-4 text-slate-400 text-xs font-semibold gap-1 select-none">
            <span className="text-2xl opacity-60">🛍️</span>
            <span>السلة فارغة</span>
            <span className="text-[10px] text-slate-500">اختر من المنتجات أو امسح الباركود للإضافة</span>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div key={item.product_id || idx} className="pt-1.5 first:pt-0 flex items-center justify-between gap-1 text-xs">
              <div className="min-w-0 flex-1 truncate pr-1">
                <h5 className="font-bold text-white text-[11px] truncate">{item.product_name}</h5>
                <span className="font-mono text-[10.5px] text-pink-400 font-bold">
                  {Number(item.unit_price).toLocaleString()} {currCode}
                </span>
              </div>

              {/* Quantity control */}
              <div className="flex items-center gap-1 border border-slate-700 bg-slate-800/90 px-1 py-0.5 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => updateCartQty(idx, -1)}
                  className="w-4 h-4 rounded text-slate-300 hover:text-white hover:bg-slate-700 font-bold flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <span className="w-5 text-center font-mono font-bold text-white text-xs">{item.qty}</span>
                <button
                  type="button"
                  onClick={() => updateCartQty(idx, 1)}
                  className="w-4 h-4 rounded text-slate-300 hover:text-white hover:bg-slate-700 font-bold flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>

              <span className="font-mono font-black text-white text-[11px] w-16 text-left shrink-0">
                {(item.unit_price * item.qty).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>

      {/* 3. Persistent Checkout Footer (STRICTLY PINNED AT BOTTOM) */}
      <div className="border-t border-slate-800 bg-[#0F172A] p-2 space-y-1 shrink-0">
        {/* Summary row (المجموع، الخصم، الصافي) */}
        <div className="space-y-0.5">
          <div className="text-xs font-bold text-white flex justify-between">
            <span className="text-slate-300 font-medium">المجموع الفرعي:</span>
            <span className="font-mono font-bold text-white">{posSubtotal.toLocaleString()} {currCode}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">الخصم:</span>
            <input
              type="number" min="0" value={posDiscount}
              onChange={e => setPosDiscount && setPosDiscount(e.target.value)}
              className="w-20 h-5.5 px-1.5 rounded border border-slate-700 bg-slate-900 text-xs font-mono font-bold text-center text-white outline-none focus:border-pink-500"
            />
          </div>

          <div className="pt-0.5 border-t border-slate-800/80 text-xs font-bold text-slate-300 flex justify-between items-center">
            <span>الصافي المطلوب:</span>
            <span className="text-sm font-black text-pink-400 font-mono">{posNetTotal.toLocaleString()} {currCode}</span>
          </div>
        </div>

        {/* Payment method pills: grid grid-cols-3 gap-1 h-6.5 text-[10.5px] font-bold */}
        <div className="grid grid-cols-3 gap-1 h-6.5 text-[10.5px] font-bold">
          {['نقد (كاش)', 'شبكة / مدى', 'آجل / جزئي'].map(method => {
            const isSel = posPaymentMethod === method;
            return (
              <button
                key={method} type="button" onClick={() => setPosPaymentMethod && setPosPaymentMethod(method)}
                className={`rounded-lg transition cursor-pointer flex items-center justify-center ${isSel ? 'bg-pink-600 text-white shadow-xs' : 'bg-slate-800/90 text-slate-300 border border-slate-700 hover:text-white'}`}
              >
                {method.split(' ')[0]}
              </button>
            );
          })}
        </div>

        {/* Cash received if Cash */}
        {posPaymentMethod.includes('نقد') && posNetTotal > 0 && (
          <div className="h-5.5 px-2 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-between text-[10.5px] font-bold">
            <span className="text-slate-300">المستلم:</span>
            <input
              type="number"
              value={posCashReceived}
              onChange={e => setPosCashReceived && setPosCashReceived(e.target.value)}
              placeholder={posNetTotal.toString()}
              className="w-24 h-4.5 text-center font-mono font-bold text-white bg-transparent outline-none"
            />
          </div>
        )}

        {/* Primary Action Button: 100% visible above taskbar */}
        <button
          type="button"
          disabled={cart.length === 0 || isSubmittingPOS}
          onClick={handleCheckoutClick}
          className="w-full h-8 mb-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-40"
        >
          <span>{isSubmittingPOS ? "جاري الاعتماد... ⏳" : "⚡ اعتماد البيع والطباعة"}</span>
        </button>
      </div>
    </div>
  );
}

window.POSCart = POSCart;
