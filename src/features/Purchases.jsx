const { useState, useMemo } = React;

function Purchases({ purchases = [], setPurchases, inventory = [], setInventory, accounts = [], setAccounts, vouchers = [], setVouchers, journal = [], setJournal, showToast, currency }) {
  const UNITS = ['متر', 'وار (ياردة)', 'سم', 'حبة (قطعة)', 'رول (طاقة)'];
  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  const defaultCurrency = (typeof CURRENCIES !== 'undefined' ? (typeof CURRENCIES[0] === 'object' ? CURRENCIES[0].value : CURRENCIES[0]) : (window.CURRENCIES ? window.CURRENCIES[0] : 'YER ﷼'));
  const defaultPayType = (typeof PAY_METHODS !== 'undefined' ? PAY_METHODS[0] : (window.PAY_METHODS ? window.PAY_METHODS[0] : 'نقدي'));
  const todayStrIso = typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : (window.TODAY_STR_ISO || new Date().toISOString().slice(0, 10));

  const genBillNo = () => {
    const lastNum = (purchases || []).reduce((acc, p) => {
      const match = String(p.bill_no || p.purchase_no || p.id || '').match(/PUR-(\d+)/);
      return match ? Math.max(acc, parseInt(match[1])) : acc;
    }, 1000);
    return `PUR-${lastNum + 1}`;
  };

  const emptyHeader = () => ({
    bill_no: '', supplier_id: '', supplier: '', supplier_phone: '', warehouse_id: 'WH-MAIN',
    discount: '', notes: '', currency: defaultCurrency, exchange_rate: '', pay_type: defaultPayType,
    transfer_no: '', payment_source: '', receipt_url: '', invoice_image_url: '', date: todayStrIso,
    freight_cost: '', transfer_fees: ''
  });
  const emptyItem = () => ({ item: '', unit: 'متر', qty: '', price: '', total: '' });

  const [headerData, setHeaderData] = useState(emptyHeader), [itemData, setItemData] = useState(emptyItem), [editingIndex, setEditingIndex] = useState(null);
  const [billItems, setBillItems] = useState([]), [previewImage, setPreviewImage] = useState(null), [previewTitle, setPreviewTitle] = useState('صورة المرفق');
  const [editRecord, setEditRecord] = useState(null), [showQuickAddSupplier, setShowQuickAddSupplier] = useState(false);

  // Subcomponents & Hooks
  const useData = window.usePurchasesData || (() => ({}));
  const useActions = window.usePurchaseActions || (() => ({}));
  const {
    SupplierQuickAddModal: QuickAddModal,
    PurchaseItemsTable: ItemsTable,
    PurchaseModal: ModalComponent,
    PurchasesFilterBar: FilterBar,
    PurchasesTable: DataTable,
    PurchaseHeaderForm: HeaderForm
  } = window;

  const {
    suppliers, setSuppliers, isLoadingSuppliers, supplierSearch, setSupplierSearch,
    isSupplierDropdownOpen, setIsSupplierDropdownOpen, supplierDropdownRef, fetchSuppliers,
    handleSelectSupplier, filteredSuppliersList, selectedSupplierObj,
    search, setSearch, isHistoryOpen, setIsHistoryOpen, filteredPurchases
  } = useData({ purchases, setPurchases, headerData, setHeaderData });

  const rawItemsSum = billItems.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0) + (parseFloat(headerData.freight_cost) || 0) + (parseFloat(headerData.transfer_fees) || 0);
  const discountVal = parseFloat(headerData.discount) || 0;
  const grandTotal = Math.max(0, rawItemsSum - discountVal);

  const { isSaving, editSaving, handleSaveFullBill, handleSaveEditRecord, handleDeleteRecord } = useActions({
    headerData, setHeaderData, emptyHeader, billItems, setBillItems, emptyItem, setItemData, setEditingIndex,
    setSupplierSearch, fetchSuppliers, purchases, setPurchases, inventory, setInventory, accounts, setAccounts,
    vouchers, setVouchers, journal, setJournal, showToast, defaultCurrency, defaultPayType, todayStrIso,
    genBillNo, discountVal, grandTotal
  });

  const handleOpenEdit = (p) => {
    const VALID_UNITS_CHECK = ['متر', 'وار (ياردة)', 'سم', 'حبة (قطعة)', 'رول (طاقة)', 'يارده', 'وار'];
    let rawUnit = p.unit, rawQty = p.qty, rawPrice = p.price, rawTotal = p.total;
    if (rawUnit !== undefined && rawUnit !== '' && !isNaN(parseFloat(rawUnit)) && !VALID_UNITS_CHECK.includes(String(rawUnit))) {
      rawQty = parseFloat(rawUnit); rawPrice = parseFloat(p.qty) || 0; rawTotal = parseFloat(p.price) || 0; rawUnit = 'متر';
    }
    setEditRecord({
      ...p, supplier_id: p.supplier_id || '', item: p.item || p.item_name || '', unit: rawUnit || 'متر',
      qty: rawQty || '', price: rawPrice || '', total: rawTotal || '', supplier_phone: p.supplier_phone || p.phone || p.supplier_number || '',
      discount: p.discount !== undefined ? p.discount : (p.discount_amount || ''), notes: p.notes || '',
      receipt_url: p.receipt_url || '', invoice_image_url: p.invoice_image_url || p.invoice_url || ''
    });
  };

  const handleFileUpload = (e, field, label) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return showToast('حجم الصورة كبير جداً (أقصاه 5 ميجابايت) ⚠️', 'error');
    const reader = new FileReader();
    reader.onloadend = () => { setHeaderData(prev => ({ ...prev, [field]: reader.result })); showToast(`تم إرفاق ${label}`); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-xs text-right" dir="rtl">
      {ModalComponent && (
        <ModalComponent
          editRecord={editRecord} setEditRecord={setEditRecord} editSaving={editSaving}
          handleSaveEditRecord={handleSaveEditRecord} accounts={accounts} previewImage={previewImage}
          setPreviewImage={setPreviewImage} previewTitle={previewTitle} setPreviewTitle={setPreviewTitle}
          showToast={showToast} UNITS={UNITS} inputCls={inputCls} labelCls={labelCls}
        />
      )}

      {QuickAddModal && (
        <QuickAddModal
          show={showQuickAddSupplier} onClose={() => setShowQuickAddSupplier(false)} initialName={supplierSearch}
          suppliers={suppliers} setSuppliers={setSuppliers} setHeaderData={setHeaderData}
          setSupplierSearch={setSupplierSearch} setIsSupplierDropdownOpen={setIsSupplierDropdownOpen}
          fetchSuppliers={fetchSuppliers} showToast={showToast} inputCls={inputCls} labelCls={labelCls}
        />
      )}

      {/* ── بطاقة الفاتورة الجديدة ── */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-5">
        <div className="border-b border-[#E8E5EA] pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#F2E7F3] text-[#8F2A87] flex items-center justify-center font-bold">🛒</span>
            <div>
              <h2 className="font-bold text-sm text-[#25232A]">فاتورة مشتريات وتوريد جديدة</h2>
              <p className="text-[11px] text-[#6F6B75]">إصدار فاتورة شراء، توريد المخزون، وتوليد القيود وسندات الصرف آلياً</p>
            </div>
          </div>
          <span className="text-[#8F2A87] font-mono font-bold text-xs bg-[#F2E7F3] px-3 py-1 rounded-xl">
            {headerData.bill_no ? headerData.bill_no : `تلقائي: ${genBillNo()}`}
          </span>
        </div>

        {HeaderForm && (
          <HeaderForm
            headerData={headerData} setHeaderData={setHeaderData} genBillNo={genBillNo}
            setShowQuickAddSupplier={setShowQuickAddSupplier} supplierDropdownRef={supplierDropdownRef}
            supplierSearch={supplierSearch} setSupplierSearch={setSupplierSearch}
            isSupplierDropdownOpen={isSupplierDropdownOpen} setIsSupplierDropdownOpen={setIsSupplierDropdownOpen}
            isLoadingSuppliers={isLoadingSuppliers} filteredSuppliersList={filteredSuppliersList}
            handleSelectSupplier={handleSelectSupplier} selectedSupplierObj={selectedSupplierObj}
            accounts={accounts} handleFileUpload={handleFileUpload} setPreviewImage={setPreviewImage}
            setPreviewTitle={setPreviewTitle} inputCls={inputCls} labelCls={labelCls}
          />
        )}

        {ItemsTable && (
          <ItemsTable
            itemData={itemData} setItemData={setItemData} emptyItem={emptyItem} editingIndex={editingIndex}
            setEditingIndex={setEditingIndex} billItems={billItems} setBillItems={setBillItems} headerData={headerData}
            grandTotal={grandTotal} isSaving={isSaving} handleSaveFullBill={handleSaveFullBill} showToast={showToast}
            UNITS={UNITS} inputCls={inputCls} labelCls={labelCls}
          />
        )}
      </div>

      {/* ── سجل المشتريات القابل للطي ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300">
        {FilterBar && <FilterBar isHistoryOpen={isHistoryOpen} setIsHistoryOpen={setIsHistoryOpen} filteredPurchasesCount={(filteredPurchases || []).length} search={search} setSearch={setSearch} />}
        {isHistoryOpen && DataTable && (
          <div className="p-5 space-y-4 animate-fade-in">
            <DataTable filteredPurchases={filteredPurchases} handleOpenEdit={handleOpenEdit} handleDeleteRecord={handleDeleteRecord} setPreviewImage={setPreviewImage} setPreviewTitle={setPreviewTitle} />
          </div>
        )}
      </div>
    </div>
  );
}

window.Purchases = Purchases;
