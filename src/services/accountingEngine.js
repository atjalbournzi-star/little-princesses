/**
 * ============================================================================
 * accountingEngine.js — Central Accounting Engine & General Ledger Pipeline
 * Little Princesses ERP - Integrated Double-Entry Multi-Currency Core
 * ============================================================================
 */

(function(window) {
  'use strict';

  var AccountingEngine = {
    
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

    // Derives General Ledger (دفتر الأستاذ العام) on the fly from Journal Entries
    generateGeneralLedger: function(journalEntries, accounts, filterAccountId, dateRange) {
      var entries = Array.isArray(journalEntries) ? journalEntries : [];
      var accList = Array.isArray(accounts) ? accounts : [];

      // Sort chronologically
      var sorted = entries.slice().sort(function(a, b) {
        var dateA = a.date || a.entry_date || '';
        var dateB = b.date || b.entry_date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return (a.id || 0) - (b.id || 0);
      });

      var ledgerRows = [];

      sorted.forEach(function(j) {
        var entryDate = (j.date || j.entry_date || '').split('T')[0];
        if (dateRange) {
          if (dateRange.start && entryDate < dateRange.start) return;
          if (dateRange.end && entryDate > dateRange.end) return;
        }

        var amount = parseFloat(j.amount) || 0;
        var curr = j.currency || 'YER';
        var rate = parseFloat(j.exchange_rate) || (window.CurrencyService ? window.CurrencyService.getRate(curr) : 1.0);
        var baseAmount = parseFloat(j.base_amount) || (amount * rate);

        var debitAccCode = String(j.debit || j.debit_account_id || '');
        var creditAccCode = String(j.credit || j.credit_account_id || '');

        var debitAccObj = accList.find(function(a) { return String(a.code || a.acc_code || a.id) === debitAccCode; });
        var creditAccObj = accList.find(function(a) { return String(a.code || a.acc_code || a.id) === creditAccCode; });

        // Debit side movement
        if (!filterAccountId || debitAccCode === String(filterAccountId)) {
          ledgerRows.push({
            id: (j.id || '') + '-DR',
            journal_id: j.id,
            entry_no: j.entry_no || ('JV-' + j.id),
            date: entryDate,
            account_code: debitAccCode,
            account_name: debitAccObj ? (debitAccObj.name || debitAccObj.acc_name) : debitAccCode,
            account_nature: debitAccObj ? (debitAccObj.nature || 'debit') : 'debit',
            side: 'debit',
            debit_orig: amount,
            credit_orig: 0,
            debit_base: baseAmount,
            credit_base: 0,
            currency: curr,
            exchange_rate: rate,
            ref_type: j.ref_type || 'قيد يومية',
            ref_id: j.ref_id || '',
            notes: j.notes || ('قيد مدين إلى ' + (creditAccObj ? creditAccObj.name : creditAccCode))
          });
        }

        // Credit side movement
        if (!filterAccountId || creditAccCode === String(filterAccountId)) {
          ledgerRows.push({
            id: (j.id || '') + '-CR',
            journal_id: j.id,
            entry_no: j.entry_no || ('JV-' + j.id),
            date: entryDate,
            account_code: creditAccCode,
            account_name: creditAccObj ? (creditAccObj.name || creditAccObj.acc_name) : creditAccCode,
            account_nature: creditAccObj ? (creditAccObj.nature || 'credit') : 'credit',
            side: 'credit',
            debit_orig: 0,
            credit_orig: amount,
            debit_base: 0,
            credit_base: baseAmount,
            currency: curr,
            exchange_rate: rate,
            ref_type: j.ref_type || 'قيد يومية',
            ref_id: j.ref_id || '',
            notes: j.notes || ('قيد دائن من ' + (debitAccObj ? debitAccObj.name : debitAccCode))
          });
        }
      });

      // Calculate running balances by account
      var runningTotals = {};
      ledgerRows.forEach(function(row) {
        var acc = row.account_code;
        if (!runningTotals[acc]) runningTotals[acc] = 0;
        
        // If account nature is debit: balance = debit - credit. If credit: balance = credit - debit.
        if (row.account_nature === 'credit') {
          runningTotals[acc] += (row.credit_base - row.debit_base);
        } else {
          runningTotals[acc] += (row.debit_base - row.credit_base);
        }
        row.running_balance_base = runningTotals[acc];
      });

      return ledgerRows;
    },

    // Generates Trial Balance (ميزان المراجعة بالمجاميع والأرصدة) in Base Currency (YER)
    generateTrialBalance: function(journalEntries, accounts) {
      var accList = Array.isArray(accounts) ? accounts.filter(function(a) { return Number(a.is_group) !== 1; }) : [];
      var ledgerRows = this.generateGeneralLedger(journalEntries, accounts, null, null);

      var totalsMap = {};
      accList.forEach(function(a) {
        var code = String(a.code || a.acc_code || a.id);
        var initialBal = parseFloat(a.opening_balance || a.balance || 0);
        var nature = a.nature || (['خصوم', 'حقوق ملكية', 'إيرادات'].includes(a.account_type || a.acc_type) ? 'credit' : 'debit');

        totalsMap[code] = {
          code: code,
          name: a.name || a.acc_name || code,
          type: a.account_type || a.acc_type || 'أصول',
          nature: nature,
          opening_balance: initialBal,
          total_debit_base: nature === 'debit' && initialBal > 0 ? initialBal : 0,
          total_credit_base: nature === 'credit' && initialBal > 0 ? initialBal : 0,
          net_balance_base: 0
        };
      });

      ledgerRows.forEach(function(r) {
        var code = r.account_code;
        if (!totalsMap[code]) {
          totalsMap[code] = {
            code: code,
            name: r.account_name || code,
            type: 'حساب عام',
            nature: r.account_nature || 'debit',
            opening_balance: 0,
            total_debit_base: 0,
            total_credit_base: 0,
            net_balance_base: 0
          };
        }
        totalsMap[code].total_debit_base += r.debit_base;
        totalsMap[code].total_credit_base += r.credit_base;
      });

      var rows = Object.values(totalsMap);
      var grandDebit = 0;
      var grandCredit = 0;

      rows.forEach(function(r) {
        if (r.nature === 'credit') {
          r.net_balance_base = r.total_credit_base - r.total_debit_base;
        } else {
          r.net_balance_base = r.total_debit_base - r.total_credit_base;
        }
        grandDebit += r.total_debit_base;
        grandCredit += r.total_credit_base;
      });

      return {
        rows: rows,
        grand_total_debit: Math.round(grandDebit * 100) / 100,
        grand_total_credit: Math.round(grandCredit * 100) / 100,
        is_balanced: Math.abs(grandDebit - grandCredit) < 0.01,
        diff: Math.round((grandDebit - grandCredit) * 100) / 100
      };
    }
  };

  window.AccountingEngine = AccountingEngine;

})(window);
