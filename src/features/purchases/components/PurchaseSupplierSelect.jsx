// src/features/purchases/components/PurchaseSupplierSelect.jsx
// قائمة اختيار المورد والبحث السريع والربط مع الموردين

function PurchaseSupplierSelect({
  headerData, setHeaderData, setShowQuickAddSupplier,
  supplierDropdownRef, supplierSearch, setSupplierSearch,
  isSupplierDropdownOpen, setIsSupplierDropdownOpen, isLoadingSuppliers,
  filteredSuppliersList, handleSelectSupplier, selectedSupplierObj,
  inputCls, labelCls
}) {
  return (
    <div className="relative" ref={supplierDropdownRef}>
      <div className="flex items-center justify-between mb-1">
        <label className={labelCls}>المورد المعتمد *</label>
        <button
          type="button"
          onClick={() => setShowQuickAddSupplier(true)}
          className="h-5 px-2 text-[10px] font-semibold text-pink-300 hover:text-pink-200 bg-slate-800/90 hover:bg-slate-700 border border-pink-500/30 rounded-md flex items-center gap-1 transition cursor-pointer shadow-xs"
        >
          + مورد جديد
        </button>
      </div>
      <div className="relative flex items-center">
        <input
          type="text"
          className={inputCls + " pl-10 pr-2.5 font-medium " + (headerData.supplier_id ? "border-pink-500/80" : "")}
          value={supplierSearch || headerData.supplier}
          onFocus={() => setIsSupplierDropdownOpen(true)}
          onChange={e => {
            setSupplierSearch(e.target.value);
            setHeaderData(p => ({ ...p, supplier: e.target.value, supplier_id: '' }));
            setIsSupplierDropdownOpen(true);
          }}
        />
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
          {(headerData.supplier || supplierSearch) && (
            <button
              type="button"
              onClick={() => { setHeaderData(p => ({ ...p, supplier_id: '', supplier: '', supplier_phone: '' })); setSupplierSearch(''); }}
              className="hover:text-rose-400 p-0.5 text-[10px] cursor-pointer"
            >✕</button>
          )}
          <button
            type="button"
            onClick={() => setIsSupplierDropdownOpen(prev => !prev)}
            className="hover:text-pink-400 p-0.5 text-[10px] cursor-pointer"
          >▼</button>
        </div>
      </div>
      {isSupplierDropdownOpen && (
        <div className="absolute top-full right-0 left-0 mt-1 bg-slate-900 rounded-lg border border-slate-700/80 shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-800 text-xs">
          <div
            onClick={() => {
              setHeaderData(p => ({ ...p, supplier_id: '', supplier: '', supplier_phone: '' }));
              setSupplierSearch('');
              setIsSupplierDropdownOpen(false);
            }}
            className={`px-3 py-2 hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors text-xs ${!headerData.supplier_id && !supplierSearch ? 'bg-slate-800/80 font-bold text-white' : 'text-slate-400'}`}
          >
            <span>-- اختر المورد المعتمد --</span>
          </div>
          {isLoadingSuppliers ? (
            <div className="p-3 text-center text-slate-400 text-xs">جاري جلب الموردين...</div>
          ) : (filteredSuppliersList || []).length === 0 ? (
            <div className="p-3 text-center space-y-2">
              <p className="text-slate-400 text-xs">لا يوجد موردون مسجلون</p>
              <button
                type="button"
                onClick={() => setShowQuickAddSupplier(true)}
                className="px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700 text-fuchsia-300 border border-fuchsia-500/30 text-[11px] font-semibold rounded-md transition inline-flex items-center gap-1 cursor-pointer"
              >+ إضافة مورد جديد</button>
            </div>
          ) : filteredSuppliersList.map(s => (
            <div
              key={s.id}
              onClick={() => handleSelectSupplier(s)}
              className={`px-3 py-2 hover:bg-slate-800/70 cursor-pointer flex items-center justify-between transition-colors ${String(headerData.supplier_id) === String(s.id) ? 'bg-slate-800 border-r-2 border-pink-500' : ''}`}
            >
              <div>
                <div className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                  <span>{s.name}</span>
                  {s.city && <span className="text-[10px] text-slate-400 bg-slate-800 px-1 py-0.2 rounded border border-slate-700">{s.city}</span>}
                </div>
                {s.phone && <div className="text-[10.5px] font-mono text-slate-400 mt-0.5 dir-ltr">{s.phone}</div>}
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                {parseFloat(s.current_balance || s.balance || 0).toLocaleString('en-US')} ﷼
              </span>
            </div>
          ))}
        </div>
      )}
      {(headerData.supplier_phone || selectedSupplierObj?.phone) && (
        <div className="mt-1 flex items-center justify-between px-2.5 py-0.5 bg-slate-800/60 border border-slate-700/80 rounded-md text-[10.5px]">
          <span className="text-slate-400 font-medium">هاتف المورد:</span>
          <span className="font-mono font-bold text-slate-200" dir="ltr">
            {headerData.supplier_phone || selectedSupplierObj?.phone}
          </span>
        </div>
      )}
      {selectedSupplierObj && (
        <div className="mt-1 flex items-center justify-between px-2.5 py-0.5 bg-slate-800/60 border border-slate-700/80 rounded-md text-[10.5px]">
          <span className="text-slate-300 font-medium truncate max-w-[120px]" title={selectedSupplierObj.name}>{selectedSupplierObj.name}</span>
          <span className="font-mono font-bold text-pink-400">
            الرصيد: {parseFloat(selectedSupplierObj.current_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ﷼
          </span>
        </div>
      )}
    </div>
  );
}

window.PurchaseSupplierSelect = PurchaseSupplierSelect;
if (typeof module !== 'undefined' && module.exports) module.exports = PurchaseSupplierSelect;
