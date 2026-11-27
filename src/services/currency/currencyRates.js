/**
 * ============================================================================
 * currencyRates.js — Currency Definitions, Storage & Server Sync Engine
 * Architecture: Modular Shared Services | Little Princesses ERP
 * ============================================================================
 */

(function(window) {
  'use strict';

  var STORAGE_KEY_RATES = 'erp_exchange_rates_v1';
  var STORAGE_KEY_ACTIVE_CURRENCY = 'erp_system_currency';
  var EVENT_RATES_CHANGED = 'erp:exchangeRatesChanged';
  var BASE_CURRENCY_CODE = 'YER';

  var CURRENCY_DEFINITIONS = [
    {
      code: 'YER',
      symbol: '﷼',
      name: 'ريال يمني',
      name_en: 'Yemeni Rial',
      display: 'YER',
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
      display: 'SAR',
      is_base: false,
      decimals: 2,
      default_rate: 142.0,
      status: 'active'
    },
    {
      code: 'USD',
      symbol: '$',
      name: 'دولار أمريكي',
      name_en: 'US Dollar',
      display: 'USD',
      is_base: false,
      decimals: 2,
      default_rate: 535.0,
      status: 'active'
    }
  ];

  try {
    localStorage.removeItem(STORAGE_KEY_RATES);
  } catch(e) {}

  function loadStoredRates() {
    return { YER: 1.0, SAR: 142.0, USD: 535.0 };
  }

  var currentRates = loadStoredRates();

  function saveStoredRates(rates) {
    try {
      rates.YER = 1.0;
      if (rates.SAR) currentRates.SAR = Number(rates.SAR);
      if (rates.USD) currentRates.USD = Number(rates.USD);
      window.dispatchEvent(new CustomEvent(EVENT_RATES_CHANGED, { detail: { rates: currentRates } }));
      if (window.fetch) {
        fetch('/api/exchange-rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rates: rates })
        }).catch(function() {});
      }
    } catch (e) {
      console.warn('[CurrencyRates] Error saving rates:', e);
    }
  }

  // Auto-sync rates dynamically with server on startup (No stale local cache)
  if (typeof window !== 'undefined' && window.fetch) {
    fetch('/api/exchange-rates')
      .then(function(res) { return res.json(); })
      .then(function(json) {
        if (json && json.success && json.rates) {
          if (json.rates.SAR && Number(json.rates.SAR) > 0) currentRates.SAR = Number(json.rates.SAR);
          if (json.rates.USD && Number(json.rates.USD) > 0) currentRates.USD = Number(json.rates.USD);
          currentRates.YER = 1.0;
          window.dispatchEvent(new CustomEvent(EVENT_RATES_CHANGED, { detail: { rates: currentRates } }));
        }
      })
      .catch(function(err) {
        console.warn('[CurrencyRates] Server rates sync error:', err);
      });
  }

  window.CurrencyRates = {
    BASE_CURRENCY: BASE_CURRENCY_CODE,
    DEFINITIONS: CURRENCY_DEFINITIONS,
    currentRates: currentRates,
    loadStoredRates: loadStoredRates,
    saveStoredRates: saveStoredRates,
    STORAGE_KEY_ACTIVE_CURRENCY: STORAGE_KEY_ACTIVE_CURRENCY
  };

})(window);
