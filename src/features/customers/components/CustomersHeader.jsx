// src/features/customers/components/CustomersHeader.jsx
// شريط العنوان العلوي وبطاقات المؤشرات الأفقية المدمجة لشاشة العملاء (CRM)

function CustomersHeader({ stats = {}, onOpenAddCustomer, currency = { display: 'YER', symbol: '﷼' } }) {
  const currencyDisplay = currency?.display || 'YER ﷼';

  return (
    <div className="shrink-0 space-y-1 select-none" dir="rtl">
      {/* ── شريط العنوان العلوي وأزرار الإجراءات (Header Bar) ── */}
      <div className="h-8 min-h-[32px] px-2.5 bg-[#111C38] border border-slate-800 rounded-lg flex items-center justify-between shrink-0">
        {/* اليمين: عنوان الشاشة والشارة المؤطرة */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="text-[11.5px] font-bold text-slate-100 flex items-center gap-1.5 shrink-0">
            <svg className="w-3.5 h-3.5 text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>العملاء وإدارة العلاقات (CRM)</span>
          </div>
          <span className="text-[9.5px] bg-pink-950/70 text-pink-300 font-bold px-1.5 py-0.2 rounded border border-pink-800/60 font-mono shrink-0">
            {stats.total || 0} عميل
          </span>
        </div>

        {/* اليسار: زر الإضافة الرئيسي المتناسق */}
        <button
          type="button"
          onClick={onOpenAddCustomer}
          className="h-6 px-2 text-[10.5px] font-medium bg-pink-600 hover:bg-pink-700 text-white rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer active:scale-95"
          title="إضافة عميل جديد"
        >
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>إضافة عميل جديد</span>
        </button>
      </div>

      {/* ── بطاقات المؤشرات الأربع الأفقية المدمجة (KPI Cards) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 my-0.5 shrink-0">
        {/* بطاقة 1: إجمالي العملاء */}
        <div className="py-1 px-2.5 rounded-lg bg-[#111C38] border border-slate-800 flex items-center justify-between whitespace-nowrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <svg className="w-3 h-3 text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-[11px] font-medium text-slate-300">إجمالي العملاء</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-slate-100 font-mono tracking-tight tabular-nums">
              {stats.total || 0}
            </span>
            <span className="text-[9.5px] px-1 py-0.2 rounded border border-pink-800/60 bg-pink-950/60 text-pink-300 font-mono font-bold">
              +{stats.newCount || 0}
            </span>
          </div>
        </div>

        {/* بطاقة 2: عملاء نشطون ودائمون */}
        <div className="py-1 px-2.5 rounded-lg bg-[#111C38] border border-slate-800 flex items-center justify-between whitespace-nowrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <svg className="w-3 h-3 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span className="text-[11px] font-medium text-slate-300">عملاء دائمون</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-purple-300 font-mono tracking-tight tabular-nums">
              {stats.active || 0}
            </span>
            <span className="text-[9.5px] px-1 py-0.2 rounded border border-purple-800/60 bg-purple-950/60 text-purple-300 font-mono font-bold">
              {stats.total > 0 ? Math.round(((stats.active || 0) / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* بطاقة 3: طلبات قيد التنفيذ */}
        <div className="py-1 px-2.5 rounded-lg bg-[#111C38] border border-slate-800 flex items-center justify-between whitespace-nowrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <svg className="w-3 h-3 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-[11px] font-medium text-slate-300">طلبات جارية</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-amber-300 font-mono tracking-tight tabular-nums">
              {stats.pendingOrders || 0}
            </span>
            <span className="text-[9.5px] px-1 py-0.2 rounded border border-amber-800/60 bg-amber-950/60 text-amber-300 font-mono font-bold">
              قيد العمل
            </span>
          </div>
        </div>

        {/* بطاقة 4: متبقيات وذمم العملاء */}
        <div className="py-1 px-2.5 rounded-lg bg-[#111C38] border border-slate-800 flex items-center justify-between whitespace-nowrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <svg className="w-3 h-3 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-[11px] font-medium text-slate-300">إجمالي الذمم</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-emerald-400 font-mono tracking-tight tabular-nums">
              {Number(stats.totalReceivables || 0).toLocaleString('en-US')}
            </span>
            <span className="text-[9.5px] px-1 py-0.2 rounded border border-emerald-800/60 bg-emerald-950/60 text-emerald-300 font-mono font-bold">
              {currencyDisplay}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

window.CustomersHeader = CustomersHeader;
