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
  const [targetAcc, setTargetAcc] = useState(editData?.target_acc || '201');
  const [cashAcc, setCashAcc] = useState(editData?.acc_code || '101.1');
  const [amount, setAmount] = useState(editData?.amount ? String(editData.amount) : '');
  const [payMethod, setPayMethod] = useState(editData?.pay_method || 'نقدي');
  const [notes, setNotes] = useState(editData?.notes || '');

  const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(currency) : 'YER';
  useEffect(() => {
    if (window.CurrencyService && !isEdit) {
      setExchangeRate(String(window.CurrencyService.getRate(currCode)));
    }
  }, [currency, currCode, isEdit]);

  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!party.trim()) return showToast?.('يرجى اختيار أو كتابة اسم المستفيد ⚠️', 'error');
    if (numAmount <= 0) return showToast?.('يرجى إدخال مبلغ السند ⚠️', 'error');

    const vRate = parseFloat(exchangeRate) || 1.0;
    const vBaseAmt = numAmount * vRate;
    const voucherNo = editData?.v_no || `PV-${Date.now().toString().slice(-6)}`;

    const debitObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(targetAcc));
    const creditObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(cashAcc));
    const debitLabel = debitObj ? `${debitObj.code || debitObj.acc_code} - ${debitObj.name || debitObj.account_name}` : targetAcc;
    const creditLabel = creditObj ? `${creditObj.code || creditObj.acc_code} - ${creditObj.name || creditObj.account_name}` : cashAcc;

    const newV = {
      id: editData?.id || Date.now(),
      v_no: voucherNo, voucher_no: voucherNo, payment_no: voucherNo,
      v_type: 'سند صرف', voucher_type: 'سند صرف', payment_type: 'سند صرف',
      party, party_name: party, amount: numAmount, currency: currCode,
      exchange_rate: vRate, base_amount: vBaseAmt,
      date: editData?.date || (typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10)),
      notes: notes ? `${notes} | الحساب المقابل: ${targetAcc}` : `سند صرف: ${party} | الحساب المقابل: ${targetAcc}`,
      pay_method: payMethod, payment_method: payMethod,
      acc_code: cashAcc, target_acc: targetAcc,
      debit_account: debitLabel, credit_account: creditLabel
    };

    let newExp = null;
    if (debitLabel.startsWith('5') || debitLabel.startsWith('6') || debitLabel.includes('مصروف')) {
      newExp = {
        id: Date.now() + 2, expense_no: voucherNo, category: debitLabel, exp_category: debitLabel,
        amount: numAmount, currency: currCode, exchange_rate: vRate, base_amount: vBaseAmt,
        date: newV.date, payment_method: payMethod, pay_method: payMethod,
        account_id: creditLabel, payment_source: creditLabel, recipient: party,
        notes: newV.notes || `سند صرف: ${party}`, status: 'posted'
      };
    }

    const entry = {
      id: Date.now() + Math.random(),
      transaction_id: `TX-VCH-${voucherNo}`,
      entry_no: 'AUTO-VCH-' + voucherNo,
      debit: debitLabel, credit: creditLabel,
      debit_code: targetAcc, credit_code: cashAcc,
      amount: numAmount, currency: currCode, exchange_rate: vRate, base_amount: vBaseAmt,
      ref_type: 'PAYMENT_VOUCHER', ref_id: voucherNo, date: newV.date,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto" dir="rtl">
      <div className="bg-[#1e2433] text-white rounded-3xl border border-[#2d3748] shadow-2xl w-full max-w-2xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-[#2d3748] flex items-center justify-between bg-[#181d2a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center text-lg font-bold">📤</div>
            <div>
              <h3 className="text-sm font-bold text-white">{isEdit ? 'تعديل سند صرف' : 'إصدار سند صرف نقدية'}</h3>
              <p className="text-[11px] text-[#94a3b8]">صرف وسداد نقدية مع ربط الحساب المدين ومركز التكلفة آلياً</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl bg-[#2d3748] hover:bg-[#374151] text-gray-300 flex items-center justify-center cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#181d2a]/70 p-3.5 rounded-2xl border border-[#2d3748]">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-gray-300 mb-1">المستفيد / جهة الصرف *</label>
              <input
                list="payment-parties"
                type="text"
                value={party}
                onChange={e => {
                  const val = e.target.value;
                  setParty(val);
                  const pAcc = findPartnerAccount?.(val);
                  if (pAcc) setTargetAcc(String(pAcc.code || pAcc.acc_code));
                }}
                className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs outline-none focus:border-[#00E5FF]"
                placeholder="اختر مورداً، خياطاً، أو اكتب اسماً..."
              />
              <datalist id="payment-parties">
                {supplierNames.map(s => <option key={s} value={s}>🧵 مورد: {s}</option>)}
                {(employees || []).map(emp => <option key={emp.id || emp.name} value={emp.name}>✂️ موظف: {emp.name}</option>)}
                {(partnerAccounts || []).map(p => <option key={p.code} value={getCleanPartnerName?.(p) || p.name}>💼 شريك: {p.name}</option>)}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1">المبلغ المطلوب صرفه *</label>
              <input type="number" step="any" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-[#00E5FF] font-mono font-bold text-xs outline-none text-left" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1">العملة</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-bold outline-none">
                {["YER ﷼", "SAR ﷼", "USD $"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1">سعر الصرف (مقابل YER)</label>
              <input type="number" step="any" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-amber-400 font-mono font-bold text-xs outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1">طريقة الدفع</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs outline-none">
                {["نقدي", "حوالة بنكية", "تحويل إلكتروني"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1">حساب الصندوق/البنك المسحوب منه (الدائن)</label>
              <select value={cashAcc} onChange={e => setCashAcc(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs outline-none">
                <option value="101.1">101.1 - صندوق الريال اليمني YER</option>
                <option value="101.2">101.2 - صندوق الريال السعودي SAR</option>
                <option value="101.3">101.3 - صندوق الدولار USD</option>
                <option value="102">102 - حساب بنك الكريمي</option>
                <option value="103">103 - عهد الورشة والمشغل</option>
                {(accounts || []).filter(a => (String(a.code).startsWith('101.') || String(a.code).startsWith('102.')) && !['101.1','101.2','101.3','102','103'].includes(String(a.code))).map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1">الحساب المدين / مركز التكلفة</label>
              <select value={targetAcc} onChange={e => setTargetAcc(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs outline-none">
                <option value="201">201 - ذمم الموردين ومحلات الأقمشة</option>
                <option value="502">502 - مشتريات خامات وأقمشة</option>
                <option value="5121">5121 - أجور الخياطة والتصنيع المباشرة</option>
                <option value="1141">1141 - سلف شهرية ومستحقات العاملين</option>
                <option value="1121">1121 - عهد الورشة والمشغل</option>
                {(accounts || []).filter(a => !a.is_group && !['201','502','5121','1141','1121'].includes(String(a.code))).map(a => <option key={a.code} value={a.code}>{a.code} - {a.name || a.account_name}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-gray-300 mb-1">البيان والشرح المحاسبي</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="شرح لعملية الصرف..." className="w-full h-9 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs outline-none" />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-[#2d3748]">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-[#374151] text-gray-300 text-xs font-bold hover:bg-[#2d3748] cursor-pointer">إلغاء</button>
            <button type="submit" disabled={isSubmitting || numAmount <= 0 || !party.trim()} className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 transition shadow-lg cursor-pointer disabled:opacity-40">
              {isSubmitting ? 'جاري الحفظ...' : 'اعتماد سند الصرف 💾'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.PaymentVoucherModal = PaymentVoucherModal;
