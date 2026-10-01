/**
 * AppTopbar.jsx — Compact Enterprise Top Navigation Header
 * Modular Layout Component | Little Princesses ERP
 */
function AppTopbar({
  activeTab, setActiveTab, currentUser, systemCurrency, setSystemCurrency,
  onOpenLogin, onOpenUsersModal, onLogout,
  isSidebarCollapsed: propCollapsed, setIsSidebarCollapsed: propSetCollapsed
}) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [branchDropdown, setBranchDropdown] = React.useState(false);
  const [currencyDropdown, setCurrencyDropdown] = React.useState(false);

  const [internalCollapsed, setInternalCollapsed] = React.useState(() => {
    try { return localStorage.getItem('erp_sidebar_collapsed') === 'true'; } catch(e) { return false; }
  });
  const isCollapsed = propCollapsed !== undefined ? propCollapsed : internalCollapsed;

  const toggleSidebar = () => {
    const next = !isCollapsed;
    if (propSetCollapsed) propSetCollapsed(next);
    setInternalCollapsed(next);
    try { localStorage.setItem('erp_sidebar_collapsed', String(next)); } catch(e) {}
    window.dispatchEvent(new CustomEvent('erp:sidebarToggle', { detail: { isCollapsed: next } }));
  };

  React.useEffect(() => {
    const handler = (e) => {
      if (e.detail && typeof e.detail.isCollapsed === 'boolean') {
        if (propSetCollapsed) propSetCollapsed(e.detail.isCollapsed);
        setInternalCollapsed(e.detail.isCollapsed);
      }
    };
    window.addEventListener('erp:sidebarToggle', handler);
    return () => window.removeEventListener('erp:sidebarToggle', handler);
  }, [propSetCollapsed]);

  const toggleTheme = () => {
    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    try {
      localStorage.setItem('lp_theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      if (document.body) document.body.classList.toggle('dark', next === 'dark');
      window.dispatchEvent(new CustomEvent('lp:themeChanged', { detail: { theme: next } }));
    } catch(e) {}
  };

  const currencyOpts = [{ code: 'YER', symbol: '﷼', label: 'ريال يمني', display: 'YER ﷼' }, { code: 'SAR', symbol: '﷼', label: 'ريال سعودي', display: 'SAR ﷼' }, { code: 'USD', symbol: '$', label: 'دولار أمريكي', display: 'USD $' }];
  const currentCurr = systemCurrency || currencyOpts[0];

  const handleSelectCurrency = (c) => {
    if (setSystemCurrency) setSystemCurrency(c);
    try {
      localStorage.setItem('erp_system_currency', c.code);
      window.dispatchEvent(new CustomEvent('erp:currencyChanged', { detail: c }));
    } catch(e) {}
    setCurrencyDropdown(false);
  };

  const tabTitles = {
    dashboard: 'لوحة التحكم والعمليات', customers: 'العملاء وإدارة العلاقات (CRM)', orders: 'أوامر المبيعات ونقاط البيع (POS)',
    products: 'المنتجات ومواصفات التشغيل', factory: 'خطوط التصنيع والتشغيل', inventory: 'المخزون وسلاسل الإمداد',
    purchases: 'المشتريات وإدارة الموردين', accounts: 'شجرة الحسابات والدليل المالي', vouchers: 'السندات والمعاملات المالية',
    expenses: 'المصروفات التشغيلية', reports: 'التقارير المالية والتشغيلية', marketing: 'التسويق ونمو الأعمال',
    hr: 'الموارد البشرية والرواتب', feedback: 'إدارة الجودة الشاملة (QA)', settings: 'إعدادات النظام والحوكمة'
  };

  return (
    <header className="h-11 min-h-[44px] px-3 bg-[#0B132B]/95 backdrop-blur border-b border-slate-800/80 flex items-center justify-between shrink-0 z-30 select-none">
      {/* Right / Start: Sidebar Toggle & Branch Selector */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleSidebar}
          className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white transition cursor-pointer text-xs"
          title={isCollapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
        >
          <span className="text-sm">{isCollapsed ? "☰" : "⇤"}</span>
        </button>
        <button
          type="button"
          onClick={() => setBranchDropdown(!branchDropdown)}
          className="h-[30px] px-2.5 text-[11px] font-semibold text-slate-200 bg-slate-900 border border-slate-700/80 rounded-lg flex items-center gap-1.5 cursor-pointer"
        >
          <span className="text-xs">🏢</span>
          <span>مشغل الأميرات (المركز الرئيسي)</span>
          <span className="text-[9px] text-slate-400">▼</span>
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

      {/* Left / End: Actions, Theme, Currency, Bell */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab && setActiveTab('orders')}
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

        <button type="button" onClick={() => setActiveTab && setActiveTab('factory')} className="w-[30px] h-[30px] rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer text-xs" title="التنبيهات">🔔</button>
      </div>
    </header>
  );
}

window.AppTopbar = AppTopbar;
