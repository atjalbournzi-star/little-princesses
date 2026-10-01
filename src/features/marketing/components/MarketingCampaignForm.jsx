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
  const inputCls = "w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:border-rose-300 focus:ring-1 focus:ring-rose-200 transition outline-none min-h-[42px]";
  const labelCls = "block text-[11px] font-extrabold text-slate-700 mb-1";

  const statusColor = (s) => ({
    'نشط': 'bg-emerald-100 text-emerald-700 border-emerald-300',
    'connected': 'bg-emerald-100 text-emerald-700 border-emerald-300',
    'متوقف': 'bg-red-100 text-red-700 border-red-300',
    'disconnected': 'bg-slate-100 text-slate-600 border-slate-300',
    'مكتمل': 'bg-blue-100 text-blue-700 border-blue-300'
  }[s] || 'bg-slate-100 text-slate-600');

  return (
    <div className="space-y-5 animate-fadeIn">
      <form onSubmit={handleSubmitCampaign} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-l from-rose-600 to-rose-800 px-5 py-3.5 flex items-center justify-between">
          <h2 className="text-white font-black text-xs">🚀 إنشاء حملة إعلانية ربطاً بالمنتجات والحسابات المالية</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>اسم الحملة <span className="text-rose-600">*</span></label>
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
              <label className={labelCls}>الميزانية المخصصة <span className="text-rose-600">*</span></label>
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
            className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all shadow-md mt-2 disabled:opacity-60 bg-gradient-to-r from-rose-600 to-rose-800 hover:opacity-90">
            {loading ? '⏳ جاري الحفظ...' : '✨ إطلاق وحفظ الحملة الإعلانية'}
          </button>
        </div>
      </form>

      {/* جدول سجل الحملات */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-black text-xs text-slate-800">📊 سجل الحملات الإعلانية المسجلة ({filteredCampaigns.length})</h3>
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold w-48 focus:outline-none focus:border-rose-300"
            placeholder="🔍 بحث باسم الحملة أو المنصة..." />
        </div>
        <div className="overflow-x-auto">
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-bold">لا توجد حملات مسجلة بعد 🚀</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-100">
                  {['معرف الحملة', 'اسم الحملة', 'المنصة', 'المنتج المرتبط', 'الميزانية', 'حساب الدفع', 'تاريخ البدء', 'الحالة'].map(h => (
                    <th key={h} className="px-4 py-3 text-right whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((c, i) => (
                  <tr key={c.campaign_id || i} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{c.campaign_id}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{c.campaign_name}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{c.platform}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{c.product_name || 'عام / متجر'}</td>
                    <td className="px-4 py-3 font-black text-rose-700 whitespace-nowrap">{Number(c.budget || 0).toLocaleString('en-US')}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-[11px]">{c.payment_account}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{c.start_date || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${statusColor(c.status)}`}>{c.status || 'نشط'}</span>
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

window.MarketingCampaignForm = MarketingCampaignForm;
