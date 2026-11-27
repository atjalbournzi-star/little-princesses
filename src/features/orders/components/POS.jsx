// src/features/orders/components/POS.jsx
// المنسق الرئيسي لشاشة نقاط البيع والكاشير السريع (POS Orchestrator)

const { useState, useMemo, useRef, useEffect, useCallback } = React;

function POS({
  products = [],
  orders = [],
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
  stats = {},
  onOpenNewOrder
}) {
  const [posCategory, setPosCategory] = useState('الكل');
  const [posSearch, setPosSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [posCustomerName, setPosCustomerName] = useState('عميل عام / زائر صالة العرض');
  const [posChildName, setPosChildName] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState('نقد (كاش)');
  const [posDiscount, setPosDiscount] = useState('0');
  const [posCashReceived, setPosCashReceived] = useState('');
  const [posCatalog, setPosCatalog] = useState([]);
  const [pickerProduct, setPickerProduct] = useState(null);
  const [hangtagData, setHangtagData] = useState(null);
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false);
  const barcodeInputRef = useRef(null);

  const currCode = typeof currencyDisplay === 'string'
    ? currencyDisplay.split(' ')[0]
    : (currencyDisplay?.code || currencyDisplay?.display?.split(' ')[0] || 'YER');

  const HeaderComp = window.POSHeader || (typeof POSHeader !== 'undefined' ? POSHeader : null);
  const CatalogComp = window.POSCatalog || (typeof POSCatalog !== 'undefined' ? POSCatalog : null);
  const CartComp = window.POSCart || (typeof POSCart !== 'undefined' ? POSCart : null);
  const PickerComp = window.POSVariantPicker || (typeof POSVariantPicker !== 'undefined' ? POSVariantPicker : null);
  const HangtagComp = window.HangtagPrintModal || (typeof HangtagPrintModal !== 'undefined' ? HangtagPrintModal : null);
  const ExchangeComp = window.POSExchangeModal || (typeof POSExchangeModal !== 'undefined' ? POSExchangeModal : null);

  const loadPosCatalog = useCallback(() => {
    fetch('/api/pos/catalog')
      .then(r => r.json())
      .then(d => {
        if (d && d.success && Array.isArray(d.data)) setPosCatalog(d.data);
        else if (Array.isArray(d)) setPosCatalog(d);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadPosCatalog();
    const handler = () => loadPosCatalog();
    window.addEventListener('erp:inventoryChanged', handler);
    return () => window.removeEventListener('erp:inventoryChanged', handler);
  }, [loadPosCatalog]);

  const activeProducts = useMemo(() => (posCatalog.length > 0 ? posCatalog : (products || [])), [posCatalog, products]);

  const posCategories = useMemo(() => {
    const cats = (activeProducts || [])
      .filter(p => p && typeof p === 'object')
      .map(p => p.category || p.classification)
      .filter(c => c && typeof c === 'string' && !c.includes('???') && c !== 'الكل')
      .map(c => c.trim())
      .filter(Boolean);
    return ['الكل', ...Array.from(new Set(cats))];
  }, [activeProducts]);

  const addVariantToCart = (product, variant) => {
    const prodId = product?.id || product?.product_id;
    const varId = variant?.variant_id || variant?.id || null;
    const maxStock = variant?.stock_qty != null ? Number(variant.stock_qty) : (variant?.max_stock != null ? Number(variant.max_stock) : null);
    if (maxStock != null && maxStock <= 0) {
      showToast && showToast(`نفد رصيد المقاس ${variant?.age_size || ''}`, 'error');
      return false;
    }
    const existing = (cart || []).find(it => (varId && it.variant_id === varId) || (!varId && it.product_id === prodId));
    if (existing && maxStock != null && ((existing.qty || 1) + 1) > maxStock) {
      showToast && showToast(`المتوفر لهذا المقاس ${maxStock} قطعة فقط`, 'error');
      return false;
    }
    const price = parseFloat(variant?.selling_price ?? product?.selling_price ?? product?.sell_price ?? 0);
    setCart(prev => {
      const idx = (prev || []).findIndex(it => (varId && it.variant_id === varId) || (!varId && it.product_id === prodId));
      if (idx > -1) {
        const updated = [...prev];
        const nextQty = (updated[idx].qty || 1) + 1;
        if (maxStock != null && nextQty > maxStock) return prev;
        updated[idx] = { ...updated[idx], qty: nextQty, total_price: nextQty * updated[idx].unit_price };
        return updated;
      }
      return [...(prev || []), {
        product_id: prodId, variant_id: varId,
        product_name: product?.name || product?.model_name || 'فستان أميرات',
        age_size: variant?.age_size || '', color_name: variant?.color_name || '',
        sku: variant?.sku || product?.style_code || product?.item_code || prodId,
        barcode: variant?.barcode || '', max_stock: maxStock,
        category: product?.category || 'فساتين جاهزة', unit_price: price, qty: 1, total_price: price,
        image_url: product?.image_url || ''
      }];
    });
    return true;
  };

  const handleSelectVariant = (prodOrVar, maybeVariant) => {
    const targetProd = maybeVariant !== undefined ? (prodOrVar || pickerProduct) : pickerProduct;
    const targetVar = maybeVariant !== undefined ? maybeVariant : prodOrVar;
    if (!targetProd || !targetVar) return;
    const added = addVariantToCart(targetProd, targetVar);
    setPickerProduct(null);
    if (added) {
      const prodLabel = targetProd.name || targetProd.model_name || 'الصنف';
      const sizeLabel = targetVar.age_size ? ` (${targetVar.age_size})` : '';
      showToast && showToast(`أُضيف ${prodLabel}${sizeLabel} ✨`);
    }
  };

  const handleBarcodeSubmit = async (e) => {
    if (e) e.preventDefault();
    const code = (barcodeInput || '').trim();
    if (!code) return;
    try {
      const res = await fetch(`/api/pos/barcode/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        const v = data.data;
        addVariantToCart({ id: v.inventory_id, name: v.product_name, image_url: v.image_url, category: v.category, style_code: v.style_code }, v);
        showToast && showToast(`تمت إضافة ${v.product_name} (${v.age_size}) 🏷️`);
        setBarcodeInput('');
        return;
      }
    } catch (_) {}
    const lc = code.toLowerCase();
    const matched = (activeProducts || []).find(p =>
      (p.variants || []).some(v => (v.barcode || '').toLowerCase() === lc || (v.sku || '').toLowerCase() === lc) ||
      (p.style_code || '').toLowerCase() === lc || (p.name || '').toLowerCase() === lc
    );
    if (matched) {
      const vMatch = (matched.variants || []).find(v => (v.barcode || '').toLowerCase() === lc || (v.sku || '').toLowerCase() === lc);
      if (vMatch) addVariantToCart(matched, vMatch);
      else setPickerProduct(matched);
      setBarcodeInput('');
    } else {
      showToast && showToast(`لم يتم العثور على باركود: ${barcodeInput} ⚠️`, 'error');
    }
  };

  return (
    <div className="w-full h-full max-h-full overflow-hidden flex flex-col px-4 md:px-6 lg:px-8 py-6 space-y-3 select-none" dir="rtl">
      {HeaderComp && (
        <HeaderComp
          activeMode={activeMode} setActiveMode={setActiveMode}
          cartCount={(cart || []).reduce((s, i) => s + (i.qty || 1), 0)}
          ordersCount={ordersCount} onOpenScanDeliver={onOpenScanDeliver}
          onOpenSizeExchange={() => setExchangeModalOpen(true)}
          stats={stats} currencyDisplay={currencyDisplay}
        />
      )}

      <div className="flex-1 flex gap-2.5 min-h-0 overflow-hidden" dir="ltr">
        <div className="w-76 w-[304px] xl:w-80 h-full flex flex-col shrink-0 overflow-hidden" dir="rtl">
          {CartComp && (
            <CartComp
              cart={cart} setCart={setCart} customers={customers} currencyDisplay={currencyDisplay}
              onCheckout={onCheckout} isSubmittingPOS={isSubmittingPOS} showToast={showToast}
              posCustomerName={posCustomerName} setPosCustomerName={setPosCustomerName}
              posChildName={posChildName} setPosChildName={setPosChildName}
              posPaymentMethod={posPaymentMethod} setPosPaymentMethod={setPosPaymentMethod}
              posDiscount={posDiscount} setPosDiscount={setPosDiscount}
              posCashReceived={posCashReceived} setPosCashReceived={setPosCashReceived}
            />
          )}
        </div>

        <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden" dir="rtl">
          {CatalogComp ? (
            <CatalogComp
              products={activeProducts} cart={cart}
              onOpenPicker={(prod) => setPickerProduct(prod)}
              onOpenHangtag={(prod, variant) => setHangtagData({ product: prod, variant: variant || null })}
              currencyDisplay={currencyDisplay} posCategory={posCategory} setPosCategory={setPosCategory}
              posSearch={posSearch} setPosSearch={setPosSearch} barcodeInput={barcodeInput}
              setBarcodeInput={setBarcodeInput} handleBarcodeSubmit={handleBarcodeSubmit}
              barcodeInputRef={barcodeInputRef} posCategories={posCategories}
              onOpenNewOrder={onOpenNewOrder}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-slate-400">
              <span className="text-xs font-medium">جاري تحميل كتالوج المنتجات...</span>
            </div>
          )}
        </div>
      </div>

      {PickerComp && <PickerComp isOpen={!!pickerProduct} product={pickerProduct} onClose={() => setPickerProduct(null)} currCode={currCode} onSelectVariant={handleSelectVariant} onOpenHangtag={(p, v) => setHangtagData({ product: p, variant: v })} />}
      {HangtagComp && <HangtagComp isOpen={!!hangtagData} product={hangtagData?.product} initialVariant={hangtagData?.variant} onClose={() => setHangtagData(null)} currencyCode={currCode} />}
      {ExchangeComp && <ExchangeComp isOpen={exchangeModalOpen} onClose={() => setExchangeModalOpen(false)} orders={orders} posCatalog={posCatalog} showToast={showToast} currCode={currCode} onExchangeComplete={() => { loadPosCatalog(); window.dispatchEvent(new CustomEvent('erp:inventoryChanged')); }} />}
    </div>
  );
}

window.POS = POS;
window.OrdersPosStudio = POS;
