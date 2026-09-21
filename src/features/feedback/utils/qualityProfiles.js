// src/features/feedback/utils/qualityProfiles.js
// تحليلات موثوقية المنتجات، الأقمشة، المصممين، الخياطين، الأقسام، والتنبيهات الذكية

function calculateProductProfiles(products = [], orders = [], defects = [], feedback = [], returns = []) {
  if (!products || products.length === 0) return [];
  return products.map(p => {
    const pName = p.name || p.model_name || 'موديل راقي';
    const prodOrders = orders.filter(o => o.product_name === pName || o.product_id === p.id);
    const totalSold = prodOrders.reduce((sum, o) => sum + (parseInt(o.qty) || 1), 0);
    const totalRev = prodOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    const prodDefects = defects.filter(d => d.product_name === pName || d.product_id === p.id || d.Product_Name === pName);
    const prodFeedback = feedback.filter(f => f.product_name === pName || f.product_id === p.id || f.Product_Name === pName);
    const prodReturns = returns.filter(r => r.product_name === pName || r.product_id === p.id);

    const ratings = prodFeedback.map(f => Number(f.rating || f.Rating || 5));
    const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
    const defectRate = totalSold > 0 ? ((prodDefects.length / totalSold) * 100) : 0;
    const returnRate = totalSold > 0 ? ((prodReturns.length / totalSold) * 100) : 0;
    const score = Math.max(60, Math.min(100, Math.round(100 - (defectRate * 4) - (returnRate * 3) + ((avgRating ? parseFloat(avgRating) : 5) * 2))));
    const sampleSize = totalSold + prodDefects.length + prodFeedback.length;
    const confidence = sampleSize >= 10 ? 'مرتفع' : sampleSize >= 3 ? 'متوسط' : 'منخفض';

    return {
      id: p.id, name: pName, category: p.category || 'فساتين بنات',
      fabric: p.fabric_name || p.fabric || 'حرير وتل فاخر',
      totalSold, totalRev, defectsCount: prodDefects.length, defectRate: defectRate.toFixed(1),
      returnsCount: prodReturns.length, returnRate: returnRate.toFixed(1),
      avgRating: avgRating ? `${avgRating} ⭐` : 'لا تقييمات بعد',
      qualityScore: totalSold > 0 ? score : null, sampleSize, confidence,
      trend: defectRate === 0 ? 'مستقر ممتاز 🟢' : defectRate > 10 ? 'يحتاج مراجعة 🔴' : 'طبيعي 🟡',
      ordersList: prodOrders, defectsList: prodDefects
    };
  }).sort((a, b) => b.totalSold - a.totalSold);
}

function calculateFabricProfiles(products = [], productProfiles = []) {
  const fabricMap = {};
  products.forEach(p => {
    const fName = p.fabric_name || p.fabric || 'قماش حرير وتل';
    if (!fabricMap[fName]) {
      fabricMap[fName] = { name: fName, modelsCount: 0, totalSold: 0, defectsCount: 0, returnsCount: 0, ratings: [], copq: 0 };
    }
    fabricMap[fName].modelsCount += 1;
  });

  productProfiles.forEach(p => {
    const fName = p.fabric;
    if (!fabricMap[fName]) {
      fabricMap[fName] = { name: fName, modelsCount: 1, totalSold: 0, defectsCount: 0, returnsCount: 0, ratings: [], copq: 0 };
    }
    fabricMap[fName].totalSold += p.totalSold;
    fabricMap[fName].defectsCount += p.defectsCount;
    fabricMap[fName].returnsCount += p.returnsCount;
    if (p.avgRating && p.avgRating.includes('⭐')) fabricMap[fName].ratings.push(parseFloat(p.avgRating));
  });

  return Object.values(fabricMap).map(f => {
    const avgSat = f.ratings.length > 0 ? (f.ratings.reduce((a,b) => a+b, 0)/f.ratings.length).toFixed(1) : null;
    const defectRate = f.totalSold > 0 ? ((f.defectsCount / f.totalSold) * 100).toFixed(1) : '0.0';
    const returnRate = f.totalSold > 0 ? ((f.returnsCount / f.totalSold) * 100).toFixed(1) : '0.0';
    const score = Math.max(50, Math.min(100, Math.round(100 - (parseFloat(defectRate) * 3) - (parseFloat(returnRate) * 2) + ((avgSat ? parseFloat(avgSat) : 5) * 2))));
    const sampleSize = f.totalSold + f.defectsCount;
    const confidence = sampleSize >= 15 ? 'مرتفع' : sampleSize >= 4 ? 'متوسط' : 'منخفض';
    return {
      name: f.name, modelsCount: f.modelsCount, totalSold: f.totalSold, defectsCount: f.defectsCount,
      defectRate, returnsCount: f.returnsCount, returnRate, customerSat: avgSat ? `${avgSat} ⭐` : 'لا تقييمات بعد',
      qualityScore: f.totalSold > 0 ? score : null, sampleSize, confidence,
      status: parseFloat(defectRate) > 5 ? 'يحتاج مراجعة الخامة 🔴' : 'خامة عالية الأداء 🟢'
    };
  }).sort((a, b) => b.totalSold - a.totalSold);
}

function calculateDesignerProfiles(employees = [], products = []) {
  const designerMap = {};
  employees.filter(e => String(e.role || e.department || '').includes('تصميم') || String(e.job_title || '').includes('مصمم')).forEach(des => {
    designerMap[des.id || des.name] = { id: des.id, name: des.name, modelsDesigned: 0, totalSales: 0, defectsCount: 0, ratings: [], returnsCount: 0 };
  });
  if (Object.keys(designerMap).length === 0) return [];
  products.forEach(p => {
    const desId = p.designer_id || Object.keys(designerMap)[0];
    if (designerMap[desId]) designerMap[desId].modelsDesigned += 1;
  });
  return Object.values(designerMap).map(des => {
    const avgRat = des.ratings.length > 0 ? (des.ratings.reduce((a,b)=>a+b,0)/des.ratings.length).toFixed(1) : null;
    const defectRate = des.totalSales > 0 ? ((des.defectsCount / des.totalSales) * 100).toFixed(1) : '0.0';
    const score = (des.totalSales > 0 || des.modelsDesigned > 0) ? Math.max(70, Math.min(100, Math.round(100 - (parseFloat(defectRate) * 2) + ((avgRat ? parseFloat(avgRat) : 5) * 2)))) : null;
    const sampleSize = des.totalSales + des.modelsDesigned;
    const confidence = sampleSize >= 10 ? 'مرتفع' : sampleSize >= 1 ? 'متوسط' : 'منخفض';
    return {
      id: des.id, name: des.name, modelsDesigned: des.modelsDesigned, totalSales: des.totalSales,
      defectRate, customerRating: avgRat ? `${avgRat} ⭐` : 'لا تقييمات بعد',
      designerScore: score !== null ? `${score} / 100` : '--', sampleSize, confidence,
      status: score !== null ? (score >= 90 ? 'تصاميم ناجحة ومرتفعة الرضا 🟢' : 'طبيعي 🟡') : 'بانتظار البيانات ⏳'
    };
  });
}

function calculateTailorProfiles(employees = [], factory = [], defects = []) {
  const tailors = employees.filter(e => String(e.role || e.department || '').includes('خياط') || String(e.role || e.department || '').includes('ورشة') || String(e.role || e.department || '').includes('معمل') || String(e.department || '').includes('الإنتاج'));
  if (tailors.length === 0) return [];
  return tailors.map(t => {
    const tailorOrders = factory.filter(f => f.tailor_id === t.id || f.employee_id === t.id || f.tailor_name === t.name);
    const tailorDefects = defects.filter(d => d.assigned_to === t.name || d.responsible_id === t.id);
    const totalUnits = tailorOrders.length;
    const defectRate = totalUnits > 0 ? ((tailorDefects.length / totalUnits) * 100).toFixed(1) : '0.0';
    const score = totalUnits > 0 ? Math.max(60, Math.min(100, Math.round(100 - (parseFloat(defectRate) * 4)))) : null;
    const sampleSize = totalUnits + tailorDefects.length;
    const confidence = sampleSize >= 10 ? 'مرتفع' : sampleSize >= 3 ? 'متوسط' : 'منخفض';
    return {
      id: t.id, name: t.name || t.full_name, completedOrders: totalUnits, defectsCount: tailorDefects.length,
      defectRate, firstPassYield: totalUnits > 0 ? `${Math.max(80, 100 - tailorDefects.length * 5)}%` : '--',
      qualityScore: score, sampleSize, confidence,
      trainingAlert: tailorDefects.length >= 2 ? 'يحتاج تدريب على الخياطة الناعمة 🟠' : (totalUnits > 0 ? 'أداء خياطة ممتاز 🟢' : 'بانتظار بدء العمليات ⏳')
    };
  });
}

function calculateDepartmentScores(metrics, products = [], purchases = [], factory = [], orders = [], defects = [], inspections = [], complaints = [], feedback = []) {
  return [
    { name: 'قسم التصميم والباترون', icon: '🎨', score: metrics.oqs !== null ? `${metrics.oqs} / 100` : '--', activeIssues: 0, status: products.length > 0 ? 'مستقر 🟢' : 'بانتظار البيانات ⏳', sampleSize: `${products.length} موديل` },
    { name: 'قسم فحص واستلام الخامات', icon: '🧵', score: metrics.suppScore !== null ? `${metrics.suppScore} / 100` : '--', activeIssues: 0, status: purchases.length > 0 ? 'مستقر 🟢' : 'بانتظار البيانات ⏳', sampleSize: `${purchases.length} شحنة` },
    { name: 'قسم القص والتفصيل', icon: '✂️', score: metrics.prodScore !== null ? `${metrics.prodScore} / 100` : '--', activeIssues: defects.filter(d => (d.defect_type||'').includes('قص')).length, status: (factory.length || orders.length) > 0 ? 'مستقر 🟢' : 'بانتظار البيانات ⏳', sampleSize: `${factory.length || orders.length} قطعة` },
    { name: 'قسم الخياطة والدرزات', icon: '🪡', score: metrics.prodScore !== null ? `${metrics.prodScore} / 100` : '--', activeIssues: defects.filter(d => (d.defect_type||'').includes('خياطة')).length, status: (factory.length || orders.length) > 0 ? (metrics.prodScore >= 90 ? 'مستقر 🟢' : 'يحتاج ضبط 🟡') : 'بانتظار البيانات ⏳', sampleSize: `${defects.length} عيوب` },
    { name: 'قسم التطريز والشك اليدوي', icon: '✨', score: metrics.prodScore !== null ? `${metrics.prodScore} / 100` : '--', activeIssues: defects.filter(d => (d.defect_type||'').includes('تطريز')).length, status: (factory.length || orders.length) > 0 ? 'مستقر 🟢' : 'بانتظار البيانات ⏳', sampleSize: 'فحص دوري' },
    { name: 'قسم الفحص النهائي والكي والتغليف', icon: '🎀', score: metrics.firstPassYield !== null ? `${Math.round(parseFloat(metrics.firstPassYield))} / 100` : '--', activeIssues: 0, status: inspections.length > 0 ? 'فندقي فاخر 🟢' : 'بانتظار البيانات ⏳', sampleSize: `${inspections.length} فحص` },
    { name: 'قسم خدمة العملاء والمقاسات', icon: '🎧', score: metrics.custScore !== null ? `${metrics.custScore} / 100` : '--', activeIssues: complaints.filter(c => (c.status||'') !== 'Closed').length, status: feedback.length > 0 ? (metrics.custScore >= 85 ? 'ممتاز 🟢' : 'يحتاج سرعة رد 🟡') : 'بانتظار البيانات ⏳', sampleSize: `${feedback.length} استبيان` }
  ];
}

function calculatePrioritizedAlerts(productProfiles = [], fabricProfiles = [], complaints = [], currencyDisplay = 'YER ريال') {
  const alerts = [];
  const problemProd = productProfiles.find(p => p.qualityScore !== null && p.qualityScore < 85 && p.totalSold >= 2);
  if (problemProd) {
    alerts.push({
      id: 'ALT-PROD', priority: 'Critical', priorityBadge: 'حرج 🔴',
      title: `ارتفاع نسبة العيوب والتعديل في موديل (${problemProd.name})`,
      description: `تم رصد معدل عيوب (${problemProd.defectRate}%) بعدد (${problemProd.defectsCount} حالات). يوصى بفحص دقة القص ومطابقة الباترون.`,
      financialImpact: `${(problemProd.defectsCount * 20).toLocaleString('en-US')} ${currencyDisplay}`,
      actionLabel: 'اعتماد إجراء تصحيحي (CAPA)'
    });
  }

  const problemFabric = fabricProfiles.find(f => parseFloat(f.defectRate) > 5 && f.totalSold >= 2);
  if (problemFabric) {
    alerts.push({
      id: 'ALT-FABRIC', priority: 'High', priorityBadge: 'مرتفع 🟠',
      title: `ملاحظات جودة متكررة على خامة (${problemFabric.name})`,
      description: `سجلت الخامة معدل عيوب مرتجع (${problemFabric.defectRate}%) عبر (${problemFabric.modelsCount} موديلات). يوصى باختبار شد النسيج مع المورد.`,
      financialImpact: 'أثر على معدل قبول الخامات', actionLabel: 'مراجعة شحنة المورد'
    });
  }

  const openComplaints = complaints.filter(c => (c.status || c.Status) !== 'Closed');
  if (openComplaints.length > 0) {
    alerts.push({
      id: 'ALT-COMPLAINTS', priority: 'High', priorityBadge: 'مرتفع 🟠',
      title: `يوجد (${openComplaints.length}) شكوى جودة قيد المتابعة والتسوية`,
      description: 'تتطلب الشكاوى الحالية سرعة الرد وتقديم تذاكر الصيانة المجانية للعملاء للحفاظ على ولاء البراند.',
      financialImpact: 'أثر مباشر على مؤشر NPS', actionLabel: 'تسوية الشكاوى المفتوحة'
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'ALT-NORMAL', priority: 'Low', priorityBadge: 'مستقر 🟢',
      title: 'جميع مؤشرات الجودة ضمن النطاق الآمن',
      description: 'لم يتم رصد أي انحرافات غير طبيعية في المعمل أو المبيعات حتى الآن.',
      financialImpact: '0.00 ' + currencyDisplay, actionLabel: 'متابعة الفحص المستمر'
    });
  }
  return alerts;
}

window.qualityProfiles = {
  calculateProductProfiles,
  calculateFabricProfiles,
  calculateDesignerProfiles,
  calculateTailorProfiles,
  calculateDepartmentScores,
  calculatePrioritizedAlerts
};
