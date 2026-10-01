// src/features/customers/hooks/useCustomersData.js
const { useState, useEffect, useMemo, useCallback } = React;

function useCustomersData({ customers = [], setCustomers, orders = [] }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  // جلب العملاء تلقائياً من الخادم إذا كانت القائمة فارغة
  useEffect(() => {
    if ((!customers || customers.length === 0) && typeof setCustomers === 'function') {
      fetch('/api/crm/customers')
        .then(r => r.json())
        .then(d => {
          const list = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : (d?.customers || []));
          if (list.length > 0) setCustomers(list);
        })
        .catch(err => console.warn('Customers auto-fetch notice:', err));
    }
  }, [customers, setCustomers]);

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

    const getCustRem = (c) => {
      if (!c) return 0;
      const cid = String(c.customer_id || c.id || '');
      const cName = String(c.name || c.customer_name || '').trim();
      const ord = (orders || []).find(o => (o.customer_id && String(o.customer_id) === cid) || (o.customer_name && String(o.customer_name).trim() === cName));
      if (ord) return Math.max(0, Number(ord.total_price || ord.total_amount || 0) - Number(ord.paid_amount || 0));
      return parseFloat(c.ledger?.remaining ?? c.remaining ?? c.current_balance ?? 0);
    };

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
  }, [customers, search, categoryFilter, sortBy, orders]);

  // إحصائيات لوحة العملاء الفورية
  const stats = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];
    const total = list.length;
    let active = 0;
    let newCount = 0;
    let vipCount = 0;
    let totalReceivables = 0;

    const getCustRem = (c) => {
      if (!c) return 0;
      const cid = String(c.customer_id || c.id || '');
      const cName = String(c.name || c.customer_name || '').trim();
      const ord = (orders || []).find(o => (o.customer_id && String(o.customer_id) === cid) || (o.customer_name && String(o.customer_name).trim() === cName));
      if (ord) return Math.max(0, Number(ord.total_price || ord.total_amount || 0) - Number(ord.paid_amount || 0));
      return parseFloat(c.ledger?.remaining ?? c.remaining ?? c.current_balance ?? 0);
    };

    list.forEach(c => {
      const cat = c.category || 'جديد';
      if (cat === 'VIP') vipCount++;
      else if (cat === 'دائم') active++;
      else newCount++;

      const rem = getCustRem(c);
      if (rem > 0) totalReceivables += rem;
    });

    // حساب الطلبات قيد الانتظار للعملاء
    const pendingOrders = (orders || []).filter(o => {
      const st = String(o.status || o.production_status || '');
      return !st.includes('تم التسليم') && !st.includes('مكتمل') && !st.includes('ملغي');
    }).length;

    return {
      total,
      active: active + vipCount,
      newCount,
      vipCount,
      pendingOrders,
      totalReceivables
    };
  }, [customers, orders]);

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
    getKnownPrincesses
  };
}

window.useCustomersData = useCustomersData;
