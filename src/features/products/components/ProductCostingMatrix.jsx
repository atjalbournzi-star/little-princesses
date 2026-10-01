// src/features/products/components/ProductCostingMatrix.jsx
// مراحل التشغيل ومصفوفة تكاليف الإنتاج: القص، الخياطة، التطريز، التشطيب، والتغليف

function ProductCostingMatrix({
  actions
}) {
  const {
    cutterWage, setCutterWage,
    tailorWage, setTailorWage,
    embroidWage, setEmbroidWage,
    finisherWage, setFinisherWage,
    packagingCost, setPackagingCost,
    computedFabricTotal,
    computedTotalLabor,
    computedTotalCost,
    activeModelCurrencyLabel,
    targetSegment = 'kids',
    ageChart = [],
    updateAgeChart,
    womenSizeChart = [],
    updateWomenSizeChart
  } = actions;

  const inputCls = "w-full h-9 px-2 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-[#25232A] dark:text-slate-100 focus:border-[#8F2A87] dark:focus:border-purple-500 outline-none transition text-left";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. مراحل التشغيل وتكاليف الأجور */}
      <div className="p-4 bg-[#FAFAFB] dark:bg-slate-900/60 rounded-xl border border-[#E8E5EA] dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#25232A] dark:text-slate-100 block">
            🏭 أجور مراحل التصنيع والتشغيل الفنية:
          </span>
          <span className="text-[11px] font-mono font-bold text-[#8F2A87] dark:text-purple-300 bg-[#F2E7F3] dark:bg-purple-950/50 px-2 py-0.5 rounded-lg border border-[#E5CEE7] dark:border-purple-800/40">
            {activeModelCurrencyLabel}
          </span>
        </div>

        <div className="space-y-2">
          {/* مرحلة القص والباترون */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border border-[#E8E5EA] dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-sm">✂️</span>
              <span className="text-xs font-medium text-[#25232A] dark:text-slate-200">1. أجرة القص والباترون:</span>
            </div>
            <div className="w-28">
              <input type="number" min="0" step="0.5" value={cutterWage} onChange={e => setCutterWage(e.target.value)} className={inputCls} placeholder="0.0" />
            </div>
          </div>

          {/* مرحلة الخياطة والتجميع */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border border-[#E8E5EA] dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-sm">🪡</span>
              <span className="text-xs font-medium text-[#25232A] dark:text-slate-200">2. أجرة الخياطة والتفصيل:</span>
            </div>
            <div className="w-28">
              <input type="number" min="0" step="0.5" value={tailorWage} onChange={e => setTailorWage(e.target.value)} className={inputCls} placeholder="0.0" />
            </div>
          </div>

          {/* مرحلة التطريز والشك اليدوي */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border border-[#E8E5EA] dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-sm">✨</span>
              <span className="text-xs font-medium text-[#25232A] dark:text-slate-200">3. أجرة التطريز والشك اليدوي:</span>
            </div>
            <div className="w-28">
              <input type="number" min="0" step="0.5" value={embroidWage} onChange={e => setEmbroidWage(e.target.value)} className={inputCls} placeholder="0.0" />
            </div>
          </div>

          {/* مرحلة الكي والتشطيب النهائي */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border border-[#E8E5EA] dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-sm">👔</span>
              <span className="text-xs font-medium text-[#25232A] dark:text-slate-200">4. أجرة التشطيب والكي النهائي:</span>
            </div>
            <div className="w-28">
              <input type="number" min="0" step="0.5" value={finisherWage} onChange={e => setFinisherWage(e.target.value)} className={inputCls} placeholder="0.0" />
            </div>
          </div>

          {/* التغليف ومستلزمات التسليم */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border border-[#E8E5EA] dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-sm">📦</span>
              <span className="text-xs font-medium text-[#25232A] dark:text-slate-200">5. التغليف ومستلزمات الإكسسوار:</span>
            </div>
            <div className="w-28">
              <input type="number" min="0" step="0.5" value={packagingCost} onChange={e => setPackagingCost(e.target.value)} className={inputCls} placeholder="0.0" />
            </div>
          </div>
        </div>

        {/* إجمالي تكاليف الإنتاج المباشرة */}
        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-[#E8E5EA] dark:border-slate-700 space-y-1.5 text-xs">
          <div className="flex justify-between items-center text-[#6F6B75] dark:text-slate-400">
            <span>متوسط تكلفة الخامات (BOM):</span>
            <span className="font-mono font-bold text-[#25232A] dark:text-slate-200">{computedFabricTotal.toFixed(1)} {activeModelCurrencyLabel}</span>
          </div>
          <div className="flex justify-between items-center text-[#6F6B75] dark:text-slate-400">
            <span>إجمالي أجور المراحل الفنية:</span>
            <span className="font-mono font-bold text-[#8F2A87] dark:text-purple-300">+{computedTotalLabor.toFixed(1)} {activeModelCurrencyLabel}</span>
          </div>
          <div className="flex justify-between items-center pt-1.5 border-t border-[#E8E5EA] dark:border-slate-700 text-sm font-bold">
            <span className="text-[#25232A] dark:text-slate-100">إجمالي تكلفة الإنتاج التقديرية:</span>
            <span className="font-mono font-extrabold text-[#007F8C] dark:text-cyan-400">{computedTotalCost.toFixed(1)} {activeModelCurrencyLabel}</span>
          </div>
        </div>
      </div>

      {/* 2. جدول القياسات والأطوال القياسية (Age Chart / Adult Size Chart) */}
      <div className="p-4 bg-[#FAFAFB] dark:bg-slate-900/60 rounded-xl border border-[#E8E5EA] dark:border-slate-800 space-y-3">
        <span className="text-xs font-bold text-[#25232A] dark:text-slate-100 block">
          {targetSegment === 'women_adults' ? '👗 جدول مقاسات ومواصفات الكبار المعيارية (سم):' : '📏 جدول أطوال وقياسات الموديل المعيارية (سم):'}
        </span>
        {targetSegment === 'women_adults' ? (
          <div className="space-y-1.5 overflow-x-auto">
            <div className="grid grid-cols-4 gap-2 text-[11px] font-bold text-[#6F6B75] dark:text-slate-300 px-2 pb-1 border-b border-[#E8E5EA] dark:border-slate-700 text-center">
              <span>المقاس</span>
              <span>الصدر (سم)</span>
              <span>الخصر (سم)</span>
              <span>طول الفستان</span>
            </div>
            {womenSizeChart.map(row => (
              <div key={row.id} className="grid grid-cols-4 gap-2 items-center bg-white dark:bg-slate-800 p-2 rounded-xl border border-[#E8E5EA] dark:border-slate-700 text-xs">
                <span className="font-bold text-[#8F2A87] dark:text-purple-300 text-center">{row.label || row.size}</span>
                <input
                  type="number"
                  value={row.chest ?? ''}
                  onChange={e => updateWomenSizeChart(row.id, 'chest', parseFloat(e.target.value) || '')}
                  placeholder="صدر"
                  className="h-7 px-1 text-center font-mono border dark:border-slate-600 rounded bg-[#FAFAFB] dark:bg-slate-900 text-xs text-[#25232A] dark:text-slate-100 outline-none"
                />
                <input
                  type="number"
                  value={row.waist ?? ''}
                  onChange={e => updateWomenSizeChart(row.id, 'waist', parseFloat(e.target.value) || '')}
                  placeholder="خصر"
                  className="h-7 px-1 text-center font-mono border dark:border-slate-600 rounded bg-[#FAFAFB] dark:bg-slate-900 text-xs text-[#25232A] dark:text-slate-100 outline-none"
                />
                <input
                  type="number"
                  value={row.length ?? ''}
                  onChange={e => updateWomenSizeChart(row.id, 'length', parseFloat(e.target.value) || '')}
                  placeholder="طول"
                  className="h-7 px-1 text-center font-mono border dark:border-slate-600 rounded bg-[#FAFAFB] dark:bg-slate-900 text-xs text-[#25232A] dark:text-slate-100 outline-none"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {ageChart.slice(0, 6).map(row => (
              <div key={row.id} className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-[#E8E5EA] dark:border-slate-700 flex items-center justify-between gap-1 text-[11px]">
                <span className="text-[#6F6B75] dark:text-slate-300 font-semibold">{row.age}</span>
                <div className="flex items-center gap-1 w-24">
                  <input
                    type="number"
                    value={row.min}
                    onChange={e => updateAgeChart(row.id, 'min', parseFloat(e.target.value))}
                    placeholder="من"
                    className="w-11 h-7 p-1 text-center font-mono border dark:border-slate-600 rounded bg-[#FAFAFB] dark:bg-slate-900 text-xs text-[#25232A] dark:text-slate-100"
                  />
                  <span className="text-[#6F6B75]">-</span>
                  <input
                    type="number"
                    value={row.max}
                    onChange={e => updateAgeChart(row.id, 'max', parseFloat(e.target.value))}
                    placeholder="إلى"
                    className="w-11 h-7 p-1 text-center font-mono border dark:border-slate-600 rounded bg-[#FAFAFB] dark:bg-slate-900 text-xs text-[#25232A] dark:text-slate-100"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10.5px] text-[#6F6B75] dark:text-slate-400">
          💡 تساعد القياسات المعيارية كاشير المبيعات ومعمل التفصيل في مطابقة مقاسات العميلات بدقة.
        </p>
      </div>
    </div>
  );
}

window.ProductCostingMatrix = ProductCostingMatrix;
