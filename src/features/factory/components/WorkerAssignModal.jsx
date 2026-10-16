/**
 * WorkerAssignModal.jsx - نافذة تعيين أوامر التشغيل والإنتاج الذكي (Dual Mode Orchestrator)
 * Little Princesses ERP - Production Floor Architecture
 */

function WorkerAssignModal({
  form, setForm, orders = [], employees = [], customers = [], products = [],
  fabricInventory = [], stages = [], handleOrderSelect, handleStageEmpChange,
  handleStageChange, handleProductionTypeChange, handleProductChange,
  handleSizeChange, selectLatestCustomer, handleSubmit, setModelPreviewData,
  showToast, showOrderForm: propShowOrderForm, setShowOrderForm: propSetShowOrderForm
}) {
  const isReadyToWear = form.production_type === 'ready_to_wear';
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [internalShowOrderForm, setInternalShowOrderForm] = React.useState(false);

  const showOrderForm = propShowOrderForm !== undefined ? propShowOrderForm : internalShowOrderForm;
  const setShowOrderForm = propSetShowOrderForm || setInternalShowOrderForm;

  React.useEffect(() => {
    if (form.order_no || form.product_id) setShowOrderForm(true);
  }, [form.order_no, form.product_id]);

  const FormFieldsComponent = window.JobOrderFormFields;
  const WagesMatrixComponent = window.StageWagesMatrix;
  const FabricCardComponent = window.FabricDeductionCard;

  return (
    <div className="bg-[#111C38] rounded-xl border border-slate-700/80 shadow-lg overflow-hidden select-none text-right">
      {/* Header with Dual Mode Toggle & Collapse Switch */}
      <div className="px-3.5 py-2 border-b border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-2 bg-[#0F172A]">
        <div onClick={() => setShowOrderForm(!showOrderForm)} className="flex items-center gap-2 cursor-pointer select-none group">
          <span className="text-pink-400 text-sm">✂️</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-white group-hover:text-pink-400 transition">أمر تشغيل وتفصيل جديد (Bespoke & RTW)</h2>
              <span className="text-[10px] font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-md border border-pink-500/30">
                {showOrderForm ? '▲ طي' : '▼ فتح النموذج'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">اضغط هنا للفتح أو الطي لعرض لوحة التتبع الحية بكامل الشاشة 👑</p>
          </div>
        </div>

        {/* Dual Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs font-bold">
            <button type="button" onClick={() => { setShowOrderForm(true); if (handleProductionTypeChange) handleProductionTypeChange('bespoke'); else setForm(p => ({ ...p, production_type: 'bespoke' })); }} className={`h-6 px-2 rounded-md text-[10.5px] transition cursor-pointer flex items-center gap-1 ${!isReadyToWear ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <span>👑</span><span>تفصيل خاص (Bespoke)</span>
            </button>
            <button type="button" onClick={() => { setShowOrderForm(true); if (handleProductionTypeChange) handleProductionTypeChange('ready_to_wear'); else setForm(p => ({ ...p, production_type: 'ready_to_wear' })); }} className={`h-6 px-2 rounded-md text-[10.5px] transition cursor-pointer flex items-center gap-1 ${isReadyToWear ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <span>🏭</span><span>جاهز (Ready-to-Wear)</span>
            </button>
          </div>

          {!isReadyToWear && (
            <button type="button" onClick={() => { setShowOrderForm(true); if (selectLatestCustomer) selectLatestCustomer(); }} className="h-6 px-2 rounded-md bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 font-bold text-[10.5px] border border-purple-800/40 transition flex items-center gap-1 cursor-pointer">
              <span>⚡ آخر زبون</span>
            </button>
          )}
        </div>
      </div>

      {showOrderForm && (
        <form onSubmit={e => { if (e && e.preventDefault) e.preventDefault(); if (typeof handleSubmit === 'function') handleSubmit(e); }} className="p-3 space-y-2.5 border-t border-slate-800/80">
          {/* Form Fields Component */}
          {FormFieldsComponent && (
            <FormFieldsComponent
              form={form} setForm={setForm} orders={orders} employees={employees}
              products={products} stages={stages} customers={customers} fabricInventory={fabricInventory}
              handleOrderSelect={handleOrderSelect} handleStageEmpChange={handleStageEmpChange}
              handleStageChange={handleStageChange} handleProductChange={handleProductChange}
              handleSizeChange={handleSizeChange} setModelPreviewData={setModelPreviewData}
            />
          )}

          {/* Financial Summary Card (Bespoke Mode Only) */}
          {!isReadyToWear && Boolean(form.order_no || form.customer || (form.total_amount && form.total_amount > 0) || (form.total_price && form.total_price > 0)) && (() => {
            const selectedOrder = (orders || []).find(o => String(o.order_no || o.id) === String(form.order_no || form.id));
            const order = selectedOrder || form || {};
            const tot = parseFloat(order.total_amount ?? order.total_price ?? order.grand_total ?? order.total ?? order.price ?? order.base_amount ?? form.total_amount ?? form.total_price ?? 0) || 0;
            const pd = parseFloat(order.paid_amount ?? order.advance_paid ?? order.paid ?? order.deposit ?? order.deposit_amount ?? order.paid_total ?? form.paid_amount ?? form.advance_paid ?? 0) || 0;
            const rem = Math.max(0, tot - pd);
            const isPaid = rem <= 0 && tot > 0, isPartial = pd > 0 && rem > 0;
            const pct = tot > 0 ? Math.min(100, Math.round((pd / tot) * 100)) : 0;
            const curr = order.currency || form.currency || 'YER';
            const currLabel = (curr === 'YER' || curr === 'ريال') ? 'ر.ي' : (curr === 'SAR' ? 'ر.س' : (curr === 'USD' ? '$' : curr));

            return (
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-white">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800 flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>💳</span><span>موقف سداد الفستان</span>
                    <span className="text-[10px] text-pink-400 bg-pink-500/10 px-1.5 py-0.2 rounded border border-pink-500/30">خاص للإدارة 🔒</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] text-slate-300">نسبة السداد: <strong className="font-mono text-cyan-400">{pct}%</strong></span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isPaid ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' : (isPartial ? 'bg-amber-950/60 text-amber-300 border-amber-800' : 'bg-rose-950/60 text-rose-300 border-rose-800')}`}>
                      {isPaid ? '✅ خالص' : (isPartial ? '⏳ عربون' : '⚠️ غير مسدد')}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-1.5 bg-[#111C38] rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">الإجمالي</span>
                    <span className="font-mono font-bold text-white">{tot.toLocaleString()} <span className="text-[9px] text-slate-400">{currLabel}</span></span>
                  </div>
                  <div className="p-1.5 bg-[#111C38] rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">العربون</span>
                    <span className="font-mono font-bold text-cyan-400">{pd.toLocaleString()} <span className="text-[9px] text-slate-400">{currLabel}</span></span>
                  </div>
                  <div className="p-1.5 bg-[#111C38] rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">المتبقي</span>
                    <span className={`font-mono font-bold ${rem > 0 ? 'text-pink-400' : 'text-emerald-400'}`}>{rem.toLocaleString()} <span className="text-[9px] text-slate-400">{currLabel}</span></span>
                  </div>
                  <div className="p-1.5 bg-[#111C38] rounded-lg border border-slate-800 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-emerald-400">{isPaid ? 'تسليم مباشر' : 'تحصيل عند التسليم'}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Stage Wages Matrix Component */}
          {WagesMatrixComponent && (
            <WagesMatrixComponent
              form={form} setForm={setForm} employees={employees}
              handleStageEmpChange={handleStageEmpChange} showToast={showToast}
            />
          )}

          {/* Fabric Deduction & Specs Component */}
          {FabricCardComponent && (
            <FabricCardComponent
              form={form} setForm={setForm} fabricInventory={fabricInventory}
              customers={customers}
            />
          )}

          {/* Progress & Submit Strip */}
          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="w-full sm:flex-1">
              <div className="flex justify-between text-[11px] mb-1 font-bold text-white">
                <span>نسبة الإنجاز الحالية في المشغل</span>
                <span className="text-pink-400 font-mono">{form.progress}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-800" dir="ltr">
                <div className="bg-pink-500 h-2 rounded-full transition-all duration-500" style={{ width: `${form.progress}%` }}></div>
              </div>
            </div>
            <button
              type="button" disabled={isSubmitting}
              onClick={async (e) => {
                if (e && e.preventDefault) e.preventDefault();
                if (isSubmitting) return;
                setIsSubmitting(true);
                try { if (typeof handleSubmit === 'function') await handleSubmit(e); } finally { setIsSubmitting(false); }
              }}
              className="w-full sm:w-auto px-6 py-2 rounded-lg font-bold text-xs text-white bg-pink-600 hover:bg-pink-700 transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <span>جاري الحفظ واقتطاع القماش... ⏳</span> : <span>✓ حفظ واعتماد أمر التشغيل واقتطاع القماش 🚀</span>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

window.WorkerAssignModal = WorkerAssignModal;
