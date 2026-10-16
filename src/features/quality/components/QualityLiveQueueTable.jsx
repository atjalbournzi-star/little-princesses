// src/features/quality/components/QualityLiveQueueTable.jsx
// طابور فحص القطع الفعلي عالي الكثافة (Live Inspection Queue Table)

function QualityLiveQueueTable({
  filteredQueue = [],
  activeGate, setActiveGate,
  searchQuery, setSearchQuery,
  onStartInspection
}) {
  const gates = window.QUALITY_GATES || [];

  return (
    <div className="bg-[#111C38] border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3.5 select-none text-right" dir="rtl">
      {/* شريط أدوات الفلترة والبحث السريع */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveGate('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeGate === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            جميع البوابات ({filteredQueue.length})
          </button>
          {gates.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveGate(g.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                activeGate === g.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{g.icon}</span>
              <span>{g.stageLabel}</span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الطلب، الفستان، أو الخياط..."
            className="w-full h-8 pr-8 pl-3 rounded-lg bg-[#0B132B] border border-slate-700 text-white text-xs outline-none focus:border-emerald-500 transition"
          />
          <span className="absolute right-2.5 top-2 text-slate-400 text-xs">🔍</span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1.5 text-slate-400 hover:text-white text-xs"
            >✕</button>
          )}
        </div>
      </div>

      {/* جدول طابور الفحص الفني */}
      <div className="overflow-x-auto rounded-xl border border-slate-700/60 custom-scrollbar">
        <table className="w-full text-right text-xs">
          <thead className="bg-[#0B132B] text-slate-300 font-bold border-b border-slate-700/80 uppercase">
            <tr>
              <th className="py-2.5 px-3 text-white font-bold">كود الطلب والفستان</th>
              <th className="py-2.5 px-3 text-white font-bold">الأميرة والعميلة</th>
              <th className="py-2.5 px-3 text-white font-bold">الفني المسؤول</th>
              <th className="py-2.5 px-3 text-white font-bold">مرحلة الفحص</th>
              <th className="py-2.5 px-3 text-white font-bold">الحالة التشغيلية</th>
              <th className="py-2.5 px-3 text-center text-white font-bold">الإجراء الفني</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {filteredQueue.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-400">
                  <span className="block text-xl mb-1">👑</span>
                  لا توجد فساتين بانتظار الفحص في هذه البوابة حالياً
                </td>
              </tr>
            ) : (
              filteredQueue.map(item => {
                const isRework = item.status === 'rework';
                const isPassed = item.status === 'passed';

                return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-mono font-bold text-amber-400 block">
                          #{item.order_no}
                        </span>
                        <span className="text-white font-bold text-xs">
                          {item.product_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="space-y-0.5">
                        <span className="text-white font-bold text-xs">{item.child_name}</span>
                        <span className="text-slate-400 text-[11px] block">{item.customer_name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 text-slate-200 font-medium">
                        <span>🪡</span>
                        <span>{item.tailor_name}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#0B132B] text-slate-300 border border-slate-700/80">
                        {item.gate_title}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        isRework
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse'
                          : (isPassed
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30')
                      }`}>
                        <span>{isRework ? '⚠' : (isPassed ? '✓' : '●')}</span>
                        <span>{item.status_label}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onStartInspection(item)}
                        className="h-8 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                      >
                        <span>🔍</span>
                        <span>ابدأ الفحص الفني</span>
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
