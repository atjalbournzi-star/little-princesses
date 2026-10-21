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
        <form onSubmit={e => { if (e && e.preventDefault) e.preventDefault(); if (typeof handleSubmit === 'function') handleSubmit(e); }} className="p-2.5 space-y-2 border-t border-slate-800/80">
          {/* Form Fields Component (Includes Unified Financial Strip) */}
          {FormFieldsComponent && (
            <FormFieldsComponent
              form={form} setForm={setForm} orders={orders} employees={employees}
              products={products} stages={stages} customers={customers} fabricInventory={fabricInventory}
              handleOrderSelect={handleOrderSelect} handleStageEmpChange={handleStageEmpChange}
              handleStageChange={handleStageChange} handleProductChange={handleProductChange}
              handleSizeChange={handleSizeChange} setModelPreviewData={setModelPreviewData}
            />
          )}

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
          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2.5">
            <div className="w-full sm:flex-1">
              <div className="flex justify-between text-[11px] mb-1 font-bold text-white">
                <span>نسبة الإنجاز الحالية في المشغل</span>
                <span className="text-pink-400 font-mono">{form.progress || 0}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-800" dir="ltr">
                <div className="bg-pink-500 h-2 rounded-full transition-all duration-500" style={{ width: `${form.progress || 0}%` }}></div>
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
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-bold text-xs text-white bg-pink-600 hover:bg-pink-700 transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
