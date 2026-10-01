/**
 * Expenses.jsx - Layout Orchestrator
 * إدارة المصاريف التشغيلية والربط المالي بشجرة الحسابات
 * Little Princesses ERP - Architectural Standards Compliant (PROJECT_STANDARDS.md)
 */

const { useState } = React;

function Expenses({
  expenses = [],
  setExpenses,
  accounts = [],
  setAccounts,
  vouchers = [],
  setVouchers,
  journal = [],
  setJournal,
  showToast,
  currency
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // استدعاء الـ Hooks عبر كائن window مع حماية بديلة آمنة (Safe Fallbacks)
  const useData = window.useExpensesData || (() => ({
    allDisplayedExpenses: [], filteredExpenses: [], stats: {},
    filterOptions: { categories: [], accounts: [] }, isSyncing: false,
    fetchFreshExpenses: () => {}, search: '', setSearch: () => {},
    categoryFilter: 'الكل', setCategoryFilter: () => {},
    accountFilter: 'الكل', setAccountFilter: () => {},
    dateFilter: 'all', setDateFilter: () => {}, currencyDisplay: "YER ﷼"
  }));

  const useActions = window.useExpenseActions || (() => ({
    formData: {}, setFormData: () => {}, isSubmitting: false,
    showQuickAddCat: false, setShowQuickAddCat: () => {},
    newCatName: '', setNewCatName: () => {}, newCatCode: '', setNewCatCode: () => {},
    handleQuickAddCategory: () => {}, handleSubmit: () => {}, handleDeleteExpense: () => {},
    printVoucher: null, setPrintVoucher: () => {}, handlePrintExpense: () => {}
  }));

  const {
    filteredExpenses, stats, filterOptions, isSyncing, fetchFreshExpenses,
    search, setSearch, categoryFilter, setCategoryFilter,
    accountFilter, setAccountFilter, dateFilter, setDateFilter, currencyDisplay
  } = useData({ expenses, setExpenses, accounts, vouchers, currency });

  const {
    formData, setFormData, isSubmitting, showQuickAddCat, setShowQuickAddCat,
    newCatName, setNewCatName, newCatCode, setNewCatCode,
    handleQuickAddCategory, handleSubmit, handleDeleteExpense,
    printVoucher, setPrintVoucher, handlePrintExpense
  } = useActions({ accounts, setAccounts, setExpenses, setVouchers, setJournal, showToast });

  // المكونات الفرعية عبر كائن window
  const Header = window.ExpensesHeader;
  const FilterBar = window.ExpensesFilterBar;
  const Table = window.ExpensesTable;
  const Modal = window.ExpenseModal;
  const PrintVoucherModal = typeof window.PrintModal !== 'undefined' ? window.PrintModal : (typeof PrintModal !== 'undefined' ? PrintModal : null);

  const handleFormSubmit = async (e) => {
    await handleSubmit(e);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      {Header && (
        <Header
          stats={stats}
          currencyDisplay={currencyDisplay}
          isSyncing={isSyncing}
          onRefresh={fetchFreshExpenses}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />
      )}

      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
        {FilterBar && (
          <FilterBar
            search={search} setSearch={setSearch}
            categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
            accountFilter={accountFilter} setAccountFilter={setAccountFilter}
            dateFilter={dateFilter} setDateFilter={setDateFilter}
            filterOptions={filterOptions} filteredCount={filteredExpenses.length}
          />
        )}

        {Table && (
          <Table
            expenses={filteredExpenses}
            currencyDisplay={currencyDisplay}
            onDeleteExpense={handleDeleteExpense}
            onPrintExpense={handlePrintExpense}
          />
        )}
      </div>

      {Modal && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          formData={formData}
          setFormData={setFormData}
          accounts={accounts}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
          showQuickAddCat={showQuickAddCat}
          setShowQuickAddCat={setShowQuickAddCat}
          newCatName={newCatName}
          setNewCatName={setNewCatName}
          newCatCode={newCatCode}
          setNewCatCode={setNewCatCode}
          onQuickAddCategory={handleQuickAddCategory}
        />
      )}

      {printVoucher && PrintVoucherModal && (
        <PrintVoucherModal
          isOpen={!!printVoucher}
          onClose={() => setPrintVoucher(null)}
          order={{
            order_no: printVoucher.v_no,
            customer_name: printVoucher.party,
            product_name: printVoucher.v_type,
            total: parseFloat(printVoucher.amount || 0),
            paid: parseFloat(printVoucher.amount || 0),
            currency: printVoucher.currency,
            order_date: printVoucher.date,
            notes: printVoucher.notes
          }}
          defaultTemplate="thermal"
        />
      )}
    </div>
  );
}

window.Expenses = Expenses;
