// src/features/orders/hooks/useOrderActions.js
const { useState } = React;

function useOrderActions({ orders, setOrders, showToast, currencyDisplay, openCustomerMessageModal }) {
  const [submittingDelivery, setSubmittingDelivery] = useState(false);
  const [scanDeliveryLoading, setScanDeliveryLoading] = useState(false);
  const [submittingAlteration, setSubmittingAlteration] = useState(false);
  const [isSubmittingPOS, setIsSubmittingPOS] = useState(false);

  // ── حفظ أو تعديل الفاتورة ──
  const handleSaveInvoice = async ({ isEditing, editingOrderId, payload, resetForm }) => {
    if (!payload.customer_name) return showToast("يرجى اختيار العميلة أولاً ⚠️", "error");
    if (!payload.product_name) return showToast("يرجى اختيار الموديل أولاً ⚠️", "error");

    const tot = Math.max(0, parseFloat(payload.total) || 0);
    const pd = Math.max(0, parseFloat(payload.paid) || 0);
    const rem = Math.max(0, tot - pd);

    if (isEditing) {
      const updatedOrd = {
        id: editingOrderId, customer_name: payload.customer_name, child_name: payload.child_name,
        product_name: payload.product_name, qty: parseInt(payload.qty || 1), order_date: payload.order_date,
        delivery_date: payload.delivery_date, total: tot, paid: pd, remaining: rem,
        campaign_id: payload.campaign_id, currency: currencyDisplay
      };
      setOrders && setOrders(orders.map(o => o.id === editingOrderId ? { ...o, ...updatedOrd } : o));
      try {
        if (window.salesAPI?.updateOrder) await window.salesAPI.updateOrder(editingOrderId, updatedOrd);
        else await fetch('/api/sales/orders/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedOrd) });
        showToast("تم تحديث الفاتورة في سوبابيز بنجاح 💾", "success");
      } catch { showToast("تم الحفظ محلياً ☁️"); }
      resetForm && resetForm();
    } else {
      const newId = Date.now(), ordNo = `ORD-${newId.toString().slice(-4)}`;
      const ordCurrCode = window.CurrencyService ? window.CurrencyService.normalizeCode(currencyDisplay) : 'YER';
      const ordRate = window.CurrencyService ? window.CurrencyService.getRate(ordCurrCode) : 1.0;
      const baseTot = window.CurrencyService ? window.CurrencyService.toBase(tot, ordCurrCode, ordRate) : { base_amount: tot };
      const basePd = window.CurrencyService ? window.CurrencyService.toBase(pd, ordCurrCode, ordRate) : { base_amount: pd };

      const newOrd = {
        id: newId, order_no: ordNo, customer_name: payload.customer_name, child_name: payload.child_name,
        product_name: payload.product_name, qty: parseInt(payload.qty || 1), order_date: payload.order_date,
        delivery_date: payload.delivery_date, total: tot, paid: pd, remaining: rem,
        currency: ordCurrCode, exchange_rate: ordRate, base_total: baseTot.base_amount, base_paid: basePd.base_amount,
        campaign_id: payload.campaign_id, status: "قيد الخياطة 🪡"
      };

      setOrders && setOrders([newOrd, ...(orders || [])]);
      try {
        let msg = "تم إصدار وحفظ الفاتورة وتوليد QR Code سحابياً ☁️📄";
        if (window.salesAPI?.createOrder) {
          const res = await window.salesAPI.createOrder(newOrd);
          if (res?.message) msg = res.message;
        } else if (typeof callGAS === 'function') {
          await callGAS("addOrder", newOrd);
        }
        showToast(msg);
        openCustomerMessageModal && openCustomerMessageModal(newOrd);
      } catch (err) {
        showToast(err.message || "تم الحفظ محلياً 📄");
        openCustomerMessageModal && openCustomerMessageModal(newOrd);
      }
      resetForm && resetForm();
    }
  };

  // ── تحديث حالة الطلب ──
  const handleUpdateStatus = async (orderId, newStatus) => {
    const oldOrder = (orders || []).find(o => o.id === orderId);
    const prevStatus = oldOrder ? (oldOrder.status || oldOrder.production_status) : null;
    setOrders && setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus, production_status: newStatus } : o));
    try {
      let resData = null;
      if (window.salesAPI?.updateOrder) {
        resData = await window.salesAPI.updateOrder(orderId, { status: newStatus, production_status: newStatus });
      } else {
        const res = await fetch('/api/sales/orders/update', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: orderId, status: newStatus, production_status: newStatus })
        });
        resData = await res.json();
      }
      if (resData && resData.success === false) {
        if (prevStatus) setOrders && setOrders(orders.map(o => o.id === orderId ? { ...o, status: prevStatus, production_status: prevStatus } : o));
        return showToast(resData.error || "تعذر تغيير الحالة ⚠️", "error");
      }
      showToast("تم تحديث حالة الفاتورة والمرحلة بنجاح 🔄", "success");
    } catch (err) {
      if (prevStatus) setOrders && setOrders(orders.map(o => o.id === orderId ? { ...o, status: prevStatus, production_status: prevStatus } : o));
      showToast(err.message || "خطأ في التحديث", "error");
    }
  };

  // ── حذف طلب ──
  const handleDelete = async (orderId) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟ 🗑️")) return;
    setOrders && setOrders(orders.filter(o => o.id !== orderId));
    try {
      if (window.salesAPI?.deleteOrder) await window.salesAPI.deleteOrder(orderId);
      else if (typeof callGAS === 'function') await callGAS("deleteOrder", { id: orderId });
      showToast("تم الحذف 🗑️");
    } catch { showToast("خطأ في الحذف", "error"); }
  };

  // ── دورة التسليم النهائي والتحصيل وقيد الخزينة ──
  const handleConfirmDelivery = async ({ order, deliveryForm, onSuccess }) => {
    if (!order) return;
    setSubmittingDelivery(true);
    const orderNo = order.order_no || order.id;
    const amt = parseFloat(deliveryForm.amount_collected || 0);
    const disc = parseFloat(deliveryForm.discount || 0);

    try {
      const res = await fetch('/api/sales/orders/deliver-and-settle', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderNo, amount_collected: amt, discount: disc,
          account_id: deliveryForm.account_id, payment_method: deliveryForm.payment_method, notes: deliveryForm.notes
        })
      }).then(r => r.json());

      if (res.success) {
        showToast(res.message || 'تم تسليم الفستان والتحصيل بنجاح 👑🎉', 'success');
        setOrders && setOrders(orders.map(o => (o.order_no === orderNo || o.id === orderNo) ? {
          ...o, status: 'تم التسليم للعميل ✔️', production_status: 'DELIVERED',
          paid: (parseFloat(o.paid || 0) + amt), paid_amount: (parseFloat(o.paid_amount || 0) + amt),
          remaining: Math.max(0, (parseFloat(o.total || o.total_amount || 0) - disc) - (parseFloat(o.paid || o.paid_amount || 0) + amt))
        } : o));
        onSuccess && onSuccess(res.data || { order_no: orderNo, collected_amount: amt });
      } else {
        showToast(res.error || 'فشلت عملية التسليم والتحصيل ❌', 'error');
      }
    } catch (err) {
      showToast('خطأ أثناء التسليم: ' + err.message, 'error');
    } finally {
      setSubmittingDelivery(false);
    }
  };

  // ── التسليم السريع بالمسح (Scan-to-Deliver) ──
  const handleConfirmScanDelivery = async ({ scannedOrder, scanCollectRemaining, onSuccess }) => {
    if (!scannedOrder) return;
    setScanDeliveryLoading(true);
    try {
      const orderNo = scannedOrder.order_no || scannedOrder.id;
      const rem = Math.max(0, (parseFloat(scannedOrder.total ?? scannedOrder.total_amount) || 0) - (parseFloat(scannedOrder.paid ?? scannedOrder.paid_amount) || 0));
      const collectAmt = scanCollectRemaining ? rem : 0;

      const res = await fetch('/api/sales/scan-to-deliver', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scan_code: orderNo, order_id: scannedOrder.id, amount_collected: collectAmt,
          account_id: 'ACC-101', payment_method: 'نقد (كاش)', notes: 'تسليم فوري بالباركود (Scan to Deliver)'
        })
      }).then(r => r.json());

      if (res.success) {
        showToast(res.message || 'تم تسليم الطلب وترحيله بنجاح 👑🎉', 'success');
        setOrders && setOrders(orders.map(o => (o.id === scannedOrder.id || o.order_no === orderNo) ? {
          ...o, status: 'تم التسليم للعميل ✔️', production_status: 'DELIVERED',
          paid: (parseFloat(o.paid || 0) + collectAmt), remaining: Math.max(0, rem - collectAmt)
        } : o));
        window.dispatchEvent(new CustomEvent('erp:ordersChanged'));
        onSuccess && onSuccess();
      } else {
        showToast(res.error || 'فشلت عملية التسليم ❌', 'error');
      }
    } catch (e) {
      showToast('خطأ أثناء التسليم: ' + e.message, 'error');
    } finally {
      setScanDeliveryLoading(false);
    }
  };

  // ── حفظ تذكرة تعديل البروفة ──
  const handleSaveAlteration = async ({ payload, onSuccess }) => {
    setSubmittingAlteration(true);
    try {
      const res = await fetch('/api/alterations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        showToast(res.message || 'تم قيد تذكرة تعديل البروفة بنجاح ✂️👗', 'success');
        window.dispatchEvent(new CustomEvent('erp:alterationChanged'));
        onSuccess && onSuccess();
      } else {
        showToast(res.error || 'فشل حفظ تذكرة التعديل ❌', 'error');
      }
    } catch (err) {
      showToast('خطأ: ' + err.message, 'error');
    } finally {
      setSubmittingAlteration(false);
    }
  };

  return {
    handleSaveInvoice, handleUpdateStatus, handleDelete,
    handleConfirmDelivery, submittingDelivery,
    handleConfirmScanDelivery, scanDeliveryLoading,
    handleSaveAlteration, submittingAlteration,
    isSubmittingPOS, setIsSubmittingPOS
  };
}

window.useOrderActions = useOrderActions;
