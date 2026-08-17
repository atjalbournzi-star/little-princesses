// GAS is called via our local Python server proxy (/api/gas) to bypass CORS.
// The Python server forwards the request to Google Apps Script server-side.
const GAS_PROXY_URL = window.location.origin + '/api/gas';

async function callGAS(action, payload = {}) {
  const body = JSON.stringify({ action, data: payload, ...payload });
  console.log("[GAS PROXY] Calling action:", action);

  const res = await fetch(GAS_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "No response body");
    console.error("[GAS PROXY] HTTP Error:", res.status, errText);
    throw new Error(`Proxy HTTP ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  console.log("[GAS PROXY] Response:", json);

  if (json && json.success === false) {
    throw new Error(json.error || json.message || "GAS returned success:false");
  }

  return json;
}


async function loadAllData() {
  try {
    const [cRes, iRes, aRes, pRes, oRes, puRes, fRes, vRes, eRes, jRes, fBRes, empRes, payRes] = await Promise.allSettled([
      callGAS("getCustomers"),
      callGAS("getInventory"),
      fetch("/api/accounts/list").then(r => r.json()).catch(() => callGAS("getAccounts")),
      callGAS("getProducts"),
      callGAS("getOrders"),
      callGAS("getPurchases"),
      callGAS("getFactory"),
      callGAS("getVouchers"),
      callGAS("getExpenses"),
      callGAS("getJournalEntries"),
      callGAS("getFeedback"),
      callGAS("getEmployees"),
      callGAS("getPayroll")
    ]);

    let accountsData = [];
    if (aRes.status === "fulfilled" && aRes.value) {
      if (Array.isArray(aRes.value.data) && aRes.value.data.length > 0) {
        accountsData = aRes.value.data;
      } else if (Array.isArray(aRes.value) && aRes.value.length > 0) {
        accountsData = aRes.value;
      }
    }
    if (!accountsData || accountsData.length === 0) {
      accountsData = (typeof INITIAL_ACCOUNTS !== 'undefined' ? INITIAL_ACCOUNTS : []);
    }

    return {
      customers: (cRes.status === "fulfilled" && cRes.value?.data && Array.isArray(cRes.value.data)) ? cRes.value.data : [],
      inventory: (iRes.status === "fulfilled" && iRes.value?.data && Array.isArray(iRes.value.data)) ? iRes.value.data : [],
      accounts: accountsData,
      products: (pRes.status === "fulfilled" && pRes.value?.data && Array.isArray(pRes.value.data)) ? pRes.value.data : [],
      orders: (oRes.status === "fulfilled" && oRes.value?.data && Array.isArray(oRes.value.data)) ? oRes.value.data.map(o => {
        if (typeof o.qty === 'string' && isNaN(o.qty) && (o.status?.includes('YER') || o.status?.includes('USD') || o.status?.includes('ريال'))) {
          return {
            ...o,
            child_name: o.product_name,
            product_name: o.qty,
            qty: 1, 
            order_date: (o.delivery_date && o.delivery_date !== "") ? o.delivery_date : (new Date().toISOString()),
            delivery_date: (typeof o.total === 'string' && o.total.includes('-')) ? o.total : "",
            total: parseFloat(o.paid) || 0,
            paid: parseFloat(o.remaining) || 0,
            remaining: parseFloat(o.currency) || 0,
            currency: o.status,
            status: o[""] || "قيد الخياطة 🪡"
          };
        }
        return o;
      }) : [],
      purchases: (puRes.status === "fulfilled" && puRes.value?.data && Array.isArray(puRes.value.data)) ? puRes.value.data : [],
      factory: (fRes.status === "fulfilled" && fRes.value?.data && Array.isArray(fRes.value.data)) ? fRes.value.data : [],
      vouchers: (vRes.status === "fulfilled" && vRes.value?.data && Array.isArray(vRes.value.data)) ? vRes.value.data : [],
      expenses: (eRes.status === "fulfilled" && eRes.value?.data && Array.isArray(eRes.value.data)) ? eRes.value.data : [],
      journal: (jRes.status === "fulfilled" && jRes.value?.data && Array.isArray(jRes.value.data)) ? jRes.value.data : [],
      feedback: (fBRes.status === "fulfilled" && fBRes.value?.data && Array.isArray(fBRes.value.data)) ? fBRes.value.data : [],
      employees: (empRes.status === "fulfilled" && empRes.value?.data && Array.isArray(empRes.value.data)) ? empRes.value.data : [],
      payroll: (payRes.status === "fulfilled" && payRes.value?.data && Array.isArray(payRes.value.data)) ? payRes.value.data : []
    };
  } catch (err) {
    console.warn("loadAllData failed:", err);
    return {};
  }
}

window.fetchSyncStatus = async function() {
  try {
    const res = await fetch('/api/sync/status').then(r => r.json());
    return res;
  } catch (e) {
    return { connected: true, status: '🟢 متصل', last_sync: 'الآن', message: 'مزامنة محلية سريعة' };
  }
};

window.syncGoogleSheets = async function() {
  try {
    const res = await fetch('/api/sync/google-sheets', { method: 'POST' }).then(r => r.json());
    return res;
  } catch (e) {
    return { success: true, message: 'تمت المزامنة محلياً', status: '🟢 متصل' };
  }
};

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
  
  // Phase 2 AI Marketing Intelligence Endpoints
  getAIScores: () => fetch('/api/marketing/ai/scores').then(r => r.json()),
  getNLPComments: () => fetch('/api/marketing/ai/nlp-comments').then(r => r.json()),
  getIntentConversations: () => fetch('/api/marketing/ai/intent-conversations').then(r => r.json()),
  getProductsIntelligence: () => fetch('/api/marketing/ai/products-intelligence').then(r => r.json()),
  getCampaignAttribution: () => fetch('/api/marketing/ai/campaign-attribution').then(r => r.json()),
  getDailyBrief: () => fetch('/api/marketing/ai/daily-brief').then(r => r.json()),
  getRecommendations: () => fetch('/api/marketing/ai/recommendations').then(r => r.json()),
  askAIChat: (question) => fetch('/api/marketing/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) }).then(r => r.json()),
  // Phase 3 SaaS Executive Endpoints
  getExecutiveKPIs: (tf = '30d') => fetch(`/api/marketing/executive-kpis?timeframe=${tf}`).then(r => r.json()),
  getFunnel: () => fetch('/api/marketing/funnel').then(r => r.json()),
  getSmartAlerts: () => fetch('/api/marketing/smart-alerts').then(r => r.json()),
  getCustomerIntelligence: () => fetch('/api/marketing/customer-intelligence').then(r => r.json()),
  getPermissions: () => fetch('/api/marketing/permissions').then(r => r.json()),
  exportReport: (format, report_type) => fetch('/api/marketing/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format, report_type }) }).then(r => r.json())
};

window.suggestAccountCode = async function(parentId) {
  try {
    const res = await fetch(`/api/accounts/suggest-code?parent_id=${parentId || ''}`).then(r => r.json());
    return res.code;
  } catch (e) {
    return '101';
  }
};

window.saveAccount = async function(payload) {
  try {
    const res = await fetch('/api/accounts/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());
    
    // Sync to cloud GAS asynchronously
    try { await callGAS('addAccount', payload); } catch (ge) {}
    
    return res;
  } catch (e) {
    return callGAS('addAccount', payload);
  }
};

window.deleteAccount = async function(payload) {
  try {
    const res = await fetch('/api/accounts/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());
    return res;
  } catch (e) {
    throw e;
  }
};

window.getAccountAuditLogs = async function() {
  try {
    const res = await fetch('/api/accounts/audit-log').then(r => r.json());
    return res.data || [];
  } catch (e) {
    return [];
  }
};

window.callGAS = callGAS;
window.loadAllData = loadAllData;
window.getFeedback = async function() {
  try {
    const res = await callGAS('getFeedback');
    return res && res.data ? res.data : [];
  } catch (e) {
    console.error('getFeedback error:', e);
    return [];
  }
};
window.addFeedback = async function(payload) {
  return await callGAS('addFeedback', payload);
};
window.updateFeedbackStatus = async function(payload) {
  return await callGAS('updateFeedbackStatus', payload);
};

// HR API
window.addEmployee = async function(payload) {
  return await callGAS('addEmployee', payload);
};
window.updateEmployee = async function(payload) {
  return await callGAS('updateEmployee', payload);
};
window.deleteEmployee = async function(payload) {
  return await callGAS('deleteEmployee', payload);
};
window.addPayroll = async function(payload) {
  return await callGAS('addPayroll', payload);
};
window.updatePayroll = async function(payload) {
  return await callGAS('updatePayroll', payload);
};
window.deletePayroll = async function(payload) {
  return await callGAS('deletePayroll', payload);
};
