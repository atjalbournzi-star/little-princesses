function CompanyProfileTab({
  formData,
  setFormData,
  themeMode,
  applyTheme,
  onSave,
  isSaving,
  showToast
}) {
  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#B0005A] focus:ring-2 focus:ring-[#FCE8F2] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

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
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E8E5EA] flex items-center justify-between bg-gradient-to-r from-white via-[#FAFAFB] to-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FCE8F2] text-[#B0005A] flex items-center justify-center text-base font-bold border border-[#F2A4CB]">
            🏢
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#25232A] flex items-center gap-2">
              الهوية الرسمية والبيانات المؤسسية
              <span className="text-[10.5px] bg-[#FCE8F2] text-[#B0005A] font-bold px-2 py-0.5 rounded-full border border-[#F2A4CB]">
                Brand & Profile
              </span>
            </h2>
            <p className="text-[11px] text-[#6F6B75] font-medium">البيانات التعريفية، السجل التجاري، الشعار، ومظهر النظام</p>
          </div>
        </div>
      </div>

      <form onSubmit={onSave} className="p-6 space-y-6">
        {/* بطاقة البيانات الرسمية */}
        <div className="bg-[#FAFAFB] border border-[#E8E5EA] rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-[#25232A] text-xs flex items-center gap-2 border-b border-[#E8E5EA] pb-3">
            <span>🏛️</span>
            <span>البيانات القانونية ومطبوعات الفواتير</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>اسم المنشأة / الشركة الرسمي *</label>
              <input type="text" required className={inputCls} value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} placeholder="دار الأميرات الصغيرات" />
            </div>
            <div>
              <label className={labelCls}>الاسم المختصر للنظام (Short Name) *</label>
              <input type="text" required className={inputCls} value={formData.shortName} onChange={e => setFormData({...formData, shortName: e.target.value})} placeholder="Little Princesses" />
            </div>
            <div>
              <label className={labelCls}>الشعار اللفظي / النشاط (Tagline)</label>
              <input type="text" className={inputCls} value={formData.tagline} onChange={e => setFormData({...formData, tagline: e.target.value})} placeholder="أزياء وفساتين راقية للأميرات" />
            </div>
            <div>
              <label className={labelCls}>رقم السجل التجاري / الضريبي</label>
              <input type="text" className={inputCls + " font-mono"} value={formData.commercialRegister} onChange={e => setFormData({...formData, commercialRegister: e.target.value})} placeholder="1010-009283" dir="ltr" style={{textAlign:'right'}} />
            </div>
            <div>
              <label className={labelCls}>رقم الهاتف الرسمي *</label>
              <input type="text" required className={inputCls + " font-mono"} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="776773458" dir="ltr" style={{textAlign:'right'}} />
            </div>
            <div>
              <label className={labelCls}>العنوان / المقر الرئيسي *</label>
              <input type="text" required className={inputCls} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="اليمن - صنعاء" />
            </div>
            <div>
              <label className={labelCls}>البريد الإلكتروني الرسمي</label>
              <input type="email" className={inputCls + " font-mono"} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="info@littleprincesses.com" dir="ltr" style={{textAlign:'right'}} />
            </div>
            <div>
              <label className={labelCls}>بداية السنة المالية *</label>
              <input type="date" lang="en-GB" dir="ltr" required className={inputCls} value={formData.fiscalDate} onChange={e => setFormData({...formData, fiscalDate: e.target.value})} />
            </div>
          </div>

          {/* الشعار واللوجو */}
          <div className="pt-3 border-t border-[#E8E5EA]">
            <label className={labelCls}>شعار المنشأة (Company Logo)</label>
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-[#E8E5EA]">
              <div className="w-14 h-14 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                {formData.logoUrl ? (
                  <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-2xl">🏢</span>
                )}
              </div>
              <div className="flex-1 w-full space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={formData.logoUrl}
                    onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="رابط الشعار URL أو اختر صورة من جهازك..."
                    className={inputCls}
                  />
                  <label className="h-11 px-4 bg-[#FAFAFB] hover:bg-[#F2E7F3] border border-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition shrink-0 whitespace-nowrap">
                    <span>📁 اختيار صورة</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logoUrl: '' })}
                      className="h-11 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
                    >
                      إزالة
                    </button>
                  )}
                </div>
                <p className="text-[10.5px] text-[#6F6B75]">يظهر هذا الشعار تلقائياً في شريط القائمة الجانبي، الترويسة، وسندات الطباعة وفواتير المبيعات.</p>
              </div>
            </div>
          </div>
        </div>

        {/* محرك المظهر والنمط (Theme & Appearance) */}
        <div className="bg-[#FAFAFB] border border-[#E8E5EA] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
            <h3 className="font-bold text-[#25232A] text-xs flex items-center gap-2">
              <span>🎨</span>
              <span>مظهر ونمط النظام (Theme & Appearance)</span>
            </h3>
            <span className="text-xs bg-[#FCE8F2] text-[#B0005A] font-bold px-2.5 py-1 rounded-lg border border-[#F2A4CB]">
              {themeMode === 'dark' ? 'الوضع المظلم نشط 🌙' : 'الوضع الفاتح نشط ☀️'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => applyTheme('light')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                themeMode === 'light' ? 'border-[#B0005A] bg-white ring-2 ring-[#FCE8F2] shadow-sm' : 'border-[#E8E5EA] bg-white hover:border-[#F2A4CB]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-[#25232A] flex items-center gap-2">☀️ الوضع الفاتح (Light Theme)</span>
                {themeMode === 'light' && <span className="text-[#B0005A] font-bold">✓</span>}
              </div>
              <p className="text-[10.5px] text-[#6F6B75]">الخلفيات البيضاء والرمادية الفاتحة مع لمسات المارون والوردي الفاخر.</p>
            </div>

            <div
              onClick={() => applyTheme('dark')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                themeMode === 'dark' ? 'border-[#B0005A] bg-[#0f172a] text-white ring-2 ring-[#8F2A87] shadow-sm' : 'border-[#334155] bg-[#1e293b] text-slate-200 hover:border-[#8F2A87]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs flex items-center gap-2">🌙 الوضع المظلم (Dark Theme)</span>
                {themeMode === 'dark' && <span className="text-[#B0005A] font-bold">✓</span>}
              </div>
              <p className="text-[10.5px] text-slate-400">نمط داكن كحلي عالي التباين (#0f172a / #1e293b) مريح للعين أثناء العمل الليلي.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="h-11 px-8 rounded-xl font-bold text-xs text-white bg-[#B0005A] hover:bg-[#8E0049] shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>💾</span>
            <span>{isSaving ? 'جارٍ الحفظ والتطبيق...' : 'حفظ بيانات المنشأة والمظهر فورياً'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

window.CompanyProfileTab = CompanyProfileTab;
