// src/features/journal/components/JournalEditModal.jsx
// Edit journal entry modal: form with all entry fields + save/cancel buttons

function JournalEditModal({ editingEntry, editFormData, setEditFormData, handleSaveEdit, setEditingEntry, isSubmittingEdit, postingAccounts }) {
  const { inputCls, labelCls } = window.JournalUtils || {};
  const REF_TYPES = ["قيد يدوي","إيجارات","مرتبات وأجور","مشتريات","مصروفات تشغيلية","سند صرف","سند قبض","تسوية"];
  const CURRENCIES = ["YER ﷼","SAR ﷼","USD $"];

  if (!editingEntry) return null;

  const isEditForeign = window.CurrencyService
    ? window.CurrencyService.normalizeCode(editFormData.currency) !== 'YER'
    : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-2xl max-w-2xl w-full overflow-hidden text-right" dir="rtl">
        {/* رأس النافذة */}
        <div className="px-6 py-4 border-b border-[#E8E5EA] flex items-center justify-between bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E2F5F7] text-[#007F8C] flex items-center justify-center text-sm font-bold border border-[#C5EDF0]">✏️</div>
            <div>
              <h2 className="text-sm font-bold text-[#25232A]">تعديل القيد المحاسبي: {editFormData.entry_no}</h2>
              <p className="text-[11px] text-[#6F6B75]">تعديل الحسابات والمبالغ وتحديث دفتر الأستاذ والسندات آلياً</p>
            </div>
          </div>
          <button type="button" onClick={() => setEditingEntry(null)} className="w-8 h-8 rounded-lg text-[#6F6B75] hover:bg-[#F3F2F5] hover:text-[#25232A] flex items-center justify-center transition-colors cursor-pointer">✕</button>
        </div>

        {/* نموذج التعديل */}
        <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>رقم القيد</label>
              <input type="text" className={inputCls + " font-mono"} value={editFormData.entry_no} onChange={e => setEditFormData({...editFormData, entry_no: e.target.value})} />
            </div>
            <div>
              <label className={labelCls}>تاريخ القيد</label>
              <input type="date" lang="en-GB" dir="ltr" className={inputCls} value={editFormData.date} onChange={e => setEditFormData({...editFormData, date: e.target.value})} />
            </div>
            <div>
              <label className={labelCls}>من حساب (المدين) <span className="text-[#D64545] font-bold">*</span></label>
              <select className={inputCls} value={editFormData.debit} onChange={e => setEditFormData({...editFormData, debit: e.target.value})}>
                <option value="">-- اختر حساب حركة --</option>
                {postingAccounts.map(a => { const code = a.code || a.acc_code || a.id; const rawName = a.name || a.account_name || a.acc_name || ''; const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code); return <option key={code} value={code}>{code} - {name}</option>; })}
              </select>
            </div>
            <div>
              <label className={labelCls}>إلى حساب (الدائن) <span className="text-[#D64545] font-bold">*</span></label>
              <select className={inputCls} value={editFormData.credit} onChange={e => setEditFormData({...editFormData, credit: e.target.value})}>
                <option value="">-- اختر حساب حركة --</option>
                {postingAccounts.map(a => { const code = a.code || a.acc_code || a.id; const rawName = a.name || a.account_name || a.acc_name || ''; const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code); return <option key={code} value={code}>{code} - {name}</option>; })}
              </select>
            </div>
            <div>
              <label className={labelCls}>العملة <span className="text-[#D64545] font-bold">*</span></label>
              <select className={inputCls} value={editFormData.currency} onChange={e => {
                const cCode = window.CurrencyService ? window.CurrencyService.normalizeCode(e.target.value) : 'YER';
                const newRate = window.CurrencyService ? window.CurrencyService.getRate(cCode) : 1.0;
                setEditFormData({...editFormData, currency: e.target.value, exchange_rate: String(newRate)});
              }}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>المبلغ <span className="text-[#D64545] font-bold">*</span></label>
              <input type="number" step="any" required className={inputCls + " font-mono font-bold"} value={editFormData.amount} onChange={e => setEditFormData({...editFormData, amount: e.target.value})} />
            </div>
            {isEditForeign && (
              <div>
                <label className={labelCls}>سعر الصرف (مقابل YER) <span className="text-[#D64545] font-bold">*</span></label>
                <input type="number" step="any" required className={inputCls + " font-mono font-bold text-[#8F2A87]"} value={editFormData.exchange_rate} onChange={e => setEditFormData({...editFormData, exchange_rate: e.target.value})} />
              </div>
            )}
            <div>
              <label className={labelCls}>نوع المرجع</label>
              <select className={inputCls} value={editFormData.ref_type} onChange={e => setEditFormData({...editFormData, ref_type: e.target.value})}>
                {REF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>رقم المرجع / السند</label>
              <input type="text" className={inputCls + " font-mono"} value={editFormData.ref_id} onChange={e => setEditFormData({...editFormData, ref_id: e.target.value})} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>البيان والشرح <span className="text-[#D64545] font-bold">*</span></label>
              <input type="text" className={inputCls} value={editFormData.notes} onChange={e => setEditFormData({...editFormData, notes: e.target.value})} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E5EA]">
            <button type="button" onClick={() => setEditingEntry(null)} className="px-5 py-2.5 rounded-xl border border-[#E8E5EA] text-[#6F6B75] hover:bg-[#FAFAFB] font-bold text-xs transition cursor-pointer">إلغاء</button>
            <button type="submit" disabled={isSubmittingEdit} className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-[#007F8C] hover:bg-[#006A75] transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50">
              <Icons.Check className="w-4 h-4" />
              <span>{isSubmittingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات والمزامنة 💾'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.JournalEditModal = JournalEditModal;
