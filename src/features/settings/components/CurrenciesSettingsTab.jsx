// src/features/settings/components/CurrenciesSettingsTab.jsx
// تبويب العملات الرسمية وأسعار الصرف المتوافق مع هوية السندات المالية

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
    <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-xs space-y-2 select-none text-right" dir="rtl">
      {/* رأس التبويب الموحد */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="font-bold text-[11.5px] text-slate-800 dark:text-slate-100">
            العملات الرسمية وأسعار الصرف اليومية (Currencies & FX)
          </h3>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="h-6 px-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-md font-medium text-[10.5px] shadow-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
        >
          <span>💾</span>
          <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ أسعار الصرف'}</span>
        </button>
      </div>

      {/* اختيار العملة الافتراضية المفضلة للعرض */}
      <div className="bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-1.5">
        <h4 className="font-bold text-xs text-slate-900 dark:text-white">العملة الافتراضية المفضلة للعرض والمعاملات:</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(fallbackCurrencyOpts || []).map(opt => {
            const isSelected = localCurrency && localCurrency.code === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => updateCurrency(opt.code)}
                className={`flex items-center justify-between h-8 px-2.5 rounded-lg border font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-500 text-pink-700 dark:text-pink-300 ring-1 ring-pink-500/30'
                    : 'bg-white dark:bg-[#111C38] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400'
                }`}
              >
                <div className="text-right">
                  <span className="text-xs font-mono font-bold">{opt.symbol} {opt.code}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mr-1.5">({opt.label})</span>
                </div>
                {isSelected && <span className="text-pink-600 font-bold text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* أسعار الصرف الرسمية المعتمدة مقابل الريال اليمني */}
      <div className="bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-2">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h4 className="font-bold text-xs text-slate-900 dark:text-white">أسعار الصرف الرسمية (مقابل الريال اليمني YER)</h4>
          </div>
          <span className="text-[9.5px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
            1 YER = 1.0 (Base)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-2 bg-white dark:bg-[#111C38] rounded-md border border-slate-200 dark:border-slate-700">
            <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              سعر صرف الريال السعودي (1 SAR = ? YER)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.01"
                value={sarRate}
                onChange={e => setSarRate(e.target.value)}
                className="w-full h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] font-mono font-bold text-xs text-slate-900 dark:text-white outline-none focus:border-pink-500"
              />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">YER ﷼</span>
            </div>
          </div>

          <div className="p-2 bg-white dark:bg-[#111C38] rounded-md border border-slate-200 dark:border-slate-700">
            <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              سعر صرف الدولار الأمريكي (1 USD = ? YER)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.01"
                value={usdRate}
                onChange={e => setUsdRate(e.target.value)}
                className="w-full h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] font-mono font-bold text-xs text-slate-900 dark:text-white outline-none focus:border-pink-500"
              />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">YER ﷼</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            العملة الحالية النشطة في الواجهة:
            <span className="text-pink-600 dark:text-pink-400 font-mono font-bold mr-1.5">
              {localCurrency ? `${localCurrency.display} — ${localCurrency.label}` : 'YER ﷼'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

window.CurrenciesSettingsTab = CurrenciesSettingsTab;
