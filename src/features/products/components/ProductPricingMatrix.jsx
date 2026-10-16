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
  const additionalCost = computedTotalLabor;

  return (
    <div className="flex-1 overflow-hidden p-3 flex flex-col justify-between space-y-2 select-none" dir="rtl">
      {/* رأس التسعير والهوامش السريعة */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 shrink-0">
        <div>
          <span className="text-xs font-bold text-white block">
            💎 التسعير التجاري وهوامش الربح — {seg.label || 'المقاسات'}
          </span>
          <span className="text-[10px] text-slate-400">
            تحديد سعر البيع واحتساب هامش الربح لكل مقاس بدقة
          </span>
        </div>

        {/* أزرار الهامش السريع */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">هامش سريع:</span>
          {[35, 45, 55].map(pct => (
            <button
              key={pct}
              type="button"
              onClick={() => handleApplyPresetMargin && handleApplyPresetMargin(pct)}
              className="h-5 px-1.5 rounded bg-slate-800 hover:bg-pink-600 text-white text-[10px] font-bold border border-slate-700 transition cursor-pointer"
            >
              +{pct}%
            </button>
          ))}
        </div>
      </div>

      {/* شبكة بطاقات التسعير في صف واحد متناسق وممتد رأسياً */}
      <div className={`grid gap-2.5 p-1 my-auto ${sizes.length > 4 ? 'grid-cols-3 xl:grid-cols-6' : 'grid-cols-4'}`}>
        {sizes.map(sz => {
          const totalCost = (costsPerBracket[sz] || 0) + additionalCost;
          const sellPrice = parseFloat(pricesMatrix[sz] || 0);
          const profit = sellPrice - totalCost;
          const marginPct = sellPrice > 0 ? ((profit / sellPrice) * 100).toFixed(0) : 0;
          const currCode = (activeModelCurrencyLabel || 'YER').split(' ')[0];

          return (
            <div key={sz} className="h-[148px] p-2 bg-[#0F172A] border border-slate-700/80 hover:border-pink-500/50 rounded-xl flex flex-col justify-between shadow-md transition-all relative select-none">
              {/* ترويسة المقاس */}
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs font-bold text-white font-mono">{sz}</span>
                <span className="text-[10px] text-pink-300 font-semibold truncate max-w-[90px]" title={sizeLabels[sz] || sz}>
                  {sizeLabels[sz] || sz}
                </span>
              </div>
              
              {/* تفكيك التكلفة الإجمالية */}
              <div className="bg-slate-900/90 rounded-lg px-2 py-1 border border-slate-800/80 flex items-center justify-between text-[10.5px]">
                <span className="text-slate-400">التكلفة:</span>
                <span className="text-white font-mono font-bold">{totalCost.toFixed(0)} <span className="text-[8.5px] text-slate-400">{currCode}</span></span>
              </div>

              {/* حقل سعر البيع البطل (Hero Input) */}
              <div>
                <span className="block text-[9.5px] font-semibold text-slate-300 mb-0.5 text-right">سعر البيع:</span>
                <input
                  type="number"
                  value={pricesMatrix[sz] || ""}
                  onChange={e => handlePriceChange(sz, e.target.value)}
                  placeholder="0"
                  className="h-7 w-full text-center font-mono font-black text-sm text-pink-300 bg-slate-900 border-2 border-pink-500/40 rounded-lg outline-none focus:border-pink-500 shadow-inner"
                />
              </div>

              {/* مؤشر الربحية والنسبة الذكية */}
              <div className="pt-1 border-t border-slate-800/80 flex justify-between items-center px-0.5 text-[10px] font-mono font-bold">
                <span className={profit > 0 ? "text-emerald-400" : (profit < 0 ? "text-rose-400" : "text-slate-400")}>
                  {profit > 0 ? `+${profit.toFixed(0)}` : profit.toFixed(0)}
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                  Number(marginPct) >= 35 ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60' :
                  (Number(marginPct) > 0 ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60' : 'bg-slate-800 text-slate-400')
                }`}>
                  {marginPct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[9.5px] text-slate-400 text-center shrink-0">
        💡 يتم حفظ الأسعار تلقائياً وتنعكس مباشرة على شاشات نقاط البيع (POS) وكتالوج الموديلات.
      </p>
    </div>
  );
}

window.ProductPricingMatrix = ProductPricingMatrix;
