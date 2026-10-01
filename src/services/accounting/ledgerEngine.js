/**
 * ============================================================================
 * ledgerEngine.js — General Ledger Engine & Chronological Balance Pipeline
 * Domain: Accounting Core Services | Architecture Standard: Rule 1, 3 & 5
 * ============================================================================
 */

(function(window) {
  'use strict';

  var AF = window.AccountFinder || {};
  var parseAccCode = AF.parseAccCode || function(s) { return String(s || '').trim(); };
  var findAcc = function(list, v, c) { return AF.findAccount ? AF.findAccount(list, v, c) : null; };
  var getNature = AF.getAccountNature || function(a) { return (a && a.nature) || 'debit'; };

  function generateGeneralLedger(journalEntries, accounts, filterAccountId, dateRange) {
    var entries = Array.isArray(journalEntries) ? journalEntries : [];
    var accList = Array.isArray(accounts) ? accounts : [];

    var sorted = entries.slice().sort(function(a, b) {
      var dateA = a.date || a.entry_date || '';
      var dateB = b.date || b.entry_date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.id || 0) - (b.id || 0);
    });

    var targetAcc = filterAccountId ? findAcc(accList, filterAccountId, filterAccountId) : null;
    var targetNature = targetAcc ? getNature(targetAcc) : 'debit';
    var targetAccCode = targetAcc ? String(targetAcc.code || targetAcc.account_code || targetAcc.id) : String(filterAccountId || '');
    var targetAccName = targetAcc ? (targetAcc.name || targetAcc.account_name || targetAcc.name_ar || targetAccCode) : targetAccCode;

    var openingBalanceBase = targetAcc ? (parseFloat(targetAcc.opening_balance) || 0) : 0;
    var openingBalanceOrig = openingBalanceBase;
    var ledgerRows = [];

    sorted.forEach(function(j) {
      var entryDate = (j.date || j.entry_date || '').split('T')[0];
      var isPrior = Boolean(dateRange && dateRange.start && entryDate < dateRange.start);
      var isInPeriod = (!dateRange || !dateRange.start || entryDate >= dateRange.start) &&
                       (!dateRange || !dateRange.end || entryDate <= dateRange.end);

      if (!isPrior && !isInPeriod) return;

      var curr = j.currency || 'YER';
      var normCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(curr) : curr;
      var rawRate = parseFloat(j.exchange_rate);
      var rate = (rawRate && rawRate > 0 && !(rawRate === 1.0 && normCurr !== 'YER')) ? rawRate : (window.CurrencyService ? window.CurrencyService.getRate(normCurr) : 1.0);

      if (Array.isArray(j.lines) && j.lines.length > 0) {
        j.lines.forEach(function(l, lineIdx) {
          var accRaw = String(l.account_id || '');
          var accObj = findAcc(accList, accRaw, accRaw);
          var aCode = accObj ? String(accObj.code || accObj.account_code || accObj.id) : parseAccCode(accRaw);
          var aName = accObj ? (accObj.name || accObj.account_name || accObj.name_ar || aCode) : accRaw;
          var aNature = accObj ? getNature(accObj) : 'debit';

          var dOrig = parseFloat(l.debit) || 0, cOrig = parseFloat(l.credit) || 0;
          var dBase = l.debit_base !== undefined ? (parseFloat(l.debit_base) || 0) : (dOrig * rate);
          var cBase = l.credit_base !== undefined ? (parseFloat(l.credit_base) || 0) : (cOrig * rate);

          var isMatch = !filterAccountId || aCode === targetAccCode || accRaw === String(filterAccountId) || (targetAcc && (accObj && accObj.id === targetAcc.id));
          if (!isMatch) return;

          if (isPrior) {
            if (targetNature === 'credit') { openingBalanceBase += (cBase - dBase); openingBalanceOrig += (cOrig - dOrig); }
            else { openingBalanceBase += (dBase - cBase); openingBalanceOrig += (dOrig - cOrig); }
          } else if (isInPeriod) {
            ledgerRows.push({
              id: (j.id || '') + '-L' + (l.id || lineIdx),
              journal_id: j.id,
              entry_no: j.entry_no || ('JV-' + j.id),
              date: entryDate,
              account_code: aCode,
              account_name: aName,
              account_nature: aNature,
              side: dBase > 0 ? 'debit' : 'credit',
              debit_orig: dOrig, credit_orig: cOrig, debit_base: dBase, credit_base: cBase,
              currency: curr, exchange_rate: rate,
              ref_type: j.ref_type || 'قيد يومية', ref_id: j.ref_id || '',
              notes: l.line_description || j.notes || j.statement || ('حركة حساب ' + aName)
            });
          }
        });
      } else {
        var amount = parseFloat(j.amount) || 0, rawBase = parseFloat(j.base_amount);
        var baseAmount = (rawBase && rawBase > 0 && !(normCurr !== 'YER' && Math.abs(rawBase - amount) < 0.01)) ? rawBase : (amount * rate);
        var dRaw = String(j.debit || j.debit_account_id || ''), cRaw = String(j.credit || j.credit_account_id || '');
        var dCode = String(j.debit_code || parseAccCode(dRaw)), cCode = String(j.credit_code || parseAccCode(cRaw));
        var debitAccObj = findAcc(accList, dRaw, dCode), creditAccObj = findAcc(accList, cRaw, cCode);

        var dFinalCode = debitAccObj ? String(debitAccObj.code || debitAccObj.acc_code || dCode) : dCode;
        var cFinalCode = creditAccObj ? String(creditAccObj.code || creditAccObj.acc_code || cCode) : cCode;
        var dFinalName = debitAccObj ? (debitAccObj.name || debitAccObj.account_name || debitAccObj.acc_name || dFinalCode) : dRaw.replace(dCode + ' - ', '').trim();
        var cFinalName = creditAccObj ? (creditAccObj.name || creditAccObj.account_name || creditAccObj.acc_name || cFinalCode) : cRaw.replace(cCode + ' - ', '').trim();
        var dNature = debitAccObj ? getNature(debitAccObj) : 'debit', cNature = creditAccObj ? getNature(creditAccObj) : 'credit';

        var isDebitMatch = !filterAccountId || dFinalCode === targetAccCode || dRaw === String(filterAccountId) || (targetAcc && debitAccObj && debitAccObj.id === targetAcc.id);
        var isCreditMatch = !filterAccountId || cFinalCode === targetAccCode || cRaw === String(filterAccountId) || (targetAcc && creditAccObj && creditAccObj.id === targetAcc.id);

        if (isPrior) {
          if (isDebitMatch) { if (targetNature === 'credit') { openingBalanceBase -= baseAmount; openingBalanceOrig -= amount; } else { openingBalanceBase += baseAmount; openingBalanceOrig += amount; } }
          if (isCreditMatch) { if (targetNature === 'credit') { openingBalanceBase += baseAmount; openingBalanceOrig += amount; } else { openingBalanceBase -= baseAmount; openingBalanceOrig -= amount; } }
        } else if (isInPeriod) {
          if (isDebitMatch) {
            ledgerRows.push({
              id: (j.id || '') + '-DR', journal_id: j.id, entry_no: j.entry_no || ('JV-' + j.id), date: entryDate,
              account_code: dFinalCode, account_name: dFinalName, account_nature: dNature, side: 'debit',
              debit_orig: amount, credit_orig: 0, debit_base: baseAmount, credit_base: 0,
              currency: curr, exchange_rate: rate, ref_type: j.ref_type || 'قيد يومية', ref_id: j.ref_id || '',
              notes: j.notes || j.statement || ('قيد مدين إلى ' + cFinalName)
            });
          }
          if (isCreditMatch) {
            ledgerRows.push({
              id: (j.id || '') + '-CR', journal_id: j.id, entry_no: j.entry_no || ('JV-' + j.id), date: entryDate,
              account_code: cFinalCode, account_name: cFinalName, account_nature: cNature, side: 'credit',
              debit_orig: 0, credit_orig: amount, debit_base: 0, credit_base: baseAmount,
              currency: curr, exchange_rate: rate, ref_type: j.ref_type || 'قيد يومية', ref_id: j.ref_id || '',
              notes: j.notes || j.statement || ('قيد دائن من ' + dFinalName)
            });
          }
        }
      }
    });

    if (filterAccountId && dateRange && dateRange.start) {
      ledgerRows.unshift({
        id: 'OPENING-' + targetAccCode, journal_id: 'OPENING', entry_no: 'رصيد سابق', date: dateRange.start,
        account_code: targetAccCode, account_name: targetAccName, account_nature: targetNature,
        side: targetNature === 'credit' ? 'credit' : 'debit',
        debit_orig: 0, credit_orig: 0, debit_base: 0, credit_base: 0, currency: 'YER', exchange_rate: 1.0,
        ref_type: 'رصيد افتتاحي / سابق', ref_id: '', notes: 'الرصيد السابق / الافتتاحي حتى تاريخ ' + dateRange.start,
        running_balance_base: openingBalanceBase, running_balance_orig: openingBalanceOrig, is_opening: true
      });
    }

    var runningBase = (filterAccountId && dateRange && dateRange.start) ? openingBalanceBase : 0;
    var runningOrig = (filterAccountId && dateRange && dateRange.start) ? openingBalanceOrig : 0;

    ledgerRows.forEach(function(row) {
      if (row.is_opening) {
        row.running_balance_base = runningBase; row.running_balance_orig = runningOrig;
        return;
      }
      if (row.account_nature === 'credit') {
        runningBase += (row.credit_base - row.debit_base); runningOrig += (row.credit_orig - row.debit_orig);
      } else {
        runningBase += (row.debit_base - row.credit_base); runningOrig += (row.debit_orig - row.credit_orig);
      }
      row.running_balance_base = runningBase;
      row.running_balance_orig = runningOrig;
    });

    return ledgerRows;
  }

  window.LedgerEngine = { generateGeneralLedger: generateGeneralLedger };
  window.generateGeneralLedger = generateGeneralLedger;

})(typeof window !== 'undefined' ? window : globalThis);
