// src/features/orders/components/POSCartPayment.jsx
// منطقة التحصيل المالي ووسائل الدفع وزر الاعتماد المالي لشاشة نقاط البيع

function POSCartPayment({
  posSubtotal = 0,
  currCode = "YER",
  posDiscount = '0',
  setPosDiscount,
  posNetTotal = 0,
  posPaymentMethod = 'نقد (كاش)',
  setPosPaymentMethod,
  posCashReceived = '',
  setPosCashReceived,
  cart = [],
  isSubmittingPOS = false,
  handleCheckoutClick
}) {
  const paymentMethods = [
    { id: 'نقد (كاش)', label: 'نقد', icon: '💵' },
    { id: 'شبكة / مدى', label: 'شبكة', icon: '💳' },
    { id: 'آجل / جزئي', label: 'آجل', icon: '⏱️' }
  ];

  return (
    <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] shrink-0 space-y-1.5 select-none transition-colors">
      {/* Subtotal & Discount Rows */}
      <div className="flex items-center justify-between text-[11px] font-medium text-slate-700 dark:text-slate-200">
        <span>المجموع الفرعي:</span>
        <span className="font-mono text-slate-900 dark:text-white font-bold text-[11px] tabular-nums">
          {posSubtotal.toLocaleString()} {currCode}
        </span>
      </div>

      <div className="flex items-center justify-between text-[10.5px]">
        <span className="text-slate-600 dark:text-slate-300 font-medium">الخصم الممنوح:</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            value={posDiscount}
            onChange={e => setPosDiscount && setPosDiscount(e.target.value)}
            className="w-16 h-5.5 px-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111C38] text-[11px] font-mono font-bold text-center text-slate-900 dark:text-white outline-none focus:border-pink-500 shadow-2xs"
            placeholder="0"
          />
          <span className="text-[9.5px] text-slate-400 font-medium">{currCode}</span>
        </div>
      </div>

      {/* Net Required Amount (Bold Highlight) */}
      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-pink-50/80 dark:bg-pink-950/40 border border-pink-200/90 dark:border-pink-900/60 shadow-2xs">
        <span className="text-[11.5px] font-bold text-pink-950 dark:text-pink-200">الصافي المطلوب:</span>
        <span className="font-mono text-[#B0005A] dark:text-pink-300 text-[13px] font-black tracking-tight tabular-nums flex items-baseline gap-1">
          {posNetTotal.toLocaleString()} <span className="text-[10px] font-sans font-bold text-pink-600 dark:text-pink-400">{currCode}</span>
        </span>
      </div>

      {/* Payment Methods Buttons */}
      <div className="grid grid-cols-3 gap-1 h-6.5">
        {paymentMethods.map(({ id, label, icon }) => {
          const isSel = posPaymentMethod === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPosPaymentMethod && setPosPaymentMethod(id)}
              className={`rounded-md text-[10.5px] font-medium transition cursor-pointer flex items-center justify-center gap-1 ${
                isSel
                  ? 'bg-pink-600 text-white shadow-xs font-bold'
                  : 'bg-white dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span className="text-xs">{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Cash Received Field (when Cash is selected) */}
      {posPaymentMethod.includes('نقد') && posNetTotal > 0 && (
        <div className="h-6 px-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[10.5px] font-medium shadow-2xs">
          <span className="text-slate-500 dark:text-slate-400">المبلغ المستلم:</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={posCashReceived}
              onChange={e => setPosCashReceived && setPosCashReceived(e.target.value)}
              placeholder={posNetTotal.toString()}
              className="w-20 h-4.5 text-center font-mono font-bold text-slate-800 dark:text-white bg-transparent outline-none text-[11px]"
            />
            <span className="text-[9.5px] text-slate-400">{currCode}</span>
          </div>
        </div>
      )}

      {/* Main Action Button - Proportional POS Checkout CTA */}
      <button
        type="button"
        disabled={cart.length === 0 || isSubmittingPOS}
        onClick={handleCheckoutClick}
        className={`w-full h-9 rounded-lg font-bold text-[12px] shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none active:scale-[0.98] ${
          cart.length > 0 && !isSubmittingPOS
            ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 hover:from-pink-500 hover:to-rose-600 text-white shadow-pink-600/30 ring-1 ring-pink-500/50'
            : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-80'
        }`}
      >
        <span className="text-sm">⚡</span>
        <span className="tracking-wide">
          {isSubmittingPOS ? "جاري الاعتماد والطباعة... ⏳" : "اعتماد البيع والطباعة"}
        </span>
        {posNetTotal > 0 && (
          <span className="font-mono text-[10.5px] bg-black/25 px-1.5 py-0.5 rounded text-white font-bold mr-auto tabular-nums">
            {posNetTotal.toLocaleString()} {currCode}
          </span>
        )}
      </button>
    </div>
  );
}

window.POSCartPayment = POSCartPayment;