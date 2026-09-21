const { useState, useEffect, useMemo } = React;

function JournalVoucherModal({
  isOpen, onClose, accounts = [], customers = [], purchases = [],
  employees = [], setJournal, setAccounts, showToast
}) {
  if (!isOpen) return null;

  const [form, setForm] = useState({
    entry_no: `JV-CMP-${Date.now().toString().slice(-6)}`,
    date: typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10),
    currency: 'YER ﷼', exchange_rate: '1.0', ref_type: 'قيد مركب', general_notes: ''
  });

  const [lines, setLines] = useState([
    { id: 1, account_code: '101.1', link_subparty: false, party_type: 'customer', party_id: '', debit: '', credit: '', notes: '' },
    { id: 2, account_code: '301', link_subparty: false, party_type: 'supplier', party_id: '', debit: '', credit: '', notes: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(form.currency) : 'YER';
  useEffect(() => {
    if (window.CurrencyService) setForm(prev => ({ ...prev, exchange_rate: String(window.CurrencyService.getRate(currCode)) }));
  }, [form.currency, currCode]);

  const totals = useMemo(() => {
    let totalDebit = 0, totalCredit = 0;
    lines.forEach(l => {
      totalDebit += parseFloat(l.debit) || 0;
      totalCredit += parseFloat(l.credit) || 0;
    });
    const diff = Math.abs(totalDebit - totalCredit);
    return { totalDebit, totalCredit, diff, isBalanced: diff < 0.01 && totalDebit > 0 };
  }, [lines]);

  const handleAddLine = () => {
    setLines(prev => [...prev, { id: Date.now() + Math.random(), account_code: '', link_subparty: false, party_type: 'customer', party_id: '', debit: '', credit: '', notes: '' }]);
  };
  const handleDuplicateLine = (idx) => {
    const next = [...lines];
    next.splice(idx + 1, 0, { ...lines[idx], id: Date.now() + Math.random() });
    setLines(next);
  };
  const handleDeleteLine = (idx) => {
    if (lines.length <= 2) return showToast?.('يجب أن يحتوي القيد المركب على سطرين على الأقل ⚠️', 'warning');
    setLines(prev => prev.filter((_, i) => i !== idx));
  };
  const handleLineChange = (idx, field, val) => {
    setLines(prev => {
      const copy = [...prev];
      if (field === 'debit' && val) copy[idx] = { ...copy[idx], debit: val, credit: '' };
      else if (field === 'credit' && val) copy[idx] = { ...copy[idx], credit: val, debit: '' };
      else copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!totals.isBalanced) return showToast?.('القيد غير متوازن! يجب أن يتساوى إجمالي المدين مع إجمالي الدائن ⚠️', 'error');
    if (lines.some(l => !l.account_code && ((parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0))) {
      return showToast?.('يرجى تحديد حساب لكل سطر مالي ⚠️', 'error');
    }

    setIsSubmitting(true);
    try {
      const rate = parseFloat(form.exchange_rate) || 1.0;
      const txId = `TX-CMP-${Date.now()}`;
      const entryNo = form.entry_no || `JV-CMP-${Date.now().toString().slice(-6)}`;
      const debits = lines.filter(l => (parseFloat(l.debit) || 0) > 0);
      const credits = lines.filter(l => (parseFloat(l.credit) || 0) > 0);
      const primaryDebitLabel = debits.map(d => `${d.account_code}: ${(parseFloat(d.debit) || 0).toLocaleString('en-US')} ${currCode}`).join(' + ');
      const primaryCreditLabel = credits.map(c => `${c.account_code}: ${(parseFloat(c.credit) || 0).toLocaleString('en-US')} ${currCode}`).join(' + ');

      const generated = [];
      lines.forEach(l => {
        const dAmt = parseFloat(l.debit) || 0, cAmt = parseFloat(l.credit) || 0;
        const lineAmt = dAmt > 0 ? dAmt : cAmt;
        if (lineAmt <= 0) return;
        const isDebitLine = dAmt > 0;
        const accObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(l.account_code));
        const accLabel = accObj ? `${accObj.code || accObj.acc_code} - ${accObj.name || accObj.account_name}` : l.account_code;
        const subPartyNote = (l.link_subparty && l.party_id) ? ` [الجهة: ${l.party_id}]` : '';

        generated.push({
          id: Date.now() + Math.random(), transaction_id: txId, entry_no: entryNo,
          debit: isDebitLine ? accLabel : primaryDebitLabel, credit: !isDebitLine ? accLabel : primaryCreditLabel,
          debit_code: isDebitLine ? l.account_code : '', credit_code: !isDebitLine ? l.account_code : '',
          amount: lineAmt, currency: currCode, exchange_rate: rate, base_amount: lineAmt * rate,
          ref_type: form.ref_type || 'قيد مركب', ref_id: entryNo, date: form.date,
          notes: `${form.general_notes ? form.general_notes + ' | ' : ''}${l.notes || (isDebitLine ? 'طرف مدين' : 'طرف دائن')}${subPartyNote}`,
          status: 'posted'
        });
      });

      if (setJournal) setJournal(prev => [...generated, ...(prev || [])]);
      if (typeof setAccounts === 'function') {
        setAccounts(prev => (prev || []).map(acc => {
          const c = String(acc.code || acc.acc_code || '');
          let delta = 0;
          lines.forEach(l => {
            if (String(l.account_code) === c) {
              const d = (parseFloat(l.debit) || 0) * rate, cr = (parseFloat(l.credit) || 0) * rate;
              delta += (acc.type === 'أصول' || acc.type === 'مصروفات' || acc.nature === 'debit') ? (d - cr) : (cr - d);
            }
          });
          if (delta !== 0) {
            const curBal = (parseFloat(acc.current_balance ?? acc.balance) || 0) + delta;
            return { ...acc, current_balance: curBal, balance: curBal };
          }
          return acc;
        }));
      }

      if (typeof window.callGAS === 'function') {
        generated.forEach(j => window.callGAS('addJournalEntry', j).catch(e => console.error(e)));
      }
      showToast?.(`تم ترحيل واعتماد القيد المركب (${entryNo}) بنجاح 📑✨`);
      onClose();
    } catch (err) {
      console.error("Compound entry submit error:", err);
      showToast?.('حدث خطأ أثناء اعتماد القيد المركب', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const suppliers = useMemo(() => [...new Set((purchases || []).map(p => p.supplier || p.vendor_name).filter(Boolean))], [purchases]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto" dir="rtl">
      <div className="bg-[#1e2433] text-white rounded-3xl border border-[#2d3748] shadow-2xl w-full max-w-5xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-[#2d3748] flex items-center justify-between bg-[#181d2a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-[#00E5FF] border border-[#00E5FF]/20 flex items-center justify-center text-lg font-bold">📑</div>
            <div>
              <h3 className="text-sm font-bold text-white">محرر قيد اليومية المركب (القيود المزدوجة المتزنة)</h3>
              <p className="text-[11px] text-[#94a3b8]">إنشاء قيد محاسبي مركب مع التحقق الفوري من التوازن</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleAddLine} className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#00E5FF] bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/30 cursor-pointer">+ إضافة سطر</button>
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl bg-[#2d3748] hover:bg-[#374151] text-gray-300 flex items-center justify-center cursor-pointer">✕</button>
          </div>
        </div>

        <div className="p-4 bg-[#181d2a]/60 border-b border-[#2d3748] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div><label className="block text-[11px] font-bold text-gray-300 mb-1">رقم القيد</label><input type="text" value={form.entry_no} onChange={e => setForm({ ...form, entry_no: e.target.value })} className="w-full h-8 px-2 rounded-lg border border-[#374151] bg-[#111827] text-white font-mono" /></div>
          <div><label className="block text-[11px] font-bold text-gray-300 mb-1">تاريخ القيد</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full h-8 px-2 rounded-lg border border-[#374151] bg-[#111827] text-white font-mono" /></div>
          <div><label className="block text-[11px] font-bold text-gray-300 mb-1">العملة</label><select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full h-8 px-2 rounded-lg border border-[#374151] bg-[#111827] text-white">{["YER ﷼", "SAR ﷼", "USD $"].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="block text-[11px] font-bold text-gray-300 mb-1">سعر الصرف</label><input type="number" step="any" value={form.exchange_rate} onChange={e => setForm({ ...form, exchange_rate: e.target.value })} className="w-full h-8 px-2 rounded-lg border border-[#374151] bg-[#111827] text-amber-400 font-mono" /></div>
        </div>

        <div className="p-4 overflow-x-auto max-h-[40vh]">
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
                      <optgroup label="عميلات">{(customers || []).map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}</optgroup>
                      <optgroup label="موردون">{suppliers.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>
                      <optgroup label="موظفون">{(employees || []).map(emp => <option key={emp.id || emp.name} value={emp.name}>{emp.name}</option>)}</optgroup>
                    </select>
                  </td>
                  <td className="p-2"><input type="number" step="any" placeholder="0.00" value={l.debit} onChange={e => handleLineChange(idx, 'debit', e.target.value)} className="w-full h-8 px-2 rounded border border-[#374151] bg-[#111827] text-[#00E5FF] font-mono text-center text-xs" /></td>
                  <td className="p-2"><input type="number" step="any" placeholder="0.00" value={l.credit} onChange={e => handleLineChange(idx, 'credit', e.target.value)} className="w-full h-8 px-2 rounded border border-[#374151] bg-[#111827] text-amber-400 font-mono text-center text-xs" /></td>
                  <td className="p-2 text-center">
                    <button type="button" onClick={() => handleDuplicateLine(idx)} className="text-gray-400 hover:text-white px-1 cursor-pointer">+</button>
                    <button type="button" onClick={() => handleDeleteLine(idx)} className="text-rose-400 hover:text-rose-300 px-1 cursor-pointer">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-[#2d3748] bg-[#111827] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex gap-4 items-center">
            <span>المدين: <b className="text-[#00E5FF] font-mono">{totals.totalDebit.toLocaleString()} {currCode}</b></span>
            <span>الدائن: <b className="text-amber-400 font-mono">{totals.totalCredit.toLocaleString()} {currCode}</b></span>
            <span className={`px-2 py-0.5 rounded-full font-bold ${totals.isBalanced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {totals.isBalanced ? '✓ متزن' : `الفرق: ${totals.diff.toLocaleString()}`}
            </span>
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
}

window.JournalVoucherModal = JournalVoucherModal;
