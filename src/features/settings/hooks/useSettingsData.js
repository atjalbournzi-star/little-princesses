const { useState, useEffect, useMemo, useCallback } = React;

function useSettingsData({ showToast }) {
  const initialProfile = (typeof window !== 'undefined' && window.BrandService)
    ? window.BrandService.getProfile()
    : {
        name: 'نظام الإدارة المتكامل الذكي',
        shortName: 'ERP Master',
        tagline: 'نظام تخطيط موارد المؤسسات المتكامل',
        commercialRegister: '1010-009283',
        phone: '776773458',
        address: 'اليمن - الإدارة العامة',
        email: 'info@erp-master.com',
        logoUrl: '',
        systemIcon: '🏢'
      };

  const [formData, setFormData] = useState({
    companyName:        initialProfile.name,
    shortName:          initialProfile.shortName || 'ERP Master',
    tagline:            initialProfile.tagline || 'نظام تخطيط موارد المؤسسات المتكامل',
    commercialRegister: initialProfile.commercialRegister || '1010-009283',
    phone:              initialProfile.phone || '776773458',
    address:            initialProfile.address || 'اليمن - الإدارة العامة',
    fiscalDate:         localStorage.getItem('erp_fiscal_date') || '2026-01-01',
    email:              initialProfile.email || 'info@erp-master.com',
    logoUrl:            initialProfile.logoUrl || ''
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

  // ── النسخ الاحتياطي والتدقيق ──
  const [backupStatus, setBackupStatus] = useState(null);
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditFilter, setAuditFilter] = useState({ action: '', entity_type: '', search: '' });
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);

  // ── المستخدمين والأدوار (RBAC) ──
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // ── قوالب الطباعة والفواتير ──
  const [printConfig, setPrintConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_print_config');
      return saved ? JSON.parse(saved) : {
        thermalWidth: '80mm',
        paperSize: 'A4',
        showLogo: true,
        showQr: true,
        footerText: 'شكراً لتعاملكم الراقي مع دار الأميرات الصغيرات',
        showTerms: true
      };
    } catch(e) {
      return { thermalWidth: '80mm', paperSize: 'A4', showLogo: true, showQr: true, footerText: 'شكراً لتعاملكم', showTerms: true };
    }
  });

  // ── قوالب رسائل الواتساب ──
  const [messageTemplates, setMessageTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_message_templates');
      return saved ? JSON.parse(saved) : {
        newOrder: 'مرحباً {customer_name}، تم تسجيل طلبكم رقم {order_no} بنجاح. يسعدنا خدمتكم!',
        readyForDelivery: 'عميلتنا العزيزة {customer_name}، طلبكم رقم {order_no} جاهز للاستلام 🎀',
        paymentReceived: 'تم استلام دفعة بقيمة {amount} {currency} للطلب رقم {order_no}. شاكرين ثقتكم 💐',
        tailoringUpdate: 'مرحباً {customer_name}، فستانكم في مرحلة {stage} الآن بأيدي أمهر الخياطين ✨'
      };
    } catch(e) {
      return {
        newOrder: 'مرحباً {customer_name}، تم تسجيل طلبكم رقم {order_no} بنجاح.',
        readyForDelivery: 'عميلتنا العزيزة {customer_name}، طلبكم رقم {order_no} جاهز للاستلام 🎀',
        paymentReceived: 'تم استلام دفعة بقيمة {amount} {currency} للطلب {order_no}.',
        tailoringUpdate: 'مرحباً {customer_name}، فستانكم في مرحلة {stage} الآن ✨'
      };
    }
  });

  // جلب إعدادات الخادم
  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      if (window.settingsAPI && window.settingsAPI.getSettings) {
        try {
          const res = await window.settingsAPI.getSettings();
          if (isMounted && res && res.success && res.company) {
            setFormData(prev => ({
              ...prev,
              companyName: (window.BrandService && res.company.company_name)
                ? window.BrandService.cleanText(res.company.company_name, prev.companyName)
                : (res.company.company_name || prev.companyName),
              phone: res.company.phone || prev.phone,
              address: res.company.address || prev.address,
              fiscalDate: res.company.fiscal_date || prev.fiscalDate,
              email: res.company.email || prev.email
            }));
            if (res.currency && res.currency.rates) {
              if (res.currency.rates.SAR) setSarRate(res.currency.rates.SAR);
              if (res.currency.rates.USD) setUsdRate(res.currency.rates.USD);
            }
          }
        } catch(e) {}
      }
    };
    fetchSettings();
    return () => { isMounted = false; };
  }, []);

  // جلب المستخدمين
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      if (window.usersAPI && window.usersAPI.getUsers) {
        const list = await window.usersAPI.getUsers();
        setUsersList(Array.isArray(list) ? list : []);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // جلب حالة النسخ الاحتياطي
  const fetchBackupStatus = useCallback(async () => {
    if (window.backupAPI && window.backupAPI.getStatus) {
      try {
        const res = await window.backupAPI.getStatus();
        if (res && res.success) setBackupStatus(res);
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    fetchBackupStatus();
    fetchUsers();
  }, [fetchBackupStatus, fetchUsers]);

  return {
    formData, setFormData,
    themeMode, setThemeMode,
    sarRate, setSarRate,
    usdRate, setUsdRate,
    fallbackCurrencyOpts,
    localCurrency, setLocalCurrency,
    backupStatus, setBackupStatus,
    loadingBackup, setLoadingBackup,
    auditLogs, setAuditLogs,
    totalLogs, setTotalLogs,
    loadingAudit, setLoadingAudit,
    auditFilter, setAuditFilter,
    selectedAuditLog, setSelectedAuditLog,
    usersList, setUsersList,
    loadingUsers, setLoadingUsers,
    printConfig, setPrintConfig,
    messageTemplates, setMessageTemplates,
    fetchUsers, fetchBackupStatus
  };
}

window.useSettingsData = useSettingsData;
