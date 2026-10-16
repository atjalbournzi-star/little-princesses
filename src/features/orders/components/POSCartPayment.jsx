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
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
        <span>المجموع الفرعي:</span>
        <span className="font-mono text-slate-800 dark:text-white font-bold">
          {posSubtotal.toLocaleString()} {currCode}
        </span>
      </div>

      <div className="flex items-center justify-between text-[10.5px]">
        <span className="text-slate-500 dark:text-slate-400 font-medium">الخصم الممنوح:</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            value={posDiscount}
            onChange={e => setPosDiscount && setPosDiscount(e.target.value)}
            className="w-16 h-5 px-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-center text-slate-800 dark:text-white outline-none focus:border-pink-500 shadow-2xs"
            placeholder="0"
          />
          <span className="text-[10px] text-slate-400">{currCode}</span>
        </div>
      </div>

      {/* Net Required Amount (Bold Highlight) */}
      <div className="flex items-center justify-between text-xs font-bold py-1 border-t border-slate-200 dark:border-slate-800/80">
        <span className="text-slate-700 dark:text-slate-200">الصافي المطلوب:</span>
        <span className="font-mono text-[#B0005A] dark:text-pink-400 text-sm font-black tracking-tight">
          {posNetTotal.toLocaleString()} <span className="text-[10px] font-sans font-bold">{currCode}</span>
        </span>
      </div>

      {/* Payment Methods Buttons */}
      <div className="grid grid-cols-3 gap-1 h-7">
        {paymentMethods.map(({ id, label, icon }) => {
          const isSel = posPaymentMethod === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPosPaymentMethod && setPosPaymentMethod(id)}
              className={`rounded-lg text-[10.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                isSel
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-xs scale-[1.02]'
                  : 'bg-white dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Cash Received Field (when Cash is selected) */}
      {posPaymentMethod.includes('نقد') && posNetTotal > 0 && (
        <div className="h-6 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[10.5px] font-bold shadow-2xs">
          <span className="text-slate-500 dark:text-slate-400">المبلغ المستلم:</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={posCashReceived}
              onChange={e => setPosCashReceived && setPosCashReceived(e.target.value)}
              placeholder={posNetTotal.toString()}
              className="w-20 h-4.5 text-center font-mono font-bold text-slate-800 dark:text-white bg-transparent outline-none text-xs"
            />
            <span className="text-[9.5px] text-slate-400">{currCode}</span>
          </div>
        </div>
      )}

      {/* Main Action Button - Prominent High-Visibility POS Checkout CTA */}
      <button
        type="button"
        disabled={cart.length === 0 || isSubmittingPOS}
        onClick={handleCheckoutClick}
        className={`w-full h-11 sm:h-11.5 rounded-xl font-black text-xs sm:text-[13px] shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer select-none ${
          cart.length > 0 && !isSubmittingPOS
            ? 'bg-gradient-to-r from-[#B0005A] via-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-600 text-white shadow-pink-600/30 active:scale-[0.98]'
            : 'bg-slate-200 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-90'
        }`}
      >
        <span className="text-sm sm:text-base">⚡</span>
        <span className="tracking-wide">
          {isSubmittingPOS ? "جاري الاعتماد والطباعة... ⏳" : "اعتماد البيع والطباعة"}
        </span>
        {posNetTotal > 0 && (
          <span className="font-mono text-[11px] bg-black/25 px-2 py-0.5 rounded-md text-white font-black mr-auto">
            {posNetTotal.toLocaleString()} {currCode}
          </span>
        )}
      </button>
    </div>
  );
}

window.POSCartPayment = POSCartPayment;