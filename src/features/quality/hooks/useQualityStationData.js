// src/features/quality/hooks/useQualityStationData.js
// إدارة حالة طابور الفحص الفني ومؤشرات الجودة المؤسسية (Telemetry & Inspection Queue State)

const { useState, useEffect, useMemo, useCallback } = React;

function useQualityStationData(props = {}) {
  const { factory = [], orders = [] } = props;
  const [activeGate, setActiveGate] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [apiMetrics, setApiMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // طابور الفحص الفني التشغيلي (مدمج مع أوامر التصنيع الحقيقية)
  const [queue, setQueue] = useState([]);

  // مزامنة الأوامر الفعلية في المعمل مع طابور الفحص
  useEffect(() => {
    if (!factory || factory.length === 0) return;
    const mapped = factory.filter(f => f.stage && (f.stage.includes('فحص') || f.stage.includes('خياط') || f.stage.includes('تسليم'))).map(f => {
      const isFinal = f.stage.includes('فحص') || f.stage.includes('تسليم');
      return {
        id: `QC-${f.order_no || f.id}`,
        order_no: f.order_no || f.id,
        product_name: f.product || f.product_name || '',
        child_name: f.child_name || '',
        customer_name: f.customer || f.customer_name || '',
        tailor_name: f.tailor || f.tailor_name || '',
        gate_id: isFinal ? 'final' : 'in_process',
        gate_title: isFinal ? 'اعتماد نهائي 👑' : 'تجميع وخياطة 🪡',
        status: f.tailor_status === 'rework' ? 'rework' : (f.tailor_status === 'approved' ? 'passed' : 'pending'),
        status_label: f.tailor_status === 'rework' ? 'مطلوب تعديل ✂️' : (f.tailor_status === 'approved' ? 'مجاز ومعتمد ✓' : 'بانتظار الفحص'),
        created_time: 'اليوم',
        priority: 'عادي'
      };
    });
    if (mapped.length > 0) {
      setQueue(prev => {
        const existingNos = new Set(prev.map(p => p.order_no));
        const newOnes = mapped.filter(m => !existingNos.has(m.order_no));
        return [...prev, ...newOnes];
      });
    }
  }, [factory]);

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
