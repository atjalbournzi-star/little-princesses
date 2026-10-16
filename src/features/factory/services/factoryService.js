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
    try {
      if (window.productionAPI && typeof window.productionAPI.updateStage === 'function') {
        return await window.productionAPI.updateStage(updatedF);
      }
      const res = await fetch('/api/factory/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedF)
      }).then(r => r.json());
      return res;
    } catch (e) {
      if (typeof callGAS === 'function') return await callGAS('updateFactory', updatedF);
      return { success: false, error: 'تعذر الاتصال بالسيرفر: ' + (e.message || 'خطأ في الشبكة') };
    }
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
    try {
      const res = await fetch('/api/factory/job-card/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || data.message || `خطأ في الخادم (${res.status})` };
      }
      return data;
    } catch (err) {
      console.error('FactoryService.approveQc network error:', err);
      return { success: false, error: 'تعذر الاتصال بالخادم: ' + (err.message || 'خطأ في الشبكة') };
    }
  },

  async reworkQc(payload) {
    try {
      const res = await fetch('/api/factory/job-card/rework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || data.message || `خطأ في الخادم (${res.status})` };
      }
      return data;
    } catch (err) {
      console.error('FactoryService.reworkQc network error:', err);
      return { success: false, error: 'تعذر الاتصال بالخادم: ' + (err.message || 'خطأ في الشبكة') };
    }
  }
};

window.FactoryService = FactoryService;
