// src/features/settings/components/CompanyProfileTab.jsx
// تبويب الهوية المؤسسية والبيانات الرسمية والمظهر المتوافق مع هوية السندات المالية

function CompanyProfileTab({
  formData,
  setFormData,
  themeMode,
  applyTheme,
  onSave,
  isSaving,
  showToast
}) {
  const inputCls = "w-full h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B132B] text-slate-900 dark:text-white text-[11px] font-medium placeholder:text-slate-400 focus:border-pink-500 transition-all outline-none";
  const labelCls = "block text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5";

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, logoUrl: event.target.result }));
      showToast && showToast('تم اختيار شعار المنشأة بنجاح 🖼️');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden select-none text-right" dir="rtl">
      {/* رأس البطاقة الموحد مع هوية السندات المالية */}
      <div className="h-8 px-2.5 bg-slate-50 dark:bg-[#0B132B] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h2 className="text-[11.5px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>الهوية الرسمية والبيانات المؤسسية</span>
            <span className="text-[9.5px] bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 font-bold px-1.5 py-0.2 rounded border border-pink-200 dark:border-pink-800/60">
              Brand & Profile
            </span>
          </h2>
        </div>
      </div>

      <form onSubmit={onSave} className="p-2.5 space-y-2">
        {/* بطاقة البيانات الرسمية والقانونية */}
        <div className="bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-2">
          <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
            <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            <span>البيانات القانونية ومطبوعات الفواتير</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <label className={labelCls}>اسم المنشأة الرسمي *</label>
              <input type="text" required className={inputCls} value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} placeholder="دار الأميرات الصغيرات" />
            </div>
            <div>
              <label className={labelCls}>الاسم المختصر للنظام *</label>
              <input type="text" required className={inputCls} value={formData.shortName} onChange={e => setFormData({...formData, shortName: e.target.value})} placeholder="Little Princesses" />
            </div>
            <div>
              <label className={labelCls}>الشعار اللفظي / النشاط</label>
              <input type="text" className={inputCls} value={formData.tagline} onChange={e => setFormData({...formData, tagline: e.target.value})} placeholder="أزياء وفساتين راقية للأميرات" />
            </div>
            <div>
              <label className={labelCls}>رقم السجل التجاري / الضريبي</label>
              <input type="text" className={inputCls + " font-mono tabular-nums"} value={formData.commercialRegister} onChange={e => setFormData({...formData, commercialRegister: e.target.value})} placeholder="1010-009283" dir="ltr" style={{textAlign:'right'}} />
            </div>
            <div>
              <label className={labelCls}>رقم الهاتف الرسمي *</label>
              <input type="text" required className={inputCls + " font-mono tabular-nums"} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="776773458" dir="ltr" style={{textAlign:'right'}} />
            </div>
            <div>
              <label className={labelCls}>العنوان / المقر الرئيسي *</label>
              <input type="text" required className={inputCls} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="اليمن - صنعاء" />
            </div>
            <div>
              <label className={labelCls}>البريد الإلكتروني الرسمي</label>
              <input type="email" className={inputCls + " font-mono tabular-nums"} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="info@littleprincesses.com" dir="ltr" style={{textAlign:'right'}} />
            </div>
            <div>
              <label className={labelCls}>بداية السنة المالية (0-9) *</label>
              <input type="date" lang="en-US" dir="ltr" required className={inputCls + " font-mono tabular-nums"} value={formData.fiscalDate} onChange={e => setFormData({...formData, fiscalDate: e.target.value})} />
            </div>
          </div>

          {/* شعار المنشأة واللوجو */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className={labelCls}>شعار المنشأة (Company Logo)</label>
            <div className="flex flex-col sm:flex-row items-center gap-2 bg-white dark:bg-[#111C38] p-2 rounded-md border border-slate-200 dark:border-slate-700">
              <div className="w-9 h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                {formData.logoUrl ? (
                  <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
                ) : (
                  <span className="text-base">🏢</span>
                )}
              </div>
              <div className="flex-1 w-full flex flex-col sm:flex-row items-center gap-1.5">
                <input
                  type="text"
                  value={formData.logoUrl}
                  onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="رابط الشعار URL أو اختر صورة من جهازك..."
                  className={inputCls}
                />
                <label className="h-7 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-medium text-[10.5px] flex items-center justify-center gap-1 cursor-pointer transition shrink-0 whitespace-nowrap">
                  <span>📁 صورة</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                {formData.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logoUrl: '' })}
                    className="h-7 px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-md text-[10.5px] font-medium transition shrink-0 cursor-pointer"
                  >
                    إزالة
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* محرك المظهر والنمط المدمج */}
        <div className="bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <span>مظهر ونمط النظام</span>
            </h3>
            <span className="text-[10px] bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 font-bold px-2 py-0.5 rounded border border-pink-200 dark:border-pink-800/60">
              {themeMode === 'dark' ? 'الوضع المظلم نشط' : 'الوضع الفاتح نشط'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              onClick={() => applyTheme('light')}
              className={`p-2.5 rounded-lg border cursor-pointer transition ${
                themeMode === 'light' ? 'border-pink-500 bg-white ring-1 ring-pink-500/40 shadow-xs' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C38] hover:border-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[11px] text-slate-900 dark:text-white flex items-center gap-1.5">الوضع الفاتح (Light Theme)</span>
                {themeMode === 'light' && <span className="text-pink-600 font-bold text-xs">✓</span>}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">الخلفيات البيضاء والرمادية الفاتحة مع لمسات المارون والوردي الفاخر.</p>
            </div>

            <div
              onClick={() => applyTheme('dark')}
              className={`p-2.5 rounded-lg border cursor-pointer transition ${
                themeMode === 'dark' ? 'border-pink-500 bg-[#111C38] text-white ring-1 ring-pink-500/40 shadow-xs' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C38] text-slate-700 dark:text-slate-300 hover:border-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[11px] text-slate-900 dark:text-white flex items-center gap-1.5">الوضع المظلم (Dark Theme)</span>
                {themeMode === 'dark' && <span className="text-pink-400 font-bold text-xs">✓</span>}
              </div>
              <p className="text-[10px] text-slate-400">نمط داكن كحلي عالي التباين (#111C38 / #0F172A) مطابق لشاشة السندات المالية.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSaving}
            className="h-7.5 px-4 rounded-md font-bold text-xs text-white bg-pink-600 hover:bg-pink-700 shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>💾</span>
            <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ بيانات المنشأة والمظهر'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

window.CompanyProfileTab = CompanyProfileTab;
