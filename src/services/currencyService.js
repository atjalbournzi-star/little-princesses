/**
 * ============================================================================
 * CurrencyService.js — Central Multi-Currency Engine & Exchange Rate Manager
 * Single Source of Truth for Little Princesses ERP
 * ============================================================================
 */

(function(window) {
  'use strict';

  var STORAGE_KEY_RATES = 'erp_exchange_rates_v1';
  var STORAGE_KEY_ACTIVE_CURRENCY = 'erp_system_currency';
  var EVENT_CURRENCY_CHANGED = 'erp:currencyChanged';
  var EVENT_RATES_CHANGED = 'erp:exchangeRatesChanged';

  // Base Currency: YER (الريال اليمني)
  var BASE_CURRENCY_CODE = 'YER';

  // Supported Currencies Metadata
  var CURRENCY_DEFINITIONS = [
    {
      code: 'YER',
      symbol: '﷼',
      name: 'ريال يمني',
      name_en: 'Yemeni Rial',
      display: 'YER ﷼',
      is_base: true,
      decimals: 0,
      default_rate: 1.0,
      status: 'active'
    },
    {
      code: 'SAR',
      symbol: '﷼',
      name: 'ريال سعودي',
      name_en: 'Saudi Riyal',
      display: 'SAR ﷼',
      is_base: false,
      decimals: 2,
      default_rate: 142.0, // 1 SAR = 142 YER (افتراضي قابل للتعديل)
      status: 'active'
    },
    {
      code: 'USD',
      symbol: '$',
      name: 'دولار أمريكي',
      name_en: 'US Dollar',
      display: 'USD $',
      is_base: false,
      decimals: 2,
      default_rate: 535.0, // 1 USD = 535 YER (افتراضي قابل للتعديل)
      status: 'active'
    }
  ];

  // Helper to load stored rates
  function loadStoredRates() {
    var rates = {
      YER: 1.0,
      SAR: 142.0,
      USD: 535.0
    };
    try {
      var saved = localStorage.getItem(STORAGE_KEY_RATES);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (parsed.YER) rates.YER = 1.0;
          if (parsed.SAR && Number(parsed.SAR) > 0) rates.SAR = Number(parsed.SAR);
          if (parsed.USD && Number(parsed.USD) > 0) rates.USD = Number(parsed.USD);
        }
      }
    } catch (e) {
      console.warn('[CurrencyService] Error loading stored rates:', e);
    }
    return rates;
  }

  // Helper to save rates
  function saveStoredRates(rates) {
    try {
      rates.YER = 1.0; // Enforce base
      localStorage.setItem(STORAGE_KEY_RATES, JSON.stringify(rates));
      window.dispatchEvent(new CustomEvent(EVENT_RATES_CHANGED, { detail: { rates: rates } }));
      
      // Also persist to server in background if available
      if (window.fetch) {
        fetch('/api/exchange-rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rates: rates })
        }).catch(function() {});
      }
    } catch (e) {
      console.warn('[CurrencyService] Error saving rates:', e);
    }
  }

  var currentRates = loadStoredRates();

  var CurrencyService = {
    BASE_CURRENCY: BASE_CURRENCY_CODE,
    
    // Normalizes currency code string or object (e.g. 'USD $', {code: 'USD'}, 'USD')
    normalizeCode: function(curr) {
      if (!curr) return BASE_CURRENCY_CODE;
      if (typeof curr === 'object') {
        return curr.code || curr.currency || curr.value || BASE_CURRENCY_CODE;
      }
      var str = String(curr).trim().toUpperCase();
      if (str.indexOf('SAR') !== -1 || str.indexOf('سعودي') !== -1) return 'SAR';
      if (str.indexOf('USD') !== -1 || str.indexOf('$') !== -1 || str.indexOf('دولار') !== -1) return 'USD';
      if (str.indexOf('YER') !== -1 || str.indexOf('يمني') !== -1) return 'YER';
      return str.slice(0, 3) || BASE_CURRENCY_CODE;
    },

    // Gets full currency metadata definition
    getCurrencyDef: function(curr) {
      var code = this.normalizeCode(curr);
      var def = CURRENCY_DEFINITIONS.find(function(c) { return c.code === code; });
      return def || CURRENCY_DEFINITIONS[0];
    },

    // Gets all supported currencies list
    getSupportedCurrencies: function() {
      var self = this;
      return CURRENCY_DEFINITIONS.map(function(c) {
        return Object.assign({}, c, {
          rate: self.getRate(c.code)
        });
      });
    },

    // Gets exchange rate against YER (Base)
    getRate: function(curr) {
      var code = this.normalizeCode(curr);
      if (code === BASE_CURRENCY_CODE) return 1.0;
      var rate = currentRates[code];
      if (rate && Number(rate) > 0) return Number(rate);
      var def = CURRENCY_DEFINITIONS.find(function(c) { return c.code === code; });
      return def ? def.default_rate : 1.0;
    },

    // Updates exchange rate for a currency
    setRate: function(curr, newRate) {
      var code = this.normalizeCode(curr);
      if (code === BASE_CURRENCY_CODE) return 1.0;
      var numRate = parseFloat(newRate);
      if (isNaN(numRate) || numRate <= 0) {
        throw new Error('سعر الصرف يجب أن يكون رقماً موجباً أكبر من الصفر');
      }
      currentRates[code] = Number(numRate.toFixed(4));
      saveStoredRates(currentRates);
      return currentRates[code];
    },

    // Gets all active exchange rates
    getAllRates: function() {
      return Object.assign({}, currentRates, { YER: 1.0 });
    },

    // Converts amount from any currency to Base Currency (YER)
    toBase: function(amount, fromCurr, customRate) {
      var num = parseFloat(amount) || 0;
      var code = this.normalizeCode(fromCurr);
      var rate = customRate && Number(customRate) > 0 ? Number(customRate) : this.getRate(code);
      
      var baseAmount = code === BASE_CURRENCY_CODE ? num : (num * rate);
      // Safe 2-decimal rounding for financial accuracy
      baseAmount = Math.round(baseAmount * 100) / 100;

      return {
        original_amount: num,
        currency: code,
        exchange_rate: rate,
        base_amount: baseAmount,
        rate_date: new Date().toISOString()
      };
    },

    // Converts amount from Base Currency (YER) to Target Currency
    fromBase: function(baseAmount, targetCurr, customRate) {
      var num = parseFloat(baseAmount) || 0;
      var code = this.normalizeCode(targetCurr);
      var rate = customRate && Number(customRate) > 0 ? Number(customRate) : this.getRate(code);
      
      var converted = code === BASE_CURRENCY_CODE ? num : (rate > 0 ? (num / rate) : 0);
      var def = this.getCurrencyDef(code);
      var decimals = def ? def.decimals : 2;
      var factor = Math.pow(10, decimals);
      return Math.round(converted * factor) / factor;
    },

    // Universal conversion between any two currencies
    convert: function(amount, fromCurr, toCurr, customRate) {
      var fromCode = this.normalizeCode(fromCurr);
      var toCode = this.normalizeCode(toCurr);
      if (fromCode === toCode) return parseFloat(amount) || 0;

      var baseObj = this.toBase(amount, fromCode, (fromCode !== BASE_CURRENCY_CODE ? customRate : null));
      return this.fromBase(baseObj.base_amount, toCode, (toCode !== BASE_CURRENCY_CODE ? customRate : null));
    },

    // Calculates Exchange Gain/Loss (فروق أسعار الصرف)
    // Positive = Gain (أرباح فروق عملة), Negative = Loss (خسائر فروق عملة)
    calculateExchangeDiff: function(foreignAmount, originalRate, settlementRate) {
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
    },

    // Universal Currency Formatter (Tabular English Numerals)
    format: function(amount, curr, decimals) {
      var num = parseFloat(amount);
      if (isNaN(num)) num = 0;
      var def = this.getCurrencyDef(curr);
      var dec = decimals !== undefined ? decimals : def.decimals;
      var formattedNum = num.toLocaleString('en-US', {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec
      });
      return formattedNum + ' ' + def.display;
    },

    // Formats dual display: e.g. "100.00 SAR ﷼ (14,200 YER ﷼)"
    formatDual: function(amount, curr, customRate) {
      var code = this.normalizeCode(curr);
      var num = parseFloat(amount) || 0;
      if (code === BASE_CURRENCY_CODE) {
        return this.format(num, 'YER');
      }
      var baseObj = this.toBase(num, code, customRate);
      return this.format(num, code) + ' (' + this.format(baseObj.base_amount, 'YER') + ')';
    }
  };

  // Expose globally
  window.CurrencyService = CurrencyService;

})(window);
