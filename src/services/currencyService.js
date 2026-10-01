/**
 * ============================================================================
 * CurrencyService.js — Central Multi-Currency Engine Facade
 * Architecture: Facade Pattern (Zero Breaking Changes) | Little Princesses ERP
 * ============================================================================
 */

(function(window) {
  'use strict';

  var R = window.CurrencyRates || {};
  var C = window.CurrencyConverter || {};

  var CurrencyService = {
    get BASE_CURRENCY() {
      return (window.CurrencyRates && window.CurrencyRates.BASE_CURRENCY) || 'YER';
    },

    normalizeCode: function(curr) {
      return (window.CurrencyConverter && window.CurrencyConverter.normalizeCode)
        ? window.CurrencyConverter.normalizeCode(curr)
        : (curr || 'YER');
    },

    getCurrencyDef: function(curr) {
      return (window.CurrencyConverter && window.CurrencyConverter.getCurrencyDef)
        ? window.CurrencyConverter.getCurrencyDef(curr)
        : { code: 'YER', symbol: '﷼', decimals: 0, display: 'YER ﷼' };
    },

    getSupportedCurrencies: function() {
      var defs = (window.CurrencyRates && window.CurrencyRates.DEFINITIONS) || [];
      var self = this;
      return defs.map(function(c) {
        return Object.assign({}, c, {
          rate: self.getRate(c.code)
        });
      });
    },

    getRate: function(curr) {
      return (window.CurrencyConverter && window.CurrencyConverter.getRate)
        ? window.CurrencyConverter.getRate(curr)
        : 1.0;
    },

    setRate: function(curr, newRate) {
      var code = this.normalizeCode(curr);
      if (code === this.BASE_CURRENCY) return 1.0;
      var numRate = parseFloat(newRate);
      if (isNaN(numRate) || numRate <= 0) {
        throw new Error('سعر الصرف يجب أن يكون رقماً موجباً أكبر من الصفر');
      }
      var rates = (window.CurrencyRates && window.CurrencyRates.currentRates) || {};
      rates[code] = Number(numRate.toFixed(4));
      if (window.CurrencyRates && window.CurrencyRates.saveStoredRates) {
        window.CurrencyRates.saveStoredRates(rates);
      }
      return rates[code];
    },

    getAllRates: function() {
      var rates = (window.CurrencyRates && window.CurrencyRates.currentRates) || {};
      return Object.assign({}, rates, { YER: 1.0 });
    },

    toBase: function(amount, fromCurr, customRate) {
      return (window.CurrencyConverter && window.CurrencyConverter.toBase)
        ? window.CurrencyConverter.toBase(amount, fromCurr, customRate)
        : { original_amount: Number(amount) || 0, base_amount: Number(amount) || 0, exchange_rate: 1.0 };
    },

    fromBase: function(baseAmount, targetCurr, customRate) {
      return (window.CurrencyConverter && window.CurrencyConverter.fromBase)
        ? window.CurrencyConverter.fromBase(baseAmount, targetCurr, customRate)
        : (Number(baseAmount) || 0);
    },

    convert: function(amount, fromCurr, toCurr, fromRate, toRate) {
      return (window.CurrencyConverter && window.CurrencyConverter.convert)
        ? window.CurrencyConverter.convert(amount, fromCurr, toCurr, fromRate, toRate)
        : (Number(amount) || 0);
    },

    calculateExchangeDiff: function(foreignAmount, originalRate, settlementRate) {
      return (window.CurrencyConverter && window.CurrencyConverter.calculateExchangeDiff)
        ? window.CurrencyConverter.calculateExchangeDiff(foreignAmount, originalRate, settlementRate)
        : { diff_amount: 0, is_gain: false, is_loss: false };
    },

    format: function(amount, curr, decimals) {
      return (window.CurrencyConverter && window.CurrencyConverter.format)
        ? window.CurrencyConverter.format(amount, curr, decimals)
        : (String(amount) + ' ' + (curr || 'YER'));
    },

    formatDual: function(amount, curr, customRate) {
      return (window.CurrencyConverter && window.CurrencyConverter.formatDual)
        ? window.CurrencyConverter.formatDual(amount, curr, customRate)
        : this.format(amount, curr);
    }
  };

  window.CurrencyService = CurrencyService;

})(window);
