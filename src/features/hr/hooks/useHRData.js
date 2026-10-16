// useHRData.js - Hook لجلب بيانات الموارد البشرية
// يتضمن: العمولات، ملخصات الخياطين، السلف

const { useState, useEffect } = React;

// بديل آمن في حال تعذر تحميل useTailorPieceLogs.js (يحافظ على ترتيب الخطافات)
function useHRPieceLogsFallback() {
  const [selectedWorker, setSelectedWorker] = useState(null);
  return { selectedWorker, setSelectedWorker, logs: [], loading: false, error: null,
    openForWorker: async (w) => setSelectedWorker(w), close: () => setSelectedWorker(null) };
}

function useHRData({ activeTab, payrollMonth }) {
  const [commissions, setCommissions] = useState([]);
  const [tailorSummaries, setTailorSummaries] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [loadingAdvances, setLoadingAdvances] = useState(false);

  // كشف القطع التفصيلي المربوط بأوامر التشغيل ومراحل الجودة
  const usePieceLogs = window.useTailorPieceLogs || useHRPieceLogsFallback;
  const pieceLogs = usePieceLogs();
  const selectedTailorForPieces = pieceLogs.selectedWorker;
  const tailorPieces = pieceLogs.logs;
  const loadingPieces = pieceLogs.loading;
  const piecesError = pieceLogs.error;
  const setSelectedTailorForPieces = (worker) => (worker ? pieceLogs.setSelectedWorker(worker) : pieceLogs.close());

  const loadCommissions = async () => {
    try {
      const res = await fetch('/api/hr/commissions').then(r => r.json());
      if (res && res.success) {
        setCommissions(res.data || []);
      }
    } catch (e) {}
  };

  const loadTailorSummaries = async () => {
    try {
      const res = await fetch('/api/hr/tailors-summary').then(r => r.json());
      if (res && res.success) {
        setTailorSummaries(res.data || []);
      }
    } catch (e) {}
  };

  const loadAdvances = (month) => {
    if (window.hrAPI && window.hrAPI.getAdvances) {
      setLoadingAdvances(true);
      window.hrAPI.getAdvances(month)
        .then(d => setAdvances(d || []))
        .finally(() => setLoadingAdvances(false));
    }
  };

  const handleOpenPiecesModal = (tailor, showToast) => pieceLogs.openForWorker(tailor, showToast);

  const handleLiquidatePieces = async (workerId, itemIds) => {
    const res = await fetch('/api/hr/liquidate-pieces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: workerId, item_ids: itemIds })
    }).then(r => r.json());
    if (res && res.success) {
      await loadCommissions();
      await loadTailorSummaries();
      setSelectedTailorForPieces(null);
      return res;
    }
    throw new Error(res?.message || 'فشلت عملية الصرف');
  };


  // التحميل الأولي
  useEffect(() => {
    loadCommissions();
    loadTailorSummaries();
    if (window.hrAPI && window.hrAPI.getAdvances) {
      window.hrAPI.getAdvances().then(d => setAdvances(d || []));
    }
  }, []);

  // إعادة التحميل عند تغيير التبويب
  useEffect(() => {
    if (activeTab === 'commissions') {
      loadCommissions();
      loadTailorSummaries();
    } else if (activeTab === 'advances') {
      loadAdvances(payrollMonth);
    }
  }, [activeTab, payrollMonth]);

  return {
    commissions,
    setCommissions,
    tailorSummaries,
    setTailorSummaries,
    selectedTailorForPieces,
    setSelectedTailorForPieces,
    tailorPieces,
    loadingPieces,
    piecesError,
    advances,
    setAdvances,
    loadingAdvances,
    setLoadingAdvances,
    loadCommissions,
    loadTailorSummaries,
    loadAdvances,
    handleOpenPiecesModal,
    handleLiquidatePieces,
  };
}

window.useHRData = useHRData;

