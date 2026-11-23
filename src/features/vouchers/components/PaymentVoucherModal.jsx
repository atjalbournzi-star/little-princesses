const { useState, useEffect, useMemo } = React;

function PaymentVoucherModal({
  isOpen, onClose, isEdit = false, editData = null,
  accounts = [], purchases = [], employees = [], partnerAccounts = [],
  getCleanPartnerName, findPartnerAccount, onSaveVoucher,
  isSubmitting = false, showToast
}) {
  if (!isOpen) return null;

  const [party, setParty] = useState(editData?.party || '');
  const [currency, setCurrency] = useState(editData?.currency || 'YER ﷼');
  const [exchangeRate, setExchangeRate] = useState(String(editData?.exchange_rate || '1.0'));
  const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(currency) : 'YER';

  // صناديق وبنوك مقروءة ديناميكياً من شجرة الحسابات دون أكواد مكتوبة يدوياً
  const cashAccounts = useMemo(() => (accounts || []).filter(a => !a.is_group && (
    a.account_category === 'cash' || a.category === 'cash' || a.type === 'أصول متداولة' ||
    (a.name || a.account_name || '').includes('صندوق') || (a.name || a.account_name || '').includes('بنك') || (a.name || a.account_name || '').includes('نقد')
  )), [accounts]);

  // حسابات مستهدفة ديناميكية للموردين والمصروفات
  const targetAccounts = useMemo(() => {
    const list = (accounts || []).filter(a => !a.is_group && !cashAccounts.some(c => String(c.code || c.acc_code) === String(a.code || a.acc_code)));
    return list.length ? list : (accounts || []).filter(a => !a.is_group);
  }, [accounts, cashAccounts]);

  const defaultCashCode = useMemo(() => {
    const match = cashAccounts.find(a => (a.currency || '').toUpperCase() === currCode || (a.name || '').includes(currCode)) || cashAccounts[0];
    return match ? String(match.code || match.acc_code) : '';
  }, [cashAccounts, currCode]);

  const defaultTargetCode = useMemo(() => {
    const match = targetAccounts.find(a => (a.name || '').includes('مورد') || (a.name || '').includes('أقمشة') || a.type === 'خصوم' || a.type === 'مصروفات') || targetAccounts[0];
    return match ? String(match.code || match.acc_code) : '';
  }, [targetAccounts]);

  const [targetAcc, setTargetAcc] = useState(editData?.target_acc || defaultTargetCode);
  const [cashAcc, setCashAcc] = useState(editData?.acc_code || defaultCashCode);
  const [voucherNo, setVoucherNo] = useState(editData?.v_no || editData?.payment_no || '');
  const [amount, setAmount] = useState(editData?.amount ? String(editData.amount) : '');
  const [payMethod, setPayMethod] = useState(editData?.pay_method || 'نقد (كاش)');
  const [notes, setNotes] = useState(editData?.notes || '');

  useEffect(() => {
    if (isOpen && !isEdit && !voucherNo) {
      const getSeq = window.previewNextSequenceNumber || window.getNextSequenceNumber;
      if (getSeq) getSeq('PV').then(seq => { if (seq) setVoucherNo(seq); });
    }
  }, [isOpen, isEdit, voucherNo]);

  useEffect(() => {
    if (!cashAcc && defaultCashCode) setCashAcc(defaultCashCode);
    if (!targetAcc && defaultTargetCode) setTargetAcc(defaultTargetCode);
  }, [defaultCashCode, defaultTargetCode, cashAcc, targetAcc]);

  useEffect(() => {
    if (window.CurrencyService && !isEdit) setExchangeRate(String(window.CurrencyService.getRate(currCode)));
    if (!isEdit && defaultCashCode) setCashAcc(defaultCashCode);
  }, [currency, currCode, isEdit, defaultCashCode]);

  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!party.trim()) return showToast?.('يرجى اختيار أو كتابة اسم المستفيد ⚠️', 'error');
    if (numAmount <= 0) return showToast?.('يرجى إدخال مبلغ السند ⚠️', 'error');

    const vNo = voucherNo || '';
    const vRate = parseFloat(exchangeRate) || 1.0;
    const vBaseAmt = numAmount * vRate;
    const debitObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(targetAcc));
    const creditObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(cashAcc));
    const debitLabel = debitObj ? `${debitObj.code || debitObj.acc_code} - ${debitObj.name || debitObj.account_name}` : targetAcc;
    const creditLabel = creditObj ? `${creditObj.code || creditObj.acc_code} - ${creditObj.name || creditObj.account_name}` : cashAcc;
    const matchedSupp = (purchases || []).find(p => (p.supplier || p.vendor_name) === party);

    const newV = {
      id: editData?.id || undefined, v_no: vNo, voucher_no: vNo, payment_no: vNo,
      v_type: 'سند صرف', voucher_type: 'سند صرف', payment_type: 'سند صرف',
      supplier_id: matchedSupp?.supplier_id || null,
      party, party_name: party, amount: numAmount, currency: currCode,
      exchange_rate: vRate, base_amount: vBaseAmt,
      date: editData?.date || (typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10)),
      notes: notes ? `${notes} | الحساب المقابل: ${targetAcc}` : `سند صرف: ${party} | الحساب المقابل: ${targetAcc}`,
      pay_method: payMethod, payment_method: payMethod, acc_code: cashAcc, target_acc: targetAcc,
      debit_account: debitLabel, credit_account: creditLabel
    };

    let newExp = null;
    if (debitLabel.startsWith('5') || debitLabel.startsWith('6') || debitLabel.includes('مصروف')) {
      newExp = {
        id: `${vNo}-EXP`, expense_no: vNo, category: debitLabel, exp_category: debitLabel,
        amount: numAmount, currency: currCode, exchange_rate: vRate, base_amount: vBaseAmt,
        date: newV.date, payment_method: payMethod, pay_method: payMethod,
        account_id: creditLabel, payment_source: creditLabel, recipient: party,
        notes: newV.notes || `سند صرف: ${party}`, status: 'posted'
      };
    }

    const entry = {
      id: `${vNo}-JVL`, transaction_id: `TX-VCH-${vNo}`, entry_no: 'AUTO-VCH-' + vNo,
      debit: debitLabel, credit: creditLabel, debit_code: targetAcc, credit_code: cashAcc,
      amount: numAmount, currency: currCode, exchange_rate: vRate, base_amount: vBaseAmt,
      ref_type: 'PAYMENT_VOUCHER', ref_id: vNo, date: newV.date,
      notes: `سند صرف [${payMethod}]: ${party} - ${notes || ''}`, status: 'posted'
    };

    const success = await onSaveVoucher({
      newV, generatedEntries: [entry], newExp,
      splitPayments: [{ id: 1, acc_code: cashAcc, amount: numAmount, method: payMethod }],
      vRate, modalTargetAcc: targetAcc, isReceipt: false, vBaseAmt
    });
    if (success) onClose();
  };

  const supplierNames = useMemo(() => [...new Set((purchases || []).map(p => p.supplier || p.vendor_name).filter(Boolean))], [purchases]);
  const createPortal = (typeof ReactDOM !== 'undefined' && ReactDOM.createPortal) ? ReactDOM.createPortal : null;

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-[4px] animate-fadeIn" dir="rtl" onClick={onClose}>
      <div className="bg-[#1e2433] text-white rounded-3xl border border-[#2d3748] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-[#2d3748] flex items-center justify-between bg-[#181d2a] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center text-base font-bold">📤</div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">{isEdit ? 'تعديل سند صرف' : 'إصدار سند صرف نقدية'}</h3>
              <p className="text-[10.5px] text-[#94a3b8]">صرف وسداد نقدية مع ربط الحساب المدين ومركز التكلفة آلياً</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg bg-[#2d3748] hover:bg-[#374151] text-gray-300 flex items-center justify-center cursor-pointer text-xs">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 custom-scrollbar space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-[#181d2a]/70 p-3 rounded-2xl border border-[#2d3748]">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-300 mb-1">المستفيد / جهة الصرف *</label>
                <input
                  list="payment-parties" type="text" value={party}
                  onChange={e => {
                    const val = e.target.value; setParty(val);
                    const pAcc = findPartnerAccount?.(val);
                    if (pAcc) setTargetAcc(String(pAcc.code || pAcc.acc_code));
                  }}
                  className="w-full h-9 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs outline-none focus:border-[#00E5FF]"
                />
                <datalist id="payment-parties">
                  {supplierNames.map(s => <option key={s} value={s}>🧵 مورد: {s}</option>)}
                  {(employees || []).map(emp => <option key={emp.id || emp.name} value={emp.name}>✂️ موظف: {emp.name}</option>)}
                  {(partnerAccounts || []).map(p => <option key={p.code} value={getCleanPartnerName?.(p) || p.name}>💼 شريك: {p.name}</option>)}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">المبلغ المطلوب صرفه *</label>
                <input type="number" step="any" value={amount} onChange={e => setAmount(e.target.value)} dir="ltr" className="w-full h-9 px-3 rounded-xl border border-[#374151] bg-[#111827] text-[#00E5FF] font-mono font-bold text-xs outline-none text-left" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">العملة</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full h-9 px-2 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-bold outline-none">
                  {["YER ﷼", "SAR ﷼", "USD $"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">سعر الصرف (مقابل YER)</label>
                <input type="number" step="any" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} dir="ltr" className="w-full h-9 px-3 rounded-xl border border-[#374151] bg-[#111827] text-amber-400 font-mono font-bold text-xs outline-none text-left" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">طريقة الدفع</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="w-full h-9 px-2 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs outline-none">
                  {["نقد (كاش)", "حوالة بنكية", "شبكة / بطاقة", "آجل (على الحساب)"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">حساب الصندوق/البنك المسحوب منه (الدائن)</label>
                <select value={cashAcc} onChange={e => setCashAcc(e.target.value)} className="w-full h-9 px-2 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs outline-none">
                  {cashAccounts.map(a => <option key={a.code || a.acc_code} value={a.code || a.acc_code}>{a.code || a.acc_code} - {a.name || a.account_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">الحساب المدين / مركز التكلفة</label>
                <select value={targetAcc} onChange={e => setTargetAcc(e.target.value)} className="w-full h-9 px-2 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs outline-none">
                  {targetAccounts.map(a => <option key={a.code || a.acc_code} value={a.code || a.acc_code}>{a.code || a.acc_code} - {a.name || a.account_name}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-300 mb-1">البيان والشرح المحاسبي</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs outline-none" />
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-[#2d3748] bg-[#181d2a] flex justify-between items-center shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-[#374151] text-gray-300 text-xs font-bold hover:bg-[#2d3748] cursor-pointer">إلغاء</button>
            <button type="submit" disabled={isSubmitting || numAmount <= 0 || !party.trim()} className="px-5 py-2 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 transition shadow-lg cursor-pointer disabled:opacity-40">
              {isSubmitting ? 'جاري الحفظ...' : 'اعتماد سند الصرف 💾'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
  return (typeof document !== 'undefined' && createPortal) ? createPortal(content, document.body) : content;
}

window.PaymentVoucherModal = PaymentVoucherModal;
