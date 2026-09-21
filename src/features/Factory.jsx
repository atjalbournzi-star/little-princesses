/**
 * Factory - المكون الرئيسي لإدارة المعمل والمشغل وخطوط الإنتاج الفاخرة
 * Orchestrator File (تجميع الـ Hooks والمكونات الفرعية)
 */
function Factory(props) {
  const {
    factory = [], setFactory, employees = [], orders = [], setOrders,
    products = [], setProducts, inventory = [], setInventory,
    customers = [], setCustomers, accounts = [], showToast,
    targetJob, onClearTargetJob
  } = props;

  const useData = window.useFactoryData;
  const useActions = window.useFactoryActions;
  const data = useData ? useData(props) : {};
  const actions = useActions ? useActions({ ...props, ...data }) : {};

  const {
    stages, activeMainTab, setActiveMainTab, analyticsData, loadingAnalytics,
    stockInflowLoading, deliveryModalData, setDeliveryModalData, deliveryForm,
    setDeliveryForm, submittingDelivery, deliveredSuccessData, alterationsList,
    loadingAlterations, scanProgressModalOpen, setScanProgressModalOpen,
    scanBarcodeQuery, setScanBarcodeQuery, scannedProgressJob,
    advancingScanProgress, selectedJobCustomer, setSelectedJobCustomer,
    printModalData, setPrintModalData, qcModalData, setQcModalData,
    stageFilter, setStageFilter, search, setSearch, form, setForm,
    fabricInventory, fetchFactoryAnalytics, fetchAlterations, filteredFactory
  } = data;

  const Header = window.FactoryHeader;
  const FilterBar = window.FactoryFilterBar;
  const AssignModal = window.WorkerAssignModal;
  const Board = window.ProductionBoard;
  const Analytics = window.FactoryAnalytics;
  const Alterations = window.AlterationsDesk;
  const Delivery = window.DeliveryModal;
  const QC = window.QualityCheckModal;
  const Scan = window.ScanProgressModal;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-2" dir="rtl">
      {Header && (
        <Header
          factory={factory} stages={stages} activeMainTab={activeMainTab}
          setActiveMainTab={setActiveMainTab} alterationsList={alterationsList}
          fetchAlterations={fetchAlterations} onOpenScanModal={() => setScanProgressModalOpen(true)}
        />
      )}

      {activeMainTab === 'pipeline' && (
        <>
          {AssignModal && (
            <AssignModal
              form={form} setForm={setForm} orders={orders} employees={employees}
              customers={customers} fabricInventory={fabricInventory} stages={stages}
              handleOrderSelect={actions.handleOrderSelect} handleStageEmpChange={actions.handleStageEmpChange}
              handleStageChange={actions.handleStageChange} selectLatestCustomer={actions.selectLatestCustomer}
              handleSubmit={actions.handleSubmit} showToast={showToast}
            />
          )}

          <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
            {FilterBar && (
              <FilterBar
                filteredCount={filteredFactory?.length || 0} totalCount={factory.length}
                stageFilter={stageFilter} setStageFilter={setStageFilter} stages={stages}
                search={search} setSearch={setSearch}
              />
            )}
            {Board && (
              <Board
                filteredFactory={filteredFactory || []} stockInflowLoading={stockInflowLoading}
                setQcModalData={setQcModalData} advanceToNextStage={actions.advanceToNextStage}
                handleStockInflow={actions.handleReceiveStockInflow} handleReverseStockInflow={actions.handleReverseStockInflow}
                handleOpenDeliveryModal={actions.handleOpenDeliveryModal} handleReverseDelivery={actions.handleReverseDelivery}
                handleOpenPrintModal={actions.handleOpenPrintModal} loadIntoForm={actions.loadIntoForm}
                handleDeleteOrder={actions.handleDeleteOrder}
              />
            )}
          </div>
        </>
      )}

      {activeMainTab === 'analytics' && Analytics && (
        <Analytics
          loadingAnalytics={loadingAnalytics} analyticsData={analyticsData}
          factory={factory} fetchFactoryAnalytics={fetchFactoryAnalytics}
        />
      )}

      {activeMainTab === 'alterations' && Alterations && (
        <Alterations
          alterationsList={alterationsList} loadingAlterations={loadingAlterations}
          fetchAlterations={fetchAlterations} handleUpdateAlterationStatus={actions.handleUpdateAlterationStatus}
        />
      )}

      {Delivery && (
        <Delivery
          deliveryModalData={deliveryModalData} setDeliveryModalData={setDeliveryModalData}
          deliveredSuccessData={deliveredSuccessData} deliveryForm={deliveryForm}
          setDeliveryForm={setDeliveryForm} accounts={accounts}
          submittingDelivery={submittingDelivery} handleConfirmDelivery={actions.handleConfirmDelivery}
        />
      )}

      {QC && (
        <QC
          qcModalData={qcModalData} setQcModalData={setQcModalData}
          setFactory={setFactory} showToast={showToast}
        />
      )}

      {Scan && (
        <Scan
          scanProgressModalOpen={scanProgressModalOpen} setScanProgressModalOpen={setScanProgressModalOpen}
          scanBarcodeQuery={scanBarcodeQuery} setScanBarcodeQuery={setScanBarcodeQuery}
          scannedProgressJob={scannedProgressJob} advancingScanProgress={advancingScanProgress}
          handleSearchScanJob={actions.handleSearchScanJob} handleAdvanceScannedJob={actions.handleAdvanceScannedJob}
          handleOpenDeliveryModal={actions.handleOpenDeliveryModal}
        />
      )}

      {printModalData && typeof PrintModal !== 'undefined' && (
        <PrintModal
          isOpen={!!printModalData} order={printModalData.order} customer={printModalData.customer}
          measurements={printModalData.measurements} product={printModalData.product}
          products={printModalData.products || products} defaultTemplate="job_ticket"
          onClose={() => setPrintModalData(null)}
        />
      )}

      {selectedJobCustomer && typeof JobCardModal !== 'undefined' && (
        <JobCardModal customer={selectedJobCustomer} onClose={() => setSelectedJobCustomer(null)} />
      )}
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.Factory = Factory;
}

