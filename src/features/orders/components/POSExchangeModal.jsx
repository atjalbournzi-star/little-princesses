// src/features/orders/components/POSExchangeModal.jsx
// نافذة استبدال المقاس للفواتير السابقة ذرياً مع تسوية المخزون وفارق السعر

const { useState, useEffect, useMemo } = React;

function POSExchangeModal({ isOpen, onClose, orders = [], posCatalog = [], showToast, onExchangeComplete, currCode = 'YER' }) {
  const posOrders = useMemo(() => (orders || []).filter(o => String(o?.order_no || o?.id || '').startsWith('POS-')), [orders]);

  const [selectedOrderNo, setSelectedOrderNo] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [oldVariantId, setOldVariantId] = useState('');
  const [newVariantId, setNewVariantId] = useState('');
  const [qty, setQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('نقد (كاش)');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && posOrders.length > 0 && !selectedOrderNo) {
      setSelectedOrderNo(posOrders[0].order_no || posOrders[0].id);
    }
  }, [isOpen, posOrders.length]);

  useEffect(() => {
    if (!isOpen || !selectedOrderNo) return;
    setLoadingItems(true);
    fetch(`/api/pos/orders/${encodeURIComponent(selectedOrderNo)}/items`)
      .then(r => r.json())
      .then(d => {
        const list = (d?.success && Array.isArray(d.data)) ? d.data.filter(i => i.variant_id) : [];
        setOrderItems(list);
        setOldVariantId(list[0]?.variant_id || '');
      })
      .catch(() => setOrderItems([]))
      .finally(() => setLoadingItems(false));
  }, [isOpen, selectedOrderNo]);

  const allAvailableVariants = useMemo(() => {
    const out = [];
    (posCatalog || []).forEach(p => {
      (p.variants || []).forEach(v => {
        if ((parseFloat(v.stock_qty) || 0) > 0 && v.id !== oldVariantId) {
          out.push({ ...v, product_name: p.name });
        }
      });
    });
    return out;
  }, [posCatalog, oldVariantId]);

  const oldItem = orderItems.find(i => i.variant_id === oldVariantId);
  const newVar = allAvailableVariants.find(v => v.id === newVariantId);
  const priceDiff = (oldItem && newVar) ? ((parseFloat(newVar.selling_price) || 0) - (parseFloat(oldItem.unit_price) || 0)) * (parseInt(qty) || 1) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrderNo || !oldVariantId || !newVariantId) return showToast?.('يرجى تحديد الفاتورة والمقاس القديم والجديد ⚠️', 'error');
    setSubmitting(true);
    try {
      const res = await fetch('/api/pos/exchange-size', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_no: selectedOrderNo, old_variant_id: oldVariantId, new_variant_id: newVariantId,
          quantity: parseInt(qty) || 1, payment_method: paymentMethod, notes
        })
      }).then(r => r.json());
      if (!res?.success) throw new Error(res?.error || res?.message || 'فشل استبدال المقاس');
      showToast?.(res.message || 'تم استبدال المقاس وتسوية المخزون والحسابات بنجاح 🔄');
      onExchangeComplete?.(res.data);
      window.dispatchEvent(new CustomEvent('erp:inventoryChanged'));
      onClose?.();
    } catch (err) {
      showToast?.(err.message || 'خطأ أثناء استبدال المقاس', 'error');
    } finally { setSubmitting(false); }
  };

  if (!isOpen) return null;
  const inp = "w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-xs text-slate-900 dark:text-white outline-none focus:border-pink-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn" dir="rtl" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-[#111C38] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 bg-[#0F172A] text-white flex items-center justify-between border-b border-pink-600/50">
          <div className="flex items-center gap-2">
            <span>🔄</span>
            <h3 className="text-xs font-extrabold">استبدال مقاس لفاتورة مبيعات سابقة (ACID)</h3>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اختر الفاتورة:</label>
            <select className={inp} value={selectedOrderNo} onChange={e => setSelectedOrderNo(e.target.value)}>
              <option value="">-- اختر فاتورة POS --</option>
              {posOrders.map(o => (
                <option key={o.id || o.order_no} value={o.order_no || o.id}>
                  {o.order_no} — {o.customer_name || 'عميل عام'} ({(parseFloat(o.total_amount || o.total || 0)).toLocaleString('en-US')} {currCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">المقاس المُرتجع من العميل:</label>
            {loadingItems ? (
              <div className="text-[11px] text-slate-400">جاري تحميل بنود الفاتورة...</div>
            ) : orderItems.length === 0 ? (
              <div className="text-[11px] text-amber-600">لا توجد أصناف بمقاسات قابلة للاستبدال في هذه الفاتورة</div>
            ) : (
              <select className={inp} value={oldVariantId} onChange={e => setOldVariantId(e.target.value)}>
                {orderItems.map(it => (
                  <option key={it.id} value={it.variant_id}>
                    {it.product_name} — {it.age_size} {it.color_name ? `(${it.color_name})` : ''} — السعر: {it.unit_price}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">المقاس البديل (من المخزون المتوفر):</label>
            <select className={inp} value={newVariantId} onChange={e => setNewVariantId(e.target.value)}>
              <option value="">-- اختر المقاس الجديد --</option>
              {allAvailableVariants.map(v => (
                <option key={v.id} value={v.id}>
                  {v.product_name} — {v.age_size} {v.color_name ? `(${v.color_name})` : ''} — متوفر: {v.stock_qty} — السعر: {v.selling_price}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الكمية:</label>
              <input type="number" min="1" max={oldItem?.quantity || 1} dir="ltr" className={inp + " font-mono"} value={qty} onChange={e => setQty(e.target.value)} />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">طريقة تسوية الفرق:</label>
              <select className={inp} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="نقد (كاش)">نقد (كاش)</option>
                <option value="بنك / تحويل">بنك / تحويل</option>
              </select>
            </div>
          </div>

          {oldItem && newVar && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300">فارق السعر المحاسبي:</span>
              <span dir="ltr" className={`font-mono font-extrabold text-sm tabular-nums ${priceDiff > 0 ? 'text-emerald-600' : (priceDiff < 0 ? 'text-rose-600' : 'text-slate-600')}`}>
                {priceDiff > 0 ? `+${priceDiff.toLocaleString('en-US')}` : priceDiff.toLocaleString('en-US')} {currCode}
              </span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ملاحظات الاستبدال:</label>
            <input className={inp} value={notes} onChange={e => setNotes(e.target.value)} placeholder="اختياري" />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 cursor-pointer">إلغاء</button>
            <button type="submit" disabled={submitting || !oldVariantId || !newVariantId} className="h-9 px-5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold cursor-pointer disabled:opacity-50">
              {submitting ? '⏳ جاري الاستبدال...' : '🔄 اعتماد الاستبدال والتسوية'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.POSExchangeModal = POSExchangeModal;
