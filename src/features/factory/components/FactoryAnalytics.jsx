/**
 * FactoryAnalytics - لوحة تحليلات تكاليف الموديلات ومؤشرات أداء الفنيين
 */
function FactoryAnalytics({
  loadingAnalytics = false,
  analyticsData = null,
  factory = [],
  fetchFactoryAnalytics
}) {
  const SafeModelCostTable = typeof ModelCostTable !== 'undefined' ? ModelCostTable : (window.ModelCostTable || null);

  if (loadingAnalytics && !analyticsData) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-white rounded-2xl border border-[#E8E5EA] p-16 text-center shadow-xs">
          <div className="text-4xl animate-spin mb-3">🔄</div>
          <p className="text-sm font-bold text-[#25232A]">جاري جلب واحتساب تحليلات التكاليف وهوامش الربح من سوبابيز...</p>
          <p className="text-xs text-[#6F6B75] mt-1">يتم الآن تحليل استهلاك الأقمشة وأجور مراحل الفنيين ومقارنتها بأسعار البيع</p>
        </div>
      </div>
    );
  }

  const completedCount = factory.filter(f => f.progress >= 100 || f.stage === 'جاهز للتسليم 📦' || f.stage === 'تم التسليم ✅').length;
  const inProgressCount = factory.filter(f => f.progress < 100 && f.stage !== 'جاهز للتسليم 📦' && f.stage !== 'تم التسليم ✅').length;
  const totalPieces = factory.reduce((s, f) => s + (parseInt(f.quantity || 1, 10)), 0);
  const totalFabric = factory.reduce((s, f) => s + (parseFloat(f.cut_meters || 0)), 0);
  const stockReceivedCount = factory.filter(f => f.stock_received).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── 4 بطاقات إحصائيات مالية وإنتاجية شاملة ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. أوامر الإنتاج */}
        <div className="bg-white rounded-2xl border border-[#E8E5EA] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#6F6B75]">إجمالي أوامر الإنتاج</span>
            <span className="w-9 h-9 rounded-xl bg-[#F2E7F3] text-[#8F2A87] flex items-center justify-center text-base font-bold">📋</span>
          </div>
          <div className="text-2xl font-black font-mono text-[#8F2A87]">
            {analyticsData?.atelier_stats?.total_orders || factory.length}
            <span className="text-xs font-semibold text-[#6F6B75] mr-1.5">أمر</span>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#E8E5EA] text-[11px]">
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
              ✅ {analyticsData?.atelier_stats?.completed_orders || completedCount} مكتمل
            </span>
            <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded">
              ⏳ {analyticsData?.atelier_stats?.in_progress_orders || inProgressCount} قيد التشغيل
            </span>
          </div>
        </div>

        {/* 2. القطع المنتجة */}
        <div className="bg-white rounded-2xl border border-[#E8E5EA] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#6F6B75]">إجمالي الفساتين المنتجة</span>
            <span className="w-9 h-9 rounded-xl bg-[#E2F5F7] text-[#007F8C] flex items-center justify-center text-base font-bold">👗</span>
          </div>
          <div className="text-2xl font-black font-mono text-[#007F8C]">
            {(analyticsData?.atelier_stats?.total_pieces || totalPieces).toLocaleString()}
            <span className="text-xs font-semibold text-[#6F6B75] mr-1.5">فستان فاخر</span>
          </div>
          <div className="text-[11px] text-[#6F6B75] mt-2 pt-2 border-t border-[#E8E5EA] flex items-center justify-between">
            <span>التوريد المخزني:</span>
            <span className="font-bold text-emerald-700 font-mono">{stockReceivedCount} أمر مورّد</span>
          </div>
        </div>

        {/* 3. استهلاك الأقمشة */}
        <div className="bg-white rounded-2xl border border-[#E8E5EA] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#6F6B75]">استهلاك خامات الأقمشة</span>
            <span className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-base font-bold">✂️</span>
          </div>
          <div className="text-2xl font-black font-mono text-purple-800">
            {parseFloat(analyticsData?.atelier_stats?.total_fabric_meters || totalFabric).toFixed(1)}
            <span className="text-xs font-semibold text-[#6F6B75] mr-1.5">متر قماش مقصوص</span>
          </div>
          <div className="text-[11px] text-[#6F6B75] mt-2 pt-2 border-t border-[#E8E5EA] flex items-center justify-between">
            <span>المتوسط للفستان:</span>
            <span className="font-bold text-purple-700 font-mono">2.8 متر/فستان</span>
          </div>
        </div>

        {/* 4. أجور مراحل الفنيين */}
        <div className="bg-white rounded-2xl border border-[#E8E5EA] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#6F6B75]">إجمالي مستحقات الفنيين</span>
            <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-base font-bold">💰</span>
          </div>
          <div className="text-2xl font-black font-mono text-amber-900">
            {parseFloat(analyticsData?.atelier_stats?.total_labor_wages || 0).toLocaleString()}
            <span className="text-xs font-semibold text-[#6F6B75] mr-1.5">ر.ي</span>
          </div>
          <div className="text-[11px] text-[#6F6B75] mt-2 pt-2 border-t border-[#E8E5EA] flex items-center justify-between">
            <span>مراحل العمل:</span>
            <span className="font-bold text-[#8F2A87]">قص + خياطة + تطريز + تشطيب</span>
          </div>
        </div>
      </div>

      {/* ── جدول تكاليف الموديلات وهوامش الربحية ── */}
      {SafeModelCostTable && (
        <SafeModelCostTable
          modelsCosting={analyticsData?.models_costing || []}
          onRefresh={fetchFactoryAnalytics}
        />
      )}

      {/* ── بطاقات تقييم أداء الفنيين والحرفيين (Craftsmen Scorecards & KPIs) ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E8E5EA]">
          <span className="text-xl">⭐</span>
          <div>
            <h3 className="font-bold text-sm text-[#25232A]">بطاقات تقييم أداء الفنيين والحرفيين (Craftsmen Scorecards)</h3>
            <p className="text-xs text-[#6F6B75] mt-0.5">معدل الإنجاز وجودة التنفيذ ومستحقات الأجور المسجلة لكل فني</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(analyticsData?.technicians_kpi || []).map((tech, idx) => (
            <div key={tech.id || idx} className="p-4 rounded-2xl border border-[#E8E5EA] bg-[#FAFAFB] hover:bg-white hover:border-[#8F2A87] transition shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E5EA]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#F2E7F3] text-[#8F2A87] flex items-center justify-center font-bold text-sm">
                    {tech.name?.charAt(0) || 'ف'}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#25232A]">{tech.name}</h4>
                    <span className="text-[10px] text-[#6F6B75]">{tech.role || 'فني خياطة وتشغيل'}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {tech.on_time_rate || '100%'} التزام
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white rounded-xl border border-[#E8E5EA] text-center">
                  <span className="text-[10px] text-[#6F6B75] block">المهام المنجزة</span>
                  <span className="font-mono font-bold text-[#8F2A87] text-sm mt-0.5 block">{tech.completed_tasks} من {tech.tasks_assigned}</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-[#E8E5EA] text-center">
                  <span className="text-[10px] text-[#6F6B75] block">تقييم الجودة</span>
                  <span className="font-mono font-bold text-amber-500 text-sm mt-0.5 block">★ {tech.avg_quality}</span>
                </div>
              </div>

              <div className="p-2.5 bg-purple-50/60 rounded-xl border border-[#E5CEE7] flex items-center justify-between text-xs">
                <span className="text-[#8F2A87] font-semibold">إجمالي مستحقات الأجور:</span>
                <span className="font-mono font-black text-[#8F2A87]">{tech.total_earnings?.toLocaleString()} ر.ي</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.FactoryAnalytics = FactoryAnalytics;
}
