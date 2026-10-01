/**
 * WorkerAssignModal.jsx - نافذة تعيين أوامر التشغيل والإنتاج الذكي (Dual Mode Orchestrator)
 * Little Princesses ERP - Production Floor Architecture
 */

function WorkerAssignModal({
  form,
  setForm,
  orders = [],
  employees = [],
  customers = [],
  products = [],
  fabricInventory = [],
  stages = [],
  handleOrderSelect,
  handleStageEmpChange,
  handleStageChange,
  handleProductionTypeChange,
  handleProductChange,
  handleSizeChange,
  selectLatestCustomer,
  handleSubmit,
  setModelPreviewData,
  showToast
}) {
  const isReadyToWear = form.production_type === 'ready_to_wear';

  const FormFieldsComponent = window.JobOrderFormFields;
  const WagesMatrixComponent = window.StageWagesMatrix;
  const FabricCardComponent = window.FabricDeductionCard;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
      {/* Header with Dual Mode Toggle */}
      <div className="px-6 py-4 border-b border-[#E8E5EA] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
        <div className="flex items-center gap-3">
          <span className="text-[#8F2A87] text-lg">🧵</span>
          <div>
            <h2 className="text-sm font-bold text-[#25232A]">أوامر التشغيل والإنتاج (Production Floor)</h2>
            <p className="text-[11px] text-[#6F6B75]">التمييز الذكي بين التفصيل المخصص والإنتاج العام الجاهز 👑</p>
          </div>
        </div>

        {/* Dual Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[#F2E7F3] p-1 rounded-xl border border-[#E5CEE7] text-xs font-bold">
            <button
              type="button"
              onClick={() => handleProductionTypeChange ? handleProductionTypeChange('bespoke') : setForm(p => ({ ...p, production_type: 'bespoke' }))}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${!isReadyToWear ? 'bg-[#8F2A87] text-white shadow-2xs' : 'text-[#6F6B75] hover:text-[#8F2A87]'}`}
            >
              <span>👑</span>
              <span>تفصيل خاص لعميل (Bespoke)</span>
            </button>
            <button
              type="button"
              onClick={() => handleProductionTypeChange ? handleProductionTypeChange('ready_to_wear') : setForm(p => ({ ...p, production_type: 'ready_to_wear' }))}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${isReadyToWear ? 'bg-[#007F8C] text-white shadow-2xs' : 'text-[#6F6B75] hover:text-[#007F8C]'}`}
            >
              <span>🏭</span>
              <span>إنتاج عام للمخزن (Ready-to-Wear)</span>
            </button>
          </div>

          {!isReadyToWear && (
            <button
              type="button"
              onClick={selectLatestCustomer}
              className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#8F2A87] font-bold text-xs border border-[#E5CEE7] transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>⚡</span>
              <span>آخر زبون</span>
            </button>
          )}
        </div>
      </div>

      <form
        onSubmit={e => {
          if (e && e.preventDefault) e.preventDefault();
          if (typeof handleSubmit === 'function') handleSubmit(e);
        }}
        className="p-6 space-y-5"
      >
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

        {/* Financial Summary Card (Bespoke Mode Only - Internal Admin View) */}
        {!isReadyToWear && Boolean(form.order_no || form.customer || (form.total_amount && form.total_amount > 0)) && (() => {
          const selectedOrder = (orders || []).find(o => String(o.order_no || o.id) === String(form.order_no || form.id));
          const order = selectedOrder || form || {};
          const tot = Number(order.total_amount ?? order.base_amount ?? 0);
          const pd = Number(order.paid_amount ?? order.advance_paid ?? 0);
          const rem = Number(order.remaining_balance ?? order.remaining_amount ?? order.remaining ?? 0);
          const isPaid = rem <= 0 && tot > 0, isPartial = pd > 0 && rem > 0;
          const pct = tot > 0 ? Math.min(100, Math.round((pd / tot) * 100)) : 0;
          const curr = order.currency || form.currency || 'YER';
          const currLabel = (curr === 'YER' || curr === 'ريال') ? 'ر.ي' : (curr === 'SAR' ? 'ر.س' : (curr === 'USD' ? '$' : curr));
          const delFee = Number(order.delivery_fee || 0);
          const subtotal = Number(order.subtotal ?? (tot - delFee));

          return (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50/70 via-white to-pink-50/70 border border-[#E5CEE7] space-y-3 shadow-2xs animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-[#F2E7F3] flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">💳</span>
                  <span className="text-xs font-bold text-[#25232A]">الملخص المالي وموقف سداد الفستان (خاص بالإدارة)</span>
                  <span className="text-[10px] font-bold text-[#8F2A87] bg-[#F2E7F3] px-2 py-0.5 rounded-full border border-[#E5CEE7]">سري 🔒</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#6F6B75]">نسبة السداد: <strong className="font-mono text-[#007F8C]">{pct}%</strong></span>
                  <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : (isPartial ? 'bg-amber-50 text-amber-800 border-amber-300' : (tot === 0 ? 'bg-gray-50 text-gray-700 border-gray-200' : 'bg-rose-50 text-rose-700 border-rose-200'))}`}>
                    {isPaid ? '✅ مسدد بالكامل (خالص)' : (isPartial ? '⏳ مسدد جزئياً (عربون)' : (tot === 0 ? '📝 بانتظار التسعير' : '⚠️ غير مسدد'))}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-white rounded-xl border border-[#E8E5EA] shadow-2xs">
                  <span className="text-[10.5px] font-semibold text-[#6F6B75] block mb-1">👗 سعر الفستان / الإجمالي</span>
                  <span className="font-mono font-black text-sm text-[#25232A] block">{tot.toLocaleString()} <span className="text-[10px] font-normal text-[#6F6B75]">{currLabel}</span></span>
                  {delFee > 0 && (
                    <div className="text-[9.5px] text-[#8F2A87] bg-purple-50 px-2 py-0.5 rounded-md mt-1 border border-purple-200 inline-block font-medium">
                      {subtotal.toLocaleString()} فستان + {delFee.toLocaleString()} توصيل
                    </div>
                  )}
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E8E5EA] shadow-2xs">
                  <span className="text-[10.5px] font-semibold text-[#6F6B75] block mb-1">💵 المبلغ الواصل (العربون)</span>
                  <span className="font-mono font-black text-sm text-[#007F8C] block">{pd.toLocaleString()} <span className="text-[10px] font-normal text-[#6F6B75]">{currLabel}</span></span>
                </div>
                <div className={`p-3 rounded-xl border shadow-2xs ${rem > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-[#E8E5EA]'}`}>
                  <span className={`text-[10.5px] font-semibold block mb-1 ${rem > 0 ? 'text-amber-900 font-bold' : 'text-[#6F6B75]'}`}>💰 المبلغ المتبقي للتحصيل</span>
                  <span className={`font-mono font-black text-sm block ${rem > 0 ? 'text-[#B0005A]' : 'text-emerald-700'}`}>{rem.toLocaleString()} <span className="text-[10px] font-normal text-[#6F6B75]">{currLabel}</span></span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E8E5EA] shadow-2xs flex flex-col justify-center">
                  <span className="text-[10.5px] font-semibold text-[#6F6B75] block mb-0.5">🏷️ مؤشر حالة السداد</span>
                  <div className="font-bold text-xs mt-0.5">{isPaid ? <span className="text-emerald-600">جاهز للتسليم المباشر</span> : (tot === 0 ? <span className="text-gray-500">غير مسعر</span> : <span className="text-amber-800">تحصيل عند التسليم</span>)}</div>
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
        <div className="pt-4 border-t border-[#E8E5EA] flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="w-full sm:flex-1">
            <div className="flex justify-between text-xs mb-1.5 font-bold text-[#25232A]">
              <span>نسبة الإنجاز الحالية في المشغل</span>
              <span className="text-[#8F2A87] font-mono">{form.progress}%</span>
            </div>
            <div className="w-full bg-[#FAFAFB] rounded-full h-2.5 border border-[#E8E5EA]" dir="ltr">
              <div className="bg-[#8F2A87] h-2.5 rounded-full transition-all duration-500" style={{ width: `${form.progress}%` }}></div>
            </div>
          </div>
          <button
            type="button"
            onClick={e => {
              if (e && e.preventDefault) e.preventDefault();
              if (typeof handleSubmit === 'function') handleSubmit(e);
            }}
            className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs text-white bg-[#8F2A87] hover:bg-[#73216C] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {window.Icons && window.Icons.Check ? <window.Icons.Check className="w-4 h-4" /> : <span>✓</span>}
            <span>حفظ واعتماد أمر التشغيل واقتطاع القماش 🚀</span>
          </button>
        </div>
      </form>
    </div>
  );
}

window.WorkerAssignModal = WorkerAssignModal;
