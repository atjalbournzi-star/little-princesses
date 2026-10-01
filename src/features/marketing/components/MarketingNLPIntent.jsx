// src/features/marketing/components/MarketingNLPIntent.jsx
// ====================================================================
// Component: MarketingNLPIntent — تحليل المشاعر + نية الشراء (NLP)
// ====================================================================

function MarketingNLPIntent({ nlpCommentsData, intentConvsData }) {
  const summary = nlpCommentsData?.summary || {};
  const data = nlpCommentsData?.data || [];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* كروت ملخص المشاعر */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-500 text-white rounded-3xl p-5 shadow-sm space-y-1">
          <p className="text-[11px] font-bold opacity-80">المشاعر الإيجابية (Positive Sentiment)</p>
          <h3 className="text-3xl font-black">{summary.positive_pct !== undefined ? summary.positive_pct : 0}%</h3>
          <p className="text-[10px] bg-white/20 inline-block px-2 py-0.5 rounded mt-1">السبب الرئيس: إعجاب بدقة التطريز والفخامة</p>
        </div>
        <div className="bg-slate-700 text-white rounded-3xl p-5 shadow-sm space-y-1">
          <p className="text-[11px] font-bold opacity-80">المشاعر المحايدة والاستفسارات</p>
          <h3 className="text-3xl font-black">{summary.neutral_pct !== undefined ? summary.neutral_pct : 0}%</h3>
          <p className="text-[10px] bg-white/20 inline-block px-2 py-0.5 rounded mt-1">السبب الرئيس: أسئلة عن المقاسات وأماكن التوصيل</p>
        </div>
        <div className="bg-rose-600 text-white rounded-3xl p-5 shadow-sm space-y-1">
          <p className="text-[11px] font-bold opacity-80">المشاعر السلبية والاعتراضات</p>
          <h3 className="text-3xl font-black">{summary.negative_pct !== undefined ? summary.negative_pct : 0}%</h3>
          <p className="text-[10px] bg-white/20 inline-block px-2 py-0.5 rounded mt-1">السبب الرئيس: اعتراض على السعر أو مدة الشحن</p>
        </div>
      </div>

      {/* جدول التعليقات المحللة */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-100">
          <h3 className="font-black text-slate-800 text-sm">💬 معالجة اللغة العربية واللهجة اليمنية واستخراج نية الشراء (Arabic NLP Engine)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                {['العميل / التعليق', 'اللهجة المكتشفة', 'المشاعر والسبب', 'تصنيف النية Intent', 'المنتج واللون والمقاس المستخرج', 'المحافظة المستخرجة'].map(h => (
                  <th key={h} className="px-3 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {(!data || data.length === 0) ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-400 font-bold">لا توجد تعليقات أو تحليلات مشاعر NLP مسجلة بعد 💬</td></tr>
              ) : (
                data.map((c, idx) => (
                  <tr key={c.comment_id || idx} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <p className="font-black text-slate-900">{c.text}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{c.customer_name || 'عميل'} • {c.platform}</p>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold">{c.dialect}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${c.sentiment === 'Positive' ? 'bg-emerald-100 text-emerald-800' : (c.sentiment === 'Negative' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700')}`}>
                        {c.sentiment} ({c.sentiment_cause})
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-indigo-700 font-bold">{c.intent_category}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600 text-[11px]">
                      {c.extracted_product || '—'} {c.extracted_color ? `• لون ${c.extracted_color}` : ''} {c.extracted_age ? `• سن ${c.extracted_age}` : ''}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap font-bold text-amber-700">{c.extracted_location || 'غير محدد'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نية الشراء للمحادثات */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h3 className="font-black text-slate-800 text-sm">🎯 تقييم نية الشراء للمحادثات (Purchase Intent Scoring & Brackets)</h3>
        {(!intentConvsData || intentConvsData.length === 0) ? (
          <div className="text-center py-8 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-slate-200">
            لا توجد محادثات مسجلة لتحليل نية الشراء بعد • سيتم استنتاج النوايا لحظياً عند ورود الرسائل 💬
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(intentConvsData || []).map(conv => (
              <div key={conv.conversation_id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-slate-900 text-xs">{conv.customer_name || 'محادثة جديدة'}</span>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${conv.intent_score >= 90 ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}>
                      {conv.intent_bracket}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600">
                    <p><span className="font-bold text-slate-500">المنصة:</span> {conv.platform}</p>
                    <p><span className="font-bold text-slate-500">الفرص المفقودة:</span> <span className="font-bold text-rose-600">{conv.lost_opportunity_reason}</span></p>
                    {conv.silent_high_intent === 1 && (
                      <span className="inline-block bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-black mt-1">
                        👻 عميل صامت عالي النية (Silent High Intent)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-xs font-bold text-slate-500">درجة النية الحالية:</span>
                  <span className="text-base font-black text-indigo-700">{conv.intent_score} / 100</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

window.MarketingNLPIntent = MarketingNLPIntent;
