// src/features/reports/components/ProductionReportView.jsx
// عرض تقارير إنتاجية ومراحل المعمل وأجور الفنيين (Production Views)

function ProductionReportView({ productionStats = {}, orders = [], reportCurrency, fmtMoney }) {
  const ords = Array.isArray(orders) ? orders : [];
  const stagesList = [
    { name: 'مرحلة القص', count: ords.filter(o => o.stage === 'مرحلة القص ✂️' || o.production_status === 'مرحلة القص ✂️').length },
    { name: 'قيد الخياطة', count: ords.filter(o => o.stage === 'قيد الخياطة 🪡' || o.production_status === 'قيد الخياطة 🪡').length },
    { name: 'التطريز والشك', count: ords.filter(o => (o.stage || '').includes('شك') || (o.production_status || '').includes('شك')).length },
    { name: 'جاهز وفحص الجودة', count: ords.filter(o => (o.stage || '').includes('جاهز') || (o.stage || '').includes('تسليم')).length }
  ];

  return (
    <div className="space-y-1.5 animate-fadeIn select-none">
      {/* بطاقات المؤشرات المالية والتشغيلية لمعمل الخياطة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 my-0.5 shrink-0">
        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">أوامر التشغيل</span>
            <span className="text-[9.5px] font-bold px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
              {productionStats?.completedCount ?? 0} مكتمل
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-900 dark:text-white font-mono tracking-tight tabular-nums">
            {productionStats?.totalOrders ?? 0} <span className="text-[10px] text-slate-400 font-sans">أمر</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">الفساتين المكتملة</span>
          <span className="text-[11px] font-bold text-slate-900 dark:text-white font-mono tracking-tight tabular-nums">
            {productionStats?.completedCount ?? 0} <span className="text-[10px] text-slate-400 font-sans">فستان</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">استهلاك الأقمشة</span>
          <span className="text-[11px] font-bold text-slate-900 dark:text-white font-mono tracking-tight tabular-nums">
            {(productionStats?.totalFabricUsed || 0).toFixed(1)} <span className="text-[10px] text-slate-400 font-sans">متر</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">أجور الخياطين</span>
          <span className="text-[11px] font-bold text-slate-900 dark:text-white font-mono tracking-tight tabular-nums">
            {fmtMoney(productionStats?.totalWages || 0)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span>
          </span>
        </div>
      </div>

      {/* توزيع أوامر العمل على مراحل الإنتاج - شريط أفقي مدمج */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {stagesList.map(st => (
          <div key={st.name} className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-1.5 transition-all">
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">{st.name}</span>
            <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/90 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700/80 shrink-0 tabular-nums">
              {st.count}
            </span>
          </div>
        ))}
      </div>

      {/* جدول أوامر الإنتاج ومعدل إنجاز المراحل وأجور الخياطين */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 overflow-hidden shadow-xs">
        <div className="h-7.5 px-3 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            <span>جدول متابعة إنتاجية المعمل وأجور الفنيين (Production & Tailor Wages Ledger)</span>
          </h3>
          <span className="text-[10px] font-mono font-bold text-pink-600 dark:text-pink-300 bg-pink-500/10 px-2 py-0.2 rounded-md border border-pink-200 dark:border-pink-700/60 shrink-0">
            {ords.length} أمر مسجل
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right text-[11px]">
            <thead>
              <tr className="h-7.5 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <th className="px-2.5 py-1">رقم الطلب</th>
                <th className="px-2.5 py-1">العميل</th>
                <th className="px-2.5 py-1">الموديل / الفستان</th>
                <th className="px-2.5 py-1">المرحلة الحالية</th>
                <th className="px-2.5 py-1 text-center">الخام المستخدم</th>
                <th className="px-2.5 py-1 text-left font-mono">أجر الخياط</th>
                <th className="px-2.5 py-1 text-center">حالة الإنجاز</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
              {ords.length === 0 ? (
                <tr><td colSpan="7" className="p-5 text-center text-slate-500 dark:text-slate-400 font-medium">لا توجد أوامر إنتاج مسجلة في هذه الفترة ✂️</td></tr>
              ) : (
                ords.slice(0, 50).map((o, idx) => {
                  const stage = o.stage || o.production_status || 'قيد الخياطة';
                  const isDone = stage.includes('جاهز') || stage.includes('تسليم');
                  const wage = parseFloat(o.tailor_wage || o.tailor_fee || o.labor_cost || 0);
                  const fabric = parseFloat(o.fabric_meters || o.meters || 2.5);
                  return (
                    <tr key={idx} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-2.5 py-1 font-mono text-[11px] font-bold text-pink-600 dark:text-pink-400 tabular-nums">{o.order_no || `ORD-${o.id}`}</td>
                      <td className="px-2.5 py-1 font-medium text-slate-800 dark:text-white">{o.customer_name || '—'}</td>
                      <td className="px-2.5 py-1 font-semibold text-slate-800 dark:text-white">{o.product_name || o.model_name || 'فستان كوتور'}</td>
                      <td className="px-2.5 py-1">
                        <span className="px-1.5 py-0.2 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                          {stage}
                        </span>
                      </td>
                      <td className="px-2.5 py-1 text-center font-mono text-[11px] text-slate-800 dark:text-white tabular-nums">{fabric} متر</td>
                      <td className="px-2.5 py-1 text-left font-mono text-[11px] font-bold text-slate-900 dark:text-white tabular-nums">{fmtMoney(wage)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span></td>
                      <td className="px-2.5 py-1 text-center">
                        {isDone ? (
                          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">مكتمل 100%</span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800">قيد التشغيل</span>
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
