function VoucherReversalModal({
  voucher,
  reversalReason,
  setReversalReason,
  isReversing,
  onConfirm,
  onClose
}) {
  if (!voucher) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-lg w-full overflow-hidden text-right" dir="rtl">
        <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between bg-gradient-to-r from-rose-50 via-white to-rose-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-lg font-bold border border-rose-200">
              ↩️
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#25232A]">إلغاء السند بقيد عكسي محاسبي</h2>
              <p className="text-[11px] text-rose-700 font-medium">سند رقم: {voucher.v_no} ({voucher.v_type})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#6F6B75] hover:bg-[#F3F2F5] hover:text-[#25232A] flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-950">
              <span>⚠️</span>
              <span>تنبيه رقابي ومحاسبي صارم:</span>
            </div>
            وفق معايير الحوكمة المالية، لا يتم مسح السند أو حذفه من قاعدة البيانات، بل سيتم توليد قيد يومية عكسي متزن آلياً يعكس الأثر المالي في دفتر الأستاذ العام وذمة العميل/المورد، مع توثيق سبب الإلغاء في سجل التدقيق.
          </div>

          <div className="bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#6F6B75]">الطرف:</span>
              <span className="font-bold text-[#25232A]">{voucher.party || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6F6B75]">المبلغ الأصلي:</span>
              <span className="font-bold text-[#25232A] font-mono">{voucher.amount} {voucher.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6F6B75]">تاريخ التحرير:</span>
              <span className="font-mono text-[#25232A]">{voucher.date}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25232A] mb-1.5">
              سبب الإلغاء الإلزامي <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows="3"
              className="w-full px-3 py-2 text-xs border border-[#E8E5EA] rounded-xl focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none"
              placeholder="أدخل سبب الإلغاء (مثال: خطأ في الحساب، شيك مرتجع، إلغاء الطلب من العميل)..."
              value={reversalReason}
              onChange={e => setReversalReason(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E8E5EA]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#6F6B75] bg-[#F3F2F5] hover:bg-[#E8E5EA] rounded-xl transition cursor-pointer"
            >
              تراجع
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isReversing || !reversalReason.trim()}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              {isReversing ? 'جاري القيد العكسي...' : 'تأكيد الإلغاء بالقيد العكسي ↩️'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.VoucherReversalModal = VoucherReversalModal;
