// src/features/reports/components/ReportsHeader.jsx

function ReportsHeader({ activeTab, setActiveTab, handleExportExcel, handlePrint, brandProfile }) {
  const tabs = [
    { id: 'financial', label: 'التقارير المالية والمحاسبية', icon: '📑', badge: 'P&L / ميزانية' },
    { id: 'orders', label: 'حركة المبيعات والطلبات', icon: '🛍️', badge: 'تحصيل وربحية' },
    { id: 'production', label: 'إنتاجية ومراحل المعمل', icon: '🏭', badge: 'أجور وإنجاز' },
    { id: 'inventory', label: 'حركة وتقييم المخزون', icon: '📦', badge: 'أقمشة ونواقص' },
  ];

  return (
    <div className="print-hidden bg-slate-900 rounded-2xl border border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.15)] overflow-hidden transition-all text-white">
      <div className="px-6 py-3.5 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800/60 text-slate-300 flex items-center justify-center text-sm border border-slate-700/60">
            📊
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">المركز المالي والتقارير التحليلية الشاملة</h2>
            <p className="text-[11px] text-white">
              {brandProfile?.name || 'مؤسسة الأميرات الصغيرات'} — قوائم الدخل، المبيعات، خطوط الإنتاج، والمخزون
            </p>
          </div>
        </div>

        {/* أزرار الإجراءات والطباعة وتصدير Excel كأيقونات رمادية هادئة ناعمة وصغيرة الحجم */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleExportExcel}
            title="تصدير جدول التقرير النشط حالياً إلى ملف Excel منسق (XLSX)"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 border border-slate-700/60 transition flex items-center justify-center cursor-pointer shadow-2xs"
          >
            <span className="text-[16px]">📊</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="حفظ التقرير المالي المنسق كملف PDF رسمي"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 border border-slate-700/60 transition flex items-center justify-center cursor-pointer shadow-2xs"
          >
            <span className="text-[16px]">📑</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="طباعة التقرير المالي الرسمي"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 border border-slate-700/60 transition flex items-center justify-center cursor-pointer shadow-2xs"
          >
            <span className="text-[16px]">🖨️</span>
          </button>
        </div>
      </div>

      {/* شريط التبويبات الرئيسي لأنواع التقارير بخط أبيض ناصع */}
      <div className="flex items-center gap-2 px-6 pt-2 overflow-x-auto border-b border-slate-800 bg-slate-900">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                isActive
                  ? 'border-white text-white font-bold bg-slate-800/80'
                  : 'border-transparent text-white font-medium hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span className="font-medium text-white">{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isActive ? 'bg-fuchsia-700 text-white' : 'bg-slate-800 text-white border border-slate-700'}`}>
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.ReportsHeader = ReportsHeader;
}
