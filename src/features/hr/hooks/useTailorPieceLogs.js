// useTailorPieceLogs.js - Hook جلب كشف القطع التفصيلي غير المصفّى للفني الحرفي
// مكافئ استعلام Supabase:
//   piece_rate_logs (id, worker_id, production_order_id, stage_name, piece_rate_amount, payment_status, completed_at)
//     ⨝ production_orders (id, order_number, product_name)
//     ⨝ order_stages (id, qa_status)
//   WHERE worker_id = :selectedWorkerId AND payment_status = 'pending'
// يُنفَّذ الربط على PostgreSQL عبر طبقة Flask (/api/hr/piece-rate-logs) دون كشف مفاتيح قاعدة البيانات للمتصفح.

// توحيد شكل السجل: حقول مسطحة (للتوافق مع الواجهات القائمة) + كائنات متداخلة بنفس عقد Supabase
function normalizeTailorPieceLog(row) {
  const r = row || {};
  const po = r.production_orders || {};
  const stg = r.order_stages || {};
  const orderNo = po.order_number || r.production_order_no || r.order_no || r.production_order_id || '—';
  const productName = po.product_name || r.product_name || r.child_name || 'تفصيل مخصص';
  const qaStatus = String(stg.qa_status || r.qa_status || 'approved').toLowerCase();
  const isPaid = r.payment_status === 'paid' || !!r.paid_at || r.status === 'Paid';
  const amount = parseFloat(r.piece_rate_amount != null ? r.piece_rate_amount : (r.wage_amount || 0)) || 0;

  return {
    ...r,
    production_order_no: orderNo,
    product_name: productName,
    stage_name: r.stage_name || r.stage || 'خياطة',
    qa_status: qaStatus,
    piece_rate_amount: amount,
    payment_status: r.payment_status || (isPaid ? 'paid' : 'pending'),
    production_orders: { id: po.id || r.production_order_id || null, order_number: orderNo, product_name: productName },
    order_stages: { id: stg.id || r.stage_id || null, qa_status: qaStatus },
  };
}

async function fetchHRJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// جلب سجلات القطع للفني مع مسارات احتياطية (بالاسم ثم الواجهة القديمة tailor-pieces)
async function fetchTailorPieceLogs(worker, options) {
  const pendingOnly = !options || options.pendingOnly !== false;
  const workerId = (worker && (worker.employee_id || worker.id)) || '';
  const workerName = (worker && (worker.employee_name || worker.name)) || '';

  const queryLogs = async (key) => {
    const qs = new URLSearchParams({ worker_id: key });
    if (pendingOnly) qs.set('payment_status', 'pending');
    const res = await fetchHRJson(`/api/hr/piece-rate-logs?${qs.toString()}`);
    return res && res.success && Array.isArray(res.data) ? res.data : [];
  };

  let rows = await queryLogs(workerId || workerName);
  if (rows.length === 0 && workerId && workerName && workerName !== workerId) {
    rows = await queryLogs(workerName);
  }

  if (rows.length === 0 && workerName) {
    const legacyUrl = (status) => `/api/hr/tailor-pieces?employee_name=${encodeURIComponent(workerName)}&status=${status}`;
    const legacy = await fetchHRJson(legacyUrl(pendingOnly ? 'unpaid' : 'all'));
    if (legacy && legacy.success && Array.isArray(legacy.data) && legacy.data.length > 0) {
      rows = legacy.data;
    } else if (pendingOnly) {
      const legacyAll = await fetchHRJson(legacyUrl('all'));
      if (legacyAll && legacyAll.success && Array.isArray(legacyAll.data)) rows = legacyAll.data;
    }
  }

  return rows.map(normalizeTailorPieceLog);
}

function useTailorPieceLogs() {
  const [selectedWorker, setSelectedWorker] = React.useState(null);
  const [logs, setLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const requestRef = React.useRef(0);

  // فتح الكشف لفني محدد: statusFilter = 'all' يعرض كامل السجل (للمسيرات المصروفة)
  const openForWorker = React.useCallback(async (worker, showToast) => {
    if (!worker) return;
    const reqId = ++requestRef.current;
    setSelectedWorker(worker);
    setLogs([]);
    setError(null);
    setLoading(true);
    try {
      const pendingOnly = (worker.statusFilter || 'unpaid') !== 'all';
      const rows = await fetchTailorPieceLogs(worker, { pendingOnly });
      if (reqId === requestRef.current) setLogs(rows);
    } catch (e) {
      if (reqId === requestRef.current) {
        setError(e && e.message ? e.message : 'تعذر جلب كشف القطع');
        if (showToast) showToast("تعذر جلب كشف القطع ⚠️", "error");
      }
    } finally {
      if (reqId === requestRef.current) setLoading(false);
    }
  }, []);

  const close = React.useCallback(() => {
    requestRef.current++;
    setSelectedWorker(null);
    setLogs([]);
    setError(null);
    setLoading(false);
  }, []);

  const reload = React.useCallback((showToast) => {
    if (selectedWorker) return openForWorker(selectedWorker, showToast);
  }, [selectedWorker, openForWorker]);

  return { selectedWorker, setSelectedWorker, logs, loading, error, openForWorker, close, reload };
}

window.useTailorPieceLogs = useTailorPieceLogs;
window.HRUseTailorPieceLogs = useTailorPieceLogs;
window.HRTailorPieceLogsUtils = { fetchTailorPieceLogs, normalizeTailorPieceLog };
