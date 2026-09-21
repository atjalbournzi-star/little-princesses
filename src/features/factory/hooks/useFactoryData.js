const { useState, useEffect, useMemo, useCallback } = React;

function useFactoryData({
  factory = [], setFactory, employees = [], orders = [], setOrders,
  products = [], setProducts, inventory = [], setInventory,
  customers = [], setCustomers, accounts = [], showToast,
  targetJob, onClearTargetJob
}) {
  const utils = window.FactoryUtils || {};
  const service = window.FactoryService || {};
  const stages = utils.FACTORY_STAGES || [
    'القص والتحضير ✂️', 'مرحلة الخياطة 🪡', 'التطريز والشك ✨',
    'الفحص والتشطيب النهائي 🔍', 'جاهز للتسليم 📦'
  ];
  const todayStrIso = typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : (window.TODAY_STR_ISO || new Date().toISOString().slice(0, 10));

  const [activeMainTab, setActiveMainTab] = useState('pipeline');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [stockInflowLoading, setStockInflowLoading] = useState({});
  const [deliveryModalData, setDeliveryModalData] = useState(null);
  const [deliveryForm, setDeliveryForm] = useState({
    amount_collected: '', discount: '0', account_id: 'ACC-101', payment_method: 'نقد (كاش)', notes: ''
  });
  const [submittingDelivery, setSubmittingDelivery] = useState(false);
  const [deliveredSuccessData, setDeliveredSuccessData] = useState(null);
  const [alterationsList, setAlterationsList] = useState([]);
  const [loadingAlterations, setLoadingAlterations] = useState(false);
  const [scanProgressModalOpen, setScanProgressModalOpen] = useState(false);
  const [scanBarcodeQuery, setScanBarcodeQuery] = useState('');
  const [scannedProgressJob, setScannedProgressJob] = useState(null);
  const [advancingScanProgress, setAdvancingScanProgress] = useState(false);
  const [selectedJobCustomer, setSelectedJobCustomer] = useState(null);
  const [printModalData, setPrintModalData] = useState(null);
  const [qcModalData, setQcModalData] = useState(null);
  const [stageFilter, setStageFilter] = useState('الكل');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    order_no: '', customer: '', child_name: '', product: '', product_id: '', quantity: 1, tailor: '', stage: stages[0], progress: '20',
    start_date: todayStrIso, due_date: '', cutting_due_date: '', sewing_due_date: '', embroidery_due_date: '', finishing_due_date: '',
    cutter_name: '', cutter_wage: '2000', tailor_name: '', tailor_wage: '5000',
    embroiderer_name: '', embroiderer_wage: '3000', finisher_name: '', finisher_wage: '1500',
    fabric_name: '', cut_meters: '', cut_unit: 'متر', deduct_inventory: true
  });

  const fabricInventory = useMemo(() => {
    return (inventory || []).filter(item => {
      const cat = (item.category || '').toLowerCase(), type = (item.type || '').toLowerCase();
      const unit = (item.unit || '').toLowerCase(), name = (item.name || item.item_name || '').toLowerCase();
      return cat.includes('أقمش') || cat.includes('قماش') || cat.includes('خام') ||
             type.includes('fabric') || unit.includes('متر') || unit.includes('وار') ||
             unit.includes('يارد') || name.includes('تل') || name.includes('تفتة') ||
             name.includes('حرير') || name.includes('اوركنزا') || name.includes('شيفون') ||
             name.includes('صدفة') || name.includes('بطان');
    });
  }, [inventory]);

  const fetchFactoryAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const data = await (service.fetchAnalytics ? service.fetchAnalytics() : fetch('/api/factory/analytics').then(r => r.json()));
      if (data.success) setAnalyticsData(data.data);
      else if (showToast) showToast(data.error || 'تعذر جلب تحليلات المشغل', 'error');
    } catch (err) {
      console.error('Error fetching factory analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [service, showToast]);

  const fetchAlterations = useCallback(async () => {
    setLoadingAlterations(true);
    try {
      const res = await (service.fetchAlterations ? service.fetchAlterations() : fetch('/api/alterations').then(r => r.json()));
      if (res.success && Array.isArray(res.data)) setAlterationsList(res.data);
    } catch (e) {
    } finally {
      setLoadingAlterations(false);
    }
  }, [service]);

  useEffect(() => {
    fetchAlterations();
    const handleAltEvent = () => fetchAlterations();
    window.addEventListener('erp:alterationChanged', handleAltEvent);
    return () => window.removeEventListener('erp:alterationChanged', handleAltEvent);
  }, [fetchAlterations]);

  useEffect(() => {
    if (activeMainTab === 'analytics' && !analyticsData) {
      fetchFactoryAnalytics();
    }
  }, [activeMainTab, analyticsData, fetchFactoryAnalytics]);

  useEffect(() => {
    if (targetJob) {
      const autoCalc = utils.calculateMetersForModel
        ? utils.calculateMetersForModel(targetJob.product, targetJob.child_name, targetJob.customer_name, products, customers, fabricInventory)
        : { fabric: 'تفتة تركي', meters: 3 };
      setForm(prev => ({
        ...prev,
        order_no: targetJob.order_no || `JOB-${targetJob.customer_id || 'CUST'}-${Date.now().toString().slice(-4)}`,
        customer: targetJob.customer_name || targetJob.customer || '',
        child_name: targetJob.child_name || '',
        product: targetJob.product || targetJob.product_name || '',
        product_id: targetJob.product_id || '',
        quantity: targetJob.quantity || 1,
        tailor: prev.tailor || (employees?.find(emp => emp.status === 'نشط')?.name || 'المعلم سليم (خياط أول)'),
        stage: stages[0], progress: '20', start_date: todayStrIso,
        due_date: utils.addDays ? utils.addDays(todayStrIso, 4) : '',
        fabric_name: autoCalc.fabric, cut_meters: String(autoCalc.meters), deduct_inventory: true
      }));
      if (typeof onClearTargetJob === 'function') onClearTargetJob();
    }
  }, [targetJob, utils, products, customers, fabricInventory, employees, stages, todayStrIso, onClearTargetJob]);

  const filteredFactory = useMemo(() => {
    return (factory || []).filter(f => {
      const matchSearch = !search ||
        (f.order_no || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.customer || f.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.product || f.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.tailor || '').toLowerCase().includes(search.toLowerCase());
      const matchStage = stageFilter === 'الكل' || f.stage === stageFilter;
      return matchSearch && matchStage;
    });
  }, [factory, search, stageFilter]);

  return {
    stages, todayStrIso, activeMainTab, setActiveMainTab, analyticsData, setAnalyticsData,
    loadingAnalytics, setLoadingAnalytics, stockInflowLoading, setStockInflowLoading,
    deliveryModalData, setDeliveryModalData, deliveryForm, setDeliveryForm,
    submittingDelivery, setSubmittingDelivery, deliveredSuccessData, setDeliveredSuccessData,
    alterationsList, setAlterationsList, loadingAlterations, setLoadingAlterations,
    scanProgressModalOpen, setScanProgressModalOpen, scanBarcodeQuery, setScanBarcodeQuery,
    scannedProgressJob, setScannedProgressJob, advancingScanProgress, setAdvancingScanProgress,
    selectedJobCustomer, setSelectedJobCustomer, printModalData, setPrintModalData,
    qcModalData, setQcModalData, stageFilter, setStageFilter, search, setSearch,
    form, setForm, fabricInventory, fetchFactoryAnalytics, fetchAlterations, filteredFactory
  };
}

window.useFactoryData = useFactoryData;
