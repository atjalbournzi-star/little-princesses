const FactoryService = {
  async fetchAnalytics() {
    const res = await fetch('/api/factory/analytics');
    return res.json();
  },

  async fetchAlterations() {
    const res = await fetch('/api/alterations');
    return res.json();
  },

  async updateAlterationStatus(altId, newStatus) {
    const res = await fetch('/api/alterations/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: altId,
        status: newStatus,
        notes: `تم التحديث بواسطة مديرة الورشة إلى: ${newStatus}`
      })
    });
    return res.json();
  },

  async updateStage(updatedF) {
    if (window.productionAPI && typeof window.productionAPI.updateStage === 'function') {
      return window.productionAPI.updateStage(updatedF);
    }
    if (typeof callGAS === 'function') {
      return callGAS('updateFactory', updatedF);
    }
    return { success: true };
  },

  async deleteOrder(id, orderNo) {
    try {
      const response = await fetch('/api/factory/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, order_no: orderNo })
      });
      return await response.json();
    } catch (_httpErr) {
      if (typeof callGAS === 'function') {
        return await callGAS('deleteFactoryOrder', { id, order_no: orderNo });
      }
      throw _httpErr;
    }
  },

  async stockInflow(id, poNo, productName, quantity) {
    const res = await fetch('/api/factory/stock-inflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        production_order_no: poNo,
        product_name: productName,
        quantity
      })
    });
    return res.json();
  },

  async reverseStockInflow(id, poNo) {
    const res = await fetch('/api/factory/stock-inflow/reverse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        production_order_no: poNo
      })
    });
    return res.json();
  },

  async deliverAndSettle(payload) {
    const res = await fetch('/api/sales/orders/deliver-and-settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async reverseDelivery(orderId) {
    const res = await fetch('/api/sales/orders/reverse-delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId })
    });
    return res.json();
  },

  async approveQc(payload) {
    const res = await fetch('/api/factory/job-card/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async reworkQc(payload) {
    const res = await fetch('/api/factory/job-card/rework', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }
};

window.FactoryService = FactoryService;
