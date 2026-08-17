/**
 * 👑 Little Princesses ERP - Google Apps Script (GAS) Cloud API Service v2.0
 * 
 * UPDATED: Added Products + JournalEntries endpoints
 * Master API service connecting React to Google Sheets cloud database
 */

export const GAS_WEB_APP_URL = "http://127.0.0.1:5000/api/gas";
export const SOCIAL_WEBHOOK_URL = "http://127.0.0.1:5002/api/social";

export const apiService = {
  async request(action, payload = {}) {
    try {
      const requestData = { action, ...payload };
      const response = await fetch(GAS_WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(requestData),
      });
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      const jsonResult = await response.json();
      if (jsonResult.status === "error") throw new Error(jsonResult.message || "GAS Error");
      return jsonResult;
    } catch (error) {
      console.error(`[GAS API] ${action} ->`, error);
      throw error;
    }
  },

  // Customers
  getCustomers: () => apiService.request("getCustomers"),
  addCustomer: (d) => apiService.request("addCustomer", d),

  // Orders
  getOrders: () => apiService.request("getOrders"),
  createOrder: (d) => apiService.request("addOrder", d),

  // Inventory
  getInventory: () => apiService.request("getInventory"),
  addInventory: (d) => apiService.request("addInventory", d),

  // Accounts
  getAccounts: () => apiService.request("getAccounts"),
  addAccount: (d) => apiService.request("addAccount", d),

  // Vouchers
  getVouchers: () => apiService.request("getVouchers"),
  addVoucher: (d) => apiService.request("addVoucher", d),

  // Purchases
  getPurchases: () => apiService.request("getPurchases"),
  addPurchase: (d) => apiService.request("addPurchase", d),

  // Expenses
  getExpenses: () => apiService.request("getExpenses"),
  addExpense: (d) => apiService.request("addExpense", d),

  // Factory
  getFactory: () => apiService.request("getFactory"),
  updateFactory: (d) => apiService.request("updateFactory", d),

  // Products (NEW)
  getProducts: () => apiService.request("getProducts"),
  addProduct: (d) => apiService.request("addProduct", d),

  // Journal Entries (NEW)
  getJournalEntries: () => apiService.request("getJournalEntries"),
  addJournalEntry: (d) => apiService.request("addJournalEntry", d),

  // Dashboard
  getDashboardStats: () => apiService.request("getDashboardStats"),

  // Social Marketing AI
  getSocialAnalytics: async () => {
    try {
      const res = await fetch(`${SOCIAL_WEBHOOK_URL}/dashboard`);
      return await res.json();
    } catch (e) {
      console.error(e);
      return { success: false, data: [] };
    }
  },
  triggerSocialWebhook: async (payload) => {
    try {
      const res = await fetch(`${SOCIAL_WEBHOOK_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (e) {
      console.error(e);
      return { success: false };
    }
  }
};

export default apiService;
