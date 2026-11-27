/**
 * FabricDeductionCard.jsx - خامة القماش واقتطاع الأمتار ومواصفات الباترون
 * Little Princesses ERP - Production Floor Architecture (Auto-Binding & Parametric Deduction)
 */

function FabricDeductionCard({ form = {}, setForm, fabricInventory = [], customers = [] }) {
  const inputCls = "w-full h-8 px-2.5 py-1 rounded-lg border border-[#CBD5E1] dark:border-slate-700/80 bg-white dark:bg-slate-950/80 text-[#0F172A] dark:text-slate-100 text-xs font-medium focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition-all outline-none";
  const labelCls = "block text-[11px] font-semibold text-[#0F172A] dark:text-slate-200 mb-1";

  const sizeChart = window.FactorySizeChart || {};
  const isReadyToWear = form.production_type === 'ready_to_wear';
  const cust = !isReadyToWear ? (customers || []).find(c => (c.name && form.customer && c.name.includes(form.customer)) || (form.customer && c.name && form.customer.includes(c.name))) : null;
  const custMeas = cust?.measurements?.find(m => m.child_name === form.child_name) || cust?.measurements?.[0];
  const stdSpecs = isReadyToWear && sizeChart.getStandardSpecs ? sizeChart.getStandardSpecs(form.size_code || '6-9Y') : null;
  const rawSpecs = isReadyToWear ? stdSpecs : (form.measurements_spec && Object.keys(form.measurements_spec).length > 0 ? form.measurements_spec : (custMeas || {}));
  const specs = { dress_len: rawSpecs?.dress_len || rawSpecs?.dress_length, chest_circ: rawSpecs?.chest_circ || rawSpecs?.chest, waist_circ: rawSpecs?.waist_circ || rawSpecs?.waist, shoulder_w: rawSpecs?.shoulder_w || rawSpecs?.shoulder, sleeve_len: rawSpecs?.sleeve_len || rawSpecs?.sleeve };
  const rawUnit = !isReadyToWear ? String(rawSpecs?.unit || custMeas?.unit || cust?.unit || form.measurements_spec?.unit || 'سم').toLowerCase() : 'سم';
  const unitLabel = (rawUnit.includes('inch') || rawUnit.includes('إنش') || rawUnit.includes('انش') || rawUnit === '"' || rawUnit === 'in') ? 'إنش' : 'سم';

  const rawItems = (Array.isArray(form.bom_items) && form.bom_items.length > 0) ? form.bom_items : ((Array.isArray(form.fabrics_data) && form.fabrics_data.length > 0) ? form.fabrics_data : [{ fabric_name: form.fabric_name || '', cut_meters: form.cut_meters || '', cut_unit: form.cut_unit || 'متر' }]);
  const cutterAlert = form.measurement_notes || rawSpecs?.notes || form.measurements_spec?.notes || (form.notes && form.notes.includes('تنبيه') ? form.notes : '') || custMeas?.notes || '';
  const orderColor = form.selected_color || form.color || form.dress_color || '';

  const updateBomItem = (index, field, value) => {
    setForm(prev => {
      const items = (Array.isArray(prev.bom_items) && prev.bom_items.length > 0) ? prev.bom_items : [{ fabric_name: prev.fabric_name || '', cut_meters: prev.cut_meters || '', cut_unit: prev.cut_unit || 'متر' }];
      const patch = typeof field === 'object' ? field : { [field]: value };
      const updated = items.map((item, i) => i === index ? { ...item, ...patch } : item), first = updated[0] || {};
      return { ...prev, bom_items: updated, fabrics_data: updated, ...(index === 0 ? { fabric_name: first.fabric_name || prev.fabric_name, fabric_id: first.fabric_id || prev.fabric_id, cut_meters: first.cut_meters ?? prev.cut_meters, cut_unit: first.cut_unit || prev.cut_unit } : {}) };
    });
  };

  const addBomItem = () => setForm(prev => {
    const items = (Array.isArray(prev.bom_items) && prev.bom_items.length > 0) ? prev.bom_items : [];
    const updated = [...items, { fabric_name: '', cut_meters: '1.00', cut_unit: 'متر', deduct_inventory: true }];
    return { ...prev, bom_items: updated, fabrics_data: updated };
  });

  const removeBomItem = (index) => setForm(prev => {
    const items = (Array.isArray(prev.bom_items) && prev.bom_items.length > 0) ? prev.bom_items : [];
    if (items.length <= 1) return prev;
    const updated = items.filter((_, i) => i !== index), first = updated[0] || {};
    return { ...prev, bom_items: updated, fabrics_data: updated, fabric_name: first.fabric_name || '', fabric_id: first.fabric_id || '', cut_meters: first.cut_meters || '', cut_unit: first.cut_unit || 'متر' };
  });

  return (
    <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-900/90 border border-[#CBD5E1] dark:border-slate-800/80 space-y-3 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#CBD5E1] dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-sm">✂️</span>
          <span className="text-xs font-semibold text-[#0F172A] dark:text-slate-100">خامات القماش واقتطاع الأمتار من المخزون (BOM Auto-Binding)</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={addBomItem} className="text-[10px] font-semibold text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition cursor-pointer active:scale-95">➕ إضافة خامة</button>
          <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={form.deduct_inventory} onChange={e => setForm({ ...form, deduct_inventory: e.target.checked })} className="rounded text-rose-500 focus:ring-rose-500 bg-white dark:bg-slate-950 border-[#CBD5E1] dark:border-slate-700" />
            <span className="font-semibold text-[#0F172A] dark:text-slate-100 text-[11px]">خصم آلي من المخزن</span>
          </label>
        </div>
      </div>

      <div className="space-y-2.5">
        {rawItems.map((item, idx) => {
          const matcher = window.SmartSizingMatcher?.matchInventoryFabric;
          const curItem = (matcher ? matcher(item, fabricInventory, orderColor) : null) || fabricInventory.find(i =>
            (item.fabric_id && String(i.id || i.inventory_id || i.item_code) === String(item.fabric_id)) ||
            (item.inventory_id && String(i.id || i.inventory_id || i.item_code) === String(item.inventory_id)) ||
            (i.name && (i.name === item.fabric_name || (orderColor && i.name.includes(item.fabric_name) && i.name.includes(orderColor))))
          );

          const curStock = curItem ? parseFloat(curItem.quantity || curItem.qty || curItem.quantity_meters || 0) : null;
          const cutQty = parseFloat(item.cut_meters || 0), stockUnit = curItem?.unit || 'وار', cutUnit = item.cut_unit || curItem?.unit || 'متر';
          const isWar = Boolean(cutUnit && (cutUnit.includes('وار') || cutUnit.includes('يارد') || cutUnit.toLowerCase().includes('yd')));
          const deduction = window.UnitConversionService?.calculateDeduction ? window.UnitConversionService.calculateDeduction(cutQty, cutUnit, stockUnit) : { deductAmount: cutQty, isConverted: false };
          const remaining = curStock !== null ? (curStock - deduction.deductAmount) : null, isLow = remaining !== null && remaining < 0;

          const toggleUnit = (u) => {
            const conv = (u !== cutUnit && item.cut_meters) ? (u === 'وار' ? (parseFloat(item.cut_meters)*1.0936133).toFixed(2) : (parseFloat(item.cut_meters)/1.0936133).toFixed(2)) : item.cut_meters;
            updateBomItem(idx, { cut_meters: conv, cut_unit: u, unit: u });
          };

          return (
            <div key={idx} className="p-2.5 bg-white dark:bg-slate-950/80 rounded-xl border border-[#CBD5E1] dark:border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-[#CBD5E1] dark:border-slate-800/60 text-[11px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-rose-600 dark:text-rose-400">🧵 الخامة ({idx + 1}):</span>
                  <span className="text-[#0F172A] dark:text-slate-100 font-bold">{curItem?.name || item.fabric_name || 'خامة جديدة'}</span>
                  {item.is_graded && (
                    <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/20 font-mono">
                      مقاس المستفيد: {item.cut_meters} {cutUnit} (معياري: {item.standard_cut_meters || item.single_meters} {cutUnit}{item.excess_pct > 0 ? ` +${item.excess_pct}% عرض` : ''})
                    </span>
                  )}
                </div>
                {rawItems.length > 1 && (
                  <button type="button" onClick={() => removeBomItem(idx)} className="text-rose-600 dark:text-rose-400 hover:text-rose-500 dark:hover:text-rose-300 text-[10px] font-semibold px-2 py-0.5 rounded-md hover:bg-rose-500/10 cursor-pointer">✕ حذف</button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                <div>
                  <label className={labelCls}>اسم الخامة وسجل المخزن</label>
                  <select
                    className={inputCls}
                    value={curItem ? (curItem.id || curItem.name) : (item.fabric_id || item.fabric_name || '')}
                    onChange={e => {
                      const selectedVal = e.target.value;
                      const matched = fabricInventory.find(fi => fi.id === selectedVal || fi.name === selectedVal || fi.item_name === selectedVal);
                      const actualUnit = matched?.unit || item.cut_unit || 'متر';
                      updateBomItem(idx, {
                        fabric_name: matched ? (matched.name || matched.item_name) : selectedVal,
                        fabric_id: matched ? (matched.id || matched.item_code || '') : '',
                        inventory_id: matched ? (matched.id || '') : '',
                        cut_unit: actualUnit, unit: actualUnit
                      });
                    }}
                  >
                    <option value="" className="bg-white dark:bg-slate-900">-- اختر خامة القماش --</option>
                    {fabricInventory.map(fi => (
                      <option key={fi.id || fi.name} value={fi.id || fi.name} className="bg-white dark:bg-slate-900">
                        {fi.name || fi.item_name} (المتوفر: {parseFloat(fi.quantity || fi.qty || fi.quantity_meters || 0)} {fi.unit || 'متر/وار'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className={labelCls + " mb-0"}>كمية القص المطلوبة</label>
                    <div className="flex items-center bg-[#F8FAFC] dark:bg-slate-900 p-0.5 rounded-md border border-[#CBD5E1] dark:border-slate-700/80 text-[10px] font-semibold">
                      <button type="button" onClick={() => toggleUnit('متر')} className={`px-2 py-0.5 rounded cursor-pointer transition ${!isWar ? 'bg-cyan-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400'}`}>متر</button>
                      <button type="button" onClick={() => toggleUnit('وار')} className={`px-2 py-0.5 rounded cursor-pointer transition ${isWar ? 'bg-rose-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400'}`}>وار</button>
                    </div>
                  </div>
                  <input
                    type="number" step="0.01" min="0"
                    className={inputCls + " font-mono font-bold text-rose-600 dark:text-rose-400"}
                    value={item.cut_meters !== undefined && item.cut_meters !== null ? item.cut_meters : ''}
                    onChange={e => updateBomItem(idx, 'cut_meters', e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelCls}>رصيد المخزن والتحويل الذكي</label>
                  {curStock === null ? (
                    <div className="h-8 px-2.5 rounded-lg border border-[#CBD5E1] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-950/60 flex items-center text-xs text-slate-500 font-mono">—</div>
                  ) : (
                    <div className={`p-2 rounded-lg border text-[11px] flex flex-col gap-0.5 font-mono ${isLow ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-300' : 'bg-[#F8FAFC] dark:bg-slate-900 border-[#CBD5E1] dark:border-slate-800 text-[#0F172A] dark:text-slate-200'}`}>
                      <div className="flex items-center justify-between">
                        <span>المخزون: <strong className="text-[#0F172A] dark:text-slate-100 font-bold">{curStock}</strong> {stockUnit}</span>
                        <span>المتبقي: <strong className={isLow ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>{remaining.toFixed(2)}</strong></span>
                      </div>
                      {deduction.isConverted && cutQty > 0 && (
                        <div className="text-[10px] text-rose-600 dark:text-rose-400">🔄 {cutQty} {cutUnit} ≈ {deduction.deductAmount} {stockUnit}</div>
                      )}
                      {isLow && (
                        <div className="text-[9.5px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">⚠️ عجز مخزني: يتجاوز الرصيد بمقدار {Math.abs(remaining).toFixed(2)} {stockUnit}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cutterAlert && (
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-500/60 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
          <span className="text-sm shrink-0">⚠️</span>
          <span className="font-semibold text-[11px] leading-tight"><strong className="text-amber-800 dark:text-amber-300 ml-1">تنبيه القصاص:</strong>{String(cutterAlert).replace(/^⚠️\s*/, '').replace(/^تنبيه فني للقصاص:\s*/, '').replace(/^⚠️\s*/, '').trim()}</span>
        </div>
      )}

      {specs && (specs.dress_len || specs.chest_circ) && (
        <div className="pt-2 border-t border-[#CBD5E1] dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-[10px] text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-rose-600 dark:text-rose-400">{isReadyToWear ? `🏷️ مقاس [${form.size_code || '6-9Y'}]:` : `📐 الباترون:`}</span>
            {specs.dress_len && <span className="bg-white dark:bg-slate-950 px-2 py-0.5 rounded-md border border-[#CBD5E1] dark:border-slate-800 text-slate-700 dark:text-slate-200">الطول: <strong className="text-[#0F172A] dark:text-slate-100">{specs.dress_len} {unitLabel}</strong></span>}
            {specs.chest_circ && <span className="bg-white dark:bg-slate-950 px-2 py-0.5 rounded-md border border-[#CBD5E1] dark:border-slate-800 text-slate-700 dark:text-slate-200">الصدر: <strong className="text-[#0F172A] dark:text-slate-100">{specs.chest_circ} {unitLabel}</strong></span>}
            {specs.waist_circ && <span className="bg-white dark:bg-slate-950 px-2 py-0.5 rounded-md border border-[#CBD5E1] dark:border-slate-800 text-slate-700 dark:text-slate-200">الخصر: <strong className="text-[#0F172A] dark:text-slate-100">{specs.waist_circ} {unitLabel}</strong></span>}
            {specs.shoulder_w && <span className="bg-white dark:bg-slate-950 px-2 py-0.5 rounded-md border border-[#CBD5E1] dark:border-slate-800 text-slate-700 dark:text-slate-200">الكتف: <strong className="text-[#0F172A] dark:text-slate-100">{specs.shoulder_w} {unitLabel}</strong></span>}
            {specs.sleeve_len && <span className="bg-white dark:bg-slate-950 px-2 py-0.5 rounded-md border border-[#CBD5E1] dark:border-slate-800 text-slate-700 dark:text-slate-200">الكم: <strong className="text-[#0F172A] dark:text-slate-100">{specs.sleeve_len} {unitLabel}</strong></span>}
          </div>
          <span className="text-[10px] text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 px-2 py-0.5 rounded-md font-semibold">🛡️ مشغل محمي</span>
        </div>
      )}
    </div>
  );
}

window.FabricDeductionCard = FabricDeductionCard;
