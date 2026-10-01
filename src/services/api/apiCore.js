/**
 * ============================================================================
 * apiCore.js — SaaS Multi-Tenancy Context, Fetch Interceptor & GAS Proxy
 * Domain: Core Network Layer | Architecture Standard: Rule 1, 3 & 4
 * ============================================================================
 */

(function(window) {
  'use strict';

  // ── MULTI-TENANCY SAAS CONTEXT ──
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

  // ── Global Fetch Interceptor injecting X-Tenant-ID, Authorization & Idempotency-Key ──
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

  // ── Google Apps Script Proxy ──
  const GAS_PROXY_URL = (typeof window !== 'undefined' && window.location ? window.location.origin : '') + '/api/gas';

  async function callGAS(action, payload = {}) {
    const tenantId = window.getActiveTenantId();
    const body = JSON.stringify({ action, data: payload, tenant_id: tenantId, ...payload });

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
    if (json && json.success === false) {
      throw new Error(json.error || json.message || "GAS returned success:false");
    }
    return json;
  }

  window.callGAS = callGAS;
  window.ApiCore = {
    getActiveTenantId: window.getActiveTenantId,
    getActiveTenantInfo: window.getActiveTenantInfo,
    setActiveTenant: window.setActiveTenant,
    generateUUIDv7: window.generateUUIDv7,
    callGAS: callGAS
  };

})(typeof window !== 'undefined' ? window : globalThis);
