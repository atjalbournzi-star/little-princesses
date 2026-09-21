// src/features/feedback/components/AddFeedbackModal.jsx
// نافذة تسجيل تقييم واستبيان عميل جديد

function AddFeedbackModal({
  isOpen,
  onClose,
  customers = [],
  orders = [],
  feedbackForm,
  setFeedbackForm,
  onSubmit,
  isSubmitting
}) {
  if (!isOpen) return null;

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#009FAE] focus:ring-2 focus:ring-[#E2F5F7] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#E8E5EA] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <h3 className="font-bold text-sm text-[#25232A]">
              تسجيل تقييم واستبيان عميل (Customer Feedback)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#6F6B75] hover:text-[#25232A] font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelCls}>اسم العميلة</label>
              <select
                value={feedbackForm.customer_name}
                onChange={e => setFeedbackForm({ ...feedbackForm, customer_name: e.target.value })}
                className={inputCls}
                required
              >
                <option value="">-- اختر العميلة --</option>
                {customers.map(c => (
                  <option key={c.id || c.name} value={c.name || c['اسم_العميل']}>
                    {c.name || c['اسم_العميل']}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>رقم الطلب المرتبط (اختياري)</label>
              <input
                type="text"
                value={feedbackForm.order_id || ''}
                onChange={e => setFeedbackForm({ ...feedbackForm, order_id: e.target.value })}
                className={inputCls}
                placeholder="ORD-..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelCls}>التقييم العام للرضا (1 - 5)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={feedbackForm.rating}
                  onChange={e => setFeedbackForm({ ...feedbackForm, rating: e.target.value })}
                  className={inputCls + " text-center font-mono font-bold text-amber-500"}
                  required
                />
                <span className="text-sm">⭐</span>
              </div>
            </div>

            <div>
              <label className={labelCls}>قناة وصول التقييم</label>
              <select
                value={feedbackForm.channel}
                onChange={e => setFeedbackForm({ ...feedbackForm, channel: e.target.value })}
                className={inputCls}
              >
                <option value="WhatsApp">واتساب (WhatsApp)</option>
                <option value="Visit">زيارة المعرض</option>
                <option value="Phone">مكالمة هاتفية</option>
                <option value="Instagram">انستغرام</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>نوع الملاحظة</label>
            <select
              value={feedbackForm.feedback_type || 'NPS'}
              onChange={e => setFeedbackForm({ ...feedbackForm, feedback_type: e.target.value })}
              className={inputCls}
            >
              <option value="NPS">استبيان رضا عام (NPS)</option>
              <option value="Praise">إشادة ومديح بالجودة</option>
              <option value="Suggestion">اقتراح تحسين وتطوير</option>
              <option value="Complaint">ملاحظة / شكوى</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>تعليق ورأي العميلة</label>
            <textarea
              rows="3"
              value={feedbackForm.comment}
              onChange={e => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
              className="w-full p-3 bg-white border border-[#E8E5EA] rounded-xl text-xs outline-none resize-none focus:border-[#009FAE]"
              placeholder="اكتب تعليق العميلة هنا بدقة..."
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E8E5EA]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA] cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#009FAE] hover:bg-[#007F8C] text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ التقييم في سوبابيز 💾'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.AddFeedbackModal = AddFeedbackModal;
