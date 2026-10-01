// HRFilterBar.jsx - شريط البحث وفلترة الموظفين حسب القسم والحالة
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
  const inputCls =
    "h-10 px-3.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";

  return (
    <div className="bg-white p-4 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-center justify-between gap-3">
      {/* حقل البحث بالاسم أو الهاتف */}
      <div className="flex items-center gap-2.5 w-full md:w-auto flex-1 max-w-md">
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 بحث باسم الموظف أو رقم الهاتف..."
            className={`${inputCls} w-full pr-3 pl-8`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#6F6B75] hover:text-[#25232A]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* الفلاتر والأزرار */}
      <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap justify-end">
        {/* فلترة القسم / الوظيفة */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={`${inputCls} cursor-pointer`}
        >
          <option value="all">جميع الأقسام والمهن</option>
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
          className={`${inputCls} cursor-pointer`}
        >
          <option value="all">جميع الحالات</option>
          <option value="نشط">نشط فقط</option>
          <option value="موقوف">موقوف مؤقتاً</option>
        </select>

        {/* زر إضافة موظف جديد */}
        {onOpenAddModal && (
          <button
            type="button"
            onClick={onOpenAddModal}
            className="h-10 px-4 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>➕</span>
            <span>إضافة موظف جديد</span>
          </button>
        )}
      </div>
    </div>
  );
}
