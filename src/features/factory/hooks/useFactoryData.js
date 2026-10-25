const { useState, useEffect, useMemo, useCallback } = React;

function useFactoryData({
  factory = [], setFactory, employees = [], setEmployees, orders = [], setOrders,
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
  const [analyticsData, setAnalyticsData] = useState(null), [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [stockInflowLoading, setStockInflowLoading] = useState({});
  const [deliveryModalData, setDeliveryModalData] = useState(null);
  const [deliveryForm, setDeliveryForm] = useState({ amount_collected: '', discount: '0', account_id: 'ACC-101', payment_method: 'نقد (كاش)', notes: '' });
  const [submittingDelivery, setSubmittingDelivery] = useState(false), [deliveredSuccessData, setDeliveredSuccessData] = useState(null);
  const [alterationsList, setAlterationsList] = useState([]), [loadingAlterations, setLoadingAlterations] = useState(false);
  const [scanProgressModalOpen, setScanProgressModalOpen] = useState(false), [scanBarcodeQuery, setScanBarcodeQuery] = useState('');
  const [scannedProgressJob, setScannedProgressJob] = useState(null), [advancingScanProgress, setAdvancingScanProgress] = useState(false);
  const [selectedJobCustomer, setSelectedJobCustomer] = useState(null), [printModalData, setPrintModalData] = useState(null);
  const [jobTicketData, setJobTicketData] = useState(null), [modelPreviewData, setModelPreviewData] = useState(null), [qcModalData, setQcModalData] = useState(null);
  const [stageFilter, setStageFilter] = useState('الكل'), [search, setSearch] = useState('');

  const [form, setForm] = useState({
    order_no: '', customer: '', child_name: '', product: '', product_id: '', quantity: '', tailor: '', stage: stages[0], progress: '0',
    start_date: todayStrIso, due_date: '', cutting_due_date: '', sewing_due_date: '', embroidery_due_date: '', finishing_due_date: '', packaging_due_date: '',
    cutter_name: '', cutter_wage: '', tailor_name: '', tailor_wage: '',
    embroiderer_name: '', embroiderer_wage: '', finisher_name: '', finisher_wage: '', packager_name: '', packager_wage: '',
    fabric_name: '', cut_meters: '', cut_unit: 'متر', deduct_inventory: true,
    production_type: 'bespoke', target_segment: 'kids', size_code: '6-9Y', measurements_spec: {},
    total_amount: 0, paid_amount: 0, remaining_amount: 0, currency: 'YER'
  });

  const fabricInventory = useMemo(() => {
    return (inventory || []).filter(item => {
      const s = `${item.category || ''} ${item.type || ''} ${item.unit || ''} ${item.name || item.item_name || ''}`.toLowerCase();
      return ['أقمش', 'قماش', 'خام', 'fabric', 'متر', 'وار', 'يارد', 'تل', 'تفتة', 'حرير', 'اوركنزا', 'شيفون', 'صدفة', 'بطان'].some(k => s.includes(k));
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
      const tjTot = parseFloat(targetJob.total_amount ?? targetJob.total_price ?? targetJob.grand_total ?? targetJob.total ?? targetJob.price ?? 0) || 0;
      const tjPd = parseFloat(targetJob.paid_amount ?? targetJob.advance_paid ?? targetJob.paid ?? targetJob.deposit ?? targetJob.deposit_amount ?? 0) || 0;
      const tjRem = Math.max(0, tjTot - tjPd);
      const targetDue = targetJob.delivery_date || targetJob.due_date || targetJob.delivery_date_iso || targetJob.target_date || (utils.addDays ? utils.addDays(todayStrIso, 4) : '');
      const autoM = utils.autoDistributeMilestones ? utils.autoDistributeMilestones(todayStrIso, targetDue) : {};
      setForm(prev => ({
        ...prev, order_no: targetJob.order_no || `JOB-${targetJob.customer_id || 'CUST'}-${Date.now().toString().slice(-4)}`,
        customer: targetJob.customer_name || targetJob.customer || '', child_name: targetJob.child_name || '',
        product: targetJob.product || targetJob.product_name || '', product_id: targetJob.product_id || '', quantity: targetJob.quantity || 1, tailor: prev.tailor || targetJob.tailor || '',
        stage: stages[0], progress: targetJob.progress ? String(targetJob.progress) : '0', start_date: todayStrIso, due_date: targetDue,
        cutting_due_date: targetJob.cutting_due_date || autoM.cutting || '', sewing_due_date: targetJob.sewing_due_date || autoM.sewing || '',
        embroidery_due_date: targetJob.embroidery_due_date || autoM.embroidery || '', finishing_due_date: targetJob.finishing_due_date || autoM.finishing || '',
        fabric_name: autoCalc.fabric, cut_meters: String(autoCalc.meters), deduct_inventory: true, production_type: 'bespoke',
        measurements_spec: targetJob.measurements || prev.measurements_spec || {}, total_amount: tjTot, total_price: tjTot,
        paid_amount: tjPd, advance_paid: tjPd, deposit: tjPd, remaining_amount: tjRem, remaining_balance: tjRem, remaining: tjRem, currency: targetJob.currency || 'YER'
      }));
      if (typeof onClearTargetJob === 'function') onClearTargetJob();
    }
  }, [targetJob, utils, products, customers, fabricInventory, employees, stages, todayStrIso, onClearTargetJob]);

  const filteredFactory = useMemo(() => {
    return utils.filterRealFactoryOrders
      ? utils.filterRealFactoryOrders(factory, customers, orders, search, stageFilter)
      : (Array.isArray(factory) ? factory : []);
  }, [factory, customers, orders, search, stageFilter, utils]);

  const syncOrders = useCallback(() => {
    if (typeof setOrders === 'function') {
      fetch('/api/sales/orders').then(r => r.json()).then(d => {
        const list = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []);
        if (list.length > 0) setOrders(list);
      }).catch(() => {});
    }
  }, [setOrders]);

  useEffect(() => {
    syncOrders();
    const handleQcSync = (e) => {
      const detail = e?.detail || {};
      const targetClean = String(detail.orderId || detail.order_no || '').replace(/^#/, '').trim().toLowerCase();
      if (targetClean && detail.status === 'passed') {
        const readyState = { status: 'ready_for_delivery', stage: 'جاهز للتسليم 📦', production_status: 'ready', tailor_status: 'approved', wage_credited: true, quality_score: 5.0, quality_status: 'passed', progress: 100 };
        const isMatch = (item) => item && (String(item.order_no || '').replace(/^#/, '').trim().toLowerCase() === targetClean || String(item.id || '').replace(/^#/, '').trim().toLowerCase() === targetClean);
        if (typeof setFactory === 'function') {
          setFactory(prev => {
            let found = false;
            const nextList = (prev || []).map(item => isMatch(item) ? (found = true, { ...item, ...readyState }) : item);
            if (!found) nextList.unshift({ id: detail.order_no || targetClean, order_no: targetClean, customer: detail.customer_name || '', child_name: detail.child_name || '', product: detail.product_name || '', tailor: detail.tailor_name || '', ...readyState });
            return nextList;
          });
        }
        if (typeof setOrders === 'function') setOrders(prev => (prev || []).map(item => isMatch(item) ? { ...item, ...readyState } : item));
      } else if (targetClean && (detail.status === 'delivered' || detail.stage === 'تم التسليم')) {
        if (typeof setFactory === 'function') {
          setFactory(prev => (prev || []).filter(item => {
            const iNo = String(item.order_no || '').replace(/^#/, '').trim().toLowerCase();
            const iId = String(item.id || '').replace(/^#/, '').trim().toLowerCase();
            return iNo !== targetClean && iId !== targetClean;
          }));
        }
      }
      syncOrders();
    };

    ['order_status_changed', 'order_qc_updated', 'erp:ordersChanged', 'erp:factoryChanged', 'orders-updated'].forEach(ev => window.addEventListener(ev, handleQcSync));
    return () => ['order_status_changed', 'order_qc_updated', 'erp:ordersChanged', 'erp:factoryChanged', 'orders-updated'].forEach(ev => window.removeEventListener(ev, handleQcSync));
  }, [syncOrders, setFactory, setOrders]);

  useEffect(() => {
    if ((!customers || customers.length === 0) && typeof setCustomers === 'function') fetch('/api/customers').then(r => r.json()).then(d => { const l = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []); if (l.length > 0) setCustomers(l); }).catch(() => {});
    if ((!products || products.length === 0) && typeof setProducts === 'function') fetch('/api/products').then(r => r.json()).then(d => { const l = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []); if (l.length > 0) setProducts(l); }).catch(() => {});
    if ((!employees || employees.length === 0) && typeof setEmployees === 'function') fetch('/api/hr/employees').then(r => r.json()).then(d => { const l = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []); if (l.length > 0) setEmployees(l); }).catch(() => {});
  }, [customers, products, employees, setCustomers, setProducts, setEmployees]);

  const bespokeOrders = useMemo(() => utils.getBespokeOrdersList ? utils.getBespokeOrdersList(orders, customers, products) : (orders || []), [orders, customers, products, utils]);

  return {
    stages, todayStrIso, activeMainTab, setActiveMainTab, analyticsData, setAnalyticsData,
    loadingAnalytics, setLoadingAnalytics, stockInflowLoading, setStockInflowLoading,
    deliveryModalData, setDeliveryModalData, deliveryForm, setDeliveryForm,
    submittingDelivery, setSubmittingDelivery, deliveredSuccessData, setDeliveredSuccessData,
    alterationsList, setAlterationsList, loadingAlterations, setLoadingAlterations,
    scanProgressModalOpen, setScanProgressModalOpen, scanBarcodeQuery, setScanBarcodeQuery,
    scannedProgressJob, setScannedProgressJob, advancingScanProgress, setAdvancingScanProgress,
    selectedJobCustomer, setSelectedJobCustomer, printModalData, setPrintModalData,
    jobTicketData, setJobTicketData, modelPreviewData, setModelPreviewData,
    qcModalData, setQcModalData, stageFilter, setStageFilter, search, setSearch,
    form, setForm, fabricInventory, fetchFactoryAnalytics, fetchAlterations, filteredFactory,
    bespokeOrders
  };
}

window.useFactoryData = useFactoryData;
