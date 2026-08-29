function App() {
  const { useState, useEffect, useCallback, useMemo } = React;
  const PurchasesComponent = typeof Purchases !== 'undefined' ? Purchases : (typeof window !== 'undefined' ? window.Purchases : null);
  const VouchersComponent = typeof Vouchers !== 'undefined' ? Vouchers : (typeof window !== 'undefined' ? window.Vouchers : null);
  const ReportsComponent = typeof Reports !== 'undefined' ? Reports : (typeof window !== 'undefined' ? window.Reports : null);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState(null);

  // ── إدارة المستخدم النشط والصلاحيات (RBAC State) ──
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('erp_active_user');
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return { id: 1, username: 'admin', full_name: 'المدير العام 👑', role: 'admin', role_label: 'المدير العام', is_active: 1 };
  });

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [usersModalOpen, setUsersModalOpen] = useState(false);

  // ── العملة الافتراضية — تُحمَّل من localStorage عند أول تشغيل ──
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

  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [accounts, setAccounts] = useState(typeof INITIAL_ACCOUNTS !== 'undefined' ? INITIAL_ACCOUNTS : []);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [factory, setFactory] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [journal, setJournal] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  
  // Local states for new modules
  const [employees, setEmployees] = useState([]);
  const [payroll, setPayroll] = useState([]);

  const showToast = useCallback((msg, type = 'success') => {
    const text = typeof msg === 'object' ? (msg.message || String(msg)) : String(msg);
    setToast(text);
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── حراسة التبويبات حسب الصلاحيات (Role-Based Tab Guard) ──
  useEffect(() => {
    const role = currentUser?.role || 'admin';
    let allowed = [];
    if (role === 'data_entry') allowed = ['customers'];
    else if (role === 'workshop_manager') allowed = ['inventory', 'factory', 'customers'];
    else if (role === 'accountant') allowed = ['orders', 'purchases', 'vouchers', 'expenses', 'accounts', 'journal', 'reports'];
    else allowed = ['dashboard', 'customers', 'products', 'orders', 'marketing', 'hr', 'inventory', 'factory', 'purchases', 'vouchers', 'expenses', 'accounts', 'journal', 'reports', 'feedback', 'settings'];

    if (!allowed.includes(activeTab)) {
      setActiveTab(allowed[0] || 'customers');
    }
  }, [currentUser, activeTab]);

  useEffect(() => {
    const initData = async () => {
      try {
        if (window.authAPI && typeof window.authAPI.getCurrentUser === 'function') {
          const u = await window.authAPI.getCurrentUser();
          if (u) setCurrentUser(u);
        }

        if (typeof window.loadAllData === 'function') {
          const data = await window.loadAllData();
          if (data) {
            setCustomers(data.customers || []);
            setInventory(data.inventory || []);
            setAccounts(data.accounts || []);
            setProducts(data.products || []);
            setOrders(data.orders || []);
            setPurchases(data.purchases || []);
            setFactory(data.factory || []);
            setVouchers(data.vouchers || []);
            setExpenses(data.expenses || []);
            setJournal(data.journal || []);
            setFeedback(data.feedback || []);
            setCampaigns(data.campaigns || data.marketing_campaigns || []);
            setEmployees(data.employees || []);
            setPayroll(data.payroll || []);
          }
        }
      } catch (e) {
        console.error('Failed to load initial data', e);
      }
    };
    initData();

    // ── الاستماع لتغيير العملة من شاشة الإعدادات ──
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

    // ── توحيد الأرقام باللغة الإنجليزية (English Numerals Standardizer) ──
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

  const allTabs = [
    { id: 'dashboard', label: 'الرئيسية', icon: Icons.Dashboard },
    { id: 'customers', label: 'العملاء و CRM', icon: Icons.Users },
    { id: 'products', label: 'المنتجات والتصاميم', icon: Icons.Calculator },
    { id: 'orders', label: 'المبيعات والطلبات', icon: Icons.ShoppingBag },
    { id: 'factory', label: 'المعمل والإنتاج', icon: Icons.Factory },
    { id: 'inventory', label: 'المخزون والمستودعات', icon: Icons.Scissors },
    { id: 'purchases', label: 'المشتريات والموردون', icon: Icons.Purchases },
    { id: 'accounts', label: 'شجرة الحسابات', icon: Icons.Accounts },
    { id: 'vouchers', label: 'السندات المالية', icon: Icons.Vouchers },
    { id: 'expenses', label: 'المصاريف التشغيلية', icon: Icons.Expenses },
    { id: 'journal', label: 'القيود اليومية', icon: Icons.Journal },
    { id: 'reports', label: 'التقارير المالية', icon: Icons.Reports },
    { id: 'marketing', label: 'التسويق والعروض', icon: Icons.Marketing },
    { id: 'hr', label: 'الموظفون والرواتب', icon: Icons.HR },
    { id: 'feedback', label: 'الجودة والتقييمات', icon: Icons.Star },
    { id: 'settings', label: 'الإعدادات', icon: Icons.Settings }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFB] text-[#25232A] flex flex-row w-full overflow-x-hidden font-sans" dir="rtl">
      {typeof Toast !== 'undefined' && <Toast toast={toast} onClose={() => setToast(null)} />}
      
      {/* 1. Right-side Collapsible RTL Sidebar */}
      {typeof Sidebar !== 'undefined' && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          currentUser={currentUser}
          onOpenUsersModal={() => setUsersModalOpen(true)}
          onLogout={handleLogout}
        />
      )}

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {typeof Header !== 'undefined' && (
          <Header 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            allTabs={allTabs} 
            currentUser={currentUser}
            onOpenLogin={() => setLoginModalOpen(true)}
            onOpenUsersModal={() => setUsersModalOpen(true)}
            onLogout={handleLogout}
            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isSidebarCollapsed={isSidebarCollapsed}
          />
        )}
        
        <main className="flex-1 px-4 md:px-6 lg:px-8 py-6 max-w-[1600px] w-full mx-auto pb-20">
          {activeTab === "dashboard"  && typeof Dashboard !== 'undefined' && <Dashboard setActiveTab={setActiveTab} orders={orders} accounts={accounts} journal={journal} vouchers={vouchers} purchases={purchases} expenses={expenses} currency={systemCurrency} />}
          {activeTab === "customers"  && typeof Customers !== 'undefined' && <Customers customers={customers} setCustomers={setCustomers} products={products} showToast={showToast} currency={systemCurrency} />}
          {activeTab === "products"   && typeof Products !== 'undefined'  && <Products products={products} setProducts={setProducts} inventory={inventory} showToast={showToast} currency={systemCurrency} />}
          {activeTab === "orders"     && typeof Orders !== 'undefined'    && <Orders orders={orders} setOrders={setOrders} customers={customers} products={products} campaigns={campaigns} showToast={showToast} currency={systemCurrency} />}
          {activeTab === "purchases"  && PurchasesComponent && <PurchasesComponent purchases={purchases} setPurchases={setPurchases} inventory={inventory} setInventory={setInventory} accounts={accounts} setAccounts={setAccounts} vouchers={vouchers} setVouchers={setVouchers} journal={journal} setJournal={setJournal} showToast={showToast} currency={systemCurrency} />}
          {activeTab === "inventory"  && typeof Inventory !== 'undefined'  && <Inventory inventory={inventory} setInventory={setInventory} purchases={purchases} orders={orders} showToast={showToast} currency={systemCurrency} />}
          {activeTab === "accounts"   && typeof Accounts !== 'undefined'   && <Accounts accounts={accounts} setAccounts={setAccounts} journal={journal} setJournal={setJournal} vouchers={vouchers} setVouchers={setVouchers} showToast={showToast} currency={systemCurrency} />}
          {activeTab === "factory"    && typeof Factory !== 'undefined'    && <Factory factory={factory} setFactory={setFactory} employees={employees} orders={orders} products={products} inventory={inventory} setInventory={setInventory} customers={customers} showToast={showToast} />}
          {activeTab === "vouchers"   && VouchersComponent && <VouchersComponent vouchers={vouchers} setVouchers={setVouchers} accounts={accounts} setAccounts={setAccounts} journal={journal} setJournal={setJournal} showToast={showToast} currency={systemCurrency} customers={customers} setCustomers={setCustomers} orders={orders} setOrders={setOrders} expenses={expenses} setExpenses={setExpenses} purchases={purchases} employees={employees} />}
          {activeTab === "expenses"   && typeof Expenses !== 'undefined'   && <Expenses expenses={expenses} setExpenses={setExpenses} accounts={accounts} setAccounts={setAccounts} vouchers={vouchers} setVouchers={setVouchers} journal={journal} setJournal={setJournal} showToast={showToast} currency={systemCurrency} />}
          {activeTab === "journal"    && typeof Journal !== 'undefined'    && <Journal journal={journal} setJournal={setJournal} accounts={accounts} setAccounts={setAccounts} vouchers={vouchers} setVouchers={setVouchers} showToast={showToast} currency={systemCurrency} customers={customers} purchases={purchases} employees={employees} />}
          {activeTab === "reports"    && ReportsComponent && <ReportsComponent orders={orders} expenses={expenses} vouchers={vouchers} journal={journal} accounts={accounts} purchases={purchases} customers={customers} inventory={inventory} showToast={showToast} currency={systemCurrency} />}
          {activeTab === "marketing"  && typeof Marketing !== 'undefined'  && <Marketing campaigns={campaigns} setCampaigns={setCampaigns} products={products} accounts={accounts} showToast={showToast} currency={systemCurrency} />}
          {activeTab === "hr"         && typeof HR !== 'undefined'         && <HR employees={employees} setEmployees={setEmployees} payroll={payroll} setPayroll={setPayroll} accounts={accounts} journal={journal} setJournal={setJournal} factory={factory} showToast={showToast} currency={systemCurrency} />}
          {activeTab === "feedback"   && typeof Feedback !== 'undefined'   && <Feedback feedback={feedback} setFeedback={setFeedback} customers={customers} setCustomers={setCustomers} products={products} orders={orders} setOrders={setOrders} factory={factory} setFactory={setFactory} inventory={inventory} purchases={purchases} expenses={expenses} setExpenses={setExpenses} journal={journal} setJournal={setJournal} employees={employees} campaigns={campaigns} showToast={showToast} currency={systemCurrency} />}
          {activeTab === "settings"   && typeof Settings !== 'undefined'   && <Settings showToast={showToast} currency={systemCurrency} />}
        </main>

        <footer className="bg-white border-t border-[#E8E5EA] py-3.5 px-6 text-xs text-[#6F6B75] flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#B0005A]">Little Princesses ERP 👑</span>
            <span>-</span>
            <span>نظام إدارة ومقاسات فساتين الأطفال الفاخرة</span>
          </div>
          <span className="text-[11px] font-semibold text-[#8F2A87] bg-[#F2E7F3] px-2.5 py-0.5 rounded-full border border-[#E5CEE7]">
            Haute Couture SaaS Edition
          </span>
        </footer>
      </div>

      {/* ── Modals ── */}
      {typeof LoginModal !== 'undefined' && (
        <LoginModal 
          isOpen={loginModalOpen} 
          onClose={() => setLoginModalOpen(false)} 
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            showToast(`مرحباً بك ${user.full_name || user.username} 👑`);
          }} 
          showToast={showToast} 
        />
      )}

      {typeof UsersModal !== 'undefined' && (
        <UsersModal 
          isOpen={usersModalOpen} 
          onClose={() => setUsersModalOpen(false)} 
          showToast={showToast} 
          currentRole={currentUser?.role} 
        />
      )}
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center" dir="rtl">
          <div className="w-16 h-16 rounded-2xl bg-pink-600/20 text-[#D81B60] flex items-center justify-center text-3xl mb-4 border border-pink-500/30">
            👑
          </div>
          <h2 className="text-lg font-bold mb-2">مؤسسة الأميرات الصغيرات — Little Princesses ERP</h2>
          <p className="text-xs text-slate-400 max-w-md mb-3">
            حدث تنبيه مؤقت في تحميل الواجهة:
          </p>
          <div className="bg-slate-800/90 border border-slate-700 p-3.5 rounded-xl text-rose-300 text-xs font-mono max-w-2xl overflow-x-auto text-left mb-6 whitespace-pre-wrap select-all" dir="ltr">
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-gradient-to-r from-[#D81B60] to-[#AD1457] text-white rounded-xl text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer"
          >
            🔄 إعادة تنشيط الصفحة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

if (typeof ReactDOM !== 'undefined') {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
