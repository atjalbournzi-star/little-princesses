// HRFilterBar.jsx - شريط البحث وفلترة الموظفين حسب القسم والحالة (نمط مدمج)
function HRFilterBar({
  searchQuery,
  setSearchQuery,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  onOpenAddModal,
  totalEmployees = 0,
}) {
  const selectCls =
    "h-7 px-2 rounded-lg border border-slate-700/80 bg-[#0F172A] text-xs font-bold text-white focus:border-pink-500 outline-none transition cursor-pointer";

  return (
    <div className="h-9 shrink-0 mb-2 flex items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 px-3 rounded-xl select-none">
      {/* حقل البحث بالاسم أو الهاتف */}
      <div className="flex items-center gap-2 flex-1 max-w-sm">
        <div className="relative w-full">
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-7 pr-8 pl-6 rounded-lg border border-slate-700/80 bg-[#0F172A] text-xs font-bold text-white focus:border-pink-500 outline-none transition text-right"
            dir="rtl"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* الفلاتر والأزرار */}
      <div className="flex items-center gap-2">
        {/* فلترة القسم / الوظيفة */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={selectCls}
        >
          <option value="all">جميع الأقسام</option>
          <option value="خياط">خياطة</option>
          <option value="قصاص">قصاص</option>
          <option value="تشطيب">تشطيب</option>
          <option value="تطريز">تطريز</option>
          <option value="إدارة">إدارة</option>
        </select>

        {/* فلترة حالة التوظيف */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectCls}
        >
          <option value="all">كل الحالات</option>
          <option value="نشط">نشط فقط</option>
          <option value="موقوف">موقوف مؤقتاً</option>
        </select>

        {/* زر إضافة موظف جديد */}
        {onOpenAddModal && (
          <button
            type="button"
            onClick={onOpenAddModal}
            className="h-7 px-3 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <span>➕</span>
            <span>إضافة موظف</span>
          </button>
        )}
      </div>
    </div>
  );
}

window.HRFilterBar = HRFilterBar;
