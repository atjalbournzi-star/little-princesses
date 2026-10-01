// src/features/orders/components/OrderDetailModal.jsx

function OrderDetailModal({
  order,
  onClose,
  customers = [],
  currencyDisplay = "YER ريال",
  onOpenDelivery,
  onOpenCustomerMessage,
  onOpenPrint,
  onOpenAlteration
}) {
  if (!order) return null;
  const getCustName = window.getCustomerName || ((c) => c?.name || '');
  const cust = (customers || []).find(c => getCustName(c) === order.customer_name);
  const childMeas = cust?.measurements?.find(m => m.child_name === order.child_name) || cust?.measurements?.[0];

  const tot = parseFloat(order.total ?? order.total_amount) || 0;
  const pd = parseFloat(order.paid ?? order.paid_amount) || 0;
  const rem = Math.max(0, tot - pd);
  const dispChild = (order.child_name && String(order.child_name).trim()) ? order.child_name : (childMeas?.child_name || "الأميرة");
  const delFee = parseFloat(order.delivery_fee || order.delivery || 0);
  const delMode = order.delivery_payment_mode || 'DIRECT_TO_COURIER';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#E8E5EA] dark:border-slate-800 space-y-4 text-right max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📋</span>
            <div>
              <h3 className="text-sm font-bold text-[#25232A] dark:text-slate-100">تفاصيل الفاتورة وأمر العمل</h3>
              <p className="text-[11px] font-mono text-[#B0005A] dark:text-rose-400 font-bold">{order.order_no || ('ORD-' + order.id)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Customer & Princess Card */}
        <div className="p-4 rounded-2xl bg-[#FAFAFB] dark:bg-slate-800/60 border border-[#E8E5EA] dark:border-slate-700 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[11px] text-[#6F6B75] dark:text-slate-400 block">العميلة:</span>
            <span className="font-bold text-[#25232A] dark:text-slate-100 text-sm">{order.customer_name || '—'}</span>
            {cust?.phone && <span className="block text-[11px] font-mono text-gray-500 mt-0.5">📱 {cust.phone}</span>}
          </div>
          <div>
            <span className="text-[11px] text-[#6F6B75] dark:text-slate-400 block">الأميرة صاحبة الفستان:</span>
            <span className="font-bold text-[#8F2A87] dark:text-purple-300 text-sm">{dispChild}</span>
            {childMeas?.estimated_age && <span className="block text-[11px] text-gray-500 mt-0.5">الفئة: {childMeas.estimated_age}</span>}
          </div>
        </div>

        {/* Dress Specifications */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#E8E5EA] dark:border-slate-700 space-y-2 text-xs">
          <h4 className="font-bold text-xs text-[#25232A] dark:text-slate-100 flex items-center gap-1.5">
            <span>👗</span>
            <span>مواصفات الفستان والموديل</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11.5px]">
            <div>
              <span className="text-gray-400 block">الموديل:</span>
              <span className="font-bold text-[#25232A] dark:text-slate-100">{order.product_name}</span>
            </div>
            <div>
              <span className="text-gray-400 block">الكمية:</span>
              <span className="font-mono font-bold">{order.qty || 1} قطعة</span>
            </div>
            <div>
              <span className="text-gray-400 block">موعد التسليم:</span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{order.delivery_date ? String(order.delivery_date).split('T')[0] : '—'}</span>
            </div>
          </div>

          {/* Measurements if found */}
          {childMeas && (
            <div className="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-slate-800">
              <span className="text-[11px] text-gray-500 block mb-1">المقاسات المسجلة:</span>
              <div className="grid grid-cols-4 gap-2 text-center text-[10.5px] font-mono">
                <div className="p-1.5 bg-gray-50 dark:bg-slate-800 rounded-lg">طول: <b>{childMeas.dress_length || '—'}</b></div>
                <div className="p-1.5 bg-gray-50 dark:bg-slate-800 rounded-lg">صدر: <b>{childMeas.chest || '—'}</b></div>
                <div className="p-1.5 bg-gray-50 dark:bg-slate-800 rounded-lg">خصر: <b>{childMeas.waist || '—'}</b></div>
                <div className="p-1.5 bg-gray-50 dark:bg-slate-800 rounded-lg">كتف: <b>{childMeas.shoulder || '—'}</b></div>
              </div>
            </div>
          )}

          {delFee > 0 && (
            <div className="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-slate-800 flex justify-between items-center text-xs">
              <span className="text-[#6F6B75] dark:text-slate-400">خدمة التوصيل:</span>
              <span className="font-bold font-mono">
                {delMode === 'PREPAID_VIA_ATELIER'
                  ? `🚚 مدفوع مسبقاً للأتيليه (+${delFee.toLocaleString()} ${currencyDisplay.split(' ')[0]})`
                  : `🛵 يُدفع مباشرة للسائق عند الاستلام (${delFee.toLocaleString()} ${currencyDisplay.split(' ')[0]})`}
              </span>
            </div>
          )}
        </div>

        {/* Financial Breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 rounded-2xl bg-gradient-to-r from-gray-50 to-slate-100 dark:from-slate-800/80 dark:to-slate-800/40 border border-[#E8E5EA] dark:border-slate-700">
          <div>
            <span className="text-[10px] text-gray-500 block">الإجمالي</span>
            <span className="font-mono font-extrabold text-sm text-[#25232A] dark:text-slate-100">{tot.toLocaleString()} {currencyDisplay.split(' ')[0]}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 block">المدفوع</span>
            <span className="font-mono font-extrabold text-sm text-[#007F8C] dark:text-cyan-400">{pd.toLocaleString()} {currencyDisplay.split(' ')[0]}</span>
          </div>
          <div>
            <span className="text-[10px] text-amber-700 block font-bold">المتبقي</span>
            <span className="font-mono font-extrabold text-sm text-[#B0005A] dark:text-rose-400">{rem.toLocaleString()} {currencyDisplay.split(' ')[0]}</span>
          </div>
        </div>

        {/* Actions Grid */}
        <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {rem > 0 && onOpenDelivery && (
            <button
              onClick={() => { onClose(); onOpenDelivery(order); }}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#B0005A] to-[#8F2A87] text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>🛍️</span>
              <span>تسليم وتحصيل</span>
            </button>
          )}

          {onOpenCustomerMessage && (
            <button
              onClick={() => { onClose(); onOpenCustomerMessage(order); }}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>📲</span>
              <span>واتساب وكرت</span>
            </button>
          )}

          {onOpenPrint && (
            <button
              onClick={() => { onClose(); onOpenPrint(order, 'thermal'); }}
              className="py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-[#E8E5EA] dark:border-slate-700 font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50"
            >
              <span>🧾</span>
              <span>طباعة فاتورة</span>
            </button>
          )}

          {onOpenAlteration && (
            <button
              onClick={() => { onClose(); onOpenAlteration(order); }}
              className="py-2.5 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>✂️</span>
              <span>تعديل بروفة</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

window.OrderDetailModal = OrderDetailModal;
