/**
 * ============================================================================
 * accountingEngine.js — Central Accounting Engine & General Ledger Facade
 * Domain: Integrated Double-Entry Multi-Currency ERP Core
 * Architecture Standard: Rule 3 (Facade Pattern) & Rule 5 (Financial Governance)
 * ============================================================================
 */

(function(window) {
  'use strict';

  var JR = window.JournalRules || {};
  var JG = window.JournalGenerators || {};
  var LE = window.LedgerEngine || {};
  var TB = window.TrialBalanceEngine || {};
  var FS = window.FinancialStatements || {};

  var AccountingEngine = {
    // ── 1. Validation & Payload Building ──
    validateEntry: function(entry, accounts) {
      return (JR.validateEntry || window.JournalRules?.validateEntry)(entry, accounts);
    },
    createJournalPayload: function(params) {
      return (JR.createJournalPayload || window.JournalRules?.createJournalPayload)(params);
    },
    createManualJournal: function(p) {
      return (JR.createManualJournal || window.JournalRules?.createManualJournal)(p);
    },

    // ── 2. Operational Vouchers & Tailoring Journals (1-13) ──
    createPaymentVoucher: function(p) { return (JG.createPaymentVoucher || window.createPaymentVoucher)(p); },
    createReceiptVoucher: function(p) { return (JG.createReceiptVoucher || window.createReceiptVoucher)(p); },
    createBookingDeposit: function(p) { return (JG.createBookingDeposit || window.createBookingDeposit)(p); },
    createOrderCollection: function(p) { return (JG.createOrderCollection || window.createOrderCollection)(p); },
    createShowroomSale: function(p) { return (JG.createShowroomSale || window.createShowroomSale)(p); },
    createCustomerReturn: function(p) { return (JG.createCustomerReturn || window.createCustomerReturn)(p); },
    createTailorAdvance: function(p) { return (JG.createTailorAdvance || window.createTailorAdvance)(p); },
    createTailorWageSettlement: function(p) { return (JG.createTailorWageSettlement || window.createTailorWageSettlement)(p); },
    createPettyCashIssue: function(p) { return (JG.createPettyCashIssue || window.createPettyCashIssue)(p); },
    createPettyCashSettlement: function(p) { return (JG.createPettyCashSettlement || window.createPettyCashSettlement)(p); },
    createInventoryPurchase: function(p) { return (JG.createInventoryPurchase || window.createInventoryPurchase)(p); },
    createInventoryIssueToWIP: function(p) { return (JG.createInventoryIssueToWIP || window.createInventoryIssueToWIP)(p); },
    createInventoryAudit: function(p) { return (JG.createInventoryAudit || window.createInventoryAudit)(p); },

    // ── 3. General Ledger & Trial Balance Derivations ──
    generateGeneralLedger: function(journalEntries, accounts, filterAccountId, dateRange) {
      return (LE.generateGeneralLedger || window.generateGeneralLedger)(journalEntries, accounts, filterAccountId, dateRange);
    },
    generateTrialBalance: function(journalEntries, accounts, dateRange) {
      return (TB.generateTrialBalance || window.generateTrialBalance)(journalEntries, accounts, dateRange);
    },

    // ── 4. Financial Statements Engine ──
    generateIncomeStatement: function(journalEntries, accounts, dateRange) {
      return (FS.generateIncomeStatement || window.FinancialStatements?.generateIncomeStatement)(journalEntries, accounts, dateRange);
    },
    generateBalanceSheet: function(journalEntries, accounts, dateRange) {
      return (FS.generateBalanceSheet || window.FinancialStatements?.generateBalanceSheet)(journalEntries, accounts, dateRange);
    },
    generateCashFlowStatement: function(journalEntries, accounts, dateRange) {
      return (FS.generateCashFlowStatement || window.FinancialStatements?.generateCashFlowStatement)(journalEntries, accounts, dateRange);
    }
  };

  window.AccountingEngine = AccountingEngine;

})(typeof window !== 'undefined' ? window : globalThis);
