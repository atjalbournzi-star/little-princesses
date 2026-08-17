const { useState, useEffect, useMemo, useCallback, useRef } = React;
function Journal({ journal = [], setJournal, accounts = [], showToast, currency }) {
  const currencyDisplay = currency?.display || "SAR";

  const [formData, setFormData] = React.useState({
    entry_no: '', debit: '', credit: '', amount: '', currency: (typeof CURRENCIES !== 'undefined' && CURRENCIES[0]) ? (typeof CURRENCIES[0] === 'object' ? CURRENCIES[0].value : CURRENCIES[0]) : 'SAR', date: TODAY_STR_ISO, notes: '', ref_type: ''
  });

  const postingAccounts = React.useMemo(() => {
    return (accounts || []).filter(a => Number(a.is_group) !== 1 && Number(a.is_active) !== 0);
  }, [accounts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.debit || !formData.credit || !formData.amount) return showToast('الطرف المدين، الدائن، والمبلغ مطلوبة ⚠️', 'error');
    if (formData.debit === formData.credit) return showToast('الطرف المدين والدائن يجب أن يكونا مختلفين ⚠️', 'error');
    
    // Check group account validation
    const debitAccObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(formData.debit));
    const creditAccObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(formData.credit));
    if (debitAccObj && Number(debitAccObj.is_group) === 1) {
      return showToast(`لا يمكن تسجيل قيد على الحساب التجميعي (${debitAccObj.name}). اختر حساب حركة فرعي.`, 'error');
    }
    if (creditAccObj && Number(creditAccObj.is_group) === 1) {
      return showToast(`لا يمكن تسجيل قيد على الحساب التجميعي (${creditAccObj.name}). اختر حساب حركة فرعي.`, 'error');
    }

    const newJ = { id: Date.now(), ...formData };
    
    try {
      const res = await callGAS('addJournalEntry', newJ);
      if (res.status === 'success' || res.id) {
        if (setJournal) setJournal([newJ, ...(journal || [])]);
        showToast('تم حفظ القيد المحاسبي بنجاح 📑');
      } else showToast('حدث خطأ أثناء الحفظ', 'error');
    } catch (err) {
      if (setJournal) setJournal([newJ, ...(journal || [])]);
      showToast('تم الحفظ محلياً ⚡');
    } finally {
      setFormData({
        entry_no: '', debit: '', credit: '', amount: '', currency: (typeof CURRENCIES !== 'undefined' && CURRENCIES[0]) ? (typeof CURRENCIES[0] === 'object' ? CURRENCIES[0].value : CURRENCIES[0]) : 'SAR', date: TODAY_STR_ISO, notes: '', ref_type: ''
      });
    }
  };

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all outline-none min-h-[42px]";
  const labelCls = "block text-xs font-semibold text-slate-700 mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center text-sm font-bold">
              📑
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">إضافة قيد يومية محاسبي</h2>
              <p className="text-[11px] text-slate-500 font-normal">تسجيل العمليات المالية المزدوجة بين الحسابات</p>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            <span className="text-rose-500 font-bold">*</span> الحقول الإلزامية
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>رقم القيد</label>
              <input type="text" className={inputCls + " font-mono"} placeholder="آلي أو يدوي..." value={formData.entry_no} onChange={e => setFormData({...formData, entry_no: e.target.value})} />
            </div>
            <div>
              <label className={labelCls}>من حساب (المدين) <span className="text-rose-500 font-bold">*</span></label>
              <select className={inputCls} value={formData.debit} onChange={e => setFormData({...formData, debit: e.target.value})}>
                <option value="">-- اختر حساب حركة --</option>
                {postingAccounts.map(a => {
                  const code = a.acc_code || a.code || a.id;
                  const name = a.acc_name || a.name || code;
                  return <option key={code} value={code}>{code} - {name}</option>;
                })}
              </select>
            </div>
            <div>
              <label className={labelCls}>إلى حساب (الدائن) <span className="text-rose-500 font-bold">*</span></label>
              <select className={inputCls} value={formData.credit} onChange={e => setFormData({...formData, credit: e.target.value})}>
                <option value="">-- اختر حساب حركة --</option>
                {postingAccounts.map(a => {
                  const code = a.acc_code || a.code || a.id;
                  const name = a.acc_name || a.name || code;
                  return <option key={code} value={code}>{code} - {name}</option>;
                })}
              </select>
            </div>
            <div>
              <label className={labelCls}>المبلغ <span className="text-rose-500 font-bold">*</span></label>
              <input type="number" step="0.01" className={inputCls + " font-mono font-bold text-slate-900"} placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
            <div>
              <label className={labelCls}>العملة</label>
              <select className={inputCls} value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                {(typeof CURRENCIES !== 'undefined' ? CURRENCIES : ['SAR','USD','YER']).map(c => <option key={typeof c === "object" ? c.value : c} value={typeof c === "object" ? c.value : c}>{typeof c === "object" ? c.label : c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>التاريخ</label>
              <input type="date" className={inputCls} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>البيان / الشرح</label>
              <input type="text" className={inputCls} placeholder="شرح القيد المحاسبي..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-purple-700 hover:bg-purple-800 active:bg-purple-900 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              <span>💾 حفظ القيد المحاسبي</span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900">سجل القيود اليومية</h3>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono font-semibold">{journal.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {(!journal || journal.length === 0) ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">لا توجد قيود مسجلة بعد 📑</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="px-3.5 py-3 text-right">رقم القيد</th>
                  <th className="px-3.5 py-3 text-right">المدين (من حساب)</th>
                  <th className="px-3.5 py-3 text-right">الدائن (إلى حساب)</th>
                  <th className="px-3.5 py-3 text-right">المبلغ</th>
                  <th className="px-3.5 py-3 text-right">التاريخ</th>
                  <th className="px-3.5 py-3 text-right">البيان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {journal.map(j => {
                  const debitAcc = accounts.find(a => String(a.code || a.acc_code) === String(j.debit))?.name || j.debit;
                  const creditAcc = accounts.find(a => String(a.code || a.acc_code) === String(j.credit))?.name || j.credit;
                  return (
                    <tr key={j.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="px-3.5 py-3 font-mono font-bold text-purple-700">{j.entry_no || `JRN-${j.id}`}</td>
                      <td className="px-3.5 py-3 font-semibold text-slate-900">{debitAcc}</td>
                      <td className="px-3.5 py-3 font-semibold text-slate-900">{creditAcc}</td>
                      <td className="px-3.5 py-3 font-bold font-mono text-emerald-700">{j.amount} {j.currency}</td>
                      <td className="px-3.5 py-3 text-slate-500 font-mono">{j.date}</td>
                      <td className="px-3.5 py-3 text-slate-600 max-w-[200px] truncate">{j.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
