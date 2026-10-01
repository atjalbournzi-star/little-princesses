// src/features/customers/hooks/useCustomerActions.js
const { useState, useCallback } = React;

function useCustomerActions({
  customers = [], setCustomers, orders = [], products = [],
  showToast, currency = { display: 'YER', symbol: '﷼' }, onSendToFactory
}) {
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── 1. حفظ وتوثيق بيانات العميل الرئيسية ──
  const handleSaveCustomer = useCallback(async (payload) => {
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

    try {
      let apiRes = null;
      try {
        const res = await fetch('/api/crm/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        apiRes = await res.json();
        if (!res.ok || apiRes.success === false) {
          throw new Error(apiRes.error || 'فشل حفظ بيانات العميل');
        }
      } catch (backendErr) {
        if (backendErr.message && backendErr.message.includes('مسجل مسبقاً')) {
          showToast && showToast(backendErr.message, 'error');
          return false;
        }
        if (typeof callGAS === 'function') {
          apiRes = await callGAS('addCustomer', payload);
        }
      }

      const rawRec = (apiRes && (apiRes.data || apiRes.customer)) || {};
     const existingCust = (customers || []).find(c => 
        String(c.customer_id || c.id) === String(custId) || 
        (payload.phone && String(c.phone).trim() === String(payload.phone).trim())
      );

      const newRecord = {
        ...(existingCust || {}),
        ...payload,
        ...rawRec,
        measurements: (rawRec.measurements && rawRec.measurements.length)
          ? rawRec.measurements
          : ((payload.measurements && payload.measurements.length)
              ? payload.measurements
              : (existingCust?.measurements || [])),
        children: (rawRec.children && rawRec.children.length)
          ? rawRec.children
          : ((payload.children && payload.children.length)
              ? payload.children
              : (existingCust?.children || []))
      };
      const finalCustId = newRecord.id || newRecord.customer_id || custId;

      if (typeof setCustomers === 'function') {
        setCustomers(prev => [newRecord, ...(prev || []).filter(c => {
          const cid = c.customer_id || c.id;
          return cid !== finalCustId && cid !== custId && (!payload.phone.trim() || c.phone !== payload.phone.trim());
        })]);
      }

      const depAmt = parseFloat(payload.ledger?.deposit || 0);
      const successMsg = depAmt > 0
        ? `✅ تم حفظ ${payload.name} وقيد دفعة (${depAmt.toLocaleString('en-US')} ${currency.display}) بنجاح`
        : `✅ تم حفظ بيانات ${payload.name} بنجاح`;
      showToast && showToast(successMsg, 'success');
      return newRecord;
    } catch (err) {
      console.error('Save customer fallback:', err);
      const localRecord = { ...payload, id: custId };
      if (typeof setCustomers === 'function') {
        setCustomers(prev => [localRecord, ...(prev || []).filter(c => (c.customer_id || c.id) !== custId && (!payload.phone.trim() || c.phone !== payload.phone.trim()))]);
      }
      showToast && showToast('تم الحفظ محلياً ⚡', 'warning');
      return localRecord;
    } finally { setIsSaving(false); }
  }, [setCustomers, showToast, currency]);

  // ── 2. حفظ وتحديث مقاسات العميل ──
  const handleSaveMeasurements = useCallback(async (targetCust, newMeasurements) => {
    if (!targetCust) return false;
    const cid = targetCust.customer_id || targetCust.id;
    const updatedCustomer = {
      ...targetCust,
      measurements: newMeasurements
    };
    return await handleSaveCustomer(updatedCustomer);
  }, [handleSaveCustomer]);

  // ── 3. حفظ وتحديث كشف الحساب والمدفوعات ──
  const handleSaveLedger = useCallback(async (targetCust, newLedger) => {
    if (!targetCust) return false;
    const updatedCustomer = {
      ...targetCust,
      ledger: newLedger,
      total_sales: newLedger.total_sales,
      total_paid: newLedger.total_paid,
      deposit: newLedger.deposit,
      remaining: newLedger.remaining
    };
    return await handleSaveCustomer(updatedCustomer);
  }, [handleSaveCustomer]);

  // ── 4. حذف أو أرشفة سجل العميل ──
  const handleDeleteCustomer = useCallback(async (customerId, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm('هل أنت متأكد من رغبتك في حذف هذا العميل؟')) return false;
    try {
      await fetch('/api/customers/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, id: customerId })
      });
    } catch (e) {
      console.warn('API delete error, deleting locally:', e);
    }
    if (typeof setCustomers === 'function') {
      setCustomers(prev => (prev || []).filter(c => (c.customer_id || c.id) !== customerId));
    }
    showToast && showToast('تم حذف سجل العميل بنجاح 🗑️', 'info');
    return true;
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
    const newOrdNo = isRepeat ? `ORD-${cid}-${String(cOrders.length + 1).padStart(2, '0')}` : `ORD-${cid}`;
    const mPrice = parseFloat(latestMeas?.adjusted_price || latestMeas?.price || 0);
    const totS = mPrice > 0 ? mPrice : parseFloat(c.ledger?.total_sales ?? c.total_sales ?? 0);
    const prodName = latestMeas?.selected_model || latestMeas?.model_name || 'ساندرلا';

    onSendToFactory({
      customer_id: cid, order_no: newOrdNo,
      customer: c.name || c.customer_name, customer_name: c.name || c.customer_name,
      child_name: latestMeas?.child_name || (c.children?.[0]?.child_name || 'الأميرة'),
      product: prodName, product_name: prodName, measurements: latestMeas, quantity: 1,
      total_amount: totS, paid_amount: 0, remaining_amount: totS,
      currency: currency?.display || 'YER',
      notes: isRepeat ? `أمر تفصيل مكرر (${cOrders.length + 1}) - العميلة: ${c.name}` : `أمر تفصيل للعميلة: ${c.name}`
    });
    showToast && showToast(`✨ تم إعداد أمر تشغيل ${isRepeat ? 'مكرر جديد' : 'جديد'} (${newOrdNo}) ونقله للمعمل ✂️🧵`, 'success');
  }, [onSendToFactory, orders, currency, showToast]);

  return {
    loading,
    isSaving,
    handleSaveCustomer,
    handleSaveMeasurements,
    handleSaveLedger,
    handleDeleteCustomer,
    handleOpenDressCard,
    handleSendWhatsAppDressCard,
    handleDispatchToFactory
  };
}

window.useCustomerActions = useCustomerActions;
