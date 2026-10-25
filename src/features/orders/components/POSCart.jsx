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
  const currCode = typeof currencyDisplay === 'string'
    ? currencyDisplay.split(' ')[0]
    : (currencyDisplay?.code || currencyDisplay?.display?.split(' ')[0] || 'YER');
  const getCustName = window.getCustomerName || ((c) => c?.name || c?.customer_name || '');
  const PaymentComp = window.POSCartPayment || (typeof POSCartPayment !== 'undefined' ? POSCartPayment : null);

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
    <div className="w-full h-full flex flex-col justify-between bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm dark:shadow-2xl transition-colors" dir="rtl">
      
      {/* ZONE 1: Cart Header (Customer select & Clear Cart) - Pinned Top (h-8) */}
      <div className="h-8 px-2 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between gap-1.5 bg-slate-50 dark:bg-slate-900/60 select-none">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <select
            value={posCustomerName}
            onChange={e => setPosCustomerName && setPosCustomerName(e.target.value)}
            className="w-full h-6 px-2 text-[11px] font-medium bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md outline-none cursor-pointer truncate transition hover:border-slate-300 dark:hover:border-slate-600"
          >
            <option value="عميل عام / زائر صالة العرض">عميل عام / زائر</option>
            {(customers || []).map(c => {
              const n = getCustName(c);
              return n ? <option key={c.id || n} value={n}>{n}</option> : null;
            })}
          </select>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="h-5 px-1.5 text-[9.5px] bg-pink-950/70 text-pink-300 border border-pink-800/60 rounded font-mono font-bold flex items-center justify-center" title="عدد القطع">
            {(cart || []).reduce((s, i) => s + (i.qty || 1), 0)}
          </span>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              title="إفراغ السلة بالكامل"
              className="h-6 w-6 text-rose-500 hover:bg-rose-500/10 rounded-md border border-rose-200 dark:border-rose-800/50 flex items-center justify-center text-[10px] transition cursor-pointer font-bold"
            >
              <span>🗑️</span>
            </button>
          )}
        </div>
      </div>

      {/* ZONE 2: Scrollable Cart Items List - ISOLATED SCROLL */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1 min-h-0 bg-slate-50/50 dark:bg-transparent">
        {cart.length === 0 ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-300 text-xs select-none flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-pink-50 dark:bg-pink-950/40 border border-pink-200/60 dark:border-pink-800/40 flex items-center justify-center text-lg shadow-2xs">
              🛍️
            </div>
            <span className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200">السلة فارغة</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">اختر موديلات الأميرات من الكتالوج لإضافتها</span>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div
              key={item.product_id || idx}
              className="h-8 px-2 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 rounded-md flex items-center justify-between text-[11px] shadow-2xs transition-colors"
            >
              <div className="min-w-0 pr-0.5">
                <span className="text-slate-900 dark:text-slate-100 font-bold text-[11px] truncate block w-28" title={item.product_name}>
                  {item.product_name}
                </span>
                <span className="font-mono text-[9.5px] text-pink-600 dark:text-pink-400 font-bold block">
                  {Number(item.unit_price).toLocaleString()} {currCode}
                </span>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 px-1 py-0.5 rounded-md shrink-0">
                <button
                  type="button"
                  onClick={() => updateCartQty(idx, -1)}
                  className="w-3.5 h-3.5 rounded text-slate-600 dark:text-slate-300 hover:text-pink-600 dark:hover:text-white font-bold flex items-center justify-center cursor-pointer text-[10px] transition"
                >
                  -
                </button>
                <span className="w-4 text-center font-mono font-bold text-slate-800 dark:text-white text-[11px]">{item.qty}</span>
                <button
                  type="button"
                  onClick={() => updateCartQty(idx, 1)}
                  className="w-3.5 h-3.5 rounded text-slate-600 dark:text-slate-300 hover:text-pink-600 dark:hover:text-white font-bold flex items-center justify-center cursor-pointer text-[10px] transition"
                >
                  +
                </button>
              </div>

              <span className="font-mono font-bold text-slate-900 dark:text-white text-[11px] w-14 text-left shrink-0 tabular-nums">
                {(item.unit_price * item.qty).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>

      {/* ZONE 3: Settlement & Payment Footer */}
      {PaymentComp && (
        <PaymentComp
          posSubtotal={posSubtotal}
          currCode={currCode}
          posDiscount={posDiscount}
          setPosDiscount={setPosDiscount}
          posNetTotal={posNetTotal}
          posPaymentMethod={posPaymentMethod}
          setPosPaymentMethod={setPosPaymentMethod}
          posCashReceived={posCashReceived}
          setPosCashReceived={setPosCashReceived}
          cart={cart}
          isSubmittingPOS={isSubmittingPOS}
          handleCheckoutClick={handleCheckoutClick}
        />
      )}
    </div>
  );
}

window.POSCart = POSCart;
