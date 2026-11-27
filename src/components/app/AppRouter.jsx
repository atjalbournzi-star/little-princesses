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
  jobRoles,
  setJobRoles,
  feedback,
  setFeedback,
  systemCurrency,
  showToast,
  targetProductionJob,
  setTargetProductionJob
}) {
  const [, setTick] = React.useState(0);
  const ENABLE_PHASE2_MODULES = typeof window !== 'undefined' && window.ENABLE_PHASE2_MODULES === true;
  const isPhase2Blocked = !ENABLE_PHASE2_MODULES && (activeTab === 'marketing' || activeTab === 'measurement');

  const getComp = (name, altName) => {
    if (typeof window === 'undefined') return null;
    return window[name] || (altName && window[altName]) || null;
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
  const MarketingComponent = ENABLE_PHASE2_MODULES ? getComp('Marketing', 'MarketingLayout') : null;
  const HRComponent        = getComp('HR', 'HRLayout');
  const FeedbackComponent  = getComp('Feedback');
  const SettingsComponent  = getComp('Settings');
  const MeasurementStudio  = ENABLE_PHASE2_MODULES ? getComp('MeasurementStudio') : null;

  const hasActiveComp = Boolean(
    isPhase2Blocked ||
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
    (activeTab === 'measurement' && MeasurementStudio) ||
    (activeTab === 'settings' && SettingsComponent)
  );

  React.useEffect(() => {
    if (hasActiveComp) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      setTick(t => t + 1);
      if (attempts >= 25) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, [activeTab, hasActiveComp]);

  const handleSendToFactory = React.useCallback((jobData) => {
    setTargetProductionJob(jobData);
    setActiveTab('factory');
  }, [setTargetProductionJob, setActiveTab]);

  const handleClearTargetJob = React.useCallback(() => {
    setTargetProductionJob(null);
  }, [setTargetProductionJob]);

  const SectionBoundary = (typeof window !== 'undefined' && window.ErrorBoundary) ? window.ErrorBoundary : React.Fragment;
  const boundaryProps = SectionBoundary !== React.Fragment
    ? { key: activeTab, resetKey: activeTab, inline: true, sectionTitle: activeTab, onGoHome: () => setActiveTab('dashboard') }
    : {};

  return (
    <main className={`flex-1 w-full ${activeTab === 'orders' || activeTab === 'hr' || activeTab === 'measurement' ? 'h-full flex flex-col overflow-hidden p-0 m-0 max-w-none' : 'px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 max-w-[1600px] mx-auto pb-20'}`}>
      <SectionBoundary {...boundaryProps}>
      {isPhase2Blocked && (
        <div className="flex flex-col items-center justify-center p-12 text-center min-h-[350px] animate-fadeIn">
          <p className="text-sm font-bold text-slate-500 mb-3">هذا القسم مؤجل للمرحلة الثانية ومُعطَّل مؤقتاً.</p>
          <button type="button" onClick={() => setActiveTab('dashboard')} className="px-4 py-2 rounded-xl bg-pink-600 text-white text-xs font-bold cursor-pointer">العودة للوحة التحكم</button>
        </div>
      )}
      {!hasActiveComp && (
        <div className="flex flex-col items-center justify-center p-12 text-center min-h-[350px] animate-fadeIn">
          <div className="w-9 h-9 border-3 border-pink-500/30 border-t-pink-600 rounded-full animate-spin mb-3"></div>
          <p className="text-xs text-slate-400 font-bold">جاري تحميل واجهة {activeTab}...</p>
        </div>
      )}
      {activeTab === "dashboard"  && DashboardComponent && <DashboardComponent setActiveTab={setActiveTab} orders={orders} accounts={accounts} journal={journal} vouchers={vouchers} purchases={purchases} expenses={expenses} factory={factory} customers={customers} inventory={inventory} currency={systemCurrency} />}
      {activeTab === "customers"  && CustomersComponent && <CustomersComponent customers={customers} setCustomers={setCustomers} products={products} orders={orders} showToast={showToast} currency={systemCurrency} onSendToFactory={handleSendToFactory} />}
      {activeTab === "products"   && ProductsComponent  && <ProductsComponent products={products} setProducts={setProducts} inventory={inventory} jobRoles={jobRoles} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "orders"     && OrdersComponent    && <OrdersComponent orders={orders} setOrders={setOrders} customers={customers} products={products} campaigns={campaigns} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "purchases"  && PurchasesComponent && <PurchasesComponent purchases={purchases} setPurchases={setPurchases} inventory={inventory} setInventory={setInventory} accounts={accounts} setAccounts={setAccounts} vouchers={vouchers} setVouchers={setVouchers} journal={journal} setJournal={setJournal} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "inventory"  && InventoryComponent && <InventoryComponent inventory={inventory} setInventory={setInventory} purchases={purchases} orders={orders} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "accounts"   && AccountsComponent  && <AccountsComponent accounts={accounts} setAccounts={setAccounts} journal={journal} setJournal={setJournal} vouchers={vouchers} setVouchers={setVouchers} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "factory"    && FactoryComponent   && <FactoryComponent factory={factory} setFactory={setFactory} employees={employees} setEmployees={setEmployees} orders={orders} setOrders={setOrders} products={products} setProducts={setProducts} inventory={inventory} setInventory={setInventory} customers={customers} setCustomers={setCustomers} accounts={accounts} jobRoles={jobRoles} showToast={showToast} targetJob={targetProductionJob} onClearTargetJob={handleClearTargetJob} />}
      {activeTab === "vouchers"   && VouchersComponent  && <VouchersComponent vouchers={vouchers} setVouchers={setVouchers} accounts={accounts} setAccounts={setAccounts} journal={journal} setJournal={setJournal} showToast={showToast} currency={systemCurrency} customers={customers} setCustomers={setCustomers} orders={orders} setOrders={setOrders} expenses={expenses} setExpenses={setExpenses} purchases={purchases} employees={employees} />}
      {activeTab === "expenses"   && ExpensesComponent  && <ExpensesComponent expenses={expenses} setExpenses={setExpenses} accounts={accounts} setAccounts={setAccounts} vouchers={vouchers} setVouchers={setVouchers} journal={journal} setJournal={setJournal} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "journal"    && JournalComponent   && <JournalComponent journal={journal} setJournal={setJournal} accounts={accounts} setAccounts={setAccounts} vouchers={vouchers} setVouchers={setVouchers} showToast={showToast} currency={systemCurrency} customers={customers} purchases={purchases} employees={employees} />}
      {activeTab === "reports"    && ReportsComponent   && <ReportsComponent orders={orders} expenses={expenses} vouchers={vouchers} journal={journal} accounts={accounts} purchases={purchases} customers={customers} inventory={inventory} products={products} showToast={showToast} currency={systemCurrency} />}
      {ENABLE_PHASE2_MODULES && activeTab === "marketing"  && MarketingComponent && <MarketingComponent campaigns={campaigns} setCampaigns={setCampaigns} products={products} accounts={accounts} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "hr"         && HRComponent        && <HRComponent employees={employees} setEmployees={setEmployees} payroll={payroll} setPayroll={setPayroll} accounts={accounts} journal={journal} setJournal={setJournal} factory={factory} jobRoles={jobRoles} setJobRoles={setJobRoles} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "feedback"   && FeedbackComponent  && <FeedbackComponent feedback={feedback} setFeedback={setFeedback} customers={customers} setCustomers={setCustomers} products={products} orders={orders} setOrders={setOrders} factory={factory} setFactory={setFactory} inventory={inventory} purchases={purchases} expenses={expenses} setExpenses={setExpenses} journal={journal} setJournal={setJournal} employees={employees} campaigns={campaigns} showToast={showToast} currency={systemCurrency} />}
      {ENABLE_PHASE2_MODULES && activeTab === "measurement" && MeasurementStudio && <MeasurementStudio showToast={showToast} currency={systemCurrency} />}
      {activeTab === "settings"   && SettingsComponent  && <SettingsComponent showToast={showToast} currency={systemCurrency} />}
      </SectionBoundary>
    </main>
  );
}

window.AppRouter = AppRouter;
