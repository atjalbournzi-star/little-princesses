/**
 * Expenses.jsx - Layout Orchestrator
 * إدارة المصاريف التشغيلية والربط المالي بشجرة الحسابات وحوكمة الاعتماد
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
    handleApproveExpense: () => {}, printVoucher: null, setPrintVoucher: () => {}, handlePrintExpense: () => {}
  }));

  const {
    filteredExpenses, stats, filterOptions, isSyncing, fetchFreshExpenses,
    search, setSearch, categoryFilter, setCategoryFilter,
    accountFilter, setAccountFilter, dateFilter, setDateFilter, currencyDisplay
  } = useData({ expenses, setExpenses, accounts, vouchers, currency });

  const {
    formData, setFormData, isSubmitting, showQuickAddCat, setShowQuickAddCat,
    newCatName, setNewCatName, newCatCode, setNewCatCode,
    handleQuickAddCategory, handleSubmit, handleDeleteExpense, handleApproveExpense,
    printVoucher, setPrintVoucher, handlePrintExpense
  } = useActions({ accounts, setAccounts, setExpenses, setVouchers, setJournal, showToast, onExpenseSaved: fetchFreshExpenses });

  const Header = window.ExpensesHeader;
  const FilterBar = window.ExpensesFilterBar;
  const Table = window.ExpensesTable || window.ExpenseTable;
  const Modal = window.NewExpenseModal || window.ExpenseModal;
  const PrintVoucherModal = typeof window.PrintModal !== 'undefined' ? window.PrintModal : (typeof PrintModal !== 'undefined' ? PrintModal : null);

  const handleFormSubmit = async (e, targetStatus) => {
    await handleSubmit(e, targetStatus);
    setIsAddModalOpen(false);
    if (typeof fetchFreshExpenses === 'function') fetchFreshExpenses();
  };

  const handleExportExcel = () => {
    if (!filteredExpenses || filteredExpenses.length === 0) {
      if (showToast) showToast('لا توجد مصروفات لتصديرها ⚠️', 'warning');
      return;
    }
    const filename = `المصروفات_التشغيلية_${new Date().toISOString().slice(0, 10)}.xls`;
    const numFmt = "mso-number-format:'\\#\\,\\#\\#0\\.00';";
    const rowsHtml = filteredExpenses.map(e => `
      <tr>
        <td style="text-align:center;">${e.id || e.expense_no || '—'}</td>
        <td>${e.exp_category || e.category || 'مصروف تشغيلي'}</td>
        <td>${e.notes || '—'}</td>
        <td style="text-align:left;${numFmt}">${parseFloat(e.net_amount || e.amount || 0)}</td>
        <td style="text-align:center;">${e.currency || currencyDisplay}</td>
        <td>${e.cost_center || 'مشغل التفصيل'}</td>
        <td>${e.beneficiary || e.recipient || '—'}</td>
        <td style="text-align:center;">${e.account_id || e.payment_source || '—'}</td>
        <td style="text-align:center;">${e.status === 'draft' ? 'مسودة' : 'معتمد ومرحل'}</td>
        <td style="text-align:center;">${e.date || '—'}</td>
      </tr>
    `).join('');

    const template = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"><style>body{font-family:Arial;direction:rtl;}table{border-collapse:collapse;width:100%;direction:rtl;}th{background-color:#1e293b;color:#fff;border:1px solid #ccc;padding:8px;}td{border:1px solid #ccc;padding:6px;}</style></head>
      <body dir="rtl"><table border="1">
        <tr style="background-color:#0f172a;color:#ffffff;"><th colspan="10" style="font-size:16px;padding:10px;">كشف المصروفات التشغيلية - Little Princesses ERP</th></tr>
        <tr style="background-color:#f1f5f9;"><td colspan="10">تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')} | إجمالي البنود: ${filteredExpenses.length}</td></tr>
        <tr><th>رقم السند</th><th>بند المصروف</th><th>البيان</th><th>المبلغ الصافي</th><th>العملة</th><th>مركز التكلفة</th><th>المستفيد</th><th>حساب الصرف</th><th>الحالة</th><th>التاريخ</th></tr>
        ${rowsHtml}
      </table></body></html>`;

    const blob = new Blob(['\uFEFF' + template], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast(`تم تصدير ملف الإكسل (${filename}) بنجاح 📊`, 'success');
  };

  const handlePrintTable = () => {
    window.print();
  };

  return (
    <div className="space-y-2 animate-fadeIn text-right" dir="rtl">
      {Header && (
        <Header
          stats={stats}
          filteredCount={filteredExpenses.length}
          currencyDisplay={currencyDisplay}
          isSyncing={isSyncing}
          onRefresh={fetchFreshExpenses}
          onExportExcel={handleExportExcel}
          onPrint={handlePrintTable}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />
      )}

      <div className="bg-[#111C38] rounded-xl border border-slate-800 shadow-xs overflow-hidden p-2.5 space-y-2 pb-6">
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
            onApproveExpense={handleApproveExpense}
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
window.ExpensesLayout = Expenses;
window.ExpensesView = Expenses;