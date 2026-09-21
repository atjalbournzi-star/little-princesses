// src/features/orders/components/OrderAlterationModal.jsx
const { useState } = React;

function OrderAlterationModal({
  order,
  onClose,
  onSaveAlteration,
  submittingAlteration
}) {
  if (!order) return null;
  const todayStr = typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10);

  const [alterationForm, setAlterationForm] = useState({
    reason: 'مقاس غير مضبوط (ضيق/واسع)',
    notes: '',
    severity: 'normal',
    target_date: order.delivery_date ? String(order.delivery_date).split('T')[0] : todayStr,
    assigned_tailor: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveAlteration({
      payload: {
        order_id: order.id,
        order_no: order.order_no || `ORD-${order.id}`,
        customer_name: order.customer_name || 'عميلة',
        dress_type: order.product_name || 'فستان',
        alteration_reason: alterationForm.reason,
        adjustment_notes: alterationForm.notes,
        severity: alterationForm.severity,
        target_date: alterationForm.target_date,
        assigned_tailor: alterationForm.assigned_tailor
      },
      onSuccess: onClose
    });
  };

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#25232A] dark:text-slate-100 text-xs font-medium outline-none focus:border-purple-600";
  const labelCls = "block text-xs font-semibold text-[#25232A] dark:text-slate-200 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E8E5EA] dark:border-slate-800 space-y-4 text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-[#B0005A] text-white flex items-center justify-center text-xl shadow-xs">
              ✂️
            </div>
            <div>
              <h3 className="text-sm font-black text-[#25232A] dark:text-slate-100">تذكرة تعديل بروفة ومقاس (Fitting Alteration Ticket)</h3>
              <p className="text-[11px] text-[#6F6B75] dark:text-slate-400">
                طلب: {order.order_no || order.id} • {order.customer_name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Dress preview */}
          <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800/50 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-[#25232A] dark:text-slate-100">{order.product_name || 'فستان'}</span>
              <span className="text-[10.5px] text-[#6F6B75] dark:text-slate-400 block">للأميرة: {order.child_name || 'الأميرة'}</span>
            </div>
            <span className="font-mono text-purple-700 dark:text-purple-300 font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
              {order.order_no || order.id}
            </span>
          </div>

          {/* Reason */}
          <div>
            <label className={labelCls}>سبب ووجه التعديل المطلوب <span className="text-[#D64545] font-bold">*</span></label>
            <select value={alterationForm.reason} onChange={e => setAlterationForm({ ...alterationForm, reason: e.target.value })} className={inputCls}>
              <option value="مقاس غير مضبوط (ضيق/واسع)">مقاس غير مضبوط (ضيق / واسع)</option>
              <option value="طول الفستان (طويل/قصير)">طول الفستان (طويل / قصير)</option>
              <option value="تعديل خصر/صدر">تعديل الخصر أو الصدر</option>
              <option value="تعديل سحاب/أزرار">تعديل سحاب / أزرار / مشابك</option>
              <option value="رغبة العميل/تغيير تفاصيل">رغبة العميلة / إضافة أو إزالة تفاصيل</option>
              <option value="عيب خياطة/جودة">ملاحظة فحص جودة / عيب تشطيب</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>ملاحظات التعديل الدقيقة للورشة والخياط <span className="text-[#D64545] font-bold">*</span></label>
            <textarea
              required
              rows="3"
              value={alterationForm.notes}
              onChange={e => setAlterationForm({ ...alterationForm, notes: e.target.value })}
              placeholder="مثال: تقصير الذيل 2 سم وتضييق الخصر 1.5 سم من الجانبين..."
              className="w-full p-3 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-[#25232A] dark:text-slate-100 outline-none focus:border-purple-600 resize-none"
            ></textarea>
          </div>

          {/* Severity & Target Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>درجة الأهمية والسرعة</label>
              <select value={alterationForm.severity} onChange={e => setAlterationForm({ ...alterationForm, severity: e.target.value })} className={inputCls}>
                <option value="normal">عادي (جدول المشغل القياسي)</option>
                <option value="urgent">عاجل جداً ⚡ (بروفة سريعة)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>موعد التسليم بعد التعديل</label>
              <input type="date" value={alterationForm.target_date} onChange={e => setAlterationForm({ ...alterationForm, target_date: e.target.value })} className={inputCls} />
            </div>
          </div>

          {/* Assigned Tailor */}
          <div>
            <label className={labelCls}>إسناد إلى خياط / فني معين (اختياري)</label>
            <input type="text" value={alterationForm.assigned_tailor} onChange={e => setAlterationForm({ ...alterationForm, assigned_tailor: e.target.value })} placeholder="اسم الخياط أو مسؤول التعديل..." className={inputCls} />
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center gap-2">
            <button type="submit" disabled={submittingAlteration} className="flex-1 py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
              <span>{submittingAlteration ? 'جاري الحفظ...' : '✂️ قيد التذكرة وإرسالها للمشغل'}</span>
            </button>
            <button type="button" onClick={onClose} className="py-3 px-4 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.OrderAlterationModal = OrderAlterationModal;
