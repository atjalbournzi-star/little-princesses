// src/features/orders/hooks/useOrdersData.js
const { useState, useEffect, useMemo } = React;

function useOrdersData({ orders = [], setOrders, currency }) {
  const currencyDisplay = currency?.display || "YER ريال";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [deliveryDateFilter, setDeliveryDateFilter] = useState("");

  // ── المزامنة التلقائية مع الباك اند السحابي عند فراغ القائمة ──
  useEffect(() => {
    if ((!orders || orders.length === 0) && typeof setOrders === 'function') {
      fetch('/api/sales/orders')
        .then(r => r.json())
        .then(d => {
          const list = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []);
          if (list.length > 0) setOrders(list);
        })
        .catch(err => console.warn('Orders auto-sync warning:', err));
    }
  }, [orders, setOrders]);

  // ── التصفية الذكية للطلبات بحسب البحث والحالة وتاريخ التسليم ──
  const filteredOrders = useMemo(() => {
    return (orders || []).filter(o => {
      if (!o || typeof o !== 'object') return false;
      const s = search.toLowerCase();
      const matchSearch = !search ||
        (o.order_no || '').toLowerCase().includes(s) ||
        (o.customer_name || '').toLowerCase().includes(s) ||
        (o.product_name || '').toLowerCase().includes(s) ||
        (o.child_name || '').toLowerCase().includes(s);

      const matchStatus = statusFilter === "الكل" || o.status === statusFilter;

      const orderDelivDate = o.delivery_date ? String(o.delivery_date).split('T')[0] : '';
      const matchDate = !deliveryDateFilter || orderDelivDate === deliveryDateFilter;

      return matchSearch && matchStatus && matchDate;
    });
  }, [orders, search, statusFilter, deliveryDateFilter]);

  // ── حساب المؤشرات المالية والتشغيلية اللحظية (Studio KPIs) ──
  const stats = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    const todayStr = typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10);

    let totalSales = 0;
    let totalPaid = 0;
    let pendingReceivables = 0;
    let todayOrdersCount = 0;
    let inProgressCount = 0;
    let readyCount = 0;

    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      const tot = parseFloat(o.total ?? o.total_amount) || 0;
      const pd = parseFloat(o.paid ?? o.paid_amount) || 0;
      const rem = Math.max(0, tot - pd);

      totalSales += tot;
      totalPaid += pd;
      pendingReceivables += rem;

      const ordDate = o.order_date ? String(o.order_date).split('T')[0] : '';
      if (ordDate === todayStr) {
        todayOrdersCount++;
      }

      const st = String(o.status || o.production_status || '');
      if (st.includes('خياطة') || st.includes('قص') || st.includes('تشطيب') || st.includes('تعديل') || st.includes('IN_PROGRESS')) {
        inProgressCount++;
      }
      if (st.includes('جاهز') || st.includes('READY')) {
        readyCount++;
      }
    }

    return {
      totalOrders: list.length,
      totalSales,
      totalPaid,
      pendingReceivables,
      todayOrdersCount,
      inProgressCount,
      readyCount,
      currencyDisplay
    };
  }, [orders, currencyDisplay]);

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    deliveryDateFilter,
    setDeliveryDateFilter,
    filteredOrders,
    stats,
    currencyDisplay
  };
}

window.useOrdersData = useOrdersData;
