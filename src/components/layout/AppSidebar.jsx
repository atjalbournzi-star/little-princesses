/**
 * AppSidebar.jsx — Compact Enterprise Navigation Sidebar
 * Modular Layout Component | Little Princesses ERP
 * UI/UX: Collapsible (288px/64px), RTL tooltips, Arabic text fix
 */
function AppSidebar({
  activeTab, setActiveTab, currentUser, onOpenUsersModal, onLogout,
  isSidebarCollapsed: propCollapsed, setIsSidebarCollapsed: propSetCollapsed
}) {
  const Icons = window.Icons || {};
  const role = currentUser?.role || 'admin';
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
  const [brandProfile, setBrandProfile] = React.useState(() => {
    return (typeof window !== 'undefined' && window.BrandService) ? window.BrandService.getProfile() : { name: 'نظام الإدارة المتكامل الذكي', shortName: 'ERP Master' };
  });
  React.useEffect(() => {
    const hb = (e) => { if (e.detail) setBrandProfile(e.detail); };
    window.addEventListener('erp:brandProfileChanged', hb);
    return () => window.removeEventListener('erp:brandProfileChanged', hb);
  }, []);
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
    <aside style={{ width: SW }} className={`${isCollapsed ? 'w-16 min-w-[64px]' : 'w-64 min-w-[256px]'} h-screen fixed right-0 top-0 bottom-0 flex flex-col bg-white dark:bg-[#0F172A] border-l border-slate-200 dark:border-slate-800/80 z-40 select-none transition-[width] duration-200 ease-in-out`}>
      <div className={`h-11 py-1 flex items-center border-b border-slate-200 dark:border-slate-800 flex-shrink-0 ${isCollapsed ? 'justify-center px-1.5' : 'justify-between px-3 gap-2'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <button type="button" onClick={toggleSidebar} className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#B0005A] via-[#8F2A87] to-[#F28A00] flex items-center justify-center text-white text-xs shadow-xs shrink-0 cursor-pointer hover:scale-105 transition-transform" title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}>🏢</button>
          {!isCollapsed && (<div className="flex flex-col min-w-0 overflow-hidden"><span className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">{brandProfile.shortName || 'ERP Master'}</span><span className="text-[10px] font-semibold text-pink-600 dark:text-pink-400 truncate leading-tight">{brandProfile.name || 'الأميرات الصغيرات'}</span></div>)}
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
          {!isCollapsed && (<div className="flex flex-col min-w-0 overflow-hidden"><span className="text-[11px] font-bold text-slate-900 dark:text-white truncate leading-tight">{currentUser?.full_name || 'المدير التنفيذي'}</span><span className="text-[9.5px] text-slate-500 dark:text-slate-200 truncate leading-tight">{role === 'admin' ? 'الإدارة العامة' : (currentUser?.role_label || 'مستخدم النظام')}</span></div>)}
        </div>
        {!isCollapsed && (<div className="flex items-center gap-1 shrink-0">{role === 'admin' && onOpenUsersModal && (<button type="button" onClick={onOpenUsersModal} className="p-1 rounded-md text-slate-500 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-xs" title="المستخدمين">👥</button>)}{onLogout && (<button type="button" onClick={onLogout} className="p-1 rounded-md text-slate-500 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-xs" title="تسجيل الخروج">↩️</button>)}</div>)}
      </div>
    </aside>
  );
}

window.AppSidebar = AppSidebar;
