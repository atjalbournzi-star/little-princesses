/**
 * AppLayout.jsx — Main Application Shell & Master Layout Coordinator
 * Compact Enterprise Layout | Little Princesses ERP
 * UI/UX: Collapsible Sidebar (288px/64px), RTL tooltips, Arabic text fix
 */
function AppLayout({
  activeTab = 'dashboard', setActiveTab = () => {}, currentUser, systemCurrency,
  setSystemCurrency, onOpenLogin, onOpenUsersModal, onLogout, children, modals, footer,
  isSidebarCollapsed: propCollapsed, setIsSidebarCollapsed: propSetCollapsed
}) {
  const Icons = window.Icons || {};
  const role = currentUser?.role || 'admin';
  const [currencyDropdown, setCurrencyDropdown] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [brand, setBrand] = React.useState(() => (
    (typeof window !== 'undefined' && window.BrandService) ? window.BrandService.getProfile() : { name: 'نظام الإدارة المتكامل', shortName: 'ERP Master' }
  ));
  React.useEffect(() => {
    const hb = (e) => { if (e.detail) setBrand(e.detail); };
    window.addEventListener('erp:brandProfileChanged', hb);
    return () => window.removeEventListener('erp:brandProfileChanged', hb);
  }, []);
  const [internalCollapsed, setInternalCollapsed] = React.useState(() => {
    try {
      const saved = localStorage.getItem('erp_sidebar_collapsed');
      if (saved !== null) return saved === 'true';
      return typeof window !== 'undefined' && window.innerWidth < 1024;
    } catch(e) { return false; }
  });
  React.useEffect(() => {
    const onResize = () => {
      const mob = window.innerWidth < 768;
      setIsMobile(mob);
      if (!mob) {
        setMobileOpen(false);
        if (window.innerWidth < 1024) setInternalCollapsed(true);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isCollapsed = isMobile ? false : (propCollapsed !== undefined ? propCollapsed : internalCollapsed);
  const setIsCollapsed = (val) => {
    if (isMobile) { setMobileOpen(prev => !prev); return; }
    const next = typeof val === 'function' ? val(isCollapsed) : val;
    if (propSetCollapsed) propSetCollapsed(next);
    setInternalCollapsed(next);
    try { localStorage.setItem('erp_sidebar_collapsed', String(next)); } catch(e) {}
    window.dispatchEvent(new CustomEvent('erp:sidebarToggle', { detail: { isCollapsed: next } }));
  };
  const toggleSidebar = () => (isMobile ? setMobileOpen(prev => !prev) : setIsCollapsed(!isCollapsed));
  React.useEffect(() => {
    const h = (e) => { if (e.detail && typeof e.detail.isCollapsed === 'boolean') { if (propSetCollapsed) propSetCollapsed(e.detail.isCollapsed); setInternalCollapsed(e.detail.isCollapsed); } };
    window.addEventListener('erp:sidebarToggle', h);
    return () => window.removeEventListener('erp:sidebarToggle', h);
  }, [propSetCollapsed]);
  const toggleTheme = () => {
    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    try { localStorage.setItem('lp_theme', next); document.documentElement.classList.toggle('dark', next === 'dark'); if (document.body) document.body.classList.toggle('dark', next === 'dark'); window.dispatchEvent(new CustomEvent('lp:themeChanged', { detail: { theme: next } })); } catch(e) {}
  };
  const enablePhase2 = typeof window !== 'undefined' && window.ENABLE_PHASE2_MODULES === true;
  const canCreateOrder = ['admin', 'data_entry', 'sales_rep', 'cashier'].includes(role);
  const currencyOpts = [{ code: 'YER', label: 'ريال يمني', symbol: '﷼', display: 'YER' }, { code: 'SAR', label: 'ريال سعودي', symbol: '﷼', display: 'SAR' }, { code: 'USD', label: 'دولار أمريكي', symbol: '$', display: 'USD' }];
  const currentCurr = systemCurrency || currencyOpts[0];
  const handleSelectCurrency = (c) => { if (setSystemCurrency) setSystemCurrency(c); try { localStorage.setItem('erp_system_currency', c.code); window.dispatchEvent(new CustomEvent('erp:currencyChanged', { detail: c })); } catch(e) {} setCurrencyDropdown(false); };
  const navSections = React.useMemo(() => [
    { title: 'العمليات والتشغيل', items: [
      { id: 'dashboard', label: 'لوحة التحكم والعمليات', icon: Icons.Dashboard, roles: ['admin','accountant','workshop_manager','data_entry','sales_rep'] },
      { id: 'customers', label: 'العملاء وإدارة العلاقات (CRM)', icon: Icons.Users, roles: ['admin','data_entry','sales_rep'] },
      { id: 'orders', label: 'أوامر المبيعات ونقاط البيع (POS)', icon: Icons.ShoppingBag, roles: ['admin','data_entry','sales_rep'] }
    ]},
    { title: 'إدارة العمليات والإنتاج', items: [
      { id: 'products', label: 'المنتجات ومواصفات التشغيل', icon: Icons.Calculator, roles: ['admin','workshop_manager'] },
      { id: 'factory', label: 'خطوط التصنيع والتشغيل', icon: Icons.Factory, roles: ['admin','workshop_manager'] },
      { id: 'measurement', label: 'استوديو المقاسات (A4)', icon: Icons.Scissors, roles: ['admin','workshop_manager','data_entry','sales_rep','accountant'], phase2: true },
      { id: 'inventory', label: 'المخزون وسلاسل الإمداد', icon: Icons.Scissors, roles: ['admin','workshop_manager'] },
      { id: 'purchases', label: 'المشتريات وإدارة الموردين', icon: Icons.Purchases, roles: ['admin','accountant'] }
    ]},
    { title: 'المحاسبة والمالية', items: [
      { id: 'accounts', label: 'شجرة الحسابات والدليل المالي', icon: Icons.Accounts, roles: ['admin','accountant'] },
      { id: 'vouchers', label: 'السندات والمعاملات المالية', icon: Icons.Vouchers, roles: ['admin','accountant'] },
      { id: 'expenses', label: 'المصروفات التشغيلية', icon: Icons.Expenses, roles: ['admin','accountant'] },
      { id: 'reports', label: 'التقارير المالية والتشغيلية', icon: Icons.Reports, roles: ['admin','accountant'] }
    ]},
    { title: 'الحوكمة ونمو الأعمال', items: [
      { id: 'marketing', label: 'التسويق ونمو الأعمال', icon: Icons.Marketing, roles: ['admin','data_entry'], phase2: true },
      { id: 'hr', label: 'الموارد البشرية والرواتب', icon: Icons.HR, roles: ['admin'] },
      { id: 'feedback', label: 'إدارة الجودة الشاملة (QA)', icon: Icons.Star, roles: ['admin','workshop_manager'] },
      { id: 'settings', label: 'إعدادات النظام والحوكمة', icon: Icons.Settings, roles: ['admin','accountant'] }
    ]}
  ], [role]);
  const SW = isMobile ? 0 : (isCollapsed ? 64 : 256);
  const asideWidth = isMobile ? 256 : SW;
  return (
    <div className="flex min-h-screen h-screen w-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#0B132B] text-[#0F172A] dark:text-slate-100 font-sans" dir="rtl">
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-[2px]" style={{ zIndex: 35 }} onClick={() => setMobileOpen(false)} />
      )}
      <aside style={{ width: asideWidth, zIndex: isMobile ? 45 : 40 }} className={`${isMobile ? (mobileOpen ? 'translate-x-0' : 'translate-x-full') : 'translate-x-0'} ${isCollapsed ? 'w-16 min-w-[64px]' : 'w-64 min-w-[256px]'} h-screen fixed right-0 top-0 bottom-0 flex flex-col bg-white dark:bg-[#0F172A] border-l border-[#E2E8F0] dark:border-[#263248] select-none transition-all duration-200 ease-in-out`}>
        <div className={`h-11 py-1 flex items-center border-b border-[#E2E8F0] dark:border-[#263248] flex-shrink-0 ${isCollapsed ? 'justify-center px-1.5' : 'px-3 gap-2'}`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#E11D48] flex items-center justify-center text-white text-xs shadow-xs shrink-0 overflow-hidden">
              {brand.logoUrl ? <img src={brand.logoUrl} alt="Logo" className="w-full h-full object-cover p-0.5" /> : (brand.systemIcon || '🏢')}
            </div>
            {!isCollapsed && (<div className="flex flex-col min-w-0 overflow-hidden"><span className="text-xs font-bold text-[#0F172A] dark:text-white truncate leading-tight">{brand.shortName || 'ERP Master'}</span><span className="text-[10px] font-semibold text-[#E11D48] dark:text-pink-400 truncate leading-tight">{brand.name || 'نظام الإدارة المتكامل'}</span></div>)}
          </div>
        </div>
        <nav className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar ${isCollapsed ? 'px-1' : 'px-2'} py-2 space-y-0.5`}>
          {navSections.map((section, sIdx) => {
            const visible = section.items.filter(it => (!it.phase2 || enablePhase2) && (!it.roles || it.roles.includes(role)));
            if (!visible.length) return null;
            return (
              <React.Fragment key={sIdx}>
                {sIdx > 0 && <div className="my-1.5 border-t border-[#E2E8F0] dark:border-[#263248] mx-2" />}
                {visible.map(item => {
                  const isActive = activeTab === item.id;
                  const IconComp = item.icon || (() => null);
                  const activeCls = 'bg-rose-50 text-[#E11D48] font-bold border-r-2 border-[#E11D48] dark:text-white dark:bg-purple-600/25 dark:border-purple-400';
                  const inactiveCls = 'text-[#475569] hover:bg-slate-100 hover:text-[#0F172A] dark:text-white dark:hover:bg-slate-800/80 transition-colors';
                  const aCls = isActive ? 'bg-rose-50 text-[#E11D48] dark:text-white dark:font-bold dark:bg-purple-600/25 dark:border-r-2 dark:border-purple-400' : 'text-[#475569] hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800/80 transition-colors';
                  return (
                    <button key={item.id} type="button" title={isCollapsed ? item.label : undefined} onClick={() => { setActiveTab(item.id); if (isMobile) setMobileOpen(false); }}
                      className={`nav-item group relative transition-colors cursor-pointer flex ${isCollapsed ? 'h-7 w-7 mx-auto rounded-lg items-center justify-center ' + aCls : 'w-full h-7 px-2.5 rounded-lg items-center gap-2.5 ' + (isActive ? activeCls : inactiveCls)}`}>
                      <div className={`shrink-0 flex items-center justify-center ${isActive ? 'text-[#E11D48] dark:text-white' : 'text-[#475569] dark:text-slate-200 group-hover:text-[#0F172A] dark:group-hover:text-white'}`}>
                        <IconComp className="w-4 h-4 flex-shrink-0" />
                      </div>
                      {!isCollapsed && (<span className={`text-[12px] leading-none flex-1 text-right whitespace-nowrap select-none ${isActive ? 'font-bold text-[#E11D48] dark:text-white' : 'font-medium text-[#0F172A] dark:text-white'}`}>{item.label}</span>)}
                      {!isCollapsed && isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48] dark:bg-white shrink-0" />}
                      {isCollapsed && (<div className="hidden group-hover:flex absolute top-1/2 -translate-y-1/2 z-[9999] px-2.5 py-1.5 bg-[#0F172A] dark:bg-slate-800 text-white text-xs font-medium rounded-md shadow-xl whitespace-nowrap pointer-events-none items-center border border-slate-700" style={{ right: 'calc(100% + 8px)', direction: 'rtl' }}>{item.label}</div>)}
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </nav>
        <div className={`h-10 px-3 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0B132B]/50 flex-shrink-0`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-[#B0005A]/20 text-pink-600 dark:text-pink-300 font-bold flex items-center justify-center text-[10px] border border-pink-500/30 shrink-0" title={isCollapsed ? (currentUser?.full_name || 'المدير التنفيذي') : undefined}>{currentUser?.full_name ? currentUser.full_name[0] : '👤'}</div>
            {!isCollapsed && (<div className="flex flex-col min-w-0 overflow-hidden"><span className="text-[11px] font-bold text-slate-900 dark:text-white truncate leading-tight">{currentUser?.full_name || 'المدير التنفيذي'}</span><span className="text-[9.5px] text-slate-500 dark:text-slate-200 truncate leading-tight">{role === 'admin' ? 'الإدارة العامة' : (currentUser?.role_label || 'مستخدم')}</span></div>)}
          </div>
          {!isCollapsed && (<div className="flex items-center gap-1 shrink-0">{role === 'admin' && onOpenUsersModal && (<button type="button" onClick={onOpenUsersModal} className="p-1 rounded-md text-slate-500 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-xs" title="إدارة المستخدمين">👥</button>)}{onLogout && (<button type="button" onClick={onLogout} className="p-1 rounded-md text-slate-500 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-xs" title="تسجيل الخروج">↩️</button>)}</div>)}
        </div>
      </aside>
      <div style={{ marginRight: SW }} className="flex-1 min-w-0 flex flex-col min-h-screen h-screen overflow-hidden transition-[margin-right] duration-200 ease-in-out">
        <header className="h-11 min-h-[44px] px-2 sm:px-3 bg-white dark:bg-[#0B132B]/95 backdrop-blur border-b border-[#E2E8F0] dark:border-[#263248] flex items-center justify-between gap-2 shrink-0 z-30 select-none">
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <button
              type="button"
              onClick={toggleSidebar}
              className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-[#F8FAFC] dark:bg-slate-900 border border-[#E2E8F0] dark:border-[#263248] text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white transition cursor-pointer text-sm font-bold shrink-0"
              title={isMobile ? (mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة') : (isCollapsed ? 'توسيع القائمة' : 'طي القائمة')}
            >
              <span>{isMobile ? (mobileOpen ? '✕' : '☰') : (isCollapsed ? '←' : '→')}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {canCreateOrder && (
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="h-[30px] px-2.5 sm:px-3 text-xs font-semibold bg-[#E11D48] hover:bg-[#BE123C] text-white rounded-lg shadow-sm flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0"
                title="إنشاء طلب مبيعات جديد"
              >
                <span>+</span>
                <span className="hidden sm:inline">طلب بيع</span>
              </button>
            )}

            <button type="button" onClick={toggleTheme} className="w-[30px] h-[30px] rounded-lg bg-[#F8FAFC] dark:bg-slate-900 border border-[#E2E8F0] dark:border-[#263248] flex items-center justify-center text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white transition cursor-pointer text-xs" title="تبديل المظهر">🌓</button>

            <div className="relative">
              <button type="button" onClick={() => setCurrencyDropdown(!currencyDropdown)} className="h-7 px-2 text-[10.5px] font-mono font-bold text-[#0F172A] dark:text-slate-300 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E2E8F0] dark:border-[#263248] rounded-lg flex items-center gap-1 cursor-pointer transition">
                <span>{currentCurr.code || currentCurr.display}</span>
                <span className="text-[9px] text-[#475569] dark:text-slate-400">▼</span>
              </button>
              {currencyDropdown && (
                <div className="absolute left-0 mt-1 w-36 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-[#263248] rounded-xl shadow-xl p-1 z-50 text-xs space-y-1">
                  {currencyOpts.map(c => (
                    <button key={c.code} type="button" onClick={() => handleSelectCurrency(c)} className={`w-full text-right px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center justify-between ${currentCurr.code === c.code ? 'text-[#E11D48] dark:text-pink-400 font-bold bg-rose-50 dark:bg-slate-800' : 'text-[#475569] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                      <span>{c.label}</span>
                      <span className="font-mono text-[10px] opacity-70">{c.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="button" onClick={() => setActiveTab('factory')} className="w-[30px] h-[30px] rounded-lg bg-[#F8FAFC] dark:bg-slate-900 border border-[#E2E8F0] dark:border-[#263248] flex items-center justify-center text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white transition cursor-pointer text-xs" title="التنبيهات">🔔</button>
          </div>
        </header>
        <main className={`flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0 overflow-x-hidden ${activeTab === 'dashboard' ? 'px-2.5 pb-2 pt-0' : activeTab === 'orders' ? 'p-0 overflow-hidden' : activeTab === 'products' ? 'p-2 overflow-hidden' : activeTab === 'measurement' ? 'p-2 overflow-hidden' : activeTab === 'hr' ? 'p-0 overflow-hidden' : 'p-4 sm:p-6'}`}>
          <div className="flex-1 flex flex-col">{children || (typeof Outlet !== 'undefined' ? <Outlet /> : null)}</div>
        </main>
        {footer}
      </div>
      {modals}
    </div>
  );
}

window.AppLayout = AppLayout;
window.MainLayout = AppLayout;
