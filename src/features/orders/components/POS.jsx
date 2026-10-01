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

  const HeaderComp = window.POSHeader;
  const CatalogComp = window.POSCatalog;
  const CartComp = window.POSCart;

  const posCategories = useMemo(() => {
    const baseCats = ['الكل', 'منتجات جاهزة', 'تفصيل مخصص', 'طلبات خاصة', 'إكسسوارات ومكملات'];
    return Array.from(new Set([...baseCats, ...(products || []).map(p => p.category).filter(Boolean)]));
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
    <div className="h-[calc(100vh-2.75rem)] flex flex-col overflow-hidden bg-[#0B132B] p-2 space-y-1 select-none" dir="rtl">
      {/* 1. Header (Strictly Pinned, No Scroll) */}
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

      {/* 2. Main POS Viewport: Right 68% Catalog, Left 32% Cart */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2 overflow-hidden w-full">
        {CatalogComp && (
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
        )}

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
    </div>
  );
}

window.POS = POS;
window.OrdersPosStudio = POS;
