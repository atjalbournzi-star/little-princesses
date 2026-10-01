// src/features/customers/components/CustomersHeader.jsx

function CustomersHeader({ stats = {}, onOpenAddCustomer, currency = { display: 'YER', symbol: '﷼' } }) {
  const currencyDisplay = currency?.display || 'YER ﷼';

  return (
    <div className="space-y-2.5 select-none">
      {/* ── ترويسة مدمجة سريعة (h-9) ── */}
      <div className="h-9 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm">👥</span>
          <h1 className="text-xs font-bold text-white">
            العملاء وإدارة العلاقات (CRM)
          </h1>
          <span className="text-[10.5px] font-mono font-medium px-2 py-0.5 rounded-md bg-[#111C38] border border-slate-800 text-slate-300">
            {stats.total || 0} عميل
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenAddCustomer}
          className="h-7 px-3 text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
        >
          <span>+ إضافة عميل جديد</span>
        </button>
      </div>

      {/* ── بطاقات الإحصاءات السريعة (4 بطاقات مدمجة بأسلوب لوحة التحكم) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* إجمالي العملاء */}
        <div className="p-2.5 rounded-xl bg-[#111C38] border border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1 text-[10.5px] font-semibold text-slate-300">
            <span>إجمالي العملاء</span>
            <span className="text-xs">👥</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-black text-white font-mono tabular-nums">
              {stats.total || 0}
            </span>
            <span className="text-[10px] text-slate-400">عميل مسجل</span>
          </div>
          <div className="mt-1 text-[9.5px] text-slate-400 flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>جدد: <strong className="text-slate-200">{stats.newCount || 0}</strong></span>
            <span>•</span>
            <span>VIP: <strong className="text-pink-300">{stats.vipCount || 0}</strong></span>
          </div>
        </div>

        {/* العملاء النشطون والدائمون */}
        <div className="p-2.5 rounded-xl bg-[#111C38] border border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1 text-[10.5px] font-semibold text-slate-300">
            <span>عملاء نشطون ودائمون</span>
            <span className="text-xs">✨</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-black text-white font-mono tabular-nums">
              {stats.active || 0}
            </span>
            <span className="text-[10px] text-purple-300 font-medium">عميل دائم</span>
          </div>
          <div className="mt-1 text-[9.5px] text-purple-300 font-semibold truncate">
            {stats.total > 0 ? Math.round(((stats.active || 0) / stats.total) * 100) : 0}% من قاعدة العملاء
          </div>
        </div>

        {/* طلبات قيد التنفيذ */}
        <div className="p-2.5 rounded-xl bg-[#111C38] border border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1 text-[10.5px] font-semibold text-slate-300">
            <span>طلبات قيد التنفيذ</span>
            <span className="text-xs">✂️</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-black text-white font-mono tabular-nums">
              {stats.pendingOrders || 0}
            </span>
            <span className="text-[10px] text-amber-300 font-medium">طلب جاري</span>
          </div>
          <div className="mt-1 text-[9.5px] text-amber-300 font-semibold truncate">
            بين خطوط الإنتاج والبروفات
          </div>
        </div>

        {/* متبقيات وذمم العملاء */}
        <div className="p-2.5 rounded-xl bg-[#111C38] border border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1 text-[10.5px] font-semibold text-slate-300">
            <span>متبقيات وذمم العملاء</span>
            <span className="text-xs">💰</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-black text-white font-mono tabular-nums">
              {Number(stats.totalReceivables || 0).toLocaleString('en-US')}
            </span>
            <span className="text-[10px] text-cyan-300 font-medium">{currencyDisplay}</span>
          </div>
          <div className="mt-1 text-[9.5px] text-cyan-300 font-semibold truncate">
            أرصدة حسابات غير مسددة
          </div>
        </div>
      </div>
    </div>
  );
}

window.CustomersHeader = CustomersHeader;
