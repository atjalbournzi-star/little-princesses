const InventoryController = {
  HEADERS: ["ID", "اسم القماش", "التصنيف", "الكمية بالمتر", "تكلفة المتر", "العملة", "حد التنبيه", "تاريخ التوريد"],
  
  KEY_MAP: {
    "ID": "id",
    "اسم القماش": "item_name",
    "التصنيف": "category",
    "الكمية بالمتر": "qty",
    "تكلفة المتر": "cost_per_meter",
    "العملة": "currency",
    "حد التنبيه": "min_alert",
    "تاريخ التوريد": "supply_date"
  },

  getInventory: function() {
    getOrCreateSheet(SHEET_INVENTORY, this.HEADERS);
    return getRowsMapped(SHEET_INVENTORY, this.HEADERS, this.KEY_MAP);
  },

  addInventory: function(data) {
    const sheet = getOrCreateSheet(SHEET_INVENTORY, this.HEADERS);
    const newId = Utilities.getUuid();
    const date = data.supply_date || todayISO();

    const rowData = [
      newId,
      data.item_name || "",
      data.category || "",
      data.qty || 0,
      data.cost_per_meter || 0,
      data.currency || "USD",
      data.min_alert || 0,
      date
    ];
    
    sheet.appendRow(rowData);
    return { success: true, message: "Inventory item added successfully", id: newId };
  }
};
