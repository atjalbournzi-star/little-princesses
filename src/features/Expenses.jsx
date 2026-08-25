const { useState, useEffect, useMemo, useCallback, useRef } = React;

function Expenses({ expenses = [], setExpenses, accounts = [], showToast, currency }) {
  const currencyDisplay = currency?.display || "YER ﷼";

  const [formData, setFormData] = useState({
    exp_category: typeof EXPENSE_CATEGORIES !== 'undefined' ? EXPENSE_CATEGORIES[0] : '502 - إيجار الورشة والمعمل والمحل الرئيسي',
    amount: '',
    currency: 'YER ﷼',
    date: TODAY_STR_ISO,
    notes: '',
    pay_method: typeof PAY_METHODS !== 'undefined' ? PAY_METHODS[0] : 'نقد (كاش)',
    source_acc: '101 - الصندوق الرئيسي'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount) return showToast('المبلغ مطلوب ⚠️', 'error');

    const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(formData.currency) : 'YER';
    const rate = window.CurrencyService ? window.CurrencyService.getRate(currCode) : 1.0;
    const baseObj = window.CurrencyService ? window.CurrencyService.toBase(formData.amount, currCode, rate) : { base_amount: parseFloat(formData.amount) || 0, exchange_rate: rate };

    // Extract expense account code
    const expMatch = formData.exp_category.match(/^(\d+)/);
    const expCode = expMatch ? expMatch[1] : '502';
    const sourceMatch = (formData.source_acc || '101').match(/^(\d+)/);
    const sourceCode = sourceMatch ? sourceMatch[1] : '101';

    const newE = {
      id: Date.now(),
      ...formData,
      currency: currCode,
      exchange_rate: rate,
      base_amount: baseObj.base_amount
    };
    
    try {
      const res = await callGAS('addExpense', newE);
      if (res.status === 'success' || res.id || !res.error) {
        if (setExpenses) setExpenses([newE, ...(expenses || [])]);

        // Automatically create double-entry journal entry
        callGAS('addJournalEntry', {
          id: Date.now() + 1,
          transaction_id: `TX-EXP-${Date.now()}`,
          entry_no: `AUTO-EXP-${Date.now().toString().slice(-6)}`,
          debit: expCode,
          credit: sourceCode,
          amount: parseFloat(formData.amount) || 0,
          currency: currCode,
          exchange_rate: rate,
          base_amount: baseObj.base_amount,
          ref_type: 'EXPENSE',
          ref_id: String(newE.id),
          date: formData.date || TODAY_STR_ISO,
          notes: `قيد مصروف آلي: ${formData.exp_category} - ${formData.notes || ''}`
        }).catch(err => console.error('Journal entry for expense error:', err));

        showToast('تم حفظ المصروف وترحيل القيد المحاسبي بنجاح 💸');
      } else {
        showToast('حدث خطأ أثناء الحفظ', 'error');
      }
    } catch (err) {
      if (setExpenses) setExpenses([newE, ...(expenses || [])]);
      showToast('تم الحفظ محلياً ⚡');
    } finally {
      setFormData({
        exp_category: typeof EXPENSE_CATEGORIES !== 'undefined' ? EXPENSE_CATEGORIES[0] : '502 - إيجار الورشة والمعمل والمحل الرئيسي',
        amount: '',
        currency: 'YER ﷼',
        date: TODAY_STR_ISO,
        notes: '',
        pay_method: typeof PAY_METHODS !== 'undefined' ? PAY_METHODS[0] : 'نقد (كاش)',
        source_acc: '101 - الصندوق الرئيسي'
      });
    }
  };

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#F28A00] focus:ring-2 focus:ring-[#FFF1DC] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden transition-all">
        <div className="px-6 py-4 border-b border-[#E8E5EA] flex items-center justify-between bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF1DC] text-[#C97300] flex items-center justify-center text-sm font-bold border border-[#FFE4B9]">
              💸
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#25232A]">تسجيل مصروف تشغيلي جديد</h2>
              <p className="text-[11px] text-[#6F6B75] font-normal">تسجيل مصروفات الإيجار والكهرباء والصيانة والمستلزمات</p>
            </div>
          </div>
          <span className="text-xs text-[#6F6B75]">
            <span className="text-[#D64545] font-bold">*</span> الحقول الإلزامية
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
            <div>
              <label className={labelCls}>بند المصروف <span className="text-[#D64545] font-bold">*</span></label>
              <select className={inputCls} value={formData.exp_category} onChange={e => setFormData({...formData, exp_category: e.target.value})}>
                {(typeof EXPENSE_CATEGORIES !== 'undefined' ? EXPENSE_CATEGORIES : ['إيجار','كهرباء','صيانة','ضيافة','تسويق','أخرى']).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>المبلغ <span className="text-[#D64545] font-bold">*</span></label>
              <input type="number" step="0.01" className={inputCls + " font-mono font-bold text-[#25232A]"} placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
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
            <button type="submit" className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs text-white bg-[#F28A00] hover:bg-[#D97706] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer">
              <Icons.Check className="w-4 h-4" />
              <span>حفظ المصروف التشغيلي 💸</span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-sm text-[#25232A]">سجل المصروفات التشغيلية</h3>
            <span className="text-xs bg-[#FFF1DC] text-[#C97300] font-bold px-2.5 py-0.5 rounded-full font-mono">{expenses.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
          {(!expenses || expenses.length === 0) ? (
            <div className="text-center py-12 text-[#6F6B75] text-xs font-medium">لا توجد مصروفات مسجلة بعد 💸</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="px-4 py-3 text-right">البند</th>
                  <th className="px-4 py-3 text-right">البيان</th>
                  <th className="px-4 py-3 text-right">المبلغ</th>
                  <th className="px-4 py-3 text-right">طريقة الدفع</th>
                  <th className="px-4 py-3 text-right">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-[#FAFAFB] transition-colors">
                    <td className="px-4 py-3 font-bold text-[#25232A]">{e.exp_category}</td>
                    <td className="px-4 py-3 text-[#6F6B75]">{e.notes || '—'}</td>
                    <td className="px-4 py-3 font-bold font-mono tabular-nums text-[#D64545]">
                      {(parseFloat(e.amount) || 0).toLocaleString('en-US')} <span className="text-[10px] font-medium text-[#6F6B75] font-sans">{e.currency}</span>
                    </td>
                    <td className="px-4 py-3 text-[#6F6B75]">{e.pay_method}</td>
                    <td className="px-4 py-3 text-[#6F6B75] font-mono">{e.date}</td>
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
