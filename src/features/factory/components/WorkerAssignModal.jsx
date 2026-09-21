function WorkerAssignModal({
  form,
  setForm,
  orders = [],
  employees = [],
  customers = [],
  fabricInventory = [],
  stages = [],
  handleOrderSelect,
  handleStageEmpChange,
  handleStageChange,
  selectLatestCustomer,
  handleSubmit,
  showToast
}) {
  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  const WagesMatrixComponent = window.StageWagesMatrix;
  const FabricCardComponent = window.FabricDeductionCard;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
        <div className="flex items-center gap-2">
          <span className="text-[#8F2A87]">🧵</span>
          <h2 className="text-sm font-bold text-[#25232A]">تحديث وتعيين أوامر التشغيل والإنتاج</h2>
        </div>
        
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={selectLatestCustomer}
            className="px-3.5 py-1.5 rounded-xl bg-[#F2E7F3] hover:bg-[#E5CEE7] text-[#8F2A87] font-bold text-xs border border-[#E5CEE7] transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <span>⚡</span>
            <span>اختيار آخر زبون مسجل</span>
          </button>
          <span className="text-xs text-[#6F6B75]">
            <span className="text-[#D64545] font-bold">*</span> الحقول الإلزامية
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-1.5">
              <label className={labelCls + " mb-0"}>رقم الطلب والفاتورة <span className="text-[#D64545] font-bold">*</span></label>
              <span className="text-[10.5px] text-[#6F6B75]">({orders.length} طلبات متاحة)</span>
            </div>
            <select className={inputCls} value={form.order_no} onChange={handleOrderSelect}>
              <option value="">-- اختر الطلب المعمد أو أدخل مخصصاً --</option>
              {orders.map(o => (
                <option key={o.order_no || o.id} value={o.order_no || o.id}>
                  {o.order_no || o.id} - {o.customer_name || ''} {o.child_name ? `(الطفلة: ${o.child_name})` : ''} {o.product_name ? `[${o.product_name}]` : ''} {o.paid > 0 ? '🟢 مسدد العربون' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>اسم العميلة (الأم)</label>
            <input type="text" className={inputCls + " font-bold text-[#25232A]"} value={form.customer} onChange={e => setForm({...form, customer: e.target.value})} placeholder="اسم العميلة" />
          </div>
          <div>
            <label className={labelCls + " text-[#8F2A87]"}>اسم الطفلة (الأميرة)</label>
            <input type="text" className={inputCls + " bg-[#FDF8FE] font-bold text-[#8F2A87] border-[#E5CEE7]"} value={form.child_name} onChange={e => setForm({...form, child_name: e.target.value})} placeholder="اسم الطفلة" />
          </div>
          <div>
            <label className={labelCls}>المنتج / الموديل</label>
            <input type="text" className={inputCls + " font-bold text-[#25232A]"} value={form.product} onChange={e => setForm({...form, product: e.target.value})} placeholder="اسم الموديل والتصميم" />
          </div>
          <div>
            <label className={labelCls}>عدد الفساتين (الكمية)</label>
            <input 
              type="number" min="1" className={inputCls + " font-bold text-[#007F8C] font-mono text-center"} 
              value={form.quantity} 
              onChange={e => {
                const q = parseFloat(e.target.value) || 1;
                setForm(prev => ({
                  ...prev, quantity: q,
                  cut_meters: prev.cut_meters ? String((parseFloat(prev.cut_meters) / (prev.quantity || 1) * q).toFixed(1)) : prev.cut_meters
                }));
              }} 
            />
          </div>
          
          <div className="lg:col-span-2">
            <label className={labelCls}>الخياط / الفني المسند إليه <span className="text-[#D64545] font-bold">*</span></label>
            <select className={inputCls} value={form.tailor} onChange={e => setForm({...form, tailor: e.target.value})}>
              <option value="">-- اختر الفني المسؤول --</option>
              {employees?.filter(e => e.status === 'نشط' || !e.status).map(emp => (
                <option key={emp.id || emp.name} value={emp.name}>{emp.name} ({emp.job_title || emp.role || emp.type || 'فني مشغل'})</option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className={labelCls}>مرحلة الإنتاج الحالية</label>
            <select className={inputCls + " bg-[#F2E7F3] text-[#8F2A87] font-bold border-[#E5CEE7]"} value={form.stage} onChange={handleStageChange}>
              {stages.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>تاريخ البدء</label>
            <input type="date" lang="en-GB" dir="ltr" className={inputCls} value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
          </div>
          <div>
            <label className={labelCls}>موعد التسليم المتوقع</label>
            <input type="date" lang="en-GB" dir="ltr" className={inputCls + " font-mono"} value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
          </div>
        </div>

        {/* مصفوفة مواعيد وأجور مراحل الإنتاج */}
        {WagesMatrixComponent && (
          <WagesMatrixComponent
            form={form}
            setForm={setForm}
            employees={employees}
            handleStageEmpChange={handleStageEmpChange}
            showToast={showToast}
          />
        )}

        {/* خامة القماش واقتطاع الأمتار من المخزون */}
        {FabricCardComponent && (
          <FabricCardComponent
            form={form}
            setForm={setForm}
            fabricInventory={fabricInventory}
            customers={customers}
          />
        )}

        {/* شريط نسبة الإنجاز وزر الحفظ */}
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
            {window.Icons && window.Icons.Check ? <window.Icons.Check className="w-4 h-4" /> : <span>✓</span>}
            <span>تحديث وحفظ حالة أمر الإنتاج واقتطاع القماش 🚀</span>
          </button>
        </div>
      </form>
    </div>
  );
}

window.WorkerAssignModal = WorkerAssignModal;
