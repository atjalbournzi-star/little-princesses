const FactoryController = {
  HEADERS: ["ID", "رقم الطلب", "اسم العميلة", "اسم الفستان", "الخياط", "المرحلة", "نسبة الإنجاز", "تاريخ البدء", "تاريخ التسليم", "ملاحظات"],
  
  KEY_MAP: {
    "ID": "id",
    "رقم الطلب": "order_no",
    "اسم العميلة": "customer_name",
    "اسم الفستان": "product_name",
    "الخياط": "tailor",
    "المرحلة": "stage",
    "نسبة الإنجاز": "progress",
    "تاريخ البدء": "start_date",
    "تاريخ التسليم": "due_date",
    "ملاحظات": "notes"
  },

  getFactory: function() {
    getOrCreateSheet(SHEET_FACTORY, this.HEADERS);
    return getRowsMapped(SHEET_FACTORY, this.HEADERS, this.KEY_MAP);
  },

  updateFactory: function(data) {
    const sheet = getOrCreateSheet(SHEET_FACTORY, this.HEADERS);
    const date = data.start_date || todayISO();
    
    if (data.id) {
       const dataRange = sheet.getDataRange();
       const values = dataRange.getValues();
       
       for (let i = 1; i < values.length; i++) {
         if (values[i][0] == data.id) {
           sheet.getRange(i + 1, 2, 1, 9).setValues([[
             data.order_no || values[i][1],
             data.customer_name || values[i][2],
             data.product_name || values[i][3],
             data.tailor || values[i][4],
             data.stage || values[i][5],
             data.progress || values[i][6],
             data.start_date || values[i][7],
             data.due_date || values[i][8],
             data.notes || values[i][9]
           ]]);
           return { success: true, message: "Factory record updated successfully" };
         }
       }
    }

    const newId = Utilities.getUuid();
    const rowData = [
      newId,
      data.order_no || "",
      data.customer_name || "",
      data.product_name || "",
      data.tailor || "",
      data.stage || "جديد",
      data.progress || "0%",
      date,
      data.due_date || "",
      data.notes || ""
    ];
    
    sheet.appendRow(rowData);
    return { success: true, message: "Factory record added successfully", id: newId };
  }
};
