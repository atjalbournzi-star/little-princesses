// src/features/reports/components/ReportsHeader.jsx
// ترويسة التقارير والمركز المالي والتبويبات الرئيسية (Executive Header)

function ReportsHeader({ activeTab, setActiveTab, handleExportExcel, handlePrint, brandProfile }) {
  const tabs = [
    { id: 'financial', label: 'التقارير المالية والمحاسبية', icon: '📑', badge: 'P&L / ميزانية' },
    { id: 'orders', label: 'حركة المبيعات والطلبات', icon: '🛍️', badge: 'تحصيل وربحية' },
    { id: 'production', label: 'إنتاجية ومراحل المعمل', icon: '🏭', badge: 'أجور وإنجاز' },
    { id: 'inventory', label: 'حركة وتقييم المخزون', icon: '📦', badge: 'أقمشة ونواقص' },
  ];

  return (
    <div className="print-hidden bg-[#111C38] rounded-xl border border-slate-800 shadow-sm overflow-hidden text-white transition-all select-none">
      <div className="px-3 py-2 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#0F172A]">
        <div className="flex items-center gap-2">
          <div className="w-6.5 h-6.5 rounded-lg bg-slate-800/90 text-pink-400 border border-pink-500/30 flex items-center justify-center text-xs shadow-xs">
            📊
          </div>
          <div>
            <h2 className="text-xs sm:text-[13px] font-bold text-white tracking-wide">المركز المالي والتقارير التحليلية الشاملة</h2>
            <p className="text-[10px] text-slate-400">
              {brandProfile?.name || 'مؤسسة الأميرات الصغيرات'} — قوائم الدخل، المبيعات، خطوط الإنتاج، والمخزون
            </p>
          </div>
        </div>

        {/* أزرار الإجراءات والطباعة وتصدير Excel كأيقونات رمادية هادئة ناعمة وصغيرة الحجم */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleExportExcel}
            title="تصدير جدول التقرير النشط حالياً إلى ملف Excel منسق (XLSX)"
            className="w-6.5 h-6.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 transition-all flex items-center justify-center cursor-pointer shadow-xs"
          >
            <span className="text-xs">📊</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="حفظ التقرير المالي المنسق كملف PDF رسمي"
            className="w-6.5 h-6.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 transition-all flex items-center justify-center cursor-pointer shadow-xs"
          >
            <span className="text-xs">📑</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="طباعة التقرير المالي الرسمي"
            className="w-6.5 h-6.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 transition-all flex items-center justify-center cursor-pointer shadow-xs"
          >
            <span className="text-xs">🖨️</span>
          </button>
        </div>
      </div>

      {/* شريط التبويبات الرئيسي لأنواع التقارير بخط أنيق ومدمج بتدرج وردي ملكي */}
      <div className="flex items-center gap-1 px-2 pt-0.5 overflow-x-auto border-b border-slate-800 bg-[#111C38]">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-2.5 py-1.5 text-[11px] border-b-2 transition-all duration-200 flex items-center gap-1.5 cursor-pointer shrink-0 rounded-t-md ${
                isActive
                  ? 'border-pink-500 text-white font-bold bg-slate-800/80 shadow-xs'
                  : 'border-transparent text-slate-300 font-medium hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span className="text-[11px]">{tab.icon}</span>
              <span className="font-semibold text-white">{tab.label}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-medium ${isActive ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700/80'}`}>
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
