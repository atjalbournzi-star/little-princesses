const { useState, useEffect, useMemo, useCallback, useRef } = React;

function Vouchers({ vouchers = [], setVouchers, accounts = [], showToast, customers = [], setCustomers, orders = [], setOrders, currency }) {
  const currencyDisplay = currency?.display || "SAR";

  const [formData, setFormData] = useState({
    v_no: '', v_type: 'سند قبض', party: '', amount: '', currency: typeof CURRENCIES !== 'undefined' ? (typeof CURRENCIES[0] === 'object' ? CURRENCIES[0].value : CURRENCIES[0]) : 'SAR', date: TODAY_STR_ISO, notes: '', pay_method: typeof PAY_METHODS !== 'undefined' ? PAY_METHODS[0] : 'نقدي', acc_code: ''
  });
  
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedOrder, setSelectedOrder] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('الكل'); // 'الكل' | 'سند قبض' | 'سند صرف'
  const [viewVoucher, setViewVoucher] = useState(null);

  const normalizeVoucher = (v) => {
    const rawNo = v.v_no || v.voucher_no || v.payment_no || `VCH-${v.id || ''}`;
    const rawType = v.v_type || v.voucher_type || v.payment_type || (String(rawNo).includes('PV') || String(rawNo).includes('EXP') ? 'سند صرف' : 'سند قبض');
    const isReceipt = rawType === 'سند قبض' || rawType === 'RECEIPT' || rawType === 'قبض';
    const typeLabel = isReceipt ? 'سند قبض' : 'سند صرف';
    
    // الطرف: العميل في القبض، المورد أو المستفيد في الصرف
    let party = v.party || v.party_name || '';
    if (!party) {
      if (isReceipt) party = v.customer_id || v.customer_name || v.customer || '';
      else party = v.supplier_id || v.supplier_name || v.supplier || v.beneficiary || '';
    }
    if (!party) party = v.customer_id || v.supplier_id || 'طرف عام';
    
    const payMethod = v.pay_method || v.payment_method || v.pay_type || 'نقدي';
    const amount = parseFloat(v.amount) || 0;
    const curr = v.currency || currencyDisplay;
    let dateStr = v.date || v.date_created || v.created_at || TODAY_STR_ISO;
    if (dateStr && String(dateStr).includes('T')) dateStr = String(dateStr).split('T')[0];
    const notes = v.notes || v.note || v.description || '—';
    const account = v.acc_code || v.account_id || v.payment_source || '101 - الصندوق الرئيسي';

    return {
      id: v.id || rawNo,
      v_no: rawNo,
      v_type: typeLabel,
      isReceipt,
      party,
      amount,
      currency: curr,
      pay_method: payMethod,
      date: dateStr,
      notes,
      account,
      image_path: v.image_path || v.receipt_url || ''
    };
  };

  const filteredVouchers = useMemo(() => {
    return (vouchers || []).map(normalizeVoucher).filter(v => {
      const matchType = typeFilter === 'الكل' || v.v_type === typeFilter;
      const q = search.toLowerCase();
      const matchSearch = !search ||
        v.v_no.toLowerCase().includes(q) ||
        v.party.toLowerCase().includes(q) ||
        v.notes.toLowerCase().includes(q) ||
        v.pay_method.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [vouchers, search, typeFilter]);

  const totals = useMemo(() => {
    let receipts = 0, payments = 0;
    (vouchers || []).map(normalizeVoucher).forEach(v => {
      if (v.isReceipt) receipts += v.amount;
      else payments += v.amount;
    });
    return { receipts, payments, net: receipts - payments };
  }, [vouchers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.party || !formData.amount) return showToast('الطرف والمبلغ مطلوبان ⚠️', 'error');
    
    const voucherNo = formData.v_no || `${formData.v_type === 'سند قبض' ? 'RV' : 'PV'}-${Date.now().toString().slice(-6)}`;
    const vCurrCode = window.CurrencyService ? window.CurrencyService.normalizeCode(formData.currency) : 'YER';
    const vRate = window.CurrencyService ? window.CurrencyService.getRate(vCurrCode) : 1.0;
    const vBaseObj = window.CurrencyService ? window.CurrencyService.toBase(formData.amount, vCurrCode, vRate) : { base_amount: parseFloat(formData.amount) || 0, exchange_rate: vRate };

    const selectedAccCode = formData.acc_code ? formData.acc_code.split(' - ')[0] : '101';

    const newV = {
      id: Date.now(),
      v_no: voucherNo,
      voucher_no: voucherNo,
      v_type: formData.v_type,
      voucher_type: formData.v_type,
      party: formData.party,
      party_name: formData.party,
      amount: parseFloat(formData.amount) || 0,
      currency: vCurrCode,
      exchange_rate: vRate,
      base_amount: vBaseObj.base_amount,
      date: formData.date || TODAY_STR_ISO,
      notes: formData.notes,
      pay_method: formData.pay_method,
      acc_code: formData.acc_code || '101 - الصندوق الرئيسي',
      customer_id: formData.v_type === 'سند قبض' ? formData.party : '',
      supplier_id: formData.v_type === 'سند صرف' ? formData.party : '',
      payment_method: formData.pay_method,
      account_id: formData.acc_code || '101 - الصندوق الرئيسي',
      payment_source: formData.acc_code || '101 - الصندوق الرئيسي',
      date_created: formData.date || TODAY_STR_ISO
    };
    
    try {
      const res = await callGAS('addVoucher', newV);
      if (res.status === 'success' || res.status === 200 || !res.error || res.id) {
        if (setVouchers) setVouchers([newV, ...(vouchers || [])]);
        
        // ── ترحيل القيد المحاسبي المزدوج المتوازن بالريال اليمني ──
        const isReceipt = newV.v_type === 'سند قبض';
        const debitAcc = isReceipt ? selectedAccCode : '201'; // سند قبض: مدين الصندوق/البنك، سند صرف: مدين ذمم الموردين
        const creditAcc = isReceipt ? '104' : selectedAccCode; // سند قبض: دائن ذمم العملاء، سند صرف: دائن الصندوق/البنك

        callGAS('addJournalEntry', {
            id: Date.now() + 1,
            transaction_id: `TX-VCH-${voucherNo}`,
            entry_no: 'AUTO-VCH-' + voucherNo,
            debit: debitAcc,
            credit: creditAcc,
            amount: newV.amount,
            currency: vCurrCode,
            exchange_rate: vRate,
            base_amount: vBaseObj.base_amount,
            ref_type: isReceipt ? 'RECEIPT_VOUCHER' : 'PAYMENT_VOUCHER',
            ref_id: voucherNo,
            date: newV.date,
            notes: `قيد آلي: ${newV.notes || newV.v_type + ' - ' + newV.party}`
        }).catch(e => console.error(e));

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

        showToast('تم حفظ السند وترحيله بنجاح 🧾');
        setFormData(prev => ({...prev, amount: '', notes: '', v_no: '', party: ''}));
        setSelectedCustomer('');
        setSelectedOrder('');
      } else {
        showToast('حدث خطأ أثناء الحفظ', 'error');
      }
    } catch (err) {
      if (setVouchers) setVouchers([newV, ...(vouchers || [])]);
      showToast('تم الحفظ محلياً ⚡');
    }
  };

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#009FAE] focus:ring-2 focus:ring-[#E2F5F7] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* نافذة معاينة وطباعة تفاصيل السند المالي */}
      {viewVoucher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setViewVoucher(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-[#E8E5EA] space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{viewVoucher.isReceipt ? '📥' : '📤'}</span>
                <div>
                  <h3 className="font-bold text-sm text-[#25232A]">تفاصيل {viewVoucher.v_type}</h3>
                  <span className="text-xs font-mono font-bold text-[#8F2A87]">{viewVoucher.v_no}</span>
                </div>
              </div>
              <button onClick={() => setViewVoucher(null)} className="text-[#6F6B75] hover:text-[#25232A] font-bold p-1">✕</button>
            </div>

            <div className="space-y-3 bg-[#FAFAFB] p-4 rounded-xl border border-[#E8E5EA] text-xs">
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-semibold">{viewVoucher.isReceipt ? 'استلمنا من:' : 'صرفنا إلى (المستفيد):'}</span>
                <span className="font-bold text-[#25232A] text-sm">{viewVoucher.party}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-semibold">المبلغ:</span>
                <span className="font-bold font-mono text-base text-[#007F8C]">
                  {viewVoucher.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {viewVoucher.currency}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-semibold">طريقة الدفع:</span>
                <span className="font-bold text-[#25232A]">{viewVoucher.pay_method}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-semibold">الحساب المالي:</span>
                <span className="font-bold text-[#25232A]">{viewVoucher.account}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-semibold">تاريخ السند:</span>
                <span className="font-mono text-[#25232A]">{viewVoucher.date}</span>
              </div>
              <div>
                <span className="text-[#6F6B75] font-semibold block mb-1">البيان والملاحظات:</span>
                <p className="text-[#25232A] font-medium bg-white p-2 rounded-lg border border-[#E8E5EA]">{viewVoucher.notes}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => window.print()} 
                className="flex-1 py-2.5 bg-[#009FAE] hover:bg-[#007F8C] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🖨️</span>
                <span>طباعة السند</span>
              </button>
              <button 
                onClick={() => setViewVoucher(null)} 
                className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] font-bold text-xs rounded-xl border border-[#E8E5EA] cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── بطاقة إحصائيات السندات المالية ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#E2F5F7] text-[#007F8C] border border-[#C5ECF0] flex items-center justify-center text-xl font-bold shadow-xs">
              🧾
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#25232A]">
                السندات المالية والقبض والصرف (Financial Vouchers & Cash Management)
              </h1>
              <p className="text-xs text-[#6F6B75] mt-0.5">
                إدارة سندات القبض وسندات الصرف وتتبع المدفوعات للموردين والمقبوضات من العملاء
              </p>
            </div>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#E8E5EA] bg-[#FAFAFB] divide-x divide-x-reverse divide-[#E8E5EA]">
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي السندات</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#25232A] mt-1 block">
              {(vouchers || []).length.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">سند</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي سندات القبض (مقبوضات)</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] mt-1 block">
              {totals.receipts.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">{currencyDisplay}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي سندات الصرف (مدفوعات)</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#D64545] mt-1 block">
              {totals.payments.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">{currencyDisplay}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">صافي الحركة النقدية</span>
            <span className={`text-xl font-extrabold font-mono tabular-nums mt-1 block ${totals.net >= 0 ? 'text-[#137333]' : 'text-[#D64545]'}`}>
              {totals.net.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">{currencyDisplay}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── نموذج إضافة سند مالي جديد ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden transition-all">
        <div className="px-6 py-4 border-b border-[#E8E5EA] flex items-center justify-between bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3">
            <span className="text-lg">{formData.v_type === 'سند قبض' ? '📥' : '📤'}</span>
            <div>
              <h2 className="text-sm font-bold text-[#25232A]">إضافة سند مالي جديد ({formData.v_type})</h2>
              <p className="text-[11px] text-[#6F6B75] font-normal">تسجيل المقبوضات والمدفوعات وربطها بالصناديق وشجرة الحسابات</p>
            </div>
          </div>
          <span className="text-xs text-[#6F6B75]">
            <span className="text-[#D64545] font-bold">*</span> الحقول الإلزامية
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
            <div>
              <label className={labelCls}>نوع السند <span className="text-[#D64545] font-bold">*</span></label>
              <select className={inputCls} value={formData.v_type} onChange={e => { setFormData({...formData, v_type: e.target.value}); setSelectedCustomer(''); setSelectedOrder(''); }}>
                <option value="سند قبض">سند قبض (استلام نقدية / حوالة)</option>
                <option value="سند صرف">سند صرف (دفع / مشتريات / مصاريف)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>رقم السند</label>
              <input type="text" className={inputCls + " font-mono"} placeholder="تلقائي..." value={formData.v_no} onChange={e => setFormData({...formData, v_no: e.target.value})} />
            </div>
            
            {formData.v_type === 'سند قبض' ? (
              <div className="sm:col-span-2">
                <label className={labelCls}>حساب الزبون / العميلة (استلمنا من) <span className="text-[#D64545] font-bold">*</span></label>
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
                <label className={labelCls}>صرفنا إلى (الطرف المستفيد / المورد) <span className="text-[#D64545] font-bold">*</span></label>
                <input type="text" required className={inputCls} placeholder="اسم المورد أو المستفيد..." value={formData.party} onChange={e => setFormData({...formData, party: e.target.value})} />
              </div>
            )}

            <div>
              <label className={labelCls}>المبلغ <span className="text-[#D64545] font-bold">*</span></label>
              <input type="number" step="0.01" required className={inputCls + " font-mono font-bold text-[#25232A]"} placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
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
                  const label = `${code} - ${name}`;
                  return <option key={code} value={label}>{label}</option>;
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
            <button type="submit" className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs text-white bg-[#009FAE] hover:bg-[#007F8C] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer">
              <Icons.Check className="w-4 h-4" />
              <span>حفظ السند المالي 💾</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── جدول سجل السندات المالية ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <h3 className="font-bold text-sm text-[#25232A]">سجل السندات المالية</h3>
            <span className="text-xs bg-[#E2F5F7] text-[#007F8C] font-bold px-2.5 py-0.5 rounded-full font-mono">{filteredVouchers.length}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-semibold text-[#25232A] outline-none"
            >
              <option value="الكل">جميع السندات</option>
              <option value="سند قبض">سندات القبض (مقبوضات)</option>
              <option value="سند صرف">سندات الصرف (مدفوعات)</option>
            </select>

            <div className="relative flex-1 sm:w-72">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-3 pr-8 h-10 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-medium w-full focus:bg-white focus:border-[#009FAE] outline-none"
                placeholder="بحث برقم السند أو اسم الطرف..."
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] text-xs pointer-events-none">🔍</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
          {filteredVouchers.length === 0 ? (
            <div className="text-center py-12 text-[#6F6B75] text-xs font-medium">لا توجد سندات مسجلة تطابق البحث 🧾</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="px-4 py-3 text-right">النوع</th>
                  <th className="px-4 py-3 text-right">رقم السند</th>
                  <th className="px-4 py-3 text-right">الطرف (المستفيد / العميل)</th>
                  <th className="px-4 py-3 text-right">المبلغ</th>
                  <th className="px-4 py-3 text-right">طريقة الدفع</th>
                  <th className="px-4 py-3 text-right">الحساب المالي</th>
                  <th className="px-4 py-3 text-right">التاريخ</th>
                  <th className="px-4 py-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {filteredVouchers.map(v => (
                  <tr key={v.id} className="hover:bg-[#FAFAFB] transition-colors">
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold border ${v.isReceipt ? 'bg-[#E2F5F7] text-[#007F8C] border-[#C5ECF0]' : 'bg-rose-50 text-[#D64545] border-rose-200'}`}>
                        {v.v_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#8F2A87]">{v.v_no}</td>
                    <td className="px-4 py-3 font-bold text-[#25232A]">{v.party}</td>
                    <td className="px-4 py-3 font-bold font-mono tabular-nums text-[#25232A]">
                      {v.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-medium text-[#6F6B75] font-sans">{v.currency}</span>
                    </td>
                    <td className="px-4 py-3 text-[#25232A] font-medium">{v.pay_method}</td>
                    <td className="px-4 py-3 text-[#6F6B75] text-[11px] font-mono">{v.account}</td>
                    <td className="px-4 py-3 text-[#6F6B75] font-mono">{v.date}</td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => setViewVoucher(v)} 
                        className="px-2.5 py-1 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#007F8C] border border-[#E8E5EA] rounded-lg font-bold text-[11px] transition cursor-pointer"
                      >
                        👁️ عرض
                      </button>
                    </td>
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
