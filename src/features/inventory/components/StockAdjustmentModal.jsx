// src/features/inventory/components/StockAdjustmentModal.jsx
// نافذة تسوية فوارق الجرد وتالف الأقمشة وتوليد القيود المحاسبية التلقائية

function StockAdjustmentModal({
  adjustingItem,
  setAdjustingItem,
  adjustType,
  setAdjustType,
  adjustWarehouseId,
  setAdjustWarehouseId,
  adjustQty,
  setAdjustQty,
  adjustReason,
  setAdjustReason,
  isSubmittingAdjust,
  onSubmit,
  currencyDisplay = 'YER ﷼'
}) {
  const u = window.inventoryUtils || {};
  const [warehouses, setWarehouses] = React.useState(() => (Array.isArray(u.WAREHOUSES) ? [...u.WAREHOUSES] : []));

  React.useEffect(() => {
    if (!adjustingItem) return;
    if (Array.isArray(u.WAREHOUSES) && u.WAREHOUSES.length > 0) {
      setWarehouses([...u.WAREHOUSES]);
    } else if (u.refreshWarehouses) {
      u.refreshWarehouses().then(list => { if (Array.isArray(list)) setWarehouses([...list]); });
    }
  }, [adjustingItem]);

  if (!adjustingItem) return null;

  const getItemName = u.getItemName || (i => i?.item_name || i?.name || '');
  const getItemQty = u.getItemQty || (i => parseFloat(i?.qty || i?.quantity || 0) || 0);
  const getItemCost = u.getItemCost || (i => parseFloat(i?.unit_cost || i?.cost || 0) || 0);
  const getItemUnit = u.getItemUnit || (i => i?.unit || 'متر');
  const getWhStock = u.getItemWarehouseStock || ((i, wid) => getItemQty(i));

  const curCost = getItemCost(adjustingItem);
  const vQty = parseFloat(adjustQty) || 0;
  const accountingVal = vQty * curCost;
  const whQty = adjustWarehouseId ? getWhStock(adjustingItem, adjustWarehouseId) : getItemQty(adjustingItem);
  const selectedWhObj = warehouses.find(w => (w.id || w.code) === adjustWarehouseId);
  const selectedWhLabel = selectedWhObj ? `${selectedWhObj.name} (${selectedWhObj.code || selectedWhObj.id})` : (adjustWarehouseId || 'غير محدد');
  const unit = getItemUnit(adjustingItem);
  const exceedsWh = adjustType === 'wastage' && vQty > whQty;

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
              <span className="text-[10.5px] text-[#007F8C] font-semibold block mt-0.5">المستودع: {selectedWhLabel}</span>
            </div>
            <div className="text-left">
              <span className="text-[11px] text-[#6F6B75] block">الرصيد المتاح بالمستودع:</span>
              <span className="font-mono font-extrabold text-[#007F8C] text-sm">
                {whQty} {unit}
              </span>
              <span className="text-[10px] text-[#6F6B75] font-mono block">الإجمالي: {getItemQty(adjustingItem)} {unit}</span>
            </div>
          </div>

          {/* المستودع المستهدف */}
          <div>
            <label className="block font-bold text-[#25232A] mb-1">المستودع المستهدف للتسوية *:</label>
            <select
              required
              value={adjustWarehouseId || ''}
              onChange={e => setAdjustWarehouseId && setAdjustWarehouseId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-semibold text-[#25232A] focus:bg-white focus:border-[#B0005A] outline-none"
            >
              <option value="">-- اختر المستودع --</option>
              {warehouses.map(w => {
                const wid = w.id || w.code;
                const wStock = getWhStock(adjustingItem, wid);
                return <option key={wid} value={wid}>{w.name} ({w.code || wid}) — المتاح: {wStock} {unit}</option>;
              })}
            </select>
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
                  <div className="text-[10px] font-normal opacity-80">مدين: مصروف/تالف / دائن: مخزون المستودع</div>
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
                  <div className="text-[10px] font-normal opacity-80">مدين: مخزون المستودع / دائن: إيرادات/تسوية</div>
                </div>
              </button>
            </div>
          </div>

          {/* كمية التسوية */}
          <div>
            <label className="block font-bold text-[#25232A] mb-1">الكمية المراد تسويتها ({unit}) *:</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={adjustType === 'wastage' && whQty > 0 ? whQty : undefined}
              required
              value={adjustQty}
              onChange={e => setAdjustQty(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-mono font-bold focus:bg-white focus:border-[#B0005A] outline-none"
            />
            {exceedsWh && <p className="mt-1 text-[11px] font-bold text-rose-600">الكمية المطلوبة ({vQty}) تتجاوز المتاح في المستودع ({whQty} {unit}).</p>}
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
