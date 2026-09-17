const { useState, useEffect, useMemo, useCallback, useRef } = React;

function Orders({ orders = [], setOrders, customers = [], products = [], campaigns = [], showToast, currency }) {
  const currencyDisplay = (currency?.display || "YER ريال");

  // ── مساعد لاستخراج اسم العميلة بغض النظر عن اسم العمود في الشيت ──
  const getCustomerName = (c) =>
    c.name || c["اسم العميلة"] || c["اسم العميل"] || c.customer_name ||
    c.Name || c.CLIENT_NAME || "";

  // ── حالات النموذج ──
  const [customerName, setCustomerName] = useState("");
  const [childName, setChildName]       = useState("");
  const [productName, setProductName]   = useState("");
  const [qty, setQty]                   = useState("1");
  const [total, setTotal]               = useState("");
  const [paid, setPaid]                 = useState("");
  const [orderDate, setOrderDate]       = useState(TODAY_STR_ISO);
  const [deliveryDate, setDeliveryDate] = useState(TODAY_STR_ISO);
  const [campaignId, setCampaignId]     = useState("");
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");

  // ── وضع التعديل ──
  const [isEditing, setIsEditing]           = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  
  // Print Modal State
  const [printModalData, setPrintModalData] = useState(null);
  const [printTemplate, setPrintTemplate] = useState('thermal');

  // Delivery Modal State
  const [deliveryModalOrder, setDeliveryModalOrder] = useState(null);
  const [deliveryForm, setDeliveryForm] = useState({
    amount_collected: '',
    discount: '0',
    account_id: 'ACC-101',
    payment_method: 'نقد (كاش)',
    notes: ''
  });
  const [submittingDelivery, setSubmittingDelivery] = useState(false);
  const [deliverySuccessData, setDeliverySuccessData] = useState(null);

  // Scan-to-Deliver Modal State
  const [scanDeliverModalOpen, setScanDeliverModalOpen] = useState(false);
  const [scanCodeInput, setScanCodeInput] = useState('');
  const [scannedOrder, setScannedOrder] = useState(null);
  const [scanCollectRemaining, setScanCollectRemaining] = useState(true);
  const [scanDeliveryLoading, setScanDeliveryLoading] = useState(false);

  // Alteration Modal State
  const [alterationModalOrder, setAlterationModalOrder] = useState(null);
  const [alterationForm, setAlterationForm] = useState({
    reason: 'مقاس غير مضبوط (ضيق/واسع)',
    notes: '',
    severity: 'normal',
    target_date: TODAY_STR_ISO,
    assigned_tailor: ''
  });
  const [submittingAlteration, setSubmittingAlteration] = useState(false);

  // ── نمط العرض: كاشير لمسي سريع أم أرشيف الطلبيات ──
  const [activeMode, setActiveMode] = useState('pos'); // 'pos' | 'archive'

  // ── حالات كاشير ونقاط البيع السريعة (POS Touch & Barcode Register) ──
  const [cart, setCart] = useState([]);
  const [posCategory, setPosCategory] = useState('الكل');
  const [posSearch, setPosSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [posCustomerName, setPosCustomerName] = useState('عميل عام / زائر صالة العرض');
  const [posChildName, setPosChildName] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState('نقد (كاش)');
  const [posDiscount, setPosDiscount] = useState('0');
  const [posCashReceived, setPosCashReceived] = useState('');
  const [isSubmittingPOS, setIsSubmittingPOS] = useState(false);
  const barcodeInputRef = useRef(null);

  // Quick Quote State
  const [quoteText, setQuoteText] = useState('');
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);

  // ── حالة نافذة رسائل اعتماد الحجز للأم عبر المنصات (واتساب، انستغرام، تيك توك) ──
  const [customerMessageModalData, setCustomerMessageModalData] = useState(null);

  // ── الحساب اللحظي للمتبقي (Math Balance Engine) ──
  const totalNum     = Math.max(0, parseFloat(total) || 0);
  const paidNum      = Math.max(0, parseFloat(paid)  || 0);
  const remainingNum = Math.max(0, totalNum - paidNum);

  // ── الربط التسلسلي: عملاء → أطفال ──
  const selectedCustomer  = (customers || []).find(
    c => (getCustomerName(c) || "").trim() === (customerName || "").trim()
  );
  const availableChildren = selectedCustomer?.measurements || [];

  // ── جلب السعر تلقائياً عند تغيير الموديل أو الطفلة ──
  useEffect(() => {
    if (isEditing) return;
    const selP = (products || []).find(p => p.name === productName);
    if (!selP) return;

    let targetPrice = parseFloat(selP.sell_price) || 0;

    if (childName && availableChildren.length > 0) {
      const child = availableChildren.find(c => c.child_name === childName);
      if (child && child.estimated_age && selP.price_matrix) {
        const bracketPrice = selP.price_matrix[child.estimated_age];
        if (bracketPrice) targetPrice = parseFloat(bracketPrice) || targetPrice;
      }
    }
    if (targetPrice > 0) setTotal(targetPrice.toString());
  }, [productName, childName]);

  // ── جلب تاريخ التسليم تلقائياً من سجل مقاسات الطفلة ──
  useEffect(() => {
    if (isEditing) return;
    if (!childName || !availableChildren.length) return;
    const child = availableChildren.find(c => c.child_name === childName);
    if (child && child.event_date) {
      const d = child.event_date.toString().split("T")[0];
      if (d && d.length === 10) setDeliveryDate(d);
    }
  }, [childName]);

  // ── إعادة ضبط النموذج ──
  const resetForm = () => {
    setCustomerName(""); setChildName(""); setProductName("");
    setQty("1"); setTotal(""); setPaid("");
    setOrderDate(TODAY_STR_ISO); setDeliveryDate(TODAY_STR_ISO);
    setCampaignId("");
    setIsEditing(false); setEditingOrderId(null);
  };

  // ── حفظ / تحديث الفاتورة ──
  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (!customerName) return showToast("يرجى اختيار العميلة أولاً ⚠️", "error");
    if (!productName)  return showToast("يرجى اختيار الموديل أولاً ⚠️", "error");

    const tot = Math.max(0, parseFloat(total) || 0);
    const pd  = Math.max(0, parseFloat(paid)  || 0);
    const rem = Math.max(0, tot - pd);

    if (isEditing) {
      const updatedOrd = {
        id:            editingOrderId,
        customer_name: customerName,
        child_name:    childName,
        product_name:  productName,
        qty:           parseInt(qty || 1),
        order_date:    orderDate,
        delivery_date: deliveryDate,
        total:         tot,
        paid:          pd,
        remaining:     rem,
        campaign_id:   campaignId,
        currency:      currencyDisplay
      };

      setOrders && setOrders(
        orders.map(o => o.id === editingOrderId ? { ...o, ...updatedOrd } : o)
      );

      try {
        if (window.salesAPI && window.salesAPI.updateOrder) {
          await window.salesAPI.updateOrder(editingOrderId, updatedOrd);
        } else {
          await fetch('/api/sales/orders/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedOrd)
          });
        }
        showToast("تم تحديث الفاتورة في سوبابيز بنجاح 💾", "success");
      } catch {
        showToast("تم الحفظ محلياً ☁️");
      }
      resetForm();

    } else {
      const newId  = Date.now();
      const ordNo  = `ORD-${newId.toString().slice(-4)}`;
      const ordCurrCode = window.CurrencyService ? window.CurrencyService.normalizeCode(currencyDisplay) : 'YER';
      const ordRate = window.CurrencyService ? window.CurrencyService.getRate(ordCurrCode) : 1.0;
      const baseTotalObj = window.CurrencyService ? window.CurrencyService.toBase(tot, ordCurrCode, ordRate) : { base_amount: tot, exchange_rate: ordRate };
      const basePaidObj = window.CurrencyService ? window.CurrencyService.toBase(pd, ordCurrCode, ordRate) : { base_amount: pd, exchange_rate: ordRate };

      const newOrd = {
        id:            newId,
        order_no:      ordNo,
        customer_name: customerName,
        child_name:    childName,
        product_name:  productName,
        qty:           parseInt(qty || 1),
        order_date:    orderDate,
        delivery_date: deliveryDate,
        total:         tot,
        paid:          pd,
        remaining:     rem,
        currency:      ordCurrCode,
        exchange_rate: ordRate,
        base_total:    baseTotalObj.base_amount,
        base_paid:     basePaidObj.base_amount,
        campaign_id:   campaignId,
        status:        "قيد الخياطة 🪡"
      };

      setOrders && setOrders([newOrd, ...(orders || [])]);

      try {
        let msg = "تم إصدار وحفظ الفاتورة وتوليد QR Code سحابياً ☁️📄";
        if (window.salesAPI && window.salesAPI.createOrder) {
          const res = await window.salesAPI.createOrder(newOrd);
          if (res && res.message) msg = res.message;
        } else {
          await callGAS("addOrder", newOrd);
        }
        showToast(msg);
        openCustomerMessageModal(newOrd);
      } catch (err) {
        showToast(err.message || "تم الحفظ محلياً 📄");
        openCustomerMessageModal(newOrd);
      }
      resetForm();
    }
  };

  // ── فتح وضع التعديل ──
  const handleEdit = (order) => {
    let custName = order.customer_name || "";
    let chName   = order.child_name   || "";

    if (!chName && custName.includes("(") && custName.endsWith(")")) {
      const m = custName.match(/^(.*)\s+\((.*)\)$/);
      if (m) { custName = m[1].trim(); chName = m[2].trim(); }
    }

    const fmt = d => d ? d.toString().split("T")[0] : TODAY_STR_ISO;

    setCustomerName(custName);
    setChildName(chName);
    setProductName(order.product_name || "");
    setQty(String(order.qty || "1"));
    setTotal(String(order.total || "0"));
    setPaid(String(order.paid  || "0"));
    setOrderDate(fmt(order.order_date));
    setDeliveryDate(fmt(order.delivery_date));
    setIsEditing(true);
    setEditingOrderId(order.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── تحديث حالة الطلب ──
  const handleUpdateStatus = async (orderId, newStatus) => {
    setOrders && setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus, production_status: newStatus } : o));
    try {
      if (window.salesAPI && window.salesAPI.updateOrder) {
        await window.salesAPI.updateOrder(orderId, { status: newStatus, production_status: newStatus });
      } else {
        await fetch('/api/sales/orders/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: orderId, status: newStatus, production_status: newStatus })
        });
      }
      showToast("تم تحديث الحالة في سوبابيز بنجاح 🔄", "success");
    } catch { showToast("خطأ في التحديث", "error"); }
  };

  // ── حذف طلب ──
  const handleDelete = async (orderId) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟ 🗑️")) return;
    setOrders && setOrders(orders.filter(o => o.id !== orderId));
    try {
      if (window.salesAPI && window.salesAPI.deleteOrder) {
        await window.salesAPI.deleteOrder(orderId);
      } else {
        await callGAS("deleteOrder", { id: orderId });
      }
      showToast("تم الحذف 🗑️");
    } catch { showToast("خطأ في الحذف", "error"); }
  };

  // ── دورة التسليم النهائي والتحصيل وقيد الخزينة المزدوج ──
  const handleOpenDeliveryModal = (order) => {
    const tot = parseFloat(order.total ?? order.total_amount ?? 0);
    const pd = parseFloat(order.paid ?? order.paid_amount ?? 0);
    const rem = Math.max(0, tot - pd);
    setDeliveryForm({
      amount_collected: String(rem),
      discount: '0',
      account_id: 'ACC-101',
      payment_method: 'نقد (كاش)',
      notes: ''
    });
    setDeliverySuccessData(null);
    setDeliveryModalOrder({
      ...order,
      resolvedTotal: tot,
      resolvedPaid: pd,
      resolvedRemaining: rem
    });
  };

  const handleConfirmDelivery = async () => {
    if (!deliveryModalOrder) return;
    setSubmittingDelivery(true);
    const orderNo = deliveryModalOrder.order_no || deliveryModalOrder.id;
    const amt = parseFloat(deliveryForm.amount_collected || 0);
    const disc = parseFloat(deliveryForm.discount || 0);

    try {
      const res = await fetch('/api/sales/orders/deliver-and-settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderNo,
          amount_collected: amt,
          discount: disc,
          account_id: deliveryForm.account_id,
          payment_method: deliveryForm.payment_method,
          notes: deliveryForm.notes
        })
      }).then(r => r.json());

      if (res.success) {
        showToast(res.message || 'تم تسليم الفستان والتحصيل بنجاح 👑🎉', 'success');
        setOrders && setOrders(orders.map(o => (o.order_no === orderNo || o.id === orderNo) ? {
          ...o,
          status: 'تم التسليم ✅',
          production_status: 'Delivered',
          paid: (parseFloat(o.paid || 0) + amt),
          paid_amount: (parseFloat(o.paid_amount || 0) + amt),
          remaining: Math.max(0, (parseFloat(o.total || o.total_amount || 0) - disc) - (parseFloat(o.paid || o.paid_amount || 0) + amt))
        } : o));
        setDeliverySuccessData(res.data || { order_no: orderNo, collected_amount: amt });
      } else {
        showToast(res.error || 'فشلت عملية التسليم والتحصيل ❌', 'error');
      }
    } catch (err) {
      showToast('خطأ أثناء التسليم: ' + err.message, 'error');
    } finally {
      setSubmittingDelivery(false);
    }
  };

  const sendWhatsAppDeliveryGreeting = (data) => {
    const cName = data?.customer_name || deliveryModalOrder?.customer_name || 'العميلة الكريمة';
    const chName = data?.child_name || deliveryModalOrder?.child_name || 'الأميرة';
    const pName = data?.product_name || deliveryModalOrder?.product_name || 'فستان الأميرات الفاخر';
    const orderNo = data?.order_no || deliveryModalOrder?.order_no || deliveryModalOrder?.id;
    const paidAmt = parseFloat(deliveryForm?.amount_collected || 0);

    const msg = `👑 *ليتل برنسيس للأزياء الفاخرة* 👑\n\nألف مبارك استلام الفستان الملكي لأميرتنا الجميلة *${chName}*! 🌸✨\n\n👗 *الموديل:* ${pName}\n📋 *رقم الطلب:* ${orderNo}\n${paidAmt > 0 ? `💰 *المبلغ المحصل عند التسليم:* ${paidAmt.toLocaleString()} ر.ي\n` : ''}✅ *حالة الطلب:* تم التسليم بالكامل وبأعلى معايير الجودة الملكية.\n\nنتمنى لأميرتنا الصغيرة إطلالة ساحرة تملأ قلوبكم بهجة وسعادة! نسعد دائماً بخدمتكم وتجدد لقائكم معنا 💖👑`;

    const cust = customers.find(c => (c.name && cName.includes(c.name)) || (cName && c.name && cName.includes(c.name)));
    const phone = (cust?.phone || cust?.['رقم الهاتف'] || '').replace(/[^0-9]/g, '');
    const waUrl = phone 
      ? `https://api.whatsapp.com/send?phone=${phone.startsWith('0') ? '967' + phone.substring(1) : (phone.startsWith('967') ? phone : '967' + phone)}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  // ── محرك التسليم السريع بالمسح (Scan to Deliver Engine) ──
  const handleSearchScannedOrder = (code) => {
    const q = (code || scanCodeInput || '').trim().toLowerCase();
    if (!q) return;
    const found = (orders || []).find(o => 
      (o.order_no && o.order_no.toLowerCase() === q) ||
      (o.id && String(o.id).toLowerCase() === q) ||
      (o.barcode && o.barcode.toLowerCase() === q) ||
      (o.sku && o.sku.toLowerCase() === q) ||
      (o.tracking_number && o.tracking_number.toLowerCase() === q)
    );
    if (found) {
      setScannedOrder(found);
      showToast(`تم التعرف على الطلب: ${found.order_no || ('ORD-' + found.id)} 🎯`);
    } else {
      showToast(`لم يتم العثور على طلب بالرمز: ${q} ⚠️`, 'error');
    }
  };

  const handleConfirmScanDelivery = async () => {
    if (!scannedOrder) return;
    setScanDeliveryLoading(true);
    try {
      const orderNo = scannedOrder.order_no || scannedOrder.id;
      const rem = Math.max(0, (parseFloat(scannedOrder.total ?? scannedOrder.total_amount) || 0) - (parseFloat(scannedOrder.paid ?? scannedOrder.paid_amount) || 0));
      const collectAmt = scanCollectRemaining ? rem : 0;

      const res = await fetch('/api/sales/scan-to-deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scan_code: orderNo,
          order_id: scannedOrder.id,
          amount_collected: collectAmt,
          account_id: 'ACC-101',
          payment_method: 'نقد (كاش)',
          notes: 'تسليم فوري بالباركود (Scan to Deliver)'
        })
      }).then(r => r.json());

      if (res.success) {
        showToast(res.message || 'تم تسليم الطلب وترحيله بنجاح 👑🎉', 'success');
        setOrders && setOrders(orders.map(o => (o.id === scannedOrder.id || o.order_no === orderNo) ? {
          ...o,
          status: 'تم التسليم ✅',
          production_status: 'Delivered',
          paid: (parseFloat(o.paid || 0) + collectAmt),
          remaining: Math.max(0, rem - collectAmt)
        } : o));
        window.dispatchEvent(new CustomEvent('erp:ordersChanged'));
        setScannedOrder(null);
        setScanCodeInput('');
        setScanDeliverModalOpen(false);
      } else {
        showToast(res.error || 'فشلت عملية التسليم ❌', 'error');
      }
    } catch (e) {
      showToast('خطأ أثناء التسليم: ' + e.message, 'error');
    } finally {
      setScanDeliveryLoading(false);
    }
  };

  // ── حفظ تذكرة تعديل البروفة (Fitting Alteration Ticket) ──
  const handleSaveAlteration = async (e) => {
    if (e) e.preventDefault();
    if (!alterationModalOrder) return;
    setSubmittingAlteration(true);
    try {
      const payload = {
        order_id: alterationModalOrder.id,
        order_no: alterationModalOrder.order_no || `ORD-${alterationModalOrder.id}`,
        customer_name: alterationModalOrder.customer_name || 'عميلة',
        dress_type: alterationModalOrder.product_name || 'فستان',
        alteration_reason: alterationForm.reason,
        adjustment_notes: alterationForm.notes,
        severity: alterationForm.severity,
        target_date: alterationForm.target_date,
        assigned_tailor: alterationForm.assigned_tailor
      };
      const res = await fetch('/api/alterations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        showToast(res.message || 'تم قيد تذكرة تعديل البروفة بنجاح ✂️👗', 'success');
        window.dispatchEvent(new CustomEvent('erp:alterationChanged'));
        setAlterationModalOrder(null);
      } else {
        showToast(res.error || 'فشل حفظ تذكرة التعديل ❌', 'error');
      }
    } catch (err) {
      showToast('خطأ: ' + err.message, 'error');
    } finally {
      setSubmittingAlteration(false);
    }
  };

  // ── بناء محرك صياغة الرسالة الملكية للأم عبر المنصات المتعددة ──
  const buildRoyalCustomerConfirmation = (order) => {
    const cust = (customers || []).find(c => getCustomerName(c) === order.customer_name);
    const childMeas = cust?.measurements?.find(m => m.child_name === order.child_name) || cust?.measurements?.[0];
    const prod = (products || []).find(p => (order.product_id && (p.id === order.product_id || p.product_id === order.product_id)) || p.name === order.product_name || p.model_name === order.product_name);
    
    const brandName = (typeof window !== 'undefined' && window.BrandService)
      ? window.BrandService.getProfile().name
      : 'دار أميرات الصغار للأزياء الفاخرة';
      
    const tot = parseFloat(order.total ?? order.total_amount ?? 0);
    const pd  = parseFloat(order.paid ?? order.paid_amount ?? 0);
    const rem = Math.max(0, tot - pd);
    const cur = order.currency || currencyDisplay;
    
    const chName = (order.child_name && String(order.child_name).trim()) ? order.child_name : (childMeas?.child_name || 'الأميرة');
    const motherName = cust?.name || cust?.customer_name || order.customer_name || 'عزيزتنا الأم';
    const deliveryDateFormatted = order.delivery_date ? String(order.delivery_date).split('T')[0] : 'يحدد لاحقاً مع المشغل';
    
    let measLines = [];
    if (childMeas) {
      const u = childMeas.unit || 'سم';
      if (childMeas.estimated_age) measLines.push(`  • الفئة العمرية: ${childMeas.estimated_age}`);
      if (childMeas.dress_length)  measLines.push(`  • طول الفستان: ${childMeas.dress_length} ${u}`);
      if (childMeas.chest)         measLines.push(`  • محيط الصدر: ${childMeas.chest} ${u}`);
      if (childMeas.waist)         measLines.push(`  • محيط الخصر: ${childMeas.waist} ${u}`);
      if (childMeas.shoulder)      measLines.push(`  • عرض الكتف: ${childMeas.shoulder} ${u}`);
      if (childMeas.notes)         measLines.push(`  • تفضيلات خاصة: ${childMeas.notes}`);
    } else if (order.age_bracket || order.size) {
      measLines.push(`  • المقاس المعتمد: ${order.age_bracket || order.size}`);
    }

    const measSection = measLines.length > 0 
      ? `\n📏 *المواصفات والمقاسات المعتمدة للأميرة:* \n${measLines.join('\n')}\n`
      : '';

    const imgUrl = prod?.image_url || prod?.image || order.image_url;
    const imgSection = imgUrl ? `\n🖼️ *معاينة صورة الموديل:* ${imgUrl}\n` : '';

    const orderIdentifier = order.order_no || ('ORD-' + order.id);
    const trackingUrl = (typeof window !== 'undefined' && window.location)
      ? `${window.location.origin}/track.html?order=${encodeURIComponent(orderIdentifier)}`
      : `http://localhost:5000/track.html?order=${encodeURIComponent(orderIdentifier)}`;

    const dressCardUrl = (typeof window !== 'undefined' && window.location)
      ? `${window.location.origin}/dress_card.html?order=${encodeURIComponent(orderIdentifier)}`
      : `http://localhost:5000/dress_card.html?order=${encodeURIComponent(orderIdentifier)}`;

    const msg = `👑 *${brandName}* 👑\n\n` +
      `أهلاً وسهلاً بكِ عزيزتنا *${motherName}* 🌸✨\n` +
      `تم بحمد الله اعتماد وتأكيد حجز تفصيل الفستان لأميرتنا الجميلة *${chName}* بنجاح ✅\n\n` +
      `👗 *الموديل المختار:* ${order.product_name || prod?.name || "موديل راقي خاص"}\n` +
      `📋 *رقم الطلب:* ${orderIdentifier}\n` +
      imgSection +
      measSection +
      `\n💰 *البيان المالي للحجز:* \n` +
      `  • المبلغ الإجمالي: ${tot.toLocaleString("en-US")} ${cur}\n` +
      `  • المبلغ الموصل (العربون): ${pd.toLocaleString("en-US")} ${cur}\n` +
      `  • المبلغ المتبقي عند الاستلام: ${rem.toLocaleString("en-US")} ${cur}\n\n` +
      `📅 *موعد التسليم والبروفة:* ${deliveryDateFormatted}\n\n` +
      `🖼️ *معاينة كرت الفستان الفاخر والتحميل (صورة وبطاقة معتمدة):* \n${dressCardUrl}\n\n` +
      `🔗 *بوابة تتبع مراحل الفستان وتأكيد البروفة للجوال:* \n${trackingUrl}\n\n` +
      `نعتني بأدق تفاصيل الخياطة الملكية واللمسات الفاخرة لتتألق أميرتك بأجمل إطلالة تليق بها! 🎀👑✨\n` +
      `نسعد دائماً بخدمتكم وتواصلكم معنا 💖`;

    return {
      msg,
      trackingUrl,
      dressCardUrl,
      motherName,
      chName,
      tot,
      pd,
      rem,
      cur,
      deliveryDateFormatted,
      imgUrl,
      phone: cust?.phone || cust?.['رقم الهاتف'] || '',
      platform: cust?.platform || cust?.social_platform || 'واتساب',
      platformAccount: cust?.account_handle || cust?.username || cust?.social_id || '',
      order,
      cust,
      prod,
      childMeas
    };
  };

  // ── فتح نافذة رسائل اعتماد الطلب للأم ──
  const openCustomerMessageModal = (order) => {
    const data = buildRoyalCustomerConfirmation(order);
    setCustomerMessageModalData(data);
  };

  // ── إرسال واتساب ──
  const sendWhatsAppInvoice = (order) => {
    openCustomerMessageModal(order);
  };

  // ── فتح نافذة الطباعة المتقدمة (Print Engine) ──
  const openPrintModal = (order, template = 'thermal') => {
    const cust = (customers || []).find(c => getCustomerName(c) === order.customer_name);
    const childMeas = cust?.measurements?.find(m => m.child_name === order.child_name) || cust?.measurements?.[0];
    const tot = parseFloat(order.total ?? order.total_amount ?? 0);
    const pd = parseFloat(order.paid ?? order.paid_amount ?? 0);
    const rem = Math.max(0, tot - pd);
    const prod = (products || []).find(p => (order.product_id && (p.id === order.product_id || p.product_id === order.product_id)) || p.name === order.product_name || p.model_name === order.product_name);
    setPrintTemplate(template);
    setPrintModalData({
      order: {
        ...order,
        total: tot,
        paid: pd,
        remaining: rem,
        child_name: (order.child_name && String(order.child_name).trim()) ? order.child_name : (childMeas?.child_name || 'الأميرة'),
        product_name: order.product_name || 'موديل راقي',
        qty: order.qty ?? order.quantity ?? 1
      },
      customer: cust,
      measurements: childMeas,
      product: prod,
      products: products
    });
  };

  // ── طباعة الفاتورة السريعة ──
  const handlePrint = (order) => {
    openPrintModal(order, 'thermal');
  };

  const filteredOrders = useMemo(() => {
    return (orders || []).filter(o => {
      const matchSearch = !search || 
        (o.order_no || '').toLowerCase().includes(search.toLowerCase()) || 
        (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) || 
        (o.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.child_name || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "الكل" || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  // ── الحسابات المالية لسلة الكاشير اللمسية ──
  const posSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + ((parseFloat(item.unit_price) || 0) * (parseInt(item.qty) || 1)), 0);
  }, [cart]);

  const posDiscountNum = Math.max(0, parseFloat(posDiscount) || 0);
  const posNetTotal = Math.max(0, posSubtotal - posDiscountNum);
  const posReceivedNum = posCashReceived !== '' ? (parseFloat(posCashReceived) || 0) : posNetTotal;
  const posChangeDue = Math.max(0, posReceivedNum - posNetTotal);
  const posDebtRemaining = Math.max(0, posNetTotal - posReceivedNum);

  // الفئات المعرفة للأصناف
  const posCategories = useMemo(() => {
    const baseCats = ['الكل', 'منتجات جاهزة', 'تفصيل مخصص', 'طلبات خاصة', 'إكسسوارات ومكملات'];
    const pCats = (products || []).map(p => p.category).filter(Boolean);
    return Array.from(new Set([...baseCats, ...pCats]));
  }, [products]);

  // تصفية منتجات الكاتالوج اللمسي
  const filteredProducts = useMemo(() => {
    return (products || []).filter(p => {
      const matchCat = posCategory === 'الكل' || p.category === posCategory;
      const matchSearch = !posSearch ||
        (p.name || '').toLowerCase().includes(posSearch.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(posSearch.toLowerCase()) ||
        (p.barcode || '').toLowerCase().includes(posSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, posCategory, posSearch]);

  // إضافة صنف إلى السلة
  const addToCart = (product) => {
    const prodId = product.id || product.product_id;
    const prodName = product.name || product.model_name || 'موديل راقي';
    const price = parseFloat(product.sell_price || product.base_price || 0);

    setCart(prev => {
      const existingIdx = prev.findIndex(item => (prodId && item.product_id === prodId) || item.product_name === prodName);
      if (existingIdx > -1) {
        const updated = [...prev];
        const nextQty = (updated[existingIdx].qty || 1) + 1;
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: nextQty,
          total_price: nextQty * updated[existingIdx].unit_price
        };
        return updated;
      } else {
        return [...prev, {
          product_id: prodId,
          product_name: prodName,
          sku: product.sku || `SKU-${prodId || Date.now().toString().slice(-4)}`,
          category: product.category || 'عام',
          unit_price: price,
          qty: 1,
          total_price: price,
          image_url: product.image_url || ''
        }];
      }
    });
  };

  // تعديل كمية الصنف في السلة
  const updateCartQty = (index, delta) => {
    setCart(prev => {
      const updated = [...prev];
      const newQty = (updated[index].qty || 1) + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      updated[index] = {
        ...updated[index],
        qty: newQty,
        total_price: newQty * updated[index].unit_price
      };
      return updated;
    });
  };

  // حذف صنف من السلة
  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // إفراغ السلة بالكامل
  const clearCart = () => {
    setCart([]);
    setPosDiscount('0');
    setPosCashReceived('');
  };

  // مسح أو إدخال الباركود
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
      showToast(`تم إضافة ${matched.name} إلى السلة 🛍️`);
      setBarcodeInput('');
    } else {
      showToast(`لم يتم العثور على صنف بالباركود: ${barcodeInput} ⚠️`, 'error');
    }
  };

  // إتمام عملية البيع بالكاشير والطباعة السريعة
  const handlePOSCheckout = async () => {
    if (cart.length === 0) {
      return showToast('سلة الكاشير فارغة! يرجى اختيار أو مسح الموديلات أولاً ⚠️', 'error');
    }

    setIsSubmittingPOS(true);

    try {
      const newId = Date.now();
      const ordNo = `POS-${newId.toString().slice(-6)}`;
      const ordCurrCode = window.CurrencyService ? window.CurrencyService.normalizeCode(currencyDisplay) : 'YER';
      const ordRate = window.CurrencyService ? window.CurrencyService.getRate(ordCurrCode) : 1.0;

      const custObj = (customers || []).find(c => getCustomerName(c) === posCustomerName);
      const custId = custObj ? (custObj.id || custObj.customer_id) : 'CUST-GENERAL';

      let actualPaid = posNetTotal;
      if (posPaymentMethod === 'آجل / جزئي') {
        actualPaid = posCashReceived !== '' ? Math.min(posReceivedNum, posNetTotal) : 0;
      }
      const actualRemaining = Math.max(0, posNetTotal - actualPaid);

      const posOrderPayload = {
        id: newId,
        order_no: ordNo,
        customer_id: custId,
        customer_name: posCustomerName || 'عميل عام / زائر صالة العرض',
        child_name: posChildName || 'الأميرة',
        product_name: cart.length === 1 ? cart[0].product_name : `سلة كاشير (${cart.length} أصناف)`,
        qty: cart.reduce((sum, itm) => sum + (itm.qty || 1), 0),
        subtotal: posSubtotal,
        discount: posDiscountNum,
        total_amount: posNetTotal,
        total: posNetTotal,
        paid_amount: actualPaid,
        paid: actualPaid,
        remaining: actualRemaining,
        payment_method: posPaymentMethod,
        currency: ordCurrCode,
        exchange_rate: ordRate,
        order_date: TODAY_STR_ISO,
        delivery_date: TODAY_STR_ISO,
        status: 'جاهز للتسليم 🛍️',
        production_status: 'جاهز للتسليم 🛍️',
        notes: `نقطة بيع سريعة (POS) | طريقة الدفع: ${posPaymentMethod}${posDiscountNum > 0 ? ` | خصم: ${posDiscountNum}` : ''}`,
        items: cart.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.qty,
          unit_price: i.unit_price,
          total_price: i.total_price
        }))
      };

      // إضافة الطلب إلى الحالة المحلية فوراً
      setOrders && setOrders([posOrderPayload, ...(orders || [])]);

      // إرسال للباك اند السحابي
      let msg = "تم إتمام عملية البيع وإصدار الفاتورة سحابياً ⚡🧾";
      if (window.salesAPI && window.salesAPI.createOrder) {
        const res = await window.salesAPI.createOrder(posOrderPayload);
        if (res && res.message) msg = res.message;
      } else {
        await fetch('/api/sales/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(posOrderPayload)
        });
      }

      showToast(msg);

      // فتح نافذة الطباعة الحرارية 80mm تلقائياً
      openPrintModal(posOrderPayload, 'thermal');

      // تصفير السلة
      clearCart();
    } catch (err) {
      showToast(err.message || 'حدث خطأ أثناء إتمام عملية البيع ⚠️', 'error');
    } finally {
      setIsSubmittingPOS(false);
    }
  };

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#25232A] dark:text-slate-100 text-xs font-medium placeholder:text-[#6F6B75] dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#B0005A] dark:focus:border-rose-500 focus:ring-2 focus:ring-[#FCE8F2] dark:focus:ring-rose-950 transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] dark:text-slate-200 mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">

      {/* ── Studio Header & KPI Strip ── */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#E8E5EA] dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-[#E8E5EA] dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white dark:from-[#0f172a] dark:via-[#131d31] dark:to-[#0f172a]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#FCE8F2] dark:bg-rose-950/40 text-[#B0005A] dark:text-rose-300 border border-[#F2A4CB] dark:border-rose-900/50 flex items-center justify-center text-xl font-bold shadow-xs">
              <Icons.ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#25232A] dark:text-slate-100">
                استوديو المبيعات ونقاط البيع والكاشير السريع (Fashion POS & Sales Studio)
              </h1>
              <p className="text-xs text-[#6F6B75] dark:text-slate-400 mt-0.5">
                كاشير لمسي سريع، قارئ باركود، طباعة حرارية 80mm فورية، وأرشيف متكامل لأوامر المبيعات والتوريد
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode Switcher Buttons */}
            <div className="flex items-center bg-[#FAFAFB] dark:bg-slate-800/80 p-1 rounded-2xl border border-[#E8E5EA] dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveMode('pos')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'pos'
                    ? 'bg-[#B0005A] text-white shadow-xs'
                    : 'text-[#6F6B75] dark:text-slate-400 hover:text-[#25232A] dark:hover:text-slate-100'
                }`}
              >
                <span>⚡ كاشير ونقاط البيع (POS)</span>
                {cart.length > 0 && (
                  <span className="bg-white text-[#B0005A] px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                    {cart.reduce((s, i) => s + (i.qty || 1), 0)}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('archive')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'archive'
                    ? 'bg-[#B0005A] text-white shadow-xs'
                    : 'text-[#6F6B75] dark:text-slate-400 hover:text-[#25232A] dark:hover:text-slate-100'
                }`}
              >
                <span>📑 سجل الفواتير والأرشيف</span>
                <span className="bg-[#E8E5EA] dark:bg-slate-700 text-[#25232A] dark:text-slate-200 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                  {orders.length}
                </span>
              </button>
            </div>

            {/* Quick Scan-to-Deliver Button */}
            <button
              type="button"
              onClick={() => {
                setScanCodeInput('');
                setScannedOrder(null);
                setScanDeliverModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              title="تسليم فوري بالمسح وقراءة الباركود (Scan to Deliver)"
            >
              <span>📷🏷️</span>
              <span>تسليم بالمسح</span>
            </button>

            {isEditing && (
              <button onClick={resetForm}
                className="text-xs px-4 py-2 bg-white dark:bg-slate-800 text-[#D64545] border border-rose-200 dark:border-rose-900/50 rounded-xl font-bold hover:bg-rose-50 dark:hover:bg-rose-900/30 transition cursor-pointer">
                إلغاء التعديل ✕
              </button>
            )}
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#E8E5EA] dark:border-slate-800 bg-[#FAFAFB] dark:bg-slate-900/60 divide-x divide-x-reverse divide-[#E8E5EA] dark:divide-slate-800">
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] dark:text-slate-400 block">إجمالي الطلبيات</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#25232A] dark:text-slate-100 mt-1 block">
              {orders.length.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75] dark:text-slate-500">طلب</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] dark:text-slate-400 block">إجمالي المبيعات</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] dark:text-cyan-400 mt-1 block">
              {orders.reduce((acc, o) => acc + (parseFloat(o.total ?? o.total_amount) || 0), 0).toLocaleString("en-US")} <span className="text-xs font-medium text-[#6F6B75] dark:text-slate-500">{currencyDisplay}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] dark:text-slate-400 block">إجمالي المحصل</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#B0005A] dark:text-rose-400 mt-1 block">
              {orders.reduce((acc, o) => acc + (parseFloat(o.paid ?? o.paid_amount) || 0), 0).toLocaleString("en-US")} <span className="text-xs font-medium text-[#6F6B75] dark:text-slate-500">{currencyDisplay}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] dark:text-slate-400 block">المستحقات المتبقية</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#F28A00] dark:text-amber-400 mt-1 block">
              {orders.reduce((acc, o) => acc + Math.max(0, (parseFloat(o.total ?? o.total_amount) || 0) - (parseFloat(o.paid ?? o.paid_amount) || 0)), 0).toLocaleString("en-US")} <span className="text-xs font-medium text-[#6F6B75] dark:text-slate-500">{currencyDisplay}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          القسم الأول: كاشير ونقاط البيع السريعة والشاشات اللمسية (POS Touch Studio)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeMode === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">

          {/* ── يمين: شاشة العرض والكتالوج والباركود (Col 7 / 12) ── */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* باركود + بحث سريع */}
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#E8E5EA] dark:border-slate-800 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-center gap-3">
              {/* قارئ الباركود (Barcode Gun Input) */}
              <form onSubmit={handleBarcodeSubmit} className="relative flex-1 w-full">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  placeholder="امسح بقارئ الباركود أو اكتب رمز الصنف واضغط Enter..."
                  className="w-full h-11 pl-16 pr-10 py-2.5 rounded-xl border-2 border-dashed border-[#B0005A]/40 bg-[#FFF9FC] dark:bg-slate-900 text-xs font-bold text-[#25232A] dark:text-slate-100 placeholder:text-[#6F6B75] dark:placeholder:text-slate-500 focus:border-[#B0005A] focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-[#FCE8F2] outline-none transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0005A] text-base pointer-events-none">
                  🏷️
                </span>
                <button
                  type="submit"
                  title="مسح / إضافة"
                  className="absolute left-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#B0005A] text-white text-[11px] font-extrabold rounded-lg hover:bg-[#8E0049] transition cursor-pointer"
                >
                  إضافة ⏎
                </button>
              </form>

              {/* بحث سريع بالاسم أو الموديل */}
              <div className="relative w-full sm:w-56">
                <input
                  type="text"
                  value={posSearch}
                  onChange={e => setPosSearch(e.target.value)}
                  placeholder="بحث في المنتجات..."
                  className="w-full h-11 pl-3 pr-9 py-2 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-[#FAFAFB] dark:bg-slate-900 text-xs font-medium text-[#25232A] dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:border-[#B0005A] outline-none transition"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6F6B75] dark:text-slate-400 text-xs pointer-events-none">
                  🔍
                </span>
                {posSearch && (
                  <button type="button" onClick={() => setPosSearch('')} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] dark:text-slate-400 hover:text-[#25232A] text-xs">
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* تصنيفات الأصناف (Pills Filter) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {posCategories.map(cat => {
                const isSelected = posCategory === cat;
                const count = cat === 'الكل' 
                  ? (products || []).length 
                  : (products || []).filter(p => p.category === cat).length;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPosCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-[#B0005A] text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-[#6F6B75] dark:text-slate-300 hover:bg-[#FAFAFB] dark:hover:bg-slate-700 border border-[#E8E5EA] dark:border-slate-700'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#FAFAFB] dark:bg-slate-700 text-[#6F6B75] dark:text-slate-300'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* شبكة كروت المنتجات اللمسية (Touch Product Cards Grid) */}
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#E8E5EA] dark:border-slate-800 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] min-h-[460px]">
              {filteredProducts.length === 0 ? (
                <div className="py-20 text-center text-[#6F6B75] dark:text-slate-400 space-y-2">
                  <div className="text-4xl">📦</div>
                  <p className="text-xs font-bold">لا توجد منتجات تطابق البحث أو التصنيف المحدد</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-3.5">
                  {filteredProducts.map(prod => {
                    const prodId = prod.id || prod.product_id;
                    const price = parseFloat(prod.sell_price || prod.base_price || 0);
                    const inCartItem = cart.find(i => (prodId && i.product_id === prodId) || i.product_name === prod.name);

                    return (
                      <div
                        key={prodId || prod.name}
                        onClick={() => addToCart(prod)}
                        className={`group relative bg-[#FAFAFB] dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800 border rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md hover:border-[#B0005A] select-none ${
                          inCartItem ? 'border-[#B0005A] bg-[#FFF9FC] dark:bg-rose-950/20' : 'border-[#E8E5EA] dark:border-slate-800'
                        }`}
                      >
                        {/* شارة الكمية في السلة */}
                        {inCartItem && (
                          <div className="absolute top-2 left-2 bg-[#B0005A] text-white text-[10px] font-mono font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                            {inCartItem.qty}
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="w-full h-24 rounded-xl bg-gradient-to-tr from-[#FCE8F2] via-white to-[#F2E7F3] dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-800 border border-[#F2A4CB]/30 dark:border-slate-700 flex items-center justify-center text-3xl group-hover:scale-102 transition-transform">
                            {prod.image_url ? (
                              <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <span>📦</span>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-[10px] text-[#6F6B75] dark:text-slate-400 mb-0.5">
                              <span className="font-mono">{prod.sku || `PROD-${prodId}`}</span>
                              <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-[#E8E5EA] dark:border-slate-700">{prod.category || 'عام'}</span>
                            </div>
                            <h4 className="font-bold text-xs text-[#25232A] dark:text-slate-100 line-clamp-1 group-hover:text-[#B0005A] dark:group-hover:text-rose-400 transition-colors">
                              {prod.name || prod.model_name}
                            </h4>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-[#E8E5EA] dark:border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-black font-mono text-[#007F8C] dark:text-cyan-400">
                            {price.toLocaleString('en-US')} <span className="text-[10px] font-normal">{currencyDisplay}</span>
                          </span>
                          <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-[#E8E5EA] dark:border-slate-700 group-hover:bg-[#B0005A] group-hover:text-white group-hover:border-[#B0005A] flex items-center justify-center text-xs font-bold transition-all shadow-2xs">
                            +
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>


          {/* ── يسار: سلة المشتريات ولوحة المحاسبة والدفع (Col 5 / 12) ── */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#E8E5EA] dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
              
              {/* ترويسة السلة + اختيار العميل */}
              <div className="p-4 border-b border-[#E8E5EA] dark:border-slate-800 bg-gradient-to-r from-white via-[#FAFAFB] to-white dark:from-[#0f172a] dark:via-[#131d31] dark:to-[#0f172a] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🛒</span>
                    <h3 className="font-extrabold text-sm text-[#25232A] dark:text-slate-100">سلة مشتريات الكاشير</h3>
                    <span className="text-xs bg-[#FCE8F2] dark:bg-rose-950/50 text-[#B0005A] dark:text-rose-300 font-bold px-2 py-0.5 rounded-full font-mono">
                      {cart.reduce((s, i) => s + (i.qty || 1), 0)} صنف
                    </span>
                  </div>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={clearCart}
                      className="text-[11px] text-[#D64545] dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/50 font-bold transition cursor-pointer"
                    >
                      إفراغ السلة 🗑️
                    </button>
                  )}
                </div>

                {/* اختيار العميل والطفلة */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-[#6F6B75] dark:text-slate-400 mb-1">العميل / المشتري:</label>
                    <select
                      value={posCustomerName}
                      onChange={e => setPosCustomerName(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#25232A] dark:text-slate-100 outline-none focus:border-[#B0005A]"
                    >
                      <option value="عميل عام / زائر صالة العرض">عميل عام / زائر صالة العرض</option>
                      {(customers || []).map(c => {
                        const n = getCustomerName(c);
                        if (!n) return null;
                        return <option key={c.id || c.customer_id || n} value={n}>{n}</option>;
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#6F6B75] dark:text-slate-400 mb-1">المستفيد / المواصفة (اختياري):</label>
                    <input
                      type="text"
                      value={posChildName}
                      onChange={e => setPosChildName(e.target.value)}
                      placeholder="اسم المستفيد أو ملاحظات..."
                      className="w-full h-9 px-2.5 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#25232A] dark:text-slate-100 outline-none focus:border-[#B0005A]"
                    />
                  </div>
                </div>
              </div>

              {/* بنود السلة (Items List) */}
              <div className="p-4 max-h-[300px] overflow-y-auto space-y-2 border-b border-[#E8E5EA] dark:border-slate-800 divide-y divide-[#E8E5EA]/60 dark:divide-slate-800">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-[#6F6B75] dark:text-slate-400 space-y-1">
                    <div className="text-3xl">🛍️</div>
                    <p className="text-xs font-bold">السلة فارغة حالياً</p>
                    <p className="text-[11px] text-[#6F6B75] dark:text-slate-400">انقر على الأصناف باليمين أو امسح الباركود للإضافة السريعة</p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={idx} className="pt-2.5 first:pt-0 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-xs text-[#25232A] dark:text-slate-100 truncate">{item.product_name}</h5>
                        <div className="flex items-center gap-2 text-[10.5px] text-[#6F6B75] dark:text-slate-400 mt-0.5">
                          <span className="font-mono text-[10px] text-[#8F2A87] dark:text-purple-300">{item.sku}</span>
                          <span>•</span>
                          <span className="font-mono font-bold text-[#007F8C] dark:text-cyan-400">{(parseFloat(item.unit_price) || 0).toLocaleString('en-US')} {currencyDisplay}</span>
                        </div>
                      </div>

                      {/* أزرار التحكم بالكمية */}
                      <div className="flex items-center gap-1.5 bg-[#FAFAFB] dark:bg-slate-900 border border-[#E8E5EA] dark:border-slate-700 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => updateCartQty(idx, -1)}
                          className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-[#E8E5EA] dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-[#D64545] font-bold text-xs flex items-center justify-center transition cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-7 text-center font-mono font-extrabold text-xs text-[#25232A] dark:text-slate-100">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(idx, 1)}
                          className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-[#E8E5EA] dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-400 font-bold text-xs flex items-center justify-center transition cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* إجمالي الصنف وزر الحذف */}
                      <div className="text-left w-24 flex items-center justify-end gap-1.5">
                        <span className="font-mono font-black text-xs text-[#25232A] dark:text-slate-100">
                          {((parseFloat(item.unit_price) || 0) * item.qty).toLocaleString('en-US')}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(idx)}
                          className="text-[#6F6B75] dark:text-slate-400 hover:text-[#D64545] p-1 rounded-md transition cursor-pointer text-xs"
                          title="حذف"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ملخص الحسابات والخصم */}
              <div className="p-4 bg-[#FAFAFB] dark:bg-slate-900/60 border-b border-[#E8E5EA] dark:border-slate-800 space-y-2.5 text-xs">
                <div className="flex justify-between text-[#6F6B75] dark:text-slate-400 font-semibold">
                  <span>المجموع الفرعي:</span>
                  <span className="font-mono font-bold text-[#25232A] dark:text-slate-100">{posSubtotal.toLocaleString('en-US')} {currencyDisplay}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#6F6B75] dark:text-slate-400 font-semibold">الخصم الممنوح:</span>
                  <div className="flex items-center gap-1.5 w-32">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={posDiscount}
                      onChange={e => setPosDiscount(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-[#E8E5EA] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-center text-[#25232A] dark:text-slate-100 outline-none focus:border-[#B0005A]"
                      placeholder="0"
                    />
                    <span className="text-[10px] text-[#6F6B75] dark:text-slate-400 shrink-0">{currencyDisplay.split(' ')[0]}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8E5EA] dark:border-slate-800 flex justify-between items-center text-sm font-black">
                  <span className="text-[#25232A] dark:text-slate-100">الإجمالي الصافي:</span>
                  <span className="font-mono text-base text-[#B0005A] dark:text-rose-400">
                    {posNetTotal.toLocaleString('en-US')} <span className="text-xs font-bold text-[#6F6B75] dark:text-slate-400">{currencyDisplay}</span>
                  </span>
                </div>
              </div>

              {/* طرق الدفع السريعة (Payment Tenders) */}
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#6F6B75] dark:text-slate-400 mb-1.5">طريقة الدفع:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'نقد (كاش)', label: '💵 نقد (كاش)' },
                      { id: 'شبكة / مدى', label: '💳 شبكة / مدى' },
                      { id: 'آجل / جزئي', label: '📑 آجل / قيد الحساب' }
                    ].map(tender => (
                      <button
                        key={tender.id}
                        type="button"
                        onClick={() => setPosPaymentMethod(tender.id)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          posPaymentMethod === tender.id
                            ? 'bg-[#B0005A] text-white border-[#B0005A] shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-[#6F6B75] dark:text-slate-300 hover:bg-[#FAFAFB] dark:hover:bg-slate-700 border-[#E8E5EA] dark:border-slate-700'
                        }`}
                      >
                        {tender.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* حاسبة المبلغ المستلم والصرف (Cash Change Engine) */}
                <div className="bg-[#FAFAFB] dark:bg-slate-900/60 p-3 rounded-xl border border-[#E8E5EA] dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-[#25232A] dark:text-slate-100">المبلغ المستلم من العميل:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={posCashReceived}
                      onChange={e => setPosCashReceived(e.target.value)}
                      placeholder={posNetTotal > 0 ? posNetTotal.toString() : "0.00"}
                      className="w-32 h-8 px-2 rounded-lg border border-[#E8E5EA] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-black text-center text-[#007F8C] dark:text-cyan-400 outline-none focus:border-[#007F8C]"
                    />
                  </div>

                  {/* أزرار سريعة للمبالغ النقدية */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <button
                      type="button"
                      onClick={() => setPosCashReceived(posNetTotal.toString())}
                      className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-[#E2F5F7] dark:hover:bg-cyan-950/40 text-[#007F8C] dark:text-cyan-300 border border-[#C5ECF0] dark:border-cyan-800/50 rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      مضبوط ✅
                    </button>
                    {[500, 1000, 2000, 5000, 10000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPosCashReceived((posNetTotal + amt).toString())}
                        className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-[#F2E7F3] dark:hover:bg-purple-950/40 text-[#8F2A87] dark:text-purple-300 border border-[#E5CEE7] dark:border-slate-700 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer"
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>

                  {/* شريط نتيجة الصرف اللحظي */}
                  {posNetTotal > 0 && (
                    <div className={`p-2 rounded-lg text-xs font-bold flex justify-between items-center ${
                      posChangeDue > 0
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                        : (posDebtRemaining > 0
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                          : 'bg-[#E2F5F7] dark:bg-cyan-950/40 text-[#007F8C] dark:text-cyan-300 border border-[#C5ECF0] dark:border-cyan-800/50')
                    }`}>
                      <span>
                        {posChangeDue > 0 ? '💵 الصرف المستحق للعميل:' : (posDebtRemaining > 0 ? '⏳ المتبقي كدين على العميل:' : '✅ المبلغ مطابق تماماً')}
                      </span>
                      <span className="font-mono text-sm font-black">
                        {posChangeDue > 0 
                          ? `${posChangeDue.toLocaleString('en-US')} ${currencyDisplay}`
                          : (posDebtRemaining > 0 ? `${posDebtRemaining.toLocaleString('en-US')} ${currencyDisplay}` : '0')}
                      </span>
                    </div>
                  )}
                </div>

                {/* زر التنفيذ النهائي الكبير */}
                <button
                  type="button"
                  onClick={handlePOSCheckout}
                  disabled={cart.length === 0 || isSubmittingPOS}
                  className="w-full py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-[#B0005A] via-[#8F2A87] to-[#B0005A] hover:opacity-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingPOS ? (
                    <span>جاري تسجيل الفاتورة السحابية... ⏳</span>
                  ) : (
                    <>
                      <span>⚡ إتمام البيع والطباعة الفورية (80mm Receipt)</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          القسم الثاني: سجل وأرشيف الطلبات والفواتير (Orders & Custom Tailor Ledger)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeMode === 'archive' && (
        <div className="space-y-6 animate-fadeIn">

          {/* ── نموذج الإضافة / التعديل ── */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#E8E5EA] dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E5EA] dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-white via-[#FAFAFB] to-white dark:from-[#0f172a] dark:via-[#131d31] dark:to-[#0f172a]">
          <h2 className="text-sm font-bold text-[#25232A] dark:text-slate-100 flex items-center gap-2">
            <span className="text-[#B0005A]">📄</span>
            {isEditing ? "تعديل بيانات الفاتورة والطلب" : "إصدار أمر بيع / فاتورة جديدة"}
          </h2>
          <span className="text-xs text-[#6F6B75] dark:text-slate-400">
            <span className="text-[#D64545] font-bold">*</span> الحقول الإلزامية
          </span>
        </div>

        <form onSubmit={handleSaveInvoice} className="p-6 space-y-5">
          {/* العميل + المستفيد + الموديل */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
            <div>
              <label className={labelCls}>اختر العميل من السجل <span className="text-[#D64545] font-bold">*</span></label>
              <select value={customerName}
                onChange={e => { setCustomerName(e.target.value); setChildName(""); }}
                className={inputCls}>
                <option value="">-- اختر العميل --</option>
                {(customers || []).map(c => {
                  const n = getCustomerName(c);
                  if (!n) return null;
                  return (
                    <option key={c.customer_id || c.id || n} value={n}>
                      {n}{c.phone ? ` (${c.phone})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className={labelCls}>اختر المستفيد / المواصفة (اختياري)</label>
              <select value={childName} onChange={e => setChildName(e.target.value)}
                disabled={!availableChildren.length && !isEditing}
                className={inputCls + " disabled:opacity-50"}>
                <option value="">-- اختر المستفيد / المواصفة --</option>
                {availableChildren.map(ch => (
                  <option key={ch.child_name} value={ch.child_name}>
                    {ch.child_name}{ch.estimated_age ? ` (${ch.estimated_age})` : ""}
                  </option>
                ))}
                {isEditing && childName && !availableChildren.find(c => c.child_name === childName) && (
                  <option value={childName}>{childName} (محفوظ مسبقاً)</option>
                )}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#25232A] dark:text-slate-200">اختر الصنف / الموديل <span className="text-[#D64545] font-bold">*</span></label>
                <button type="button" onClick={async () => {
                   if(!productName) return showToast('يرجى اختيار الصنف أولاً', 'error');
                   setLoadingQuote(true);
                   try {
                     const res = await fetch(`/api/pricing/quick-quote?model_name=${encodeURIComponent(productName)}`);
                     const data = await res.json();
                     if(data.success) {
                        setQuoteText(data.quote_text);
                        setShowQuoteModal(true);
                     }
                   } catch(e) {
                     showToast('تعذر جلب عرض السعر', 'error');
                   }
                   setLoadingQuote(false);
                }} disabled={!productName || loadingQuote} className="text-[10px] bg-[#E2F5F7] dark:bg-cyan-950/50 text-[#007F8C] dark:text-cyan-300 border border-[#C5ECF0] dark:border-cyan-800/50 px-2 py-0.5 rounded-md hover:bg-[#C5ECF0] transition font-bold disabled:opacity-50 cursor-pointer">
                   📋 عرض السعر
                </button>
              </div>
              <select value={productName} onChange={e => setProductName(e.target.value)} className={inputCls}>
                <option value="">-- اختر الصنف / الموديل --</option>
                {(products || []).map(p => (
                  <option key={p.id} value={p.name}>
                    {p.name} ({(parseFloat(p.sell_price) || 0).toLocaleString("en-US")} {currencyDisplay})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* التواريخ ومصدر الطلب */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4.5">
            <div>
              <label className={labelCls}>تاريخ الفاتورة / الحجز 📅</label>
              <input type="date" lang="en-GB" dir="ltr" value={orderDate} onChange={e => setOrderDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>موعد التسليم المتوقع 📅</label>
              <input type="date" lang="en-GB" dir="ltr" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>مصدر الطلب / الحملة 📢</label>
              <select value={campaignId} onChange={e => setCampaignId(e.target.value)} className={inputCls}>
                <option value="">-- بدون حملة (مبيعات مباشرة) --</option>
                {(campaigns || []).map(c => (
                  <option key={c.id || c.campaign_no} value={c.campaign_no || c.id}>
                    {c.campaign_name} ({c.platform})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* المبالغ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4.5">
            <div>
              <label className={labelCls}>الكمية (عدد)</label>
              <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className={inputCls + " text-center font-mono font-bold"} />
            </div>
            <div>
              <label className={labelCls}>الإجمالي الكلي ({currencyDisplay})</label>
              <input type="number" step="0.01" min="0" value={total} onChange={e => setTotal(e.target.value)} className={inputCls + " text-center font-mono font-bold"} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>المدفوع / العربون ({currencyDisplay})</label>
              <input type="number" step="0.01" min="0" value={paid} onChange={e => setPaid(e.target.value)} className={inputCls + " text-center font-mono font-bold text-[#007F8C] dark:text-cyan-400"} placeholder="0.00" />
            </div>
          </div>

          {/* شريط المتبقي اللحظي */}
          {(totalNum > 0 || paidNum > 0) && (
            <div className={`flex items-center justify-between px-5 py-3 rounded-xl font-bold text-xs border ${
              remainingNum === 0
                ? "bg-[#E2F5F7] dark:bg-cyan-950/40 border-[#C5ECF0] dark:border-cyan-800/50 text-[#007F8C] dark:text-cyan-300"
                : "bg-[#FFF1DC] dark:bg-amber-950/40 border-[#FFE4B9] dark:border-amber-800/50 text-[#C97300] dark:text-amber-300"
            }`}>
              <span>المبلغ المتبقي المحسوب لحظياً ⚡</span>
              <span className="font-mono text-sm">
                {remainingNum === 0
                  ? "مسدد بالكامل ✅"
                  : `${remainingNum.toLocaleString("en-US")} ${currencyDisplay}`}
              </span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button type="submit"
              className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs text-white bg-[#B0005A] hover:bg-[#8E0049] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer">
              <Icons.Check className="w-4 h-4" />
              <span>{isEditing ? "حفظ تعديلات الفاتورة" : "حفظ الفاتورة وتوليد QR Code"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── جدول الطلبات ── */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#E8E5EA] dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA] dark:border-slate-800">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <h3 className="font-bold text-sm text-[#25232A] dark:text-slate-100">سجل الطلبات والفواتير المعتمدة</h3>
            <span className="text-xs bg-[#FCE8F2] dark:bg-rose-950/50 text-[#B0005A] dark:text-rose-300 font-bold px-2.5 py-0.5 rounded-full font-mono">{filteredOrders.length}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-[#FAFAFB] dark:bg-slate-900 text-xs font-semibold text-[#25232A] dark:text-slate-100 outline-none"
            >
              <option value="الكل">جميع الحالات</option>
              <option value="قيد القص ✂️">قيد القص ✂️</option>
              <option value="قيد الخياطة 🪡">قيد الخياطة 🪡</option>
              <option value="التطريز والشك ✨">التطريز والشك ✨</option>
              <option value="الفحص والتشطيب 🔍">الفحص والتشطيب 🔍</option>
              <option value="جاهز للتسليم 🛍️">جاهز للتسليم 🛍️</option>
              <option value="تم التسليم ✅">تم التسليم ✅</option>
            </select>

            <div className="relative flex-1 sm:w-64">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-3 pr-8 h-10 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-[#FAFAFB] dark:bg-slate-900 text-xs font-medium text-[#25232A] dark:text-slate-100 w-full focus:bg-white dark:focus:bg-slate-800 focus:border-[#B0005A] outline-none"
                placeholder="بحث برقم الطلب، العميل، أو الموديل..."
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] dark:text-slate-400 text-xs pointer-events-none">🔍</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E8E5EA] dark:border-slate-800 shadow-xs">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-[#6F6B75] dark:text-slate-400 text-xs font-medium">
              لا توجد طلبات تطابق البحث 📄
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] dark:bg-slate-900/80 text-[#6F6B75] dark:text-slate-400 font-semibold border-b border-[#E8E5EA] dark:border-slate-800">
                  {['رقم الطلب','العميل','المستفيد / المواصفة','الصنف / الموديل','الإجمالي','المتبقي','تاريخ التسليم','الحالة','الإجراءات'].map(h => (
                    <th key={h} className="px-4 py-3 text-right whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] dark:divide-slate-800/70 bg-white dark:bg-[#0f172a]">
                {filteredOrders.map(o => {
                  const cust = (customers || []).find(c => getCustomerName(c) === o.customer_name);
                  const dispChild = (o.child_name && String(o.child_name).trim()) ? o.child_name : (cust?.measurements?.[0]?.child_name || "—");
                  const dispDate = o.delivery_date ? o.delivery_date.split('T')[0] : (cust?.measurements?.[0]?.event_date ? cust?.measurements?.[0]?.event_date.split('T')[0] : '—');
                  const rem = Math.max(0, (parseFloat(o.total ?? o.total_amount) || 0) - (parseFloat(o.paid ?? o.paid_amount) || 0));

                  return (
                  <tr key={o.id} className="hover:bg-[#FAFAFB] dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11.5px] text-[#B0005A] dark:text-rose-400 font-bold whitespace-nowrap">{o.order_no}</td>
                    <td className="px-4 py-3 font-bold text-[#25232A] dark:text-slate-100 whitespace-nowrap">{o.customer_name || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-[#8F2A87] dark:text-purple-300 whitespace-nowrap">{dispChild}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[#25232A] dark:text-slate-100">
                      <span>{o.product_name}</span> <span className="text-[#6F6B75] dark:text-slate-400 text-[11px] font-mono">×{o.qty ?? o.quantity ?? 1}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#25232A] dark:text-slate-100 whitespace-nowrap">
                      {(parseFloat(o.total ?? o.total_amount) || 0).toLocaleString("en-US")} {currencyDisplay}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {rem === 0 ? (
                        <span className="text-[#007F8C] dark:text-cyan-300 bg-[#E2F5F7] dark:bg-cyan-950/50 border border-[#C5ECF0] dark:border-cyan-800/50 px-2 py-0.5 rounded-md font-bold text-[10.5px]">مسدد ✅</span>
                      ) : (
                        <span className="text-[#C97300] dark:text-amber-300 bg-[#FFF1DC] dark:bg-amber-950/40 border border-[#FFE4B9] dark:border-amber-800/50 px-2 py-0.5 rounded-md font-bold font-mono text-[10.5px]">{rem.toLocaleString("en-US")} {currencyDisplay}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#6F6B75] dark:text-slate-400 whitespace-nowrap">{dispDate}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={o.status || "قيد الخياطة 🪡"}
                        onChange={e => handleUpdateStatus(o.id, e.target.value)}
                        className="bg-[#FAFAFB] dark:bg-slate-800 border border-[#E8E5EA] dark:border-slate-700 text-[#25232A] dark:text-slate-100 px-2 py-1 rounded-lg font-bold outline-none cursor-pointer text-[11px]">
                        <option value="قيد القص ✂️">قيد القص ✂️</option>
                        <option value="قيد الخياطة 🪡">قيد الخياطة 🪡</option>
                        <option value="التطريز والشك ✨">التطريز والشك ✨</option>
                        <option value="الفحص والتشطيب 🔍">الفحص والتشطيب 🔍</option>
                        <option value="جاهز للتسليم 🛍️">جاهز للتسليم 🛍️</option>
                        <option value="تم التسليم ✅">تم التسليم ✅</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-1 justify-center whitespace-nowrap">
                      {/* تسليم فستان الأميرة وتحصيل المتبقي */}
                      {(o.status === 'جاهز للتسليم 🛍️' || o.status === 'جاهز للتسليم 📦' || rem > 0) && (
                        <button 
                          onClick={() => handleOpenDeliveryModal(o)} 
                          title="تسليم الفستان وتحصيل المتبقي وقيد الخزينة 🛍️" 
                          className="w-7 h-7 rounded-lg bg-gradient-to-r from-[#B0005A] to-[#8F2A87] hover:opacity-95 text-white flex items-center justify-center cursor-pointer text-xs font-bold shadow-2xs"
                        >
                          🛍️
                        </button>
                      )}
                      <button onClick={() => sendWhatsAppInvoice(o)} title="إرسال كرت الفستان والرسالة الملكية للأم عبر واتساب" className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-[#E2F5F7] dark:hover:bg-slate-700 text-[#6F6B75] dark:text-slate-300 hover:text-[#007F8C] dark:hover:text-cyan-300 border border-[#E8E5EA] dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      </button>
                      <button onClick={() => sendWhatsAppInvoice(o)} title="عرض وإرسال كرت فستان الأميرة الملكي 👗✨" className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-[#F2E7F3] dark:hover:bg-purple-950/50 text-[#8F2A87] dark:text-purple-300 border border-[#E5CEE7] dark:border-purple-900 transition-all flex items-center justify-center cursor-pointer text-xs font-bold shadow-2xs">
                        👗
                      </button>
                      <button onClick={() => openPrintModal(o, 'thermal')} title="طباعة الفاتورة الحرارية 80mm" className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-[#FCE8F2] dark:hover:bg-slate-700 text-[#6F6B75] dark:text-slate-300 hover:text-[#B0005A] dark:hover:text-rose-300 border border-[#E8E5EA] dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer text-xs font-bold">
                        🧾
                      </button>
                      <button onClick={() => openPrintModal(o, 'job_ticket')} title="طباعة أمر العمل للورشة" className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-[#F2E7F3] dark:hover:bg-slate-700 text-[#6F6B75] dark:text-slate-300 hover:text-[#8F2A87] dark:hover:text-purple-300 border border-[#E8E5EA] dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer text-xs font-bold">
                        🧵
                      </button>
                      <button onClick={() => openPrintModal(o, 'hangtag')} title="طباعة ملصق وباركود الصنف" className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-[#E2F5F7] dark:hover:bg-slate-700 text-[#6F6B75] dark:text-slate-300 hover:text-[#007F8C] dark:hover:text-cyan-300 border border-[#E8E5EA] dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer text-xs font-bold">
                        🏷️
                      </button>
                      <button 
                        onClick={() => {
                          setAlterationForm({
                            reason: 'مقاس غير مضبوط (ضيق/واسع)',
                            notes: '',
                            severity: 'normal',
                            target_date: o.delivery_date ? o.delivery_date.split('T')[0] : TODAY_STR_ISO,
                            assigned_tailor: ''
                          });
                          setAlterationModalOrder(o);
                        }} 
                        title="طلب تعديل بروفة ومقاسات ✂️👗" 
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-[#6F6B75] dark:text-slate-300 hover:text-[#8F2A87] dark:hover:text-purple-300 border border-[#E8E5EA] dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer text-xs font-bold"
                      >
                        ✂️
                      </button>
                      <button onClick={() => handleEdit(o)} title="تعديل" className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#6F6B75] dark:text-slate-300 hover:text-[#25232A] dark:hover:text-slate-100 border border-[#E8E5EA] dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer text-xs">
                        ✏️
                      </button>
                      <button onClick={() => handleDelete(o.id)} title="حذف" className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[#6F6B75] dark:text-slate-300 hover:text-[#D64545] dark:hover:text-rose-400 border border-[#E8E5EA] dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer text-xs">
                        🗑️
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
        </div>
      )}

      {/* Quick Quote Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowQuoteModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-[#E8E5EA] dark:border-slate-800 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-[#FAFAFB] dark:bg-slate-800/80 px-5 py-4 border-b border-[#E8E5EA] dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-[#25232A] dark:text-slate-100 text-sm flex items-center gap-2">
                📋 عرض السعر الجاهز للمراسلة
              </h3>
              <button onClick={() => setShowQuoteModal(false)} className="text-[#6F6B75] dark:text-slate-400 hover:text-[#25232A] dark:hover:text-slate-100">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <textarea 
                readOnly 
                value={quoteText} 
                className="w-full h-44 p-3.5 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-[#FAFAFB] dark:bg-slate-800 text-xs font-mono text-[#25232A] dark:text-slate-100 outline-none resize-none"
              ></textarea>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(quoteText);
                  showToast('تم النسخ بنجاح 📲');
                }} 
                className="w-full py-3 rounded-xl font-bold text-xs text-white bg-[#009FAE] hover:bg-[#007F8C] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                نسخ الرد لواتساب / إنستقرام 📲
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── نافذة تسليم فستان الأميرة وتحصيل المتبقي والترحيل الخزني (Delivery & Settlement Modal) ── */}
      {deliveryModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E8E5EA] dark:border-slate-800 space-y-4 text-right">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA] dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">👑</span>
                <div>
                  <h3 className="text-sm font-bold text-[#25232A] dark:text-slate-100">تسليم فستان الأميرة والتحصيل النهائي</h3>
                  <p className="text-[11px] text-[#6F6B75] dark:text-slate-400">فاتورة رقم: {deliveryModalOrder.order_no || deliveryModalOrder.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setDeliveryModalOrder(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* إذا تمت العملية بنجاح: عرض كرت التهنئة وزر الواتساب */}
            {deliverySuccessData ? (
              <div className="space-y-4 py-2">
                <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                  <span className="text-4xl block animate-bounce">🎉</span>
                  <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-300">تم تسليم الفستان الملكي بنجاح!</h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-400">
                    تم تحصيل مبلغ <strong>{deliverySuccessData.collected_amount?.toLocaleString() || deliveryForm.amount_collected} {currencyDisplay}</strong> وإصدار سند القبض وترحيل قيد الخزينة المزدوج آلياً.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => sendWhatsAppDeliveryGreeting(deliverySuccessData)}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>📲</span>
                  <span>إرسال بطاقة تهنئة التسليم للأميرة عبر واتساب 🌸</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryModalOrder(null)}
                  className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  إغلاق النافذة
                </button>
              </div>
            ) : (
              /* نموذج التحصيل والتسليم */
              <div className="space-y-3.5">
                {/* بطاقة معلومات الأميرة والطلب */}
                <div className="p-3.5 rounded-2xl bg-[#FCE8F2]/60 dark:bg-rose-950/30 border border-[#F2A4CB]/40 dark:border-rose-900/40 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#B0005A] dark:text-rose-400">👧 الأميرة: {deliveryModalOrder.child_name || 'الأميرة'}</span>
                    <span className="text-[#6F6B75] dark:text-slate-400">العميلة: {deliveryModalOrder.customer_name}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-1 border-t border-[#F2A4CB]/30 dark:border-rose-900/30">
                    <span>👗 الموديل: <strong>{deliveryModalOrder.product_name}</strong></span>
                    <span className="font-mono text-[#B0005A] dark:text-rose-400">الكمية: {deliveryModalOrder.qty || 1} قطعة</span>
                  </div>
                </div>

                {/* الحسابات المالية اللحظية */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-[#FAFAFB] dark:bg-slate-800/80 rounded-xl border border-[#E8E5EA] dark:border-slate-700">
                    <span className="text-[10.5px] text-[#6F6B75] dark:text-slate-400 block">إجمالي الفاتورة</span>
                    <span className="font-mono font-bold text-[#25232A] dark:text-slate-100 mt-0.5 block">{deliveryModalOrder.resolvedTotal?.toLocaleString()} {currencyDisplay.split(' ')[0]}</span>
                  </div>
                  <div className="p-2.5 bg-[#FAFAFB] dark:bg-slate-800/80 rounded-xl border border-[#E8E5EA] dark:border-slate-700">
                    <span className="text-[10.5px] text-[#6F6B75] dark:text-slate-400 block">العربون المسدد</span>
                    <span className="font-mono font-bold text-[#007F8C] dark:text-cyan-400 mt-0.5 block">{deliveryModalOrder.resolvedPaid?.toLocaleString()} {currencyDisplay.split(' ')[0]}</span>
                  </div>
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50">
                    <span className="text-[10.5px] text-amber-800 dark:text-amber-300 font-bold block">المتبقي للتحصيل</span>
                    <span className="font-mono font-black text-[#B0005A] dark:text-rose-400 mt-0.5 block">{deliveryModalOrder.resolvedRemaining?.toLocaleString()} {currencyDisplay.split(' ')[0]}</span>
                  </div>
                </div>

                {/* حقول التحصيل والخزينة */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>المبلغ المحصل الآن ({currencyDisplay.split(' ')[0]}) <span className="text-[#D64545] font-bold">*</span></label>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      className={inputCls + " font-mono font-bold text-[#B0005A] dark:text-rose-400 text-center"}
                      value={deliveryForm.amount_collected}
                      onChange={e => setDeliveryForm({ ...deliveryForm, amount_collected: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>خصم إضافي إن وجد ({currencyDisplay.split(' ')[0]})</label>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      className={inputCls + " font-mono text-center"}
                      value={deliveryForm.discount}
                      onChange={e => setDeliveryForm({ ...deliveryForm, discount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>حساب الخزينة المورد إليه <span className="text-[#D64545] font-bold">*</span></label>
                    <select
                      className={inputCls}
                      value={deliveryForm.account_id}
                      onChange={e => setDeliveryForm({ ...deliveryForm, account_id: e.target.value })}
                    >
                      <option value="ACC-101">ACC-101 (الصندوق الرئيسي - كاش)</option>
                      <option value="ACC-103">ACC-103 (بنك الكريمي - تحويل بنكي)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>طريقة الدفع</label>
                    <select
                      className={inputCls}
                      value={deliveryForm.payment_method}
                      onChange={e => setDeliveryForm({ ...deliveryForm, payment_method: e.target.value })}
                    >
                      <option value="نقد (كاش)">💵 نقد (كاش)</option>
                      <option value="تحويل كريمي">📲 تحويل كريمي</option>
                      <option value="شبكة / بطاقة">💳 شبكة / مدى</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>ملاحظات التسليم والتسوية</label>
                  <input
                    type="text"
                    className={inputCls}
                    value={deliveryForm.notes}
                    onChange={e => setDeliveryForm({ ...deliveryForm, notes: e.target.value })}
                    placeholder="تم تسليم الفستان للأميرة واستلام المتبقي..."
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={submittingDelivery}
                    onClick={handleConfirmDelivery}
                    className="flex-1 py-3 px-4 rounded-xl brand-gradient hover:opacity-95 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{submittingDelivery ? 'جاري التسليم والترحيل...' : '✅ تأكيد التسليم النهائي والترحيل المالي'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryModalOrder(null)}
                    className="py-3 px-4 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modern Print Engine Modal */}
      {printModalData && typeof PrintModal !== 'undefined' && (
        <PrintModal
          isOpen={!!printModalData}
          order={printModalData.order}
          customer={printModalData.customer}
          measurements={printModalData.measurements}
          product={printModalData.product}
          products={printModalData.products || products}
          defaultTemplate={printTemplate}
          onClose={() => setPrintModalData(null)}
        />
      )}

      {/* ── Omnichannel Royal Customer Confirmation & Luxury Dress Card Modal ── */}
      {customerMessageModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#E8E5EA] dark:border-slate-800 space-y-4 text-right max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA] dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-[#8F2A87] text-white flex items-center justify-center text-xl shadow-xs">
                  👗
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#25232A] dark:text-slate-100">كرت فستان الأميرة الفاخر ووثيقة الحجز</h3>
                  <p className="text-[11px] text-[#6F6B75] dark:text-slate-400">
                    للأميرة: <span className="font-bold text-[#8F2A87] dark:text-pink-300">{customerMessageModalData.chName}</span> • طلب: {customerMessageModalData.order?.order_no}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setCustomerMessageModalData(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* Visual Dress Card Luxury Preview Container */}
            <div className="p-4 rounded-2xl bg-[#FFFDF9] dark:bg-slate-950 border-2 border-[#8F2A87] shadow-inner space-y-3 relative overflow-hidden">
              {/* Card Banner */}
              <div className="flex items-center justify-between bg-gradient-to-r from-[#8F2A87] via-[#701A75] to-[#B0005A] text-white p-3 rounded-xl">
                <div>
                  <span className="text-[10px] text-pink-200 block font-bold">الأميرة الصغيرة:</span>
                  <span className="font-black text-sm">{customerMessageModalData.chName}</span>
                </div>
                <div className="text-xl">👑</div>
                <div className="text-left">
                  <span className="text-[10px] text-pink-200 block font-bold">والدة الأميرة:</span>
                  <span className="font-bold text-xs">{customerMessageModalData.motherName}</span>
                </div>
              </div>

              {/* Garment Details & Image */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="sm:col-span-2 space-y-1.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-pink-100 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-slate-400 text-[11px]">الموديل المعتمد:</span>
                    <span className="font-bold text-[#8F2A87] dark:text-purple-300">{customerMessageModalData.order?.product_name || 'موديل راقي خاص'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-slate-400 text-[11px]">موعد التسليم:</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400 font-mono">{customerMessageModalData.deliveryDateFormatted}</span>
                  </div>
                  {customerMessageModalData.childMeas && (
                    <div className="pt-1 border-t border-dashed border-gray-200 dark:border-slate-800 text-[10.5px] text-gray-700 dark:text-slate-300 font-mono flex flex-wrap gap-2">
                      {customerMessageModalData.childMeas.dress_length && <span>طول: <b>{customerMessageModalData.childMeas.dress_length}</b></span>}
                      {customerMessageModalData.childMeas.chest && <span>صدر: <b>{customerMessageModalData.childMeas.chest}</b></span>}
                      {customerMessageModalData.childMeas.waist && <span>خصر: <b>{customerMessageModalData.childMeas.waist}</b></span>}
                    </div>
                  )}
                </div>

                {/* Photo or Crown */}
                <div className="h-24 rounded-xl border border-[#D4AF37] bg-purple-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                  {customerMessageModalData.imgUrl ? (
                    <img src={customerMessageModalData.imgUrl} alt="فستان" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <span className="text-3xl">👗</span>
                      <span className="block text-[9px] text-[#8F2A87] font-bold mt-0.5">تفصيل ملكي</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Highlight */}
              <div className="grid grid-cols-3 gap-2 bg-[#0F172A] text-white p-2.5 rounded-xl text-center">
                <div>
                  <span className="text-[10px] text-gray-400 block">الإجمالي</span>
                  <span className="font-mono font-bold text-xs">{customerMessageModalData.tot?.toLocaleString()} {customerMessageModalData.cur}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400 block">الموصل (العربون)</span>
                  <span className="font-mono font-bold text-xs text-emerald-400">{customerMessageModalData.pd?.toLocaleString()} {customerMessageModalData.cur}</span>
                </div>
                <div>
                  <span className="text-[10px] text-amber-400 block">المتبقي</span>
                  <span className="font-mono font-black text-xs text-amber-300">{customerMessageModalData.rem?.toLocaleString()} {customerMessageModalData.cur}</span>
                </div>
              </div>

              {/* Interactive Links Row */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <a
                  href={customerMessageModalData.dressCardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-[11px] shadow-xs flex items-center justify-center gap-1.5 transition"
                >
                  <span>🖼️ فتح كرت الفستان عالي الدقة (PNG / طباعة)</span>
                  <span>↗</span>
                </a>
                <a
                  href={customerMessageModalData.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-1.5 px-2.5 rounded-xl bg-purple-50 dark:bg-slate-800 text-[#8F2A87] dark:text-purple-300 font-bold text-[11px] border border-purple-200 dark:border-purple-800 flex items-center gap-1"
                >
                  <span>📱 تتبع البروفة</span>
                  <span>↗</span>
                </a>
              </div>
            </div>

            {/* Quick Text View / Accordion */}
            <details className="text-xs text-gray-600 dark:text-slate-400 cursor-pointer">
              <summary className="font-bold hover:text-[#8F2A87]">عرض نص الرسالة المرفقة للواتساب 📝</summary>
              <div className="mt-2 p-3 rounded-xl bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-[11.5px] leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto select-all">
                {customerMessageModalData.msg}
              </div>
            </details>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {/* WhatsApp Button */}
                <button
                  type="button"
                  onClick={() => {
                    let p = customerMessageModalData.phone ? String(customerMessageModalData.phone).replace(/\D/g, '') : '';
                    if (p.startsWith('0')) p = '967' + p.substring(1);
                    else if (!p.startsWith('967') && !p.startsWith('966') && p.length > 0) p = '967' + p;
                    const url = p 
                      ? `https://wa.me/${p}?text=${encodeURIComponent(customerMessageModalData.msg)}`
                      : `https://wa.me/?text=${encodeURIComponent(customerMessageModalData.msg)}`;
                    window.open(url, '_blank');
                  }}
                  className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  <span>إرسال بالواتساب مع كرت الفستان 📲</span>
                </button>

                {/* Copy to Clipboard Button */}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(customerMessageModalData.msg);
                    showToast('تم نسخ رابط كرت الفستان والرسالة الملكية بنجاح! 🌸📋', 'success');
                  }}
                  className="py-3 px-3 rounded-xl bg-[#8F2A87] hover:bg-[#76206f] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>📋</span>
                  <span>نسخ الرابط والرسالة الملكية</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setCustomerMessageModalData(null)}
                className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── نافذة التسليم السريع بالمسح (Scan to Deliver Modal) ── */}
      {scanDeliverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E8E5EA] dark:border-slate-800 space-y-4 text-right">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA] dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center text-xl shadow-xs">
                  📷
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#25232A] dark:text-slate-100">تسليم فوري بالمسح وقراءة الباركود (Scan-to-Deliver)</h3>
                  <p className="text-[11px] text-[#6F6B75] dark:text-slate-400">امسح كود التعليقة أو ملصق الكيس لتسليم الطلب بضغطة واحدة</p>
                </div>
              </div>
              <button 
                onClick={() => setScanDeliverModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Input Barcode Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleSearchScannedOrder(); }} className="space-y-2">
              <label className={labelCls}>امسح بقارئ الباركود أو ادخل رقم الفاتورة / الكود:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={scanCodeInput}
                  onChange={e => setScanCodeInput(e.target.value)}
                  placeholder="مثال: ORD-1001 أو امسح الباركود..."
                  className="flex-1 h-11 px-3.5 rounded-xl border-2 border-dashed border-emerald-500/60 bg-emerald-50/20 dark:bg-slate-950 text-xs font-mono font-bold text-[#25232A] dark:text-slate-100 outline-none focus:border-emerald-600"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  تعرف 🎯
                </button>
              </div>
            </form>

            {/* Scanned Order Details */}
            {scannedOrder && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-black text-emerald-800 dark:text-emerald-300">#{scannedOrder.order_no || ('ORD-' + scannedOrder.id)}</span>
                    <h4 className="font-bold text-sm text-[#25232A] dark:text-slate-100">{scannedOrder.customer_name}</h4>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300">
                    {scannedOrder.status || 'جاهز للتسليم'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
                  <div>
                    <span className="text-[#6F6B75] dark:text-slate-400 block text-[10.5px]">الموديل / الفستان:</span>
                    <span className="font-bold text-[#25232A] dark:text-slate-200">{scannedOrder.product_name || 'فستان الأميرات'}</span>
                  </div>
                  <div>
                    <span className="text-[#6F6B75] dark:text-slate-400 block text-[10.5px]">اسم الأميرة:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-300">{scannedOrder.child_name || 'الأميرة'}</span>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-[#6F6B75] dark:text-slate-400 block">المبلغ المتبقي:</span>
                    <span className="font-mono font-black text-sm text-[#B0005A] dark:text-rose-400">
                      {Math.max(0, (parseFloat(scannedOrder.total ?? scannedOrder.total_amount) || 0) - (parseFloat(scannedOrder.paid ?? scannedOrder.paid_amount) || 0)).toLocaleString()} {currencyDisplay}
                    </span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#25232A] dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={scanCollectRemaining}
                      onChange={e => setScanCollectRemaining(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>تحصيل المتبقي نقداً الآن 💵</span>
                  </label>
                </div>

                <button
                  type="button"
                  disabled={scanDeliveryLoading}
                  onClick={handleConfirmScanDelivery}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{scanDeliveryLoading ? 'جاري التسليم...' : '✅ تأكيد التسليم الملكي الفوري بضغطة واحدة'}</span>
                </button>
              </div>
            )}

            {!scannedOrder && (
              <div className="p-6 text-center text-[#6F6B75] dark:text-slate-400 text-xs border border-dashed rounded-2xl">
                <span className="text-3xl block mb-1">🏷️</span>
                وجه ماسح الباركود لملصق الكيس أو بطاقة الفستان للتعرف التلقائي
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── نافذة قيد تذكرة تعديل البروفة (Fitting Alteration Ticket Modal) ── */}
      {alterationModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E8E5EA] dark:border-slate-800 space-y-4 text-right">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA] dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-[#B0005A] text-white flex items-center justify-center text-xl shadow-xs">
                  ✂️
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#25232A] dark:text-slate-100">تذكرة تعديل بروفة ومقاس (Fitting Alteration Ticket)</h3>
                  <p className="text-[11px] text-[#6F6B75] dark:text-slate-400">
                    طلب: {alterationModalOrder.order_no || alterationModalOrder.id} • {alterationModalOrder.customer_name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setAlterationModalOrder(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAlteration} className="space-y-3.5">
              {/* Dress preview */}
              <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800/50 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-[#25232A] dark:text-slate-100">{alterationModalOrder.product_name || 'فستان'}</span>
                  <span className="text-[10.5px] text-[#6F6B75] dark:text-slate-400 block">للأميرة: {alterationModalOrder.child_name || 'الأميرة'}</span>
                </div>
                <span className="font-mono text-purple-700 dark:text-purple-300 font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                  {alterationModalOrder.order_no}
                </span>
              </div>

              {/* Cause / Reason */}
              <div>
                <label className={labelCls}>سبب ووجه التعديل المطلوب <span className="text-[#D64545] font-bold">*</span></label>
                <select
                  value={alterationForm.reason}
                  onChange={e => setAlterationForm({ ...alterationForm, reason: e.target.value })}
                  className={inputCls}
                >
                  <option value="مقاس غير مضبوط (ضيق/واسع)">مقاس غير مضبوط (ضيق / واسع)</option>
                  <option value="طول الفستان (طويل/قصير)">طول الفستان (طويل / قصير)</option>
                  <option value="تعديل خصر/صدر">تعديل الخصر أو الصدر</option>
                  <option value="تعديل سحاب/أزرار">تعديل سحاب / أزرار / مشابك</option>
                  <option value="رغبة العميل/تغيير تفاصيل">رغبة العميلة / إضافة أو إزالة تفاصيل</option>
                  <option value="عيب خياطة/جودة">ملاحظة فحص جودة / عيب تشطيب</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>ملاحظات التعديل الدقيقة للورشة والخياط <span className="text-[#D64545] font-bold">*</span></label>
                <textarea
                  required
                  rows="3"
                  value={alterationForm.notes}
                  onChange={e => setAlterationForm({ ...alterationForm, notes: e.target.value })}
                  placeholder="مثال: تقصير الذيل 2 سم وتضييق الخصر 1.5 سم من الجانبين..."
                  className="w-full p-3 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-[#25232A] dark:text-slate-100 outline-none focus:border-purple-600 resize-none"
                ></textarea>
              </div>

              {/* Severity & Target Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>درجة الأهمية والسرعة</label>
                  <select
                    value={alterationForm.severity}
                    onChange={e => setAlterationForm({ ...alterationForm, severity: e.target.value })}
                    className={inputCls}
                  >
                    <option value="normal">عادي (جدول المشغل القياسي)</option>
                    <option value="urgent">عاجل جداً ⚡ (بروفة سريعة)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>موعد التسليم بعد التعديل</label>
                  <input
                    type="date"
                    value={alterationForm.target_date}
                    onChange={e => setAlterationForm({ ...alterationForm, target_date: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Assigned Tailor */}
              <div>
                <label className={labelCls}>إسناد إلى خياط / فني معين (اختياري)</label>
                <input
                  type="text"
                  value={alterationForm.assigned_tailor}
                  onChange={e => setAlterationForm({ ...alterationForm, assigned_tailor: e.target.value })}
                  placeholder="اسم الخياط أو مسؤول التعديل..."
                  className={inputCls}
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={submittingAlteration}
                  className="flex-1 py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{submittingAlteration ? 'جاري الحفظ...' : '✂️ قيد التذكرة وإرسالها للمشغل'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAlterationModalOrder(null)}
                  className="py-3 px-4 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
