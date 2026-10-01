// src/features/dashboard/components/QualityTreasuryRadar.jsx
// مؤشر الجودة الشامل (OQS) ورادار حركة السيولة والتدفق النقدي للخزينة

function QualityTreasuryRadar({
  qualityMetrics = {},
  treasury = {},
  cashFlow = {},
  currency = { display: 'YER ﷼' },
  targetCode = 'YER',
  fmt = (n) => String(n),
  setActiveTab = () => {}
}) {
  const { oqsScore = 98.4, firstPassYield = 97.6, zeroDefectRate = 99.2, customerRating = 4.9 } = qualityMetrics;
  const { cashBalance = 0, bankBalance = 0, baseCashBalance = 0, baseBankBalance = 0, foreignTreasuryDetails = [] } = treasury;
  const { totalInflow = 0, totalOutflow = 0, netCashFlow = 0 } = cashFlow;

  const totalFlow = totalInflow + totalOutflow;
  const inflowPct = totalFlow > 0 ? (totalInflow / totalFlow) * 100 : 50;
  const outflowPct = totalFlow > 0 ? (totalOutflow / totalFlow) * 100 : 50;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. مؤشر الجودة الشامل (OQS) */}
      <div className="bg-[#111C38] p-3.5 rounded-xl border border-slate-800/80 shadow-xs flex flex-col justify-between transition-colors">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#009FAE]"></span>
            <h3 className="font-bold text-xs text-white">مؤشر الجودة الشامل (Quality Score - OQS)</h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
            🌟 معايير الجودة الفائقة (Six Sigma)
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 py-1">
          {/* عداد دائري SVG */}
          <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="currentColor" className="text-slate-800" strokeWidth="8" fill="none" />
              <circle
                cx="50" cy="50" r="42"
                stroke="url(#oqsGrad)" strokeWidth="8" fill="none"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * oqsScore) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="oqsGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#009FAE" />
                  <stop offset="100%" stopColor="#007F8C" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl font-extrabold font-mono text-cyan-300">{oqsScore}%</span>
              <span className="text-[9px] font-bold text-slate-400">مؤشر OQS</span>
            </div>
          </div>

          {/* تفاصيل نسب الجودة والرضا */}
          <div className="w-full space-y-2">
            <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-[#0B132B]/80 border border-slate-700/60">
              <span className="text-slate-300 text-[11px]">القبول من أول فحص (First-Pass Yield)</span>
              <span className="font-mono font-bold text-cyan-300">{firstPassYield}%</span>
            </div>
            <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-[#0B132B]/80 border border-slate-700/60">
              <span className="text-slate-300 text-[11px]">الوحدات الخالية من العيوب (Zero Defect)</span>
              <span className="font-mono font-bold text-purple-300">{zeroDefectRate}%</span>
            </div>
            <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-[#0B132B]/80 border border-slate-700/60">
              <span className="text-slate-300 text-[11px]">مؤشر رضا العملاء العام (Customer CSAT)</span>
              <span className="font-mono font-bold text-amber-400">{customerRating} / 5.0 ⭐</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. رادار الخزينة والسيولة النقدية */}
      <div className="bg-[#111C38] p-3.5 rounded-xl border border-slate-800/80 shadow-xs flex flex-col justify-between transition-colors">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F28A00]"></span>
            <h3 className="font-bold text-xs text-white">رادار الخزينة والسيولة النقدية (Treasury Radar)</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400">العملة: {currency.display}</span>
            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              className="text-[10px] font-bold text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/60 px-2 py-0.5 rounded-md cursor-pointer transition flex items-center gap-1 border border-cyan-800/50"
              title="الانتقال إلى شجرة الحسابات المالية"
            >
              <span>شجرة الحسابات</span>
              <span>↗</span>
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div
              onClick={() => setActiveTab('accounts')}
              className="p-2.5 rounded-lg bg-[#0B132B]/80 border border-slate-700/60 hover:border-cyan-500/50 cursor-pointer transition group"
              title="انقر للانتقال إلى حسابات الصناديق النقدية"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10.5px] text-slate-300 group-hover:text-cyan-400 transition">💵 الصندوق الرئيسي</span>
                <span className="text-[9.5px] text-cyan-400 font-mono">101</span>
              </div>
              <span className="text-sm font-extrabold font-mono text-white block">
                {fmt(targetCode === 'YER' ? baseCashBalance : cashBalance)}
              </span>
              {foreignTreasuryDetails.length > 0 && (
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  {foreignTreasuryDetails.slice(0, 2).map(f => (
                    <span key={f.code} className="text-[9.5px] text-purple-300 font-semibold font-mono">
                      {f.currency === 'SAR' ? '🇸🇦' : '🇺🇸'} {fmt(f.foreign_balance)} {f.currency}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div
              onClick={() => setActiveTab('accounts')}
              className="p-2.5 rounded-lg bg-[#0B132B]/80 border border-slate-700/60 hover:border-teal-500/50 cursor-pointer transition group"
              title="انقر للانتقال إلى حسابات البنوك ونقاط البيع"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10.5px] text-slate-300 group-hover:text-teal-400 transition">💳 البنك ونقاط POS</span>
                <span className="text-[9.5px] text-teal-400 font-mono">103</span>
              </div>
              <span className="text-sm font-extrabold font-mono text-teal-300 block">
                {fmt(targetCode === 'YER' ? baseBankBalance : bankBalance)}
              </span>
              <span className="text-[9.5px] text-slate-400 block mt-0.5">
                حسابات جارية ومدفوعات
              </span>
            </div>
          </div>

          {/* شريط مقارنة المقبوضات مقابل المصروفات */}
          <div className="p-2.5 rounded-lg bg-[#0B132B]/80 border border-slate-700/60 space-y-1.5">
            <div className="flex justify-between text-[11px] font-semibold">
              <span onClick={() => setActiveTab('vouchers')} className="text-cyan-300 cursor-pointer hover:underline" title="سندات القبض">
                المقبوضات: {fmt(totalInflow)}
              </span>
              <span onClick={() => setActiveTab('expenses')} className="text-rose-400 cursor-pointer hover:underline" title="سندات الصرف والمدفوعات">
                المدفوعات: {fmt(totalOutflow)}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
              <div className="bg-[#009FAE] h-full" style={{ width: `${inflowPct}%` }} />
              <div className="bg-[#D64545] h-full" style={{ width: `${outflowPct}%` }} />
            </div>
          </div>

          {/* صافي التدفق النقدي */}
          <div
            onClick={() => setActiveTab('reports')}
            className={`p-2 rounded-lg border flex items-center justify-between font-bold text-xs cursor-pointer hover:opacity-90 transition ${netCashFlow >= 0 ? 'bg-cyan-950/40 border-cyan-800/60 text-cyan-300' : 'bg-rose-950/40 border-rose-900/60 text-rose-300'}`}
            title="التقارير المالية والتدفق النقدي"
          >
            <span className="text-[11px]">صافي التدفق النقدي للخزينة (Net Flow)</span>
            <span className="font-mono text-xs">{fmt(netCashFlow)} {currency.display}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.QualityTreasuryRadar = QualityTreasuryRadar;
}
