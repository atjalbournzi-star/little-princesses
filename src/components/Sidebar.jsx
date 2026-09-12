const { useState, useMemo } = React;

window.Sidebar = function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  currentUser,
  onOpenUsersModal,
  onLogout
}) {
  const role = currentUser?.role || 'admin';
  const [brandProfile, setBrandProfile] = useState(() => {
    return (typeof window !== 'undefined' && window.BrandService)
      ? window.BrandService.getProfile()
      : {
          name: 'نظام الإدارة المتكامل الذكي',
          shortName: 'ERP Master',
          tagline: 'Enterprise Resource Planning',
          logoUrl: '',
          systemIcon: '🏢'
        };
  });

  React.useEffect(() => {
    const handleBrandChange = (e) => {
      if (e.detail) setBrandProfile(e.detail);
    };
    window.addEventListener('erp:brandProfileChanged', handleBrandChange);
    return () => window.removeEventListener('erp:brandProfileChanged', handleBrandChange);
  }, []);

  // Navigation Groups with clear information hierarchy & Role-Based Access Control
  const navSections = useMemo(() => [
    {
      title: "العمليات والتشغيل",
      items: [
        { id: "dashboard", label: "لوحة التحكم والعمليات", icon: Icons.Dashboard, roles: ['admin', 'accountant', 'workshop_manager', 'data_entry'] },
        { id: "customers", label: "العملاء وإدارة العلاقات (CRM)", icon: Icons.Users, roles: ['admin', 'data_entry'] },
        { id: "orders", label: "أوامر المبيعات ونقاط البيع (POS)", icon: Icons.ShoppingBag, roles: ['admin', 'data_entry'] },
      ]
    },
    {
      title: "إدارة العمليات والإنتاج",
      items: [
        { id: "products", label: "المنتجات ومواصفات التشغيل", icon: Icons.Calculator, roles: ['admin', 'workshop_manager'] },
        { id: "factory", label: "خطوط التصنيع والتشغيل", icon: Icons.Factory, roles: ['admin', 'workshop_manager'] },
        { id: "inventory", label: "المخزون وسلاسل الإمداد", icon: Icons.Scissors, roles: ['admin', 'workshop_manager'] },
        { id: "purchases", label: "المشتريات وإدارة الموردين", icon: Icons.Purchases, roles: ['admin', 'accountant'] },
      ]
    },
    {
      title: "المحاسبة والمالية",
      items: [
        { id: "accounts", label: "شجرة الحسابات والدليل المالي", icon: Icons.Accounts, roles: ['admin', 'accountant'] },
        { id: "vouchers", label: "السندات والمعاملات المالية", icon: Icons.Vouchers, roles: ['admin', 'accountant'] },
        { id: "expenses", label: "المصروفات التشغيلية", icon: Icons.Expenses, roles: ['admin', 'accountant'] },
        { id: "reports", label: "التقارير المالية والميزانية", icon: Icons.Reports, roles: ['admin', 'accountant'] },
      ]
    },
    {
      title: "الحوكمة ونمو الأعمال",
      items: [
        { id: "marketing", label: "التسويق ونمو الأعمال", icon: Icons.Marketing, roles: ['admin', 'data_entry'] },
        { id: "hr", label: "الموارد البشرية والرواتب", icon: Icons.HR, roles: ['admin'] },
        { id: "feedback", label: "إدارة الجودة الشاملة (QA)", icon: Icons.Star, roles: ['admin', 'workshop_manager'] },
        { id: "settings", label: "إعدادات النظام والحوكمة", icon: Icons.Settings, roles: ['admin', 'accountant'] },
      ]
    }
  ], [role]);

  return (
    <aside
      className={`relative flex flex-col bg-white dark:bg-[#0b1329] border-l border-[#E8E5EA] dark:border-slate-800/80 transition-all duration-300 ease-in-out z-30 shadow-[0_2px_12px_rgba(0,0,0,0.02)] select-none ${
        isCollapsed ? 'w-[76px]' : 'w-72'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#E8E5EA] dark:border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#B0005A] via-[#8F2A87] to-[#F28A00] flex items-center justify-center text-white shadow-sm shrink-0 overflow-hidden">
            {brandProfile.logoUrl ? (
              <img src={brandProfile.logoUrl} alt="Logo" className="w-full h-full object-cover p-1 rounded-xl" />
            ) : (
              <span className="text-xl">{brandProfile.systemIcon || '🏢'}</span>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[15px] font-bold text-[#25232A] dark:text-slate-100 truncate tracking-tight" title={brandProfile.name}>
                {brandProfile.shortName || brandProfile.name}
              </span>
              <span className="text-[11px] font-semibold text-[#8F2A87] dark:text-purple-400 -mt-0.5 tracking-wider uppercase truncate" title={brandProfile.tagline}>
                {brandProfile.tagline || 'Enterprise Resource Planning'}
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-7 h-7 rounded-lg border border-[#E8E5EA] dark:border-slate-700 text-[#6F6B75] dark:text-slate-400 hover:text-[#B0005A] dark:hover:text-purple-300 hover:bg-[#FCE8F2] dark:hover:bg-slate-800 flex items-center justify-center transition-all duration-150 cursor-pointer"
          title={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
        >
          {isCollapsed ? (
            <Icons.ChevronLeft className="w-4 h-4" />
          ) : (
            <Icons.ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 no-scrollbar">
        {navSections.map((section, sIdx) => {
          const visibleItems = section.items.filter(item => item.roles.includes(role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[11px] font-semibold text-[#6F6B75] dark:text-slate-400 uppercase tracking-wider">
                  {section.title}
                </div>
              )}
              {visibleItems.map(item => {
                const isActive = activeTab === item.id;
                const IconComponent = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative cursor-pointer ${
                      isActive
                        ? 'bg-[#FCE8F2] dark:bg-purple-950/60 text-[#B0005A] dark:text-purple-300 font-semibold shadow-xs border border-transparent dark:border-purple-800/40'
                        : 'text-[#6F6B75] dark:text-slate-300 hover:text-[#25232A] dark:hover:text-white hover:bg-[#FAFAFB] dark:hover:bg-slate-800/70'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div className={`transition-colors shrink-0 ${isActive ? 'text-[#B0005A] dark:text-purple-400' : 'text-[#6F6B75] dark:text-slate-400 group-hover:text-[#25232A] dark:group-hover:text-white'}`}>
                      {IconComponent && <IconComponent className="w-5 h-5" />}
                    </div>

                    {!isCollapsed && (
                      <span className="truncate text-[13.5px]">{item.label}</span>
                    )}

                    {isActive && !isCollapsed && (
                      <span className="mr-auto w-1.5 h-1.5 rounded-full bg-[#B0005A] dark:bg-purple-400" />
                    )}

                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <div className="absolute right-full mr-2 px-2.5 py-1.5 bg-[#25232A] dark:bg-slate-800 text-white text-xs rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 whitespace-nowrap">
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User Profile & Footer Section */}
      <div className="p-3 border-t border-[#E8E5EA] dark:border-slate-800/80 bg-[#FAFAFB] dark:bg-[#070c1a]">
        <div className={`flex items-center gap-2.5 rounded-xl p-2 bg-white dark:bg-slate-900 border border-[#E8E5EA] dark:border-slate-800 ${isCollapsed ? 'justify-center p-1.5' : ''}`}>
          <div className="w-9 h-9 rounded-lg bg-[#FCE8F2] dark:bg-purple-950/50 text-[#B0005A] dark:text-purple-300 font-bold flex items-center justify-center text-sm border border-[#F2A4CB]/40 dark:border-purple-800/50 shrink-0">
            {currentUser?.full_name ? currentUser.full_name[0] : '👤'}
          </div>

          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-[#25232A] dark:text-slate-100 truncate">
                {currentUser?.full_name || 'المدير التنفيذي'}
              </span>
              <span className="text-[10.5px] text-[#6F6B75] dark:text-slate-400 truncate">
                {role === 'admin' ? 'المدير التنفيذي (Executive)' : (currentUser?.role_label || 'مستخدم النظام')}
              </span>
            </div>
          )}

          {!isCollapsed && role === 'admin' && (
            <button
              onClick={onOpenUsersModal}
              className="p-1.5 rounded-lg text-[#6F6B75] dark:text-slate-400 hover:text-[#B0005A] dark:hover:text-purple-300 hover:bg-[#FCE8F2] dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="إدارة المستخدمين والصلاحيات"
            >
              <Icons.Users className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
