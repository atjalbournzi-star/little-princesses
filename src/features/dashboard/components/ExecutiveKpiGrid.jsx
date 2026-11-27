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

  const cardCls = "px-2 py-1.5 rounded-xl bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-[#263248] transition-all flex flex-col justify-between cursor-pointer group shadow-xs select-none";
  const titleCls = "text-[10px] md:text-[11px] font-semibold text-[#475569] dark:text-slate-300 flex items-center justify-between gap-1";
  const valCls = "text-sm md:text-base font-black text-[#0F172A] dark:text-white tracking-tight leading-tight tabular-nums font-mono flex items-baseline gap-1";
  const unitCls = "text-[10px] font-normal text-[#475569] dark:text-slate-400";

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {/* 1. إجمالي المبيعات */}
      <div onClick={() => setActiveTab('orders')} className={`${cardCls} hover:border-cyan-500/50`} title="انقر للانتقال إلى أوامر المبيعات">
        <div className={titleCls}>
          <span className="truncate whitespace-nowrap">إجمالي المبيعات</span>
          <span className="w-4 h-4 text-cyan-600 dark:text-cyan-400 p-0.5 shrink-0">📊</span>
        </div>
        <div className="mt-0.5">
          <div className={valCls}>
            <span dir="ltr" className="inline-block">{fmt(totalSales)}</span>
            <span className={unitCls}>{currency.symbol || currency.code || '﷼'}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60 w-fit">
            <span>📈 نمو</span>
          </div>
        </div>
      </div>

      {/* 2. صافي الأرباح */}
      <div onClick={() => setActiveTab('reports')} className={`${cardCls} hover:border-teal-500/50`} title="انقر للانتقال إلى التقارير المالية">
        <div className={titleCls}>
          <span className="truncate whitespace-nowrap">صافي الأرباح</span>
          <span className="w-4 h-4 text-teal-600 dark:text-teal-400 p-0.5 shrink-0">✨</span>
        </div>
        <div className="mt-0.5">
          <div className={valCls}>
            <span dir="ltr" className="inline-block">{fmt(totalProfit)}</span>
            <span className={unitCls}>{currency.symbol || currency.code || '﷼'}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60 w-fit">
            <span>هامش: <span dir="ltr" className="inline-block">{profitMarginPct}%</span></span>
          </div>
        </div>
      </div>

      {/* 3. أوامر التشغيل (WIP) */}
      <div onClick={() => setActiveTab('factory')} className={`${cardCls} hover:border-purple-500/50`} title="انقر للانتقال إلى خطوط الإنتاج">
        <div className={titleCls}>
          <span className="truncate whitespace-nowrap">أوامر التشغيل (WIP)</span>
          <span className="w-4 h-4 text-purple-600 dark:text-purple-400 p-0.5 shrink-0">⚙️</span>
        </div>
        <div className="mt-0.5">
          <div className={valCls}>
            <span>{atelierStages.totalActive || filteredOrdersCount}</span>
            <span className={unitCls}>وحدة</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60 w-fit">
            <span>{atelierStages.completionRate !== undefined ? atelierStages.completionRate : 0}% إنجاز</span>
          </div>
        </div>
      </div>

      {/* 4. المستحقات المعلقة */}
      <div onClick={() => setActiveTab('orders')} className={`${cardCls} hover:border-amber-500/50`} title="انقر لاستعراض المستحقات">
        <div className={titleCls}>
          <span className="truncate whitespace-nowrap">المستحقات المعلقة</span>
          <span className="w-4 h-4 text-amber-600 dark:text-amber-400 p-0.5 shrink-0">⏳</span>
        </div>
        <div className="mt-0.5">
          <div className={valCls}>
            <span>{fmt(totalRemaining)}</span>
            <span className={unitCls}>{currency.symbol || currency.code || '﷼'}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60 w-fit">
            <span>دفعات معلقة</span>
          </div>
        </div>
      </div>

      {/* 5. السيولة والخزينة */}
      <div onClick={() => setActiveTab('accounts')} className={`${cardCls} hover:border-cyan-500/50`} title="انقر للانتقال إلى الحسابات المالية">
        <div className={titleCls}>
          <span className="truncate whitespace-nowrap">السيولة والخزينة</span>
          <span className="w-4 h-4 text-cyan-600 dark:text-cyan-400 p-0.5 shrink-0">🏦</span>
        </div>
        <div className="mt-0.5">
          <div className={valCls}>
            <span dir="ltr" className="inline-block">{targetCode === 'YER' ? fmt(baseTreasuryBalance) : fmt(totalTreasuryBalance)}</span>
            <span className={unitCls}>{currency.symbol || currency.code || '﷼'}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60 w-fit">
            <span>كاش: <span dir="ltr" className="inline-block">{fmt(targetCode === 'YER' ? baseCashBalance : cashBalance)}</span></span>
          </div>
        </div>
      </div>

      {/* 6. جاهز للتسليم */}
      <div onClick={() => setActiveTab('orders')} className={`${cardCls} hover:border-emerald-500/50`} title="انقر لاستعراض الطلبات الجاهزة للتسليم">
        <div className={titleCls}>
          <span className="truncate whitespace-nowrap">جاهز للتسليم</span>
          <span className="w-4 h-4 text-emerald-600 dark:text-emerald-400 p-0.5 shrink-0">📦</span>
        </div>
        <div className="mt-0.5">
          <div className={valCls}>
            <span>{atelierStages.readyToDeliver || 0}</span>
            <span className={unitCls}>وحدة</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60 w-fit">
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

