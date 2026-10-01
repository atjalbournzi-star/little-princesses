// src/features/inventory/components/StockAdjustmentModal.jsx
// نافذة تسوية فوارق الجرد وتالف الأقمشة وتوليد القيود المحاسبية التلقائية

function StockAdjustmentModal({
  adjustingItem,
  setAdjustingItem,
  adjustType,
  setAdjustType,
  adjustQty,
  setAdjustQty,
  adjustReason,
  setAdjustReason,
  isSubmittingAdjust,
  onSubmit,
  currencyDisplay = 'YER ﷼'
}) {
  if (!adjustingItem) return null;

  const u = window.inventoryUtils || {};
  const getItemName = u.getItemName || (i => i?.item_name || i?.name || '');
  const getItemQty = u.getItemQty || (i => parseFloat(i?.qty || i?.quantity || 0) || 0);
  const getItemCost = u.getItemCost || (i => parseFloat(i?.unit_cost || i?.cost || 0) || 0);
  const getItemUnit = u.getItemUnit || (i => i?.unit || 'متر');

  const curCost = getItemCost(adjustingItem);
  const vQty = parseFloat(adjustQty) || 0;
  const accountingVal = vQty * curCost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* رأس النافذة */}
        <div className="bg-[#0F172A] border-b-2 border-[#B0005A] p-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FCE8F2] text-[#B0005A] flex items-center justify-center text-lg font-bold">
              ⚖️
            </div>
            <div>
              <h3 className="text-sm font-bold">تسوية فروقات الجرد وتالف الأقمشة</h3>
              <p className="text-[11px] text-slate-300">توليد قيد محاسبي مزدوج تلقائي في حسابات المخزون والتوالف</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAdjustingItem(null)}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* نموذج التسوية الجردية */}
        <form onSubmit={onSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#6F6B75] block">الصنف المستهدف:</span>
              <span className="font-bold text-[#25232A] text-sm">{getItemName(adjustingItem)}</span>
            </div>
            <div className="text-left">
              <span className="text-[11px] text-[#6F6B75] block">الرصيد المخزني الحالي:</span>
              <span className="font-mono font-extrabold text-[#007F8C] text-sm">
                {getItemQty(adjustingItem)} {getItemUnit(adjustingItem)}
              </span>
            </div>
          </div>

          {/* نوع التسوية */}
          <div>
            <label className="block font-bold text-[#25232A] mb-1.5">نوع التسوية الجردية:</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setAdjustType('wastage')}
                className={`p-3 rounded-xl border text-right font-bold transition flex items-center gap-2 cursor-pointer ${
                  adjustType === 'wastage'
                    ? 'bg-[#FCE8F2] text-[#B0005A] border-[#F2A4CB] ring-2 ring-[#B0005A]/30'
                    : 'bg-white text-[#6F6B75] border-[#E8E5EA] hover:bg-[#FAFAFB]'
                }`}
              >
                <span>🗑️</span>
                <div>
                  <div className="text-xs">إهلاك تالف / عجز جردي</div>
                  <div className="text-[10px] font-normal opacity-80">مدين: 5113 تالف / دائن: 1151 مخزون</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAdjustType('gain')}
                className={`p-3 rounded-xl border text-right font-bold transition flex items-center gap-2 cursor-pointer ${
                  adjustType === 'gain'
                    ? 'bg-[#E2F5F7] text-[#007F8C] border-[#C5ECF0] ring-2 ring-[#007F8C]/30'
                    : 'bg-white text-[#6F6B75] border-[#E8E5EA] hover:bg-[#FAFAFB]'
                }`}
              >
                <span>📈</span>
                <div>
                  <div className="text-xs">تسوية فائض جردي</div>
                  <div className="text-[10px] font-normal opacity-80">مدين: 1151 مخزون / دائن: 4119 تسويات</div>
                </div>
              </button>
            </div>
          </div>

          {/* كمية التسوية */}
          <div>
            <label className="block font-bold text-[#25232A] mb-1">الكمية المراد تسويتها ({getItemUnit(adjustingItem)}) *:</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="مثال: 2.5"
              value={adjustQty}
              onChange={e => setAdjustQty(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-mono font-bold focus:bg-white focus:border-[#B0005A] outline-none"
            />
          </div>

          {/* القيمة الإجمالية المقدرة للتسوية */}
          {vQty > 0 && (
            <div className="p-3 bg-[#F2E7F3] border border-[#E5CEE7] rounded-xl flex items-center justify-between">
              <span className="font-bold text-[#8F2A87]">القيمة المحاسبية للقيد:</span>
              <span className="font-mono font-extrabold text-[#8F2A87] text-sm">
                {accountingVal.toLocaleString('en-US', { minimumFractionDigits: 2 })} {adjustingItem.currency || currencyDisplay}
              </span>
            </div>
          )}

          {/* سبب التسوية */}
          <div>
            <label className="block font-bold text-[#25232A] mb-1">سبب ومبرر التسوية الجردية:</label>
            <input
              type="text"
              placeholder="مثال: فاقد قص وتطريز، تلف في القماش، جرد فعلي دوري..."
              value={adjustReason}
              onChange={e => setAdjustReason(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-medium focus:bg-white focus:border-[#B0005A] outline-none"
            />
          </div>

          {/* أزرار الحفظ والإلغاء */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8E5EA]">
            <button
              type="button"
              onClick={() => setAdjustingItem(null)}
              className="px-5 py-2.5 rounded-xl border border-[#E8E5EA] text-[#6F6B75] hover:bg-[#FAFAFB] font-bold text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmittingAdjust}
              className="px-6 py-2.5 rounded-xl bg-[#B0005A] hover:bg-[#8E0049] text-white font-extrabold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>⚖️</span>
              <span>{isSubmittingAdjust ? 'جارٍ ترحيل القيد...' : 'اعتماد وترحيل القيد المحاسبي ⚡'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.StockAdjustmentModal = StockAdjustmentModal;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StockAdjustmentModal;
}
