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

  const HeaderComp = window.ProductsHeader || null;
  const FilterBarComp = window.ProductsFilterBar || null;
  const TableComp = window.ProductsTable || null;
  const CardComp = window.ProductCard || null;
  const ModalComp = window.ProductModal || null;
  const QrModalComp = window.ProductQrModal || null;

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
    <div className="h-full flex flex-col min-h-0 overflow-hidden animate-fadeIn text-right" dir="rtl">
      {/* 1. ترويسة استوديو الموديلات وبطاقات المؤشرات العليا */}
      {HeaderComp && (
        <HeaderComp
          stats={stats}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onOpenAdd={actions.handleOpenAddModal}
        />
      )}

      {/* 2. شريط البحث والتصفية والفرز المتقدم */}
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
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5">
          {filteredProducts.length === 0 ? (
            <div className="bg-[#111C38] rounded-xl border border-slate-800 p-8 text-center text-slate-400 text-xs font-semibold select-none">
              لا توجد موديلات تطابق معايير البحث والتصفية 👗
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
