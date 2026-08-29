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

      // Helper to parse clean account code
      var parseAccCode = function(rawStr) {
        if (!rawStr) return '';
        var s = String(rawStr).trim();
        if (s.indexOf(' - ') !== -1) {
          s = s.split(' - ')[0].trim();
        }
        var m = s.match(/^(\d+(\.\d+)?)/);
        if (m) return m[1];
        var mAcc = s.match(/^ACC[-_]?(\d+(\.\d+)?)/i);
        if (mAcc) return mAcc[1];
        return s;
      };

      var findAcc = function(rawVal, rawCode) {
        var c1 = parseAccCode(rawCode);
        var c2 = parseAccCode(rawVal);
        return accList.find(function(a) {
          var aCode = String(a.code || a.acc_code || a.id).trim();
          return (c1 && aCode === c1) || (c2 && aCode === c2) || aCode === String(rawVal).trim() || String(a.id) === String(rawVal).trim();
        });
      };

      sorted.forEach(function(j) {
        var entryDate = (j.date || j.entry_date || '').split('T')[0];
        if (dateRange) {
          if (dateRange.start && entryDate < dateRange.start) return;
          if (dateRange.end && entryDate > dateRange.end) return;
        }

        var amount = parseFloat(j.amount) || 0;
        var curr = j.currency || 'YER';
        var normCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(curr) : curr;
        var rawRate = parseFloat(j.exchange_rate);
        var rate = (rawRate && rawRate > 0 && !(rawRate === 1.0 && normCurr !== 'YER')) ? rawRate : (window.CurrencyService ? window.CurrencyService.getRate(normCurr) : (normCurr === 'SAR' ? 142.0 : (normCurr === 'USD' ? 535.0 : 1.0)));
        var rawBase = parseFloat(j.base_amount);
        var baseAmount = (rawBase && rawBase > 0 && !(normCurr !== 'YER' && Math.abs(rawBase - amount) < 0.01)) ? rawBase : (amount * rate);

        var dRaw = String(j.debit || j.debit_account_id || '');
        var cRaw = String(j.credit || j.credit_account_id || '');
        var dCode = String(j.debit_code || parseAccCode(dRaw));
        var cCode = String(j.credit_code || parseAccCode(cRaw));

        var debitAccObj = findAcc(dRaw, dCode);
        var creditAccObj = findAcc(cRaw, cCode);

        var dFinalCode = debitAccObj ? String(debitAccObj.code || debitAccObj.acc_code || dCode) : dCode;
        var cFinalCode = creditAccObj ? String(creditAccObj.code || creditAccObj.acc_code || cCode) : cCode;
        var dFinalName = debitAccObj ? (debitAccObj.name || debitAccObj.account_name || debitAccObj.acc_name || dFinalCode) : dRaw.replace(dCode + ' - ', '').trim();
        var cFinalName = creditAccObj ? (creditAccObj.name || creditAccObj.account_name || creditAccObj.acc_name || cFinalCode) : cRaw.replace(cCode + ' - ', '').trim();
        var dNature = debitAccObj ? (debitAccObj.nature || 'debit') : 'debit';
        var cNature = creditAccObj ? (creditAccObj.nature || 'credit') : 'credit';

        // Debit side movement
        if (!filterAccountId || dFinalCode === String(filterAccountId) || dRaw === String(filterAccountId)) {
          ledgerRows.push({
            id: (j.id || '') + '-DR',
            journal_id: j.id,
            entry_no: j.entry_no || ('JV-' + j.id),
            date: entryDate,
            account_code: dFinalCode,
            account_name: dFinalName,
            account_nature: dNature,
            side: 'debit',
            debit_orig: amount,
            credit_orig: 0,
            debit_base: baseAmount,
            credit_base: 0,
            currency: curr,
            exchange_rate: rate,
            ref_type: j.ref_type || 'قيد يومية',
            ref_id: j.ref_id || '',
            notes: j.notes || j.statement || ('قيد مدين إلى ' + cFinalName)
          });
        }

        // Credit side movement
        if (!filterAccountId || cFinalCode === String(filterAccountId) || cRaw === String(filterAccountId)) {
          ledgerRows.push({
            id: (j.id || '') + '-CR',
            journal_id: j.id,
            entry_no: j.entry_no || ('JV-' + j.id),
            date: entryDate,
            account_code: cFinalCode,
            account_name: cFinalName,
            account_nature: cNature,
            side: 'credit',
            debit_orig: 0,
            credit_orig: amount,
            debit_base: 0,
            credit_base: baseAmount,
            currency: curr,
            exchange_rate: rate,
            ref_type: j.ref_type || 'قيد يومية',
            ref_id: j.ref_id || '',
            notes: j.notes || j.statement || ('قيد دائن من ' + dFinalName)
          });
        }
      });

      // Calculate running balances by account in both Base (YER) and Original currency
      var runningTotalsBase = {};
      var runningTotalsOrig = {};
      ledgerRows.forEach(function(row) {
        var acc = row.account_code;
        if (!runningTotalsBase[acc]) runningTotalsBase[acc] = 0;
        if (!runningTotalsOrig[acc]) runningTotalsOrig[acc] = {};
        var rowCurr = row.currency || 'YER';
        if (!runningTotalsOrig[acc][rowCurr]) runningTotalsOrig[acc][rowCurr] = 0;
        
        // If account nature is debit: balance = debit - credit. If credit: balance = credit - debit.
        if (row.account_nature === 'credit') {
          runningTotalsBase[acc] += (row.credit_base - row.debit_base);
          runningTotalsOrig[acc][rowCurr] += (row.credit_orig - row.debit_orig);
        } else {
          runningTotalsBase[acc] += (row.debit_base - row.credit_base);
          runningTotalsOrig[acc][rowCurr] += (row.debit_orig - row.credit_orig);
        }
        row.running_balance_base = runningTotalsBase[acc];
        row.running_balance_orig = runningTotalsOrig[acc][rowCurr];
      });

      return ledgerRows;
    },

    // Generates Trial Balance (ميزان المراجعة بالمجاميع والأرصدة) in Base Currency (YER)
    generateTrialBalance: function(journalEntries, accounts) {
      var accList = Array.isArray(accounts) ? accounts.filter(function(a) { return Number(a.is_group) !== 1; }) : [];
      var ledgerRows = this.generateGeneralLedger(journalEntries, accounts, null, null);

      var parseAccCode = function(rawStr) {
        if (!rawStr) return '';
        var s = String(rawStr).trim();
        if (s.indexOf(' - ') !== -1) {
          s = s.split(' - ')[0].trim();
        }
        var m = s.match(/^(\d+(\.\d+)?)/);
        if (m) return m[1];
        var mAcc = s.match(/^ACC[-_]?(\d+(\.\d+)?)/i);
        if (mAcc) return mAcc[1];
        return s;
      };

      var findAcc = function(rawVal) {
        var c1 = parseAccCode(rawVal);
        return accList.find(function(a) {
          var aCode = String(a.code || a.acc_code || a.id).trim();
          return (c1 && aCode === c1) || aCode === String(rawVal).trim() || String(a.id) === String(rawVal).trim();
        });
      };

      var totalsMap = {};
      accList.forEach(function(a) {
        var code = String(a.code || a.acc_code || a.id).trim();
        var nature = a.nature || (['خصوم', 'حقوق ملكية', 'إيرادات'].includes(a.account_type || a.acc_type) ? 'credit' : 'debit');

        totalsMap[code] = {
          code: code,
          name: a.name || a.account_name || a.acc_name || code,
          type: a.account_type || a.acc_type || 'أصول',
          nature: nature,
          opening_balance: 0,
          total_debit_base: 0,
          total_credit_base: 0,
          net_balance_base: 0
        };
      });

      ledgerRows.forEach(function(r) {
        var code = parseAccCode(r.account_code) || r.account_code;
        if (!totalsMap[code]) {
          var foundAcc = findAcc(code);
          totalsMap[code] = {
            code: code,
            name: foundAcc ? (foundAcc.name || foundAcc.account_name || foundAcc.acc_name) : (r.account_name || code),
            type: foundAcc ? (foundAcc.account_type || foundAcc.acc_type || 'أصول') : 'أصول',
            nature: foundAcc ? (foundAcc.nature || r.account_nature || 'debit') : (r.account_nature || 'debit'),
            opening_balance: 0,
            total_debit_base: 0,
            total_credit_base: 0,
            net_balance_base: 0
          };
        }
        totalsMap[code].total_debit_base += r.debit_base;
        totalsMap[code].total_credit_base += r.credit_base;
      });

      var allRows = Object.values(totalsMap);
      // Filter to accounts with activity or posting accounts
      var rows = allRows.filter(function(r) {
        return r.total_debit_base > 0 || r.total_credit_base > 0;
      });

      // If no movements yet, show all posting accounts
      if (rows.length === 0) {
        rows = allRows;
      }

      // Sort by code hierarchically
      rows.sort(function(a, b) {
        return String(a.code).localeCompare(String(b.code), undefined, { numeric: true, sensitivity: 'base' });
      });

      var grandDebit = 0;
      var grandCredit = 0;
      var grandDebitBal = 0;
      var grandCreditBal = 0;

      rows.forEach(function(r) {
        var net = r.total_debit_base - r.total_credit_base;
        if (net > 0) {
          r.debit_balance_base = net;
          r.credit_balance_base = 0;
          r.net_balance_base = net;
        } else if (net < 0) {
          r.debit_balance_base = 0;
          r.credit_balance_base = Math.abs(net);
          r.net_balance_base = Math.abs(net);
        } else {
          r.debit_balance_base = 0;
          r.credit_balance_base = 0;
          r.net_balance_base = 0;
        }

        grandDebit += r.total_debit_base;
        grandCredit += r.total_credit_base;
        grandDebitBal += r.debit_balance_base;
        grandCreditBal += r.credit_balance_base;
      });

      return {
        rows: rows,
        grand_total_debit: Math.round(grandDebit * 100) / 100,
        grand_total_credit: Math.round(grandCredit * 100) / 100,
        grand_total_debit_balance: Math.round(grandDebitBal * 100) / 100,
        grand_total_credit_balance: Math.round(grandCreditBal * 100) / 100,
        is_balanced: Math.abs(grandDebit - grandCredit) < 0.01 && Math.abs(grandDebitBal - grandCreditBal) < 0.01,
        diff: Math.round(Math.abs(grandDebit - grandCredit) * 100) / 100
      };
    }
  };

  window.AccountingEngine = AccountingEngine;

})(window);
