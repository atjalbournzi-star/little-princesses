// src/features/dashboard/hooks/useDashboardActions.js
// خطاف إدارة إجراءات وأحداث لوحة التحكم والرادار الذكي والتنقل السريع
const { useState, useEffect, useCallback } = React;

function useDashboardActions({ setActiveTab } = {}) {
  const [timeHorizon, setTimeHorizon] = useState('all');
  const [trendMode, setTrendMode] = useState('daily');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [watchdogData, setWatchdogData] = useState(null);

  // جلب بيانات رادار المشغل والتحديث التلقائي عند تغير الطلبيات
  useEffect(() => {
    let isMounted = true;
    const fetchWatchdog = async () => {
      try {
        const res = await fetch('/api/atelier/watchdog');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && isMounted) {
            setWatchdogData(data.data);
          }
        }
      } catch (e) {
        // تجاهل أخطاء الشبكة المؤقتة في وضع عدم الاتصال
      }
    };

    fetchWatchdog();
    const handleRefresh = () => fetchWatchdog();
    window.addEventListener('erp:ordersChanged', handleRefresh);
    window.addEventListener('erp:alterationChanged', handleRefresh);

    return () => {
      isMounted = false;
      window.removeEventListener('erp:ordersChanged', handleRefresh);
      window.removeEventListener('erp:alterationChanged', handleRefresh);
    };
  }, []);

  // إرسال تذكير واتساب لمواعيد البروفة والتسليم
  const handleSendWhatsApp = useCallback((phone, orderNo) => {
    if (!phone) return;
    const cleanPhone = String(phone).replace(/[^0-9]/g, '');
    const msg = `أهلاً بكِ في مشغل الأميرات الصغيرات 👑\nنود تذكيركِ بموعد تسليم/بروفة فستانكِ الراقي (طلب #${orderNo || ''}) اليوم. يسعدنا تشريفكِ!`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  // التنقل السريع للأقسام
  const navigateTo = useCallback((tabName) => {
    if (typeof setActiveTab === 'function') {
      setActiveTab(tabName);
    }
  }, [setActiveTab]);

  return {
    timeHorizon,
    setTimeHorizon,
    trendMode,
    setTrendMode,
    hoveredPoint,
    setHoveredPoint,
    watchdogData,
    handleSendWhatsApp,
    navigateTo
  };
}

if (typeof window !== 'undefined') {
  window.useDashboardActions = useDashboardActions;
}
