/**
 * FabricDeductionCard.jsx - خامة القماش واقتطاع الأمتار ومواصفات الباترون
 * Little Princesses ERP - Production Floor Architecture
 */

function FabricDeductionCard({
  form,
  setForm,
  fabricInventory = [],
  customers = []
}) {
  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  const sizeChart = window.FactorySizeChart || {};
  const isReadyToWear = form.production_type === 'ready_to_wear';

  // Resolve measurements either from standard size chart or customer measurements
  const cust = !isReadyToWear ? (customers || []).find(c => (c.name && form.customer && c.name.includes(form.customer)) || (form.customer && c.name && form.customer.includes(c.name))) : null;
  const custMeas = cust?.measurements?.find(m => m.child_name === form.child_name) || cust?.measurements?.[0];
  const stdSpecs = isReadyToWear && sizeChart.getStandardSpecs ? sizeChart.getStandardSpecs(form.size_code || '6-9Y') : null;
  const rawSpecs = isReadyToWear ? stdSpecs : (form.measurements_spec && Object.keys(form.measurements_spec).length > 0 ? form.measurements_spec : (custMeas || {}));
  const specs = { dress_len: rawSpecs?.dress_len || rawSpecs?.dress_length, chest_circ: rawSpecs?.chest_circ || rawSpecs?.chest, waist_circ: rawSpecs?.waist_circ || rawSpecs?.waist, shoulder_w: rawSpecs?.shoulder_w || rawSpecs?.shoulder, sleeve_len: rawSpecs?.sleeve_len || rawSpecs?.sleeve };
  const rawUnit = !isReadyToWear ? String(rawSpecs?.unit || custMeas?.unit || cust?.unit || cust?.default_unit || cust?.['وحدة القياس المعتمدة'] || form.measurements_spec?.unit || 'سم').toLowerCase() : 'سم';
  const unitLabel = (rawUnit.includes('inch') || rawUnit.includes('إنش') || rawUnit.includes('انش') || rawUnit === '"' || rawUnit === 'in') ? 'إنش' : 'سم';

  const rawItems = (Array.isArray(form.bom_items) && form.bom_items.length > 0)
    ? form.bom_items : [{ fabric_name: form.fabric_name || '', cut_meters: form.cut_meters || '', cut_unit: form.cut_unit || 'متر' }];

  const updateBomItem = (index, field, value) => {
    setForm(prev => {
      const items = (Array.isArray(prev.bom_items) && prev.bom_items.length > 0)
        ? prev.bom_items : [{ fabric_name: prev.fabric_name || '', cut_meters: prev.cut_meters || '', cut_unit: prev.cut_unit || 'متر' }];
      const patch = typeof field === 'object' ? field : { [field]: value };
      const updated = items.map((item, i) => i === index ? { ...item, ...patch } : item);
      const first = updated[0] || {};
      return {
        ...prev,
        bom_items: updated,
        ...(index === 0 ? {
          fabric_name: first.fabric_name || prev.fabric_name,
          cut_meters: first.cut_meters ?? prev.cut_meters,
          cut_unit: first.cut_unit || prev.cut_unit
        } : {})
      };
    });
  };

  const addBomItem = () => setForm(prev => {
    const items = (Array.isArray(prev.bom_items) && prev.bom_items.length > 0) ? prev.bom_items : [];
    return { ...prev, bom_items: [...items, { fabric_name: '', cut_meters: '1.00', cut_unit: 'متر', deduct_inventory: true }] };
  });

  const removeBomItem = (index) => {
    setForm(prev => {
      const items = (Array.isArray(prev.bom_items) && prev.bom_items.length > 0) ? prev.bom_items : [];
      if (items.length <= 1) return prev;
      const updated = items.filter((_, i) => i !== index);
      const first = updated[0] || {};
      return {
        ...prev,
        bom_items: updated,
        fabric_name: first.fabric_name || '',
        cut_meters: first.cut_meters || '',
        cut_unit: first.cut_unit || 'متر'
      };
    });
  };

  return (
    <div className="p-4 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA] space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E8E5EA]">
        <div className="flex items-center gap-2">
          <span className="text-base">✂️</span>
          <span className="text-xs font-bold text-[#25232A]">خامات القماش واقتطاع الأمتار من المخزون (BOM Fabrics Deduction)</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={addBomItem} className="text-[11px] font-bold text-[#8F2A87] bg-[#F2E7F3] px-2.5 py-1 rounded-lg border border-[#E5CEE7] hover:bg-[#8F2A87] hover:text-white transition cursor-pointer">➕ إضافة خامة للطلب</button>
          <label className="flex items-center gap-1.5 text-xs text-[#6F6B75] cursor-pointer">
            <input type="checkbox" checked={form.deduct_inventory} onChange={e => setForm({ ...form, deduct_inventory: e.target.checked })} className="rounded text-[#8F2A87] focus:ring-[#8F2A87]" />
            <span className="font-medium text-[#25232A]">خصم آلي من المخزن</span>
          </label>
        </div>
      </div>

      <div className="space-y-3">
        {rawItems.map((item, idx) => {
          const curItem = fabricInventory.find(i =>
            (item.fabric_id && String(i.id || i.inventory_id || i.item_code) === String(item.fabric_id)) ||
            (i.name && i.name === item.fabric_name) ||
            (i.item_name && i.item_name === item.fabric_name)
          );
          const curStock = curItem ? parseFloat(curItem.quantity || curItem.qty || curItem.quantity_meters || 0) : null;
          const cutQty = parseFloat(item.cut_meters || 0), stockUnit = curItem?.unit || 'وار', cutUnit = item.cut_unit || 'متر';
          const deduction = window.UnitConversionService?.calculateDeduction ? window.UnitConversionService.calculateDeduction(cutQty, cutUnit, stockUnit) : { deductAmount: cutQty, isConverted: false };
          const remaining = curStock !== null ? (curStock - deduction.deductAmount) : null, isLow = remaining !== null && remaining < 0;

          const toggleUnit = (u) => {
            const conv = (u !== cutUnit && item.cut_meters) ? (u === 'وار' ? (parseFloat(item.cut_meters)*1.0936).toFixed(2) : (parseFloat(item.cut_meters)/1.0936).toFixed(2)) : item.cut_meters;
            updateBomItem(idx, { cut_meters: conv, cut_unit: u });
          };

          return (
            <div key={idx} className="p-3 bg-white rounded-xl border border-[#E8E5EA] space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-gray-100 text-xs">
                <span className="font-bold text-[#8F2A87] flex items-center gap-1">
                  <span>🧵 الخامة ({idx + 1}):</span>
                  <span className="text-[#25232A]">{item.fabric_name || 'خامة جديدة'}</span>
                </span>
                {rawItems.length > 1 && (
                  <button type="button" onClick={() => removeBomItem(idx)} className="text-rose-500 hover:text-rose-700 text-xs font-bold px-1.5 py-0.5 rounded hover:bg-rose-50 cursor-pointer">✕ حذف الخامة</button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div>
                  <label className={labelCls}>اسم الخامة</label>
                  <select
                    className={inputCls}
                    value={curItem ? (curItem.name || curItem.item_name) : (item.fabric_name || '')}
                    onChange={e => {
                      const selectedVal = e.target.value;
                      const matched = fabricInventory.find(fi => (fi.name || fi.item_name) === selectedVal || String(fi.id || fi.item_code) === selectedVal);
                      updateBomItem(idx, {
                        fabric_name: matched ? (matched.name || matched.item_name) : selectedVal,
                        fabric_id: matched ? (matched.id || matched.item_code || '') : ''
                      });
                    }}
                  >
                    <option value="">-- اختر خامة القماش من المخزن --</option>
                    {fabricInventory.map(fi => (
                      <option key={fi.id || fi.item_code || fi.name} value={fi.name || fi.item_name}>
                        {fi.name || fi.item_name} (المتوفر: {parseFloat(fi.quantity || fi.qty || fi.quantity_meters || 0)} {fi.unit || 'متر/وار'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className={labelCls + " mb-0"}>كمية القص المطلوبة</label>
                    <div className="flex items-center bg-[#F2E7F3] p-0.5 rounded-lg border border-[#E5CEE7] text-[10px] font-bold">
                      <button type="button" onClick={() => toggleUnit('متر')} className={`px-1.5 py-0.5 rounded cursor-pointer ${(!cutUnit || cutUnit === 'متر') ? 'bg-[#007F8C] text-white' : 'text-[#6F6B75]'}`}>متر</button>
                      <button type="button" onClick={() => toggleUnit('وار')} className={`px-1.5 py-0.5 rounded cursor-pointer ${cutUnit === 'وار' ? 'bg-[#8F2A87] text-white' : 'text-[#6F6B75]'}`}>وار</button>
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputCls + " font-mono font-bold text-[#8F2A87]"}
                    value={item.cut_meters !== undefined && item.cut_meters !== null ? item.cut_meters : ''}
                    onChange={e => updateBomItem(idx, 'cut_meters', e.target.value)}
                    placeholder="مثال: 3.5"
                  />
                </div>

                <div>
                  <label className={labelCls}>رصيد المخزن والتحويل الذكي</label>
                  {curStock === null ? (
                    <span className="text-xs text-[#6F6B75] bg-[#FAFAFB] px-3 py-2.5 rounded-xl border border-[#E8E5EA] block">اختر الخامة</span>
                  ) : (
                    <div className={`p-2 rounded-xl border text-xs flex flex-col gap-0.5 font-mono ${isLow ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-[#FAFAFB] border-[#E8E5EA] text-[#25232A]'}`}>
                      <div className="flex items-center justify-between">
                        <span>المخزون: <strong>{curStock}</strong> {stockUnit}</span>
                        <span>المتبقي: <strong className={isLow ? 'text-rose-600 font-bold' : 'text-[#007F8C] font-bold'}>{remaining.toFixed(2)}</strong></span>
                      </div>
                      {deduction.isConverted && cutQty > 0 && (
                        <div className="text-[10px] text-[#8F2A87]">🔄 {cutQty} {cutUnit} ≈ {deduction.deductAmount} {stockUnit}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Specs bar (Bespoke or Ready-to-Wear) */}
      {specs && (specs.dress_len || specs.chest_circ) && (
        <div className="pt-2 border-t border-[#E8E5EA] flex items-center justify-between flex-wrap gap-2 text-[11px] text-[#6F6B75]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[#8F2A87]">{isReadyToWear ? `🏷️ قياسات المقاس القياسي [${form.size_code || '6-9Y'}]:` : `📐 مواصفات الباترون:`}</span>
            {specs.dress_len && <span className="bg-white px-2 py-0.5 rounded border border-[#E8E5EA]">الطول: <strong className="text-[#25232A]">{specs.dress_len} {unitLabel}</strong></span>}
            {specs.chest_circ && <span className="bg-white px-2 py-0.5 rounded border border-[#E8E5EA]">الصدر: <strong className="text-[#25232A]">{specs.chest_circ} {unitLabel}</strong></span>}
            {specs.waist_circ && <span className="bg-white px-2 py-0.5 rounded border border-[#E8E5EA]">الخصر: <strong className="text-[#25232A]">{specs.waist_circ} {unitLabel}</strong></span>}
            {specs.shoulder_w && <span className="bg-white px-2 py-0.5 rounded border border-[#E8E5EA]">الكتف: <strong className="text-[#25232A]">{specs.shoulder_w} {unitLabel}</strong></span>}
            {specs.sleeve_len && <span className="bg-white px-2 py-0.5 rounded border border-[#E8E5EA]">الكم: <strong className="text-[#25232A]">{specs.sleeve_len} {unitLabel}</strong></span>}
          </div>
          <span className="text-[10px] text-[#007F8C] bg-[#E2F5F7] px-2 py-0.5 rounded font-bold">🛡️ بروتوكول مشغل محمي</span>
        </div>
      )}
    </div>
  );
}

window.FabricDeductionCard = FabricDeductionCard;
