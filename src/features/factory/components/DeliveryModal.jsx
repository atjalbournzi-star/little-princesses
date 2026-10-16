function DeliveryModal({
  deliveryModalData,
  setDeliveryModalData,
  deliveredSuccessData,
  deliveryForm: rawDeliveryForm,
  setDeliveryForm: rawSetDeliveryForm,
  submittingDelivery,
  handleConfirmDelivery,
  accounts = [],
  onClose
}) {
  if (!deliveryModalData) return null;
  const utils = window.FactoryUtils || {};
  const deliveryForm = rawDeliveryForm || {};
  const setDeliveryForm = typeof rawSetDeliveryForm === 'function' ? rawSetDeliveryForm : (() => {});
  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";
  const delFee = parseFloat(deliveryModalData.delivery_fee || deliveryModalData.order?.delivery_fee || 0);
  const delMode = deliveryModalData.delivery_payment_mode || deliveryModalData.order?.delivery_payment_mode || 'DIRECT_TO_COURIER';

  const ord = deliveryModalData.order || deliveryModalData || {};
  const tot = parseFloat(ord.total_amount ?? ord.total_price ?? ord.grand_total ?? ord.total ?? ord.price ?? ord.final_total ?? deliveryModalData.resolvedTotal ?? 0) || 0;
  const pd = parseFloat(ord.paid_amount ?? ord.advance_paid ?? ord.paid ?? ord.deposit ?? ord.deposit_amount ?? ord.paid_total ?? deliveryModalData.resolvedPaid ?? 0) || 0;
  const rem = Math.max(0, tot - pd);

  const [fetchedAccounts, setFetchedAccounts] = React.useState([]);

  React.useEffect(() => {
    if ((!accounts || !accounts.length) && (!window.accounts || !window.accounts.length)) {
      fetch('/api/accounts/list').then(r => r.json()).then(d => {
        const list = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []);
        if (list.length) setFetchedAccounts(list);
      }).catch(() => {});
    }
  }, [accounts]);

  const rawAccs = (accounts && accounts.length) ? accounts : (window.accounts || window.chartOfAccounts || fetchedAccounts);
  const treasuryAccounts = React.useMemo(() => {
    if (!rawAccs || !rawAccs.length) return [];
    const filtered = rawAccs.filter(a => {
      if (a.is_group === true || a.is_group === 'true') return false;
      const cat = String(a.account_category || a.category || '').toLowerCase();
      const type = String(a.account_type || a.type || '').toLowerCase();
      const code = String(a.account_code || a.code || a.id || '');
      const name = String(a.account_name || a.name || '');
      return (cat.includes('خزين') || cat.includes('صندوق') || cat.includes('بنك') || cat.includes('نقدي') || cat.includes('cash') || cat.includes('bank') || type.includes('asset') || type.includes('أصول') || code.startsWith('101') || code.startsWith('102') || code.startsWith('103') || code.startsWith('1') || code.startsWith('ACC-1') || name.includes('صندوق') || name.includes('خزينة') || name.includes('بنك') || name.includes('كاش') || name.includes('الكريمي'));
    });
    return filtered.length ? filtered : rawAccs.filter(a => !a.is_group);
  }, [rawAccs]);

  React.useEffect(() => {
    if (deliveryModalData && typeof setDeliveryForm === 'function') {
      const defaultVal = rem > 0 ? String(rem) : '0';
      const defaultAcc = (treasuryAccounts[0] && (treasuryAccounts[0].id || treasuryAccounts[0].account_code)) || 'ACC-101';
      setDeliveryForm(prev => {
        const next = { ...(prev || {}), amount_collected: defaultVal };
        if (!next.account_id) next.account_id = defaultAcc;
        return (prev && prev.amount_collected === defaultVal && prev.account_id) ? prev : next;
      });
    }
  }, [deliveryModalData, rem, treasuryAccounts]);

  const closeModal = () => {
    if (typeof setDeliveryModalData === 'function') setDeliveryModalData(null);
    if (typeof onClose === 'function') onClose();
  };

  const onConfirm = async () => {
    try {
      const orderId = ord?.id || ord?.order_id || ord?.order_no || deliveryModalData?.id || deliveryModalData?.order_id;
      const orderNo = ord?.order_no || deliveryModalData?.order_no || orderId;
      if (typeof handleConfirmDelivery === 'function') {
        await handleConfirmDelivery();
      }
      window.dispatchEvent(new CustomEvent('order_status_changed', { detail: { orderId, order_no: orderNo, status: 'delivered', stage: 'تم التسليم' } }));
      window.dispatchEvent(new CustomEvent('erp:factoryChanged', { detail: { orderNo, orderId, status: 'delivered' } }));
      window.dispatchEvent(new CustomEvent('erp:ordersChanged', { detail: { orderNo, orderId, status: 'delivered' } }));
      window.dispatchEvent(new CustomEvent('erp:vouchersChanged', { detail: { orderNo, orderId } }));
      window.dispatchEvent(new CustomEvent('erp:accountsChanged', { detail: { orderNo, orderId } }));
    } catch (err) {
      console.error('Error confirming delivery modal:', err);
    } finally {
      closeModal();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E8E5EA] space-y-4 text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">👑</span>
            <div>
              <h3 className="text-sm font-bold text-[#25232A]">تسليم فستان الأميرة والتحصيل النهائي</h3>
              <p className="text-[11px] text-[#6F6B75]">أمر رقم: {ord.order_no || deliveryModalData.order_no || deliveryModalData.id}</p>
            </div>
          </div>
          <button onClick={closeModal} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm cursor-pointer">✕</button>
        </div>

        {deliveredSuccessData ? (
          <div className="space-y-4 py-2">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <span className="text-4xl block animate-bounce">🎉</span>
              <h4 className="text-sm font-black text-emerald-900">تم تسليم الفستان الملكي بنجاح!</h4>
              <p className="text-xs text-emerald-800">
                تم تحصيل مبلغ <strong>{deliveredSuccessData.collected_amount?.toLocaleString() || deliveryForm.amount_collected} ر.ي</strong> وإصدار سند القبض وترحيل قيد الخزينة المزدوج آلياً.
              </p>
            </div>
            <button
              type="button"
              onClick={() => utils.sendWhatsAppDeliveryGreeting && utils.sendWhatsAppDeliveryGreeting(deliveredSuccessData, deliveryModalData, deliveryForm)}
              className="w-full py-3.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>📲</span><span>إرسال بطاقة تهنئة التسليم للأميرة عبر واتساب 🌸</span>
            </button>
            <button type="button" onClick={closeModal} className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer">إغلاق النافذة</button>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-2xl bg-[#F2E7F3]/60 border border-[#E5CEE7] space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#8F2A87]">👧 الأميرة: {deliveryModalData.child_name || ord.child_name || 'الأميرة'}</span>
                <span className="text-[#6F6B75]">العميلة: {deliveryModalData.customer_name || deliveryModalData.customer || ord.customer_name || ord.customer}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-[#E5CEE7]">
                <span>👗 الموديل: <strong>{deliveryModalData.product || deliveryModalData.product_name || ord.product || ord.product_name}</strong></span>
                <span className="font-mono text-[#8F2A87]">الكمية: {deliveryModalData.quantity || ord.qty || 1} قطعة</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-[#FAFAFB] rounded-xl border border-[#E8E5EA]">
                <span className="text-[10.5px] text-[#6F6B75] block">إجمالي الفاتورة</span>
                <span className="font-mono font-bold text-[#25232A] mt-0.5 block">{tot.toLocaleString()} ر.ي</span>
              </div>
              <div className="p-2.5 bg-[#FAFAFB] rounded-xl border border-[#E8E5EA]">
                <span className="text-[10.5px] text-[#6F6B75] block">العربون المسدد</span>
                <span className="font-mono font-bold text-[#007F8C] mt-0.5 block">{pd.toLocaleString()} ر.ي</span>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[10.5px] text-amber-800 font-bold block">المتبقي للتحصيل</span>
                <span className="font-mono font-black text-[#8F2A87] mt-0.5 block">{rem.toLocaleString()} ر.ي</span>
              </div>
            </div>

            {delFee > 0 && (
              <div className="p-2.5 rounded-xl bg-purple-50/70 border border-[#E5CEE7] text-xs flex justify-between items-center">
                <span className="font-semibold text-[#8F2A87]">
                  {delMode === 'PREPAID_VIA_ATELIER' ? '🚚 رسوم التوصيل مسددة مسبقاً للأتيليه:' : '🛵 رسوم التوصيل مباشرة للسائق (لا تُحصّل للأتيليه):'}
                </span>
                <span className="font-mono font-bold text-[#25232A]">{delFee.toLocaleString()} ر.ي</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>المبلغ المحصل الآن (ر.ي) <span className="text-[#D64545] font-bold">*</span></label>
                <input type="number" step="100" min="0" className={inputCls + " font-mono font-bold text-[#8F2A87] text-center"} value={deliveryForm.amount_collected ?? '0'} onChange={e => setDeliveryForm({ ...deliveryForm, amount_collected: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className={labelCls}>خصم إضافي إن وجد (ر.ي)</label>
                <input type="number" step="100" min="0" className={inputCls + " font-mono text-center"} value={deliveryForm.discount} onChange={e => setDeliveryForm({ ...deliveryForm, discount: e.target.value })} placeholder="0" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>حساب الخزينة / الصندوق <span className="text-[#D64545] font-bold">*</span></label>
                <select className={inputCls} value={deliveryForm.account_id || (treasuryAccounts[0] ? (treasuryAccounts[0].id || treasuryAccounts[0].account_code) : 'ACC-101')} onChange={e => setDeliveryForm({ ...deliveryForm, account_id: e.target.value })}>
                  {treasuryAccounts.length > 0 ? treasuryAccounts.map(acc => {
                    const val = acc.id || acc.account_code || acc.code;
                    const codeStr = acc.account_code || acc.code || acc.id;
                    const nameStr = acc.account_name || acc.name || codeStr;
                    return <option key={val} value={val}>{codeStr} - {nameStr}{acc.currency ? ` (${acc.currency})` : ''}</option>;
                  }) : (
                    <>
                      <option value="ACC-101">ACC-101 (الصندوق الرئيسي - كاش)</option>
                      <option value="ACC-102-2">ACC-102-2 (102.02 - بنك الكريمي / المحافظ)</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className={labelCls}>طريقة الدفع</label>
                <select className={inputCls} value={deliveryForm.payment_method} onChange={e => setDeliveryForm({ ...deliveryForm, payment_method: e.target.value })}>
                  <option value="نقد (كاش)">💵 نقد (كاش)</option>
                  <option value="تحويل كريمي">📲 تحويل كريمي</option>
                  <option value="شبكة / بطاقة">💳 شبكة / مدى</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>ملاحظات التسليم والتسوية</label>
              <input type="text" className={inputCls} value={deliveryForm.notes} onChange={e => setDeliveryForm({ ...deliveryForm, notes: e.target.value })} placeholder="تم تسليم الفستان للأميرة وفحص المقاسات بنجاح..." />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button" disabled={submittingDelivery} onClick={onConfirm}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#8F2A87] to-[#B0005A] hover:opacity-95 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{submittingDelivery ? 'جاري التسليم والترحيل...' : '✅ تأكيد التسليم النهائي والترحيل المالي'}</span>
              </button>
              <button type="button" onClick={closeModal} className="py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer">إلغاء</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.DeliveryModal = DeliveryModal;
