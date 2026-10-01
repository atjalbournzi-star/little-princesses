// src/features/customers/components/CustomerHistoryModal.jsx
const { useState, useEffect, useMemo } = React;

function CustomerHistoryModal({
  isOpen, onClose, customer, orders = [], currency = { display: 'YER', symbol: '﷼' },
  onSaveLedger, isSaving = false, showToast, onPrintInvoice, onPrintJobCard,
  currentStep = 3, onSwitchStep
}) {
  const [totalSales, setTotalSales] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [totalPaid, setTotalPaid] = useState('');
  const [deposit, setDeposit] = useState('');
  const [delivery, setDelivery] = useState('');
  const [deliveryPaymentMode, setDeliveryPaymentMode] = useState('DIRECT_TO_COURIER');
  const [payMethod, setPayMethod] = useState('نقد (كاش)');
  const [voucherCurr, setVoucherCurr] = useState('YER');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (customer) {
      const leg = customer.ledger || {};
      const measTotal = (customer.measurements || []).reduce((sum, m) => sum + (parseFloat(m.adjusted_price) || 0), 0);
      const tierPrice = (parseFloat(leg.base_price) > 0)
        ? parseFloat(leg.base_price)
        : (measTotal > 0 ? measTotal : (parseFloat(leg.total_sales) > 0 ? parseFloat(leg.total_sales) : (parseFloat(customer.total_sales) || 0)));
      const delFee = leg.delivery !== undefined ? String(leg.delivery) : (customer.delivery_fee !== undefined ? String(customer.delivery_fee) : '0');
      const mode = leg.delivery_payment_mode || customer.delivery_payment_mode || 'DIRECT_TO_COURIER';
      setBasePrice(tierPrice > 0 ? String(tierPrice) : '');
      setDelivery(delFee);
      setDeliveryPaymentMode(mode);
      const dVal = parseFloat(delFee) || 0;
      const initialTotal = mode === 'PREPAID_VIA_ATELIER' ? (tierPrice + dVal) : tierPrice;
      setTotalSales(initialTotal > 0 ? String(initialTotal) : (leg.total_sales ? String(leg.total_sales) : ''));
      setTotalPaid(leg.total_paid !== undefined ? String(leg.total_paid) : (customer.total_paid !== undefined ? String(customer.total_paid) : ''));
      setDeposit(leg.deposit !== undefined ? String(leg.deposit) : (customer.deposit !== undefined ? String(customer.deposit) : ''));
      setPayMethod(leg.pay_method || 'نقد (كاش)');
      const cCode = (currency?.code || currency?.display?.split(' ')[0] || 'YER').toUpperCase();
      setVoucherCurr(leg.currency || (cCode.includes('SAR') ? 'SAR' : (cCode.includes('USD') ? 'USD' : 'YER')));
      setReceiptFile(leg.receipt_b64 || null);
      setReceiptPreview(leg.receipt_b64 || null);
    }
  }, [customer, isOpen, currency]);

  const handleModeChange = (newMode) => {
    setDeliveryPaymentMode(newMode);
    const b = parseFloat(basePrice) || 0;
    const d = parseFloat(delivery) || 0;
    const updatedTotal = newMode === 'PREPAID_VIA_ATELIER' ? (b + d) : b;
    setTotalSales(updatedTotal > 0 ? String(updatedTotal) : '');
  };

  const handleDeliveryChange = (val) => {
    setDelivery(val);
    const b = parseFloat(basePrice) || 0;
    const d = parseFloat(val) || 0;
    setTotalSales(deliveryPaymentMode === 'PREPAID_VIA_ATELIER' ? String(b + d) : (b > 0 ? String(b) : ''));
  };

  const handleTotalChange = (val) => {
    setTotalSales(val);
    const t = parseFloat(val) || 0;
    const d = parseFloat(delivery) || 0;
    setBasePrice(deliveryPaymentMode === 'PREPAID_VIA_ATELIER' ? String(Math.max(0, t - d)) : String(t));
  };

  const customerOrders = useMemo(() => {
    if (!customer) return [];
    const cId = String(customer.customer_id || customer.id || '');
    const cName = String(customer.name || customer.customer_name || '').trim();
    return (orders || []).filter(o => (o.customer_id && String(o.customer_id) === cId) || (o.customer_name && String(o.customer_name).trim() === cName));
  }, [customer, orders]);

  const totalOrderAmount = useMemo(() => Number(totalSales) || 0, [totalSales]);
  const remaining = useMemo(() => {
    const d = Number(deposit || totalPaid) || 0;
    return totalOrderAmount > 0 ? Math.max(0, totalOrderAmount - d).toFixed(2) : '0.00';
  }, [totalOrderAmount, deposit, totalPaid]);

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return showToast && showToast('حجم الصورة كبير جداً (أقصاه 4 ميجابايت)', 'error');
    const reader = new FileReader();
    reader.onload = ev => { setReceiptFile(ev.target.result); setReceiptPreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (isSubmitting || isSaving) return;
    setIsSubmitting(true);
    try {
      const depAmt = parseFloat(deposit) || 0;
      let vNo = customer?.ledger?.latest_voucher_no || '';
      const ordNo = customer?.latest_order_no || customerOrders[0]?.order_no || `ORD-${customer.customer_id || customer.id || 'CUST'}`;
      const ordId = customerOrders[0]?.id || ordNo;
      if (depAmt > 0) {
        try {
          const vPayload = {
            voucher_no: vNo || `RV-${customer.customer_id || customer.id || 'CUST'}`,
            voucher_type: 'سند قبض', payment_type: 'Receipt', amount: depAmt, currency: voucherCurr,
            payment_method: payMethod, customer_id: customer.customer_id || customer.id,
            order_id: ordId, order_no: ordNo, reference_no: ordNo,
            party_name: customer.name || customer.customer_name,
            notes: `قيد عربون حجز وتفصيل للعميل: ${customer.name}${customer.measurements?.[0]?.selected_model ? ` (${customer.measurements[0].selected_model})` : ''}`,
            date: typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10)
          };
          const res = await fetch('/api/vouchers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vPayload) }).then(r => r.json());
          if (res?.success) {
            vNo = res.voucher_no || vPayload.voucher_no;
            showToast && showToast(`✅ تم اعتماد سند القبض (${vNo}) وترحيل القيد بنجاح 🧾`, 'success');
          }
        } catch (e) { console.warn('Voucher post fallback:', e); }
      }
      const ledgerPayload = {
        total_sales: parseFloat(totalSales) || 0, base_price: parseFloat(basePrice) || 0, total_paid: parseFloat(totalPaid || deposit) || 0,
        total_order_amount: totalOrderAmount, deposit: depAmt, delivery: parseFloat(delivery) || 0, delivery_fee: parseFloat(delivery) || 0,
        delivery_payment_mode: deliveryPaymentMode, remaining: parseFloat(remaining) || 0, currency: voucherCurr, pay_method: payMethod,
        latest_voucher_no: vNo, receipt_b64: receiptFile || '', updated_at: typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10)
      };
      if (onSaveLedger) await onSaveLedger(customer, ledgerPayload);
      onClose && onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !customer) return null;
  const Layout = window.UnifiedCustomerModalLayout;
  const modalTitle = customer ? `الحساب المالي وسند العربون • ${customer.name || ''}` : 'الحساب المالي وسند العربون';

  const printActions = (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => onPrintInvoice && onPrintInvoice(customer)} className="h-6 px-2 text-[10.5px] font-bold rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center gap-1 cursor-pointer"><span>🧾 فاتورة حرارية</span></button>
      <button type="button" onClick={() => onPrintJobCard && onPrintJobCard(customer)} className="h-6 px-2 text-[10.5px] font-bold rounded-lg border border-purple-800/60 hover:bg-purple-950/40 text-purple-300 flex items-center gap-1 cursor-pointer"><span>✂️ كرت معمل</span></button>
    </div>
  );

  const footerRightButtons = (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onClose} className="h-7 px-3 text-xs text-slate-400 hover:text-white rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer">إلغاء</button>
      {onSwitchStep && (
        <button type="button" onClick={() => onSwitchStep(2)} className="h-7 px-3 text-xs text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1">
          <span>السابق: المقاسات</span>
          <span>➡️</span>
        </button>
      )}
    </div>
  );

  const footerLeftButtons = (
    <button type="button" onClick={handleSave} disabled={isSaving || isSubmitting} className="h-8 px-4 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-lg shadow-md transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5">
      <span>اعتماد الحفظ وقيد العربون</span>
      <span>💾</span>
    </button>
  );

  return (
    <Layout
      isOpen={isOpen} onClose={onClose} step={3} onSwitchStep={onSwitchStep}
      title={modalTitle} customerCode={customer?.customer_id || customer?.id}
      extraHeaderLeft={printActions}
      footerRight={footerRightButtons} footerLeft={footerLeftButtons}
    >
      <div className="space-y-2">
        {/* شريط الإجماليات والمدفوعات والمتبقي مع محدد طريقة دفع التوصيل */}
        {window.CustomerFinancialLedgerBar ? (
          <window.CustomerFinancialLedgerBar
            totalSales={totalSales} handleTotalChange={handleTotalChange}
            deposit={deposit} setDeposit={setDeposit}
            delivery={delivery} handleDeliveryChange={handleDeliveryChange}
            deliveryPaymentMode={deliveryPaymentMode} handleModeChange={handleModeChange}
            voucherCurr={voucherCurr} setVoucherCurr={setVoucherCurr}
            payMethod={payMethod} setPayMethod={setPayMethod}
            remaining={remaining}
          />
        ) : null}

        {/* إرفاق السند المالي ومعاينة رقم السند */}
        <div className="p-2 bg-[#0B132B] rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <label className="text-[10.5px] font-bold text-slate-300">📎 إيصال السداد المالي:</label>
            <input type="file" accept="image/*" onChange={handleReceiptUpload} className="text-[10.5px] text-slate-400 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:bg-cyan-950/60 file:text-cyan-300 file:font-bold border border-slate-700 bg-[#0F172A] rounded-lg h-7 cursor-pointer" />
          </div>
          {receiptPreview && (
            <div className="flex items-center gap-1.5">
              <img src={receiptPreview} alt="السند" className="w-7 h-7 object-cover rounded-md border border-cyan-500" />
              <button type="button" onClick={() => { setReceiptFile(null); setReceiptPreview(null); }} className="text-rose-400 text-[10.5px] hover:underline cursor-pointer">إزالة</button>
            </div>
          )}
        </div>

        {/* جدول سجل الطلبات السابقة */}
        {window.CustomerHistoryOrdersTable && (
          <window.CustomerHistoryOrdersTable customerOrders={customerOrders} voucherCurr={voucherCurr} />
        )}
      </div>
    </Layout>
  );
}

window.CustomerHistoryModal = CustomerHistoryModal;
window.CustomerFinancialModal = CustomerHistoryModal;
window.BespokeFinancialModal = CustomerHistoryModal;
window.OrderVoucherModal = CustomerHistoryModal;
