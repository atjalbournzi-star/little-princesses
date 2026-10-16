function useFactoryDeliveryActions(props) {
  const {
    factory, setFactory, orders, setOrders, showToast, stages,
    deliveryModalData, setDeliveryModalData, deliveryForm, setDeliveryForm,
    setDeliveredSuccessData, setSubmittingDelivery, setStockInflowLoading,
    scanBarcodeQuery, setScanBarcodeQuery, scannedProgressJob,
    setScannedProgressJob, setAdvancingScanProgress, setAlterationsList
  } = props;

  const service = window.FactoryService || {};
  const utils = window.FactoryUtils || {};

  const handleStockInflow = async (f) => {
    const poNo = f.order_no || f.id;
    setStockInflowLoading(p => ({ ...p, [poNo]: true }));
    try {
      const res = await (service.stockInflow ? service.stockInflow(f.id, poNo, f.product || f.product_name, f.quantity || 1) : {});
      if (res.success) {
        showToast(res.message || `تم توريد [${f.product || f.product_name}] للمخزن بنجاح 📦`, 'success');
        setFactory(p => p.map(i => (i.id === f.id || i.order_no === f.order_no) ? { ...i, stock_received: true, stage: 'جاهز للتسليم 📦', progress: 100 } : i));
        if (typeof props.setInventory === 'function') {
          const prodName = f.product || f.product_name, pieces = parseFloat(f.quantity || 1);
          props.setInventory(p => (p || []).some(i => (i.name || i.item_name) === prodName)
            ? p.map(i => (i.name || i.item_name) === prodName ? { ...i, quantity: (parseFloat(i.quantity || 0) + pieces) } : i)
            : [...(p || []), { id: 'INV-' + Date.now(), name: prodName, quantity: pieces, unit: 'قطعة', type: 'Finished' }]);
        }
      } else showToast(res.error || 'فشل التوريد للمخزن ❌', 'error');
    } catch (err) {
      showToast('خطأ في الاتصال: ' + err.message, 'error');
    } finally {
      setStockInflowLoading(p => ({ ...p, [poNo]: false }));
    }
  };

  const handleReverseStockInflow = async (f) => {
    const poNo = f.order_no || f.id;
    if (!window.confirm(`هل أنت متأكد من رغبتك في إلغاء التوريد المخزني لأمر التشغيل [${poNo}]؟\nسيتم خصم الكمية من المخزن وإتاحة التعديل من جديد 🔄`)) return;
    setStockInflowLoading(p => ({ ...p, [poNo]: true }));
    try {
      const res = await (service.reverseStockInflow ? service.reverseStockInflow(f.id, poNo) : {});
      if (res.success) {
        showToast(res.message || 'تم إلغاء التوريد بنجاح 🔄', 'success');
        setFactory(p => p.map(i => (i.id === f.id || i.order_no === f.order_no) ? { ...i, stock_received: false } : i));
        if (typeof props.setInventory === 'function') {
          const prodName = f.product || f.product_name, pieces = parseFloat(f.quantity || 1);
          props.setInventory(p => (p || []).map(i => (i.name || i.item_name) === prodName ? { ...i, quantity: Math.max(0, parseFloat(i.quantity || 0) - pieces) } : i));
        }
      } else showToast(res.error || 'تعذر إلغاء التوريد', 'error');
    } catch (err) {
      showToast('خطأ: ' + err.message, 'error');
    } finally {
      setStockInflowLoading(p => ({ ...p, [poNo]: false }));
    }
  };

  const handleOpenDeliveryModal = (f) => {
    const orderLabel = f.order_no || f.id;
    const ord = (orders || []).find(o => o.order_no === orderLabel || o.id === orderLabel) || f || {};
    const tot = parseFloat(ord.total_amount ?? ord.final_total ?? ord.total_price ?? ord.price ?? ord.total ?? f.total_amount ?? f.final_total ?? f.total_price ?? f.total ?? 0);
    const pd = parseFloat(ord.paid_amount ?? ord.deposit ?? ord.paid ?? ord.paid_total ?? ord.deposit_amount ?? f.paid_amount ?? f.deposit ?? f.paid ?? 0);
    const rem = Math.max(0, tot - pd);
    const delFee = parseFloat(f.delivery_fee ?? ord.delivery_fee ?? ord.delivery ?? 0);
    const delMode = f.delivery_payment_mode || ord.delivery_payment_mode || 'DIRECT_TO_COURIER';
    const defaultCollected = rem <= 0 ? '0' : String(rem);
    setDeliveryForm({ amount_collected: defaultCollected, discount: '0', account_id: 'ACC-101', payment_method: 'نقد (كاش)', notes: '' });
    setDeliveredSuccessData(null);
    setDeliveryModalData({ ...f, order: ord, resolvedTotal: tot, resolvedPaid: pd, resolvedRemaining: rem, delivery_fee: delFee, delivery_payment_mode: delMode });
  };

  const handleConfirmDelivery = async () => {
    if (!deliveryModalData) return;
    const orderNo = deliveryModalData.order?.order_no || deliveryModalData.order_no || deliveryModalData.id;
    const orderId = deliveryModalData.order?.id || deliveryModalData.order_id || deliveryModalData.id || orderNo;
    const formObj = deliveryForm || {};
    const amt = parseFloat(formObj.amount_collected || 0), disc = parseFloat(formObj.discount || 0);
    const nowIso = new Date().toISOString();
    try {
      const res = await (service.deliverAndSettle ? service.deliverAndSettle({
        order_id: orderId, amount_collected: amt, discount: disc, account_id: formObj.account_id || 'ACC-101',
        payment_method: formObj.payment_method || 'نقد (كاش)', notes: formObj.notes || '', payment_type: 'Final_Receipt'
      }) : { success: true });
      if (res && (res.success || res.status === 'success' || res.status === 200)) {
        showToast(res.message || 'تم تسليم الفستان للأميرة وتقييد التحصيل المالي بنجاح 👑🎉', 'success');
        const targetKeys = [orderId, orderNo, deliveryModalData.id, deliveryModalData.order_no].filter(Boolean);
        setFactory(p => (p || []).filter(i => !targetKeys.includes(i.id) && !targetKeys.includes(i.order_no)));
        if (typeof setOrders === 'function') {
          setOrders(p => (p || []).map(o => targetKeys.includes(o.id) || targetKeys.includes(o.order_no) ? {
            ...o, status: 'delivered', stage: 'تم التسليم', production_status: 'delivered', delivery_date: nowIso,
            paid: (parseFloat(o.paid || o.paid_amount || 0) + amt),
            paid_amount: (parseFloat(o.paid_amount || o.paid || 0) + amt),
            remaining: Math.max(0, (parseFloat(o.total || o.total_amount || 0) - disc) - (parseFloat(o.paid || o.paid_amount || 0) + amt))
          } : o));
        }
        if (Array.isArray(window.factory)) {
          window.factory = window.factory.filter(i => !targetKeys.includes(i.id) && !targetKeys.includes(i.order_no));
        }
        if (Array.isArray(window.orders)) {
          window.orders = window.orders.map(o => targetKeys.includes(o.id) || targetKeys.includes(o.order_no) ? { ...o, status: 'delivered', stage: 'تم التسليم', production_status: 'delivered', delivery_date: nowIso } : o);
        }
        window.dispatchEvent(new CustomEvent('order_status_changed', { detail: { orderId, order_no: orderNo, status: 'delivered', stage: 'تم التسليم' } }));
        window.dispatchEvent(new CustomEvent('erp:factoryChanged', { detail: { orderNo, orderId, status: 'delivered' } }));
        window.dispatchEvent(new CustomEvent('erp:ordersChanged', { detail: { orderNo, orderId, status: 'delivered' } }));
        if (typeof setDeliveryModalData === 'function') setDeliveryModalData(null);
        if (typeof props.onClose === 'function') props.onClose();
      } else showToast(res?.error || 'فشلت عملية التسليم والتحصيل ❌', 'error');
    } catch (err) {
      showToast('خطأ أثناء التسليم: ' + err.message, 'error');
    } finally {
      setSubmittingDelivery(false);
    }
  };

  const handleReverseDelivery = async (f) => {
    const orderNo = f.order_no || f.id;
    if (!window.confirm(`هل أنت متأكد من رغبتك في إلغاء تسليم الطلب رقم [${orderNo}]؟\nسيتم عكس قيد التحصيل وسند القبض وإعادة الطلب لقائمة الجاهز للتسليم 🔄`)) return;
    try {
      const res = await (service.reverseDelivery ? service.reverseDelivery(orderNo) : {});
      if (res.success) {
        showToast(res.message || 'تم إلغاء التسليم بنجاح وإعادة الطلب إلى جاهز للتسليم 🔄', 'success');
        setFactory(p => p.map(i => (i.id === f.id || i.order_no === f.order_no) ? { ...i, stage: 'جاهز للتسليم 📦', progress: 95 } : i));
        if (typeof setOrders === 'function') {
          setOrders(p => (p || []).map(o => (o.order_no === orderNo || o.id === orderNo) ? { ...o, status: 'جاهز للتسليم 🛍️', production_status: 'Ready' } : o));
        }
      } else showToast(res.error || 'فشل إلغاء التسليم', 'error');
    } catch (err) {
      showToast('خطأ: ' + err.message, 'error');
    }
  };

  const handleUpdateAlterationStatus = async (altId, newStatus) => {
    try {
      const res = await (service.updateAlterationStatus ? service.updateAlterationStatus(altId, newStatus) : {});
      if (res.success) {
        showToast(res.message || 'تم تحديث حالة التعديل بنجاح ✂️', 'success');
        setAlterationsList(p => p.map(a => a.id === altId ? { ...a, status: newStatus } : a));
        window.dispatchEvent(new CustomEvent('erp:alterationChanged'));
      } else showToast(res.error || 'تعذر تحديث الحالة', 'error');
    } catch (err) {
      showToast('خطأ: ' + err.message, 'error');
    }
  };

  const handleSearchScanJob = (queryStr) => {
    const q = (queryStr || scanBarcodeQuery || '').trim().toLowerCase();
    if (!q) return;
    let matched = (factory || []).find(f => (f.order_no && f.order_no.toLowerCase() === q) || (f.id && String(f.id).toLowerCase() === q) || (f.barcode && f.barcode.toLowerCase() === q) || (f.sku && f.sku.toLowerCase() === q));
    if (!matched) {
      const ord = (orders || []).find(o => (o.order_no && o.order_no.toLowerCase() === q) || (o.id && String(o.id).toLowerCase() === q) || (o.barcode && o.barcode.toLowerCase() === q) || (o.sku && o.sku.toLowerCase() === q));
      if (ord) {
        matched = {
          id: ord.id, order_no: ord.order_no || ord.id, customer: ord.customer_name, customer_name: ord.customer_name,
          child_name: ord.child_name, product: ord.product_name, product_name: ord.product_name,
          stage: ord.production_status || ord.status || stages[0],
          progress: utils.STAGE_PROGRESS?.[ord.production_status || ord.status] || 20, quantity: ord.qty || 1
        };
      }
    }
    if (matched) {
      setScannedProgressJob(matched);
      showToast(`تم التعرف على فستان الأميرة: ${matched.child_name || matched.customer || matched.order_no} 🎯`, 'info');
    } else {
      showToast(`لم يتم العثور على أمر تشغيل بالرمز: ${q} ⚠️`, 'error');
    }
  };

  const handleAdvanceScannedJob = async () => {
    if (!scannedProgressJob) return;
    setAdvancingScanProgress(true);
    try {
      if (props.advanceToNextStage) await props.advanceToNextStage(scannedProgressJob);
      const curIdx = stages.indexOf(scannedProgressJob.stage);
      if (curIdx < stages.length - 1) {
        const nextStage = stages[curIdx + 1];
        setScannedProgressJob(p => ({ ...p, stage: nextStage, progress: utils.STAGE_PROGRESS?.[nextStage] || 100 }));
      }
      setScanBarcodeQuery('');
    } catch (err) {
      showToast('خطأ أثناء الترقية: ' + err.message, 'error');
    } finally {
      setAdvancingScanProgress(false);
    }
  };

  return {
    handleStockInflow, handleReverseStockInflow, handleOpenDeliveryModal,
    handleConfirmDelivery, handleReverseDelivery, handleUpdateAlterationStatus,
    handleSearchScanJob, handleAdvanceScannedJob
  };
}

window.useFactoryDeliveryActions = useFactoryDeliveryActions;
