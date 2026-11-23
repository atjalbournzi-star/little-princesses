// src/features/customers/hooks/useCustomerActions.js
const { useState, useCallback } = React;

function useCustomerActions({
  customers = [], setCustomers, orders = [], products = [],
  showToast, currency = { display: 'YER', symbol: '﷼' }, onSendToFactory
}) {
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── 1. حفظ وتوثيق بيانات العميل الرئيسية ──
  const handleSaveCustomer = useCallback(async (payload, options = {}) => {
    if (!payload.name || !payload.name.trim()) {
      showToast && showToast('اسم العميل مطلوب ⚠️', 'error');
      return false;
    }
    if (!payload.phone || !payload.phone.trim()) {
      showToast && showToast('رقم الهاتف مطلوب ⚠️', 'error');
      return false;
    }
    setIsSaving(true);
    const custId = payload.customer_id || payload.id;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const res = await fetch('/api/crm/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const apiRes = await res.json();
      if (!res.ok || apiRes.success === false) {
        throw new Error(apiRes.error || 'فشل حفظ بيانات العميل في السيرفر');
      }

      const rawRec = (apiRes && (apiRes.data || apiRes.customer)) || {};
      const existingCust = (customers || []).find(c => String(c.customer_id || c.id) === String(custId) || (payload.phone && String(c.phone).trim() === String(payload.phone).trim()));

      const newRecord = {
        ...(existingCust || {}), ...payload, ...rawRec,
        measurements: (rawRec.measurements?.length ? rawRec.measurements : (payload.measurements?.length ? payload.measurements : (existingCust?.measurements || []))),
        children: (rawRec.children?.length ? rawRec.children : (payload.children?.length ? payload.children : (existingCust?.children || [])))
      };
      const finalCustId = newRecord.id || newRecord.customer_id || custId;

      if (typeof setCustomers === 'function') {
        setCustomers(prev => [newRecord, ...(prev || []).filter(c => {
          const cid = c.customer_id || c.id;
          return cid !== finalCustId && cid !== custId && (!payload.phone?.trim() || c.phone !== payload.phone.trim());
        })]);
      }
      const isConfirmed = Boolean(payload.confirm_order || payload.isDraftOrder || rawRec.latest_order_no || rawRec.order_no);
      if (isConfirmed) {
        window.dispatchEvent(new CustomEvent('erp:ordersChanged'));
      }
      const depAmt = parseFloat(payload.ledger?.deposit || payload.deposit || 0);
      const vNo = options?.voucherNo || payload.ledger?.latest_voucher_no || rawRec.latest_voucher_no || '';
      const cName = payload.name || payload.customer_name || 'العميل';
      const currSym = currency?.symbol || currency?.code || (currency?.display ? currency.display.split(' ')[0] : 'YER');
      const successMsg = (depAmt > 0 && vNo)
        ? `✅ تم حفظ بيانات ${cName}، اعتماد سند القبض (${vNo})، وقيد العربون بنجاح ✨`
        : (depAmt > 0
            ? `✅ تم حفظ بيانات ${cName} وقيد دفعة (${depAmt.toLocaleString('en-US')} ${currSym}) بنجاح ✨`
            : `✅ تم حفظ بيانات ${cName} بنجاح ✨`);
      if (!options?.silent) {
        showToast && showToast(successMsg, 'success');
      }
      return newRecord;
    } catch (err) {
      console.error('Save customer error:', err);
      const errMsg = err?.name === 'AbortError'
        ? 'انتهت مهلة انتظار السيرفر (90 ثانية) ⚠️ المعاملة قد تكون اكتملت بنجاح في السيرفر، يرجى تحديث الصفحة/الجدول للتأكد قبل إعادة الإرسال منعاً للتكرار!'
        : (err.message || 'فشل حفظ بيانات العميل في السيرفر ⚠️');
      showToast && showToast(errMsg, 'error');
      if (options?.throwOnError) throw err;
      return false;
    } finally {
      clearTimeout(timeoutId);
      setIsSaving(false);
    }
  }, [setCustomers, showToast, currency]);

  // ── 2. حفظ وتحديث مقاسات العميل فقط دون إنشاء طلب ──
  const handleSaveMeasurements = useCallback(async (targetCust, newMeasurements, options = {}) => {
    if (!targetCust) return false;
    const updatedCustomer = { ...targetCust, measurements: newMeasurements, confirm_order: false, save_mode: 'measurements_only' };
    return await handleSaveCustomer(updatedCustomer, options);
  }, [handleSaveCustomer]);

  // ── 3. حفظ الحساب المالي واعتماد الطلب وسند العربون ──
  const handleSaveLedger = useCallback(async (targetCust, newLedger, options = {}) => {
    if (!targetCust) return false;
    const shouldConfirm = options?.confirmOrder || newLedger?.confirm_order || targetCust?.isDraftOrder;
    const updatedCustomer = {
      ...targetCust, ledger: newLedger, confirm_order: Boolean(shouldConfirm),
      delivery_date: newLedger.delivery_date || targetCust.delivery_date, event_date: newLedger.event_date || targetCust.event_date,
      child_id: newLedger.child_id || targetCust.child_id, child_name: newLedger.child_name || targetCust.child_name,
      total_sales: newLedger.total_sales, subtotal: newLedger.subtotal !== undefined ? newLedger.subtotal : newLedger.total_sales,
      total_paid: newLedger.total_paid, deposit: newLedger.deposit,
      delivery_fee: newLedger.delivery_fee !== undefined ? newLedger.delivery_fee : newLedger.delivery,
      delivery_payment_mode: newLedger.delivery_payment_mode, remaining: newLedger.remaining
    };
    return await handleSaveCustomer(updatedCustomer, { throwOnError: true, ...options });
  }, [handleSaveCustomer]);

  // ── 4. حذف أو أرشفة سجل العميل ──
  const handleDeleteCustomer = useCallback(async (customerId, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm('هل أنت متأكد من رغبتك في حذف هذا العميل؟')) return false;
    try {
      const res = await fetch('/api/customers/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, id: customerId })
      });
      const d = await res.json();
      if (!res.ok || d.success === false) throw new Error(d.error || 'فشل حذف سجل العميل');
      if (typeof setCustomers === 'function') {
        setCustomers(prev => (prev || []).filter(c => (c.customer_id || c.id) !== customerId));
      }
      showToast && showToast('تم حذف سجل العميل بنجاح 🗑️', 'info');
      return true;
    } catch (e) {
      console.error('API delete error:', e);
      showToast && showToast(e.message || 'تعذر حذف العميل من السيرفر', 'error');
      return false;
    }
  }, [setCustomers, showToast]);

  // ── 5. فتح كرت فستان الأميرة الفاخر في نافذة جديدة ──
  const handleOpenDressCard = useCallback((c) => {
    const cId = String(c.id || c.customer_id || '');
    const cName = String(c.name || c.customer_name || '').trim();
    const custOrder = (orders || []).find(o => 
      (o.customer_id && String(o.customer_id) === cId) ||
      (o.customer_name && String(o.customer_name).trim() === cName)
    );
    const orderNo = custOrder ? (custOrder.order_no || ('ORD-' + custOrder.id)) : (c.customer_id || 'ORD-' + (c.id || 'CUST'));
    const url = `/dress_card.html?order=${encodeURIComponent(orderNo)}`;
    window.open(url, '_blank');
  }, [orders]);

  // ── 6. إرسال كرت الفستان والوثيقة الملكية عبر واتساب ──
  const handleSendWhatsAppDressCard = useCallback((c) => {
    const cId = String(c.id || c.customer_id || '');
    const cName = String(c.name || c.customer_name || '').trim();
    const custOrder = (orders || []).find(o => 
      (o.customer_id && String(o.customer_id) === cId) ||
      (o.customer_name && String(o.customer_name).trim() === cName)
    );
    const orderNo = custOrder ? (custOrder.order_no || ('ORD-' + custOrder.id)) : (c.customer_id || 'ORD-' + (c.id || 'CUST'));
    const origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : 'http://localhost:5000';
    const dressCardUrl = `${origin}/dress_card.html?order=${encodeURIComponent(orderNo)}`;
    const trackingUrl = `${origin}/track.html?order=${encodeURIComponent(orderNo)}`;
    const childName = custOrder?.child_name || c.measurements?.[0]?.child_name || c.children?.[0]?.child_name || 'الأميرة الجميلة';
    const model = custOrder?.product_name || c.measurements?.[0]?.model_name || c.measurements?.[0]?.selected_model || 'فستان مناسبات ملكي فاخر';
    const rem = custOrder?.remaining || c.ledger?.remaining || 0;

    const brandName = (typeof window !== 'undefined' && window.BrandService)
      ? window.BrandService.getProfile().name
      : 'ليتل برنسيس للأزياء الفاخرة';

    const msg = `👑 *${brandName}* 👑\nأهلاً وسهلاً بكِ عزيزتنا *${cName}* 🌸✨\nيسعدنا مشاركتكِ وثيقة الحجز وكرت الفستان المعتمد لأميرتنا *${childName}* ✅\n\n👗 *الموديل:* ${model}\n📋 *رقم الطلب:* ${orderNo}\n💰 *المتبقي للحساب:* ${rem} ${currency.display}\n\n🖼️ *معاينة وتحميل كرت الفستان الفاخر:* \n${dressCardUrl}\n\n📱 *بوابة تتبع الفستان والبروفة للجوال:* \n${trackingUrl}\n\nنسعد دائماً بخدمتكم وتألق أميرتكم بأجمل إطلالة! 🎀👑✨`;

    let phone = c.phone ? String(c.phone).replace(/\D/g, '') : '';
    if (phone.startsWith('0')) phone = '967' + phone.substring(1);
    else if (!phone.startsWith('967') && !phone.startsWith('966') && phone.length > 0) phone = '967' + phone;

    const waUrl = phone 
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(waUrl, '_blank');
  }, [orders, currency]);

  // ── 7. توجيه أمر التشغيل والقص إلى المعمل ──
  const handleDispatchToFactory = useCallback((c) => {
    if (typeof onSendToFactory !== 'function') return;
    const latestMeas = (c.measurements && c.measurements.length > 0) ? c.measurements[0] : null;
    const cid = c.customer_id || c.id || 'CUST';
    const cOrders = (orders || []).filter(o => (o.customer_id && String(o.customer_id) === String(cid)) || (o.customer_name && o.customer_name === (c.name || c.customer_name)));
    const isRepeat = cOrders.length > 0;
    const dStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const todaySeq = (orders || []).filter(o => o.order_no?.startsWith(`ORD-${dStr.slice(0, 4)}-${dStr.slice(4, 8)}-`)).length + 1;
    const newOrdNo = `ORD-${dStr.slice(0, 4)}-${dStr.slice(4, 8)}-${String(todaySeq).padStart(2, '0')}`;
    const mPrice = parseFloat(latestMeas?.adjusted_price || latestMeas?.price || 0);
    const totS = mPrice > 0 ? mPrice : parseFloat(c.ledger?.total_sales ?? c.total_sales ?? 0);
    const prodName = latestMeas?.selected_model || latestMeas?.model_name || 'ساندرلا';

    onSendToFactory({
      customer_id: cid, order_no: newOrdNo, customer: c.name || c.customer_name, customer_name: c.name || c.customer_name,
      child_name: latestMeas?.child_name || (c.children?.[0]?.child_name || 'الأميرة'),
      product: prodName, product_name: prodName, measurements: latestMeas, quantity: 1,
      total_amount: totS, paid_amount: 0, remaining_amount: totS, currency: currency?.display || 'YER',
      notes: isRepeat ? `أمر تفصيل مكرر (${cOrders.length + 1}) - العميل: ${c.name}` : `أمر تفصيل للعميل: ${c.name}`
    });
    showToast && showToast(`✨ تم إعداد أمر تشغيل جديد (${newOrdNo}) ونقله للمعمل ✂️🧵`, 'success');
  }, [onSendToFactory, orders, currency, showToast]);

  return {
    loading, isSaving, handleSaveCustomer, handleSaveMeasurements,
    handleSaveLedger, handleDeleteCustomer, handleOpenDressCard,
    handleSendWhatsAppDressCard, handleDispatchToFactory
  };
}

window.useCustomerActions = useCustomerActions;
