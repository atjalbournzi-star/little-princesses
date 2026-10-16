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
    var m = s.match(/^(\d+([.-]\d+)*)/);
    if (m) return m[1];
    var mAcc = s.match(/^ACC[-_]?(\d+([.-]\d+)*)/i);
    if (mAcc) return mAcc[1];
    return s.replace(/^ACC[-_]?/i, '').trim();
  }

  function findAccount(accList, rawVal, rawCode) {
    if (!accList || !Array.isArray(accList)) return null;
    var strVal = String(rawVal || '').trim();
    var strCode = String(rawCode || '').trim();
    var c1 = parseAccCode(strCode);
    var c2 = parseAccCode(strVal);
    var cleanVal = strVal.replace(/^ACC[-_]?/i, '');
    var cleanCode = strCode.replace(/^ACC[-_]?/i, '');

    return accList.find(function(a) {
      var aId = String(a.id || '').trim();
      var aCode = String(a.code || a.account_code || '').trim();
      var cleanAId = aId.replace(/^ACC[-_]?/i, '');
      var cleanACode = aCode.replace(/^ACC[-_]?/i, '');
      return aId === strVal ||
             aCode === strVal ||
             aId === strCode ||
             aCode === strCode ||
             (cleanVal && (cleanAId === cleanVal || cleanACode === cleanVal)) ||
             (cleanCode && (cleanAId === cleanCode || cleanACode === cleanCode)) ||
             (c1 && (aCode === c1 || cleanAId === c1 || cleanACode === c1)) ||
             (c2 && (aCode === c2 || cleanAId === c2 || cleanACode === c2)) ||
             (c1 && aId === ('ACC-' + c1)) ||
             (c2 && aId === ('ACC-' + c2)) ||
             aId.replace(/[-_.]/g, '') === strVal.replace(/[-_.]/g, '') ||
             aCode.replace(/[-_.]/g, '') === strVal.replace(/[-_.]/g, '');
    });
  }

  function getAccountNature(acc) {
    if (!acc) return 'debit';
    var raw = String(acc.nature || acc.normal_balance || '').trim().toLowerCase();
    if (raw === 'credit' || raw === 'دائن') return 'credit';
    if (raw === 'debit' || raw === 'مدين') return 'debit';
    var t = String(acc.account_type || acc.acc_type || acc.category || acc.account_category || '').toLowerCase();
    var code = String(acc.code || acc.account_code || acc.id || '').replace(/^ACC[-_]?/i, '').trim();
    if (t.includes('خصوم') || t.includes('التزام') || t.includes('liabilit') || code.startsWith('2')) return 'credit';
    if (t.includes('ملكي') || t.includes('equity') || code.startsWith('3')) return 'credit';
    if (t.includes('إيراد') || t.includes('ايراد') || t.includes('مبيعات') || t.includes('revenu') || code.startsWith('4')) return 'credit';
    if (t.includes('مصروف') || t.includes('تكاليف') || t.includes('تكلفة') || t.includes('expens') || code.startsWith('5')) return 'debit';
    if (t.includes('أصول') || t.includes('اصول') || t.includes('asset') || code.startsWith('1')) return 'debit';
    return 'debit';
  }

  var AccountFinder = {
    parseAccCode: parseAccCode,
    findAccount: findAccount,
    getAccountNature: getAccountNature
  };

  window.AccountFinder = AccountFinder;

})(typeof window !== 'undefined' ? window : globalThis);
