// AccountsHeader.jsx - شريط الأدوات الموحد والمدمج لدليل وشجرة الحسابات (Unified Compact Toolbar)
// Dark Theme Ready | Architectural Standard Compliant (< 220 lines)

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
    <div className="bg-white dark:bg-[#1E1B24] rounded-2xl border border-[#E8E5EA] dark:border-[#2D2A36] p-2.5 sm:p-3 shadow-2xs transition-colors">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">

        {/* ── الجانب الأيمن: حقل البحث المرن المتمدد + فلاتر المستويات والأنواع بعرض محمي ── */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[180px]">
            <span className="absolute right-3 top-2.5 text-[#6F6B75] dark:text-[#A09CA6] text-xs pointer-events-none">🔍</span>
            <input
              type="text"
              placeholder="بحث بالكود، الاسم، أو النوع..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#FAFAFB] dark:bg-[#25222E] border border-[#E8E5EA] dark:border-[#332F3D] text-[#25232A] dark:text-[#E2DFE7] placeholder-[#6F6B75] dark:placeholder-[#7E7A87] rounded-xl pr-8 pl-6 py-1 text-xs font-medium focus:bg-white dark:focus:bg-[#2A2634] focus:border-[#8F2A87] outline-none h-9 transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 top-2 text-[#6F6B75] hover:text-[#25232A] dark:hover:text-white text-xs font-bold cursor-pointer"
                title="تفريغ البحث"
              >
                ✕
              </button>
            )}
          </div>

          <div className="w-full sm:w-auto min-w-[145px] shrink-0">
            <select
              value={maxDepthFilter}
              onChange={e => onMaxDepthChange(e.target.value)}
              className="w-full bg-[#FAFAFB] dark:bg-[#25222E] border border-[#E8E5EA] dark:border-[#332F3D] text-[#25232A] dark:text-[#E2DFE7] rounded-xl px-2.5 py-1 text-xs font-medium focus:border-[#8F2A87] outline-none h-9 cursor-pointer transition"
              title="تصفية مستوى التفرع الشجري"
            >
              <option value="ALL">عرض كل المستويات</option>
              <option value="1">المستوى 1 (الرئيسي)</option>
              <option value="2">حتى المستوى 2 (العام)</option>
              <option value="3">حتى المستوى 3 (المساعد)</option>
              <option value="4">حتى المستوى 4 (الفرعي)</option>
            </select>
          </div>

          <div className="w-full sm:w-auto min-w-[125px] shrink-0">
            <select
              value={filterType}
              onChange={e => onFilterTypeChange(e.target.value)}
              className="w-full bg-[#FAFAFB] dark:bg-[#25222E] border border-[#E8E5EA] dark:border-[#332F3D] text-[#25232A] dark:text-[#E2DFE7] rounded-xl px-2.5 py-1 text-xs font-medium focus:border-[#8F2A87] outline-none h-9 cursor-pointer transition"
              title="تصفية حسب نوع الحساب"
            >
              <option value="ALL">جميع الأنواع</option>
              <option value="أصول">الأصول</option>
              <option value="خصوم">الخصوم</option>
              <option value="حقوق ملكية">حقوق الملكية</option>
              <option value="إيرادات">الإيرادات</option>
              <option value="مصروفات">المصروفات</option>
            </select>
          </div>
        </div>

        {/* ── المنتصف والأيسر: أزرار العرض المدمجة + طي/فتح + سجل التعديلات + إضافة حساب ── */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-2 shrink-0">
          <div className="flex items-center bg-[#F4F3F6] dark:bg-[#25222E] p-0.5 rounded-xl border border-[#E8E5EA] dark:border-[#322E3C] shrink-0 h-9">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'tree'
                  ? 'bg-white dark:bg-[#1E1B24] text-[#8F2A87] dark:text-[#E5CEE7] shadow-2xs font-extrabold'
                  : 'text-[#6F6B75] dark:text-[#A09CA6] hover:text-[#25232A] dark:hover:text-white'
              }`}
              title="عرض الهيكل الشجري الهرمي"
            >
              <span>🌳</span>
              <span>عرض شجري</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-[#1E1B24] text-[#8F2A87] dark:text-[#E5CEE7] shadow-2xs font-extrabold'
                  : 'text-[#6F6B75] dark:text-[#A09CA6] hover:text-[#25232A] dark:hover:text-white'
              }`}
              title="عرض جدول حسابات الحركة"
            >
              <span>📋</span>
              <span>عرض جدولي</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onExpandAll}
              title="فتح جميع الفروع الشجرية"
              className="h-9 px-2.5 bg-[#FAFAFB] dark:bg-[#25222E] hover:bg-[#E8E5EA] dark:hover:bg-[#2E2A38] text-[#25232A] dark:text-[#E2DFE7] rounded-xl text-xs font-bold border border-[#E8E5EA] dark:border-[#322E3C] flex items-center gap-1 transition cursor-pointer"
            >
              <span>📂</span>
              <span className="hidden xl:inline">فتح الكل</span>
            </button>
            <button
              type="button"
              onClick={onCollapseAll}
              title="طي جميع الفروع الشجرية"
              className="h-9 px-2.5 bg-[#FAFAFB] dark:bg-[#25222E] hover:bg-[#E8E5EA] dark:hover:bg-[#2E2A38] text-[#25232A] dark:text-[#E2DFE7] rounded-xl text-xs font-bold border border-[#E8E5EA] dark:border-[#322E3C] flex items-center gap-1 transition cursor-pointer"
            >
              <span>📁</span>
              <span className="hidden xl:inline">إغلاق الكل</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onAuditLog}
            title="سجل التعديلات المحاسبية وتتبع الحركات"
            className="w-9 h-9 rounded-xl bg-[#FAFAFB] dark:bg-[#25222E] hover:bg-[#E8E5EA] dark:hover:bg-[#2E2A38] text-[#6F6B75] dark:text-[#A09CA6] hover:text-[#25232A] dark:hover:text-white border border-[#E8E5EA] dark:border-[#322E3C] flex items-center justify-center text-sm transition cursor-pointer shrink-0"
          >
            🕒
          </button>

          <button
            type="button"
            onClick={handleAdd}
            className="h-9 bg-[#8F2A87] hover:bg-[#782271] text-white font-bold px-3.5 rounded-xl shadow-xs flex items-center gap-1.5 text-xs transition cursor-pointer shrink-0"
            title="إضافة حساب رئيسي أو فرعي جديد"
          >
            <span className="text-sm font-extrabold">+</span>
            <span>إضافة حساب</span>
          </button>
        </div>

      </div>
    </div>
  );
}

window.AccountsHeader = AccountsHeader;
window.AccountsToolbar = AccountsHeader;
