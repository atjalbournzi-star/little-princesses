function VoucherViewModal({
  voucher,
  onClose,
  onPrint
}) {
  if (!voucher) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-[#E8E5EA] space-y-5 text-right" dir="rtl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{voucher.isReceipt ? '📥' : '📤'}</span>
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">تفاصيل {voucher.v_type}</h3>
              <span className="text-xs font-mono font-bold text-[#8F2A87]">{voucher.v_no}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-[#6F6B75] hover:text-[#25232A] font-bold p-1 cursor-pointer">✕</button>
        </div>

        <div className="space-y-3 bg-[#FAFAFB] p-4 rounded-xl border border-[#E8E5EA] text-xs">
          <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
            <span className="text-[#6F6B75] font-semibold">{voucher.isReceipt ? 'استلمنا من:' : 'صرفنا إلى (المستفيد):'}</span>
            <span className="font-bold text-[#25232A] text-sm">{voucher.party}</span>
          </div>
          <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
            <span className="text-[#6F6B75] font-semibold">المبلغ:</span>
            <span className="font-bold font-mono text-base text-[#007F8C]">
              {Number(voucher.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {voucher.currency}
            </span>
          </div>
          <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
            <span className="text-[#6F6B75] font-semibold">طريقة الدفع:</span>
            <span className="font-bold text-[#25232A]">{voucher.pay_method}</span>
          </div>
          <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
            <span className="text-[#6F6B75] font-semibold">الحساب المالي:</span>
            <span className="font-bold text-[#25232A]">{voucher.account}</span>
          </div>
          <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
            <span className="text-[#6F6B75] font-semibold">تاريخ السند:</span>
            <span className="font-mono text-[#25232A]">{voucher.date}</span>
          </div>
          <div>
            <span className="text-[#6F6B75] font-semibold block mb-1">البيان والملاحظات:</span>
            <p className="text-[#25232A] font-medium bg-white p-2 rounded-lg border border-[#E8E5EA]">{voucher.notes}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => {
              onPrint?.(voucher);
              onClose();
            }} 
            className="flex-1 py-2.5 bg-[#009FAE] hover:bg-[#007F8C] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>🧾</span>
            <span>طباعة سند رسمي وإيصال حراري 🖨️</span>
          </button>
          <button 
            type="button"
            onClick={onClose} 
            className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] font-bold text-xs rounded-xl border border-[#E8E5EA] cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

window.VoucherViewModal = VoucherViewModal;
