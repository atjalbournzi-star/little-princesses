// src/features/customers/components/CustomerFinancialLedgerBar.jsx
// شريط المؤشرات المالية الثلاثية (إجمالي، عربون، متبقي) وطريقة الدفع والحساب المالي المقابل

function CustomerFinancialLedgerBar({
  totalSales, handleTotalChange,
  deposit, setDeposit,
  delivery, handleDeliveryChange,
  deliveryPaymentMode, handleModeChange,
  voucherCurr, setVoucherCurr,
  payMethod, setPayMethod,
  selectedAccount, setSelectedAccount,
  remaining, isReadOnly = false
}) {
  const metricInputCls = "w-28 min-w-[110px] min-h-[38px] h-9 px-2 py-1 text-center font-bold text-[12.5px] leading-normal text-white bg-slate-900 border border-slate-700 rounded-lg overflow-visible focus:border-pink-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const standardInputCls = "w-28 min-w-[110px] min-h-[38px] h-9 px-2 py-1 text-center font-bold text-xs text-white bg-slate-900 border border-slate-700 rounded-lg overflow-visible focus:border-pink-500 outline-none transition-all cursor-pointer";
  const readOnlyBoxCls = "w-28 min-w-[110px] min-h-[38px] h-9 px-2 py-1 text-center font-mono font-bold text-[12.5px] leading-normal text-slate-200 bg-slate-900/90 border border-slate-700 rounded-lg flex items-center justify-center overflow-visible";
  const barLabelCls = "block text-[10.5px] font-semibold text-slate-300 mb-1 text-center select-none";

  const [dbAccounts, setDbAccounts] = React.useState([]);
  React.useEffect(() => {
    fetch('/api/accounts?is_postable=true&is_active=true').then(r => r.json()).then(d => {
      const list = Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : []);
      if (list.length) setDbAccounts(list);
    }).catch(() => {});
  }, []);

  const filteredAccounts = React.useMemo(() => {
    const isBank = ['حوالة بنكية', 'تحويل إلكتروني'].includes(payMethod);
    const postable = dbAccounts.filter(a => a.is_postable !== false && a.is_active !== false);
    if (isBank) {
      const banks = postable.filter(a => a.account_category === 'Banks' || String(a.account_code).startsWith('102') || (a.account_name || '').includes('بنك') || (a.account_name || '').includes('كريمي') || (a.account_name || '').includes('محفظ'));
      return banks.length ? banks : postable;
    }
    const cashList = postable.filter(a => a.account_category === 'Cash' || String(a.account_code).startsWith('101') || (a.account_name || '').includes('صندوق'));
    const currMatch = cashList.filter(a => (a.currency || 'YER').toUpperCase() === (voucherCurr || 'YER').toUpperCase());
    return currMatch.length ? currMatch : cashList;
  }, [dbAccounts, payMethod, voucherCurr]);

  React.useEffect(() => {
    if (filteredAccounts.length > 0 && (!selectedAccount || !filteredAccounts.some(a => a.id === selectedAccount))) {
      setSelectedAccount && setSelectedAccount(filteredAccounts[0].id);
    }
  }, [filteredAccounts, selectedAccount]);

  const activeAccountObj = filteredAccounts.find(a => a.id === selectedAccount) || filteredAccounts[0];

  return (
    <div className="p-2.5 bg-[#0B132B] rounded-xl border border-slate-800 space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        {/* 1. إجمالي الطلب */}
        <div className="flex flex-col items-center flex-1 min-w-[100px]">
          <label className={barLabelCls}>إجمالي الطلب {isReadOnly && '🔒'}</label>
          {isReadOnly ? (
            <div className={readOnlyBoxCls}>{Number(totalSales || 0).toLocaleString()} {voucherCurr}</div>
          ) : (
            <input type="number" step="0.01" value={totalSales} onChange={e => handleTotalChange(e.target.value)} className={metricInputCls} />
          )}
        </div>
        {/* 2. العربون المستلم */}
        <div className="flex flex-col items-center flex-1 min-w-[100px]">
          <label className={barLabelCls}>إجمالي المدفوع {isReadOnly && '🔒'}</label>
          {isReadOnly ? (
            <div className={readOnlyBoxCls + " text-emerald-400"}>{Number(deposit || 0).toLocaleString()} {voucherCurr}</div>
          ) : (
            <input type="number" step="0.01" value={deposit} onChange={e => setDeposit(e.target.value)} className={metricInputCls} />
          )}
        </div>
        {/* 3. كلفة التوصيل */}
        <div className="flex flex-col items-center flex-1 min-w-[100px]">
          <label className={barLabelCls}>كلفة التوصيل {isReadOnly && '🔒'}</label>
          {isReadOnly ? (
            <div className={readOnlyBoxCls}>{Number(delivery || 0).toLocaleString()} {voucherCurr}</div>
          ) : (
            <input type="number" step="0.01" value={delivery} onChange={e => handleDeliveryChange(e.target.value)} className={standardInputCls} />
          )}
        </div>
        {/* 4. العملة */}
        <div className="flex flex-col items-center flex-1 min-w-[90px]">
          <label className={barLabelCls}>العملة</label>
          {isReadOnly ? (
            <div className={readOnlyBoxCls}>{voucherCurr}</div>
          ) : (
            <select value={voucherCurr} onChange={e => setVoucherCurr(e.target.value)} className={standardInputCls}>
              {['YER', 'SAR', 'USD'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
        {/* 5. طريقة الدفع */}
        <div className="flex flex-col items-center flex-1 min-w-[105px]">
          <label className={barLabelCls}>طريقة الدفع</label>
          {isReadOnly ? (
            <div className={readOnlyBoxCls + " text-[11px]"}>{payMethod}</div>
          ) : (
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className={standardInputCls}>
              {['نقد (كاش)', 'حوالة بنكية', 'آجل (على الحساب)', 'تحويل إلكتروني'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </div>
        {/* 6. الحساب المالي المقابل */}
        <div className="flex flex-col items-center flex-1 min-w-[125px]">
          <label className={barLabelCls}>الحساب المقابل</label>
          {isReadOnly ? (
            <div className={readOnlyBoxCls + " text-[10px] truncate"} title={activeAccountObj?.account_name}>{activeAccountObj?.account_name || 'حساب الصندوق'}</div>
          ) : (
            <select value={selectedAccount || activeAccountObj?.id || ''} onChange={e => setSelectedAccount && setSelectedAccount(e.target.value)} className={standardInputCls + " text-[10.5px] w-32 truncate"}>
              {filteredAccounts.map(a => (
                <option key={a.id} value={a.id}>{a.account_name} ({a.currency || voucherCurr})</option>
              ))}
            </select>
          )}
        </div>
        {/* 7. المتبقي */}
        <div className="col-span-2 sm:col-span-1 flex flex-col items-center flex-1 min-w-[100px]">
          <label className={barLabelCls}>المتبقي ⚖️</label>
          <div className={`w-28 min-w-[100px] min-h-[38px] h-9 px-2 py-1 rounded-lg border font-mono font-bold text-[12.5px] leading-normal flex items-center justify-center whitespace-nowrap overflow-visible ${parseFloat(remaining) > 0 ? 'bg-amber-950/40 border-amber-700/60 text-amber-300' : 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'}`}>
            {Number(remaining || 0).toLocaleString()} {voucherCurr}
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
