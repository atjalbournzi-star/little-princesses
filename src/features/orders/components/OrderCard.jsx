// src/features/orders/components/OrderCard.jsx

function OrderCard({
  order,
  customers = [],
  currencyDisplay = "YER ريال",
  onSelectOrder,
  onOpenDelivery,
  onOpenCustomerMessage,
  onOpenPrint,
  onEdit
}) {
  if (!order) return null;
  const getCustName = window.getCustomerName || ((c) => c?.name || '');
  const cust = (customers || []).find(c => getCustName(c) === order.customer_name);
  const childMeas = cust?.measurements?.find(m => m.child_name === order.child_name) || cust?.measurements?.[0];

  const tot = parseFloat(order.total ?? order.total_amount) || 0;
  const pd = parseFloat(order.paid ?? order.paid_amount) || 0;
  const rem = Math.max(0, tot - pd);
  const dispChild = (order.child_name && String(order.child_name).trim()) ? order.child_name : (childMeas?.child_name || "الأميرة");
  const dispDate = order.delivery_date ? String(order.delivery_date).split('T')[0] : '—';
  const isPos = order.order_no?.startsWith('POS-') || order.status === 'جاهز للتسليم 🛍️';
  const delFee = parseFloat(order.delivery_fee || order.delivery || 0);
  const delMode = order.delivery_payment_mode || 'DIRECT_TO_COURIER';

  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#E8E5EA] dark:border-slate-800 p-4 shadow-2xs hover:shadow-md transition-all space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#E8E5EA] dark:border-slate-800">
        <div>
          <span className="font-mono text-xs font-black text-[#B0005A] dark:text-rose-400">
            {order.order_no || ('ORD-' + order.id)}
          </span>
          <h4 className="font-bold text-xs text-[#25232A] dark:text-slate-100 mt-0.5">
            {order.customer_name || "عميلة"}
          </h4>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-[#FCE8F2] dark:bg-rose-950/40 text-[#B0005A] dark:text-rose-300 border border-[#F2A4CB] dark:border-rose-900/50">
          {order.status || "قيد الخياطة 🪡"}
        </span>
      </div>

      {/* Dress & Princess Info */}
      <div className="bg-[#FAFAFB] dark:bg-slate-900/60 p-2.5 rounded-xl space-y-1 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-[#6F6B75] dark:text-slate-400 text-[11px]">الأميرة:</span>
          <span className="font-bold text-[#8F2A87] dark:text-purple-300">{dispChild}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#6F6B75] dark:text-slate-400 text-[11px]">الموديل:</span>
          <span className="font-bold text-[#25232A] dark:text-slate-100">{order.product_name || "موديل راقي"} (×{order.qty || 1})</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#6F6B75] dark:text-slate-400 text-[11px]">موعد التسليم:</span>
          <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{dispDate}</span>
        </div>
        {delFee > 0 && (
          <div className="flex justify-between items-center text-[10.5px] pt-1 border-t border-gray-100 dark:border-slate-800">
            <span className="text-[#6F6B75] dark:text-slate-400">التوصيل:</span>
            {delMode === 'PREPAID_VIA_ATELIER' ? (
              <span className="font-bold text-[#8F2A87] dark:text-purple-300 font-mono">🚚 مدفوع للأتيليه (+{delFee.toLocaleString()})</span>
            ) : (
              <span className="font-bold text-amber-700 dark:text-amber-400 font-mono">🛵 للسائق عند الاستلام ({delFee.toLocaleString()})</span>
            )}
          </div>
        )}
      </div>

      {/* Measurements if available */}
      {childMeas && (
        <div className="flex items-center gap-2 flex-wrap text-[10px] text-[#6F6B75] dark:text-slate-400 bg-purple-50/40 dark:bg-slate-800/40 p-2 rounded-lg border border-purple-100 dark:border-slate-700 font-mono">
          <span>📏</span>
          {childMeas.dress_length && <span>طول: <b>{childMeas.dress_length}</b></span>}
          {childMeas.chest && <span>صدر: <b>{childMeas.chest}</b></span>}
          {childMeas.waist && <span>خصر: <b>{childMeas.waist}</b></span>}
        </div>
      )}

      {/* Financials */}
      <div className="grid grid-cols-3 gap-1.5 text-center text-xs py-1">
        <div className="bg-[#FAFAFB] dark:bg-slate-900 p-1.5 rounded-lg">
          <span className="text-[10px] text-[#6F6B75] dark:text-slate-400 block">الإجمالي</span>
          <span className="font-mono font-bold text-[11px] text-[#25232A] dark:text-slate-100">{tot.toLocaleString()}</span>
        </div>
        <div className="bg-[#FAFAFB] dark:bg-slate-900 p-1.5 rounded-lg">
          <span className="text-[10px] text-[#6F6B75] dark:text-slate-400 block">المدفوع</span>
          <span className="font-mono font-bold text-[11px] text-[#007F8C] dark:text-cyan-400">{pd.toLocaleString()}</span>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg">
          <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold block">المتبقي</span>
          <span className="font-mono font-black text-[11px] text-[#B0005A] dark:text-rose-400">{rem.toLocaleString()}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 border-t border-[#E8E5EA] dark:border-slate-800 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          {rem > 0 && onOpenDelivery && (
            <button
              onClick={() => onOpenDelivery(order)}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#B0005A] to-[#8F2A87] text-white text-[11px] font-bold shadow-2xs cursor-pointer"
            >
              تسليم 🛍️
            </button>
          )}
          {onOpenCustomerMessage && (
            <button
              onClick={() => onOpenCustomerMessage(order)}
              className="p-1.5 rounded-lg border border-[#E8E5EA] dark:border-slate-700 hover:bg-[#F2E7F3] text-xs cursor-pointer"
              title="كرت الفستان والرسالة الملكية"
            >
              {isPos ? "🛍️" : "👗"}
            </button>
          )}
          {onOpenPrint && (
            <button
              onClick={() => onOpenPrint(order, 'thermal')}
              className="p-1.5 rounded-lg border border-[#E8E5EA] dark:border-slate-700 hover:bg-slate-100 text-xs cursor-pointer"
              title="طباعة الفاتورة"
            >
              🧾
            </button>
          )}
        </div>

        {onSelectOrder && (
          <button
            onClick={() => onSelectOrder(order)}
            className="text-[11px] font-bold text-[#007F8C] hover:underline cursor-pointer"
          >
            عرض التفاصيل ↗
          </button>
        )}
      </div>
    </div>
  );
}

window.OrderCard = OrderCard;
