const { useState, useEffect, useMemo } = React;

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
  const [targetAcc, setTargetAcc] = useState(editData?.target_acc || '104');
  const [notes, setNotes] = useState(editData?.notes || '');
  const [payments, setPayments] = useState(
    editData?.splitPayments || [{ id: 1, method: 'صندوق الريال اليمني (YER)', acc_code: '101.1', amount: editData?.amount || '' }]
  );

  const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(currency) : 'YER';
  useEffect(() => {
    if (window.CurrencyService && !isEdit) {
      setExchangeRate(String(window.CurrencyService.getRate(currCode)));
    }
  }, [currency, currCode, isEdit]);

  const totalAmount = useMemo(() => payments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0), [payments]);

  const handleAddPayment = () => {
    setPayments(prev => [...prev, { id: Date.now() + Math.random(), method: 'تحويل بنكي (الكريمي)', acc_code: '102', amount: '' }]);
  };
  const handleRemovePayment = (idx) => {
    if (payments.length <= 1) return showToast?.('يجب أن يحتوي السند على طريقة دفع واحدة على الأقل ⚠️', 'warning');
    setPayments(prev => prev.filter((_, i) => i !== idx));
  };
  const handlePaymentChange = (idx, field, val) => {
    setPayments(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!party.trim()) return showToast?.('يرجى اختيار أو كتابة اسم الطرف المسدد ⚠️', 'error');
    if (totalAmount <= 0) return showToast?.('يرجى إدخال مبلغ السند ⚠️', 'error');

    const vRate = parseFloat(exchangeRate) || 1.0;
    const vBaseAmt = totalAmount * vRate;
    const voucherNo = editData?.v_no || `RV-${Date.now().toString().slice(-6)}`;
    const paySummary = payments.map(p => `${p.method}: ${(parseFloat(p.amount) || 0).toLocaleString('en-US')} ${currCode}`).join(' + ');

    const newV = {
      id: editData?.id || Date.now(),
      v_no: voucherNo, voucher_no: voucherNo, payment_no: voucherNo,
      v_type: 'سند قبض', voucher_type: 'سند قبض', payment_type: 'سند قبض',
      party, party_name: party, phone, amount: totalAmount, currency: currCode,
      exchange_rate: vRate, base_amount: vBaseAmt,
      date: editData?.date || (typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10)),
      notes: notes ? `${notes} | الحساب المقابل: ${targetAcc}` : `سند قبض - ${party} (${paySummary}) | الحساب المقابل: ${targetAcc}`,
      pay_method: paySummary, payment_method: paySummary,
      acc_code: payments[0]?.acc_code || '101', target_acc: targetAcc
    };

    const entries = payments.filter(p => (parseFloat(p.amount) || 0) > 0).map(p => {
      const lineAmt = parseFloat(p.amount) || 0;
      const dObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(p.acc_code || '101'));
      const cObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(targetAcc));
      return {
        id: Date.now() + Math.random(),
        transaction_id: `TX-VCH-${voucherNo}`,
        entry_no: 'AUTO-VCH-' + voucherNo,
        debit: dObj ? `${dObj.code || dObj.acc_code} - ${dObj.name || dObj.account_name}` : (p.acc_code || '101'),
        credit: cObj ? `${cObj.code || cObj.acc_code} - ${cObj.name || cObj.account_name}` : targetAcc,
        debit_code: p.acc_code || '101', credit_code: targetAcc,
        amount: lineAmt, currency: currCode, exchange_rate: vRate, base_amount: lineAmt * vRate,
        ref_type: 'RECEIPT_VOUCHER', ref_id: voucherNo, date: newV.date,
        notes: `سند قبض [${p.method}]: ${party} - ${notes || ''}`, status: 'posted'
      };
    });

    const success = await onSaveVoucher({
      newV, generatedEntries: entries, splitPayments: payments, vRate,
      modalTargetAcc: targetAcc, isReceipt: true, vBaseAmt,
      customerOrderData: { custName: party, amt: totalAmount }
    });
    if (success) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto" dir="rtl">
      <div className="bg-[#1e2433] text-white rounded-3xl border border-[#2d3748] shadow-2xl w-full max-w-3xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-[#2d3748] flex items-center justify-between bg-[#181d2a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-lg font-bold">📥</div>
            <div>
              <h3 className="text-sm font-bold text-white">{isEdit ? 'تعديل سند قبض' : 'إصدار سند قبض تحصيل'}</h3>
              <p className="text-[11px] text-[#94a3b8]">تحصيل نقدية وتوثيق الدفعات مع الترحيل التلقائي لدفتر الأستاذ</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl bg-[#2d3748] hover:bg-[#374151] text-gray-300 flex items-center justify-center cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#181d2a]/70 p-3.5 rounded-2xl border border-[#2d3748]">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-gray-300 mb-1">اسم العميلة / الطرف المسدد *</label>
              <input
                list="receipt-parties"
                type="text"
                value={party}
                onChange={e => {
                  const val = e.target.value;
                  setParty(val);
                  const f = (customers || []).find(c => c.name === val);
                  if (f?.phone) setPhone(f.phone);
                  const pAcc = findPartnerAccount?.(val);
                  if (pAcc) {
                    setTargetAcc(String(pAcc.code || pAcc.acc_code));
                    const cName = getCleanPartnerName?.(pAcc) || val;
                    if (!notes || notes.includes('رأس المال')) setNotes(`إيداع حصة في رأس المال - ${cName}`);
                  }
                }}
                className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs outline-none focus:border-[#00E5FF]"
                placeholder="اختر عميلة أو شريك أو اكتب اسماً..."
              />
              <datalist id="receipt-parties">
                {(partnerAccounts || []).map(p => <option key={p.code || p.id} value={getCleanPartnerName?.(p) || p.name}>💼 {p.name}</option>)}
                {(customers || []).map(c => <option key={c.id || c.name} value={c.name}>👗 {c.name}</option>)}
              </datalist>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1">هاتف الواتساب 📱</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="770000000" className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-mono outline-none" />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1">عملة السند</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-bold outline-none">
                {["YER ﷼", "SAR ﷼", "USD $"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1">سعر الصرف (مقابل YER)</label>
              <input type="number" step="any" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-amber-400 font-mono font-bold text-xs outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1">الحساب المقابل (الدائن)</label>
              <select value={targetAcc} onChange={e => setTargetAcc(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs outline-none">
                <option value="104">104 - ذمم العملاء والمدينون</option>
                <option value="4111">4111 - إيرادات تفصيل وتصميم فساتين</option>
                <option value="2121">2121 - عربون دفعات وحجوزات مقدماً</option>
                {(partnerAccounts || []).map(p => <option key={p.code} value={p.code}>{p.code} - رأس مال {getCleanPartnerName?.(p)}</option>)}
                {(accounts || []).filter(a => !a.is_group && !['104', '4111', '2121'].includes(String(a.code))).map(a => <option key={a.code || a.id} value={a.code || a.acc_code}>{a.code || a.acc_code} - {a.name || a.account_name}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-[#181d2a]/70 p-3.5 rounded-2xl border border-[#2d3748] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">💳 توزيع دفعات الصناديق والبنوك</span>
              <button type="button" onClick={handleAddPayment} className="px-2.5 py-1 bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30 rounded-lg text-xs font-bold transition cursor-pointer">+ إضافة صندوق/بنك</button>
            </div>
            {payments.map((p, idx) => (
              <div key={p.id} className="grid grid-cols-12 gap-2 items-center bg-[#111827] p-2 rounded-xl border border-[#2d3748]">
                <div className="col-span-7">
                  <select value={`${p.method}__${p.acc_code}`} onChange={e => {
                    const [m, c] = e.target.value.split('__');
                    handlePaymentChange(idx, 'method', m);
                    handlePaymentChange(idx, 'acc_code', c);
                  }} className="w-full h-8 px-2 rounded-lg border border-[#374151] bg-[#181d2a] text-white text-xs outline-none">
                    <option value="صندوق الريال اليمني (YER)__101.1">💵 صندوق الريال اليمني YER (101.1)</option>
                    <option value="صندوق الريال السعودي (SAR)__101.2">💵 صندوق الريال السعودي SAR (101.2)</option>
                    <option value="صندوق الدولار (USD)__101.3">💵 صندوق الدولار USD (101.3)</option>
                    <option value="تحويل بنكي (الكريمي)__102">🏦 تحويل بنكي - الكريمي (102)</option>
                  </select>
                </div>
                <div className="col-span-4">
                  <input type="number" step="any" placeholder="0.00" value={p.amount} onChange={e => handlePaymentChange(idx, 'amount', e.target.value)} className="w-full h-8 px-2 rounded-lg border border-[#374151] bg-[#181d2a] text-[#00E5FF] font-mono font-bold text-xs outline-none text-left" />
                </div>
                <div className="col-span-1 text-center">
                  <button type="button" onClick={() => handleRemovePayment(idx)} className="text-rose-400 hover:text-rose-300 text-xs p-1 cursor-pointer">🗑️</button>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center px-3 py-2 bg-[#111827] rounded-xl border border-[#2d3748] text-xs">
              <span className="text-gray-300 font-bold">إجمالي المبلغ:</span>
              <span className="font-mono font-bold text-amber-400">{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currCode}</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-300 mb-1">البيان والشرح المحاسبي</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="شرح لعملية القبض..." className="w-full h-9 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs outline-none" />
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-[#2d3748]">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-[#374151] text-gray-300 text-xs font-bold hover:bg-[#2d3748] cursor-pointer">إلغاء</button>
            <button type="submit" disabled={isSubmitting || totalAmount <= 0 || !party.trim()} className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition shadow-lg cursor-pointer disabled:opacity-40">
              {isSubmitting ? 'جاري الحفظ...' : 'اعتماد سند القبض 💾'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.ReceiptVoucherModal = ReceiptVoucherModal;
