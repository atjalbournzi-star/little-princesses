// src/features/marketing/components/MarketingCustomerIntel.jsx
// ====================================================================
// Component: MarketingCustomerIntel — تبويب ذكاء العملاء
// ====================================================================

function MarketingCustomerIntel({ customerSegments, setSelectedCustomerDetail }) {
  const isEmpty = !customerSegments ||
    Object.keys(customerSegments).length === 0 ||
    Object.values(customerSegments).every(list => !list || list.length === 0);

  return (
    <div className="space-y-1.5 animate-fadeIn select-none">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 p-2.5 shadow-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <h3 className="font-bold text-[11px] text-slate-800 dark:text-white">نظام ذكاء العملاء (Customer Intelligence Center)</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">تحليل نية الشراء</span>
        </div>

        {isEmpty ? (
          <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-[11px] font-medium bg-slate-50 dark:bg-[#0F172A] rounded-lg">
            لا توجد شرائح عملاء مسجلة بعد • سيتم تصنيف العملاء آلياً عند تسجيل أولى المحادثات والطلبيات
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(customerSegments || {}).map(([segKey, segList]) => (
              <div key={segKey} className="bg-slate-50 dark:bg-[#0F172A] rounded-lg p-2.5 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                  <h4 className="font-bold text-slate-900 dark:text-white text-[11px] uppercase">{segKey.replace('_', ' ')}</h4>
                  <span className="bg-pink-500/10 text-pink-600 dark:text-pink-300 font-bold text-[10px] px-1.5 py-0.2 rounded border border-pink-200 dark:border-pink-800">{segList.length} عملاء</span>
                </div>
                <div className="space-y-1.5">
                  {segList.map(c => (
                    <div key={c.id} className="bg-white dark:bg-[#111C38] p-2 rounded-md border border-slate-200 dark:border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white text-[11px]">{c.name}</span>
                        <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">نية {c.intent_score}/100</span>
                      </div>
                      <p className="text-[10.5px] text-slate-700 dark:text-slate-300">{c.notes}</p>
                      <button
                        onClick={() => setSelectedCustomerDetail(c)}
                        className="w-full mt-1 h-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-[10.5px] rounded border border-slate-200 dark:border-slate-700/60 transition cursor-pointer"
                      >
                        فتح سجل المحادثة والتحليل
                      </button>
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
  window.MarketingCustomerIntel = MarketingCustomerIntel;
}
