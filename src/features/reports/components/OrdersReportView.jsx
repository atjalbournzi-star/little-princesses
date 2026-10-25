// src/features/reports/components/OrdersReportView.jsx

function OrdersReportView({ dailySalesData, modelProfitabilityData, reportCurrency, fmtMoney }) {
  return (
    <div className="space-y-2.5 animate-fadeIn">
      {/* بطاقات المؤشرات المالية لحركة المبيعات والتحصيل */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-[#111C38] p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10.5px] font-medium text-slate-300">إجمالي المبيعات المحققة</span>
            <span className="w-5.5 h-5.5 rounded-md bg-slate-800/80 text-slate-300 text-xs flex items-center justify-center border border-slate-700/60">🛍️</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-mono tabular-nums">
            {fmtMoney(dailySalesData.totalSales)}
            <span className="text-[10px] text-slate-400 mr-1">{reportCurrency}</span>
          </div>
        </div>

        <div className="bg-[#111C38] p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10.5px] font-medium text-slate-300">التحصيل النقدي الفعلي (Cash)</span>
            <span className="w-5.5 h-5.5 rounded-md bg-slate-800/80 text-slate-300 text-xs flex items-center justify-center border border-slate-700/60">💵</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-mono tabular-nums">
            {fmtMoney(dailySalesData.totalCash)}
            <span className="text-[10px] text-slate-400 mr-1">{reportCurrency}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800 font-mono">
              نسبة التحصيل: {dailySalesData.overallCollectionRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-[#111C38] p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10.5px] font-medium text-slate-300">الذمم والآجل المتبقي (Credit)</span>
            <span className="w-5.5 h-5.5 rounded-md bg-slate-800/80 text-slate-300 text-xs flex items-center justify-center border border-slate-700/60">📑</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-mono tabular-nums">
            {fmtMoney(dailySalesData.totalCredit)}
            <span className="text-[10px] text-slate-400 mr-1">{reportCurrency}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800 font-mono">
              نسبة الآجل: {dailySalesData.creditRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-[#111C38] p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10.5px] font-medium text-slate-300">متوسط التحصيل اليومي</span>
            <span className="w-5.5 h-5.5 rounded-md bg-slate-800/80 text-slate-300 text-xs flex items-center justify-center border border-slate-700/60">📊</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-mono tabular-nums">
            {fmtMoney(dailySalesData.days.length > 0 ? (dailySalesData.totalSales / dailySalesData.days.length) : 0)}
            <span className="text-[10px] text-slate-400 mr-1">{reportCurrency}</span>
          </div>
        </div>
      </div>

      {/* جدول حركة المبيعات والتحصيل اليومي */}
      <div className="bg-[#111C38] rounded-xl border border-slate-800 overflow-hidden shadow-2xs">
        <div className="px-3 py-2 bg-[#0F172A] border-b border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>📅</span>
              <span>جدول حركة المبيعات والتحصيل اليومي (Daily Sales & Collections Ledger)</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">تتبع تدفق المبيعات ونسب التحصيل النقدي والآجل لكل يوم عمل</p>
          </div>
          <span className="text-[10px] font-mono font-bold text-pink-300 bg-pink-950/60 px-2 py-0.5 rounded-md border border-pink-700/60 shrink-0">
            {dailySalesData.days.length} يوم مسجل
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#0F172A] border-b border-slate-800 text-slate-300">
                <th className="px-3 py-2 text-[10.5px] font-semibold text-slate-300">التاريخ</th>
                <th className="px-3 py-2 text-[10.5px] font-semibold text-slate-300 text-center">الطلبات</th>
                <th className="px-3 py-2 text-[10.5px] font-semibold text-slate-300 text-left">إجمالي المبيعات</th>
                <th className="px-3 py-2 text-[10.5px] font-semibold text-slate-300 text-left">المحصل نقداً</th>
                <th className="px-3 py-2 text-[10.5px] font-semibold text-slate-300 text-left">الآجل المتبقي</th>
                <th className="px-3 py-2 text-[10.5px] font-semibold text-slate-300 text-center">نسبة التحصيل</th>
                <th className="px-3 py-2 text-[10.5px] font-semibold text-slate-300 text-center">حالة السيولة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-[#111C38]">
              {dailySalesData.days.length === 0 ? (
                <tr><td colSpan="7" className="p-6 text-center text-slate-400 font-medium">لا توجد حركة مبيعات مسجلة في هذه الفترة 🌸</td></tr>
              ) : (
                dailySalesData.days.map((day, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2 font-mono text-xs font-medium text-white">{day.date}</td>
                    <td className="px-3 py-2 text-center font-mono text-xs text-white font-medium">{day.orderCount}</td>
                    <td className="px-3 py-2 text-left font-mono text-xs font-medium text-white">{fmtMoney(day.totalSales)} <span className="text-[10px] text-slate-400 mr-1">{reportCurrency}</span></td>
                    <td className="px-3 py-2 text-left font-mono text-xs font-medium text-white">{fmtMoney(day.cashCollected)} <span className="text-[10px] text-slate-400 mr-1">{reportCurrency}</span></td>
                    <td className="px-3 py-2 text-left font-mono text-xs font-medium text-white">{fmtMoney(day.creditRemaining)} <span className="text-[10px] text-slate-400 mr-1">{reportCurrency}</span></td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ease-out ${day.collectionRate >= 80 ? 'bg-emerald-500' : (day.collectionRate >= 50 ? 'bg-amber-500' : 'bg-rose-500')}`} style={{ width: `${Math.min(100, day.collectionRate)}%` }}></div>
                        </div>
                        <span className="font-mono font-bold text-[10px] text-slate-300">{day.collectionRate.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {day.collectionRate >= 100 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800">تحصيل تام ✔️</span>
                      ) : day.collectionRate >= 50 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800">تحصيل جزئي ⚖️</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-800">آجل مرتفع ⚠️</span>
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
      <div className="bg-[#111C38] rounded-xl border border-slate-800 overflow-hidden shadow-2xs">
        <div className="px-3 py-2 bg-[#0F172A] border-b border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>👗</span>
              <span>التحليل المالي اللحظي لربحية الموديلات والفساتين (Per-Dress Model P&L)</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">حساب هامش الربح الحقيقي لكل فستان وموديل (سعر البيع - تكلفة الأقمشة والمصنعية)</p>
          </div>
          <span className="text-[10px] font-mono font-bold text-pink-300 bg-pink-950/60 px-2 py-0.5 rounded-md border border-pink-700/60 shrink-0">
            {modelProfitabilityData.length} موديل مفحوص
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#0F172A] border-b border-slate-800 text-slate-300">
                <th className="px-3 py-2 text-[10.5px] font-semibold text-slate-300">الموديل / الفستان</th>
                <th className="px-3 py-2 text-[10.5px] font-semibold text-slate-300">التصنيف</th>
                <th className="px-3 py-2 text-[10.5px] font-semibold text-slate-300 text-left">سعر البيع</th>
                <th className="px-3 py-2 text-[10.5px] font-semibold text-slate-300 text-left">تكلفة الأقمشة</th>
                <th className="px-3 py-2 text-[10.5px] font-semibold text-slate-300 text-left">أجور المصنعية</th>
                <th className="px-3 py-2 text-[10.5px] font-semibold text-slate-300 text-left">إجمالي التكلفة</th>
                <th className="px-3 py-2 text-[10.5px] font-semibold text-slate-300 text-left">مجمل الربح</th>
                <th className="px-3 py-2 text-[10.5px] font-semibold text-slate-300 text-center">الهامش %</th>
                <th className="px-3 py-2 text-[10.5px] font-semibold text-slate-300 text-center">التقييم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-[#111C38]">
              {modelProfitabilityData.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-3 py-2 font-medium text-white flex items-center gap-1.5"><span className="text-xs">👑</span><span className="text-xs">{m.name}</span></td>
                  <td className="px-3 py-2 text-xs text-slate-300">{m.category}</td>
                  <td className="px-3 py-2 text-left font-mono text-xs font-medium text-white">{fmtMoney(m.sellingPrice)} <span className="text-[10px] text-slate-400 mr-1">{reportCurrency}</span></td>
                  <td className="px-3 py-2 text-left font-mono text-xs text-slate-300">{fmtMoney(m.fabricCost)} <span className="text-[10px] text-slate-400 mr-1">{reportCurrency}</span></td>
                  <td className="px-3 py-2 text-left font-mono text-xs text-slate-300">{fmtMoney(m.laborCost)} <span className="text-[10px] text-slate-400 mr-1">{reportCurrency}</span></td>
                  <td className="px-3 py-2 text-left font-mono text-xs font-medium text-white">{fmtMoney(m.totalCost)} <span className="text-[10px] text-slate-400 mr-1">{reportCurrency}</span></td>
                  <td className="px-3 py-2 text-left font-mono text-xs font-bold text-white bg-slate-800/40">{fmtMoney(m.profit)} <span className="text-[10px] text-slate-400 mr-1">{reportCurrency}</span></td>
                  <td className="px-3 py-2 text-center"><span className="font-mono font-bold text-[10px] text-pink-300 bg-pink-950/60 border border-pink-700/60 px-1.5 py-0.5 rounded-md">{m.marginPct.toFixed(1)}%</span></td>
                  <td className="px-3 py-2 text-center">
                    {m.marginPct >= 40 ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800">فائق الربحية 💎</span> : (m.marginPct >= 25 ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/60 text-blue-300 border border-blue-800">ربحية جيدة ⭐</span> : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800">هامش قياسي 🏷️</span>)}
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
