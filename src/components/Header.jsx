/**
 * ============================================================================
 * Header.jsx — Main Application Header Orchestrator
 * Architecture: Modular Orchestrator Pattern | Little Princesses ERP
 * ============================================================================
 */

const { useState, useEffect, useMemo } = React;

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
  const BrandComp = window.BrandHeader || (() => null);
  const NotifComp = window.HeaderNotificationCenter || (() => null);
  const CurrencyComp = window.HeaderCurrencySelector || (() => null);
  const UserProfileComp = window.UserProfileDropdown || (() => null);
  const utils = window.HeaderUtils || {
    getTabMetadata: () => ({ title: "لوحة التحكم", category: "ERP Master" }),
    getRoleBadgeColor: () => 'bg-[#FFF1DC] text-[#F28A00] border-[#FFE4B9]',
    sanitizeDisplayName: (n) => n || 'المدير التنفيذي'
  };

  const defaultBrand = (typeof window !== 'undefined' && window.BrandService)
    ? window.BrandService.getProfile()
    : { name: 'نظام الإدارة المتكامل الذكي', shortName: 'ERP Master' };

  const [activeTenant, setActiveTenantState] = useState(() => {
    const t = window.getActiveTenantInfo ? window.getActiveTenantInfo() : null;
    if (t && t.name && !t.name.includes('Little Princesses') && !t.name.includes('الأميرات')) return t;
    return { id: t?.id || 'main_tenant', name: defaultBrand.shortName || defaultBrand.name, plan: 'Enterprise' };
  });

  const [tenants, setTenants] = useState([]);
  const [syncInfo, setSyncInfo] = useState({ connected: true, status: 'متصل 🟢', last_sync: 'الآن', pending_count: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [watchdogData, setWatchdogData] = useState(null);

  const [currentCurrency, setCurrentCurrency] = useState(() => {
    const opts = [
      { code: 'YER', symbol: '﷼', label: 'ريال يمني (الأساس)', flag: '🇾🇪', display: 'YER ﷼' },
      { code: 'SAR', symbol: '﷼', label: 'ريال سعودي',        flag: '🇸🇦', display: 'SAR ﷼' },
      { code: 'USD', symbol: '$',  label: 'دولار أمريكي',       flag: '🇺🇸', display: 'USD $' }
    ];
    if (currency && currency.code) return opts.find(c => c.code === currency.code) || currency;
    try {
      const stored = localStorage.getItem('erp_system_currency');
      return opts.find(c => c.code === stored) || opts[0];
    } catch(e) {
      return opts[0];
    }
  });

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

  const user = currentUser || { id: 1, username: 'admin', full_name: 'المدير العام', role: 'admin', role_label: 'المدير العام' };
  const userRole = user.role || 'admin';

  const checkSync = async () => {
    if (typeof window.fetchSyncStatus === 'function') {
      try {
        const res = await window.fetchSyncStatus();
        if (res) {
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

  useEffect(() => {
    let isMounted = true;
    const handleThemeChanged = (e) => { if (e.detail?.theme && isMounted) setTheme(e.detail.theme); };
    window.addEventListener('lp:themeChanged', handleThemeChanged);

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

    const fetchWatchdog = async () => {
      try {
        const res = await fetch('/api/atelier/watchdog');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && isMounted) setWatchdogData(data.data);
        }
      } catch(e) {}
    };
    fetchWatchdog();

    checkSync();
    const syncInterval = setInterval(checkSync, 12000);
    const watchdogInterval = setInterval(fetchWatchdog, 30000);

    return () => {
      isMounted = false;
      clearInterval(syncInterval);
      clearInterval(watchdogInterval);
      window.removeEventListener('lp:themeChanged', handleThemeChanged);
    };
  }, []);

  const tabMetadata = useMemo(() => utils.getTabMetadata(activeTab), [activeTab]);
  const totalAlerts = (watchdogData?.urgent_count || 0) + (watchdogData?.fittings_today_count || 0) + (watchdogData?.alterations_pending_count || 0);

  return (
    <header className="h-16 shrink-0 z-20 bg-white dark:bg-[#0b1329] border-b border-[#E8E5EA] dark:border-slate-800/80 px-4 md:px-6 flex items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition-colors" dir="rtl">
      <BrandComp
        onToggleSidebar={onToggleSidebar}
        tabMetadata={tabMetadata}
        userRole={userRole}
        activeTenant={activeTenant}
        setActiveTenantState={setActiveTenantState}
        tenants={tenants}
        syncInfo={syncInfo}
        checkSync={checkSync}
      />

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

      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setActiveTab('orders')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#B0005A] hover:bg-[#8E0049] text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
          title="إنشاء أمر مبيعات أو أمر تشغيل جديد"
        >
          <Icons.Plus className="w-4 h-4" />
          <span>+ أمر تشغيل جديد</span>
        </button>

        <CurrencyComp
          currentCurrency={currentCurrency}
          setCurrentCurrency={setCurrentCurrency}
        />

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-[#E8E5EA] dark:border-slate-800 bg-[#FAFAFB] dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 text-[#25232A] dark:text-slate-200 hover:text-[#B0005A] dark:hover:text-purple-400 transition shadow-2xs cursor-pointer flex items-center justify-center text-sm"
          title={theme === 'dark' ? "التبديل إلى الوضع الفاتح ☀️" : "التبديل إلى الوضع المظلم 🌙"}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <NotifComp
          watchdogData={watchdogData}
          totalAlerts={totalAlerts}
          setActiveTab={setActiveTab}
        />

        <UserProfileComp
          user={user}
          userRole={userRole}
          getRoleBadgeColor={utils.getRoleBadgeColor}
          sanitizeDisplayName={utils.sanitizeDisplayName}
          onOpenLogin={onOpenLogin}
          onOpenUsersModal={onOpenUsersModal}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
};
