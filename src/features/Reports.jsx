// src/features/Reports.jsx

function Reports({
  orders = [], expenses = [], vouchers = [], journal = [],
  accounts = [], purchases = [], customers = [], inventory = [],
  products = [], showToast, currency
}) {
  const brandProfile = (typeof window !== 'undefined' && window.BrandService)
    ? window.BrandService.getProfile()
    : {
        name: 'مؤسسة الأميرات الصغيرات', shortName: 'الأميرات الصغيرات',
        tagline: 'Enterprise Financial & Accounting System', commercialRegister: '1010-009283',
        phone: '776773458', systemIcon: '👑'
      };

  const useData = window.useReportsData || (() => ({}));
  const useExport = window.useReportExport || (() => ({}));

  const {
    activeTab, setActiveTab, financialSubTab, setFinancialSubTab,
    periodPreset, setPeriodPreset, dateRange, setDateRange,
    reportCurrency, setReportCurrency, selectedLedgerAcc, setSelectedLedgerAcc,
    statementType, setStatementType, selectedPartyId, setSelectedPartyId,
    targetCode, toReportAmount, fmtMoney, filteredJournal, liveAccountsMap,
    pnlData, balanceSheetData, trialBalanceData, generalLedgerRows, cashBankReconciliation,
    statementData, dailySalesData, modelProfitabilityData, productionStats, inventoryStats
  } = useData({ orders, expenses, vouchers, journal, accounts, purchases, customers, inventory, products, currency });

  const { getTabTitle, handleExportExcel, handlePrint } = useExport({
    activeTab, financialSubTab, statementType, selectedLedgerAcc,
    dateRange, reportCurrency, brandProfile, accounts,
    pnlData, balanceSheetData, trialBalanceData, generalLedgerRows,
    cashBankReconciliation, statementData, dailySalesData, modelProfitabilityData,
    productionStats, inventoryStats, inventory, orders, showToast
  });

  const {
    ReportsPrintHeader: PrintHeader,
    ReportsHeader: HeaderComponent,
    ReportsFilterBar: FilterBarComponent,
    FinancialReportView: FinancialView,
    OrdersReportView: OrdersView,
    ProductionReportView: ProductionView,
    InventoryReportView: InventoryView,
    ReportsAuditFooter: AuditFooter
  } = window;

  const testedCount = activeTab === 'financial' ? filteredJournal.length : (activeTab === 'orders' ? (orders || []).length : (activeTab === 'production' ? productionStats.totalOrders : inventoryStats.totalItems));

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      {/* ترويسة الطباعة الرسمية المعتمدة */}
      {PrintHeader && <PrintHeader brandProfile={brandProfile} getTabTitle={getTabTitle} dateRange={dateRange} reportCurrency={reportCurrency} />}

      {/* شريط رأس التقارير والتبويبات الرئيسية وزر التصدير */}
      {HeaderComponent && (
        <HeaderComponent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          handleExportExcel={handleExportExcel}
          handlePrint={handlePrint}
          brandProfile={brandProfile}
        />
      )}

      {/* شريط الفلاتر والتحويل الزمني والعملات */}
      {FilterBarComponent && (
        <FilterBarComponent
          periodPreset={periodPreset}
          setPeriodPreset={setPeriodPreset}
          dateRange={dateRange}
          setDateRange={setDateRange}
          reportCurrency={reportCurrency}
          setReportCurrency={setReportCurrency}
          testedCount={testedCount}
          activeTab={activeTab}
          financialSubTab={financialSubTab}
          selectedLedgerAcc={selectedLedgerAcc}
          setSelectedLedgerAcc={setSelectedLedgerAcc}
          accounts={accounts}
          statementType={statementType}
          setStatementType={setStatementType}
          selectedPartyId={selectedPartyId}
          setSelectedPartyId={setSelectedPartyId}
          purchases={purchases}
          customers={customers}
        />
      )}

      {/* العرض 1: التقارير المالية والمحاسبية (P&L، الميزانية، ميزان المراجعة، الأستاذ العام، المطابقات) */}
      {activeTab === 'financial' && FinancialView && (
        <FinancialView
          financialSubTab={financialSubTab}
          setFinancialSubTab={setFinancialSubTab}
          pnlData={pnlData}
          balanceSheetData={balanceSheetData}
          trialBalanceData={trialBalanceData}
          generalLedgerRows={generalLedgerRows}
          cashBankReconciliation={cashBankReconciliation}
          statementData={statementData}
          statementType={statementType}
          reportCurrency={reportCurrency}
          fmtMoney={fmtMoney}
          targetCode={targetCode}
        />
      )}

      {/* العرض 2: تقارير المبيعات والطلبات وربحية الموديلات */}
      {activeTab === 'orders' && OrdersView && (
        <OrdersView
          dailySalesData={dailySalesData}
          modelProfitabilityData={modelProfitabilityData}
          reportCurrency={reportCurrency}
          fmtMoney={fmtMoney}
        />
      )}

      {/* العرض 3: تقارير إنتاجية ومراحل المعمل وأجور الفنيين */}
      {activeTab === 'production' && ProductionView && (
        <ProductionView
          productionStats={productionStats}
          orders={orders}
          reportCurrency={reportCurrency}
          fmtMoney={fmtMoney}
        />
      )}

      {/* العرض 4: تقارير حركة وتقييم المخزون وتنبيهات النواقص */}
      {activeTab === 'inventory' && InventoryView && (
        <InventoryView
          inventoryStats={inventoryStats}
          inventory={inventory}
          reportCurrency={reportCurrency}
          fmtMoney={fmtMoney}
        />
      )}

      {/* صندوق الاعتماد والتدقيق المالي والتوقيعات الرسمية */}
      {AuditFooter && <AuditFooter brandProfile={brandProfile} />}
    </div>
  );
}

window.Reports = Reports;
