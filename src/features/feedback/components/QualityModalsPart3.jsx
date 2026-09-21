// src/features/feedback/components/QualityModalsPart3.jsx
// نوافذ تسجيل شكاوى العملاء ومرتجعات الفساتين وتحديد أثر COPQ

function QualityModalsPart3({
  activeModalType,
  onClose,
  complaintForm,
  setComplaintForm,
  onSubmitComplaint,
  returnForm,
  setReturnForm,
  onSubmitReturn,
  currencyDisplay = "YER ريال",
  isSubmitting
}) {
  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#B0005A] focus:ring-2 focus:ring-[#FCE8F2] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <>
      {/* Modal: Add Complaint */}
      {activeModalType === 'complaint' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#E8E5EA] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <h3 className="font-bold text-sm text-[#25232A]">📢 تسجيل شكوى عميل جديدة (Customer Complaint)</h3>
              <button onClick={onClose} className="text-[#6F6B75] hover:text-[#25232A] font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={onSubmitComplaint} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>اسم العميلة</label>
                  <input type="text" value={complaintForm.customer_name} onChange={e => setComplaintForm({ ...complaintForm, customer_name: e.target.value })} className={inputCls} required placeholder="اسم العميلة..." />
                </div>
                <div>
                  <label className={labelCls}>رقم الطلب (اختياري)</label>
                  <input type="text" value={complaintForm.order_id} onChange={e => setComplaintForm({ ...complaintForm, order_id: e.target.value })} className={inputCls} placeholder="ORD-..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>نوع الشكوى</label>
                  <select
                    value={complaintForm.complaint_type}
                    onChange={e => setComplaintForm({ ...complaintForm, complaint_type: e.target.value })}
                    className={inputCls}
                  >
                    <option value="sizing">مقاسات وضيق/اتساع 👗</option>
                    <option value="finishing">تشطيب وخياطة وسحابات ✂️</option>
                    <option value="delivery">تأخير في موعد التسليم ⏱️</option>
                    <option value="fabric">ملاحظة على القماش أو الخامة 🧵</option>
                    <option value="service">تعامل وخدمة عملاء 🎧</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>مستوى الخطورة</label>
                  <select
                    value={complaintForm.severity}
                    onChange={e => setComplaintForm({ ...complaintForm, severity: e.target.value })}
                    className={inputCls}
                  >
                    <option value="low">منخفضة (تعديل بسيط)</option>
                    <option value="medium">متوسطة (إعادة ضبط وتنسيق)</option>
                    <option value="high">عالية (استياء عميلة / موعد ضاغط)</option>
                    <option value="critical">حرجة (طلب استرداد / مناسبة قريبة)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>تفاصيل وملاحظات الشكوى</label>
                <textarea
                  rows="3"
                  value={complaintForm.description}
                  onChange={e => setComplaintForm({ ...complaintForm, description: e.target.value })}
                  className="w-full p-3 bg-white border border-[#E8E5EA] rounded-xl text-xs outline-none resize-none"
                  required
                  placeholder="اكتب تفاصيل الشكوى بدقة..."
                />
              </div>
              <div>
                <label className={labelCls}>تكلفة التعويض المقترحة إن وجدت ({currencyDisplay})</label>
                <input
                  type="number"
                  min="0"
                  value={complaintForm.compensation_cost}
                  onChange={e => setComplaintForm({ ...complaintForm, compensation_cost: e.target.value })}
                  className={inputCls + " font-mono font-bold text-[#D64545]"}
                  placeholder="0.00"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E8E5EA]">
                <button type="button" onClick={onClose} className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA] cursor-pointer">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#D64545] hover:bg-[#B53535] text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer">
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ الشكوى في سوبابيز 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Return */}
      {activeModalType === 'return' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#E8E5EA] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <h3 className="font-bold text-sm text-[#25232A]">🔄 تسجيل مرتجع فستان وتحديد أثر COPQ</h3>
              <button onClick={onClose} className="text-[#6F6B75] hover:text-[#25232A] font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={onSubmitReturn} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>اسم العميلة</label>
                  <input type="text" value={returnForm.customer_name} onChange={e => setReturnForm({ ...returnForm, customer_name: e.target.value })} className={inputCls} required placeholder="اسم العميلة..." />
                </div>
                <div>
                  <label className={labelCls}>رقم الطلب</label>
                  <input type="text" value={returnForm.order_id} onChange={e => setReturnForm({ ...returnForm, order_id: e.target.value })} className={inputCls} placeholder="ORD-..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>سبب الإرجاع</label>
                  <select
                    value={returnForm.return_reason}
                    onChange={e => setReturnForm({ ...returnForm, return_reason: e.target.value })}
                    className={inputCls}
                  >
                    <option value="مقاس غير ملائم">مقاس غير ملائم 👗</option>
                    <option value="عيب خياطة أو تشطيب">عيب خياطة أو تشطيب ✂️</option>
                    <option value="تلف أثناء الشحن">تلف أثناء الشحن 📦</option>
                    <option value="عدم مطابقة للتصميم المعتمد">عدم مطابقة للتصميم 🎨</option>
                    <option value="رغبة العميلة">رغبة العميلة</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>حالة الفستان المستلم</label>
                  <select
                    value={returnForm.condition}
                    onChange={e => setReturnForm({ ...returnForm, condition: e.target.value })}
                    className={inputCls}
                  >
                    <option value="repairable">قابل للإصلاح والتعديل ✂️</option>
                    <option value="damaged">تالف كلياً / هالك (Scrap) ❌</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>الإجراء المتخذ لمعالجة المرتجع</label>
                <input
                  type="text"
                  value={returnForm.action_taken}
                  onChange={e => setReturnForm({ ...returnForm, action_taken: e.target.value })}
                  className={inputCls}
                  required
                  placeholder="مثال: تعديل المقاس في المعمل وإعادة التسليم..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>مبلغ الاسترداد للعميلة إن وجد ({currencyDisplay})</label>
                  <input
                    type="number"
                    min="0"
                    value={returnForm.refund_amount}
                    onChange={e => setReturnForm({ ...returnForm, refund_amount: e.target.value })}
                    className={inputCls + " font-mono font-bold text-[#D64545]"}
                  />
                </div>
                <div>
                  <label className={labelCls}>تكلفة استبدال/إعادة تفصيل ({currencyDisplay})</label>
                  <input
                    type="number"
                    min="0"
                    value={returnForm.replacement_cost}
                    onChange={e => setReturnForm({ ...returnForm, replacement_cost: e.target.value })}
                    className={inputCls + " font-mono font-bold text-[#8F2A87]"}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E8E5EA]">
                <button type="button" onClick={onClose} className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA] cursor-pointer">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#6B21A8] hover:bg-[#581C87] text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer">
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ المرتجع واحتساب COPQ 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

window.QualityModalsPart3 = QualityModalsPart3;
