// src/features/inventory/components/InventoryAddItemModal.jsx
// نافذة منبثقة معيارية لإضافة صنف أو خامة جديدة للمخزون

function InventoryAddItemModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  handleQtyChange,
  handleCostChange,
  handleTotalChange,
  onSubmit,
  currency
}) {
  if (!isOpen) return null;

  const u = window.inventoryUtils || {};
  const categories = u.INVENTORY_CATEGORIES || ['أقمشة', 'بطانات', 'كلف وتطريز', 'إكسسوارات', 'فساتين جاهزة'];
  const warehouses = u.WAREHOUSE_LOCATIONS || ['المستودع الرئيسي', 'صالة العرض / المعرض', 'ورشة المصنع'];

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#009FAE] focus:ring-2 focus:ring-[#E2F5F7] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* رأس النافذة */}
        <div className="bg-[#009FAE] p-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center text-lg font-bold">
              📦
            </div>
            <div>
              <h3 className="text-sm font-bold">إضافة صنف أو خامة جديدة للمخزون</h3>
              <p className="text-[11px] text-teal-100">تسجيل مباشر في قواعد البيانات ومطابقة الأرصدة التلقائية</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* نموذج الإضافة */}
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>اسم الصنف / القماش <span className="text-[#D64545] font-bold">*</span></label>
              <input
                type="text"
                className={inputCls}
                placeholder="مثال: حرير إيطالي بيج، فستان سهرة لؤلؤي..."
                value={formData.item_name}
                onChange={e => setFormData({ ...formData, item_name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className={labelCls}>التصنيف</label>
              <select
                className={inputCls}
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>الكمية المتوفرة</label>
              <input
                type="number"
                step="0.1"
                className={inputCls + " font-mono font-bold"}
                placeholder="0.0"
                value={formData.qty}
                onChange={handleQtyChange}
              />
            </div>

            <div>
              <label className={labelCls}>التكلفة الفردية</label>
              <input
                type="number"
                step="0.01"
                className={inputCls + " font-mono font-bold"}
                placeholder="0.00"
                value={formData.cost}
                onChange={handleCostChange}
              />
            </div>

            <div>
              <label className={labelCls}>إجمالي القيمة</label>
              <input
                type="number"
                step="0.01"
                className={inputCls + " font-mono font-bold bg-[#FAFAFB] text-[#007F8C]"}
                placeholder="0.00"
                value={formData.total_value}
                onChange={handleTotalChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>العملة</label>
              <select
                className={inputCls}
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
              >
                {(typeof CURRENCIES !== 'undefined' ? CURRENCIES : ['YER ﷼', 'SAR ﷼', 'USD $']).map(c => (
                  <option key={typeof c === 'object' ? c.value : c} value={typeof c === 'object' ? c.value : c}>
                    {typeof c === 'object' ? c.label : c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>موقع التخزين / المستودع</label>
              <select
                className={inputCls}
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
              >
                {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>حد الأمان (نقطة إعادة الطلب)</label>
              <input
                type="number"
                step="1"
                className={inputCls + " font-mono font-bold"}
                placeholder="5"
                value={formData.reorder_level || 5}
                onChange={e => setFormData({ ...formData, reorder_level: e.target.value })}
              />
            </div>
          </div>

          {/* أزرار الحفظ والإلغاء */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E8E5EA]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#E8E5EA] text-[#6F6B75] hover:bg-[#FAFAFB] font-bold text-xs cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#009FAE] hover:bg-[#007F8C] text-white font-extrabold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <span>💾</span>
              <span>حفظ الصنف في المخزون</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.InventoryAddItemModal = InventoryAddItemModal;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InventoryAddItemModal;
}
