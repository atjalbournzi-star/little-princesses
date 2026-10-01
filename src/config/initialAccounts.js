/**
 * ============================================================================
 * initialAccounts.js — Chart of Accounts Seed Data
 * Architecture: Modular Configuration | Little Princesses ERP
 * ============================================================================
 */

(function(window) {
  'use strict';

  var INITIAL_ACCOUNTS = [
    // ── 1. الأصول (Assets) ──
    { id: "ACC-1", code: "1", name: "الأصول", name_en: "Assets", account_type: "أصول", parent_id: null, level: 1, nature: "debit", is_group: 1, is_active: 1, balance: 0.0 },
    { id: "ACC-1111", code: "1111", name: "الصندوق الرئيسي", name_en: "Main Cash", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
    { id: "ACC-1112", code: "1112", name: "البنك / الشبكة وPOS", name_en: "Bank & POS", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
    { id: "ACC-1121", code: "1121", name: "عهد الورشة والمشغل", name_en: "Workshop Custody", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
    { id: "ACC-1131", code: "1131", name: "ذمم العميلات", name_en: "Accounts Receivable", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
    { id: "ACC-1141", code: "1141", name: "سلف الخياطين والعاملين", name_en: "Tailor Advances", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
    { id: "ACC-1151", code: "1151", name: "مخزون الأقمشة والخامات", name_en: "Fabric Inventory", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
    { id: "ACC-1152", code: "1152", name: "إنتاج تحت التشغيل (WIP)", name_en: "Work in Progress - WIP", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
    { id: "ACC-1153", code: "1153", name: "مخزون الفساتين التامة", name_en: "Finished Dresses", account_type: "أصول", parent_id: "1", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },

    // ── 2. الخصوم (Liabilities) ──
    { id: "ACC-2", code: "2", name: "الالتزامات (الخصوم)", name_en: "Liabilities", account_type: "خصوم", parent_id: null, level: 1, nature: "credit", is_group: 1, is_active: 1, balance: 0.0 },
    { id: "ACC-2111", code: "2111", name: "ذمم الموردين ومحلات الأقمشة", name_en: "Accounts Payable", account_type: "خصوم", parent_id: "2", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },
    { id: "ACC-2121", code: "2121", name: "دفعات مقدمة وعرابين حجز", name_en: "Customer Deposits", account_type: "خصوم", parent_id: "2", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },
    { id: "ACC-2131", code: "2131", name: "مستحقات وأجور الخياطين", name_en: "Accrued Tailor Wages", account_type: "خصوم", parent_id: "2", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },

    // ── 3. حقوق الملكية (Equity) ──
    { id: "ACC-3", code: "3", name: "حقوق الملكية", name_en: "Equity", account_type: "حقوق ملكية", parent_id: null, level: 1, nature: "credit", is_group: 1, is_active: 1, balance: 0.0 },
    { id: "ACC-3111", code: "3111", name: "رأس المال المباشر للشركة", name_en: "Paid Capital", account_type: "حقوق ملكية", parent_id: "3", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },
    { id: "ACC-3112", code: "3112", name: "الأرباح المبقاة / المحتجزة", name_en: "Retained Earnings", account_type: "حقوق ملكية", parent_id: "3", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },

    // ── 4. الإيرادات (Revenue) ──
    { id: "ACC-4", code: "4", name: "الإيرادات", name_en: "Revenue", account_type: "إيرادات", parent_id: null, level: 1, nature: "credit", is_group: 1, is_active: 1, balance: 0.0 },
    { id: "ACC-4111", code: "4111", name: "إيرادات تفصيل وتصميم الفساتين", name_en: "Custom Tailoring Revenue", account_type: "إيرادات", parent_id: "4", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },
    { id: "ACC-4121", code: "4121", name: "إيرادات مبيعات فساتين المعرض", name_en: "Showroom Sales", account_type: "إيرادات", parent_id: "4", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },
    { id: "ACC-4211", code: "4211", name: "أرباح تسويات المخزون", name_en: "Inventory Surplus Gain", account_type: "إيرادات", parent_id: "4", level: 2, nature: "credit", is_group: 0, is_active: 1, balance: 0.0 },

    // ── 5. المصروفات وتكاليف الإنتاج (Expenses & Production) ──
    { id: "ACC-5", code: "5", name: "المصروفات وتكاليف الإنتاج", name_en: "Expenses & Production", account_type: "مصروفات", parent_id: null, level: 1, nature: "debit", is_group: 1, is_active: 1, balance: 0.0 },
    { id: "ACC-5111", code: "5111", name: "تكلفة الأقمشة والمواد المباعة", name_en: "Cost of Goods Sold", account_type: "تكلفة المبيعات", parent_id: "5", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
    { id: "ACC-5121", code: "5121", name: "أجور خياطة وتصنيع مباشرة", name_en: "Direct Tailoring Wages", account_type: "تكلفة المبيعات", parent_id: "5", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
    { id: "ACC-5211", code: "5211", name: "مصاريف تشغيل وصيانة الورشة", name_en: "Workshop Operating Expenses", account_type: "مصروفات", parent_id: "5", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 },
    { id: "ACC-5221", code: "5221", name: "خسائر وفروقات عجز الجرد", name_en: "Inventory Shrinkage / Loss", account_type: "مصروفات", parent_id: "5", level: 2, nature: "debit", is_group: 0, is_active: 1, balance: 0.0 }
  ];

  window.INITIAL_ACCOUNTS = INITIAL_ACCOUNTS;

})(window);
