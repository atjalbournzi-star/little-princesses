/**
 * ============================================================================
 * App.jsx — Central Application Orchestrator & Root Layout
 * Architecture: Layout Coordinator Pattern | Little Princesses ERP
 * ============================================================================
 */

function App() {
  const { useState, useEffect, useCallback } = React;

  const RouterComp = window.AppRouter || (() => null);
  const ModalsComp = window.AppModals || (() => null);
  const useData = window.useAppData || (() => ({}));
  const appData = useData();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [usersModalOpen, setUsersModalOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('erp_active_user');
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return { id: 1, username: 'admin', full_name: 'المدير العام', role: 'admin', role_label: 'المدير العام', is_active: 1 };
  });

  const [systemCurrency, setSystemCurrency] = useState(() => {
    try {
      const stored = localStorage.getItem('erp_system_currency');
      const opts = [
        { code: 'YER', symbol: '﷼', label: 'ريال يمني',    display: 'YER ﷼', is_base: true },
        { code: 'SAR', symbol: '﷼', label: 'ريال سعودي',   display: 'SAR ﷼', is_base: false },
        { code: 'USD', symbol: '$',  label: 'دولار أمريكي',  display: 'USD $', is_base: false }
      ];
      return opts.find(c => c.code === stored) || opts[0];
    } catch(e) { return { code: 'YER', symbol: '﷼', label: 'ريال يمني', display: 'YER ﷼', is_base: true }; }
  });

  const showToast = useCallback((msg, type = 'success') => {
    const text = typeof msg === 'object' ? (msg.message || String(msg)) : String(msg);
    setToast(text);
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    const role = currentUser?.role || 'admin';
    let allowed = [];
    if (role === 'data_entry' || role === 'sales_rep') {
      allowed = ['dashboard', 'orders', 'customers', 'marketing'];
    } else if (role === 'workshop_manager') {
      allowed = ['dashboard', 'factory', 'products', 'inventory', 'feedback'];
    } else if (role === 'accountant') {
      allowed = ['dashboard', 'accounts', 'vouchers', 'expenses', 'reports', 'purchases', 'settings'];
    } else {
      allowed = ['dashboard', 'customers', 'products', 'orders', 'factory', 'inventory', 'purchases', 'accounts', 'vouchers', 'expenses', 'journal', 'reports', 'marketing', 'hr', 'feedback', 'settings'];
    }
    if (!allowed.includes(activeTab)) setActiveTab(allowed[0] || 'dashboard');
  }, [currentUser, activeTab]);

  useEffect(() => {
    if (window.authAPI && typeof window.authAPI.getCurrentUser === 'function') {
      window.authAPI.getCurrentUser().then(u => { if (u) setCurrentUser(u); }).catch(() => {});
    }

    const handleCurrencyChange = (e) => {
      const opts = [
        { code: 'YER', symbol: '﷼', label: 'ريال يمني',    display: 'YER ﷼', is_base: true },
        { code: 'SAR', symbol: '﷼', label: 'ريال سعودي',   display: 'SAR ﷼', is_base: false },
        { code: 'USD', symbol: '$',  label: 'دولار أمريكي',  display: 'USD $', is_base: false }
      ];
      const found = opts.find(c => c.code === e.detail.code);
      if (found) setSystemCurrency(found);
    };
    window.addEventListener('erp:currencyChanged', handleCurrencyChange);

    const handleInput = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        const val = e.target.value;
        if (typeof val === 'string' && /[٠-٩]/.test(val)) {
          const normalized = val.replace(/[٠-٩]/g, c => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(c)]);
          e.target.value = normalized;
          e.target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    };
    document.addEventListener('input', handleInput, true);

    return () => {
      window.removeEventListener('erp:currencyChanged', handleCurrencyChange);
      document.removeEventListener('input', handleInput, true);
    };
  }, []);

  const handleLogout = useCallback(() => {
    if (window.authAPI) window.authAPI.logout();
    showToast('👋 تم تسجيل الخروج بنجاح');
    setLoginModalOpen(true);
  }, [showToast]);

  const allTabs = window.ALL_TABS || [];

  const AppLayoutComp = window.AppLayout || window.MainLayout;

  return (
    <React.Fragment>
      {AppLayoutComp ? (
        <AppLayoutComp
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          systemCurrency={systemCurrency}
          setSystemCurrency={setSystemCurrency}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          onOpenLogin={() => setLoginModalOpen(true)}
          onOpenUsersModal={() => setUsersModalOpen(true)}
          onLogout={handleLogout}
        >
          <RouterComp
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            systemCurrency={systemCurrency}
            showToast={showToast}
            {...appData}
          />
          <footer className="py-1 px-4 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-[#B0005A]">{(typeof window !== 'undefined' && window.BrandService) ? window.BrandService.getProfile().name : 'نظام الإدارة المتكامل الذكي'}</span>
              <span>•</span>
              <span className="truncate">{(typeof window !== 'undefined' && window.BrandService) ? window.BrandService.getProfile().tagline : 'نظام تخطيط وإدارة موارد المؤسسات الموحد'}</span>
            </div>
            <span className="text-[9.5px] font-mono font-semibold text-slate-400 shrink-0">
              Enterprise SaaS Edition
            </span>
          </footer>
        </AppLayoutComp>
      ) : (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0B132B] text-slate-900 dark:text-slate-100" dir="rtl">
          <main className="flex-1 overflow-y-auto p-6">
            <RouterComp
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              systemCurrency={systemCurrency}
              showToast={showToast}
              {...appData}
            />
          </main>
        </div>
      )}

      <ModalsComp
        toast={toast}
        setToast={setToast}
        loginModalOpen={loginModalOpen}
        setLoginModalOpen={setLoginModalOpen}
        usersModalOpen={usersModalOpen}
        setUsersModalOpen={setUsersModalOpen}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        showToast={showToast}
      />
    </React.Fragment>
  );
}

window.App = App;

if (typeof ReactDOM !== 'undefined') {
  const RootBoundary = window.ErrorBoundary || React.Fragment;
  ReactDOM.createRoot(document.getElementById("root")).render(
    <RootBoundary>
      <App />
    </RootBoundary>
  );
}
