function VoucherViewModal({
  voucher,
  onClose,
  onPrint
}) {
  if (!voucher) return null;

  const createPortal = (typeof ReactDOM !== 'undefined' && ReactDOM.createPortal) ? ReactDOM.createPortal : null;
  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-[4px] animate-fadeIn" dir="rtl" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e2433] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-[#E8E5EA] dark:border-[#2d3748] text-right" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-3.5 border-b border-[#E8E5EA] dark:border-[#2d3748] flex items-center justify-between bg-[#FAFAFB] dark:bg-[#181d2a] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{voucher.isReceipt ? '📥' : '📤'}</span>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-[#25232A] dark:text-white">تفاصيل {voucher.v_type}</h3>
              <span className="text-xs font-mono font-bold text-[#8F2A87] dark:text-pink-400" dir="ltr">{voucher.v_no}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#2d3748] dark:hover:bg-[#374151] text-gray-500 dark:text-gray-300 flex items-center justify-center cursor-pointer text-xs">✕</button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FAFAFB] dark:bg-[#181d2a]/70 p-4 rounded-xl border border-[#E8E5EA] dark:border-[#2d3748] text-xs">
            <div className="flex justify-between items-center border-b border-[#E8E5EA] dark:border-[#2d3748] pb-2">
              <span className="text-[#6F6B75] dark:text-gray-400 font-semibold">{voucher.isReceipt ? 'استلمنا من:' : 'صرفنا إلى (المستفيد):'}</span>
              <span className="font-bold text-[#25232A] dark:text-white text-sm">{voucher.party}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#E8E5EA] dark:border-[#2d3748] pb-2">
              <span className="text-[#6F6B75] dark:text-gray-400 font-semibold">المبلغ:</span>
              <span className="font-bold font-mono text-base text-[#007F8C] dark:text-[#00E5FF]" dir="ltr">
                {Number(voucher.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {voucher.currency}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-[#E8E5EA] dark:border-[#2d3748] pb-2">
              <span className="text-[#6F6B75] dark:text-gray-400 font-semibold">طريقة الدفع:</span>
              <span className="font-bold text-[#25232A] dark:text-white">{voucher.pay_method}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#E8E5EA] dark:border-[#2d3748] pb-2">
              <span className="text-[#6F6B75] dark:text-gray-400 font-semibold">الحساب المالي:</span>
              <span className="font-bold text-[#25232A] dark:text-white">{voucher.account}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#E8E5EA] dark:border-[#2d3748] pb-2">
              <span className="text-[#6F6B75] dark:text-gray-400 font-semibold">تاريخ السند:</span>
              <span className="font-mono text-[#25232A] dark:text-white" dir="ltr">{voucher.date}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#E8E5EA] dark:border-[#2d3748] pb-2">
              <span className="text-[#6F6B75] dark:text-gray-400 font-semibold">رقم السند:</span>
              <span className="font-mono text-[#25232A] dark:text-white" dir="ltr">{voucher.v_no}</span>
            </div>
            <div className="sm:col-span-2 pt-1">
              <span className="text-[#6F6B75] dark:text-gray-400 font-semibold block mb-1">البيان والملاحظات:</span>
              <p className="text-[#25232A] dark:text-white font-medium bg-white dark:bg-[#111827] p-2.5 rounded-lg border border-[#E8E5EA] dark:border-[#2d3748]">{voucher.notes || '—'}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-[#E8E5EA] dark:border-[#2d3748] bg-[#FAFAFB] dark:bg-[#181d2a] flex gap-2.5 shrink-0">
          <button 
            type="button"
            onClick={() => {
              onPrint?.(voucher);
              onClose();
            }} 
            className="flex-1 py-2 bg-[#009FAE] hover:bg-[#007F8C] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>🧾</span>
            <span>طباعة سند رسمي وإيصال حراري 🖨️</span>
          </button>
          <button 
            type="button"
            onClick={onClose} 
            className="px-5 py-2 bg-white dark:bg-[#2d3748] hover:bg-[#E8E5EA] dark:hover:bg-[#374151] text-[#25232A] dark:text-white font-bold text-xs rounded-xl border border-[#E8E5EA] dark:border-[#374151] cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
  if (typeof document !== 'undefined' && createPortal) return createPortal(content, document.body);
  return content;
}

window.VoucherViewModal = VoucherViewModal;
