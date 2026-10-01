// src/features/marketing/components/MarketingDailyBrief.jsx
// ====================================================================
// Component: MarketingDailyBrief — تبويب الموجز اليومي والتوجهات
// ====================================================================

function MarketingDailyBrief({ dailyBriefData }) {
  const brief = dailyBriefData?.brief || {};
  const trends = dailyBriefData?.trends || {};
  const todayStr = typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* كرت الموجز اليومي الرئيسي */}
      <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧠</span>
            <div>
              <h3 className="font-black text-base text-amber-300">الموجز التسويقي اليومي الذكي (Daily AI Brief)</h3>
              <p className="text-[11px] text-slate-300 font-semibold">{brief.brief_date || todayStr} • ملخص وتحليلات أداء اليوم</p>
            </div>
          </div>
          <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full font-bold border border-emerald-400/30">محدث تلقائياً 🟢</span>
        </div>

        <div className="text-xs space-y-2 leading-relaxed text-slate-200">
          <p className="font-bold text-white text-sm bg-white/10 p-3 rounded-2xl">
            📊 {brief.performance_summary || 'يتم تجميع المؤشرات اليومية...'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-2">
          {[
            { label: '⭐ المنتج الأعلى أداءً', tc: 'text-amber-300', val: brief.top_product || '—' },
            { label: '🎬 المنشور الأعلى تحويلاً', tc: 'text-indigo-300', val: brief.top_content || '—' },
            { label: '📢 الحملة الأعلى عائداً', tc: 'text-emerald-300', val: brief.top_campaign || '—' },
            { label: '👥 الطلب السائد من العملاء', tc: 'text-rose-300', val: brief.customer_demand || '—' }
          ].map((item, i) => (
            <div key={i} className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-sm">
              <p className={`text-[10px] ${item.tc} font-bold mb-1`}>{item.label}</p>
              <p className="font-black text-white truncate">{item.val}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl space-y-1">
            <h4 className="font-black text-red-300 flex items-center gap-1.5">⚠️ الإشارات السلبية والاعتراضات:</h4>
            <p className="text-slate-300 text-[11px]">{brief.negative_signals || 'لا توجد إشارات سلبية حادة'}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl space-y-1">
            <h4 className="font-black text-emerald-300 flex items-center gap-1.5">💡 الفرص والإجراءات المقترحة:</h4>
            <p className="text-slate-300 text-[11px]">{brief.opportunities || 'توجيه حملة استهداف للجمهور الصامت'}</p>
          </div>
        </div>
      </div>

      {/* التوجهات الصاعدة والهابطة */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
          📈 اكتشاف التوجهات الصاعدة والهابطة (Trend Detection Engine)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
            <h4 className="font-black text-emerald-800 text-xs">🔥 المنتجات والألوان الصاعدة</h4>
            <div className="flex flex-wrap gap-1.5">
              {(trends.rising_products || []).map(p => (
                <span key={p} className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg font-bold text-[10px]">✨ {p}</span>
              ))}
              {(trends.rising_colors || []).map(c => (
                <span key={c} className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg font-bold text-[10px]">🎨 {c}</span>
              ))}
            </div>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-2">
            <h4 className="font-black text-indigo-800 text-xs">📏 المقاسات والأسئلة الشائعة الصاعدة</h4>
            <div className="flex flex-wrap gap-1.5">
              {(trends.rising_sizes || []).map(s => (
                <span key={s} className="bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-lg font-bold text-[10px]">📐 مقاس {s}</span>
              ))}
              {(trends.rising_questions || []).map(q => (
                <span key={q} className="bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-lg font-bold text-[10px]">❓ {q}</span>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
            <h4 className="font-black text-amber-800 text-xs">👻 الجمهور الصامت والفرص المفقودة</h4>
            <div className="space-y-1.5 text-[11px] text-slate-700">
              <p>
                <span className="font-black text-amber-900">الجمهور الصامت (Silent High Intent):</span>
                {' '}<span className="font-bold text-indigo-700">{trends.silent_audience_count || 0} عميل</span> يتردد ويحفظ المنشورات دون إرسال رسائل.
              </p>
              <p>
                <span className="font-black text-amber-900">الفرص المفقودة (Lost Opportunities):</span>
                {' '}<span className="font-bold text-rose-700">{trends.lost_opportunities_count || 0} عملاء</span> انسحبوا عند السؤال عن السعر والتوصيل.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.MarketingDailyBrief = MarketingDailyBrief;
