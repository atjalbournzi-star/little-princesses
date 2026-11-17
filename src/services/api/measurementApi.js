/**
 * ============================================================================
 * measurementApi.js — A4 Homography Measurement Studio Client Service
 * Domain: Tailoring & Studio Calibration | Standard: Rule 1, 2 & 4 (< 180 lines)
 * ============================================================================
 */

(function(window) {
  'use strict';

  var callGAS = function(action, payload) {
    if (typeof window.callGAS === 'function') return window.callGAS(action, payload);
    if (window.ApiCore && typeof window.ApiCore.callGAS === 'function') {
      return window.ApiCore.callGAS(action, payload);
    }
    return Promise.resolve({ success: false, error: 'No GAS bridge available' });
  };

  var measurementApi = {
    /**
     * Save or update an A4 Homography Studio measurement session (Draft/Approved)
     * @param {Object} payload Session data
     */
    saveStudioSession: async function(payload) {
      try {
        var res = await fetch('/api/measurements/studio/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var json = await res.json();
        if (res.ok && json && json.success) return json;
        if (json && json.error) throw new Error(json.error);
      } catch (err) {
        console.warn('[measurementApi] Falling back to GAS/cache for save:', err.message);
        try {
          return await callGAS('saveMeasurementStudio', payload);
        } catch (gasErr) {
          return { success: false, error: err.message || gasErr.message };
        }
      }
    },

    /**
     * Fetch existing measurement session by Order ID or Session UUID
     * @param {string} orderId
     */
    fetchSessionByOrderId: async function(orderId) {
      if (!orderId || !orderId.trim()) {
        return { success: false, error: 'رقم الطلب مطلوب للبحث' };
      }
      var cleanId = encodeURIComponent(orderId.trim());
      try {
        var res = await fetch('/api/measurements/studio/' + cleanId);
        var json = await res.json();
        if (res.ok && json && json.success) return json;
        if (json && json.error) return json;
      } catch (err) {
        console.warn('[measurementApi] Falling back to GAS for fetch:', err.message);
        try {
          return await callGAS('getMeasurementStudio', { order_id: orderId });
        } catch (gasErr) {
          return { success: false, error: err.message || gasErr.message };
        }
      }
    },

    /**
     * Fetch recent measurement studio sessions
     * @param {number} limit
     */
    fetchRecentSessions: async function(limit) {
      var safeLimit = limit || 20;
      try {
        var res = await fetch('/api/measurements/studio/recent?limit=' + safeLimit);
        var json = await res.json();
        if (res.ok && json && json.success) return json;
        return { success: false, data: [] };
      } catch (err) {
        console.warn('[measurementApi] Recent sessions fetch fallback:', err.message);
        return { success: false, data: [] };
      }
    },

    /**
     * Approve measurement session and pass to atelier/production pipeline
     * @param {Object|string} target Session ID or object with id/order_id
     */
    approveStudioSession: async function(target) {
      var payload = typeof target === 'string' ? { order_id: target, status: 'approved' } : target;
      try {
        var res = await fetch('/api/measurements/studio/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var json = await res.json();
        if (res.ok && json && json.success) return json;
        if (json && json.error) throw new Error(json.error);
      } catch (err) {
        console.warn('[measurementApi] Falling back to GAS for approve:', err.message);
        try {
          return await callGAS('approveMeasurementStudio', payload);
        } catch (gasErr) {
          return { success: false, error: err.message || gasErr.message };
        }
      }
    },

    /**
     * Run server-side sub-pixel A4 corner detection algorithm
     * @param {string} imageBase64
     */
    detectA4Subpixel: async function(imageBase64) {
      try {
        var res = await fetch('/api/measurements/studio/detect-a4-subpixel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageBase64 })
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  };

  window.measurementApi = measurementApi;
  if (window.API && !window.API.measurement) {
    window.API.measurement = measurementApi;
  }

})(typeof window !== 'undefined' ? window : globalThis);
