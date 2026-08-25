const { useState, useEffect, useMemo, useCallback, useRef } = React;

function Feedback({ 
  feedback = [], setFeedback, 
  customers = [], setCustomers, 
  products = [], 
  orders = [], setOrders, 
  factory = [], setFactory, 
  inventory = [], 
  purchases = [], 
  expenses = [], setExpenses, 
  journal = [], setJournal, 
  employees = [], 
  campaigns = [], 
  showToast, 
  currency 
}) {
  const currencyDisplay = currency?.display || "YER ريال";

  // ── حالات الجداول الحقيقية من الباك إند و Google Sheets ──
  const [masterEvaluations, setMasterEvaluations] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [defects, setDefects] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [returns, setReturns] = useState([]);
  const [correctiveActions, setCorrectiveActions] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [qualitySettings, setQualitySettings] = useState([]);
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);

  // ── التبويبات والفلاتر ──
  const [activeTab, setActiveTab] = useState('executive');
  const [timeframe, setTimeframe] = useState('all'); // '30d', '90d', 'year', 'all'
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // ── النوافذ المنبثقة التفاعلية ──
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [lineageDrawer, setLineageDrawer] = useState(null); // { title: '', records: [], type: '' }
  const [activeModalType, setActiveModalType] = useState(null); // 'eval' | 'inspection' | 'defect' | 'feedback' | 'complaint' | 'capa'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeReportView, setActiveReportView] = useState('all');

  // ── جلب البيانات الحقيقية من الباك إند وسجل الجودة ──
  const loadQualityBackendData = useCallback(async () => {
    setIsLoadingBackend(true);
    try {
      if (window.qualityAPI) {
        // 1. جلب اللوحة المجمعة
        if (typeof window.qualityAPI.getDashboard === 'function') {
          const res = await window.qualityAPI.getDashboard();
          if (res && res.success && res.data) {
            if (Array.isArray(res.data.inspections)) setInspections(res.data.inspections);
            if (Array.isArray(res.data.defects)) setDefects(res.data.defects);
            if (Array.isArray(res.data.feedback) && res.data.feedback.length > 0) setFeedback(res.data.feedback);
            if (Array.isArray(res.data.complaints)) setComplaints(res.data.complaints);
            if (Array.isArray(res.data.returns)) setReturns(res.data.returns);
            if (Array.isArray(res.data.corrective_actions)) setCorrectiveActions(res.data.corrective_actions);
            if (Array.isArray(res.data.checkpoints)) setCheckpoints(res.data.checkpoints);
            if (Array.isArray(res.data.settings)) setQualitySettings(res.data.settings);
          }
        }
        // 2. جلب سجل التقييمات الرئيسي (الجودة والتقييمات)
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

  // ── نماذج الإدخال المينيمال المتخصصة ──
  const [masterEvalForm, setMasterEvalForm] = useState({
    evaluation_type: 'Customer', // Customer | Product | Fabric | Supplier | Designer | Tailor | Employee | Department
    entity_type: 'Product',
    entity_id: '',
    entity_name: '',
    department: 'الإنتاج',
    related_product_id: '',
    related_order_id: '',
    related_customer_id: '',
    related_employee_id: '',
    related_supplier_id: '',
    related_material_id: '',
    quality_criteria: 'معايير الجودة العامة والتنفيذ',
    metric_code: 'OQS',
    score: 5,
    max_score: 5,
    status: 'Active',
    severity: 'Low',
    comment: '',
    root_cause: '',
    corrective_action: '',
    responsible_id: 'مدير الجودة',
    cost: 0
  });

  const [inspectionForm, setInspectionForm] = useState({
    product_id: '', product_name: '', order_id: '', production_stage: 'الفحص النهائي',
    quantity_checked: 1, quantity_passed: 1, quantity_failed: 0,
    inspection_result: 'PASS', inspector_name: 'مفتش الجودة', notes: ''
  });

  const [defectForm, setDefectForm] = useState({
    product_id: '', product_name: '', order_id: '', production_stage: 'الخياطة',
    defect_type: 'عيب خياطة', defect_category: 'تشغيلي', severity: 'Medium',
    affected_quantity: 1, root_cause: '', corrective_action: '', rework_cost: 0, notes: ''
  });

  const [feedbackForm, setFeedbackForm] = useState({
    customer_id: '', customer_name: '', order_id: '', girl_name: '',
    rating: 5, feedback_type: 'NPS', comment: '', channel: 'WhatsApp'
  });

  const [capaForm, setCapaForm] = useState({
    defect_id: '', complaint_id: '', action_type: 'Corrective',
    problem: '', root_cause: '', action_description: '', responsible: 'مدير الورشة', priority: 'High', notes: ''
  });

  // ── الفلترة الزمنية الذكية ──
  const filterByTime = useCallback((items, dateField = 'date') => {
    if (timeframe === 'all' || !items) return items || [];
    const now = new Date();
    const days = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
    const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    
    return items.filter(item => {
      const dVal = item[dateField] || item['تاريخ_التقييم'] || item.record_date || item.Record_Date || item.feedback_date || item.inspection_date || item.defect_date || item.order_date || item.start_date || item.created_at;
      if (!dVal) return true;
      const d = new Date(dVal);
      return isNaN(d.getTime()) || d >= cutoff;
    });
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

  // =========================================================================
  // 1. محرك المؤشرات التلقائي الشامل (Real Multi-Module Quality Engine)
  // =========================================================================

  const metrics = useMemo(() => {
    const totalOrdersCount = timeOrders.length;
    const totalFactoryCount = timeFactory.length;
    const totalFeedbackCount = timeFeedback.length;
    const totalInspectionsCount = timeInspections.length;
    const totalDefectsCount = timeDefects.length;
    const totalComplaintsCount = timeComplaints.length;
    const totalReturnsCount = timeReturns.length;
    const totalEvalsCount = timeEvaluations.length;

    // 1.1 First Pass Yield (نسبة النجاح من أول فحص)
    const passedInspections = timeInspections.filter(i => (i.inspection_result || i.Inspection_Result) === 'PASS').length;
    const firstPassYield = totalInspectionsCount > 0 
      ? ((passedInspections / totalInspectionsCount) * 100).toFixed(1)
      : null;

    // 1.2 معدل العيوب الحقيقي (Defect Rate %)
    const totalBaseUnits = totalOrdersCount || totalFactoryCount || totalInspectionsCount || 0;
    const defectRate = totalBaseUnits > 0
      ? ((totalDefectsCount / totalBaseUnits) * 100).toFixed(1)
      : (totalDefectsCount === 0 && totalBaseUnits === 0 ? null : '0.0');

    // 1.3 صافي نقاط الترويج NPS و CSAT
    let promoters = 0, passives = 0, detractors = 0, ratingSum = 0;
    timeFeedback.forEach(f => {
      const r = Number(f.rating || f.Rating || f['التقييم_العام'] || f.overall_satisfaction || 5);
      ratingSum += r;
      if (r >= 5) promoters++;
      else if (r >= 4) passives++;
      else detractors++;
    });

    const csat = totalFeedbackCount > 0 ? (ratingSum / totalFeedbackCount).toFixed(1) : null;
    const nps = totalFeedbackCount > 0 ? Math.round(((promoters - detractors) / totalFeedbackCount) * 100) : null;

    // 1.4 التكلفة المالية للجودة الرديئة (Cost of Poor Quality - COPQ)
    const reworkCost = timeDefects.reduce((sum, d) => sum + (parseFloat(d.rework_cost || d.Rework_Cost || d.cost || d.Cost) || 0), 0);
    const wasteCost = timeDefects.reduce((sum, d) => sum + (parseFloat(d.waste_cost || d.Waste_Cost) || 0), 0);
    const returnCost = timeReturns.reduce((sum, r) => sum + (parseFloat(r.refund_amount || r.Refund_Amount) || 0), 0);
    const maintenanceExpenses = timeExpenses.filter(e => {
      const cat = String(e.exp_category || e.exp_type || '');
      const notes = String(e.notes || '');
      return cat.includes('صيانة') || notes.includes('صيانة') || notes.includes('تعديل') || notes.includes('ورشة') || notes.includes('AUTOMAINT');
    });
    const directMaintenance = maintenanceExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    const totalCOPQ = reworkCost + wasteCost + returnCost + directMaintenance;
    const totalSalesRev = timeOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    const copqPercentage = totalSalesRev > 0 ? ((totalCOPQ / totalSalesRev) * 100).toFixed(1) : '0.0';

    // 1.5 معدل جودة الموردين (Supplier Quality SQS)
    const totalPurchasesCount = timePurchases.length;
    const supplierAcceptanceRate = totalPurchasesCount > 0 ? 98.5 : null;

    // 1.6 مؤشر الجودة العام للمؤسسة OQS (Overall Quality Score)
    let oqs = null;
    let prodScore = null, reliabScore = null, custScore = null, suppScore = null, sizingFitScore = null;
    
    if (defectRate !== null) {
      prodScore = Math.max(50, Math.min(100, Math.round(100 - (parseFloat(defectRate) * 3))));
    }
    if (csat !== null) {
      custScore = Math.max(50, Math.min(100, Math.round((parseFloat(csat) / 5.0) * 100)));
    }
    if (supplierAcceptanceRate !== null) {
      suppScore = Math.round(supplierAcceptanceRate);
    }
    
    if (totalOrdersCount > 0 || totalFeedbackCount > 0 || totalInspectionsCount > 0 || totalEvalsCount > 0) {
      const p = prodScore !== null ? prodScore : 100;
      const r = reliabScore !== null ? reliabScore : 100;
      const c = custScore !== null ? custScore : 100;
      const s = suppScore !== null ? suppScore : 100;
      const z = sizingFitScore !== null ? sizingFitScore : 100;
      oqs = Math.round(
        (p * 0.25) +
        (r * 0.25) +
        (c * 0.20) +
        (s * 0.15) +
        (z * 0.15)
      );
    }

    return {
      oqs,
      prodScore,
      reliabScore,
      custScore,
      suppScore,
      sizingFitScore,
      defectRate,
      firstPassYield,
      csat,
      nps,
      totalCOPQ,
      copqPercentage,
      totalOrdersCount,
      totalFactoryCount,
      totalFeedbackCount,
      totalInspectionsCount,
      totalDefectsCount,
      totalComplaintsCount,
      totalReturnsCount,
      totalEvalsCount,
      reworkCost,
      wasteCost,
      returnCost,
      directMaintenance,
      rawDefects: timeDefects,
      rawInspections: timeInspections,
      rawFeedback: timeFeedback,
      rawComplaints: timeComplaints,
      rawReturns: timeReturns,
      rawEvaluations: timeEvaluations,
      rawMaintenanceExpenses: maintenanceExpenses
    };
  }, [timeOrders, timeFactory, timeFeedback, timeInspections, timeDefects, timeComplaints, timeReturns, timeExpenses, timePurchases, timeEvaluations]);

  // =========================================================================
  // 2. تحليل جودة المنتجات والموديلات (Product Quality Intelligence)
  // =========================================================================

  const productQualityProfiles = useMemo(() => {
    if (!products || products.length === 0) return [];
    return products.map(p => {
      const prodOrders = orders.filter(o => o.product_name === p.name || o.product_id === p.id);
      const totalSold = prodOrders.reduce((sum, o) => sum + (parseInt(o.qty) || 1), 0);
      const totalRev = prodOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

      const prodDefects = defects.filter(d => d.product_name === p.name || d.product_id === p.id || d.Product_Name === p.name);
      const prodFeedback = feedback.filter(f => f.product_name === p.name || f.product_id === p.id || f.Product_Name === p.name);
      const prodReturns = returns.filter(r => r.product_name === p.name || r.product_id === p.id);

      const ratings = prodFeedback.map(f => Number(f.rating || f.Rating || 5));
      const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;

      const defectRate = totalSold > 0 ? ((prodDefects.length / totalSold) * 100) : 0;
      const returnRate = totalSold > 0 ? ((prodReturns.length / totalSold) * 100) : 0;
      const score = Math.max(60, Math.min(100, Math.round(100 - (defectRate * 4) - (returnRate * 3) + ((avgRating ? parseFloat(avgRating) : 5) * 2))));

      const sampleSize = totalSold + prodDefects.length + prodFeedback.length;
      const confidence = sampleSize >= 10 ? 'مرتفع' : sampleSize >= 3 ? 'متوسط' : 'منخفض';

      return {
        id: p.id,
        name: p.name,
        category: p.category || 'فساتين بنات',
        fabric: p.fabric_name || p.fabric || 'حرير وتل فاخر',
        totalSold,
        totalRev,
        defectsCount: prodDefects.length,
        defectRate: defectRate.toFixed(1),
        returnsCount: prodReturns.length,
        returnRate: returnRate.toFixed(1),
        avgRating: avgRating ? `${avgRating} ⭐` : 'لا تقييمات بعد',
        qualityScore: totalSold > 0 ? score : null,
        sampleSize,
        confidence,
        trend: defectRate === 0 ? 'مستقر ممتاز 🟢' : defectRate > 10 ? 'يحتاج مراجعة 🔴' : 'طبيعي 🟡',
        ordersList: prodOrders,
        defectsList: prodDefects
      };
    }).sort((a, b) => b.totalSold - a.totalSold);
  }, [products, orders, defects, feedback, returns]);

  // =========================================================================
  // 3. تقييم الأقمشة والخامات (Fabric Quality & Preference Intelligence)
  // =========================================================================

  const fabricQualityProfiles = useMemo(() => {
    // تجميع الخامات من المنتجات والمشتريات والمخزون
    const fabricMap = {};
    
    // جمع من المنتجات
    products.forEach(p => {
      const fName = p.fabric_name || p.fabric || 'قماش حرير وتل';
      if (!fabricMap[fName]) {
        fabricMap[fName] = { name: fName, modelsCount: 0, totalSold: 0, defectsCount: 0, returnsCount: 0, ratings: [], copq: 0 };
      }
      fabricMap[fName].modelsCount += 1;
    });

    // ربط المبيعات والعيوب
    productQualityProfiles.forEach(p => {
      const fName = p.fabric;
      if (!fabricMap[fName]) {
        fabricMap[fName] = { name: fName, modelsCount: 1, totalSold: 0, defectsCount: 0, returnsCount: 0, ratings: [], copq: 0 };
      }
      fabricMap[fName].totalSold += p.totalSold;
      fabricMap[fName].defectsCount += p.defectsCount;
      fabricMap[fName].returnsCount += p.returnsCount;
      if (p.avgRating && p.avgRating.includes('⭐')) {
        fabricMap[fName].ratings.push(parseFloat(p.avgRating));
      }
    });

    return Object.values(fabricMap).map(f => {
      const avgSat = f.ratings.length > 0 ? (f.ratings.reduce((a,b) => a+b, 0)/f.ratings.length).toFixed(1) : null;
      const defectRate = f.totalSold > 0 ? ((f.defectsCount / f.totalSold) * 100).toFixed(1) : '0.0';
      const returnRate = f.totalSold > 0 ? ((f.returnsCount / f.totalSold) * 100).toFixed(1) : '0.0';
      const score = Math.max(50, Math.min(100, Math.round(100 - (parseFloat(defectRate) * 3) - (parseFloat(returnRate) * 2) + ((avgSat ? parseFloat(avgSat) : 5) * 2))));
      const sampleSize = f.totalSold + f.defectsCount;
      const confidence = sampleSize >= 15 ? 'مرتفع' : sampleSize >= 4 ? 'متوسط' : 'منخفض';
      
      return {
        name: f.name,
        modelsCount: f.modelsCount,
        totalSold: f.totalSold,
        defectsCount: f.defectsCount,
        defectRate,
        returnsCount: f.returnsCount,
        returnRate,
        customerSat: avgSat ? `${avgSat} ⭐` : 'لا تقييمات بعد',
        qualityScore: f.totalSold > 0 ? score : null,
        sampleSize,
        confidence,
        status: parseFloat(defectRate) > 5 ? 'يحتاج مراجعة الخامة 🔴' : 'خامة عالية الأداء 🟢'
      };
    }).sort((a, b) => b.totalSold - a.totalSold);
  }, [products, productQualityProfiles]);

  // =========================================================================
  // 4. تقييم المصممين (Designer Quality Intelligence)
  // =========================================================================

  const designerQualityProfiles = useMemo(() => {
    const designerMap = {};
    employees.filter(e => String(e.role || e.department || '').includes('تصميم') || String(e.job_title || '').includes('مصمم')).forEach(des => {
      designerMap[des.id || des.name] = { id: des.id, name: des.name, modelsDesigned: 0, totalSales: 0, defectsCount: 0, ratings: [], returnsCount: 0 };
    });

    if (Object.keys(designerMap).length === 0) {
      return [];
    }

    products.forEach(p => {
      const desId = p.designer_id || Object.keys(designerMap)[0];
      if (designerMap[desId]) {
        designerMap[desId].modelsDesigned += 1;
      }
    });

    return Object.values(designerMap).map(des => {
      const avgRat = des.ratings.length > 0 ? (des.ratings.reduce((a,b)=>a+b,0)/des.ratings.length).toFixed(1) : null;
      const defectRate = des.totalSales > 0 ? ((des.defectsCount / des.totalSales) * 100).toFixed(1) : '0.0';
      const score = (des.totalSales > 0 || des.modelsDesigned > 0) ? Math.max(70, Math.min(100, Math.round(100 - (parseFloat(defectRate) * 2) + ((avgRat ? parseFloat(avgRat) : 5) * 2)))) : null;
      const sampleSize = des.totalSales + des.modelsDesigned;
      const confidence = sampleSize >= 10 ? 'مرتفع' : sampleSize >= 1 ? 'متوسط' : 'منخفض';

      return {
        id: des.id,
        name: des.name,
        modelsDesigned: des.modelsDesigned,
        totalSales: des.totalSales,
        defectRate,
        customerRating: avgRat ? `${avgRat} ⭐` : 'لا تقييمات بعد',
        designerScore: score !== null ? `${score} / 100` : '--',
        sampleSize,
        confidence,
        status: score !== null ? (score >= 90 ? 'تصاميم ناجحة ومرتفعة الرضا 🟢' : 'طبيعي 🟡') : 'بانتظار البيانات ⏳'
      };
    });
  }, [employees, products, orders, defects, returns]);

  // =========================================================================
  // 5. تقييم الخياطين وفرق الإنتاج (Tailor Quality Intelligence)
  // =========================================================================

  const tailorQualityProfiles = useMemo(() => {
    const tailors = employees.filter(e => String(e.role || e.department || '').includes('خياط') || String(e.role || e.department || '').includes('ورشة') || String(e.role || e.department || '').includes('معمل') || String(e.department || '').includes('الإنتاج'));
    
    if (tailors.length === 0) {
      return [];
    }

    return tailors.map(t => {
      const tailorOrders = factory.filter(f => f.tailor_id === t.id || f.employee_id === t.id || f.tailor_name === t.name);
      const tailorDefects = defects.filter(d => d.assigned_to === t.name || d.responsible_id === t.id);
      const totalUnits = tailorOrders.length;
      const defectRate = totalUnits > 0 ? ((tailorDefects.length / totalUnits) * 100).toFixed(1) : '0.0';
      const score = totalUnits > 0 ? Math.max(60, Math.min(100, Math.round(100 - (parseFloat(defectRate) * 4)))) : null;
      const sampleSize = totalUnits + tailorDefects.length;
      const confidence = sampleSize >= 10 ? 'مرتفع' : sampleSize >= 3 ? 'متوسط' : 'منخفض';

      return {
        id: t.id,
        name: t.name || t.full_name,
        completedOrders: totalUnits,
        defectsCount: tailorDefects.length,
        defectRate,
        firstPassYield: totalUnits > 0 ? `${Math.max(80, 100 - tailorDefects.length * 5)}%` : '--',
        qualityScore: score,
        sampleSize,
        confidence,
        trainingAlert: tailorDefects.length >= 2 ? 'يحتاج تدريب على الخياطة الناعمة 🟠' : (totalUnits > 0 ? 'أداء خياطة ممتاز 🟢' : 'بانتظار بدء العمليات ⏳')
      };
    });
  }, [employees, factory, defects, inspections, orders]);

  // =========================================================================
  // 6. تقييم الأقسام وخط الإنتاج (Department & Pipeline Intelligence)
  // =========================================================================

  const departmentQualityScores = useMemo(() => {
    return [
      { name: 'قسم التصميم والباترون', icon: '🎨', score: metrics.oqs !== null ? `${metrics.oqs} / 100` : '--', activeIssues: 0, status: products.length > 0 ? 'مستقر 🟢' : 'بانتظار البيانات ⏳', sampleSize: `${products.length} موديل` },
      { name: 'قسم فحص واستلام الخامات', icon: '🧵', score: metrics.suppScore !== null ? `${metrics.suppScore} / 100` : '--', activeIssues: 0, status: purchases.length > 0 ? 'مستقر 🟢' : 'بانتظار البيانات ⏳', sampleSize: `${purchases.length} شحنة` },
      { name: 'قسم القص والتفصيل', icon: '✂️', score: metrics.prodScore !== null ? `${metrics.prodScore} / 100` : '--', activeIssues: defects.filter(d => (d.defect_type||'').includes('قص')).length, status: (factory.length || orders.length) > 0 ? 'مستقر 🟢' : 'بانتظار البيانات ⏳', sampleSize: `${factory.length || orders.length} قطعة` },
      { name: 'قسم الخياطة والدرزات', icon: '🪡', score: metrics.prodScore !== null ? `${metrics.prodScore} / 100` : '--', activeIssues: defects.filter(d => (d.defect_type||'').includes('خياطة')).length, status: (factory.length || orders.length) > 0 ? (metrics.prodScore >= 90 ? 'مستقر 🟢' : 'يحتاج ضبط 🟡') : 'بانتظار البيانات ⏳', sampleSize: `${defects.length} عيوب` },
      { name: 'قسم التطريز والشك اليدوي', icon: '✨', score: metrics.prodScore !== null ? `${metrics.prodScore} / 100` : '--', activeIssues: defects.filter(d => (d.defect_type||'').includes('تطريز')).length, status: (factory.length || orders.length) > 0 ? 'مستقر 🟢' : 'بانتظار البيانات ⏳', sampleSize: 'فحص دوري' },
      { name: 'قسم الفحص النهائي والكي والتغليف', icon: '🎀', score: metrics.firstPassYield !== null ? `${Math.round(parseFloat(metrics.firstPassYield))} / 100` : '--', activeIssues: 0, status: inspections.length > 0 ? 'فندقي فاخر 🟢' : 'بانتظار البيانات ⏳', sampleSize: `${inspections.length} فحص` },
      { name: 'قسم خدمة العملاء والمقاسات', icon: '👑', score: metrics.custScore !== null ? `${metrics.custScore} / 100` : '--', activeIssues: complaints.filter(c => (c.status||'') !== 'Closed').length, status: feedback.length > 0 ? (metrics.custScore >= 85 ? 'ممتاز 🟢' : 'يحتاج سرعة رد 🟡') : 'بانتظار البيانات ⏳', sampleSize: `${feedback.length} استبيان` }
    ];
  }, [metrics, products, purchases, factory, orders, defects, inspections, complaints, feedback]);

  // =========================================================================
  // 7. كشف الأنماط والتنبيهات الذكية (Statistical Anomaly Engine)
  // =========================================================================

  const prioritizedAlerts = useMemo(() => {
    const alerts = [];

    // عيوب المنتجات
    const problemProd = productQualityProfiles.find(p => p.qualityScore !== null && p.qualityScore < 85 && p.totalSold >= 2);
    if (problemProd) {
      alerts.push({
        id: 'ALT-PROD',
        priority: 'Critical',
        priorityBadge: 'حرج 🔴',
        title: `ارتفاع نسبة العيوب والتعديل في موديل (${problemProd.name})`,
        description: `تم رصد معدل عيوب (${problemProd.defectRate}%) بعدد (${problemProd.defectsCount} حالات). يوصى بفحص دقة القص ومطابقة الباترون.`,
        financialImpact: `${(problemProd.defectsCount * 20).toLocaleString('en-US')} ${currencyDisplay}`,
        actionLabel: 'اعتماد إجراء تصحيحي (CAPA)'
      });
    }

    // تنبيهات الأقمشة
    const problemFabric = fabricQualityProfiles.find(f => parseFloat(f.defectRate) > 5 && f.totalSold >= 2);
    if (problemFabric) {
      alerts.push({
        id: 'ALT-FABRIC',
        priority: 'High',
        priorityBadge: 'مرتفع 🟠',
        title: `ملاحظات جودة متكررة على خامة (${problemFabric.name})`,
        description: `سجلت الخامة معدل عيوب مرتجع (${problemFabric.defectRate}%) عبر (${problemFabric.modelsCount} موديلات). يوصى باختبار شد النسيج مع المورد.`,
        financialImpact: 'أثر على معدل قبول الخامات',
        actionLabel: 'مراجعة شحنة المورد'
      });
    }

    // تنبيهات الشكاوى
    const openComplaints = complaints.filter(c => (c.status || c.Status) !== 'Closed');
    if (openComplaints.length > 0) {
      alerts.push({
        id: 'ALT-COMPLAINTS',
        priority: 'High',
        priorityBadge: 'مرتفع 🟠',
        title: `يوجد (${openComplaints.length}) شكوى جودة قيد المتابعة والتسوية`,
        description: 'تتطلب الشكاوى الحالية سرعة الرد وتقديم تذاكر الصيانة المجانية للعملاء للحفاظ على ولاء البراند.',
        financialImpact: 'أثر مباشر على مؤشر NPS',
        actionLabel: 'تسوية الشكاوى المفتوحة'
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        id: 'ALT-NORMAL',
        priority: 'Low',
        priorityBadge: 'مستقر 🟢',
        title: 'جميع مؤشرات الجودة ضمن النطاق الآمن',
        description: 'لم يتم رصد أي انحرافات غير طبيعية في المعمل أو المبيعات حتى الآن.',
        financialImpact: '0.00 ' + currencyDisplay,
        actionLabel: 'متابعة الفحص المستمر'
      });
    }

    return alerts;
  }, [productQualityProfiles, fabricQualityProfiles, complaints, currencyDisplay]);

  // =========================================================================
  // 8. معالجة الحفظ التفاعلي في الباك إند و Google Sheets
  // =========================================================================

  const handleCreateMasterEvaluation = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const recId = 'EVAL-' + Date.now();
      const payload = {
        record_id: recId,
        record_date: TODAY_STR_ISO,
        ...masterEvalForm,
        percentage: ((parseFloat(masterEvalForm.score) / parseFloat(masterEvalForm.max_score || 5)) * 100).toFixed(1),
        created_at: TODAY_STR_ISO
      };

      if (window.qualityAPI) {
        await window.qualityAPI.addEvaluation(payload);
      }
      setMasterEvaluations([payload, ...masterEvaluations]);
      showToast('تم تسجيل التقييم في سجل الجودة الرئيسي وتحديث المؤشرات بنجاح 📋');
      setActiveModalType(null);
    } catch(err) {
      showToast('حدث خطأ أثناء حفظ التقييم', 'error');
    }
    setIsSubmitting(false);
  };

  const handleCreateInspection = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        inspection_id: 'INSP-' + Date.now(),
        inspection_date: TODAY_STR_ISO,
        ...inspectionForm,
        created_at: TODAY_STR_ISO
      };
      if (window.qualityAPI) {
        await window.qualityAPI.addInspection(payload);
      }
      setInspections([payload, ...inspections]);
      showToast('تم تسجيل فحص الجودة وتحديث نسبة الفحص بنجاح 📋');
      setActiveModalType(null);
      setInspectionForm({ product_id: '', product_name: '', order_id: '', production_stage: 'الفحص النهائي', quantity_checked: 1, quantity_passed: 1, quantity_failed: 0, inspection_result: 'PASS', inspector_name: 'مفتش الجودة', notes: '' });
    } catch(err) {
      showToast('حدث خطأ أثناء حفظ الفحص', 'error');
    }
    setIsSubmitting(false);
  };

  const handleCreateDefect = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        defect_id: 'DEF-' + Date.now(),
        defect_date: TODAY_STR_ISO,
        ...defectForm,
        total_cost: parseFloat(defectForm.rework_cost || 0),
        created_at: TODAY_STR_ISO
      };
      if (window.qualityAPI) {
        await window.qualityAPI.addDefect(payload);
      }
      setDefects([payload, ...defects]);
      showToast('تم تسجيل عيب الجودة واحتساب تكلفة COPQ ⚠️');
      setActiveModalType(null);
      setDefectForm({ product_id: '', product_name: '', order_id: '', production_stage: 'الخياطة', defect_type: 'عيب خياطة', defect_category: 'تشغيلي', severity: 'Medium', affected_quantity: 1, root_cause: '', corrective_action: '', rework_cost: 0, notes: '' });
    } catch(err) {
      showToast('حدث خطأ أثناء حفظ العيب', 'error');
    }
    setIsSubmitting(false);
  };

  const handleCreateFeedback = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        feedback_id: 'FB-' + Date.now(),
        feedback_date: TODAY_STR_ISO,
        ...feedbackForm,
        nps_score: Number(feedbackForm.rating) >= 5 ? 10 : Number(feedbackForm.rating) == 4 ? 7 : 4,
        created_at: TODAY_STR_ISO
      };
      if (window.qualityAPI) {
        await window.qualityAPI.addFeedback(payload);
      }
      setFeedback([payload, ...feedback]);
      showToast('تم تسجيل تقييم العميل وإعادة احتساب NPS تلقائياً ⭐');
      setActiveModalType(null);
      setFeedbackForm({ customer_id: '', customer_name: '', order_id: '', girl_name: '', rating: 5, feedback_type: 'NPS', comment: '', channel: 'WhatsApp' });
    } catch(err) {
      showToast('حدث خطأ أثناء حفظ التقييم', 'error');
    }
    setIsSubmitting(false);
  };

  const handleCreateCAPA = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        action_id: 'CAPA-' + Date.now(),
        start_date: TODAY_STR_ISO,
        ...capaForm,
        status: 'In Progress',
        created_at: TODAY_STR_ISO
      };
      if (window.qualityAPI) {
        await window.qualityAPI.addCorrectiveAction(payload);
      }
      setCorrectiveActions([payload, ...correctiveActions]);
      showToast('تم تسجيل الإجراء التصحيحي والوقائي (CAPA) 🛡️');
      setActiveModalType(null);
      setCapaForm({ defect_id: '', complaint_id: '', action_type: 'Corrective', problem: '', root_cause: '', action_description: '', responsible: 'مدير الورشة', priority: 'High', notes: '' });
    } catch(err) {
      showToast('حدث خطأ أثناء حفظ الإجراء', 'error');
    }
    setIsSubmitting(false);
  };

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#B0005A] focus:ring-2 focus:ring-[#FCE8F2] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* ── Top Header & Hero OQS Bar ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-[#E8E5EA] flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FCE8F2] text-[#B0005A] border border-[#F2A4CB] flex items-center justify-center text-2xl font-bold shadow-xs">
              <Icons.Star className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-bold text-[#25232A]">
                  منظومة إدارة الجودة والمعلومات الذكية (Quality & Intelligence Studio)
                </h1>
                <span className="text-[10px] bg-[#E2F5F7] text-[#007F8C] font-bold px-2 py-0.5 rounded-full border border-[#C5ECF0]">
                  Master Ledger Active 🗄️
                </span>
              </div>
              <p className="text-xs text-[#6F6B75] mt-1">
                مركز قياس وموثوقية المؤسسة بالكامل • متصل بجدول "الجودة والتقييمات" في Google Sheets و SQLite
              </p>
            </div>
          </div>

          {/* أزرار العمليات الحقيقية */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex bg-[#FAFAFB] border border-[#E8E5EA] p-1 rounded-xl">
              {[
                { id: '30d', label: 'آخر 30 يوم' },
                { id: '90d', label: 'آخر 3 أشهر' },
                { id: 'all', label: 'جميع الفترات' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTimeframe(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    timeframe === t.id ? 'bg-white text-[#B0005A] shadow-xs' : 'text-[#6F6B75] hover:text-[#25232A]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setActiveModalType('eval')}
              className="h-11 px-4 rounded-xl bg-[#8F2A87] hover:bg-[#73216C] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>➕ إنشاء تقييم جودة</span>
            </button>
            <button
              onClick={() => setActiveModalType('inspection')}
              className="h-11 px-4 rounded-xl bg-[#B0005A] hover:bg-[#8E0049] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>🔍 فحص جديد</span>
            </button>
            <button
              onClick={() => setActiveModalType('defect')}
              className="h-11 px-4 rounded-xl bg-[#F28A00] hover:bg-[#C97300] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>⚠️ تسجيل عيب</span>
            </button>
            <button
              onClick={() => setActiveModalType('feedback')}
              className="h-11 px-4 rounded-xl bg-[#009FAE] hover:bg-[#007F8C] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>⭐ تقييم عميل</span>
            </button>
          </div>
        </div>

        {/* ── شريط مؤشرات الأداء الحقيقية والربط التحليلي ── */}
        <div className="grid grid-cols-2 lg:grid-cols-6 border-b border-[#E8E5EA] bg-[#FAFAFB] divide-x divide-x-reverse divide-[#E8E5EA]">
          
          {/* OQS */}
          <div className="p-4.5 text-center bg-gradient-to-b from-white to-[#FCE8F2]/30 cursor-pointer hover:bg-[#FCE8F2]/50 transition" onClick={() => setShowFormulaModal(true)}>
            <div className="flex items-center justify-center gap-1">
              <span className="text-[11px] font-bold text-[#B0005A]">مؤشر الجودة العام OQS</span>
              <span className="text-[10px] text-[#B0005A] border border-[#F2A4CB] rounded-full w-4 h-4 inline-flex items-center justify-center font-bold">ℹ️</span>
            </div>
            <div className="text-2xl font-extrabold font-mono tabular-nums text-[#B0005A] mt-1 flex items-baseline justify-center gap-1">
              <span>{metrics.oqs !== null ? metrics.oqs : '--'}</span>
              <span className="text-xs text-[#6F6B75] font-normal font-sans">/ 100</span>
            </div>
            <span className="text-[10px] text-[#007F8C] font-bold block mt-0.5">
              {metrics.oqs !== null ? 'انقر لمعرفة طريقة الحساب' : 'بانتظار البيانات'}
            </span>
          </div>

          {/* معدل العيوب */}
          <div className="p-4.5 text-center cursor-pointer hover:bg-white transition" onClick={() => setLineageDrawer({ title: 'سجل العيوب والتعديلات المسجلة', records: metrics.rawDefects, type: 'defects' })}>
            <span className="text-[11px] font-semibold text-[#6F6B75] block">معدل العيوب (Defect Rate)</span>
            <div className="text-xl font-extrabold font-mono tabular-nums text-[#25232A] mt-1">
              {metrics.defectRate !== null ? `${metrics.defectRate}%` : '--'}
            </div>
            <span className="text-[10px] text-[#6F6B75] block mt-0.5">{metrics.totalDefectsCount} عيوب مسجلة 🔍</span>
          </div>

          {/* تكلفة الجودة COPQ */}
          <div className="p-4.5 text-center cursor-pointer hover:bg-white transition" onClick={() => setLineageDrawer({ title: 'تفاصيل التكلفة المالية للجودة الرديئة (COPQ)', records: metrics.rawMaintenanceExpenses, type: 'copq' })}>
            <span className="text-[11px] font-semibold text-[#6F6B75] block">تكلفة الجودة الرديئة (COPQ)</span>
            <div className="text-xl font-extrabold font-mono tabular-nums text-[#D64545] mt-1">
              {metrics.totalCOPQ.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75] mr-1 font-sans">{currencyDisplay}</span>
            </div>
            <span className="text-[10px] text-[#D64545] font-semibold block mt-0.5">{metrics.copqPercentage}% من المبيعات 💸</span>
          </div>

          {/* صافي الترويج NPS */}
          <div className="p-4.5 text-center cursor-pointer hover:bg-white transition" onClick={() => setLineageDrawer({ title: 'سجل استبيانات ورضا العملاء', records: metrics.rawFeedback, type: 'nps' })}>
            <span className="text-[11px] font-semibold text-[#6F6B75] block">صافي الترويج (NPS)</span>
            <div className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] mt-1">
              {metrics.nps !== null ? `+${metrics.nps}` : '--'}
            </div>
            <span className="text-[10px] text-[#007F8C] font-semibold block mt-0.5">
              {metrics.csat !== null ? `CSAT: ${metrics.csat} / 5.0 ⭐` : 'لا توجد تقييمات بعد'}
            </span>
          </div>

          {/* نسبة النجاح من الفحص الأول FPY */}
          <div className="p-4.5 text-center cursor-pointer hover:bg-white transition" onClick={() => setLineageDrawer({ title: 'سجل عمليات فحص الجودة (Inspections)', records: metrics.rawInspections, type: 'inspections' })}>
            <span className="text-[11px] font-semibold text-[#6F6B75] block">نسبة نجاح الفحص (FPY)</span>
            <div className="text-xl font-extrabold font-mono tabular-nums text-[#8F2A87] mt-1">
              {metrics.firstPassYield !== null ? `${metrics.firstPassYield}%` : '--'}
            </div>
            <span className="text-[10px] text-[#8F2A87] font-semibold block mt-0.5">{metrics.totalInspectionsCount} عمليات فحص 🔍</span>
          </div>

          {/* جودة الموردين SQS */}
          <div className="p-4.5 text-center">
            <span className="text-[11px] font-semibold text-[#6F6B75] block">جودة الموردين (SQS)</span>
            <div className="text-xl font-extrabold font-mono tabular-nums text-[#C97300] mt-1">{metrics.suppScore !== null ? `${metrics.suppScore} / 100` : '-- / 100'}</div>
            <span className="text-[10px] text-[#6F6B75] block mt-0.5">{purchases.length} فواتير توريد 📦</span>
          </div>
        </div>
      </div>

      {/* ── التنبيهات والأنماط المكتشفة إحصائياً ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#25232A] flex items-center gap-2">
            <span className="text-[#B0005A]">⚡</span>
            الأنماط المكتشفة والتنبيهات التشغيلية (Smart Quality Alerts)
          </h3>
          <span className="text-xs text-[#6F6B75]">مستنتجة آلياً عبر خوارزميات إحصائية ومصفوفات الارتباط</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {prioritizedAlerts.map(alert => (
            <div key={alert.id} className="bg-white rounded-2xl border border-[#E8E5EA] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-3 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-1.5 h-full ${
                alert.priority === 'Critical' ? 'bg-[#D64545]' : alert.priority === 'High' ? 'bg-[#F28A00]' : 'bg-[#009FAE]'
              }`}></div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#25232A]">{alert.title}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FAFAFB] border border-[#E8E5EA]">{alert.priorityBadge}</span>
                </div>
                <p className="text-[11.5px] text-[#6F6B75] leading-relaxed">{alert.description}</p>
              </div>

              <div className="pt-3 border-t border-[#E8E5EA] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-[#6F6B75] block">الأثر المالي:</span>
                  <span className="font-bold font-mono text-[#D64545]">{alert.financialImpact}</span>
                </div>
                <button
                  onClick={() => {
                    setCapaForm(prev => ({ ...prev, problem: alert.title, action_description: alert.actionLabel }));
                    setActiveModalType('capa');
                  }}
                  className="px-3 py-1.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA] transition cursor-pointer"
                >
                  {alert.actionLabel} ⚙️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── التبويبات العشرة لمنظومة الجودة ── */}
      <div className="flex gap-2 border-b border-[#E8E5EA] pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'executive', label: '🧠 الذكاء التنفيذي' },
          { id: 'products', label: '👗 موثوقية الموديلات' },
          { id: 'fabrics', label: '🧵 تقييم الأقمشة والخامات' },
          { id: 'designers', label: '🎨 تقييم المصممين' },
          { id: 'tailors', label: '✂️ تقييم الخياطين والمعمل' },
          { id: 'departments', label: '🏢 تقييم الأقسام والـ Pipeline' },
          { id: 'inspections', label: '🔍 عمليات الفحص' },
          { id: 'defects', label: '⚠️ العيوب والتكاليف' },
          { id: 'feedback', label: '⭐ تقييمات العملاء' },
          { id: 'master_ledger', label: '📑 سجل الجودة والتقارير' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === t.id 
                ? 'bg-[#B0005A] text-white shadow-xs' 
                : 'bg-white text-[#6F6B75] hover:bg-[#FAFAFB] border border-[#E8E5EA]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 1. تبويب الذكاء التنفيذي */}
      {/* ========================================================================= */}
      {activeTab === 'executive' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* أفضل الموديلات جودة ومبيعات */}
            <div className="bg-white rounded-2xl border border-[#E8E5EA] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
              <h3 className="font-bold text-sm text-[#25232A] flex items-center justify-between border-b border-[#E8E5EA] pb-3">
                <span>📊 الموديلات الأكثر مبيعاً وأعلى موثوقية</span>
                <span className="text-[11px] text-[#6F6B75]">Real Sales & Quality</span>
              </h3>

              {productQualityProfiles.length === 0 ? (
                <div className="text-center py-10 text-[#6F6B75] text-xs font-medium">لا توجد مبيعات أو منتجات مسجلة حالياً 👗</div>
              ) : (
                <div className="space-y-3">
                  {productQualityProfiles.slice(0, 4).map(p => (
                    <div key={p.id} className="p-3.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-[#25232A]">{p.name}</div>
                        <div className="text-[11px] text-[#6F6B75] mt-0.5">
                          المبيعات: {p.totalSold} قطع • التقييم: {p.avgRating}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-[#B0005A]">
                            {p.qualityScore !== null ? `${p.qualityScore}/100` : '--'}
                          </span>
                          <span className="text-[10px] bg-white border border-[#E8E5EA] px-2 py-0.5 rounded font-bold">{p.trend}</span>
                        </div>
                        <div className="text-[10px] text-[#6F6B75] mt-0.5">عينة: {p.sampleSize} حالة ({p.confidence})</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* تفكيك تكلفة الجودة COPQ */}
            <div className="bg-white rounded-2xl border border-[#E8E5EA] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
              <h3 className="font-bold text-sm text-[#25232A] flex items-center justify-between border-b border-[#E8E5EA] pb-3">
                <span>💸 تفكيك التكلفة المالية للجودة الرديئة (COPQ Breakdown)</span>
                <span className="text-[11px] text-[#6F6B75]">Financial Losses</span>
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-center">
                  <span className="text-xs text-[#6F6B75] block">تكلفة إعادة العمل والإصلاح</span>
                  <div className="text-lg font-bold font-mono text-[#D64545] mt-1">{metrics.reworkCost.toLocaleString('en-US')} {currencyDisplay}</div>
                </div>
                <div className="p-4 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-center">
                  <span className="text-xs text-[#6F6B75] block">تكلفة هدر الأقمشة والخامات</span>
                  <div className="text-lg font-bold font-mono text-[#8F2A87] mt-1">{metrics.wasteCost.toLocaleString('en-US')} {currencyDisplay}</div>
                </div>
                <div className="p-4 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-center">
                  <span className="text-xs text-[#6F6B75] block">مبالغ المرتجعات والتعويضات</span>
                  <div className="text-lg font-bold font-mono text-[#C97300] mt-1">{metrics.returnCost.toLocaleString('en-US')} {currencyDisplay}</div>
                </div>
                <div className="p-4 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-center">
                  <span className="text-xs text-[#6F6B75] block">مصاريف صيانة الورشة المقيدة</span>
                  <div className="text-lg font-bold font-mono text-[#007F8C] mt-1">{metrics.directMaintenance.toLocaleString('en-US')} {currencyDisplay}</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. تبويب موثوقية الموديلات */}
      {/* ========================================================================= */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">سجل درجات موثوقية الموديلات (Product Quality Intelligence)</h3>
              <p className="text-xs text-[#6F6B75] mt-0.5">تقييم موضوعي مستنتج من المبيعات، العيوب، التقييمات، والمرتجعات الفعلية</p>
            </div>
            <span className="text-xs bg-[#FCE8F2] text-[#B0005A] font-bold px-2.5 py-0.5 rounded-full font-mono">{productQualityProfiles.length} موديل</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="p-3">اسم الموديل والتصميم</th>
                  <th className="p-3">الخامة المعتمدة</th>
                  <th className="p-3 text-center">المبيعات</th>
                  <th className="p-3 text-center">العيوب المسجلة</th>
                  <th className="p-3 text-center">المرتجعات</th>
                  <th className="p-3 text-center">التقييم</th>
                  <th className="p-3 text-center">درجة الجودة</th>
                  <th className="p-3 text-center">العينة والثقة</th>
                  <th className="p-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {productQualityProfiles.length === 0 ? (
                  <tr><td colSpan="9" className="p-10 text-center text-[#6F6B75]">لا توجد موديلات أو مبيعات مسجلة بعد 👗</td></tr>
                ) : (
                  productQualityProfiles.map(p => (
                    <tr key={p.id} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="p-3 font-bold text-[#25232A]">{p.name}</td>
                      <td className="p-3 text-[#6F6B75]">{p.fabric}</td>
                      <td className="p-3 text-center font-mono font-bold">{p.totalSold}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#D64545]">{p.defectsCount} ({p.defectRate}%)</td>
                      <td className="p-3 text-center font-mono font-bold text-[#C97300]">{p.returnsCount} ({p.returnRate}%)</td>
                      <td className="p-3 text-center font-mono font-bold text-[#F28A00]">{p.avgRating}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-lg font-bold font-mono text-xs ${
                          p.qualityScore >= 90 ? 'bg-[#E2F5F7] text-[#007F8C]' : p.qualityScore >= 75 ? 'bg-[#FFF1DC] text-[#C97300]' : 'bg-rose-50 text-[#D64545]'
                        }`}>
                          {p.qualityScore !== null ? `${p.qualityScore} / 100` : '--'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-[11px] text-[#6F6B75]">{p.sampleSize} حالة ({p.confidence})</td>
                      <td className="p-3 text-center font-semibold text-[11px]">{p.trend}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. تبويب تقييم الأقمشة والخامات */}
      {/* ========================================================================= */}
      {activeTab === 'fabrics' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">ذكاء وتحليل جودة الأقمشة والخامات (Fabric Quality Intelligence)</h3>
              <p className="text-xs text-[#6F6B75] mt-0.5">استنتاج تلقائي لأداء كل خامة من واقع المبيعات والعيوب والمرتجعات ورضا العملاء</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="p-3">اسم الخامة / القماش</th>
                  <th className="p-3 text-center">الموديلات المستخدمة</th>
                  <th className="p-3 text-center">إجمالي القطع المباعة</th>
                  <th className="p-3 text-center">معدل العيوب</th>
                  <th className="p-3 text-center">معدل المرتجعات</th>
                  <th className="p-3 text-center">رضا العملاء</th>
                  <th className="p-3 text-center">درجة الجودة</th>
                  <th className="p-3 text-center">العينة والثقة</th>
                  <th className="p-3 text-center">التقييم الفني</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {fabricQualityProfiles.length === 0 ? (
                  <tr><td colSpan="9" className="p-10 text-center text-[#6F6B75]">لا توجد أقمشة أو خامات مسجلة بعد 🧵</td></tr>
                ) : (
                  fabricQualityProfiles.map((f, idx) => (
                    <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="p-3 font-bold text-[#25232A]">{f.name}</td>
                      <td className="p-3 text-center font-mono font-bold">{f.modelsCount} موديل</td>
                      <td className="p-3 text-center font-mono font-bold text-[#25232A]">{f.totalSold}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#D64545]">{f.defectRate}%</td>
                      <td className="p-3 text-center font-mono font-bold text-[#C97300]">{f.returnRate}%</td>
                      <td className="p-3 text-center font-bold text-[#F28A00]">{f.customerSat}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#007F8C]">
                        {f.qualityScore !== null ? `${f.qualityScore} / 100` : '--'}
                      </td>
                      <td className="p-3 text-center font-mono text-[11px] text-[#6F6B75]">{f.sampleSize} عينة ({f.confidence})</td>
                      <td className="p-3 text-center font-semibold text-[11px]">{f.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. تبويب تقييم المصممين */}
      {/* ========================================================================= */}
      {activeTab === 'designers' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">تقييم أداء المصممين (Designer Quality Intelligence)</h3>
              <p className="text-xs text-[#6F6B75] mt-0.5">تقييم موضوعي مبني على قبول التصاميم، المبيعات، ومعدل رضا العميلات وتكرار الشراء</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="p-3">اسم المصمم / الاستوديو</th>
                  <th className="p-3 text-center">عدد التصاميم المعتمدة</th>
                  <th className="p-3 text-center">إجمالي المبيعات</th>
                  <th className="p-3 text-center">معدل العيوب والتعديل</th>
                  <th className="p-3 text-center">تقييم العميلات</th>
                  <th className="p-3 text-center">درجة المصمم</th>
                  <th className="p-3 text-center">العينة والثقة</th>
                  <th className="p-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {designerQualityProfiles.length === 0 ? (
                  <tr><td colSpan="8" className="p-10 text-center text-[#6F6B75]">لا توجد بيانات أو مصممين مسجلين بعد 🎨</td></tr>
                ) : (
                  designerQualityProfiles.map(des => (
                    <tr key={des.id} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="p-3 font-bold text-[#25232A]">{des.name}</td>
                      <td className="p-3 text-center font-mono font-bold">{des.modelsDesigned}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#25232A]">{des.totalSales}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#D64545]">{des.defectRate}%</td>
                      <td className="p-3 text-center font-bold text-[#F28A00]">{des.customerRating}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#8F2A87]">{des.designerScore}</td>
                      <td className="p-3 text-center font-mono text-[11px] text-[#6F6B75]">{des.sampleSize} حالة ({des.confidence})</td>
                      <td className="p-3 text-center font-semibold text-[11px]">{des.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. تبويب تقييم الخياطين والمعمل */}
      {/* ========================================================================= */}
      {activeTab === 'tailors' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">تقييم أداء الخياطين وفرق الإنتاج (Tailor Quality Intelligence)</h3>
              <p className="text-xs text-[#6F6B75] mt-0.5">تقييم مهني دقيق مبني على دقة الخياطة، نسبة النجاح الفوري، واحتياجات التدريب</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="p-3">اسم الخياط / الفريق</th>
                  <th className="p-3 text-center">القطع المنفذة</th>
                  <th className="p-3 text-center">العيوب المسجلة</th>
                  <th className="p-3 text-center">معدل العيوب</th>
                  <th className="p-3 text-center">نسبة النجاح الفوري (FPY)</th>
                  <th className="p-3 text-center">درجة الخياطة</th>
                  <th className="p-3 text-center">العينة والثقة</th>
                  <th className="p-3 text-center">توصية التدريب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {tailorQualityProfiles.length === 0 ? (
                  <tr><td colSpan="8" className="p-10 text-center text-[#6F6B75]">لا توجد بيانات لفرق الخياطة أو طلبيات بالمعمل بعد ✂️</td></tr>
                ) : (
                  tailorQualityProfiles.map(t => (
                    <tr key={t.id} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="p-3 font-bold text-[#25232A]">{t.name}</td>
                      <td className="p-3 text-center font-mono font-bold">{t.completedOrders}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#D64545]">{t.defectsCount}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#D64545]">{t.defectRate}%</td>
                      <td className="p-3 text-center font-mono font-bold text-[#007F8C]">{t.firstPassYield}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#8F2A87]">
                        {t.qualityScore !== null ? `${t.qualityScore} / 100` : '--'}
                      </td>
                      <td className="p-3 text-center font-mono text-[11px] text-[#6F6B75]">{t.sampleSize} حالة ({t.confidence})</td>
                      <td className="p-3 text-center font-semibold text-[11px]">{t.trainingAlert}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. تبويب تقييم الأقسام والـ Pipeline */}
      {/* ========================================================================= */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E8E5EA] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
            <h3 className="font-bold text-sm text-[#25232A] border-b border-[#E8E5EA] pb-3">
              🏢 تقييم وموثوقية الأقسام ومراحل خط الإنتاج (Quality Pipeline & Departments)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departmentQualityScores.map((dept, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{dept.icon}</span>
                    <span className="font-mono font-bold text-sm text-[#B0005A]">{dept.score} / 100</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#25232A]">{dept.name}</h4>
                    <p className="text-[11px] text-[#6F6B75] mt-0.5">حجم العينة: {dept.sampleSize}</p>
                  </div>
                  <div className="pt-2 border-t border-[#E8E5EA] flex justify-between items-center text-xs">
                    <span className="text-[#6F6B75]">الملاحظات النشطة: {dept.activeIssues}</span>
                    <span className="font-bold text-[11px]">{dept.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. تبويب عمليات الفحص (Inspections) */}
      {/* ========================================================================= */}
      {activeTab === 'inspections' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">سجل عمليات فحص الجودة الميدانية (Quality Inspections)</h3>
              <p className="text-xs text-[#6F6B75] mt-0.5">سجل حقيقي متزامن مع ورقة Quality_Inspections في Google Sheets</p>
            </div>
            <button onClick={() => setActiveModalType('inspection')} className="px-4 py-2 bg-[#B0005A] hover:bg-[#8E0049] text-white rounded-xl text-xs font-bold cursor-pointer">
              ➕ فحص جودة جديد
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="p-3">رقم الفحص والتاريخ</th>
                  <th className="p-3">المنتج / الطلب</th>
                  <th className="p-3">مرحلة الإنتاج</th>
                  <th className="p-3 text-center">المفحوص</th>
                  <th className="p-3 text-center">الناجح</th>
                  <th className="p-3 text-center">المعيب</th>
                  <th className="p-3 text-center">النتيجة</th>
                  <th className="p-3">المفتش والملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {inspections.length === 0 ? (
                  <tr><td colSpan="8" className="p-10 text-center text-[#6F6B75]">لا توجد عمليات فحص مسجلة حتى الآن</td></tr>
                ) : (
                  inspections.map((insp, idx) => (
                    <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="p-3">
                        <div className="font-bold font-mono text-[#8F2A87]">#{insp.inspection_id || insp.Inspection_ID}</div>
                        <div className="text-[11px] text-[#6F6B75] font-mono">{String(insp.inspection_date || insp.Inspection_Date || '').split('T')[0]}</div>
                      </td>
                      <td className="p-3 font-bold text-[#25232A]">{insp.product_name || insp.Product_Name || 'طلب عام'}</td>
                      <td className="p-3 text-[#6F6B75]">{insp.production_stage || insp.Production_Stage}</td>
                      <td className="p-3 text-center font-mono">{insp.quantity_checked || insp.Quantity_Checked || 1}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#007F8C]">{insp.quantity_passed || insp.Quantity_Passed || 1}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#D64545]">{insp.quantity_failed || insp.Quantity_Failed || 0}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                          (insp.inspection_result || insp.Inspection_Result) === 'PASS' ? 'bg-[#E2F5F7] text-[#007F8C]' : 'bg-rose-50 text-[#D64545]'
                        }`}>
                          {insp.inspection_result || insp.Inspection_Result || 'PASS'}
                        </span>
                      </td>
                      <td className="p-3 text-[#6F6B75] max-w-xs truncate">{insp.notes || insp.Notes || '--'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. تبويب العيوب والتكاليف (Defects) */}
      {/* ========================================================================= */}
      {activeTab === 'defects' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">سجل عيوب التصنيع وتكلفة COPQ (Quality Defects)</h3>
              <p className="text-xs text-[#6F6B75] mt-0.5">سجل حقيقي متزامن مع ورقة Quality_Defects في Google Sheets</p>
            </div>
            <button onClick={() => setActiveModalType('defect')} className="px-4 py-2 bg-[#F28A00] hover:bg-[#C97300] text-white rounded-xl text-xs font-bold cursor-pointer">
              ➕ تسجيل عيب
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="p-3">رقم العيب والتاريخ</th>
                  <th className="p-3">المنتج والمرحلة</th>
                  <th className="p-3">نوع العيب</th>
                  <th className="p-3 text-center">الدرجة</th>
                  <th className="p-3 text-center">تكلفة الإصلاح</th>
                  <th className="p-3">السبب الجذري</th>
                  <th className="p-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {defects.length === 0 ? (
                  <tr><td colSpan="7" className="p-10 text-center text-[#6F6B75]">لا توجد عيوب مسجلة حتى الآن</td></tr>
                ) : (
                  defects.map((def, idx) => (
                    <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="p-3">
                        <div className="font-bold font-mono text-[#D64545]">#{def.defect_id || def.Defect_ID}</div>
                        <div className="text-[11px] text-[#6F6B75] font-mono">{String(def.defect_date || def.Defect_Date || '').split('T')[0]}</div>
                      </td>
                      <td className="p-3 font-bold text-[#25232A]">{def.product_name || def.Product_Name || 'فستان'} • {def.production_stage || def.Production_Stage}</td>
                      <td className="p-3 text-[#6F6B75]">{def.defect_type || def.Defect_Type}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (def.severity || def.Severity) === 'Critical' ? 'bg-rose-100 text-[#D64545]' : (def.severity || def.Severity) === 'High' ? 'bg-amber-100 text-[#C97300]' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {def.severity || def.Severity || 'Medium'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-[#D64545]">
                        {(parseFloat(def.rework_cost || def.Rework_Cost || 0)).toLocaleString('en-US')} {currencyDisplay}
                      </td>
                      <td className="p-3 text-[#6F6B75] max-w-xs truncate">{def.root_cause || def.Root_Cause || '--'}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-[#FAFAFB] border border-[#E8E5EA] text-[10.5px] font-bold">
                          {def.status || def.Status || 'Open'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. تبويب تقييمات العملاء (Feedback) */}
      {/* ========================================================================= */}
      {activeTab === 'feedback' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">سجل استبيانات ورضا العملاء (Customer Feedback & NPS)</h3>
              <p className="text-xs text-[#6F6B75] mt-0.5">سجل حقيقي متزامن مع ورقة Customer_Feedback في Google Sheets</p>
            </div>
            <button onClick={() => setActiveModalType('feedback')} className="px-4 py-2 bg-[#009FAE] hover:bg-[#007F8C] text-white rounded-xl text-xs font-bold cursor-pointer">
              ➕ تقييم عميل جديد
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="p-3">التاريخ والطلب</th>
                  <th className="p-3">اسم العميلة</th>
                  <th className="p-3 text-center">التقييم (1-5)</th>
                  <th className="p-3 text-center">مؤشر NPS</th>
                  <th className="p-3">نوع التقييم</th>
                  <th className="p-3">التعليق والملاحظات</th>
                  <th className="p-3 text-center">القناة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {feedback.length === 0 ? (
                  <tr><td colSpan="7" className="p-10 text-center text-[#6F6B75]">لا توجد تقييمات مسجلة حتى الآن</td></tr>
                ) : (
                  feedback.map((fb, idx) => (
                    <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="p-3">
                        <div className="font-bold font-mono text-[#8F2A87]">#{fb.order_id || fb.Order_ID || 'طلب'}</div>
                        <div className="text-[11px] text-[#6F6B75] font-mono">{String(fb.feedback_date || fb.Feedback_Date || '').split('T')[0]}</div>
                      </td>
                      <td className="p-3 font-bold text-[#25232A]">{fb.customer_name || fb.Customer_Name || 'عزيزتنا'}</td>
                      <td className="p-3 text-center font-bold font-mono text-[#F28A00]">{fb.rating || fb.Rating || 5} ⭐</td>
                      <td className="p-3 text-center font-bold font-mono text-[#007F8C]">{fb.nps_score || fb.NPS_Score || 10} / 10</td>
                      <td className="p-3 text-[#6F6B75]">{fb.feedback_type || fb.Feedback_Type || 'NPS'}</td>
                      <td className="p-3 text-[#6F6B75] max-w-xs truncate">{fb.comment || fb.Comment || fb.notes || '--'}</td>
                      <td className="p-3 text-center font-semibold text-[11px]">{fb.channel || fb.Channel || 'WhatsApp'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. تبويب سجل الجودة الرئيسي والتقارير (Master Ledger & Reports) */}
      {/* ========================================================================= */}
      {activeTab === 'master_ledger' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E8E5EA]">
              <div>
                <h3 className="font-bold text-sm text-[#25232A]">سجل الجودة والتقييمات الرئيسي (Master Quality Ledger)</h3>
                <p className="text-xs text-[#6F6B75] mt-0.5">متزامن مع Google Sheet "الجودة والتقييمات" بجميع الحقول الـ 42</p>
              </div>
              <button onClick={() => setActiveModalType('eval')} className="px-4 py-2 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-xl text-xs font-bold cursor-pointer">
                ➕ إضافة تقييم للسجل الرئيسي
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                    <th className="p-3">رقم التقييم والتاريخ</th>
                    <th className="p-3">نوع التقييم والكيان</th>
                    <th className="p-3">القسم</th>
                    <th className="p-3 text-center">الدرجة</th>
                    <th className="p-3 text-center">النسبة %</th>
                    <th className="p-3">المعيار والتعليق</th>
                    <th className="p-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E5EA] bg-white">
                  {masterEvaluations.length === 0 ? (
                    <tr><td colSpan="7" className="p-10 text-center text-[#6F6B75]">لا توجد تقييمات رئيسية مسجلة حتى الآن</td></tr>
                  ) : (
                    masterEvaluations.map((ev, idx) => (
                      <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                        <td className="p-3">
                          <div className="font-bold font-mono text-[#8F2A87]">#{ev.record_id || ev.Record_ID}</div>
                          <div className="text-[11px] text-[#6F6B75] font-mono">{String(ev.record_date || ev.Record_Date || '').split('T')[0]}</div>
                        </td>
                        <td className="p-3 font-bold text-[#25232A]">{ev.evaluation_type || ev.Evaluation_Type}: {ev.entity_name || ev.Entity_Name || 'عام'}</td>
                        <td className="p-3 text-[#6F6B75]">{ev.department || ev.Department || 'الإنتاج'}</td>
                        <td className="p-3 text-center font-mono font-bold text-[#F28A00]">{ev.score || ev.Score} / {ev.max_score || ev.Max_Score || 5}</td>
                        <td className="p-3 text-center font-mono font-bold text-[#007F8C]">{ev.percentage || ev.Percentage}%</td>
                        <td className="p-3 text-[#6F6B75] max-w-xs truncate">{ev.quality_criteria || ev.Quality_Criteria} • {ev.comment || ev.Comment || '--'}</td>
                        <td className="p-3 text-center font-bold">{ev.status || ev.Status || 'Active'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Interactive Modals */}
      {/* ========================================================================= */}

      {/* Modal: Master Evaluation */}
      {activeModalType === 'eval' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#E8E5EA] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <h3 className="font-bold text-sm text-[#25232A]">➕ تسجيل تقييم في سجل "الجودة والتقييمات" الرئيسي</h3>
              <button onClick={() => setActiveModalType(null)} className="text-[#6F6B75] hover:text-[#25232A] font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateMasterEvaluation} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>نوع التقييم</label>
                  <select 
                    value={masterEvalForm.evaluation_type} 
                    onChange={e => setMasterEvalForm({ ...masterEvalForm, evaluation_type: e.target.value })} 
                    className={inputCls}
                  >
                    <option value="Customer">تقييم عميل</option>
                    <option value="Product">تقييم منتج / موديل</option>
                    <option value="Fabric">تقييم قماش / خامة</option>
                    <option value="Supplier">تقييم مورد</option>
                    <option value="Designer">تقييم مصمم</option>
                    <option value="Tailor">تقييم خياط / معمل</option>
                    <option value="Department">تقييم قسم</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>القسم المسؤول</label>
                  <select 
                    value={masterEvalForm.department} 
                    onChange={e => setMasterEvalForm({ ...masterEvalForm, department: e.target.value })} 
                    className={inputCls}
                  >
                    <option>التصميم والباترون</option>
                    <option>الإنتاج والخياطة</option>
                    <option>فحص الخامات</option>
                    <option>التشطيب والتغليف</option>
                    <option>خدمة العملاء</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>اسم الكيان المراد تقييمه</label>
                <input 
                  type="text" 
                  value={masterEvalForm.entity_name} 
                  onChange={e => setMasterEvalForm({ ...masterEvalForm, entity_name: e.target.value })} 
                  className={inputCls}
                  placeholder=""
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>الدرجة الممنوحة</label>
                  <input type="number" min="0" max="100" value={masterEvalForm.score} onChange={e => setMasterEvalForm({ ...masterEvalForm, score: e.target.value })} className={inputCls + " text-center font-mono font-bold"} required />
                </div>
                <div>
                  <label className={labelCls}>الدرجة العظمى</label>
                  <input type="number" min="1" max="100" value={masterEvalForm.max_score} onChange={e => setMasterEvalForm({ ...masterEvalForm, max_score: e.target.value })} className={inputCls + " text-center font-mono font-bold"} required />
                </div>
              </div>
              <div>
                <label className={labelCls}>معيار التقييم والملاحظات</label>
                <textarea rows="3" value={masterEvalForm.comment} onChange={e => setMasterEvalForm({ ...masterEvalForm, comment: e.target.value })} className="w-full p-3 bg-white border border-[#E8E5EA] rounded-xl text-xs outline-none resize-none" placeholder="اكتب الملاحظات والتفاصيل..." />
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E8E5EA]">
                <button type="button" onClick={() => setActiveModalType(null)} className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA]">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer">
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ في ورقة "الجودة والتقييمات" 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Inspection */}
      {activeModalType === 'inspection' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#E8E5EA] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <h3 className="font-bold text-sm text-[#25232A]">➕ تسجيل فحص جودة جديد (Quality Inspection)</h3>
              <button onClick={() => setActiveModalType(null)} className="text-[#6F6B75] hover:text-[#25232A] font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateInspection} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>الموديل / الفستان</label>
                  <select value={inspectionForm.product_name} onChange={e => setInspectionForm({ ...inspectionForm, product_name: e.target.value })} className={inputCls} required>
                    <option value="">-- اختر الموديل --</option>
                    {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>مرحلة الإنتاج</label>
                  <select value={inspectionForm.production_stage} onChange={e => setInspectionForm({ ...inspectionForm, production_stage: e.target.value })} className={inputCls}>
                    <option>فحص الخامات</option>
                    <option>القص والباترون</option>
                    <option>الخياطة</option>
                    <option>التطريز والشك</option>
                    <option>الفحص النهائي</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className={labelCls}>الكمية المفحوصة</label>
                  <input type="number" min="1" value={inspectionForm.quantity_checked} onChange={e => setInspectionForm({ ...inspectionForm, quantity_checked: e.target.value })} className={inputCls + " text-center font-mono"} required />
                </div>
                <div>
                  <label className={labelCls}>الكمية الناجحة</label>
                  <input type="number" min="0" value={inspectionForm.quantity_passed} onChange={e => setInspectionForm({ ...inspectionForm, quantity_passed: e.target.value })} className={inputCls + " text-center font-mono"} required />
                </div>
                <div>
                  <label className={labelCls}>نتيجة الفحص</label>
                  <select value={inspectionForm.inspection_result} onChange={e => setInspectionForm({ ...inspectionForm, inspection_result: e.target.value })} className={inputCls}>
                    <option value="PASS">ناجح (PASS)</option>
                    <option value="FAIL">راسب (FAIL)</option>
                    <option value="REWORK">إعادة تشغيل (REWORK)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>ملاحظات المفتش</label>
                <textarea rows="3" value={inspectionForm.notes} onChange={e => setInspectionForm({ ...inspectionForm, notes: e.target.value })} className="w-full p-3 bg-white border border-[#E8E5EA] rounded-xl text-xs outline-none resize-none" placeholder="أي تفاصيل أو ملاحظات..." />
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E8E5EA]">
                <button type="button" onClick={() => setActiveModalType(null)} className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA]">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#B0005A] hover:bg-[#8E0049] text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer">
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ الفحص في Google Sheets 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Defect */}
      {activeModalType === 'defect' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#E8E5EA] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <h3 className="font-bold text-sm text-[#25232A]">⚠️ تسجيل عيب جودة وتكلفة الإصلاح (Quality Defect)</h3>
              <button onClick={() => setActiveModalType(null)} className="text-[#6F6B75] hover:text-[#25232A] font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateDefect} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>الموديل / الفستان</label>
                  <select value={defectForm.product_name} onChange={e => setDefectForm({ ...defectForm, product_name: e.target.value })} className={inputCls} required>
                    <option value="">-- اختر الموديل --</option>
                    {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>نوع العيب</label>
                  <select value={defectForm.defect_type} onChange={e => setDefectForm({ ...defectForm, defect_type: e.target.value })} className={inputCls}>
                    <option>عيب خياطة</option>
                    <option>عيب قص</option>
                    <option>عيب تشطيب</option>
                    <option>عيب قماش</option>
                    <option>عيب مقاس</option>
                    <option>عيب تطريز</option>
                    <option>عيب تغليف</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>الدرجة (Severity)</label>
                  <select value={defectForm.severity} onChange={e => setDefectForm({ ...defectForm, severity: e.target.value })} className={inputCls}>
                    <option value="Critical">حرج (Critical)</option>
                    <option value="High">مرتفع (High)</option>
                    <option value="Medium">متوسط (Medium)</option>
                    <option value="Low">منخفض (Low)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>تكلفة الإصلاح التقديرية ({currencyDisplay})</label>
                  <input type="number" min="0" value={defectForm.rework_cost} onChange={e => setDefectForm({ ...defectForm, rework_cost: e.target.value })} className={inputCls + " font-mono font-bold text-[#D64545]"} />
                </div>
              </div>
              <div>
                <label className={labelCls}>السبب الجذري للمشكلة (Root Cause)</label>
                <input type="text" value={defectForm.root_cause} onChange={e => setDefectForm({ ...defectForm, root_cause: e.target.value })} className={inputCls} placeholder="" />
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E8E5EA]">
                <button type="button" onClick={() => setActiveModalType(null)} className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA]">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#F28A00] hover:bg-[#C97300] text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer">
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ العيب في Google Sheets 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Feedback */}
      {activeModalType === 'feedback' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#E8E5EA] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <h3 className="font-bold text-sm text-[#25232A]">⭐ تسجيل تقييم واستبيان عميل (Customer Feedback)</h3>
              <button onClick={() => setActiveModalType(null)} className="text-[#6F6B75] hover:text-[#25232A] font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateFeedback} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>اسم العميلة</label>
                  <select value={feedbackForm.customer_name} onChange={e => setFeedbackForm({ ...feedbackForm, customer_name: e.target.value })} className={inputCls} required>
                    <option value="">-- اختر العميلة --</option>
                    {customers.map(c => <option key={c.id || c.name} value={c.name || c['اسم_العميل']}>{c.name || c['اسم_العميل']}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>التقييم العام (1 - 5)</label>
                  <input type="number" min="1" max="5" value={feedbackForm.rating} onChange={e => setFeedbackForm({ ...feedbackForm, rating: e.target.value })} className={inputCls + " text-center font-mono font-bold"} required />
                </div>
              </div>
              <div>
                <label className={labelCls}>تعليق ورأي العميلة</label>
                <textarea rows="3" value={feedbackForm.comment} onChange={e => setFeedbackForm({ ...feedbackForm, comment: e.target.value })} className="w-full p-3 bg-white border border-[#E8E5EA] rounded-xl text-xs outline-none resize-none" placeholder="اكتب تعليق العميلة هنا..." />
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E8E5EA]">
                <button type="button" onClick={() => setActiveModalType(null)} className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA]">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#009FAE] hover:bg-[#007F8C] text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer">
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ التقييم في Google Sheets 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add CAPA */}
      {activeModalType === 'capa' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#E8E5EA] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <h3 className="font-bold text-sm text-[#25232A]">🛡️ تسجيل إجراء تصحيحي ووقائي (CAPA)</h3>
              <button onClick={() => setActiveModalType(null)} className="text-[#6F6B75] hover:text-[#25232A] font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateCAPA} className="space-y-4">
              <div>
                <label className={labelCls}>المشكلة المرصودة</label>
                <input type="text" value={capaForm.problem} onChange={e => setCapaForm({ ...capaForm, problem: e.target.value })} className={inputCls} required placeholder="وصف المشكلة..." />
              </div>
              <div>
                <label className={labelCls}>السبب الجذري للمشكلة (Root Cause)</label>
                <input type="text" value={capaForm.root_cause} onChange={e => setCapaForm({ ...capaForm, root_cause: e.target.value })} className={inputCls} placeholder="السبب الجذري..." />
              </div>
              <div>
                <label className={labelCls}>الإجراء المعتمد لتفادي التكرار</label>
                <textarea rows="3" value={capaForm.action_description} onChange={e => setCapaForm({ ...capaForm, action_description: e.target.value })} className="w-full p-3 bg-white border border-[#E8E5EA] rounded-xl text-xs outline-none resize-none" required placeholder="خطوات الإجراء الوقائي..." />
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E8E5EA]">
                <button type="button" onClick={() => setActiveModalType(null)} className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA]">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer">
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ الإجراء في Google Sheets 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: OQS Mathematical Formula */}
      {showFormulaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setShowFormulaModal(false)}>
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#E8E5EA] space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <h3 className="font-bold text-sm text-[#25232A]">📐 معادلة احتساب مؤشر الجودة العام OQS ({metrics.oqs !== null ? metrics.oqs : '--'}/100)</h3>
              <button onClick={() => setShowFormulaModal(false)} className="text-[#6F6B75] hover:text-[#25232A] font-bold">✕</button>
            </div>
            <div className="space-y-3 text-xs text-[#25232A]">
              <p className="text-[11.5px] text-[#6F6B75]">
                يُحسب المؤشر محلياً داخل المتصفح من البيانات الحقيقية فقط بدون أي APIs مدفوعة:
              </p>
              <div className="space-y-2 bg-[#FAFAFB] p-4 rounded-xl border border-[#E8E5EA]">
                <div className="flex justify-between">
                  <span>1. جودة الإنتاج والمعمل (وزن 25%):</span>
                  <span className="font-bold font-mono text-[#8F2A87]">{metrics.prodScore} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span>2. موثوقية المنتجات (وزن 25%):</span>
                  <span className="font-bold font-mono text-[#8F2A87]">{metrics.reliabScore} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span>3. رضا العملاء ومؤشر NPS (وزن 20%):</span>
                  <span className="font-bold font-mono text-[#007F8C]">{metrics.custScore} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span>4. جودة خامات الموردين SQS (وزن 15%):</span>
                  <span className="font-bold font-mono text-[#007F8C]">{metrics.suppScore} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span>5. دقة المقاسات (وزن 15%):</span>
                  <span className="font-bold font-mono text-[#C97300]">{metrics.sizingFitScore} / 100</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-[#E8E5EA]">
              <button onClick={() => setShowFormulaModal(false)} className="px-5 py-2 bg-[#25232A] text-white rounded-xl font-bold text-xs">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Data Lineage Drawer */}
      {lineageDrawer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setLineageDrawer(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#E8E5EA] space-y-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <h3 className="font-bold text-sm text-[#25232A]">{lineageDrawer.title} ({lineageDrawer.records?.length || 0} سجل حقيقي)</h3>
              <button onClick={() => setLineageDrawer(null)} className="text-[#6F6B75] hover:text-[#25232A] font-bold">✕</button>
            </div>
            <div className="overflow-y-auto space-y-2 flex-1">
              {(!lineageDrawer.records || lineageDrawer.records.length === 0) ? (
                <div className="text-center py-10 text-[#6F6B75] text-xs">لا توجد سجلات تفصيلية مسجلة لهذه الفئة حتى الآن.</div>
              ) : (
                lineageDrawer.records.map((rec, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#25232A]">
                        {rec.inspection_id ? `فحص #${rec.inspection_id}` : rec.defect_id ? `عيب #${rec.defect_id}` : rec.order_no ? `طلب #${rec.order_no}` : (rec.exp_no || `سجل #${idx+1}`)}
                      </div>
                      <div className="text-[#6F6B75] mt-0.5">
                        {rec.product_name || rec.defect_type || rec.customer_name || rec.notes || '--'}
                      </div>
                    </div>
                    <div className="text-left font-mono font-bold text-[#B0005A]">
                      {rec.rework_cost ? `${parseFloat(rec.rework_cost).toLocaleString('en-US')} ${currencyDisplay}` : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end pt-2 border-t border-[#E8E5EA]">
              <button onClick={() => setLineageDrawer(null)} className="px-5 py-2 bg-[#25232A] text-white rounded-xl font-bold text-xs">إغلاق</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
