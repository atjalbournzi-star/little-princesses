/**
 * ============================================================================
 * accountFinder.js — Chart of Accounts Resolution & Normalization Utility
 * Domain: Accounting Core Services | Architecture Standard: Rule 1, 3 & 5
 * ============================================================================
 */

(function(window) {
  'use strict';

  function parseAccCode(rawStr) {
    if (!rawStr) return '';
    var s = String(rawStr).trim();
    if (s.indexOf(' - ') !== -1) {
      s = s.split(' - ')[0].trim();
    }
    var m = s.match(/^(\d+([.-]\d+)?)/);
    if (m) return m[1];
    var mAcc = s.match(/^ACC[-_]?(\d+([.-]\d+)?)/i);
    if (mAcc) return mAcc[1];
    return s;
  }

  function findAccount(accList, rawVal, rawCode) {
    if (!accList || !Array.isArray(accList)) return null;
    var strVal = String(rawVal || '').trim();
    var strCode = String(rawCode || '').trim();
    var c1 = parseAccCode(strCode);
    var c2 = parseAccCode(strVal);

    return accList.find(function(a) {
      var aId = String(a.id || '').trim();
      var aCode = String(a.code || a.account_code || '').trim();
      return aId === strVal ||
             aCode === strVal ||
             (c1 && aCode === c1) ||
             (c2 && aCode === c2) ||
             (c1 && aId === ('ACC-' + c1)) ||
             (c2 && aId === ('ACC-' + c2)) ||
             aId.replace(/[-_.]/g, '') === strVal.replace(/[-_.]/g, '') ||
             aCode.replace(/[-_.]/g, '') === strVal.replace(/[-_.]/g, '');
    });
  }

  function getAccountNature(acc) {
    if (!acc) return 'debit';
    if (acc.nature) return acc.nature;
    var t = String(acc.account_type || acc.acc_type || '').toLowerCase();
    var creditTypes = ['خصوم', 'حقوق ملكية', 'إيرادات', 'liabilities', 'equity', 'revenue'];
    return creditTypes.includes(t) ? 'credit' : 'debit';
  }

  var AccountFinder = {
    parseAccCode: parseAccCode,
    findAccount: findAccount,
    getAccountNature: getAccountNature
  };

  window.AccountFinder = AccountFinder;

})(typeof window !== 'undefined' ? window : globalThis);
