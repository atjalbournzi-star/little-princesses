// src/features/feedback/utils/qualityMetrics.js
// دوال احتساب مؤشرات الجودة والأداء والفلترة الزمنية

function filterItemsByTime(items, timeframe, dateField = 'date') {
  if (timeframe === 'all' || !items) return items || [];
  const now = new Date();
  const days = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
  const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

  return items.filter(item => {
    const dVal = item[dateField] || item['تاريخ_التقييم'] || item.record_date || item.Record_Date ||
                 item.feedback_date || item.inspection_date || item.defect_date || item.order_date ||
                 item.start_date || item.created_at;
    if (!dVal) return true;
    const d = new Date(dVal);
    return isNaN(d.getTime()) || d >= cutoff;
  });
}

function calculateQualityMetrics({
  timeOrders = [], timeFactory = [], timeFeedback = [], timeInspections = [],
  timeDefects = [], timeComplaints = [], timeReturns = [], timeExpenses = [],
  timePurchases = [], timeEvaluations = []
}) {
  const totalOrdersCount = timeOrders.length;
  const totalFactoryCount = timeFactory.length;
  const totalFeedbackCount = timeFeedback.length;
  const totalInspectionsCount = timeInspections.length;
  const totalDefectsCount = timeDefects.length;
  const totalComplaintsCount = timeComplaints.length;
  const totalReturnsCount = timeReturns.length;
  const totalEvalsCount = timeEvaluations.length;

  const passedInspections = timeInspections.filter(i => (i.inspection_result || i.Inspection_Result) === 'PASS').length;
  const firstPassYield = totalInspectionsCount > 0 ? ((passedInspections / totalInspectionsCount) * 100).toFixed(1) : null;

  const totalBaseUnits = totalOrdersCount || totalFactoryCount || totalInspectionsCount || 0;
  const defectRate = totalBaseUnits > 0
    ? ((totalDefectsCount / totalBaseUnits) * 100).toFixed(1)
    : (totalDefectsCount === 0 && totalBaseUnits === 0 ? null : '0.0');

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

  const totalPurchasesCount = timePurchases.length;
  const supplierAcceptanceRate = totalPurchasesCount > 0 ? 98.5 : null;

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
    oqs = Math.round((p * 0.25) + (r * 0.25) + (c * 0.20) + (s * 0.15) + (z * 0.15));
  }

  return {
    oqs, prodScore, reliabScore, custScore, suppScore, sizingFitScore,
    defectRate, firstPassYield, csat, nps, totalCOPQ, copqPercentage,
    totalOrdersCount, totalFactoryCount, totalFeedbackCount, totalInspectionsCount,
    totalDefectsCount, totalComplaintsCount, totalReturnsCount, totalEvalsCount,
    reworkCost, wasteCost, returnCost, directMaintenance,
    rawDefects: timeDefects, rawInspections: timeInspections, rawFeedback: timeFeedback,
    rawComplaints: timeComplaints, rawReturns: timeReturns, rawEvaluations: timeEvaluations,
    rawMaintenanceExpenses: maintenanceExpenses
  };
}

window.qualityMetrics = {
  filterItemsByTime,
  calculateQualityMetrics
};
