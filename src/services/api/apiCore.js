/**
 * ============================================================================
 * apiCore.js — SaaS Multi-Tenancy Context, Fetch Interceptor & Double-Click Shield
 * Domain: Core Network Layer | Architecture Standard: Rule 1, 3 & 4 (< 220 lines)
 * ============================================================================
 */

(function(window) {
  'use strict';

  // ── MULTI-TENANCY SAAS CONTEXT ──
  window.getActiveTenantId = function() {
    try { return localStorage.getItem('lp_active_tenant_id') || 'lp_main'; } catch(e) { return 'lp_main'; }
  };

  window.getActiveTenantInfo = function() {
    try {
      const t = localStorage.getItem('lp_active_tenant_info');
      if (t) {
        const p = JSON.parse(t);
        if (p && p.name && !p.name.includes('Little Princesses') && !p.name.includes('الأميرات')) return p;
      }
    } catch(e) {}
    const b = (typeof window !== 'undefined' && window.BrandService) ? window.BrandService.getProfile() : null;
    return { id: 'main_tenant', name: (b ? b.shortName || b.name : 'ERP Master'), plan: 'Enterprise', currency: 'YER' };
  };

  window.setActiveTenant = function(tenant) {
    if (!tenant) return;
    const tid = typeof tenant === 'string' ? tenant : (tenant.id || 'lp_main');
    localStorage.setItem('lp_active_tenant_id', tid);
    if (typeof tenant === 'object') localStorage.setItem('lp_active_tenant_info', JSON.stringify(tenant));
    window.dispatchEvent(new CustomEvent('lp_tenant_changed', { detail: { tenantId: tid, tenant } }));
  };

  // ── IDEMPOTENCY KEY GENERATORS (Deterministic v7 + crypto.randomUUID) ──
  window.generateUUIDv7 = function() {
    try {
      const ts = Date.now().toString(16).padStart(12, '0');
      const rb = Array.from(window.crypto.getRandomValues(new Uint8Array(10))).map(b => b.toString(16).padStart(2, '0')).join('');
      return `${ts.slice(0,8)}-${ts.slice(8,12)}-7${rb.slice(1,4)}-${(parseInt(rb.slice(4,6), 16) & 0x3f | 0x80).toString(16)}${rb.slice(6,8)}-${rb.slice(8,20)}`;
    } catch (e) {
      return 'v7-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
    }
  };

  window.generateIdempotencyKey = function() {
    try {
      if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch(e) {}
    return window.generateUUIDv7 ? window.generateUUIDv7() : ('idemp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11));
  };

  window.escapeHtml = function(val) {
    return String(val === null || val === undefined ? '' : val)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  function getDefaultArabicError(status) {
    if (status === 401) return 'انتهت الجلسة أو غير مصرح، يرجى تسجيل الدخول';
    if (status === 423) return 'الفترة المحاسبية مغلقة ولا يمكن الترحيل فيها 🔒';
    if (status === 409) return 'العملية قيد المعالجة حالياً أو حدث تعارض في البيانات';
    if (status === 403) return 'عفواً، ليس لديك الصلاحية لتنفيذ هذه العملية السيادية';
    if (status === 422) return 'خطأ في صحة وتوازن البيانات المحاسبية أو المخزنية';
    return 'حدث خطأ في النظام (' + status + ')';
  }

  window.formatApiError = function(err) {
    if (!err) return 'حدث خطأ غير متوقع';
    if (typeof err === 'string') return err;
    if (err.userMessage) return err.userMessage;
    if (err.isTimeout) return window.LP_TIMEOUT_MSG || 'انتهت مهلة الاتصال بالخادم، بياناتك ما زالت محفوظة في النموذج — يرجى إعادة المحاولة';
    if (err.isNetworkError) return window.LP_OFFLINE_MSG || 'تعذّر الاتصال بالخادم حالياً، بياناتك ما زالت محفوظة في النموذج — يرجى إعادة المحاولة';
    if (err.message && /[\u0600-\u06FF]/.test(err.message)) return err.message;
    if (err.error && /[\u0600-\u06FF]/.test(err.error)) return err.error;
    if (err.status) return getDefaultArabicError(err.status);
    return err.message || err.error || 'حدث خطأ في النظام';
  };

  // ── IN-FLIGHT REQUEST LOCK & FETCH INTERCEPTOR ──
  const _inFlightLocks = new Set();

  if (!window.__fetch_tenant_intercepted) {
    window.__fetch_tenant_intercepted = true;
    const _origFetch = window.fetch;

    window.fetch = function(url, options = {}) {
      options = options || {};
      options.headers = options.headers || {};
      const tid = window.getActiveTenantId();

      if (typeof options.headers.set === 'function') options.headers.set('X-Tenant-ID', tid);
      else options.headers['X-Tenant-ID'] = tid;

      const method = (options.method || 'GET').toUpperCase();
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
      let lockKey = null;

      if (isMutation) {
        const hasKey = typeof options.headers.get === 'function'
          ? options.headers.get('Idempotency-Key')
          : (options.headers['Idempotency-Key'] || options.headers['idempotency-key']);

        if (!hasKey) {
          const newKey = window.generateIdempotencyKey();
          if (typeof options.headers.set === 'function') options.headers.set('Idempotency-Key', newKey);
          else options.headers['Idempotency-Key'] = newKey;
        }

        const rawBody = typeof options.body === 'string' ? options.body : JSON.stringify(options.body || '');
        lockKey = `${method}:${String(url).split('?')[0]}:${rawBody}`;

        if (_inFlightLocks.has(lockKey)) {
          const blocked = { success: false, error: 'الطلب قيد المعالجة حالياً، يرجى الانتظار لتفادي التكرار', message: 'الطلب قيد المعالجة حالياً، يرجى الانتظار لتفادي التكرار', status: 409, is_in_flight_blocked: true };
          return Promise.resolve(new Response(JSON.stringify(blocked), { status: 409, statusText: 'Conflict', headers: { 'Content-Type': 'application/json' } }));
        }
        _inFlightLocks.add(lockKey);
      }

      const token = localStorage.getItem('erp_auth_token') || localStorage.getItem('lp_erp_token') || localStorage.getItem('erp_token');
      if (token) {
        if (typeof options.headers.set === 'function') options.headers.set('Authorization', `Bearer ${token}`);
        else options.headers['Authorization'] = `Bearer ${token}`;
      }

      const reqExec = (window.NetworkResilience && typeof window.NetworkResilience.fetchWithTimeout === 'function')
        ? window.NetworkResilience.fetchWithTimeout(_origFetch, url, options)
        : _origFetch(url, options);

      const reqPromise = reqExec.then(async (res) => {
        const reqUrl = String(url || '');
        if (res.status === 401 && !reqUrl.includes('/api/auth/login') && !reqUrl.includes('/api/login')) {
          try {
            localStorage.removeItem('erp_auth_token');
            localStorage.removeItem('lp_erp_token');
            localStorage.removeItem('erp_token');
            localStorage.removeItem('erp_active_user');
          } catch(e) {}
          window.dispatchEvent(new CustomEvent('erp:unauthorized', { detail: { url: reqUrl } }));
        }
        if (!res.ok && [400, 401, 403, 409, 422, 423, 500].includes(res.status)) {
          try {
            const clone = res.clone();
            const errData = await clone.json();
            res.extractedError = errData.error || errData.message || getDefaultArabicError(res.status);
          } catch(e) {}
        }
        return res;
      });

      return lockKey ? reqPromise.finally(() => _inFlightLocks.delete(lockKey)) : reqPromise;
    };
  }

  // ── SEQUENCE & UTILITY CLIENT ──
  window.callGAS = async function() { return null; };

  // ── NUMBER SEQUENCES CLIENT ──
  window.previewNextSequenceNumber = async function(k) {
    try {
      const res = await fetch(`/api/sequences/preview?key=${encodeURIComponent(k)}`).then(r => r.json());
      if (res && res.success && (res.sequence_number || res.next_number || res.preview)) return res.sequence_number || res.next_number || res.preview;
    } catch(e) {}
    return null;
  };

  window.getNextSequenceNumber = async function(k) {
    try {
      const res = await fetch(`/api/sequences/next?key=${encodeURIComponent(k)}`).then(r => r.json());
      if (res && res.success && (res.sequence_number || res.next_number)) return res.sequence_number || res.next_number;
    } catch(e) {}
    return null;
  };

  window.ApiCore = {
    getActiveTenantId: window.getActiveTenantId,
    getActiveTenantInfo: window.getActiveTenantInfo,
    setActiveTenant: window.setActiveTenant,
    generateUUIDv7: window.generateUUIDv7,
    generateIdempotencyKey: window.generateIdempotencyKey,
    formatApiError: window.formatApiError,
    callGAS: callGAS,
    previewNextSequenceNumber: window.previewNextSequenceNumber,
    getNextSequenceNumber: window.getNextSequenceNumber
  };

})(typeof window !== 'undefined' ? window : globalThis);
