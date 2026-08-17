const { useState, useEffect, useMemo, useCallback, useRef } = React;
function Expenses({ expenses = [], setExpenses, accounts = [], showToast, currency }) {
  const currencyDisplay = currency?.display || "SAR";

  const [formData, setFormData] = React.useState({
    exp_category: typeof EXPENSE_CATEGORIES !== 'undefined' ? EXPENSE_CATEGORIES[0] : 'مصروفات تشغيل', amount: '', currency: typeof CURRENCIES !== 'undefined' ? (typeof CURRENCIES[0] === 'object' ? CURRENCIES[0].value : CURRENCIES[0]) : 'SAR', date: TODAY_STR_ISO, notes: '', pay_method: typeof PAY_METHODS !== 'undefined' ? PAY_METHODS[0] : 'نقدي', source_acc: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount) return showToast('المبلغ مطلوب ⚠️', 'error');
    
    const newE = { id: Date.now(), ...formData };
    
    try {
      const res = await callGAS('addExpense', newE);
      if (res.status === 'success' || res.id) {
        if (setExpenses) setExpenses([newE, ...(expenses || [])]);
        showToast('تم حفظ المصروف بنجاح 💸');
      } else showToast('حدث خطأ أثناء الحفظ', 'error');
    } catch (err) {
      if (setExpenses) setExpenses([newE, ...(expenses || [])]);
      showToast('تم الحفظ محلياً ⚡');
    } finally {
      setFormData({
        exp_category: typeof EXPENSE_CATEGORIES !== 'undefined' ? EXPENSE_CATEGORIES[0] : 'مصروفات تشغيل', amount: '', currency: typeof CURRENCIES !== 'undefined' ? (typeof CURRENCIES[0] === 'object' ? CURRENCIES[0].value : CURRENCIES[0]) : 'SAR', date: TODAY_STR_ISO, notes: '', pay_method: typeof PAY_METHODS !== 'undefined' ? PAY_METHODS[0] : 'نقدي', source_acc: ''
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
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center text-sm font-bold">
              💸
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">تسجيل مصروف تشغيلي جديد</h2>
              <p className="text-[11px] text-slate-500 font-normal">تسجيل مصروفات الإيجار والكهرباء والصيانة والمستلزمات</p>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            <span className="text-rose-500 font-bold">*</span> الحقول الإلزامية
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>بند المصروف <span className="text-rose-500 font-bold">*</span></label>
              <select className={inputCls} value={formData.exp_category} onChange={e => setFormData({...formData, exp_category: e.target.value})}>
                {(typeof EXPENSE_CATEGORIES !== 'undefined' ? EXPENSE_CATEGORIES : ['إيجار','كهرباء','صيانة','ضيافة','تسويق','أخرى']).map(c => <option key={c} value={c}>{c}</option>)}
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
              <label className={labelCls}>طريقة الدفع</label>
              <select className={inputCls} value={formData.pay_method} onChange={e => setFormData({...formData, pay_method: e.target.value})}>
                {(typeof PAY_METHODS !== 'undefined' ? PAY_METHODS : ['نقدي','تحويل إلكتروني','شيك']).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>حساب الدفع</label>
              <select className={inputCls} value={formData.source_acc} onChange={e => setFormData({...formData, source_acc: e.target.value})}>
                <option value="">-- اختر حساب --</option>
                {accounts.map(a => {
                  const code = a.acc_code || a.code || a.id;
                  const name = a.acc_name || a.name || code;
                  return <option key={code} value={code}>{code} - {name}</option>;
                })}
              </select>
            </div>
            <div>
              <label className={labelCls}>التاريخ</label>
              <input type="date" className={inputCls} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>البيان / تفاصيل المصروف</label>
              <input type="text" className={inputCls} placeholder="شرح المصروف..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-purple-700 hover:bg-purple-800 active:bg-purple-900 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              <span>💾 حفظ المصروف</span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900">سجل المصروفات</h3>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono font-semibold">{expenses.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {(!expenses || expenses.length === 0) ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">لا توجد مصروفات مسجلة بعد 💸</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="px-3.5 py-3 text-right">البند</th>
                  <th className="px-3.5 py-3 text-right">البيان</th>
                  <th className="px-3.5 py-3 text-right">المبلغ</th>
                  <th className="px-3.5 py-3 text-right">طريقة الدفع</th>
                  <th className="px-3.5 py-3 text-right">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-3.5 py-3 font-bold text-slate-900">{e.exp_category}</td>
                    <td className="px-3.5 py-3 text-slate-600">{e.notes || '—'}</td>
                    <td className="px-3.5 py-3 font-bold font-mono text-rose-600">{e.amount} {e.currency}</td>
                    <td className="px-3.5 py-3 text-slate-600">{e.pay_method}</td>
                    <td className="px-3.5 py-3 text-slate-500 font-mono">{e.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
