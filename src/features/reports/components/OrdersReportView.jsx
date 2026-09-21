// src/features/reports/components/OrdersReportView.jsx

function OrdersReportView({ dailySalesData, modelProfitabilityData, reportCurrency, fmtMoney }) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* بطاقات المؤشرات المالية لحركة المبيعات والتحصيل */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#6F6B75]">إجمالي المبيعات المحققة</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-[#8F2A87] flex items-center justify-center text-sm font-bold">🛍️</span>
          </div>
          <div className="text-xl font-black text-[#25232A] font-mono">
            {fmtMoney(dailySalesData.totalSales)}
            <span className="text-xs font-sans text-[#6F6B75] mr-1.5">{reportCurrency}</span>
          </div>
          <p className="text-[11px] text-[#6F6B75] mt-1">عدد الطلبات: {dailySalesData.orderCount} طلب</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#6F6B75]">التحصيل النقدي الفعلي (Cash)</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-bold">💵</span>
          </div>
          <div className="text-xl font-black text-emerald-700 font-mono">
            {fmtMoney(dailySalesData.totalCash)}
            <span className="text-xs font-sans text-[#6F6B75] mr-1.5">{reportCurrency}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
              نسبة التحصيل: {dailySalesData.overallCollectionRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#6F6B75]">الذمم والآجل المتبقي (Credit)</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-sm font-bold">📑</span>
          </div>
          <div className="text-xl font-black text-amber-700 font-mono">
            {fmtMoney(dailySalesData.totalCredit)}
            <span className="text-xs font-sans text-[#6F6B75] mr-1.5">{reportCurrency}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono">
              نسبة الآجل: {dailySalesData.creditRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#6F6B75]">متوسط التحصيل اليومي</span>
            <span className="w-8 h-8 rounded-xl bg-cyan-50 text-[#007F8C] flex items-center justify-center text-sm font-bold">📊</span>
          </div>
          <div className="text-xl font-black text-[#007F8C] font-mono">
            {fmtMoney(dailySalesData.days.length > 0 ? (dailySalesData.totalSales / dailySalesData.days.length) : 0)}
            <span className="text-xs font-sans text-[#6F6B75] mr-1.5">{reportCurrency}</span>
          </div>
          <p className="text-[11px] text-[#6F6B75] mt-1">عبر {dailySalesData.days.length} يوم نشط</p>
        </div>
      </div>

      {/* جدول حركة المبيعات والتحصيل اليومي */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] overflow-hidden shadow-2xs">
        <div className="p-4.5 bg-gradient-to-r from-[#FAFAFB] to-white border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#25232A] flex items-center gap-2">
              <span>📅</span>
              <span>جدول حركة المبيعات والتحصيل اليومي (Daily Sales & Collections Ledger)</span>
            </h3>
            <p className="text-[11px] text-[#6F6B75] mt-0.5">تتبع تدفق المبيعات ونسب التحصيل النقدي والآجل لكل يوم عمل</p>
          </div>
          <span className="text-xs font-mono font-bold text-[#007F8C] bg-[#E2F5F7] px-3 py-1 rounded-lg">
            {dailySalesData.days.length} يوم مسجل
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#FAFAFB] border-b border-[#E8E5EA] text-[#6F6B75]">
                <th className="px-4 py-3 font-bold">التاريخ</th>
                <th className="px-4 py-3 font-bold text-center">الطلبات</th>
                <th className="px-4 py-3 font-bold text-left">إجمالي المبيعات</th>
                <th className="px-4 py-3 font-bold text-left text-emerald-700">المحصل نقداً</th>
                <th className="px-4 py-3 font-bold text-left text-amber-700">الآجل المتبقي</th>
                <th className="px-4 py-3 font-bold text-center">نسبة التحصيل</th>
                <th className="px-4 py-3 font-bold text-center">حالة السيولة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5EA]">
              {dailySalesData.days.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-[#6F6B75]">لا توجد حركة مبيعات مسجلة في هذه الفترة 🌸</td></tr>
              ) : (
                dailySalesData.days.map((day, idx) => (
                  <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                    <td className="px-4 py-3 font-bold font-mono text-[#25232A]">{day.date}</td>
                    <td className="px-4 py-3 text-center font-mono">{day.orderCount}</td>
                    <td className="px-4 py-3 text-left font-mono font-bold text-[#25232A]">{fmtMoney(day.totalSales)} {reportCurrency}</td>
                    <td className="px-4 py-3 text-left font-mono font-bold text-emerald-700">{fmtMoney(day.cashCollected)} {reportCurrency}</td>
                    <td className="px-4 py-3 text-left font-mono font-bold text-amber-700">{fmtMoney(day.creditRemaining)} {reportCurrency}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full ${day.collectionRate >= 80 ? 'bg-emerald-500' : (day.collectionRate >= 50 ? 'bg-amber-500' : 'bg-rose-500')}`} style={{ width: `${Math.min(100, day.collectionRate)}%` }}></div>
                        </div>
                        <span className="font-mono font-bold text-[11px]">{day.collectionRate.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {day.collectionRate >= 100 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">تحصيل تام ✔️</span>
                      ) : day.collectionRate >= 50 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">تحصيل جزئي ⚖️</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">آجل مرتفع ⚠️</span>
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
      <div className="bg-white rounded-2xl border border-[#E8E5EA] overflow-hidden shadow-2xs">
        <div className="p-4.5 bg-gradient-to-r from-[#FAFAFB] to-white border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#25232A] flex items-center gap-2">
              <span>👗</span>
              <span>التحليل المالي اللحظي لربحية الموديلات والفساتين (Per-Dress Model P&L)</span>
            </h3>
            <p className="text-[11px] text-[#6F6B75] mt-0.5">حساب هامش الربح الحقيقي لكل فستان وموديل (سعر البيع - تكلفة الأقمشة والمصنعية)</p>
          </div>
          <span className="text-xs font-mono font-bold text-[#8F2A87] bg-[#F2E7F3] px-3 py-1 rounded-lg">
            {modelProfitabilityData.length} موديل مفحوص
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#FAFAFB] border-b border-[#E8E5EA] text-[#6F6B75]">
                <th className="px-4 py-3 font-bold">الموديل / الفستان</th>
                <th className="px-4 py-3 font-bold">التصنيف</th>
                <th className="px-4 py-3 font-bold text-left">سعر البيع</th>
                <th className="px-4 py-3 font-bold text-left text-purple-700">تكلفة الأقمشة</th>
                <th className="px-4 py-3 font-bold text-left text-blue-700">أجور المصنعية</th>
                <th className="px-4 py-3 font-bold text-left text-rose-700">إجمالي التكلفة</th>
                <th className="px-4 py-3 font-bold text-left text-emerald-700">مجمل الربح</th>
                <th className="px-4 py-3 font-bold text-center">الهامش %</th>
                <th className="px-4 py-3 font-bold text-center">التقييم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5EA]">
              {modelProfitabilityData.map((m, idx) => (
                <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                  <td className="px-4 py-3 font-bold text-[#25232A] flex items-center gap-2"><span>👑</span><span>{m.name}</span></td>
                  <td className="px-4 py-3 text-[#6F6B75]">{m.category}</td>
                  <td className="px-4 py-3 text-left font-mono font-bold text-[#25232A]">{fmtMoney(m.sellingPrice)} {reportCurrency}</td>
                  <td className="px-4 py-3 text-left font-mono text-purple-700">{fmtMoney(m.fabricCost)} {reportCurrency}</td>
                  <td className="px-4 py-3 text-left font-mono text-blue-700">{fmtMoney(m.laborCost)} {reportCurrency}</td>
                  <td className="px-4 py-3 text-left font-mono font-bold text-rose-700">{fmtMoney(m.totalCost)} {reportCurrency}</td>
                  <td className="px-4 py-3 text-left font-mono font-black text-emerald-700 bg-emerald-50/40">{fmtMoney(m.profit)} {reportCurrency}</td>
                  <td className="px-4 py-3 text-center"><span className="font-mono font-bold text-sm text-[#007F8C] bg-[#E2F5F7] px-2.5 py-0.5 rounded-full">{m.marginPct.toFixed(1)}%</span></td>
                  <td className="px-4 py-3 text-center">
                    {m.marginPct >= 40 ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">فائق الربحية 💎</span> : (m.marginPct >= 25 ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">ربحية جيدة ⭐</span> : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">هامش قياسي 🏷️</span>)}
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
