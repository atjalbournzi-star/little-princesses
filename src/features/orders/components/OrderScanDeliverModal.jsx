// src/features/orders/components/OrderScanDeliverModal.jsx
const { useState } = React;

function OrderScanDeliverModal({
  isOpen,
  onClose,
  orders = [],
  currencyDisplay = "YER ريال",
  onConfirmScanDelivery,
  scanDeliveryLoading,
  showToast
}) {
  if (!isOpen) return null;

  const [scanCodeInput, setScanCodeInput] = useState('');
  const [scannedOrder, setScannedOrder] = useState(null);
  const [scanCollectRemaining, setScanCollectRemaining] = useState(true);

  const handleSearch = (code) => {
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
      showToast && showToast(`تم التعرف على الطلب: ${found.order_no || ('ORD-' + found.id)} 🎯`);
    } else {
      showToast && showToast(`لم يتم العثور على طلب بالرمز: ${q} ⚠️`, 'error');
    }
  };

  const handleConfirm = () => {
    if (!scannedOrder) return;
    onConfirmScanDelivery({
      scannedOrder,
      scanCollectRemaining,
      onSuccess: () => {
        setScannedOrder(null);
        setScanCodeInput('');
        onClose();
      }
    });
  };

  const rem = scannedOrder ? Math.max(0, (parseFloat(scannedOrder.total ?? scannedOrder.total_amount) || 0) - (parseFloat(scannedOrder.paid ?? scannedOrder.paid_amount) || 0)) : 0;

  return (
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
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer">✕</button>
        </div>

        {/* Input Barcode Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="space-y-2">
          <label className="block text-xs font-semibold text-[#25232A] dark:text-slate-200 mb-1.5">امسح بقارئ الباركود أو ادخل رقم الفاتورة / الكود:</label>
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              value={scanCodeInput}
              onChange={e => setScanCodeInput(e.target.value)}
              placeholder="مثال: ORD-1001 أو امسح الباركود..."
              className="flex-1 h-11 px-3.5 rounded-xl border-2 border-dashed border-emerald-500/60 bg-emerald-50/20 dark:bg-slate-950 text-xs font-mono font-bold text-[#25232A] dark:text-slate-100 outline-none focus:border-emerald-600"
            />
            <button type="submit" className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer">
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
                  {rem.toLocaleString()} {currencyDisplay}
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
              onClick={handleConfirm}
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
  );
}

window.OrderScanDeliverModal = OrderScanDeliverModal;
