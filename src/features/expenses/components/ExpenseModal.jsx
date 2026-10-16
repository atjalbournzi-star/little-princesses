// src/features/expenses/components/ExpenseModal.jsx
// نافذة تسجيل مصروف تشغيلي مع اشتقاق طريقة الدفع وحسابات الصافي
const { useEffect, useState, useMemo } = React;

function ExpenseModal({
  isOpen = false, onClose, formData = {}, setFormData, accounts = [], onSubmit,
  isSubmitting = false, showQuickAddCat = false, setShowQuickAddCat,
  newCatName = '', setNewCatName, newCatCode = '', setNewCatCode, onQuickAddCategory
}) {
  const [costCenters, setCostCenters] = useState([
    { id: 'CC-01', code: 'CC-01', name: 'مشغل التفصيل والخياطة' },
    { id: 'CC-02', code: 'CC-02', name: 'صالة العرض والمبيعات' },
    { id: 'CC-03', code: 'CC-03', name: 'الإدارة العامة' }
  ]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/cost-centers').then(r => r.json()).then(d => {
        const list = d?.data || d || [];
        if (Array.isArray(list) && list.length > 0) setCostCenters(list);
      }).catch(() => {});
    }
  }, [isOpen]);

  const expAccounts = useMemo(() => {
    const list = (accounts || []).filter(a => {
      const c = String(a.code || a.account_code || '').trim(), t = String(a.account_type || a.type || '').toLowerCase();
      return (c.startsWith('5') || t.includes('expense') || t.includes('مصروف')) && (a.is_leaf === true || a.is_group === false) && a.is_active !== false && c !== '5';
    });
    return list.length > 0 ? list : [{ code: '501', name: 'أجور الخياطين' }, { code: '502', name: 'إيجار الورشة' }, { code: '503', name: 'كهرباء وصيانة' }, { code: '505', name: 'تسويق ونثريات' }];
  }, [accounts]);

  const paymentAccounts = useMemo(() => {
    const list = (accounts || []).filter(a => {
      const c = String(a.code || a.account_code || '').trim(), n = String(a.name || a.account_name || '');
      return (c.startsWith('101.') || c.startsWith('103') || c.startsWith('111') || n.includes('صندوق') || n.includes('بنك')) && a.is_group !== true && a.is_active !== false;
    });
    return list.length > 0 ? list : [{ code: '101.1', name: 'صندوق الريال اليمني (YER)' }, { code: '101.2', name: 'صندوق الريال السعودي (SAR)' }, { code: '103', name: 'بنك الكريمي (YER)' }];
  }, [accounts]);

  if (!isOpen) return null;
  const deriveMethod = window.derivePaymentMethod || (acc => {
    const s = String(acc || '').toLowerCase();
    if (s.includes('101') || s.includes('صندوق') || s.includes('كاش')) return 'نقد (كاش)';
    if (s.includes('103') || s.includes('بنك') || s.includes('حوالة')) return 'حوالة بنكية';
    if (s.includes('pos') || s.includes('شبكة')) return 'شبكة POS';
    return 'نقد (كاش)';
  });

  const subtotal = parseFloat(formData.subtotal_amount || formData.amount || 0);
  const discount = parseFloat(formData.discount_amount || 0);
  const tax = parseFloat(formData.tax_amount || 0);
  const netTotal = Math.max(0, subtotal - discount + tax);

  const inCls = "w-full h-7 text-xs px-2.5 rounded-md bg-slate-900 border border-slate-700 text-white focus:border-pink-500 font-medium placeholder:text-slate-500 outline-none transition";
  const lbCls = "text-[10px] font-semibold text-slate-300 block mb-0.5";
  const ReceiptUpload = window.ExpenseReceiptUpload || (() => null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm select-none" dir="rtl">
      <div className="w-full max-w-xl bg-[#111C38] border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col text-right">
        {/* Header */}
        <div className="h-8 px-3.5 flex items-center justify-between border-b border-slate-800 text-xs font-bold text-white shrink-0 bg-[#0F172A]">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400">💸</span>
            <span>تسجيل مصروف تشغيلي جديد</span>
          </div>
          <button type="button" onClick={onClose} className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold cursor-pointer transition">✕</button>
        </div>

        {/* Form */}
        <form onSubmit={e => onSubmit(e, 'posted')} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-3 space-y-1.5 overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className={lbCls + " mb-0"}>بند المصروف <span className="text-rose-400">*</span></label>
                <button type="button" onClick={() => setShowQuickAddCat && setShowQuickAddCat(true)} className="text-[9px] font-bold text-amber-400 hover:text-amber-300 bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-600/30 cursor-pointer">+ بند جديد 🌿</button>
              </div>
              <select className={inCls} value={formData.exp_category} onChange={e => setFormData({ ...formData, exp_category: e.target.value })}>
                {expAccounts.map(a => <option key={a.code || a.id} value={`${a.code || a.id} - ${a.name || ''}`}>{`${a.code || a.id} - ${a.name || ''}`}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className={lbCls}>مركز التكلفة <span className="text-rose-400">*</span></label>
                <select className={inCls} value={formData.cost_center || 'مشغل التفصيل والخياطة'} onChange={e => {
                  const ccObj = costCenters.find(c => c.name === e.target.value);
                  setFormData({ ...formData, cost_center: e.target.value, cost_center_id: ccObj?.id || 'CC-01' });
                }}>
                  {costCenters.map(cc => <option key={cc.id || cc.code} value={cc.name}>{cc.name}</option>)}
                </select>
              </div>
              <div>
                <label className={lbCls}>المستفيد / الصارف</label>
                <input type="text" className={inCls} placeholder="" value={formData.beneficiary || ''} onChange={e => setFormData({ ...formData, beneficiary: e.target.value, recipient: e.target.value })} />
              </div>
              <div>
                <label className={lbCls}>رقم الفاتورة / المرجع</label>
                <input type="text" className={inCls + " font-mono"} placeholder="" value={formData.reference_no || ''} onChange={e => setFormData({ ...formData, reference_no: e.target.value })} />
              </div>
            </div>

            {/* تسوية المبالغ (الإجمالي - الخصم + الضريبة = الصافي) */}
            <div className="p-1.5 bg-[#0B132B] rounded-lg border border-slate-700/80 space-y-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className={lbCls}>المبلغ الإجمالي <span className="text-rose-400">*</span></label>
                  <input type="number" step="0.01" required className={inCls + " font-mono"} placeholder="0.00" value={formData.subtotal_amount || formData.amount} onChange={e => setFormData({ ...formData, subtotal_amount: e.target.value, amount: e.target.value })} />
                </div>
                <div>
                  <label className={lbCls}>الخصم</label>
                  <input type="number" step="0.01" className={inCls + " font-mono"} placeholder="0.00" value={formData.discount_amount || ''} onChange={e => setFormData({ ...formData, discount_amount: e.target.value })} />
                </div>
                <div>
                  <label className={lbCls}>الضريبة</label>
                  <input type="number" step="0.01" className={inCls + " font-mono"} placeholder="0.00" value={formData.tax_amount || ''} onChange={e => setFormData({ ...formData, tax_amount: e.target.value })} />
                </div>
                <div>
                  <label className={lbCls}>العملة</label>
                  <select className={inCls} value={formData.currency || 'YER'} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                    <option value="YER">ريال يمني (YER ﷼)</option>
                    <option value="SAR">ريال سعودي (SAR ﷼)</option>
                    <option value="USD">دولار أمريكي (USD $)</option>
                  </select>
                </div>
              </div>
              <div className="h-6 px-2.5 rounded bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono font-bold text-emerald-400">
                <span className="text-slate-400 text-[10px] font-sans">الصافي الفعلي للدفع (Net):</span>
                <span className="tabular-nums">
                  {netTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.currency || 'YER'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className={lbCls}>حساب الدفع / الخزينة <span className="text-rose-400">*</span></label>
                <select className={inCls} value={formData.source_acc} onChange={e => {
                  const accVal = e.target.value;
                  setFormData({ ...formData, source_acc: accVal, pay_method: deriveMethod(accVal) });
                }}>
                  {paymentAccounts.map(a => <option key={a.code || a.id} value={`${a.code || a.id} - ${a.name || ''}`}>{`${a.code || a.id} - ${a.name || ''}`}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className={lbCls + " mb-0"}>طريقة الدفع</label>
                  <span className="text-[9px] text-amber-400 font-bold bg-amber-950/40 px-1 py-0.2 rounded border border-amber-600/30">آلي ⚡</span>
                </div>
                <input type="text" readOnly className={inCls + " bg-slate-900/60 cursor-default text-amber-300 font-bold"} value={formData.pay_method || deriveMethod(formData.source_acc)} />
              </div>
              <div>
                <label className={lbCls}>التاريخ</label>
                <input type="date" lang="en-GB" dir="ltr" className={inCls} value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
            </div>

            <div>
              <label className={lbCls}>البيان / الشرح التفصيلي للمصروف</label>
              <div className="flex items-center gap-2">
                <input type="text" className={inCls} placeholder="بيان سند الصرف..." value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                <ReceiptUpload
                  attachmentUrl={formData.attachment_url}
                  attachmentName={formData.attachment_name}
                  onAttachmentChange={(url, name, path) => setFormData({ ...formData, attachment_url: url, attachment_name: name, storage_path: path })}
                  onClear={() => setFormData({ ...formData, attachment_url: '', attachment_name: '', storage_path: '' })}
                />
              </div>
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="h-9 px-3 shrink-0 flex items-center justify-between border-t border-slate-800 bg-[#0F172A]">
            <button type="button" onClick={onClose} className="h-6.5 px-3 text-xs font-bold rounded-md flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition">إلغاء</button>
            <div className="flex items-center gap-2">
              <button type="button" disabled={isSubmitting} onClick={e => onSubmit(e, 'draft')} className="h-6.5 px-3 text-xs font-bold rounded-md flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 shadow-xs cursor-pointer disabled:opacity-50">
                <span>📝</span><span>حفظ كمسودة</span>
              </button>
              <button type="submit" disabled={isSubmitting} className="h-6.5 px-3 text-xs font-bold rounded-md flex items-center gap-1.5 bg-pink-600 hover:bg-pink-500 text-white shadow-xs cursor-pointer disabled:opacity-50">
                <span>💸</span><span>{isSubmitting ? 'جاري الحفظ...' : 'اعتماد وترحيل مالي'}</span>
              </button>
            </div>
          </div>
        </form>

        {showQuickAddCat && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="bg-[#111C38] rounded-xl max-w-sm w-full p-2.5 shadow-2xl border border-slate-700 space-y-1.5 text-right">
              <h4 className="text-[11px] font-bold text-white border-b border-slate-700 pb-1">إضافة بند مصروف للشجرة (حساب 5)</h4>
              <div>
                <label className={lbCls}>اسم البند <span className="text-rose-400">*</span></label>
                <input type="text" required placeholder="" value={newCatName} onChange={e => setNewCatName(e.target.value)} className={inCls} autoFocus />
              </div>
              <div>
                <label className={lbCls}>كود الحساب (اختياري)</label>
                <input type="text" placeholder="" value={newCatCode} onChange={e => setNewCatCode(e.target.value)} className={inCls + " font-mono text-left"} dir="ltr" />
              </div>
              <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-700">
                <button type="button" onClick={() => setShowQuickAddCat(false)} className="h-6 px-2.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 rounded cursor-pointer">إلغاء</button>
                <button type="button" onClick={onQuickAddCategory} className="h-6 px-3 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold rounded shadow-xs cursor-pointer">✓ حفظ</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.ExpenseModal = ExpenseModal;
window.NewExpenseModal = ExpenseModal;