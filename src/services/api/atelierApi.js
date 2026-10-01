/**
 * ============================================================================
 * atelierApi.js — Atelier Production, BOM Models, Dress Catalog & Quality API
 * Domain: Tailoring & Atelier Workshop | Architecture Standard: Rule 1, 3 & 4
 * ============================================================================
 */

(function(window) {
  'use strict';

  var callGAS = function(a, p) { return (window.callGAS || (window.ApiCore && window.ApiCore.callGAS))(a, p); };

  // ── Workshop Production Pipeline API ──
  window.productionAPI = {
    getPipeline: async () => {
      try {
        const res = await fetch('/api/production/pipeline').then(r => r.json());
        if (res && res.success) return res;
      } catch (e) {}
      const gasRes = await callGAS('getFactory');
      return { success: true, pipeline: gasRes && Array.isArray(gasRes.data) ? gasRes.data : [], kpis: {}, confirmed_orders: [], tailors: [] };
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

  // ── BOM & Models API ──
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

  // ── Dress Products Catalog API ──
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

  // ── Quality Management & Feedback API ──
  window.qualityAPI = {
    getDashboard: () => fetch('/api/quality/dashboard').then(r => r.json()).catch(err => ({ success: false, error: err.message, data: {} })),
    getIntelligence: (dimension) => fetch(dimension ? `/api/quality/intelligence/${dimension}` : '/api/quality/intelligence').then(r => r.json()).catch(err => ({ success: false, error: err.message, data: {} })),
    getEvaluations: () => fetch('/api/quality/evaluations').then(r => r.json()).catch(err => ({ success: false, error: err.message, data: [] })),
    addEvaluation: (data) => fetch('/api/quality/evaluations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(err => ({ success: false, error: err.message })),
    getInspections: () => fetch('/api/quality/inspections').then(r => r.json()).catch(err => ({ success: false, error: err.message, data: [] })),
    addInspection: (data) => fetch('/api/quality/inspections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(err => ({ success: false, error: err.message })),
    getDefects: () => fetch('/api/quality/defects').then(r => r.json()).catch(err => ({ success: false, error: err.message, data: [] })),
    addDefect: (data) => fetch('/api/quality/defects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(err => ({ success: false, error: err.message })),
    getFeedback: () => fetch('/api/quality/feedback').then(r => r.json()).catch(err => ({ success: false, error: err.message, data: [] })),
    addFeedback: (data) => fetch('/api/quality/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(err => ({ success: false, error: err.message })),
    getComplaints: () => fetch('/api/quality/complaints').then(r => r.json()).catch(err => ({ success: false, error: err.message, data: [] })),
    addComplaint: (data) => fetch('/api/quality/complaints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(err => ({ success: false, error: err.message })),
    getReturns: () => fetch('/api/quality/returns').then(r => r.json()).catch(err => ({ success: false, error: err.message, data: [] })),
    addReturn: (data) => fetch('/api/quality/returns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(err => ({ success: false, error: err.message })),
    getCorrectiveActions: () => fetch('/api/quality/corrective_actions').then(r => r.json()).catch(err => ({ success: false, error: err.message, data: [] })),
    addCorrectiveAction: (data) => fetch('/api/quality/corrective_actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(err => ({ success: false, error: err.message })),
    getCheckpoints: () => fetch('/api/quality/checkpoints').then(r => r.json()).catch(err => ({ success: false, error: err.message, data: [] })),
    saveCheckpoint: (data) => fetch('/api/quality/checkpoints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(err => ({ success: false, error: err.message })),
    getSettings: () => fetch('/api/quality/settings').then(r => r.json()).catch(err => ({ success: false, error: err.message, data: [] })),
    saveSettings: (data) => fetch('/api/quality/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(err => ({ success: false, error: err.message }))
  };

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
      return { success: false, error: e.message };
    }
  };

  window.updateFeedbackStatus = async function(payload) {
    try {
      const res = await fetch('/api/quality/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());
      return res;
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
