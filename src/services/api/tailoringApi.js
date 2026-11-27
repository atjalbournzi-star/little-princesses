/**
 * tailoringApi.js - طبقة الاتصال الموحدة لخدمات التفصيل (4-Mode Tailoring, Size Matrices, BTO, CMT, Profitability)
 */
(function (window) {
  'use strict';

  function nextIdempKey() {
    if (typeof window.generateIdempotencyKey === 'function') {
      return window.generateIdempotencyKey();
    }
    return 'idemp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
  }

  async function reqJson(url, options = {}, withIdempotency = false) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (withIdempotency) {
      headers['Idempotency-Key'] = nextIdempKey();
    }
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      const msg = res.extractedError || data?.error || data?.message || `خطأ في الخادم (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }

  window.TailoringAPI = {
    getSizeMatrices(segmentCode = '', includeInactive = false) {
      const qs = new URLSearchParams();
      if (segmentCode) qs.set('segment_code', segmentCode);
      if (includeInactive) qs.set('include_inactive', 'true');
      const qStr = qs.toString();
      return reqJson(`/api/size-matrices${qStr ? '?' + qStr : ''}`);
    },
    saveSizeMatrix(payload, matrixId = null) {
      const url = matrixId ? `/api/size-matrices/${encodeURIComponent(matrixId)}` : '/api/size-matrices';
      return reqJson(url, { method: matrixId ? 'PUT' : 'POST', body: JSON.stringify(payload) }, true);
    },
    deleteSizeMatrix(matrixId) {
      return reqJson(`/api/size-matrices/${encodeURIComponent(matrixId)}`, { method: 'DELETE' }, true);
    },
    confirmSizing(poId, payload) {
      return reqJson(`/api/production-orders/${encodeURIComponent(poId)}/confirm-sizing`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }, true);
    },
    recordBtoPurchase(poId, payload) {
      return reqJson(`/api/production-orders/${encodeURIComponent(poId)}/bto-purchase`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }, true);
    },
    returnBtoLeftover(poId, payload) {
      return reqJson(`/api/production-orders/${encodeURIComponent(poId)}/bto-return-leftover`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }, true);
    },
    issueMaterials(poId, payload) {
      return reqJson(`/api/production-orders/${encodeURIComponent(poId)}/issue-materials`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }, true);
    },
    promoteToCatalog(poId, payload = {}) {
      return reqJson(`/api/production-orders/${encodeURIComponent(poId)}/promote-to-catalog`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }, true);
    },
    getOrderProfitability(params = {}) {
      const qs = new URLSearchParams();
      Object.entries(params || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== '') qs.set(k, String(v).trim());
      });
      const qStr = qs.toString();
      return reqJson(`/api/reports/order-profitability${qStr ? '?' + qStr : ''}`);
    },
    getMaterialCustody(params = {}) {
      const qs = new URLSearchParams();
      Object.entries(params || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== '') qs.set(k, String(v).trim());
      });
      const qStr = qs.toString();
      return reqJson(`/api/material-custody${qStr ? '?' + qStr : ''}`);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
