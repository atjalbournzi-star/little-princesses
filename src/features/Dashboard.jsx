// src/features/Dashboard.jsx - المنسق والمجمع الرئيسي للوحة القيادة التنفيذية (Layout Orchestrator)

function Dashboard({
  setActiveTab = () => {},
  orders = [],
  accounts = [],
  journal = [],
  vouchers = [],
  purchases = [],
  expenses = [],
  factory = [],
  customers = [],
  inventory = [],
  currency = { display: 'YER ﷼', symbol: '﷼', code: 'YER' }
}) {
  // 1. استدعاء الخطافات المعيارية مع الحماية البديلة
  const useData = window.useDashboardData || (() => ({
    targetCode: 'YER', filteredOrders: orders, treasury: {},
    totalSales: 0, totalPaid: 0, totalRemaining: 0, effectiveExpenses: 0,
    totalProfit: 0, profitMarginPct: '0.0', cashFlow: {}, atelierStages: {},
    qualityMetrics: {}, trendData: { points: [] }, svgCoordinates: { dots: [] },
    urgentOrders: [], avgOrderValue: 0, chartWidth: 600, chartHeight: 180, chartPadding: 24,
    fmt: (n) => String(n), toCurr: (amt) => parseFloat(amt) || 0
  }));

  const useActions = window.useDashboardActions || (() => ({
    timeHorizon: 'all', setTimeHorizon: () => {},
    trendMode: 'daily', setTrendMode: () => {},
    hoveredPoint: null, setHoveredPoint: () => {},
    watchdogData: null, handleSendWhatsApp: () => {}
  }));

  // 2. إدارة الحالة والأحداث
  const {
    timeHorizon, setTimeHorizon, trendMode, setTrendMode,
    hoveredPoint, setHoveredPoint, watchdogData, handleSendWhatsApp
  } = useActions({ setActiveTab });

  // 3. تجميع وحساب البيانات والمؤشرات التنفيذية
  const {
    targetCode, filteredOrders, treasury, totalSales, totalPaid, totalRemaining,
    effectiveExpenses, totalProfit, profitMarginPct, cashFlow, atelierStages,
    qualityMetrics, svgCoordinates, urgentOrders, avgOrderValue,
    chartWidth, chartHeight, chartPadding, fmt
  } = useData({
    orders, accounts, journal, vouchers, purchases, expenses, factory, customers,
    currency, timeHorizon, trendMode
  });

  // 4. استدعاء المكونات من النطاق العام
  const HeaderComp = window.DashboardHeader || window.DashboardHero;
  const KpiGridComp = window.ExecutiveKpiGrid || window.DashboardMetricsGrid;
  const ChartsComp = window.DashboardCharts || window.RevenueCurve;
  const DeliveriesComp = window.UpcomingDeliveriesCard || window.LivePipeline;

  return (
    <div className="px-2.5 pb-2.5 pt-1.5 mt-0.5 space-y-2 animate-fadeIn text-right font-sans overflow-x-hidden select-none" dir="rtl">
      {/* المستوى 1: شريط الفلترة والتنبيهات المدمج (h-9) */}
      {HeaderComp && (
        <HeaderComp
          timeHorizon={timeHorizon}
          setTimeHorizon={setTimeHorizon}
          watchdogData={watchdogData}
          urgentOrders={urgentOrders}
        />
      )}

      {/* المستوى 2: شبكة المؤشرات التنفيذية الستة في صف واحد */}
      {KpiGridComp && (
        <KpiGridComp
          totalSales={totalSales}
          totalProfit={totalProfit}
          profitMarginPct={profitMarginPct}
          filteredOrdersCount={filteredOrders.length}
          atelierStages={atelierStages}
          totalRemaining={totalRemaining}
          treasury={treasury}
          targetCode={targetCode}
          currency={currency}
          fmt={fmt}
          setActiveTab={setActiveTab}
        />
      )}

      {/* المستوى 3: مساحة العمليات المقسمة (60% أوامر وتسليمات / 40% تدفق تشغيلي ومخطط) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
        {/* الجانب الأيمن (60%): مواعيد التسليم ورادار المشغل */}
        <div className="lg:col-span-7">
          {DeliveriesComp && (
            <DeliveriesComp
              urgentOrders={urgentOrders}
              watchdogData={watchdogData}
              onSendWhatsApp={handleSendWhatsApp}
              setActiveTab={setActiveTab}
            />
          )}
        </div>

        {/* الجانب الأيسر (40%): منحنى المبيعات ومراحل الإنتاج الـ 5 */}
        <div className="lg:col-span-5">
          {ChartsComp && (
            <ChartsComp
              trendMode={trendMode}
              setTrendMode={setTrendMode}
              hoveredPoint={hoveredPoint}
              setHoveredPoint={setHoveredPoint}
              svgCoordinates={svgCoordinates}
              chartWidth={chartWidth}
              chartHeight={120}
              chartPadding={18}
              totalSales={totalSales}
              avgOrderValue={avgOrderValue}
              filteredOrdersCount={filteredOrders.length}
              atelierStages={atelierStages}
              currency={currency}
              fmt={fmt}
              setActiveTab={setActiveTab}
            />
          )}
        </div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.Dashboard = Dashboard;
}

