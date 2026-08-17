const { useState, useEffect, useMemo, useCallback, useRef } = React;
// ============================================================
// Orders.jsx - قسم الطلبات والفواتير v2.2
// Fixes: Balance Engine, Child Name Sync, Backend Sync
// ============================================================

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
        currency:      currencyDisplay,
        campaign_id:   campaignId,
        status:        "قيد الخياطة 🪡"
      };

      setOrders && setOrders([newOrd, ...(orders || [])]);

      try {
        await callGAS("addOrder", newOrd);
        showToast("تم إصدار وحفظ الفاتورة سحابياً ☁️📄");
        
        fetch('http://127.0.0.1:5002/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOrd)
        }).catch(e => console.error("Local sync error", e));

        // ── ترحيل القيود اليومية تلقائياً ──
        if (tot > 0) callGAS("addJournalEntry", {
          id: Date.now(), entry_no: `AUTOSALES-${ordNo}`,
          debit: "1100", credit: "4100", amount: tot,
          currency: currencyDisplay, date: TODAY_STR_ISO,
          notes: `قيد آلي: مبيعات الفاتورة ${ordNo}`
        }).catch(() => {});

        if (pd > 0) callGAS("addJournalEntry", {
          id: Date.now() + 1, entry_no: `AUTODEP-${ordNo}`,
          debit: "1000", credit: "1100", amount: pd,
          currency: currencyDisplay, date: TODAY_STR_ISO,
          notes: `قيد آلي: دفعة للفاتورة ${ordNo}`
        }).catch(() => {});

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

    const html = `<div style="font-family:Arial,sans-serif;direction:rtl;padding:24px;max-width:520px;margin:0 auto;border:1px solid #ddd;border-radius:12px;">
      <h2 style="text-align:center;color:#db2777;">👑 Little Princesses ERP</h2>
      <h3 style="text-align:center;color:#333;">فاتورة حجز وتفصيل</h3>
      <hr style="border-top:1px dashed #ccc;margin:16px 0;"/>
      <p><strong>رقم الطلب:</strong> ${order.order_no}</p>
      <p><strong>العميلة:</strong> ${order.customer_name}</p>
      ${order.child_name ? `<p><strong>اسم الطفلة:</strong> ${order.child_name}</p>` : ""}
      <p><strong>الموديل:</strong> ${order.product_name} × ${order.qty}</p>
      <hr style="border-top:1px dashed #ccc;margin:16px 0;"/>
      <p><strong>الإجمالي الكلي:</strong> ${tot.toLocaleString("en-US")} ${cur}</p>
      <p><strong>المدفوع / العربون:</strong> ${pd.toLocaleString("en-US")} ${cur}</p>
      <p style="color:${rem > 0 ? "#dc2626" : "#16a34a"};"><strong>المتبقي:</strong> ${rem.toLocaleString("en-US")} ${cur}</p>
      <hr style="border-top:1px dashed #ccc;margin:16px 0;"/>
      <p><strong>موعد التسليم:</strong> ${order.delivery_date ? order.delivery_date.split('T')[0] : '—'}</p>
      <div style="text-align:center;margin-top:24px;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=Order:${order.order_no}|Rem:${rem}" alt="QR"/>
        <p style="font-size:12px;color:#666;">امسح الكود لعرض تفاصيل الطلب</p>
      </div>
    </div>`;

    const w = window.open("", "", "width=620,height=820");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all outline-none min-h-[42px]";
  const labelCls = "block text-xs font-semibold text-slate-700 mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">

      {/* ── نموذج الإضافة / التعديل ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center text-sm font-bold">
              🛍️
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {isEditing ? "تعديل بيانات الفاتورة ✏️" : "حجز فستان / إصدار فاتورة جديدة 📄"}
              </h2>
              <p className="text-[11px] text-slate-500 font-normal">ربط العميلة والموديل والطفلة وتتبع الدفعات</p>
            </div>
          </div>
          {isEditing && (
            <button onClick={resetForm}
              className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors">
              إلغاء التعديل ✕
            </button>
          )}
        </div>

        <form onSubmit={handleSaveInvoice} className="p-6 space-y-5">

          {/* العميلة + الطفلة + الموديل */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>اختر العميلة من السجل <span className="text-rose-500 font-bold">*</span></label>
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
                <label className="text-xs font-semibold text-slate-700">اختر الفستان / الموديل <span className="text-rose-500 font-bold">*</span></label>
                <button type="button" onClick={async () => {
                   if(!productName) return showToast('يرجى اختيار الفستان أولاً', 'error');
                   setLoadingQuote(true);
                   try {
                     const res = await fetch(`http://127.0.0.1:5002/api/pricing/quick-quote?model_name=${encodeURIComponent(productName)}`);
                     const data = await res.json();
                     if(data.success) {
                        setQuoteText(data.quote_text);
                        setShowQuoteModal(true);
                     }
                   } catch(e) {
                     showToast('تعذر جلب عرض السعر', 'error');
                   }
                   setLoadingQuote(false);
                }} disabled={!productName || loadingQuote} className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition font-bold disabled:opacity-50">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>الكمية (عدد)</label>
              <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className={inputCls + " text-center font-mono"} />
            </div>
            <div>
              <label className={labelCls}>الإجمالي الكلي ({currencyDisplay})</label>
              <input type="number" step="0.01" min="0" value={total} onChange={e => setTotal(e.target.value)} className={inputCls + " text-center font-mono font-bold text-slate-900"} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>المدفوع / العربون ({currencyDisplay})</label>
              <input type="number" step="0.01" min="0" value={paid} onChange={e => setPaid(e.target.value)} className={inputCls + " text-center font-mono font-bold text-emerald-700"} placeholder="0.00" />
            </div>
          </div>

          {/* شريط المتبقي اللحظي */}
          {(totalNum > 0 || paidNum > 0) && (
            <div className={`flex items-center justify-between px-5 py-3 rounded-xl font-bold text-xs border ${
              remainingNum === 0
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
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
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-purple-700 hover:bg-purple-800 active:bg-purple-900 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              {isEditing ? "💾 حفظ تعديلات الفاتورة" : "📄 حفظ الفاتورة وتوليد QR Code"}
            </button>
          </div>
        </form>
      </div>

      {/* ── جدول الطلبات ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900">سجل الطلبات والفواتير</h3>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono font-semibold">{orders.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {(!orders || orders.length === 0) ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              لا توجد طلبات مسجلة بعد 📄
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  {['رقم الطلب','العميلة','اسم الطفلة','الفستان','الإجمالي','المتبقي','تاريخ التسليم','الحالة','الإجراءات'].map(h => (
                    <th key={h} className="px-3.5 py-3 text-right whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(o => {
                  const cust = (customers || []).find(c => getCustomerName(c) === o.customer_name);
                  const dispChild = (o.child_name && String(o.child_name).trim()) ? o.child_name : (cust?.measurements?.[0]?.child_name || "—");
                  const dispDate = o.delivery_date ? o.delivery_date.split('T')[0] : (cust?.measurements?.[0]?.event_date ? cust?.measurements?.[0]?.event_date.split('T')[0] : '—');
                  const rem = Math.max(0, (parseFloat(o.total) || 0) - (parseFloat(o.paid) || 0));

                  return (
                  <tr key={o.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-3.5 py-3 font-mono text-[11px] text-purple-700 font-bold whitespace-nowrap">{o.order_no}</td>
                    <td className="px-3.5 py-3 font-bold text-slate-900 whitespace-nowrap">{o.customer_name || "—"}</td>
                    <td className="px-3.5 py-3 font-semibold text-slate-700 whitespace-nowrap">{dispChild}</td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <span>{o.product_name}</span> <span className="text-slate-400 text-[11px] font-mono">×{o.qty}</span>
                    </td>
                    <td className="px-3.5 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {(parseFloat(o.total) || 0).toLocaleString("en-US")} {currencyDisplay}
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      {rem === 0 ? (
                        <span className="text-emerald-700 font-bold text-[11px]">مسدد ✅</span>
                      ) : (
                        <span className="text-rose-700 font-bold font-mono text-[11px]">{rem.toLocaleString("en-US")} {currencyDisplay}</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 font-mono text-slate-500 whitespace-nowrap">{dispDate}</td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <select
                        value={o.status || "قيد الخياطة 🪡"}
                        onChange={e => handleUpdateStatus(o.id, e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-800 px-2 py-1 rounded-lg font-bold outline-none cursor-pointer text-[11px]">
                        <option value="قيد القص ✂️">قيد القص ✂️</option>
                        <option value="قيد الخياطة 🪡">قيد الخياطة 🪡</option>
                        <option value="جاهز للتسليم 🛍️">جاهز للتسليم 🛍️</option>
                        <option value="تم التسليم ✅">تم التسليم ✅</option>
                      </select>
                    </td>
                    <td className="px-3.5 py-3 flex items-center gap-1.5 justify-center whitespace-nowrap">
                      <button onClick={() => sendWhatsAppInvoice(o)} title="إرسال واتساب" className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition">💬</button>
                      <button onClick={() => handleEdit(o)} title="تعديل" className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">✏️</button>
                      <button onClick={() => handlePrint(o)} title="طباعة" className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition">🖨️</button>
                      <button onClick={() => handleDelete(o.id)} title="حذف" className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition">🗑️</button>
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowQuoteModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                📋 عرض السعر الجاهز
              </h3>
              <button onClick={() => setShowQuoteModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <textarea 
                readOnly 
                value={quoteText} 
                className="w-full h-44 p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-800 outline-none resize-none"
              ></textarea>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(quoteText);
                  showToast('تم النسخ بنجاح 📲');
                }} 
                className="w-full py-3 rounded-xl font-bold text-xs text-white bg-purple-700 hover:bg-purple-800 transition flex items-center justify-center gap-2 cursor-pointer"
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
