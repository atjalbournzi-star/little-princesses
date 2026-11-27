// src/features/reports/components/ReportsHeader.jsx
// ترويسة التقارير والمركز المالي والتبويبات الرئيسية (Executive Header)
// الهوية البصرية المطابقة لشاشة السندات والمعاملات المالية | Standard Compliant (< 220 lines)

function ReportsHeader({ activeTab, setActiveTab, handleExportExcel, handlePrint, brandProfile }) {
  const tabs = [
    { id: 'financial', label: 'المالية والمحاسبية' },
    { id: 'orders', label: 'المبيعات والطلبات' },
    { id: 'production', label: 'إنتاجية المعمل' },
    { id: 'inventory', label: 'حركة المخزون' },
    { id: 'profitability', label: 'ربحية أوامر التشغيل والتفصيل' },
  ];

  return (
    <div className="print-hidden shrink-0 space-y-1 select-none" dir="rtl">
      {/* 1. ترويسة مدمجة ورشيقة في سطر واحد مع أزرار الإجراءات والتبويبات المصغرة */}
      <div className="h-8 min-h-[32px] px-2.5 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between shrink-0 flex-wrap sm:flex-nowrap gap-1">
        {/* Right: عنوان الشاشة المدمج في سطر واحد */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 shrink-0">
            <svg className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>التقارير المالية والتشغيلية</span>
          </div>
        </div>

        {/* Center: شريط التبويبات الرئيسي الأربعة المدمج في نفس السطر */}
        <div className="h-6 p-0.5 bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-md flex items-center gap-0.5 text-[10.5px] overflow-x-auto overflow-y-hidden no-scrollbar">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-5 px-2 rounded transition flex items-center gap-1 cursor-pointer font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Left: أزرار التصدير والطباعة المصغرة */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleExportExcel}
            title="تصدير جدول التقرير النشط إلى Excel"
            className="h-6 px-2 text-[10.5px] font-medium bg-white hover:bg-slate-50 dark:bg-[#0F172A] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer"
          >
            <svg className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="طباعة التقرير أو حفظه كملف PDF رسمي"
            className="h-6 px-2 text-[10.5px] font-medium bg-white hover:bg-slate-50 dark:bg-[#0F172A] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer"
          >
            <svg className="w-2.5 h-2.5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span className="hidden sm:inline">طباعة</span>
          </button>
        </div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.ReportsHeader = ReportsHeader;
}
