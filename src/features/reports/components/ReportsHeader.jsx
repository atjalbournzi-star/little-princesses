// src/features/reports/components/ReportsHeader.jsx

function ReportsHeader({ activeTab, setActiveTab, handleExportExcel, handlePrint, brandProfile }) {
  const tabs = [
    { id: 'financial', label: 'التقارير المالية والمحاسبية', icon: '📑', badge: 'P&L / ميزانية' },
    { id: 'orders', label: 'حركة المبيعات والطلبات', icon: '🛍️', badge: 'تحصيل وربحية' },
    { id: 'production', label: 'إنتاجية ومراحل المعمل', icon: '🏭', badge: 'أجور وإنجاز' },
    { id: 'inventory', label: 'حركة وتقييم المخزون', icon: '📦', badge: 'أقمشة ونواقص' },
  ];

  return (
    <div className="print-hidden bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden transition-all">
      <div className="px-6 py-4 border-b border-[#E8E5EA] flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E2F5F7] text-[#007F8C] flex items-center justify-center text-lg font-bold border border-[#C5ECF0]">
            📊
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#25232A]">المركز المالي والتقارير التحليلية الشاملة</h2>
            <p className="text-[11px] text-[#6F6B75]">
              {brandProfile?.name || 'مؤسسة الأميرات الصغيرات'} — قوائم الدخل، المبيعات، خطوط الإنتاج، والمخزون
            </p>
          </div>
        </div>

        {/* أزرار الإجراءات والطباعة وتصدير Excel */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportExcel}
            title="تصدير جدول التقرير النشط حالياً إلى ملف Excel منسق متعدد الأعمدة"
            className="h-10 px-3.5 rounded-xl font-bold text-xs text-[#007F8C] bg-[#E2F5F7] hover:bg-[#C5ECF0] border border-[#C5ECF0] transition flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <span>📊</span>
            <span>تصدير Excel (XLSX)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="حفظ التقرير المالي المنسق كملف PDF رسمي مع الترويسة والتوقيعات"
            className="h-10 px-3.5 rounded-xl font-bold text-xs text-[#8F2A87] bg-[#F2E7F3] hover:bg-[#E5CEE7] border border-[#E5CEE7] transition flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <span>📑</span>
            <span>حفظ كـ PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="طباعة التقرير المالي الرسمي الحالي"
            className="h-10 px-4 rounded-xl font-bold text-xs text-white bg-[#009FAE] hover:bg-[#007F8C] transition flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <span>🖨️</span>
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* شريط التبويبات الرئيسي لأنواع التقارير */}
      <div className="flex items-center gap-2 px-6 pt-2 overflow-x-auto border-b border-[#E8E5EA] bg-white">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                isActive
                  ? 'border-[#009FAE] text-[#007F8C] bg-[#E2F5F7]/30'
                  : 'border-transparent text-[#6F6B75] hover:text-[#25232A]'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-normal ${isActive ? 'bg-[#009FAE] text-white' : 'bg-gray-100 text-gray-600'}`}>
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
