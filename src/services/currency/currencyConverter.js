/**
 * ============================================================================
 * currencyConverter.js — Conversion Logic, Exchange Diff & Formatter
 * Architecture: Modular Shared Services | Little Princesses ERP
 * ============================================================================
 */

(function(window) {
  'use strict';

  function normalizeCode(curr) {
    var base = (window.CurrencyRates && window.CurrencyRates.BASE_CURRENCY) || 'YER';
    if (!curr) return base;
    if (typeof curr === 'object') {
      return curr.code || curr.currency || curr.value || base;
    }
    var str = String(curr).trim().toUpperCase();
    if (str.indexOf('SAR') !== -1 || str.indexOf('سعودي') !== -1) return 'SAR';
    if (str.indexOf('USD') !== -1 || str.indexOf('$') !== -1 || str.indexOf('دولار') !== -1) return 'USD';
    if (str.indexOf('YER') !== -1 || str.indexOf('يمني') !== -1) return 'YER';
    return str.slice(0, 3) || base;
  }

  function getCurrencyDef(curr) {
    var defs = (window.CurrencyRates && window.CurrencyRates.DEFINITIONS) || [];
    var code = normalizeCode(curr);
    var def = defs.find(function(c) { return c.code === code; });
    return def || defs[0] || { code: 'YER', symbol: '﷼', decimals: 0, display: 'YER ﷼' };
  }

  function getRate(curr) {
    var base = (window.CurrencyRates && window.CurrencyRates.BASE_CURRENCY) || 'YER';
    var code = normalizeCode(curr);
    if (code === base) return 1.0;
    var rates = (window.CurrencyRates && window.CurrencyRates.currentRates) || {};
    var rate = rates[code];
    if (rate && Number(rate) > 0) return Number(rate);
    var def = getCurrencyDef(code);
    return def ? def.default_rate : 1.0;
  }

  function toBase(amount, fromCurr, customRate) {
    var base = (window.CurrencyRates && window.CurrencyRates.BASE_CURRENCY) || 'YER';
    var num = parseFloat(amount) || 0;
    var code = normalizeCode(fromCurr);
    var rate = customRate && Number(customRate) > 0 ? Number(customRate) : getRate(code);
    var baseAmount = code === base ? num : (num * rate);
    baseAmount = Math.round(baseAmount * 100) / 100;
    return {
      original_amount: num,
      currency: code,
      exchange_rate: rate,
      base_amount: baseAmount,
      rate_date: new Date().toISOString()
    };
  }

  function fromBase(baseAmount, targetCurr, customRate) {
    var base = (window.CurrencyRates && window.CurrencyRates.BASE_CURRENCY) || 'YER';
    var num = parseFloat(baseAmount) || 0;
    var code = normalizeCode(targetCurr);
    var rate = customRate && Number(customRate) > 0 ? Number(customRate) : getRate(code);
    var converted = code === base ? num : (rate > 0 ? (num / rate) : 0);
    var def = getCurrencyDef(code);
    var decimals = def ? def.decimals : 2;
    var factor = Math.pow(10, decimals);
    return Math.round(converted * factor) / factor;
  }

  function convert(amount, fromCurr, toCurr, fromRate, toRate) {
    var base = (window.CurrencyRates && window.CurrencyRates.BASE_CURRENCY) || 'YER';
    var fromCode = normalizeCode(fromCurr);
    var toCode = normalizeCode(toCurr);
    var num = parseFloat(amount) || 0;
    if (fromCode === toCode) return num;

    var rFrom = fromCode === base ? 1.0 : (fromRate && Number(fromRate) > 0 ? Number(fromRate) : getRate(fromCode));
    var baseAmount = fromCode === base ? num : (num * rFrom);

    var rTo = toCode === base ? 1.0 : (toRate && Number(toRate) > 0 ? Number(toRate) : getRate(toCode));
    var converted = toCode === base ? baseAmount : (rTo > 0 ? (baseAmount / rTo) : 0);

    var def = getCurrencyDef(toCode);
    var decimals = def ? def.decimals : 2;
    var factor = Math.pow(10, decimals);
    return Math.round(converted * factor) / factor;
  }

  function calculateExchangeDiff(foreignAmount, originalRate, settlementRate) {
    var amount = parseFloat(foreignAmount) || 0;
    var origR = parseFloat(originalRate) || 0;
    var settR = parseFloat(settlementRate) || 0;
    var origBase = amount * origR;
    var settBase = amount * settR;
    var diff = settBase - origBase;
    return {
      foreign_amount: amount,
      original_rate: origR,
      settlement_rate: settR,
      original_base_amount: Math.round(origBase * 100) / 100,
      settlement_base_amount: Math.round(settBase * 100) / 100,
      diff_amount: Math.round(diff * 100) / 100,
      is_gain: diff > 0,
      is_loss: diff < 0
    };
  }

  function format(amount, curr, decimals) {
    var num = parseFloat(amount);
    if (isNaN(num)) num = 0;
    var def = getCurrencyDef(curr);
    var dec = decimals !== undefined ? decimals : def.decimals;
    var formattedNum = num.toLocaleString('en-US', {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec
    });
    return formattedNum + ' ' + def.display;
  }

  function formatDual(amount, curr, customRate) {
    var base = (window.CurrencyRates && window.CurrencyRates.BASE_CURRENCY) || 'YER';
    var code = normalizeCode(curr);
    var num = parseFloat(amount) || 0;
    if (code === base) return format(num, 'YER');
    var baseObj = toBase(num, code, customRate);
    return format(num, code) + ' (' + format(baseObj.base_amount, 'YER') + ')';
  }

  window.CurrencyConverter = {
    normalizeCode: normalizeCode,
    getCurrencyDef: getCurrencyDef,
    getRate: getRate,
    toBase: toBase,
    fromBase: fromBase,
    convert: convert,
    calculateExchangeDiff: calculateExchangeDiff,
    format: format,
    formatDual: formatDual
  };

})(window);
