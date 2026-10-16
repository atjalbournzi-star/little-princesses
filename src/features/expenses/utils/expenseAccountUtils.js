/**
 * expenseAccountUtils.js
 * دوال مساعدة لحسابات وقيود وسندات المصاريف التشغيلية
 * Little Princesses ERP - Architectural Standards Compliant
 */

function buildNewCategoryAccount(catName, catCode, accounts = []) {
  let codeToUse = String(catCode || '').trim();
  if (!codeToUse) {
    const expCodes = (accounts || [])
      .filter(a => String(a.code || a.account_code || '').startsWith('5'))
      .map(a => parseInt(String(a.code || a.account_code || '0')))
      .filter(n => !isNaN(n) && n >= 500 && n < 600);
    const maxCode = expCodes.length > 0 ? Math.max(...expCodes) : 510;
    codeToUse = String(maxCode + 1);
  }

  const name = String(catName || '').trim();
  return {
    code: codeToUse, account_code: codeToUse, name, account_name: name,
    account_type: 'Expenses', parent_id: '5', parent_account_id: 'ACC-5',
    parent_account_code: '5', nature: 'debit', is_group: false, is_postable: true,
    is_active: true, balance: 0.0, current_balance: 0.0, notes: 'بند مصروف تشغيلي معتمد'
  };
}

function prepareExpensePayloads(formData, accounts = []) {
  const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(formData.currency) : 'YER';
  const rate = window.CurrencyService ? window.CurrencyService.getRate(currCode) : 1.0;
  const baseObj = window.CurrencyService ? window.CurrencyService.toBase(formData.amount, currCode, rate) : { base_amount: parseFloat(formData.amount) || 0, exchange_rate: rate };

  const rawExpStr = String(formData.exp_category || '502 - إيجار ورشة الخياطة والمعمل').trim();
  const expCode = rawExpStr.includes(' - ') ? rawExpStr.split(' - ')[0].trim() : (rawExpStr.match(/\d+(\.\d+)?/)?.[0] || rawExpStr);

  const rawSourceStr = String(formData.source_acc || '101.1 - صندوق الريال اليمني (YER)').trim();
  const sourceCode = rawSourceStr.includes(' - ') ? rawSourceStr.split(' - ')[0].trim() : (rawSourceStr.match(/\d+(\.\d+)?/)?.[0] || rawSourceStr);

  const expAccObj = (accounts || []).find(a => String(a.code || a.account_code) === String(expCode) || (a.name && rawExpStr.includes(a.name)));
  const debitAccLabel = expAccObj ? `${expAccObj.code || expAccObj.account_code} - ${expAccObj.name || expAccObj.account_name}` : rawExpStr;

  const sourceAccObj = (accounts || []).find(a => String(a.code || a.account_code) === String(sourceCode) || (a.name && rawSourceStr.includes(a.name)));
  const creditAccLabel = sourceAccObj ? `${sourceAccObj.code || sourceAccObj.account_code} - ${sourceAccObj.name || sourceAccObj.account_name}` : rawSourceStr;

  const expNo = `EXP-${Date.now().toString().slice(-6)}`;
  const dateStr = formData.date || (typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10));
  const costCenter = formData.cost_center || 'مشغل التفصيل والخياطة';
  const beneficiary = formData.beneficiary || formData.recipient || '';
  const refNo = formData.reference_no || formData.invoice_no || '';
  const attUrl = formData.attachment_url || formData.receipt_b64 || '';

  const newE = {
    id: expNo, expense_no: expNo, category: debitAccLabel, exp_category: debitAccLabel,
    amount: parseFloat(formData.amount) || 0, currency: currCode, exchange_rate: rate,
    base_amount: baseObj.base_amount, date: dateStr, payment_method: formData.pay_method,
    pay_method: formData.pay_method, account_id: creditAccLabel, payment_source: creditAccLabel,
    source_acc: creditAccLabel, recipient: beneficiary, beneficiary, cost_center: costCenter,
    cost_center_id: formData.cost_center_id || 'CC-01', reference_no: refNo, attachment_url: attUrl,
    branch_id: formData.branch_id || 'BR-01', tenant_id: formData.tenant_id || 'TENANT-01',
    notes: formData.notes || '', status: 'posted'
  };

  const newVoucher = {
    id: Date.now() + 1, v_no: `PV-${expNo}`, voucher_no: `PV-${expNo}`, v_type: 'سند صرف',
    voucher_type: 'سند صرف', party: beneficiary || debitAccLabel, party_name: beneficiary || debitAccLabel,
    amount: parseFloat(formData.amount) || 0, currency: currCode, exchange_rate: rate,
    base_amount: baseObj.base_amount, pay_method: formData.pay_method, date: dateStr,
    account_id: creditAccLabel, acc_code: creditAccLabel, target_acc: debitAccLabel,
    debit_account: debitAccLabel, reference_no: refNo || expNo,
    notes: `سند صرف مصروف: ${debitAccLabel} • ${costCenter}${refNo ? ` (مرجع: ${refNo})` : ''} - ${formData.notes || ''}`,
    status: 'مرحل'
  };

  const newJEntry = {
    id: Date.now() + 2, transaction_id: `TX-${expNo}`, entry_no: `JV-${expNo}`,
    debit: debitAccLabel, credit: creditAccLabel, debit_account_id: debitAccLabel,
    credit_account_id: creditAccLabel, amount: parseFloat(formData.amount) || 0,
    currency: currCode, exchange_rate: rate, base_amount: baseObj.base_amount,
    ref_type: 'EXPENSE_VOUCHER', ref_id: expNo, date: dateStr,
    notes: `قيد مصروف تشغيلي: ${debitAccLabel} • ${costCenter} - ${formData.notes || ''}`,
    status: 'posted'
  };

  return { newE, newVoucher, newJEntry, sourceCode, expCode, baseAmount: baseObj.base_amount };
}

function buildVoucherAndJournalFromExistingExpense(item, accounts = []) {
  const finalAmt = parseFloat(item.net_amount || item.amount || 0);
  const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(item.currency) : (item.currency || 'YER');
  const rate = parseFloat(item.exchange_rate) || 1.0;
  const baseAmt = parseFloat(item.base_amount) || (finalAmt * rate);

  const rawExpStr = String(item.exp_category || item.category || '503 - مصاريف الكهرباء والماء والصيانة').trim();
  const expCode = rawExpStr.includes(' - ') ? rawExpStr.split(' - ')[0].trim() : (rawExpStr.match(/\d+(\.\d+)?/)?.[0] || '503');

  const rawSrcStr = String(item.source_acc || item.source_account_id || item.account_id || '101.1 - صندوق الريال اليمني (YER)').trim();
  const sourceCode = rawSrcStr.includes(' - ') ? rawSrcStr.split(' - ')[0].trim() : (rawSrcStr.match(/\d+(\.\d+)?/)?.[0] || '101.1');

  const expAcc = (accounts || []).find(a => [a.code, a.account_code, a.id].some(c => String(c) === String(expCode)) || (a.name && rawExpStr.includes(a.name)));
  const debitLabel = expAcc ? `${expAcc.code || expAcc.account_code || expAcc.id} - ${expAcc.name || expAcc.account_name}` : rawExpStr;

  const srcAcc = (accounts || []).find(a => [a.code, a.account_code, a.id].some(c => String(c) === String(sourceCode)) || (a.name && rawSrcStr.includes(a.name)));
  const creditLabel = srcAcc ? `${srcAcc.code || srcAcc.account_code || srcAcc.id} - ${srcAcc.name || srcAcc.account_name}` : rawSrcStr;

  const expNo = item.expense_no || item.id || `EXP-${Date.now().toString().slice(-6)}`;
  const dateStr = item.date || item.expense_date || new Date().toISOString().slice(0, 10);
  const costCenter = item.cost_center || 'مشغل التفصيل والخياطة';
  const party = item.beneficiary || item.recipient || debitLabel;

  const voucher = {
    id: `PAY-${item.id || expNo}`, v_no: `PV-${expNo}`, voucher_no: `PV-${expNo}`, payment_no: `PV-${expNo}`,
    v_type: 'سند صرف', voucher_type: 'سند صرف', payment_type: 'Payment', party, party_name: party,
    amount: finalAmt, currency: currCode, exchange_rate: rate, base_amount: baseAmt,
    pay_method: item.pay_method || item.payment_method || 'نقد (كاش)', date: dateStr, date_created: dateStr,
    account_id: creditLabel, acc_code: creditLabel, target_acc: debitLabel, target_account_id: debitLabel,
    reference_no: item.reference_no || expNo, notes: `سند صرف مصروف: ${debitLabel} • ${costCenter}`, status: 'Confirmed'
  };

  const journal = {
    id: `JV-${item.id || expNo}`, entry_no: `JV-${expNo}`, transaction_id: `TX-${expNo}`,
    debit: debitLabel, credit: creditLabel, debit_account_id: debitLabel, credit_account_id: creditLabel,
    amount: finalAmt, currency: currCode, exchange_rate: rate, base_amount: baseAmt,
    ref_type: 'EXPENSE_VOUCHER', ref_id: expNo, date: dateStr, entry_date: dateStr,
    notes: `قيد مصروف تشغيلي: ${debitLabel} • ${costCenter}`, status: 'Posted'
  };

  return { voucher, journal, sourceCode, expCode, baseAmount: baseAmt };
}

function updateAccountsForExpense(accounts = [], sourceCode, expCode, baseAmount) {
  const amt = parseFloat(baseAmount) || 0;
  if (amt <= 0) return accounts;
  return (accounts || []).map(acc => {
    const c = String(acc.code || acc.account_code || acc.acc_code || acc.id || '');
    const n = String(acc.name || acc.account_name || '');
    const isSrc = (sourceCode && (c === sourceCode || c.includes(sourceCode) || n.includes(sourceCode)));
    const isExp = (expCode && (c === expCode || c.includes(expCode) || n.includes(expCode)));
    if (isSrc) {
      const curBal = (parseFloat(acc.current_balance ?? acc.balance) || 0) - amt;
      return { ...acc, current_balance: curBal, balance: curBal };
    }
    if (isExp) {
      const curBal = (parseFloat(acc.current_balance ?? acc.balance) || 0) + amt;
      return { ...acc, current_balance: curBal, balance: curBal };
    }
    return acc;
  });
}

window.expenseAccountUtils = {
  buildNewCategoryAccount,
  prepareExpensePayloads,
  buildVoucherAndJournalFromExistingExpense,
  updateAccountsForExpense
};
