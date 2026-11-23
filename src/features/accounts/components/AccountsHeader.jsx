// AccountsHeader.jsx - ترويسة وشريط أدوات دليل وشجرة الحسابات المدمج
// الهوية البصرية المطابقة لشاشة السندات والمعاملات المالية | Standard Compliant (< 220 lines)

function AccountsHeader({
  searchTerm, setSearchTerm,
  filterType, onFilterTypeChange,
  maxDepthFilter, onMaxDepthChange,
  viewMode, setViewMode,
  onExpandAll, onCollapseAll,
  onAddAccount, onAddMain, onAuditLog,
  accountsCount = 0, groupCount = 0, postingCount = 0
}) {
  const handleAdd = onAddAccount || onAddMain;

  return (
    <div className="shrink-0 space-y-1 select-none" dir="rtl">
      {/* 1. ترويسة مدمجة ورشيقة في سطر واحد مع أزرار الإجراءات المصغرة */}
      <div className="h-8 min-h-[32px] px-2.5 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 shrink-0">
            <svg className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span>شجرة الحسابات والدليل المالي</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onAuditLog}
            title="سجل التعديلات المحاسبية"
            className="h-6 px-2 text-[10.5px] font-medium bg-white hover:bg-slate-50 dark:bg-[#0F172A] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer"
          >
            <svg className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">السجل</span>
          </button>

          <div className="h-6 p-0.5 bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-md flex items-center gap-0.5 text-[10.5px]">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`h-5 px-1.5 rounded transition flex items-center gap-1 cursor-pointer font-medium ${
                viewMode === 'tree'
                  ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="عرض الهيكل الشجري"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>شجري</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`h-5 px-1.5 rounded transition flex items-center gap-1 cursor-pointer font-medium ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="عرض جدولي"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>جدول</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="h-6 px-2 text-[10.5px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer"
            title="إضافة حساب جديد"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>إضافة حساب</span>
          </button>
        </div>
      </div>

      {/* 2. شريط المؤشرات الإحصائية الأربعة المدمج - مطابق تماماً لشاشة السندات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 my-0.5 shrink-0">
        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">إجمالي الحسابات</span>
          <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
            {accountsCount.toLocaleString('en-US')} <span className="text-[9.5px] text-slate-500 dark:text-slate-400">حساب</span>
          </span>
        </div>
        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">حسابات تجميعية</span>
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono tracking-tight">
            {groupCount.toLocaleString('en-US')} <span className="text-[9.5px] text-slate-500 dark:text-slate-400">رئيسي</span>
          </span>
        </div>
        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">حسابات حركة</span>
          <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 font-mono tracking-tight">
            {postingCount.toLocaleString('en-US')} <span className="text-[9.5px] text-slate-500 dark:text-slate-400">فرعي</span>
          </span>
        </div>
        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">هيكل الدليل</span>
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
            5 <span className="text-[9.5px] text-slate-500 dark:text-slate-400">مستويات</span>
          </span>
        </div>
      </div>

      {/* 3. شريط البحث والتصفية المدمج - بنفس نسق وألوان شريط فلترة السندات */}
      <div className="h-8 min-h-[32px] px-2 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-1.5 shrink-0 select-none">
        <div className="relative flex-1 min-w-[130px] max-w-xs">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-6 pl-5 pr-6 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:border-teal-600 dark:focus:border-teal-500 outline-none transition"
          />
          <svg className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-[10px] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 flex-wrap sm:flex-nowrap">
          <select
            value={maxDepthFilter}
            onChange={e => onMaxDepthChange(e.target.value)}
            className="h-6 px-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer transition hover:border-slate-300 dark:hover:border-slate-700"
            title="تصفية مستوى التفرع الشجري"
          >
            <option value="ALL">جميع المستويات</option>
            <option value="1">المستوى 1 (رئيسي)</option>
            <option value="2">حتى المستوى 2 (عام)</option>
            <option value="3">حتى المستوى 3 (مساعد)</option>
            <option value="4">حتى المستوى 4 (فرعي)</option>
          </select>

          <select
            value={filterType}
            onChange={e => onFilterTypeChange(e.target.value)}
            className="h-6 px-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer transition hover:border-slate-300 dark:hover:border-slate-700"
            title="تصفية حسب نوع الحساب"
          >
            <option value="ALL">جميع الأنواع</option>
            <option value="أصول">الأصول</option>
            <option value="خصوم">الخصوم</option>
            <option value="حقوق ملكية">حقوق الملكية</option>
            <option value="إيرادات">الإيرادات</option>
            <option value="مصروفات">المصروفات</option>
          </select>

          <button
            type="button"
            onClick={onExpandAll}
            title="فتح الكل"
            className="h-6 px-2 bg-white hover:bg-slate-50 dark:bg-[#0F172A] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-md text-[10.5px] font-medium flex items-center gap-1 transition cursor-pointer shrink-0"
          >
            <svg className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">فتح الكل</span>
          </button>

          <button
            type="button"
            onClick={onCollapseAll}
            title="طي الكل"
            className="h-6 px-2 bg-white hover:bg-slate-50 dark:bg-[#0F172A] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-md text-[10.5px] font-medium flex items-center gap-1 transition cursor-pointer shrink-0"
          >
            <svg className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="hidden sm:inline">إغلاق الكل</span>
          </button>

          <span className="text-[9.5px] bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 font-bold px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800/50 font-mono shrink-0">
            {accountsCount} حساب
          </span>
        </div>
      </div>
    </div>
  );
}

window.AccountsHeader = AccountsHeader;
window.AccountsToolbar = AccountsHeader;
