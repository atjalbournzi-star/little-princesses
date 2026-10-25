// src/features/Products.jsx
// المنسق العام والمجمع الرئيسي لوحدة إدارة المنتجات والموديلات (Layout Orchestrator)

function Products({
  products = [],
  setProducts,
  inventory = [],
  showToast,
  currency
}) {
  // استدعاء الخطافات والمكونات المعيارية من النطاق العام مع بدائل آمنة
  const useData = window.useProductsData || (() => ({
    search: "", setSearch: () => {},
    categoryFilter: "الكل", setCategoryFilter: () => {},
    collectionFilter: "الكل", setCollectionFilter: () => {},
    sortBy: "latest", setSortBy: () => {},
    viewMode: "table", setViewMode: () => {},
    availableCategories: [], availableCollections: [],
    filteredProducts: products, stats: {}
  }));

  const useActions = window.useProductActions || (() => ({
    modalOpen: false, setModalOpen: () => {},
    handleOpenAddModal: () => {}, handleEditProduct: () => {},
    handleDeleteProduct: () => {}
  }));

  const HeaderComp = window.ProductsHeader || (typeof ProductsHeader !== 'undefined' ? ProductsHeader : null);
  const FilterBarComp = window.ProductsFilterBar || (typeof ProductsFilterBar !== 'undefined' ? ProductsFilterBar : null);
  const TableComp = window.ProductsTable || (typeof ProductsTable !== 'undefined' ? ProductsTable : null);
  const CardComp = window.ProductCard || (typeof ProductCard !== 'undefined' ? ProductCard : null);
  const ModalComp = window.ProductModal || (typeof ProductModal !== 'undefined' ? ProductModal : null);
  const QrModalComp = window.ProductQrModal || (typeof ProductQrModal !== 'undefined' ? ProductQrModal : null);

  const [qrProduct, setQrProduct] = React.useState(null);

  // تشغيل خطاف البيانات والمؤشرات
  const {
    search, setSearch,
    categoryFilter, setCategoryFilter,
    collectionFilter, setCollectionFilter,
    sortBy, setSortBy,
    viewMode, setViewMode,
    availableCategories,
    availableCollections,
    filteredProducts,
    stats
  } = useData({ products, currency });

  // تشغيل خطاف العمليات والإجراءات
  const actions = useActions({
    products,
    setProducts,
    inventory,
    showToast,
    currency
  });

  return (
    <div className="space-y-1 animate-fadeIn text-right" dir="rtl">
      {/* 1. ترويسة استوديو الموديلات وبطاقات المؤشرات العليا */}
      {HeaderComp && (
        <HeaderComp
          stats={stats}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onOpenAdd={actions.handleOpenAddModal}
        />
      )}

      {/* 2. حاوية السجل والفلاتر والجدول المتطابقة مع الهوية البصرية لشاشة السندات */}
      <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden p-2 space-y-1.5">
        {FilterBarComp && (
          <FilterBarComp
            search={search}
            setSearch={setSearch}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            collectionFilter={collectionFilter}
            setCollectionFilter={setCollectionFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            availableCategories={availableCategories}
            availableCollections={availableCollections}
            filteredCount={filteredProducts.length}
            totalCount={products.length}
          />
        )}

        {/* 3. استعراض الموديلات: نمط الجدول التفصيلي */}
        {viewMode === "table" && TableComp && (
          <TableComp
            products={filteredProducts}
            onEdit={actions.handleEditProduct}
            onDelete={actions.handleDeleteProduct}
            onShowQr={setQrProduct}
            currencyLabel={stats.currencyDisplay}
          />
        )}

        {/* 4. استعراض الموديلات: نمط البطاقات الشبكية */}
        {viewMode === "grid" && (
          <div className="overflow-y-auto custom-scrollbar pr-0.5">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-slate-700 dark:text-white text-xs font-semibold select-none">
                <svg className="w-7 h-7 text-slate-400 dark:text-slate-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>لا توجد موديلات تطابق معايير البحث والتصفية</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {filteredProducts.map(p => (
                  CardComp ? (
                    <CardComp
                      key={p.id}
                      product={p}
                      onEdit={actions.handleEditProduct}
                      onDelete={actions.handleDeleteProduct}
                      onShowQr={setQrProduct}
                      currencyLabel={stats.currencyDisplay}
                    />
                  ) : null
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. نافذة إضافة وتعديل الموديل ومصفوفة التكاليف (BOM Studio Modal) */}
      {ModalComp && actions.modalOpen && (
        <ModalComp
          isOpen={actions.modalOpen}
          onClose={() => actions.setModalOpen(false)}
          actions={actions}
          inventory={inventory}
          availableCategories={availableCategories}
          availableCollections={availableCollections}
        />
      )}

      {/* 6. نافذة تكت الفستان ورمز المسح التلقائي (QR Code Modal) */}
      {QrModalComp && qrProduct && (
        <QrModalComp
          isOpen={!!qrProduct}
          product={qrProduct}
          onClose={() => setQrProduct(null)}
        />
      )}
    </div>
  );
}

window.Products = Products;
window.ProductsComponent = Products;
