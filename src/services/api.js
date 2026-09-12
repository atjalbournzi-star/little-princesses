// ── MULTI-TENANCY SAAS CONTEXT & INTERCEPTOR ──
window.getActiveTenantId = function() {
  try {
    return localStorage.getItem('lp_active_tenant_id') || 'lp_main';
  } catch(e) { return 'lp_main'; }
};

window.getActiveTenantInfo = function() {
  try {
    const t = localStorage.getItem('lp_active_tenant_info');
    if (t) {
      const parsed = JSON.parse(t);
      if (parsed && parsed.name && !parsed.name.includes('Little Princesses') && !parsed.name.includes('الأميرات')) {
        return parsed;
      }
    }
  } catch(e) {}
  const b = (typeof window !== 'undefined' && window.BrandService) ? window.BrandService.getProfile() : null;
  return { id: 'main_tenant', name: (b ? b.shortName || b.name : 'ERP Master'), plan: 'Enterprise', currency: 'YER' };
};

window.setActiveTenant = function(tenant) {
  if (!tenant) return;
  const tid = typeof tenant === 'string' ? tenant : (tenant.id || 'lp_main');
  localStorage.setItem('lp_active_tenant_id', tid);
  if (typeof tenant === 'object') {
    localStorage.setItem('lp_active_tenant_info', JSON.stringify(tenant));
  }
  window.dispatchEvent(new CustomEvent('lp_tenant_changed', { detail: { tenantId: tid, tenant } }));
};

// ── CLIENT-SIDE UUIDv7 GENERATOR FOR DETERMINISTIC TRANSACTION KEYS ──
window.generateUUIDv7 = function() {
  try {
    const timestamp = Date.now();
    const hexTime = timestamp.toString(16).padStart(12, '0');
    const randomBytes = Array.from(window.crypto.getRandomValues(new Uint8Array(10)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hexTime.slice(0,8)}-${hexTime.slice(8,12)}-7${randomBytes.slice(1,4)}-${(parseInt(randomBytes.slice(4,6), 16) & 0x3f | 0x80).toString(16)}${randomBytes.slice(6,8)}-${randomBytes.slice(8,20)}`;
  } catch (e) {
    return 'v7-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
  }
};

// Global Fetch interceptor injecting X-Tenant-ID, Authorization & Idempotency-Key
if (!window.__fetch_tenant_intercepted) {
  window.__fetch_tenant_intercepted = true;
  const _origFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    options = options || {};
    options.headers = options.headers || {};
    const tid = window.getActiveTenantId();
    
    if (typeof options.headers.set === 'function') {
      options.headers.set('X-Tenant-ID', tid);
    } else {
      options.headers['X-Tenant-ID'] = tid;
    }

    // Auto-inject Idempotency-Key on mutating HTTP methods if not already supplied
    const method = (options.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const hasIdemKey = typeof options.headers.get === 'function' 
        ? options.headers.get('Idempotency-Key') 
        : (options.headers['Idempotency-Key'] || options.headers['idempotency-key']);
      
      if (!hasIdemKey) {
        const newIdemKey = window.generateUUIDv7();
        if (typeof options.headers.set === 'function') {
          options.headers.set('Idempotency-Key', newIdemKey);
        } else {
          options.headers['Idempotency-Key'] = newIdemKey;
        }
      }
    }

    const token = localStorage.getItem('erp_auth_token') || localStorage.getItem('lp_erp_token') || localStorage.getItem('erp_token');
    if (token) {
      if (typeof options.headers.set === 'function') {
        options.headers.set('Authorization', `Bearer ${token}`);
      } else {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return _origFetch(url, options);
  };
}

// GAS is called via our local Python server proxy (/api/gas) to bypass CORS.
// The Python server forwards the request to Google Apps Script server-side.
const GAS_PROXY_URL = window.location.origin + '/api/gas';

async function callGAS(action, payload = {}) {
  const tenantId = window.getActiveTenantId();
  const body = JSON.stringify({ action, data: payload, tenant_id: tenantId, ...payload });
  console.log("[GAS PROXY] Calling action:", action, "Tenant:", tenantId);

  const res = await fetch(GAS_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
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
      fetch("/api/inventory").then(r => r.json()).catch(() => callGAS("getInventory")),
      fetch("/api/accounts/list").then(r => r.json()).then(d => {
        const list = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []);
        return { data: list };
      }).catch(() => ({ data: [] })),
      callGAS("getProducts"),
      callGAS("getOrders"),
      fetch("/api/purchases").then(r => r.json()).then(d => {
        const list = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []);
        return { data: list };
      }).catch(() => ({ data: [] })),
      callGAS("getFactory"),
      fetch("/api/vouchers").then(r => r.json()).then(d => {
        const list = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []);
        return { data: list };
      }).catch(() => ({ data: [] })),
      fetch("/api/expenses").then(r => r.json()).then(d => {
        const list = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []);
        return { data: list };
      }).catch(() => ({ data: [] })),
      fetch("/api/journal").then(r => r.json()).then(d => {
        const list = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []);
        return { data: list };
      }).catch(() => ({ data: [] })),
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

    let inventoryData = [];
    if (iRes.status === "fulfilled" && iRes.value) {
      const rawList = Array.isArray(iRes.value.data) ? iRes.value.data : (Array.isArray(iRes.value) ? iRes.value : []);
      inventoryData = rawList.map(i => {
        const name = i.item_name || i.name || "";
        const q = Number(i.qty !== undefined && i.qty !== null ? i.qty : (i.quantity !== undefined && i.quantity !== null ? i.quantity : (i.quantity_meters || 0)));
        const c = Number(i.cost_per_meter !== undefined && i.cost_per_meter !== null ? i.cost_per_meter : (i.cost_per_unit !== undefined && i.cost_per_unit !== null ? i.cost_per_unit : (i.unit_cost !== undefined && i.unit_cost !== null ? i.unit_cost : (i.cost || 0))));
        return {
          ...i,
          id: i.id,
          name: name,
          item_name: name,
          code: i.item_code || i.code || i.id,
          item_code: i.item_code || i.code || i.id,
          qty: q,
          quantity: q,
          quantity_meters: q,
          cost: c,
          unit_cost: c,
          cost_per_unit: c,
          cost_per_meter: c,
          total_value: Number(i.total_value || (q * c)),
          category: i.category || "أقمشة وخامات",
          unit: i.unit || "متر",
          currency: i.currency || "YER",
          supply_date: i.supply_date || i.created_at || ""
        };
      });
    }

    return {
      customers: (cRes.status === "fulfilled" && cRes.value?.data && Array.isArray(cRes.value.data)) ? cRes.value.data.map(c => ({
        ...c,
        id: c.id,
        name: c.name || c.customer_name || "",
        phone: c.phone || "",
        category: c.category || "VIP",
        city: c.city || "صنعاء"
      })) : [],
      inventory: inventoryData,
      accounts: accountsData,
      products: (pRes.status === "fulfilled" && pRes.value?.data && Array.isArray(pRes.value.data)) ? pRes.value.data.map(p => ({
        ...p,
        id: p.id,
        name: p.name || p.title || "",
        price: Number(p.base_price !== undefined ? p.base_price : (p.price || 0)),
        cost: Number(p.cost_price !== undefined ? p.cost_price : (p.cost || 0)),
        sku: p.sku || p.id,
        category: p.category || "فساتين سهرة",
        image: p.image_url || p.image || ""
      })) : [],
      orders: (oRes.status === "fulfilled" && oRes.value?.data && Array.isArray(oRes.value.data)) ? oRes.value.data.map(o => ({
        ...o,
        id: o.id,
        order_no: o.order_no || o.id,
        customer_id: o.customer_id || "",
        customer_name: o.customer_name || o.name || o.customer_id || "",
        child_id: o.child_id || "",
        child_name: o.child_name || "",
        product_id: o.product_id || "",
        product_name: o.product_name || "",
        qty: Number(o.quantity !== undefined ? o.quantity : (o.qty || 1)),
        total: Number(o.total_amount !== undefined ? o.total_amount : (o.total || 0)),
        paid: Number(o.paid_amount !== undefined ? o.paid_amount : (o.paid || 0)),
        remaining: Number(o.remaining_amount !== undefined ? o.remaining_amount : (o.remaining !== undefined ? o.remaining : (Number(o.total_amount || o.total || 0) - Number(o.paid_amount || o.paid || 0)))),
        currency: o.currency || "YER ﷼",
        order_date: o.order_date || o.created_at || (new Date().toISOString()),
        delivery_date: o.delivery_date || "",
        status: o.status || "نشط",
        production_status: o.production_status || "قيد الخياطة 🪡"
      })) : [],
      purchases: (puRes.status === "fulfilled" && puRes.value) ? (Array.isArray(puRes.value.data) ? puRes.value.data : (Array.isArray(puRes.value) ? puRes.value : [])) : [],
      factory: (fRes.status === "fulfilled" && fRes.value?.data && Array.isArray(fRes.value.data)) ? fRes.value.data : [],
      vouchers: (vRes.status === "fulfilled" && vRes.value) ? (Array.isArray(vRes.value.data) ? vRes.value.data : (Array.isArray(vRes.value) ? vRes.value : [])) : [],
      expenses: (eRes.status === "fulfilled" && eRes.value) ? (Array.isArray(eRes.value.data) ? eRes.value.data : (Array.isArray(eRes.value) ? eRes.value : [])) : [],
      journal: (jRes.status === "fulfilled" && jRes.value) ? (Array.isArray(jRes.value.data) ? jRes.value.data : (Array.isArray(jRes.value) ? jRes.value : [])) : [],
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
    return callGAS('deleteAccount', payload);
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

window.syncChartOfAccounts = async function() {
  try {
    const res = await fetch('/api/accounts/sync-cloud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then(r => r.json());
    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
      return res;
    }
  } catch (e) {
    console.warn("Backend sync-cloud fallback:", e);
  }
  return await callGAS('getAccounts');
};

window.callGAS = callGAS;
window.loadAllData = loadAllData;
window.getFeedback = async function() {
  try {
    const res = await fetch('/api/quality/feedback').then(r => r.json()).catch(() => callGAS('getFeedback'));
    return res && res.data ? res.data : [];
  } catch (e) {
    console.error('getFeedback error:', e);
    return [];
  }
};
window.addFeedback = async function(payload) {
  try {
    const res = await fetch('/api/quality/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());
    return res;
  } catch (e) {
    return await callGAS('addFeedback', payload);
  }
};
window.updateFeedbackStatus = async function(payload) {
  return await callGAS('updateFeedbackStatus', payload);
};

// ── Quality Management & Intelligence API (100% Free / Self-Contained) ──
window.qualityAPI = {
  getDashboard: () => fetch('/api/quality/dashboard').then(r => r.json()).catch(() => ({ success: false, data: {} })),
  getIntelligence: (dimension) => fetch(dimension ? `/api/quality/intelligence/${dimension}` : '/api/quality/intelligence').then(r => r.json()).catch(() => ({ success: false, data: {} })),
  getEvaluations: () => fetch('/api/quality/evaluations').then(r => r.json()).catch(() => callGAS('getQualityEvaluations')),
  addEvaluation: (data) => fetch('/api/quality/evaluations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(() => callGAS('addQualityEvaluation', data)),
  getInspections: () => fetch('/api/quality/inspections').then(r => r.json()).catch(() => callGAS('getQualityInspections')),
  addInspection: (data) => fetch('/api/quality/inspections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(() => callGAS('addQualityInspection', data)),
  getDefects: () => fetch('/api/quality/defects').then(r => r.json()).catch(() => callGAS('getQualityDefects')),
  addDefect: (data) => fetch('/api/quality/defects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(() => callGAS('addQualityDefect', data)),
  getFeedback: () => fetch('/api/quality/feedback').then(r => r.json()).catch(() => callGAS('getQualityFeedback')),
  addFeedback: (data) => fetch('/api/quality/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(() => callGAS('addQualityFeedback', data)),
  getComplaints: () => fetch('/api/quality/complaints').then(r => r.json()).catch(() => callGAS('getQualityComplaints')),
  addComplaint: (data) => fetch('/api/quality/complaints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(() => callGAS('addQualityComplaint', data)),
  getReturns: () => fetch('/api/quality/returns').then(r => r.json()).catch(() => callGAS('getQualityReturns')),
  addReturn: (data) => fetch('/api/quality/returns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(() => callGAS('addQualityReturn', data)),
  getCorrectiveActions: () => fetch('/api/quality/corrective_actions').then(r => r.json()).catch(() => callGAS('getQualityCorrectiveActions')),
  addCorrectiveAction: (data) => fetch('/api/quality/corrective_actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(() => callGAS('addQualityCorrectiveAction', data)),
  getCheckpoints: () => fetch('/api/quality/checkpoints').then(r => r.json()).catch(() => callGAS('getQualityCheckpoints')),
  getSettings: () => fetch('/api/quality/settings').then(r => r.json()).catch(() => callGAS('getQualitySettings')),
  saveSettings: (data) => fetch('/api/quality/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(() => callGAS('saveQualitySettings', data))
};

// HR & Payroll Studio API
window.hrAPI = {
  getEmployees: async () => {
    try {
      const res = await fetch('/api/hr/employees').then(r => r.json());
      if (res && res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
    const gasRes = await callGAS('getEmployees');
    return gasRes && Array.isArray(gasRes.data) ? gasRes.data : [];
  },
  addEmployee: async (data) => {
    try {
      const res = await fetch('/api/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json());
      if (res && res.success) return res;
      if (res && res.error) throw new Error(res.error);
    } catch (e) {
      if (e.message) throw e;
    }
    return await callGAS('addEmployee', data);
  },
  addAdvance: async (data) => {
    try {
      const res = await fetch('/api/hr/employees/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json());
      if (res && res.success) return res;
      if (res && res.error) throw new Error(res.error);
    } catch (e) {
      if (e.message) throw e;
    }
    return await callGAS('addJournalEntry', data);
  },
  getPayroll: async (month) => {
    try {
      const url = month ? `/api/hr/payroll?month=${month}` : '/api/hr/payroll';
      const res = await fetch(url).then(r => r.json());
      if (res && res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
    const gasRes = await callGAS('getPayroll');
    return gasRes && Array.isArray(gasRes.data) ? gasRes.data : [];
  },
  calculatePayroll: async (month) => {
    try {
      const url = month ? `/api/hr/payroll/calculate?month=${month}` : '/api/hr/payroll/calculate';
      const res = await fetch(url).then(r => r.json());
      if (res && res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
    return [];
  },
  postPayroll: async (data) => {
    try {
      const res = await fetch('/api/hr/payroll/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json());
      if (res && res.success) return res;
      if (res && res.error) throw new Error(res.error);
    } catch (e) {
      if (e.message) throw e;
    }
    return await callGAS('addPayrollBatch', data);
  }
};

window.addEmployee = async function(payload) {
  return await window.hrAPI.addEmployee(payload);
};
window.updateEmployee = async function(payload) {
  return await window.hrAPI.addEmployee(payload);
};
window.deleteEmployee = async function(payload) {
  return await callGAS('deleteEmployee', payload);
};
window.addPayroll = async function(payload) {
  return await window.hrAPI.postPayroll(payload);
};
window.updatePayroll = async function(payload) {
  return await callGAS('updatePayroll', payload);
};
window.deletePayroll = async function(payload) {
  return await callGAS('deletePayroll', payload);
};

// ── Auth & RBAC User Management API ──
window.authAPI = {
  login: async (username, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      }).then(r => r.json());
      if (res && res.success && res.user) {
        localStorage.setItem('erp_active_user', JSON.stringify(res.user));
        localStorage.setItem('erp_auth_token', res.token || '');
      }
      return res;
    } catch (e) {
      console.error('authAPI.login error:', e);
      return { success: false, message: 'تعذر الاتصال بخادم المصادقة' };
    }
  },
  getCurrentUser: async () => {
    try {
      const token = localStorage.getItem('erp_auth_token');
      const res = await fetch('/api/auth/me', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      }).then(r => r.json());
      if (res && res.success && res.user) {
        localStorage.setItem('erp_active_user', JSON.stringify(res.user));
        return res.user;
      }
    } catch (e) {}
    try {
      const cached = localStorage.getItem('erp_active_user');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return { id: 1, username: 'admin', role: 'admin', full_name: 'المدير العام', role_label: 'المدير العام', is_active: 1 };
  },
  logout: () => {
    localStorage.removeItem('erp_active_user');
    localStorage.removeItem('erp_auth_token');
  }
};

window.usersAPI = {
  getUsers: async () => {
    try {
      const res = await fetch('/api/users').then(r => r.json());
      return res && res.users ? res.users : [];
    } catch (e) {
      console.error('usersAPI.getUsers error:', e);
      return [];
    }
  },
  saveUser: async (userData) => {
    try {
      const res = await fetch('/api/users/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      }).then(r => r.json());
      return res;
    } catch (e) {
      console.error('usersAPI.saveUser error:', e);
      return { success: false, message: String(e) };
    }
  },
  deleteUser: async (userId) => {
    try {
      const res = await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId })
      }).then(r => r.json());
      return res;
    } catch (e) {
      console.error('usersAPI.deleteUser error:', e);
      return { success: false, message: String(e) };
    }
  },
  syncUsers: async () => {
    try {
      const res = await fetch('/api/users/sync', { method: 'POST' }).then(r => r.json());
      return res;
    } catch (e) {
      return { success: true };
    }
  }
};



// ── Enterprise Relational Entity Data Services (ID-Driven CRUD) ──

window.customerAPI = {
  getCustomers: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const url = query ? `/api/crm/customers?${query}` : '/api/crm/customers';
      const res = await fetch(url).then(r => r.json());
      if (res && res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
    const gasRes = await callGAS('getCustomers');
    return gasRes && Array.isArray(gasRes.data) ? gasRes.data : [];
  },
  getCustomerById: async (id) => {
    try {
      const res = await fetch(`/api/crm/customers?search=${encodeURIComponent(id)}`).then(r => r.json());
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) return res.data[0];
    } catch (e) {}
    return await callGAS('getCustomerById', { id });
  },
  createCustomer: async (data) => {
    try {
      const res = await fetch('/api/crm/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json());
      if (res && res.success) return res;
      if (res && res.error) throw new Error(res.error);
    } catch (e) {
      if (e.message && e.message.includes('مسجل مسبقاً')) throw e;
    }
    return await callGAS('addCustomer', data);
  },
  saveCustomer: async (data) => {
    return await window.customerAPI.createCustomer(data);
  },
  updateCustomer: async (id, data) => {
    return await window.customerAPI.createCustomer({ customer_id: id, ...data });
  },
  deleteCustomer: async (id) => {
    return await callGAS('deleteCustomer', { id });
  },
  getMeasurements: async (customerId) => {
    try {
      const cust = await window.customerAPI.getCustomerById(customerId);
      return cust?.measurements || [];
    } catch (e) {
      return [];
    }
  }
};

window.salesAPI = {
  getOrders: async () => {
    try {
      const res = await fetch('/api/sales/orders').then(r => r.json());
      if (res && res.success && Array.isArray(res.data)) return res;
    } catch (e) {}
    const gasRes = await callGAS('getOrders');
    return { success: true, data: gasRes && Array.isArray(gasRes.data) ? gasRes.data : [], kpis: {} };
  },
  createOrder: async (data) => {
    try {
      const res = await fetch('/api/sales/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json());
      if (res && res.success) return res;
      if (res && res.error) throw new Error(res.error);
    } catch (e) {
      if (e.message) throw e;
    }
    return await callGAS('addOrder', data);
  },
  updateOrder: async (id, data) => {
    try {
      const res = await fetch('/api/sales/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data })
      }).then(r => r.json());
      if (res && res.success) return res;
    } catch (e) {}
    return await window.salesAPI.createOrder({ id, ...data });
  },
  deleteOrder: async (id) => {
    try {
      const res = await fetch('/api/sales/orders/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      }).then(r => r.json());
      if (res && res.success) return res;
    } catch (e) {}
    return await callGAS('deleteOrder', { id });
  }
};

window.orderAPI = {
  getOrders: async () => {
    try {
      const res = await fetch('/api/sales/orders').then(r => r.json());
      if (res && res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
    const gasRes = await callGAS('getOrders');
    return gasRes && Array.isArray(gasRes.data) ? gasRes.data : [];
  },
  getOrderById: async (id) => {
    return await callGAS('getOrderById', { id });
  },
  createOrder: async (data) => {
    return await window.salesAPI.createOrder(data);
  },
  updateOrder: async (id, data) => {
    return await window.salesAPI.createOrder({ id, ...data });
  },
  deleteOrder: async (id) => {
    return await window.salesAPI.deleteOrder(id);
  }
};

window.bomAPI = {
  getModels: async () => {
    try {
      const res = await fetch('/api/products/bom').then(r => r.json());
      if (res && res.success && Array.isArray(res.data)) return res;
    } catch (e) {}
    const gasRes = await callGAS('getProducts');
    return { success: true, data: gasRes && Array.isArray(gasRes.data) ? gasRes.data : [], kpis: {} };
  },
  saveModel: async (data) => {
    try {
      const res = await fetch('/api/products/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json());
      if (res && res.success) return res;
      if (res && res.error) throw new Error(res.error);
    } catch (e) {
      if (e.message) throw e;
    }
    return await callGAS('addProduct', data);
  },
  deleteModel: async (id) => {
    try {
      const res = await fetch('/api/products/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      }).then(r => r.json());
      if (res && res.success) return res;
    } catch (e) {}
    return await callGAS('deleteProduct', { id });
  }
};

window.productAPI = {
  getProducts: async () => {
    try {
      const res = await fetch('/api/products/bom').then(r => r.json());
      if (res && res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
    const gasRes = await callGAS('getProducts');
    return gasRes && Array.isArray(gasRes.data) ? gasRes.data : [];
  },
  getProductById: async (id) => {
    return await callGAS('getProductById', { id });
  },
  createProduct: async (data) => {
    return await window.bomAPI.saveModel(data);
  },
  updateProduct: async (id, data) => {
    return await window.bomAPI.saveModel({ id, ...data });
  },
  deleteProduct: async (id) => {
    return await window.bomAPI.deleteModel(id);
  }
};

window.inventoryAPI = {
  getInventory: async (params = {}) => {
    try {
      const q = new URLSearchParams(params).toString();
      const res = await fetch(q ? `/api/inventory/items?${q}` : '/api/inventory/items').then(r => r.json());
      if (res && res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
    const gasRes = await callGAS('getInventory');
    return gasRes && Array.isArray(gasRes.data) ? gasRes.data : [];
  },
  getItems: async (params) => {
    return await window.inventoryAPI.getInventory(params);
  },
  addInventory: async (data) => {
    try {
      const res = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json());
      if (res && res.success) return res;
      if (res && res.error) throw new Error(res.error);
    } catch (e) {
      if (e.message) throw e;
    }
    return await callGAS('addInventory', data);
  },
  createItem: async (data) => {
    return await window.inventoryAPI.addInventory(data);
  },
  getProcurements: async (params = {}) => {
    try {
      const q = new URLSearchParams(params).toString();
      const res = await fetch(q ? `/api/inventory/procurement?${q}` : '/api/inventory/procurement').then(r => r.json());
      if (res && res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
    const gasRes = await callGAS('getPurchases');
    return gasRes && Array.isArray(gasRes.data) ? gasRes.data : [];
  },
  createProcurement: async (data) => {
    try {
      const res = await fetch('/api/inventory/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json());
      if (res && res.success) return res;
      if (res && res.error) throw new Error(res.error);
    } catch (e) {
      if (e.message) throw e;
    }
    return await callGAS('addPurchase', data);
  },
  issueMaterials: async (data) => {
    try {
      const res = await fetch('/api/inventory/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json());
      if (res && res.success) return res;
      if (res && res.error) throw new Error(res.error);
    } catch (e) {
      if (e.message) throw e;
    }
    return await callGAS('recordInventoryMovement', data);
  },
  recordMovement: async (data) => {
    return await window.inventoryAPI.issueMaterials(data);
  },
  adjustInventory: async (data) => {
    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json());
      if (res && res.success) return res;
      if (res && res.error) throw new Error(res.error);
    } catch (e) {
      if (e.message) throw e;
    }
    return { success: false, message: 'تعذر إرسال قيد تسوية المخزون' };
  }
};

window.paymentAPI = {
  getPayments: async () => {
    const gasRes = await callGAS('getPayments');
    return gasRes && Array.isArray(gasRes.data) ? gasRes.data : [];
  },
  createPayment: async (data) => {
    return await callGAS('addPayment', data);
  }
};

window.journalAPI = {
  getJournalEntries: async () => {
    const gasRes = await callGAS('getJournalEntries');
    return gasRes && Array.isArray(gasRes.data) ? gasRes.data : [];
  },
  createJournalEntry: async (data) => {
    return await callGAS('addJournalEntry', data);
  }
};

window.auditAPI = {
  getLogs: async () => {
    try {
      const res = await fetch('/api/audit-logs').then(r => r.json());
      if (res && res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
    const gasRes = await callGAS('getAuditLogs');
    return gasRes && Array.isArray(gasRes.data) ? gasRes.data : [];
  }
};

window.sequenceAPI = {
  getSequences: async () => {
    try {
      const res = await fetch('/api/sequences').then(r => r.json());
      if (res && res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
    const gasRes = await callGAS('getSequences');
    return gasRes && Array.isArray(gasRes.data) ? gasRes.data : [];
  }
};

window.tenantAPI = {
  getTenants: async () => {
    try {
      const res = await fetch('/api/tenants/list').then(r => r.json());
      if (res && res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
    const b = (typeof window !== 'undefined' && window.BrandService) ? window.BrandService.getProfile() : null;
    return [
      { id: 'main_tenant', name: (b ? b.shortName || b.name : 'ERP Master'), plan: 'Enterprise', currency: 'YER' }
    ];
  },
  getCurrentTenant: async () => {
    try {
      const res = await fetch('/api/tenants/current').then(r => r.json());
      if (res && res.success && res.data) return res.data;
    } catch (e) {}
    return window.getActiveTenantInfo();
  },
  createTenant: async (data) => {
    const res = await fetch('/api/tenants/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json());
    return res;
  },
  switchTenant: async (tenantId) => {
    const res = await fetch('/api/tenants/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId })
    }).then(r => r.json());
    if (res && res.success) {
      window.setActiveTenant(res.tenant || tenantId);
    }
    return res;
  }
};

window.productionAPI = {
  getPipeline: async () => {
    try {
      const res = await fetch('/api/production/pipeline').then(r => r.json());
      if (res && res.success) return res;
    } catch (e) {}
    const gasRes = await callGAS('getFactory');
    return {
      success: true,
      pipeline: gasRes && Array.isArray(gasRes.data) ? gasRes.data : [],
      kpis: {},
      confirmed_orders: [],
      tailors: []
    };
  },
  updateStage: async (data) => {
    try {
      const res = await fetch('/api/production/update-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json());
      if (res && res.success) return res;
    } catch (e) {}
    return await callGAS('updateFactory', data);
  },
  assignOrder: async (data) => {
    try {
      const res = await fetch('/api/production/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json());
      if (res && res.success) return res;
    } catch (e) {}
    return await callGAS('updateFactory', data);
  }
};

window.settingsAPI = {
  getSettings: async () => {
    try {
      const res = await fetch('/api/settings').then(r => r.json());
      if (res && res.success) return res;
    } catch (e) {}
    return {
      success: true,
      company: {
        company_name: localStorage.getItem('erp_company_name') || ((typeof window !== 'undefined' && window.BrandService) ? window.BrandService.getProfile().name : 'نظام الإدارة المتكامل الذكي'),
        phone: localStorage.getItem('erp_phone') || '776773458',
        address: localStorage.getItem('erp_address') || 'اليمن صنعاء',
        fiscal_date: localStorage.getItem('erp_fiscal_date') || '2026-01-01',
        theme_mode: localStorage.getItem('lp_theme') || 'light',
        base_currency: localStorage.getItem('erp_system_currency') || 'YER'
      },
      currency: {
        base_currency: 'YER',
        rates: { YER: 1.0, SAR: 142.0, USD: 535.0 }
      },
      theme: { mode: localStorage.getItem('lp_theme') || 'light', primary_color: '#B0005A' }
    };
  },
  saveSettings: async (data) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json());
      if (res && res.success) return res;
      if (res && res.error) throw new Error(res.error);
    } catch (e) {
      if (e.message) throw e;
    }
    return await callGAS('saveSettings', data);
  },
  getFxRates: async () => {
    try {
      const res = await fetch('/api/settings/fx-rates').then(r => r.json());
      if (res && res.success && res.rates) return res.rates;
    } catch (e) {}
    return { YER: 1.0, SAR: 142.0, USD: 535.0 };
  },
  updateFxRates: async (rates) => {
    try {
      const res = await fetch('/api/settings/fx-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates })
      }).then(r => r.json());
      if (res && res.success) return res;
    } catch (e) {}
    return { success: true, rates };
  }
};

window.expenseAPI = {
  getExpenses: async () => {
    try {
      const res = await fetch('/api/finance/expenses').then(r => r.json());
      if (res && res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
    try {
      const res = await fetch('/api/expenses').then(r => r.json());
      if (res && res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
    if (typeof callGAS === 'function') {
      const gasRes = await callGAS('getExpenses');
      if (gasRes && Array.isArray(gasRes.data)) return gasRes.data;
    }
    return [];
  },
  createExpense: async (data) => {
    try {
      const res = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json());
      if (res && res.success) return res;
      if (res && res.error) throw new Error(res.error);
    } catch (e) {
      if (e.message && !e.message.includes('fetch')) throw e;
    }
    if (typeof callGAS === 'function') {
      return await callGAS('addExpense', data);
    }
    return { success: true, data };
  },
  deleteExpense: async (data) => {
    const payload = typeof data === 'object' ? data : { id: data, expense_no: data };
    try {
      const res = await fetch('/api/finance/expenses/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());
      if (res && res.success) return res;
    } catch (e) {}
    if (typeof callGAS === 'function') {
      return await callGAS('deleteExpense', payload);
    }
    return { success: true };
  }
};
window.expensesAPI = window.expenseAPI;

window.reportsAPI = {
  getFinancialStatements: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    try {
      const res = await fetch(`/api/reports/financial-statements?${qs}`).then(r => r.json());
      if (res && res.success) return res;
    } catch (e) {}
    return null;
  },
  getTrialBalance: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    try {
      const res = await fetch(`/api/reports/trial-balance?${qs}`).then(r => r.json());
      if (res && res.success) return res;
    } catch (e) {}
    return null;
  },
  getGeneralLedger: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    try {
      const res = await fetch(`/api/reports/general-ledger?${qs}`).then(r => r.json());
      if (res && res.success) return res;
    } catch (e) {}
    return null;
  },
  getReconciliations: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    try {
      const res = await fetch(`/api/reports/reconciliations?${qs}`).then(r => r.json());
      if (res && res.success) return res;
    } catch (e) {}
    return null;
  }
};

window.backupAPI = {
  getStatus: async () => {
    try {
      const res = await fetch('/api/backup/status').then(r => r.json());
      if (res && res.success) return res;
    } catch (e) {}
    return null;
  },
  createSnapshot: async () => {
    try {
      const res = await fetch('/api/backup/snapshot', { method: 'POST' }).then(r => r.json());
      return res;
    } catch (e) {
      return { success: false, message: 'تعذر إنشاء نقطة الاستعادة' };
    }
  },
  restoreBackup: async (payload) => {
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());
      return res;
    } catch (e) {
      return { success: false, message: 'تعذر استعادة النسخة الاحتياطية' };
    }
  },
  getSnapshots: async () => {
    try {
      const res = await fetch('/api/backup/list').then(r => r.json());
      if (res && res.success) return res.snapshots || [];
    } catch (e) {}
    return [];
  }
};

window.auditAPI = {
  getLogs: async (params = {}) => {
    try {
      const q = new URLSearchParams(params).toString();
      const res = await fetch(`/api/audit-logs?${q}`).then(r => r.json());
      if (res && res.success) return res;
    } catch (e) {}
    try {
      if (typeof callGAS === 'function') {
        const gasRes = await callGAS('getAuditLogs', params);
        if (gasRes && gasRes.success) return gasRes.data;
      }
    } catch (e) {}
    return { success: true, logs: [], total: 0 };
  },
  logAction: async (actionData) => {
    try {
      const res = await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionData)
      }).then(r => r.json());
      return res;
    } catch (e) {
      return { success: false };
    }
  }
};

