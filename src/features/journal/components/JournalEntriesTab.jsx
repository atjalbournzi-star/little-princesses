// src/features/journal/components/JournalEntriesTab.jsx
// Journal Entries tab: simple entry form + journal entries table with edit/delete actions

function JournalEntriesTab({ journal, accounts, postingAccounts, formData, setFormData, currencyCode, isBaseCurrency, handleSubmit, handleOpenEdit, handleDeleteEntry, isDeletingId, handleOpenCompoundModal }) {
  const { inputCls, labelCls, getAccLabel } = window.JournalUtils || {};
  const REF_TYPES = ["قيد يدوي","إيجارات","مرتبات وأجور","مشتريات","مصروفات تشغيلية","سند صرف","سند قبض","تسوية"];
  const CURRENCIES = ["YER ﷼","SAR ﷼","USD $"];

  return (
    <div className="space-y-6">
      {/* ── نموذج إضافة قيد ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F2E7F3] text-[#8F2A87] flex items-center justify-center text-sm font-bold border border-[#E5CEE7]">✨</div>
            <div>
              <h2 className="text-sm font-bold text-[#25232A]">إضافة وتمرير القيود المحاسبية</h2>
              <p className="text-[11px] text-[#6F6B75]">تسجيل العمليات المالية المزدوجة مع التثبيت الآلي لسعر الصرف</p>
            </div>
          </div>
          <button type="button" onClick={handleOpenCompoundModal} className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#8F2A87] to-[#B0005A] hover:opacity-95 transition shadow-xs flex items-center gap-2 cursor-pointer">
            <span>📑</span><span>+ محرر قيد اليومية المركب (متعدد الأطراف)</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>رقم القيد (تلقائي)</label>
              <input type="text" className={inputCls + " font-mono"} placeholder="تلقائي..." value={formData.entry_no} onChange={e => setFormData({...formData, entry_no: e.target.value})} />
            </div>
            <div>
              <label className={labelCls}>من حساب (المدين) <span className="text-[#D64545] font-bold">*</span></label>
              <select className={inputCls} value={formData.debit} onChange={e => setFormData({...formData, debit: e.target.value})}>
                <option value="">-- اختر حساب حركة --</option>
                {postingAccounts.map(a => { const code = a.code || a.acc_code || a.id; const rawName = a.name || a.account_name || a.acc_name || ''; const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code); return <option key={code} value={code}>{code} - {name}</option>; })}
              </select>
            </div>
            <div>
              <label className={labelCls}>إلى حساب (الدائن) <span className="text-[#D64545] font-bold">*</span></label>
              <select className={inputCls} value={formData.credit} onChange={e => setFormData({...formData, credit: e.target.value})}>
                <option value="">-- اختر حساب حركة --</option>
                {postingAccounts.map(a => { const code = a.code || a.acc_code || a.id; const rawName = a.name || a.account_name || a.acc_name || ''; const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code); return <option key={code} value={code}>{code} - {name}</option>; })}
              </select>
            </div>
            <div>
              <label className={labelCls}>العملة <span className="text-[#D64545] font-bold">*</span></label>
              <select className={inputCls} value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>المبلغ <span className="text-[#D64545] font-bold">*</span></label>
              <input type="number" step="any" required className={inputCls + " font-mono font-bold text-left tabular-nums"} placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
            <div>
              <label className={labelCls}>{isBaseCurrency ? 'المكافئ (YER)' : 'سعر الصرف / المكافئ (YER)'}</label>
              {isBaseCurrency ? (
                <div className="h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] font-mono font-extrabold text-xs text-[#007F8C] flex items-center text-left tabular-nums">
                  {formData.amount ? `${(parseFloat(formData.amount)||0).toLocaleString('en-US',{minimumFractionDigits:2})} YER ﷼` : '0.00 YER ﷼'}
                </div>
              ) : (
                <div className="flex gap-2">
                  <input type="number" step="any" required className={inputCls + " font-mono font-bold text-[#8F2A87] w-1/2 text-left tabular-nums"} placeholder="سعر الصرف..." value={formData.exchange_rate} onChange={e => setFormData({...formData, exchange_rate: e.target.value})} />
                  <div className="h-11 px-2.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] font-mono font-extrabold text-[11px] text-[#007F8C] flex items-center text-left tabular-nums w-1/2 truncate">
                    {formData.amount ? `${((parseFloat(formData.amount)||0)*(parseFloat(formData.exchange_rate)||1)).toLocaleString('en-US',{minimumFractionDigits:2})} ﷼` : '0.00 ﷼'}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>تاريخ القيد</label>
              <input type="date" lang="en-GB" dir="ltr" className={inputCls + " font-mono text-center tabular-nums"} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
              <label className={labelCls}>نوع المرجع</label>
              <select className={inputCls} value={formData.ref_type} onChange={e => setFormData({...formData, ref_type: e.target.value})}>
                {REF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-1 sm:col-span-2 lg:col-span-3">
              <label className={labelCls}>البيان والشرح <span className="text-[#D64545] font-bold">*</span></label>
              <input type="text" className={inputCls} placeholder="شرح تفصيلي للعملية المالية..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
            <div>
              <label className={labelCls}>رقم المرجع / السند</label>
              <input type="text" className={inputCls + " font-mono"} placeholder="مثال: REF-1002" value={formData.ref_id || ''} onChange={e => setFormData({...formData, ref_id: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs text-white bg-[#8F2A87] hover:bg-[#73216C] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer">
              <Icons.Check className="w-4 h-4" /><span>حفظ وترحيل القيد المحاسبي 📑</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── جدول سجل القيود ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-sm text-[#25232A]">سجل القيود اليومية المرحلة</h3>
            <span className="text-xs bg-[#F2E7F3] text-[#8F2A87] font-bold px-2.5 py-0.5 rounded-full font-mono">{(journal||[]).length}</span>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
          {(!journal || journal.length === 0) ? (
            <div className="text-center py-12 text-[#6F6B75] text-xs font-medium">لا توجد قيود مسجلة بعد 📑</div>
          ) : (
            <table className="w-full text-xs table-fixed border-collapse">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-bold border-b border-[#E8E5EA]">
                  <th className="px-3.5 py-3 text-right w-[15%]">رقم القيد والتاريخ</th>
                  <th className="px-3.5 py-3 text-right w-[30%]">الحساب المدين والدائن</th>
                  <th className="px-3.5 py-3 text-right w-[20%]">البيان ونوع المرجع</th>
                  <th className="px-3.5 py-3 text-left w-[20%]">المبالغ وسعر الصرف</th>
                  <th className="px-3.5 py-3 text-center w-[15%]">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {journal.map(j => {
                  const debitLabel  = getAccLabel(j.debit,  j.debit_code,  accounts);
                  const creditLabel = getAccLabel(j.credit, j.credit_code, accounts);
                  const origAmt = parseFloat(j.amount) || 0;
                  const curr = j.currency || 'YER';
                  const isForeign = !String(curr).includes('YER');
                  const rate    = parseFloat(j.exchange_rate) || 1.0;
                  const baseAmt = parseFloat(j.base_amount) || (curr === 'YER' ? origAmt : origAmt * rate);
                  const refInfo = [j.ref_type, j.ref_id].filter(Boolean).join(' - ') || 'قيد يدوي';
                  return (
                    <tr key={j.id} className="hover:bg-[#FAFAFB] transition-colors border-b border-[#E8E5EA]/60">
                      <td className="px-3.5 py-3 text-right">
                        <div className="font-mono font-bold text-xs text-[#8F2A87] truncate">{j.entry_no || `JRN-${j.id}`}</div>
                        <div className="font-mono text-[11px] text-[#6F6B75] mt-0.5 flex items-center gap-1"><span>📅</span><span>{j.date || '—'}</span></div>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <div className="font-bold text-xs text-[#25232A] truncate flex items-center gap-1.5"><span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E2F5F7] text-[#007F8C] shrink-0">مدين</span><span className="truncate">{debitLabel}</span></div>
                        <div className="font-medium text-[11px] text-[#6F6B75] mt-1 truncate flex items-center gap-1.5"><span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F2E7F3] text-[#8F2A87] shrink-0">دائن</span><span className="truncate">{creditLabel}</span></div>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <div className="font-semibold text-xs text-[#25232A] truncate">{j.notes || j.statement || '—'}</div>
                        <div className="mt-1"><span className="bg-[#FAFAFB] border border-[#E8E5EA] text-[#6F6B75] px-2 py-0.5 rounded text-[10.5px] font-medium inline-block">🏷️ {refInfo}</span></div>
                      </td>
                      <td className="px-3.5 py-3 text-left tabular-nums">
                        <div className="font-mono font-bold text-xs text-[#25232A]">{origAmt.toLocaleString('en-US',{minimumFractionDigits:2})} <span className="text-[10px] text-[#6F6B75] font-normal">{curr}</span></div>
                        {isForeign && <div className="text-[10.5px] font-mono text-[#007F8C] font-bold mt-0.5">{baseAmt.toLocaleString('en-US',{minimumFractionDigits:2})} <span className="text-[10px] font-normal">YER</span>{rate > 1 && <span className="text-[#6F6B75] text-[10px] font-normal mr-1">(@{rate})</span>}</div>}
                      </td>
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button type="button" onClick={() => handleOpenEdit(j)} className="px-2.5 py-1 bg-[#E2F5F7] text-[#007F8C] hover:bg-[#C5EDF0] rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer">✏️ تعديل</button>
                          <button type="button" onClick={() => handleDeleteEntry(j)} disabled={isDeletingId === j.id} className="px-2.5 py-1 bg-rose-50 text-[#D64545] hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50">🗑️ حذف</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

window.JournalEntriesTab = JournalEntriesTab;
