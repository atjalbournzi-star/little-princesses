const OrderController = {
  HEADERS: ["ID", "رقم الفاتورة", "اسم العميل", "اسم المنتج", "الكمية", "تاريخ الحجز", "موعد التسليم", "الإجمالي", "المدفوع", "المتبقي", "العملة", "الحالة"],
  
  KEY_MAP: {
    "ID": "id",
    "رقم الفاتورة": "order_no",
    "اسم العميل": "customer_name",
    "اسم المنتج": "product_name",
    "الكمية": "qty",
    "تاريخ الحجز": "order_date",
    "موعد التسليم": "delivery_date",
    "الإجمالي": "total",
    "المدفوع": "paid",
    "المتبقي": "remaining",
    "العملة": "currency",
    "الحالة": "status"
  },

  getOrders: function() {
    getOrCreateSheet(SHEET_ORDERS, this.HEADERS);
    return getRowsMapped(SHEET_ORDERS, this.HEADERS, this.KEY_MAP);
  },

  addOrder: function(data) {
    const sheet = getOrCreateSheet(SHEET_ORDERS, this.HEADERS);
    const newId = Utilities.getUuid();
    
    const total = parseFloat(data.total) || 0;
    const paid = parseFloat(data.paid) || 0;
    const remaining = total - paid;
    const date = data.order_date || todayISO();

    const rowData = [
      newId,
      data.order_no || "",
      data.customer_name || "",
      data.product_name || "",
      data.qty || 1,
      date,
      data.delivery_date || "",
      total,
      paid,
      remaining,
      data.currency || "USD",
      data.status || "New"
    ];
    
    sheet.appendRow(rowData);
    return { success: true, message: "Order added successfully", id: newId };
  }
};
