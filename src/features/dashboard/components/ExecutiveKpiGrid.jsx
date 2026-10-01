// src/features/dashboard/components/ExecutiveKpiGrid.jsx
// شبكة المؤشرات التنفيذية المدمجة (Level 2: Compact 6-Card KPI Row)

function ExecutiveKpiGrid({
  totalSales = 0, totalProfit = 0, profitMarginPct = '0.0',
  filteredOrdersCount = 0, atelierStages = {},
  totalRemaining = 0, treasury = {}, targetCode = 'YER',
  currency = { display: 'YER ﷼', symbol: '﷼', code: 'YER' }, fmt = (n) => String(n), setActiveTab = () => {}
}) {
  const {
    cashBalance = 0, totalTreasuryBalance = 0,
    baseCashBalance = 0, baseTreasuryBalance = 0
  } = treasury;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {/* 1. إجمالي المبيعات */}
      <div
        onClick={() => setActiveTab('orders')}
        className="px-2 py-1.5 rounded-xl bg-[#111C38] border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between cursor-pointer group shadow-xs select-none"
        title="انقر للانتقال إلى أوامر المبيعات"
      >
        <div className="text-[10px] md:text-[11px] font-semibold text-slate-300 flex items-center justify-between gap-1">
          <span className="truncate whitespace-nowrap">إجمالي المبيعات</span>
          <span className="w-4 h-4 text-cyan-400 p-0.5 shrink-0">📊</span>
        </div>
        <div className="mt-0.5">
          <div className="text-sm md:text-base font-black text-white tracking-tight leading-tight tabular-nums font-mono flex items-baseline gap-1">
            <span>{fmt(totalSales)}</span>
            <span className="text-[10px] font-normal text-slate-400">{currency.symbol || currency.code || '﷼'}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 w-fit">
            <span>📈 نمو</span>
          </div>
        </div>
      </div>

      {/* 2. صافي الأرباح */}
      <div
        onClick={() => setActiveTab('reports')}
        className="px-2 py-1.5 rounded-xl bg-[#111C38] border border-slate-800 hover:border-teal-500/50 transition-all flex flex-col justify-between cursor-pointer group shadow-xs select-none"
        title="انقر للانتقال إلى التقارير المالية"
      >
        <div className="text-[10px] md:text-[11px] font-semibold text-slate-300 flex items-center justify-between gap-1">
          <span className="truncate whitespace-nowrap">صافي الأرباح</span>
          <span className="w-4 h-4 text-teal-400 p-0.5 shrink-0">✨</span>
        </div>
        <div className="mt-0.5">
          <div className="text-sm md:text-base font-black text-white tracking-tight leading-tight tabular-nums font-mono flex items-baseline gap-1">
            <span>{fmt(totalProfit)}</span>
            <span className="text-[10px] font-normal text-slate-400">{currency.symbol || currency.code || '﷼'}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded bg-teal-950/60 text-teal-300 border border-teal-800/60 w-fit">
            <span>هامش: {profitMarginPct}%</span>
          </div>
        </div>
      </div>

      {/* 3. أوامر التشغيل (WIP) */}
      <div
        onClick={() => setActiveTab('factory')}
        className="px-2 py-1.5 rounded-xl bg-[#111C38] border border-slate-800 hover:border-purple-500/50 transition-all flex flex-col justify-between cursor-pointer group shadow-xs select-none"
        title="انقر للانتقال إلى خطوط الإنتاج"
      >
        <div className="text-[10px] md:text-[11px] font-semibold text-slate-300 flex items-center justify-between gap-1">
          <span className="truncate whitespace-nowrap">أوامر التشغيل (WIP)</span>
          <span className="w-4 h-4 text-purple-400 p-0.5 shrink-0">⚙️</span>
        </div>
        <div className="mt-0.5">
          <div className="text-sm md:text-base font-black text-white tracking-tight leading-tight tabular-nums font-mono flex items-baseline gap-1">
            <span>{atelierStages.totalActive || filteredOrdersCount}</span>
            <span className="text-[10px] font-normal text-slate-400">وحدة</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/60 w-fit">
            <span>{atelierStages.completionRate || 74}% إنجاز</span>
          </div>
        </div>
      </div>

      {/* 4. المستحقات المعلقة */}
      <div
        onClick={() => setActiveTab('orders')}
        className="px-2 py-1.5 rounded-xl bg-[#111C38] border border-slate-800 hover:border-amber-500/50 transition-all flex flex-col justify-between cursor-pointer group shadow-xs select-none"
        title="انقر لاستعراض المستحقات"
      >
        <div className="text-[10px] md:text-[11px] font-semibold text-slate-300 flex items-center justify-between gap-1">
          <span className="truncate whitespace-nowrap">المستحقات المعلقة</span>
          <span className="w-4 h-4 text-amber-400 p-0.5 shrink-0">⏳</span>
        </div>
        <div className="mt-0.5">
          <div className="text-sm md:text-base font-black text-white tracking-tight leading-tight tabular-nums font-mono flex items-baseline gap-1">
            <span>{fmt(totalRemaining)}</span>
            <span className="text-[10px] font-normal text-slate-400">{currency.symbol || currency.code || '﷼'}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 w-fit">
            <span>دفعات معلقة</span>
          </div>
        </div>
      </div>

      {/* 5. السيولة والخزينة */}
      <div
        onClick={() => setActiveTab('accounts')}
        className="px-2 py-1.5 rounded-xl bg-[#111C38] border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between cursor-pointer group shadow-xs select-none"
        title="انقر للانتقال إلى الحسابات المالية"
      >
        <div className="text-[10px] md:text-[11px] font-semibold text-slate-300 flex items-center justify-between gap-1">
          <span className="truncate whitespace-nowrap">السيولة والخزينة</span>
          <span className="w-4 h-4 text-cyan-400 p-0.5 shrink-0">🏦</span>
        </div>
        <div className="mt-0.5">
          <div className="text-sm md:text-base font-black text-white tracking-tight leading-tight tabular-nums font-mono flex items-baseline gap-1">
            <span>{targetCode === 'YER' ? fmt(baseTreasuryBalance) : fmt(totalTreasuryBalance)}</span>
            <span className="text-[10px] font-normal text-slate-400">{currency.symbol || currency.code || '﷼'}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 w-fit">
            <span>كاش: {fmt(targetCode === 'YER' ? baseCashBalance : cashBalance)}</span>
          </div>
        </div>
      </div>

      {/* 6. جاهز للتسليم */}
      <div
        onClick={() => setActiveTab('orders')}
        className="px-2 py-1.5 rounded-xl bg-[#111C38] border border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between cursor-pointer group shadow-xs select-none"
        title="انقر لاستعراض الطلبات الجاهزة للتسليم"
      >
        <div className="text-[10px] md:text-[11px] font-semibold text-slate-300 flex items-center justify-between gap-1">
          <span className="truncate whitespace-nowrap">جاهز للتسليم</span>
          <span className="w-4 h-4 text-emerald-400 p-0.5 shrink-0">📦</span>
        </div>
        <div className="mt-0.5">
          <div className="text-sm md:text-base font-black text-white tracking-tight leading-tight tabular-nums font-mono flex items-baseline gap-1">
            <span>{atelierStages.readyToDeliver || 0}</span>
            <span className="text-[10px] font-normal text-slate-400">وحدة</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 w-fit">
            <span>جاهز للشحن ✨</span>
          </div>
        </div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.ExecutiveKpiGrid = ExecutiveKpiGrid;
  window.DashboardMetricsGrid = ExecutiveKpiGrid;
}

