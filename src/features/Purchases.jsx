// src/features/Purchases.jsx
// المنسق العام والمجمع الرئيسي لوحدة إدارة المشتريات والموردين (Purchases Orchestrator)

const { useState, useMemo } = React;

function Purchases({
  purchases = [],
  setPurchases,
  inventory = [],
  setInventory,
  accounts = [],
  setAccounts,
  vouchers = [],
  setVouchers,
  journal = [],
  setJournal,
  showToast,
  currency
}) {
  const UNITS = ['متر', 'وار (ياردة)', 'سم', 'حبة (قطعة)', 'رول (طاقة)'];
  const inputCls = "w-full h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white text-xs font-medium focus:border-pink-500 outline-none transition";
  const labelCls = "block text-[11px] font-medium text-slate-300 mb-1";

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

  const emptyHeader = () => {
    const whs = Array.isArray(window.inventoryUtils?.WAREHOUSES) ? window.inventoryUtils.WAREHOUSES : [];
    return {
      bill_no: '', supplier_id: '', supplier: '', supplier_phone: '',
      warehouse_id: whs[0]?.id || whs[0]?.code || '',
      discount: '', notes: '', currency: defaultCurrency, exchange_rate: '', pay_type: defaultPayType,
      transfer_no: '', payment_source: '', receipt_url: '', invoice_image_url: '', date: todayStrIso,
      freight_cost: '', transfer_fees: ''
    };
  };
  const emptyItem = () => ({ item: '', unit: 'متر', qty: '', price: '', total: '' });

  const [headerData, setHeaderData] = useState(emptyHeader);
  const [itemData, setItemData] = useState(emptyItem);
  const [editingIndex, setEditingIndex] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('صورة المرفق');
  const [editRecord, setEditRecord] = useState(null);
  const [showQuickAddSupplier, setShowQuickAddSupplier] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Subcomponents & Hooks
  const useData = window.usePurchasesData || (() => ({}));
  const useActions = window.usePurchaseActions || (() => ({}));
  const {
    PurchasesHeader: HeaderComp,
    PurchasesFilterBar: FilterBarComp,
    PurchasesTable: TableComp,
    PurchaseInvoiceModal: InvoiceModalComp,
    PurchaseModal: ModalComp,
    SupplierQuickAddModal: QuickAddModalComp
  } = window;

  const {
    suppliers, setSuppliers, isLoadingSuppliers, supplierSearch, setSupplierSearch,
    isSupplierDropdownOpen, setIsSupplierDropdownOpen, supplierDropdownRef, fetchSuppliers,
    handleSelectSupplier, filteredSuppliersList, selectedSupplierObj,
    search, setSearch, payTypeFilter, setPayTypeFilter, sortBy, setSortBy, filteredPurchases, stats
  } = useData({ purchases, setPurchases, headerData, setHeaderData });

  const rawItemsSum = (billItems || []).reduce((sum, item) => {
    const qty = Number(item.quantity || item.qty || 0);
    const price = Number(item.unit_price || item.price || item.cost || 0);
    return sum + (qty * price);
  }, 0);
  const discountVal = parseFloat(headerData.discount) || 0;
  const shippingFees = (parseFloat(headerData.freight_cost) || 0) + (parseFloat(headerData.transfer_fees) || 0);
  const grandTotal = Math.max(0, rawItemsSum - discountVal + shippingFees);

  const { isSaving, editSaving, handleSaveFullBill, handleSaveEditRecord, handleDeleteRecord } = useActions({
    headerData, setHeaderData, emptyHeader, billItems, setBillItems, emptyItem, setItemData, setEditingIndex,
    setSupplierSearch, fetchSuppliers, purchases, setPurchases, inventory, setInventory, accounts, setAccounts,
    vouchers, setVouchers, journal, setJournal, showToast, defaultCurrency, defaultPayType, todayStrIso,
    genBillNo, discountVal, grandTotal, rawItemsSum
  });

  const handleOpenEdit = (p) => {
    const VALID_UNITS = ['متر', 'وار (ياردة)', 'سم', 'حبة (قطعة)', 'رول (طاقة)', 'يارده', 'وار'];
    let rawUnit = p.unit, rawQty = p.qty, rawPrice = p.price, rawTotal = p.total;
    if (rawUnit !== undefined && rawUnit !== '' && !isNaN(parseFloat(rawUnit)) && !VALID_UNITS.includes(String(rawUnit))) {
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
    <div className="space-y-1 animate-fadeIn text-right text-xs" dir="rtl">
      {/* 1. ترويسة المشتريات وبطاقات المؤشرات العليا */}
      {HeaderComp && (
        <HeaderComp
          stats={stats}
          onOpenAdd={() => setIsAddModalOpen(true)}
        />
      )}

      {/* 2. سجل المشتريات والفلاتر متطابق مع معيار شاشة السندات */}
      <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden p-2 space-y-1.5">
        {FilterBarComp && (
          <FilterBarComp
            search={search}
            setSearch={setSearch}
            payTypeFilter={payTypeFilter}
            setPayTypeFilter={setPayTypeFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            filteredPurchasesCount={filteredPurchases.length}
            totalCount={purchases.length}
          />
        )}

        {TableComp && (
          <TableComp
            filteredPurchases={filteredPurchases}
            handleOpenEdit={handleOpenEdit}
            handleDeleteRecord={handleDeleteRecord}
            setPreviewImage={setPreviewImage}
            setPreviewTitle={setPreviewTitle}
          />
        )}
      </div>

      {/* 4. نافذة إصدار فاتورة مشتريات وتوريد جديدة (Invoice Modal) */}
      {InvoiceModalComp && isAddModalOpen && (
        <InvoiceModalComp
          isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}
          headerData={headerData} setHeaderData={setHeaderData} genBillNo={genBillNo}
          setShowQuickAddSupplier={setShowQuickAddSupplier} supplierDropdownRef={supplierDropdownRef}
          supplierSearch={supplierSearch} setSupplierSearch={setSupplierSearch}
          isSupplierDropdownOpen={isSupplierDropdownOpen} setIsSupplierDropdownOpen={setIsSupplierDropdownOpen}
          isLoadingSuppliers={isLoadingSuppliers} filteredSuppliersList={filteredSuppliersList}
          handleSelectSupplier={handleSelectSupplier} selectedSupplierObj={selectedSupplierObj}
          accounts={accounts} handleFileUpload={handleFileUpload}
          setPreviewImage={setPreviewImage} setPreviewTitle={setPreviewTitle}
          itemData={itemData} setItemData={setItemData} emptyItem={emptyItem}
          editingIndex={editingIndex} setEditingIndex={setEditingIndex}
          billItems={billItems} setBillItems={setBillItems}
          rawItemsSum={rawItemsSum} grandTotal={grandTotal}
          isSaving={isSaving} handleSaveFullBill={handleSaveFullBill}
          showToast={showToast} UNITS={UNITS} inputCls={inputCls} labelCls={labelCls}
        />
      )}

      {/* 5. نافذة تعديل سجل مشتريات ومعاينة الصور */}
      {ModalComp && (
        <ModalComp
          editRecord={editRecord} setEditRecord={setEditRecord}
          editSaving={editSaving} handleSaveEditRecord={handleSaveEditRecord}
          accounts={accounts} previewImage={previewImage} setPreviewImage={setPreviewImage}
          previewTitle={previewTitle} setPreviewTitle={setPreviewTitle}
          showToast={showToast} UNITS={UNITS} inputCls={inputCls} labelCls={labelCls}
        />
      )}

      {/* 6. نافذة الإضافة السريعة لمورد جديد */}
      {QuickAddModalComp && (
        <QuickAddModalComp
          show={showQuickAddSupplier} onClose={() => setShowQuickAddSupplier(false)}
          initialName={supplierSearch} suppliers={suppliers} setSuppliers={setSuppliers}
          setHeaderData={setHeaderData} setSupplierSearch={setSupplierSearch}
          setIsSupplierDropdownOpen={setIsSupplierDropdownOpen} fetchSuppliers={fetchSuppliers}
          showToast={showToast} inputCls={inputCls} labelCls={labelCls}
        />
      )}
    </div>
  );
}

window.Purchases = Purchases;
