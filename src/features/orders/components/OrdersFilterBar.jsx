// src/features/orders/components/OrdersFilterBar.jsx

function OrdersFilterBar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  deliveryDateFilter,
  setDeliveryDateFilter,
  count = 0
}) {
  const statuses = window.ORDER_STATUSES || [
    "مسودة 📝", "تم أخذ المقاسات 📐", "مؤكد ومحجوز 🏷️", "بانتظار توفر الأقمشة ⏳",
    "مرحلة القص ✂️", "قيد الخياطة 🪡", "جلسة تجربة وقياس 👗", "تعديل مقاسات ورتوش 🪡",
    "مرحلة التشطيب والشك 👑", "فحص الجودة والمطابقة 🔍", "جاهز للتسليم 🎁",
    "تم التسليم للعميل ✔️", "ملغي ❌"
  ];

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA] dark:border-slate-800">
      <div className="flex items-center gap-2.5 w-full md:w-auto">
        <h3 className="font-bold text-sm text-[#25232A] dark:text-slate-100">سجل الطلبات والفواتير المعتمدة</h3>
        <span className="text-xs bg-[#FCE8F2] dark:bg-rose-950/50 text-[#B0005A] dark:text-rose-300 font-bold px-2.5 py-0.5 rounded-full font-mono">
          {count}
        </span>
      </div>

      <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-[#FAFAFB] dark:bg-slate-900 text-xs font-semibold text-[#25232A] dark:text-slate-100 outline-none focus:border-[#B0005A]"
        >
          <option value="الكل">جميع الحالات</option>
          {statuses.map(st => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>

        {/* Date Filter */}
        {setDeliveryDateFilter && (
          <div className="relative">
            <input
              type="date"
              lang="en-GB"
              dir="ltr"
              value={deliveryDateFilter || ''}
              onChange={e => setDeliveryDateFilter(e.target.value)}
              className="h-10 px-2.5 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-[#FAFAFB] dark:bg-slate-900 text-xs font-medium text-[#25232A] dark:text-slate-100 outline-none focus:border-[#B0005A]"
              title="فلترة بموعد التسليم"
            />
            {deliveryDateFilter && (
              <button
                type="button"
                onClick={() => setDeliveryDateFilter('')}
                className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 hover:text-red-500 p-1"
                title="إلغاء فلتر التاريخ"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Search input */}
        <div className="relative flex-1 md:w-64">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-7 pr-8 h-10 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-[#FAFAFB] dark:bg-slate-900 text-xs font-medium text-[#25232A] dark:text-slate-100 w-full focus:bg-white dark:focus:bg-slate-800 focus:border-[#B0005A] outline-none"
            placeholder="بحث برقم الطلب، العميل، أو الموديل..."
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] dark:text-slate-400 text-xs pointer-events-none">🔍</span>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] dark:text-slate-400 hover:text-[#25232A] dark:hover:text-slate-100 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

window.OrdersFilterBar = OrdersFilterBar;
