// src/features/feedback/components/FeedbackList.jsx
// جدول استبيانات ورضا العملاء (Customer Feedback & NPS)

function FeedbackList({
  feedback = [],
  onOpenFeedbackModal,
  onViewFeedbackDetail
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E8E5EA]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-[#25232A]">سجل استبيانات ورضا العملاء (Customer Feedback & NPS)</h3>
            <span className="text-[11px] bg-[#E2F5F7] text-[#007F8C] font-bold px-2.5 py-0.5 rounded-full border border-[#C5ECF0]">
              {(feedback || []).length} استبيان مسجل
            </span>
          </div>
          <p className="text-xs text-[#6F6B75] mt-0.5">سجل حقيقي متصل بقاعدة بيانات PostgreSQL السحابية (سوبابيز)</p>
        </div>
        <button
          onClick={onOpenFeedbackModal}
          className="px-4 py-2 bg-[#009FAE] hover:bg-[#007F8C] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <span>➕ تقييم عميل جديد</span>
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
              <th className="p-3">التاريخ والطلب</th>
              <th className="p-3">اسم العميلة</th>
              <th className="p-3 text-center">التقييم (1-5)</th>
              <th className="p-3 text-center">مؤشر NPS</th>
              <th className="p-3">نوع التقييم</th>
              <th className="p-3">التعليق والملاحظات</th>
              <th className="p-3 text-center">القناة</th>
              <th className="p-3 text-center">تفاصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E5EA] bg-white">
            {(!feedback || feedback.length === 0) ? (
              <tr>
                <td colSpan="8" className="p-10 text-center text-[#6F6B75]">
                  لا توجد تقييمات مسجلة حتى الآن ⭐
                </td>
              </tr>
            ) : (
              feedback.map((fb, idx) => (
                <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                  <td className="p-3">
                    <div className="font-bold font-mono text-[#8F2A87]">
                      #{fb.order_id || fb.Order_ID || 'طلب'}
                    </div>
                    <div className="text-[11px] text-[#6F6B75] font-mono">
                      {String(fb.feedback_date || fb.Feedback_Date || fb.created_at || '').split('T')[0]}
                    </div>
                  </td>
                  <td className="p-3 font-bold text-[#25232A]">
                    {fb.customer_name || fb.Customer_Name || 'عزيزتنا'}
                  </td>
                  <td className="p-3 text-center font-bold font-mono text-[#F28A00]">
                    {fb.rating || fb.Rating || 5} ⭐
                  </td>
                  <td className="p-3 text-center font-bold font-mono text-[#007F8C]">
                    {fb.nps_score || fb.NPS_Score || 10} / 10
                  </td>
                  <td className="p-3 text-[#6F6B75]">
                    {fb.feedback_type || fb.Feedback_Type || 'NPS'}
                  </td>
                  <td className="p-3 text-[#6F6B75] max-w-xs truncate">
                    {fb.comment || fb.Comment || fb.notes || '--'}
                  </td>
                  <td className="p-3 text-center font-semibold text-[11px]">
                    {fb.channel || fb.Channel || 'WhatsApp'}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onViewFeedbackDetail(fb)}
                      className="px-2.5 py-1 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-lg text-[11px] font-bold border border-[#E8E5EA] transition cursor-pointer"
                    >
                      عرض 👁️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.FeedbackList = FeedbackList;
