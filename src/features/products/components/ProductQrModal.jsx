// src/features/products/components/ProductQrModal.jsx
// نافذة عرض وتوليد وطباعة رمز QR وتكت الفستان للموديلات المعتمدة

function ProductQrModal({ product, isOpen, onClose }) {
  if (!isOpen || !product) return null;

  const sku = product.sku || product.barcode || `PRD-${product.id}`;
  const name = product.name || product.model_name || "فستان أميرات";
  const cat = product.category || "فساتين سهرة";
  const price = product.sell_price || product.base_price || 0;
  const curr = product.currency || "YER ﷼";
  const segment = product.target_segment || "kids";

  const segLabel = segment === "women_adults" ? "نسائي وكبار" : (segment === "custom_free" ? "تفصيل حر" : "أطفال");
  const qrData = JSON.stringify({ sku, name, cat, price, curr, id: product.id });
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}`;
  const barcodeUrl = `https://barcodeapi.org/api/128/${encodeURIComponent(sku)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(sku);
      if (window.showToast) window.showToast(`تم نسخ الكود: ${sku} 📋`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#E8E5EA] dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden text-right">
        {/* رأس النافذة */}
        <div className="p-4 border-b border-[#E8E5EA] dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-[#FAFAFB] to-white dark:from-slate-900 dark:to-[#0f172a]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#F2E7F3] dark:bg-purple-950/60 text-[#8F2A87] dark:text-purple-300 flex items-center justify-center text-base font-bold">
              🏷️
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#25232A] dark:text-slate-100">
                بطاقة الموديل ورمز المسح (QR & Barcode)
              </h3>
              <span className="text-[11px] text-[#6F6B75] dark:text-slate-400">
                طباعة تكت الفستان وفاتورة العميل
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 flex items-center justify-center text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* جسم التكت القابل للطباعة */}
        <div className="p-5 flex flex-col items-center justify-center text-center space-y-4">
          <div
            id="printable-product-tag"
            className="w-full bg-white dark:bg-slate-900 border-2 border-dashed border-[#8F2A87]/30 dark:border-purple-700/50 p-4 rounded-2xl shadow-xs space-y-3"
          >
            <div className="border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-[11px] font-bold text-[#8F2A87] dark:text-purple-300 block">
                👑 مؤسسة الأميرات الصغيرات للأزياء
              </span>
              <span className="text-[10px] text-[#6F6B75] dark:text-slate-400">
                Little Princesses Fashion ERP
              </span>
            </div>

            <div>
              <h4 className="text-sm font-bold text-[#25232A] dark:text-slate-100">{name}</h4>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-[#F2E7F3] dark:bg-purple-950/60 text-[#8F2A87] dark:text-purple-300 font-semibold">
                  {cat}
                </span>
                <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#6F6B75] dark:text-slate-300 font-medium">
                  {segLabel}
                </span>
              </div>
            </div>

            {/* صورة رمز QR التلقائي */}
            <div className="flex justify-center p-2 bg-white rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xs max-w-[170px] mx-auto">
              <img
                src={qrUrl}
                alt={`QR ${sku}`}
                className="w-36 h-36 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>

            {/* صورة الباركود وكود الصنف */}
            <div className="space-y-1">
              <div className="h-9 flex items-center justify-center overflow-hidden">
                <img
                  src={barcodeUrl}
                  alt={`Barcode ${sku}`}
                  className="h-full max-w-[200px] object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <div className="font-mono text-xs font-bold text-[#25232A] dark:text-slate-200 tracking-wider">
                {sku}
              </div>
            </div>

            {/* السعر المعتمد */}
            <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-bold">
              <span className="text-[#6F6B75] dark:text-slate-400">سعر البيع:</span>
              <span className="text-[#007F8C] dark:text-cyan-400 font-mono text-sm">
                {(parseFloat(price) || 0).toLocaleString()} {curr}
              </span>
            </div>
          </div>
        </div>

        {/* أزرار الإجراءات */}
        <div className="p-4 bg-[#FAFAFB] dark:bg-slate-900/60 border-t border-[#E8E5EA] dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl border border-[#E8E5EA] dark:border-slate-700 text-xs font-bold text-[#6F6B75] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>📋</span>
            <span>نسخ الكود</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#6F6B75] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-[#8F2A87] hover:bg-[#73216C] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span>طباعة التكت</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.ProductQrModal = ProductQrModal;
