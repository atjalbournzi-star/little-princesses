/**
 * ============================================================================
 * HeaderCurrencySelector.jsx — Quick Multi-Currency Switcher Dropdown
 * Architecture: Modular Header Component | Little Princesses ERP
 * ============================================================================
 */

function HeaderCurrencySelector({ currentCurrency, setCurrentCurrency }) {
  const [currencyDropdown, setCurrencyDropdown] = React.useState(false);

  const currencyOptions = [
    { code: 'YER', symbol: '﷼', label: 'ريال يمني (الأساس)', flag: '🇾🇪', display: 'YER ﷼' },
    { code: 'SAR', symbol: '﷼', label: 'ريال سعودي',        flag: '🇸🇦', display: 'SAR ﷼' },
    { code: 'USD', symbol: '$',  label: 'دولار أمريكي',       flag: '🇺🇸', display: 'USD $' }
  ];

  const handleSelectCurrency = (c) => {
    setCurrencyDropdown(false);
    setCurrentCurrency(c);
    try {
      localStorage.setItem('erp_system_currency', c.code);
    } catch(e) {}
    window.dispatchEvent(new CustomEvent('erp:currencyChanged', { detail: { code: c.code, currency: c } }));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setCurrencyDropdown(!currencyDropdown)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FAFAFB] dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 border border-[#E8E5EA] dark:border-slate-800 text-[#25232A] dark:text-slate-200 text-xs font-bold transition-all shadow-2xs hover:border-[#B0005A] cursor-pointer"
        title="تبديل عملة العرض الرئيسية للنظام (الريال اليمني الأساس / السعودي / الدولار)"
      >
        <span className="text-sm">{currentCurrency.code === 'YER' ? '🇾🇪' : (currentCurrency.code === 'SAR' ? '🇸🇦' : '🇺🇸')}</span>
        <span className="font-mono text-xs">{currentCurrency.code}</span>
        <span className="text-[10px] text-[#6F6B75] dark:text-slate-400">{currentCurrency.symbol}</span>
        <Icons.ChevronDown className="w-3.5 h-3.5 text-[#6F6B75] dark:text-slate-400" />
      </button>

      {currencyDropdown && (
        <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-[#E8E5EA] dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 animate-fadeIn space-y-1 text-right">
          <div className="px-2.5 py-1.5 border-b border-[#E8E5EA] dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-[#6F6B75] dark:text-slate-400">
            <span>عملة عرض النظام</span>
            <span>Currency</span>
          </div>
          {currencyOptions.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => handleSelectCurrency(c)}
              className={`w-full text-right px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                currentCurrency.code === c.code 
                  ? 'bg-[#FCE8F2] dark:bg-purple-950/50 text-[#B0005A] dark:text-purple-300 font-bold border border-[#F2A4CB] dark:border-purple-800' 
                  : 'text-[#25232A] dark:text-slate-200 hover:bg-[#FAFAFB] dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{c.flag}</span>
                <span>{c.label}</span>
              </div>
              {currentCurrency.code === c.code && <span className="text-[11px] font-bold text-[#B0005A] dark:text-purple-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

window.HeaderCurrencySelector = HeaderCurrencySelector;
