/**
 * ============================================================================
 * accountingApi.js — Chart of Accounts, Journal, Expenses & Reports API
 * Domain: Accounting Core Services | Architecture Standard: Rule 1, 3 & 4
 * ============================================================================
 */

(function(window) {
  'use strict';

  var callGAS = function(a, p) { return (window.callGAS || (window.ApiCore && window.ApiCore.callGAS))(a, p); };

  // ── Chart of Accounts CRUD & Sync ──
  window.suggestAccountCode = async function(parentId) {
    try {
      const res = await fetch(`/api/accounts/suggest-code?parent_id=${parentId || ''}`).then(r => r.json());
      return res.code;
    } catch (e) {
      return '101';
    }
  };

  window.saveAccount = async function(payload) {
    try {
      const res = await fetch('/api/accounts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());
      return res;
    } catch (e) {
      return callGAS('addAccount', payload);
    }
  };

  window.deleteAccount = async function(payload) {
    try {
      const res = await fetch('/api/accounts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());
      return res;
    } catch (e) {
      return callGAS('deleteAccount', payload);
    }
  };

  window.getAccountAuditLogs = async function() {
    try {
      const res = await fetch('/api/accounts/audit-log').then(r => r.json());
      return res.data || [];
    } catch (e) {
      return [];
    }
  };

  window.syncChartOfAccounts = async function() {
    try {
      const res = await fetch('/api/accounts/sync-cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).then(r => r.json());
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res;
      }
    } catch (e) {
      console.warn("Backend sync-cloud fallback:", e);
    }
    return await callGAS('getAccounts');
  };

  // ── Journal Entries API ──
  window.journalAPI = {
    getJournalEntries: async () => {
      const gasRes = await callGAS('getJournalEntries');
      return gasRes && Array.isArray(gasRes.data) ? gasRes.data : [];
    },
    createJournalEntry: async (data) => {
      return await callGAS('addJournalEntry', data);
    }
  };

  // ── Expenses API ──
  window.expenseAPI = {
    getExpenses: async () => {
      try {
        const res = await fetch('/api/finance/expenses').then(r => r.json());
        if (res && res.success && Array.isArray(res.data)) return res.data;
      } catch (e) {}
      try {
        const res = await fetch('/api/expenses').then(r => r.json());
        if (res && res.success && Array.isArray(res.data)) return res.data;
      } catch (e) {}
      if (typeof callGAS === 'function') {
        const gasRes = await callGAS('getExpenses');
        if (gasRes && Array.isArray(gasRes.data)) return gasRes.data;
      }
      return [];
    },
    createExpense: async (data) => {
      try {
        const res = await fetch('/api/finance/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        if (res && res.success) return res;
        if (res && res.error) throw new Error(res.error);
      } catch (e) {
        if (e.message && !e.message.includes('fetch')) throw e;
      }
      if (typeof callGAS === 'function') {
        return await callGAS('addExpense', data);
      }
      return { success: true, data };
    },
    deleteExpense: async (data) => {
      const payload = typeof data === 'object' ? data : { id: data, expense_no: data };
      try {
        const res = await fetch('/api/finance/expenses/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(r => r.json());
        if (res && res.success) return res;
      } catch (e) {}
      if (typeof callGAS === 'function') {
        return await callGAS('deleteExpense', payload);
      }
      return { success: true };
    }
  };
  window.expensesAPI = window.expenseAPI;

  // ── Financial Reports API ──
  window.reportsAPI = {
    getFinancialStatements: async (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      try {
        const res = await fetch(`/api/reports/financial-statements?${qs}`).then(r => r.json());
        if (res && res.success) return res;
      } catch (e) {}
      return null;
    },
    getTrialBalance: async (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      try {
        const res = await fetch(`/api/reports/trial-balance?${qs}`).then(r => r.json());
        if (res && res.success) return res;
      } catch (e) {}
      return null;
    },
    getGeneralLedger: async (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      try {
        const res = await fetch(`/api/reports/general-ledger?${qs}`).then(r => r.json());
        if (res && res.success) return res;
      } catch (e) {}
      return null;
    },
    getReconciliations: async (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      try {
        const res = await fetch(`/api/reports/reconciliations?${qs}`).then(r => r.json());
        if (res && res.success) return res;
      } catch (e) {}
      return null;
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
