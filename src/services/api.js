/**
 * ============================================================================
 * api.js — Central API Facade & Unified Network Dispatcher
 * Domain-Driven Service Architecture Facade | Architecture Standard: Rule 3 & 4
 * ============================================================================
 */

(function(window) {
  'use strict';

  // الاحتفاظ بالدوال الأصلية الموجودة مسبقاً لمنع التكرار اللانهائي (Infinite Loop Fix)
  const originalCallGAS = typeof window.callGAS === 'function' ? window.callGAS : (window.ApiCore?.callGAS || null);
  const originalLoadAllData = typeof window.loadAllData === 'function' ? window.loadAllData : null;

  // دالة تحميل البيانات الآمنة بدون دوران حلقي
  const safeLoadAllData = async () => {
    try {
      if (originalLoadAllData && originalLoadAllData !== safeLoadAllData) {
        return await originalLoadAllData();
      }
      if (window.DataLoader?.loadAll) {
        return await window.DataLoader.loadAll();
      }
      if (window.ApiService?.getAllData) {
        return await window.ApiService.getAllData();
      }
      // جلب مباشر من مسار المزامنة إذا لم توجد دالة وسيطة
      const res = await fetch('/api/sync/status');
      if (res.ok) {
        const data = await res.json();
        return data || {};
      }
      return {};
    } catch (err) {
      console.warn('safeLoadAllData fallback warning:', err);
      return {};
    }
  };

  // ── Unified API Network Facade ──
  const API = {
    // Core & Data Loader
    callGAS: (action, payload) => {
      if (originalCallGAS) return originalCallGAS(action, payload);
      return Promise.resolve({ success: false, message: 'callGAS not available' });
    },
    loadAllData: safeLoadAllData,

    // Multi-Tenancy & Auth
    auth: window.authAPI || {},
    users: window.usersAPI || {},
    tenant: window.tenantAPI || {},
    audit: window.auditAPI || {},
    sequence: window.sequenceAPI || {},

    // CRM & Orders
    customers: window.customerAPI || {},
    sales: window.salesAPI || {},
    orders: window.orderAPI || {},
    payments: window.paymentAPI || {},

    // Inventory & Supply Chain
    inventory: window.inventoryAPI || {},

    // Atelier & Production
    production: window.productionAPI || {},
    bom: window.bomAPI || {},
    products: window.productAPI || {},
    quality: window.qualityAPI || {},

    // Accounting & Finance
    accounting: {
      suggestAccountCode: (p) => (window.suggestAccountCode ? window.suggestAccountCode(p) : '101'),
      saveAccount: (p) => (window.saveAccount ? window.saveAccount(p) : Promise.resolve({ success: false })),
      deleteAccount: (p) => (window.deleteAccount ? window.deleteAccount(p) : Promise.resolve({ success: false })),
      getAuditLogs: () => (window.getAccountAuditLogs ? window.getAccountAuditLogs() : Promise.resolve([])),
      syncChart: () => (window.syncChartOfAccounts ? window.syncChartOfAccounts() : Promise.resolve([])),
      journal: window.journalAPI || {},
      expenses: window.expenseAPI || {},
      reports: window.reportsAPI || {}
    },

    // System, HR & Marketing
    system: {
      settings: window.settingsAPI || {},
      backup: window.backupAPI || {},
      syncStatus: () => (window.fetchSyncStatus ? window.fetchSyncStatus() : Promise.resolve({})),
      syncSheets: () => (window.syncGoogleSheets ? window.syncGoogleSheets() : Promise.resolve({}))
    },
    hr: window.hrAPI || {},
    marketing: window.marketingAPI || {}
  };

  // Global Binding
  window.API = API;
  window.api = API;

  // الربط الآمن بدون كسر الذاكرة
  window.callGAS = API.callGAS;
  window.loadAllData = API.loadAllData;

})(typeof window !== 'undefined' ? window : globalThis);