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

  // Navigation Groups with clear information hierarchy
  const navSections = useMemo(() => [
    {
      title: "العمليات الأساسية",
      items: [
        { id: "dashboard", label: "الرئيسية", icon: Icons.Dashboard, roles: ['admin', 'accountant', 'workshop_manager', 'data_entry'] },
        { id: "customers", label: "العملاء و CRM", icon: Icons.Users, roles: ['admin', 'accountant', 'data_entry'] },
        { id: "orders", label: "المبيعات والطلبات", icon: Icons.ShoppingBag, roles: ['admin', 'accountant', 'data_entry'] },
      ]
    },
    {
      title: "الأزياء والإنتاج",
      items: [
        { id: "products", label: "المنتجات والتصاميم", icon: Icons.Calculator, roles: ['admin', 'workshop_manager'] },
        { id: "factory", label: "المعمل والإنتاج", icon: Icons.Factory, roles: ['admin', 'workshop_manager'] },
        { id: "inventory", label: "المخزون والمستودعات", icon: Icons.Scissors, roles: ['admin', 'workshop_manager'] },
        { id: "purchases", label: "المشتريات والموردون", icon: Icons.Purchases, roles: ['admin', 'accountant'] },
      ]
    },
    {
      title: "المحاسبة والمالية",
      items: [
        { id: "accounts", label: "شجرة الحسابات", icon: Icons.Accounts, roles: ['admin', 'accountant'] },
        { id: "vouchers", label: "السندات المالية", icon: Icons.Vouchers, roles: ['admin', 'accountant'] },
        { id: "expenses", label: "المصاريف التشغيلية", icon: Icons.Expenses, roles: ['admin', 'accountant'] },
        { id: "journal", label: "القيود اليومية", icon: Icons.Journal, roles: ['admin', 'accountant'] },
        { id: "reports", label: "التقارير المالية", icon: Icons.Reports, roles: ['admin', 'accountant'] },
      ]
    },
    {
      title: "النمو والإدارة",
      items: [
        { id: "marketing", label: "التسويق والعروض", icon: Icons.Marketing, roles: ['admin', 'accountant'] },
        { id: "hr", label: "الموظفون والرواتب", icon: Icons.HR, roles: ['admin', 'accountant'] },
        { id: "feedback", label: "الجودة والتقييمات", icon: Icons.Star, roles: ['admin', 'workshop_manager', 'data_entry'] },
        { id: "settings", label: "الإعدادات", icon: Icons.Settings, roles: ['admin', 'accountant', 'workshop_manager', 'data_entry'] },
      ]
    }
  ], [role]);

  return (
    <aside
      className={`relative flex flex-col bg-white border-l border-[#E8E5EA] transition-all duration-300 ease-in-out z-30 shadow-[0_2px_12px_rgba(0,0,0,0.02)] select-none ${
        isCollapsed ? 'w-[76px]' : 'w-72'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#E8E5EA]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#B0005A] via-[#8F2A87] to-[#F28A00] flex items-center justify-center text-white shadow-sm shrink-0">
            <span className="text-xl">👑</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[15px] font-bold text-[#25232A] truncate tracking-tight">
                Little Princesses
              </span>
              <span className="text-[11px] font-semibold text-[#8F2A87] -mt-0.5 tracking-wider uppercase">
                Haute Couture ERP
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-7 h-7 rounded-lg border border-[#E8E5EA] text-[#6F6B75] hover:text-[#B0005A] hover:bg-[#FCE8F2] flex items-center justify-center transition-all duration-150"
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
                <div className="px-3 pb-1 text-[11px] font-semibold text-[#6F6B75] uppercase tracking-wider">
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
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
                      isActive
                        ? 'bg-[#FCE8F2] text-[#B0005A] font-semibold shadow-xs'
                        : 'text-[#6F6B75] hover:text-[#25232A] hover:bg-[#FAFAFB]'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div className={`transition-colors shrink-0 ${isActive ? 'text-[#B0005A]' : 'text-[#6F6B75] group-hover:text-[#25232A]'}`}>
                      {IconComponent && <IconComponent className="w-5 h-5" />}
                    </div>

                    {!isCollapsed && (
                      <span className="truncate text-[13.5px]">{item.label}</span>
                    )}

                    {isActive && !isCollapsed && (
                      <span className="mr-auto w-1.5 h-1.5 rounded-full bg-[#B0005A]" />
                    )}

                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <div className="absolute right-full mr-2 px-2.5 py-1.5 bg-[#25232A] text-white text-xs rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 whitespace-nowrap">
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
      <div className="p-3 border-t border-[#E8E5EA] bg-[#FAFAFB]">
        <div className={`flex items-center gap-2.5 rounded-xl p-2 bg-white border border-[#E8E5EA] ${isCollapsed ? 'justify-center p-1.5' : ''}`}>
          <div className="w-9 h-9 rounded-lg bg-[#FCE8F2] text-[#B0005A] font-bold flex items-center justify-center text-sm border border-[#F2A4CB]/40 shrink-0">
            {currentUser?.full_name ? currentUser.full_name[0] : '👑'}
          </div>

          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-[#25232A] truncate">
                {currentUser?.full_name || 'المدير العام'}
              </span>
              <span className="text-[10.5px] text-[#6F6B75] truncate">
                {currentUser?.role_label || 'المدير العام (admin)'}
              </span>
            </div>
          )}

          {!isCollapsed && role === 'admin' && (
            <button
              onClick={onOpenUsersModal}
              className="p-1.5 rounded-lg text-[#6F6B75] hover:text-[#B0005A] hover:bg-[#FCE8F2] transition-colors"
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
