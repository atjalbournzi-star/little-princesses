// src/features/customers/components/CustomerFinancialLedgerBar.jsx
// شريط المؤشرات المالية الثلاثية (إجمالي، عربون، متبقي) وطريقة دفع التوصيل

function CustomerFinancialLedgerBar({
  totalSales, handleTotalChange,
  deposit, setDeposit,
  delivery, handleDeliveryChange,
  deliveryPaymentMode, handleModeChange,
  voucherCurr, setVoucherCurr,
  payMethod, setPayMethod,
  remaining, inputCls, labelCls
}) {
  const metricInputCls = "w-28 min-w-[110px] h-8 px-2 text-center font-bold text-xs text-white bg-slate-900 border border-slate-700 rounded-lg overflow-visible focus:border-pink-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const standardInputCls = "w-28 min-w-[110px] h-8 px-2 text-center font-bold text-xs text-white bg-slate-900 border border-slate-700 rounded-lg overflow-visible focus:border-pink-500 outline-none transition-all cursor-pointer";
  const barLabelCls = "block text-[10px] font-semibold text-slate-300 mb-0.5 text-center select-none";

  return (
    <div className="p-2.5 bg-[#0B132B] rounded-xl border border-slate-800 space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* 1. إجمالي الطلب */}
        <div className="flex flex-col items-center flex-1 min-w-[110px]">
          <label className={barLabelCls}>إجمالي الطلب</label>
          <input type="number" step="0.01" value={totalSales} onChange={e => handleTotalChange(e.target.value)} className={metricInputCls} placeholder="0.00" />
        </div>
        {/* 2. العربون المستلم */}
        <div className="flex flex-col items-center flex-1 min-w-[110px]">
          <label className={barLabelCls}>العربون المستلم</label>
          <input type="number" step="0.01" value={deposit} onChange={e => setDeposit(e.target.value)} className={metricInputCls} placeholder="0.00" />
        </div>
        {/* 3. كلفة التوصيل */}
        <div className="flex flex-col items-center flex-1 min-w-[110px]">
          <label className={barLabelCls}>كلفة التوصيل</label>
          <input type="number" step="0.01" value={delivery} onChange={e => handleDeliveryChange(e.target.value)} className={standardInputCls} placeholder="0.00" />
        </div>
        {/* 4. العملة */}
        <div className="flex flex-col items-center flex-1 min-w-[110px]">
          <label className={barLabelCls}>العملة</label>
          <select value={voucherCurr} onChange={e => setVoucherCurr(e.target.value)} className={standardInputCls}>
            {['YER', 'SAR', 'USD'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {/* 5. طريقة الدفع */}
        <div className="flex flex-col items-center flex-1 min-w-[110px]">
          <label className={barLabelCls}>طريقة الدفع</label>
          <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className={standardInputCls}>
            {['نقد (كاش)', 'حوالة بنكية', 'آجل (على الحساب)', 'تحويل إلكتروني'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {/* 6. المتبقي */}
        <div className="col-span-2 sm:col-span-1 flex flex-col items-center flex-1 min-w-[110px]">
          <label className={barLabelCls}>المتبقي</label>
          <div className={`w-28 min-w-[110px] h-8 px-2 rounded-lg border font-mono font-bold text-xs flex items-center justify-center whitespace-nowrap overflow-visible ${parseFloat(remaining) > 0 ? 'bg-amber-950/40 border-amber-700/60 text-amber-300' : 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'}`}>
            {remaining} {voucherCurr}
          </div>
        </div>
      </div>

      {/* أزرار اختيار نمط دفع كلفة التوصيل */}
      <div className="flex items-center justify-between flex-wrap gap-1.5 pt-1.5 border-t border-slate-800 text-[10.5px]">
        <span className="font-semibold text-slate-400">
          طريقة سداد كلفة التوصيل ({delivery || '0'} {voucherCurr}):
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleModeChange('DIRECT_TO_COURIER')}
            className={`h-6 px-2.5 rounded-full text-[10.5px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              deliveryPaymentMode === 'DIRECT_TO_COURIER'
                ? 'bg-cyan-600 text-white border-cyan-500 shadow-xs'
                : 'bg-[#0F172A] text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            <span>🚚 للموصل عند الباب</span>
            <span className="text-[9.5px] opacity-75">(مباشرة)</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('PREPAID_VIA_ATELIER')}
            className={`h-6 px-2.5 rounded-full text-[10.5px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              deliveryPaymentMode === 'PREPAID_VIA_ATELIER'
                ? 'bg-pink-600 text-white border-pink-500 shadow-xs'
                : 'bg-[#0F172A] text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            <span>💳 محصلة للمتجر بحوالة</span>
            <span className="text-[9.5px] opacity-75">(مسبقاً)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

window.CustomerFinancialLedgerBar = CustomerFinancialLedgerBar;
