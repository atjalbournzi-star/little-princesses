// src/features/marketing/components/MarketingDailyBrief.jsx
// ====================================================================
// Component: MarketingDailyBrief — تبويب الموجز اليومي والتوجهات
// ====================================================================

function MarketingDailyBrief({ dailyBriefData }) {
  const brief = dailyBriefData?.brief || {};
  const trends = dailyBriefData?.trends || {};
  const todayStr = typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-1.5 animate-fadeIn select-none">
      {/* كرت الموجز اليومي الرئيسي */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 p-2.5 shadow-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            <div>
              <h3 className="font-bold text-[11px] text-slate-800 dark:text-white">الموجز التسويقي اليومي الذكي (Daily AI Brief)</h3>
              <p className="text-[10px] text-slate-400 font-mono">{brief.brief_date || todayStr} • ملخص وتحليلات أداء اليوم</p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 px-2 py-0.2 rounded-md font-bold border border-emerald-200 dark:border-emerald-800">محدث تلقائياً</span>
        </div>

        <div className="text-[11px] text-slate-800 dark:text-slate-200">
          <p className="font-medium bg-slate-50 dark:bg-[#0F172A] p-2 rounded-lg border border-slate-200 dark:border-slate-800">
            {brief.performance_summary || 'يتم تجميع المؤشرات اليومية...'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 text-[11px]">
          {[
            { label: 'المنتج الأعلى أداءً', tc: 'text-amber-600 dark:text-amber-300', val: brief.top_product || '—' },
            { label: 'المنشور الأعلى تحويلاً', tc: 'text-indigo-600 dark:text-indigo-300', val: brief.top_content || '—' },
            { label: 'الحملة الأعلى عائداً', tc: 'text-emerald-600 dark:text-emerald-300', val: brief.top_campaign || '—' },
            { label: 'الطلب السائد من العملاء', tc: 'text-pink-600 dark:text-pink-300', val: brief.customer_demand || '—' }
          ].map((item, i) => (
            <div key={i} className="bg-slate-50 dark:bg-[#0F172A] p-2 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className={`text-[10px] ${item.tc} font-bold mb-0.5`}>{item.label}</p>
              <p className="font-bold text-slate-900 dark:text-white truncate">{item.val}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px]">
          <div className="bg-rose-500/10 border border-rose-200 dark:border-rose-800/60 p-2 rounded-lg space-y-0.5">
            <h4 className="font-bold text-rose-600 dark:text-rose-300 text-[10.5px]">الإشارات السلبية والاعتراضات:</h4>
            <p className="text-slate-700 dark:text-slate-300 text-[10.5px]">{brief.negative_signals || 'لا توجد إشارات سلبية حادة'}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800/60 p-2 rounded-lg space-y-0.5">
            <h4 className="font-bold text-emerald-600 dark:text-emerald-300 text-[10.5px]">الفرص والإجراءات المقترحة:</h4>
            <p className="text-slate-700 dark:text-slate-300 text-[10.5px]">{brief.opportunities || 'توجيه حملة استهداف للجمهور الصامت'}</p>
          </div>
        </div>
      </div>

      {/* التوجهات الصاعدة والهابطة */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 p-2.5 shadow-xs space-y-2">
        <h3 className="font-bold text-[11px] text-slate-800 dark:text-white flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1">
          <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          <span>اكتشاف التوجهات الصاعدة والهابطة (Trend Detection Engine)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 text-xs">
          <div className="bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-1.5">
            <h4 className="font-bold text-emerald-600 dark:text-emerald-300 text-[10.5px]">المنتجات والألوان الصاعدة</h4>
            <div className="flex flex-wrap gap-1">
              {(trends.rising_products || []).map(p => (
                <span key={p} className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 font-bold text-[10px]">{p}</span>
              ))}
              {(trends.rising_colors || []).map(c => (
                <span key={c} className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 font-bold text-[10px]">{c}</span>
              ))}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-1.5">
            <h4 className="font-bold text-indigo-600 dark:text-indigo-300 text-[10.5px]">المقاسات والأسئلة الشائعة</h4>
            <div className="flex flex-wrap gap-1">
              {(trends.rising_sizes || []).map(s => (
                <span key={s} className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800 font-bold text-[10px]">مقاس {s}</span>
              ))}
              {(trends.rising_questions || []).map(q => (
                <span key={q} className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800 font-bold text-[10px]">{q}</span>
              ))}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-1">
            <h4 className="font-bold text-amber-600 dark:text-amber-300 text-[10.5px]">الجمهور الصامت والفرص المفقودة</h4>
            <div className="space-y-1 text-[10.5px] text-slate-700 dark:text-slate-300">
              <p>
                <span className="font-bold text-amber-600 dark:text-amber-400">الجمهور الصامت:</span>
                {' '}<span className="font-bold font-mono text-slate-900 dark:text-white tabular-nums">{trends.silent_audience_count || 0}</span> عميل يتردد ويحفظ المنشورات.
              </p>
              <p>
                <span className="font-bold text-rose-600 dark:text-rose-400">الفرص المفقودة:</span>
                {' '}<span className="font-bold font-mono text-slate-900 dark:text-white tabular-nums">{trends.lost_opportunities_count || 0}</span> عملاء انسحبوا عند السؤال عن السعر.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.MarketingDailyBrief = MarketingDailyBrief;
}
