// src/features/marketing/hooks/useMarketingActions.js
// ====================================================================
// Hook: useMarketingActions — إجراءات الحملات والمنصات والواجهة
// ====================================================================
const { useState } = React;

function useMarketingActions({
  products, accounts, showToast, fetchAllMarketingData, setLoading
}) {
  // Campaign Form State
  const [campaignName, setCampaignName] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [modelName, setModelName] = useState('');
  const [paymentAccount, setPaymentAccount] = useState('');
  const [objective, setObjective] = useState('مبيعات مباشرة');
  const [budget, setBudget] = useState('');
  const [status, setStatus] = useState('نشط');
  const [startDate, setStartDate] = useState(
    typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10)
  );

  // Weights State
  const [weightsMap, setWeightsMap] = useState({
    like: '', comment: '', save: '', share: '',
    profile_visit: '', message: '', lead: '', order: '',
    hot_lead_min: '', high_intent_min: '', med_intent_min: '', low_intent_min: ''
  });

  // AI Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'أهلاً بك! أنا مدير التسويق والذكاء الاصطناعي 🚀 يسعدني إجابتك على أي سؤال يخص الأرقام، المبيعات، المنتجات الأكثر تحويلاً، الإعلانات، وتوصيات المحتوى القادم.' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  const handleSubmitCampaign = async (e) => {
    e.preventDefault();
    if (!campaignName.trim()) return showToast('اسم الحملة مطلوب ⚠️', 'error');
    if (!budget) return showToast('الميزانية مطلوبة ⚠️', 'error');
    setLoading(true);
    const selectedProd = (products || []).find(p => p.name === modelName);
    const payload = {
      campaign_name: campaignName.trim(),
      platform,
      product_id: selectedProd ? selectedProd.id : null,
      payment_account: paymentAccount || '604 - مصاريف التسويق والإعلانات الممولة',
      objective,
      budget: parseFloat(budget) || 0,
      start_date: startDate,
      status
    };
    try {
      const res = await window.marketingAPI.saveCampaign(payload);
      if (res.success) {
        showToast(res.message || 'تم إطلاق وتسجيل الحملة بنجاح');
        fetchAllMarketingData();
        setCampaignName('');
        setBudget('');
      } else {
        showToast('خطأ: ' + (res.error || res.message), 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlatform = async (platName, currentStatus) => {
    const nextStatus = currentStatus === 'connected' ? 'disconnected' : 'connected';
    try {
      const res = await window.marketingAPI.updatePlatformStatus({
        platform_name: platName,
        status: nextStatus,
        account_name: `@erp_brand_${platName.toLowerCase()}`
      });
      if (res.success) { showToast(res.message); fetchAllMarketingData(); }
    } catch (e) { showToast('تعذر تغيير حالة المنصة', 'error'); }
  };

  const handleOAuthConnect = (platName) => {
    fetch(`/api/oauth/${platName.toLowerCase()}/authorize`)
      .then(r => r.json())
      .then(res => {
        if (res.oauth_url) {
          window.open(res.oauth_url, '_blank', 'width=600,height=700');
          showToast(`تم فتح توثيق OAuth الرسمي لمنصة ${platName}`);
        }
      });
  };

  const handleTriggerSync = async () => {
    setLoading(true);
    try {
      const res = await window.marketingAPI.triggerSync();
      if (res.success) { showToast(res.message); fetchAllMarketingData(); }
    } catch (e) { showToast('فشل المزامنة', 'error'); }
    finally { setLoading(false); }
  };

  const handleApproveRec = async (recId) => {
    try {
      const res = await window.marketingAPI.approveRecommendation(recId);
      if (res.success) { showToast(res.message); fetchAllMarketingData(); }
    } catch (e) { showToast('تعذر تأكيد الموافقة', 'error'); }
  };

  const handleSaveWeights = async () => {
    try {
      const res = await window.marketingAPI.updateWeights(weightsMap);
      if (res.success) { showToast(res.message); fetchAllMarketingData(); }
    } catch (e) { showToast('فشل حفظ الأوزان', 'error'); }
  };

  const handleSendAIChat = async (queryText) => {
    const q = queryText || chatInput;
    if (!q.trim()) return;
    const userMsg = { sender: 'user', text: q.trim() };
    setChatMessages(prev => [...prev, userMsg]);
    if (!queryText) setChatInput('');
    setChatLoading(true);
    try {
      const res = await window.marketingAPI.askAIChat(q.trim());
      if (res.success) {
        setChatMessages(prev => [...prev, { sender: 'ai', text: res.answer, source: res.data_source }]);
      } else {
        showToast('خطأ في إجابة الذكاء الاصطناعي', 'error');
      }
    } catch (e) {
      showToast('تعذر الاتصال بمحرك الذكاء الاصطناعي', 'error');
    } finally {
      setChatLoading(false);
    }
  };

  return {
    campaignName, setCampaignName, platform, setPlatform,
    modelName, setModelName, paymentAccount, setPaymentAccount,
    objective, setObjective, budget, setBudget,
    status, setStatus, startDate, setStartDate,
    weightsMap, setWeightsMap,
    chatInput, setChatInput, chatMessages, chatLoading,
    handleSubmitCampaign, handleTogglePlatform, handleOAuthConnect,
    handleTriggerSync, handleApproveRec, handleSaveWeights, handleSendAIChat
  };
}

window.useMarketingActions = useMarketingActions;
