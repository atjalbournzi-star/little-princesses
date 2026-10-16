// src/features/reports/components/OrdersReportView.jsx

function OrdersReportView({ dailySalesData, modelProfitabilityData, reportCurrency, fmtMoney }) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* بطاقات المؤشرات المالية لحركة المبيعات والتحصيل بخط أبيض ناصع */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">إجمالي المبيعات المحققة</span>
            <span className="w-6 h-6 rounded-md bg-slate-800/80 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">🛍️</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {fmtMoney(dailySalesData.totalSales)}
            <span className="text-xs font-sans text-white mr-1.5">{reportCurrency}</span>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">التحصيل النقدي الفعلي (Cash)</span>
            <span className="w-6 h-6 rounded-md bg-slate-800/80 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">💵</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {fmtMoney(dailySalesData.totalCash)}
            <span className="text-xs font-sans text-white mr-1.5">{reportCurrency}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800 font-mono">
              نسبة التحصيل: {dailySalesData.overallCollectionRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">الذمم والآجل المتبقي (Credit)</span>
            <span className="w-6 h-6 rounded-md bg-slate-800/80 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">📑</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {fmtMoney(dailySalesData.totalCredit)}
            <span className="text-xs font-sans text-white mr-1.5">{reportCurrency}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800 font-mono">
              نسبة الآجل: {dailySalesData.creditRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">متوسط التحصيل اليومي</span>
            <span className="w-6 h-6 rounded-md bg-slate-800/80 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">📊</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {fmtMoney(dailySalesData.days.length > 0 ? (dailySalesData.totalSales / dailySalesData.days.length) : 0)}
            <span className="text-xs font-sans text-white mr-1.5">{reportCurrency}</span>
          </div>
        </div>
      </div>

      {/* جدول حركة المبيعات والتحصيل اليومي بخطوط بيضاء ناصعة */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xs">
        <div className="p-4.5 bg-slate-900 border-b border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📅</span>
              <span>جدول حركة المبيعات والتحصيل اليومي (Daily Sales & Collections Ledger)</span>
            </h3>
            <p className="text-[11px] text-white mt-0.5">تتبع تدفق المبيعات ونسب التحصيل النقدي والآجل لكل يوم عمل</p>
          </div>
          <span className="text-xs font-mono font-bold text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
            {dailySalesData.days.length} يوم مسجل
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-white">
                <th className="px-4 py-3 font-medium text-white">التاريخ</th>
                <th className="px-4 py-3 font-medium text-white text-center">الطلبات</th>
                <th className="px-4 py-3 font-medium text-white text-left">إجمالي المبيعات</th>
                <th className="px-4 py-3 font-medium text-white text-left">المحصل نقداً</th>
                <th className="px-4 py-3 font-medium text-white text-left">الآجل المتبقي</th>
                <th className="px-4 py-3 font-medium text-white text-center">نسبة التحصيل</th>
                <th className="px-4 py-3 font-medium text-white text-center">حالة السيولة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/60">
              {dailySalesData.days.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-white font-medium">لا توجد حركة مبيعات مسجلة في هذه الفترة 🌸</td></tr>
              ) : (
                dailySalesData.days.map((day, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium font-mono text-white">{day.date}</td>
                    <td className="px-4 py-3 text-center font-mono text-white font-medium">{day.orderCount}</td>
                    <td className="px-4 py-3 text-left font-mono font-medium text-white">{fmtMoney(day.totalSales)} {reportCurrency}</td>
                    <td className="px-4 py-3 text-left font-mono font-medium text-white">{fmtMoney(day.cashCollected)} {reportCurrency}</td>
                    <td className="px-4 py-3 text-left font-mono font-medium text-white">{fmtMoney(day.creditRemaining)} {reportCurrency}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${day.collectionRate >= 80 ? 'bg-emerald-500' : (day.collectionRate >= 50 ? 'bg-amber-500' : 'bg-rose-500')}`} style={{ width: `${Math.min(100, day.collectionRate)}%` }}></div>
                        </div>
                        <span className="font-mono font-bold text-[11px] text-white">{day.collectionRate.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
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
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xs">
        <div className="p-4.5 bg-slate-900 border-b border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>👗</span>
              <span>التحليل المالي اللحظي لربحية الموديلات والفساتين (Per-Dress Model P&L)</span>
            </h3>
            <p className="text-[11px] text-white mt-0.5">حساب هامش الربح الحقيقي لكل فستان وموديل (سعر البيع - تكلفة الأقمشة والمصنعية)</p>
          </div>
          <span className="text-xs font-mono font-bold text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
            {modelProfitabilityData.length} موديل مفحوص
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-white">
                <th className="px-4 py-3 font-medium text-white">الموديل / الفستان</th>
                <th className="px-4 py-3 font-medium text-white">التصنيف</th>
                <th className="px-4 py-3 font-medium text-white text-left">سعر البيع</th>
                <th className="px-4 py-3 font-medium text-white text-left">تكلفة الأقمشة</th>
                <th className="px-4 py-3 font-medium text-white text-left">أجور المصنعية</th>
                <th className="px-4 py-3 font-medium text-white text-left">إجمالي التكلفة</th>
                <th className="px-4 py-3 font-medium text-white text-left">مجمل الربح</th>
                <th className="px-4 py-3 font-medium text-white text-center">الهامش %</th>
                <th className="px-4 py-3 font-medium text-white text-center">التقييم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/60">
              {modelProfitabilityData.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-white flex items-center gap-2"><span>👑</span><span>{m.name}</span></td>
                  <td className="px-4 py-3 text-white font-medium">{m.category}</td>
                  <td className="px-4 py-3 text-left font-mono font-medium text-white">{fmtMoney(m.sellingPrice)} {reportCurrency}</td>
                  <td className="px-4 py-3 text-left font-mono text-white font-medium">{fmtMoney(m.fabricCost)} {reportCurrency}</td>
                  <td className="px-4 py-3 text-left font-mono text-white font-medium">{fmtMoney(m.laborCost)} {reportCurrency}</td>
                  <td className="px-4 py-3 text-left font-mono font-medium text-white">{fmtMoney(m.totalCost)} {reportCurrency}</td>
                  <td className="px-4 py-3 text-left font-mono font-bold text-white bg-slate-800/40">{fmtMoney(m.profit)} {reportCurrency}</td>
                  <td className="px-4 py-3 text-center"><span className="font-mono font-bold text-xs text-white bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">{m.marginPct.toFixed(1)}%</span></td>
                  <td className="px-4 py-3 text-center">
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
