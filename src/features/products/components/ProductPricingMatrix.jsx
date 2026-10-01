// src/features/products/components/ProductPricingMatrix.jsx
// التسعير التجاري، مصفوفة أسعار البيع، وهوامش الربح بحسب الفئة والمقاس

function ProductPricingMatrix({
  actions
}) {
  const {
    targetSegment = 'kids',
    pricesMatrix = {},
    handlePriceChange,
    costsPerBracket = {},
    computedTotalLabor,
    packagingCost,
    activeModelCurrencyLabel,
    handleApplyPresetMargin
  } = actions;

  const u = window.productUtils || {};
  const seg = (u.SEGMENTS && u.SEGMENTS[targetSegment]) || {
    sizes: ['1-2Y', '3-5Y', '6-9Y', '10-13Y'],
    sizeLabels: { '1-2Y': '1-2 سنة', '3-5Y': '3-5 سنوات', '6-9Y': '6-9 سنوات', '10-13Y': '10-13 سنة' }
  };
  const sizes = seg.sizes || ['1-2Y', '3-5Y', '6-9Y', '10-13Y'];
  const sizeLabels = seg.sizeLabels || {};
  const additionalCost = computedTotalLabor + parseFloat(packagingCost || 0);

  return (
    <div className="p-4 bg-gradient-to-br from-slate-900 via-[#18122B] to-[#25232A] text-white rounded-xl space-y-4 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <span className="text-xs font-bold text-[#F28A00] block">
            💎 التسعير التجاري وهوامش الربح — {seg.label || 'المقاسات'}
          </span>
          <span className="text-[11px] text-slate-300">
            تحديد سعر البيع لكل مقاس واحتساب صافي الربح والنسبة المئوية بدقة
          </span>
        </div>

        {/* أزرار الهامش السريع */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-[10.5px] text-slate-400">هامش مستهدف:</span>
          {[35, 45, 55].map(pct => (
            <button
              key={pct}
              type="button"
              onClick={() => handleApplyPresetMargin && handleApplyPresetMargin(pct)}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-[#8F2A87] text-white text-[11px] font-bold border border-white/15 transition cursor-pointer"
            >
              +{pct}%
            </button>
          ))}
        </div>
      </div>

      {/* بطاقات تسعير المقاسات المعتمدة */}
      <div className={`grid gap-3 text-center text-xs ${sizes.length > 4 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' : (sizes.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-2 sm:grid-cols-4')}`}>
        {sizes.map(sz => {
          const totalCost = (costsPerBracket[sz] || 0) + additionalCost;
          const sellPrice = parseFloat(pricesMatrix[sz] || 0);
          const profit = sellPrice - totalCost;
          const marginPct = sellPrice > 0 ? ((profit / sellPrice) * 100).toFixed(1) : 0;

          return (
            <div key={sz} className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15 space-y-2">
              <span className="text-[#F2A4CB] text-xs font-bold block pb-1 border-b border-white/10 font-mono">
                {sizeLabels[sz] || sz}
              </span>
              <div className="text-[11px] space-y-1.5">
                <div className="text-slate-300 flex justify-between items-center">
                  <span>التكلفة:</span>
                  <span className="text-white font-mono font-bold">{totalCost.toFixed(1)}</span>
                </div>

                <div className="flex items-center justify-between bg-white text-[#25232A] p-1 rounded-lg">
                  <span className="text-[10px] font-bold pr-1">سعر البيع:</span>
                  <input
                    type="number"
                    value={pricesMatrix[sz] || ""}
                    onChange={e => handlePriceChange(sz, e.target.value)}
                    className="w-16 text-center font-bold font-mono outline-none text-xs bg-transparent"
                    placeholder="0"
                  />
                </div>

                <div className="pt-1.5 border-t border-white/10 space-y-0.5">
                  <div className="text-[#009FAE] font-mono font-bold flex justify-between items-center">
                    <span>صافي الربح:</span>
                    <span>+{profit.toFixed(1)}</span>
                  </div>
                  <div className="text-[10px] text-amber-300 font-mono font-bold text-left">
                    الهامش: {marginPct}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.ProductPricingMatrix = ProductPricingMatrix;
