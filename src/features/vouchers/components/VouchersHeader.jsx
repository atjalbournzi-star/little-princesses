// src/features/vouchers/components/VouchersHeader.jsx
// ترويسة إدارة السندات والمعاملات المالية وبطاقات المؤشرات المدمجة
function VouchersHeader({
  totals,
  stats,
  vouchersCount = 0,
  onOpenReceiptModal,
  onOpenPaymentModal,
  onOpenCompoundModal,
  onOpenCapitalDeposit
}) {
  const targetCurr = totals?.targetCode || stats?.targetCode || 'YER';
  const count = vouchersCount || totals?.count || stats?.totalCount || 0;
  const receipts = totals?.receipts ?? stats?.totalIn ?? 0;
  const payments = totals?.payments ?? stats?.totalOut ?? 0;
  const net = totals?.net ?? stats?.netCash ?? (receipts - payments);

  return (
    <div className="shrink-0 space-y-1 select-none" dir="rtl">
      {/* 1. ترويسة مدمجة ورشيقة في سطر واحد مع أزرار الإجراءات المصغرة */}
      <div className="h-8 min-h-[32px] px-2.5 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between shrink-0">
        {/* Right: عنوان الشاشة المدمج في سطر واحد بدون شارات زائدة */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 shrink-0">
            <svg className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
            </svg>
            <span>السندات والمعاملات المالية</span>
          </div>
        </div>

        {/* Left: أزرار الإجراءات الأربعة المصغرة في صف أفقي واحد مدمج */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onOpenReceiptModal}
            className="h-6 px-2 text-[10.5px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer"
            title="إنشاء سند قبض جديد"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>سند قبض</span>
          </button>

          <button
            type="button"
            onClick={onOpenPaymentModal}
            className="h-6 px-2 text-[10.5px] font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer"
            title="إنشاء سند صرف جديد"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4" />
            </svg>
            <span>سند صرف</span>
          </button>

          <button
            type="button"
            onClick={onOpenCompoundModal}
            className="h-6 px-2 text-[10.5px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/60 rounded-md flex items-center gap-1 transition cursor-pointer"
            title="إنشاء قيد مركب وتسوية"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>قيد مركب</span>
          </button>

          <button
            type="button"
            onClick={onOpenCapitalDeposit}
            className="h-6 px-2 text-[10.5px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/60 rounded-md flex items-center gap-1 transition cursor-pointer"
            title="تسجيل إيداع رأس مال جديد"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>إيداع رأس مال</span>
          </button>
        </div>
      </div>

      {/* 2. شريط المؤشرات الإحصائية الأربعة المدمج - صف أفقي واحد متناسق تماماً */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 my-0.5 shrink-0">
        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">إجمالي السندات</span>
          <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
            {count.toLocaleString('en-US')} <span className="text-[9.5px] text-slate-500 dark:text-slate-400">سند</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">إجمالي المقبوضات</span>
          <span dir="ltr" className="text-[11px] font-bold text-teal-600 dark:text-teal-400 font-mono tracking-tight">
            {receipts.toLocaleString('en-US', { minimumFractionDigits: targetCurr === 'YER' ? 0 : 2, maximumFractionDigits: 2 })} {targetCurr}
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">إجمالي المدفوعات</span>
          <span dir="ltr" className="text-[11px] font-bold text-rose-600 dark:text-rose-400 font-mono tracking-tight">
            {payments.toLocaleString('en-US', { minimumFractionDigits: targetCurr === 'YER' ? 0 : 2, maximumFractionDigits: 2 })} {targetCurr}
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">صافي النقدية</span>
          <span dir="ltr" className={`text-[11px] font-bold font-mono tracking-tight ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {net >= 0 ? '+' : ''}{net.toLocaleString('en-US', { minimumFractionDigits: targetCurr === 'YER' ? 0 : 2, maximumFractionDigits: 2 })} {targetCurr}
          </span>
        </div>
      </div>
    </div>
  );
}

window.VouchersHeader = VouchersHeader;
