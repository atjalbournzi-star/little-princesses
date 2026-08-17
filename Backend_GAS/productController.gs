const ProductController = {
  HEADERS: ["ID", "اسم الموديل", "التصنيف", "اسم القماش", "الأمتار", "تكلفة القماش", "أجرة الخياطة", "التغليف", "إجمالي التكلفة", "سعر البيع", "العملة", "الربح", "تاريخ الحساب"],
  
  KEY_MAP: {
    "ID": "id",
    "اسم الموديل": "name",
    "التصنيف": "category",
    "اسم القماش": "fabric_name",
    "الأمتار": "yards_used",
    "تكلفة القماش": "fabric_cost",
    "أجرة الخياطة": "labor_cost",
    "التغليف": "packaging_cost",
    "إجمالي التكلفة": "total_cost",
    "سعر البيع": "sell_price",
    "العملة": "currency",
    "الربح": "profit",
    "تاريخ الحساب": "calc_date"
  },

  getProducts: function() {
    getOrCreateSheet(SHEET_PRODUCTS, this.HEADERS);
    return getRowsMapped(SHEET_PRODUCTS, this.HEADERS, this.KEY_MAP);
  },

  addProduct: function(data) {
    const sheet = getOrCreateSheet(SHEET_PRODUCTS, this.HEADERS);
    const newId = Utilities.getUuid();
    
    const fabric_cost = parseFloat(data.fabric_cost) || 0;
    const labor_cost = parseFloat(data.labor_cost) || 0;
    const packaging_cost = parseFloat(data.packaging_cost) || 0;
    const total_cost = fabric_cost + labor_cost + packaging_cost;
    
    const sell_price = parseFloat(data.sell_price) || 0;
    const profit = sell_price - total_cost;
    const date = data.calc_date || todayISO();

    const rowData = [
      newId,
      data.name || "",
      data.category || "",
      data.fabric_name || "",
      data.yards_used || 0,
      fabric_cost,
      labor_cost,
      packaging_cost,
      total_cost,
      sell_price,
      data.currency || "USD",
      profit,
      date
    ];
    
    sheet.appendRow(rowData);
    return { success: true, message: "Product added successfully", id: newId };
  }
};
