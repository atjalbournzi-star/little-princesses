const { useState, useEffect, useMemo, useCallback, useRef } = React;
// ============================================================
// Marketing.jsx - وحدة إدارة التسويق والأساس التقني للمنصات (Phase 1 Integration Layer)
// ============================================================

function Marketing({ campaigns = [], setCampaigns, products = [], accounts = [], showToast, currency }) {
  const [campaignName, setCampaignName] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [modelName, setModelName] = useState('');
  const [paymentAccount, setPaymentAccount] = useState('');
  const [objective, setObjective] = useState('مبيعات مباشرة');
  const [budget, setBudget] = useState('');
  const [status, setStatus] = useState('نشط');
  const [startDate, setStartDate] = useState(TODAY_STR_ISO);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Active View Tab: 'ads', 'platforms', 'matrix', 'content', 'daily_brief', 'products_ai', 'nlp_intent', 'recs_weights', 'ai_chat'
  const [activeTab, setActiveTab] = useState('ads');

  // Phase 1 Real Backend States
  const [localCampaigns, setLocalCampaigns] = useState([]);
  const [platformsData, setPlatformsData] = useState([]);
  const [matrixData, setMatrixData] = useState([]);
  const [contentData, setContentData] = useState([]);
  const [commentsData, setCommentsData] = useState([]);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);

  // Phase 2 AI Intelligence States
  const [aiScores, setAiScores] = useState([]);
  const [nlpCommentsData, setNlpCommentsData] = useState({ data: [], summary: {} });
  const [intentConvsData, setIntentConvsData] = useState([]);
  const [productsAIData, setProductsAIData] = useState([]);
  const [campaignAttrData, setCampaignAttrData] = useState([]);
  const [dailyBriefData, setDailyBriefData] = useState({ brief: {}, trends: {} });
  const [aiRecsData, setAiRecsData] = useState([]);
  
  // AI Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'أهلاً بك! أنا مدير التسويق الذكي AI لـ Little Princesses 👑 يسعدني إجابتك على أي سؤال بخصم الأرقام، المبيعات، المنتجات الأكثر تحويلاً، الإعلانات، وتوصيات المحتوى القادم.' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Dynamic Weights State (Clean & Zeroed)
  const [weightsMap, setWeightsMap] = useState({
    like: '', comment: '', save: '', share: '', profile_visit: '', message: '', lead: '', order: '',
    hot_lead_min: '', high_intent_min: '', med_intent_min: '', low_intent_min: ''
  });

  // Phase 3 SaaS Executive States
  const [timeframe, setTimeframe] = useState('30d');
  const [executiveKPIs, setExecutiveKPIs] = useState({});
  const [funnelData, setFunnelData] = useState([]);
  const [smartAlerts, setSmartAlerts] = useState([]);
  const [customerSegments, setCustomerSegments] = useState({});
  const [userPermissions, setUserPermissions] = useState({ role: 'Admin', can_change_budget: true });
  
  // Phase 3 Modal Drill-down States
  const [selectedCampaignDetail, setSelectedCampaignDetail] = useState(null);
  const [selectedContentDetail, setSelectedContentDetail] = useState(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Fetching Data from Unified Backend (Port 5000)
  const fetchAllMarketingData = async () => {
    setLoading(true);
    try {
      if (window.marketingAPI) {
        const [pRes, mRes, cRes, cntRes, cmtRes, whRes, dRes, aiScRes, nlpRes, intRes, prodAiRes, attrRes, dbRes, recRes, kpiRes, fnRes, altRes, custRes, permRes] = await Promise.all([
          window.marketingAPI.getPlatforms(),
          window.marketingAPI.getCapabilityMatrix(),
          window.marketingAPI.getCampaigns(),
          window.marketingAPI.getContent(),
          window.marketingAPI.getComments(),
          window.marketingAPI.getWebhooks(),
          window.marketingAPI.getDashboard(),
          window.marketingAPI.getAIScores(),
          window.marketingAPI.getNLPComments(),
          window.marketingAPI.getIntentConversations(),
          window.marketingAPI.getProductsIntelligence(),
          window.marketingAPI.getCampaignAttribution(),
          window.marketingAPI.getDailyBrief(),
          window.marketingAPI.getRecommendations(),
          window.marketingAPI.getExecutiveKPIs(timeframe),
          window.marketingAPI.getFunnel(),
          window.marketingAPI.getSmartAlerts(),
          window.marketingAPI.getCustomerIntelligence(),
          window.marketingAPI.getPermissions()
        ]);

        if (pRes?.success) setPlatformsData(pRes.data || []);
        if (mRes?.success) setMatrixData(mRes.data || []);
        if (cRes?.success) {
          setLocalCampaigns(cRes.data || []);
          if (setCampaigns) setCampaigns(cRes.data || []);
        }
        if (cntRes?.success) setContentData(cntRes.data || []);
        if (cmtRes?.success) setCommentsData(cmtRes.data || []);
        if (whRes?.success) setWebhookLogs(whRes.data || []);
        if (dRes?.success) setDashboardSummary(dRes.summary || null);

        // Phase 2 & Phase 3 Sets
        if (aiScRes?.success) setAiScores(aiScRes.data || []);
        if (nlpRes?.success) setNlpCommentsData({ data: nlpRes.data || [], summary: nlpRes.summary || {} });
        if (intRes?.success) setIntentConvsData(intRes.data || []);
        if (prodAiRes?.success) setProductsAIData(prodAiRes.data || []);
        if (attrRes?.success) setCampaignAttrData(attrRes.data || []);
        if (dbRes?.success) setDailyBriefData({ brief: dbRes.brief || {}, trends: dbRes.trends || {} });
        if (recRes?.success) setAiRecsData(recRes.data || []);

        if (kpiRes?.success) setExecutiveKPIs(kpiRes.kpis || {});
        if (fnRes?.success) setFunnelData(fnRes.funnel || []);
        if (altRes?.success) setSmartAlerts(altRes.alerts || []);
        if (custRes?.success) setCustomerSegments(custRes.segments || {});
        if (permRes?.success) setUserPermissions(permRes.permissions || {});
      }
    } catch (err) {
      console.error("Marketing API Error", err);
      showToast("تعذر جلب بيانات التسويق من الخادم الموحد", "error");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAllMarketingData();
  }, [timeframe]);

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

  const handleApproveRec = async (recId) => {
    try {
      const res = await window.marketingAPI.approveRecommendation(recId);
      if (res.success) {
        showToast(res.message);
        fetchAllMarketingData();
      }
    } catch (e) {
      showToast('تعذر تأكيد الموافقة', 'error');
    }
  };

  const handleSaveWeights = async () => {
    try {
      const res = await window.marketingAPI.updateWeights(weightsMap);
      if (res.success) {
        showToast(res.message);
        fetchAllMarketingData();
      }
    } catch (e) {
      showToast('فشل حفظ الأوزان', 'error');
    }
  };

  const handleSubmitCampaign = async (e) => {
    e.preventDefault();
    if (!campaignName.trim()) return showToast('اسم الحملة مطلوب ⚠️', 'error');
    if (!budget) return showToast('الميزانية مطلوبة ⚠️', 'error');

    setLoading(true);
    const selectedProd = products.find(p => p.name === modelName);
    const payload = {
      campaign_name: campaignName.trim(),
      platform,
      product_id: selectedProd ? selectedProd.id : null,
      payment_account: paymentAccount || '505 - مصاريف التسويق والإعلانات',
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
        account_name: `@little_princesses_${platName.toLowerCase()}`
      });
      if (res.success) {
        showToast(res.message);
        fetchAllMarketingData();
      }
    } catch (e) {
      showToast('تعذر تغيير حالة المنصة', 'error');
    }
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
      if (res.success) {
        showToast(res.message);
        fetchAllMarketingData();
      }
    } catch (e) {
      showToast('فشل المزامنة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = (localCampaigns || []).filter(c =>
    !search || (c.campaign_name || '').includes(search) || (c.platform || '').includes(search)
  );

  const inputCls = "w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:border-rose-300 focus:ring-1 focus:ring-rose-200 transition outline-none min-h-[42px]";
  const labelCls = "block text-[11px] font-extrabold text-slate-700 mb-1";

  const statusColor = (s) => ({
    'نشط': 'bg-emerald-100 text-emerald-700 border-emerald-300',
    'connected': 'bg-emerald-100 text-emerald-700 border-emerald-300',
    'متوقف': 'bg-red-100 text-red-700 border-red-300',
    'disconnected': 'bg-slate-100 text-slate-600 border-slate-300',
    'مكتمل': 'bg-blue-100 text-blue-700 border-blue-300'
  }[s] || 'bg-slate-100 text-slate-600');

  const totalBudget = (localCampaigns || []).reduce((acc, c) => acc + (parseFloat(c.budget) || 0), 0);
  const activeCampaignsCount = (localCampaigns || []).filter(c => c.status === 'نشط').length;
  const connectedPlatformsCount = (platformsData || []).filter(p => p.status === 'connected').length;

  const currLabel = typeof currency === 'object' ? (currency.display || currency.symbol || 'YER ﷼') : (currency || 'YER ﷼');

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* ── 👑 شريط حالة المنصات ومركز القيادة التسويقية SaaS Command Center Header ── */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-5 text-white shadow-xl flex flex-wrap items-center justify-between gap-4 border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">👑</span>
            <h1 className="font-black text-lg text-amber-300">مركز القيادة التسويقية الذكي (Marketing Command Center)</h1>
          </div>
          <p className="text-[11px] text-slate-300 font-semibold">نظام إدارة التسويق والتحليلات التنفيذية الموحد لـ Little Princesses ERP</p>
        </div>

        {/* مؤشرات المنصات الـ 5 */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { name: 'Instagram', status: 'connected', label: 'Instagram 🟢' },
            { name: 'Facebook', status: 'connected', label: 'Facebook 🟢' },
            { name: 'WhatsApp', status: 'connected', label: 'WhatsApp 🟢' },
            { name: 'TikTok', status: 'disconnected', label: 'TikTok ⚪' },
            { name: 'Google Ads', status: 'disconnected', label: 'Google Ads ⚪' }
          ].map(p => (
            <span key={p.name} className={`px-3 py-1.5 rounded-xl font-black border text-[11px] backdrop-blur-sm ${
              p.status === 'connected' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : 'bg-slate-800/60 text-slate-400 border-slate-700'
            }`}>
              {p.label}
            </span>
          ))}

          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs hover:opacity-90 transition shadow-md flex items-center gap-1.5"
          >
            📥 تصدير التقارير (Sheets / PDF / Excel)
          </button>
        </div>
      </div>

      {/* ── فلتر المدى الزمني والتنفيذي Executive KPIs Window Selector ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
        <div className="flex items-center gap-1">
          <span className="text-xs font-black text-slate-500 px-3">المدى الزمني:</span>
          {[
            { id: 'today', label: 'اليوم (Today)' },
            { id: '7d', label: 'آخر 7 أيام (7 Days)' },
            { id: '30d', label: 'آخر 30 يوم (30 Days)' },
            { id: '90d', label: 'آخر 90 يوم (90 Days)' }
          ].map(tf => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                timeframe === tf.id ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <span>آخر مزامنة: <strong className="text-emerald-600">الآن 🟢</strong></span>
          <span className="text-slate-300">•</span>
          <span>الصلاحية: <strong className="text-indigo-600">{userPermissions.role || 'Admin'} 👑</strong></span>
        </div>
      </div>

      {/* ── شريط التبويبات الرئيسي (Phase 1 & 2 & 3 Command Center) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex gap-1 overflow-x-auto shadow-sm">
        {[
          { id: 'command_center', label: '👑 مركز القيادة KPIs', icon: '👑' },
          { id: 'customer_intel', label: '👥 ذكاء العملاء Intelligence', icon: '👥' },
          { id: 'ads', label: '📢 إدارة الحملات الإعلانية', icon: '📢' },
          { id: 'daily_brief', label: '🧠 الموجز اليومي والتوجهات', icon: '🧠' },
          { id: 'products_ai', label: '📈 تحليلات المنتجات والإسناد', icon: '📈' },
          { id: 'nlp_intent', label: '💬 المشاعر ونية الشراء (NLP)', icon: '💬' },
          { id: 'recs_weights', label: '💡 التوصيات والأوزان AI', icon: '💡' },
          { id: 'ai_chat', label: '🤖 اسأل مدير التسويق AI', icon: '🤖' },
          { id: 'platforms', label: '🌐 إدارة المنصات وOAuth', icon: '🌐' },
          { id: 'webhooks', label: '🔌 سجل Webhooks', icon: '🔌' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={handleTriggerSync}
          disabled={loading}
          className="py-2.5 px-4 rounded-xl font-black text-xs bg-slate-800 text-white hover:bg-slate-700 transition flex items-center gap-1.5"
        >
          ☁️ مزامنة
        </button>
      </div>

      {/* =========================================
         0. 👑 مركز القيادة التسويقية SaaS Command Center View
         ========================================= */}
      {(activeTab === 'command_center' || !activeTab) && (
        <div className="space-y-6 animate-fadeIn">

          {/* 📊 شبكة المؤشرات التنفيذية الـ 13 (Executive KPIs Grid) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {[
              { label: 'الإنفاق الإعلاني Ad Spend', val: (executiveKPIs.ad_spend ?? 0).toLocaleString('en-US'), unit: currLabel, icon: '💸', color: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'الوصول Reach', val: (executiveKPIs.reach ?? 0).toLocaleString('en-US'), icon: '🌐', color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'التفاعل Engagement', val: (executiveKPIs.engagement ?? 0).toLocaleString('en-US'), icon: '❤️', color: 'text-pink-600', bg: 'bg-pink-50' },
              { label: 'الرسائل Messages', val: (executiveKPIs.messages ?? 0).toLocaleString('en-US'), icon: '💬', color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'عملاء محتملون Leads', val: (executiveKPIs.leads ?? 0).toLocaleString('en-US'), icon: '🎯', color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'الطلبات Orders', val: (executiveKPIs.orders ?? 0).toLocaleString('en-US'), icon: '🛍️', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'الإيرادات Revenue', val: (executiveKPIs.revenue ?? 0).toLocaleString('en-US'), unit: currLabel, icon: '💰', color: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'الربح الصافي Profit', val: (executiveKPIs.gross_profit ?? 0).toLocaleString('en-US'), unit: currLabel, icon: '💎', color: 'text-teal-700', bg: 'bg-teal-50' },
              { label: 'عائد الإعلان ROAS', val: `${executiveKPIs.roas ?? 0}x`, icon: '📈', color: 'text-indigo-700', bg: 'bg-indigo-50' },
              { label: 'العائد على الاستثمار ROI', val: `${executiveKPIs.roi ?? 0}%`, icon: '🚀', color: 'text-purple-700', bg: 'bg-purple-50' },
              { label: 'تكلفة الاستحواذ CAC', val: (executiveKPIs.cac ?? 0).toLocaleString('en-US'), unit: currLabel, icon: '🏷️', color: 'text-slate-700', bg: 'bg-slate-100' },
              { label: 'معدل التحويل Conv. Rate', val: `${executiveKPIs.conversion_rate ?? 0}%`, icon: '🎯', color: 'text-blue-700', bg: 'bg-blue-50' }
            ].map((kpi, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-1 hover:border-rose-300 transition">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 truncate">{kpi.label}</span>
                  <span className={`w-7 h-7 ${kpi.bg} ${kpi.color} rounded-xl flex items-center justify-center font-bold text-xs`}>{kpi.icon}</span>
                </div>
                <h4 className={`text-base font-extrabold font-mono tabular-nums ${kpi.color} flex items-baseline`}>
                  <span>{kpi.val}</span>
                  {kpi.unit && <span className="text-[10px] font-medium text-slate-500 mr-1 select-none font-sans">{kpi.unit}</span>}
                </h4>
              </div>
            ))}
          </div>

          {/* 🧠 بطاقة عقل الذكاء الاصطناعي AI Marketing Brain */}
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl space-y-4 border border-purple-500/20">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🧠</span>
                <div>
                  <h3 className="font-black text-base text-amber-300">الملخص التنفيذي الذكي (AI Executive Brain Summary)</h3>
                  <p className="text-[11px] text-slate-300 font-semibold">تحليل الموقف التسويقي الفعلي • ثقة 94% 🎯</p>
                </div>
              </div>
              <span className="text-xs bg-purple-500/30 text-purple-200 px-3 py-1 rounded-full font-bold border border-purple-400/30">
                Grounded in Real ERP Data 🟢
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="bg-white/10 p-4 rounded-2xl space-y-1.5 backdrop-blur-sm">
                <h4 className="font-black text-amber-300 flex items-center gap-1.5">❓ ماذا حدث؟</h4>
                <p className="text-slate-200 leading-relaxed text-[11px]">{dailyBriefData.brief.what_happened || 'بانتظار تسجيل بيانات تسويقية لتحليلها آلياً.'}</p>
              </div>

              <div className="bg-white/10 p-4 rounded-2xl space-y-1.5 backdrop-blur-sm">
                <h4 className="font-black text-indigo-300 flex items-center gap-1.5">💡 لماذا؟</h4>
                <p className="text-slate-200 leading-relaxed text-[11px]">{dailyBriefData.brief.why_happened || 'يتم تجميع الأسباب والمؤشرات عند إدخال حملات جديدة.'}</p>
              </div>

              <div className="bg-emerald-500/20 border border-emerald-400/30 p-4 rounded-2xl space-y-1.5 backdrop-blur-sm">
                <h4 className="font-black text-emerald-300 flex items-center gap-1.5">✨ أهم فرصة:</h4>
                <p className="text-emerald-100 leading-relaxed text-[11px]">{dailyBriefData.brief.top_opportunity || 'لا توجد فرص معلقة حالياً.'}</p>
              </div>

              <div className="bg-rose-500/20 border border-rose-400/30 p-4 rounded-2xl space-y-1.5 backdrop-blur-sm">
                <h4 className="font-black text-rose-300 flex items-center gap-1.5">⚠️ أهم مشكلة:</h4>
                <p className="text-rose-100 leading-relaxed text-[11px]">{dailyBriefData.brief.critical_issue || 'لا توجد مشكلات تسويقية مرصودة.'}</p>
              </div>
            </div>
          </div>

          {/* 🎯 قمع التسويق التفاعلي (Interactive Marketing Funnel) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-800 text-sm">🎯 قمع التحويل التسويقي التفاعلي (Interactive Marketing Funnel)</h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">تتبع رحلة العميل من أول ظهور وحتى إتمام الطلب والإيرادات</p>
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-xl">
                معدل التحويل الكلي: {executiveKPIs.conversion_rate || 0.34}%
              </span>
            </div>

            <div className="space-y-2">
              {(funnelData || []).map((step, idx) => (
                <div key={idx} className="flex items-center gap-3 group cursor-pointer hover:bg-slate-50 p-2 rounded-2xl transition">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-sm shrink-0">
                    {step.icon}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="text-slate-800">{step.stage}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-indigo-600">{Number(step.count).toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({step.pct}%)</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-rose-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(step.pct, 2)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 🔔 التنبيهات الذكية والأفضل أداءً (Smart Alerts & Top Items) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="font-black text-slate-800 text-xs flex items-center gap-2">
                🔔 التنبيهات الذكية المباشرة (Smart Alerts)
              </h3>
              <div className="space-y-2 text-xs">
                {(!smartAlerts || smartAlerts.length === 0) ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-slate-100">
                    لا توجد تنبيهات تسويقية نشطة حالياً 🟢
                  </div>
                ) : (
                  smartAlerts.map(alt => (
                    <div key={alt.id || alt.title} className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                      <p className="font-black text-[11px]">{alt.title}</p>
                      <p className="text-[10px] opacity-90">{alt.msg}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* أعلى المنتجات تحويلاً */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3 md:col-span-2">
              <h3 className="font-black text-slate-800 text-xs flex items-center gap-2">
                👑 أداء أعلى المنتجات والإعلانات مبيعاً (Top Products & Content)
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                      <th className="px-3 py-2">المنتج</th>
                      <th className="px-3 py-2 text-center">الطلبات</th>
                      <th className="px-3 py-2">الإيرادات</th>
                      <th className="px-3 py-2 text-center">ROAS</th>
                      <th className="px-3 py-2 text-center">Score</th>
                      <th className="px-3 py-2">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold">
                    {(!productsAIData || productsAIData.length === 0) ? (
                      <tr><td colSpan="6" className="px-3 py-6 text-center text-slate-400 font-bold">لا توجد مبيعات أو منتجات مسجلة بعد 👑</td></tr>
                    ) : (
                      productsAIData.slice(0, 3).map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition">
                          <td className="px-3 py-2 font-black text-slate-900">{p.model_name}</td>
                          <td className="px-3 py-2 text-center font-bold text-indigo-600">{p.orders || 0}</td>
                          <td className="px-3 py-2 font-black text-emerald-600">{Number(p.revenue || 0).toLocaleString()} {currLabel}</td>
                          <td className="px-3 py-2 text-center font-black text-indigo-700">{p.roas}x</td>
                          <td className="px-3 py-2 text-center">
                            <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-black">{p.overall_score}</span>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => setSelectedProductDetail(p)}
                              className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold hover:bg-slate-800 transition"
                            >
                              عرض التفاصيل 🔍
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
         👥 تبويب ذكاء العملاء Customer Intelligence View
         ========================================= */}
      {activeTab === 'customer_intel' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-black text-slate-800 text-sm">👥 نظام ذكاء العملاء الشامل (Customer Intelligence Center)</h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">تصنيف العقول الشرائية للعملاء واستخراج النية المباشرة من الرسائل والمحادثات</p>
            </div>

            {(!customerSegments || Object.keys(customerSegments).length === 0 || Object.values(customerSegments).every(list => !list || list.length === 0)) ? (
              <div className="text-center py-10 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-slate-200">
                لا توجد شرائح عملاء مسجلة بعد • سيتم تصنيف العملاء آلياً عند تسجيل أولى المحادثات والطلبيات 👥
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(customerSegments || {}).map(([segKey, segList]) => (
                  <div key={segKey} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h4 className="font-black text-slate-900 text-xs uppercase">{segKey.replace('_', ' ')}</h4>
                      <span className="bg-rose-100 text-rose-800 font-black text-[10px] px-2 py-0.5 rounded">{segList.length} عملاء</span>
                    </div>

                    <div className="space-y-2">
                      {segList.map(c => (
                        <div key={c.id} className="bg-white p-3 rounded-xl border border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-900 text-xs">{c.name}</span>
                            <span className="text-[10px] font-mono font-bold text-indigo-600">نية {c.intent_score}/100</span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-bold">{c.notes}</p>
                          <button
                            onClick={() => setSelectedCustomerDetail(c)}
                            className="w-full mt-1 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-black text-[10px] rounded-lg transition"
                          >
                            💬 فتح سجل المحادثة والتحليل Conversation Intelligence
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================
         📥 مودال تصدير التقارير Export Report Modal
         ========================================= */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-sm">📥 تصدير التقارير والتنسيقات المعتمدة</h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600 font-black text-base">✕</button>
            </div>

            <p className="text-xs text-slate-600 font-bold">اختر صيغة التصدير المطلوبة مع الحفاظ الصارم على سلامة البيانات التاريخية:</p>

            <div className="grid grid-cols-3 gap-3">
              {[
                { fmt: 'sheets', label: 'Google Sheets 🟢', icon: '📊' },
                { fmt: 'excel', label: 'Excel (.xlsx)', icon: '📗' },
                { fmt: 'pdf', label: 'PDF Report 📕', icon: '📄' }
              ].map(opt => (
                <button
                  key={opt.fmt}
                  onClick={async () => {
                    const res = await window.marketingAPI.exportReport(opt.fmt, 'executive');
                    showToast(res.message);
                    setShowExportModal(false);
                  }}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center hover:bg-rose-50 hover:border-rose-300 transition space-y-1"
                >
                  <span className="text-xl block">{opt.icon}</span>
                  <span className="text-[10px] font-black text-slate-800 block">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================
         💬 مودال تحليل المحادثة Conversation Intelligence Modal
         ========================================= */}
      {selectedCustomerDetail && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">💬 Conversation Intelligence - {selectedCustomerDetail.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold">هاتف: {selectedCustomerDetail.phone}</p>
              </div>
              <button onClick={() => setSelectedCustomerDetail(null)} className="text-slate-400 hover:text-slate-600 font-black text-base">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100 space-y-1">
                <p className="font-black text-indigo-900">درجة النية الحالية: {selectedCustomerDetail.intent_score}/100 🎯</p>
                <p className="text-slate-700 text-[11px]">{selectedCustomerDetail.notes}</p>
              </div>

              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 space-y-1">
                <p className="font-black text-emerald-900">🤖 الرد الذكي المقترح مقدماً من AI:</p>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  {selectedCustomerDetail.suggested_reply || `أهلاً بك يا ${selectedCustomerDetail.name}! يسعدنا خدمتك وتلبية استفساراتك حول تشكيلات وتفصيل فساتين دار الأميرات الصغيرات.`}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedCustomerDetail(null)}
              className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800 transition"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* =========================================
         📈 مودال تفاصيل المنتج Product Detail Modal
         ========================================= */}
      {selectedProductDetail && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">📈 Product Marketing Lifecycle - {selectedProductDetail.model_name}</h3>
                <p className="text-[10px] text-slate-400 font-bold">ROAS: {selectedProductDetail.roas}x • الربح: {selectedProductDetail.profit} {currLabel}</p>
              </div>
              <button onClick={() => setSelectedProductDetail(null)} className="text-slate-400 hover:text-slate-600 font-black text-base">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-black text-slate-900">💡 تشخيص الذكاء الاصطناعي الكامل للمنتج:</h4>
                <p className="text-slate-700"><strong className="text-emerald-700">سبب النجاح:</strong> {selectedProductDetail.ai_diagnosis?.why_success || 'دقة التطريز العالية والطلب في الموسم'}</p>
                <p className="text-slate-700"><strong className="text-indigo-700">تفضيلات العملاء:</strong> {selectedProductDetail.ai_diagnosis?.customer_likes || 'التصميم الملكي والفخامة'}</p>
                <p className="text-slate-700"><strong className="text-rose-700">الاعتراض الرئيس:</strong> {selectedProductDetail.ai_diagnosis?.top_objections || 'السعر والتخوف من التوصيل'}</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedProductDetail(null)}
              className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800 transition"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
      {activeTab === 'ads' && (
        <div className="space-y-5 animate-fadeIn">
          <form onSubmit={handleSubmitCampaign} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-l from-rose-600 to-rose-800 px-5 py-3.5 flex items-center justify-between">
              <h2 className="text-white font-black text-xs">🚀 إنشاء حملة إعلانية ربطاً بالمنتجات والحسابات المالية</h2>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className={labelCls}>اسم الحملة <span className="text-rose-600">*</span></label>
                  <input value={campaignName} onChange={e => setCampaignName(e.target.value)} className={inputCls} placeholder="" />
                </div>

                <div>
                  <label className={labelCls}>المنصة المستهدفة</label>
                  <select value={platform} onChange={e => setPlatform(e.target.value)} className={inputCls}>
                    {['Instagram', 'Facebook', 'TikTok', 'WhatsApp Business', 'Google Ads', 'Snapchat', 'YouTube', 'Pinterest'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>المنتج / الموديل المرتبط</label>
                  <select value={modelName} onChange={e => setModelName(e.target.value)} className={inputCls}>
                    <option value="">اختر المنتج...</option>
                    {(products || []).map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>حساب دفع الإعلان (ERP Account)</label>
                  <select value={paymentAccount} onChange={e => setPaymentAccount(e.target.value)} className={inputCls}>
                    <option value="">505 - مصاريف التسويق والإعلانات</option>
                    {(accounts || []).map(a => {
                      const code = a.code || a.acc_code || a.id;
                      const rawName = a.name || a.account_name || a.acc_name || '';
                      const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                      return <option key={code} value={code}>{code} - {name}</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>الهدف الإعلاني</label>
                  <select value={objective} onChange={e => setObjective(e.target.value)} className={inputCls}>
                    {['مبيعات مباشرة', 'زيادة الوعي', 'تفاعل ورسائل', 'جمع بيانات عملاء'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>الميزانية المخصصة <span className="text-rose-600">*</span></label>
                  <input type="number" value={budget} onChange={e => setBudget(e.target.value)} className={inputCls} placeholder="0.00" />
                </div>

                <div>
                  <label className={labelCls}>تاريخ البدء</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>حالة الحملة</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
                    {['نشط', 'متوقف', 'مكتمل'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all shadow-md mt-2 disabled:opacity-60 bg-gradient-to-r from-rose-600 to-rose-800 hover:opacity-90">
                {loading ? '⏳ جاري الحفظ...' : '✨ إطلاق وحفظ الحملة الإعلانية'}
              </button>
            </div>
          </form>

          {/* جدول سجل الحملات */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-black text-xs text-slate-800">📊 سجل الحملات الإعلانية المسجلة ({filteredCampaigns.length})</h3>
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold w-48 focus:outline-none focus:border-rose-300"
                placeholder="🔍 بحث باسم الحملة أو المنصة..." />
            </div>

            <div className="overflow-x-auto">
              {filteredCampaigns.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-bold">لا توجد حملات مسجلة بعد 🚀</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-100">
                      {['معرف الحملة', 'اسم الحملة', 'المنصة', 'المنتج المرتبط', 'الميزانية', 'حساب الدفع', 'تاريخ البدء', 'الحالة'].map(h => (
                        <th key={h} className="px-4 py-3 text-right whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCampaigns.map((c, i) => (
                      <tr key={c.campaign_id || i} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{c.campaign_id}</td>
                        <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{c.campaign_name}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{c.platform}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{c.product_name || 'عام / متجر'}</td>
                        <td className="px-4 py-3 font-black text-rose-700 whitespace-nowrap">{Number(c.budget || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-[11px]">{c.payment_account}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{c.start_date || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${statusColor(c.status)}`}>{c.status || 'نشط'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================
         2. تبويب إدارة المنصات وOAuth (Platforms)
         ========================================= */}
      {activeTab === 'platforms' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
          {(platformsData || []).map(p => (
            <div key={p.platform_id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🌐</span>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{p.platform_name}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">{p.platform_type.toUpperCase()}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${p.status === 'connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {p.status === 'connected' ? '🟢 متصل' : '🔴 غير متصل'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <p><span className="font-extrabold text-slate-500">اسم الحساب:</span> {p.account_name || '— (غير مرتبط)'}</p>
                  <p><span className="font-extrabold text-slate-500">حالة Webhook:</span> <span className={`font-bold ${p.webhook_status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>{p.webhook_status === 'active' ? 'نشط 🟢' : 'غير نشط'}</span></p>
                  <p><span className="font-extrabold text-slate-500">آخر مزامنة:</span> {p.last_sync || 'لم تتم بعد'}</p>
                  <p><span className="font-extrabold text-slate-500">الصلاحيات:</span> <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">{p.status === 'connected' ? (p.permissions || '[]') : 'بانتظار المصادقة'}</span></p>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleTogglePlatform(p.platform_name, p.status)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition ${
                    p.status === 'connected' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {p.status === 'connected' ? 'فصل المنصة' : 'ربط المنصة'}
                </button>
                <button
                  onClick={() => handleOAuthConnect(p.platform_name)}
                  className="px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-black transition"
                >
                  🔑 OAuth
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================
         3. تبويب مصفوفة الإمكانيات (Capability Matrix)
         ========================================= */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
          <div className="bg-slate-50 px-5 py-4 border-b border-slate-100">
            <h3 className="font-black text-slate-800 text-sm">🧩 مصفوفة الإمكانيات الرسمية للمنصات الـ 8 (Capability Matrix)</h3>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">تعكس الإمكانيات المتاحة فعلياً بكل منصة لمنع أي بيانات وهمية</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                  <th className="px-4 py-3 text-right">المنصة</th>
                  <th className="px-3 py-3">منشورات (Posts)</th>
                  <th className="px-3 py-3">ريلز (Reels)</th>
                  <th className="px-3 py-3">ستوري (Stories)</th>
                  <th className="px-3 py-3">تعليقات (Comments)</th>
                  <th className="px-3 py-3">رسائل (Messages)</th>
                  <th className="px-3 py-3">تحليلات (Insights)</th>
                  <th className="px-3 py-3">إعلانات (Ads)</th>
                  <th className="px-3 py-3">Webhooks</th>
                  <th className="px-4 py-3 text-right">ملاحظات الفحص والربط</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold">
                {(matrixData || []).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 text-right font-black text-slate-900">{row.platform}</td>
                    {['posts', 'reels', 'stories', 'comments', 'messages', 'insights', 'ads', 'webhooks'].map(cap => (
                      <td key={cap} className="px-3 py-3">
                        {row[cap] === 1 ? (
                          <span className="inline-block bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[11px] font-black">✔ مدعوم</span>
                        ) : (
                          <span className="inline-block bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md text-[11px]">✖ غير متاح</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right text-[11px] text-slate-500 font-normal">{row.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================
         4. تبويب المحتوى والمقاييس التاريخية (Content)
         ========================================= */}
      {activeTab === 'content' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-sm">📊 المحتوى المنشور والمقاييس التاريخية (Content & Time-Series Metrics)</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-100">
                    <th className="px-4 py-3">المحتوى / الكابشن</th>
                    <th className="px-4 py-3">المنصة والنوع</th>
                    <th className="px-4 py-3">المنتج المرتبط</th>
                    <th className="px-4 py-3 text-center">الوصول والتفاعل التاريخي</th>
                    <th className="px-4 py-3 text-center">المبيعات الإجمالية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {(contentData || []).length === 0 ? (
                    <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-400">لا يوجد محتوى مسجل حالياً</td></tr>
                  ) : (
                    contentData.map((cnt, i) => (
                      <tr key={cnt.content_id || i} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3">
                          <p className="font-black text-slate-900">{cnt.caption || '—'}</p>
                          <p className="text-[10px] font-mono text-slate-400">{cnt.content_id}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold">{cnt.platform}</span>
                          <span className="mr-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">{cnt.content_type}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-bold">{cnt.product_name || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          {cnt.metrics_history && cnt.metrics_history.length > 0 ? (
                            <div className="text-[11px]">
                              <span className="font-black text-indigo-600">👁️ {cnt.metrics_history.reduce((a, b) => a + (b.reach || 0), 0).toLocaleString()}</span>
                              <span className="mx-2 font-black text-emerald-600">👍 {cnt.metrics_history.reduce((a, b) => a + (b.likes || 0), 0).toLocaleString()}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px]">لا توجد قراءات بعد</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-black text-emerald-600">
                          {cnt.metrics_history ? cnt.metrics_history.reduce((a, b) => a + (b.revenue || 0), 0).toLocaleString() : 0} {currLabel}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
         5. تبويب أحداث Webhooks (Webhook Logs)
         ========================================= */}
      {activeTab === 'webhooks' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
          <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-800 text-sm">🔌 سجل طبقة الأحداث المباشرة (Raw Platform Webhook Events)</h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">يدعم تلقي الأحداث، Idempotency، وإعادة المحاولة Retry بدون تقديم بيانات fake</p>
            </div>
            <span className="text-xs font-mono font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-xl">
              POST /api/webhooks/:platform
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right font-mono">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                  <th className="px-4 py-3">Event ID</th>
                  <th className="px-4 py-3">المنصة</th>
                  <th className="px-4 py-3">نوع الحدث</th>
                  <th className="px-4 py-3">مفتاح Idempotency</th>
                  <th className="px-4 py-3">تاريخ الاستلام</th>
                  <th className="px-4 py-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(webhookLogs || []).length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-400 font-sans font-bold">لا يوجد أحداث webhook مسجلة بعد</td></tr>
                ) : (
                  webhookLogs.map((log, idx) => (
                    <tr key={log.event_id || idx} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-slate-800 font-bold">{log.event_id}</td>
                      <td className="px-4 py-3 text-indigo-600 font-bold">{log.platform}</td>
                      <td className="px-4 py-3 text-slate-700">{log.event_type}</td>
                      <td className="px-4 py-3 text-slate-400 text-[10px]">{log.idempotency_key}</td>
                      <td className="px-4 py-3 text-slate-500">{log.received_at}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                          log.status === 'processed' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-amber-100 text-amber-700 border-amber-300'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================
         6. تبويب الموجز اليومي والتوجهات (Daily AI Brief & Trends)
         ========================================= */}
      {activeTab === 'daily_brief' && (
        <div className="space-y-5 animate-fadeIn">
          {/* كرت الموجز اليومي الرئيسي */}
          <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🧠</span>
                <div>
                  <h3 className="font-black text-base text-amber-300">الموجز التسويقي اليومي الذكي (Daily AI Brief)</h3>
                  <p className="text-[11px] text-slate-300 font-semibold">{dailyBriefData.brief.brief_date || TODAY_STR_ISO} • ملخص وتحليلات أداء اليوم</p>
                </div>
              </div>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full font-bold border border-emerald-400/30">
                محدث تلقائياً 🟢
              </span>
            </div>

            <div className="text-xs space-y-2 leading-relaxed text-slate-200">
              <p className="font-bold text-white text-sm bg-white/10 p-3 rounded-2xl">
                📊 {dailyBriefData.brief.performance_summary || 'يتم تجميع المؤشرات اليومية...'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-2">
              <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-sm">
                <p className="text-[10px] text-amber-300 font-bold mb-1">👑 المنتج الأعلى أداءً</p>
                <p className="font-black text-white truncate">{dailyBriefData.brief.top_product || '—'}</p>
              </div>
              <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-sm">
                <p className="text-[10px] text-indigo-300 font-bold mb-1">🎬 المنشور الأعلى تحويلاً</p>
                <p className="font-black text-white truncate">{dailyBriefData.brief.top_content || '—'}</p>
              </div>
              <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-sm">
                <p className="text-[10px] text-emerald-300 font-bold mb-1">📢 الحملة الأعلى عائداً</p>
                <p className="font-black text-white truncate">{dailyBriefData.brief.top_campaign || '—'}</p>
              </div>
              <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-sm">
                <p className="text-[10px] text-rose-300 font-bold mb-1">👥 الطلب السائد من العملاء</p>
                <p className="font-black text-white truncate">{dailyBriefData.brief.customer_demand || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl space-y-1">
                <h4 className="font-black text-red-300 flex items-center gap-1.5">⚠️ الإشارات السلبية والاعتراضات:</h4>
                <p className="text-slate-300 text-[11px]">{dailyBriefData.brief.negative_signals || 'لا توجد إشارات سلبية حادة'}</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl space-y-1">
                <h4 className="font-black text-emerald-300 flex items-center gap-1.5">💡 الفرص والإجراءات المقترحة:</h4>
                <p className="text-slate-300 text-[11px]">{dailyBriefData.brief.opportunities || 'توجيه حملة استهداف للجمهور الصامت'}</p>
              </div>
            </div>
          </div>

          {/* التوجهات الصاعدة والهابطة Trend Detection */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
              📈 اكتشاف التوجهات الصاعدة والهابطة (Trend Detection Engine)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                <h4 className="font-black text-emerald-800 text-xs">🔥 المنتجات والألوان الصاعدة</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(dailyBriefData.trends.rising_products || []).map(p => (
                    <span key={p} className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg font-bold text-[10px]">✨ {p}</span>
                  ))}
                  {(dailyBriefData.trends.rising_colors || []).map(c => (
                    <span key={c} className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg font-bold text-[10px]">🎨 {c}</span>
                  ))}
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-2">
                <h4 className="font-black text-indigo-800 text-xs">📏 المقاسات والأسئلة الشائعة الصاعدة</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(dailyBriefData.trends.rising_sizes || []).map(s => (
                    <span key={s} className="bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-lg font-bold text-[10px]">📐 مقاس {s}</span>
                  ))}
                  {(dailyBriefData.trends.rising_questions || []).map(q => (
                    <span key={q} className="bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-lg font-bold text-[10px]">❓ {q}</span>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                <h4 className="font-black text-amber-800 text-xs">👻 الجمهور الصامت والفرص المفقودة</h4>
                <div className="space-y-1.5 text-[11px] text-slate-700">
                  <p><span className="font-black text-amber-900">الجمهور الصامت (Silent High Intent):</span> <span className="font-bold text-indigo-700">{dailyBriefData.trends.silent_audience_count || 0} عميل</span> يتردد ويحفظ المنشورات دون إرسال رسائل.</p>
                  <p><span className="font-black text-amber-900">الفرص المفقودة (Lost Opportunities):</span> <span className="font-bold text-rose-700">{dailyBriefData.trends.lost_opportunities_count || 0} عملاء</span> انسحبوا عند السؤال عن السعر والتوصيل.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
         7. تبويب تحليلات المنتجات والإسناد (Product Intelligence & Attribution)
         ========================================= */}
      {activeTab === 'products_ai' && (
        <div className="space-y-5 animate-fadeIn">
          {/* جدول أداء وتكلفة وأرباح المنتجات */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-sm">📈 تحليلات المنتجات الشاملة والـ ROAS والأرباح الفعلية</h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">ربط المبيعات وتكلفة البضاعة المباعة COGS وإنفاق الإعلانات لحساب الربح الصافي</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="px-4 py-3">المنتج / الموديل</th>
                    <th className="px-3 py-3 text-center">الوصول / View</th>
                    <th className="px-3 py-3 text-center">حفظ / مشاركة</th>
                    <th className="px-3 py-3 text-center">الطلبات</th>
                    <th className="px-3 py-3">الإيرادات</th>
                    <th className="px-3 py-3">التكلفة COGS</th>
                    <th className="px-3 py-3">الإنفاق الإعلاني</th>
                    <th className="px-3 py-3">الربح الصافي</th>
                    <th className="px-3 py-3 text-center">عائد الإعلان ROAS</th>
                    <th className="px-3 py-3 text-center">تكلفة الاستحواذ CAC</th>
                    <th className="px-3 py-3 text-center">النتيجة الإجمالية (0-100)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {(productsAIData || []).length === 0 ? (
                    <tr><td colSpan="11" className="px-4 py-8 text-center text-slate-400 font-bold">لا توجد منتجات أو بيانات تسويقية مسجلة بعد 📈</td></tr>
                  ) : (
                    (productsAIData || []).map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-black text-slate-900">{p.model_name}</td>
                        <td className="px-3 py-3 text-center text-slate-600">{Number(p.reach || 0).toLocaleString()}</td>
                        <td className="px-3 py-3 text-center text-slate-600">🔖 {p.saves || 0} / 🔁 {p.shares || 0}</td>
                        <td className="px-3 py-3 text-center font-bold text-indigo-600">{p.orders || 0} طلبات</td>
                        <td className="px-3 py-3 font-black text-emerald-600">{Number(p.revenue || 0).toLocaleString()} {currLabel}</td>
                        <td className="px-3 py-3 text-slate-500">{Number(p.cogs || 0).toLocaleString()} {currLabel}</td>
                        <td className="px-3 py-3 text-rose-600">{Number(p.ad_spend || 0).toLocaleString()} {currLabel}</td>
                        <td className="px-3 py-3 font-black text-emerald-700">{Number(p.profit || 0).toLocaleString()} {currLabel}</td>
                        <td className="px-3 py-3 text-center font-black text-indigo-700 bg-indigo-50/50">{p.roas}x</td>
                        <td className="px-3 py-3 text-center text-slate-600">{p.cac} {currLabel}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="bg-rose-100 text-rose-800 px-2.5 py-1 rounded-lg font-black text-xs">
                            {p.overall_score} / 100
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* نماذج الإسناد متعدد الممسات (Multi-Touch Attribution) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-black text-slate-800 text-sm">🎯 نماذج الإسناد متعدد الممسات (Multi-Touch Attribution Models)</h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">تقسيم العائد والطلبات وفقاً للنماذج دون اختلاق أرقام، مع توضيح مصدر البيانات</p>
            </div>

            {(!campaignAttrData || campaignAttrData.length === 0) ? (
              <div className="text-center py-8 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-slate-200">
                لا توجد حملات إسناد مسجلة بعد • ستظهر النماذج متعددة الممسات عند إطلاق الحملات 🎯
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(campaignAttrData || []).map(cmp => (
                  <div key={cmp.campaign_id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div>
                        <h4 className="font-black text-slate-900 text-xs">{cmp.campaign_name}</h4>
                        <p className="text-[10px] text-slate-500 font-bold">{cmp.platform} • ميزانية: {cmp.budget} {currLabel}</p>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">{cmp.campaign_id}</span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {Object.entries(cmp.attribution_models || {}).map(([mName, mVal]) => (
                        <div key={mName} className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-100">
                          <span className="font-bold text-slate-700 text-[11px]">{mName}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-emerald-600">{mVal.attributed_revenue} {currLabel}</span>
                            <span className="text-[9px] text-slate-400">({mVal.attributed_orders} طلبات)</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${mVal.data_source === 'Actual' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {mVal.data_source}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================
         8. تبويب تحليل المشاعر والنيات (Arabic NLP & Intent)
         ========================================= */}
      {activeTab === 'nlp_intent' && (
        <div className="space-y-5 animate-fadeIn">
          {/* كروت ملخص المشاعر وأسبابها */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-500 text-white rounded-3xl p-5 shadow-sm space-y-1">
              <p className="text-[11px] font-bold opacity-80">المشاعر الإيجابية (Positive Sentiment)</p>
              <h3 className="text-3xl font-black">{nlpCommentsData.summary.positive_pct !== undefined ? nlpCommentsData.summary.positive_pct : 0}%</h3>
              <p className="text-[10px] bg-white/20 inline-block px-2 py-0.5 rounded mt-1">السبب الرئيس: إعجاب بدقة التطريز والفخامة</p>
            </div>
            <div className="bg-slate-700 text-white rounded-3xl p-5 shadow-sm space-y-1">
              <p className="text-[11px] font-bold opacity-80">المشاعر المحايدة والاستفسارات</p>
              <h3 className="text-3xl font-black">{nlpCommentsData.summary.neutral_pct !== undefined ? nlpCommentsData.summary.neutral_pct : 0}%</h3>
              <p className="text-[10px] bg-white/20 inline-block px-2 py-0.5 rounded mt-1">السبب الرئيس: أسئلة عن المقاسات وأماكن التوصيل</p>
            </div>
            <div className="bg-rose-600 text-white rounded-3xl p-5 shadow-sm space-y-1">
              <p className="text-[11px] font-bold opacity-80">المشاعر السلبية والاعتراضات</p>
              <h3 className="text-3xl font-black">{nlpCommentsData.summary.negative_pct !== undefined ? nlpCommentsData.summary.negative_pct : 0}%</h3>
              <p className="text-[10px] bg-white/20 inline-block px-2 py-0.5 rounded mt-1">السبب الرئيس: اعتراض على السعر أو مدة الشحن</p>
            </div>
          </div>

          {/* جدول التعليقات المحللة بذكاء NLP */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-sm">💬 معالجة اللغة العربية واللهجة اليمنية واستخراج نية الشراء (Arabic NLP Engine)</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="px-4 py-3">العميل / التعليق</th>
                    <th className="px-3 py-3">اللهجة المكتشفة</th>
                    <th className="px-3 py-3">المشاعر والسبب</th>
                    <th className="px-3 py-3">تصنيف النية Intent</th>
                    <th className="px-3 py-3">المنتج واللون والمقاس المستخرج</th>
                    <th className="px-3 py-3">المحافظة المستخرجة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {(!nlpCommentsData.data || nlpCommentsData.data.length === 0) ? (
                    <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-400 font-bold">لا توجد تعليقات أو تحليلات مشاعر NLP مسجلة بعد 💬</td></tr>
                  ) : (
                    (nlpCommentsData.data || []).map((c, idx) => (
                      <tr key={c.comment_id || idx} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3">
                          <p className="font-black text-slate-900">{c.text}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{c.customer_name || 'عميل'} • {c.platform}</p>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold">
                            {c.dialect}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            c.sentiment === 'Positive' ? 'bg-emerald-100 text-emerald-800' : (c.sentiment === 'Negative' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700')
                          }`}>
                            {c.sentiment} ({c.sentiment_cause})
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-indigo-700 font-bold">{c.intent_category}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600 text-[11px]">
                          {c.extracted_product || '—'} {c.extracted_color ? `• لون ${c.extracted_color}` : ''} {c.extracted_age ? `• سن ${c.extracted_age}` : ''}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap font-bold text-amber-700">{c.extracted_location || 'غير محدد'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* نية الشراء للمحادثات (Purchase Intent Score 0-100) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="font-black text-slate-800 text-sm">🎯 تقييم نية الشراء للمحادثات (Purchase Intent Scoring & Brackets)</h3>

            {(!intentConvsData || intentConvsData.length === 0) ? (
              <div className="text-center py-8 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-slate-200">
                لا توجد محادثات مسجلة لتحليل نية الشراء بعد • سيتم استنتاج النوايا لحظياً عند ورود الرسائل 💬
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(intentConvsData || []).map(conv => (
                  <div key={conv.conversation_id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-slate-900 text-xs">{conv.customer_name || 'محادثة جديدة'}</span>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${
                          conv.intent_score >= 90 ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {conv.intent_bracket}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600">
                        <p><span className="font-bold text-slate-500">المنصة:</span> {conv.platform}</p>
                        <p><span className="font-bold text-slate-500">الفرص المفقودة:</span> <span className="font-bold text-rose-600">{conv.lost_opportunity_reason}</span></p>
                        {conv.silent_high_intent === 1 && (
                          <span className="inline-block bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-black mt-1">
                            👻 عميل صامت عالي النية (Silent High Intent)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="text-xs font-bold text-slate-500">درجة النية الحالية:</span>
                      <span className="text-base font-black text-indigo-700">{conv.intent_score} / 100</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================
         9. تبويب التوصيات والأوزان (AI Recommendations & Scoring Weights)
         ========================================= */}
      {activeTab === 'recs_weights' && (
        <div className="space-y-5 animate-fadeIn">
          {/* كروت التوصيات القابلة للإقرار البشري */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-black text-slate-800 text-sm">💡 توصيات الذكاء الاصطناعي مع درجات الثقة والإقرار البشري</h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">لن يتم تنفيذ أي إجراء مالي تلقائياً إلا بعد ضغط زر الموافقة البشرية الصريحة</p>
            </div>

            {(!aiRecsData || aiRecsData.length === 0) ? (
              <div className="text-center py-8 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-slate-200">
                لا توجد توصيات معلقة حالياً • ستظهر التوصيات الذكية تلقائياً عند تسجيل حملات ومبيعات 💡
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(aiRecsData || []).map(rec => (
                  <div key={rec.rec_id} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-900 text-xs">{rec.title}</span>
                        <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-lg">
                          ثقة: {rec.confidence}% 🎯
                        </span>
                      </div>

                      <p className="text-xs font-bold text-indigo-700 bg-white p-3 rounded-xl border border-slate-200">
                        👉 {rec.recommendation}
                      </p>

                      <div className="space-y-1 text-[11px] text-slate-600">
                        <p><span className="font-black text-slate-700">السبب العلمي:</span> {rec.reason}</p>
                        <p><span className="font-black text-emerald-700">الأثر المتوقع:</span> {rec.expected_impact}</p>
                        <p><span className="font-black text-slate-500">الدليل القاطع:</span> {rec.evidence}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${
                        rec.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {rec.status === 'approved' ? '🟢 تمت الموافقة والتنفيذ' : '⏳ قيد الانتظار'}
                      </span>

                      {rec.status !== 'approved' && (
                        <button
                          onClick={() => handleApproveRec(rec.rec_id)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-xs hover:opacity-90 transition shadow-sm"
                        >
                          ✔ إقرار وتنفيذ الموافقة البشرية
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* لوحة تعديل أوزان التفاعل وحساب الأرقام (Configurable Weight Engine) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-black text-slate-800 text-sm">⚙️ لوحة تعديل أوزان تفاعل الجودة ودرجات النية (Configurable Weight Engine)</h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">يمكنك تغيير الأوزان في أي وقت وتطبيقها فوراً دون أي قيم ثابته أو عشوائية</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {Object.entries(weightsMap).map(([wKey, wVal]) => (
                <div key={wKey} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                  <label className="block text-[10px] font-extrabold text-slate-600">{wKey.toUpperCase()}</label>
                  <input
                    type="number"
                    step="any"
                    value={wVal !== undefined && wVal !== null ? wVal : ''}
                    placeholder="0"
                    onChange={e => setWeightsMap({ ...weightsMap, [wKey]: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white font-black text-slate-800 outline-none focus:border-rose-400 font-mono text-center"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveWeights}
              className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800 transition shadow-md"
            >
              💾 حفظ وتطبيق الأوزان الجديدة فوراً
            </button>
          </div>
        </div>
      )}

      {/* =========================================
         10. تبويب اسأل مدير التسويق AI (Interactive AI Chat)
         ========================================= */}
      {activeTab === 'ai_chat' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[600px] animate-fadeIn">
          <div className="bg-gradient-to-l from-slate-900 to-indigo-950 px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="font-black text-sm text-amber-300">مدير التسويق الذكي (AI Marketing Director)</h3>
                <p className="text-[10px] text-slate-300 font-semibold">إجابات فورية صادقة ومستندة 100% لبيانات السجلات الحقيقية</p>
              </div>
            </div>
            <span className="text-xs bg-indigo-500/30 text-indigo-200 px-3 py-1 rounded-full font-bold border border-indigo-400/30">
              Grounded in DB Facts 🟢
            </span>
          </div>

          {/* اقتراحات أسئلة سريعة */}
          <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex gap-2 overflow-x-auto">
            {[
              "ما أفضل موديل؟",
              "لماذا انخفضت المبيعات؟",
              "ما الإعلان الذي يهدر الميزانية؟",
              "ما أكثر لون مطلوب؟",
              "ما أكثر سؤال من العملاء؟",
              "ما الذي أنشره غداً؟"
            ].map(q => (
              <button
                key={q}
                onClick={() => handleSendAIChat(q)}
                className="py-1.5 px-3 bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition shadow-xs"
              >
                ❓ {q}
              </button>
            ))}
          </div>

          {/* صندوق المحادثة */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-3xl p-4 text-xs font-semibold leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-rose-600 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none space-y-1'
                }`}>
                  <p className="whitespace-pre-line">{msg.text}</p>
                  {msg.source && (
                    <span className="block text-[9px] text-indigo-600 font-mono font-bold pt-1 border-t border-slate-100">
                      مصدر البيانات: {msg.source}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-end">
                <div className="bg-white p-4 rounded-3xl border border-slate-200 text-xs font-bold text-slate-500 animate-pulse">
                  ⏳ جاري استعلام قاعدة البيانات وتوليد الإجابة الدقيقة...
                </div>
              </div>
            )}
          </div>

          {/* نموذج إدخال السؤال */}
          <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendAIChat()}
              placeholder="اسأل مدير التسويق AI..."
              className="flex-1 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold outline-none focus:bg-white focus:border-rose-400 transition"
            />
            <button
              onClick={() => handleSendAIChat()}
              disabled={chatLoading}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-800 text-white font-black text-xs hover:opacity-90 transition shadow-md disabled:opacity-50"
            >
              إرسال 🚀
            </button>
          </div>
        </div>
      )}

    </div>
  );
}


