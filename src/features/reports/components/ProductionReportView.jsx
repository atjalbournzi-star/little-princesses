// src/features/reports/components/ProductionReportView.jsx

function ProductionReportView({ productionStats, orders = [], reportCurrency, fmtMoney }) {
  const ords = Array.isArray(orders) ? orders : [];
  const stagesList = [
    { name: 'مرحلة القص ✂️', count: ords.filter(o => o.stage === 'مرحلة القص ✂️' || o.production_status === 'مرحلة القص ✂️').length, icon: '✂️', color: 'text-purple-700 bg-purple-500/10' },
    { name: 'قيد الخياطة 🪡', count: ords.filter(o => o.stage === 'قيد الخياطة 🪡' || o.production_status === 'قيد الخياطة 🪡').length, icon: '🪡', color: 'text-blue-700 bg-blue-500/10' },
    { name: 'التطريز والشك 👑', count: ords.filter(o => (o.stage || '').includes('شك') || (o.production_status || '').includes('شك')).length, icon: '👑', color: 'text-amber-700 bg-amber-500/10' },
    { name: 'جاهز وفحص الجودة 🎁', count: ords.filter(o => (o.stage || '').includes('جاهز') || (o.stage || '').includes('تسليم')).length, icon: '🎁', color: 'text-emerald-700 bg-emerald-500/10' }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* بطاقات المؤشرات المالية والتشغيلية لمعمل الخياطة بخط أبيض ناصع */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">إجمالي أوامر التشغيل</span>
            <span className="w-6 h-6 rounded-md bg-slate-800/80 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">📋</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {productionStats.totalOrders}
            <span className="text-xs font-sans text-white mr-1.5">أمر إنتاج</span>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800 text-[11px]">
            <span className="text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">✅ {productionStats.completedCount} مكتمل</span>
            <span className="text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">⏳ {productionStats.inProdCount} جاري</span>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">الفساتين المكتملة</span>
            <span className="w-6 h-6 rounded-md bg-slate-800/80 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">👗</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {productionStats.completedCount}
            <span className="text-xs font-sans text-white mr-1.5">فستان فاخر</span>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">استهلاك الأقمشة المقصوصة</span>
            <span className="w-6 h-6 rounded-md bg-slate-800/80 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">✂️</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {productionStats.totalFabricUsed.toFixed(1)}
            <span className="text-xs font-sans text-white mr-1.5">متر قماش</span>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">أجور ومستحقات الخياطين</span>
            <span className="w-6 h-6 rounded-md bg-slate-800/80 text-slate-400 text-xs flex items-center justify-center border border-slate-700/60">💰</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {fmtMoney(productionStats.totalWages)}
            <span className="text-xs font-sans text-white mr-1.5">{reportCurrency}</span>
          </div>
        </div>
      </div>

      {/* توزيع أوامر العمل على مراحل الإنتاج بأيقونات رقيقة ناعمة */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stagesList.map(st => (
          <div key={st.name} className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-white block mb-1">{st.name}</span>
              <span className="font-mono font-bold text-base text-white">{st.count} أمر</span>
            </div>
            <span className="w-7 h-7 rounded-lg bg-slate-800/80 text-slate-400 border border-slate-700/60 flex items-center justify-center text-xs">
              {st.icon}
            </span>
          </div>
        ))}
      </div>

      {/* جدول أوامر الإنتاج ومعدل إنجاز المراحل وأجور الخياطين بخطوط بيضاء ناصعة */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xs">
        <div className="p-4.5 bg-slate-900 border-b border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🏭</span>
              <span>جدول متابعة إنتاجية المعمل وأجور الفنيين (Production & Tailor Wages Ledger)</span>
            </h3>
            <p className="text-[11px] text-white mt-0.5">تتبع مراحل كل فستان، أجور الخياطين المسجلة، ونسب تقدم خطوط التصنيع</p>
          </div>
          <span className="text-xs font-mono font-bold text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
            {ords.length} أمر مسجل
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-white">
                <th className="px-4 py-3 font-medium text-white">رقم الطلب</th>
                <th className="px-4 py-3 font-medium text-white">العميلة</th>
                <th className="px-4 py-3 font-medium text-white">الموديل / الفستان</th>
                <th className="px-4 py-3 font-medium text-white">المرحلة الحالية</th>
                <th className="px-4 py-3 font-medium text-white text-center">الخام المستخدم</th>
                <th className="px-4 py-3 font-medium text-white text-left">أجر الخياط</th>
                <th className="px-4 py-3 font-medium text-white text-center">حالة الإنجاز</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/60">
              {ords.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-white font-medium">لا توجد أوامر إنتاج مسجلة في هذه الفترة ✂️</td></tr>
              ) : (
                ords.slice(0, 50).map((o, idx) => {
                  const stage = o.stage || o.production_status || 'قيد الخياطة 🪡';
                  const isDone = stage.includes('جاهز') || stage.includes('تسليم');
                  const wage = parseFloat(o.tailor_wage || o.tailor_fee || o.labor_cost || 0);
                  const fabric = parseFloat(o.fabric_meters || o.meters || 2.5);
                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-white">{o.order_no || `ORD-${o.id}`}</td>
                      <td className="px-4 py-3 font-medium text-white">{o.customer_name || '—'}</td>
                      <td className="px-4 py-3 font-medium text-white">{o.product_name || o.model_name || 'فستان كوتور'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 border border-slate-700 text-white">
                          {stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-medium text-white">{fabric} متر</td>
                      <td className="px-4 py-3 text-left font-mono font-medium text-white">{fmtMoney(wage)} {reportCurrency}</td>
                      <td className="px-4 py-3 text-center">
                        {isDone ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800">مكتمل 100% ✔️</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800">قيد التشغيل ⏳</span>
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
