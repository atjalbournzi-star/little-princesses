// src/features/marketing/components/MarketingProductsAI.jsx
// ====================================================================
// Component: MarketingProductsAI — تحليلات المنتجات والإسناد متعدد الممسات
// ====================================================================

function MarketingProductsAI({ productsAIData, campaignAttrData, currLabel }) {
  return (
    <div className="space-y-5 animate-fadeIn">
      {/* جدول أداء المنتجات */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-800 text-sm">📈 تحليلات المنتجات الشاملة والـ ROAS والأرباح الفعلية</h3>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">ربط المبيعات وتكلفة البضاعة المباعة COGS وإنفاق الإعلانات لحساب الربح الصافي</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right whitespace-nowrap">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                {[
                  'المنتج / الموديل', 'الوصول / View', 'حفظ / مشاركة', 'الطلبات',
                  'الإيرادات', 'التكلفة COGS', 'الإنفاق الإعلاني', 'الربح الصافي',
                  'عائد الإعلان ROAS', 'تكلفة الاستحواذ CAC', 'النتيجة الإجمالية (0-100)'
                ].map(h => (
                  <th key={h} className="px-3 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {(productsAIData || []).length === 0 ? (
                <tr><td colSpan="11" className="px-4 py-8 text-center text-slate-400 font-bold">لا توجد منتجات أو بيانات تسويقية مسجلة بعد 📈</td></tr>
              ) : (
                (productsAIData || []).map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-black text-slate-900">{p.model_name}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{Number(p.reach || 0).toLocaleString('en-US')}</td>
                    <td className="px-3 py-3 text-center text-slate-600">🔖 {p.saves || 0} / 🔁 {p.shares || 0}</td>
                    <td className="px-3 py-3 text-center font-bold text-indigo-600">{p.orders || 0} طلبات</td>
                    <td className="px-3 py-3 font-black text-emerald-600">{Number(p.revenue || 0).toLocaleString('en-US')} {currLabel}</td>
                    <td className="px-3 py-3 text-slate-500">{Number(p.cogs || 0).toLocaleString('en-US')} {currLabel}</td>
                    <td className="px-3 py-3 text-rose-600">{Number(p.ad_spend || 0).toLocaleString('en-US')} {currLabel}</td>
                    <td className="px-3 py-3 font-black text-emerald-700">{Number(p.profit || 0).toLocaleString('en-US')} {currLabel}</td>
                    <td className="px-3 py-3 text-center font-black text-indigo-700 bg-indigo-50/50">{p.roas}x</td>
                    <td className="px-3 py-3 text-center text-slate-600">{p.cac} {currLabel}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="bg-rose-100 text-rose-800 px-2.5 py-1 rounded-lg font-black text-xs">{p.overall_score} / 100</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نماذج الإسناد متعدد الممسات */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div>
          <h3 className="font-black text-slate-800 text-sm">🎯 نماذج الإسناد متعدد الممسات (Multi-Touch Attribution Models)</h3>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">تقسيم العائد والطلبات وفقاً للنماذج دون اختلاق أرقام، مع توضيح مصدر البيانات</p>
        </div>
        {(!campaignAttrData || campaignAttrData.length === 0) ? (
          <div className="text-center py-8 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-slate-200">
            لا توجد حملات إسناد مسجلة بعد • ستظهر النماذج متعددة الممسات عند إطلاق الحملات 🎯
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(campaignAttrData || []).map(cmp => (
              <div key={cmp.campaign_id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <h4 className="font-black text-slate-900 text-xs">{cmp.campaign_name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold">{cmp.platform} • ميزانية: {cmp.budget} {currLabel}</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">{cmp.campaign_id}</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(cmp.attribution_models || {}).map(([mName, mVal]) => (
                    <div key={mName} className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-700 text-[11px]">{mName}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-emerald-600">{mVal.attributed_revenue} {currLabel}</span>
                        <span className="text-[9px] text-slate-400">({mVal.attributed_orders} طلبات)</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${mVal.data_source === 'Actual' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
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

window.MarketingProductsAI = MarketingProductsAI;
