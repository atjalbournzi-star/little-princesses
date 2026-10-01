/**
 * expenseAccountUtils.js
 * دوال مساعدة لحسابات وقيود وسندات المصاريف التشغيلية
 * Little Princesses ERP - Architectural Standards Compliant
 */

function buildNewCategoryAccount(catName, catCode, accounts = []) {
  let codeToUse = String(catCode || '').trim();
  if (!codeToUse) {
    const expCodes = (accounts || [])
      .filter(a => String(a.account_type || a.type || '').includes('مصروف') || String(a.code || a.acc_code).startsWith('6'))
      .map(a => parseInt(String(a.code || a.acc_code || '0')))
      .filter(n => !isNaN(n) && n >= 600 && n < 700);
    const maxCode = expCodes.length > 0 ? Math.max(...expCodes) : 607;
    codeToUse = String(maxCode + 1);
  }

  const name = String(catName || '').trim();
  return {
    code: codeToUse,
    account_code: codeToUse,
    name,
    account_name: name,
    name_en: '',
    account_type: 'مصروفات',
    parent_id: '6',
    parent_account_id: 'ACC-6',
    parent_account_code: '6',
    nature: 'debit',
    is_group: 0,
    is_active: 1,
    balance: 0.0,
    current_balance: 0.0,
    notes: 'بند مصروف تشغيلي معتمد في شجرة الحسابات'
  };
}

function prepareExpensePayloads(formData, accounts = []) {
  const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(formData.currency) : 'YER';
  const rate = window.CurrencyService ? window.CurrencyService.getRate(currCode) : 1.0;
  const baseObj = window.CurrencyService ? window.CurrencyService.toBase(formData.amount, currCode, rate) : { base_amount: parseFloat(formData.amount) || 0, exchange_rate: rate };

  const rawExpStr = String(formData.exp_category || '5211 - مصاريف تشغيل وصيانة الورشة').trim();
  const expCode = rawExpStr.includes(' - ') ? rawExpStr.split(' - ')[0].trim() : (rawExpStr.match(/\d+(\.\d+)?/)?.[0] || rawExpStr);

  const rawSourceStr = String(formData.source_acc || '101.1 - صندوق الريال اليمني (YER)').trim();
  const sourceCode = rawSourceStr.includes(' - ') ? rawSourceStr.split(' - ')[0].trim() : (rawSourceStr.match(/\d+(\.\d+)?/)?.[0] || rawSourceStr);

  const expAccObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(expCode) || (a.name && rawExpStr.includes(a.name)));
  const debitAccLabel = expAccObj ? `${expAccObj.code || expAccObj.acc_code} - ${expAccObj.name || expAccObj.account_name}` : rawExpStr;

  const sourceAccObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(sourceCode) || (a.name && rawSourceStr.includes(a.name)));
  const creditAccLabel = sourceAccObj ? `${sourceAccObj.code || sourceAccObj.acc_code} - ${sourceAccObj.name || sourceAccObj.account_name}` : rawSourceStr;

  const expNo = `EXP-${Date.now().toString().slice(-6)}`;
  const dateStr = formData.date || (typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10));

  const newE = {
    id: Date.now(),
    expense_no: expNo,
    category: debitAccLabel,
    exp_category: debitAccLabel,
    amount: parseFloat(formData.amount) || 0,
    currency: currCode,
    exchange_rate: rate,
    base_amount: baseObj.base_amount,
    date: dateStr,
    payment_method: formData.pay_method,
    pay_method: formData.pay_method,
    account_id: creditAccLabel,
    payment_source: creditAccLabel,
    source_acc: creditAccLabel,
    recipient: '',
    notes: formData.notes || '',
    status: 'posted'
  };

  const newVoucher = {
    id: Date.now() + 1,
    v_no: `PV-${expNo}`,
    voucher_no: `PV-${expNo}`,
    v_type: 'سند صرف',
    voucher_type: 'سند صرف',
    party: debitAccLabel,
    party_name: debitAccLabel,
    amount: parseFloat(formData.amount) || 0,
    currency: currCode,
    exchange_rate: rate,
    base_amount: baseObj.base_amount,
    pay_method: formData.pay_method,
    date: dateStr,
    account_id: creditAccLabel,
    acc_code: creditAccLabel,
    target_acc: debitAccLabel,
    debit_account: debitAccLabel,
    notes: `سند صرف مصروف: ${debitAccLabel} - ${formData.notes || ''}`,
    status: 'مرحل'
  };

  const newJEntry = {
    id: Date.now() + 2,
    transaction_id: `TX-${expNo}`,
    entry_no: `JV-${expNo}`,
    debit: debitAccLabel,
    credit: creditAccLabel,
    debit_account_id: debitAccLabel,
    credit_account_id: creditAccLabel,
    amount: parseFloat(formData.amount) || 0,
    currency: currCode,
    exchange_rate: rate,
    base_amount: baseObj.base_amount,
    ref_type: 'EXPENSE_VOUCHER',
    ref_id: expNo,
    date: dateStr,
    notes: `قيد مصروف تشغيلي: ${debitAccLabel} - ${formData.notes || ''}`,
    status: 'posted'
  };

  return { newE, newVoucher, newJEntry, sourceCode, expCode, baseAmount: baseObj.base_amount };
}

function updateAccountsForExpense(accounts = [], sourceCode, expCode, baseAmount) {
  return (accounts || []).map(acc => {
    const c = String(acc.code || acc.acc_code || '');
    if (c === sourceCode || (sourceCode && c.startsWith(sourceCode))) {
      const curBal = (parseFloat(acc.current_balance ?? acc.balance) || 0) - baseAmount;
      return { ...acc, current_balance: curBal, balance: curBal };
    }
    if (c === expCode || (expCode && c.startsWith(expCode))) {
      const curBal = (parseFloat(acc.current_balance ?? acc.balance) || 0) + baseAmount;
      return { ...acc, current_balance: curBal, balance: curBal };
    }
    return acc;
  });
}

window.expenseAccountUtils = {
  buildNewCategoryAccount,
  prepareExpensePayloads,
  updateAccountsForExpense
};
