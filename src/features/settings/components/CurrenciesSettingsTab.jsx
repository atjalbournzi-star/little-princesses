function CurrenciesSettingsTab({
  localCurrency,
  setLocalCurrency,
  fallbackCurrencyOpts,
  sarRate,
  setSarRate,
  usdRate,
  setUsdRate,
  onSave,
  isSaving,
  showToast
}) {
  const updateCurrency = (code) => {
    const found = fallbackCurrencyOpts.find(c => c.code === code);
    if (found) {
      setLocalCurrency(found);
      try {
        localStorage.setItem('erp_system_currency', code);
        window.dispatchEvent(new CustomEvent('erp:currencyChanged', { detail: { code } }));
        showToast && showToast(`تم اعتماد عملة العرض: ${found.code} (${found.symbol}) ✅`);
      } catch(e) {}
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E5EA]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E2F5F7] text-[#007F8C] border border-[#C5ECF0] flex items-center justify-center text-lg font-bold">
            💱
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#25232A]">العملات الرسمية وأسعار الصرف اليومية (Currencies & FX)</h3>
            <p className="text-xs text-[#6F6B75]">الريال اليمني (YER) هو عملة القيد الأساسية للمركز المالي والدفاتر</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="h-10 px-6 bg-[#B0005A] hover:bg-[#8E0049] text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>💾</span>
          <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ أسعار الصرف والعملة'}</span>
        </button>
      </div>

      {/* اختيار العملة الأساسية للنظام */}
      <div className="bg-[#FAFAFB] border border-[#E8E5EA] rounded-2xl p-5 space-y-4">
        <h4 className="font-bold text-xs text-[#25232A]">العملة الافتراضية المفضلة للعرض والمعاملات:</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {(fallbackCurrencyOpts || []).map(opt => {
            const isSelected = localCurrency && localCurrency.code === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => updateCurrency(opt.code)}
                className={`flex items-center justify-between p-4 rounded-xl border font-bold transition-all min-h-[58px] cursor-pointer ${
                  isSelected
                    ? 'bg-[#FCE8F2] border-[#F2A4CB] text-[#B0005A] shadow-xs ring-2 ring-[#FCE8F2]'
                    : 'bg-white border-[#E8E5EA] text-[#25232A] hover:bg-[#FAFAFB]'
                }`}
              >
                <div className="text-right">
                  <div className="text-sm font-bold font-mono">{opt.symbol} {opt.code}</div>
                  <div className="text-[11px] font-semibold text-[#6F6B75]">{opt.label}</div>
                </div>
                {isSelected && <span className="text-[#B0005A] text-base font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* أسعار الصرف الحية مقابل الريال اليمني */}
      <div className="bg-[#FAFAFB] border border-[#E8E5EA] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📈</span>
            <h4 className="font-bold text-xs text-[#25232A]">أسعار الصرف الرسمية المعتمدة (مقابل الريال اليمني YER)</h4>
          </div>
          <span className="text-[10.5px] bg-[#E2F5F7] text-[#007F8C] font-mono font-bold px-2 py-0.5 rounded-md">
            1 YER = 1.0 (Base)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 bg-white rounded-xl border border-[#E8E5EA]">
            <label className="block text-xs font-bold text-[#25232A] mb-1.5">
              سعر صرف الريال السعودي (1 SAR = ? YER)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={sarRate}
                onChange={e => setSarRate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E8E5EA] bg-[#FAFAFB] font-mono font-bold text-xs text-[#8F2A87] outline-none"
              />
              <span className="text-xs font-bold text-[#6F6B75] whitespace-nowrap">YER ﷼</span>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-[#E8E5EA]">
            <label className="block text-xs font-bold text-[#25232A] mb-1.5">
              سعر صرف الدولار الأمريكي (1 USD = ? YER)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={usdRate}
                onChange={e => setUsdRate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E8E5EA] bg-[#FAFAFB] font-mono font-bold text-xs text-[#8F2A87] outline-none"
              />
              <span className="text-xs font-bold text-[#6F6B75] whitespace-nowrap">YER ﷼</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white border border-[#E8E5EA] rounded-xl px-4 py-2.5">
          <span className="text-[#009FAE]">⚡</span>
          <span className="text-xs font-bold text-[#25232A]">
            العملة الحالية النشطة في الواجهة:
            <span className="text-[#B0005A] font-mono font-bold mr-2">
              {localCurrency ? `${localCurrency.display} — ${localCurrency.label}` : 'YER ﷼'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

window.CurrenciesSettingsTab = CurrenciesSettingsTab;
