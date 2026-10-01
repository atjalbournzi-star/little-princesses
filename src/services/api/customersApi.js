/**
 * ============================================================================
 * customersApi.js — CRM Customer Records & Measurements Network Service
 * Domain: CRM & Customer Success | Architecture Standard: Rule 1, 3 & 4
 * ============================================================================
 */

(function(window) {
  'use strict';

  var callGAS = function(a, p) { return (window.callGAS || (window.ApiCore && window.ApiCore.callGAS))(a, p); };

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

})(typeof window !== 'undefined' ? window : globalThis);
