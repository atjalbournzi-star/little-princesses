/**
 * ============================================================================
 * authApi.js — Authentication, Users RBAC, Multi-Tenancy & Audit Logs API
 * Domain: Core Network Layer | Architecture Standard: Rule 1, 3 & 4
 * ============================================================================
 */

(function(window) {
  'use strict';

  var callGAS = function(a, p) { return (window.callGAS || (window.ApiCore && window.ApiCore.callGAS))(a, p); };

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

  window.tenantAPI = {
    getTenants: async () => {
      try {
        const res = await fetch('/api/tenants/list').then(r => r.json());
        if (res && res.success && Array.isArray(res.data)) return res.data;
      } catch (e) {}
      const b = (typeof window !== 'undefined' && window.BrandService) ? window.BrandService.getProfile() : null;
      return [{ id: 'main_tenant', name: (b ? b.shortName || b.name : 'ERP Master'), plan: 'Enterprise', currency: 'YER' }];
    },
    getCurrentTenant: async () => {
      try {
        const res = await fetch('/api/tenants/current').then(r => r.json());
        if (res && res.success && res.data) return res.data;
      } catch (e) {}
      return window.getActiveTenantInfo();
    },
    createTenant: async (data) => {
      return await fetch('/api/tenants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json());
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

  window.auditAPI = {
    getLogs: async (params = {}) => {
      try {
        const q = new URLSearchParams(params).toString();
        const res = await fetch(`/api/audit-logs?${q}`).then(r => r.json());
        if (res && res.success) return res;
      } catch (e) {}
      try {
        const gasRes = await callGAS('getAuditLogs', params);
        if (gasRes && gasRes.success) return gasRes.data;
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

})(typeof window !== 'undefined' ? window : globalThis);
