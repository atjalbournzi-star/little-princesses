const { useState, useEffect, useMemo, useCallback, useRef } = React;
function Vouchers({ vouchers = [], setVouchers, accounts = [], showToast, customers = [], setCustomers, orders = [], setOrders, currency }) {
  const currencyDisplay = currency?.display || "SAR";

  const [formData, setFormData] = React.useState({
    v_no: '', v_type: 'سند قبض', party: '', amount: '', currency: typeof CURRENCIES !== 'undefined' ? (typeof CURRENCIES[0] === 'object' ? CURRENCIES[0].value : CURRENCIES[0]) : 'SAR', date: TODAY_STR_ISO, notes: '', pay_method: typeof PAY_METHODS !== 'undefined' ? PAY_METHODS[0] : 'نقدي', acc_code: ''
  });
  
  const [selectedCustomer, setSelectedCustomer] = React.useState('');
  const [selectedOrder, setSelectedOrder] = React.useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.party || !formData.amount) return showToast('الطرف والمبلغ مطلوبان ⚠️', 'error');
    
    const newV = { id: Date.now(), ...formData };
    
    try {
      const res = await callGAS('addVoucher', newV);
      if (res.status === 'success' || res.status === 200 || !res.error || res.id) {
        if (setVouchers) setVouchers([newV, ...(vouchers || [])]);
        
        // Auto Journal Entry
        callGAS('addJournalEntry', {
            id: Date.now() + 1,
            entry_no: 'AUTO-RCPT-' + (newV.v_no || Date.now()),
            debit: newV.v_type === 'سند قبض' ? newV.acc_code : '2100',
            credit: newV.v_type === 'سند قبض' ? '4100' : newV.acc_code,
            amount: newV.amount,
            currency: newV.currency,
            date: newV.date,
            notes: `قيد آلي: ${newV.notes || newV.v_type + ' ' + newV.party}`
        }).catch(e => console.error(e));

        // Update Customer Ledger & Orders if applicable
        if (newV.v_type === 'سند قبض' && selectedCustomer) {
            if (selectedOrder && setOrders) {
                setOrders((orders || []).map(o => {
                  if (o.order_no === selectedOrder) {
                     const newPaid = (o.paid || 0) + parseFloat(newV.amount);
                     return { ...o, paid: newPaid, remaining: Math.max(0, o.total - newPaid) };
                  }
                  return o;
                }));
            }
            
            if (setCustomers) {
                setCustomers((customers || []).map(c => {
                   if (c.name === selectedCustomer) {
                       const cSales = c.ledger?.total_sales || 0;
                       const cDeliv = c.ledger?.delivery || 0;
                       const cPaid = (c.ledger?.total_paid || 0) + parseFloat(newV.amount);
                       return {
                          ...c,
                          ledger: {
                              ...c.ledger,
                              total_paid: cPaid,
                              remaining: Math.max(0, (cSales + cDeliv) - cPaid)
                          }
                       }
                   }
                   return c;
                }));
            }
            
            fetch('/api/gas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({
                    action: 'addOrderPayment',
                    customer_name: selectedCustomer,
                    order_no: selectedOrder,
                    amount: newV.amount,
                    currency: newV.currency,
                    notes: newV.notes
                })
            }).catch(e => console.error(e));
        }

        showToast('تم حفظ السند بنجاح 🧾');
        setFormData(prev => ({...prev, amount: '', notes: '', v_no: ''}));
      } else {
        showToast('حدث خطأ أثناء الحفظ', 'error');
      }
    } catch (err) {
      if (setVouchers) setVouchers([newV, ...(vouchers || [])]);
      showToast('تم الحفظ محلياً ⚡');
    }
  };

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all outline-none min-h-[42px]";
  const labelCls = "block text-xs font-semibold text-slate-700 mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-bold">
              🧾
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">إضافة سند مالي (قبض / صرف)</h2>
              <p className="text-[11px] text-slate-500 font-normal">تسجيل المقبوضات والمدفوعات وربطها بحسابات العملاء والطلبيات</p>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            <span className="text-rose-500 font-bold">*</span> الحقول الإلزامية
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>نوع السند <span className="text-rose-500 font-bold">*</span></label>
              <select className={inputCls} value={formData.v_type} onChange={e => { setFormData({...formData, v_type: e.target.value}); setSelectedCustomer(''); setSelectedOrder(''); }}>
                <option value="سند قبض">سند قبض (استلام نقدية / حوالة)</option>
                <option value="سند صرف">سند صرف (دفع)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>رقم السند</label>
              <input type="text" className={inputCls + " font-mono"} placeholder="مثال: VCH-1001" value={formData.v_no} onChange={e => setFormData({...formData, v_no: e.target.value})} />
            </div>
            
            {formData.v_type === 'سند قبض' ? (
              <div className="sm:col-span-2">
                <label className={labelCls}>حساب الزبون / العميلة (استلمنا من) <span className="text-rose-500 font-bold">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  <select 
                     className={inputCls}
                     value={selectedCustomer}
                     onChange={(e) => {
                       setSelectedCustomer(e.target.value);
                       setFormData({...formData, party: e.target.value});
                       setSelectedOrder('');
                     }}
                  >
                     <option value="">-- اختر العميلة من السجل --</option>
                     {(customers || []).map(c => <option key={c.customer_id || c.id || c.name} value={c.name}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                  </select>
                  
                  <select
                     className={inputCls + " disabled:opacity-50"}
                     value={selectedOrder}
                     disabled={!selectedCustomer}
                     onChange={(e) => setSelectedOrder(e.target.value)}
                  >
                     <option value="">-- ربط بطلب (اختياري) --</option>
                     {(orders || []).filter(o => o.customer_name === selectedCustomer).map(o => (
                         <option key={o.order_no} value={o.order_no}>
                             {o.order_no} - {o.product_name} (متبقي: {(o.remaining || 0)})
                         </option>
                     ))}
                  </select>
                </div>
                {!selectedCustomer && (
                   <input type="text" className={inputCls + " mt-2"} placeholder="أو اكتب اسم الطرف يدوياً..." value={formData.party} onChange={e => setFormData({...formData, party: e.target.value})} />
                )}
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label className={labelCls}>صرفنا إلى (الطرف المستفيد) <span className="text-rose-500 font-bold">*</span></label>
                <input type="text" className={inputCls} placeholder="اسم المستفيد..." value={formData.party} onChange={e => setFormData({...formData, party: e.target.value})} />
              </div>
            )}

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
                {(typeof PAY_METHODS !== 'undefined' ? PAY_METHODS : ['نقدي','حوالة بنكية','تحويل إلكتروني']).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>حساب الصندوق / البنك</label>
              <select className={inputCls} value={formData.acc_code} onChange={e => setFormData({...formData, acc_code: e.target.value})}>
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
            <div className="sm:col-span-3">
              <label className={labelCls}>البيان / ملاحظات السند</label>
              <input type="text" className={inputCls} placeholder="ملاحظات وتفاصيل الدفعة..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-purple-700 hover:bg-purple-800 active:bg-purple-900 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              <span>💾 حفظ السند المالي</span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900">سجل السندات المالية</h3>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono font-semibold">{vouchers.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {(!vouchers || vouchers.length === 0) ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">لا توجد سندات مسجلة بعد 🧾</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="px-3.5 py-3 text-right">النوع</th>
                  <th className="px-3.5 py-3 text-right">الرقم</th>
                  <th className="px-3.5 py-3 text-right">الطرف</th>
                  <th className="px-3.5 py-3 text-right">المبلغ</th>
                  <th className="px-3.5 py-3 text-right">طريقة الدفع</th>
                  <th className="px-3.5 py-3 text-right">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vouchers.map(v => (
                  <tr key={v.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-3.5 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${v.v_type === 'سند قبض' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        {v.v_type}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 font-mono font-bold text-purple-700">{v.v_no || `VCH-${v.id}`}</td>
                    <td className="px-3.5 py-3 font-bold text-slate-900">{v.party}</td>
                    <td className="px-3.5 py-3 font-bold font-mono text-slate-900">{v.amount} {v.currency}</td>
                    <td className="px-3.5 py-3 text-slate-600">{v.pay_method}</td>
                    <td className="px-3.5 py-3 text-slate-500 font-mono">{v.date}</td>
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
