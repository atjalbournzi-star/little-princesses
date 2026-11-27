// src/features/customers/components/CustomerHistoryModal.jsx
const { useState, useEffect, useMemo } = React;

function CustomerHistoryModal({
  isOpen, onClose, customer, orders = [], currency = { display: 'YER', symbol: '﷼' },
  onSaveLedger, isSaving = false, showToast, onPrintInvoice, onPrintJobCard,
  currentStep = 3, onSwitchStep
}) {
  const [totalSales, setTotalSales] = useState(''), [basePrice, setBasePrice] = useState(''), [totalPaid, setTotalPaid] = useState('');
  const [deposit, setDeposit] = useState(''), [delivery, setDelivery] = useState(''), [deliveryPaymentMode, setDeliveryPaymentMode] = useState('DIRECT_TO_COURIER');
  const [payMethod, setPayMethod] = useState('نقد (كاش)'), [voucherCurr, setVoucherCurr] = useState('YER'), [selectedAccount, setSelectedAccount] = useState('');
  const [receiptFile, setReceiptFile] = useState(null), [receiptPreview, setReceiptPreview] = useState(null), [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  useEffect(() => {
    setErrorBanner('');
    if (customer) {
      const leg = customer.ledger || {};
      const measTotal = (customer.measurements || []).reduce((sum, m) => sum + (parseFloat(m.adjusted_price) || 0), 0);
      const tierPrice = measTotal > 0 ? measTotal : (parseFloat(leg.subtotal) || parseFloat(leg.total_sales) || parseFloat(leg.base_price) || parseFloat(customer.total_sales) || parseFloat(customer.total_amount) || 0);
      const delFee = leg.delivery_fee !== undefined ? String(leg.delivery_fee) : (leg.delivery !== undefined ? String(leg.delivery) : (customer.delivery_fee !== undefined ? String(customer.delivery_fee) : '0'));
      setBasePrice(tierPrice > 0 ? String(tierPrice) : '');
      setDelivery(delFee);
      setDeliveryPaymentMode(leg.delivery_payment_mode || customer.delivery_payment_mode || 'DIRECT_TO_COURIER');
      setTotalSales(tierPrice > 0 ? String(tierPrice) : (leg.subtotal ? String(leg.subtotal) : (leg.total_sales ? String(leg.total_sales) : '')));
      setTotalPaid(leg.total_paid !== undefined ? String(leg.total_paid) : (customer.paid_amount !== undefined ? String(customer.paid_amount) : (customer.total_paid !== undefined ? String(customer.total_paid) : '')));
      setDeposit(leg.deposit !== undefined ? String(leg.deposit) : (customer.deposit_amount !== undefined ? String(customer.deposit_amount) : (customer.deposit !== undefined ? String(customer.deposit) : '')));
      setPayMethod(leg.pay_method || 'نقد (كاش)');
      const cCode = (currency?.code || currency?.display?.split(' ')[0] || 'YER').toUpperCase();
      setVoucherCurr(leg.currency || (cCode.includes('SAR') ? 'SAR' : (cCode.includes('USD') ? 'USD' : 'YER')));
      setReceiptFile(leg.receipt_b64 || null);
      setReceiptPreview(leg.receipt_b64 || null);
    }
  }, [customer, isOpen, currency]);

  const handleModeChange = (newMode) => { setDeliveryPaymentMode(newMode); };
  const handleDeliveryChange = (val) => { setDelivery(val); };
  const handleTotalChange = (val) => { setTotalSales(val); setBasePrice(val); };

  const customerOrders = useMemo(() => {
    if (!customer) return [];
    const cId = String(customer.customer_id || customer.id || '');
    const cName = String(customer.name || customer.customer_name || '').trim();
    return (orders || []).filter(o => (o.customer_id && String(o.customer_id) === cId) || (o.customer_name && String(o.customer_name).trim() === cName));
  }, [customer, orders]);

  const netOrderAmount = useMemo(() => Number(totalSales) || 0, [totalSales]);
  const deliveryFeeNum = useMemo(() => Number(delivery) || 0, [delivery]);
  const isPrepaid = deliveryPaymentMode === 'PREPAID_VIA_ATELIER';
  const totalOrderAmount = useMemo(() => isPrepaid ? (netOrderAmount + deliveryFeeNum) : netOrderAmount, [netOrderAmount, deliveryFeeNum, isPrepaid]);
  const depositNum = useMemo(() => Number(deposit || totalPaid) || 0, [deposit, totalPaid]);
  const remaining = useMemo(() => totalOrderAmount > 0 ? Math.max(0, totalOrderAmount - depositNum).toFixed(2) : '0.00', [totalOrderAmount, depositNum]);

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return showToast && showToast('حجم الصورة كبير جداً (أقصاه 4 ميجابايت)', 'error');
    const reader = new FileReader();
    reader.onload = ev => { setReceiptFile(ev.target.result); setReceiptPreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleSave = async (isConfirming = false) => {
    if (isSubmitting || isSaving) return;
    setIsSubmitting(true);
    setErrorBanner('');
    try {
      const depAmt = parseFloat(deposit) || 0, vNo = customer?.ledger?.latest_voucher_no || '';
      const shouldConfirm = isConfirming || Boolean(customer?.isDraftOrder);
      const ordNo = shouldConfirm ? '' : (customer?.latest_order_no || customerOrders[0]?.order_no || '');
      const ordId = shouldConfirm ? '' : (customerOrders[0]?.id || ordNo);
      const firstM = customer?.measurements?.[0] || {};
      const delivDate = firstM.event_date || firstM.date || customer?.delivery_date || customerOrders[0]?.delivery_date || '';
      const chId = firstM.child_id || customer?.children?.[0]?.id || customerOrders[0]?.child_id || '';
      const chName = firstM.child_name || customer?.children?.[0]?.child_name || customerOrders[0]?.child_name || '';
      const ledgerPayload = {
        order_id: ordId, order_no: ordNo, child_id: chId, child_name: chName, confirm_order: shouldConfirm,
        delivery_date: delivDate, event_date: delivDate, total_sales: netOrderAmount, subtotal: netOrderAmount,
        base_price: netOrderAmount, total_paid: parseFloat(totalPaid || deposit) || 0, total_order_amount: totalOrderAmount,
        deposit: depAmt, delivery: deliveryFeeNum, delivery_fee: deliveryFeeNum, delivery_payment_mode: deliveryPaymentMode,
        remaining: parseFloat(remaining) || 0, currency: voucherCurr, pay_method: payMethod, account_id: selectedAccount || undefined,
        latest_voucher_no: vNo, receipt_b64: receiptFile || '', updated_at: typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10)
      };
      if (onSaveLedger) {
        const saved = await onSaveLedger(customer, ledgerPayload, { voucherNo: vNo, confirmOrder: shouldConfirm });
        if (!saved) {
          setErrorBanner('تعذر حفظ الحساب المالي وسند العربون، يرجى التحقق من المدخلات ⚠️');
          return;
        }
      }
      onClose && onClose();
    } catch (err) {
      console.error('Ledger save error:', err);
      const errMsg = err?.name === 'AbortError'
        ? 'انتهت مهلة انتظار السيرفر (90 ثانية) ⚠️ المعاملة قد تكون اكتملت بنجاح في السيرفر، يرجى تحديث الصفحة/الجدول للتأكد قبل إعادة الإرسال منعاً للتكرار!'
        : (err?.message || 'فشل حفظ الحساب المالي وسند العربون ⚠️');
      setErrorBanner(errMsg);
      showToast && showToast(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !customer) return null;
  const Layout = window.UnifiedCustomerModalLayout;
  const modalTitle = customer ? `الحساب المالي وسند العربون • ${customer.name || ''}` : 'الحساب المالي وسند العربون';

  const printActions = (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => onPrintInvoice && onPrintInvoice(customer)} className="h-6 px-2 text-[10.5px] font-bold rounded-lg border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-[#334155] dark:text-slate-300 flex items-center gap-1 cursor-pointer"><span>🧾 فاتورة حرارية</span></button>
      <button type="button" onClick={() => onPrintJobCard && onPrintJobCard(customer)} className="h-6 px-2 text-[10.5px] font-bold rounded-lg border border-purple-300 dark:border-purple-800/60 bg-purple-50 dark:bg-transparent hover:bg-purple-100 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center gap-1 cursor-pointer"><span>✂️ كرت معمل</span></button>
    </div>
  );

  const handleBackToStep2 = () => {
    if (customer) {
      customer.ledger = { ...(customer.ledger || {}), base_price: netOrderAmount, total_sales: netOrderAmount, subtotal: netOrderAmount, deposit: Number(deposit || totalPaid) || 0, total_paid: Number(totalPaid || deposit) || 0, delivery: deliveryFeeNum, delivery_fee: deliveryFeeNum, delivery_payment_mode: deliveryPaymentMode, total_order_amount: totalOrderAmount, remaining: Number(remaining) || 0, currency: voucherCurr, pay_method: payMethod, account_id: selectedAccount, receipt_b64: receiptFile || '' };
    }
    if (onSwitchStep) onSwitchStep(2);
  };

  const footerRightButtons = (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onClose} className="h-7 px-3 text-xs text-[#334155] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white rounded-lg border border-[#CBD5E1] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">إلغاء</button>
      {onSwitchStep && (
        <button type="button" onClick={handleBackToStep2} className="h-7 px-3 text-xs text-[#334155] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white rounded-lg border border-[#CBD5E1] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1">
          <span>السابق: المقاسات</span><span>➡️</span>
        </button>
      )}
    </div>
  );

  const hasOrders = customerOrders && customerOrders.length > 0, isDraftOrder = Boolean(customer?.isDraftOrder || !hasOrders);
  const isReadOnly = !isDraftOrder && hasOrders;
  const hasReadyOrder = hasOrders && customerOrders.some(o => ['جاهز للتسليم 📦', 'ready_for_delivery', 'ready'].includes(o.stage || o.status || o.production_status));
  const footerLeftButtons = isDraftOrder ? (
    <button type="button" onClick={() => handleSave(true)} disabled={isSaving || isSubmitting} className="h-8 px-4 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-lg shadow-md transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5">
      <span>{isSaving || isSubmitting ? 'جاري الاعتماد والحفظ...' : 'اعتماد وحفظ الكل 💾'}</span>
    </button>
  ) : (
    <div className="flex items-center gap-2">
      {parseFloat(remaining) > 0 && (
        <button type="button" disabled={isSaving || isSubmitting} onClick={() => {
          const ord = customerOrders[0], payAmt = window.prompt(`أدخل مبلغ الدفعة المراد قبضها لحساب الطلب [${ord?.order_no || ''}]:`, remaining);
          if (payAmt && parseFloat(payAmt) > 0) { setDeposit(String((parseFloat(deposit) || 0) + parseFloat(payAmt))); setTimeout(() => handleSave(false), 60); }
        }} className={`h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${hasReadyOrder ? 'animate-pulse ring-2 ring-emerald-400/50 shadow-emerald-500/30' : ''}`}>
          <span>💵 تسجيل سند قبض</span>
        </button>
      )}
      {onSwitchStep && (
        <button type="button" onClick={() => onSwitchStep(2)} className="h-8 px-3 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white rounded-lg transition cursor-pointer flex items-center gap-1">
          <span>➕ طلب جديد</span>
        </button>
      )}
      <button type="button" onClick={onClose} className="h-8 px-3.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition cursor-pointer">إغلاق ✕</button>
    </div>
  );

  return (
    <Layout
      isOpen={isOpen} onClose={onClose} step={3} onSwitchStep={onSwitchStep}
      title={modalTitle} customerCode={customer?.customer_id || customer?.id}
      extraHeaderLeft={printActions}
      footerRight={footerRightButtons} footerLeft={footerLeftButtons}
    >
      <div className="space-y-2">
        {errorBanner && (
          <div className="p-2.5 rounded-lg bg-rose-950/90 border border-rose-600/80 text-rose-200 text-xs flex items-center justify-between animate-fadeIn shadow-lg">
            <div className="flex items-center gap-2 font-bold"><span className="text-sm">⚠️</span><span>{errorBanner}</span></div>
            <button type="button" onClick={() => setErrorBanner('')} className="text-rose-300 hover:text-white text-xs px-1 cursor-pointer">✕</button>
          </div>
        )}
        {window.CustomerFinancialLedgerBar ? (
          <window.CustomerFinancialLedgerBar
            totalSales={totalSales} handleTotalChange={handleTotalChange}
            totalOrderAmount={totalOrderAmount}
            deposit={deposit} setDeposit={setDeposit}
            delivery={delivery} handleDeliveryChange={handleDeliveryChange}
            deliveryPaymentMode={deliveryPaymentMode} handleModeChange={handleModeChange}
            voucherCurr={voucherCurr} setVoucherCurr={setVoucherCurr}
            payMethod={payMethod} setPayMethod={setPayMethod}
            selectedAccount={selectedAccount} setSelectedAccount={setSelectedAccount}
            remaining={remaining} isReadOnly={isReadOnly}
          />
        ) : null}

        {/* إرفاق السند المالي ومعاينة رقم السند */}
        <div className="p-2 bg-[#F8FAFC] dark:bg-[#0B132B] rounded-xl border border-[#CBD5E1] dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-bold text-[#334155] dark:text-slate-300">📎 إيصال السداد المالي:</span>
            <label className="h-7 px-2.5 bg-white dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-slate-800 text-cyan-700 dark:text-cyan-300 border border-[#CBD5E1] dark:border-slate-700 hover:border-cyan-500/50 rounded-lg text-[10.5px] font-bold flex items-center gap-1.5 cursor-pointer transition">
              <span>{receiptPreview ? 'تغيير صورة الإيصال' : 'اختيار صورة الإيصال 📤'}</span>
              <input type="file" accept="image/*" onChange={handleReceiptUpload} className="hidden" />
            </label>
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
