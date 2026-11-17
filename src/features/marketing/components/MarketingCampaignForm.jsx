// src/features/marketing/components/MarketingCampaignForm.jsx
// ====================================================================
// Component: MarketingCampaignForm — نموذج إنشاء حملة + جدول الحملات
// ====================================================================

function MarketingCampaignForm({
  products, accounts, loading,
  campaignName, setCampaignName,
  platform, setPlatform,
  modelName, setModelName,
  paymentAccount, setPaymentAccount,
  objective, setObjective,
  budget, setBudget,
  status, setStatus,
  startDate, setStartDate,
  handleSubmitCampaign,
  filteredCampaigns, search, setSearch
}) {
  const inputCls = "w-full h-6.5 px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-pink-500 transition";
  const labelCls = "block text-[10.5px] font-bold text-slate-800 dark:text-slate-100 mb-0.5";

  const statusColor = (s) => ({
    'نشط': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    'connected': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    'متوقف': 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    'disconnected': 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    'مكتمل': 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-200 dark:border-sky-800'
  }[s] || 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700');

  return (
    <div className="space-y-1.5 animate-fadeIn select-none">
      <form onSubmit={handleSubmitCampaign} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 shadow-xs overflow-hidden">
        <div className="h-7.5 px-3 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-slate-800 dark:text-white font-bold text-[11px] flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            <span>إنشاء حملة إعلانية ربطاً بالمنتجات والحسابات المالية</span>
          </h2>
        </div>
        <div className="p-2.5 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <label className={labelCls}>اسم الحملة <span className="text-rose-500">*</span></label>
              <input value={campaignName} onChange={e => setCampaignName(e.target.value)} className={inputCls} placeholder="" />
            </div>
            <div>
              <label className={labelCls}>المنصة المستهدفة</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)} className={inputCls}>
                {['Instagram', 'Facebook', 'TikTok', 'WhatsApp Business', 'Google Ads', 'Snapchat', 'YouTube', 'Pinterest'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>المنتج / الموديل المرتبط</label>
              <select value={modelName} onChange={e => setModelName(e.target.value)} className={inputCls}>
                <option value="">اختر المنتج...</option>
                {(products || []).map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>حساب دفع الإعلان (ERP Account)</label>
              <select value={paymentAccount} onChange={e => setPaymentAccount(e.target.value)} className={inputCls}>
                <option value="">604 - مصاريف التسويق والإعلانات الممولة</option>
                {(accounts || []).map(a => {
                  const code = a.code || a.acc_code || a.id;
                  const rawName = a.name || a.account_name || a.acc_name || '';
                  const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                  return <option key={code} value={code}>{code} - {name}</option>;
                })}
              </select>
            </div>
            <div>
              <label className={labelCls}>الهدف الإعلاني</label>
              <select value={objective} onChange={e => setObjective(e.target.value)} className={inputCls}>
                {['مبيعات مباشرة', 'زيادة الوعي', 'تفاعل ورسائل', 'جمع بيانات عملاء'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>الميزانية المخصصة <span className="text-rose-500">*</span></label>
              <input type="number" value={budget} onChange={e => setBudget(e.target.value)} className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>تاريخ البدء</label>
              <input type="date" lang="en-GB" dir="ltr" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>حالة الحملة</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
                {['نشط', 'متوقف', 'مكتمل'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full h-7.5 rounded-lg font-bold text-xs text-white transition-all shadow-xs disabled:opacity-60 bg-pink-600 hover:bg-pink-700 flex items-center justify-center gap-1.5 cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <span>{loading ? 'جاري الحفظ...' : 'إطلاق وحفظ الحملة الإعلانية'}</span>
          </button>
        </div>
      </form>

      {/* جدول سجل الحملات */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 shadow-xs overflow-hidden">
        <div className="h-7.5 px-3 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-[11px] text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <span>سجل الحملات الإعلانية المسجلة ({filteredCampaigns.length})</span>
          </h3>
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="h-6 px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-medium text-slate-900 dark:text-slate-100 w-44 outline-none focus:border-pink-500"
            placeholder="بحث باسم الحملة أو المنصة..." />
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-[11px] font-bold">لا توجد حملات مسجلة بعد 🚀</div>
          ) : (
            <table className="w-full text-[11px] text-right">
              <thead>
                <tr className="h-7.5 bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  {['معرف الحملة', 'اسم الحملة', 'المنصة', 'المنتج المرتبط', 'الميزانية', 'حساب الدفع', 'تاريخ البدء', 'الحالة'].map(h => (
                    <th key={h} className="px-2.5 py-1 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
                {filteredCampaigns.map((c, i) => (
                  <tr key={c.campaign_id || i} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-2.5 py-1 font-mono text-[10.5px] text-slate-500 dark:text-slate-400">{c.campaign_id}</td>
                    <td className="px-2.5 py-1 font-bold text-slate-800 dark:text-white whitespace-nowrap">{c.campaign_name}</td>
                    <td className="px-2.5 py-1 text-slate-700 dark:text-slate-300 whitespace-nowrap">{c.platform}</td>
                    <td className="px-2.5 py-1 text-slate-700 dark:text-slate-300 whitespace-nowrap">{c.product_name || 'عام / متجر'}</td>
                    <td className="px-2.5 py-1 font-bold font-mono text-pink-600 dark:text-pink-400 whitespace-nowrap tabular-nums">{Number(c.budget || 0).toLocaleString('en-US')}</td>
                    <td className="px-2.5 py-1 text-slate-600 dark:text-slate-400 whitespace-nowrap text-[10.5px]">{c.payment_account}</td>
                    <td className="px-2.5 py-1 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono tabular-nums">{c.start_date || '—'}</td>
                    <td className="px-2.5 py-1 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md border ${statusColor(c.status)}`}>{c.status || 'نشط'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.MarketingCampaignForm = MarketingCampaignForm;
}
