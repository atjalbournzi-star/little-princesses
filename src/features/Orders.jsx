// src/features/Orders.jsx
const { useState, useCallback } = React;

function Orders({ orders = [], setOrders, customers = [], products = [], campaigns = [], showToast, currency }) {
  const [activeMode, setActiveMode] = useState('pos');
  const [cart, setCart] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);

  // Modals state
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [deliveryModalOrder, setDeliveryModalOrder] = useState(null);
  const [scanDeliverModalOpen, setScanDeliverModalOpen] = useState(false);
  const [alterationModalOrder, setAlterationModalOrder] = useState(null);
  const [customerMessageModalData, setCustomerMessageModalData] = useState(null);
  const [printModalData, setPrintModalData] = useState(null);
  const [printTemplate, setPrintTemplate] = useState('thermal');
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteText, setQuoteText] = useState('');

  // Subcomponents & Hooks Resolution
  const useData = window.useOrdersData || (() => ({ filteredOrders: orders, stats: {} }));
  const useActions = window.useOrderActions || (() => ({}));
  const {
    OrdersHeader: HeaderComp, OrdersFilterBar: FilterBarComp, OrdersTable: TableComp,
    OrderFormModal: FormModalComp, OrdersPosStudio: PosStudioComp, OrderDeliveryModal: DeliveryModalComp,
    OrderScanDeliverModal: ScanDeliverModalComp, OrderAlterationModal: AlterationModalComp,
    OrderCustomerMessageModal: MessageModalComp, OrderQuoteModal: QuoteModalComp, OrderDetailModal: DetailModalComp
  } = window;

  const { search, setSearch, statusFilter, setStatusFilter, deliveryDateFilter, setDeliveryDateFilter, filteredOrders, stats, currencyDisplay } = useData({ orders, setOrders, currency });

  const openCustomerMessageModal = useCallback((ord) => {
    if (window.orderUtils?.buildRoyalCustomerConfirmation) {
      const data = window.orderUtils.buildRoyalCustomerConfirmation(ord, customers, products, currencyDisplay);
      setCustomerMessageModalData(data);
    }
  }, [customers, products, currencyDisplay]);

  const {
    handleSaveInvoice, handleUpdateStatus, handleDelete,
    handleConfirmDelivery, submittingDelivery,
    handleConfirmScanDelivery, scanDeliveryLoading,
    handleSaveAlteration, submittingAlteration,
    isSubmittingPOS, setIsSubmittingPOS
  } = useActions({ orders, setOrders, showToast, currencyDisplay, openCustomerMessageModal });

  const handleEdit = (ord) => {
    setEditingOrder(ord);
    setEditingOrderId(ord.id);
    setIsEditing(true);
    setShowFormModal(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingOrderId(null);
    setEditingOrder(null);
    setShowFormModal(false);
  };

  const handleOpenQuote = async (modelName) => {
    if (!modelName) return showToast && showToast('يرجى اختيار الصنف أولاً', 'error');
    try {
      const res = await fetch(`/api/pricing/quick-quote?model_name=${encodeURIComponent(modelName)}`).then(r => r.json());
      if (res.success) { setQuoteText(res.quote_text); setShowQuoteModal(true); }
    } catch { showToast && showToast('تعذر جلب عرض السعر', 'error'); }
  };

  const openPrintModal = (ord, template = 'thermal') => {
    const cust = (customers || []).find(c => window.getCustomerName ? window.getCustomerName(c) === ord.customer_name : c.name === ord.customer_name);
    const childMeas = cust?.measurements?.find(m => m.child_name === ord.child_name) || cust?.measurements?.[0];
    const tot = parseFloat(ord.total ?? ord.total_amount ?? 0), pd = parseFloat(ord.paid ?? ord.paid_amount ?? 0);
    const prod = (products || []).find(p => (ord.product_id && (p.id === ord.product_id || p.product_id === ord.product_id)) || p.name === ord.product_name);
    setPrintTemplate(template);
    setPrintModalData({
      order: { ...ord, total: tot, paid: pd, remaining: Math.max(0, tot - pd), child_name: ord.child_name || childMeas?.child_name || 'الأميرة', product_name: ord.product_name || 'موديل راقي', qty: ord.qty ?? ord.quantity ?? 1 },
      customer: cust, measurements: childMeas, product: prod, products
    });
  };

  const handlePOSCheckout = async (posParams) => {
    setIsSubmittingPOS(true);
    try {
      const newId = Date.now(), ordNo = `POS-${newId.toString().slice(-6)}`;
      const ordCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(currencyDisplay) : 'YER';
      const ordRate = window.CurrencyService ? window.CurrencyService.getRate(ordCurr) : 1.0;
      let actualPaid = posParams.posPaymentMethod === 'آجل / جزئي' ? (posParams.posCashReceived !== '' ? Math.min(posParams.posReceivedNum, posParams.posNetTotal) : 0) : posParams.posNetTotal;
      const posPayload = {
        id: newId, order_no: ordNo, customer_name: posParams.posCustomerName, child_name: posParams.posChildName || 'الأميرة',
        product_name: posParams.cart.length === 1 ? posParams.cart[0].product_name : `سلة كاشير (${posParams.cart.length} أصناف)`,
        qty: posParams.cart.reduce((s, i) => s + (i.qty || 1), 0), subtotal: posParams.posSubtotal, discount: posParams.posDiscountNum,
        total_amount: posParams.posNetTotal, total: posParams.posNetTotal, paid_amount: actualPaid, paid: actualPaid,
        remaining: Math.max(0, posParams.posNetTotal - actualPaid), payment_method: posParams.posPaymentMethod, currency: ordCurr, exchange_rate: ordRate,
        order_date: TODAY_STR_ISO, delivery_date: TODAY_STR_ISO, status: 'جاهز للتسليم 🛍️', production_status: 'جاهز للتسليم 🛍️',
        items: posParams.cart.map(i => ({ product_id: i.product_id, product_name: i.product_name, quantity: i.qty, unit_price: i.unit_price, total_price: i.total_price }))
      };
      setOrders && setOrders([posPayload, ...(orders || [])]);
      if (window.salesAPI?.createOrder) await window.salesAPI.createOrder(posPayload);
      else await fetch('/api/sales/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(posPayload) });
      showToast && showToast("تم إتمام عملية البيع وإصدار الفاتورة سحابياً ⚡🧾");
      openCustomerMessageModal(posPayload);
      posParams.clearCart();
    } catch (err) { showToast && showToast(err.message || 'خطأ في البيع', 'error'); }
    finally { setIsSubmittingPOS(false); }
  };

  return (
    <div className={`animate-fadeIn text-right ${activeMode === 'pos' ? 'h-full flex flex-col overflow-hidden' : 'h-full flex flex-col p-4 space-y-4 overflow-y-auto custom-scrollbar'}`} dir="rtl">
      {activeMode === 'pos' && PosStudioComp && (
        <PosStudioComp
          products={products}
          customers={customers}
          currencyDisplay={currencyDisplay}
          cart={cart}
          setCart={setCart}
          onCheckout={handlePOSCheckout}
          isSubmittingPOS={isSubmittingPOS}
          showToast={showToast}
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          ordersCount={orders.length}
          onOpenScanDeliver={() => setScanDeliverModalOpen(true)}
          stats={stats}
        />
      )}

      {activeMode === 'archive' && (
        <div className="space-y-6">
          {HeaderComp && (
            <HeaderComp
              activeMode={activeMode}
              setActiveMode={setActiveMode}
              cartCount={cart.reduce((s, i) => s + (i.qty || 1), 0)}
              ordersCount={orders.length}
              onOpenScanDeliver={() => setScanDeliverModalOpen(true)}
              isEditing={isEditing}
              onCancelEdit={handleCancelEdit}
              onOpenNewOrder={() => { handleCancelEdit(); setShowFormModal(true); }}
              stats={stats}
            />
          )}
          {(showFormModal || isEditing) && FormModalComp && (
            <FormModalComp isOpen={showFormModal || isEditing} onClose={handleCancelEdit} isEditing={isEditing} editingOrderId={editingOrderId} editingOrder={editingOrder} customers={customers} products={products} campaigns={campaigns} currencyDisplay={currencyDisplay} onSaveInvoice={handleSaveInvoice} onOpenQuote={handleOpenQuote} />
          )}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#E8E5EA] dark:border-slate-800 p-6 space-y-4 shadow-2xs">
            {FilterBarComp && <FilterBarComp search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter} deliveryDateFilter={deliveryDateFilter} setDeliveryDateFilter={setDeliveryDateFilter} count={filteredOrders.length} />}
            {TableComp && <TableComp orders={filteredOrders} customers={customers} currencyDisplay={currencyDisplay} handleUpdateStatus={handleUpdateStatus} handleEdit={handleEdit} handleDelete={handleDelete} onOpenDeliveryModal={setDeliveryModalOrder} onOpenCustomerMessage={openCustomerMessageModal} onOpenPrintModal={openPrintModal} onOpenAlterationModal={setAlterationModalOrder} onViewOrderDetail={setSelectedOrderDetail} />}
          </div>
        </div>
      )}

      {/* Modals */}
      {DetailModalComp && selectedOrderDetail && <DetailModalComp order={selectedOrderDetail} onClose={() => setSelectedOrderDetail(null)} customers={customers} currencyDisplay={currencyDisplay} onOpenDelivery={setDeliveryModalOrder} onOpenCustomerMessage={openCustomerMessageModal} onOpenPrint={openPrintModal} onOpenAlteration={setAlterationModalOrder} />}
      {DeliveryModalComp && deliveryModalOrder && <DeliveryModalComp order={deliveryModalOrder} onClose={() => setDeliveryModalOrder(null)} customers={customers} currencyDisplay={currencyDisplay} onConfirmDelivery={handleConfirmDelivery} submittingDelivery={submittingDelivery} />}
      {ScanDeliverModalComp && scanDeliverModalOpen && <ScanDeliverModalComp isOpen={scanDeliverModalOpen} onClose={() => setScanDeliverModalOpen(false)} orders={orders} currencyDisplay={currencyDisplay} onConfirmScanDelivery={handleConfirmScanDelivery} scanDeliveryLoading={scanDeliveryLoading} showToast={showToast} />}
      {AlterationModalComp && alterationModalOrder && <AlterationModalComp order={alterationModalOrder} onClose={() => setAlterationModalOrder(null)} onSaveAlteration={handleSaveAlteration} submittingAlteration={submittingAlteration} />}
      {MessageModalComp && customerMessageModalData && <MessageModalComp data={customerMessageModalData} onClose={() => setCustomerMessageModalData(null)} showToast={showToast} />}
      {QuoteModalComp && showQuoteModal && <QuoteModalComp isOpen={showQuoteModal} onClose={() => setShowQuoteModal(false)} quoteText={quoteText} showToast={showToast} />}
      {printModalData && typeof PrintModal !== 'undefined' && <PrintModal isOpen={!!printModalData} order={printModalData.order} customer={printModalData.customer} measurements={printModalData.measurements} product={printModalData.product} products={printModalData.products} defaultTemplate={printTemplate} onClose={() => setPrintModalData(null)} />}
    </div>
  );
}

window.Orders = Orders;
