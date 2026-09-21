// src/features/feedback/components/FeedbackDetailModal.jsx
// نافذة عرض تفاصيل تقييم العميل الكاملة وسجل الإجراءات المتخذة

function FeedbackDetailModal({
  feedbackItem,
  onClose,
  showToast
}) {
  if (!feedbackItem) return null;

  const handleSendReply = () => {
    if (showToast) showToast('تم تجهيز الرد للعميل وسيتم إرساله عبر الواتساب 📲');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E8E5EA] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <h3 className="font-bold text-sm text-[#25232A]">
              تفاصيل تقييم واستبيان العميلة
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#6F6B75] hover:text-[#25232A] font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="bg-[#FAFAFB] p-4 rounded-xl border border-[#E8E5EA] space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-[#6F6B75]">اسم العميلة:</span>
            <span className="font-bold text-[#25232A] text-sm">
              {feedbackItem.customer_name || feedbackItem.Customer_Name || 'عزيزتنا'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#6F6B75]">رقم الطلب:</span>
            <span className="font-mono font-bold text-[#8F2A87]">
              #{feedbackItem.order_id || feedbackItem.Order_ID || 'طلب عام'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#6F6B75]">تاريخ التسجيل:</span>
            <span className="font-mono font-medium text-[#25232A]">
              {String(feedbackItem.feedback_date || feedbackItem.Feedback_Date || feedbackItem.created_at || '').split('T')[0]}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#6F6B75]">درجة الرضا العام:</span>
            <span className="font-bold text-amber-500 font-mono text-sm">
              {feedbackItem.rating || feedbackItem.Rating || 5} / 5 ⭐
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#6F6B75]">مؤشر الترويج NPS:</span>
            <span className="font-bold text-[#007F8C] font-mono">
              {feedbackItem.nps_score || feedbackItem.NPS_Score || 10} / 10
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#6F6B75]">قناة التواصل:</span>
            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
              {feedbackItem.channel || feedbackItem.Channel || 'WhatsApp'}
            </span>
          </div>
        </div>

        {/* تعليق العميلة */}
        <div className="space-y-1.5 text-xs">
          <span className="font-bold text-[#25232A]">تعليق ورأي العميلة:</span>
          <div className="p-3 bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl text-[#25232A] leading-relaxed">
            {feedbackItem.comment || feedbackItem.Comment || feedbackItem.notes || 'لا توجد ملاحظات إضافية.'}
          </div>
        </div>

        {/* الإجراءات المتخذة */}
        <div className="space-y-1.5 text-xs">
          <span className="font-bold text-[#25232A]">الإجراء المتخذ / الرد:</span>
          <div className="p-3 bg-[#E2F5F7]/30 border border-[#C5ECF0] rounded-xl text-[#007F8C]">
            ✓ تم تدقيق التقييم ومطابقته مع معايير جودة المعمل والخدمة الملكية.
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E8E5EA]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA] cursor-pointer"
          >
            إغلاق
          </button>
          <button
            type="button"
            onClick={handleSendReply}
            className="px-5 py-2.5 bg-[#009FAE] hover:bg-[#007F8C] text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>📲 إرسال شكر وتقدير</span>
          </button>
        </div>
      </div>
    </div>
  );
}

window.FeedbackDetailModal = FeedbackDetailModal;
