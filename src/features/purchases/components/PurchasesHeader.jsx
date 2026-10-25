// src/features/purchases/components/PurchasesHeader.jsx
// ترويسة إدارة المشتريات والموردين وبطاقات المؤشرات المدمجة (Purchases Header)

function PurchasesHeader({ stats = {}, onOpenAdd }) {
  const currCode = (stats.currencyDisplay || "YER ﷼").split(' ')[0];

  return (
    <div className="shrink-0 space-y-1 select-none" dir="rtl">
      {/* 1. ترويسة مدمجة ورشيقة في سطر واحد مطابقة لمعيار شاشة السندات */}
      <div className="h-8 min-h-[32px] px-2.5 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between shrink-0">
        {/* Right: عنوان الشاشة المدمج وأيقونة المشتريات بدون شارات زائدة */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 shrink-0">
            <svg className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>المشتريات وإدارة الموردين</span>
          </div>
        </div>

        {/* Left: زر إضافة فاتورة جديدة المصغر والمطابق لأزرار ترويسة السندات */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onOpenAdd}
            className="h-6 px-2 text-[10.5px] font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer"
            title="إضافة فاتورة مشتريات جديدة"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>إضافة فاتورة جديدة</span>
          </button>
        </div>
      </div>

      {/* 2. شريط المؤشرات الإحصائية الأربعة المدمج بدون شارات خلفية ملونة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 my-0.5 shrink-0">
        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">إجمالي الفواتير</span>
          <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
            {(stats.totalInvoices || 0).toLocaleString('en-US')} <span className="text-[9.5px] text-slate-500 dark:text-slate-400">فاتورة</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">إجمالي المشتريات</span>
          <span dir="ltr" className="text-[11px] font-bold text-teal-600 dark:text-teal-400 font-mono tracking-tight">
            {(stats.totalAmountYER || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} {currCode}
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">المشتريات النقدية</span>
          <span dir="ltr" className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            {(stats.cashYER || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} {currCode}
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">الآجل والذمم</span>
          <span dir="ltr" className="text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono tracking-tight">
            {(stats.creditYER || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} {currCode}
          </span>
        </div>
      </div>
    </div>
  );
}

window.PurchasesHeader = PurchasesHeader;