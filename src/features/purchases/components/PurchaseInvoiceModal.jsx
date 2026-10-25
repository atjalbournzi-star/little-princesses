// src/features/purchases/components/PurchaseInvoiceModal.jsx
// نافذة إصدار فاتورة مشتريات وتوريد جديدة (Purchases Invoice Orchestrator Modal)

function PurchaseInvoiceModal(props) {
  const {
    isOpen, onClose, headerData, setHeaderData, genBillNo,
    setShowQuickAddSupplier, supplierDropdownRef, supplierSearch, setSupplierSearch,
    isSupplierDropdownOpen, setIsSupplierDropdownOpen, isLoadingSuppliers,
    filteredSuppliersList, handleSelectSupplier, selectedSupplierObj,
    accounts = [], handleFileUpload, setPreviewImage, setPreviewTitle,
    itemData, setItemData, emptyItem, editingIndex, setEditingIndex,
    billItems, setBillItems, rawItemsSum, grandTotal,
    isSaving, handleSaveFullBill, showToast, UNITS, inputCls, labelCls
  } = props;

  const [activeTab, setActiveTab] = React.useState('header'); // 'header' | 'items'

  if (!isOpen) return null;

  const currentBillNo = (headerData.bill_no || '').trim() || (typeof genBillNo === 'function' ? genBillNo() : '');
  const HeaderFormComp = window.PurchaseHeaderForm || null;
  const ItemsTableComp = window.PurchaseItemsTable || null;
  const createPortal = (typeof ReactDOM !== 'undefined' && ReactDOM.createPortal) ? ReactDOM.createPortal : null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (handleSaveFullBill) {
      handleSaveFullBill(() => {
        if (typeof onClose === 'function') onClose();
      });
    }
  };

  const modalContent = (
    <div className="fixed inset-0 w-screen h-screen z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-none" dir="rtl">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* 1. الرأس الثابت (Sticky Header - shrink-0) */}
        <div className="shrink-0 bg-slate-950 border-b border-slate-800">
          <div className="h-11 px-4 flex items-center justify-between border-b border-slate-800/80">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors shrink-0 text-xs font-bold"
                title="إغلاق النافذة"
              >
                ✕
              </button>
              <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                <span className="text-pink-500 text-sm">🛒</span>
                <span>إصدار فاتورة مشتريات وتوريد مخزون جديدة</span>
              </div>
              {currentBillNo && (
                <span className="text-[11px] font-mono font-bold text-pink-300 bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                  [{currentBillNo}]
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-mono font-bold text-pink-400 bg-pink-950/40 px-2.5 py-0.5 rounded border border-pink-800/40">
                {headerData.currency || 'YER'}
              </span>
            </div>
          </div>

          <div className="h-10 px-4 bg-slate-900/90 flex justify-center items-center">
            <div dir="rtl" className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('header')}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'header'
                    ? 'bg-pink-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                1. بيانات الفاتورة والمورد
              </button>
              <span className="text-slate-600 text-xs font-bold">←</span>
              <button
                type="button"
                onClick={() => setActiveTab('items')}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'items'
                    ? 'bg-pink-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>2. بنود الأصناف والتكاليف</span>
                {billItems.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-pink-950 text-pink-200 border border-pink-700 font-mono font-bold">
                    {billItems.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 2. منطقة المحتوى المتجاوبة (Scrollable Body - flex-1 overflow-y-auto p-4 space-y-3) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'header' && HeaderFormComp && (
            <HeaderFormComp
              headerData={headerData} setHeaderData={setHeaderData} genBillNo={genBillNo}
              setShowQuickAddSupplier={setShowQuickAddSupplier} supplierDropdownRef={supplierDropdownRef}
              supplierSearch={supplierSearch} setSupplierSearch={setSupplierSearch}
              isSupplierDropdownOpen={isSupplierDropdownOpen} setIsSupplierDropdownOpen={setIsSupplierDropdownOpen}
              isLoadingSuppliers={isLoadingSuppliers} filteredSuppliersList={filteredSuppliersList}
              handleSelectSupplier={handleSelectSupplier} selectedSupplierObj={selectedSupplierObj}
              accounts={accounts} handleFileUpload={handleFileUpload}
              setPreviewImage={setPreviewImage} setPreviewTitle={setPreviewTitle}
              inputCls={inputCls} labelCls={labelCls}
            />
          )}

          {activeTab === 'items' && ItemsTableComp && (
            <ItemsTableComp
              itemData={itemData} setItemData={setItemData} emptyItem={emptyItem}
              editingIndex={editingIndex} setEditingIndex={setEditingIndex}
              billItems={billItems} setBillItems={setBillItems} headerData={headerData} setHeaderData={setHeaderData}
              rawItemsSum={rawItemsSum} grandTotal={grandTotal} isSaving={isSaving}
              handleSaveFullBill={handleSubmit} showToast={showToast} UNITS={UNITS}
              inputCls={inputCls} labelCls={labelCls}
            />
          )}
        </div>

        {/* 3. التذييل الثابت للأزرار (Sticky Footer - shrink-0 border-t border-slate-800 bg-slate-950/60 px-4 py-3 flex items-center justify-between) */}
        <div className="shrink-0 border-t border-slate-800 bg-slate-950/60 px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3.5 text-xs text-slate-400 hover:text-white rounded-lg border border-slate-700/80 hover:bg-slate-800 transition cursor-pointer"
          >
            إلغاء
          </button>
          
          <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-2">
            <span>الأصناف: <strong className="font-mono text-white">{billItems.length}</strong></span>
            <span className="text-slate-600">|</span>
            <span>الصافي الإجمالي: <strong className="font-mono text-emerald-400 text-xs">{grandTotal.toLocaleString('en-US')} {headerData.currency || 'YER'}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'header' ? (
              <>
                {billItems.length > 0 && (
                  <button type="button" onClick={handleSubmit} disabled={isSaving} className={`h-8 px-3.5 text-xs font-bold rounded-lg shadow flex items-center gap-1.5 transition ${isSaving ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'}`}>
                    <span>{isSaving ? "⏳" : "💾"}</span>
                    <span>{isSaving ? "جارٍ الحفظ..." : "اعتماد وحفظ"}</span>
                  </button>
                )}
                <button type="button" onClick={() => setActiveTab('items')} className="h-8 px-4 text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white rounded-lg shadow flex items-center gap-1.5 cursor-pointer transition">
                  <span>التالي: إضافة الأصناف ({billItems.length})</span>
                  <span>←</span>
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setActiveTab('header')} className="h-8 px-3 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 cursor-pointer flex items-center gap-1 transition">
                  <span>→</span>
                  <span>بيانات الفاتورة</span>
                </button>
                <button type="button" onClick={handleSubmit} disabled={isSaving || billItems.length === 0} className={`h-8 px-4 text-xs font-bold rounded-lg shadow flex items-center gap-1.5 transition ${isSaving || billItems.length === 0 ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-700 text-white cursor-pointer'}`}>
                  <span>{isSaving ? "⏳" : "💾"}</span>
                  <span>{isSaving ? "جارٍ الحفظ..." : "اعتماد وحفظ الفاتورة"}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && createPortal) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}

window.PurchaseInvoiceModal = PurchaseInvoiceModal;
