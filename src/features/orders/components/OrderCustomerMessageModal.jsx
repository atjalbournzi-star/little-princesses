// src/features/orders/components/OrderCustomerMessageModal.jsx
// نافذة وثيقة الملكية وكرت الفستان الملكي ورسالة الواتساب للعميل

function OrderCustomerMessageModal({ data, onClose, showToast }) {
  if (!data) return null;

  const handleWhatsApp = () => {
    let p = data.phone ? String(data.phone).replace(/\D/g, '') : '';
    if (p.startsWith('0')) p = '967' + p.substring(1);
    else if (!p.startsWith('967') && !p.startsWith('966') && p.length > 0) p = '967' + p;
    const url = p 
      ? `https://wa.me/${p}?text=${encodeURIComponent(data.msg)}`
      : `https://wa.me/?text=${encodeURIComponent(data.msg)}`;
    window.open(url, '_blank');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(data.msg);
    showToast && showToast('تم نسخ رابط كرت الفستان والرسالة الملكية بنجاح! 🌸📋', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn select-none" dir="rtl">
      <div className="bg-white dark:bg-[#111C38] rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 text-right max-h-[94vh] overflow-y-auto custom-scrollbar transition-colors">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-600 to-purple-600 text-white flex items-center justify-center text-lg shadow-sm">
              {data.isRtw ? "🛍️" : "👗"}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-white leading-tight">
                {data.isRtw ? "وثيقة ملكية وضمان فستان جاهز 👑" : "كرت فستان الأميرة الفاخر ووثيقة الحجز"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                للأميرة: <span className="font-bold text-pink-600 dark:text-pink-300">{data.chName}</span> • طلب: <span className="font-mono">{data.order?.order_no}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7.5 h-7.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {/* Visual Dress Card Luxury Preview Container */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          
          {/* Card VIP Banner */}
          <div className="flex items-center justify-between bg-gradient-to-r from-purple-800 via-pink-700 to-rose-600 text-white px-3.5 py-2.5 rounded-xl shadow-sm">
            <div>
              <span className="text-[10.5px] text-pink-100 block font-medium opacity-90">الأميرة صاحبة الفستان:</span>
              <span className="font-black text-sm sm:text-base tracking-tight">{data.chName}</span>
            </div>
            <span className="text-xl filter drop-shadow-xs">👑</span>
            <div className="text-left">
              <span className="text-[10.5px] text-pink-100 block font-medium opacity-90">والدة الأميرة / المشترية:</span>
              <span className="font-bold text-xs sm:text-sm">{data.motherName}</span>
            </div>
          </div>

          {/* Garment Details & Image */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="sm:col-span-2 space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">الموديل:</span>
                <span className="font-bold text-slate-800 dark:text-purple-300 text-xs sm:text-[13px]">{data.order?.product_name || 'موديل راقي خاص'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">{data.isRtw ? "حالة الشراء:" : "موعد التسليم:"}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                  {data.isRtw ? "تم الشراء والاستلام الفوري ✔️" : data.deliveryDateFormatted}
                </span>
              </div>
              {data.childMeas ? (
                <div className="pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-800 text-xs font-mono flex flex-wrap gap-2 text-slate-700 dark:text-slate-300">
                  {data.childMeas.dress_length && <span>طول: <b>{data.childMeas.dress_length}</b></span>}
                  {data.childMeas.chest && <span>صدر: <b>{data.childMeas.chest}</b></span>}
                  {data.childMeas.waist && <span>خصر: <b>{data.childMeas.waist}</b></span>}
                </div>
              ) : (
                data.isRtw && (
                  <div className="pt-1 text-[11px] text-pink-700 dark:text-pink-300 font-bold flex items-center gap-1">
                    <span>✨</span>
                    <span>خامات كوتور فاخرة • ضمان الأصالة الملكي معتمد</span>
                  </div>
                )
              )}
            </div>

            {/* Photo preview */}
            <div className="h-24 sm:h-auto min-h-[85px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shadow-2xs">
              {data.imgUrl ? (
                <img src={data.imgUrl} alt="فستان" className="w-full h-full object-cover object-top" />
              ) : (
                <div className="text-center p-2">
                  <span className="text-2xl">{data.isRtw ? "🛍️" : "👗"}</span>
                  <span className="block text-[10px] text-pink-600 dark:text-pink-400 font-bold mt-0.5">{data.isRtw ? "فستان جاهز" : "تفصيل ملكي"}</span>
                </div>
              )}
            </div>
          </div>

          {/* Financial Breakdown (Clean & Spacious) */}
          <div className="grid grid-cols-3 gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-2xs">
            <div className="p-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">الإجمالي</span>
              <span className="font-mono font-bold text-xs sm:text-sm text-slate-800 dark:text-white">{data.tot?.toLocaleString()} {data.cur}</span>
            </div>
            <div className="p-1 border-x border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-semibold">{data.isRtw ? "المسدد" : "المحصل"}</span>
              <span className="font-mono font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">{data.pd?.toLocaleString()} {data.cur}</span>
            </div>
            <div className="p-1">
              <span className="text-[11px] text-amber-600 dark:text-amber-400 block font-semibold">المتبقي</span>
              <span className="font-mono font-black text-xs sm:text-sm text-amber-600 dark:text-amber-400">{data.rem?.toLocaleString()} {data.cur}</span>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-2 pt-0.5">
            <a href={data.dressCardUrl} target="_blank" rel="noreferrer" className="flex-1 h-8 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition">
              <span>{data.isRtw ? "🛍️ فتح وثيقة الملكية والضمان (PNG)" : "🖼️ فتح كرت الفستان عالي الدقة (PNG)"}</span>
              <span>↗</span>
            </a>
            <a href={data.trackingUrl} target="_blank" rel="noreferrer" className="h-8 px-3 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-pink-600 font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition">
              <span>📱 تتبع الفستان</span>
              <span>↗</span>
            </a>
          </div>
        </div>

        {/* Message Accordion */}
        <details className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
          <summary className="font-bold hover:text-pink-600 dark:hover:text-pink-400 transition">عرض نص رسالة الواتساب 💬</summary>
          <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] leading-relaxed whitespace-pre-wrap max-h-28 overflow-y-auto select-all font-mono">
            {data.msg}
          </div>
        </details>

        {/* Bottom CTA Action Buttons */}
        <div className="pt-1 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleWhatsApp}
              className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-[13px] shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <span className="text-base">📲</span>
              <span>إرسال بالواتساب مع كرت الفستان</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs sm:text-[13px] shadow-md shadow-pink-600/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <span className="text-base">📋</span>
              <span>نسخ الرابط والرسالة الملكية</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-8.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
}

window.OrderCustomerMessageModal = OrderCustomerMessageModal;
