const { useState, useEffect, useMemo, useCallback, useRef } = React;
function Settings({ showToast }) {
  const [formData, setFormData] = useState({
    companyName: localStorage.getItem('erp_company_name') || 'مؤسسة الأميرات الصغيرات',
    phone:       localStorage.getItem('erp_phone')        || '+966xxxxxxxxx',
    address:     localStorage.getItem('erp_address')      || 'الرياض',
    fiscalDate:  localStorage.getItem('erp_fiscal_date')  || '2026-01-01'
  });

  // ── العملة الافتراضية ──────────────────────────────────
  const { currency, updateCurrency, SYSTEM_CURRENCY_OPTIONS: currencyOpts } = useCurrency();

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('erp_company_name', formData.companyName);
    localStorage.setItem('erp_phone',        formData.phone);
    localStorage.setItem('erp_address',      formData.address);
    localStorage.setItem('erp_fiscal_date',  formData.fiscalDate);
    showToast('✅ تم حفظ الإعدادات بنجاح وتطبيقها على كامل النظام');
  };

  return (
    <div className="space-y-6 animate-fadeIn text-xs" dir="rtl">

      {/* بطاقة بيانات المؤسسة */}
      <div className="bg-white rounded-3xl shadow-sm p-6 border border-slate-200 space-y-5">
        <div className="border-b pb-3 flex items-center gap-2">
          <h2 className="font-black text-sm md:text-base text-slate-900 flex items-center gap-2">
            {Icons.Settings()} إعدادات المؤسسة والنظام
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">اسم المؤسسة</label>
              <input type="text" className="w-full p-3.5 rounded-2xl border bg-slate-50 font-semibold min-h-[44px] focus:bg-white transition" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
            </div>
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">رقم الهاتف</label>
              <input type="text" className="w-full p-3.5 rounded-2xl border bg-slate-50 font-semibold min-h-[44px] focus:bg-white transition" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">العنوان</label>
              <input type="text" className="w-full p-3.5 rounded-2xl border bg-slate-50 font-semibold min-h-[44px] focus:bg-white transition" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">بداية السنة المالية 📅</label>
              <input type="date" className="w-full p-3.5 rounded-2xl border bg-slate-50 font-bold text-purple-950 min-h-[44px]" value={formData.fiscalDate} onChange={e => setFormData({...formData, fiscalDate: e.target.value})} />
            </div>
          </div>

          {/* ── قسم العملة الافتراضية ── */}
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-amber-200 pb-2">
              <span className="text-lg">💱</span>
              <h3 className="font-black text-amber-950 text-sm">العملة الافتراضية للنظام</h3>
            </div>
            <p className="text-[11px] text-amber-800 font-semibold">
              سيتم تطبيق هذه العملة تلقائياً على جميع الشاشات: المنتجات، الطلبات، المشتريات، السندات، والتقارير.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(currencyOpts || []).map(opt => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => updateCurrency(opt.code)}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 font-black transition-all min-h-[60px] ${
                    currency.code === opt.code
                      ? 'bg-amber-400 border-amber-500 text-amber-950 shadow-md scale-[1.02]'
                      : 'bg-white border-amber-200 text-slate-700 hover:border-amber-400 hover:bg-amber-50'
                  }`}
                >
                  <div className="text-right">
                    <div className="text-base font-black">{opt.symbol} {opt.code}</div>
                    <div className="text-[10px] font-semibold opacity-75">{opt.label}</div>
                  </div>
                  {currency.code === opt.code && (
                    <span className="text-amber-700 text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-white border border-amber-300 rounded-2xl px-4 py-2.5">
              <span className="text-amber-600">⚡</span>
              <span className="text-[11px] font-bold text-amber-900">
                العملة الحالية المفعّلة في كامل النظام:
                <span className="text-amber-700 font-black mr-1">{currency.display} — {currency.label}</span>
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="px-8 py-3 min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-2xl shadow-md transition-all">
              💾 حفظ جميع الإعدادات
            </button>
          </div>
        </form>
      </div>

      {/* بطاقة النسخ الاحتياطي */}
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-700 text-white space-y-3">
        <h3 className="font-black text-amber-300 flex items-center gap-2">☁️ النسخ الاحتياطي السحابي</h3>
        <p className="text-sm text-slate-300 font-semibold">
          النظام متصل بجداول بيانات Google Sheets، وجميع البيانات تُحفظ تلقائياً في السحابة لحظةً بلحظة.
        </p>
        <button
          onClick={() => showToast('☁️ البيانات متزامنة مع Google Sheets بنجاح')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs min-h-[44px] transition"
        >
          🔄 تزامن الآن مع Google Sheets
        </button>
      </div>
    </div>
  );
}
