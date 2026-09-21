function FabricDeductionCard({
  form,
  setForm,
  fabricInventory = [],
  customers = []
}) {
  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  const cust = (customers || []).find(c => (c.name && form.customer && c.name.includes(form.customer)) || (form.customer && c.name && form.customer.includes(c.name)));
  const meas = cust?.measurements?.find(m => m.child_name === form.child_name) || cust?.measurements?.[0];

  return (
    <div className="p-4 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA] space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E8E5EA]">
        <div className="flex items-center gap-2">
          <span className="text-base">✂️</span>
          <span className="text-xs font-bold text-[#25232A]">خامة القماش واقتطاع الأمتار من المخزون (Fabric & Inventory Deduction)</span>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-[#6F6B75] cursor-pointer">
          <input 
            type="checkbox" 
            checked={form.deduct_inventory} 
            onChange={e => setForm({...form, deduct_inventory: e.target.checked})} 
            className="rounded text-[#8F2A87] focus:ring-[#8F2A87]"
          />
          <span className="font-medium text-[#25232A]">خصم الأمتار تلقائياً من رصيد المخزن عند الحفظ</span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>خامة القماش المخصصة للموديل</label>
          <select 
            className={inputCls} 
            value={form.fabric_name} 
            onChange={e => setForm({...form, fabric_name: e.target.value})}
          >
            <option value="">-- اختر خامة القماش من المخزن --</option>
            {fabricInventory.map(item => (
              <option key={item.id || item.item_code || item.name} value={item.name || item.item_name}>
                {item.name || item.item_name} (المتوفر: {parseFloat(item.quantity || item.qty || item.quantity_meters || 0)} {item.unit || 'متر/وار'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className={labelCls + " mb-0"}>كمية القص المطلوبة</label>
            <div className="flex items-center bg-[#F2E7F3] p-0.5 rounded-lg border border-[#E5CEE7] text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setForm({ ...form, cut_unit: 'متر' })}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${(!form.cut_unit || form.cut_unit === 'متر') ? 'bg-[#007F8C] text-white shadow-2xs' : 'text-[#6F6B75]'}`}
              >
                متر
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, cut_unit: 'وار' })}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${form.cut_unit === 'وار' ? 'bg-[#8F2A87] text-white shadow-2xs' : 'text-[#6F6B75]'}`}
              >
                وار
              </button>
            </div>
          </div>
          <div className="relative">
            <input 
              type="number" 
              step="0.1" 
              min="0"
              className={inputCls + " font-mono font-bold text-[#8F2A87] pl-16"} 
              value={form.cut_meters} 
              onChange={e => setForm({...form, cut_meters: e.target.value})} 
              placeholder="مثال: 3.5"
            />
            <span className="absolute left-2.5 top-2.5 text-xs font-bold text-[#6F6B75] pointer-events-none">
              {form.cut_unit || 'متر'}
            </span>
          </div>
          {form.cut_meters && parseFloat(form.cut_meters) > 0 && (
            <span className="block text-[10px] font-mono text-[#007F8C] mt-1">
              ({(parseFloat(form.cut_meters) / (parseFloat(form.quantity) || 1)).toFixed(2)} {form.cut_unit || 'متر'}/فستان)
            </span>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <label className={labelCls}>رصيد المخزن والتحويل الذكي</label>
          {(() => {
            const curItem = fabricInventory.find(i => (i.name || i.item_name) === form.fabric_name);
            const curStock = curItem ? parseFloat(curItem.quantity || curItem.qty || curItem.quantity_meters || 0) : null;
            const cutQty = parseFloat(form.cut_meters || 0);
            if (curStock === null) {
              return <span className="text-xs text-[#6F6B75] bg-white px-3 py-2 rounded-xl border border-[#E8E5EA]">اختر الخامة لعرض الرصيد</span>;
            }
            const stockUnit = curItem?.unit || 'وار';
            const cutUnit = form.cut_unit || 'متر';
            let deduction = { deductAmount: cutQty, summaryText: `${cutQty} ${cutUnit}`, isConverted: false };
            if (window.UnitConversionService?.calculateDeduction) {
              deduction = window.UnitConversionService.calculateDeduction(cutQty, cutUnit, stockUnit);
            }
            const remaining = curStock - deduction.deductAmount;
            const isLow = remaining < 0;
            return (
              <div className={`p-2 rounded-xl border text-xs flex flex-col gap-1 font-mono ${isLow ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-[#E8E5EA] text-[#25232A]'}`}>
                <div className="flex items-center justify-between">
                  <span>المخزون: <strong>{curStock}</strong> {stockUnit}</span>
                  <span>المتبقي: <strong className={isLow ? 'text-rose-600 font-bold' : 'text-[#007F8C] font-bold'}>{remaining.toFixed(2)}</strong> {stockUnit}</span>
                </div>
                {deduction.isConverted && cutQty > 0 && (
                  <div className="text-[10px] text-[#8F2A87] bg-[#F2E7F3] px-2 py-0.5 rounded border border-[#E5CEE7] flex items-center justify-between">
                    <span>🔄 المقدار المحول:</span>
                    <strong>{cutQty} {cutUnit} ≈ {deduction.deductAmount} {stockUnit}</strong>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {meas && (
        <div className="pt-2 border-t border-[#E8E5EA] flex items-center justify-between flex-wrap gap-2 text-[11px] text-[#6F6B75]">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#8F2A87]">👧 مواصفات {meas.child_name || form.child_name}:</span>
            {meas.dress_len ? <span className="bg-white px-2 py-0.5 rounded border border-[#E8E5EA]">طول الفستان: <strong className="text-[#25232A]">{meas.dress_len} سم</strong></span> : null}
            {meas.chest_circ ? <span className="bg-white px-2 py-0.5 rounded border border-[#E8E5EA]">الصدر: <strong className="text-[#25232A]">{meas.chest_circ} سم</strong></span> : null}
            {meas.waist_circ ? <span className="bg-white px-2 py-0.5 rounded border border-[#E8E5EA]">الخصر: <strong className="text-[#25232A]">{meas.waist_circ} سم</strong></span> : null}
            {meas.estimated_age ? <span className="bg-white px-2 py-0.5 rounded border border-[#E8E5EA]">العمر: <strong className="text-[#007F8C]">{meas.estimated_age}</strong></span> : null}
          </div>
          {meas.comfort_profile && (
            <span className="text-[10px] text-[#007F8C] bg-[#E2F5F7] px-2 py-0.5 rounded">
              ملاحظات الراحة: {Array.isArray(meas.comfort_profile) ? meas.comfort_profile.join('، ') : String(meas.comfort_profile)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

window.FabricDeductionCard = FabricDeductionCard;
