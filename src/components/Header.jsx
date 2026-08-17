const { useState, useEffect, useMemo, useCallback, useRef } = React;
function Header({ activeTab, setActiveTab, allTabs, menuDrawer, setMenuDrawer }) {
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleDropdown = (name) => setOpenDropdown(prev => prev === name ? null : name);
  const closeDropdowns = () => setOpenDropdown(null);

  const prodTabs = [
    { id: 'inventory', label: 'المخزون الخام', icon: Icons.Scissors },
    { id: 'factory', label: 'متابعة الورشة والإنتاج', icon: Icons.Factory }
  ];

  const finTabs = [
    { id: 'purchases', label: 'المشتريات والتوريد', icon: Icons.Purchases },
    { id: 'vouchers', label: 'السندات المالية', icon: Icons.Vouchers },
    { id: 'expenses', label: 'المصاريف التشغيلية', icon: Icons.Expenses },
    { id: 'accounts', label: 'شجرة الحسابات', icon: Icons.Accounts },
    { id: 'journal', label: 'القيود اليومية', icon: Icons.Journal },
    { id: 'reports', label: 'التقارير المالية', icon: Icons.Reports }
  ];

  const [syncInfo, setSyncInfo] = React.useState({ connected: true, status: 'متصل 🟢', last_sync: '18:52' });

  React.useEffect(() => {
    let isMounted = true;
    const checkSync = async () => {
      if (typeof window.fetchSyncStatus === 'function') {
        const res = await window.fetchSyncStatus();
        if (res && isMounted) {
          const timeStr = res.last_sync ? String(res.last_sync).split('T')[1]?.split('.')[0]?.slice(0, 5) || String(res.last_sync).slice(0, 5) : 'الآن';
          setSyncInfo({
            connected: res.connected !== false,
            status: res.status || 'متصل 🟢',
            last_sync: timeStr
          });
        }
      }
    };
    checkSync();
    const interval = setInterval(checkSync, 10000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  const isProdActive = ['inventory', 'factory'].includes(activeTab);
  const isFinActive = ['purchases', 'vouchers', 'expenses', 'accounts', 'journal', 'reports'].includes(activeTab);

  return (
    <header className="sticky top-0 z-40 bg-[#0F172A] border-b-2 border-[#D81B60] shadow-lg backdrop-blur-md" dir="rtl">
      {/* ── Top Main Bar (Compact & Sleek) ── */}
      <div className="flex items-center justify-between px-4 py-2.5 md:px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMenuDrawer(!menuDrawer)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 md:hidden hover:bg-slate-700 transition"
            aria-label="القائمة الرئيسية"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuDrawer ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#D81B60] via-[#C2185B] to-[#00ACC1] flex items-center justify-center text-white text-base shadow-sm border border-pink-400/40">
              👑
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm md:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                مؤسسة الأميرات الصغيرات <span className="text-[11px] font-bold text-[#F48FB1] bg-pink-950/70 border border-pink-700/70 px-1.5 py-0.5 rounded">ERP</span>
              </h1>
              <span className="text-[10px] text-slate-300 font-medium">
                نظام إدارة ومقاسات فساتين الأطفال الفاخرة
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-300">
            <span className="text-cyan-400">📅</span>
            <span>{new Date().toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>

          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${
            syncInfo.connected ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300' : 'bg-rose-950/60 border-rose-800/60 text-rose-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${syncInfo.connected ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
            <span>{syncInfo.status}</span>
            <span className="text-[10px] opacity-70 font-mono">({syncInfo.last_sync})</span>
          </div>
        </div>
      </div>

      {/* ── Mobile Navigation Drawer ── */}
      {menuDrawer && (
        <div className="md:hidden border-t border-slate-800 bg-[#0F172A]/98 backdrop-blur-xl p-3 animate-fadeIn">
          <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto">
            {allTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMenuDrawer(false); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${activeTab === tab.id ? 'bg-[#D81B60] text-white font-bold shadow-sm' : 'bg-slate-800/60 text-slate-200 hover:bg-slate-800'}`}
              >
                {typeof tab.icon === 'function' ? tab.icon() : tab.icon}
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
            <button
              onClick={() => { setActiveTab('marketing'); setMenuDrawer(false); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${activeTab === 'marketing' ? 'bg-[#D81B60] text-white font-bold shadow-sm' : 'bg-slate-800/60 text-slate-200 hover:bg-slate-800'}`}
            >
              {Icons.Marketing()}
              <span className="truncate">التسويق والإعلانات</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Streamlined Desktop Navigation Bar (Enterprise & Compact) ── */}
      <div className="hidden md:block border-t border-slate-800/80 bg-[#0A0F1D] py-1.5 px-6">
        <div className="flex items-center gap-1.5 max-w-7xl mx-auto w-full relative">
          
          <button onClick={() => { setActiveTab('dashboard'); closeDropdowns(); }} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${activeTab === 'dashboard' ? 'bg-[#D81B60] text-white border-[#C2185B] font-bold shadow-sm' : 'bg-transparent text-slate-300 border-transparent hover:bg-slate-800/80 hover:text-white'}`}>
            {Icons.Dashboard()}<span>الرئيسية</span>
          </button>

          <button onClick={() => { setActiveTab('customers'); closeDropdowns(); }} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${activeTab === 'customers' ? 'bg-[#D81B60] text-white border-[#C2185B] font-bold shadow-sm' : 'bg-transparent text-slate-300 border-transparent hover:bg-slate-800/80 hover:text-white'}`}>
            {Icons.Users()}<span>العملاء والمقاسات</span>
          </button>

          <button onClick={() => { setActiveTab('products'); closeDropdowns(); }} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${activeTab === 'products' ? 'bg-[#D81B60] text-white border-[#C2185B] font-bold shadow-sm' : 'bg-transparent text-slate-300 border-transparent hover:bg-slate-800/80 hover:text-white'}`}>
            {Icons.Calculator()}<span>المنتجات والتسعير</span>
          </button>

          <button onClick={() => { setActiveTab('orders'); closeDropdowns(); }} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${activeTab === 'orders' ? 'bg-[#D81B60] text-white border-[#C2185B] font-bold shadow-sm' : 'bg-transparent text-slate-300 border-transparent hover:bg-slate-800/80 hover:text-white'}`}>
            {Icons.ShoppingBag()}<span>الطلبات والفواتير</span>
          </button>

          <button onClick={() => { setActiveTab('marketing'); closeDropdowns(); }} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${activeTab === 'marketing' ? 'bg-[#D81B60] text-white border-[#C2185B] font-bold shadow-sm' : 'bg-transparent text-slate-300 border-transparent hover:bg-slate-800/80 hover:text-white'}`}>
            {Icons.Marketing()}<span>التسويق والإعلانات</span>
          </button>

          <button onClick={() => { setActiveTab('hr'); closeDropdowns(); }} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${activeTab === 'hr' ? 'bg-[#D81B60] text-white border-[#C2185B] font-bold shadow-sm' : 'bg-transparent text-slate-300 border-transparent hover:bg-slate-800/80 hover:text-white'}`}>
            {Icons.HR ? Icons.HR() : Icons.Users()}<span>الموارد البشرية</span>
          </button>

          {/* Production Dropdown */}
          <div className="relative">
            <button onClick={() => toggleDropdown('production')} 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${isProdActive ? 'bg-pink-950/80 text-pink-200 border-pink-700 font-bold' : 'bg-transparent text-slate-300 border-transparent hover:bg-slate-800/80 hover:text-white'}`}>
              {Icons.Factory()}<span>المخزون والإنتاج</span>
              <span className="text-[9px] text-slate-400">▾</span>
            </button>

            {openDropdown === 'production' && (
              <div className="absolute right-0 mt-1.5 w-44 bg-[#0F172A] border border-slate-700 rounded-xl shadow-xl p-1.5 z-50 animate-fadeIn space-y-1">
                {prodTabs.map(t => (
                  <button key={t.id} onClick={() => { setActiveTab(t.id); closeDropdowns(); }} 
                    className={`w-full text-right px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition ${activeTab === t.id ? 'bg-[#D81B60] text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                    {typeof t.icon === 'function' ? t.icon() : t.icon}<span>{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Financials Dropdown */}
          <div className="relative">
            <button onClick={() => toggleDropdown('financials')} 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${isFinActive ? 'bg-pink-950/80 text-pink-200 border-pink-700 font-bold' : 'bg-transparent text-slate-300 border-transparent hover:bg-slate-800/80 hover:text-white'}`}>
              {Icons.Accounts()}<span>المالية والحسابات</span>
              <span className="text-[9px] text-slate-400">▾</span>
            </button>

            {openDropdown === 'financials' && (
              <div className="absolute right-0 mt-1.5 w-48 bg-[#0F172A] border border-slate-700 rounded-xl shadow-xl p-1.5 z-50 animate-fadeIn space-y-1">
                {finTabs.map(t => (
                  <button key={t.id} onClick={() => { setActiveTab(t.id); closeDropdowns(); }} 
                    className={`w-full text-right px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition ${activeTab === t.id ? 'bg-[#D81B60] text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                    {typeof t.icon === 'function' ? t.icon() : t.icon}<span>{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => { setActiveTab('feedback'); closeDropdowns(); }} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${activeTab === 'feedback' ? 'bg-[#D81B60] text-white border-[#C2185B] font-bold shadow-sm' : 'bg-transparent text-slate-300 border-transparent hover:bg-slate-800/80 hover:text-white'}`}>
            {Icons.Star()}<span>الجودة</span>
          </button>

          <button onClick={() => { setActiveTab('settings'); closeDropdowns(); }} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${activeTab === 'settings' ? 'bg-[#D81B60] text-white border-[#C2185B] font-bold shadow-sm' : 'bg-transparent text-slate-300 border-transparent hover:bg-slate-800/80 hover:text-white'}`}>
            {Icons.Settings()}<span>الإعدادات</span>
          </button>

        </div>
      </div>
    </header>
  );
}
