// ============================================================
// useCurrency.js — Global Currency State (localStorage + Events)
// ============================================================

var CURRENCY_STORAGE_KEY = 'erp_system_currency';
var CURRENCY_CHANGE_EVENT = 'erp:currencyChanged';

var SYSTEM_CURRENCY_OPTIONS = [
  { code: 'YER', symbol: '﷼', label: 'ريال يمني',    display: 'YER ﷼', is_base: true },
  { code: 'SAR', symbol: '﷼', label: 'ريال سعودي',   display: 'SAR ﷼', is_base: false },
  { code: 'USD', symbol: '$',  label: 'دولار أمريكي',  display: 'USD $', is_base: false }
];

function getStoredCurrency() {
  try {
    var stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (stored) {
      var found = SYSTEM_CURRENCY_OPTIONS.find(function(c) { return c.code === stored; });
      if (found) return found;
    }
  } catch (e) {}
  return SYSTEM_CURRENCY_OPTIONS[0]; // Default to YER
}

function setStoredCurrency(code) {
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, code);
    window.dispatchEvent(new CustomEvent(CURRENCY_CHANGE_EVENT, { detail: { code: code } }));
  } catch (e) {}
}

function useCurrency() {
  var pair = useState(getStoredCurrency);
  var currency = pair[0];
  var setCurrency = pair[1];

  useEffect(function() {
    function handleChange(e) {
      var found = SYSTEM_CURRENCY_OPTIONS.find(function(c) { return c.code === e.detail.code; });
      if (found) setCurrency(found);
    }
    window.addEventListener(CURRENCY_CHANGE_EVENT, handleChange);
    return function() { window.removeEventListener(CURRENCY_CHANGE_EVENT, handleChange); };
  }, []);

  function updateCurrency(code) {
    var found = SYSTEM_CURRENCY_OPTIONS.find(function(c) { return c.code === code; });
    if (found) {
      setCurrency(found);
      setStoredCurrency(code);
    }
  }

  return { currency: currency, updateCurrency: updateCurrency, SYSTEM_CURRENCY_OPTIONS: SYSTEM_CURRENCY_OPTIONS };
}
