function App() {
  const { useState, useEffect, useCallback } = React;
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [menuDrawer, setMenuDrawer] = useState(false);
  const [toast, setToast] = useState(null);

  // ── العملة الافتراضية — تُحمَّل من localStorage عند أول تشغيل ──
  const [systemCurrency, setSystemCurrency] = useState(() => {
    try {
      const stored = localStorage.getItem('erp_system_currency');
      const opts = [{code:'USD',symbol:'$',label:'دولار أمريكي',display:'USD $'},{code:'YER',symbol:'﷼',label:'ريال يمني',display:'YER ﷼'},{code:'SAR',symbol:'﷼',label:'ريال سعودي',display:'SAR ﷼'}];
      return opts.find(c => c.code === stored) || opts[0];
    } catch(e) { return {code:'USD',symbol:'$',label:'دولار أمريكي',display:'USD $'}; }
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

  useEffect(() => {
    const initData = async () => {
      try {
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
      const opts = [{code:'USD',symbol:'$',label:'دولار أمريكي',display:'USD $'},{code:'YER',symbol:'﷼',label:'ريال يمني',display:'YER ﷼'},{code:'SAR',symbol:'﷼',label:'ريال سعودي',display:'SAR ﷼'}];
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
          // React onChange requires dispatching a native event after manual value change
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

    const allTabs = [
    { id: 'dashboard', label: 'الرئيسية', icon: Icons.Dashboard },
    { id: 'customers', label: 'العملاء والمقاسات', icon: Icons.Users },
    { id: 'products', label: 'المنتجات والتسعير', icon: Icons.Calculator },
    { id: 'orders', label: 'الطلبات والفواتير', icon: Icons.ShoppingBag },
    { id: 'purchases', label: 'المشتريات والتوريد', icon: Icons.Purchases },
    { id: 'inventory', label: 'المخزون الخام', icon: Icons.Scissors },
    { id: 'accounts', label: 'شجرة الحسابات', icon: Icons.Accounts },
    { id: 'factory', label: 'الورشة والإنتاج', icon: Icons.Factory },
    { id: 'vouchers', label: 'السندات المالية', icon: Icons.Vouchers },
    { id: 'expenses', label: 'المصاريف التشغيلية', icon: Icons.Expenses },
    { id: 'journal', label: 'القيود اليومية', icon: Icons.Journal },
    { id: 'reports', label: 'التقارير المالية', icon: Icons.Reports },
    { id: 'marketing', label: 'التسويق والإعلانات', icon: Icons.Marketing },
    { id: 'hr', label: 'الموارد البشرية والرواتب', icon: Icons.HR },
    { id: 'feedback', label: 'رضا العملاء والجودة', icon: Icons.Star },
    { id: 'settings', label: 'الإعدادات', icon: Icons.Settings }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full overflow-x-hidden text-right" dir="rtl">
      {typeof Toast !== 'undefined' && <Toast toast={toast} onClose={() => setToast(null)} />}
      
      {typeof Header !== 'undefined' && (
        <Header 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          allTabs={allTabs} 
          menuDrawer={menuDrawer} 
          setMenuDrawer={setMenuDrawer} 
        />
      )}
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 pb-28">
        {activeTab === "dashboard"  && <Dashboard setActiveTab={setActiveTab} orders={orders} accounts={accounts} currency={systemCurrency} />}
        {activeTab === "customers"  && <Customers customers={customers} setCustomers={setCustomers} products={products} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "products"   && <Products products={products} setProducts={setProducts} inventory={inventory} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "orders"     && <Orders orders={orders} setOrders={setOrders} customers={customers} products={products} campaigns={campaigns} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "purchases"  && <Purchases purchases={purchases} setPurchases={setPurchases} inventory={inventory} setInventory={setInventory} accounts={accounts} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "inventory"  && <Inventory inventory={inventory} setInventory={setInventory} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "accounts"   && <Accounts accounts={accounts} setAccounts={setAccounts} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "factory"    && <Factory factory={factory} setFactory={setFactory} employees={employees} orders={orders} products={products} inventory={inventory} setInventory={setInventory} customers={customers} showToast={showToast} />}
        {activeTab === "vouchers"   && <Vouchers vouchers={vouchers} setVouchers={setVouchers} accounts={accounts} showToast={showToast} currency={systemCurrency} customers={customers} setCustomers={setCustomers} orders={orders} setOrders={setOrders} />}
        {activeTab === "expenses"   && <Expenses expenses={expenses} setExpenses={setExpenses} accounts={accounts} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "journal"    && <Journal journal={journal} setJournal={setJournal} accounts={accounts} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "reports"    && <Reports orders={orders} expenses={expenses} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "marketing"  && <Marketing campaigns={campaigns} setCampaigns={setCampaigns} products={products} accounts={accounts} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "hr"         && <HR employees={employees} setEmployees={setEmployees} payroll={payroll} setPayroll={setPayroll} accounts={accounts} journal={journal} setJournal={setJournal} factory={factory} showToast={showToast} currency={systemCurrency} />}
        {activeTab === "feedback"   && <Feedback feedback={feedback} setFeedback={setFeedback} customers={customers} orders={orders} showToast={showToast} />}
        {activeTab === "settings"   && <Settings showToast={showToast} />}
      </main>

      <footer className="bg-[#0F172A] text-slate-400 py-6 border-t border-slate-800 text-center text-xs font-semibold space-y-1">
        <p className="text-amber-300 font-bold">Little Princesses Organization - Specializing in Children's Garments 👑</p>
        <p className="text-slate-400">النظام المحاسبي والإداري والإنتاجي المتكامل للـ 13 قسماً | دعم سحابي مباشر 24/7</p>
      </footer>

      {typeof MobileNav !== 'undefined' && (
        <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
    </div>
  );
}

if (typeof ReactDOM !== 'undefined') {
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
}
