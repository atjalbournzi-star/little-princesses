/**
 * ============================================================================
 * inventoryApi.js — Raw Materials, Procurement, Movements & Adjustments API
 * Domain: Inventory & Supply Chain | Architecture Standard: Rule 1, 3 & 4
 * ============================================================================
 */

(function(window) {
  'use strict';

  var callGAS = function(a, p) { return (window.callGAS || (window.ApiCore && window.ApiCore.callGAS))(a, p); };

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
    },
    getWarehouses: async () => {
      try {
        const res = await fetch('/api/warehouses').then(r => r.json());
        if (res && res.success && Array.isArray(res.data)) return res.data;
      } catch (e) {}
      const gasRes = await callGAS('getWarehouses');
      return gasRes && Array.isArray(gasRes.data) ? gasRes.data : [];
    },
    transferStock: async (data) => {
      try {
        const res = await fetch('/api/inventory/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        if (res && res.success) return res;
        if (res && res.error) throw new Error(res.error);
      } catch (e) {
        if (e.message) throw e;
      }
      return await callGAS('transferStock', data);
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
