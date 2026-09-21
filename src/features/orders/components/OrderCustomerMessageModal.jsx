// src/features/orders/components/OrderCustomerMessageModal.jsx

function OrderCustomerMessageModal({
  data,
  onClose,
  showToast
}) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#E8E5EA] dark:border-slate-800 space-y-4 text-right max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-[#8F2A87] text-white flex items-center justify-center text-xl shadow-xs">
              {data.isRtw ? "🛍️" : "👗"}
            </div>
            <div>
              <h3 className="text-sm font-black text-[#25232A] dark:text-slate-100">
                {data.isRtw ? "وثيقة ملكية وضمان فستان جاهز للأميرة 🛍️👑" : "كرت فستان الأميرة الفاخر ووثيقة الحجز"}
              </h3>
              <p className="text-[11px] text-[#6F6B75] dark:text-slate-400">
                للأميرة: <span className="font-bold text-[#8F2A87] dark:text-pink-300">{data.chName}</span> • طلب: {data.order?.order_no}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer">✕</button>
        </div>

        {/* Visual Dress Card Luxury Preview Container */}
        <div className="p-4 rounded-2xl bg-[#FFFDF9] dark:bg-slate-950 border-2 border-[#8F2A87] shadow-inner space-y-3 relative overflow-hidden">
          {/* Card Banner */}
          <div className="flex items-center justify-between bg-gradient-to-r from-[#8F2A87] via-[#701A75] to-[#B0005A] text-white p-3 rounded-xl">
            <div>
              <span className="text-[10px] text-pink-200 block font-bold">الأميرة صاحبة الفستان:</span>
              <span className="font-black text-sm">{data.chName}</span>
            </div>
            <div className="text-xl">👑</div>
            <div className="text-left">
              <span className="text-[10px] text-pink-200 block font-bold">والدة الأميرة / المشترية:</span>
              <span className="font-bold text-xs">{data.motherName}</span>
            </div>
          </div>

          {/* Garment Details & Image */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="sm:col-span-2 space-y-1.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-pink-100 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-gray-500 text-[11px]">الموديل المعتمد:</span>
                <span className="font-bold text-[#8F2A87] dark:text-purple-300">{data.order?.product_name || 'موديل راقي خاص'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-[11px]">{data.isRtw ? "حالة الشراء:" : "موعد التسليم:"}</span>
                <span className="font-bold text-amber-700 dark:text-amber-400 font-mono">
                  {data.isRtw ? "تم الشراء والاستلام الفوري ✔️" : data.deliveryDateFormatted}
                </span>
              </div>
              {data.childMeas ? (
                <div className="pt-1 border-t border-dashed border-gray-200 dark:border-slate-800 text-[10.5px] font-mono flex flex-wrap gap-2 text-gray-700 dark:text-slate-300">
                  {data.childMeas.dress_length && <span>طول: <b>{data.childMeas.dress_length}</b></span>}
                  {data.childMeas.chest && <span>صدر: <b>{data.childMeas.chest}</b></span>}
                  {data.childMeas.waist && <span>خصر: <b>{data.childMeas.waist}</b></span>}
                </div>
              ) : (
                data.isRtw && <div className="pt-1 text-[10.5px] text-emerald-700 dark:text-emerald-300 font-bold">💎 خامات كوتور فاخرة • ضمان الأصالة الملكي معتمد</div>
              )}
            </div>

            {/* Photo preview */}
            <div className="h-24 rounded-xl border border-[#D4AF37] bg-purple-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
              {data.imgUrl ? (
                <img src={data.imgUrl} alt="فستان" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <span className="text-3xl">{data.isRtw ? "🛍️" : "👗"}</span>
                  <span className="block text-[9px] text-[#8F2A87] font-bold mt-0.5">{data.isRtw ? "فستان جاهز" : "تفصيل ملكي"}</span>
                </div>
              )}
            </div>
          </div>

          {/* Financials */}
          <div className="grid grid-cols-3 gap-2 bg-[#0F172A] text-white p-2.5 rounded-xl text-center">
            <div>
              <span className="text-[10px] text-gray-400 block">الإجمالي</span>
              <span className="font-mono font-bold text-xs">{data.tot?.toLocaleString()} {data.cur}</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 block">{data.isRtw ? "المسدد" : "الموصل (العربون)"}</span>
              <span className="font-mono font-bold text-xs text-emerald-400">{data.pd?.toLocaleString()} {data.cur}</span>
            </div>
            <div>
              <span className="text-[10px] text-amber-400 block">المتبقي</span>
              <span className="font-mono font-black text-xs text-amber-300">{data.rem?.toLocaleString()} {data.cur}</span>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <a href={data.dressCardUrl} target="_blank" rel="noreferrer" className="flex-1 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-white font-bold text-[11px] shadow-xs flex items-center justify-center gap-1.5 transition">
              <span>{data.isRtw ? "🛍️ فتح وثيقة الملكية والضمان (PNG)" : "🖼️ فتح كرت الفستان عالي الدقة (PNG)"}</span>
              <span>↗</span>
            </a>
            <a href={data.trackingUrl} target="_blank" rel="noreferrer" className="py-1.5 px-2.5 rounded-xl bg-purple-50 dark:bg-slate-800 text-[#8F2A87] dark:text-purple-300 font-bold text-[11px] border border-purple-200 dark:border-purple-800 flex items-center gap-1">
              <span>📱 تتبع الفستان</span>
              <span>↗</span>
            </a>
          </div>
        </div>

        {/* Text Accordion */}
        <details className="text-xs text-gray-600 dark:text-slate-400 cursor-pointer">
          <summary className="font-bold hover:text-[#8F2A87]">عرض نص الرسالة المرفقة للواتساب 📝</summary>
          <div className="mt-2 p-3 rounded-xl bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-[11.5px] leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto select-all">
            {data.msg}
          </div>
        </details>

        {/* Actions */}
        <div className="pt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={handleWhatsApp} className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer">
              <span>📲</span><span>إرسال بالواتساب مع كرت الفستان</span>
            </button>
            <button type="button" onClick={handleCopy} className="py-3 px-3 rounded-xl bg-[#8F2A87] hover:bg-[#76206f] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer">
              <span>📋</span><span>نسخ الرابط والرسالة الملكية</span>
            </button>
          </div>
          <button type="button" onClick={onClose} className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer">
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
}

window.OrderCustomerMessageModal = OrderCustomerMessageModal;
