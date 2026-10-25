// src/features/orders/components/POS.jsx
// المنسق الرئيسي لشاشة نقاط البيع والكاشير السريع (POS Orchestrator)

const { useState, useMemo, useRef } = React;

function POS({
  products = [],
  customers = [],
  currencyDisplay = "YER ريال",
  cart = [],
  setCart,
  onCheckout,
  isSubmittingPOS = false,
  showToast,
  activeMode = 'pos',
  setActiveMode,
  ordersCount = 0,
  onOpenScanDeliver,
  stats = {}
}) {
  const [posCategory, setPosCategory] = useState('الكل');
  const [posSearch, setPosSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [posCustomerName, setPosCustomerName] = useState('عميل عام / زائر صالة العرض');
  const [posChildName, setPosChildName] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState('نقد (كاش)');
  const [posDiscount, setPosDiscount] = useState('0');
  const [posCashReceived, setPosCashReceived] = useState('');
  const barcodeInputRef = useRef(null);

  const HeaderComp = window.POSHeader || (typeof POSHeader !== 'undefined' ? POSHeader : null);
  const CatalogComp = window.POSCatalog || (typeof POSCatalog !== 'undefined' ? POSCatalog : null);
  const CartComp = window.POSCart || (typeof POSCart !== 'undefined' ? POSCart : null);

  const posCategories = useMemo(() => {
    const cats = (products || [])
      .filter(p => p && typeof p === 'object')
      .map(p => p.category || p.classification)
      .filter(Boolean);
    return ['الكل', ...Array.from(new Set(cats))];
  }, [products]);

  const addToCart = (product) => {
    const prodId = product.id || product.product_id;
    const prodName = product.name || product.model_name || 'موديل راقي';
    const price = parseFloat(product.sell_price || product.base_price || 0);

    setCart(prev => {
      const existingIdx = (prev || []).findIndex(item => (prodId && item.product_id === prodId) || item.product_name === prodName);
      if (existingIdx > -1) {
        const updated = [...prev];
        const nextQty = (updated[existingIdx].qty || 1) + 1;
        updated[existingIdx] = { ...updated[existingIdx], qty: nextQty, total_price: nextQty * updated[existingIdx].unit_price };
        return updated;
      }
      return [
        ...(prev || []),
        {
          product_id: prodId,
          product_name: prodName,
          sku: product.sku || `SKU-${prodId || Date.now().toString().slice(-4)}`,
          category: product.category || 'عام',
          unit_price: price,
          qty: 1,
          total_price: price,
          image_url: product.image_url || ''
        }
      ];
    });
  };

  const handleBarcodeSubmit = (e) => {
    if (e) e.preventDefault();
    const code = (barcodeInput || '').trim().toLowerCase();
    if (!code) return;
    const matched = (products || []).find(p =>
      (p.sku && p.sku.toLowerCase() === code) ||
      (p.barcode && p.barcode.toLowerCase() === code) ||
      (p.id && String(p.id).toLowerCase() === code) ||
      (p.name && p.name.toLowerCase() === code)
    );
    if (matched) {
      addToCart(matched);
      showToast && showToast(`تمت إضافة ${matched.name || 'الصنف'} إلى السلة 🛍️`);
      setBarcodeInput('');
    } else {
      showToast && showToast(`لم يتم العثور على صنف بالباركود: ${barcodeInput} ⚠️`, 'error');
    }
  };

  return (
    <div className="w-full h-full max-h-full overflow-hidden flex flex-col px-4 md:px-6 lg:px-8 py-6 space-y-3 select-none" dir="rtl">
      {/* Ultra-compact Header & KPIs Bar (h-8) */}
      {HeaderComp && (
        <HeaderComp
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          cartCount={(cart || []).reduce((s, i) => s + (i.qty || 1), 0)}
          ordersCount={ordersCount}
          onOpenScanDeliver={onOpenScanDeliver}
          stats={stats}
          currencyDisplay={currencyDisplay}
        />
      )}

      {/* Main Workspace Split */}
      <div className="flex-1 flex gap-2.5 min-h-0 overflow-hidden" dir="ltr">
        {/* Left Column: Fixed POS Cart */}
        <div className="w-76 w-[304px] xl:w-80 h-full flex flex-col shrink-0 overflow-hidden" dir="rtl">
          {CartComp && (
            <CartComp
              cart={cart}
              setCart={setCart}
              customers={customers}
              currencyDisplay={currencyDisplay}
              onCheckout={onCheckout}
              isSubmittingPOS={isSubmittingPOS}
              posCustomerName={posCustomerName}
              setPosCustomerName={setPosCustomerName}
              posChildName={posChildName}
              setPosChildName={setPosChildName}
              posPaymentMethod={posPaymentMethod}
              setPosPaymentMethod={setPosPaymentMethod}
              posDiscount={posDiscount}
              setPosDiscount={setPosDiscount}
              posCashReceived={posCashReceived}
              setPosCashReceived={setPosCashReceived}
            />
          )}
        </div>

        {/* Right Column: Catalog Workspace */}
        <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden" dir="rtl">
          {CatalogComp ? (
            <CatalogComp
              products={products}
              cart={cart}
              addToCart={addToCart}
              currencyDisplay={currencyDisplay}
              posCategory={posCategory}
              setPosCategory={setPosCategory}
              posSearch={posSearch}
              setPosSearch={setPosSearch}
              barcodeInput={barcodeInput}
              setBarcodeInput={setBarcodeInput}
              handleBarcodeSubmit={handleBarcodeSubmit}
              barcodeInputRef={barcodeInputRef}
              posCategories={posCategories}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-slate-400">
              <div className="w-6 h-6 border-2 border-pink-500/30 border-t-pink-600 rounded-full animate-spin mb-2"></div>
              <span className="text-xs font-medium">جاري تحميل كتالوج المنتجات...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

window.POS = POS;
window.OrdersPosStudio = POS;
