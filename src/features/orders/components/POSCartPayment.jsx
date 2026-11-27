// src/features/orders/components/POSCartPayment.jsx
// منطقة التحصيل المالي ووسائل الدفع وزر الاعتماد المالي لشاشة نقاط البيع

function POSCartPayment({
  posSubtotal = 0, currCode = "YER", posDiscount = '0', setPosDiscount,
  posGiftWrap = false, setPosGiftWrap, posGiftWrapFee = '0', setPosGiftWrapFee,
  posNetTotal = 0, posPaymentMethod = 'نقد (كاش)', setPosPaymentMethod,
  posCashReceived = '', setPosCashReceived,
  posSplitCash = '', setPosSplitCash, posSplitBank = '', setPosSplitBank,
  cart = [], isSubmittingPOS = false, handleCheckoutClick
}) {
  const paymentMethods = [
    { id: 'نقد (كاش)', label: 'نقد', icon: '💵' },
    { id: 'شبكة / مدى', label: 'شبكة', icon: '💳' },
    { id: 'مقسّم (نقد + بنك)', label: 'مقسّم', icon: '🔀' },
    { id: 'آجل / جزئي', label: 'آجل', icon: '⏱️' }
  ];

  const handleSplitCashChange = (val) => {
    setPosSplitCash && setPosSplitCash(val);
    const num = Math.max(0, Math.min(posNetTotal, parseFloat(val) || 0));
    setPosSplitBank && setPosSplitBank(String(Math.max(0, posNetTotal - num)));
  };

  const handleMethodSelect = (id) => {
    setPosPaymentMethod && setPosPaymentMethod(id);
    if (id === 'آجل / جزئي') setPosCashReceived && setPosCashReceived('');
  };

  const handlePartialPaidChange = (val) => {
    if (!setPosCashReceived) return;
    if (val === '') { setPosCashReceived(''); return; }
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) { setPosCashReceived('0'); return; }
    if (num > posNetTotal) { setPosCashReceived(String(posNetTotal)); return; }
    setPosCashReceived(val);
  };

  const partialPaidNum = posCashReceived === '' ? 0 : Math.max(0, Math.min(posNetTotal, parseFloat(posCashReceived) || 0));
  const partialRemaining = Math.max(0, posNetTotal - partialPaidNum);

  return (
    <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] shrink-0 space-y-1.5 select-none transition-colors">
      <div className="flex items-center justify-between text-[11px] font-medium text-slate-700 dark:text-slate-200">
        <span>المجموع الفرعي:</span>
        <span dir="ltr" className="font-mono text-slate-900 dark:text-white font-bold text-[11px] tabular-nums">
          {posSubtotal.toLocaleString()} {currCode}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="flex items-center justify-between bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-700 rounded-md px-1.5 h-6">
          <span className="text-slate-600 dark:text-slate-300 font-bold">خصم:</span>
          <input
            type="number" min="0" value={posDiscount} dir="ltr"
            onChange={e => setPosDiscount && setPosDiscount(e.target.value)}
            className="w-14 h-5 bg-transparent text-[10.5px] font-mono font-bold text-center text-slate-900 dark:text-white outline-none tabular-nums"
          />
        </div>
        <div className={`flex items-center justify-between border rounded-md px-1.5 h-6 transition ${posGiftWrap ? 'bg-pink-50 dark:bg-pink-950/30 border-pink-300 dark:border-pink-800' : 'bg-white dark:bg-[#111C38] border-slate-200 dark:border-slate-700'}`}>
          <label className="flex items-center gap-1 cursor-pointer text-slate-700 dark:text-slate-200 font-bold">
            <input type="checkbox" checked={posGiftWrap} onChange={e => setPosGiftWrap && setPosGiftWrap(e.target.checked)} className="accent-pink-600 w-3 h-3" />
            <span>🎁 تغليف</span>
          </label>
          {posGiftWrap && (
            <input
              type="number" min="0" value={posGiftWrapFee} dir="ltr" placeholder="0"
              onChange={e => setPosGiftWrapFee && setPosGiftWrapFee(e.target.value)}
              className="w-12 h-5 bg-transparent text-[10.5px] font-mono font-bold text-center text-pink-700 dark:text-pink-300 outline-none tabular-nums erp-slide-down"
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-pink-50/80 dark:bg-pink-950/40 border border-pink-200/90 dark:border-pink-900/60 shadow-2xs">
        <span className="text-[11.5px] font-bold text-pink-950 dark:text-pink-200">الصافي المطلوب:</span>
        <span dir="ltr" className="font-mono text-[#B0005A] dark:text-pink-300 text-[13px] font-black tracking-tight tabular-nums flex items-baseline gap-1">
          {posNetTotal.toLocaleString()} <span className="text-[10px] font-sans font-bold text-pink-600 dark:text-pink-400">{currCode}</span>
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1 h-6.5">
        {paymentMethods.map(({ id, label, icon }) => {
          const isSel = posPaymentMethod === id;
          return (
            <button
              key={id} type="button" onClick={() => handleMethodSelect(id)}
              className={`rounded-md text-[10px] font-medium transition cursor-pointer flex items-center justify-center gap-0.5 ${
                isSel
                  ? 'bg-pink-600 text-white shadow-xs font-bold'
                  : 'bg-white dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span className="text-[11px]">{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {posPaymentMethod === 'مقسّم (نقد + بنك)' && posNetTotal > 0 && (
        <div className="grid grid-cols-2 gap-1.5 text-[10px] erp-slide-down">
          <div className="h-6 px-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-slate-500">نقد:</span>
            <input type="number" min="0" dir="ltr" value={posSplitCash} onChange={e => handleSplitCashChange(e.target.value)}
              className="w-16 h-5 text-center font-mono font-bold text-slate-800 dark:text-white bg-transparent outline-none tabular-nums" />
          </div>
          <div className="h-6 px-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-slate-500">بنك:</span>
            <input type="number" min="0" dir="ltr" value={posSplitBank} onChange={e => setPosSplitBank && setPosSplitBank(e.target.value)}
              className="w-16 h-5 text-center font-mono font-bold text-slate-800 dark:text-white bg-transparent outline-none tabular-nums" />
          </div>
        </div>
      )}

      {posPaymentMethod === 'آجل / جزئي' && posNetTotal > 0 && (
        <div className="p-2 rounded-lg bg-amber-50/75 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1 text-[10.5px] erp-slide-down">
          <label className="block text-amber-900 dark:text-amber-200 font-bold text-[10px]">
            المبلغ المستلم مقدماً (اختياري — 0 للآجل الكامل)
          </label>
          <div className="h-6.5 px-2 rounded-md bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-700 flex items-center justify-between">
            <input
              type="number" min="0" max={posNetTotal} step="any"
              value={posCashReceived} dir="ltr" placeholder="0"
              onChange={e => handlePartialPaidChange(e.target.value)}
              className="w-full h-5 text-left font-mono font-bold text-slate-900 dark:text-white bg-transparent outline-none text-[11px] tabular-nums"
            />
            <span className="text-[9.5px] text-slate-400 mr-1 shrink-0">{currCode}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] pt-0.5">
            <span className="text-amber-800 dark:text-amber-300 font-semibold">المتبقي (ذمة على العميل):</span>
            <span dir="ltr" className="font-mono font-extrabold text-[#B0005A] dark:text-rose-400 tabular-nums">
              {partialRemaining.toLocaleString('en-US')} {currCode}
            </span>
          </div>
        </div>
      )}

      {(posPaymentMethod.includes('نقد') && posPaymentMethod !== 'مقسّم (نقد + بنك)') && posNetTotal > 0 && (
        <div className="h-6 px-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[10.5px] font-medium shadow-2xs">
          <span className="text-slate-500 dark:text-slate-400">المبلغ المستلم:</span>
          <div className="flex items-center gap-1">
            <input
              type="number" value={posCashReceived} dir="ltr"
              onChange={e => setPosCashReceived && setPosCashReceived(e.target.value)}
              className="w-20 h-4.5 text-center font-mono font-bold text-slate-800 dark:text-white bg-transparent outline-none text-[11px] tabular-nums"
            />
            <span className="text-[9.5px] text-slate-400">{currCode}</span>
          </div>
        </div>
      )}

      <button
        type="button" disabled={cart.length === 0 || isSubmittingPOS} onClick={handleCheckoutClick}
        className={`w-full h-9 rounded-lg font-bold text-[12px] shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none active:scale-[0.98] ${
          cart.length > 0 && !isSubmittingPOS
            ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 hover:from-pink-500 hover:to-rose-600 text-white shadow-pink-600/30 ring-1 ring-pink-500/50'
            : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-80'
        }`}
      >
        <span className="text-sm">⚡</span>
        <span className="tracking-wide">{isSubmittingPOS ? "جاري الاعتماد والطباعة... ⏳" : "اعتماد البيع والطباعة"}</span>
        {posNetTotal > 0 && (
          <span dir="ltr" className="font-mono text-[10.5px] bg-black/25 px-1.5 py-0.5 rounded text-white font-bold mr-auto tabular-nums">
            {posNetTotal.toLocaleString()} {currCode}
          </span>
        )}
      </button>
    </div>
  );
}

window.POSCartPayment = POSCartPayment;