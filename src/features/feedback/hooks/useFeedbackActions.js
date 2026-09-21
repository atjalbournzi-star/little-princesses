// src/features/feedback/hooks/useFeedbackActions.js
// دوال حفظ وتسجيل التقييمات، الفحوصات، العيوب، والشكاوى

const { useState } = React;

function useFeedbackActions({
  feedback = [], setFeedback,
  masterEvaluations = [], setMasterEvaluations,
  inspections = [], setInspections,
  defects = [], setDefects,
  complaints = [], setComplaints,
  returns = [], setReturns,
  correctiveActions = [], setCorrectiveActions,
  setActiveModalType, showToast
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const TODAY_STR_ISO = new Date().toISOString().split('T')[0];

  const [masterEvalForm, setMasterEvalForm] = useState({
    evaluation_type: 'Customer', entity_type: 'Product', entity_id: '', entity_name: '',
    department: 'الإنتاج', related_product_id: '', related_order_id: '', related_customer_id: '',
    related_employee_id: '', related_supplier_id: '', related_material_id: '',
    quality_criteria: 'معايير الجودة العامة والتنفيذ', metric_code: 'OQS',
    score: 5, max_score: 5, status: 'Active', severity: 'Low', comment: '', root_cause: '',
    corrective_action: '', responsible_id: 'مدير الجودة', cost: 0
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

  const [complaintForm, setComplaintForm] = useState({
    customer_name: '', order_id: '', complaint_type: 'sizing', severity: 'medium',
    description: '', compensation_cost: 0, status: 'in_investigation'
  });

  const [returnForm, setReturnForm] = useState({
    customer_name: '', order_id: '', return_reason: 'مقاس غير ملائم', condition: 'repairable',
    action_taken: 'تعديل الفستان وإعادة تسليمه', refund_amount: 0, replacement_cost: 0, status: 'pending_inspection'
  });

  const handleCreateMasterEvaluation = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        record_id: 'EVAL-' + Date.now(), record_date: TODAY_STR_ISO, ...masterEvalForm,
        percentage: ((parseFloat(masterEvalForm.score) / parseFloat(masterEvalForm.max_score || 5)) * 100).toFixed(1),
        created_at: TODAY_STR_ISO
      };
      if (window.qualityAPI?.addEvaluation) await window.qualityAPI.addEvaluation(payload);
      setMasterEvaluations([payload, ...masterEvaluations]);
      if (showToast) showToast('تم تسجيل التقييم في سجل الجودة الرئيسي وتحديث المؤشرات بنجاح 📋');
      if (setActiveModalType) setActiveModalType(null);
    } catch(err) { if (showToast) showToast('حدث خطأ أثناء حفظ التقييم', 'error'); }
    setIsSubmitting(false);
  };

  const handleCreateInspection = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { inspection_id: 'INSP-' + Date.now(), inspection_date: TODAY_STR_ISO, ...inspectionForm, created_at: TODAY_STR_ISO };
      if (window.qualityAPI?.addInspection) await window.qualityAPI.addInspection(payload);
      setInspections([payload, ...inspections]);
      if (showToast) showToast('تم تسجيل فحص الجودة وتحديث نسبة الفحص بنجاح 📋');
      if (setActiveModalType) setActiveModalType(null);
      setInspectionForm({ product_id: '', product_name: '', order_id: '', production_stage: 'الفحص النهائي', quantity_checked: 1, quantity_passed: 1, quantity_failed: 0, inspection_result: 'PASS', inspector_name: 'مفتش الجودة', notes: '' });
    } catch(err) { if (showToast) showToast('حدث خطأ أثناء حفظ الفحص', 'error'); }
    setIsSubmitting(false);
  };

  const handleCreateDefect = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { defect_id: 'DEF-' + Date.now(), defect_date: TODAY_STR_ISO, ...defectForm, total_cost: parseFloat(defectForm.rework_cost || 0), created_at: TODAY_STR_ISO };
      if (window.qualityAPI?.addDefect) await window.qualityAPI.addDefect(payload);
      setDefects([payload, ...defects]);
      if (showToast) showToast('تم تسجيل عيب الجودة واحتساب تكلفة COPQ ⚠️');
      if (setActiveModalType) setActiveModalType(null);
      setDefectForm({ product_id: '', product_name: '', order_id: '', production_stage: 'الخياطة', defect_type: 'عيب خياطة', defect_category: 'تشغيلي', severity: 'Medium', affected_quantity: 1, root_cause: '', corrective_action: '', rework_cost: 0, notes: '' });
    } catch(err) { if (showToast) showToast('حدث خطأ أثناء حفظ العيب', 'error'); }
    setIsSubmitting(false);
  };

  const handleCreateFeedback = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        feedback_id: 'FB-' + Date.now(), feedback_date: TODAY_STR_ISO, ...feedbackForm,
        nps_score: Number(feedbackForm.rating) >= 5 ? 10 : Number(feedbackForm.rating) == 4 ? 7 : 4,
        created_at: TODAY_STR_ISO
      };
      if (window.qualityAPI?.addFeedback) await window.qualityAPI.addFeedback(payload);
      if (setFeedback) setFeedback([payload, ...feedback]);
      if (showToast) showToast('تم تسجيل تقييم العميل وإعادة احتساب NPS تلقائياً ⭐');
      if (setActiveModalType) setActiveModalType(null);
      setFeedbackForm({ customer_id: '', customer_name: '', order_id: '', girl_name: '', rating: 5, feedback_type: 'NPS', comment: '', channel: 'WhatsApp' });
    } catch(err) { if (showToast) showToast('حدث خطأ أثناء حفظ التقييم', 'error'); }
    setIsSubmitting(false);
  };

  const handleCreateCAPA = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { action_id: 'CAPA-' + Date.now(), start_date: TODAY_STR_ISO, ...capaForm, status: 'In Progress', created_at: TODAY_STR_ISO };
      if (window.qualityAPI?.addCorrectiveAction) await window.qualityAPI.addCorrectiveAction(payload);
      setCorrectiveActions([payload, ...correctiveActions]);
      if (showToast) showToast('تم تسجيل الإجراء التصحيحي والوقائي (CAPA) 🛡️');
      if (setActiveModalType) setActiveModalType(null);
      setCapaForm({ defect_id: '', complaint_id: '', action_type: 'Corrective', problem: '', root_cause: '', action_description: '', responsible: 'مدير الورشة', priority: 'High', notes: '' });
    } catch(err) { if (showToast) showToast('حدث خطأ أثناء حفظ الإجراء', 'error'); }
    setIsSubmitting(false);
  };

  const handleCreateComplaint = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { id: 'CMP-' + Date.now(), complaint_date: TODAY_STR_ISO, ...complaintForm, compensation_cost: parseFloat(complaintForm.compensation_cost || 0), created_at: TODAY_STR_ISO };
      if (window.qualityAPI?.addComplaint) await window.qualityAPI.addComplaint(payload);
      setComplaints([payload, ...complaints]);
      if (showToast) showToast('تم تسجيل الشكوى بنجاح في سوبابيز 📢');
      if (setActiveModalType) setActiveModalType(null);
      setComplaintForm({ customer_name: '', order_id: '', complaint_type: 'sizing', severity: 'medium', description: '', compensation_cost: 0, status: 'in_investigation' });
    } catch(err) { if (showToast) showToast('حدث خطأ أثناء حفظ الشكوى', 'error'); }
    setIsSubmitting(false);
  };

  const handleCreateReturn = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { id: 'RET-' + Date.now(), return_date: TODAY_STR_ISO, ...returnForm, refund_amount: parseFloat(returnForm.refund_amount || 0), replacement_cost: parseFloat(returnForm.replacement_cost || 0), created_at: TODAY_STR_ISO };
      if (window.qualityAPI?.addReturn) await window.qualityAPI.addReturn(payload);
      setReturns([payload, ...returns]);
      if (showToast) showToast('تم تسجيل المرتجع واحتساب أثر COPQ بنجاح 🔄');
      if (setActiveModalType) setActiveModalType(null);
      setReturnForm({ customer_name: '', order_id: '', return_reason: 'مقاس غير ملائم', condition: 'repairable', action_taken: 'تعديل الفستان وإعادة تسليمه', refund_amount: 0, replacement_cost: 0, status: 'pending_inspection' });
    } catch(err) { if (showToast) showToast('حدث خطأ أثناء حفظ المرتجع', 'error'); }
    setIsSubmitting(false);
  };

  const handleUpdateComplaintStatus = async (comp, newStatus) => {
    try {
      const updated = { ...comp, status: newStatus };
      if (window.qualityAPI?.addComplaint) await window.qualityAPI.addComplaint(updated);
      setComplaints(complaints.map(c => ((c.id || c.complaint_id) === (comp.id || comp.complaint_id) ? updated : c)));
      if (showToast) showToast('تم تحديث حالة الشكوى بنجاح ✅');
    } catch(e) { if (showToast) showToast('تعذر تحديث الحالة', 'error'); }
  };

  const handleUpdateReturnStatus = async (ret, newStatus) => {
    try {
      const updated = { ...ret, status: newStatus };
      if (window.qualityAPI?.addReturn) await window.qualityAPI.addReturn(updated);
      setReturns(returns.map(r => ((r.id || r.return_id) === (ret.id || ret.return_id) ? updated : r)));
      if (showToast) showToast('تم تحديث حالة المرتجع بنجاح ✅');
    } catch(e) { if (showToast) showToast('تعذر تحديث الحالة', 'error'); }
  };

  const handleUpdateCAPAStatus = async (act, newStatus) => {
    try {
      const updated = { ...act, status: newStatus, completion_date: newStatus === 'Completed' ? TODAY_STR_ISO : act.completion_date };
      if (window.qualityAPI?.addCorrectiveAction) await window.qualityAPI.addCorrectiveAction(updated);
      setCorrectiveActions(correctiveActions.map(a => ((a.id || a.action_id) === (act.id || act.action_id) ? updated : a)));
      if (showToast) showToast(`تم تحديث حالة الإجراء إلى ${newStatus} 🛡️`);
    } catch(e) { if (showToast) showToast('تعذر تحديث الحالة', 'error'); }
  };

  return {
    isSubmitting,
    masterEvalForm, setMasterEvalForm,
    inspectionForm, setInspectionForm,
    defectForm, setDefectForm,
    feedbackForm, setFeedbackForm,
    capaForm, setCapaForm,
    complaintForm, setComplaintForm,
    returnForm, setReturnForm,
    handleCreateMasterEvaluation,
    handleCreateInspection,
    handleCreateDefect,
    handleCreateFeedback,
    handleCreateCAPA,
    handleCreateComplaint,
    handleCreateReturn,
    handleUpdateComplaintStatus,
    handleUpdateReturnStatus,
    handleUpdateCAPAStatus
  };
}

window.useFeedbackActions = useFeedbackActions;
