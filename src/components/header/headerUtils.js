/**
 * ============================================================================
 * headerUtils.js — Header Metadata, Role Badges & Formatter Helpers
 * Architecture: Modular Header Component | Little Princesses ERP
 * ============================================================================
 */

(function(window) {
  'use strict';

  var TAB_METADATA_MAP = {
    dashboard: { title: "لوحة التحكم والعمليات التنفيذية", category: "الرئيسية" },
    customers: { title: "إدارة علاقات العملاء (CRM)", category: "العملاء و CRM" },
    products: { title: "المنتجات ومواصفات التشغيل (BOM)", category: "العمليات والمنتجات" },
    orders: { title: "أوامر المبيعات ونقاط البيع (POS)", category: "المبيعات" },
    factory: { title: "خطوط التصنيع والتشغيل (Shop Floor)", category: "الإنتاج والعمليات" },
    inventory: { title: "إدارة المخزون وسلاسل الإمداد", category: "المستودعات والمواد" },
    purchases: { title: "المشتريات وإدارة الموردين", category: "المشتريات" },
    accounts: { title: "شجرة الحسابات والدليل المالي", category: "المحاسبة والمالية" },
    vouchers: { title: "السندات والمعاملات المالية", category: "المحاسبة والمالية" },
    expenses: { title: "المصروفات التشغيلية والإدارية", category: "المحاسبة والمالية" },
    journal: { title: "دفتر القيود اليومية والأستاذ", category: "المحاسبة والمالية" },
    reports: { title: "القوائم والتقارير المالية والختامية", category: "التقارير" },
    marketing: { title: "محرك التسويق ونمو الأعمال", category: "النمو والتسويق" },
    hr: { title: "إدارة الموارد البشرية والرواتب", category: "الموارد البشرية" },
    feedback: { title: "إدارة الجودة الشاملة وتقييم الأداء", category: "ضمان الجودة" },
    settings: { title: "إعدادات النظام والحوكمة السحابية", category: "الإدارة والنظام" }
  };

  function getTabMetadata(activeTab) {
    return TAB_METADATA_MAP[activeTab] || { title: "لوحة التحكم", category: "ERP Master" };
  }

  function getRoleBadgeColor(role) {
    switch(role) {
      case 'admin': return 'bg-[#FCE8F2] text-[#B0005A] border-[#F2A4CB]';
      case 'accountant': return 'bg-[#E2F5F7] text-[#007F8C] border-[#C5ECF0]';
      case 'workshop_manager': return 'bg-[#F2E7F3] text-[#8F2A87] border-[#E5CEE7]';
      case 'data_entry':
      default: return 'bg-[#FFF1DC] text-[#F28A00] border-[#FFE4B9]';
    }
  }

  function sanitizeDisplayName(name) {
    if (!name) return 'المدير التنفيذي';
    return String(name).replace(/👑|الأميرات|Little Princesses/g, '').trim() || 'المدير التنفيذي';
  }

  window.HeaderUtils = {
    getTabMetadata: getTabMetadata,
    getRoleBadgeColor: getRoleBadgeColor,
    sanitizeDisplayName: sanitizeDisplayName
  };

})(window);
