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
  
  // Quick Quote State
  const [quoteText, setQuoteText] = useState('');
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);

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
        await callGAS("updateOrder", updatedOrd);
        showToast("تم تحديث الفاتورة بنجاح 💾");
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
        await callGAS("addOrder", newOrd);
        showToast("تم إصدار وحفظ الفاتورة سحابياً ☁️📄");
        
        fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOrd)
        }).catch(e => console.error("Local sync error", e));

        // ── ترحيل القيود اليومية المحاسبية تلقائياً (Double-Entry) ──
        // 1. قيد إثبات المبيعات: من حـ/ ذمم العميلات (1131) إلى حـ/ إيرادات تفصيل وتصميم الفساتين (4111)
        if (tot > 0) {
          callGAS("addJournalEntry", {
            id: Date.now(),
            transaction_id: `TX-SALE-${ordNo}`,
            entry_no: `AUTO-SALE-${ordNo}`,
            debit: "1131",
            credit: "4111",
            amount: tot,
            currency: ordCurrCode,
            exchange_rate: ordRate,
            base_amount: baseTotalObj.base_amount,
            ref_type: 'SALES_ORDER',
            ref_id: ordNo,
            date: orderDate || TODAY_STR_ISO,
            notes: `قيد مبيعات الفاتورة ${ordNo} - العميلة: ${customerName}`
          }).catch(() => {});
        }

        // 2. قيد تحصيل الدفعة المقدمة: من حـ/ الصندوق الرئيسي (1111) إلى حـ/ ذمم العميلات (1131)
        if (pd > 0) {
          callGAS("addJournalEntry", {
            id: Date.now() + 1,
            transaction_id: `TX-DEP-${ordNo}`,
            entry_no: `AUTO-DEP-${ordNo}`,
            debit: "1111",
            credit: "1131",
            amount: pd,
            currency: ordCurrCode,
            exchange_rate: ordRate,
            base_amount: basePaidObj.base_amount,
            ref_type: 'SALES_PAYMENT',
            ref_id: ordNo,
            date: orderDate || TODAY_STR_ISO,
            notes: `قيد تحصيل دفعة للفاتورة ${ordNo} - العميلة: ${customerName}`
          }).catch(() => {});
        }

      } catch {
        showToast("تم الحفظ محلياً 📄");
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
    setOrders && setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    try {
      await callGAS("updateOrder", { id: orderId, status: newStatus });
      showToast("تم تحديث الحالة 🔄");
    } catch { showToast("خطأ في التحديث", "error"); }
  };

  // ── حذف طلب ──
  const handleDelete = async (orderId) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟ 🗑️")) return;
    setOrders && setOrders(orders.filter(o => o.id !== orderId));
    try {
      await callGAS("deleteOrder", { id: orderId });
      showToast("تم الحذف 🗑️");
    } catch { showToast("خطأ في الحذف", "error"); }
  };

  // ── إرسال واتساب ──
  const sendWhatsAppInvoice = (order) => {
    const cust = (customers || []).find(c => getCustomerName(c) === order.customer_name);
    let phone = cust?.phone || cust?.["رقم الهاتف"] || cust?.Phone || "";
    
    if (!phone) {
      showToast("عذراً، رقم الهاتف غير مسجل لهذه العميلة ⚠️", "error");
      return;
    }

    phone = phone.toString().replace(/\D/g, '');
    if (phone.startsWith("0")) phone = "967" + phone.substring(1);
    else if (!phone.startsWith("967") && !phone.startsWith("966")) phone = "967" + phone;

    const tot = parseFloat(order.total || 0);
    const pd  = parseFloat(order.paid  || 0);
    const rem = Math.max(0, tot - pd);
    const cur = order.currency || currencyDisplay;

    const msg = `مرحباً بكِ في مؤسسة الأميرات الصغيرات 👑\n\n` +
      `تم تسجيل طلبك بنجاح ✅\n` +
      `رقم الطلب: ${order.order_no}\n` +
      `الفستان: ${order.product_name || "غير محدد"} × ${order.qty || 1}\n` +
      `المبلغ الإجمالي: ${tot.toLocaleString("en-US")} ${cur}\n` +
      `المدفوع (عربون): ${pd.toLocaleString("en-US")} ${cur}\n` +
      `المتبقي: ${rem.toLocaleString("en-US")} ${cur}\n\n` +
      `تاريخ التسليم المتوقع: ${order.delivery_date ? order.delivery_date.split('T')[0] : "يحدد لاحقاً"}\n\n` +
      `نسعد بخدمتكم 🌸!`;

    const encodedMsg = encodeURIComponent(msg);
    window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
  };

  // ── طباعة الفاتورة ──
  const handlePrint = (order) => {
    const tot = parseFloat(order.total || 0);
    const pd  = parseFloat(order.paid  || 0);
    const rem = Math.max(0, tot - pd);
    const cur = order.currency || currencyDisplay;

    const html = `<html dir="rtl"><head><meta charset="utf-8"><title>فاتورة - ${order.order_no}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #25232A; }
      h2 { text-align:center; color:#B0005A; margin:0 0 4px; }
      h3 { text-align:center; color:#6F6B75; margin:0 0 16px; font-size:14px; }
      hr { border:none; border-top:1px dashed #E8E5EA; margin:14px 0; }
      .row { display:flex; justify-content:space-between; margin:8px 0; font-size:13px; }
      .label { color:#6F6B75; }
      .val { font-weight:bold; }
      .rem { color:${rem > 0 ? "#C97300" : "#007F8C"}; font-weight:bold; font-size:15px; }
      .qr { text-align:center; margin-top:20px; }
      .footer { text-align:center; font-size:11px; color:#6F6B75; margin-top:20px; }
    </style></head><body>
      <h2>👑 Little Princesses ERP</h2>
      <h3>فاتورة حجز وتفصيل أزياء</h3>
      <hr/>
      <div class="row"><span class="label">رقم الطلب</span><span class="val">${order.order_no}</span></div>
      <div class="row"><span class="label">العميلة</span><span class="val">${order.customer_name}</span></div>
      ${order.child_name ? `<div class="row"><span class="label">اسم الطفلة</span><span class="val">${order.child_name}</span></div>` : ""}
      <div class="row"><span class="label">الموديل</span><span class="val">${order.product_name} × ${order.qty}</span></div>
      <hr/>
      <div class="row"><span class="label">الإجمالي الكلي</span><span class="val">${tot.toLocaleString("en-US")} ${cur}</span></div>
      <div class="row"><span class="label">المدفوع / العربون</span><span class="val">${pd.toLocaleString("en-US")} ${cur}</span></div>
      <div class="row"><span class="label">المتبقي</span><span class="rem">${rem.toLocaleString("en-US")} ${cur} ${rem === 0 ? "✅" : ""}</span></div>
      <hr/>
      <div class="row"><span class="label">موعد التسليم المتوقع</span><span class="val">${order.delivery_date ? order.delivery_date.split('T')[0] : '—'}</span></div>
      <div class="qr">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=Order:${order.order_no}|Rem:${rem}" alt="QR"/>
        <p style="font-size:11px;color:#6F6B75;margin-top:6px;">امسح الكود لعرض تفاصيل الطلب</p>
      </div>
      <div class="footer">👑 Little Princesses ERP — ${new Date().toLocaleDateString('ar-SA')}</div>
    </body></html>`;

    const w = window.open("", "", "width=640,height=850");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
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

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#B0005A] focus:ring-2 focus:ring-[#FCE8F2] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">

      {/* ── Studio Header & KPI Strip ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#FCE8F2] text-[#B0005A] border border-[#F2A4CB] flex items-center justify-center text-xl font-bold shadow-xs">
              <Icons.ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#25232A]">
                إدارة الطلبيات والمبيعات ونقاط البيع (Fashion Orders & POS)
              </h1>
              <p className="text-xs text-[#6F6B75] mt-0.5">
                حجز الفساتين، ربط العملاء بالأطفال، تتبع الدفعات والتسليم، وإصدار الفواتير
              </p>
            </div>
          </div>
          {isEditing && (
            <button onClick={resetForm}
              className="text-xs px-4 py-2 bg-white text-[#D64545] border border-rose-200 rounded-xl font-bold hover:bg-rose-50 transition cursor-pointer">
              إلغاء التعديل ✕
            </button>
          )}
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#E8E5EA] bg-[#FAFAFB] divide-x divide-x-reverse divide-[#E8E5EA]">
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي الطلبيات</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#25232A] mt-1 block">
              {orders.length.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">طلب</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي المبيعات</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] mt-1 block">
              {orders.reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0).toLocaleString("en-US")} <span className="text-xs font-medium text-[#6F6B75]">{currencyDisplay}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي المحصل</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#B0005A] mt-1 block">
              {orders.reduce((acc, o) => acc + (parseFloat(o.paid) || 0), 0).toLocaleString("en-US")} <span className="text-xs font-medium text-[#6F6B75]">{currencyDisplay}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">المستحقات المتبقية</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#F28A00] mt-1 block">
              {orders.reduce((acc, o) => acc + Math.max(0, (parseFloat(o.total) || 0) - (parseFloat(o.paid) || 0)), 0).toLocaleString("en-US")} <span className="text-xs font-medium text-[#6F6B75]">{currencyDisplay}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── نموذج الإضافة / التعديل ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E5EA] flex items-center justify-between bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <h2 className="text-sm font-bold text-[#25232A] flex items-center gap-2">
            <span className="text-[#B0005A]">📄</span>
            {isEditing ? "تعديل بيانات الفاتورة والطلب" : "حجز فستان / إصدار فاتورة جديدة"}
          </h2>
          <span className="text-xs text-[#6F6B75]">
            <span className="text-[#D64545] font-bold">*</span> الحقول الإلزامية
          </span>
        </div>

        <form onSubmit={handleSaveInvoice} className="p-6 space-y-5">
          {/* العميلة + الطفلة + الموديل */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
            <div>
              <label className={labelCls}>اختر العميلة من السجل <span className="text-[#D64545] font-bold">*</span></label>
              <select value={customerName}
                onChange={e => { setCustomerName(e.target.value); setChildName(""); }}
                className={inputCls}>
                <option value="">-- اختر العميلة --</option>
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
              <label className={labelCls}>اختر الطفلة (اختياري)</label>
              <select value={childName} onChange={e => setChildName(e.target.value)}
                disabled={!availableChildren.length && !isEditing}
                className={inputCls + " disabled:opacity-50"}>
                <option value="">-- اختر الطفلة --</option>
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
                <label className="text-xs font-semibold text-[#25232A]">اختر الفستان / الموديل <span className="text-[#D64545] font-bold">*</span></label>
                <button type="button" onClick={async () => {
                   if(!productName) return showToast('يرجى اختيار الفستان أولاً', 'error');
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
                }} disabled={!productName || loadingQuote} className="text-[10px] bg-[#E2F5F7] text-[#007F8C] border border-[#C5ECF0] px-2 py-0.5 rounded-md hover:bg-[#C5ECF0] transition font-bold disabled:opacity-50 cursor-pointer">
                   📋 عرض السعر
                </button>
              </div>
              <select value={productName} onChange={e => setProductName(e.target.value)} className={inputCls}>
                <option value="">-- اختر الفستان --</option>
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
              <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>موعد التسليم المتوقع 📅</label>
              <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={inputCls} />
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
              <input type="number" step="0.01" min="0" value={total} onChange={e => setTotal(e.target.value)} className={inputCls + " text-center font-mono font-bold text-[#25232A]"} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>المدفوع / العربون ({currencyDisplay})</label>
              <input type="number" step="0.01" min="0" value={paid} onChange={e => setPaid(e.target.value)} className={inputCls + " text-center font-mono font-bold text-[#007F8C]"} placeholder="0.00" />
            </div>
          </div>

          {/* شريط المتبقي اللحظي */}
          {(totalNum > 0 || paidNum > 0) && (
            <div className={`flex items-center justify-between px-5 py-3 rounded-xl font-bold text-xs border ${
              remainingNum === 0
                ? "bg-[#E2F5F7] border-[#C5ECF0] text-[#007F8C]"
                : "bg-[#FFF1DC] border-[#FFE4B9] text-[#C97300]"
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
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <h3 className="font-bold text-sm text-[#25232A]">سجل الطلبات والفواتير المعتمدة</h3>
            <span className="text-xs bg-[#FCE8F2] text-[#B0005A] font-bold px-2.5 py-0.5 rounded-full font-mono">{filteredOrders.length}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-semibold text-[#25232A] outline-none"
            >
              <option value="الكل">جميع الحالات</option>
              <option value="قيد القص ✂️">قيد القص ✂️</option>
              <option value="قيد الخياطة 🪡">قيد الخياطة 🪡</option>
              <option value="جاهز للتسليم 🛍️">جاهز للتسليم 🛍️</option>
              <option value="تم التسليم ✅">تم التسليم ✅</option>
            </select>

            <div className="relative flex-1 sm:w-64">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-3 pr-8 h-10 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-medium w-full focus:bg-white focus:border-[#B0005A] outline-none"
                placeholder="بحث برقم الطلب، العميلة، أو الموديل..."
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] text-xs pointer-events-none">🔍</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-[#6F6B75] text-xs font-medium">
              لا توجد طلبات تطابق البحث 📄
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  {['رقم الطلب','العميلة','اسم الطفلة','الفستان','الإجمالي','المتبقي','تاريخ التسليم','الحالة','الإجراءات'].map(h => (
                    <th key={h} className="px-4 py-3 text-right whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {filteredOrders.map(o => {
                  const cust = (customers || []).find(c => getCustomerName(c) === o.customer_name);
                  const dispChild = (o.child_name && String(o.child_name).trim()) ? o.child_name : (cust?.measurements?.[0]?.child_name || "—");
                  const dispDate = o.delivery_date ? o.delivery_date.split('T')[0] : (cust?.measurements?.[0]?.event_date ? cust?.measurements?.[0]?.event_date.split('T')[0] : '—');
                  const rem = Math.max(0, (parseFloat(o.total) || 0) - (parseFloat(o.paid) || 0));

                  return (
                  <tr key={o.id} className="hover:bg-[#FAFAFB] transition-colors">
                    <td className="px-4 py-3 font-mono text-[11.5px] text-[#B0005A] font-bold whitespace-nowrap">{o.order_no}</td>
                    <td className="px-4 py-3 font-bold text-[#25232A] whitespace-nowrap">{o.customer_name || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-[#8F2A87] whitespace-nowrap">{dispChild}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span>{o.product_name}</span> <span className="text-[#6F6B75] text-[11px] font-mono">×{o.qty}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#25232A] whitespace-nowrap">
                      {(parseFloat(o.total) || 0).toLocaleString("en-US")} {currencyDisplay}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {rem === 0 ? (
                        <span className="text-[#007F8C] bg-[#E2F5F7] border border-[#C5ECF0] px-2 py-0.5 rounded-md font-bold text-[10.5px]">مسدد ✅</span>
                      ) : (
                        <span className="text-[#C97300] bg-[#FFF1DC] border border-[#FFE4B9] px-2 py-0.5 rounded-md font-bold font-mono text-[10.5px]">{rem.toLocaleString("en-US")} {currencyDisplay}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#6F6B75] whitespace-nowrap">{dispDate}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={o.status || "قيد الخياطة 🪡"}
                        onChange={e => handleUpdateStatus(o.id, e.target.value)}
                        className="bg-[#FAFAFB] border border-[#E8E5EA] text-[#25232A] px-2 py-1 rounded-lg font-bold outline-none cursor-pointer text-[11px]">
                        <option value="قيد القص ✂️">قيد القص ✂️</option>
                        <option value="قيد الخياطة 🪡">قيد الخياطة 🪡</option>
                        <option value="جاهز للتسليم 🛍️">جاهز للتسليم 🛍️</option>
                        <option value="تم التسليم ✅">تم التسليم ✅</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-1.5 justify-center whitespace-nowrap">
                      <button onClick={() => sendWhatsAppInvoice(o)} title="إرسال واتساب" className="w-8 h-8 rounded-xl bg-white hover:bg-[#E2F5F7] text-[#6F6B75] hover:text-[#007F8C] border border-[#E8E5EA] transition-all flex items-center justify-center cursor-pointer">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      </button>
                      <button onClick={() => handleEdit(o)} title="تعديل" className="w-8 h-8 rounded-xl bg-white hover:bg-[#F2E7F3] text-[#6F6B75] hover:text-[#8F2A87] border border-[#E8E5EA] transition-all flex items-center justify-center cursor-pointer">
                        ✏️
                      </button>
                      <button onClick={() => handlePrint(o)} title="طباعة" className="w-8 h-8 rounded-xl bg-white hover:bg-[#FCE8F2] text-[#6F6B75] hover:text-[#B0005A] border border-[#E8E5EA] transition-all flex items-center justify-center cursor-pointer">
                        🖨️
                      </button>
                      <button onClick={() => handleDelete(o.id)} title="حذف" className="w-8 h-8 rounded-xl bg-white hover:bg-rose-50 text-[#6F6B75] hover:text-[#D64545] border border-[#E8E5EA] transition-all flex items-center justify-center cursor-pointer">
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

      {/* Quick Quote Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowQuoteModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-[#E8E5EA] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-[#FAFAFB] px-5 py-4 border-b border-[#E8E5EA] flex justify-between items-center">
              <h3 className="font-bold text-[#25232A] text-sm flex items-center gap-2">
                📋 عرض السعر الجاهز للمراسلة
              </h3>
              <button onClick={() => setShowQuoteModal(false)} className="text-[#6F6B75] hover:text-[#25232A]">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <textarea 
                readOnly 
                value={quoteText} 
                className="w-full h-44 p-3.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-mono text-[#25232A] outline-none resize-none"
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
    </div>
  );
}
