function VoucherReversalModal({
  voucher,
  reversalReason,
  setReversalReason,
  isReversing,
  onConfirm,
  onClose
}) {
  if (!voucher) return null;

  const createPortal = (typeof ReactDOM !== 'undefined' && ReactDOM.createPortal) ? ReactDOM.createPortal : null;
  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-[4px] animate-fadeIn" dir="rtl" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e2433] rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-right" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-3.5 border-b border-rose-100 dark:border-rose-900/40 flex items-center justify-between bg-gradient-to-r from-rose-50 via-white to-rose-50 dark:from-rose-950/20 dark:via-[#1e2433] dark:to-rose-950/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 flex items-center justify-center text-base font-bold border border-rose-200 dark:border-rose-800">
              ↩️
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-[#25232A] dark:text-white">إلغاء السند بقيد عكسي محاسبي</h2>
              <p className="text-[10.5px] text-rose-700 dark:text-rose-400 font-medium">سند رقم: {voucher.v_no} ({voucher.v_type})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-[#6F6B75] dark:text-gray-300 hover:bg-[#F3F2F5] dark:hover:bg-[#2d3748] hover:text-[#25232A] flex items-center justify-center transition-colors cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-3.5">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-950 dark:text-amber-100">
              <span>⚠️</span>
              <span>تنبيه رقابي ومحاسبي صارم:</span>
            </div>
            وفق معايير الحوكمة المالية، لا يتم مسح السند أو حذفه من قاعدة البيانات، بل سيتم توليد قيد يومية عكسي متزن آلياً يعكس الأثر المالي في دفتر الأستاذ العام وذمة العميل/المورد، مع توثيق سبب الإلغاء في سجل التدقيق.
          </div>

          <div className="bg-[#FAFAFB] dark:bg-[#181d2a]/70 border border-[#E8E5EA] dark:border-[#2d3748] rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#6F6B75] dark:text-gray-400">الطرف:</span>
              <span className="font-bold text-[#25232A] dark:text-white">{voucher.party || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6F6B75] dark:text-gray-400">المبلغ الأصلي:</span>
              <span className="font-bold text-[#25232A] dark:text-[#00E5FF] font-mono" dir="ltr">{voucher.amount} {voucher.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6F6B75] dark:text-gray-400">تاريخ التحرير:</span>
              <span className="font-mono text-[#25232A] dark:text-white" dir="ltr">{voucher.date}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25232A] dark:text-gray-200 mb-1.5">
              سبب الإلغاء الإلزامي <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows="3"
              className="w-full px-3 py-2 text-xs border border-[#E8E5EA] dark:border-[#2d3748] bg-white dark:bg-[#111827] text-[#25232A] dark:text-white rounded-xl focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none"
              value={reversalReason}
              onChange={e => setReversalReason(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="px-6 py-3 border-t border-[#E8E5EA] dark:border-[#2d3748] bg-[#FAFAFB] dark:bg-[#181d2a] flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#6F6B75] dark:text-gray-300 bg-[#F3F2F5] dark:bg-[#2d3748] hover:bg-[#E8E5EA] dark:hover:bg-[#374151] rounded-xl transition cursor-pointer"
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
  );
  if (typeof document !== 'undefined' && createPortal) return createPortal(content, document.body);
  return content;
}

window.VoucherReversalModal = VoucherReversalModal;
