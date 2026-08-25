const { useState, useEffect, useMemo, useCallback, useRef } = React;

function Factory({ factory = [], setFactory, employees = [], orders = [], products = [], inventory = [], setInventory, customers = [], showToast }) {
  const FACTORY_STAGES = [
    'القص والتحضير ✂️',
    'مرحلة الخياطة 🪡',
    'التطريز والشك ✨',
    'الفحص والتشطيب النهائي 🔍',
    'جاهز للتسليم 📦'
  ];

  const STAGE_PROGRESS = {
    'القص والتحضير ✂️': 20,
    'مرحلة الخياطة 🪡': 40,
    'التطريز والشك ✨': 60,
    'الفحص والتشطيب النهائي 🔍': 80,
    'جاهز للتسليم 📦': 100
  };

  const [form, setForm] = useState({
    order_no: '', customer: '', product: '', tailor: '', stage: FACTORY_STAGES[0], progress: '20', start_date: TODAY_STR_ISO, due_date: ''
  });
  const [selectedJobCustomer, setSelectedJobCustomer] = useState(null);
  const [stageFilter, setStageFilter] = useState('الكل');
  const [search, setSearch] = useState('');

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
          progress: existing.progress || STAGE_PROGRESS[existing.stage || FACTORY_STAGES[0]] || 20,
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
      progress: f.progress || STAGE_PROGRESS[f.stage] || 20,
      start_date: f.start_date || TODAY_STR_ISO,
      due_date: f.due_date || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.order_no) return showToast('يرجى اختيار الطلب ⚠️', 'error');
    if (!form.tailor) return showToast('يرجى تحديد الخياط ⚠️', 'error');

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
        showToast('تم تحديث حالة المشغل سحابياً 🚀');
        
        if (form.stage === 'الفحص والتشطيب النهائي 🔍' || form.stage === 'جاهز للتسليم 📦') {
           showToast('جاهز لاحتساب الأجر في مسير الرواتب 💸', 'success');
        }
      } else {
        showToast('حدث خطأ', 'error');
      }
    } catch (err) {
      showToast('تم التحديث محلياً ⚡', 'warning');
      if (existing) {
        setFactory(factory.map(f => f.order_no === form.order_no ? newF : f));
      } else {
        setFactory([newF, ...factory]);
      }
    }
  };

  const getDaysLeft = (dueDate) => {
    if (!dueDate) return '—';
    const diff = new Date(dueDate) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return <span className="text-[#D64545] font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">متأخر {-days} يوم</span>;
    if (days === 0) return <span className="text-[#C97300] font-bold bg-[#FFF1DC] px-2 py-0.5 rounded-md border border-[#FFE4B9]">التسليم اليوم!</span>;
    return <span className="text-[#007F8C] font-bold bg-[#E2F5F7] px-2 py-0.5 rounded-md border border-[#C5ECF0]">متبقي {days} يوم</span>;
  };

  const filteredFactory = useMemo(() => {
    return (factory || []).filter(f => {
      const matchSearch = !search ||
        (f.order_no || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.customer || f.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.product || f.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.tailor || '').toLowerCase().includes(search.toLowerCase());
      const matchStage = stageFilter === 'الكل' || f.stage === stageFilter;
      return matchSearch && matchStage;
    });
  }, [factory, search, stageFilter]);

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* ── Studio Header & KPI Summary ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F2E7F3] text-[#8F2A87] border border-[#E5CEE7] flex items-center justify-center text-xl font-bold shadow-xs">
              <Icons.Scissors className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#25232A]">
                إدارة المعمل والمشغل وخطوط الإنتاج (Production Pipeline)
              </h1>
              <p className="text-xs text-[#6F6B75] mt-0.5">
                تتبع مراحل القص، الخياطة، التطريز، والتشطيب، وإسناد الطلبات للفنيين
              </p>
            </div>
          </div>
        </div>

        {/* ── 5 Stage Metric Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-[#E8E5EA] bg-[#FAFAFB] divide-x divide-x-reverse divide-[#E8E5EA]">
          {FACTORY_STAGES.map((stg) => {
            const count = factory.filter(f => f.stage === stg).length;
            return (
              <div key={stg} className="p-4 text-center">
                <span className="text-[11px] font-semibold text-[#6F6B75] block truncate">{stg}</span>
                <span className="text-base font-bold font-mono text-[#8F2A87] mt-0.5 block">{count} طلب</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── بطاقة تحديث حالة الورشة ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E5EA] flex items-center justify-between bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <h2 className="text-sm font-bold text-[#25232A] flex items-center gap-2">
            <span className="text-[#8F2A87]">🧵</span>
            تحديث وتعيين أوامر التشغيل والإنتاج
          </h2>
          <span className="text-xs text-[#6F6B75]">
            <span className="text-[#D64545] font-bold">*</span> الحقول الإلزامية
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4.5">
            <div>
              <label className={labelCls}>رقم الطلب والفاتورة <span className="text-[#D64545] font-bold">*</span></label>
              <select className={inputCls} value={form.order_no} onChange={handleOrderSelect}>
                <option value="">-- اختر الطلب --</option>
                {orders.map(o => (
                  <option key={o.order_no} value={o.order_no}>{o.order_no} - {o.customer_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>العميلة / الطفلة</label>
              <input type="text" className={inputCls + " bg-[#FAFAFB] font-bold text-[#25232A]"} value={form.customer} readOnly />
            </div>
            <div>
              <label className={labelCls}>المنتج / الموديل</label>
              <input type="text" className={inputCls + " bg-[#FAFAFB] font-bold text-[#25232A]"} value={form.product} readOnly />
            </div>
            <div>
              <label className={labelCls}>الخياط / الفني المسند إليه <span className="text-[#D64545] font-bold">*</span></label>
              <select className={inputCls} value={form.tailor} onChange={e => setForm({...form, tailor: e.target.value})}>
                <option value="">-- اختر الفني --</option>
                {employees?.filter(e => e.status === 'نشط').map(emp => (
                  <option key={emp.id} value={emp.name}>{emp.name} ({emp.type})</option>
                ))}
              </select>
            </div>
            
            <div className="lg:col-span-2">
              <label className={labelCls}>مرحلة الإنتاج الحالية</label>
              <select className={inputCls + " bg-[#F2E7F3] text-[#8F2A87] font-bold border-[#E5CEE7]"} value={form.stage} onChange={handleStageChange}>
                {FACTORY_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>تاريخ البدء</label>
              <input type="date" className={inputCls} value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
            </div>
            <div>
              <label className={labelCls}>موعد التسليم المتوقع</label>
              <input type="date" className={inputCls + " bg-[#FAFAFB] font-mono"} value={form.due_date} readOnly />
            </div>
          </div>
          
          <div className="pt-4 border-t border-[#E8E5EA] flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="w-full sm:flex-1">
              <div className="flex justify-between text-xs mb-1.5 font-bold text-[#25232A]">
                <span>نسبة الإنجاز الحالية في المشغل</span>
                <span className="text-[#8F2A87] font-mono">{form.progress}%</span>
              </div>
              <div className="w-full bg-[#FAFAFB] rounded-full h-2.5 border border-[#E8E5EA]" dir="ltr">
                <div className="bg-[#8F2A87] h-2.5 rounded-full transition-all duration-500" style={{width: `${form.progress}%`}}></div>
              </div>
            </div>
            <button type="submit" className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs text-white bg-[#8F2A87] hover:bg-[#73216C] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer">
              <Icons.Check className="w-4 h-4" />
              <span>تحديث وحفظ حالة أمر الإنتاج 🚀</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── لوحة التتبع الحية للورشة ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <h3 className="font-bold text-sm text-[#25232A]">لوحة التتبع الحية للورشة (Live Pipeline)</h3>
            <span className="text-xs bg-[#F2E7F3] text-[#8F2A87] font-bold px-2.5 py-0.5 rounded-full font-mono">{filteredFactory.length}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-semibold text-[#25232A] outline-none"
            >
              <option value="الكل">جميع المراحل</option>
              {FACTORY_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <div className="relative flex-1 sm:w-64">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-3 pr-8 h-10 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-medium w-full focus:bg-white focus:border-[#8F2A87] outline-none"
                placeholder="بحث برقم الطلب، العميلة، أو الخياط..."
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] text-xs pointer-events-none">🔍</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                <th className="px-4 py-3 text-right">الطلب والعميلة</th>
                <th className="px-4 py-3 text-right">الموديل والخياط</th>
                <th className="px-4 py-3 text-right w-1/4">مرحلة ونسبة الإنجاز</th>
                <th className="px-4 py-3 text-center">الوقت المتبقي</th>
                <th className="px-4 py-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5EA] bg-white">
              {filteredFactory.length === 0 ? (
                <tr><td colSpan="5" className="p-12 text-center text-[#6F6B75] font-medium">لا توجد طلبيات جارية في الورشة 🧵</td></tr>
              ) : filteredFactory.map(f => (
                <tr key={f.id || f.order_no} className="hover:bg-[#FAFAFB] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-[#8F2A87] font-mono text-[11.5px]">{f.order_no}</div>
                    <div className="text-[11px] text-[#6F6B75] mt-0.5">{f.customer || f.customer_name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-[#25232A]">{f.product || f.product_name}</div>
                    <div className="text-[11px] text-[#6F6B75] mt-0.5">بواسطة: {f.tailor || 'غير محدد'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-between text-[11px] mb-1 font-semibold">
                      <span className="text-[#25232A]">{f.stage}</span>
                      <span className="text-[#8F2A87] font-mono font-bold">{f.progress}%</span>
                    </div>
                    <div className="w-full bg-[#FAFAFB] rounded-full h-2 border border-[#E8E5EA]" dir="ltr">
                      <div className={`h-2 rounded-full transition-all duration-500 ${f.progress == 100 ? 'bg-[#009FAE]' : 'bg-[#8F2A87]'}`} style={{width: `${f.progress}%`}}></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-[11px]">
                    {getDaysLeft(f.due_date)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-1.5 justify-center">
                      <button onClick={() => loadIntoForm(f)} className="text-xs bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] font-bold px-3 py-1.5 rounded-lg transition border border-[#E8E5EA] cursor-pointer">
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
                        className="text-xs bg-[#F2E7F3] hover:bg-[#E5CEE7] text-[#8F2A87] font-bold px-3 py-1.5 rounded-lg transition border border-[#E5CEE7] cursor-pointer">
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
