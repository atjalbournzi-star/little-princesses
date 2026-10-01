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
  const PurchasesComponent = typeof Purchases !== 'undefined' ? Purchases : (typeof window !== 'undefined' ? window.Purchases : null);
  const VouchersComponent = typeof Vouchers !== 'undefined' ? Vouchers : (typeof window !== 'undefined' ? window.Vouchers : null);
  const ReportsComponent = typeof Reports !== 'undefined' ? Reports : (typeof window !== 'undefined' ? window.Reports : null);

  return (
    <main className="flex-1 px-4 md:px-6 lg:px-8 py-6 max-w-[1600px] w-full mx-auto pb-20">
      {activeTab === "dashboard"  && typeof Dashboard !== 'undefined' && <Dashboard setActiveTab={setActiveTab} orders={orders} accounts={accounts} journal={journal} vouchers={vouchers} purchases={purchases} expenses={expenses} factory={factory} customers={customers} inventory={inventory} currency={systemCurrency} />}
      {activeTab === "customers"  && typeof Customers !== 'undefined' && <Customers customers={customers} setCustomers={setCustomers} products={products} orders={orders} showToast={showToast} currency={systemCurrency} onSendToFactory={(jobData) => { setTargetProductionJob(jobData); setActiveTab('factory'); }} />}
      {activeTab === "products"   && typeof Products !== 'undefined'  && <Products products={products} setProducts={setProducts} inventory={inventory} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "orders"     && typeof Orders !== 'undefined'    && <Orders orders={orders} setOrders={setOrders} customers={customers} products={products} campaigns={campaigns} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "purchases"  && PurchasesComponent && <PurchasesComponent purchases={purchases} setPurchases={setPurchases} inventory={inventory} setInventory={setInventory} accounts={accounts} setAccounts={setAccounts} vouchers={vouchers} setVouchers={setVouchers} journal={journal} setJournal={setJournal} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "inventory"  && typeof Inventory !== 'undefined'  && <Inventory inventory={inventory} setInventory={setInventory} purchases={purchases} orders={orders} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "accounts"   && typeof Accounts !== 'undefined'   && <Accounts accounts={accounts} setAccounts={setAccounts} journal={journal} setJournal={setJournal} vouchers={vouchers} setVouchers={setVouchers} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "factory"    && typeof Factory !== 'undefined'    && <Factory factory={factory} setFactory={setFactory} employees={employees} setEmployees={setEmployees} orders={orders} setOrders={setOrders} products={products} setProducts={setProducts} inventory={inventory} setInventory={setInventory} customers={customers} setCustomers={setCustomers} accounts={accounts} showToast={showToast} targetJob={targetProductionJob} onClearTargetJob={() => setTargetProductionJob(null)} />}
      {activeTab === "vouchers"   && VouchersComponent && <VouchersComponent vouchers={vouchers} setVouchers={setVouchers} accounts={accounts} setAccounts={setAccounts} journal={journal} setJournal={setJournal} showToast={showToast} currency={systemCurrency} customers={customers} setCustomers={setCustomers} orders={orders} setOrders={setOrders} expenses={expenses} setExpenses={setExpenses} purchases={purchases} employees={employees} />}
      {activeTab === "expenses"   && typeof Expenses !== 'undefined'   && <Expenses expenses={expenses} setExpenses={setExpenses} accounts={accounts} setAccounts={setAccounts} vouchers={vouchers} setVouchers={setVouchers} journal={journal} setJournal={setJournal} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "journal"    && typeof Journal !== 'undefined'    && <Journal journal={journal} setJournal={setJournal} accounts={accounts} setAccounts={setAccounts} vouchers={vouchers} setVouchers={setVouchers} showToast={showToast} currency={systemCurrency} customers={customers} purchases={purchases} employees={employees} />}
      {activeTab === "reports"    && ReportsComponent && <ReportsComponent orders={orders} expenses={expenses} vouchers={vouchers} journal={journal} accounts={accounts} purchases={purchases} customers={customers} inventory={inventory} products={products} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "marketing"  && typeof Marketing !== 'undefined'  && <Marketing campaigns={campaigns} setCampaigns={setCampaigns} products={products} accounts={accounts} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "hr"         && typeof HR !== 'undefined'         && <HR employees={employees} setEmployees={setEmployees} payroll={payroll} setPayroll={setPayroll} accounts={accounts} journal={journal} setJournal={setJournal} factory={factory} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "feedback"   && typeof Feedback !== 'undefined'   && <Feedback feedback={feedback} setFeedback={setFeedback} customers={customers} setCustomers={setCustomers} products={products} orders={orders} setOrders={setOrders} factory={factory} setFactory={setFactory} inventory={inventory} purchases={purchases} expenses={expenses} setExpenses={setExpenses} journal={journal} setJournal={setJournal} employees={employees} campaigns={campaigns} showToast={showToast} currency={systemCurrency} />}
      {activeTab === "settings"   && typeof Settings !== 'undefined'   && <Settings showToast={showToast} currency={systemCurrency} />}
    </main>
  );
}

window.AppRouter = AppRouter;
