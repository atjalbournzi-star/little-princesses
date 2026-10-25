/**
 * WorkerAssignModal.jsx - نافذة تعيين أوامر التشغيل والإنتاج الذكي (Dual Mode Orchestrator)
 * Little Princesses ERP - Production Floor Architecture
 */

function WorkerAssignModal({
  form = {}, setForm, orders = [], employees = [], customers = [], products = [],
  fabricInventory = [], stages = [], handleOrderSelect, handleStageEmpChange,
  handleStageChange, handleProductionTypeChange, handleProductChange,
  handleSizeChange, selectLatestCustomer, handleSubmit, setModelPreviewData,
  showToast, showOrderForm: propShowOrderForm, setShowOrderForm: propSetShowOrderForm
}) {
  const safeForm = form || {};
  const isReadyToWear = safeForm.production_type === 'ready_to_wear';
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [internalShowOrderForm, setInternalShowOrderForm] = React.useState(false);

  const showOrderForm = propShowOrderForm !== undefined ? propShowOrderForm : internalShowOrderForm;
  const setShowOrderForm = propSetShowOrderForm || setInternalShowOrderForm;

  React.useEffect(() => {
    if (safeForm.order_no || safeForm.product_id) setShowOrderForm(true);
  }, [safeForm.order_no, safeForm.product_id]);

  const FormFieldsComponent = window.JobOrderFormFields || (typeof JobOrderFormFields !== 'undefined' ? JobOrderFormFields : null);
  const WagesMatrixComponent = window.StageWagesMatrix || (typeof StageWagesMatrix !== 'undefined' ? StageWagesMatrix : null);
  const FabricCardComponent = window.FabricDeductionCard || (typeof FabricDeductionCard !== 'undefined' ? FabricDeductionCard : null);

  return (
    <div id="factory-order-form-container" data-factory-form="true" className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden select-none text-right">
      {/* Header with Dual Mode Toggle & Collapse Switch */}
      <div className="h-8 min-h-[32px] px-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50 dark:bg-[#0F172A]">
        <div onClick={() => setShowOrderForm(!showOrderForm)} className="flex items-center gap-2 cursor-pointer select-none group">
          <svg className="w-3.5 h-3.5 text-pink-500 animate-scissor shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879a3 3 0 11-4.242-4.242 3 3 0 014.242 0L12 12zm0 0L9.121 9.121a3 3 0 10-4.242 4.242 3 3 0 004.242 0L12 12z" />
          </svg>
          <span className="text-[11.5px] font-bold text-slate-800 dark:text-white group-hover:text-pink-500 transition">أمر تشغيل وتفصيل جديد</span>
          <span className="text-[9.5px] font-bold text-pink-600 dark:text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/30 flex items-center gap-1">
            <svg className={`w-2.5 h-2.5 transition-transform duration-200 ${showOrderForm ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            <span>{showOrderForm ? 'طي' : 'فتح'}</span>
          </span>
        </div>

        {/* Dual Mode Switcher */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-200 dark:bg-slate-900 p-0.5 rounded-md border border-slate-300 dark:border-slate-800 text-xs font-bold">
            <button type="button" onClick={() => { setShowOrderForm(true); if (handleProductionTypeChange) handleProductionTypeChange('bespoke'); else setForm(p => ({ ...p, production_type: 'bespoke' })); }} className={`h-5 px-2 rounded text-[10px] font-semibold transition cursor-pointer flex items-center gap-1 ${!isReadyToWear ? 'bg-pink-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>تفصيل خاص</span>
            </button>
            <button type="button" onClick={() => { setShowOrderForm(true); if (handleProductionTypeChange) handleProductionTypeChange('ready_to_wear'); else setForm(p => ({ ...p, production_type: 'ready_to_wear' })); }} className={`h-5 px-2 rounded text-[10px] font-semibold transition cursor-pointer flex items-center gap-1 ${isReadyToWear ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              <span>جاهز</span>
            </button>
          </div>

          {!isReadyToWear && (
            <button type="button" onClick={() => { setShowOrderForm(true); if (selectLatestCustomer) selectLatestCustomer(); }} className="h-5 px-1.5 rounded bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 font-medium text-[10px] border border-purple-700/40 transition flex items-center gap-1 cursor-pointer">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              <span>آخر زبون</span>
            </button>
          )}
        </div>
      </div>

      {showOrderForm && (
        <form onSubmit={e => { if (e && e.preventDefault) e.preventDefault(); if (typeof handleSubmit === 'function') handleSubmit(e); }} className="p-2.5 space-y-2 border-t border-slate-800/80">
          {/* Form Fields Component (Includes Unified Financial Strip) */}
          {FormFieldsComponent && (
            <FormFieldsComponent
              form={safeForm} setForm={setForm} orders={orders} employees={employees}
              products={products} stages={stages} customers={customers} fabricInventory={fabricInventory}
              handleOrderSelect={handleOrderSelect} handleStageEmpChange={handleStageEmpChange}
              handleStageChange={handleStageChange} handleProductChange={handleProductChange}
              handleSizeChange={handleSizeChange} setModelPreviewData={setModelPreviewData}
            />
          )}

          {/* Stage Wages Matrix Component */}
          {WagesMatrixComponent && (
            <WagesMatrixComponent
              form={safeForm} setForm={setForm} employees={employees}
              handleStageEmpChange={handleStageEmpChange} showToast={showToast}
            />
          )}

          {/* Fabric Deduction & Specs Component */}
          {FabricCardComponent && (
            <FabricCardComponent
              form={safeForm} setForm={setForm} fabricInventory={fabricInventory}
              customers={customers}
            />
          )}

          {/* Progress & Submit Strip */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2.5">
            <div className="w-full sm:flex-1">
              <div className="flex justify-between text-[11px] mb-1 font-bold text-slate-800 dark:text-white">
                <span>نسبة الإنجاز الحالية في المشغل</span>
                <span className="text-pink-600 dark:text-pink-400 font-mono">{safeForm.progress || 0}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-2 border border-slate-300 dark:border-slate-800" dir="ltr">
                <div className="bg-pink-500 h-2 rounded-full transition-all duration-500" style={{ width: `${safeForm.progress || 0}%` }}></div>
              </div>
            </div>
            <button
              type="button" disabled={isSubmitting}
              onClick={async (e) => {
                if (e && e.preventDefault) e.preventDefault();
                if (isSubmitting) return;
                setIsSubmitting(true);
                try {
                  if (typeof handleSubmit === 'function') await handleSubmit(e);
                  setShowOrderForm(false);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="w-full sm:w-auto px-5 py-2 rounded-lg font-bold text-xs text-white bg-pink-600 hover:bg-pink-700 transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>جاري الحفظ واقتطاع القماش...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  <span>حفظ واعتماد أمر التشغيل واقتطاع القماش</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

window.WorkerAssignModal = WorkerAssignModal;
