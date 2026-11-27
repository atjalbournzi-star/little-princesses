/**
 * ============================================================================
 * App.jsx — Central Application Orchestrator & Root Layout
 * Architecture: Layout Coordinator Pattern | Little Princesses ERP
 * ============================================================================
 */

const CURRENCY_OPTS = [
  { code: 'YER', symbol: '﷼', label: 'ريال يمني', display: 'YER ﷼', is_base: true },
  { code: 'SAR', symbol: '﷼', label: 'ريال سعودي', display: 'SAR ﷼', is_base: false },
  { code: 'USD', symbol: '$', label: 'دولار أمريكي', display: 'USD $', is_base: false }
];

function App() {
  const { useState, useEffect, useCallback } = React;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const RouterComp = window.AppRouter || (() => null);
  const ModalsComp = window.AppModals || (() => null);
  const useData = window.useAppData || (() => ({}));
  const appData = useData({ activeTab, isAuthenticated });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [brandProfile, setBrandProfile] = useState(() => (window.BrandService ? window.BrandService.getProfile() : { name: 'نظام الإدارة المتكامل', tagline: 'نظام تخطيط موارد المؤسسات الموحد' }));

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const token = localStorage.getItem('erp_auth_token');
      const stored = localStorage.getItem('erp_active_user');
      if (token && stored) return JSON.parse(stored);
    } catch(e) {}
    return null;
  });

  const [systemCurrency, setSystemCurrency] = useState(() => {
    try {
      const stored = localStorage.getItem('erp_system_currency');
      return CURRENCY_OPTS.find(c => c.code === stored) || CURRENCY_OPTS[0];
    } catch(e) { return CURRENCY_OPTS[0]; }
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
      allowed = ['dashboard', 'orders', 'customers', 'marketing', 'measurement'];
    } else if (role === 'workshop_manager') {
      allowed = ['dashboard', 'factory', 'products', 'inventory', 'feedback', 'measurement'];
    } else if (role === 'accountant') {
      allowed = ['dashboard', 'accounts', 'vouchers', 'expenses', 'reports', 'purchases', 'settings', 'measurement'];
    } else {
      allowed = ['dashboard', 'customers', 'products', 'orders', 'factory', 'measurement', 'inventory', 'purchases', 'accounts', 'vouchers', 'expenses', 'journal', 'reports', 'marketing', 'hr', 'feedback', 'settings'];
    }
    if (!allowed.includes(activeTab)) setActiveTab(allowed[0] || 'dashboard');
  }, [currentUser, activeTab]);

  useEffect(() => {
    const token = localStorage.getItem('erp_auth_token');
    if (!token) {
      setIsAuthenticated(false);
      setLoginModalOpen(true);
      setAuthChecked(true);
    } else if (window.authAPI?.getCurrentUser) {
      window.authAPI.getCurrentUser().then(u => {
        if (u) {
          setCurrentUser(u);
          setIsAuthenticated(true);
          setLoginModalOpen(false);
          window.BrandService?.syncFromBackend?.();
        } else {
          setIsAuthenticated(false);
          setLoginModalOpen(true);
        }
      }).catch(() => { setIsAuthenticated(false); setLoginModalOpen(true); }).finally(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }

    const onUnauth = () => { setIsAuthenticated(false); setCurrentUser(null); setLoginModalOpen(true); };
    const onNetErr = (e) => { const m = e?.detail?.message || window.LP_OFFLINE_MSG; if (m) showToast(m, 'error'); };
    const onCurr = (e) => { const f = CURRENCY_OPTS.find(c => c.code === e.detail?.code); if (f) setSystemCurrency(f); };
    const onBrand = (e) => { if (e.detail) setBrandProfile(e.detail); };
    const onInput = (e) => {
      if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && typeof e.target.value === 'string' && /[٠-٩]/.test(e.target.value)) {
        e.target.value = e.target.value.replace(/[٠-٩]/g, c => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(c)]);
        e.target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };
    window.addEventListener('erp:unauthorized', onUnauth);
    window.addEventListener('lp:networkError', onNetErr);
    window.addEventListener('erp:currencyChanged', onCurr);
    window.addEventListener('erp:brandProfileChanged', onBrand);
    document.addEventListener('input', onInput, true);
    return () => {
      window.removeEventListener('erp:unauthorized', onUnauth);
      window.removeEventListener('lp:networkError', onNetErr);
      window.removeEventListener('erp:currencyChanged', onCurr);
      window.removeEventListener('erp:brandProfileChanged', onBrand);
      document.removeEventListener('input', onInput, true);
    };
  }, []);

  const handleLogout = useCallback(() => {
    if (window.authAPI) window.authAPI.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    showToast('👋 تم تسجيل الخروج بنجاح');
    setLoginModalOpen(true);
  }, [showToast]);

  const allTabs = window.ALL_TABS || [];
  const AppLayoutComp = window.AppLayout || window.MainLayout;
  const ToastComp = window.Toast || null;
  const LoginComp = window.LoginModal || null;

  if (!authChecked) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-slate-100" dir="rtl">
        <div className="w-8 h-8 border-2 border-[#E11D48]/30 border-t-[#E11D48] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <React.Fragment>
        {ToastComp && <ToastComp toast={toast} onClose={() => setToast(null)} />}
        {LoginComp && (
          <LoginComp
            isOpen={true}
            onClose={() => {}}
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              setIsAuthenticated(true);
              setLoginModalOpen(false);
              if (window.BrandService && window.BrandService.syncFromBackend) {
                window.BrandService.syncFromBackend();
              }
              showToast(`مرحباً بك ${user.full_name || user.username} 👤`);
            }}
            showToast={showToast}
          />
        )}
      </React.Fragment>
    );
  }

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
          footer={activeTab !== 'orders' && activeTab !== 'hr' && activeTab !== 'measurement' && (
            <footer className="mt-auto h-7 min-h-[28px] px-4 text-[10.5px] bg-white dark:bg-[#0B132B] text-[#475569] dark:text-slate-400 border-t border-[#E2E8F0] dark:border-[#263248] flex items-center justify-between shrink-0 select-none z-20">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-bold text-[#E11D48]">{brandProfile.name || 'نظام الإدارة المتكامل'}</span>
                <span>•</span>
                <span className="truncate">{brandProfile.tagline || 'نظام تخطيط وإدارة موارد المؤسسات الموحد'}</span>
              </div>
              <span className="text-[9.5px] font-mono font-semibold text-[#475569] dark:text-slate-400 shrink-0">Enterprise SaaS Edition</span>
            </footer>
          )}
        >
          <RouterComp activeTab={activeTab} setActiveTab={setActiveTab} systemCurrency={systemCurrency} showToast={showToast} {...appData} />
        </AppLayoutComp>
      ) : (
        <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#0B132B] text-[#0F172A] dark:text-slate-100" dir="rtl">
          <main className="flex-1 overflow-y-auto p-6">
            <RouterComp activeTab={activeTab} setActiveTab={setActiveTab} systemCurrency={systemCurrency} showToast={showToast} {...appData} />
          </main>
        </div>
      )}

      <ModalsComp toast={toast} setToast={setToast} loginModalOpen={loginModalOpen} setLoginModalOpen={setLoginModalOpen} usersModalOpen={usersModalOpen} setUsersModalOpen={setUsersModalOpen} currentUser={currentUser} setCurrentUser={setCurrentUser} showToast={showToast} />
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
