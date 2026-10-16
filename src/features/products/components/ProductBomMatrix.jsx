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
    <div className="flex-1 overflow-hidden p-3 flex flex-col justify-between space-y-2 select-none" dir="rtl">
      <div className="flex items-center justify-between gap-2 shrink-0 pb-1 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-white">
            🧵 شجرة خامات الموديل (BOM) — {seg.label || 'المواد والأقمشة'}
          </span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            (تحديد استهلاك الأمتار لكل مقاس لحساب تكلفة القطعة)
          </span>
        </div>
        <button
          type="button"
          onClick={addFabricRow}
          className="h-6 px-2 text-[10.5px] font-bold bg-pink-600/20 text-pink-300 border border-pink-500/40 rounded-md hover:bg-pink-600/30 transition cursor-pointer flex items-center gap-1"
        >
          <span>+</span>
          <span>إضافة خامة / قماش</span>
        </button>
      </div>

      {/* جدول بنود المواد المرن بنظام الشبكة الموحد بنسبة 100% */}
      <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar min-h-0">
        {/* ترويسة الأعمدة بنظام CSS Grid مطابق تماماً للصفوف */}
        <div
          className="grid items-center gap-1.5 text-[10.5px] font-bold text-slate-300 px-2.5 py-1 bg-slate-900/60 rounded-lg border border-slate-800/80 w-full grid-cols-[1.8fr_1fr_1fr_1fr_1fr_40px]"
          style={{ gridTemplateColumns: `1.8fr repeat(${sizes.length}, 1fr) 40px` }}
        >
          <span className="truncate pr-0.5">الخامة من المخزون الحي</span>
          {sizes.map(sz => (
            <span key={sz} className="whitespace-nowrap text-center font-bold font-mono text-slate-200">
              {sizeLabels[sz] || sz}
            </span>
          ))}
          <span className="text-center shrink-0">حذف</span>
        </div>

        {/* صفوف المواد */}
        {fabricsList.map(fab => (
          <div
            key={fab.id}
            className="grid items-center gap-1.5 h-8 py-1 px-2.5 text-xs bg-slate-900/90 rounded-lg border border-slate-800 shadow-sm w-full grid-cols-[1.8fr_1fr_1fr_1fr_1fr_40px]"
            style={{ gridTemplateColumns: `1.8fr repeat(${sizes.length}, 1fr) 40px` }}
          >
            {/* اختيار الخامة من المخزون */}
            <div className="min-w-0">
              <select
                value={fab.name}
                onChange={e => {
                  const val = e.target.value;
                  const selectedInv = fabricMaterials.find(inv => (inv.item_name || inv.name) === val);
                  handleFabricChange(fab.id, 'name', val, selectedInv);
                }}
                className="h-6 px-2 text-xs bg-slate-900 border border-slate-700 rounded-md text-white outline-none focus:border-pink-500 font-medium w-full cursor-pointer truncate"
              >
                <option value="">-- اختر الخامة --</option>
                {fabricMaterials.map(inv => {
                  const itemName = inv.item_name || inv.name;
                  const itemCost = parseFloat(inv.unit_cost ?? inv.cost_price ?? inv.cost ?? inv.cost_per_meter ?? 0);
                  const itemCurr = inv.currency || 'YER';
                  const itemStock = parseFloat(inv.available_qty ?? inv.quantity ?? 0);
                  const unit = inv.unit || 'متر';
                  return (
                    <option key={inv.id || itemName} value={itemName}>
                      {itemName} ({itemStock} {unit}) [{itemCost} {itemCurr}]
                    </option>
                  );
                })}
              </select>
            </div>

            {/* حقول استهلاك الأمتار للمقاسات مدمجة وموسطنة */}
            {sizes.map(sz => {
              const val = fab.brackets?.[sz] ?? (sz === '6-9Y' ? fab.meters_6_9 : '') ?? '';
              return (
                <div key={sz} className="w-full flex items-center justify-center min-w-0">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={val}
                    onChange={e => handleFabricBracketChange && handleFabricBracketChange(fab.id, sz, e.target.value)}
                    className="w-full h-6 text-center font-mono font-bold text-white bg-slate-900 border border-slate-700 rounded-md outline-none focus:border-pink-500 text-xs px-0.5"
                    title={`استهلاك مقاس ${sz}`}
                  />
                </div>
              );
            })}

            {/* زر حذف السطر في أقصى اليسار */}
            <div className="w-full flex items-center justify-center shrink-0">
              <button
                type="button"
                onClick={() => removeFabricRow(fab.id)}
                disabled={fabricsList.length === 1}
                className="w-5.5 h-5.5 rounded-md text-rose-400 hover:text-white hover:bg-rose-950/60 text-xs transition cursor-pointer disabled:opacity-20 flex items-center justify-center font-bold"
                title="حذف هذا البند"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ملخص تكلفة الخامات التقديرية بحسب المقاسات */}
      <div className="p-2.5 bg-[#0F172A] rounded-xl border border-slate-800 space-y-1.5 shrink-0 shadow-md">
        <span className="text-[11px] font-bold text-slate-300 block">
          📊 ملخص تكلفة الخامات المحتسبة لكل مقاس:
        </span>
        <div className={`grid gap-2 ${sizes.length > 4 ? 'grid-cols-3 xl:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {sizes.map(sz => {
            const cost = costsPerBracket[sz] || 0;
            return (
              <div key={sz} className="bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-pink-300 text-[10.5px] truncate max-w-[85px]">{sizeLabels[sz] || sz}</span>
                <span className="font-mono font-bold text-white">
                  {cost.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 1})} <span className="text-[9px] text-slate-400 font-sans">{(activeModelCurrencyLabel || 'YER').split(' ')[0]}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.ProductBomMatrix = ProductBomMatrix;
window.BOMFabricTree = ProductBomMatrix;
