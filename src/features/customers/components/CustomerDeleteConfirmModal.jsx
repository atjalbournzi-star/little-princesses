// src/features/customers/components/CustomerDeleteConfirmModal.jsx
// نافذة تأكيد حذف العميل الآمنة مع فحص سلامة القيود والطلبات المرتبطة

function CustomerDeleteConfirmModal({
  isOpen,
  onClose,
  customer,
  orders = [],
  currency = { display: 'YER', symbol: '﷼' },
  onConfirm,
  isDeleting = false
}) {
  if (!isOpen || !customer) return null;

  const cId = String(customer.customer_id || customer.id || '');
  const cName = String(customer.name || customer.customer_name || 'عميل').trim();

  // فحص الارتباطات بالطلبات
  const linkedOrders = (orders || []).filter(o =>
    (o.customer_id && String(o.customer_id) === cId) ||
    (o.customer_name && String(o.customer_name).trim() === cName)
  );

  // فحص الأرصدة غير المسددة
  const remainingBal = parseFloat(
    customer.ledger?.remaining ?? customer.remaining ?? customer.current_balance ?? 0
  );
  const totalDebt = (linkedOrders || []).reduce((sum, o) => {
    const rem = parseFloat(o.remaining_amount || o.remaining || 0);
    return sum + (rem > 0 ? rem : 0);
  }, remainingBal);

  const hasLinkedOrders = linkedOrders.length > 0;
  const hasUnsettledBalance = totalDebt > 0;
  const isBlocked = hasLinkedOrders || hasUnsettledBalance;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm select-none animate-fadeIn"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-[#111C38] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* الترويسة */}
        <div className="h-10 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0F172A]">
          <div className="flex items-center gap-2">
            <span className={isBlocked ? "text-amber-400 text-sm" : "text-rose-400 text-sm"}>
              {isBlocked ? "⚠️" : "🗑️"}
            </span>
            <span className="text-xs font-bold text-white">
              {isBlocked ? "تعذر حذف العميل (ارتباطات قائمة)" : "تأكيد حذف العميل"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors text-xs"
          >
            ✕
          </button>
        </div>

        {/* جسم النافذة */}
        <div className="p-4 space-y-3 text-right">
          {isBlocked ? (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-200 font-semibold leading-relaxed">
                لا يمكن حذف العميل <span className="text-pink-400 font-bold font-mono">[{cId}]</span> <span className="text-white font-bold font-sans">({cName})</span> لوجود قيود نشطة في النظام:
              </p>
              <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-1.5 text-[11px] text-amber-200 font-medium">
                {hasLinkedOrders && (
                  <div className="flex items-center gap-1.5">
                    <span>📦</span>
                    <span>مرتبط بـ <strong className="text-white font-bold font-mono">{linkedOrders.length}</strong> طلب/طلبات مسجلة في سجل الخياطة.</span>
                  </div>
                )}
                {hasUnsettledBalance && (
                  <div className="flex items-center gap-1.5">
                    <span>💰</span>
                    <span>يوجد رصيد متبقي غير مسدد بذمة العميل: <strong className="text-amber-300 font-bold font-mono">{totalDebt.toLocaleString()} {currency.display}</strong></span>
                  </div>
                )}
              </div>
              <p className="text-[10.5px] text-slate-400 leading-normal">
                🛡️ حفاظاً على سلامة دفتر الأستاذ والمخزون، يُرجى تصفية الطلبات أو تسوية الرصيد المالي قبل حذف العميل.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                هل أنت متأكد من حذف العميل <strong className="text-white font-bold">({cName})</strong>؟
              </p>
              <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-[11px] text-slate-300 space-y-1 font-mono">
                <div>الكود: <span className="text-pink-400 font-bold">[{cId}]</span></div>
                {customer.phone && <div className="font-sans">الهاتف: <span className="text-white">{customer.phone}</span></div>}
              </div>
              <p className="text-[10.5px] text-rose-300/90 leading-normal font-medium">
                ⚠️ تنبيه: سيتم حذف بيانات العميل والمقاسات المسجلة له بشكل نهائي.
              </p>
            </div>
          )}
        </div>

        {/* التذييل والأزرار */}
        <div className="h-11 px-4 border-t border-slate-800 bg-[#0F172A] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-7 px-3 text-xs font-semibold text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isBlocked ? "فهمت ذلك / إغلاق" : "إلغاء"}
          </button>

          {!isBlocked && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={onConfirm}
              className="h-7 px-3.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              <span>{isDeleting ? "جاري الحذف..." : "تأكيد الحذف"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

window.CustomerDeleteConfirmModal = CustomerDeleteConfirmModal;
