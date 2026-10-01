// useHRData.js - Hook لجلب بيانات الموارد البشرية
// يتضمن: العمولات، ملخصات الخياطين، السلف

const { useState, useEffect } = React;

function useHRData({ activeTab, payrollMonth }) {
  const [commissions, setCommissions] = useState([]);
  const [tailorSummaries, setTailorSummaries] = useState([]);
  const [selectedTailorForPieces, setSelectedTailorForPieces] = useState(null);
  const [tailorPieces, setTailorPieces] = useState([]);
  const [loadingPieces, setLoadingPieces] = useState(false);
  const [advances, setAdvances] = useState([]);
  const [loadingAdvances, setLoadingAdvances] = useState(false);

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

  const handleOpenPiecesModal = async (tailor, showToast) => {
    setSelectedTailorForPieces(tailor);
    setLoadingPieces(true);
    try {
      const res = await fetch(
        `/api/hr/tailor-pieces?employee_name=${encodeURIComponent(tailor.employee_name)}&status=unpaid`
      ).then(r => r.json());
      if (res && res.success) {
        setTailorPieces(res.data || []);
      }
    } catch (e) {
      if (showToast) showToast("تعذر جلب كشف القطع ⚠️", "error");
    } finally {
      setLoadingPieces(false);
    }
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
    advances,
    setAdvances,
    loadingAdvances,
    setLoadingAdvances,
    loadCommissions,
    loadTailorSummaries,
    loadAdvances,
    handleOpenPiecesModal,
  };
}
