// src/features/orders/components/OrderFormModal.jsx
const { useState, useEffect } = React;

function OrderFormModal({
  isOpen, onClose, isEditing, editingOrderId, editingOrder,
  customers = [], products = [], campaigns = [], currencyDisplay = "YER ريال",
  onSaveInvoice, onOpenQuote
}) {
  const getCustName = window.getCustomerName || ((c) => c?.name || '');
  const todayStr = typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10);
  const OrderPricing = window.OrderPricing || {};

  const [customerName, setCustomerName] = useState("");
  const [childName, setChildName] = useState("");
  const [productName, setProductName] = useState("");
  const [qty, setQty] = useState("1");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [deliveryPaymentMode, setDeliveryPaymentMode] = useState("DIRECT_TO_COURIER");
  const [total, setTotal] = useState("");
  const [paid, setPaid] = useState("");
  const [orderDate, setOrderDate] = useState(todayStr);
  const [deliveryDate, setDeliveryDate] = useState(todayStr);
  const [campaignId, setCampaignId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCustomer = (customers || []).find(c => (getCustName(c) || "").trim() === (customerName || "").trim());
  const availableChildren = selectedCustomer?.measurements || [];

  useEffect(() => {
    if (isEditing && editingOrder) {
      let cName = editingOrder.customer_name || "", chName = editingOrder.child_name || "";
      if (!chName && cName.includes("(") && cName.endsWith(")")) {
        const m = cName.match(/^(.*)\s+\((.*)\)$/);
        if (m) { cName = m[1].trim(); chName = m[2].trim(); }
      }
      setCustomerName(cName); setChildName(chName); setProductName(editingOrder.product_name || "");
      setQty(String(editingOrder.qty || "1"));
      setDeliveryFee(String(editingOrder.delivery_fee || editingOrder.delivery || "0"));
      setDeliveryPaymentMode(editingOrder.delivery_payment_mode || "DIRECT_TO_COURIER");
      setTotal(String(editingOrder.total || editingOrder.total_amount || "0"));
      setPaid(String(editingOrder.paid || editingOrder.paid_amount || "0"));
      setOrderDate(editingOrder.order_date ? String(editingOrder.order_date).split("T")[0] : todayStr);
      setDeliveryDate(editingOrder.delivery_date ? String(editingOrder.delivery_date).split("T")[0] : todayStr);
      setCampaignId(editingOrder.campaign_id || "");
    } else if (!isEditing) {
      setCustomerName(""); setChildName(""); setProductName(""); setQty("1"); setDeliveryFee("0");
      setDeliveryPaymentMode("DIRECT_TO_COURIER"); setTotal(""); setPaid("");
      setOrderDate(todayStr); setDeliveryDate(todayStr); setCampaignId("");
    }
  }, [isEditing, editingOrder, todayStr]);

  useEffect(() => {
    if (isEditing) return;
    const selP = (products || []).find(p => p.name === productName);
    if (!selP) return;
    const child = availableChildren.find(c => c.child_name === childName);
    const tier = child?.estimated_age || (child && OrderPricing.resolveAgeTier ? OrderPricing.resolveAgeTier(child.dress_length || child.total_height) : null);
    const targetPrice = OrderPricing.resolveProductTierPrice ? OrderPricing.resolveProductTierPrice(selP, tier, child) : (parseFloat(selP.sell_price) || 0);
    const q = Math.max(1, parseInt(qty, 10) || 1);
    const df = Math.max(0, parseFloat(deliveryFee) || 0);
    const isPrepaid = deliveryPaymentMode === "PREPAID_VIA_ATELIER";
    const totalAmt = (targetPrice * q) + (isPrepaid ? df : 0);
    if (targetPrice > 0 || (isPrepaid && df > 0)) setTotal(totalAmt.toString());
  }, [productName, childName, qty, deliveryFee, deliveryPaymentMode, isEditing, products, availableChildren]);

  useEffect(() => {
    if (isEditing || !childName || !availableChildren.length) return;
    const child = availableChildren.find(c => c.child_name === childName);
    if (child?.event_date) {
      const d = child.event_date.toString().split("T")[0];
      if (d && d.length === 10) setDeliveryDate(d);
    }
  }, [childName, isEditing, availableChildren]);

  if (!isOpen) return null;

  const totalNum = Math.max(0, parseFloat(total) || 0), paidNum = Math.max(0, parseFloat(paid) || 0), remainingNum = Math.max(0, totalNum - paidNum);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSaveInvoice({
        isEditing, editingOrderId,
        payload: {
          customer_name: customerName, child_name: childName, product_name: productName,
          qty, total, paid, delivery_fee: parseFloat(deliveryFee) || 0,
          delivery_payment_mode: deliveryPaymentMode,
          order_date: orderDate, delivery_date: deliveryDate, campaign_id: campaignId
        },
        resetForm: onClose
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#25232A] dark:text-slate-100 text-xs font-medium placeholder:text-[#6F6B75] focus:border-[#B0005A] focus:ring-2 focus:ring-[#FCE8F2] outline-none transition-all";
  const labelCls = "block text-xs font-semibold text-[#25232A] dark:text-slate-200 mb-1.5";

  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#E8E5EA] dark:border-slate-800 shadow-2xs overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E8E5EA] dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-white via-[#FAFAFB] to-white dark:from-[#0f172a] dark:to-[#0f172a]">
        <h2 className="text-sm font-bold text-[#25232A] dark:text-slate-100 flex items-center gap-2">
          <span className="text-[#B0005A]">📄</span>
          {isEditing ? "تعديل بيانات الفاتورة والطلب" : "إصدار أمر بيع / فاتورة جديدة"}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#6F6B75] dark:text-slate-400"><span className="text-[#D64545] font-bold">*</span> الحقول الإلزامية</span>
          {onClose && <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-sm">✕</button>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
          <div>
            <label className={labelCls}>اختر العميل من السجل <span className="text-[#D64545] font-bold">*</span></label>
            <select value={customerName} onChange={e => { setCustomerName(e.target.value); setChildName(""); }} className={inputCls} required>
              <option value="">-- اختر العميل --</option>
              {(customers || []).map(c => { const n = getCustName(c); return n ? <option key={c.customer_id || c.id || n} value={n}>{n}{c.phone ? ` (${c.phone})` : ""}</option> : null; })}
            </select>
          </div>
          <div>
            <label className={labelCls}>اختر المستفيد / المواصفة (اختياري)</label>
            <select value={childName} onChange={e => setChildName(e.target.value)} disabled={!availableChildren.length && !isEditing} className={inputCls + " disabled:opacity-50"}>
              <option value="">-- اختر المستفيد / المواصفة --</option>
              {availableChildren.map(ch => <option key={ch.child_name} value={ch.child_name}>{ch.child_name}{ch.estimated_age ? ` (${ch.estimated_age})` : ""}</option>)}
              {isEditing && childName && !availableChildren.find(c => c.child_name === childName) && <option value={childName}>{childName} (محفوظ مسبقاً)</option>}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#25232A] dark:text-slate-200">اختر الصنف / الموديل <span className="text-[#D64545] font-bold">*</span></label>
              {onOpenQuote && <button type="button" onClick={() => onOpenQuote(productName)} disabled={!productName} className="text-[10px] bg-[#E2F5F7] dark:bg-cyan-950/50 text-[#007F8C] dark:text-cyan-300 border border-[#C5ECF0] px-2 py-0.5 rounded-md hover:bg-[#C5ECF0] font-bold disabled:opacity-50 cursor-pointer">📋 عرض السعر</button>}
            </div>
            <select value={productName} onChange={e => setProductName(e.target.value)} className={inputCls} required>
              <option value="">-- اختر الصنف / الموديل --</option>
              {(products || []).map(p => <option key={p.id} value={p.name}>{p.name} ({(parseFloat(p.sell_price) || 0).toLocaleString("en-US")} {currencyDisplay})</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4.5">
          <div><label className={labelCls}>تاريخ الفاتورة / الحجز 📅</label><input type="date" lang="en-GB" dir="ltr" value={orderDate} onChange={e => setOrderDate(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>موعد التسليم المتوقع 📅</label><input type="date" lang="en-GB" dir="ltr" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>مصدر الطلب / الحملة 📢</label>
            <select value={campaignId} onChange={e => setCampaignId(e.target.value)} className={inputCls}>
              <option value="">-- بدون حملة (مبيعات مباشرة) --</option>
              {(campaigns || []).map(c => <option key={c.id || c.campaign_no} value={c.campaign_no || c.id}>{c.campaign_name} ({c.platform})</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-purple-50/50 dark:bg-slate-800/40 border border-[#E5CEE7] dark:border-slate-700">
          <div>
            <label className={labelCls}>طريقة دفع رسوم التوصيل 🚚</label>
            <select value={deliveryPaymentMode} onChange={e => setDeliveryPaymentMode(e.target.value)} className={inputCls}>
              <option value="DIRECT_TO_COURIER">🛵 دفع مباشر للسائق عند الاستلام (لا يضاف للفاتورة)</option>
              <option value="PREPAID_VIA_ATELIER">🚚 مدفوع مسبقاً للأتيليه (يضاف لإجمالي الفاتورة)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>رسوم التوصيل ({currencyDisplay})</label>
            <input type="number" step="0.01" min="0" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} className={inputCls + " text-center font-mono font-bold"} placeholder="0.00" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div><label className={labelCls}>الكمية (عدد)</label><input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className={inputCls + " text-center font-mono font-bold"} /></div>
          <div><label className={labelCls}>الإجمالي الكلي ({currencyDisplay})</label><input type="number" step="0.01" min="0" value={total} onChange={e => setTotal(e.target.value)} className={inputCls + " text-center font-mono font-bold"} placeholder="0.00" /></div>
          <div><label className={labelCls}>المدفوع / العربون ({currencyDisplay})</label><input type="number" step="0.01" min="0" value={paid} onChange={e => setPaid(e.target.value)} className={inputCls + " text-center font-mono font-bold text-[#007F8C]"} placeholder="0.00" /></div>
        </div>

        {(totalNum > 0 || paidNum > 0) && (
          <div className={`flex items-center justify-between px-5 py-3 rounded-xl font-bold text-xs border ${remainingNum === 0 ? "bg-[#E2F5F7] border-[#C5ECF0] text-[#007F8C]" : "bg-[#FFF1DC] border-[#FFE4B9] text-[#C97300]"}`}>
            <span>المبلغ المتبقي المحسوب لحظياً ⚡</span>
            <span className="font-mono text-sm">{remainingNum === 0 ? "مسدد بالكامل ✅" : `${remainingNum.toLocaleString("en-US")} ${currencyDisplay}`}</span>
          </div>
        )}

        <div className="flex justify-end pt-2 gap-2">
          {onClose && <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-xs bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 transition cursor-pointer">إلغاء</button>}
          <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs text-white bg-[#B0005A] hover:bg-[#8E0049] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
            <span>{isSubmitting ? "جاري الحفظ..." : (isEditing ? "حفظ تعديلات الفاتورة" : "حفظ الفاتورة وتوليد QR Code")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

window.OrderFormModal = OrderFormModal;
