const { useState, useEffect, useMemo, useCallback, useRef } = React;
// ============================================================
// Factory.jsx - قسم المتابعة والورشة (Live Pipeline) v3.0
// Features: Auto-Cascade, Live Progress, Inventory Sync
// ============================================================

function Factory({ factory = [], setFactory, employees = [], orders = [], products = [], inventory = [], setInventory, customers = [], showToast }) {
  const FACTORY_STAGES = [
    'القص والتحضير ✂️',
    'مرحلة الخياطة 🪡',
    'الفحص والتشطيب النهائي 🔍',
    'جاهز للتسليم 📦'
  ];

  const STAGE_PROGRESS = {
    'القص والتحضير ✂️': 25,
    'مرحلة الخياطة 🪡': 50,
    'الفحص والتشطيب النهائي 🔍': 75,
    'جاهز للتسليم 📦': 100
  };

  const [formData, React_useState] = typeof React !== 'undefined' ? [React.useState, React.useState] : [useState, useState];
  
  const [form, setForm] = React_useState({
    order_no: '', customer: '', product: '', tailor: '', stage: FACTORY_STAGES[0], progress: '25', start_date: TODAY_STR_ISO, due_date: ''
  });
  const [selectedJobCustomer, setSelectedJobCustomer] = React_useState(null);

  // Calculate 4 days from a date string
  const addDays = (dateStr, days) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const handleOrderSelect = (e) => {
    const val = e.target.value;
    const ord = orders.find(o => o.order_no === val);
    if (ord) {
      const existing = factory.find(f => f.order_no === val);
      if (existing) {
        setForm({
          order_no: val,
          customer: existing.customer || existing.customer_name || `${ord.customer_name} ${ord.child_name ? '- ' + ord.child_name : ''}`,
          product: existing.product || existing.product_name || ord.product_name,
          tailor: existing.tailor || '',
          stage: existing.stage || FACTORY_STAGES[0],
          progress: existing.progress || STAGE_PROGRESS[existing.stage || FACTORY_STAGES[0]],
          start_date: existing.start_date || TODAY_STR_ISO,
          due_date: existing.due_date || addDays(ord.order_date || TODAY_STR_ISO, 4)
        });
      } else {
        setForm({
          ...form,
          order_no: val,
          customer: `${ord.customer_name} ${ord.child_name ? '- ' + ord.child_name : ''}`,
          product: ord.product_name,
          due_date: addDays(ord.order_date || TODAY_STR_ISO, 4)
        });
      }
    } else {
      setForm({ ...form, order_no: val, customer: '', product: '', due_date: '' });
    }
  };

  const handleStageChange = (e) => {
    const stage = e.target.value;
    setForm({ ...form, stage, progress: STAGE_PROGRESS[stage] || 0 });
  };

  const loadIntoForm = (f) => {
    setForm({
      order_no: f.order_no,
      customer: f.customer || f.customer_name || '',
      product: f.product || f.product_name || '',
      tailor: f.tailor || '',
      stage: f.stage || FACTORY_STAGES[0],
      progress: f.progress || 0,
      start_date: f.start_date || TODAY_STR_ISO,
      due_date: f.due_date || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.order_no) return showToast('يرجى اختيار الطلب', 'error');
    if (!form.tailor) return showToast('يرجى تحديد الخياط', 'error');

    // 1. Inventory Deduction Logic
    if (form.stage === 'القص والتحضير ✂️') {
      const pDef = products.find(p => p.name === form.product);
      if (pDef && pDef.fabric_name && pDef.yards_used) {
         const confirmDeduct = window.confirm(`هل ترغب بخصم ${pDef.yards_used} متر من قماش (${pDef.fabric_name}) من المخزون لهذا الطلب؟`);
         if (confirmDeduct) {
           try {
             const invRes = await callGAS('updateInventoryQty', { item_name: pDef.fabric_name, qty_to_deduct: parseFloat(pDef.yards_used) });
             if (invRes.success) {
                showToast(`تم خصم ${pDef.yards_used} متر من المخزون بنجاح ✅`);
                if (setInventory) {
                  setInventory(inventory.map(inv => inv.item_name === pDef.fabric_name ? { ...inv, qty: invRes.new_qty, total_value: invRes.new_total } : inv));
                }
             } else {
                showToast(invRes.message || 'فشل خصم المخزون', 'error');
             }
           } catch(err) {
             showToast('حدث خطأ أثناء الاتصال بالمخزون', 'error');
           }
         }
      }
    }

    const existing = factory.find(f => f.order_no === form.order_no);
    const newF = { 
      id: existing ? existing.id : Date.now(), 
      ...form,
      customer_name: form.customer,
      product_name: form.product
    };
    
    try {
      const res = await callGAS('updateFactory', newF);
      if (res.status === 'success' || res.id) {
        if (existing) {
          setFactory(factory.map(f => f.order_no === form.order_no ? newF : f));
        } else {
          setFactory([newF, ...factory]);
        }
        showToast('تم تحديث حالة المشغل 🚀');
        
        if (form.stage === 'الفحص والتشطيب النهائي 🔍' || form.stage === 'جاهز للتسليم 📦') {
           showToast('جاهز لاحتساب الأجر في مسير الرواتب 💸', 'success');
        }
      } else {
        showToast('حدث خطأ', 'error');
      }
    } catch (err) {
      showToast('فشل الاتصال بالخادم', 'error');
    }
  };

  const getDaysLeft = (dueDate) => {
    if (!dueDate) return '—';
    const diff = new Date(dueDate) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return <span className="text-rose-600 font-bold">متأخر {-days} يوم</span>;
    if (days === 0) return <span className="text-amber-600 font-bold">التسليم اليوم!</span>;
    return <span className="text-emerald-600 font-bold">متبقي {days} يوم</span>;
  };

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all outline-none min-h-[42px]";
  const labelCls = "block text-xs font-semibold text-slate-700 mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* ── بطاقة تحديث حالة الورشة ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center text-sm font-bold">
              🧵
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                تحديث حالة الورشة وخطوط الإنتاج
              </h2>
              <p className="text-[11px] text-slate-500 font-normal">إسناد الطلب للخياط وتحديث مراحل القص والخياطة والتشطيب</p>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            <span className="text-rose-500 font-bold">*</span> الحقول الإلزامية
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>رقم الطلب والفاتورة <span className="text-rose-500 font-bold">*</span></label>
              <select className={inputCls} value={form.order_no} onChange={handleOrderSelect}>
                <option value="">-- اختر الطلب --</option>
                {orders.map(o => (
                  <option key={o.order_no} value={o.order_no}>{o.order_no} - {o.customer_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>العميلة / الطفلة</label>
              <input type="text" className={inputCls + " bg-slate-100 font-bold text-slate-700"} value={form.customer} readOnly />
            </div>
            <div>
              <label className={labelCls}>المنتج / الموديل</label>
              <input type="text" className={inputCls + " bg-slate-100 font-bold text-slate-700"} value={form.product} readOnly />
            </div>
            <div>
              <label className={labelCls}>الخياط / الفني <span className="text-rose-500 font-bold">*</span></label>
              <select className={inputCls} value={form.tailor} onChange={e => setForm({...form, tailor: e.target.value})}>
                <option value="">-- اختر الفني --</option>
                {employees?.filter(e => e.status === 'نشط').map(emp => (
                  <option key={emp.id} value={emp.name}>{emp.name} ({emp.type})</option>
                ))}
              </select>
            </div>
            
            <div className="lg:col-span-2">
              <label className={labelCls}>مرحلة الإنتاج الحالية</label>
              <select className={inputCls + " bg-purple-50 text-purple-900 font-bold border-purple-200"} value={form.stage} onChange={handleStageChange}>
                {FACTORY_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>تاريخ البدء</label>
              <input type="date" className={inputCls} value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
            </div>
            <div>
              <label className={labelCls}>موعد التسليم (آلي)</label>
              <input type="date" className={inputCls + " bg-slate-100 font-mono"} value={form.due_date} readOnly />
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="w-full sm:flex-1">
              <div className="flex justify-between text-xs mb-1.5 font-bold text-slate-700">
                <span>نسبة الإنجاز الحالية</span>
                <span className="text-purple-700 font-mono">{form.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 border border-slate-200" dir="ltr">
                <div className="bg-purple-700 h-2.5 rounded-full transition-all duration-500" style={{width: `${form.progress}%`}}></div>
              </div>
            </div>
            <button type="submit" className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs text-white bg-purple-700 hover:bg-purple-800 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              <span>🚀 تحديث وحفظ الحالة</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── لوحة التتبع الحية للورشة ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900">لوحة التتبع الحية للورشة (Live Pipeline)</h3>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono font-semibold">{factory.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="px-3.5 py-3 text-right">الطلب والعميل</th>
                <th className="px-3.5 py-3 text-right">الموديل والخياط</th>
                <th className="px-3.5 py-3 text-right w-1/4">حالة الإنجاز</th>
                <th className="px-3.5 py-3 text-center">الوقت المتبقي</th>
                <th className="px-3.5 py-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {factory.length === 0 ? (
                <tr><td colSpan="5" className="p-12 text-center text-slate-400 font-medium">لا توجد طلبيات جارية في الورشة 🧵</td></tr>
              ) : factory.map(f => (
                <tr key={f.id || f.order_no} className="hover:bg-purple-50/30 transition-colors">
                  <td className="px-3.5 py-3">
                    <div className="font-bold text-purple-700 font-mono text-[11px]">{f.order_no}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{f.customer || f.customer_name}</div>
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="font-bold text-slate-900">{f.product || f.product_name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">بواسطة: {f.tailor || 'غير محدد'}</div>
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="flex justify-between text-[11px] mb-1 font-semibold">
                      <span className="text-slate-700">{f.stage}</span>
                      <span className="text-purple-700 font-mono font-bold">{f.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 border border-slate-200" dir="ltr">
                      <div className={`h-2 rounded-full transition-all duration-500 ${f.progress == 100 ? 'bg-emerald-500' : 'bg-purple-600'}`} style={{width: `${f.progress}%`}}></div>
                    </div>
                  </td>
                  <td className="px-3.5 py-3 text-center text-[11px]">
                    {getDaysLeft(f.due_date)}
                  </td>
                  <td className="px-3.5 py-3 text-center">
                    <div className="flex gap-1.5 justify-center">
                      <button onClick={() => loadIntoForm(f)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                        تحديث ⚙️
                      </button>
                      <button 
                        onClick={() => {
                          const ord = orders.find(o => o.order_no === f.order_no);
                          if (ord) {
                            const c = customers.find(c => (c.name || c.customer_name || '').trim() === (ord.customer_name || '').trim());
                            if (c) {
                              c.customer_id = f.order_no;
                              setSelectedJobCustomer(c);
                            } else {
                              showToast('لم يتم العثور على ملف العميلة', 'error');
                            }
                          }
                        }}
                        className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                        بطاقة التشغيل 📋
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selectedJobCustomer && typeof JobCardModal !== 'undefined' && (
        <JobCardModal customer={selectedJobCustomer} onClose={() => setSelectedJobCustomer(null)} />
      )}
    </div>
  );
}
