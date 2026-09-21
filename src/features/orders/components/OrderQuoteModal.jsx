// src/features/orders/components/OrderQuoteModal.jsx

function OrderQuoteModal({
  isOpen,
  onClose,
  quoteText = '',
  showToast
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose} dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-[#E8E5EA] dark:border-slate-800 flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-[#FAFAFB] dark:bg-slate-800/80 px-5 py-4 border-b border-[#E8E5EA] dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-[#25232A] dark:text-slate-100 text-sm flex items-center gap-2">
            📋 عرض السعر الجاهز للمراسلة
          </h3>
          <button onClick={onClose} className="text-[#6F6B75] dark:text-slate-400 hover:text-[#25232A] dark:hover:text-slate-100">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <textarea 
            readOnly 
            value={quoteText} 
            className="w-full h-44 p-3.5 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-[#FAFAFB] dark:bg-slate-800 text-xs font-mono text-[#25232A] dark:text-slate-100 outline-none resize-none"
          ></textarea>
          <button 
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(quoteText);
              showToast && showToast('تم النسخ بنجاح 📲');
            }} 
            className="w-full py-3 rounded-xl font-bold text-xs text-white bg-[#009FAE] hover:bg-[#007F8C] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            نسخ الرد لواتساب / إنستقرام 📲
          </button>
        </div>
      </div>
    </div>
  );
}

window.OrderQuoteModal = OrderQuoteModal;
