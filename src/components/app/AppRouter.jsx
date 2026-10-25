/**
 * ============================================================================
 * AppRouter.jsx — Central Tab & Workspace Router
 * Architecture: Modular App Orchestration | Little Princesses ERP
 * ============================================================================
 */

function AppRouter({
  activeTab,
  setActiveTab,
  orders,
  setOrders,
  accounts,
  setAccounts,
  journal,
  setJournal,
  vouchers,
  setVouchers,
  purchases,
  setPurchases,
  expenses,
  setExpenses,
  factory,
  setFactory,
  customers,
  setCustomers,
  inventory,
  setInventory,
  products,
  setProducts,
  campaigns,
  setCampaigns,
  employees,
  setEmployees,
  payroll,
  setPayroll,
  feedback,
  setFeedback,
  systemCurrency,
  showToast,
  targetProductionJob,
  setTargetProductionJob
}) {
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      setTick(t => t + 1);
      if (attempts > 25) clearInterval(timer);
    }, 80);
    return () => clearInterval(timer);
  }, [activeTab]);

  const getComp = (name, altName) => {
    if (typeof window !== 'undefined') {
      if (window[name]) return window[name];
      if (altName && window[altName]) return window[altName];
    }
    try {
      const val = eval(`typeof ${name} !== 'undefined' ? ${name} : null`);
      if (val) return val;
      if (altName) return eval(`typeof ${altName} !== 'undefined' ? ${altName} : null`);
    } catch (e) { return null; }
    return null;
  };

  const DashboardComponent = getComp('Dashboard');
  const CustomersComponent = getComp('Customers');
  const ProductsComponent  = getComp('Products', 'ProductsComponent');
  const OrdersComponent    = getComp('Orders');
  const PurchasesComponent = getComp('Purchases');
  const InventoryComponent = getComp('Inventory');
  const AccountsComponent  = getComp('Accounts');
  const FactoryComponent   = getComp('Factory');
  const VouchersComponent  = getComp('Vouchers');
  const ExpensesComponent  = getComp('Expenses');
  const JournalComponent   = getComp('Journal');
  const ReportsComponent   = getComp('Reports');
  const MarketingComponent = getComp('Marketing', 'MarketingLayout');
  const HRComponent        = getComp('HR', 'HRLayout');
  const FeedbackComponent  = getComp('Feedback');
  const SettingsComponent  = getComp('Settings');

  const hasActiveComp = Boolean(
    (activeTab === 'dashboard' && DashboardComponent) ||
    (activeTab === 'customers' && CustomersComponent) ||
    (activeTab === 'products' && ProductsComponent) ||
    (activeTab === 'orders' && OrdersComponent) ||
    (activeTab === 'purchases' && PurchasesComponent) ||
    (activeTab === 'inventory' && InventoryComponent) ||
    (activeTab === 'accounts' && AccountsComponent) ||
    (activeTab === 'factory' && FactoryComponent) ||
    (activeTab === 'vouchers' && VouchersComponent) ||
    (activeTab === 'expenses' && ExpensesComponent) ||
    (activeTab === 'journal' && JournalComponent) ||
    (activeTab === 'reports' && ReportsComponent) ||
    (activeTab === 'marketing' && MarketingComponent) ||
    (activeTab === 'hr' && HRComponent) ||
    (activeTab === 'feedback' && FeedbackComponent) ||
    (activeTab === 'settings' && SettingsComponent)
  );

  return (
    <main className={`flex-1 w-full ${activeTab === 'orders' || activeTab === 'hr' ? 'h-full flex flex-col overflow-hidden p-0 m-0 max-w-none' : 'px-4 md:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto pb-20'}`}>
      {!hasActiveComp && (
        <div className="flex flex-col items-center justify-center p-12 text-center min-h-[350px] animate-fadeIn">
          <div className="w-9 h-9 border-3 border-pink-500/30 border-t-pink-600 rounded-full animate-spin mb-3"></div>
          <p className="text-xs text-slate-400 font-bold">جاري تحميل واجهة {activeTab}...</p>
        </div>
      )}
      {activeTab === "dashboard"  && DashboardComponent && <DashboardComponent setActiveTab={setActiveTab} orders={orders} accounts={accounts} journal={journal} vouchers={vouchers} purchases={purchases} expenses={expenses} factory={factory} customers={customers} inventory={inventory} currency={systemCurrency} />}
      {activeTab === "customers"  && CustomersComponent && <CustomersComponent customers={customers} setCustomers={setCustomers} products={products} orders={orders} showToast={showToast} currency={systemCurrency} onSendToFactory={(jobData) => { setTargetProductionJob(jobData); setActiveTab('factory'); }} />}
      {activeTab === "products"   && ProductsComponent  && <ProductsComponent products={products} setProducts={setProducts} inventory={inventory} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "orders"     && OrdersComponent    && <OrdersComponent orders={orders} setOrders={setOrders} customers={customers} products={products} campaigns={campaigns} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "purchases"  && PurchasesComponent && <PurchasesComponent purchases={purchases} setPurchases={setPurchases} inventory={inventory} setInventory={setInventory} accounts={accounts} setAccounts={setAccounts} vouchers={vouchers} setVouchers={setVouchers} journal={journal} setJournal={setJournal} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "inventory"  && InventoryComponent && <InventoryComponent inventory={inventory} setInventory={setInventory} purchases={purchases} orders={orders} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "accounts"   && AccountsComponent  && <AccountsComponent accounts={accounts} setAccounts={setAccounts} journal={journal} setJournal={setJournal} vouchers={vouchers} setVouchers={setVouchers} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "factory"    && FactoryComponent   && <FactoryComponent factory={factory} setFactory={setFactory} employees={employees} setEmployees={setEmployees} orders={orders} setOrders={setOrders} products={products} setProducts={setProducts} inventory={inventory} setInventory={setInventory} customers={customers} setCustomers={setCustomers} accounts={accounts} showToast={showToast} targetJob={targetProductionJob} onClearTargetJob={() => setTargetProductionJob(null)} />}
      {activeTab === "vouchers"   && VouchersComponent  && <VouchersComponent vouchers={vouchers} setVouchers={setVouchers} accounts={accounts} setAccounts={setAccounts} journal={journal} setJournal={setJournal} showToast={showToast} currency={systemCurrency} customers={customers} setCustomers={setCustomers} orders={orders} setOrders={setOrders} expenses={expenses} setExpenses={setExpenses} purchases={purchases} employees={employees} />}
      {activeTab === "expenses"   && ExpensesComponent  && <ExpensesComponent expenses={expenses} setExpenses={setExpenses} accounts={accounts} setAccounts={setAccounts} vouchers={vouchers} setVouchers={setVouchers} journal={journal} setJournal={setJournal} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "journal"    && JournalComponent   && <JournalComponent journal={journal} setJournal={setJournal} accounts={accounts} setAccounts={setAccounts} vouchers={vouchers} setVouchers={setVouchers} showToast={showToast} currency={systemCurrency} customers={customers} purchases={purchases} employees={employees} />}
      {activeTab === "reports"    && ReportsComponent   && <ReportsComponent orders={orders} expenses={expenses} vouchers={vouchers} journal={journal} accounts={accounts} purchases={purchases} customers={customers} inventory={inventory} products={products} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "marketing"  && MarketingComponent && <MarketingComponent campaigns={campaigns} setCampaigns={setCampaigns} products={products} accounts={accounts} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "hr"         && HRComponent        && <HRComponent employees={employees} setEmployees={setEmployees} payroll={payroll} setPayroll={setPayroll} accounts={accounts} journal={journal} setJournal={setJournal} factory={factory} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "feedback"   && FeedbackComponent  && <FeedbackComponent feedback={feedback} setFeedback={setFeedback} customers={customers} setCustomers={setCustomers} products={products} orders={orders} setOrders={setOrders} factory={factory} setFactory={setFactory} inventory={inventory} purchases={purchases} expenses={expenses} setExpenses={setExpenses} journal={journal} setJournal={setJournal} employees={employees} campaigns={campaigns} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "settings"   && SettingsComponent  && <SettingsComponent showToast={showToast} currency={systemCurrency} />}
    </main>
  );
}

window.AppRouter = AppRouter;
