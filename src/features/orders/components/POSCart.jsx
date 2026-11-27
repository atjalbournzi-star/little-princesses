// src/features/orders/components/POSCart.jsx
// عمود السلة والتحصيل المالي وتسوية الفاتورة الفورية لشاشة نقاط البيع

function POSCart({
  cart = [], setCart, customers = [], currencyDisplay = "YER ريال",
  onCheckout, isSubmittingPOS = false, showToast,
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

  const [fetchedCusts, setFetchedCusts] = React.useState([]);
  React.useEffect(() => {
    if ((!customers || customers.length === 0) && (!window.customers || window.customers.length === 0)) {
      fetch('/api/customers').then(r => r.json()).then(d => {
        const list = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []);
        if (list.length) setFetchedCusts(list);
      }).catch(() => {});
    }
  }, [customers]);

  const activeCustomers = (customers && customers.length) ? customers : (window.customers?.length ? window.customers : fetchedCusts);
  const selectedCustomer = React.useMemo(() => {
    return (activeCustomers || []).find(c => getCustName(c) === posCustomerName);
  }, [activeCustomers, posCustomerName, getCustName]);

  const posSubtotal = React.useMemo(() => {
    return (cart || []).reduce((s, itm) => s + ((parseFloat(itm.unit_price) || 0) * (parseInt(itm.qty) || 1)), 0);
  }, [cart]);

  const [posGiftWrap, setPosGiftWrap] = React.useState(false);
  const [posGiftWrapFee, setPosGiftWrapFee] = React.useState('0');
  const [posSplitCash, setPosSplitCash] = React.useState('');
  const [posSplitBank, setPosSplitBank] = React.useState('');

  const posDiscountNum = Math.max(0, parseFloat(posDiscount) || 0);
  const posGiftWrapFeeNum = posGiftWrap ? Math.max(0, parseFloat(posGiftWrapFee) || 0) : 0;
  const posNetTotal = Math.max(0, posSubtotal - posDiscountNum + posGiftWrapFeeNum);
  const isPartialMethod = posPaymentMethod === 'آجل / جزئي';
  const posReceivedNum = posCashReceived !== ''
    ? Math.max(0, Math.min(posNetTotal, parseFloat(posCashReceived) || 0))
    : (isPartialMethod ? 0 : posNetTotal);

  const updateCartQty = (idx, delta) => {
    const curItem = (cart || [])[idx];
    if (!curItem) return;
    const nextCheck = (curItem.qty || 1) + delta;
    if (delta > 0 && curItem.max_stock != null && nextCheck > Number(curItem.max_stock)) {
      showToast && showToast(`الحد الأقصى المتوفر للمقاس ${curItem.age_size || ''} هو ${curItem.max_stock} قطعة`, 'error');
      return;
    }
    setCart && setCart(prev => {
      const updated = [...prev];
      const cur = updated[idx];
      if (!cur) return prev;
      const nextQty = (cur.qty || 1) + delta;
      if (nextQty <= 0) return prev.filter((_, i) => i !== idx);
      if (delta > 0 && cur.max_stock != null && nextQty > Number(cur.max_stock)) return prev;
      updated[idx] = { ...cur, qty: nextQty, total_price: nextQty * cur.unit_price };
      return updated;
    });
  };

  const clearCart = () => {
    setCart && setCart([]);
    setPosDiscount && setPosDiscount('0');
    setPosCashReceived && setPosCashReceived('');
    setPosGiftWrap(false);
    setPosGiftWrapFee('0');
    setPosSplitCash('');
    setPosSplitBank('');
  };

  const handleCheckoutClick = () => {
    const posCustomerId = selectedCustomer ? (selectedCustomer.customer_id || selectedCustomer.id || null) : null;
    if (posPaymentMethod === 'آجل / جزئي' && (!posCustomerId || posCustomerId === 'CUST-GENERAL')) {
      showToast && showToast('يرجى اختيار عميل مسجل (غير عميل عام) لإتمام البيع الآجل أو الجزئي ⚠️', 'error');
      return;
    }
    const splitCashNum = Math.max(0, parseFloat(posSplitCash) || 0);
    const splitBankNum = Math.max(0, parseFloat(posSplitBank) || 0);
    const splitDetails = posPaymentMethod === 'مقسّم (نقد + بنك)' ? { cash: splitCashNum, bank: splitBankNum } : null;
    onCheckout && onCheckout({
      cart, posCustomerId: posCustomerId || 'CUST-GENERAL', posCustomerName, posChildName, posPaymentMethod,
      posDiscountNum, posGiftWrap, posGiftWrapFee: posGiftWrapFeeNum,
      splitDetails, posSubtotal, posNetTotal, posCashReceived, posReceivedNum, clearCart
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
            {(activeCustomers || []).map(c => {
              const n = getCustName(c);
              return n ? <option key={c.id || n} value={n}>{n}</option> : null;
            })}
          </select>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {(() => {
            const totalQty = (cart || []).reduce((s, i) => s + (i.qty || 1), 0);
            return (
              <span key={totalQty} className="h-5 px-1.5 text-[9.5px] bg-pink-950/70 text-pink-300 border border-pink-800/60 rounded font-mono font-bold flex items-center justify-center erp-badge-bump" title="عدد القطع">
                {totalQty}
              </span>
            );
          })()}
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

      {/* Customer Balance Indicator */}
      {selectedCustomer && posCustomerName !== 'عميل عام / زائر صالة العرض' && (
        <div className="h-6 px-2.5 bg-pink-50/50 dark:bg-pink-950/20 border-b border-pink-200/40 dark:border-pink-900/40 flex items-center justify-between text-[10px] shrink-0">
          <span className="text-slate-500 dark:text-slate-400">رصيد العميل الحالي:</span>
          <span dir="ltr" className="font-mono font-bold text-pink-600 dark:text-pink-400 tabular-nums">
            {Number(selectedCustomer.current_balance || 0).toLocaleString('en-US')} {currCode}
          </span>
        </div>
      )}

      {/* ZONE 2: Scrollable Cart Items List - ISOLATED SCROLL */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1 min-h-0 bg-slate-50/50 dark:bg-transparent">
        {cart.length === 0 ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-300 text-xs select-none flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-pink-50 dark:bg-pink-950/40 border border-pink-200/60 dark:border-pink-800/40 flex items-center justify-center text-lg shadow-2xs">
              🛍️
            </div>
            <span className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200">السلة فارغة</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">اختر موديلات الكتالوج لإضافتها</span>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div
              key={item.variant_id || `${item.product_id}-${item.age_size || idx}`}
              className="min-h-9 py-1 px-2 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 rounded-md flex items-center justify-between text-[11px] shadow-2xs transition-colors gap-1 erp-cart-pop"
            >
              <div className="min-w-0 flex-1 pr-0.5">
                <span className="text-slate-900 dark:text-slate-100 font-bold text-[11px] truncate block" title={item.product_name}>
                  {item.product_name}
                </span>
                <div className="flex items-center gap-1 flex-wrap mt-0.5">
                  {item.age_size && (
                    <span className="px-1 py-0.2 rounded bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200/80 dark:border-pink-800/60 text-[9px] font-bold">
                      {item.age_size}{item.color_name ? ` · ${item.color_name}` : ''}
                    </span>
                  )}
                  <span dir="ltr" className="font-mono text-[9.5px] text-slate-500 dark:text-slate-400 font-bold tabular-nums">
                    {Number(item.unit_price).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 px-1 py-0.5 rounded-md shrink-0">
                <button type="button" onClick={() => updateCartQty(idx, -1)} className="w-3.5 h-3.5 rounded text-slate-600 dark:text-slate-300 hover:text-pink-600 dark:hover:text-white font-bold flex items-center justify-center cursor-pointer text-[10px]">-</button>
                <span className="w-4 text-center font-mono font-bold text-slate-800 dark:text-white text-[11px] tabular-nums">{item.qty}</span>
                <button type="button" onClick={() => updateCartQty(idx, 1)} className="w-3.5 h-3.5 rounded text-slate-600 dark:text-slate-300 hover:text-pink-600 dark:hover:text-white font-bold flex items-center justify-center cursor-pointer text-[10px]">+</button>
              </div>

              <span dir="ltr" className="font-mono font-bold text-slate-900 dark:text-white text-[11px] w-14 text-left shrink-0 tabular-nums">
                {(item.unit_price * item.qty).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>

      {/* ZONE 3: Settlement & Payment Footer */}
      {PaymentComp && (
        <PaymentComp
          posSubtotal={posSubtotal} currCode={currCode} posDiscount={posDiscount} setPosDiscount={setPosDiscount}
          posGiftWrap={posGiftWrap} setPosGiftWrap={setPosGiftWrap} posGiftWrapFee={posGiftWrapFee} setPosGiftWrapFee={setPosGiftWrapFee}
          posNetTotal={posNetTotal} posPaymentMethod={posPaymentMethod} setPosPaymentMethod={setPosPaymentMethod}
          posCashReceived={posCashReceived} setPosCashReceived={setPosCashReceived}
          posSplitCash={posSplitCash} setPosSplitCash={setPosSplitCash} posSplitBank={posSplitBank} setPosSplitBank={setPosSplitBank}
          cart={cart} isSubmittingPOS={isSubmittingPOS} handleCheckoutClick={handleCheckoutClick}
        />
      )}
    </div>
  );
}

window.POSCart = POSCart;
