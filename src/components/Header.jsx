const { useState, useEffect, useMemo, useRef } = React;

window.Header = function Header({
  activeTab,
  setActiveTab,
  allTabs,
  currentUser,
  onOpenLogin,
  onOpenUsersModal,
  onLogout,
  onToggleSidebar,
  isSidebarCollapsed,
  currency
}) {
  const [userDropdown, setUserDropdown] = useState(false);
  const [tenantDropdown, setTenantDropdown] = useState(false);
  const [tenants, setTenants] = useState([]);
  const defaultBrand = (typeof window !== 'undefined' && window.BrandService)
    ? window.BrandService.getProfile()
    : { name: 'نظام الإدارة المتكامل الذكي', shortName: 'ERP Master' };

  const [activeTenant, setActiveTenantState] = useState(() => {
    const t = window.getActiveTenantInfo ? window.getActiveTenantInfo() : null;
    if (t && t.name && !t.name.includes('Little Princesses') && !t.name.includes('الأميرات')) return t;
    return { id: t?.id || 'main_tenant', name: defaultBrand.shortName || defaultBrand.name, plan: 'Enterprise' };
  });
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantId, setNewTenantId] = useState('');
  const [syncInfo, setSyncInfo] = useState({ connected: true, status: 'متصل 🟢', last_sync: 'الآن', pending_count: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyDropdown, setCurrencyDropdown] = useState(false);
  const [currentCurrency, setCurrentCurrency] = useState(() => {
    if (currency && currency.code) {
      const opts = [
        { code: 'YER', symbol: '﷼', label: 'ريال يمني (الأساس)', flag: '🇾🇪', display: 'YER ﷼' },
        { code: 'SAR', symbol: '﷼', label: 'ريال سعودي',        flag: '🇸🇦', display: 'SAR ﷼' },
        { code: 'USD', symbol: '$',  label: 'دولار أمريكي',       flag: '🇺🇸', display: 'USD $' }
      ];
      return opts.find(c => c.code === currency.code) || currency;
    }
    try {
      const stored = localStorage.getItem('erp_system_currency');
      const opts = [
        { code: 'YER', symbol: '﷼', label: 'ريال يمني (الأساس)', flag: '🇾🇪', display: 'YER ﷼' },
        { code: 'SAR', symbol: '﷼', label: 'ريال سعودي',        flag: '🇸🇦', display: 'SAR ﷼' },
        { code: 'USD', symbol: '$',  label: 'دولار أمريكي',       flag: '🇺🇸', display: 'USD $' }
      ];
      return opts.find(c => c.code === stored) || opts[0];
    } catch(e) {
      return { code: 'YER', symbol: '﷼', label: 'ريال يمني (الأساس)', flag: '🇾🇪', display: 'YER ﷼' };
    }
  });

  useEffect(() => {
    if (currency && currency.code && currency.code !== currentCurrency.code) {
      const opts = [
        { code: 'YER', symbol: '﷼', label: 'ريال يمني (الأساس)', flag: '🇾🇪', display: 'YER ﷼' },
        { code: 'SAR', symbol: '﷼', label: 'ريال سعودي',        flag: '🇸🇦', display: 'SAR ﷼' },
        { code: 'USD', symbol: '$',  label: 'دولار أمريكي',       flag: '🇺🇸', display: 'USD $' }
      ];
      const found = opts.find(c => c.code === currency.code) || currency;
      setCurrentCurrency(found);
    }
  }, [currency]);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('lp_theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('lp_theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
        document.body && document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body && document.body.classList.remove('dark');
      }
      window.dispatchEvent(new CustomEvent('lp:themeChanged', { detail: { theme: next } }));
      if (window.settingsAPI && window.settingsAPI.saveSettings) {
        window.settingsAPI.saveSettings({ theme_mode: next }).catch(() => {});
      }
    } catch(e) {}
  };

  const sanitizeDisplayName = (name) => {
    if (!name) return 'المدير التنفيذي';
    return String(name).replace(/👑|الأميرات|Little Princesses/g, '').trim() || 'المدير التنفيذي';
  };

  const user = currentUser || { id: 1, username: 'admin', full_name: 'المدير العام', role: 'admin', role_label: 'المدير العام' };
  const userRole = user.role || 'admin';

  useEffect(() => {
    let isMounted = true;
    const handleThemeChanged = (e) => {
      if (e.detail && e.detail.theme && isMounted) {
        setTheme(e.detail.theme);
      }
    };
    window.addEventListener('lp:themeChanged', handleThemeChanged);

    const handleCurrencyChanged = (e) => {
      if (e.detail && isMounted) {
        const cCode = e.detail.code || (e.detail.currency && e.detail.currency.code);
        const opts = [
          { code: 'YER', symbol: '﷼', label: 'ريال يمني (الأساس)', flag: '🇾🇪', display: 'YER ﷼' },
          { code: 'SAR', symbol: '﷼', label: 'ريال سعودي',        flag: '🇸🇦', display: 'SAR ﷼' },
          { code: 'USD', symbol: '$',  label: 'دولار أمريكي',       flag: '🇺🇸', display: 'USD $' }
        ];
        const found = opts.find(c => c.code === cCode);
        if (found) setCurrentCurrency(found);
      }
    };
    window.addEventListener('erp:currencyChanged', handleCurrencyChanged);

    const loadTenants = async () => {
      if (window.tenantAPI && window.tenantAPI.getTenants) {
        try {
          const list = await window.tenantAPI.getTenants();
          if (isMounted && Array.isArray(list)) setTenants(list);
          const curr = await window.tenantAPI.getCurrentTenant();
          if (isMounted && curr) setActiveTenantState(curr);
        } catch(e) {}
      }
    };
    loadTenants();

    const handleTenantChanged = (e) => {
      if (e.detail && e.detail.tenant) {
        setActiveTenantState(e.detail.tenant);
      }
      loadTenants();
    };
    window.addEventListener('lp_tenant_changed', handleTenantChanged);

    const checkSync = async () => {
      if (typeof window.fetchSyncStatus === 'function') {
        try {
          const res = await window.fetchSyncStatus();
          if (res && isMounted) {
            const timeStr = res.last_sync ? String(res.last_sync).split('T')[1]?.split('.')[0]?.slice(0, 5) || String(res.last_sync).slice(0, 5) : 'الآن';
            setSyncInfo({
              connected: res.connected !== false,
              status: res.status || 'متصل 🟢',
              last_sync: timeStr,
              pending_count: res.pending_count || 0
            });
          }
        } catch(e){}
      }
    };
    checkSync();
    const interval = setInterval(checkSync, 12000);
    return () => { 
      isMounted = false; 
      clearInterval(interval); 
      window.removeEventListener('lp_tenant_changed', handleTenantChanged);
      window.removeEventListener('lp:themeChanged', handleThemeChanged);
      window.removeEventListener('erp:currencyChanged', handleCurrencyChanged);
    };
  }, []);

  // Map active tab to breadcrumb title & category
  const tabMetadata = useMemo(() => {
    const map = {
      dashboard: { title: "لوحة التحكم والعمليات التنفيذية", category: "الرئيسية" },
      customers: { title: "إدارة علاقات العملاء (CRM)", category: "العملاء و CRM" },
      products: { title: "المنتجات ومواصفات التشغيل (BOM)", category: "العمليات والمنتجات" },
      orders: { title: "أوامر المبيعات ونقاط البيع (POS)", category: "المبيعات" },
      factory: { title: "خطوط التصنيع والتشغيل (Shop Floor)", category: "الإنتاج والعمليات" },
      inventory: { title: "إدارة المخزون وسلاسل الإمداد", category: "المستودعات والمواد" },
      purchases: { title: "المشتريات وإدارة الموردين", category: "المشتريات" },
      accounts: { title: "شجرة الحسابات والدليل المالي", category: "المحاسبة والمالية" },
      vouchers: { title: "السندات والمعاملات المالية", category: "المحاسبة والمالية" },
      expenses: { title: "المصروفات التشغيلية والإدارية", category: "المحاسبة والمالية" },
      journal: { title: "دفتر القيود اليومية والأستاذ", category: "المحاسبة والمالية" },
      reports: { title: "القوائم والتقارير المالية والختامية", category: "التقارير" },
      marketing: { title: "محرك التسويق ونمو الأعمال", category: "النمو والتسويق" },
      hr: { title: "إدارة الموارد البشرية والرواتب", category: "الموارد البشرية" },
      feedback: { title: "إدارة الجودة الشاملة وتقييم الأداء", category: "ضمان الجودة" },
      settings: { title: "إعدادات النظام والحوكمة السحابية", category: "الإدارة والنظام" }
    };
    return map[activeTab] || { title: "لوحة التحكم", category: "ERP Master" };
  }, [activeTab]);

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'admin': return 'bg-[#FCE8F2] text-[#B0005A] border-[#F2A4CB]';
      case 'accountant': return 'bg-[#E2F5F7] text-[#007F8C] border-[#C5ECF0]';
      case 'workshop_manager': return 'bg-[#F2E7F3] text-[#8F2A87] border-[#E5CEE7]';
      case 'data_entry':
      default: return 'bg-[#FFF1DC] text-[#F28A00] border-[#FFE4B9]';
    }
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white dark:bg-[#0b1329] border-b border-[#E8E5EA] dark:border-slate-800/80 px-4 md:px-6 flex items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition-colors" dir="rtl">
      {/* Right Side: Sidebar Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl border border-[#E8E5EA] dark:border-slate-700 text-[#6F6B75] dark:text-slate-400 hover:text-[#B0005A] dark:hover:text-purple-400 hover:bg-[#FCE8F2] dark:hover:bg-slate-800 md:hidden transition cursor-pointer"
          title="القائمة الجانبية"
        >
          <Icons.Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-xs text-[#6F6B75] dark:text-slate-400">
            <span className="font-semibold">{tabMetadata.category}</span>
            <Icons.ChevronLeft className="w-3.5 h-3.5 text-[#6F6B75]/40 dark:text-slate-600" />
            <span className="font-bold text-sm text-[#B0005A] dark:text-purple-300 truncate max-w-[200px] sm:max-w-xs">{tabMetadata.title}</span>
          </div>
        </div>
      </div>

      {/* Center: Global Quick Search */}
      <div className="hidden lg:flex items-center relative w-96 max-w-md">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6F6B75] dark:text-slate-500 pointer-events-none">
          <Icons.Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث شامل في أوامر التشغيل، العملاء، القيود، الفواتير..."
          className="w-full h-10 pr-9 pl-4 text-xs bg-[#FAFAFB] dark:bg-slate-900/90 border border-[#E8E5EA] dark:border-slate-800 rounded-xl text-[#25232A] dark:text-slate-100 placeholder-[#6F6B75] dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#B0005A] dark:focus:border-purple-500 focus:ring-2 focus:ring-[#FCE8F2] dark:focus:ring-purple-950 transition-all outline-none"
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#6F6B75] dark:text-slate-400 bg-white dark:bg-slate-800 border border-[#E8E5EA] dark:border-slate-700 px-1.5 py-0.5 rounded font-mono">
          ⌘K
        </span>
      </div>

      {/* Left Side: Tenant Switcher, Cloud Sync, Quick Action & User Profile */}
      <div className="flex items-center gap-2.5">
        {/* Multi-Tenant SaaS Switcher Badge */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setTenantDropdown(!tenantDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F2E7F3] to-[#FCE8F2] dark:from-slate-800/90 dark:to-slate-800/60 border border-[#E5CEE7] dark:border-slate-700 text-[#8F2A87] dark:text-purple-300 hover:border-[#B0005A] dark:hover:border-purple-500 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="تبديل المنشأة أو الشركة (Multi-Tenant Switcher)"
          >
            <span>🏢</span>
            <span className="max-w-[150px] truncate">{activeTenant.name || 'ERP Master'}</span>
            <Icons.ChevronDown className="w-3.5 h-3.5 text-[#8F2A87] dark:text-purple-300" />
          </button>

          {/* Tenant Switcher Dropdown */}
          {tenantDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-[#E8E5EA] rounded-2xl shadow-xl p-2 z-50 animate-fadeIn space-y-1">
              <div className="px-3 py-2 border-b border-[#E8E5EA] flex items-center justify-between">
                <span className="text-xs font-bold text-[#25232A]">المشاغل والمستأجرين (SaaS)</span>
                <span className="text-[10px] font-mono bg-[#E2F5F7] text-[#007F8C] px-1.5 py-0.5 rounded font-bold">{tenants.length} مشغل</span>
              </div>

              <div className="max-h-48 overflow-y-auto py-1 space-y-1">
                {tenants.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={async () => {
                      setTenantDropdown(false);
                      if (window.tenantAPI && window.tenantAPI.switchTenant) {
                        await window.tenantAPI.switchTenant(t.id);
                        window.location.reload();
                      }
                    }}
                    className={`w-full text-right px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                      (activeTenant.id === t.id)
                        ? 'bg-[#FCE8F2] text-[#B0005A] font-bold border border-[#F2A4CB]'
                        : 'text-[#25232A] hover:bg-[#FAFAFB]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>🏢</span>
                      <div className="flex flex-col">
                        <span className="leading-tight">{t.name}</span>
                        <span className="text-[10px] opacity-70 font-mono">ID: {t.id}</span>
                      </div>
                    </div>
                    {activeTenant.id === t.id && (
                      <span className="text-[10px] font-bold bg-[#B0005A] text-white px-1.5 py-0.2 rounded-full">النشط</span>
                    )}
                  </button>
                ))}
              </div>

              {userRole === 'admin' && (
                <div className="border-t border-[#E8E5EA] pt-1">
                  <button
                    type="button"
                    onClick={() => { setTenantDropdown(false); setShowAddTenantModal(true); }}
                    className="w-full text-right px-3 py-2 rounded-xl text-xs font-bold text-[#007F8C] hover:bg-[#E2F5F7] flex items-center gap-2 transition cursor-pointer"
                  >
                    <Icons.Plus className="w-4 h-4" />
                    <span>تسجيل مشغل / شركة جديدة (+ Tenant)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal تسجيل مشغل جديد */}
        {showAddTenantModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" dir="rtl">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E8E5EA]">
              <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
                <h3 className="text-base font-bold text-[#25232A] flex items-center gap-2">
                  <span>🏢</span>
                  <span>تسجيل مشغل أو عميل جديد (New Tenant)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddTenantModal(false)}
                  className="text-[#6F6B75] hover:text-[#25232A] p-1 rounded-lg hover:bg-[#FAFAFB]"
                >
                  <Icons.X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-xs font-bold text-[#25232A] mb-1">اسم المشغل / العلامة التجارية *</label>
                  <input
                    type="text"
                    value={newTenantName}
                    onChange={(e) => setNewTenantName(e.target.value)}
                    placeholder="مثال: مشغل الأناقة للأزياء"
                    className="w-full h-10 px-3 border border-[#E8E5EA] rounded-xl text-xs outline-none focus:border-[#B0005A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#25232A] mb-1">معرف المستأجر الفريد (Tenant Code / Subdomain) *</label>
                  <input
                    type="text"
                    value={newTenantId}
                    onChange={(e) => setNewTenantId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="مثال: atelier_elegance"
                    className="w-full h-10 px-3 border border-[#E8E5EA] rounded-xl text-xs font-mono outline-none focus:border-[#B0005A]"
                  />
                </div>
                <div className="p-3 bg-[#E2F5F7] rounded-xl border border-[#C5ECF0] text-[#007F8C] text-[11px] leading-relaxed">
                  🛡️ سيتم تلقائياً إنشاء قاعدة بيانات وشجرة حسابات قياسية معزولة بالكامل لهذا المشغل لضمان عدم تداخل البيانات.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E5EA]">
                <button
                  type="button"
                  onClick={() => setShowAddTenantModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6F6B75] hover:bg-[#FAFAFB] border border-[#E8E5EA]"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newTenantName || !newTenantId) {
                      alert('يرجى كتابة اسم المشغل ومعرفه الفريد');
                      return;
                    }
                    try {
                      const res = await window.tenantAPI.createTenant({
                        id: newTenantId,
                        name: newTenantName,
                        plan: 'Enterprise'
                      });
                      if (res && res.success) {
                        alert(res.message || 'تم إنشاء المشغل بنجاح!');
                        setShowAddTenantModal(false);
                        setNewTenantName('');
                        setNewTenantId('');
                        await window.tenantAPI.switchTenant(newTenantId);
                        window.location.reload();
                      } else {
                        alert(res.error || 'حدث خطأ أثناء الإنشاء');
                      }
                    } catch(e) {
                      alert('خطأ: ' + e.message);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-[#B0005A] hover:bg-[#8E0049] text-white text-xs font-bold shadow-xs"
                >
                  تأكيد وإنشاء المشغل 🏢
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Realtime Cloud Sync Status */}
        <button
          type="button"
          onClick={async () => {
            if (window.syncGoogleSheets) {
              try {
                await window.syncGoogleSheets();
                checkSync();
              } catch(e) {}
            }
          }}
          title={syncInfo.pending_count > 0 ? `يوجد ${syncInfo.pending_count} عملية قيد المزامنة في الخلفية. انقر للمزامنة الفورية.` : "حالة المزامنة السحابية والحفظ اللحظي. انقر للمزامنة الفورية."}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border whitespace-nowrap shrink-0 transition-all cursor-pointer ${
            !syncInfo.connected
              ? 'bg-[#FEE2E2] dark:bg-rose-950/40 border-[#FCA5A5] dark:border-rose-900 text-[#DC2626] dark:text-rose-400'
              : (syncInfo.pending_count > 0
                ? 'bg-[#FFF1DC] dark:bg-amber-950/40 border-[#FFE4B9] dark:border-amber-900 text-[#F28A00] dark:text-amber-400'
                : 'bg-[#E2F5F7] dark:bg-cyan-950/40 border-[#C5ECF0] dark:border-cyan-900 text-[#007F8C] dark:text-cyan-400')
          }`}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            !syncInfo.connected 
              ? 'bg-[#DC2626]' 
              : (syncInfo.pending_count > 0 ? 'bg-[#F28A00] animate-ping' : 'bg-[#009FAE] animate-pulse')
          }`} />
          <span>{syncInfo.pending_count > 0 ? `جاري المزامنة (${syncInfo.pending_count})` : 'سحابي مباشر 🟢'}</span>
          <span className="text-[10px] opacity-70 font-mono">({syncInfo.last_sync})</span>
        </button>

        {/* Quick Action Button */}
        <button
          onClick={() => setActiveTab('orders')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#B0005A] hover:bg-[#8E0049] text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
          title="إنشاء أمر مبيعات أو أمر تشغيل جديد"
        >
          <Icons.Plus className="w-4 h-4" />
          <span>+ أمر تشغيل جديد</span>
        </button>

        {/* Quick 1-Click Currency Switcher */}
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
              {[
                { code: 'YER', symbol: '﷼', label: 'ريال يمني (الأساس)', flag: '🇾🇪', display: 'YER ﷼' },
                { code: 'SAR', symbol: '﷼', label: 'ريال سعودي',        flag: '🇸🇦', display: 'SAR ﷼' },
                { code: 'USD', symbol: '$',  label: 'دولار أمريكي',       flag: '🇺🇸', display: 'USD $' }
              ].map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setCurrencyDropdown(false);
                    setCurrentCurrency(c);
                    try {
                      localStorage.setItem('erp_system_currency', c.code);
                    } catch(e) {}
                    window.dispatchEvent(new CustomEvent('erp:currencyChanged', { detail: { code: c.code, currency: c } }));
                  }}
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

        {/* Theme Toggle Button (Light/Dark Switcher) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-[#E8E5EA] dark:border-slate-800 bg-[#FAFAFB] dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 text-[#25232A] dark:text-slate-200 hover:text-[#B0005A] dark:hover:text-purple-400 transition shadow-2xs cursor-pointer flex items-center justify-center text-sm"
          title={theme === 'dark' ? "التبديل إلى الوضع الفاتح (Light Mode) ☀️" : "التبديل إلى الوضع المظلم (Dark Mode) 🌙"}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserDropdown(!userDropdown)}
            className="flex items-center gap-2 py-1 px-2 rounded-xl bg-[#FAFAFB] dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 border border-[#E8E5EA] dark:border-slate-800 transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#B0005A] via-[#8F2A87] to-[#009FAE] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {user.username ? user.username.slice(0, 2).toUpperCase() : 'ERP'}
            </div>
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-xs font-bold text-[#25232A] dark:text-slate-100 leading-tight">
                {sanitizeDisplayName(user.full_name || user.username)}
              </span>
              <span className="text-[10.5px] text-[#6F6B75] dark:text-slate-400">
                {userRole === 'admin' ? 'المدير التنفيذي' : (user.role_label || user.role)}
              </span>
            </div>
            <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-md border ${getRoleBadgeColor(userRole)}`}>
              {userRole === 'admin' ? '🛡️ تنفيذي' : userRole === 'accountant' ? '💼 محاسب' : userRole === 'workshop_manager' ? '⚙️ تشغيل' : 'مدخل'}
            </span>
            <Icons.ChevronDown className="w-3.5 h-3.5 text-[#6F6B75] dark:text-slate-400" />
          </button>

          {/* User Dropdown Modal */}
          {userDropdown && (
            <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-[#E8E5EA] dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 animate-fadeIn space-y-1.5">
              <div className="p-3 bg-[#FAFAFB] dark:bg-slate-800/60 rounded-xl border border-[#E8E5EA] dark:border-slate-700/60 text-right">
                <div className="font-bold text-sm text-[#25232A] dark:text-slate-100">{sanitizeDisplayName(user.full_name || user.username)}</div>
                <div className="text-xs text-[#6F6B75] dark:text-slate-400 font-mono">@{user.username}</div>
                <div className={`mt-2 inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border ${getRoleBadgeColor(userRole)}`}>
                  {userRole === 'admin' ? '🛡️ المدير التنفيذي (Executive Admin)' : (user.role_label || userRole)}
                </div>
              </div>

              {userRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => { setUserDropdown(false); if (onOpenUsersModal) onOpenUsersModal(); }}
                  className="w-full text-right px-3 py-2 rounded-xl text-xs font-bold text-[#25232A] dark:text-slate-200 hover:bg-[#FCE8F2] dark:hover:bg-purple-950/40 hover:text-[#B0005A] dark:hover:text-purple-300 flex items-center gap-2 transition cursor-pointer"
                >
                  <Icons.Users className="w-4 h-4 text-[#B0005A] dark:text-purple-400" />
                  <span>إدارة المستخدمين والصلاحيات (RBAC)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => { setUserDropdown(false); if (onOpenLogin) onOpenLogin(); }}
                className="w-full text-right px-3 py-2 rounded-xl text-xs font-bold text-[#25232A] dark:text-slate-200 hover:bg-[#E2F5F7] dark:hover:bg-cyan-950/40 hover:text-[#007F8C] dark:hover:text-cyan-300 flex items-center gap-2 transition cursor-pointer"
              >
                <span>🔄</span>
                <span>تبديل المستخدم (Switch Role)</span>
              </button>

              <div className="border-t border-[#E8E5EA] dark:border-slate-800 pt-1">
                <button
                  type="button"
                  onClick={() => { setUserDropdown(false); if (onLogout) onLogout(); }}
                  className="w-full text-right px-3 py-2 rounded-xl text-xs font-bold text-[#D64545] hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition cursor-pointer"
                >
                  <span>🚪</span>
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
