// src/features/orders/hooks/usePosReturnAction.js
// خطاف تنفيذ مرتجع مبيعات نقاط البيع (POS Sales Return) وتحديث المخزون والفواتير فورياً

const { useState } = React;

function usePosReturnAction({ setOrders, showToast }) {
  const [returningOrderId, setReturningOrderId] = useState(null);

  const handleReturnPosOrder = async (ord) => {
    if (!ord || returningOrderId) return;
    const orderRef = ord.order_no || ord.id;
    if (!orderRef) return;

    const ok = window.confirm(
      `هل أنت متأكد من عمل مرتجع مبيعات للفاتورة (${orderRef})؟\nسيتم إرجاع الكميات للمخزون وعكس الإيراد والتكلفة في الحسابات.`
    );
    if (!ok) return;

    setReturningOrderId(orderRef);
    try {
      let res;
      if (window.salesAPI?.returnPosOrder) {
        res = await window.salesAPI.returnPosOrder(orderRef, { reason: 'مرتجع مبيعات POS' });
      } else {
        const r = await fetch(`/api/pos/orders/${encodeURIComponent(orderRef)}/return`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'مرتجع مبيعات POS' })
        });
        res = await r.json().catch(() => ({}));
        if (!r.ok || !res.success) throw new Error(res.error || res.message || 'تعذر إتمام المرتجع');
      }

      setOrders && setOrders(prev => (prev || []).map(o =>
        (o.id === ord.id || o.order_no === orderRef)
          ? { ...o, status: 'مرتجع ↩️', production_status: 'Returned' }
          : o
      ));

      try {
        const refreshed = await fetch('/api/sales/orders').then(r => r.json());
        if (refreshed?.success && Array.isArray(refreshed.data)) {
          setOrders && setOrders(refreshed.data);
        }
      } catch (_) {}

      window.dispatchEvent(new CustomEvent('erp:inventoryChanged'));
      window.dispatchEvent(new CustomEvent('erp:ordersChanged'));
      showToast && showToast(res.message || `تم اعتماد مرتجع المبيعات للفاتورة ${orderRef} بنجاح ↩️`, 'success');
    } catch (err) {
      showToast && showToast(err.message || 'فشل تنفيذ مرتجع المبيعات ❌', 'error');
    } finally {
      setReturningOrderId(null);
    }
  };

  return { handleReturnPosOrder, returningOrderId };
}

window.usePosReturnAction = usePosReturnAction;
