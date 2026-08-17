/**
 * Marketing & Advertising Controller
 */
const MarketingController = {
  sheetName: "حملات_وإعلانات_التسويق",

  /**
   * Initializes the Marketing sheet if it doesn't exist
   */
  initSheet: function() {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(this.sheetName);
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(this.sheetName);
      sheet.appendRow(["ID", "اسم الحملة", "المنصة", "نوع المحتوى", "الإنفاق", "حالة الحملة", "تاريخ البدء"]);
      sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#d9ead3");
    }
    return sheet;
  },

  /**
   * Adds a new marketing campaign to the sheet
   */
  addCampaign: function(data) {
    try {
      const sheet = this.initSheet();
      const newId = sheet.getLastRow(); // Simple ID generation
      const row = [
        newId,
        data.campaign_name || "",
        data.platform || "",
        data.creative_type || "",
        data.spend || 0,
        data.status || "نشط",
        data.start_date || new Date().toISOString()
      ];
      
      sheet.appendRow(row);
      return { success: true, message: "تم تسجيل الحملة التسويقية بنجاح", id: newId };
    } catch (error) {
      return { success: false, message: error.toString() };
    }
  },

  /**
   * Retrieves all marketing campaigns
   */
  getCampaigns: function() {
    try {
      const sheet = this.initSheet();
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return [];
      
      const headers = ["id", "campaign_name", "platform", "creative_type", "spend", "status", "start_date"];
      const rows = data.slice(1);
      
      return rows.map(row => {
        let obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });
    } catch (error) {
      return [];
    }
  }
};
