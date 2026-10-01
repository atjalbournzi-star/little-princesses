// src/features/journal/components/JournalCompoundModal.jsx
// Dark-theme compound multi-leg journal entry modal

function JournalCompoundModal({
  showCompoundModal, setShowCompoundModal,
  compoundForm, setCompoundForm,
  compoundLines, compoundTotals, compoundCurrCode,
  isSubmittingCompound,
  postingAccounts, customers, purchases, employees,
  handleAddCompoundLine, handleDuplicateCompoundLine,
  handleDeleteCompoundLine, handleCompoundLineChange,
  handleSubmitCompound
}) {
  if (!showCompoundModal) return null;
  const REF_TYPES_CMP = ["قيد مركب","تسوية شاملة","توزيع أرباح","رواتب مجمعة","مشتريات أقمشة متعددة","تسوية عهد ومصروفات"];
  const CURRENCIES = ["YER ﷼","SAR ﷼","USD $"];
  const darkIn = "w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-mono font-bold focus:border-[#00E5FF] outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto" dir="rtl">
      <div className="bg-[#1e2433] text-white rounded-3xl border border-[#2d3748] shadow-2xl w-full max-w-6xl overflow-hidden my-8">
        {/* رأس النافذة */}
        <div className="px-6 py-4 border-b border-[#2d3748] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181d2a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E2F5F7]/10 text-[#00E5FF] flex items-center justify-center text-lg font-bold border border-[#00E5FF]/20">📑</div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>محرر قيد اليومية المركب</span>
                <span className="text-xs font-normal text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">Multi-Leg</span>
              </h3>
              <p className="text-xs text-[#94a3b8]">إنشاء قيد محاسبي مركب من عدة أسطر مع التحقق الفوري من التوازن</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleAddCompoundLine} className="px-4 py-2 rounded-xl text-xs font-bold text-[#00E5FF] bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/30 transition flex items-center gap-1.5 cursor-pointer">
              <span className="text-base leading-none">+</span><span>إضافة سطر حساب</span>
            </button>
            <button type="button" onClick={() => setShowCompoundModal(false)} className="w-9 h-9 rounded-xl bg-[#2d3748] hover:bg-[#374151] text-gray-300 flex items-center justify-center cursor-pointer">✕</button>
          </div>
        </div>

        {/* بيانات رأس القيد */}
        <div className="p-6 bg-[#181d2a]/60 border-b border-[#2d3748]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div><label className="block text-[11px] font-bold text-gray-300 mb-1.5">رقم القيد</label><input type="text" value={compoundForm.entry_no} onChange={e => setCompoundForm({...compoundForm, entry_no: e.target.value})} className={darkIn} /></div>
            <div><label className="block text-[11px] font-bold text-gray-300 mb-1.5">تاريخ القيد</label><input type="date" lang="en-GB" dir="ltr" value={compoundForm.date} onChange={e => setCompoundForm({...compoundForm, date: e.target.value})} className={darkIn} /></div>
            <div><label className="block text-[11px] font-bold text-gray-300 mb-1.5">العملة</label><select value={compoundForm.currency} onChange={e => setCompoundForm({...compoundForm, currency: e.target.value})} className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-bold focus:border-[#00E5FF] outline-none">{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="block text-[11px] font-bold text-gray-300 mb-1.5">سعر الصرف</label><input type="number" step="any" value={compoundForm.exchange_rate} onChange={e => setCompoundForm({...compoundForm, exchange_rate: e.target.value})} className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-mono font-bold text-amber-400 focus:border-[#00E5FF] outline-none" /></div>
            <div><label className="block text-[11px] font-bold text-gray-300 mb-1.5">نوع المرجع</label><select value={compoundForm.ref_type} onChange={e => setCompoundForm({...compoundForm, ref_type: e.target.value})} className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs focus:border-[#00E5FF] outline-none">{REF_TYPES_CMP.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="lg:col-span-5"><label className="block text-[11px] font-bold text-gray-300 mb-1.5">البيان العام</label><input type="text" placeholder="شرح عام وشامل للقيد المركب..." value={compoundForm.general_notes} onChange={e => setCompoundForm({...compoundForm, general_notes: e.target.value})} className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs focus:border-[#00E5FF] outline-none placeholder:text-gray-500" /></div>
          </div>
        </div>

        {/* جدول أسطر القيد */}
        <div className="p-6 overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-[#111827] text-gray-300 font-bold border-b border-[#2d3748]">
                <th className="px-3.5 py-3 text-right w-[30%]">رمز واسم الحساب</th>
                <th className="px-3.5 py-3 text-right w-[20%]">ربط جهة فرعية</th>
                <th className="px-3.5 py-3 text-center w-[12%]">المدين</th>
                <th className="px-3.5 py-3 text-center w-[12%]">الدائن</th>
                <th className="px-3.5 py-3 text-right w-[20%]">شرح السطر</th>
                <th className="px-3.5 py-3 text-center w-[6%]">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3748] bg-[#1a202c]">
              {compoundLines.map((line, idx) => (
                <tr key={line.id} className="hover:bg-[#222a3a] transition-colors">
                  <td className="px-3.5 py-2.5">
                    <select value={line.account_code} onChange={e => handleCompoundLineChange(idx, 'account_code', e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-[#374151] bg-[#111827] text-white text-xs font-semibold focus:border-[#00E5FF] outline-none">
                      <option value="">-- اختر حساب --</option>
                      {postingAccounts.map(a => { const code = a.code || a.acc_code || a.id; const rawName = a.name || a.account_name || a.acc_name || ''; const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code); return <option key={code} value={code}>{code} - {name}</option>; })}
                    </select>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[11px] text-gray-300 cursor-pointer"><input type="checkbox" checked={line.link_subparty} onChange={e => handleCompoundLineChange(idx, 'link_subparty', e.target.checked)} className="rounded accent-[#00E5FF]" /><span>ربط جهة فرعية</span></label>
                      {line.link_subparty && (
                        <div className="flex gap-1.5">
                          <select value={line.party_type} onChange={e => handleCompoundLineChange(idx, 'party_type', e.target.value)} className="w-1/3 h-8 px-1.5 rounded-lg border border-[#374151] bg-[#111827] text-white text-[11px] outline-none">
                            <option value="customer">عميلة 👗</option><option value="supplier">مورد 🧵</option><option value="employee">موظف ✂️</option>
                          </select>
                          <select value={line.party_id} onChange={e => handleCompoundLineChange(idx, 'party_id', e.target.value)} className="w-2/3 h-8 px-2 rounded-lg border border-[#374151] bg-[#111827] text-white text-[11px] outline-none">
                            <option value="">-- اختر --</option>
                            {line.party_type === 'customer'  && (customers  || []).map(c   => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                            {line.party_type === 'supplier'  && [...new Set((purchases || []).map(p => p.supplier || p.vendor_name).filter(Boolean))].map(s => <option key={s} value={s}>{s}</option>)}
                            {line.party_type === 'employee'  && (employees  || []).map(emp => <option key={emp.id || emp.name} value={emp.name}>{emp.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5"><input type="number" step="any" placeholder="0.00" value={line.debit} onChange={e => handleCompoundLineChange(idx, 'debit', e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-[#374151] bg-[#111827] text-[#00E5FF] font-mono font-bold text-xs text-left focus:border-[#00E5FF] outline-none" /></td>
                  <td className="px-3.5 py-2.5"><input type="number" step="any" placeholder="0.00" value={line.credit} onChange={e => handleCompoundLineChange(idx, 'credit', e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-[#374151] bg-[#111827] text-amber-400 font-mono font-bold text-xs text-left focus:border-amber-400 outline-none" /></td>
                  <td className="px-3.5 py-2.5"><input type="text" placeholder="ملاحظات..." value={line.notes} onChange={e => handleCompoundLineChange(idx, 'notes', e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-[#374151] bg-[#111827] text-white text-xs focus:border-[#00E5FF] outline-none placeholder:text-gray-500" /></td>
                  <td className="px-3.5 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button type="button" onClick={() => handleDuplicateCompoundLine(idx)} title="تكرار" className="w-7 h-7 rounded-lg bg-[#2d3748] hover:bg-[#374151] text-gray-300 flex items-center justify-center text-xs font-bold cursor-pointer">+</button>
                      <button type="button" onClick={() => handleDeleteCompoundLine(idx)} title="حذف" className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs cursor-pointer">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* شريط المجاميع والاعتماد */}
        <div className="px-6 py-4 border-t border-[#2d3748] bg-[#111827] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <div><span className="text-gray-400 font-semibold">إجمالي المدين: </span><span className="font-mono font-bold text-[#00E5FF] text-sm">{compoundTotals.totalDebit.toLocaleString('en-US',{minimumFractionDigits:2})} {compoundCurrCode}</span></div>
            <div><span className="text-gray-400 font-semibold">إجمالي الدائن: </span><span className="font-mono font-bold text-amber-400 text-sm">{compoundTotals.totalCredit.toLocaleString('en-US',{minimumFractionDigits:2})} {compoundCurrCode}</span></div>
            <div><span className="text-gray-400 font-semibold">الفرق: </span><span className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-full ${compoundTotals.isBalanced ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>{compoundTotals.diff.toLocaleString('en-US',{minimumFractionDigits:2})} {compoundCurrCode} {compoundTotals.isBalanced ? '✓ متزن' : '⚠️ غير متزن'}</span></div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setShowCompoundModal(false)} className="px-5 py-2.5 rounded-xl border border-[#374151] text-gray-300 hover:bg-[#2d3748] font-bold text-xs transition cursor-pointer">إلغاء</button>
            <button type="button" onClick={handleSubmitCompound} disabled={!compoundTotals.isBalanced || isSubmittingCompound} className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 transition flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">
              <span>✓</span><span>{isSubmittingCompound ? 'جاري الاعتماد...' : 'اعتماد القيد المركب وترحيله'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.JournalCompoundModal = JournalCompoundModal;
