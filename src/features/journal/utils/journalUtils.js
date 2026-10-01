// src/features/journal/utils/journalUtils.js
// Pure helpers, CSS constants, and entry builder functions for the Journal feature

const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";
const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

function getCleanAccName(acc) {
  if (!acc) return '';
  const raw = acc.name || acc.account_name || acc.acc_name || '';
  return (raw && !raw.includes('???')) ? raw : (acc.name_en || acc.code || acc.acc_code || '');
}

function getAccLabel(rawVal, rawCode, accounts) {
  const s = String(rawCode || rawVal || '').trim();
  const c = s.split(' - ')[0].trim();
  const found = (accounts || []).find(a =>
    String(a.code || a.acc_code || a.id).trim() === c ||
    String(a.code || a.acc_code || a.id).trim() === s
  );
  if (found) {
    const n = found.name || found.account_name || found.acc_name || found.name_en || '';
    return `${found.code || found.acc_code} - ${n}`;
  }
  return s;
}

function resolveAccLabel(code, accounts) {
  const accObj = (accounts || []).find(a =>
    String(a.code || a.acc_code || a.id) === String(code)
  );
  return accObj
    ? `${accObj.code || accObj.acc_code} - ${getCleanAccName(accObj)}`
    : code;
}

function buildEntryObject(formData, currencyCode, accounts) {
  const rate = parseFloat(formData.exchange_rate) ||
    (window.CurrencyService ? window.CurrencyService.getRate(currencyCode) : 1.0);
  const baseObj = window.CurrencyService
    ? window.CurrencyService.toBase(formData.amount, currencyCode, rate)
    : { base_amount: parseFloat(formData.amount) || 0, exchange_rate: rate };
  const debitLabel  = resolveAccLabel(formData.debit, accounts);
  const creditLabel = resolveAccLabel(formData.credit, accounts);
  const TODAY_STR_ISO = new Date().toISOString().split('T')[0];
  return {
    id: Date.now(),
    transaction_id: `TX-JV-${Date.now()}`,
    entry_no: formData.entry_no || `JV-${Date.now().toString().slice(-6)}`,
    debit: debitLabel, credit: creditLabel,
    debit_account_id: debitLabel, credit_account_id: creditLabel,
    debit_code: formData.debit, credit_code: formData.credit,
    amount: parseFloat(formData.amount) || 0,
    currency: currencyCode,
    exchange_rate: rate,
    base_amount: baseObj.base_amount,
    ref_type: formData.ref_type || 'قيد يدوي',
    ref_id: formData.ref_id || '',
    date: formData.date || TODAY_STR_ISO,
    notes: formData.notes || '',
    statement: formData.notes || '',
    status: 'posted'
  };
}

function buildUpdatedEntry(editingEntry, editFormData, accounts) {
  const editCurrencyCode = window.CurrencyService
    ? window.CurrencyService.normalizeCode(editFormData.currency) : 'YER';
  const rate = parseFloat(editFormData.exchange_rate) ||
    (window.CurrencyService ? window.CurrencyService.getRate(editCurrencyCode) : 1.0);
  const amt = parseFloat(editFormData.amount) || 0;
  const baseObj = window.CurrencyService
    ? window.CurrencyService.toBase(amt, editCurrencyCode, rate)
    : { base_amount: amt * rate };
  const debitLabel  = resolveAccLabel(editFormData.debit, accounts);
  const creditLabel = resolveAccLabel(editFormData.credit, accounts);
  return {
    ...editingEntry,
    entry_no: editFormData.entry_no,
    debit: debitLabel, credit: creditLabel,
    debit_account_id: debitLabel, credit_account_id: creditLabel,
    debit_code: editFormData.debit, credit_code: editFormData.credit,
    amount: amt, currency: editCurrencyCode,
    exchange_rate: rate, base_amount: baseObj.base_amount,
    ref_type: editFormData.ref_type || 'قيد يدوي',
    ref_id: editFormData.ref_id || '',
    date: editFormData.date,
    notes: editFormData.notes,
    statement: editFormData.notes
  };
}

window.JournalUtils = {
  inputCls,
  labelCls,
  getCleanAccName,
  getAccLabel,
  resolveAccLabel,
  buildEntryObject,
  buildUpdatedEntry
};
