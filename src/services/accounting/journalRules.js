/**
 * ============================================================================
 * journalRules.js — Double-Entry Validation & Posting Rules
 * Domain: Accounting Core Services | Architecture Standard: Rule 1, 3 & 5
 * Compliance: Strict Double-Entry Bookkeeping & Monetary Precision
 * ============================================================================
 */

(function(window) {
  'use strict';

  var JournalRules = {
    // Validates a journal entry's double-entry balance in base currency (YER)
    validateEntry: function(entry, accounts) {
      if (!entry) return { valid: false, error: 'بيانات القيد غير متوفرة' };
      if (!entry.debit) return { valid: false, error: 'حساب المدين مطلوب' };
      if (!entry.credit) return { valid: false, error: 'حساب الدائن مطلوب' };
      if (String(entry.debit) === String(entry.credit)) {
        return { valid: false, error: 'لا يمكن أن يكون حساب المدين والدائن متطابقين' };
      }

      var amount = parseFloat(entry.amount) || 0;
      if (amount <= 0) return { valid: false, error: 'مبلغ القيد يجب أن يكون أكبر من الصفر' };

      // Validate accounts exist and are postable (not group accounts)
      if (accounts && Array.isArray(accounts)) {
        var debitAcc = accounts.find(function(a) { return String(a.code || a.acc_code || a.id) === String(entry.debit); });
        var creditAcc = accounts.find(function(a) { return String(a.code || a.acc_code || a.id) === String(entry.credit); });

        if (debitAcc && Number(debitAcc.is_group) === 1) {
          return { valid: false, error: 'لا يمكن تسجيل قيود على حساب تجميعي (' + (debitAcc.name || debitAcc.code) + ')' };
        }
        if (creditAcc && Number(creditAcc.is_group) === 1) {
          return { valid: false, error: 'لا يمكن تسجيل قيود على حساب تجميعي (' + (creditAcc.name || creditAcc.code) + ')' };
        }
      }

      // Convert and check YER balance
      var currency = entry.currency || 'YER';
      var rate = entry.exchange_rate || (window.CurrencyService ? window.CurrencyService.getRate(currency) : 1.0);
      var baseObj = window.CurrencyService ? window.CurrencyService.toBase(amount, currency, rate) : { base_amount: amount, exchange_rate: rate };

      return {
        valid: true,
        base_amount: baseObj.base_amount,
        exchange_rate: baseObj.exchange_rate,
        currency: window.CurrencyService ? window.CurrencyService.normalizeCode(currency) : currency
      };
    },

    // Generates a standardized multi-currency journal payload with transaction idempotency ID
    createJournalPayload: function(params) {
      var curr = params.currency || 'YER';
      var rate = params.exchange_rate || (window.CurrencyService ? window.CurrencyService.getRate(curr) : 1.0);
      var baseObj = window.CurrencyService ? window.CurrencyService.toBase(params.amount, curr, rate) : { base_amount: params.amount, exchange_rate: rate };

      var txId = params.transaction_id || params.ref_id || ('TX-' + Date.now() + '-' + Math.floor(Math.random()*1000));
      var entryNo = params.entry_no || ('JV-' + Date.now().toString().slice(-6));

      return {
        id: params.id || Date.now(),
        transaction_id: txId,
        entry_no: entryNo,
        debit: String(params.debit),
        credit: String(params.credit),
        amount: parseFloat(params.amount) || 0,
        currency: baseObj.currency || curr,
        exchange_rate: baseObj.exchange_rate || rate,
        base_amount: baseObj.base_amount,
        ref_type: params.ref_type || 'MANUAL',
        ref_id: params.ref_id || '',
        date: params.date || (window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]),
        notes: params.notes || '',
        status: 'posted',
        created_at: new Date().toISOString()
      };
    },

    // Manual Balanced Journal Entry validation
    createManualJournal: function(p) {
      var lines = Array.isArray(p.lines) ? p.lines : [];
      var totalDebit = lines.reduce(function(sum, l) { return sum + (parseFloat(l.debit) || 0); }, 0);
      var totalCredit = lines.reduce(function(sum, l) { return sum + (parseFloat(l.credit) || 0); }, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error('القيد غير متوازن! إجمالي المدين (' + totalDebit + ') لا يساوي إجمالي الدائن (' + totalCredit + ')');
      }

      var rate = parseFloat(p.exchangeRate) || 1.0;
      var entryNo = p.entryNumber || ('JV-MAN-' + Date.now().toString().slice(-6));
      return {
        entry_number: entryNo,
        entry_date: p.date || (window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]),
        description: p.description || 'قيد مركب وتسويات يدوية',
        source_module: 'MANUAL',
        source_id: String(p.sourceId || entryNo),
        total_amount: totalDebit,
        currency: p.currency || 'YER',
        exchange_rate: rate,
        base_amount: totalDebit * rate,
        is_posted: true,
        lines: lines
      };
    }
  };

  window.JournalRules = JournalRules;

})(typeof window !== 'undefined' ? window : globalThis);
