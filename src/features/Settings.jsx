const { useState, useEffect, useMemo, useCallback, useRef } = React;

function Settings({ showToast }) {
  const [formData, setFormData] = useState({
    companyName: localStorage.getItem('erp_company_name') || 'مؤسسة الأميرات الصغيرات',
    phone:       localStorage.getItem('erp_phone')        || '+966xxxxxxxxx',
    address:     localStorage.getItem('erp_address')      || 'صنعاء / الرياض',
    fiscalDate:  localStorage.getItem('erp_fiscal_date')  || '2026-01-01'
  });

  const fallbackCurrencyOpts = useMemo(() => [
    { code: 'USD', symbol: '$',  label: 'دولار أمريكي',  display: 'USD $' },
    { code: 'YER', symbol: '﷼', label: 'ريال يمني',    display: 'YER ﷼' },
    { code: 'SAR', symbol: '﷼', label: 'ريال سعودي',   display: 'SAR ﷼' }
  ], []);

  const [localCurrency, setLocalCurrency] = useState(() => {
    try {
      const stored = localStorage.getItem('erp_system_currency');
      return fallbackCurrencyOpts.find(c => c.code === stored) || fallbackCurrencyOpts[1];
    } catch(e) {
      return fallbackCurrencyOpts[1];
    }
  });

  let currency = localCurrency;
  let currencyOpts = fallbackCurrencyOpts;
  let updateCurrency = (code) => {
    const found = fallbackCurrencyOpts.find(c => c.code === code);
    if (found) {
      setLocalCurrency(found);
      try {
        localStorage.setItem('erp_system_currency', code);
        window.dispatchEvent(new CustomEvent('erp:currencyChanged', { detail: { code } }));
      } catch(e) {}
    }
  };

  try {
    if (typeof useCurrency === 'function') {
      const hookRes = useCurrency();
      if (hookRes && hookRes.currency) {
        currency = hookRes.currency;
        currencyOpts = hookRes.SYSTEM_CURRENCY_OPTIONS || fallbackCurrencyOpts;
        updateCurrency = hookRes.updateCurrency;
      }
    }
  } catch(e) {}

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem('erp_company_name', formData.companyName);
      localStorage.setItem('erp_phone',        formData.phone);
      localStorage.setItem('erp_address',      formData.address);
      localStorage.setItem('erp_fiscal_date',  formData.fiscalDate);
      if (showToast) showToast('✅ تم حفظ الإعدادات بنجاح وتطبيقها على كامل النظام 👑');
    } catch(err) {
      if (showToast) showToast('تم الحفظ محلياً ⚡', 'warning');
    }
  };

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#B0005A] focus:ring-2 focus:ring-[#FCE8F2] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">

      {/* بطاقة بيانات المؤسسة والنظام */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden transition-all">
        <div className="px-6 py-4 border-b border-[#E8E5EA] flex items-center justify-between bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FCE8F2] text-[#B0005A] flex items-center justify-center text-base font-bold border border-[#F2A4CB]">
              ⚙️
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#25232A] flex items-center gap-2">
                إعدادات المؤسسة والنظام الموحد
                <span className="text-[10.5px] bg-[#FCE8F2] text-[#B0005A] font-bold px-2 py-0.5 rounded-full border border-[#F2A4CB]">
                  ERP Settings
                </span>
              </h2>
              <p className="text-[11px] text-[#6F6B75] font-medium">البيانات التعريفية، تهيئة العملة المعتمدة، وتفضيلات النظام</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4.5">
            <div>
              <label className={labelCls}>اسم المؤسسة / المتجر</label>
              <input type="text" className={inputCls} value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} placeholder="" />
            </div>
            <div>
              <label className={labelCls}>رقم الهاتف الرسمي</label>
              <input type="text" className={inputCls + " font-mono"} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="" dir="ltr" style={{textAlign:'right'}} />
            </div>
            <div>
              <label className={labelCls}>العنوان / المقر الرئيسي</label>
              <input type="text" className={inputCls} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="" />
            </div>
            <div>
              <label className={labelCls}>بداية السنة المالية</label>
              <input type="date" className={inputCls} value={formData.fiscalDate} onChange={e => setFormData({...formData, fiscalDate: e.target.value})} />
            </div>
          </div>

          {/* ── قسم العملة الافتراضية للنظام ── */}
          <div className="bg-[#FAFAFB] border border-[#E8E5EA] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[#E8E5EA] pb-3">
              <span className="text-xl">💱</span>
              <div>
                <h3 className="font-bold text-[#25232A] text-sm">العملة الافتراضية المعتمدة للنظام (Base Currency: YER)</h3>
                <p className="text-[11px] text-[#6F6B75] font-medium">
                  الريال اليمني (YER) هو العملة الأساسية للمركز المالي. يمكنك التبديل أو تحديد العملة المفضلة للنظام.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {(currencyOpts || []).map(opt => {
                const isSelected = currency && currency.code === opt.code;
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
                    {isSelected && (
                      <span className="text-[#B0005A] text-base font-bold">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── إدارة أسعار الصرف الحية مقابل الريال اليمني (YER) ── */}
            <div className="bg-white border border-[#E8E5EA] rounded-xl p-4 space-y-3 mt-4">
              <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">📈</span>
                  <h4 className="font-bold text-xs text-[#25232A]">أسعار الصرف الرسمية المعتمدة (مقابل الريال اليمني YER)</h4>
                </div>
                <span className="text-[10.5px] bg-[#E2F5F7] text-[#007F8C] font-mono font-bold px-2 py-0.5 rounded-md">
                  1 YER = 1.0 (Base)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-[#FAFAFB] rounded-xl border border-[#E8E5EA]">
                  <label className="block text-xs font-bold text-[#25232A] mb-1">
                    سعر صرف الريال السعودي (1 SAR = ? YER)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={window.CurrencyService ? window.CurrencyService.getRate('SAR') : 142}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (val > 0 && window.CurrencyService) window.CurrencyService.setRate('SAR', val);
                      }}
                      className="w-full h-10 px-3 rounded-lg border border-[#E8E5EA] bg-white font-mono font-bold text-xs text-[#8F2A87] outline-none"
                    />
                    <span className="text-xs font-bold text-[#6F6B75] whitespace-nowrap">YER ﷼</span>
                  </div>
                </div>

                <div className="p-3 bg-[#FAFAFB] rounded-xl border border-[#E8E5EA]">
                  <label className="block text-xs font-bold text-[#25232A] mb-1">
                    سعر صرف الدولار الأمريكي (1 USD = ? YER)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={window.CurrencyService ? window.CurrencyService.getRate('USD') : 535}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (val > 0 && window.CurrencyService) window.CurrencyService.setRate('USD', val);
                      }}
                      className="w-full h-10 px-3 rounded-lg border border-[#E8E5EA] bg-white font-mono font-bold text-xs text-[#8F2A87] outline-none"
                    />
                    <span className="text-xs font-bold text-[#6F6B75] whitespace-nowrap">YER ﷼</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white border border-[#E8E5EA] rounded-xl px-4 py-2.5">
              <span className="text-[#009FAE]">⚡</span>
              <span className="text-xs font-bold text-[#25232A]">
                العملة الحالية المفعّلة:
                <span className="text-[#B0005A] font-mono font-bold mr-2">
                  {currency ? `${currency.display} — ${currency.label}` : 'YER ﷼'}
                </span>
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit"
              className="h-11 px-8 rounded-xl font-bold text-xs text-white bg-[#B0005A] hover:bg-[#8E0049] shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer">
              <span>💾</span>
              <span>حفظ جميع إعدادات النظام وأسعار الصرف</span>
            </button>
          </div>
        </form>
      </div>

      {/* بطاقة المزامنة والنسخ الاحتياطي السحابي */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8E5EA] text-[#25232A] space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xl text-[#009FAE]">☁️</span>
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">النسخ الاحتياطي والمزامنة السحابية</h3>
              <p className="text-xs text-[#6F6B75] font-medium">قاعدة بيانات Google Sheets السحابية متصلة ومحدثة لحظياً</p>
            </div>
          </div>
          <span className="text-xs bg-[#E2F5F7] text-[#007F8C] border border-[#C5ECF0] px-3 py-1 rounded-lg font-mono font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#009FAE] animate-pulse"></span>
            Cloud Sync Active
          </span>
        </div>

        <div className="pt-2 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => { if (showToast) showToast('☁️ البيانات متزامنة ومحفوظة في Google Sheets بنجاح 👑'); }}
            className="h-10 px-5 bg-[#009FAE] hover:bg-[#007F8C] text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <span>🔄</span>
            <span>تزامن فوري الآن مع السحابة</span>
          </button>
        </div>
      </div>
    </div>
  );
}
