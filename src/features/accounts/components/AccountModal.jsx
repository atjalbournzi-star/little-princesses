// AccountModal.jsx - نافذة إضافة وتعديل الحساب المحاسبي
// يعتمد على: cleanCode, getSmartSuggestedAccountCode (accountHelpers.js)

function AccountModal({
  showModal, setShowModal,
  editingAccount, formData, setFormData,
  accountsWithRollupBalances,
  handleParentChange, handleSaveAccount
}) {
  if (!showModal) return null;

  const accountTypesList = typeof ACCOUNT_TYPES !== 'undefined'
    ? ACCOUNT_TYPES
    : ['أصول', 'خصوم', 'حقوق ملكية', 'إيرادات', 'تكلفة المبيعات', 'مصروفات', 'أخرى'];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#E8E5EA] overflow-hidden animate-fadeIn my-8">
        {/* رأس النافذة */}
        <div className="bg-[#FAFAFB] p-5 border-b border-[#E8E5EA] flex justify-between items-center">
          <h3 className="text-sm font-bold text-[#25232A] flex items-center gap-2">
            <span>{editingAccount ? '✏️ تعديل بيانات حساب' : '✨ إضافة حساب محاسبي جديد'}</span>
          </h3>
          <button onClick={() => setShowModal(false)} className="text-[#6F6B75] hover:text-[#25232A] text-lg font-bold">✕</button>
        </div>

        <form onSubmit={handleSaveAccount} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* الحساب الأب */}
          <div>
            <label className="block text-xs font-bold text-[#25232A] mb-1.5">الحساب الأب (Parent Account)</label>
            <select
              value={formData.parent_id}
              onChange={e => handleParentChange(e.target.value)}
              className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs font-medium bg-[#FAFAFB] focus:bg-white focus:border-[#8F2A87] outline-none h-11"
            >
              <option value="">-- حساب رئيسي بدون أب (Level 1) --</option>
              {accountsWithRollupBalances.filter(a => String(a.id) !== String(formData.id)).map(a => (
                <option key={a.id || a.code} value={cleanCode(a.code || a.id)}>
                  {'—'.repeat(Math.max(0, (parseInt(a.level) || 1) - 1))} {a.code} - {a.name} ({a.account_type})
                </option>
              ))}
            </select>
            <span className="text-[11px] text-[#6F6B75] mt-1 block">تغيير الحساب الأب يحدد نوع الحساب ويقترح الكود التلقائي المناسب.</span>
          </div>

          {/* كود الحساب + الاسم بالعربية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-[#25232A]">كود الحساب (رمز الترقيم) *</label>
                <button type="button"
                  onClick={() => { const nextCode = getSmartSuggestedAccountCode(formData.parent_id, accountsWithRollupBalances); setFormData(prev => ({ ...prev, code: nextCode })); }}
                  className="text-[11px] text-[#8F2A87] hover:text-[#73216C] flex items-center gap-1 font-bold cursor-pointer transition"
                  title="اقتراح الكود التالي تلقائياً">
                  <span>🔄</span> توليد كود تلقائي
                </button>
              </div>
              <input type="text" required value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                className="w-full border border-[#E8E5EA] rounded-xl p-2.5 font-mono text-xs font-bold bg-white focus:border-[#8F2A87] outline-none h-11" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#25232A] mb-1.5">اسم الحساب (عربي) *</label>
              <input type="text" required value={formData.name}
                onChange={e => {
                  const val = e.target.value;
                  const isNew = !editingAccount;
                  if (isNew && (val.includes('شريك') || val.includes('راس مال') || val.includes('رأس مال'))) {
                    const isAlreadyUnder301 = formData.parent_id === '301' || String(formData.code).startsWith('301.');
                    if (!isAlreadyUnder301) {
                      const nextCode = getSmartSuggestedAccountCode('301', accountsWithRollupBalances);
                      setFormData(prev => ({ ...prev, name: val, parent_id: '301', code: nextCode || '301.04', account_type: 'حقوق ملكية', nature: 'credit' }));
                      return;
                    }
                  }
                  setFormData(prev => ({ ...prev, name: val }));
                }}
                className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs font-medium bg-white focus:border-[#8F2A87] outline-none h-11" />
            </div>
          </div>

          {/* الاسم بالإنجليزية + نوع الحساب */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#25232A] mb-1.5">اسم الحساب (بالإنجليزية اختياري)</label>
              <input type="text" value={formData.name_en}
                onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                placeholder="e.g. Showroom Cash Box"
                className="w-full border border-[#E8E5EA] rounded-xl p-2.5 font-mono text-xs bg-white focus:border-[#8F2A87] outline-none h-11" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#25232A] mb-1.5">نوع الحساب</label>
              <select value={formData.account_type}
                onChange={e => setFormData({ ...formData, account_type: e.target.value })}
                className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs font-medium bg-white focus:border-[#8F2A87] outline-none h-11">
                {accountTypesList.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* طبيعة الحساب + فئة الحساب */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#25232A] mb-1.5">طبيعة الحساب</label>
              <select value={formData.nature}
                onChange={e => setFormData({ ...formData, nature: e.target.value })}
                className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs font-medium bg-white focus:border-[#8F2A87] outline-none h-11">
                <option value="debit">مدين (Debit)</option>
                <option value="credit">دائن (Credit)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#25232A] mb-1.5">فئة الحساب</label>
              <select value={formData.is_group}
                onChange={e => setFormData({ ...formData, is_group: Number(e.target.value) })}
                className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs font-medium bg-white focus:border-[#8F2A87] outline-none h-11">
                <option value={0}>حساب حركة / مباشر (Posting Account)</option>
                <option value={1}>حساب تجميعي / أب (Group Account)</option>
              </select>
            </div>
          </div>

          {/* حالة الحساب */}
          <div>
            <label className="block text-xs font-bold text-[#25232A] mb-1.5">حالة الحساب</label>
            <select value={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: Number(e.target.value) })}
              className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs font-medium bg-white focus:border-[#8F2A87] outline-none h-11">
              <option value={1}>نشط (Active)</option>
              <option value={0}>معطل (Disabled)</option>
            </select>
          </div>

          {/* ملاحظات */}
          <div>
            <label className="block text-xs font-bold text-[#25232A] mb-1.5">ملاحظات / وصف الحساب</label>
            <textarea rows={2} value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="أدخل أي تفاصيل أو ملاحظات إضافية..."
              className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs bg-white focus:border-[#8F2A87] outline-none" />
          </div>

          {/* أزرار الحفظ والإلغاء */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E8E5EA]">
            <button type="button" onClick={() => setShowModal(false)}
              className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA]">
              إلغاء
            </button>
            <button type="submit"
              className="px-6 py-2.5 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-xl font-bold text-xs shadow-xs">
              {editingAccount ? 'حفظ التعديلات' : 'إضافة الحساب'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
