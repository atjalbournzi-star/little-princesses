// src/features/reports/components/ProductionReportView.jsx
// عرض تقارير إنتاجية ومراحل المعمل وأجور الفنيين (Production Views)

function ProductionReportView({ productionStats, orders = [], reportCurrency, fmtMoney }) {
  const ords = Array.isArray(orders) ? orders : [];
  const stagesList = [
    { name: 'مرحلة القص ✂️', count: ords.filter(o => o.stage === 'مرحلة القص ✂️' || o.production_status === 'مرحلة القص ✂️').length, icon: '✂️' },
    { name: 'قيد الخياطة 🪡', count: ords.filter(o => o.stage === 'قيد الخياطة 🪡' || o.production_status === 'قيد الخياطة 🪡').length, icon: '🪡' },
    { name: 'التطريز والشك 👑', count: ords.filter(o => (o.stage || '').includes('شك') || (o.production_status || '').includes('شك')).length, icon: '👑' },
    { name: 'جاهز وفحص الجودة 🎁', count: ords.filter(o => (o.stage || '').includes('جاهز') || (o.stage || '').includes('تسليم')).length, icon: '🎁' }
  ];

  return (
    <div className="space-y-3 animate-fadeIn select-none">
      {/* بطاقات المؤشرات المالية والتشغيلية لمعمل الخياطة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-[#111C38] p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-semibold text-slate-300">إجمالي أوامر التشغيل</span>
            <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">📋</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-mono">
            {productionStats.totalOrders}
            <span className="text-[10px] text-slate-400 mr-1 font-sans">أمر</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 pt-1 border-t border-slate-800/80 text-[9.5px]">
            <span className="text-emerald-300 font-bold bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800 font-mono">✅ {productionStats.completedCount} مكتمل</span>
            <span className="text-amber-300 font-bold bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800 font-mono">⏳ {productionStats.inProdCount} جاري</span>
          </div>
        </div>

        <div className="bg-[#111C38] p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-semibold text-slate-300">الفساتين المكتملة</span>
            <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">👗</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-mono">
            {productionStats.completedCount}
            <span className="text-[10px] text-slate-400 mr-1 font-sans">فستان</span>
          </div>
        </div>

        <div className="bg-[#111C38] p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-semibold text-slate-300">استهلاك الأقمشة المقصوصة</span>
            <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">✂️</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-mono">
            {productionStats.totalFabricUsed.toFixed(1)}
            <span className="text-[10px] text-slate-400 mr-1 font-sans">متر قماش</span>
          </div>
        </div>

        <div className="bg-[#111C38] p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-semibold text-slate-300">أجور ومستحقات الخياطين</span>
            <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">💰</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-mono">
            {fmtMoney(productionStats.totalWages)}
            <span className="text-[10px] text-slate-400 mr-1">{reportCurrency}</span>
          </div>
        </div>
      </div>

      {/* توزيع أوامر العمل على مراحل الإنتاج - شريط أفقي مدمج */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stagesList.map(st => (
          <div key={st.name} className="px-2.5 py-1.5 rounded-lg bg-[#111C38] border border-slate-800 hover:border-slate-700 shadow-2xs flex items-center justify-between gap-1.5 transition-all">
            <span className="text-[10.5px] font-medium text-slate-300 truncate">{st.name}</span>
            <span className="text-xs font-mono font-bold text-white bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700/80 flex items-center gap-1 shrink-0">
              <span className="text-[11px]">{st.icon}</span>
              <span>{st.count}</span>
            </span>
          </div>
        ))}
      </div>

      {/* جدول أوامر الإنتاج ومعدل إنجاز المراحل وأجور الخياطين */}
      <div className="bg-[#111C38] rounded-xl border border-slate-800 overflow-hidden shadow-2xs">
        <div className="px-3.5 py-2 bg-[#0F172A] border-b border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <span className="text-pink-400">🏭</span>
              <span>جدول متابعة إنتاجية المعمل وأجور الفنيين (Production & Tailor Wages Ledger)</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">تتبع مراحل كل فستان، أجور الخياطين المسجلة، ونسب تقدم خطوط التصنيع</p>
          </div>
          <span className="text-[10.5px] font-mono font-bold text-pink-300 bg-pink-950/60 px-2.5 py-0.5 rounded-lg border border-pink-700/60 shrink-0">
            {ords.length} أمر مسجل
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#0F172A] border-b border-slate-800 text-slate-400">
                <th className="px-3 py-2 text-[10.5px] font-bold">رقم الطلب</th>
                <th className="px-3 py-2 text-[10.5px] font-bold">العميلة</th>
                <th className="px-3 py-2 text-[10.5px] font-bold">الموديل / الفستان</th>
                <th className="px-3 py-2 text-[10.5px] font-bold">المرحلة الحالية</th>
                <th className="px-3 py-2 text-[10.5px] font-bold text-center">الخام المستخدم</th>
                <th className="px-3 py-2 text-[10.5px] font-bold text-left">أجر الخياط</th>
                <th className="px-3 py-2 text-[10.5px] font-bold text-center">حالة الإنجاز</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-[#111C38]/90">
              {ords.length === 0 ? (
                <tr><td colSpan="7" className="p-6 text-center text-slate-400 font-medium">لا توجد أوامر إنتاج مسجلة في هذه الفترة ✂️</td></tr>
              ) : (
                ords.slice(0, 50).map((o, idx) => {
                  const stage = o.stage || o.production_status || 'قيد الخياطة 🪡';
                  const isDone = stage.includes('جاهز') || stage.includes('تسليم');
                  const wage = parseFloat(o.tailor_wage || o.tailor_fee || o.labor_cost || 0);
                  const fabric = parseFloat(o.fabric_meters || o.meters || 2.5);
                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-1.5 font-mono text-[11px] font-bold text-pink-400">{o.order_no || `ORD-${o.id}`}</td>
                      <td className="px-3 py-1.5 text-xs font-medium text-white">{o.customer_name || '—'}</td>
                      <td className="px-3 py-1.5 text-xs font-semibold text-white">{o.product_name || o.model_name || 'فستان كوتور'}</td>
                      <td className="px-3 py-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800/90 border border-slate-700 text-slate-300">
                          {stage}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-center font-mono text-xs text-white">{fabric} متر</td>
                      <td className="px-3 py-1.5 text-left font-mono text-xs font-medium text-white">{fmtMoney(wage)} <span className="text-[10px] text-slate-400 mr-1">{reportCurrency}</span></td>
                      <td className="px-3 py-1.5 text-center">
                        {isDone ? (
                          <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800 font-mono">مكتمل 100% ✔️</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800 font-mono">قيد التشغيل ⏳</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.ProductionReportView = ProductionReportView;
}
