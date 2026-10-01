/**
 * ExpenseModal.jsx
 * نافذة تسجيل وتعديل المصروف التشغيلي وإضافة بنود شجرة الحسابات
 * Little Princesses ERP - Architectural Standards Compliant
 */

function ExpenseModal({
  isOpen = false,
  onClose,
  formData = {},
  setFormData,
  accounts = [],
  onSubmit,
  isSubmitting = false,
  showQuickAddCat = false,
  setShowQuickAddCat,
  newCatName = '',
  setNewCatName,
  newCatCode = '',
  setNewCatCode,
  onQuickAddCategory
}) {
  if (!isOpen) return null;

  const CheckIcon = (window.Icons && window.Icons.Check) || (() => <span>✓</span>);
  const inputCls = "w-full h-10 px-3 py-2 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:border-[#F28A00] outline-none transition";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1";

  // تصفية حسابات المصروفات
  const expAccounts = (accounts || []).filter(a => {
    const type = String(a.account_type || a.type || a.nature || '');
    const code = String(a.code || a.acc_code || '');
    return type.includes('مصروف') || code.startsWith('5') || code.startsWith('6');
  });

  // تصفية حسابات الخزينة والبنوك
  const cashBankAccounts = (accounts || []).filter(a => {
    const code = String(a.code || a.acc_code || '');
    const type = String(a.account_type || a.type || a.nature || '');
    return code.startsWith('111') || code.startsWith('112') || code.startsWith('101') || type.includes('أصول') || type.includes('نقدية') || type.includes('بنك');
  });
  const sourceAccsList = cashBankAccounts.length > 0 ? cashBankAccounts : (accounts || []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#E8E5EA] space-y-4 text-right animate-scaleUp max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#FFF1DC] text-[#C97300] flex items-center justify-center text-base font-bold border border-[#FFE4B9]">💸</span>
            <div>
              <h3 className="text-sm font-bold text-[#25232A]">تسجيل مصروف تشغيلي جديد</h3>
              <p className="text-[11px] text-[#6F6B75]">ترحيل تلقائي لسند الصرف والقيد المحاسبي المزدوج</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-[#6F6B75] text-sm font-bold cursor-pointer">✕</button>
        </div>

        {/* Form Body */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Category Select */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls + " mb-0"}>بند المصروف <span className="text-[#D64545] font-bold">*</span></label>
                <button
                  type="button"
                  onClick={() => setShowQuickAddCat && setShowQuickAddCat(true)}
                  className="text-[11px] font-bold text-[#C97300] hover:text-[#A35D00] bg-[#FFF1DC] hover:bg-[#FFE4B9] px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition border border-[#FFE4B9]"
                >
                  <span>💸 + بند جديد بالشجرة</span>
                </button>
              </div>
              <select className={inputCls} value={formData.exp_category} onChange={e => setFormData({ ...formData, exp_category: e.target.value })}>
                {expAccounts.length > 0 ? expAccounts.map(a => {
                  const code = a.code || a.acc_code || a.id;
                  const rawName = a.name || a.account_name || a.acc_name || '';
                  const label = `${code} - ${(rawName && !rawName.includes('???')) ? rawName : (a.name_en || code)}`;
                  return <option key={code} value={label}>{label}</option>;
                }) : (typeof EXPENSE_CATEGORIES !== 'undefined' ? EXPENSE_CATEGORIES : ['601 - أجور ورواتب', '602 - إيجار مقرات', '603 - كهرباء ومياه', '607 - مصروفات إدارية']).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className={labelCls}>المبلغ <span className="text-[#D64545] font-bold">*</span></label>
              <input type="number" step="0.01" required className={inputCls + " font-mono font-bold text-[#25232A]"} placeholder="0.00" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
            </div>

            {/* Currency */}
            <div>
              <label className={labelCls}>العملة</label>
              <select className={inputCls} value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                <option value="YER ﷼">ريال يمني (YER ﷼)</option>
                <option value="SAR ﷼">ريال سعودي (SAR ﷼)</option>
                <option value="USD $">دولار أمريكي (USD $)</option>
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className={labelCls}>طريقة الدفع</label>
              <select className={inputCls} value={formData.pay_method} onChange={e => setFormData({ ...formData, pay_method: e.target.value })}>
                <option value="نقد (كاش)">نقد (كاش)</option>
                <option value="حوالة بنكية">حوالة بنكية</option>
                <option value="شبكة POS">شبكة POS</option>
              </select>
            </div>

            {/* Source Account */}
            <div>
              <label className={labelCls}>حساب الدفع / الخزينة <span className="text-[#D64545] font-bold">*</span></label>
              <select className={inputCls} value={formData.source_acc} onChange={e => setFormData({ ...formData, source_acc: e.target.value })}>
                {sourceAccsList.map(a => {
                  const code = a.code || a.acc_code || a.id;
                  const rawName = a.name || a.account_name || a.acc_name || '';
                  const label = `${code} - ${(rawName && !rawName.includes('???')) ? rawName : (a.name_en || code)}`;
                  return <option key={code} value={label}>{label}</option>;
                })}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className={labelCls}>التاريخ</label>
              <input type="date" lang="en-GB" dir="ltr" className={inputCls} value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>البيان / الشرح</label>
              <input type="text" className={inputCls} placeholder="شرح تفاصيل المصروف..." value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8E5EA]">
            <button type="button" onClick={onClose} className="px-4 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl text-xs font-bold border border-[#E8E5EA] cursor-pointer">إلغاء</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-[#F28A00] hover:bg-[#D97706] transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
              <CheckIcon className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ المصروف وترحيل السند 💸'}</span>
            </button>
          </div>
        </form>

        {/* Sub-modal: Quick Add Category */}
        {showQuickAddCat && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#E8E5EA] space-y-3.5 text-right">
              <h4 className="text-xs font-bold text-[#25232A] border-b border-[#E8E5EA] pb-2">إضافة بند مصروف لشجرة الحسابات</h4>
              <div>
                <label className={labelCls}>اسم البند <span className="text-[#D64545] font-bold">*</span></label>
                <input type="text" required placeholder="مثال: صيانة أجهزة..." value={newCatName} onChange={e => setNewCatName(e.target.value)} className={inputCls} autoFocus />
              </div>
              <div>
                <label className={labelCls}>كود الحساب (اختياري)</label>
                <input type="text" placeholder="يولد تلقائياً (مثال: 608)" value={newCatCode} onChange={e => setNewCatCode(e.target.value)} className={inputCls + " font-mono text-left"} dir="ltr" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E5EA]">
                <button type="button" onClick={() => setShowQuickAddCat(false)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-bold rounded-lg cursor-pointer">إلغاء</button>
                <button type="button" onClick={onQuickAddCategory} className="px-4 py-1.5 bg-[#C97300] hover:bg-[#A35D00] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer">✓ حفظ للشجرة</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.ExpenseModal = ExpenseModal;
