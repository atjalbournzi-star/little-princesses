/**
 * ============================================================================
 * dataLoader.js — Unified Relational Initial Data Pre-Loader
 * Domain: Core Network Layer | Architecture Standard: Rule 1, 3 & 4
 * ============================================================================
 */

(function(window) {
  'use strict';

  var callGAS = function(a, p) { return (window.callGAS || (window.ApiCore && window.ApiCore.callGAS))(a, p); };

  async function loadAllData() {
    try {
      const [cRes, iRes, aRes, pRes, oRes, puRes, fRes, vRes, eRes, jRes, fBRes, empRes, payRes, campRes] = await Promise.allSettled([
        fetch("/api/customers").then(r => r.json()).catch(() => callGAS("getCustomers")),
        fetch("/api/inventory").then(r => r.json()).catch(() => callGAS("getInventory")),
        fetch("/api/accounts/list").then(r => r.json()).then(d => ({ data: (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []) })).catch(() => ({ data: [] })),
        fetch("/api/products").then(r => r.json()).catch(() => callGAS("getProducts")),
        fetch("/api/orders").then(r => r.json()).catch(() => callGAS("getOrders")),
        fetch("/api/purchases").then(r => r.json()).then(d => ({ data: (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []) })).catch(() => ({ data: [] })),
        fetch("/api/factory").then(r => r.json()).then(d => ({ data: (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []) })).catch(() => callGAS("getFactory")),
        fetch("/api/vouchers").then(r => r.json()).then(d => ({ data: (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []) })).catch(() => ({ data: [] })),
        fetch("/api/expenses").then(r => r.json()).then(d => ({ data: (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []) })).catch(() => ({ data: [] })),
        fetch("/api/journal").then(r => r.json()).then(d => ({ data: (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []) })).catch(() => ({ data: [] })),
        fetch("/api/quality/feedback").then(r => r.json()).catch(() => callGAS("getFeedback")),
        fetch("/api/hr/employees").then(r => r.json()).catch(() => callGAS("getEmployees")),
        fetch("/api/hr/payroll").then(r => r.json()).catch(() => callGAS("getPayroll")),
        fetch("/api/marketing/campaigns").then(r => r.json()).catch(() => (window.marketingAPI ? window.marketingAPI.getCampaigns() : { data: [] }))
      ]);

      let accountsData = [];
      if (aRes.status === "fulfilled" && aRes.value) {
        if (Array.isArray(aRes.value.data) && aRes.value.data.length > 0) accountsData = aRes.value.data;
        else if (Array.isArray(aRes.value) && aRes.value.length > 0) accountsData = aRes.value;
      }
      if (!accountsData || accountsData.length === 0) {
        accountsData = (typeof INITIAL_ACCOUNTS !== 'undefined' ? INITIAL_ACCOUNTS : []);
      }

      let inventoryData = [];
      if (iRes.status === "fulfilled" && iRes.value) {
        const rawList = Array.isArray(iRes.value.data) ? iRes.value.data : (Array.isArray(iRes.value) ? iRes.value : []);
        inventoryData = rawList.map(i => {
          const name = i.item_name || i.name || "";
          const q = Number(i.qty !== undefined && i.qty !== null ? i.qty : (i.quantity !== undefined && i.quantity !== null ? i.quantity : (i.quantity_meters || 0)));
          const c = Number(i.cost_per_meter !== undefined && i.cost_per_meter !== null ? i.cost_per_meter : (i.cost_per_unit !== undefined && i.cost_per_unit !== null ? i.cost_per_unit : (i.unit_cost !== undefined && i.unit_cost !== null ? i.unit_cost : (i.cost || 0))));
          return {
            ...i, id: i.id, name: name, item_name: name,
            code: i.item_code || i.code || i.id, item_code: i.item_code || i.code || i.id,
            qty: q, quantity: q, quantity_meters: q,
            cost: c, unit_cost: c, cost_per_unit: c, cost_per_meter: c,
            total_value: Number(i.total_value || (q * c)),
            category: i.category || "أقمشة وخامات", unit: i.unit || "متر",
            currency: i.currency || "YER", supply_date: i.supply_date || i.created_at || ""
          };
        });
      }

      return {
        customers: (cRes.status === "fulfilled" && cRes.value?.data && Array.isArray(cRes.value.data)) ? cRes.value.data.map(c => ({
          ...c, id: c.id, customer_id: c.customer_id || c.id, name: c.name || c.customer_name || "",
          phone: c.phone || "", category: c.category || "VIP", city: c.city || "صنعاء",
          reg_date: c.reg_date || (c.created_at ? String(c.created_at).slice(0, 10) : "")
        })) : [],
        inventory: inventoryData,
        accounts: accountsData,
        products: (pRes.status === "fulfilled" && pRes.value?.data && Array.isArray(pRes.value.data)) ? pRes.value.data.map(p => ({
          ...p, id: p.id, name: p.name || p.model_name || p.title || "",
          model_name: p.model_name || p.name || p.title || "",
          price: Number(p.base_price !== undefined ? p.base_price : (p.price || 0)),
          cost: Number(p.cost_price !== undefined ? p.cost_price : (p.cost || 0)),
          sku: p.sku || p.id, category: p.category || "فساتين سهرة", image: p.image_url || p.image || ""
        })) : [],
        orders: (oRes.status === "fulfilled" && oRes.value?.data && Array.isArray(oRes.value.data)) ? oRes.value.data.map(o => ({
          ...o, id: o.id, order_no: o.order_no || o.id, customer_id: o.customer_id || "",
          customer_name: o.customer_name || o.name || o.customer_id || "", child_id: o.child_id || "", child_name: o.child_name || "",
          product_id: o.product_id || "", product_name: o.product_name || "",
          qty: Number(o.quantity !== undefined ? o.quantity : (o.qty || 1)),
          total: Number(o.total_amount !== undefined ? o.total_amount : (o.total || 0)),
          paid: Number(o.paid_amount !== undefined ? o.paid_amount : (o.paid || 0)),
          remaining: Number(o.remaining_amount !== undefined ? o.remaining_amount : (o.remaining !== undefined ? o.remaining : (Number(o.total_amount || o.total || 0) - Number(o.paid_amount || o.paid || 0)))),
          currency: o.currency || "YER ﷼", order_date: o.order_date || o.created_at || (new Date().toISOString()),
          delivery_date: o.delivery_date || "", status: o.status || "نشط", production_status: o.production_status || "قيد الخياطة 🪡"
        })) : [],
        purchases: (puRes.status === "fulfilled" && puRes.value) ? (Array.isArray(puRes.value.data) ? puRes.value.data : (Array.isArray(puRes.value) ? puRes.value : [])) : [],
        factory: (fRes.status === "fulfilled" && fRes.value) ? (Array.isArray(fRes.value.data) ? fRes.value.data : (Array.isArray(fRes.value) ? fRes.value : [])) : [],
        vouchers: (vRes.status === "fulfilled" && vRes.value) ? (Array.isArray(vRes.value.data) ? vRes.value.data : (Array.isArray(vRes.value) ? vRes.value : [])) : [],
        expenses: (eRes.status === "fulfilled" && eRes.value) ? (Array.isArray(eRes.value.data) ? eRes.value.data : (Array.isArray(eRes.value) ? eRes.value : [])) : [],
        journal: (jRes.status === "fulfilled" && jRes.value) ? (Array.isArray(jRes.value.data) ? jRes.value.data : (Array.isArray(jRes.value) ? jRes.value : [])) : [],
        feedback: (fBRes.status === "fulfilled" && fBRes.value) ? (Array.isArray(fBRes.value.data) ? fBRes.value.data : (Array.isArray(fBRes.value) ? fBRes.value : [])) : [],
        employees: (empRes.status === "fulfilled" && empRes.value) ? (Array.isArray(empRes.value.data) ? empRes.value.data : (Array.isArray(empRes.value) ? empRes.value : [])) : [],
        payroll: (payRes.status === "fulfilled" && payRes.value) ? (Array.isArray(payRes.value.data) ? payRes.value.data : (Array.isArray(payRes.value) ? payRes.value : [])) : [],
        campaigns: (campRes.status === "fulfilled" && campRes.value) ? (Array.isArray(campRes.value.data) ? campRes.value.data : (Array.isArray(campRes.value) ? campRes.value : [])) : []
      };
    } catch (err) {
      console.warn("loadAllData failed:", err);
      return {};
    }
  }

  window.loadAllData = loadAllData;

})(typeof window !== 'undefined' ? window : globalThis);
