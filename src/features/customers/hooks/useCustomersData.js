// src/features/customers/hooks/useCustomersData.js
const { useState, useEffect, useMemo, useCallback, useRef } = React;

function useCustomersData({ customers = [], setCustomers, orders = [] }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [liveOrders, setLiveOrders] = useState([]);
  const didFetchCustomersRef = useRef(false);

  const refreshOrders = useCallback(() => {
    fetch('/api/sales/orders').then(r => r.json()).then(d => {
      const l = Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : []);
      if (l.length) setLiveOrders(l);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!orders || orders.length === 0) refreshOrders();
    const onOrdersChanged = () => refreshOrders();
    window.addEventListener('erp:ordersChanged', onOrdersChanged);
    window.addEventListener('orders-updated', onOrdersChanged);
    return () => {
      window.removeEventListener('erp:ordersChanged', onOrdersChanged);
      window.removeEventListener('orders-updated', onOrdersChanged);
    };
  }, [refreshOrders]);
  const effectiveOrders = (liveOrders && liveOrders.length > 0) ? liveOrders : (orders || []);

  // جلب العملاء مرة واحدة تلقائياً من الخادم فقط إذا لم يتم الجلب مسبقاً وكانت القائمة فارغة
  useEffect(() => {
    if (!didFetchCustomersRef.current && (!customers || customers.length === 0) && typeof setCustomers === 'function') {
      didFetchCustomersRef.current = true;
      fetch('/api/customers')
        .then(r => r.json())
        .then(d => {
          const list = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : (d?.customers || []));
          if (list.length > 0) setCustomers(list);
        })
        .catch(err => console.warn('Customers auto-fetch notice:', err));
    }
  }, [customers, setCustomers]);

  // حساب الرصيد المتبقي بدقة عبر المصدر الموحد لمتبقي عقود التنفيذ
  const getCustRem = useCallback((c) => {
    const calcFn = window.customerUtils?.calculateCustomerRemainingBalance;
    if (typeof calcFn === 'function') return calcFn(c, effectiveOrders);
    if (!c) return 0;
    const cid = String(c.customer_id || c.id || ''), cName = String(c.name || c.customer_name || '').trim();
    const ords = (effectiveOrders || []).filter(o => {
      if (!o) return false;
      const m = (o.customer_id && (String(o.customer_id) === cid || String(o.customer_id) === String(c.id))) || (o.customer_name && String(o.customer_name).trim() === cName);
      const st = String(o.status || '').toLowerCase();
      return m && st !== 'cancelled' && st !== 'ملغي';
    });
    if (ords.length > 0) {
      let t = 0, p = 0;
      ords.forEach(o => {
        const isPre = (o.delivery_payment_mode || c.delivery_payment_mode) === 'PREPAID_VIA_ATELIER';
        let tot = Number(o.total_price || o.total_amount || 0), fee = Number(o.delivery_fee || 0);
        if (!isPre && fee > 0 && o.subtotal && tot > Number(o.subtotal)) tot = Number(o.subtotal);
        t += tot; p += Number(o.paid_amount || o.deposit_amount || o.deposit || o.paid || 0);
      });
      return Math.max(0, t - p);
    }
    const legSales = parseFloat(c.ledger?.total_sales || c.total_sales || 0);
    const legPaid = parseFloat(c.ledger?.total_paid || c.ledger?.deposit_amount || c.ledger?.deposit || c.total_paid || c.deposit_amount || c.deposit || 0);
    return Math.max(0, legSales - legPaid);
  }, [effectiveOrders]);

  // فلترة وترتيب قائمة العملاء
  const filteredCustomers = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];
    const q = (search || '').trim().toLowerCase();

    const filtered = list.filter(c => {
      if (!c) return false;
      const cName = String(c.name || c.customer_name || '').toLowerCase();
      const cPhone = String(c.phone || '');
      const cPhoneAlt = String(c.phone_alt || '');
      const cId = String(c.customer_id || c.id || '').toLowerCase();
      const cCity = String(c.city || c.address || '').toLowerCase();
      const cHandle = String(c.handle || '').toLowerCase();

      const matchesSearch = !q ||
        cName.includes(q) ||
        cPhone.includes(q) ||
        cPhoneAlt.includes(q) ||
        cId.includes(q) ||
        cCity.includes(q) ||
        cHandle.includes(q);

      const matchesCategory = categoryFilter === 'all' || (c.category || 'جديد') === categoryFilter;

      return matchesSearch && matchesCategory;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
      }
      if (sortBy === 'remaining') {
        return getCustRem(b) - getCustRem(a);
      }
      if (sortBy === 'oldest') {
        const dateA = new Date(a.reg_date || a.created_at || 0).getTime();
        const dateB = new Date(b.reg_date || b.created_at || 0).getTime();
        return dateA - dateB;
      }
      // 'recent' الافتراضي
      const dateA = new Date(a.reg_date || a.created_at || 0).getTime();
      const dateB = new Date(b.reg_date || b.created_at || 0).getTime();
      return (dateB || 0) - (dateA || 0);
    });
  }, [customers, search, categoryFilter, sortBy, effectiveOrders, getCustRem]);

  // إحصائيات لوحة العملاء الفورية
  const stats = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];
    const total = list.length;
    let active = 0;
    let newCount = 0;
    let vipCount = 0;
    let totalReceivables = 0;

    list.forEach(c => {
      const cat = c.category || 'جديد';
      if (cat === 'VIP') vipCount++;
      else if (cat === 'دائم') active++;
      else newCount++;
    });

    totalReceivables = (filteredCustomers || []).reduce((acc, c) => acc + Math.max(0, getCustRem(c)), 0);

    // حساب الطلبات النشطة الجارية للعملاء
    const pendingOrders = (effectiveOrders || []).filter(o => {
      const st = String(o.status || '').toLowerCase();
      const pSt = String(o.production_status || '').toLowerCase();
      const isClosed = st.includes('تم التسليم') || st.includes('مكتمل') || st.includes('ملغي') ||
                       st.includes('delivered') || st.includes('completed') || st.includes('cancelled') ||
                       pSt.includes('تم التسليم') || pSt.includes('delivered') || pSt.includes('completed') || pSt.includes('cancelled');
      return !isClosed;
    }).length;

    return {
      total,
      active: active + vipCount,
      newCount,
      vipCount,
      pendingOrders,
      totalReceivables
    };
  }, [customers, filteredCustomers, effectiveOrders, getCustRem]);

  // دالة استخراج الأميرات المسجلات لعميل معين
  const getKnownPrincesses = useCallback((targetCust) => {
    if (!targetCust) return [];
    const list = [];
    const seen = new Set();
    const allMeas = Array.isArray(targetCust.measurements) ? targetCust.measurements : [];
    
    allMeas.forEach(m => {
      const cName = String(m.child_name || m.name || '').trim();
      if (cName && !seen.has(cName)) {
        seen.add(cName);
        list.push({
          child_name: cName,
          selected_model: m.selected_model || m.model_name || '',
          total_height: m.total_height || m.total_len || '',
          dress_length: m.dress_length || m.dress_len || '',
          chest_length: m.chest_length || m.chest_len || '',
          skirt_length: m.skirt_length || m.skirt_len || '',
          sleeve_length: m.sleeve_length || m.sleeve_len || '',
          chest_circ: m.chest_circ || '',
          waist_circ: m.waist_circ || '',
          shoulder_width: m.shoulder_width || m.shoulder_w || '',
          armhole_circ: m.armhole_circ || m.armpit_circ || '',
          neck_circ: m.neck_circ || '',
          comfort_profile: Array.isArray(m.comfort_profile) ? m.comfort_profile : (typeof m.comfort_profile === 'string' && m.comfort_profile ? m.comfort_profile.split(',').map(s=>s.trim()).filter(Boolean) : []),
          sewing_notes: m.sewing_notes || m.notes || '',
          dress_color: m.dress_color || '',
          meas_date: m.meas_date || m.date || (typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : ''),
          event_date: m.event_date || ''
        });
      }
    });

    if (Array.isArray(targetCust.children)) {
      targetCust.children.forEach(ch => {
        const cName = String(ch.child_name || ch.name || '').trim();
        if (cName && !seen.has(cName)) {
          seen.add(cName);
          list.push({ child_name: cName });
        }
      });
    }

    return list;
  }, []);

  return {
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    sortBy,
    setSortBy,
    filteredCustomers,
    stats,
    getKnownPrincesses,
    effectiveOrders
  };
}

window.useCustomersData = useCustomersData;
