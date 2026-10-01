/**
 * ============================================================================
 * ordersApi.js — Sales Orders, Order Lifecycle & Payments Network Service
 * Domain: Sales & Point of Sale | Architecture Standard: Rule 1, 3 & 4
 * ============================================================================
 */

(function(window) {
  'use strict';

  var callGAS = function(a, p) { return (window.callGAS || (window.ApiCore && window.ApiCore.callGAS))(a, p); };

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

  window.paymentAPI = {
    getPayments: async () => {
      const gasRes = await callGAS('getPayments');
      return gasRes && Array.isArray(gasRes.data) ? gasRes.data : [];
    },
    createPayment: async (data) => {
      return await callGAS('addPayment', data);
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
