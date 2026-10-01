// src/features/products/components/ProductBomMatrix.jsx
// مصفوفة قائمة المواد (BOM) والربط مع المخزون واستهلاك المقاسات ديناميكياً

function ProductBomMatrix({
  actions,
  inventory = []
}) {
  const {
    targetSegment = 'kids',
    fabricsList = [],
    handleFabricChange,
    handleFabricBracketChange,
    addFabricRow,
    removeFabricRow,
    costsPerBracket = {},
    activeModelCurrencyLabel
  } = actions;

  const u = window.productUtils || {};
  const seg = (u.SEGMENTS && u.SEGMENTS[targetSegment]) || {
    sizes: ['1-2Y', '3-5Y', '6-9Y', '10-13Y'],
    sizeLabels: { '1-2Y': '1-2 سنة', '3-5Y': '3-5 سنوات', '6-9Y': '6-9 سنوات', '10-13Y': '10-13 سنة' }
  };
  const sizes = seg.sizes || ['1-2Y', '3-5Y', '6-9Y', '10-13Y'];
  const sizeLabels = seg.sizeLabels || {};
  const inputCls = "h-9 px-2 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-[#FAFAFB] dark:bg-slate-900 text-xs text-[#25232A] dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 outline-none transition";

  const [localInv, setLocalInv] = React.useState(() => (Array.isArray(inventory) && inventory.length ? inventory : (window.__ACTIVE_INVENTORY__ || [])));

  React.useEffect(() => {
    if (Array.isArray(inventory) && inventory.length) {
      setLocalInv(inventory);
      window.__ACTIVE_INVENTORY__ = inventory;
    } else {
      fetch('/api/inventory').then(r => r.json()).then(d => {
        const list = Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : []);
        if (list.length) { setLocalInv(list); window.__ACTIVE_INVENTORY__ = list; }
      }).catch(() => {});
    }
  }, [inventory]);

  // فلترة أصناف الأقمشة والمستلزمات من المخزون الحي مع حماية كاملة
  const fabricMaterials = React.useMemo(() => {
    const raw = (localInv && localInv.length) ? localInv : (Array.isArray(inventory) && inventory.length ? inventory : (window.__ACTIVE_INVENTORY__ || []));
    const rawList = Array.isArray(raw) ? raw : (raw?.data || []);
    const list = rawList.filter(item => {
      const cat = (item.category || '').toLowerCase(), typ = (item.type || '').toLowerCase(), unt = (item.unit || '').toLowerCase(), nm = (item.name || item.item_name || '').toLowerCase();
      return cat.includes('أقمش') || cat.includes('قماش') || cat.includes('خام') || cat.includes('مستلزم') ||
             typ.includes('fabric') || typ.includes('raw') || typ.includes('material') ||
             unt.includes('متر') || unt.includes('وار') || unt.includes('يارد') ||
             nm.includes('تل') || nm.includes('تفتة') || nm.includes('حرير') || nm.includes('اوركنزا') || nm.includes('شيفون') ||
             nm.includes('صدفة') || nm.includes('بطان') || nm.includes('خيط') || nm.includes('قماش');
    });
    return list.length > 0 ? list : rawList;
  }, [localInv, inventory]);

  return (
    <div className="p-4 bg-[#FAFAFB] dark:bg-slate-900/60 rounded-xl border border-[#E8E5EA] dark:border-slate-800 space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold text-[#25232A] dark:text-slate-100 block">
            🧵 شجرة خامات الموديل (BOM) — {seg.label || 'شجرة المواد'}
          </span>
          <span className="text-[11px] text-[#6F6B75] dark:text-slate-400">
            ربط الأقمشة والمستلزمات مع المخزون الحي لحساب استهلاك الأمتار والتكلفة بدقة لكل مقاس
          </span>
        </div>
        <button
          type="button"
          onClick={addFabricRow}
          className="px-3 py-1.5 bg-white dark:bg-slate-800 text-[#8F2A87] dark:text-purple-300 hover:bg-[#F2E7F3] dark:hover:bg-purple-950/40 border border-[#E5CEE7] dark:border-purple-800/40 rounded-xl text-xs font-bold transition cursor-pointer self-start sm:self-auto flex items-center gap-1 shadow-2xs"
        >
          <span>➕</span>
          <span>إضافة مادة / قماش</span>
        </button>
      </div>

      {/* جدول بنود المواد المرن */}
      <div className="space-y-2.5 overflow-x-auto">
        <div className="min-w-[680px] space-y-2">
          {/* ترويسة الأعمدة الديناميكية */}
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#6F6B75] dark:text-slate-400 px-2">
            <span className="w-56 shrink-0">الخامة من المخزون الحي</span>
            <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${sizes.length}, minmax(0, 1fr))` }}>
              {sizes.map(sz => (
                <span key={sz} className="text-center font-bold font-mono">
                  {sizeLabels[sz] || sz} (م)
                </span>
              ))}
            </div>
            <span className="w-9 text-center shrink-0">حذف</span>
          </div>

          {fabricsList.map(fab => (
            <div key={fab.id} className="flex items-center gap-2 bg-white dark:bg-slate-800/90 p-2.5 rounded-xl border border-[#E8E5EA] dark:border-slate-700 shadow-2xs">
              {/* اختيار الخامة من المخزون الحي مع الرصيد والسعر */}
              <div className="w-56 shrink-0">
                <select
                  value={fab.name}
                  onChange={e => {
                    const val = e.target.value;
                    const selectedInv = fabricMaterials.find(inv => (inv.item_name || inv.name) === val);
                    handleFabricChange(fab.id, 'name', val, selectedInv);
                  }}
                  className={inputCls + " w-full font-medium"}
                >
                  <option value="">-- اختر من مخزون الأقمشة الحي --</option>
                  {fabricMaterials.map(inv => {
                    const itemName = inv.item_name || inv.name;
                    const itemCost = parseFloat(inv.unit_cost ?? inv.cost_price ?? inv.cost ?? inv.cost_per_meter ?? 0);
                    const itemCurr = inv.currency || 'YER';
                    const itemStock = parseFloat(inv.available_qty ?? inv.quantity ?? 0);
                    const unit = inv.unit || 'متر';
                    return (
                      <option key={inv.id || itemName} value={itemName}>
                        {itemName} (المتوفر: {itemStock} {unit}) [{itemCost} {itemCurr}/{unit}]
                      </option>
                    );
                  })}
                </select>
                {fab.name && (
                  <div className="text-[10px] text-[#007F8C] font-mono mt-1 px-1 flex items-center justify-between flex-wrap gap-1">
                    <span>سعر المتر: <strong>{fab.cost} {fab.currency || 'YER'}</strong></span>
                    {fab.available_qty !== undefined && (
                      <span className="text-[#6F6B75]">المتوفر: <strong>{fab.available_qty} {fab.unit}</strong></span>
                    )}
                  </div>
                )}
              </div>

              {/* حقول استهلاك الأمتار للمقاسات الديناميكية */}
              <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${sizes.length}, minmax(0, 1fr))` }}>
                {sizes.map(sz => {
                  const val = fab.brackets?.[sz] ?? (sz === '6-9Y' ? fab.meters_6_9 : '') ?? '';
                  return (
                    <input
                      key={sz}
                      type="number"
                      step="0.1"
                      min="0"
                      value={val}
                      onChange={e => handleFabricBracketChange && handleFabricBracketChange(fab.id, sz, e.target.value)}
                      placeholder="1.0"
                      className={inputCls + " w-full text-center font-mono font-bold"}
                      title={`استهلاك مقاس ${sz}`}
                    />
                  );
                })}
              </div>

              {/* زر حذف السطر */}
              <div className="w-9 shrink-0 flex justify-center">
                <button
                  type="button"
                  onClick={() => removeFabricRow(fab.id)}
                  disabled={fabricsList.length === 1}
                  className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-20 flex items-center justify-center"
                  title="حذف هذا البند"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ملخص تكلفة الخامات المستهلكة لكل مقاس معتمد */}
      <div className="pt-2 border-t border-[#E8E5EA] dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-[#6F6B75] dark:text-slate-400 block">
            إجمالي تكلفة الخامات المستهلكة لكل مقاس ({seg.label || 'الفئة المختارة'}):
          </span>
          <span className="text-[10px] font-bold text-[#007F8C] bg-[#E2F5F7] dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 px-2 py-0.5 rounded">
            ⚡ احتساب تلقائي بضرب سعر المتر في أمتار كل مقاس
          </span>
        </div>
        <div className={`grid gap-2 text-center text-xs ${sizes.length > 4 ? 'grid-cols-3 sm:grid-cols-6' : (sizes.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-2 sm:grid-cols-4')}`}>
          {sizes.map(sz => (
            <div key={sz} className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-[#E8E5EA] dark:border-slate-700 shadow-2xs">
              <span className="text-[10.5px] text-[#6F6B75] dark:text-slate-400 block mb-0.5 font-mono">
                {sizeLabels[sz] || sz}
              </span>
              <span className="font-bold text-[#8F2A87] dark:text-purple-300 font-mono text-sm">
                {(costsPerBracket[sz] || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
              <span className="text-[10px] text-[#6F6B75] dark:text-slate-400 font-sans mr-1">{activeModelCurrencyLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.ProductBomMatrix = ProductBomMatrix;
