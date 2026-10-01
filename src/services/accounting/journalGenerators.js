/**
 * ============================================================================
 * journalGenerators.js — Facade Aggregator for Operational Journals & Vouchers
 * Domain: Accounting Core Services | Architecture Standard: Rule 1, 3 & 5
 * ============================================================================
 */

(function(window) {
  'use strict';

  var Vouchers = window.VoucherGenerators || {};
  var Operational = window.OperationalJournals || {};

  var JournalGenerators = {
    // 1-6. Cash, Sales, and Customer Vouchers
    createPaymentVoucher: function(p) { return (Vouchers.createPaymentVoucher || window.createPaymentVoucher)(p); },
    createReceiptVoucher: function(p) { return (Vouchers.createReceiptVoucher || window.createReceiptVoucher)(p); },
    createBookingDeposit: function(p) { return (Vouchers.createBookingDeposit || window.createBookingDeposit)(p); },
    createOrderCollection: function(p) { return (Vouchers.createOrderCollection || window.createOrderCollection)(p); },
    createShowroomSale: function(p) { return (Vouchers.createShowroomSale || window.createShowroomSale)(p); },
    createCustomerReturn: function(p) { return (Vouchers.createCustomerReturn || window.createCustomerReturn)(p); },

    // 7-13. Tailor, Workshop Petty Cash, and Inventory Movement Journals
    createTailorAdvance: function(p) { return (Operational.createTailorAdvance || window.createTailorAdvance)(p); },
    createTailorWageSettlement: function(p) { return (Operational.createTailorWageSettlement || window.createTailorWageSettlement)(p); },
    createPettyCashIssue: function(p) { return (Operational.createPettyCashIssue || window.createPettyCashIssue)(p); },
    createPettyCashSettlement: function(p) { return (Operational.createPettyCashSettlement || window.createPettyCashSettlement)(p); },
    createInventoryPurchase: function(p) { return (Operational.createInventoryPurchase || window.createInventoryPurchase)(p); },
    createInventoryIssueToWIP: function(p) { return (Operational.createInventoryIssueToWIP || window.createInventoryIssueToWIP)(p); },
    createInventoryAudit: function(p) { return (Operational.createInventoryAudit || window.createInventoryAudit)(p); }
  };

  window.JournalGenerators = JournalGenerators;

  // Direct re-exports on window for backward compatibility
  Object.keys(JournalGenerators).forEach(function(key) {
    window[key] = JournalGenerators[key];
  });

})(typeof window !== 'undefined' ? window : globalThis);
