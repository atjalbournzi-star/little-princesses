// src/components/tailoring/CmtStickerPrintModal.jsx
// ملصق وسند استلام عهدة قماش العميل (CMT-XXXX) لتثبيته على لفة القماش داخل الورشة

function CmtStickerPrintModal({ isOpen, onClose, custody, job }) {
  if (!isOpen || !custody) return null;

  const brandName = (window.BrandService && window.BrandService.getProfile().name) || 'نظام الإدارة المتكامل';
  const custodyNo = custody.custody_no || 'CMT-000001';
  const orderNo = job?.order_no || custody.order_id || '—';
  const custName = job?.customer_name || custody.customer_name || '—';
  const desc = custody.fabric_description || '—';
  const qty = custody.received_qty ?? 0;
  const unit = custody.unit || 'meter';
  const notes = custody.condition_notes || 'سليم عند الاستلام';

  const handlePrint = () => {
    const el = document.getElementById('cmt-sticker-printable');
    if (!el) return window.print();
    const w = window.open('', '_blank', 'width=420,height=520');
    if (!w) return window.print();
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar-u-nu-latn"><head><meta charset="utf-8"><title>${custodyNo}</title><link rel="stylesheet" href="${window.location.origin}/static/vendor/fonts/fonts.css" /><script src="${window.location.origin}/static/vendor/tailwindcss.js"></script><style>@page{margin:4mm;size:90mm 70mm;}body{font-family:'Inter','Cairo',sans-serif;direction:rtl;background:#fff;color:#111;}</style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" dir="rtl" onClick={onClose}>
      <div className="bg-white dark:bg-[#111C38] rounded-2xl max-w-sm w-full p-4 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">ملصق عهدة قماش العميل ({custodyNo})</h3>
          <button type="button" onClick={onClose} className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer">✕</button>
        </div>

        <div id="cmt-sticker-printable" className="p-3 rounded-xl border-2 border-dashed border-slate-800 bg-white text-slate-900 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
            <span className="font-black text-[11px]">{brandName}</span>
            <span className="font-mono font-black text-sm bg-black text-white px-2 py-0.5 rounded">{custodyNo}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div><span className="text-slate-500">رقم الطلب:</span> <strong className="font-mono">{orderNo}</strong></div>
            <div><span className="text-slate-500">العميل:</span> <strong>{custName}</strong></div>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-[11px]">
            <div><span className="text-slate-500">وصف القماش:</span> <strong>{desc}</strong></div>
            <div><span className="text-slate-500">الكمية المستلمة:</span> <strong className="font-mono">{qty} {unit}</strong></div>
            <div><span className="text-slate-500">حالة الاستلام:</span> <span>{notes}</span></div>
          </div>
          <div className="text-[9.5px] text-center text-slate-500 pt-1 border-t border-slate-200">
            يُثبت هذا الملصق على لفة القماش داخل الورشة (عهدة أمانة بدون قيمة مخزنية)
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer">إغلاق</button>
          <button type="button" onClick={handlePrint} className="px-4 py-1.5 rounded-lg bg-[#B0005A] hover:bg-[#8E0049] text-white text-xs font-bold cursor-pointer">طباعة الملصق</button>
        </div>
      </div>
    </div>
  );
}

window.CmtStickerPrintModal = CmtStickerPrintModal;
