// src/features/orders/components/ReadyOrdersPanel.jsx
// لوحة الطلبات الجاهزة للتسليم الملكي والتحصيل المالي (Ready Orders Panel)
const { useState, useMemo } = React;

function ReadyOrdersPanel({
  orders = [],
  customers = [],
  currencyDisplay = "YER ريال",
  onOpenDeliveryModal,
  onOpenCustomerMessage,
  onOpenPrintModal,
  setActiveMode
}) {
  const [filterSearch, setFilterSearch] = useState('');
  const getCustName = window.getCustomerName || ((c) => c?.name || '');
  const currCode = typeof currencyDisplay === 'string'
    ? currencyDisplay.split(' ')[0]
    : (currencyDisplay?.code || currencyDisplay?.display?.split(' ')[0] || 'YER');

  const readyOrders = useMemo(() => {
    return (orders || []).filter(o => {
      if (!o) return false;
      const s = String(o.status || o.production_status || '').toLowerCase();
      const isReady = s.includes('جاهز') || s.includes('ready');
      if (!isReady) return false;
      if (!filterSearch) return true;
      const q = filterSearch.toLowerCase();
      return (
        String(o.order_no || o.id || '').toLowerCase().includes(q) ||
        String(o.customer_name || '').toLowerCase().includes(q) ||
        String(o.child_name || '').toLowerCase().includes(q) ||
        String(o.product_name || '').toLowerCase().includes(q)
      );
    });
  }, [orders, filterSearch]);

  return (
    <div className="w-full h-full flex flex-col space-y-3 p-2 select-none overflow-hidden" dir="rtl">
      {/* Header Bar */}
      <div className="h-9 px-3 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-xl shrink-0 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-base">📦</span>
          <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            الطلبات الجاهزة للتسليم النهائي والتحصيل
          </h2>
          <span className="h-5 px-2 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center">
            {readyOrders.length} طلب
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            className="h-6 w-44 px-2 text-[11px] rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-pink-500"
          />
          {setActiveMode && (
            <button
              type="button"
              onClick={() => setActiveMode('pos')}
              className="h-6 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10.5px] font-medium transition cursor-pointer"
            >
              العودة للكاشير ⚡
            </button>
          )}
        </div>
      </div>

      {/* Orders Grid / Cards Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-0.5 space-y-2 min-h-0">
        {readyOrders.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center rounded-2xl bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 p-6 text-center text-slate-400">
            <span className="text-3xl mb-2">✨</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              لا توجد طلبات جاهزة للتسليم حالياً
            </span>
            <span className="text-[11px] text-slate-400 mt-1">
              جميع الفساتين الجاهزة في المعمل تم تسليمها أو هي قيد الخياطة والتشطيب
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {readyOrders.map(ord => {
              const cust = (customers || []).find(c => getCustName(c) === ord.customer_name);
              const childName = ord.child_name || cust?.measurements?.[0]?.child_name || 'الأميرة';
              const tot = parseFloat(ord.total ?? ord.total_amount ?? 0);
              const pd = parseFloat(ord.paid ?? ord.paid_amount ?? 0);
              const rem = Math.max(0, tot - pd);
              const orderId = ord.order_no || ord.id;

              return (
                <div
                  key={ord.id || orderId}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38] p-3 shadow-xs hover:border-pink-500/50 transition flex flex-col justify-between space-y-2.5"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">👑</span>
                      <span className="font-mono font-bold text-[11.5px] text-pink-600 dark:text-pink-400">
                        {orderId}
                      </span>
                    </div>
                    <span className="h-5 px-1.5 rounded text-[9.5px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      جاهز للتسليم 📦
                    </span>
                  </div>

                  {/* Body Details */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">العميل:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-[11.5px]">{ord.customer_name || 'عميل عام'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">الأميرة:</span>
                      <span className="font-semibold text-purple-700 dark:text-purple-300 text-[11px]">👧 {childName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">الموديل:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px] truncate max-w-[170px]" title={ord.product_name}>
                        {ord.product_name || 'فستان ملكي'}
                      </span>
                    </div>
                    {(ord.selected_color || ord.color) && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">اللون:</span>
                        <span className="font-semibold text-pink-600 dark:text-pink-400 text-[11px]">
                          🎨 {ord.selected_color || ord.color}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Financial Balance Summary */}
                  <div className="grid grid-cols-3 gap-1 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-center font-mono">
                    <div>
                      <span className="block text-[9.5px] text-slate-400">الإجمالي</span>
                      <b className="text-[11px] text-slate-800 dark:text-slate-200">{tot.toLocaleString('en-US')}</b>
                    </div>
                    <div>
                      <span className="block text-[9.5px] text-slate-400">العربون</span>
                      <b className="text-[11px] text-teal-600 dark:text-teal-400">{pd.toLocaleString('en-US')}</b>
                    </div>
                    <div>
                      <span className="block text-[9.5px] text-slate-400">المتبقي</span>
                      <b className="text-[11px] text-pink-600 dark:text-pink-400">{rem.toLocaleString('en-US')}</b>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenDeliveryModal && onOpenDeliveryModal(ord)}
                      className="flex-1 h-8 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-[11px] shadow-xs flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <span>تسليم وتحصيل 💰</span>
                    </button>
                    {onOpenPrintModal && (
                      <button
                        type="button"
                        onClick={() => onOpenPrintModal(ord)}
                        title="طباعة الفاتورة"
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs transition cursor-pointer"
                      >
                        🖨️
                      </button>
                    )}
                    {onOpenCustomerMessage && (
                      <button
                        type="button"
                        onClick={() => onOpenCustomerMessage(ord)}
                        title="إرسال إشعار للعميل"
                        className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-xs transition cursor-pointer"
                      >
                        📲
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

window.ReadyOrdersPanel = ReadyOrdersPanel;
