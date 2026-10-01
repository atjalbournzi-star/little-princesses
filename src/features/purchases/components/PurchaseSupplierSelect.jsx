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
      <div className="flex items-center justify-between mb-1.5">
        <label className={labelCls}>المورد المعتمد *</label>
        <button
          type="button"
          onClick={() => setShowQuickAddSupplier(true)}
          className="text-[11px] font-bold text-[#8F2A87] hover:text-[#73216C] bg-[#F2E7F3] hover:bg-[#E5CEE7] px-2 py-0.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
        >
          ➕ مورد جديد
        </button>
      </div>
      <div className="relative flex items-center">
        <input
          type="text"
          className={inputCls + " pl-12 pr-8 font-medium " + (headerData.supplier_id ? "border-[#8F2A87] bg-purple-50/20" : "")}
          placeholder="ابحث بالاسم أو الهاتف..."
          value={supplierSearch || headerData.supplier}
          onFocus={() => setIsSupplierDropdownOpen(true)}
          onChange={e => {
            setSupplierSearch(e.target.value);
            setHeaderData(p => ({ ...p, supplier: e.target.value, supplier_id: '' }));
            setIsSupplierDropdownOpen(true);
          }}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] pointer-events-none text-xs">👤</span>
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {(headerData.supplier || supplierSearch) && (
            <button
              type="button"
              onClick={() => { setHeaderData(p => ({ ...p, supplier_id: '', supplier: '', supplier_phone: '' })); setSupplierSearch(''); }}
              className="text-[#6F6B75] hover:text-[#D64545] p-1 text-xs cursor-pointer"
            >✕</button>
          )}
          <button
            type="button"
            onClick={() => setIsSupplierDropdownOpen(prev => !prev)}
            className="text-[#6F6B75] hover:text-[#8F2A87] p-1 text-xs cursor-pointer"
          >▼</button>
        </div>
      </div>
      {isSupplierDropdownOpen && (
        <div className="absolute top-full right-0 left-0 mt-1 bg-white rounded-xl border border-[#E8E5EA] shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-[#F2E7F3]">
          {isLoadingSuppliers ? (
            <div className="p-3 text-center text-[#6F6B75] text-xs">⏳ جاري جلب الموردين...</div>
          ) : (filteredSuppliersList || []).length === 0 ? (
            <div className="p-3 text-center space-y-2">
              <p className="text-[#6F6B75] text-xs">لا يوجد موردون مسجلون</p>
              <button
                type="button"
                onClick={() => setShowQuickAddSupplier(true)}
                className="px-3 py-1 bg-[#8F2A87] text-white text-xs font-bold rounded-lg hover:bg-[#73216C] transition inline-flex items-center gap-1 cursor-pointer"
              >➕ إضافة مورد جديد</button>
            </div>
          ) : filteredSuppliersList.map(s => (
            <div
              key={s.id}
              onClick={() => handleSelectSupplier(s)}
              className={`p-2.5 hover:bg-[#F2E7F3]/40 cursor-pointer flex items-center justify-between transition-colors ${String(headerData.supplier_id) === String(s.id) ? 'bg-[#F2E7F3] border-r-4 border-[#8F2A87]' : ''}`}
            >
              <div>
                <div className="font-bold text-xs text-[#25232A] flex items-center gap-1.5">
                  <span>{s.name}</span>
                  {s.city && <span className="text-[10px] text-[#6F6B75] bg-[#FAFAFB] px-1.5 py-0.2 rounded border border-[#E8E5EA]">{s.city}</span>}
                </div>
                {s.phone && <div className="text-[11px] font-mono text-[#6F6B75] mt-0.5 dir-ltr">📱 {s.phone}</div>}
              </div>
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                {parseFloat(s.current_balance || s.balance || 0).toLocaleString('en-US')} ﷼
              </span>
            </div>
          ))}
        </div>
      )}
      {selectedSupplierObj && (
        <div className="mt-1.5 flex items-center justify-between px-2.5 py-1 bg-[#F2E7F3]/40 border border-[#E5CEE7] rounded-lg text-[11px]">
          <span className="text-[#6F6B75] font-medium truncate max-w-[120px]" title={selectedSupplierObj.name}>💼 {selectedSupplierObj.name}</span>
          <span className="font-mono font-bold text-[11px] text-[#8F2A87]">
            الرصيد: {parseFloat(selectedSupplierObj.current_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ﷼
          </span>
        </div>
      )}
    </div>
  );
}

window.PurchaseSupplierSelect = PurchaseSupplierSelect;
if (typeof module !== 'undefined' && module.exports) module.exports = PurchaseSupplierSelect;
