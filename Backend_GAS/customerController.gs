const CustomerController = {
  HEADERS: ["ID", "اسم العميل", "رقم الهاتف", "منصة التواصل", "اسم الحساب", "العنوان", "الوحدة", "الطول الكلي", "عرض الكتف", "دوران الصدر", "دوران الخصر", "طول الكم", "طول الصدر", "تاريخ التسجيل"],
  
  KEY_MAP: {
    "ID": "id",
    "اسم العميل": "name",
    "رقم الهاتف": "phone",
    "منصة التواصل": "platform",
    "اسم الحساب": "handle",
    "العنوان": "address",
    "الوحدة": "unit",
    "الطول الكلي": "total_len",
    "عرض الكتف": "shoulder",
    "دوران الصدر": "bust",
    "دوران الخصر": "waist",
    "طول الكم": "sleeve",
    "طول الصدر": "chest_len",
    "تاريخ التسجيل": "reg_date"
  },

  getCustomers: function() {
    getOrCreateSheet(SHEET_CUSTOMERS, this.HEADERS);
    return getRowsMapped(SHEET_CUSTOMERS, this.HEADERS, this.KEY_MAP);
  },

  addCustomer: function(data) {
    const sheet = getOrCreateSheet(SHEET_CUSTOMERS, this.HEADERS);
    const newId = Utilities.getUuid();
    const date = data.reg_date || todayISO();
    
    const rowData = [
      newId,
      data.name || "",
      data.phone || "",
      data.platform || "",
      data.handle || "",
      data.address || "",
      data.unit || "cm",
      data.total_len || "",
      data.shoulder || "",
      data.bust || "",
      data.waist || "",
      data.sleeve || "",
      data.chest_len || "",
      date
    ];
    
    sheet.appendRow(rowData);
    return { success: true, message: "Customer added successfully", id: newId };
  }
};
