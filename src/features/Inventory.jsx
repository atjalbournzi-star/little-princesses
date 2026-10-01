// src/features/Inventory.jsx
// المنسق العام والمعماري لوحدة إدارة المخزون والمستودعات والتوريدات (Layout Orchestrator)

function Inventory({ inventory = [], setInventory, purchases = [], orders = [], showToast, currency }) {
  // استدعاء الخطافات المعيارية مع بدائل آمنة ضد الانهيار
  const useData = window.useInventoryData || (() => ({
    activeTab: 'stock', setActiveTab: () => {}, search: '', setSearch: () => {},
    categoryFilter: 'الكل', setCategoryFilter: () => {}, warehouseFilter: 'الكل', setWarehouseFilter: () => {},
    stockAlertFilter: 'all', setStockAlertFilter: () => {}, isRefreshing: false, refreshInventory: () => {},
    transactions: [], filteredInventory: inventory, filteredPurchases: purchases, filteredTransactions: [],
    stats: {}, currencyDisplay: 'YER ﷼', activeCurrDef: {}, isBaseCurrency: true, activeTargetCurr: 'YER'
  }));

  const useActions = window.useInventoryActions || (() => ({
    isAddModalOpen: false, setIsAddModalOpen: () => {}, formData: {}, setFormData: () => {},
    handleQtyChange: () => {}, handleCostChange: () => {}, handleTotalChange: () => {}, handleAddItem: () => {},
    adjustingItem: null, setAdjustingItem: () => {}, adjustType: 'wastage', setAdjustType: () => {},
    adjustQty: '', setAdjustQty: () => {}, adjustReason: '', setAdjustReason: () => {},
    isSubmittingAdjust: false, handleExecuteAdjust: () => {}, openAdjustModal: () => {},
    transferringItem: null, setTransferringItem: () => {}, transferFrom: '', setTransferFrom: () => {},
    transferTo: '', setTransferTo: () => {}, transferQty: '', setTransferQty: () => {},
    transferNotes: '', setTransferNotes: () => {}, isSubmittingTransfer: false, handleExecuteTransfer: () => {},
    openTransferModal: () => {}, selectedItemForMovements: null, setSelectedItemForMovements: () => {},
    isAddWarehouseOpen: false, setIsAddWarehouseOpen: () => {},
    handleReconcileGovernance: () => {}
  }));

  // استدعاء المكونات المعيارية من window مع حماية Fallbacks
  const HeaderComp = window.InventoryHeader || null;
  const FilterBarComp = window.InventoryFilterBar || null;
  const TableComp = window.InventoryTable || null;
  const PurchasesTableComp = window.InventoryPurchasesTable || null;
  const MovementsTableComp = window.InventoryMovementsTable || null;
  const AddItemModalComp = window.InventoryAddItemModal || null;
  const StockAdjustmentModalComp = window.StockAdjustmentModal || null;
  const WarehouseTransferModalComp = window.WarehouseTransferModal || null;
  const ItemMovementModalComp = window.ItemMovementModal || null;
  const WarehouseAddModalComp = window.WarehouseAddModal || null;
  const WarehouseManageModalComp = window.WarehouseManageModal || null;
  const [isManageWarehouseOpen, setIsManageWarehouseOpen] = (window.React || React).useState(false);

  const data = useData({ inventory, setInventory, purchases, showToast, currency });
  const actions = useActions({
    inventory, setInventory, showToast,
    refreshInventory: data.refreshInventory, fetchTransactions: data.fetchTransactions, currency
  });

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      {/* 1. ترويسة المخزون وبطاقات المؤشرات العليا */}
      {HeaderComp && (
        <HeaderComp
          stats={data.stats}
          onOpenAdd={() => actions.setIsAddModalOpen(true)}
          onReconcile={actions.handleReconcileGovernance}
          onRefresh={data.refreshInventory}
          isRefreshing={data.isRefreshing}
          onOpenTransfer={() => actions.openTransferModal(inventory[0] || null)}
          onOpenAddWarehouse={() => actions.setIsAddWarehouseOpen(true)}
          onOpenManageWarehouses={() => setIsManageWarehouseOpen(true)}
        />
      )}

      {/* 2. شريط التبويبات والبحث والتصفية */}
      {FilterBarComp && (
        <FilterBarComp
          activeTab={data.activeTab}
          setActiveTab={data.setActiveTab}
          search={data.search}
          setSearch={data.setSearch}
          categoryFilter={data.categoryFilter}
          setCategoryFilter={data.setCategoryFilter}
          warehouseFilter={data.warehouseFilter}
          setWarehouseFilter={data.setWarehouseFilter}
          stockAlertFilter={data.stockAlertFilter}
          setStockAlertFilter={data.setStockAlertFilter}
          counts={{
            fabricsCount: (inventory || []).filter(i => !(window.inventoryUtils?.isReadyDressItem?.(i))).length,
            readyDressesCount: (inventory || []).filter(i => window.inventoryUtils?.isReadyDressItem?.(i)).length,
            purchasesCount: (purchases || []).length,
            txnsCount: (data.transactions || []).length
          }}
        />
      )}

      {/* 3. استعراض التبويب النشط */}
      {(data.activeTab === 'stock' || data.activeTab === 'ready_dresses') && TableComp && (
        <TableComp
          items={data.filteredInventory}
          activeCurrDef={data.activeCurrDef}
          isBaseCurrency={data.isBaseCurrency}
          activeTargetCurr={data.activeTargetCurr}
          onOpenAdjust={actions.openAdjustModal}
          onOpenTransfer={actions.openTransferModal}
          onOpenMovements={actions.setSelectedItemForMovements}
        />
      )}

      {data.activeTab === 'purchases' && PurchasesTableComp && (
        <PurchasesTableComp purchases={data.filteredPurchases} currencyDisplay={data.currencyDisplay} />
      )}

      {data.activeTab === 'movements' && MovementsTableComp && (
        <MovementsTableComp transactions={data.filteredTransactions} />
      )}

      {/* 4. النوافذ المنبثقة التفاعلية */}
      {AddItemModalComp && (
        <AddItemModalComp
          isOpen={actions.isAddModalOpen}
          onClose={() => actions.setIsAddModalOpen(false)}
          formData={actions.formData}
          setFormData={actions.setFormData}
          handleQtyChange={actions.handleQtyChange}
          handleCostChange={actions.handleCostChange}
          handleTotalChange={actions.handleTotalChange}
          onSubmit={actions.handleAddItem}
          currency={currency}
        />
      )}

      {StockAdjustmentModalComp && (
        <StockAdjustmentModalComp
          adjustingItem={actions.adjustingItem} setAdjustingItem={actions.setAdjustingItem}
          adjustType={actions.adjustType} setAdjustType={actions.setAdjustType}
          adjustQty={actions.adjustQty} setAdjustQty={actions.setAdjustQty}
          adjustReason={actions.adjustReason} setAdjustReason={actions.setAdjustReason}
          isSubmittingAdjust={actions.isSubmittingAdjust} onSubmit={actions.handleExecuteAdjust}
          currencyDisplay={data.currencyDisplay}
        />
      )}

      {WarehouseTransferModalComp && (
        <WarehouseTransferModalComp
          transferringItem={actions.transferringItem} setTransferringItem={actions.setTransferringItem}
          transferFrom={actions.transferFrom} setTransferFrom={actions.setTransferFrom}
          transferTo={actions.transferTo} setTransferTo={actions.setTransferTo}
          transferQty={actions.transferQty} setTransferQty={actions.setTransferQty}
          transferNotes={actions.transferNotes} setTransferNotes={actions.setTransferNotes}
          isSubmittingTransfer={actions.isSubmittingTransfer} onSubmit={actions.handleExecuteTransfer}
        />
      )}

      {ItemMovementModalComp && (
        <ItemMovementModalComp
          item={actions.selectedItemForMovements}
          onClose={() => actions.setSelectedItemForMovements(null)}
          transactions={data.transactions}
          currencyDisplay={data.currencyDisplay}
        />
      )}

      {WarehouseAddModalComp && (
        <WarehouseAddModalComp
          isOpen={actions.isAddWarehouseOpen}
          onClose={() => actions.setIsAddWarehouseOpen(false)}
          showToast={showToast}
          onWarehouseAdded={() => data.refreshInventory?.(false)}
        />
      )}

      {WarehouseManageModalComp && (
        <WarehouseManageModalComp
          isOpen={isManageWarehouseOpen}
          onClose={() => setIsManageWarehouseOpen(false)}
          showToast={showToast}
          onWarehouseChanged={() => data.refreshInventory?.(false)}
        />
      )}
    </div>
  );
}

window.Inventory = Inventory;
if (typeof module !== 'undefined' && module.exports) module.exports = Inventory;
