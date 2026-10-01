/**
 * ModelImageModal.jsx - معاينة وتكبير صورة الموديل وتفاصيل التصميم
 * Little Princesses ERP - Production Floor Architecture
 */

function ModelImageModal({ isOpen, onClose, product, imageUrl, modelName }) {
  if (!isOpen) return null;

  const title = modelName || product?.model_name || product?.name || 'معاينة الموديل';
  const img = imageUrl || product?.image_url;
  const sku = product?.sku || product?.design_code || product?.model_no || '';
  const category = product?.category || product?.subcategory || 'أزياء فاخرة';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" onClick={onClose} dir="rtl">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#E8E5EA]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#E8E5EA] flex items-center justify-between bg-gradient-to-r from-purple-50 via-white to-pink-50">
          <div className="flex items-center gap-2">
            <span className="text-xl">👗</span>
            <div>
              <h3 className="text-sm font-bold text-[#25232A]">{title}</h3>
              <p className="text-[11px] text-[#6F6B75]">{category} {sku ? `• رمز: ${sku}` : ''}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Image Preview Container */}
        <div className="p-4 flex items-center justify-center bg-[#FAFAFB] min-h-[300px] max-h-[460px] overflow-hidden">
          {img ? (
            <img
              src={img}
              alt={title}
              className="max-h-[420px] max-w-full rounded-2xl object-contain shadow-md"
              onError={e => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                e.target.parentNode.innerHTML = '<div class="text-center p-8 text-[#6F6B75]"><span class="text-4xl block mb-2">👗</span><span>تعذر تحميل الصورة الأصلية للموديل</span></div>';
              }}
            />
          ) : (
            <div className="text-center p-12 text-[#6F6B75]">
              <span className="text-5xl block mb-2">👗</span>
              <p className="text-xs font-bold text-[#25232A]">{title}</p>
              <p className="text-[11px] text-[#6F6B75] mt-1">لا توجد صورة مسجلة لهذا الموديل في الكتالوج</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        {product && (
          <div className="px-5 py-3 border-t border-[#E8E5EA] bg-white flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#8F2A87] font-bold">الفئة المستهدفة:</span>
              <span className="bg-[#F2E7F3] text-[#8F2A87] px-2 py-0.5 rounded-md font-bold text-[11px]">
                {product.target_segment === 'women_adults' ? 'نسائي / كبار' : 'أطفال وأميرات'}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-[#8F2A87] text-white font-bold text-xs hover:bg-[#73216C] transition cursor-pointer"
            >
              إغلاق المعاينة
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

window.ModelImageModal = ModelImageModal;
