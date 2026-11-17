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
    createPaymentVoucher: function(p) { var fn = (window.VoucherGenerators && window.VoucherGenerators.createPaymentVoucher) || Vouchers.createPaymentVoucher; return fn ? fn(p) : null; },
    createReceiptVoucher: function(p) { var fn = (window.VoucherGenerators && window.VoucherGenerators.createReceiptVoucher) || Vouchers.createReceiptVoucher; return fn ? fn(p) : null; },
    createBookingDeposit: function(p) { var fn = (window.VoucherGenerators && window.VoucherGenerators.createBookingDeposit) || Vouchers.createBookingDeposit; return fn ? fn(p) : null; },
    createOrderCollection: function(p) { var fn = (window.VoucherGenerators && window.VoucherGenerators.createOrderCollection) || Vouchers.createOrderCollection; return fn ? fn(p) : null; },
    createShowroomSale: function(p) { var fn = (window.VoucherGenerators && window.VoucherGenerators.createShowroomSale) || Vouchers.createShowroomSale; return fn ? fn(p) : null; },
    createCustomerReturn: function(p) { var fn = (window.VoucherGenerators && window.VoucherGenerators.createCustomerReturn) || Vouchers.createCustomerReturn; return fn ? fn(p) : null; },

    // 7-13. Tailor, Workshop Petty Cash, and Inventory Movement Journals
    createTailorAdvance: function(p) { var fn = (window.OperationalJournals && window.OperationalJournals.createTailorAdvance) || Operational.createTailorAdvance; return fn ? fn(p) : null; },
    createTailorWageSettlement: function(p) { var fn = (window.OperationalJournals && window.OperationalJournals.createTailorWageSettlement) || Operational.createTailorWageSettlement; return fn ? fn(p) : null; },
    createPettyCashIssue: function(p) { var fn = (window.OperationalJournals && window.OperationalJournals.createPettyCashIssue) || Operational.createPettyCashIssue; return fn ? fn(p) : null; },
    createPettyCashSettlement: function(p) { var fn = (window.OperationalJournals && window.OperationalJournals.createPettyCashSettlement) || Operational.createPettyCashSettlement; return fn ? fn(p) : null; },
    createInventoryPurchase: function(p) { var fn = (window.OperationalJournals && window.OperationalJournals.createInventoryPurchase) || Operational.createInventoryPurchase; return fn ? fn(p) : null; },
    createInventoryIssueToWIP: function(p) { var fn = (window.OperationalJournals && window.OperationalJournals.createInventoryIssueToWIP) || Operational.createInventoryIssueToWIP; return fn ? fn(p) : null; },
    createInventoryAudit: function(p) { var fn = (window.OperationalJournals && window.OperationalJournals.createInventoryAudit) || Operational.createInventoryAudit; return fn ? fn(p) : null; }
  };

  window.JournalGenerators = JournalGenerators;

  // Direct re-exports on window for backward compatibility
  Object.keys(JournalGenerators).forEach(function(key) {
    window[key] = JournalGenerators[key];
  });

})(typeof window !== 'undefined' ? window : globalThis);
