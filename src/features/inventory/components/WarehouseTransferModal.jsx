// src/features/inventory/components/WarehouseTransferModal.jsx
// نافذة مناقلة المخزون بين الفروع والمستودعات (المستودع الرئيسي، المعرض، ورشة المصنع)

function WarehouseTransferModal({
  inventory = [],
  transferringItem,
  setTransferringItem,
  onSelectTransferItem,
  transferFrom,
  setTransferFrom,
  transferTo,
  setTransferTo,
  transferQty,
  setTransferQty,
  transferNotes,
  setTransferNotes,
  isSubmittingTransfer,
  onSubmit
}) {
  const u = window.inventoryUtils || {};
  const [warehouses, setWarehouses] = React.useState(() => (Array.isArray(u.WAREHOUSES) ? [...u.WAREHOUSES] : []));

  React.useEffect(() => {
    if (!transferringItem) return;
    if (Array.isArray(u.WAREHOUSES) && u.WAREHOUSES.length > 0) {
      setWarehouses([...u.WAREHOUSES]);
    } else if (u.refreshWarehouses) {
      u.refreshWarehouses().then(list => { if (Array.isArray(list)) setWarehouses([...list]); });
    }
  }, [transferringItem]);

  if (!transferringItem) return null;

  const getItemName = u.getItemName || (i => i?.item_name || i?.name || '');
  const getItemQty = u.getItemQty || (i => parseFloat(i?.qty || i?.quantity || 0) || 0);
  const getItemAvail = u.getItemAvailableTotal || getItemQty;
  const getItemUnit = u.getItemUnit || (i => i?.unit || 'متر');
  const getWhStock = u.getItemWarehouseStock || ((i, wid) => getItemQty(i));

  const itemsList = (Array.isArray(inventory) && inventory.length > 0) ? inventory : [transferringItem];
  const unit = getItemUnit(transferringItem);
  const curQty = getWhStock(transferringItem, transferFrom);
  const totalAvail = getItemAvail(transferringItem);
  const parsedQty = parseFloat(transferQty) || 0;
  const isInvalidQty = parsedQty <= 0 || parsedQty > curQty;
  const isSameWh = Boolean(transferFrom && transferTo && transferFrom === transferTo);
  const canSubmit = !isSubmittingTransfer && Boolean(transferFrom) && Boolean(transferTo) && !isSameWh && curQty > 0 && !isInvalidQty;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* رأس النافذة */}
        <div className="bg-[#25232A] border-b-2 border-[#009FAE] p-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E2F5F7] text-[#007F8C] flex items-center justify-center text-lg font-bold">
              🔄
            </div>
            <div>
              <h3 className="text-sm font-bold">مناقلة المخزون بين الفروع والمستودعات</h3>
              <p className="text-[11px] text-slate-300">نقل كميات بين المستودع الرئيسي، معمل الخياطة، ومعرض التسليم</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTransferringItem(null)}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* نموذج المناقلة */}
        <form onSubmit={onSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-[#6F6B75] mb-1">الصنف المراد نقله:</label>
              <select
                value={String(transferringItem.id || '')}
                onChange={e => onSelectTransferItem && onSelectTransferItem(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E8E5EA] bg-white text-xs font-bold text-[#25232A] focus:border-[#009FAE] outline-none"
              >
                {itemsList.map(it => {
                  const iName = getItemName(it);
                  const iCode = it.item_code || it.code || it.id || '';
                  const iUnit = getItemUnit(it);
                  const iAvail = getItemAvail(it);
                  return (
                    <option key={it.id} value={String(it.id)}>
                      {iName} ({iCode}) — {iUnit} — المتاح: {iAvail}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#E8E5EA]/70">
              <span className="text-[11px] text-[#6F6B75]">إجمالي رصيد الصنف: <strong className="font-mono text-[#25232A]">{totalAvail} {unit}</strong></span>
              <div>
                <span className="text-[11px] text-[#6F6B75] ml-1.5">المتاح في مستودع المصدر:</span>
                <span className={`font-mono font-extrabold text-sm ${curQty > 0 ? 'text-[#007F8C]' : 'text-rose-600'}`}>
                  {curQty} {unit}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* من مستودع */}
            <div>
              <label className="block font-bold text-[#25232A] mb-1">من مستودع (المصدر):</label>
              <select
                value={transferFrom}
                onChange={e => setTransferFrom(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-semibold text-[#25232A] outline-none"
              >
                {warehouses.map(w => {
                  const wid = w.id || w.code;
                  const wStock = getWhStock(transferringItem, wid);
                  return <option key={wid} value={wid}>{w.name} ({w.code || wid}) — {wStock} {unit}</option>;
                })}
              </select>
            </div>

            {/* إلى مستودع */}
            <div>
              <label className="block font-bold text-[#25232A] mb-1">إلى مستودع (الوجهة):</label>
              <select
                value={transferTo}
                onChange={e => setTransferTo(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-semibold text-[#25232A] outline-none"
              >
                {warehouses.map(w => {
                  const wid = w.id || w.code;
                  return <option key={wid} value={wid} disabled={wid === transferFrom}>{w.name} ({w.code || wid})</option>;
                })}
              </select>
            </div>
          </div>

          {/* كمية المناقلة */}
          <div>
            <label className="block font-bold text-[#25232A] mb-1">الكمية المنقولة ({unit}) *:</label>
            <input
              type="number"
              step="any"
              min="0.01"
              max={curQty > 0 ? curQty : undefined}
              required
              value={transferQty}
              onChange={e => setTransferQty(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-mono font-bold focus:bg-white focus:border-[#009FAE] outline-none"
            />
            {curQty <= 0 && <p className="mt-1 text-[11px] font-bold text-rose-600">لا يوجد رصيد متاح لهذا الصنف في مستودع المصدر المختار.</p>}
            {curQty > 0 && parsedQty > curQty && <p className="mt-1 text-[11px] font-bold text-rose-600">الكمية المطلوبة ({parsedQty}) تتجاوز المتاح ({curQty} {unit}).</p>}
          </div>

          {/* ملاحظات وسند المناقلة */}
          <div>
            <label className="block font-bold text-[#25232A] mb-1">ملاحظات ورقم إذن المناقلة:</label>
            <input
              type="text"
              value={transferNotes}
              onChange={e => setTransferNotes(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-medium focus:bg-white focus:border-[#009FAE] outline-none"
            />
          </div>

          {/* أزرار الحفظ والإلغاء */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8E5EA]">
            <button
              type="button"
              onClick={() => setTransferringItem(null)}
              className="px-5 py-2.5 rounded-xl border border-[#E8E5EA] text-[#6F6B75] hover:bg-[#FAFAFB] font-bold text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-6 py-2.5 rounded-xl bg-[#009FAE] hover:bg-[#007F8C] text-white font-extrabold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>🔄</span>
              <span>{isSubmittingTransfer ? 'جارٍ تحويل المخزون...' : 'تأكيد وإتمام المناقلة ⚡'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.WarehouseTransferModal = WarehouseTransferModal;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WarehouseTransferModal;
}
