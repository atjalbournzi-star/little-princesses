// src/features/dashboard/components/DashboardCharts.jsx
// منحنى المبيعات ومراحل خط الإنتاج المدمج (Level 3: Live Workflow Card - 40% / h-72)

function DashboardCharts({
  trendMode = 'daily', setTrendMode = () => {},
  hoveredPoint = null, setHoveredPoint = () => {},
  svgCoordinates = { path: '', area: '', dots: [] },
  chartWidth = 600, chartHeight = 120, chartPadding = 18,
  totalSales = 0, avgOrderValue = 0, filteredOrdersCount = 0,
  atelierStages = {}, currency = { display: 'YER ﷼' },
  fmt = (n) => String(n), setActiveTab = () => {}
}) {
  const stageItems = [
    { name: '1. القص والتحضير الأولي', short: 'القص والتجهيز', count: atelierStages.cutting || 0, icon: '⚙️' },
    { name: '2. الخياطة والتجميع الأساسي', short: 'الخياطة والتجميع', count: atelierStages.tailoring || 0, icon: '🛠️' },
    { name: '3. المعالجة الدقيقة والتطريز', short: 'التطريز والتشطيب', count: atelierStages.embroidery || 0, icon: '💎' },
    { name: '4. فحص وضمان الجودة (QA)', short: 'فحص الجودة QA', count: atelierStages.qualityCheck || 0, icon: '🔍' },
    { name: '5. جاهز للتسليم والترحيل', short: 'جاهز للتسليم', count: atelierStages.readyToDeliver || 0, icon: '📦' }
  ];

  return (
    <div className="bg-[#111C38] rounded-xl border border-slate-800 p-2.5 shadow-xs flex flex-col justify-between h-72 transition-colors select-none">
      {/* 1. حاوية منحنى المبيعات مقفلة الارتفاع بدقة (h-36 max-h-36) */}
      <div className="h-36 max-h-36 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#B0005A]"></span>
            <h3 className="font-bold text-xs text-white">منحنى المبيعات</h3>
          </div>

          <div className="flex bg-[#0B132B] p-0.5 rounded border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setTrendMode('daily')}
              className={`px-2 py-0.5 rounded text-[9.5px] font-bold transition cursor-pointer ${trendMode === 'daily' ? 'bg-[#111C38] text-pink-300 border border-slate-700/60 shadow-xs' : 'text-slate-400'}`}
            >
              اليومي 📈
            </button>
            <button
              type="button"
              onClick={() => setTrendMode('cumulative')}
              className={`px-2 py-0.5 rounded text-[9.5px] font-bold transition cursor-pointer ${trendMode === 'cumulative' ? 'bg-[#111C38] text-purple-300 border border-slate-700/60 shadow-xs' : 'text-slate-400'}`}
            >
              التراكمي 📊
            </button>
          </div>
        </div>

        {/* رسم SVG بارتفاع مدمج */}
        <div className="relative w-full flex-1 overflow-hidden my-0.5">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#B0005A" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#009FAE" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#B0005A" />
                <stop offset="50%" stopColor="#8F2A87" />
                <stop offset="100%" stopColor="#009FAE" />
              </linearGradient>
            </defs>

            <line x1={chartPadding} y1={chartPadding} x2={chartWidth - chartPadding} y2={chartPadding} stroke="#334155" strokeDasharray="3 3" opacity="0.3" />
            <line x1={chartPadding} y1={chartHeight / 2} x2={chartWidth - chartPadding} y2={chartHeight / 2} stroke="#334155" strokeDasharray="3 3" opacity="0.3" />

            {svgCoordinates.area && <path d={svgCoordinates.area} fill="url(#salesGrad)" />}
            {svgCoordinates.path && <path d={svgCoordinates.path} fill="none" stroke="url(#strokeGrad)" strokeWidth="2.5" strokeLinecap="round" />}

            {svgCoordinates.dots && svgCoordinates.dots.map((dot, i) => (
              <g key={i}>
                <circle
                  cx={dot.x} cy={dot.y}
                  r={hoveredPoint === i ? "5" : "2.5"}
                  fill={hoveredPoint === i ? "#B0005A" : "#FFFFFF"}
                  stroke="#8F2A87" strokeWidth="1.5"
                  className="transition-all cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            ))}
          </svg>

          {hoveredPoint !== null && svgCoordinates.dots && svgCoordinates.dots[hoveredPoint] && (
            <div
              className="absolute bg-[#0B132B] text-white px-2 py-0.5 rounded border border-slate-700 shadow text-[9.5px] pointer-events-none transform -translate-x-1/2 -translate-y-full z-10 font-mono"
              style={{
                left: `${(svgCoordinates.dots[hoveredPoint].x / chartWidth) * 100}%`,
                top: `${(svgCoordinates.dots[hoveredPoint].y / chartHeight) * 100 - 8}%`
              }}
            >
              <span className="font-bold text-[#F2A4CB]">{svgCoordinates.dots[hoveredPoint].label}: </span>
              <span>{fmt(svgCoordinates.dots[hoveredPoint].val)}</span>
            </div>
          )}
        </div>

        {/* سطر الإحصائيات السريع */}
        <div className="flex items-center justify-between text-[10px] px-2 py-0.5 rounded bg-[#0B132B]/80 border border-slate-800 text-slate-400 font-mono shrink-0">
          <span>المبيعات: <strong className="text-cyan-300 font-bold">{fmt(totalSales)}</strong></span>
          <span>متوسط الأمر: <strong className="text-purple-300 font-bold">{fmt(avgOrderValue)}</strong></span>
          <span>الأوامر: <strong className="text-pink-300 font-bold">{filteredOrdersCount}</strong></span>
        </div>
      </div>

      {/* 2. مراحل خط الإنتاج الـ 5 مصفوفة بكبسولات أنيقة (h-7 px-2 py-0.5 text-[11px] rounded-md) */}
      <div className="pt-1.5 border-t border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <div onClick={() => setActiveTab('factory')} className="flex items-center gap-1 cursor-pointer group" title="خطوط الإنتاج">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8F2A87]"></span>
            <h4 className="font-bold text-[10.5px] text-white group-hover:text-purple-300 transition">مراحل خط الإنتاج (5 مراحل)</h4>
          </div>
          <div className="flex items-center gap-1 text-[9px] font-mono">
            <span className="text-purple-300 font-bold bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/60">
              {atelierStages.completionRate || 0}% إنجاز
            </span>
            <span className="text-cyan-300 font-bold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/60">
              OTIF: {atelierStages.onTimeRate || 98.5}%
            </span>
          </div>
        </div>

        <div className="space-y-1">
          {stageItems.map((stage, idx) => (
            <div
              key={idx}
              onClick={() => setActiveTab('factory')}
              className="h-7 px-2 py-0.5 text-[11px] rounded-md bg-[#0B132B]/80 border border-slate-800 flex items-center justify-between hover:border-purple-500/50 cursor-pointer transition group"
              title={stage.name}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs shrink-0">{stage.icon}</span>
                <span className="text-slate-200 group-hover:text-purple-300 truncate font-medium">{stage.short}</span>
              </div>
              <span className="font-mono font-bold text-white px-1.5 py-0.2 bg-[#111C38] rounded border border-slate-700 text-[10.5px] shrink-0">
                {stage.count} وحدة
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.DashboardCharts = window.RevenueCurve = window.ProductionStages = DashboardCharts;
}

