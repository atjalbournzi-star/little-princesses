/**
 * ============================================================================
 * trialBalance.js — Trial Balance Calculation & Balance Verification Engine
 * Domain: Accounting Core Services | Architecture Standard: Rule 1, 3 & 5
 * ============================================================================
 */

(function(window) {
  'use strict';

  var AF = window.AccountFinder || {};
  var parseAccCode = AF.parseAccCode || function(s) { return String(s || '').trim(); };
  var findAcc = function(list, v) { return AF.findAccount ? AF.findAccount(list, v, v) : null; };
  var getNature = AF.getAccountNature || function(a) { return (a && a.nature) || 'debit'; };

  function generateTrialBalance(journalEntries, accounts, dateRange) {
    var accList = Array.isArray(accounts) ? accounts.filter(function(a) { return Number(a.is_group) !== 1; }) : [];
    var totalsMap = {};

    accList.forEach(function(a) {
      var aId = String(a.id || '').trim();
      var code = String(a.code || a.account_code || parseAccCode(aId) || aId).trim();
      totalsMap[aId] = {
        id: aId, code: code,
        name: a.account_name || a.name_ar || a.name || code,
        type: a.account_type || a.acc_type || 'أصول',
        nature: getNature(a),
        opening_balance_base: parseFloat(a.opening_balance) || 0,
        total_debit_base: 0, total_credit_base: 0,
        debit_balance_base: 0, credit_balance_base: 0, net_balance_base: 0
      };
    });

    var entries = Array.isArray(journalEntries) ? journalEntries : [];

    entries.forEach(function(j) {
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
        j.lines.forEach(function(l) {
          var accRaw = String(l.account_id || '');
          var accObj = findAcc(accList, accRaw);
          var mapKey = accObj ? accObj.id : accRaw;

          if (!totalsMap[mapKey]) {
            var fCode = accObj ? String(accObj.code || accObj.account_code || accObj.id) : parseAccCode(accRaw);
            totalsMap[mapKey] = {
              id: mapKey, code: fCode,
              name: accObj ? (accObj.account_name || accObj.name_ar || accObj.name || fCode) : accRaw,
              type: accObj ? (accObj.account_type || 'أصول') : 'أصول',
              nature: accObj ? getNature(accObj) : 'debit',
              opening_balance_base: 0, total_debit_base: 0, total_credit_base: 0,
              debit_balance_base: 0, credit_balance_base: 0, net_balance_base: 0
            };
          }

          var dOrig = parseFloat(l.debit) || 0, cOrig = parseFloat(l.credit) || 0;
          var dBase = l.debit_base !== undefined ? (parseFloat(l.debit_base) || 0) : (dOrig * rate);
          var cBase = l.credit_base !== undefined ? (parseFloat(l.credit_base) || 0) : (cOrig * rate);

          if (isPrior) {
            if (totalsMap[mapKey].nature === 'credit') totalsMap[mapKey].opening_balance_base += (cBase - dBase);
            else totalsMap[mapKey].opening_balance_base += (dBase - cBase);
          } else if (isInPeriod) {
            totalsMap[mapKey].total_debit_base += dBase;
            totalsMap[mapKey].total_credit_base += cBase;
          }
        });
      } else {
        var amount = parseFloat(j.amount) || 0, rawBase = parseFloat(j.base_amount);
        var baseAmount = (rawBase && rawBase > 0 && !(normCurr !== 'YER' && Math.abs(rawBase - amount) < 0.01)) ? rawBase : (amount * rate);
        var dRaw = String(j.debit || j.debit_account_id || ''), cRaw = String(j.credit || j.credit_account_id || '');
        var debitAccObj = findAcc(accList, dRaw), creditAccObj = findAcc(accList, cRaw);
        var dKey = debitAccObj ? debitAccObj.id : dRaw, cKey = creditAccObj ? creditAccObj.id : cRaw;

        [dKey, cKey].forEach(function(k, idx) {
          if (!totalsMap[k]) {
            var obj = idx === 0 ? debitAccObj : creditAccObj, raw = idx === 0 ? dRaw : cRaw;
            var fCode = obj ? String(obj.code || obj.account_code || obj.id) : parseAccCode(raw);
            totalsMap[k] = {
              id: k, code: fCode,
              name: obj ? (obj.account_name || obj.name_ar || obj.name || fCode) : raw,
              type: obj ? (obj.account_type || 'أصول') : 'أصول',
              nature: obj ? getNature(obj) : (idx === 0 ? 'debit' : 'credit'),
              opening_balance_base: 0, total_debit_base: 0, total_credit_base: 0,
              debit_balance_base: 0, credit_balance_base: 0, net_balance_base: 0
            };
          }
        });

        if (isPrior) {
          if (totalsMap[dKey].nature === 'credit') totalsMap[dKey].opening_balance_base -= baseAmount;
          else totalsMap[dKey].opening_balance_base += baseAmount;
          if (totalsMap[cKey].nature === 'credit') totalsMap[cKey].opening_balance_base += baseAmount;
          else totalsMap[cKey].opening_balance_base -= baseAmount;
        } else if (isInPeriod) {
          totalsMap[dKey].total_debit_base += baseAmount;
          totalsMap[cKey].total_credit_base += baseAmount;
        }
      }
    });

    var allRows = Object.values(totalsMap);
    var rows = allRows.filter(function(r) {
      return Math.abs(r.opening_balance_base) > 0.001 || r.total_debit_base > 0 || r.total_credit_base > 0;
    });
    if (rows.length === 0) rows = allRows;

    rows.sort(function(a, b) {
      return String(a.code).localeCompare(String(b.code), undefined, { numeric: true, sensitivity: 'base' });
    });

    var grandDebit = 0, grandCredit = 0, grandDebitBal = 0, grandCreditBal = 0, grandOpening = 0;

    rows.forEach(function(r) {
      var net = (r.total_debit_base - r.total_credit_base);
      var finalNet = (r.nature === 'credit') ? (r.opening_balance_base - net) : (r.opening_balance_base + net);

      if (r.nature === 'debit') {
        if (finalNet >= 0) { r.debit_balance_base = finalNet; r.credit_balance_base = 0; }
        else { r.debit_balance_base = 0; r.credit_balance_base = Math.abs(finalNet); }
      } else {
        if (finalNet >= 0) { r.credit_balance_base = finalNet; r.debit_balance_base = 0; }
        else { r.credit_balance_base = 0; r.debit_balance_base = Math.abs(finalNet); }
      }
      r.net_balance_base = finalNet;

      grandDebit += r.total_debit_base; grandCredit += r.total_credit_base;
      grandDebitBal += r.debit_balance_base; grandCreditBal += r.credit_balance_base;
      grandOpening += r.opening_balance_base;
    });

    var diffMovements = Math.abs(grandDebit - grandCredit);
    var diffBalances = Math.abs(grandDebitBal - grandCreditBal);

    return {
      rows: rows,
      grand_total_opening: Math.round(grandOpening * 100) / 100,
      grand_total_debit: Math.round(grandDebit * 100) / 100,
      grand_total_credit: Math.round(grandCredit * 100) / 100,
      grand_total_debit_balance: Math.round(grandDebitBal * 100) / 100,
      grand_total_credit_balance: Math.round(grandCreditBal * 100) / 100,
      is_balanced: diffMovements < 0.05 && diffBalances < 0.05,
      diff: Math.round(Math.max(diffMovements, diffBalances) * 100) / 100
    };
  }

  window.TrialBalanceEngine = { generateTrialBalance: generateTrialBalance };
  window.generateTrialBalance = generateTrialBalance;

})(typeof window !== 'undefined' ? window : globalThis);
