// src/features/marketing/hooks/useMarketingData.js
// ====================================================================
// Hook: useMarketingData — جلب وتهيئة بيانات التسويق من الخادم الموحد
// ====================================================================
const { useState, useEffect } = React;

function useMarketingData({ campaigns, setCampaigns, showToast, timeframe }) {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

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

  // Phase 3 SaaS Executive States
  const [executiveKPIs, setExecutiveKPIs] = useState({});
  const [funnelData, setFunnelData] = useState([]);
  const [smartAlerts, setSmartAlerts] = useState([]);
  const [customerSegments, setCustomerSegments] = useState({});
  const [userPermissions, setUserPermissions] = useState({ role: 'Admin', can_change_budget: true });

  const fetchAllMarketingData = async () => {
    setLoading(true);
    try {
      if (window.marketingAPI) {
        const results = await Promise.allSettled([
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
        const [
          pRes, mRes, cRes, cntRes, cmtRes, whRes, dRes, aiScRes,
          nlpRes, intRes, prodAiRes, attrRes, dbRes, recRes,
          kpiRes, fnRes, altRes, custRes, permRes
        ] = results.map(r => r.status === 'fulfilled' ? r.value : null);

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
      console.error('Marketing API Error', err);
      if (showToast) showToast('تعذر جلب بيانات التسويق من الخادم الموحد', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMarketingData();
  }, [timeframe]);

  const filteredCampaigns = (localCampaigns || []).filter(c =>
    !search || (c.campaign_name || '').includes(search) || (c.platform || '').includes(search)
  );

  const totalBudget = (localCampaigns || []).reduce((acc, c) => acc + (parseFloat(c.budget) || 0), 0);
  const activeCampaignsCount = (localCampaigns || []).filter(c => c.status === 'نشط').length;
  const connectedPlatformsCount = (platformsData || []).filter(p => p.status === 'connected').length;

  return {
    loading, setLoading, search, setSearch,
    localCampaigns, setLocalCampaigns,
    platformsData, matrixData, contentData,
    commentsData, webhookLogs, dashboardSummary,
    aiScores, nlpCommentsData, intentConvsData,
    productsAIData, campaignAttrData, dailyBriefData, aiRecsData,
    executiveKPIs, funnelData, smartAlerts, customerSegments, userPermissions,
    filteredCampaigns, totalBudget, activeCampaignsCount, connectedPlatformsCount,
    fetchAllMarketingData
  };
}

window.useMarketingData = useMarketingData;
