/**
 * ============================================================================
 * financialStatements.js — P&L, Balance Sheet & Cash Flow Financial Statements
 * Domain: Accounting Core Services | Architecture Standard: Rule 1, 3 & 5
 * Compliance: Standard Double-Entry GAAP/IFRS Principles
 * ============================================================================
 */

(function(window) {
  'use strict';

  var TB = window.TrialBalanceEngine || {};

  function generateIncomeStatement(journalEntries, accounts, dateRange) {
    var tb = (TB.generateTrialBalance || window.generateTrialBalance)(journalEntries, accounts, dateRange);
    var rows = tb.rows || [];

    var revAccounts = [], cogsAccounts = [], opexAccounts = [];
    var totalRevenue = 0, totalCOGS = 0, totalOPEX = 0;

    rows.forEach(function(r) {
      var code = String(r.code || '');
      var type = String(r.type || '').toLowerCase();
      var isRev = type.includes('إيراد') || type.includes('revenue') || code.startsWith('4');
      var isExp = type.includes('مصروف') || type.includes('expense') || code.startsWith('5');

      if (isRev) {
        var revAmt = r.credit_balance_base || r.net_balance_base || 0;
        revAccounts.push({ id: r.id, code: r.code, name: r.name, amount: revAmt });
        totalRevenue += revAmt;
      } else if (isExp) {
        var expAmt = r.debit_balance_base || r.net_balance_base || 0;
        if (code.startsWith('51') || r.name.includes('تكلفة') || r.name.includes('أجور خياطة')) {
          cogsAccounts.push({ id: r.id, code: r.code, name: r.name, amount: expAmt });
          totalCOGS += expAmt;
        } else {
          opexAccounts.push({ id: r.id, code: r.code, name: r.name, amount: expAmt });
          totalOPEX += expAmt;
        }
      }
    });

    var grossProfit = totalRevenue - totalCOGS;
    var totalExpenses = totalCOGS + totalOPEX;
    var netProfit = totalRevenue - totalExpenses;
    var grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    var netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      revAccounts: revAccounts, totalRevenue: totalRevenue,
      cogsAccounts: cogsAccounts, totalCOGS: totalCOGS,
      grossProfit: grossProfit, grossMarginPct: Math.round(grossMarginPct * 100) / 100,
      opexAccounts: opexAccounts, totalOPEX: totalOPEX,
      totalExpenses: totalExpenses, netProfit: netProfit,
      netMarginPct: Math.round(netMarginPct * 100) / 100
    };
  }

  function generateBalanceSheet(journalEntries, accounts, dateRange) {
    var tb = (TB.generateTrialBalance || window.generateTrialBalance)(journalEntries, accounts, dateRange);
    var pnl = generateIncomeStatement(journalEntries, accounts, dateRange);
    var rows = tb.rows || [];

    var currentAssets = [], fixedAssets = [], liabilities = [], equity = [];
    var totalCurrentAssets = 0, totalFixedAssets = 0, totalLiabilities = 0, totalEquityAccounts = 0;

    rows.forEach(function(r) {
      var code = String(r.code || '');
      var type = String(r.type || '').toLowerCase();
      var isAsset = type.includes('أصول') || type.includes('asset') || code.startsWith('1');
      var isLiab = type.includes('خصوم') || type.includes('التزام') || type.includes('liabilit') || code.startsWith('2');
      var isEquity = type.includes('ملكية') || type.includes('equity') || code.startsWith('3');

      if (isAsset) {
        var bal = r.debit_balance_base || r.net_balance_base || 0;
        if (code.startsWith('12') || code === '106' || r.name.includes('أصول ثابتة') || r.name.includes('ماكينات')) {
          fixedAssets.push({ id: r.id, code: r.code, name: r.name, amount: bal });
          totalFixedAssets += bal;
        } else {
          currentAssets.push({ id: r.id, code: r.code, name: r.name, amount: bal });
          totalCurrentAssets += bal;
        }
      } else if (isLiab) {
        var liabBal = r.credit_balance_base || r.net_balance_base || 0;
        liabilities.push({ id: r.id, code: r.code, name: r.name, amount: liabBal });
        totalLiabilities += liabBal;
      } else if (isEquity) {
        var eqBal = r.credit_balance_base || r.net_balance_base || 0;
        equity.push({ id: r.id, code: r.code, name: r.name, amount: eqBal });
        totalEquityAccounts += eqBal;
      }
    });

    var totalAssets = totalCurrentAssets + totalFixedAssets;
    var periodProfit = pnl.netProfit;
    var totalEquity = totalEquityAccounts + periodProfit;
    var totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    var diff = Math.abs(totalAssets - totalLiabilitiesAndEquity);

    return {
      currentAssets: currentAssets, totalCurrentAssets: totalCurrentAssets,
      fixedAssets: fixedAssets, totalFixedAssets: totalFixedAssets, totalAssets: totalAssets,
      liabilities: liabilities, totalLiabilities: totalLiabilities,
      equity: equity, totalEquityAccounts: totalEquityAccounts,
      periodProfit: periodProfit, totalEquity: totalEquity,
      totalLiabilitiesAndEquity: totalLiabilitiesAndEquity,
      isBalanced: diff < 0.05, diff: Math.round(diff * 100) / 100
    };
  }

  function generateCashFlowStatement(journalEntries, accounts, dateRange) {
    var tb = (TB.generateTrialBalance || window.generateTrialBalance)(journalEntries, accounts, dateRange);
    var pnl = generateIncomeStatement(journalEntries, accounts, dateRange);
    var rows = tb.rows || [];

    var cashAccs = rows.filter(function(r) {
      var code = String(r.code || '');
      return code.startsWith('111') || code.startsWith('101') || code.startsWith('102') || r.name.includes('صندوق') || r.name.includes('بنك');
    });

    var openingCash = cashAccs.reduce(function(s, r) { return s + (r.opening_balance_base || 0); }, 0);
    var closingCash = cashAccs.reduce(function(s, r) { return s + (r.net_balance_base || r.debit_balance_base || 0); }, 0);
    var netCashChange = closingCash - openingCash;

    return {
      operatingCash: pnl.netProfit,
      openingCash: openingCash,
      closingCash: closingCash,
      netCashChange: netCashChange,
      cashAccounts: cashAccs
    };
  }

  var FinancialStatements = {
    generateIncomeStatement: generateIncomeStatement,
    generateBalanceSheet: generateBalanceSheet,
    generateCashFlowStatement: generateCashFlowStatement
  };

  window.FinancialStatements = FinancialStatements;

})(typeof window !== 'undefined' ? window : globalThis);
