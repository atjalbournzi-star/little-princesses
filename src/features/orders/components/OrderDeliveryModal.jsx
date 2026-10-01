// src/features/orders/components/OrderDeliveryModal.jsx
const { useState } = React;

function OrderDeliveryModal({
  order,
  onClose,
  customers = [],
  currencyDisplay = "YER ريال",
  onConfirmDelivery,
  submittingDelivery
}) {
  if (!order) return null;

  const tot = parseFloat(order.total ?? order.total_amount ?? 0);
  const pd = parseFloat(order.paid ?? order.paid_amount ?? 0);
  const rem = Math.max(0, tot - pd);
  const delFee = parseFloat(order.delivery_fee || order.delivery || 0);
  const delMode = order.delivery_payment_mode || 'DIRECT_TO_COURIER';

  const [deliveryForm, setDeliveryForm] = useState({
    amount_collected: String(rem),
    discount: '0',
    account_id: 'ACC-101',
    payment_method: 'نقد (كاش)',
    notes: ''
  });
  const [successData, setSuccessData] = useState(null);

  const handleConfirm = () => {
    onConfirmDelivery({
      order,
      deliveryForm,
      onSuccess: (data) => setSuccessData(data)
    });
  };

  const sendWhatsAppDeliveryGreeting = () => {
    const cName = order.customer_name || 'العميلة الكريمة';
    const chName = order.child_name || 'الأميرة';
    const pName = order.product_name || 'فستان الأميرات الفاخر';
    const orderNo = order.order_no || order.id;
    const paidAmt = parseFloat(deliveryForm.amount_collected || 0);

    const msg = `👑 *ليتل برنسيس للأزياء الفاخرة* 👑\n\nألف مبارك استلام الفستان الملكي لأميرتنا الجميلة *${chName}*! 🌸✨\n\n👗 *الموديل:* ${pName}\n📋 *رقم الطلب:* ${orderNo}\n${paidAmt > 0 ? `💰 *المبلغ المحصل عند التسليم:* ${paidAmt.toLocaleString()} ${currencyDisplay.split(' ')[0]}\n` : ''}✅ *حالة الطلب:* تم التسليم بالكامل وبأعلى معايير الجودة الملكية.\n\nنتمنى لأميرتنا الصغيرة إطلالة ساحرة تملأ قلوبكم بهجة وسعادة! نسعد دائماً بخدمتكم وتجدد لقائكم معنا 💖👑`;

    const cust = (customers || []).find(c => (c.name && cName.includes(c.name)) || (cName && c.name && cName.includes(c.name)));
    const phone = (cust?.phone || cust?.['رقم الهاتف'] || '').replace(/[^0-9]/g, '');
    const waUrl = phone 
      ? `https://api.whatsapp.com/send?phone=${phone.startsWith('0') ? '967' + phone.substring(1) : (phone.startsWith('967') ? phone : '967' + phone)}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#25232A] dark:text-slate-100 text-xs font-medium outline-none focus:border-[#B0005A]";
  const labelCls = "block text-xs font-semibold text-[#25232A] dark:text-slate-200 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E8E5EA] dark:border-slate-800 space-y-4 text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">👑</span>
            <div>
              <h3 className="text-sm font-bold text-[#25232A] dark:text-slate-100">تسليم فستان الأميرة والتحصيل النهائي</h3>
              <p className="text-[11px] text-[#6F6B75] dark:text-slate-400">فاتورة رقم: {order.order_no || order.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer">✕</button>
        </div>

        {successData ? (
          <div className="space-y-4 py-2">
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
              <span className="text-4xl block animate-bounce">🎉</span>
              <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-300">تم تسليم الفستان الملكي بنجاح!</h4>
              <p className="text-xs text-emerald-800 dark:text-emerald-400">
                تم تحصيل مبلغ <strong>{parseFloat(successData.collected_amount || deliveryForm.amount_collected).toLocaleString()} {currencyDisplay}</strong> وقيد الخزينة بنجاح.
              </p>
            </div>
            <button type="button" onClick={sendWhatsAppDeliveryGreeting} className="w-full py-3.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer">
              <span>📲</span><span>إرسال بطاقة تهنئة التسليم للأميرة عبر واتساب 🌸</span>
            </button>
            <button type="button" onClick={onClose} className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer">
              إغلاق النافذة
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Info Card */}
            <div className="p-3.5 rounded-2xl bg-[#FCE8F2]/60 dark:bg-rose-950/30 border border-[#F2A4CB]/40 dark:border-rose-900/40 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#B0005A] dark:text-rose-400">👧 الأميرة: {order.child_name || 'الأميرة'}</span>
                <span className="text-[#6F6B75] dark:text-slate-400">العميلة: {order.customer_name}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-[#F2A4CB]/30 dark:border-rose-900/30">
                <span>👗 الموديل: <strong>{order.product_name}</strong></span>
                <span className="font-mono text-[#B0005A] dark:text-rose-400">الكمية: {order.qty || 1} قطعة</span>
              </div>
            </div>

            {/* Balances */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-[#FAFAFB] dark:bg-slate-800/80 rounded-xl border border-[#E8E5EA] dark:border-slate-700">
                <span className="text-[10.5px] text-[#6F6B75] dark:text-slate-400 block">الإجمالي</span>
                <span className="font-mono font-bold text-[#25232A] dark:text-slate-100 mt-0.5 block">{tot.toLocaleString()}</span>
              </div>
              <div className="p-2.5 bg-[#FAFAFB] dark:bg-slate-800/80 rounded-xl border border-[#E8E5EA] dark:border-slate-700">
                <span className="text-[10.5px] text-[#6F6B75] dark:text-slate-400 block">المسدد</span>
                <span className="font-mono font-bold text-[#007F8C] dark:text-cyan-400 mt-0.5 block">{pd.toLocaleString()}</span>
              </div>
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50">
                <span className="text-[10.5px] text-amber-800 dark:text-amber-300 font-bold block">المتبقي</span>
                <span className="font-mono font-black text-[#B0005A] dark:text-rose-400 mt-0.5 block">{rem.toLocaleString()}</span>
              </div>
            </div>

            {delFee > 0 && (
              <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs flex justify-between items-center">
                <span className="font-semibold text-[#8F2A87] dark:text-purple-300">
                  {delMode === 'PREPAID_VIA_ATELIER' ? '🚚 رسوم التوصيل مسددة مسبقاً للأتيليه:' : '🛵 رسوم التوصيل تُدفع للسائق مباشرة:'}
                </span>
                <span className="font-mono font-bold text-[#25232A] dark:text-slate-100">{delFee.toLocaleString()} {currencyDisplay.split(' ')[0]}</span>
              </div>
            )}

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>المبلغ المحصل الآن ({currencyDisplay.split(' ')[0]}) *</label>
                <input type="number" step="100" min="0" className={inputCls + " font-mono font-bold text-[#B0005A] text-center"} value={deliveryForm.amount_collected} onChange={e => setDeliveryForm({ ...deliveryForm, amount_collected: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>خصم إضافي إن وجد</label>
                <input type="number" step="100" min="0" className={inputCls + " font-mono text-center"} value={deliveryForm.discount} onChange={e => setDeliveryForm({ ...deliveryForm, discount: e.target.value })} placeholder="0" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>حساب الخزينة *</label>
                <select className={inputCls} value={deliveryForm.account_id} onChange={e => setDeliveryForm({ ...deliveryForm, account_id: e.target.value })}>
                  <option value="ACC-101">ACC-101 (الصندوق الرئيسي - كاش)</option>
                  <option value="ACC-103">ACC-103 (بنك الكريمي - تحويل)</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>طريقة الدفع</label>
                <select className={inputCls} value={deliveryForm.payment_method} onChange={e => setDeliveryForm({ ...deliveryForm, payment_method: e.target.value })}>
                  <option value="نقد (كاش)">💵 نقد (كاش)</option>
                  <option value="تحويل كريمي">📲 تحويل كريمي</option>
                  <option value="شبكة / بطاقة">💳 شبكة / مدى</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>ملاحظات التسليم والتسوية</label>
              <input type="text" className={inputCls} value={deliveryForm.notes} onChange={e => setDeliveryForm({ ...deliveryForm, notes: e.target.value })} placeholder="تم تسليم الفستان للأميرة واستلام المتبقي..." />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button type="button" disabled={submittingDelivery} onClick={handleConfirm} className="flex-1 py-3 px-4 rounded-xl brand-gradient hover:opacity-95 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                <span>{submittingDelivery ? 'جاري التسليم...' : '✅ تأكيد التسليم النهائي والترحيل المالي'}</span>
              </button>
              <button type="button" onClick={onClose} className="py-3 px-4 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer">
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.OrderDeliveryModal = OrderDeliveryModal;
