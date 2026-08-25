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
  isSidebarCollapsed
}) {
  const [userDropdown, setUserDropdown] = useState(false);
  const [syncInfo, setSyncInfo] = useState({ connected: true, status: 'متصل 🟢', last_sync: 'الآن' });
  const [searchQuery, setSearchQuery] = useState('');

  const user = currentUser || { id: 1, username: 'admin', full_name: 'المدير العام 👑', role: 'admin', role_label: 'المدير العام' };
  const userRole = user.role || 'admin';

  useEffect(() => {
    let isMounted = true;
    const checkSync = async () => {
      if (typeof window.fetchSyncStatus === 'function') {
        try {
          const res = await window.fetchSyncStatus();
          if (res && isMounted) {
            const timeStr = res.last_sync ? String(res.last_sync).split('T')[1]?.split('.')[0]?.slice(0, 5) || String(res.last_sync).slice(0, 5) : 'الآن';
            setSyncInfo({
              connected: res.connected !== false,
              status: res.status || 'متصل 🟢',
              last_sync: timeStr
            });
          }
        } catch(e){}
      }
    };
    checkSync();
    const interval = setInterval(checkSync, 12000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  // Map active tab to breadcrumb title & category
  const tabMetadata = useMemo(() => {
    const map = {
      dashboard: { title: "لوحة التحكم التنفيذية", category: "الرئيسية" },
      customers: { title: "العملاء وسجل المقاسات", category: "العملاء و CRM" },
      products: { title: "المنتجات والتصاميم و BOM", category: "الأزياء والتصميم" },
      orders: { title: "المبيعات والطلبات والفواتير", category: "المبيعات" },
      factory: { title: "إدارة الورشة والمعمل والإنتاج", category: "الإنتاج" },
      inventory: { title: "مخزون الأقمشة والمستلزمات", category: "المستودعات" },
      purchases: { title: "المشتريات وفواتير الموردين", category: "المشتريات" },
      accounts: { title: "شجرة الحسابات المالية (24 عمود)", category: "المحاسبة والمالية" },
      vouchers: { title: "السندات المالية والقبض والصرف", category: "المحاسبة والمالية" },
      expenses: { title: "المصاريف التشغيلية والإدارية", category: "المحاسبة والمالية" },
      journal: { title: "دفتر القيود اليومية المحاسبية", category: "المحاسبة والمالية" },
      reports: { title: "القوائم والتقارير المالية والختامية", category: "التقارير" },
      marketing: { title: "محرك التسويق والذكاء الإعلاني", category: "النمو والتسويق" },
      hr: { title: "إدارة الموظفين ومسير الرواتب", category: "الموارد البشرية" },
      feedback: { title: "تقييمات الجودة وتجارب العملاء", category: "الجودة" },
      settings: { title: "إعدادات النظام والعملات", category: "الإدارة" }
    };
    return map[activeTab] || { title: "لوحة التحكم", category: "Little Princesses ERP" };
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
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-[#E8E5EA] px-4 md:px-6 flex items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.02)]" dir="rtl">
      {/* Right Side: Sidebar Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl border border-[#E8E5EA] text-[#6F6B75] hover:text-[#B0005A] hover:bg-[#FCE8F2] md:hidden transition cursor-pointer"
          title="القائمة الجانبية"
        >
          <Icons.Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-[#6F6B75]">
            <span className="font-medium">{tabMetadata.category}</span>
            <Icons.ChevronLeft className="w-3.5 h-3.5 text-[#E8E5EA]" />
            <span className="font-semibold text-[#B0005A]">{tabMetadata.title}</span>
          </div>
          <span className="text-sm font-bold text-[#25232A] hidden sm:block">
            {tabMetadata.title}
          </span>
        </div>
      </div>

      {/* Center: Global Quick Search */}
      <div className="hidden lg:flex items-center relative w-96 max-w-md">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6F6B75] pointer-events-none">
          <Icons.Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث سريع في العملاء، الطلبات، التصاميم، الفواتير..."
          className="w-full h-10 pr-9 pl-4 text-xs bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl text-[#25232A] placeholder-[#6F6B75] focus:bg-white focus:border-[#B0005A] focus:ring-2 focus:ring-[#FCE8F2] transition-all outline-none"
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#6F6B75] bg-white border border-[#E8E5EA] px-1.5 py-0.5 rounded font-mono">
          ⌘K
        </span>
      </div>

      {/* Left Side: Branch, Cloud Sync, Quick Action & User Profile */}
      <div className="flex items-center gap-2.5">
        {/* Branch Context Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F2E7F3] border border-[#E5CEE7] text-[#8F2A87] text-[11.5px] font-semibold">
          <span>🏛️</span>
          <span>الفرع الرئيسي - صنعاء</span>
        </div>

        {/* Realtime Cloud Sync Status */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
          syncInfo.connected
            ? 'bg-[#E2F5F7] border-[#C5ECF0] text-[#007F8C]'
            : 'bg-[#FFF1DC] border-[#FFE4B9] text-[#F28A00]'
        }`}>
          <span className={`w-2 h-2 rounded-full ${syncInfo.connected ? 'bg-[#009FAE] animate-pulse' : 'bg-[#F28A00]'}`} />
          <span>{syncInfo.status}</span>
          <span className="text-[10px] opacity-70 font-mono">({syncInfo.last_sync})</span>
        </div>

        {/* Quick Action Button */}
        <button
          onClick={() => setActiveTab('orders')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#B0005A] hover:bg-[#8E0049] text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
        >
          <Icons.Plus className="w-4 h-4" />
          <span>طلب جديد</span>
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserDropdown(!userDropdown)}
            className="flex items-center gap-2 py-1 px-2 rounded-xl bg-[#FAFAFB] hover:bg-white border border-[#E8E5EA] transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#B0005A] via-[#8F2A87] to-[#009FAE] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {user.username ? user.username.slice(0, 2).toUpperCase() : 'LP'}
            </div>
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-xs font-bold text-[#25232A] leading-tight">
                {user.full_name || user.username}
              </span>
              <span className="text-[10.5px] text-[#6F6B75]">
                {user.role_label || user.role}
              </span>
            </div>
            <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-md border ${getRoleBadgeColor(userRole)}`}>
              {userRole === 'admin' ? 'مدير' : userRole === 'accountant' ? 'محاسب' : userRole === 'workshop_manager' ? 'ورشة' : 'مدخل'}
            </span>
            <Icons.ChevronDown className="w-3.5 h-3.5 text-[#6F6B75]" />
          </button>

          {/* User Dropdown Modal */}
          {userDropdown && (
            <div className="absolute left-0 mt-2 w-64 bg-white border border-[#E8E5EA] rounded-2xl shadow-xl p-2 z-50 animate-fadeIn space-y-1.5">
              <div className="p-3 bg-[#FAFAFB] rounded-xl border border-[#E8E5EA] text-right">
                <div className="font-bold text-sm text-[#25232A]">{user.full_name || user.username}</div>
                <div className="text-xs text-[#6F6B75] font-mono">@{user.username}</div>
                <div className={`mt-2 inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border ${getRoleBadgeColor(userRole)}`}>
                  {user.role_label || userRole}
                </div>
              </div>

              {userRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => { setUserDropdown(false); if (onOpenUsersModal) onOpenUsersModal(); }}
                  className="w-full text-right px-3 py-2 rounded-xl text-xs font-bold text-[#25232A] hover:bg-[#FCE8F2] hover:text-[#B0005A] flex items-center gap-2 transition cursor-pointer"
                >
                  <Icons.Users className="w-4 h-4 text-[#B0005A]" />
                  <span>إدارة المستخدمين والصلاحيات (RBAC)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => { setUserDropdown(false); if (onOpenLogin) onOpenLogin(); }}
                className="w-full text-right px-3 py-2 rounded-xl text-xs font-bold text-[#25232A] hover:bg-[#E2F5F7] hover:text-[#007F8C] flex items-center gap-2 transition cursor-pointer"
              >
                <span>🔄</span>
                <span>تبديل المستخدم (Switch Role)</span>
              </button>

              <div className="border-t border-[#E8E5EA] pt-1">
                <button
                  type="button"
                  onClick={() => { setUserDropdown(false); if (onLogout) onLogout(); }}
                  className="w-full text-right px-3 py-2 rounded-xl text-xs font-bold text-[#D64545] hover:bg-rose-50 flex items-center gap-2 transition cursor-pointer"
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
