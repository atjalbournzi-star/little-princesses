const { useState, useEffect, useMemo, useRef } = React;

function ReceiptVoucherModal({
  isOpen, onClose, isEdit = false, editData = null,
  accounts = [], customers = [], partnerAccounts = [],
  getCleanPartnerName, findPartnerAccount, onSaveVoucher,
  isSubmitting = false, showToast
}) {
  if (!isOpen) return null;

  const [party, setParty] = useState(editData?.party || '');
  const [phone, setPhone] = useState(editData?.phone || '');
  const [currency, setCurrency] = useState(editData?.currency || 'YER ﷼');
  const [exchangeRate, setExchangeRate] = useState(String(editData?.exchange_rate || '1.0'));
  const [voucherNo, setVoucherNo] = useState(editData?.v_no || editData?.payment_no || '');
  const [notes, setNotes] = useState(editData?.notes || '');
  const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(currency) : 'YER';

  // صناديق وبنوك مقروءة ديناميكياً من شجرة الحسابات
  const cashAccounts = useMemo(() => (accounts || []).filter(a => !a.is_group && (
    a.account_category === 'cash' || a.category === 'cash' || a.type === 'أصول متداولة' ||
    (a.name || a.account_name || '').includes('صندوق') || (a.name || a.account_name || '').includes('بنك') || (a.name || a.account_name || '').includes('نقد')
  )), [accounts]);

  const targetAccounts = useMemo(() => {
    const list = (accounts || []).filter(a => !a.is_group && !cashAccounts.some(c => String(c.code || c.acc_code) === String(a.code || a.acc_code)));
    return list.length ? list : (accounts || []).filter(a => !a.is_group);
  }, [accounts, cashAccounts]);

  const defaultCash = useMemo(() => cashAccounts.find(a => (a.currency || '').toUpperCase() === currCode || (a.name || '').includes(currCode)) || cashAccounts[0], [cashAccounts, currCode]);
  const defaultTargetCode = useMemo(() => {
    const m = targetAccounts.find(a => (a.name || '').includes('عميل') || (a.name || '').includes('عملاء') || (a.name || '').includes('عربون') || (a.name || '').includes('إيراد')) || targetAccounts[0];
    return m ? String(m.code || m.acc_code) : '';
  }, [targetAccounts]);

  const [targetAcc, setTargetAcc] = useState(editData?.target_acc || defaultTargetCode);
  const defCashCode = defaultCash ? String(defaultCash.code || defaultCash.acc_code) : '';
  const defCashName = defaultCash ? (defaultCash.name || defaultCash.account_name) : 'صندوق النقدية';

  const [payments, setPayments] = useState(editData?.splitPayments || [{ id: 1, method: defCashName, acc_code: defCashCode, amount: editData?.amount || '' }]);
  const [submittingLocal, setSubmittingLocal] = useState(false);
  const nextPayId = useRef(2);

  useEffect(() => {
    if (isOpen && !isEdit && !voucherNo) {
      const getSeq = window.previewNextSequenceNumber || window.getNextSequenceNumber;
      if (getSeq) getSeq('RV').then(seq => { if (seq) setVoucherNo(seq); });
    }
  }, [isOpen, isEdit, voucherNo]);

  useEffect(() => { if (!targetAcc && defaultTargetCode) setTargetAcc(defaultTargetCode); }, [defaultTargetCode, targetAcc]);

  useEffect(() => {
    if (window.CurrencyService && !isEdit) setExchangeRate(String(window.CurrencyService.getRate(currCode)));
    if (!isEdit && defaultCash && payments.length === 1 && !payments[0].amount) {
      setPayments([{ id: 1, method: defCashName, acc_code: defCashCode, amount: '' }]);
    }
  }, [currency, currCode, isEdit, defaultCash, defCashCode, defCashName]);

  const totalAmount = useMemo(() => payments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0), [payments]);
  const handleAddPayment = () => setPayments(prev => [...prev, { id: nextPayId.current++, method: defCashName, acc_code: defCashCode, amount: '' }]);
  const handleRemovePayment = (idx) => (payments.length <= 1 ? showToast?.('يجب أن يحتوي السند على طريقة دفع واحدة على الأقل ⚠️', 'warning') : setPayments(prev => prev.filter((_, i) => i !== idx)));
  const handlePaymentChange = (idx, field, val) => setPayments(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (isSubmitting || submittingLocal) return;
    if (!party.trim()) return showToast?.('يرجى اختيار أو كتابة اسم الطرف المسدد ⚠️', 'error');
    if (totalAmount <= 0) return showToast?.('يرجى إدخال مبلغ السند ⚠️', 'error');
    setSubmittingLocal(true);
    try {
      const vNo = voucherNo || '';
      const vRate = parseFloat(exchangeRate) || 1.0, vBaseAmt = totalAmount * vRate;
      const paySummary = payments.map(p => `${p.method}: ${(parseFloat(p.amount) || 0).toLocaleString('en-US')} ${currCode}`).join(' + ');
      const cleanMethod = payments.length > 1 ? 'نقد (كاش)' : (payments[0]?.method?.includes('بنك') || payments[0]?.method?.includes('حوالة') ? 'حوالة بنكية' : 'نقد (كاش)');
      const matchedCust = (customers || []).find(c => (c.name && c.name.trim() === party.trim()) || (c.id && c.id === party));
      const resolvedCustId = matchedCust?.id || editData?.customer_id || null;
      const resolvedOrderId = editData?.order_id || matchedCust?.latest_order_no || matchedCust?.order_id || null;
      const newV = {
        id: editData?.id || undefined, v_no: vNo, voucher_no: vNo, payment_no: vNo,
        v_type: 'سند قبض', voucher_type: 'سند قبض', payment_type: 'سند قبض',
        customer_id: resolvedCustId, order_id: resolvedOrderId,
        party, party_name: party, phone, amount: totalAmount, currency: currCode,
        exchange_rate: vRate, base_amount: vBaseAmt,
        date: editData?.date || (typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10)),
        notes: notes ? `${notes} | ${paySummary} | الحساب المقابل: ${targetAcc}` : `سند قبض - ${party} (${paySummary}) | الحساب المقابل: ${targetAcc}`,
        pay_method: cleanMethod, payment_method: cleanMethod,
        acc_code: payments[0]?.acc_code || defCashCode, target_acc: targetAcc
      };
      const entries = payments.filter(p => (parseFloat(p.amount) || 0) > 0).map((p, idx) => {
        const lineAmt = parseFloat(p.amount) || 0;
        const dObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(p.acc_code));
        const cObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(targetAcc));
        return {
          id: `${vNo}-JVL-${idx + 1}`, transaction_id: `TX-VCH-${vNo}`, entry_no: 'AUTO-VCH-' + vNo,
          debit: dObj ? `${dObj.code || dObj.acc_code} - ${dObj.name || dObj.account_name}` : p.acc_code,
          credit: cObj ? `${cObj.code || cObj.acc_code} - ${cObj.name || cObj.account_name}` : targetAcc,
          debit_code: p.acc_code, credit_code: targetAcc, amount: lineAmt, currency: currCode, exchange_rate: vRate,
          base_amount: lineAmt * vRate, ref_type: 'RECEIPT_VOUCHER', ref_id: vNo, date: newV.date,
          notes: `سند قبض [${p.method}]: ${party} - ${notes || ''}`, status: 'posted'
        };
      });
      const success = await onSaveVoucher({
        newV, generatedEntries: entries, splitPayments: payments, vRate,
        modalTargetAcc: targetAcc, isReceipt: true, vBaseAmt,
        customerOrderData: { custName: party, amt: totalAmount }
      });
      if (success) onClose();
    } finally { setSubmittingLocal(false); }
  };

  const createPortal = (typeof ReactDOM !== 'undefined' && ReactDOM.createPortal) ? ReactDOM.createPortal : null;
  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-[4px] animate-fadeIn" dir="rtl" onClick={onClose}>
      <div className="bg-[#1e2433] text-white rounded-3xl border border-[#2d3748] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-[#2d3748] flex items-center justify-between bg-[#181d2a] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-base font-bold">📥</div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">{isEdit ? 'تعديل سند قبض' : 'إصدار سند قبض تحصيل'}</h3>
              <p className="text-[10.5px] text-[#94a3b8]">تحصيل نقدية وتوثيق الدفعات مع الترحيل التلقائي لدفتر الأستاذ</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg bg-[#2d3748] hover:bg-[#374151] text-gray-300 flex items-center justify-center cursor-pointer text-xs">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 custom-scrollbar space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#181d2a]/70 p-3 rounded-2xl border border-[#2d3748]">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-300 mb-1">اسم العميل / الطرف المسدد *</label>
                <input list="receipt-parties" type="text" value={party}
                  onChange={e => {
                    const val = e.target.value; setParty(val);
                    const f = (customers || []).find(c => c.name === val);
                    if (f?.phone) setPhone(f.phone);
                    const pAcc = findPartnerAccount?.(val);
                    if (pAcc) { setTargetAcc(String(pAcc.code || pAcc.acc_code)); const cName = getCleanPartnerName?.(pAcc) || val; if (!notes || notes.includes('رأس المال')) setNotes(`إيداع حصة في رأس المال - ${cName}`); }
                  }}
                  className="w-full h-9 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs outline-none focus:border-[#00E5FF]" />
                <datalist id="receipt-parties">
                  {(partnerAccounts || []).map(p => <option key={p.code || p.id} value={getCleanPartnerName?.(p) || p.name}>💼 {p.name}</option>)}
                  {(customers || []).map(c => <option key={c.id || c.name} value={c.name}>👗 {c.name}</option>)}
                </datalist>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">هاتف الواتساب 📱</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" className="w-full h-9 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-mono outline-none text-left" />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">عملة السند</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full h-9 px-2 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-bold outline-none">
                  {["YER ﷼", "SAR ﷼", "USD $"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">سعر الصرف (مقابل YER)</label>
                <input type="number" step="any" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} dir="ltr" className="w-full h-9 px-3 rounded-xl border border-[#374151] bg-[#111827] text-amber-400 font-mono font-bold text-xs outline-none text-left" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">الحساب المقابل (الدائن)</label>
                <select value={targetAcc} onChange={e => setTargetAcc(e.target.value)} className="w-full h-9 px-2 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs outline-none">
                  {targetAccounts.map(a => <option key={a.code || a.acc_code} value={a.code || a.acc_code}>{a.code || a.acc_code} - {a.name || a.account_name}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-[#181d2a]/70 p-3 rounded-2xl border border-[#2d3748] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400">💳 توزيع دفعات الصناديق والبنوك</span>
                <button type="button" onClick={handleAddPayment} className="px-2.5 py-1 bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30 rounded-lg text-xs font-bold transition cursor-pointer">+ إضافة صندوق/بنك</button>
              </div>
              {payments.map((p, idx) => (
                <div key={p.id} className="grid grid-cols-12 gap-2 items-center bg-[#111827] p-2 rounded-xl border border-[#2d3748]">
                  <div className="col-span-7">
                    <select value={`${p.method}__${p.acc_code}`} onChange={e => {
                      const [m, c] = e.target.value.split('__');
                      handlePaymentChange(idx, 'method', m); handlePaymentChange(idx, 'acc_code', c);
                    }} className="w-full h-8 px-2 rounded-lg border border-[#374151] bg-[#181d2a] text-white text-xs outline-none">
                      {cashAccounts.map(a => <option key={a.code || a.acc_code} value={`${a.name || a.account_name}__${a.code || a.acc_code}`}>{a.code || a.acc_code} - {a.name || a.account_name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <input type="number" step="any" value={p.amount} onChange={e => handlePaymentChange(idx, 'amount', e.target.value)} dir="ltr" className="w-full h-8 px-2 rounded-lg border border-[#374151] bg-[#181d2a] text-[#00E5FF] font-mono font-bold text-xs outline-none text-left" />
                  </div>
                  <div className="col-span-1 text-center">
                    <button type="button" onClick={() => handleRemovePayment(idx)} className="text-rose-400 hover:text-rose-300 text-xs p-1 cursor-pointer">🗑️</button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center px-3 py-1.5 bg-[#111827] rounded-xl border border-[#2d3748] text-xs">
                <span className="text-gray-300 font-bold">إجمالي المبلغ:</span>
                <span className="font-mono font-bold text-amber-400" dir="ltr">{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currCode}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1">البيان والشرح المحاسبي</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs outline-none" />
            </div>
          </div>

          <div className="px-5 py-3 border-t border-[#2d3748] bg-[#181d2a] flex justify-between items-center shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-[#374151] text-gray-300 text-xs font-bold hover:bg-[#2d3748] cursor-pointer">إلغاء</button>
            <button type="submit" disabled={isSubmitting || submittingLocal || totalAmount <= 0 || !party.trim()} className="px-5 py-2 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition shadow-lg cursor-pointer disabled:opacity-40">
              {isSubmitting || submittingLocal ? 'جاري الحفظ...' : 'اعتماد سند القبض 💾'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
  return (typeof document !== 'undefined' && createPortal) ? createPortal(content, document.body) : content;
}

window.ReceiptVoucherModal = ReceiptVoucherModal;
