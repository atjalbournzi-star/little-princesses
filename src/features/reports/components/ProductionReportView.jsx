// src/features/reports/components/ProductionReportView.jsx

function ProductionReportView({ productionStats, orders = [], reportCurrency, fmtMoney }) {
  const ords = Array.isArray(orders) ? orders : [];
  const stagesList = [
    { name: 'مرحلة القص ✂️', count: ords.filter(o => o.stage === 'مرحلة القص ✂️' || o.production_status === 'مرحلة القص ✂️').length, icon: '✂️', color: 'text-purple-700 bg-purple-50' },
    { name: 'قيد الخياطة 🪡', count: ords.filter(o => o.stage === 'قيد الخياطة 🪡' || o.production_status === 'قيد الخياطة 🪡').length, icon: '🪡', color: 'text-blue-700 bg-blue-50' },
    { name: 'التطريز والشك 👑', count: ords.filter(o => (o.stage || '').includes('شك') || (o.production_status || '').includes('شك')).length, icon: '👑', color: 'text-amber-700 bg-amber-50' },
    { name: 'جاهز وفحص الجودة 🎁', count: ords.filter(o => (o.stage || '').includes('جاهز') || (o.stage || '').includes('تسليم')).length, icon: '🎁', color: 'text-emerald-700 bg-emerald-50' }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* بطاقات المؤشرات المالية والتشغيلية لمعمل الخياطة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#6F6B75]">إجمالي أوامر التشغيل</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-[#8F2A87] flex items-center justify-center text-sm font-bold">📋</span>
          </div>
          <div className="text-xl font-black text-[#8F2A87] font-mono">
            {productionStats.totalOrders}
            <span className="text-xs font-sans text-[#6F6B75] mr-1.5">أمر إنتاج</span>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#E8E5EA] text-[11px]">
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">✅ {productionStats.completedCount} مكتمل</span>
            <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded">⏳ {productionStats.inProdCount} جاري</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#6F6B75]">الفساتين المكتملة</span>
            <span className="w-8 h-8 rounded-xl bg-[#E2F5F7] text-[#007F8C] flex items-center justify-center text-sm font-bold">👗</span>
          </div>
          <div className="text-xl font-black text-[#007F8C] font-mono">
            {productionStats.completedCount}
            <span className="text-xs font-sans text-[#6F6B75] mr-1.5">فستان فاخر</span>
          </div>
          <p className="text-[11px] text-[#6F6B75] mt-1">نسبة الإنجاز: {productionStats.totalOrders > 0 ? ((productionStats.completedCount / productionStats.totalOrders) * 100).toFixed(0) : 0}%</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#6F6B75]">استهلاك الأقمشة المقصوصة</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-sm font-bold">✂️</span>
          </div>
          <div className="text-xl font-black text-purple-800 font-mono">
            {productionStats.totalFabricUsed.toFixed(1)}
            <span className="text-xs font-sans text-[#6F6B75] mr-1.5">متر قماش</span>
          </div>
          <p className="text-[11px] text-[#6F6B75] mt-1">المتوسط: {productionStats.totalOrders > 0 ? (productionStats.totalFabricUsed / productionStats.totalOrders).toFixed(1) : 0} متر/فستان</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#6F6B75]">أجور ومستحقات الخياطين</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-sm font-bold">💰</span>
          </div>
          <div className="text-xl font-black text-amber-900 font-mono">
            {fmtMoney(productionStats.totalWages)}
            <span className="text-xs font-sans text-[#6F6B75] mr-1.5">{reportCurrency}</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">تكلفة عمالة تشغيلية مباشرة</p>
        </div>
      </div>

      {/* توزيع أوامر العمل على مراحل الإنتاج */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stagesList.map(st => (
          <div key={st.name} className="p-4 rounded-xl bg-white border border-[#E8E5EA] shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#6F6B75] block mb-1">{st.name}</span>
              <span className="font-mono font-black text-base text-[#25232A]">{st.count} أمر</span>
            </div>
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold ${st.color}`}>
              {st.icon}
            </span>
          </div>
        ))}
      </div>

      {/* جدول أوامر الإنتاج ومعدل إنجاز المراحل وأجور الخياطين */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] overflow-hidden shadow-2xs">
        <div className="p-4.5 bg-gradient-to-r from-[#FAFAFB] to-white border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#25232A] flex items-center gap-2">
              <span>🏭</span>
              <span>جدول متابعة إنتاجية المعمل وأجور الفنيين (Production & Tailor Wages Ledger)</span>
            </h3>
            <p className="text-[11px] text-[#6F6B75] mt-0.5">تتبع مراحل كل فستان، أجور الخياطين المسجلة، ونسب تقدم خطوط التصنيع</p>
          </div>
          <span className="text-xs font-mono font-bold text-[#007F8C] bg-[#E2F5F7] px-3 py-1 rounded-lg">
            {ords.length} أمر مسجل
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#FAFAFB] border-b border-[#E8E5EA] text-[#6F6B75]">
                <th className="px-4 py-3 font-bold">رقم الطلب</th>
                <th className="px-4 py-3 font-bold">العميلة</th>
                <th className="px-4 py-3 font-bold">الموديل / الفستان</th>
                <th className="px-4 py-3 font-bold">المرحلة الحالية</th>
                <th className="px-4 py-3 font-bold text-center">الخام المستخدم</th>
                <th className="px-4 py-3 font-bold text-left text-amber-700">أجر الخياط</th>
                <th className="px-4 py-3 font-bold text-center">حالة الإنجاز</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5EA]">
              {ords.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-[#6F6B75]">لا توجد أوامر إنتاج مسجلة في هذه الفترة ✂️</td></tr>
              ) : (
                ords.slice(0, 50).map((o, idx) => {
                  const stage = o.stage || o.production_status || 'قيد الخياطة 🪡';
                  const isDone = stage.includes('جاهز') || stage.includes('تسليم');
                  const wage = parseFloat(o.tailor_wage || o.tailor_fee || o.labor_cost || 0);
                  const fabric = parseFloat(o.fabric_meters || o.meters || 2.5);
                  return (
                    <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#8F2A87]">{o.order_no || `ORD-${o.id}`}</td>
                      <td className="px-4 py-3 font-medium text-[#25232A]">{o.customer_name || '—'}</td>
                      <td className="px-4 py-3 font-bold text-[#25232A]">{o.product_name || o.model_name || 'فستان كوتور'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FAFAFB] border border-[#E8E5EA] text-[#25232A]">
                          {stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-purple-700">{fabric} متر</td>
                      <td className="px-4 py-3 text-left font-mono font-bold text-amber-800">{fmtMoney(wage)} {reportCurrency}</td>
                      <td className="px-4 py-3 text-center">
                        {isDone ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">مكتمل 100% ✔️</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">قيد التشغيل ⏳</span>
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
