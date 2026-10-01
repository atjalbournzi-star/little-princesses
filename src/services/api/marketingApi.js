/**
 * ============================================================================
 * marketingApi.js — Marketing Campaigns, AI Intelligence & Omnichannel API
 * Domain: Marketing & Growth Intelligence | Architecture Standard: Rule 1, 3 & 4
 * ============================================================================
 */

(function(window) {
  'use strict';

  window.marketingAPI = {
    getPlatforms: () => fetch('/api/marketing/platforms').then(r => r.json()),
    getCapabilityMatrix: () => fetch('/api/marketing/capability-matrix').then(r => r.json()),
    getCampaigns: () => fetch('/api/marketing/campaigns').then(r => r.json()),
    getContent: () => fetch('/api/marketing/content').then(r => r.json()),
    getComments: () => fetch('/api/marketing/comments').then(r => r.json()),
    getConversations: () => fetch('/api/marketing/conversations').then(r => r.json()),
    getWebhooks: () => fetch('/api/marketing/webhooks').then(r => r.json()),
    getDashboard: () => fetch('/api/marketing/dashboard').then(r => r.json()),
    saveCampaign: (data) => fetch('/api/marketing/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    updatePlatformStatus: (data) => fetch('/api/marketing/platforms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    triggerSync: () => fetch('/api/marketing/sync', { method: 'POST' }).then(r => r.json()),
    
    // AI Marketing Intelligence Endpoints
    getAIScores: () => fetch('/api/marketing/ai/scores').then(r => r.json()),
    getNLPComments: () => fetch('/api/marketing/ai/nlp-comments').then(r => r.json()),
    getIntentConversations: () => fetch('/api/marketing/ai/intent-conversations').then(r => r.json()),
    getProductsIntelligence: () => fetch('/api/marketing/ai/products-intelligence').then(r => r.json()),
    getCampaignAttribution: () => fetch('/api/marketing/ai/campaign-attribution').then(r => r.json()),
    getDailyBrief: () => fetch('/api/marketing/ai/daily-brief').then(r => r.json()),
    getRecommendations: () => fetch('/api/marketing/ai/recommendations').then(r => r.json()),
    askAIChat: (question) => fetch('/api/marketing/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) }).then(r => r.json()),
    approveRecommendation: (rec_id) => fetch('/api/marketing/ai/recommendations/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rec_id }) }).then(r => r.json()),
    updateWeights: (weights) => fetch('/api/marketing/ai/weights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weights }) }).then(r => r.json()),
    
    // SaaS Executive Endpoints
    getExecutiveKPIs: (tf = '30d') => fetch(`/api/marketing/executive-kpis?timeframe=${tf}`).then(r => r.json()),
    getFunnel: () => fetch('/api/marketing/funnel').then(r => r.json()),
    getSmartAlerts: () => fetch('/api/marketing/smart-alerts').then(r => r.json()),
    getCustomerIntelligence: () => fetch('/api/marketing/customer-intelligence').then(r => r.json()),
    getPermissions: () => fetch('/api/marketing/permissions').then(r => r.json()),
    exportReport: (format, report_type) => fetch('/api/marketing/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format, report_type }) }).then(r => r.json())
  };

})(typeof window !== 'undefined' ? window : globalThis);
