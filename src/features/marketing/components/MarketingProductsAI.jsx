// src/features/marketing/components/MarketingProductsAI.jsx
// ====================================================================
// Component: MarketingProductsAI — تحليلات المنتجات والإسناد متعدد الممسات
// ====================================================================

function MarketingProductsAI({ productsAIData, campaignAttrData, currLabel }) {
  return (
    <div className="space-y-1.5 animate-fadeIn select-none">
      {/* جدول أداء المنتجات */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 shadow-xs overflow-hidden">
        <div className="h-7.5 px-3 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-[11px] text-slate-800 dark:text-white flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <span>تحليلات المنتجات والـ ROAS والأرباح الفعلية</span>
          </h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-[11px] text-right whitespace-nowrap">
            <thead>
              <tr className="h-7.5 bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                {[
                  'المنتج / الموديل', 'الوصول', 'حفظ / مشاركة', 'الطلبات',
                  'الإيرادات', 'التكلفة COGS', 'الإنفاق الإعلاني', 'الربح الصافي',
                  'عائد الإعلان ROAS', 'CAC', 'النتيجة'
                ].map(h => (
                  <th key={h} className="px-2.5 py-1">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
              {(productsAIData || []).length === 0 ? (
                <tr><td colSpan="11" className="px-3 py-6 text-center text-slate-500 dark:text-slate-400 font-medium">لا توجد منتجات أو بيانات تسويقية مسجلة بعد</td></tr>
              ) : (
                (productsAIData || []).map((p, idx) => (
                  <tr key={p.id || idx} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-2.5 py-1 font-bold text-slate-800 dark:text-white">{p.model_name}</td>
                    <td className="px-2.5 py-1 text-center font-mono text-slate-600 dark:text-slate-300 tabular-nums">{Number(p.reach || 0).toLocaleString('en-US')}</td>
                    <td className="px-2.5 py-1 text-center font-mono text-slate-600 dark:text-slate-300 tabular-nums">{p.saves || 0} / {p.shares || 0}</td>
                    <td className="px-2.5 py-1 text-center font-bold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">{p.orders || 0}</td>
                    <td className="px-2.5 py-1 font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{Number(p.revenue || 0).toLocaleString('en-US')} {currLabel}</td>
                    <td className="px-2.5 py-1 text-slate-600 dark:text-slate-400 font-mono tabular-nums">{Number(p.cogs || 0).toLocaleString('en-US')} {currLabel}</td>
                    <td className="px-2.5 py-1 text-rose-600 dark:text-rose-400 font-mono tabular-nums">{Number(p.ad_spend || 0).toLocaleString('en-US')} {currLabel}</td>
                    <td className="px-2.5 py-1 font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{Number(p.profit || 0).toLocaleString('en-US')} {currLabel}</td>
                    <td className="px-2.5 py-1 text-center font-bold text-sky-600 dark:text-sky-400 font-mono tabular-nums">{p.roas}x</td>
                    <td className="px-2.5 py-1 text-center font-mono text-slate-600 dark:text-slate-300 tabular-nums">{p.cac} {currLabel}</td>
                    <td className="px-2.5 py-1 text-center">
                      <span className="bg-pink-500/10 text-pink-600 dark:text-pink-300 px-1.5 py-0.2 rounded border border-pink-200 dark:border-pink-800 font-mono text-[10px] font-bold">{p.overall_score}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نماذج الإسناد متعدد الممسات */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 p-2.5 shadow-xs space-y-2">
        <h3 className="font-bold text-[11px] text-slate-800 dark:text-white flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1">
          <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /></svg>
          <span>نماذج الإسناد متعدد الممسات (Multi-Touch Attribution)</span>
        </h3>
        {(!campaignAttrData || campaignAttrData.length === 0) ? (
          <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-[11px] font-medium bg-slate-50 dark:bg-[#0F172A] rounded-lg">
            لا توجد حملات إسناد مسجلة بعد • ستظهر النماذج متعددة الممسات عند إطلاق الحملات
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(campaignAttrData || []).map(cmp => (
              <div key={cmp.campaign_id} className="bg-slate-50 dark:bg-[#0F172A] rounded-lg p-2.5 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-[11px]">{cmp.campaign_name}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{cmp.platform} • ميزانية: {cmp.budget} {currLabel}</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800">{cmp.campaign_id}</span>
                </div>
                <div className="space-y-1 text-xs">
                  {Object.entries(cmp.attribution_models || {}).map(([mName, mVal]) => (
                    <div key={mName} className="flex items-center justify-between bg-white dark:bg-[#111C38] p-1.5 rounded-md border border-slate-200 dark:border-slate-800">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-[10.5px]">{mName}</span>
                      <div className="flex items-center gap-1.5 font-mono text-[10.5px]">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{mVal.attributed_revenue} {currLabel}</span>
                        <span className="text-slate-400">({mVal.attributed_orders})</span>
                        <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${mVal.data_source === 'Actual' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-600 dark:text-amber-300'}`}>
                          {mVal.data_source}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.MarketingProductsAI = MarketingProductsAI;
}
