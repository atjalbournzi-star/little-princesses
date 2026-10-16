// src/features/quality/hooks/useQualityStationActions.js
// عمليات محطة الفحص: اعتماد الجودة، إصدار تذاكر التعديل، والربط بالخادم (Quality Station Actions)

const { useState, useCallback } = React;

function useQualityStationActions({
  queue, setQueue,
  selectedInspection, setSelectedInspection,
  setFactory, setOrders,
  showToast, refreshStats
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReworkDrawer, setShowReworkDrawer] = useState(false);
  const [defectReason, setDefectReason] = useState('مطابقة المقاسات للأميرة');
  const [reworkAction, setReworkAction] = useState('إعادة ضبط المقاسات والسحاب ومعالجة الملاحظات');
  const [reworkHours, setReworkHours] = useState('1.5');

  const notify = useCallback((msg, type = 'info') => {
    if (typeof showToast === 'function') showToast(msg, type);
    else if (typeof window.showToast === 'function') window.showToast(msg, type);
    else if (type === 'error') alert('⚠️ ' + msg);
  }, [showToast]);

  const handleStartInspection = useCallback((item) => {
    setSelectedInspection(item);
    setShowReworkDrawer(false);
  }, [setSelectedInspection]);

  const handleCloseInspection = useCallback(() => {
    setSelectedInspection(null);
    setShowReworkDrawer(false);
  }, [setSelectedInspection]);

  // اعتماد ومطابقة المواصفات
  const handleApproveInspection = useCallback(async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (isSubmitting || !selectedInspection) return;

    const cleanOrderNo = String(selectedInspection.order_no || '').replace(/^#/, '').trim();
    const payload = {
      order_no: cleanOrderNo,
      order_id: selectedInspection.order_no,
      quality_status: 'passed',
      inspector_name: 'سارة مديرة الجودة',
      tailor_name: selectedInspection.tailor_name || '',
      quality_score: 5.0,
      quality_notes: 'معتمد ومطابق لمواصفات الكوتور الملكية بالكامل',
      approved_by: 'سارة مديرة الجودة',
      status: 'ready_for_delivery',
      stage: 'جاهز للتسليم 📦'
    };

    setIsSubmitting(true);

    try {
      let res = null;
      const service = window.FactoryService;
      if (service && typeof service.approveQc === 'function') {
        res = await service.approveQc(payload);
      } else {
        const resp = await fetch('/api/factory/job-card/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        res = await resp.json().catch(() => ({}));
      }

      if (res && (res.success || res.status === 'success' || res.status === 200)) {
        notify('تم اعتماد جودة الفستان بنجاح وتحويله للتسليم 📦', 'success');

        const readyState = {
          status: 'ready_for_delivery', stage: 'جاهز للتسليم 📦', production_status: 'ready',
          tailor_status: 'approved', wage_credited: true, quality_score: 5.0, quality_status: 'passed', progress: 100
        };
        const targetClean = cleanOrderNo.toLowerCase();

        setQueue(prev => prev.filter(q => {
          const qNo = String(q.order_no || q.id || '').replace(/^#/, '').trim().toLowerCase();
          return qNo !== targetClean;
        }));

        const isMatch = (item) => {
          if (!item) return false;
          const iNo = String(item.order_no || '').replace(/^#/, '').trim().toLowerCase();
          const iId = String(item.id || '').replace(/^#/, '').trim().toLowerCase();
          return iNo === targetClean || iId === targetClean;
        };

        if (typeof setFactory === 'function') {
          setFactory(prev => {
            const list = Array.isArray(prev) ? prev : [];
            let found = false;
            const nextList = list.map(item => isMatch(item) ? (found = true, { ...item, ...readyState }) : item);
            if (!found) {
              const newItem = {
                id: selectedInspection.order_no || cleanOrderNo, order_no: cleanOrderNo,
                customer: selectedInspection.customer_name || '', child_name: selectedInspection.child_name || '',
                product: selectedInspection.product_name || '', tailor: selectedInspection.tailor_name || '', ...readyState
              };
              return [newItem, ...nextList];
            }
            return nextList;
          });
        }

        if (typeof setOrders === 'function') {
          setOrders(prev => (prev || []).map(item => isMatch(item) ? { ...item, ...readyState } : item));
        }

        if (Array.isArray(window.factory)) {
          let found = false;
          window.factory = window.factory.map(item => isMatch(item) ? (found = true, { ...item, ...readyState }) : item);
          if (!found) {
            window.factory.unshift({
              id: selectedInspection.order_no || cleanOrderNo, order_no: cleanOrderNo,
              customer: selectedInspection.customer_name || '', child_name: selectedInspection.child_name || '',
              product: selectedInspection.product_name || '', tailor: selectedInspection.tailor_name || '', ...readyState
            });
          }
        }
        if (Array.isArray(window.orders)) {
          window.orders = window.orders.map(item => isMatch(item) ? { ...item, ...readyState } : item);
        }

        const qcDetail = { orderId: cleanOrderNo, order_no: cleanOrderNo, status: 'passed', stage: 'جاهز للتسليم 📦', production_status: 'ready', quality_status: 'passed', progress: 100 };
        window.dispatchEvent(new CustomEvent('order_qc_updated', { detail: qcDetail }));
        window.dispatchEvent(new CustomEvent('orders-updated', { detail: payload }));
        window.dispatchEvent(new CustomEvent('erp:factoryChanged', { detail: payload }));
        window.dispatchEvent(new CustomEvent('erp:ordersChanged', { detail: payload }));

        if (refreshStats) refreshStats();
        handleCloseInspection();
      } else {
        const msg = res?.error || res?.message || 'حدث خطأ أثناء اعتماد الجودة في الخادم';
        notify('فشل الاعتماد: ' + msg, 'error');
      }
    } catch (err) {
      console.error('❌ [Quality Station] Exception:', err);
      notify('تعذر الاتصال بالخادم: ' + (err.message || 'خطأ غير متوقع'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, selectedInspection, notify, setQueue, setFactory, setOrders, refreshStats, handleCloseInspection]);

  // إصدار تذكرة تعديل وإرجاع للخياط
  const handleReworkInspection = useCallback(async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (isSubmitting || !selectedInspection) return;

    const cleanOrderNo = String(selectedInspection.order_no || '').replace(/^#/, '');
    const payload = {
      order_id: cleanOrderNo, order_no: cleanOrderNo, defect_type: defectReason,
      severity: 'Medium', corrective_action: reworkAction, rework_hours: reworkHours, inspector_name: 'سارة مديرة الجودة'
    };

    setIsSubmitting(true);

    try {
      const service = window.FactoryService || {};
      const res = await (service.reworkQc ? service.reworkQc(payload) : { success: true });

      if (res && (res.success || res.status === 'success')) {
        notify('⚠ تم رفض الفحص وإصدار تذكرة تعديل وبروفة للخياط بنجاح', 'warning');
        setQueue(prev => prev.map(q => q.order_no === selectedInspection.order_no ? {
          ...q, status: 'rework', status_label: 'مطلوب تعديل ✂️', defect_note: defectReason
        } : q));

        if (typeof setFactory === 'function') {
          setFactory(prev => (prev || []).map(item => item.order_no === cleanOrderNo ? {
            ...item, tailor_status: 'rework', stage: 'تعديل وبروفة ✂️', notes: (item.notes || '') + ` | مطلوب تعديل: ${defectReason}`
          } : item));
        }

        if (refreshStats) refreshStats();
        handleCloseInspection();
      } else {
        notify(res?.error || 'حدث خطأ أثناء إصدار التذكرة', 'error');
      }
    } catch (err) {
      notify('خطأ: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, selectedInspection, defectReason, reworkAction, reworkHours, notify, setQueue, setFactory, refreshStats, handleCloseInspection]);

  return {
    isSubmitting, showReworkDrawer, setShowReworkDrawer, defectReason, setDefectReason,
    reworkAction, setReworkAction, reworkHours, setReworkHours, handleStartInspection,
    handleCloseInspection, handleApproveInspection, handleReworkInspection
  };
}

window.useQualityStationActions = useQualityStationActions;
