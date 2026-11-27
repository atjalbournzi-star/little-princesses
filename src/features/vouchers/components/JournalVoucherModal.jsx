const { useState, useEffect, useMemo } = React;

function JournalVoucherModal({
  isOpen, onClose, accounts = [], customers = [], purchases = [],
  employees = [], setJournal, setAccounts, showToast
}) {
  const [form, setForm] = useState({
    entry_no: '',
    date: typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10),
    currency: 'YER ﷼', exchange_rate: '1.0', ref_type: 'قيد مركب', general_notes: ''
  });

  const debitAccDefault = useMemo(() => {
    const list = (accounts || []).filter(a => !a.is_group);
    const found = list.find(a => a.type === 'أصول' || a.nature === 'debit' || (a.name || '').includes('صندوق') || (a.name || '').includes('نقد'));
    return found ? String(found.code || found.acc_code) : (list[0] ? String(list[0].code || list[0].acc_code) : '');
  }, [accounts]);
  const creditAccDefault = useMemo(() => {
    const list = (accounts || []).filter(a => !a.is_group);
    const found = list.find(a => String(a.code || a.acc_code) !== debitAccDefault && (a.type === 'خصوم' || a.type === 'إيرادات' || a.nature === 'credit'));
    return found ? String(found.code || found.acc_code) : (list.find(a => String(a.code || a.acc_code) !== debitAccDefault)?.code || '');
  }, [accounts, debitAccDefault]);

  const [lines, setLines] = useState([
    { id: 1, account_code: '', link_subparty: false, party_type: 'customer', party_id: '', debit: '', credit: '', notes: '' },
    { id: 2, account_code: '', link_subparty: false, party_type: 'supplier', party_id: '', debit: '', credit: '', notes: '' }
  ]);
  const lineCounter = React.useRef(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const getSeq = window.previewNextSequenceNumber || window.getNextSequenceNumber;
      if (!form.entry_no && getSeq) {
        getSeq('JV').then(seq => { if (seq) setForm(prev => ({ ...prev, entry_no: seq })); });
      }
      if (accounts && accounts.length > 0) {
        setLines(prev => prev.map((l, idx) => (!l.account_code ? { ...l, account_code: idx === 0 ? debitAccDefault : creditAccDefault } : l)));
      }
    }
  }, [isOpen, accounts, debitAccDefault, creditAccDefault]);

  const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(form.currency) : 'YER';
  useEffect(() => {
    if (window.CurrencyService) setForm(prev => ({ ...prev, exchange_rate: String(window.CurrencyService.getRate(currCode)) }));
  }, [form.currency, currCode]);

  const totals = useMemo(() => {
    let totalDebit = 0, totalCredit = 0;
    lines.forEach(l => { totalDebit += parseFloat(l.debit) || 0; totalCredit += parseFloat(l.credit) || 0; });
    const diff = Math.abs(totalDebit - totalCredit);
    return { totalDebit, totalCredit, diff, isBalanced: diff < 0.01 && totalDebit > 0 };
  }, [lines]);

  const handleAddLine = () => setLines(prev => [...prev, { id: lineCounter.current++, account_code: '', link_subparty: false, party_type: 'customer', party_id: '', debit: '', credit: '', notes: '' }]);
  const handleDuplicateLine = (idx) => { const next = [...lines]; next.splice(idx + 1, 0, { ...lines[idx], id: lineCounter.current++ }); setLines(next); };
  const handleDeleteLine = (idx) => (lines.length <= 2 ? showToast?.('يجب أن يحتوي القيد المركب على سطرين على الأقل ⚠️', 'warning') : setLines(prev => prev.filter((_, i) => i !== idx)));
  const handleLineChange = (idx, field, val) => {
    setLines(prev => prev.map((l, i) => i === idx ? (field === 'debit' && val ? { ...l, debit: val, credit: '' } : (field === 'credit' && val ? { ...l, credit: val, debit: '' } : { ...l, [field]: val })) : l));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const diffCheck = Math.abs(totals.totalDebit - totals.totalCredit);
    if (totals.totalDebit <= 0 || diffCheck >= 0.0001) {
      return showToast?.('القيد غير متوازن! يجب أن يتساوى مجموع المدين مع مجموع الدائن ويكون أكبر من الصفر ⚠️', 'error');
    }
    const activeLines = lines.filter(l => (parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0);
    if (activeLines.length < 2) return showToast?.('يجب أن يحتوي القيد المركب على سطرين ماليين على الأقل ⚠️', 'error');
    if (activeLines.some(l => !l.account_code || (parseFloat(l.debit) || 0) < 0 || (parseFloat(l.credit) || 0) < 0)) {
      return showToast?.('يرجى تحديد حساب صالح ومبلغ موجب لكل سطر مالي ⚠️', 'error');
    }

    setIsSubmitting(true);
    try {
      const rate = parseFloat(form.exchange_rate) || 1.0;
      const payloadLines = activeLines.map(l => {
        const dAmt = parseFloat(l.debit) || 0, cAmt = parseFloat(l.credit) || 0;
        const subPartyNote = (l.link_subparty && l.party_id) ? ` [الجهة: ${l.party_id}]` : '';
        return {
          account_id: l.account_code, account_code: l.account_code,
          debit: dAmt, credit: cAmt, debit_base: dAmt * rate, credit_base: cAmt * rate,
          line_description: `${form.general_notes ? form.general_notes + ' | ' : ''}${l.notes || (dAmt > 0 ? 'طرف مدين' : 'طرف دائن')}${subPartyNote}`
        };
      });
      const payload = {
        date: form.date, currency: currCode, exchange_rate: rate,
        ref_type: form.ref_type || 'قيد مركب',
        description: form.general_notes || 'قيد يومية مركب متوازن',
        notes: form.general_notes || '',
        amount: totals.totalDebit, base_amount: totals.totalDebit * rate,
        lines: payloadLines
      };

      const res = await fetch('/api/journal/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok || resData.success === false) {
        showToast?.(resData.error || resData.message || res.extractedError || 'تعذر ترحيل القيد المركب', 'error');
        return;
      }

      const savedEntry = resData.data || {};
      const officialNo = savedEntry.entry_no || savedEntry.id || form.entry_no;
      if (setJournal && savedEntry.id) {
        setJournal(prev => [{ ...savedEntry, date: savedEntry.entry_date || form.date, lines: payloadLines }, ...(prev || []).filter(j => j.id !== savedEntry.id)]);
      }
      if (typeof setAccounts === 'function') {
        fetch('/api/accounts/list').then(r => r.json()).then(d => { if (d?.success && Array.isArray(d.data)) setAccounts(d.data); }).catch(() => {});
      }
      showToast?.(`تم ترحيل واعتماد القيد المركب (${officialNo}) بنجاح 📑✨`);
      onClose();
    } catch (err) {
      console.error("Compound entry submit error:", err);
      showToast?.(err?.message || 'حدث خطأ أثناء اعتماد القيد المركب', 'error');
    } finally { setIsSubmitting(false); }
  };

  const suppliers = useMemo(() => [...new Set((purchases || []).map(p => p.supplier || p.vendor_name).filter(Boolean))], [purchases]);
  if (!isOpen) return null;
  const createPortal = (typeof ReactDOM !== 'undefined' && ReactDOM.createPortal) ? ReactDOM.createPortal : null;
  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-[4px] animate-fadeIn" dir="rtl" onClick={onClose}>
      <div className="bg-[#1e2433] text-white rounded-3xl border border-[#2d3748] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-[#2d3748] flex items-center justify-between bg-[#181d2a] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 text-[#00E5FF] border border-[#00E5FF]/20 flex items-center justify-center text-base font-bold">📑</div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">محرر قيد اليومية المركب (القيود المزدوجة المتزنة)</h3>
              <p className="text-[10.5px] text-[#94a3b8]">إنشاء قيد محاسبي مركب مع التحقق الفوري من التوازن</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleAddLine} className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#00E5FF] bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/30 cursor-pointer">+ إضافة سطر</button>
            <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg bg-[#2d3748] hover:bg-[#374151] text-gray-300 flex items-center justify-center cursor-pointer text-xs">✕</button>
          </div>
        </div>

        <div className="p-3 bg-[#181d2a]/60 border-b border-[#2d3748] grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs shrink-0">
          <div><label className="block text-[11px] font-bold text-gray-300 mb-1">رقم القيد</label><input type="text" value={form.entry_no} onChange={e => setForm({ ...form, entry_no: e.target.value })} className="w-full h-8 px-2 rounded-lg border border-[#374151] bg-[#111827] text-white font-mono text-left" dir="ltr" /></div>
          <div><label className="block text-[11px] font-bold text-gray-300 mb-1">تاريخ القيد</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full h-8 px-2 rounded-lg border border-[#374151] bg-[#111827] text-white font-mono text-left" dir="ltr" /></div>
          <div><label className="block text-[11px] font-bold text-gray-300 mb-1">العملة</label><select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full h-8 px-2 rounded-lg border border-[#374151] bg-[#111827] text-white">{["YER ﷼", "SAR ﷼", "USD $"].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="block text-[11px] font-bold text-gray-300 mb-1">سعر الصرف</label><input type="number" step="any" value={form.exchange_rate} onChange={e => setForm({ ...form, exchange_rate: e.target.value })} className="w-full h-8 px-2 rounded-lg border border-[#374151] bg-[#111827] text-amber-400 font-mono text-left" dir="ltr" /></div>
        </div>

        <div className="p-3 overflow-y-auto overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-[#111827] text-gray-300 font-bold border-b border-[#2d3748]">
                <th className="p-2 w-[35%]">الحساب في الدليل</th>
                <th className="p-2 w-[20%]">الجهة الفرعية</th>
                <th className="p-2 w-[15%] text-center">المدين</th>
                <th className="p-2 w-[15%] text-center">الدائن</th>
                <th className="p-2 w-[15%] text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3748] bg-[#1a202c]">
              {lines.map((l, idx) => (
                <tr key={l.id} className="hover:bg-[#222a3a]">
                  <td className="p-2">
                    <select value={l.account_code} onChange={e => handleLineChange(idx, 'account_code', e.target.value)} className="w-full h-8 px-2 rounded border border-[#374151] bg-[#111827] text-white text-xs">
                      <option value="">-- اختر حساباً --</option>
                      {(accounts || []).filter(a => !a.is_group).map(a => <option key={a.code || a.id} value={a.code || a.acc_code}>{a.code || a.acc_code} - {a.name || a.account_name}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <select value={l.party_id} onChange={e => handleLineChange(idx, 'party_id', e.target.value)} className="w-full h-8 px-2 rounded border border-[#374151] bg-[#111827] text-white text-[11px]">
                      <option value="">-- اختياري --</option>
                      <optgroup label="عملاء">{(customers || []).map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}</optgroup>
                      <optgroup label="موردون">{suppliers.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>
                      <optgroup label="موظفون">{(employees || []).map(emp => <option key={emp.id || emp.name} value={emp.name}>{emp.name}</option>)}</optgroup>
                    </select>
                  </td>
                  <td className="p-2"><input type="number" step="any" value={l.debit} onChange={e => handleLineChange(idx, 'debit', e.target.value)} dir="ltr" className="w-full h-8 px-2 rounded border border-[#374151] bg-[#111827] text-[#00E5FF] font-mono text-center text-xs" /></td>
                  <td className="p-2"><input type="number" step="any" value={l.credit} onChange={e => handleLineChange(idx, 'credit', e.target.value)} dir="ltr" className="w-full h-8 px-2 rounded border border-[#374151] bg-[#111827] text-amber-400 font-mono text-center text-xs" /></td>
                  <td className="p-2 text-center">
                    <button type="button" onClick={() => handleDuplicateLine(idx)} className="text-gray-400 hover:text-white px-1 cursor-pointer">+</button>
                    <button type="button" onClick={() => handleDeleteLine(idx)} className="text-rose-400 hover:text-rose-300 px-1 cursor-pointer">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-[#2d3748] bg-[#111827] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex gap-4 items-center">
            <span>المدين: <b className="text-[#00E5FF] font-mono" dir="ltr">{totals.totalDebit.toLocaleString()} {currCode}</b></span>
            <span>الدائن: <b className="text-amber-400 font-mono" dir="ltr">{totals.totalCredit.toLocaleString()} {currCode}</b></span>
            <span className={`px-2 py-0.5 rounded-full font-bold ${totals.isBalanced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{totals.isBalanced ? '✓ متزن' : `الفرق: ${totals.diff.toLocaleString()}`}</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-[#374151] text-gray-300 cursor-pointer">إلغاء</button>
            <button type="button" onClick={handleSubmit} disabled={!totals.isBalanced || isSubmitting} className="px-5 py-2 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-40 cursor-pointer">
              {isSubmitting ? 'جاري الاعتماد...' : 'اعتماد وترحيل القيد 📑'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  return (typeof document !== 'undefined' && createPortal) ? createPortal(content, document.body) : content;
}

window.JournalVoucherModal = JournalVoucherModal;
