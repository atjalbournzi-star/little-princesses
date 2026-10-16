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

  const [showOrderForm, setShowOrderForm] = React.useState(false);

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
    printModalData, setPrintModalData, jobTicketData, setJobTicketData,
    modelPreviewData, setModelPreviewData, qcModalData, setQcModalData,
    stageFilter, setStageFilter, search, setSearch, form, setForm,
    fabricInventory, fetchFactoryAnalytics, fetchAlterations, filteredFactory, bespokeOrders
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
  const JobTicket = window.JobTicketPrintModal;
  const ModelImage = window.ModelImageModal;

  return (
    <div className="h-[calc(100vh-3.8rem)] max-h-[calc(100vh-3.8rem)] flex flex-col gap-2 p-2 bg-[#0B132B] select-none text-right overflow-hidden" dir="rtl">
      {Header && (
        <Header
          factory={factory} stages={stages} activeMainTab={activeMainTab}
          setActiveMainTab={setActiveMainTab} alterationsList={alterationsList}
          fetchAlterations={fetchAlterations} onOpenScanModal={() => setScanProgressModalOpen(true)}
          showOrderForm={showOrderForm} setShowOrderForm={setShowOrderForm}
          onToggleOrderForm={() => setShowOrderForm(p => !p)}
        />
      )}

      {activeMainTab === 'pipeline' && (
        <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
          {AssignModal && (
            <div className="shrink-0 overflow-y-auto max-h-[48vh] custom-scrollbar">
              <AssignModal
                form={form} setForm={setForm} orders={bespokeOrders || orders} employees={employees}
                customers={customers} products={products} fabricInventory={fabricInventory} stages={stages}
                handleOrderSelect={actions.handleOrderSelect} handleStageEmpChange={actions.handleStageEmpChange}
                handleStageChange={actions.handleStageChange} selectLatestCustomer={actions.selectLatestCustomer}
                handleProductionTypeChange={actions.handleProductionTypeChange}
                handleProductChange={actions.handleProductChange}
                handleSizeChange={actions.handleSizeChange}
                setModelPreviewData={setModelPreviewData}
                handleSubmit={actions.handleSubmit} showToast={showToast}
                showOrderForm={showOrderForm} setShowOrderForm={setShowOrderForm}
              />
            </div>
          )}

          <div className="flex-1 min-h-0 flex flex-col bg-[#111C38] p-2.5 rounded-xl border border-slate-800 shadow-xs overflow-hidden">
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
                handleOpenPrintModal={actions.handleOpenPrintModal}
                handleOpenJobTicket={actions.handleOpenJobTicket}
                setModelPreviewData={setModelPreviewData}
                loadIntoForm={actions.loadIntoForm}
                handleDeleteOrder={actions.handleDeleteOrder}
              />
            )}
          </div>
        </div>
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

      {jobTicketData && JobTicket && (
        <JobTicket
          isOpen={!!jobTicketData} job={jobTicketData.job} product={jobTicketData.product}
          onClose={() => setJobTicketData(null)}
        />
      )}

      {modelPreviewData && ModelImage && (
        <ModelImage
          isOpen={!!modelPreviewData} product={modelPreviewData.product}
          imageUrl={modelPreviewData.imageUrl} modelName={modelPreviewData.modelName}
          onClose={() => setModelPreviewData(null)}
        />
      )}

      {selectedJobCustomer && typeof JobCardModal !== 'undefined' && (
        <JobCardModal customer={selectedJobCustomer} onClose={() => setSelectedJobCustomer(null)} />
      )}
    </div>
  );
}

window.Factory = Factory;
