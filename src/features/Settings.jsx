const { useState, useEffect, useMemo, useCallback, useRef } = React;

function Settings({ showToast }) {
  const [formData, setFormData] = useState({
    companyName: localStorage.getItem('erp_company_name') || 'مؤسسة الأميرات الصغيرات',
    phone:       localStorage.getItem('erp_phone')        || '776773458',
    address:     localStorage.getItem('erp_address')      || 'اليمن صنعاء',
    fiscalDate:  localStorage.getItem('erp_fiscal_date')  || '2026-01-01',
    email:       localStorage.getItem('erp_email')        || 'info@littleprincesses.com'
  });

  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('lp_theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  });

  const [sarRate, setSarRate] = useState(() => {
    return window.CurrencyService ? window.CurrencyService.getRate('SAR') : 142.0;
  });

  const [usdRate, setUsdRate] = useState(() => {
    return window.CurrencyService ? window.CurrencyService.getRate('USD') : 535.0;
  });

  const [isSaving, setIsSaving] = useState(false);

  // ── حالات محرك النسخ الاحتياطي واستعادة البيانات ──
  const [backupStatus, setBackupStatus]             = useState(null);
  const [loadingBackup, setLoadingBackup]           = useState(false);
  const [backupFileContent, setBackupFileContent]   = useState(null);
  const [selectedFileName, setSelectedFileName]     = useState('');
  const [isRestoring, setIsRestoring]               = useState(false);
  const fileInputRef = useRef(null);

  // ── التبويب النشط (Navigation Tabs) ──
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'audit' | 'backup'

  // ── حالات سجلات تدقيق الأمان والعمليات (Audit Logs) ──
  const [auditLogs, setAuditLogs]                 = useState([]);
  const [totalLogs, setTotalLogs]                 = useState(0);
  const [loadingAudit, setLoadingAudit]           = useState(false);
  const [auditFilter, setAuditFilter]             = useState({ action: '', entity_type: '', search: '' });
  const [selectedAuditLog, setSelectedAuditLog]   = useState(null);

  const fallbackCurrencyOpts = useMemo(() => [
    { code: 'YER', symbol: '﷼', label: 'ريال يمني (Base)', display: 'YER ﷼', is_base: true },
    { code: 'SAR', symbol: '﷼', label: 'ريال سعودي',        display: 'SAR ﷼', is_base: false },
    { code: 'USD', symbol: '$',  label: 'دولار أمريكي',      display: 'USD $', is_base: false }
  ], []);

  const [localCurrency, setLocalCurrency] = useState(() => {
    try {
      const stored = localStorage.getItem('erp_system_currency');
      return fallbackCurrencyOpts.find(c => c.code === stored) || fallbackCurrencyOpts[0];
    } catch(e) {
      return fallbackCurrencyOpts[0];
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

  // Apply Theme Function
  const applyTheme = (mode) => {
    setThemeMode(mode);
    try {
      localStorage.setItem('lp_theme', mode);
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
        document.body && document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body && document.body.classList.remove('dark');
      }
      window.dispatchEvent(new CustomEvent('lp:themeChanged', { detail: { theme: mode } }));
    } catch(e) {}
  };

  // Load server settings on mount
  useEffect(() => {
    let isMounted = true;
    const fetchServerSettings = async () => {
      if (window.settingsAPI && window.settingsAPI.getSettings) {
        try {
          const res = await window.settingsAPI.getSettings();
          if (isMounted && res && res.success) {
            if (res.company) {
              setFormData(prev => ({
                ...prev,
                companyName: res.company.company_name || prev.companyName,
                phone: res.company.phone || prev.phone,
                address: res.company.address || prev.address,
                fiscalDate: res.company.fiscal_date || prev.fiscalDate,
                email: res.company.email || prev.email
              }));
              if (res.company.theme_mode) {
                applyTheme(res.company.theme_mode);
              }
            }
            if (res.currency && res.currency.rates) {
              if (res.currency.rates.SAR) setSarRate(res.currency.rates.SAR);
              if (res.currency.rates.USD) setUsdRate(res.currency.rates.USD);
            }
          }
        } catch(e) {}
      }
    };
    fetchServerSettings();

    const handleExternalTheme = (e) => {
      if (e.detail && e.detail.theme) {
        setThemeMode(e.detail.theme);
      }
    };
    window.addEventListener('lp:themeChanged', handleExternalTheme);
    return () => {
      isMounted = false;
      window.removeEventListener('lp:themeChanged', handleExternalTheme);
    };
  }, []);

  // ── جلب حالة النسخ الاحتياطي ──
  const fetchBackupStatus = useCallback(async () => {
    if (window.backupAPI && window.backupAPI.getStatus) {
      try {
        const res = await window.backupAPI.getStatus();
        if (res && res.success) {
          setBackupStatus(res);
        }
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    fetchBackupStatus();
  }, [fetchBackupStatus]);

  // ── جلب سجلات تدقيق الأمان والعمليات ──
  const fetchAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      if (window.auditAPI && window.auditAPI.getLogs) {
        const params = {};
        if (auditFilter.action) params.action = auditFilter.action;
        if (auditFilter.entity_type) params.entity_type = auditFilter.entity_type;
        if (auditFilter.search) params.search = auditFilter.search;
        const res = await window.auditAPI.getLogs(params);
        if (res && res.success) {
          setAuditLogs(res.logs || []);
          setTotalLogs(res.total || 0);
        }
      }
    } catch(e) {
    } finally {
      setLoadingAudit(false);
    }
  }, [auditFilter]);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs]);

  // ── إنشاء نقطة استعادة فورية (Snapshot) ──
  const handleCreateSnapshot = async () => {
    setLoadingBackup(true);
    try {
      if (window.backupAPI && window.backupAPI.createSnapshot) {
        const res = await window.backupAPI.createSnapshot();
        if (res && res.success) {
          showToast && showToast(res.message || 'تم حفظ نقطة الاستعادة بنجاح 📸💾');
          await fetchBackupStatus();
        } else {
          showToast && showToast(res.message || 'فشل حفظ نقطة الاستعادة', 'error');
        }
      }
    } catch(err) {
      showToast && showToast('تعذر الاتصال بالخادم لإنشاء النسخة', 'error');
    } finally {
      setLoadingBackup(false);
    }
  };

  // ── تنزيل ملف النسخة الاحتياطية ──
  const handleDownloadBackup = (format = 'json') => {
    window.open(`/api/backup/export?format=${format}`, '_blank');
    showToast && showToast(`بدأ تنزيل ملف النسخة الاحتياطية (${format.toUpperCase()}) 💾📥`);
  };

  // ── معالجة رفع ملف النسخة الاحتياطية للتحليل ──
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.tables || parsed.data) {
          setBackupFileContent(parsed);
          showToast && showToast(`تمت قراءة وفحص ملف النسخة الاحتياطية بنجاح (${file.name}) 📄✅`);
        } else {
          showToast && showToast('تنسيق ملف النسخة الاحتياطية غير متطابق ⚠️', 'error');
          setBackupFileContent(null);
        }
      } catch(err) {
        showToast && showToast('فشل قراءة الملف (الملف ليس بصيغة JSON صالحة) ⚠️', 'error');
        setBackupFileContent(null);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // ── تنفيذ استعادة البيانات ──
  const handleExecuteRestore = async () => {
    if (!backupFileContent) {
      return showToast && showToast('يرجى اختيار ملف نسخة احتياطية صالح أولاً ⚠️', 'error');
    }

    const confirmAction = window.confirm('⚠️ تنبيه أمني هام:\nهل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم تحديث وإعادة بناء الجداول المحاسبية والتشغيلية بالسجلات المحفوظة في هذا الملف.');
    if (!confirmAction) return;

    setIsRestoring(true);
    try {
      if (window.backupAPI && window.backupAPI.restoreBackup) {
        const res = await window.backupAPI.restoreBackup(backupFileContent);
        if (res && res.success) {
          showToast && showToast(res.message || 'تمت استعادة البيانات بنجاح 👑🔄', 'success');
          setBackupFileContent(null);
          setSelectedFileName('');
          if (fileInputRef.current) fileInputRef.current.value = '';
          await fetchBackupStatus();
        } else {
          showToast && showToast(res.message || 'فشلت عملية الاستعادة', 'error');
        }
      }
    } catch(err) {
      showToast && showToast('خطأ أثناء إرسال بيانات الاستعادة للخادم', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      localStorage.setItem('erp_company_name', formData.companyName);
      localStorage.setItem('erp_phone',        formData.phone);
      localStorage.setItem('erp_address',      formData.address);
      localStorage.setItem('erp_fiscal_date',  formData.fiscalDate);
      localStorage.setItem('erp_email',        formData.email);
      localStorage.setItem('lp_theme',         themeMode);

      if (window.CurrencyService) {
        if (parseFloat(sarRate) > 0) window.CurrencyService.setRate('SAR', parseFloat(sarRate));
        if (parseFloat(usdRate) > 0) window.CurrencyService.setRate('USD', parseFloat(usdRate));
      }

      const payload = {
        company_name: formData.companyName,
        phone: formData.phone,
        address: formData.address,
        fiscal_date: formData.fiscalDate,
        email: formData.email,
        theme_mode: themeMode,
        base_currency: currency ? currency.code : 'YER',
        rates: {
          YER: 1.0,
          SAR: parseFloat(sarRate) || 142.0,
          USD: parseFloat(usdRate) || 535.0
        }
      };

      if (window.settingsAPI && window.settingsAPI.saveSettings) {
        const res = await window.settingsAPI.saveSettings(payload);
        if (res && res.message) {
          if (showToast) showToast(res.message);
        } else {
          if (showToast) showToast('✅ تم حفظ الإعدادات وأسعار الصرف والمظهر بنجاح 👑');
        }
      } else {
        if (showToast) showToast('✅ تم حفظ الإعدادات بنجاح وتطبيقها على كامل النظام 👑');
      }
    } catch(err) {
      if (showToast) showToast('تم الحفظ محلياً ⚡', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#B0005A] focus:ring-2 focus:ring-[#FCE8F2] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">

      {/* ── شريط التبويبات العلوي المتطور (Tabs Bar) ── */}
      <div className="flex items-center gap-2 p-1.5 bg-[#FAFAFB] border border-[#E8E5EA] rounded-2xl overflow-x-auto shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'general'
              ? 'bg-white text-[#B0005A] shadow-xs border border-[#F2A4CB]'
              : 'text-[#6F6B75] hover:text-[#25232A] hover:bg-white/60'
          }`}
        >
          <span>⚙️</span>
          <span>إعدادات المؤسسة والمظهر والعملات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-white text-[#B0005A] shadow-xs border border-[#F2A4CB]'
              : 'text-[#6F6B75] hover:text-[#25232A] hover:bg-white/60'
          }`}
        >
          <span>🛡️</span>
          <span>سجلات تدقيق الأمان والعمليات (Audit Logs)</span>
          {totalLogs > 0 && (
            <span className="text-[10px] bg-[#FCE8F2] text-[#B0005A] font-mono px-2 py-0.5 rounded-full font-bold">
              {totalLogs}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-white text-[#B0005A] shadow-xs border border-[#F2A4CB]'
              : 'text-[#6F6B75] hover:text-[#25232A] hover:bg-white/60'
          }`}
        >
          <span>💾</span>
          <span>النسخ الاحتياطي واستعادة البيانات (Backup & DR)</span>
          {backupStatus && (
            <span className="text-[10px] bg-[#E2F5F7] text-[#007F8C] font-mono px-2 py-0.5 rounded-full font-bold">
              {backupStatus.db_size_formatted || 'Cloud'}
            </span>
          )}
        </button>
      </div>

      {/* ── تبويب إعدادات المؤسسة والمظهر والعملات ── */}
      {activeTab === 'general' && (
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
              <p className="text-[11px] text-[#6F6B75] font-medium">البيانات التعريفية، تهيئة العملة المعتمدة، أسعار الصرف، ومظهر النظام</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 1. Profile fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4.5">
            <div>
              <label className={labelCls}>اسم المؤسسة / المتجر *</label>
              <input type="text" required className={inputCls} value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} placeholder="مؤسسة الأميرات الصغيرات" />
            </div>
            <div>
              <label className={labelCls}>رقم الهاتف الرسمي *</label>
              <input type="text" required className={inputCls + " font-mono"} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="776773458" dir="ltr" style={{textAlign:'right'}} />
            </div>
            <div>
              <label className={labelCls}>العنوان / المقر الرئيسي *</label>
              <input type="text" required className={inputCls} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="اليمن صنعاء" />
            </div>
            <div>
              <label className={labelCls}>بداية السنة المالية *</label>
              <input type="date" lang="en-GB" dir="ltr" required className={inputCls} value={formData.fiscalDate} onChange={e => setFormData({...formData, fiscalDate: e.target.value})} />
            </div>
          </div>

          {/* ── 2. محرك المظهر والوضع المظلم والفاتح (Global Theme Engine) ── */}
          <div className="bg-[#FAFAFB] border border-[#E8E5EA] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🎨</span>
                <div>
                  <h3 className="font-bold text-[#25232A] text-sm">مظهر ونمط النظام (Theme & Appearance)</h3>
                  <p className="text-[11px] text-[#6F6B75] font-medium">
                    التبديل بين النمط الفاتح الأنيق والنمط الداكن الليلي عالي التباين
                  </p>
                </div>
              </div>
              <span className="text-xs bg-[#FCE8F2] text-[#B0005A] font-bold px-2.5 py-1 rounded-lg border border-[#F2A4CB]">
                {themeMode === 'dark' ? 'الوضع المظلم نشط 🌙' : 'الوضع الفاتح نشط ☀️'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* بطاقة الوضع الفاتح */}
              <div
                onClick={() => applyTheme('light')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  themeMode === 'light'
                    ? 'border-[#B0005A] bg-white ring-2 ring-[#FCE8F2] shadow-sm'
                    : 'border-[#E8E5EA] bg-white hover:border-[#F2A4CB]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#25232A]">
                    <span className="text-lg">☀️</span>
                    <span>الوضع الفاتح (Light Theme)</span>
                  </div>
                  {themeMode === 'light' && (
                    <span className="w-5 h-5 rounded-full bg-[#B0005A] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                  )}
                </div>
                <div className="h-14 rounded-lg bg-[#FAFAFB] border border-[#E8E5EA] p-2 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-white border border-[#E8E5EA] shadow-2xs"></div>
                  <div className="flex-1 space-y-1.5">
                    <div className="w-3/4 h-2 rounded bg-[#E8E5EA]"></div>
                    <div className="w-1/2 h-2 rounded bg-[#FCE8F2]"></div>
                  </div>
                </div>
                <p className="text-[10.5px] text-[#6F6B75] mt-2">الخلفيات البيضاء والرمادية الفاتحة مع لمسات المارون والوردي الفاخر.</p>
              </div>

              {/* بطاقة الوضع المظلم */}
              <div
                onClick={() => applyTheme('dark')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  themeMode === 'dark'
                    ? 'border-[#B0005A] bg-[#0f172a] text-white ring-2 ring-[#8F2A87] shadow-sm'
                    : 'border-[#334155] bg-[#1e293b] text-slate-200 hover:border-[#8F2A87]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 font-bold text-xs text-white">
                    <span className="text-lg">🌙</span>
                    <span>الوضع المظلم (Dark Theme)</span>
                  </div>
                  {themeMode === 'dark' && (
                    <span className="w-5 h-5 rounded-full bg-[#B0005A] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                  )}
                </div>
                <div className="h-14 rounded-lg bg-[#0f172a] border border-[#334155] p-2 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-[#1e293b] border border-[#334155]"></div>
                  <div className="flex-1 space-y-1.5">
                    <div className="w-3/4 h-2 rounded bg-[#334155]"></div>
                    <div className="w-1/2 h-2 rounded bg-[#B0005A]"></div>
                  </div>
                </div>
                <p className="text-[10.5px] text-slate-400 mt-2">نمط داكن كحلي عالي التباين (#0f172a / #1e293b) مريح للعين أثناء العمل الليلي.</p>
              </div>
            </div>
          </div>

          {/* ── 3. قسم العملة الافتراضية للنظام وأسعار الصرف ── */}
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
                      value={sarRate}
                      onChange={e => setSarRate(e.target.value)}
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
                      value={usdRate}
                      onChange={e => setUsdRate(e.target.value)}
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
            <button
              type="submit"
              disabled={isSaving}
              className="h-11 px-8 rounded-xl font-bold text-xs text-white bg-[#B0005A] hover:bg-[#8E0049] shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>💾</span>
              <span>{isSaving ? 'جارٍ الحفظ والتطبيق...' : 'حفظ وتطبيق الإعدادات والمظهر فورياً'}</span>
            </button>
          </div>
        </form>
      </div>
      )}

      {/* ── تبويب سجلات تدقيق الأمان والعمليات (Audit Logs Tab) ── */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden space-y-5 p-6 animate-fadeIn">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E5EA]">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#FCE8F2] text-[#B0005A] border border-[#F2A4CB] flex items-center justify-center text-xl font-bold shadow-2xs">
                🛡️
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#25232A] flex items-center gap-2">
                  سجلات تدقيق الأمان والعمليات
                  <span className="text-[10px] bg-[#FCE8F2] text-[#B0005A] font-mono font-bold px-2 py-0.5 rounded-full border border-[#F2A4CB]">
                    Security Audit Logs
                  </span>
                </h3>
                <p className="text-xs text-[#6F6B75] mt-0.5">
                  رصد وتتبع كافة عمليات التعديل، الإضافة، الحذف، والنسخ الاحتياطي في قاعدة بيانات PostgreSQL 17 Cloud
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchAuditLogs}
                disabled={loadingAudit}
                className="px-4 py-2 bg-white hover:bg-[#FAFAFB] text-[#25232A] border border-[#E8E5EA] rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <span>🔄</span>
                <span>{loadingAudit ? 'جارٍ التحديث...' : 'تحديث السجلات'}</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#FAFAFB] border border-[#E8E5EA] p-3.5 rounded-xl">
            <div className="flex-1 w-full">
              <input
                type="text"
                value={auditFilter.search}
                onChange={e => setAuditFilter(prev => ({ ...prev, search: e.target.value }))}
                placeholder="بحث بالمستخدم، رقم السجل، أو نوع الإجراء..."
                className="w-full h-10 px-3.5 rounded-lg border border-[#E8E5EA] bg-white text-xs text-[#25232A] outline-none focus:border-[#B0005A]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={auditFilter.action}
                onChange={e => setAuditFilter(prev => ({ ...prev, action: e.target.value }))}
                className="h-10 px-3 rounded-lg border border-[#E8E5EA] bg-white text-xs font-bold text-[#25232A] outline-none cursor-pointer"
              >
                <option value="">جميع الإجراءات (All Actions)</option>
                <option value="CREATE">إنشاء (CREATE)</option>
                <option value="UPDATE">تعديل (UPDATE)</option>
                <option value="DELETE">حذف (DELETE)</option>
                <option value="SNAPSHOT">نسخ احتياطي (SNAPSHOT)</option>
                <option value="RESTORE">استعادة (RESTORE)</option>
                <option value="LOGIN">تسجيل دخول (LOGIN)</option>
              </select>

              <select
                value={auditFilter.entity_type}
                onChange={e => setAuditFilter(prev => ({ ...prev, entity_type: e.target.value }))}
                className="h-10 px-3 rounded-lg border border-[#E8E5EA] bg-white text-xs font-bold text-[#25232A] outline-none cursor-pointer"
              >
                <option value="">كافة الكيانات (All Entities)</option>
                <option value="SETTINGS">إعدادات النظام (SETTINGS)</option>
                <option value="BACKUP">النسخ الاحتياطي (BACKUP)</option>
                <option value="ORDERS">المبيعات والطلبات (ORDERS)</option>
                <option value="EXPENSES">المصروفات (EXPENSES)</option>
                <option value="PAYMENTS">السندات والمدفوعات (PAYMENTS)</option>
                <option value="JOURNAL">القيود اليومية (JOURNAL)</option>
                <option value="HR">الموظفين والرواتب (HR)</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="px-3.5 py-3 text-right">#</th>
                  <th className="px-3.5 py-3 text-right">الوقت والتاريخ</th>
                  <th className="px-3.5 py-3 text-right">نوع الإجراء</th>
                  <th className="px-3.5 py-3 text-right">الكيان والهدف</th>
                  <th className="px-3.5 py-3 text-right">المستخدم</th>
                  <th className="px-3.5 py-3 text-right">عنوان IP</th>
                  <th className="px-3.5 py-3 text-center">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-[#6F6B75]">
                      {loadingAudit ? 'جارٍ تحميل سجلات التدقيق الأمني...' : 'لا توجد سجلات تدقيق مطابقة للشروط الحالية.'}
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => {
                    let actionBadgeCls = 'bg-slate-100 text-slate-700 border-slate-200';
                    const act = (log.action || '').toUpperCase();
                    if (act.includes('CREATE') || act.includes('ADD')) actionBadgeCls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    else if (act.includes('UPDATE') || act.includes('EDIT')) actionBadgeCls = 'bg-blue-50 text-blue-700 border-blue-200';
                    else if (act.includes('DELETE') || act.includes('REMOVE')) actionBadgeCls = 'bg-rose-50 text-rose-700 border-rose-200';
                    else if (act.includes('SNAPSHOT')) actionBadgeCls = 'bg-purple-50 text-purple-700 border-purple-200';
                    else if (act.includes('RESTORE')) actionBadgeCls = 'bg-amber-50 text-amber-700 border-amber-200';

                    return (
                      <tr key={log.id} className="hover:bg-[#FAFAFB] transition-colors">
                        <td className="px-3.5 py-3 font-mono font-bold text-[#6F6B75]">{log.id}</td>
                        <td className="px-3.5 py-3 font-mono text-[#25232A]" dir="ltr" style={{textAlign: 'right'}}>
                          {log.created_at || log.timestamp}
                        </td>
                        <td className="px-3.5 py-3 font-bold">
                          <span className={`px-2.5 py-1 rounded-md text-[10.5px] font-mono border ${actionBadgeCls}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="font-bold text-[#25232A]">{log.entity_type}</div>
                          <div className="font-mono text-[10.5px] text-[#6F6B75]">{log.entity_id}</div>
                        </td>
                        <td className="px-3.5 py-3 font-bold text-[#8F2A87]">{log.user_id || 'System'}</td>
                        <td className="px-3.5 py-3 font-mono text-[11px] text-[#6F6B75]">{log.ip_address || '127.0.0.1'}</td>
                        <td className="px-3.5 py-3 text-center">
                          {(log.new_values || log.old_values) ? (
                            <button
                              type="button"
                              onClick={() => setSelectedAuditLog(log)}
                              className="px-2.5 py-1 rounded-lg bg-[#FCE8F2] hover:bg-[#F2A4CB] text-[#B0005A] text-[11px] font-bold transition cursor-pointer"
                            >
                              عرض البيانات 🔍
                            </button>
                          ) : (
                            <span className="text-[#A29EA7] text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Details Modal */}
          {selectedAuditLog && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-[#E8E5EA] shadow-xl">
                <div className="px-6 py-4 border-b border-[#E8E5EA] flex items-center justify-between bg-[#FAFAFB]">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#25232A]">
                    <span>🛡️</span>
                    <span>تفاصيل حركة التدقيق #{selectedAuditLog.id} — {selectedAuditLog.entity_type}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAuditLog(null)}
                    className="w-8 h-8 rounded-lg bg-white border border-[#E8E5EA] text-[#6F6B75] hover:text-[#25232A] flex items-center justify-center font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-[#FAFAFB] rounded-xl border border-[#E8E5EA]">
                    <div><span className="text-[#6F6B75]">المستخدم: </span><strong>{selectedAuditLog.user_id}</strong></div>
                    <div><span className="text-[#6F6B75]">عنوان IP: </span><span className="font-mono">{selectedAuditLog.ip_address}</span></div>
                    <div><span className="text-[#6F6B75]">التاريخ: </span><span className="font-mono">{selectedAuditLog.created_at}</span></div>
                    <div><span className="text-[#6F6B75]">الإجراء: </span><span className="font-bold text-[#B0005A]">{selectedAuditLog.action}</span></div>
                  </div>

                  {selectedAuditLog.old_values && (
                    <div>
                      <h5 className="font-bold text-rose-700 mb-1">القيم السابقة (Old Values):</h5>
                      <pre className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 font-mono text-[11px] overflow-x-auto" dir="ltr">
                        {JSON.stringify(selectedAuditLog.old_values, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedAuditLog.new_values && (
                    <div>
                      <h5 className="font-bold text-emerald-700 mb-1">القيم الجديدة (New Values):</h5>
                      <pre className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono text-[11px] overflow-x-auto" dir="ltr">
                        {JSON.stringify(selectedAuditLog.new_values, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="px-6 py-3 border-t border-[#E8E5EA] bg-[#FAFAFB] flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedAuditLog(null)}
                    className="px-5 py-2 bg-[#25232A] text-white rounded-xl text-xs font-bold hover:bg-black transition cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── تبويب النسخ الاحتياطي واستعادة البيانات والكوارث ── */}
      {activeTab === 'backup' && (
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden space-y-6 p-6">
        
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E5EA]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#E2F5F7] text-[#007F8C] border border-[#C5ECF0] flex items-center justify-center text-xl font-bold shadow-2xs">
              💾
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#25232A] flex items-center gap-2">
                محرك النسخ الاحتياطي الشامل واستعادة البيانات والكوارث
                <span className="text-[10px] bg-[#E2F5F7] text-[#007F8C] font-mono font-bold px-2 py-0.5 rounded-full border border-[#C5ECF0]">
                  Backup & DR Engine
                </span>
              </h3>
              <p className="text-xs text-[#6F6B75] mt-0.5">
                تأمين بيانات الفساتين والعملاء والمحاسبة، تصدير ملفات SQLite و JSON، وإنشاء نقاط استعادة سحابية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreateSnapshot}
              disabled={loadingBackup}
              className="px-4 py-2.5 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>📸</span>
              <span>{loadingBackup ? 'جارٍ الإنشاء...' : 'نقطة استعادة فورية (Snapshot)'}</span>
            </button>
            <button
              type="button"
              onClick={fetchBackupStatus}
              title="تحديث الحالة"
              className="w-10 h-10 rounded-xl bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] border border-[#E8E5EA] flex items-center justify-center transition cursor-pointer"
            >
              🔄
            </button>
          </div>
        </div>

        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA]">
            <span className="text-[11px] font-bold text-[#6F6B75] block mb-1">حجم قاعدة البيانات الحالية</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-mono font-extrabold text-[#25232A]">
                {backupStatus?.db_size_formatted || '0.0 KB'}
              </span>
              <span className="text-xs text-[#007F8C] bg-[#E2F5F7] px-2 py-0.5 rounded-md font-mono font-bold border border-[#C5ECF0]">
                SQLite WAL
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA]">
            <span className="text-[11px] font-bold text-[#6F6B75] block mb-1">إجمالي السجلات والبيانات المحمية</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-mono font-extrabold text-[#B0005A]">
                {backupStatus?.total_records?.toLocaleString('en-US') || 0}
              </span>
              <span className="text-xs text-[#6F6B75] font-medium">سجل موزعة في 17 جدول</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA]">
            <span className="text-[11px] font-bold text-[#6F6B75] block mb-1">فحص سلامة وتطابق الجداول</span>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {backupStatus?.integrity_check === 'PASSED' ? 'سليمة ومتطابقة 100% (Passed)' : 'فحص الجداول جاهز'}
              </span>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                100% OK
              </span>
            </div>
          </div>
        </div>

        {/* Section: أزرار التصدير والتنزيل السريع */}
        <div className="bg-[#FAFAFB] border border-[#E8E5EA] rounded-2xl p-5 space-y-3">
          <h4 className="font-bold text-xs text-[#25232A] flex items-center gap-2">
            <span>📥</span>
            <span>تصدير وتنزيل النسخ الاحتياطية لجهازك (Export & Download):</span>
          </h4>
          <p className="text-[11px] text-[#6F6B75]">
            يمكنك تنزيل نسخة احتياطية كاملة والاحتفاظ بها على جهاز الكمبيوتر أو نقلها لأي سيرفر آخر:
          </p>
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <button
              type="button"
              onClick={() => handleDownloadBackup('json')}
              className="h-11 px-5 bg-white hover:bg-[#FCE8F2] text-[#B0005A] border border-[#F2A4CB] rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-2 cursor-pointer"
            >
              <span>💾</span>
              <span>تنزيل نسخة احتياطية كاملة (JSON File)</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadBackup('sqlite')}
              className="h-11 px-5 bg-white hover:bg-[#E2F5F7] text-[#007F8C] border border-[#C5ECF0] rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-2 cursor-pointer"
            >
              <span>🗄️</span>
              <span>تنزيل قاعدة البيانات الأصلية (SQLite .db)</span>
            </button>
          </div>
        </div>

        {/* Section: استعادة البيانات وإعادة البناء (Disaster Recovery & Restore Zone) */}
        <div className="bg-[#FFF5F8] border border-[#F2A4CB] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🔄</span>
            <div>
              <h4 className="font-extrabold text-xs text-[#B0005A]">
                محرك استعادة البيانات وإعادة بناء الجداول (Disaster Recovery)
              </h4>
              <p className="text-[11px] text-[#6F6B75] mt-0.5">
                قم برفع ملف نسخة احتياطية (.json) لاستعادة كافة السجلات المحاسبية والعملاء والطلبات بضغطة زر واحدة
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#E8E5EA] rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="text-xs text-[#6F6B75] file:mr-0 file:ml-3 file:py-2 file:px-4 file:rounded-xl file:border file:border-[#E8E5EA] file:text-xs file:font-bold file:bg-[#FAFAFB] file:text-[#25232A] hover:file:bg-[#F2E7F3] cursor-pointer"
              />
              {selectedFileName && (
                <span className="text-xs font-mono font-bold text-[#8F2A87] bg-[#F2E7F3] border border-[#E5CEE7] px-3 py-1.5 rounded-lg">
                  📄 {selectedFileName}
                </span>
              )}
            </div>

            {backupFileContent && (
              <div className="p-3 bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-[#25232A] font-bold">
                  <span>تم فحص الملف وتجهيزه للاستعادة:</span>
                  <span className="text-emerald-700 font-mono">
                    {Object.keys(backupFileContent.tables || {}).length} جدول مالي وتشغيلي
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Object.entries(backupFileContent.tables || {}).map(([tName, rows]) => (
                    <span key={tName} className="text-[10px] bg-white border border-[#E8E5EA] px-2 py-0.5 rounded-md font-mono">
                      {tName}: <strong>{Array.isArray(rows) ? rows.length : 0}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={!backupFileContent || isRestoring}
                className="h-11 px-8 bg-[#B0005A] hover:bg-[#8E0049] text-white rounded-xl font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <span>🔄</span>
                <span>{isRestoring ? 'جارٍ استعادة البيانات وإعادة البناء...' : 'تأكيد واستعادة النسخة الاحتياطية الآن ⚡'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section: سجل نقاط الاستعادة السابقة المحفوظة على السيرفر */}
        {backupStatus?.snapshots && backupStatus.snapshots.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-xs text-[#25232A] flex items-center gap-2">
              <span>🕒</span>
              <span>نقاط الاستعادة المحفوظة على الخادم ({backupStatus.snapshots.length} نسخة):</span>
            </h4>
            <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                    <th className="px-4 py-2.5 text-right">اسم ملف النسخة</th>
                    <th className="px-4 py-2.5 text-right">النوع</th>
                    <th className="px-4 py-2.5 text-right">حجم الملف</th>
                    <th className="px-4 py-2.5 text-right">تاريخ وساعة الإنشاء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E5EA] bg-white">
                  {backupStatus.snapshots.map((s, idx) => (
                    <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="px-4 py-2.5 font-mono font-bold text-[#8F2A87]">{s.filename}</td>
                      <td className="px-4 py-2.5 font-bold">
                        <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-mono ${
                          s.type === 'json' ? 'bg-[#FCE8F2] text-[#B0005A] border border-[#F2A4CB]' : 'bg-[#E2F5F7] text-[#007F8C] border border-[#C5ECF0]'
                        }`}>
                          {s.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[#25232A]">{s.size_formatted}</td>
                      <td className="px-4 py-2.5 font-mono text-[#6F6B75]">{s.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
      )}
    </div>
  );
}
