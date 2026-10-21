// src/features/quality/hooks/useQualityStationData.js
// إدارة حالة طابور الفحص الفني ومؤشرات الجودة المؤسسية (Telemetry & Inspection Queue State)

const { useState, useEffect, useMemo, useCallback } = React;

function useQualityStationData(props = {}) {
  const { factory = [], orders = [], customers = [] } = props;
  const [activeGate, setActiveGate] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [apiMetrics, setApiMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // طابور الفحص الفني التشغيلي (مدمج مع أوامر التصنيع الحقيقية)
  const [queue, setQueue] = useState([]);

  // مزامنة الأوامر الفعلية في المعمل والمرتبطة بطلبات وعملاء حقيقيين فقط
  useEffect(() => {
    if (!factory || factory.length === 0) {
      setQueue([]);
      return;
    }

    const activeCustomers = (customers || []).filter(c => c && (c.id || c.name || c.customer_name));
    const realCustomerIds = new Set(
      activeCustomers.map(c => String(c.id || c.customer_id || '').trim().toLowerCase()).filter(Boolean)
    );
    const realCustomerNames = new Set(
      activeCustomers.map(c => String(c.name || c.customer_name || '').trim().toLowerCase()).filter(Boolean)
    );
    const realOrders = (orders || []).filter(o => {
      const ocId = String(o.customer_id || '').trim().toLowerCase();
      const ocName = String(o.customer_name || o.customer || '').trim().toLowerCase();
      return (ocId && realCustomerIds.has(ocId)) || (ocName && realCustomerNames.has(ocName));
    });
    const realOrderNos = new Set(
      realOrders.map(o => String(o.order_no || o.id || o.order_id || '').trim().toLowerCase()).filter(Boolean)
    );

    const mapped = factory
      .filter(f => {
        if (!f || !f.stage) return false;
        if (!(f.stage.includes('فحص') || f.stage.includes('خياط') || f.stage.includes('تسليم'))) {
          return false;
        }

        const orderNo = String(f.order_no || f.order_id || f.id || '').trim().toLowerCase();
        const custId = String(f.customer_id || '').trim().toLowerCase();
        const custName = String(f.customer || f.customer_name || '').trim().toLowerCase();

        // استبعاد قاطع لأي سجلات لا تنتمي لعميل مسجل حقيقي
        const isCustomerValid = (custId && realCustomerIds.has(custId)) || (custName && realCustomerNames.has(custName));
        const isOrderValid = orderNo && (
          realOrderNos.has(orderNo) || 
          realOrderNos.has(orderNo.replace(/^po-/, '')) || 
          realOrderNos.has(orderNo.replace(/^prd-/, ''))
        );

        if (realCustomerNames.size > 0 || realCustomerIds.size > 0) {
          if (!isCustomerValid && !isOrderValid) return false;
        } else {
          if (!custName && !custId) return false;
        }
        return true;
      })
      .map(f => {
        const isFinal = f.stage.includes('فحص') || f.stage.includes('تسليم');
        const matchedOrder = (orders || []).find(o => {
          const ono = String(o.order_no || o.id || '').trim().toLowerCase();
          const fno = String(f.order_no || f.order_id || f.id || '').trim().toLowerCase();
          return ono === fno || fno.includes(ono) || ono.includes(fno);
        });

        const resolvedCustomer = f.customer || f.customer_name || matchedOrder?.customer_name || matchedOrder?.customer || '—';
        const resolvedChild = f.child_name || matchedOrder?.child_name || '—';
        const resolvedProduct = f.product || f.product_name || matchedOrder?.product_name || matchedOrder?.product || 'فستان تفصيل';

        return {
          id: `QC-${f.order_no || f.id}`,
          order_no: f.order_no || f.id,
          product_name: resolvedProduct,
          child_name: resolvedChild,
          customer_name: resolvedCustomer,
          tailor_name: f.tailor || f.tailor_name || '',
          gate_id: isFinal ? 'final' : 'in_process',
          gate_title: isFinal ? 'اعتماد نهائي 👑' : 'تجميع وخياطة 🪡',
          status: f.tailor_status === 'rework' ? 'rework' : (f.tailor_status === 'approved' ? 'passed' : 'pending'),
          status_label: f.tailor_status === 'rework' ? 'مطلوب تعديل ✂️' : (f.tailor_status === 'approved' ? 'مجاز ومعتمد ✓' : 'بانتظار الفحص'),
          created_time: 'اليوم',
          priority: 'عادي'
        };
      });

    setQueue(mapped);
  }, [factory, orders, customers]);

  // جلب إحصائيات الجودة الخلفية
  const fetchDashboardStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/quality/dashboard');
      if (res.ok) {
        const json = await res.json();
        if (json && json.data) setApiMetrics(json.data);
      }
    } catch (_err) {
      // Graceful fallback to local queue calculations
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // احتساب مؤشرات الأداء (KPIs)
  const kpis = useMemo(() => {
    const pendingCount = queue.filter(q => q.status === 'pending').length;
    const reworkCount = queue.filter(q => q.status === 'rework').length;
    const passedCount = queue.filter(q => q.status === 'passed').length;
    const totalProcessed = passedCount + reworkCount;
    const fpy = totalProcessed > 0 ? ((passedCount / totalProcessed) * 100).toFixed(1) : (apiMetrics?.fpy || 98.4);
    const copqAmount = reworkCount * 2500; // تكلفة وقت الخياط والهدر

    return {
      pending: pendingCount,
      fpy: `${fpy}%`,
      rework: reworkCount,
      copq: `${copqAmount.toLocaleString()} ريال`,
      totalInspections: queue.length
    };
  }, [queue, apiMetrics]);

  // الاستماع لتحديثات الجودة لحذف الطلبات المجازة فوراً من الطابور التشغيلي
  useEffect(() => {
    const handleQcUpdate = (e) => {
      const detail = e?.detail || {};
      const targetId = String(detail.orderId || detail.order_no || '').replace(/^#/, '').trim().toLowerCase();
      if (!targetId || detail.status !== 'passed') return;
      setQueue(prev => prev.filter(q => {
        const qNo = String(q.order_no || q.id || '').replace(/^#/, '').trim().toLowerCase();
        return qNo !== targetId;
      }));
    };
    window.addEventListener('order_qc_updated', handleQcUpdate);
    return () => window.removeEventListener('order_qc_updated', handleQcUpdate);
  }, []);

  // تصفية الطابور حسب البوابة والبحث (مع استبعاد الطلبات المعتمدة)
  const filteredQueue = useMemo(() => {
    return queue.filter(item => {
      if (item.status === 'passed') return false;
      const matchGate = activeGate === 'all' || item.gate_id === activeGate;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery = !q ||
        item.order_no.toLowerCase().includes(q) ||
        item.product_name.toLowerCase().includes(q) ||
        item.child_name.toLowerCase().includes(q) ||
        item.tailor_name.toLowerCase().includes(q);
      return matchGate && matchQuery;
    });
  }, [queue, activeGate, searchQuery]);

  return {
    queue, setQueue,
    filteredQueue,
    activeGate, setActiveGate,
    searchQuery, setSearchQuery,
    selectedInspection, setSelectedInspection,
    kpis,
    isLoading,
    refreshStats: fetchDashboardStats
  };
}

window.useQualityStationData = useQualityStationData;
