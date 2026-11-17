// src/features/marketing/components/MarketingNLPIntent.jsx
// ====================================================================
// Component: MarketingNLPIntent — تحليل المشاعر + نية الشراء (NLP)
// ====================================================================

function MarketingNLPIntent({ nlpCommentsData, intentConvsData }) {
  const summary = nlpCommentsData?.summary || {};
  const data = nlpCommentsData?.data || [];

  return (
    <div className="space-y-1.5 animate-fadeIn select-none">
      {/* كروت ملخص المشاعر */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
        <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-xs space-y-1">
          <p className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">المشاعر الإيجابية (Positive Sentiment)</p>
          <h3 className="text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">{summary.positive_pct !== undefined ? summary.positive_pct : 0}%</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">السبب الرئيس: إعجاب بدقة التطريز والفخامة</p>
        </div>
        <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-xs space-y-1">
          <p className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300">المشاعر المحايدة والاستفسارات</p>
          <h3 className="text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">{summary.neutral_pct !== undefined ? summary.neutral_pct : 0}%</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">السبب الرئيس: أسئلة عن المقاسات وأماكن التوصيل</p>
        </div>
        <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-xs space-y-1">
          <p className="text-[10.5px] font-bold text-rose-600 dark:text-rose-400">المشاعر السلبية والاعتراضات</p>
          <h3 className="text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">{summary.negative_pct !== undefined ? summary.negative_pct : 0}%</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">السبب الرئيس: اعتراض على السعر أو مدة الشحن</p>
        </div>
      </div>

      {/* جدول التعليقات المحللة */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 shadow-xs overflow-hidden">
        <div className="h-7.5 px-3 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-[11px] text-slate-800 dark:text-white flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <span>تحليل المشاعر ونية الشراء (Arabic NLP Engine)</span>
          </h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-[11px] text-right">
            <thead>
              <tr className="h-7.5 bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                {['العميل / التعليق', 'اللهجة', 'المشاعر والسبب', 'تصنيف النية', 'المنتج والمقاس', 'المحافظة'].map(h => (
                  <th key={h} className="px-2.5 py-1">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
              {(!data || data.length === 0) ? (
                <tr><td colSpan="6" className="px-3 py-6 text-center text-slate-500 dark:text-slate-400 font-medium">لا توجد تعليقات مسجلة بعد</td></tr>
              ) : (
                data.map((c, idx) => (
                  <tr key={c.comment_id || idx} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-2.5 py-1">
                      <span className="font-bold text-slate-800 dark:text-white">{c.text}</span>
                      <span className="text-[10px] text-slate-400 mr-1.5 font-mono">({c.customer_name || 'عميل'})</span>
                    </td>
                    <td className="px-2.5 py-1 whitespace-nowrap">
                      <span className="bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-1.5 py-0.2 rounded text-[10px] font-bold">{c.dialect}</span>
                    </td>
                    <td className="px-2.5 py-1 whitespace-nowrap">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${c.sentiment === 'Positive' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : (c.sentiment === 'Negative' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300')}`}>
                        {c.sentiment}
                      </span>
                    </td>
                    <td className="px-2.5 py-1 whitespace-nowrap text-indigo-600 dark:text-indigo-400 font-bold">{c.intent_category}</td>
                    <td className="px-2.5 py-1 whitespace-nowrap text-slate-700 dark:text-slate-300 text-[10.5px]">
                      {c.extracted_product || '—'} {c.extracted_color ? `• ${c.extracted_color}` : ''}
                    </td>
                    <td className="px-2.5 py-1 whitespace-nowrap font-bold text-amber-600 dark:text-amber-400">{c.extracted_location || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نية الشراء للمحادثات */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 p-2.5 shadow-xs space-y-2">
        <h3 className="font-bold text-[11px] text-slate-800 dark:text-white flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1">
          <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>تقييم نية الشراء للمحادثات (Purchase Intent Scoring)</span>
        </h3>
        {(!intentConvsData || intentConvsData.length === 0) ? (
          <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-[11px] font-medium bg-slate-50 dark:bg-[#0F172A] rounded-lg">
            لا توجد محادثات مسجلة لتحليل نية الشراء بعد
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(intentConvsData || []).map(conv => (
              <div key={conv.conversation_id} className="bg-slate-50 dark:bg-[#0F172A] rounded-lg p-2.5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 dark:text-white text-[11px]">{conv.customer_name || 'محادثة'}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md border ${conv.intent_score >= 90 ? 'bg-pink-500/10 text-pink-600 dark:text-pink-300 border-pink-200 dark:border-pink-800' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'}`}>
                      {conv.intent_bracket}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-[10.5px] text-slate-600 dark:text-slate-300">
                    <p><span className="font-bold text-slate-500 dark:text-slate-400">المنصة:</span> {conv.platform}</p>
                    {conv.lost_opportunity_reason && <p><span className="font-bold text-rose-500">ملاحظة:</span> {conv.lost_opportunity_reason}</p>}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-1.5">
                  <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400">درجة النية:</span>
                  <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">{conv.intent_score} / 100</span>
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
  window.MarketingNLPIntent = MarketingNLPIntent;
}
