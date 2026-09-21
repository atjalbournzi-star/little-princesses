function DeliveryModal({
  deliveryModalData,
  setDeliveryModalData,
  deliveredSuccessData,
  deliveryForm,
  setDeliveryForm,
  submittingDelivery,
  handleConfirmDelivery,
  accounts = []
}) {
  if (!deliveryModalData) return null;
  const utils = window.FactoryUtils || {};
  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E8E5EA] space-y-4 text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">👑</span>
            <div>
              <h3 className="text-sm font-bold text-[#25232A]">تسليم فستان الأميرة والتحصيل النهائي</h3>
              <p className="text-[11px] text-[#6F6B75]">أمر رقم: {deliveryModalData.order?.order_no || deliveryModalData.order_no || deliveryModalData.id}</p>
            </div>
          </div>
          <button onClick={() => setDeliveryModalData(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm cursor-pointer">✕</button>
        </div>

        {deliveredSuccessData ? (
          <div className="space-y-4 py-2">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <span className="text-4xl block animate-bounce">🎉</span>
              <h4 className="text-sm font-black text-emerald-900">تم تسليم الفستان الملكي بنجاح!</h4>
              <p className="text-xs text-emerald-800">
                تم تحصيل مبلغ <strong>{deliveredSuccessData.collected_amount?.toLocaleString() || deliveryForm.amount_collected} ر.ي</strong> وإصدار سند القبض وترحيل قيد الخزينة المزدوج آلياً.
              </p>
            </div>
            <button
              type="button"
              onClick={() => utils.sendWhatsAppDeliveryGreeting && utils.sendWhatsAppDeliveryGreeting(deliveredSuccessData, deliveryModalData, deliveryForm)}
              className="w-full py-3.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>📲</span><span>إرسال بطاقة تهنئة التسليم للأميرة عبر واتساب 🌸</span>
            </button>
            <button type="button" onClick={() => setDeliveryModalData(null)} className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer">إغلاق النافذة</button>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-2xl bg-[#F2E7F3]/60 border border-[#E5CEE7] space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#8F2A87]">👧 الأميرة: {deliveryModalData.child_name || deliveryModalData.order?.child_name || 'الأميرة'}</span>
                <span className="text-[#6F6B75]">العميلة: {deliveryModalData.customer_name || deliveryModalData.customer || deliveryModalData.order?.customer_name}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-[#E5CEE7]">
                <span>👗 الموديل: <strong>{deliveryModalData.product || deliveryModalData.product_name}</strong></span>
                <span className="font-mono text-[#8F2A87]">الكمية: {deliveryModalData.quantity || 1} قطعة</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-[#FAFAFB] rounded-xl border border-[#E8E5EA]">
                <span className="text-[10.5px] text-[#6F6B75] block">إجمالي الفاتورة</span>
                <span className="font-mono font-bold text-[#25232A] mt-0.5 block">{deliveryModalData.resolvedTotal?.toLocaleString()} ر.ي</span>
              </div>
              <div className="p-2.5 bg-[#FAFAFB] rounded-xl border border-[#E8E5EA]">
                <span className="text-[10.5px] text-[#6F6B75] block">العربون المسدد</span>
                <span className="font-mono font-bold text-[#007F8C] mt-0.5 block">{deliveryModalData.resolvedPaid?.toLocaleString()} ر.ي</span>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[10.5px] text-amber-800 font-bold block">المتبقي للتحصيل</span>
                <span className="font-mono font-black text-[#8F2A87] mt-0.5 block">{deliveryModalData.resolvedRemaining?.toLocaleString()} ر.ي</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>المبلغ المحصل الآن (ر.ي) <span className="text-[#D64545] font-bold">*</span></label>
                <input type="number" step="100" min="0" className={inputCls + " font-mono font-bold text-[#8F2A87] text-center"} value={deliveryForm.amount_collected} onChange={e => setDeliveryForm({ ...deliveryForm, amount_collected: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>خصم إضافي إن وجد (ر.ي)</label>
                <input type="number" step="100" min="0" className={inputCls + " font-mono text-center"} value={deliveryForm.discount} onChange={e => setDeliveryForm({ ...deliveryForm, discount: e.target.value })} placeholder="0" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>حساب الخزينة / الصندوق <span className="text-[#D64545] font-bold">*</span></label>
                <select className={inputCls} value={deliveryForm.account_id} onChange={e => setDeliveryForm({ ...deliveryForm, account_id: e.target.value })}>
                  <option value="ACC-101">ACC-101 (الصندوق الرئيسي - كاش)</option>
                  <option value="ACC-103">ACC-103 (بنك الكريمي - تحويل بنكي)</option>
                  {(accounts || []).filter(a => a.id !== 'ACC-101' && a.id !== 'ACC-103' && (a.account_type === 'Asset' || a.category === 'خزينة')).map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.id} ({acc.name})</option>
                  ))}
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
              <input type="text" className={inputCls} value={deliveryForm.notes} onChange={e => setDeliveryForm({ ...deliveryForm, notes: e.target.value })} placeholder="تم تسليم الفستان للأميرة وفحص المقاسات بنجاح..." />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button" disabled={submittingDelivery} onClick={handleConfirmDelivery}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#8F2A87] to-[#B0005A] hover:opacity-95 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{submittingDelivery ? 'جاري التسليم والترحيل...' : '✅ تأكيد التسليم النهائي والترحيل المالي'}</span>
              </button>
              <button type="button" onClick={() => setDeliveryModalData(null)} className="py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer">إلغاء</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.DeliveryModal = DeliveryModal;
