// src/features/Customers.jsx - المنسق والمجمع الرئيسي لوحدة إدارة العملاء والمقاسات
const { useState, useCallback } = React;

function Customers({
  customers = [], setCustomers, products = [], orders = [],
  showToast, currency = { display: 'YER', symbol: '﷼' }, onSendToFactory
}) {
  // حالات فتح النوافذ المنبثقة والخطوة النشطة (1: بيانات، 2: مقاسات، 3: مالية)
  const [activeStep, setActiveStep] = useState(null);
  const [modalCustomer, setModalCustomer] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedJobCard, setSelectedJobCard] = useState(null);
  const [selectedPrintCustomer, setSelectedPrintCustomer] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // استدعاء المكونات والخطافات المعيارية من النطاق العام
  const useData = window.useCustomersData || (() => ({ filteredCustomers: customers, stats: {} }));
  const useActions = window.useCustomerActions || (() => ({}));
  const {
    CustomersHeader: HeaderComp, CustomersFilterBar: FilterBarComp, CustomerTable: TableComp,
    CustomerModal: CustModalComp, CustomerMeasurementsModal: MeasModalComp,
    CustomerDeleteConfirmModal: DeleteConfirmComp
  } = window;
  const HistoryModalComp = window.BespokeFinancialModal || window.CustomerHistoryModal;

  const {
    search, setSearch, categoryFilter, setCategoryFilter, sortBy, setSortBy,
    filteredCustomers, stats, getKnownPrincesses
  } = useData({ customers, setCustomers, orders });

  const {
    isSaving, handleSaveCustomer, handleSaveMeasurements, handleSaveLedger,
    handleDeleteCustomer, handleOpenDressCard, handleSendWhatsAppDressCard, handleDispatchToFactory
  } = useActions({ customers, setCustomers, orders, products, showToast, currency, onSendToFactory });

  // معالجة حفظ العميل من النافذة المنبثقة
  const onSaveCustomerModal = async (payload, proceedToMeasurements) => {
    const saved = await handleSaveCustomer(payload);
    if (saved) {
      setModalCustomer(saved);
      if (proceedToMeasurements) { setActiveStep(2); }
      else { setActiveStep(null); setModalCustomer(null); }
    }
  };

  // الانتقال السلس من خطوة المقاسات إلى خطوة الحساب المالي وسند العربون (Step 2 -> Step 3)
  const onProceedToFinanceFromMeas = (enrichedMeas) => {
    const measTotal = (enrichedMeas || []).reduce((sum, m) => sum + (parseFloat(m.adjusted_price) || 0), 0);
    const updatedCust = {
      ...(modalCustomer || {}),
      measurements: enrichedMeas,
      ledger: {
        ...(modalCustomer?.ledger || {}),
        base_price: measTotal > 0 ? measTotal : (modalCustomer?.ledger?.base_price || 0),
        total_sales: (modalCustomer?.ledger?.total_sales && parseFloat(modalCustomer.ledger.total_sales) > 0)
          ? modalCustomer.ledger.total_sales
          : (measTotal > 0 ? measTotal : (modalCustomer?.total_sales || 0))
      }
    };
    setModalCustomer(updatedCust);
    setActiveStep(3);
  };

  return (
    <div className="space-y-2.5 animate-fadeIn text-right" dir="rtl">
      {/* ترويسة إدارة العملاء والإحصاءات */}
      {HeaderComp && (
        <HeaderComp
          stats={stats}
          onOpenAddCustomer={() => { setModalCustomer(null); setActiveStep(1); }}
          currency={currency}
        />
      )}

      {/* شريط البحث والفلترة والفرز */}
      {FilterBarComp && (
        <FilterBarComp
          search={search} setSearch={setSearch}
          categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
          sortBy={sortBy} setSortBy={setSortBy}
          filteredCount={filteredCustomers.length} totalCount={customers.length}
        />
      )}

      {/* جدول استعراض العملاء وسجل المقاسات والإجراءات */}
      {TableComp && (
        <TableComp
          customers={filteredCustomers} orders={orders} currency={currency}
          onEditCustomer={(c) => { setModalCustomer(c); setActiveStep(1); }}
          onOpenMeasurements={(c) => { setModalCustomer(c); setActiveStep(2); }}
          onOpenHistory={(c) => { setModalCustomer(c); setActiveStep(3); }}
          onSendToFactory={handleDispatchToFactory}
          onPrintInvoice={setSelectedInvoice}
          onPrintJobCard={setSelectedJobCard}
          onPrintUnified={setSelectedPrintCustomer}
          onOpenDressCard={handleOpenDressCard}
          onSendWhatsApp={handleSendWhatsAppDressCard}
          onDeleteCustomer={(c) => setCustomerToDelete(c)}
        />
      )}

      {/* تجهيز بيانات العميل الاحتياطية لضمان التنقل السلس بين الخطوات الثلاث */}
      {(() => {
        const effectiveCustomer = modalCustomer || {
          customer_id: window.customerUtils?.genCustId ? window.customerUtils.genCustId(customers) : `CUST-${(customers.length || 0) + 1001}`,
          name: 'عميل جديد',
          phone: '',
          measurements: [],
          ledger: { total_sales: 0, deposit: 0, total_paid: 0, remaining: 0 }
        };

        return (
          <React.Fragment>
            {/* نافذة إضافة / تعديل بيانات العميل الشخصية (الخطوة 1) */}
            {CustModalComp && activeStep === 1 && (
              <CustModalComp
                isOpen={true}
                onClose={() => { setActiveStep(null); setModalCustomer(null); }}
                customer={modalCustomer} customers={customers}
                onSave={onSaveCustomerModal} isSaving={isSaving} showToast={showToast}
                onDeleteCustomer={(c) => { setActiveStep(null); setModalCustomer(null); setCustomerToDelete(c); }}
                currentStep={1} onSwitchStep={setActiveStep}
              />
            )}

            {/* نافذة إدارة مقاسات فساتين الأميرات الفنية (الخطوة 2) */}
            {MeasModalComp && activeStep === 2 && (
              <MeasModalComp
                isOpen={true}
                onClose={() => { setActiveStep(null); setModalCustomer(null); }}
                customer={effectiveCustomer} products={products} currency={currency}
                onSaveMeasurements={handleSaveMeasurements}
                onProceedToFinance={onProceedToFinanceFromMeas}
                isSaving={isSaving}
                showToast={showToast} getKnownPrincesses={getKnownPrincesses}
                currentStep={2} onSwitchStep={setActiveStep}
              />
            )}

            {/* نافذة كشف الحساب والمدفوعات والطلبات السابقة (الخطوة 3) */}
            {HistoryModalComp && activeStep === 3 && (
              <HistoryModalComp
                isOpen={true}
                onClose={() => { setActiveStep(null); setModalCustomer(null); }}
                customer={effectiveCustomer} orders={orders} currency={currency}
                onSaveLedger={handleSaveLedger} isSaving={isSaving} showToast={showToast}
                onPrintInvoice={setSelectedInvoice} onPrintJobCard={setSelectedJobCard}
                currentStep={3} onSwitchStep={setActiveStep}
              />
            )}
          </React.Fragment>
        );
      })()}

      {/* مركز الطباعة الموحد (Unified Print Hub) */}
      {(selectedPrintCustomer || selectedInvoice || selectedJobCard) && typeof PrintModal !== 'undefined' && (() => {
        const target = selectedPrintCustomer || selectedInvoice || selectedJobCard;
        const defaultT = selectedJobCard ? 'job_ticket' : 'thermal';
        return (
          <PrintModal
            isOpen={true}
            onClose={() => { setSelectedPrintCustomer(null); setSelectedInvoice(null); setSelectedJobCard(null); }}
            customer={target}
            defaultTemplate={defaultT}
            products={products}
            order={{
              order_no: target.latest_order_no || `INV-${target.customer_id || target.id}`,
              customer_name: target.name, phone: target.phone,
              child_name: target.measurements?.[0]?.child_name || 'الأميرة',
              total: parseFloat(target.ledger?.total_sales || target.total_sales || 0),
              paid: parseFloat(target.ledger?.deposit || target.ledger?.total_paid || target.deposit || 0),
              remaining: parseFloat(target.ledger?.remaining ?? target.remaining ?? 0),
              currency: currency?.display || 'YER ﷼', delivery_date: target.measurements?.[0]?.event_date || 'يحدد لاحقاً',
              items: (target.measurements || []).map((m, idx) => ({ id: m.id || idx, name: m.model_name || m.selected_model || 'تفصيل فستان فاخر', product_name: m.model_name || m.selected_model || 'تفصيل فستان فاخر', qty: 1, price: parseFloat(m.adjusted_price || target.ledger?.total_sales || 0), total_price: parseFloat(m.adjusted_price || target.ledger?.total_sales || 0) }))
            }}
            measurements={target.measurements?.[0] || {}}
            product={products?.find(p => p.name === (target.measurements?.[0]?.model_name || target.measurements?.[0]?.selected_model))}
          />
        );
      })()}

      {/* نافذة تأكيد حذف العميل الآمنة مع فحص سلامة القيود والطلبات */}
      {DeleteConfirmComp && customerToDelete && (
        <DeleteConfirmComp
          isOpen={!!customerToDelete}
          onClose={() => setCustomerToDelete(null)}
          customer={customerToDelete}
          orders={orders}
          currency={currency}
          isDeleting={isDeleting}
          onConfirm={async () => {
            setIsDeleting(true);
            try {
              const cid = customerToDelete.customer_id || customerToDelete.id;
              const ok = await handleDeleteCustomer(cid, true);
              if (ok) setCustomerToDelete(null);
            } finally {
              setIsDeleting(false);
            }
          }}
        />
      )}
    </div>
  );
}

window.Customers = Customers;
