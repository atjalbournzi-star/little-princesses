// src/features/feedback/hooks/useFeedbackData.js
// إدارة بيانات وحالات منظومة الملاحظات ومؤشرات الجودة

const { useState, useEffect, useMemo, useCallback } = React;

function useFeedbackData({
  feedback = [], setFeedback,
  orders = [], factory = [], expenses = [], purchases = [],
  products = [], employees = [], currency
}) {
  const currencyDisplay = currency?.display || "YER ريال";

  const [masterEvaluations, setMasterEvaluations] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [defects, setDefects] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [returns, setReturns] = useState([]);
  const [correctiveActions, setCorrectiveActions] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [qualitySettings, setQualitySettings] = useState([]);
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);

  const [activeTab, setActiveTab] = useState('executive');
  const [timeframe, setTimeframe] = useState('all');
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [lineageDrawer, setLineageDrawer] = useState(null);
  const [activeModalType, setActiveModalType] = useState(null);
  const [selectedCert, setSelectedCert] = useState(null);
  const [activeReportView, setActiveReportView] = useState('all');

  const loadQualityBackendData = useCallback(async () => {
    setIsLoadingBackend(true);
    try {
      if (window.qualityAPI) {
        if (typeof window.qualityAPI.getDashboard === 'function') {
          const res = await window.qualityAPI.getDashboard();
          if (res && res.success && res.data) {
            if (Array.isArray(res.data.inspections)) setInspections(res.data.inspections);
            if (Array.isArray(res.data.defects)) setDefects(res.data.defects);
            if (Array.isArray(res.data.feedback) && res.data.feedback.length > 0 && setFeedback) setFeedback(res.data.feedback);
            if (Array.isArray(res.data.complaints)) setComplaints(res.data.complaints);
            if (Array.isArray(res.data.returns)) setReturns(res.data.returns);
            if (Array.isArray(res.data.corrective_actions)) setCorrectiveActions(res.data.corrective_actions);
            if (Array.isArray(res.data.checkpoints)) setCheckpoints(res.data.checkpoints);
            if (Array.isArray(res.data.settings)) setQualitySettings(res.data.settings);
          }
        }
        if (typeof window.qualityAPI.getEvaluations === 'function') {
          const evalRes = await window.qualityAPI.getEvaluations();
          if (evalRes && evalRes.success && Array.isArray(evalRes.data)) {
            setMasterEvaluations(evalRes.data);
          }
        }
      }
    } catch (err) {
      console.warn("Quality backend load note (fallback to local state):", err);
    } finally {
      setIsLoadingBackend(false);
    }
  }, [setFeedback]);

  useEffect(() => {
    loadQualityBackendData();
  }, [loadQualityBackendData]);

  const filterByTime = useCallback((items, dateField) => {
    if (window.qualityMetrics?.filterItemsByTime) {
      return window.qualityMetrics.filterItemsByTime(items, timeframe, dateField);
    }
    return items || [];
  }, [timeframe]);

  const timeOrders = useMemo(() => filterByTime(orders, 'order_date'), [orders, filterByTime]);
  const timeFactory = useMemo(() => filterByTime(factory, 'start_date'), [factory, filterByTime]);
  const timeFeedback = useMemo(() => filterByTime(feedback, 'feedback_date'), [feedback, filterByTime]);
  const timeInspections = useMemo(() => filterByTime(inspections, 'inspection_date'), [inspections, filterByTime]);
  const timeDefects = useMemo(() => filterByTime(defects, 'defect_date'), [defects, filterByTime]);
  const timeComplaints = useMemo(() => filterByTime(complaints, 'complaint_date'), [complaints, filterByTime]);
  const timeReturns = useMemo(() => filterByTime(returns, 'return_date'), [returns, filterByTime]);
  const timeExpenses = useMemo(() => filterByTime(expenses, 'date'), [expenses, filterByTime]);
  const timePurchases = useMemo(() => filterByTime(purchases, 'date'), [purchases, filterByTime]);
  const timeEvaluations = useMemo(() => filterByTime(masterEvaluations, 'record_date'), [masterEvaluations, filterByTime]);

  const metrics = useMemo(() => {
    if (window.qualityMetrics?.calculateQualityMetrics) {
      return window.qualityMetrics.calculateQualityMetrics({
        timeOrders, timeFactory, timeFeedback, timeInspections, timeDefects,
        timeComplaints, timeReturns, timeExpenses, timePurchases, timeEvaluations
      });
    }
    return { totalCOPQ: 0, oqs: null, defectRate: null, firstPassYield: null, csat: null, nps: null, rawDefects: [], rawFeedback: [] };
  }, [timeOrders, timeFactory, timeFeedback, timeInspections, timeDefects, timeComplaints, timeReturns, timeExpenses, timePurchases, timeEvaluations]);

  const productQualityProfiles = useMemo(() => {
    return window.qualityProfiles ? window.qualityProfiles.calculateProductProfiles(products, orders, defects, feedback, returns) : [];
  }, [products, orders, defects, feedback, returns]);

  const fabricQualityProfiles = useMemo(() => {
    return window.qualityProfiles ? window.qualityProfiles.calculateFabricProfiles(products, productQualityProfiles) : [];
  }, [products, productQualityProfiles]);

  const designerQualityProfiles = useMemo(() => {
    return window.qualityProfiles ? window.qualityProfiles.calculateDesignerProfiles(employees, products) : [];
  }, [employees, products]);

  const tailorQualityProfiles = useMemo(() => {
    return window.qualityProfiles ? window.qualityProfiles.calculateTailorProfiles(employees, factory, defects) : [];
  }, [employees, factory, defects]);

  const departmentQualityScores = useMemo(() => {
    return window.qualityProfiles ? window.qualityProfiles.calculateDepartmentScores(metrics, products, purchases, factory, orders, defects, inspections, complaints, feedback) : [];
  }, [metrics, products, purchases, factory, orders, defects, inspections, complaints, feedback]);

  const prioritizedAlerts = useMemo(() => {
    return window.qualityProfiles ? window.qualityProfiles.calculatePrioritizedAlerts(productQualityProfiles, fabricQualityProfiles, complaints, currencyDisplay) : [];
  }, [productQualityProfiles, fabricQualityProfiles, complaints, currencyDisplay]);

  return {
    currencyDisplay,
    masterEvaluations, setMasterEvaluations,
    inspections, setInspections,
    defects, setDefects,
    complaints, setComplaints,
    returns, setReturns,
    correctiveActions, setCorrectiveActions,
    checkpoints, setCheckpoints,
    qualitySettings, setQualitySettings,
    isLoadingBackend,
    activeTab, setActiveTab,
    timeframe, setTimeframe,
    search, setSearch,
    filterDept, setFilterDept,
    filterStatus, setFilterStatus,
    showFormulaModal, setShowFormulaModal,
    lineageDrawer, setLineageDrawer,
    activeModalType, setActiveModalType,
    selectedCert, setSelectedCert,
    activeReportView, setActiveReportView,
    loadQualityBackendData,
    metrics,
    productQualityProfiles,
    fabricQualityProfiles,
    designerQualityProfiles,
    tailorQualityProfiles,
    departmentQualityScores,
    prioritizedAlerts
  };
}

window.useFeedbackData = useFeedbackData;
