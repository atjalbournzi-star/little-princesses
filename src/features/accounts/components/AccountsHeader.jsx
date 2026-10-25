// AccountsHeader.jsx - ترويسة وشريط أدوات دليل وشجرة الحسابات المدمج
// الهوية البصرية المطابقة لشاشة المنتجات (BOM Header & Toolbar) | Standard Compliant (< 220 lines)

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
    <div className="shrink-0 space-y-1.5 select-none" dir="rtl">
      {/* 1. Sleek Single-Line Header Row */}
      <div className="h-10 min-h-[40px] px-3 bg-[#111C38] border border-slate-800 rounded-xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-[13px] font-bold text-white flex items-center gap-2 shrink-0">
            <span className="text-pink-500 text-sm">📊</span>
            <span>شجرة الحسابات والدليل المالي</span>
          </div>
          <span className="text-[11px] bg-pink-950/80 text-pink-200 font-bold px-2 py-0.5 rounded-md border border-pink-700/60 font-mono shrink-0">
            Chart of Accounts
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onAuditLog}
            title="سجل التعديلات المحاسبية"
            className="h-7 px-2.5 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 hover:text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
          >
            <span>🕒</span>
            <span className="hidden sm:inline">السجل</span>
          </button>

          <div className="h-7 p-0.5 bg-slate-900 border border-slate-600 rounded-lg flex items-center gap-1 text-xs font-bold text-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`h-6 px-2.5 rounded-md transition flex items-center gap-1.5 cursor-pointer text-xs ${
                viewMode === 'tree' ? 'bg-pink-600 text-white font-bold shadow-xs' : 'text-slate-200 hover:text-white font-medium'
              }`}
              title="عرض الهيكل الشجري"
            >
              <span>🌳</span>
              <span>شجري</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`h-6 px-2.5 rounded-md transition flex items-center gap-1.5 cursor-pointer text-xs ${
                viewMode === 'table' ? 'bg-pink-600 text-white font-bold shadow-xs' : 'text-slate-200 hover:text-white font-medium'
              }`}
              title="عرض جدولي"
            >
              <span>📋</span>
              <span>جدول</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="h-7 px-3 text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="إضافة حساب جديد"
          >
            <span>+</span>
            <span>إضافة حساب</span>
          </button>
        </div>
      </div>

      {/* 2. Standardized 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 my-1 shrink-0">
        <div className="p-2 rounded-xl bg-[#111C38] border border-slate-700/80 flex items-center justify-between">
          <span className="text-[12px] font-bold text-white tracking-wide">إجمالي الحسابات</span>
          <span className="text-[15px] font-black text-white font-mono tracking-tight">{accountsCount}</span>
        </div>
        <div className="p-2 rounded-xl bg-[#111C38] border border-slate-700/80 flex items-center justify-between">
          <span className="text-[12px] font-bold text-white tracking-wide">حسابات تجميعية</span>
          <span className="text-[15px] font-black text-amber-300 font-mono tracking-tight">{groupCount}</span>
        </div>
        <div className="p-2 rounded-xl bg-[#111C38] border border-slate-700/80 flex items-center justify-between">
          <span className="text-[12px] font-bold text-white tracking-wide">حسابات حركة</span>
          <span className="text-[15px] font-black text-emerald-300 font-mono tracking-tight">{postingCount}</span>
        </div>
        <div className="p-2 rounded-xl bg-[#111C38] border border-slate-700/80 flex items-center justify-between">
          <span className="text-[12px] font-bold text-white tracking-wide">هيكل الدليل</span>
          <span className="text-[15px] font-black text-pink-300 font-mono tracking-tight">5 مستويات</span>
        </div>
      </div>

      {/* 3. High-Density Compact Toolbar */}
      <div className="h-8 px-2 flex items-center gap-2 mb-1 shrink-0 bg-[#111C38] border border-slate-700/80 rounded-lg select-none">
        <div className="relative flex-1 min-w-[150px]">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-7 pl-6 pr-7 rounded-md border border-slate-600 bg-slate-900 text-xs font-semibold text-white placeholder-slate-400 outline-none focus:border-pink-500"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-300 pointer-events-none">🔍</span>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-300 hover:text-white cursor-pointer font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <select
          value={maxDepthFilter}
          onChange={e => onMaxDepthChange(e.target.value)}
          className="h-7 px-2 rounded-md border border-slate-600 bg-slate-900 text-xs font-bold text-white outline-none shrink-0 cursor-pointer"
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
          className="h-7 px-2 rounded-md border border-slate-600 bg-slate-900 text-xs font-bold text-pink-300 outline-none shrink-0 cursor-pointer"
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
          className="h-7 px-2.5 rounded-md border border-slate-600 bg-slate-900 text-xs font-bold text-slate-100 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer shrink-0 transition"
        >
          <span>📂</span>
          <span className="hidden md:inline">فتح الكل</span>
        </button>

        <button
          type="button"
          onClick={onCollapseAll}
          title="طي الكل"
          className="h-7 px-2.5 rounded-md border border-slate-600 bg-slate-900 text-xs font-bold text-slate-100 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer shrink-0 transition"
        >
          <span>📁</span>
          <span className="hidden md:inline">إغلاق الكل</span>
        </button>

        <div className="h-7 px-2.5 rounded-md bg-pink-950/80 border border-pink-600/70 flex items-center justify-center text-xs font-extrabold text-pink-200 font-mono shrink-0">
          {accountsCount} حساب
        </div>
      </div>
    </div>
  );
}

window.AccountsHeader = AccountsHeader;
window.AccountsToolbar = AccountsHeader;
