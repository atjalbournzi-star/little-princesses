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

  const [localActiveTab, setLocalActiveTab] = React.useState('pipeline');
  const [showOrderForm, setShowOrderForm] = React.useState(false);

  const useData = window.useFactoryData;
  const useActions = window.useFactoryActions;
  const data = useData ? useData(props) : {};
  const actions = useActions ? useActions({ ...props, ...data }) : {};

  const activeMainTab = data.activeMainTab || localActiveTab || props.subTab || 'pipeline';
  const setActiveMainTab = React.useCallback((newTab) => {
    setLocalActiveTab(newTab);
    if (typeof data.setActiveMainTab === 'function') {
      data.setActiveMainTab(newTab);
    }
  }, [data.setActiveMainTab]);

  const handleOpenOrderForm = React.useCallback(() => {
    setActiveMainTab('pipeline');
    setShowOrderForm(true);
    setTimeout(() => {
      const el = document.getElementById('factory-order-form-container');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }, [setActiveMainTab]);

  const handleToggleOrderForm = React.useCallback(() => {
    if (activeMainTab !== 'pipeline') {
      setActiveMainTab('pipeline');
      setShowOrderForm(true);
    } else {
      setShowOrderForm(p => !p);
    }
  }, [activeMainTab, setActiveMainTab]);

  React.useEffect(() => {
    if (targetJob) handleOpenOrderForm();
  }, [targetJob, handleOpenOrderForm]);

  React.useEffect(() => {
    const onOpen = () => handleOpenOrderForm();
    window.addEventListener('erp:openFactoryOrderForm', onOpen);
    window.addEventListener('erp:newOrder', onOpen);
    return () => {
      window.removeEventListener('erp:openFactoryOrderForm', onOpen);
      window.removeEventListener('erp:newOrder', onOpen);
    };
  }, [handleOpenOrderForm]);

  const {
    stages, analyticsData, loadingAnalytics, stockInflowLoading, deliveryModalData, setDeliveryModalData,
    deliveryForm, setDeliveryForm, submittingDelivery, deliveredSuccessData, alterationsList, loadingAlterations,
    scanProgressModalOpen, setScanProgressModalOpen, scanBarcodeQuery, setScanBarcodeQuery, scannedProgressJob,
    advancingScanProgress, selectedJobCustomer, setSelectedJobCustomer, printModalData, setPrintModalData,
    jobTicketData, setJobTicketData, modelPreviewData, setModelPreviewData, qcModalData, setQcModalData,
    stageFilter, setStageFilter, search, setSearch, form, setForm, fabricInventory,
    fetchFactoryAnalytics, fetchAlterations, filteredFactory, bespokeOrders
  } = data;

  const Header = window.FactoryHeader || (typeof FactoryHeader !== 'undefined' ? FactoryHeader : null);
  const FilterBar = window.FactoryFilterBar || (typeof FactoryFilterBar !== 'undefined' ? FactoryFilterBar : null);
  const AssignModal = window.WorkerAssignModal || (typeof WorkerAssignModal !== 'undefined' ? WorkerAssignModal : null);
  const Board = window.ProductionBoard || (typeof ProductionBoard !== 'undefined' ? ProductionBoard : null);
  const Analytics = window.FactoryAnalytics || (typeof FactoryAnalytics !== 'undefined' ? FactoryAnalytics : null);
  const Alterations = window.AlterationsDesk || (typeof AlterationsDesk !== 'undefined' ? AlterationsDesk : null);
  const Delivery = window.DeliveryModal || (typeof DeliveryModal !== 'undefined' ? DeliveryModal : null);
  const QC = window.QualityCheckModal || (typeof QualityCheckModal !== 'undefined' ? QualityCheckModal : null);
  const Scan = window.ScanProgressModal || (typeof ScanProgressModal !== 'undefined' ? ScanProgressModal : null);
  const JobTicket = window.JobTicketPrintModal || (typeof JobTicketPrintModal !== 'undefined' ? JobTicketPrintModal : null);
  const ModelImage = window.ModelImageModal || (typeof ModelImageModal !== 'undefined' ? ModelImageModal : null);

  const isPipeline = activeMainTab !== 'analytics' && activeMainTab !== 'alterations';

  return (
    <div className="h-[calc(100vh-3.8rem)] max-h-[calc(100vh-3.8rem)] flex flex-col gap-2 p-2 bg-[#0B132B] select-none text-right overflow-hidden" dir="rtl">
      {Header && (
        <Header
          factory={factory || []} stages={stages} activeMainTab={activeMainTab}
          setActiveMainTab={setActiveMainTab} alterationsList={alterationsList}
          fetchAlterations={fetchAlterations} onOpenScanModal={() => setScanProgressModalOpen(true)}
          showOrderForm={showOrderForm} setShowOrderForm={setShowOrderForm}
          onToggleOrderForm={handleToggleOrderForm}
          onOpenNewOrder={handleOpenOrderForm}
        />
      )}

      {isPipeline && (
        <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-y-auto custom-scrollbar pb-6 pr-0.5">
          {AssignModal && (
            <div id="factory-order-form-container" className="shrink-0 rounded-xl">
              <AssignModal
                form={form || {}} setForm={setForm} orders={bespokeOrders || orders} employees={employees}
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

          <div className="flex-1 min-h-[380px] flex flex-col bg-white dark:bg-[#111C38] p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5">
            {FilterBar && (
              <FilterBar
                filteredCount={filteredFactory?.length || 0} totalCount={factory?.length || 0}
                stageFilter={stageFilter} setStageFilter={setStageFilter} stages={stages}
                search={search} setSearch={setSearch}
              />
            )}
            {Board && (
              <Board
                filteredFactory={filteredFactory || factory || []} products={products} stockInflowLoading={stockInflowLoading}
                setQcModalData={setQcModalData} advanceToNextStage={actions.advanceToNextStage}
                handleFastTrackQc={actions.handleFastTrackQc} actionLoadingId={actions.actionLoadingId}
                handleStockInflow={actions.handleReceiveStockInflow} handleReverseStockInflow={actions.handleReverseStockInflow}
                handleOpenDeliveryModal={actions.handleOpenDeliveryModal} handleReverseDelivery={actions.handleReverseDelivery}
                handleOpenPrintModal={actions.handleOpenPrintModal}
                handleOpenJobTicket={actions.handleOpenJobTicket}
                setModelPreviewData={setModelPreviewData}
                loadIntoForm={(f) => {
                  if (typeof actions.loadIntoForm === 'function') actions.loadIntoForm(f);
                  handleOpenOrderForm();
                }}
                handleDeleteOrder={actions.handleDeleteOrder}
              />
            )}
          </div>
        </div>
      )}

      {activeMainTab === 'analytics' && Analytics && (
        <Analytics loadingAnalytics={loadingAnalytics} analyticsData={analyticsData} factory={factory} fetchFactoryAnalytics={fetchFactoryAnalytics} />
      )}

      {activeMainTab === 'alterations' && Alterations && (
        <Alterations alterationsList={alterationsList} loadingAlterations={loadingAlterations} fetchAlterations={fetchAlterations} handleUpdateAlterationStatus={actions.handleUpdateAlterationStatus} />
      )}

      {Delivery && (
        <Delivery
          deliveryModalData={deliveryModalData} setDeliveryModalData={setDeliveryModalData}
          deliveredSuccessData={deliveredSuccessData} deliveryForm={deliveryForm}
          setDeliveryForm={setDeliveryForm} accounts={accounts}
          submittingDelivery={submittingDelivery} handleConfirmDelivery={actions.handleConfirmDelivery}
        />
      )}

      {QC && <QC qcModalData={qcModalData} setQcModalData={setQcModalData} setFactory={setFactory} showToast={showToast} />}

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

      {jobTicketData && JobTicket && <JobTicket isOpen={!!jobTicketData} job={jobTicketData.job} product={jobTicketData.product} onClose={() => setJobTicketData(null)} />}

      {modelPreviewData && ModelImage && <ModelImage isOpen={!!modelPreviewData} product={modelPreviewData.product} imageUrl={modelPreviewData.imageUrl} modelName={modelPreviewData.modelName} onClose={() => setModelPreviewData(null)} />}

      {selectedJobCustomer && typeof JobCardModal !== 'undefined' && (
        <JobCardModal customer={selectedJobCustomer} onClose={() => setSelectedJobCustomer(null)} />
      )}
    </div>
  );
}

window.Factory = Factory;
