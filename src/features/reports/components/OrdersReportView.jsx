// src/features/reports/components/OrdersReportView.jsx

function OrdersReportView({ dailySalesData, modelProfitabilityData, reportCurrency, fmtMoney }) {
  return (
    <div className="space-y-1.5 animate-fadeIn select-none">
      {/* بطاقات المؤشرات المالية لحركة المبيعات والتحصيل */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 my-0.5 shrink-0">
        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">إجمالي المبيعات</span>
          <span className="text-[11px] font-bold text-slate-900 dark:text-white font-mono tracking-tight tabular-nums">
            {fmtMoney(dailySalesData.totalSales)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">التحصيل النقدي</span>
            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
              {dailySalesData.overallCollectionRate.toFixed(1)}%
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-900 dark:text-white font-mono tracking-tight tabular-nums">
            {fmtMoney(dailySalesData.totalCash)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">الذمم والآجل</span>
            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono">
              {dailySalesData.creditRate.toFixed(1)}%
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-900 dark:text-white font-mono tracking-tight tabular-nums">
            {fmtMoney(dailySalesData.totalCredit)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">متوسط التحصيل اليومي</span>
          <span className="text-[11px] font-bold text-slate-900 dark:text-white font-mono tracking-tight tabular-nums">
            {fmtMoney(dailySalesData.days.length > 0 ? (dailySalesData.totalSales / dailySalesData.days.length) : 0)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span>
          </span>
        </div>
      </div>

      {/* جدول حركة المبيعات والتحصيل اليومي */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 overflow-hidden shadow-xs">
        <div className="h-7.5 px-3 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span>جدول حركة المبيعات والتحصيل اليومي (Daily Sales & Collections Ledger)</span>
          </h3>
          <span className="text-[10px] font-mono font-bold text-pink-600 dark:text-pink-300 bg-pink-500/10 px-2 py-0.2 rounded-md border border-pink-200 dark:border-pink-700/60 shrink-0">
            {dailySalesData.days.length} يوم مسجل
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right text-[11px]">
            <thead>
              <tr className="h-7.5 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <th className="px-2.5 py-1">التاريخ</th>
                <th className="px-2.5 py-1 text-center">الطلبات</th>
                <th className="px-2.5 py-1 text-left font-mono">إجمالي المبيعات</th>
                <th className="px-2.5 py-1 text-left font-mono">المحصل نقداً</th>
                <th className="px-2.5 py-1 text-left font-mono">الآجل المتبقي</th>
                <th className="px-2.5 py-1 text-center">نسبة التحصيل</th>
                <th className="px-2.5 py-1 text-center">حالة السيولة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
              {dailySalesData.days.length === 0 ? (
                <tr><td colSpan="7" className="p-5 text-center text-slate-500 dark:text-slate-400 font-medium">لا توجد حركة مبيعات مسجلة في هذه الفترة 🌸</td></tr>
              ) : (
                dailySalesData.days.map((day, idx) => (
                  <tr key={idx} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-2.5 py-1 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">{day.date}</td>
                    <td className="px-2.5 py-1 text-center font-mono text-[11px] text-slate-800 dark:text-white tabular-nums">{day.orderCount}</td>
                    <td className="px-2.5 py-1 text-left font-mono text-[11px] font-bold text-slate-900 dark:text-white tabular-nums">{fmtMoney(day.totalSales)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span></td>
                    <td className="px-2.5 py-1 text-left font-mono text-[11px] font-bold text-sky-600 dark:text-sky-400 tabular-nums">{fmtMoney(day.cashCollected)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span></td>
                    <td className="px-2.5 py-1 text-left font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">{fmtMoney(day.creditRemaining)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span></td>
                    <td className="px-2.5 py-1 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ease-out ${day.collectionRate >= 80 ? 'bg-emerald-500' : (day.collectionRate >= 50 ? 'bg-amber-500' : 'bg-rose-500')}`} style={{ width: `${Math.min(100, day.collectionRate)}%` }}></div>
                        </div>
                        <span className="font-mono font-bold text-[10px] text-slate-600 dark:text-slate-300 tabular-nums">{day.collectionRate.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-2.5 py-1 text-center">
                      {day.collectionRate >= 100 ? (
                        <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">تحصيل تام</span>
                      ) : day.collectionRate >= 50 ? (
                        <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800">تحصيل جزئي</span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800">آجل مرتفع</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* جدول التحليل المالي اللحظي لربحية الموديلات والفساتين */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 overflow-hidden shadow-xs">
        <div className="h-7.5 px-3 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
            <span>التحليل المالي اللحظي لربحية الموديلات (Per-Dress Model P&L)</span>
          </h3>
          <span className="text-[10px] font-mono font-bold text-pink-600 dark:text-pink-300 bg-pink-500/10 px-2 py-0.2 rounded-md border border-pink-200 dark:border-pink-700/60 shrink-0">
            {modelProfitabilityData.length} موديل مفحوص
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right text-[11px]">
            <thead>
              <tr className="h-7.5 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <th className="px-2.5 py-1">الموديل / الفستان</th>
                <th className="px-2.5 py-1">التصنيف</th>
                <th className="px-2.5 py-1 text-left font-mono">سعر البيع</th>
                <th className="px-2.5 py-1 text-left font-mono">تكلفة الأقمشة</th>
                <th className="px-2.5 py-1 text-left font-mono">أجور المصنعية</th>
                <th className="px-2.5 py-1 text-left font-mono">إجمالي التكلفة</th>
                <th className="px-2.5 py-1 text-left font-mono">مجمل الربح</th>
                <th className="px-2.5 py-1 text-center font-mono">الهامش %</th>
                <th className="px-2.5 py-1 text-center">التقييم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
              {modelProfitabilityData.map((m, idx) => (
                <tr key={idx} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-2.5 py-1 font-medium text-slate-800 dark:text-white">{m.name}</td>
                  <td className="px-2.5 py-1 text-slate-600 dark:text-slate-300">{m.category}</td>
                  <td className="px-2.5 py-1 text-left font-mono font-bold text-slate-900 dark:text-white tabular-nums">{fmtMoney(m.sellingPrice)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span></td>
                  <td className="px-2.5 py-1 text-left font-mono text-slate-600 dark:text-slate-300 tabular-nums">{fmtMoney(m.fabricCost)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span></td>
                  <td className="px-2.5 py-1 text-left font-mono text-slate-600 dark:text-slate-300 tabular-nums">{fmtMoney(m.laborCost)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span></td>
                  <td className="px-2.5 py-1 text-left font-mono font-bold text-slate-900 dark:text-white tabular-nums">{fmtMoney(m.totalCost)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span></td>
                  <td className="px-2.5 py-1 text-left font-mono font-bold text-slate-900 dark:text-white tabular-nums bg-slate-50 dark:bg-slate-800/40">{fmtMoney(m.profit)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span></td>
                  <td className="px-2.5 py-1 text-center"><span className="font-mono font-bold text-[10px] text-pink-600 dark:text-pink-300 bg-pink-500/10 border border-pink-200 dark:border-pink-700/60 px-1.5 py-0.2 rounded">{m.marginPct.toFixed(1)}%</span></td>
                  <td className="px-2.5 py-1 text-center">
                    {m.marginPct >= 40 ? <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">فائق الربحية</span> : (m.marginPct >= 25 ? <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800">ربحية جيدة</span> : <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800">هامش قياسي</span>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.OrdersReportView = OrdersReportView;
}
