// src/features/quality/components/QualityLiveQueueTable.jsx
// طابور فحص القطع الفعلي المدمج المتوافق مع هوية السندات المالية

function QualityLiveQueueTable({
  filteredQueue = [],
  activeGate, setActiveGate,
  searchQuery, setSearchQuery,
  onRefreshQueue,
  onStartInspection
}) {
  const gates = window.QUALITY_GATES || [];

  return (
    <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-xs space-y-2 select-none text-right" dir="rtl">
      {/* 1. شريط الفلترة والبحث السريع المدمج في سطر واحد */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 flex-wrap w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveGate('all')}
            className={`h-6 px-2 rounded-md text-[10.5px] font-medium transition cursor-pointer whitespace-nowrap ${
              activeGate === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            جميع البوابات ({filteredQueue.length})
          </button>
          {gates.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveGate(g.id)}
              className={`h-6 px-2 rounded-md text-[10.5px] font-medium transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                activeGate === g.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>{g.stageLabel}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <div className="relative w-full sm:w-56">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث في الطابور..."
              className="w-full h-6 pr-6 pl-5 rounded-md bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[10.5px] outline-none focus:border-emerald-500 transition"
            />
            <svg className="w-3 h-3 text-slate-400 absolute right-2 top-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-1.5 top-1 text-slate-400 hover:text-white text-xs"
              >✕</button>
            )}
          </div>

          {onRefreshQueue && (
            <button
              type="button"
              onClick={onRefreshQueue}
              className="h-6 px-2 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-[10.5px] border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition shadow-xs whitespace-nowrap shrink-0"
              title="تحديث طابور الفحص"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>تحديث</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. جدول طابور الفحص الفني المتناسق بالكامل مع جدول السندات المالية */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 custom-scrollbar">
        <table className="w-full text-right border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800">
            <tr className="h-7.5">
              <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap">كود الطلب والفستان</th>
              <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap">الأميرة والعميل</th>
              <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap">الفني المسؤول</th>
              <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap">مرحلة الفحص</th>
              <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap">الحالة التشغيلية</th>
              <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center whitespace-nowrap">الإجراء الفني</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-transparent">
            {filteredQueue.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center bg-slate-50/50 dark:bg-[#0B132B]/50">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      لا توجد فساتين بانتظار الفحص في هذه البوابة حالياً
                    </p>
                    <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                      جميع الطلبيات في هذه المرحلة مكتملة أو معتمدة الجودة
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredQueue.map(item => {
                const isRework = item.status === 'rework';
                const isPassed = item.status === 'passed';

                return (
                  <tr key={item.id} className="h-8 border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[11px] font-medium transition-colors">
                    {/* 1. كود الطلب والفستان */}
                    <td className="py-1 px-2.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono font-bold text-[11px] text-amber-600 dark:text-amber-400 shrink-0">
                          #{item.order_no}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white text-[11px] truncate">
                          {item.product_name}
                        </span>
                      </div>
                    </td>

                    {/* 2. الأميرة والعميل */}
                    <td className="py-1 px-2.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-[11px] shrink-0">{item.child_name}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] truncate">({item.customer_name})</span>
                      </div>
                    </td>

                    {/* 3. الفني المسؤول */}
                    <td className="py-1 px-2.5">
                      <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 text-[11px] truncate">
                        <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.828 2.828a2 2 0 11-2.828-2.828L9 9m5.121 5.121L9 9" />
                        </svg>
                        <span className="truncate">{item.tailor_name || item.tailor || '—'}</span>
                      </div>
                    </td>

                    {/* 4. مرحلة الفحص */}
                    <td className="py-1 px-2.5">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-[#0B132B] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 truncate">
                        {item.gate_title}
                      </span>
                    </td>

                    {/* 5. الحالة التشغيلية */}
                    <td className="py-1 px-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${
                        isRework
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                          : (isPassed
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60')
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isRework ? 'bg-rose-500' : (isPassed ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse')}`}></span>
                        <span>{item.status_label}</span>
                      </span>
                    </td>

                    {/* 6. الإجراء الفني */}
                    <td className="py-1 px-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => onStartInspection(item)}
                        className="h-6 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[10.5px] shadow-xs flex items-center justify-center gap-1 mx-auto transition cursor-pointer whitespace-nowrap"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>ابدأ الفحص</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.QualityLiveQueueTable = QualityLiveQueueTable;
