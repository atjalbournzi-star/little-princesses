/**
 * AppLayout.jsx — Main Application Shell & Master Layout Coordinator
 * Compact Enterprise Layout | Little Princesses ERP
 * UI/UX: Collapsible Sidebar (288px/64px), RTL tooltips, Arabic text fix
 */
function AppLayout({
  activeTab = 'dashboard', setActiveTab = () => {}, currentUser, systemCurrency,
  setSystemCurrency, onOpenLogin, onOpenUsersModal, onLogout, children, modals,
  isSidebarCollapsed: propCollapsed, setIsSidebarCollapsed: propSetCollapsed
}) {
  const Icons = window.Icons || {};
  const role = currentUser?.role || 'admin';
  const [searchQuery, setSearchQuery] = React.useState('');
  const [currencyDropdown, setCurrencyDropdown] = React.useState(false);
  const [internalCollapsed, setInternalCollapsed] = React.useState(() => {
    try { return localStorage.getItem('erp_sidebar_collapsed') === 'true'; } catch(e) { return false; }
  });
  const isCollapsed = propCollapsed !== undefined ? propCollapsed : internalCollapsed;
  const setIsCollapsed = (val) => {
    const next = typeof val === 'function' ? val(isCollapsed) : val;
    if (propSetCollapsed) propSetCollapsed(next);
    setInternalCollapsed(next);
    try { localStorage.setItem('erp_sidebar_collapsed', String(next)); } catch(e) {}
    window.dispatchEvent(new CustomEvent('erp:sidebarToggle', { detail: { isCollapsed: next } }));
  };
  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  React.useEffect(() => {
    const h = (e) => { if (e.detail && typeof e.detail.isCollapsed === 'boolean') { if (propSetCollapsed) propSetCollapsed(e.detail.isCollapsed); setInternalCollapsed(e.detail.isCollapsed); } };
    window.addEventListener('erp:sidebarToggle', h);
    return () => window.removeEventListener('erp:sidebarToggle', h);
  }, [propSetCollapsed]);
  const toggleTheme = () => {
    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    try { localStorage.setItem('lp_theme', next); document.documentElement.classList.toggle('dark', next === 'dark'); if (document.body) document.body.classList.toggle('dark', next === 'dark'); window.dispatchEvent(new CustomEvent('lp:themeChanged', { detail: { theme: next } })); } catch(e) {}
  };
  const brand = (typeof window !== 'undefined' && window.BrandService) ? window.BrandService.getProfile() : { name: 'نظام الإدارة المتكامل الذكي', shortName: 'ERP Master' };
  const currencyOpts = [{ code: 'YER', label: 'ريال يمني', display: 'YER ﷼' }, { code: 'SAR', label: 'ريال سعودي', display: 'SAR ﷼' }, { code: 'USD', label: 'دولار أمريكي', display: 'USD $' }];
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
      { id: 'marketing', label: 'التسويق ونمو الأعمال', icon: Icons.Marketing, roles: ['admin','data_entry'] },
      { id: 'hr', label: 'الموارد البشرية والرواتب', icon: Icons.HR, roles: ['admin'] },
      { id: 'feedback', label: 'إدارة الجودة الشاملة (QA)', icon: Icons.Star, roles: ['admin','workshop_manager'] },
      { id: 'settings', label: 'إعدادات النظام والحوكمة', icon: Icons.Settings, roles: ['admin','accountant'] }
    ]}
  ], [role]);
  const SW = isCollapsed ? 64 : 256;
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0B132B] text-slate-900 dark:text-slate-100 font-sans" dir="rtl">
      <aside style={{ width: SW }} className={`${isCollapsed ? 'w-16 min-w-[64px]' : 'w-64 min-w-[256px]'} h-screen fixed right-0 top-0 bottom-0 flex flex-col bg-white dark:bg-[#0F172A] border-l border-slate-200 dark:border-slate-800/80 z-40 select-none transition-[width] duration-200 ease-in-out`}>
        <div className={`h-11 py-1 flex items-center border-b border-slate-200 dark:border-slate-800 flex-shrink-0 ${isCollapsed ? 'justify-center px-1.5' : 'justify-between px-3 gap-2'}`}>
          <div className="flex items-center gap-2 min-w-0">
            <button type="button" onClick={toggleSidebar} className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#B0005A] via-[#8F2A87] to-[#F28A00] flex items-center justify-center text-white text-xs shadow-xs shrink-0 cursor-pointer hover:scale-105 transition-transform" title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}>🏢</button>
            {!isCollapsed && (<div className="flex flex-col min-w-0 overflow-hidden"><span className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">{brand.shortName || 'ERP Master'}</span><span className="text-[10px] font-semibold text-pink-600 dark:text-pink-400 truncate leading-tight">{brand.name || 'الأميرات الصغيرات'}</span></div>)}
          </div>
          {!isCollapsed && (<button type="button" onClick={toggleSidebar} className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:text-white dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0" title="طي القائمة الجانبية"><span className="text-xs font-bold">⇤</span></button>)}
        </div>
        <nav className={`flex-1 overflow-hidden ${isCollapsed ? 'px-1' : 'px-2'} py-2 space-y-0.5`}>
          {navSections.map((section, sIdx) => {
            const visible = section.items.filter(it => !it.roles || it.roles.includes(role));
            if (!visible.length) return null;
            return (
              <React.Fragment key={sIdx}>
                {sIdx > 0 && <div className="my-1.5 border-t border-slate-200 dark:border-slate-800/80 mx-2" />}
                {visible.map(item => {
                  const isActive = activeTab === item.id;
                  const IconComp = item.icon || (() => null);
                  const activeCls = 'bg-pink-50 text-pink-700 border-pink-500 dark:text-white dark:font-bold dark:bg-purple-600/25 dark:border-r-2 dark:border-purple-400';
                  const inactiveCls = 'text-slate-700 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800/80 transition-colors';
                  const aCls = isActive ? 'bg-pink-50 text-pink-700 border-pink-500 dark:text-white dark:font-bold dark:bg-purple-600/25 dark:border-r-2 dark:border-purple-400' : 'text-slate-500 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800/80 transition-colors';
                  return (
                    <button key={item.id} type="button" title={isCollapsed ? item.label : undefined} onClick={() => setActiveTab(item.id)}
                      className={`group relative transition-colors cursor-pointer flex ${isCollapsed ? 'h-7 w-7 mx-auto rounded-lg items-center justify-center ' + aCls : 'w-full h-7 px-2.5 rounded-lg items-center gap-2.5 ' + (isActive ? activeCls : inactiveCls)}`}>
                      <div className={`shrink-0 flex items-center justify-center ${isActive ? 'text-pink-600 dark:text-white' : 'text-slate-500 dark:text-slate-200 group-hover:text-slate-700 dark:group-hover:text-white'}`}>
                        <IconComp className="w-4 h-4 flex-shrink-0" />
                      </div>
                      {!isCollapsed && (<span className="text-[12px] font-medium leading-none flex-1 text-right whitespace-nowrap select-none text-slate-800 dark:text-white">{item.label}</span>)}
                      {!isCollapsed && isActive && <span className="w-1.5 h-1.5 rounded-full bg-pink-500 dark:bg-white shrink-0" />}
                      {isCollapsed && (<div className="hidden group-hover:flex absolute top-1/2 -translate-y-1/2 z-[9999] px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium rounded-md shadow-xl whitespace-nowrap pointer-events-none items-center border border-slate-700" style={{ right: 'calc(100% + 8px)', direction: 'rtl' }}>{item.label}</div>)}
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
      <div style={{ marginRight: SW }} className="flex-1 flex flex-col h-screen overflow-hidden transition-[margin-right] duration-200 ease-in-out">
        <header className="h-11 min-h-[44px] px-3 bg-[#0B132B]/95 backdrop-blur border-b border-slate-800/80 flex items-center justify-between shrink-0 z-30 select-none">
          {/* Right: Sidebar toggle & Branch selector */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSidebar}
              className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white transition cursor-pointer text-xs"
              title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
            >
              <span className="text-sm">{isCollapsed ? '☰' : '⇤'}</span>
            </button>
            <button className="h-[30px] px-2.5 text-[11px] font-semibold text-slate-200 bg-slate-900 border border-slate-700/80 rounded-lg flex items-center gap-1.5 cursor-default">
              <span className="text-xs">🏢</span>
              <span>مشغل الأميرات (المركز الرئيسي)</span>
            </button>
          </div>

          {/* Center: Global Search (Widened) */}
          <div className="hidden md:flex items-center relative flex-1 max-w-lg mx-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث سريع في السجلات... (⌘K)"
              className="w-full h-[30px] text-xs text-white placeholder-slate-400 bg-slate-900/90 border border-slate-700 rounded-lg pr-7 pl-2.5 outline-none font-medium focus:border-pink-500 transition-colors"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">🔍</span>
          </div>

          {/* Left: Actions, Theme, Currency, Bell */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className="h-7.5 px-3 text-xs font-semibold bg-pink-600 hover:bg-pink-700 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>+</span>
              <span>أمر جديد</span>
            </button>

            <button type="button" onClick={toggleTheme} className="w-[30px] h-[30px] rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer text-xs" title="تبديل المظهر">🌓</button>

            <div className="relative">
              <button type="button" onClick={() => setCurrencyDropdown(!currencyDropdown)} className="h-7 px-2 text-[10.5px] font-mono font-bold text-slate-300 bg-slate-900 border border-slate-700 rounded-lg flex items-center gap-1 cursor-pointer transition">
                <span>{currentCurr.display || currentCurr.code}</span>
                <span className="text-[9px] text-slate-400">▼</span>
              </button>
              {currencyDropdown && (
                <div className="absolute left-0 mt-1 w-36 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-1 z-50 text-xs space-y-1">
                  {currencyOpts.map(c => (
                    <button key={c.code} type="button" onClick={() => handleSelectCurrency(c)} className={`w-full text-right px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center justify-between ${currentCurr.code === c.code ? 'text-pink-400 font-bold bg-slate-800' : 'text-slate-300 hover:bg-slate-800'}`}>
                      <span>{c.label}</span>
                      <span className="font-mono text-[10px] opacity-70">{c.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="button" onClick={() => setActiveTab('factory')} className="w-[30px] h-[30px] rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer text-xs" title="التنبيهات">🔔</button>
          </div>
        </header>
        <main className={`flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden ${activeTab === 'dashboard' ? 'px-2.5 pb-2 pt-0' : activeTab === 'orders' ? 'p-0 overflow-hidden flex flex-col' : activeTab === 'products' ? 'p-2 overflow-hidden flex flex-col' : 'p-6 space-y-6'}`}>
          {children || (typeof Outlet !== 'undefined' ? <Outlet /> : null)}
        </main>
      </div>
      {modals}
    </div>
  );
}

window.AppLayout = AppLayout;
window.MainLayout = AppLayout;
