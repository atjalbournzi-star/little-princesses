// src/features/inventory/components/WarehouseTransferModal.jsx
// نافذة مناقلة المخزون بين الفروع والمستودعات (المستودع الرئيسي، المعرض، ورشة المصنع)

function WarehouseTransferModal({
  transferringItem,
  setTransferringItem,
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
  if (!transferringItem) return null;

  const u = window.inventoryUtils || {};
  const getItemName = u.getItemName || (i => i?.item_name || i?.name || '');
  const getItemQty = u.getItemQty || (i => parseFloat(i?.qty || i?.quantity || 0) || 0);
  const getItemUnit = u.getItemUnit || (i => i?.unit || 'متر');
  const warehouses = u.WAREHOUSES || [
    { id: 'WH-MAIN', code: 'WH-MAIN', name: 'المستودع الرئيسي' },
    { id: 'WH-WORKSHOP', code: 'WH-WORKSHOP', name: 'معمل وورشة الخياطة' },
    { id: 'WH-SHOWROOM', code: 'WH-SHOWROOM', name: 'معرض وصالة التسليم' }
  ];

  const unit = getItemUnit(transferringItem);
  const curQty = u.getItemWarehouseStock
    ? u.getItemWarehouseStock(transferringItem, transferFrom)
    : getItemQty(transferringItem);

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
          <div className="p-3 bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#6F6B75] block">الصنف المراد نقله:</span>
              <span className="font-bold text-[#25232A] text-sm">{getItemName(transferringItem)}</span>
            </div>
            <div className="text-left">
              <span className="text-[11px] text-[#6F6B75] block">المتاح في مستودع المصدر:</span>
              <span className="font-mono font-extrabold text-[#007F8C] text-sm">
                {curQty} {unit}
              </span>
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
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code || w.id})</option>
                ))}
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
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code || w.id})</option>
                ))}
              </select>
            </div>
          </div>

          {/* كمية المناقلة */}
          <div>
            <label className="block font-bold text-[#25232A] mb-1">الكمية المنقولة ({unit}) *:</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max={curQty}
              required
              placeholder={`أقصى حد: ${curQty}`}
              value={transferQty}
              onChange={e => setTransferQty(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-mono font-bold focus:bg-white focus:border-[#009FAE] outline-none"
            />
          </div>

          {/* ملاحظات وسند المناقلة */}
          <div>
            <label className="block font-bold text-[#25232A] mb-1">ملاحظات ورقم إذن المناقلة:</label>
            <input
              type="text"
              placeholder="مثال: نقل أقمشة لبدء تفصيل دفعة جديدة بالورشة..."
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
              disabled={isSubmittingTransfer}
              className="px-6 py-2.5 rounded-xl bg-[#009FAE] hover:bg-[#007F8C] text-white font-extrabold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
