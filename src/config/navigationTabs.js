/**
 * ============================================================================
 * navigationTabs.js — Navigation Tabs Definition & System Modules
 * Architecture: Modular Configuration | Little Princesses ERP
 * ============================================================================
 */

(function(window) {
  'use strict';

  var I = window.Icons || {};

  var ALL_TABS = [
    { id: 'dashboard', label: 'لوحة التحكم والعمليات', icon: I.Dashboard || (() => null) },
    { id: 'customers', label: 'العملاء وإدارة العلاقات (CRM)', icon: I.Users || (() => null) },
    { id: 'orders', label: 'أوامر المبيعات ونقاط البيع (POS)', icon: I.ShoppingBag || (() => null) },
    { id: 'products', label: 'المنتجات ومواصفات التشغيل', icon: I.Calculator || (() => null) },
    { id: 'factory', label: 'خطوط التصنيع والتشغيل', icon: I.Factory || (() => null) },
    { id: 'inventory', label: 'المخزون وسلاسل الإمداد', icon: I.Scissors || (() => null) },
    { id: 'purchases', label: 'المشتريات وإدارة الموردين', icon: I.Purchases || (() => null) },
    { id: 'accounts', label: 'شجرة الحسابات والدليل المالي', icon: I.Accounts || (() => null) },
    { id: 'vouchers', label: 'السندات والمعاملات المالية', icon: I.Vouchers || (() => null) },
    { id: 'expenses', label: 'المصروفات التشغيلية', icon: I.Expenses || (() => null) },
    { id: 'journal', label: 'القيود اليومية المحاسبية', icon: I.Journal || (() => null) },
    { id: 'reports', label: 'التقارير المالية والتشغيلية', icon: I.Reports || (() => null) },
    { id: 'marketing', label: 'التسويق ونمو الأعمال', icon: I.Marketing || (() => null) },
    { id: 'hr', label: 'الموارد البشرية والرواتب', icon: I.HR || (() => null) },
    { id: 'feedback', label: 'إدارة الجودة الشاملة (QA)', icon: I.Star || (() => null) },
    { id: 'settings', label: 'إعدادات النظام والحوكمة', icon: I.Settings || (() => null) }
  ];

  window.ALL_TABS = ALL_TABS;

})(window);
