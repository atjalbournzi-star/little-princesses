// src/features/quality/components/QualityGateCards.jsx
// بوابات التفتيش الفني الثلاث المضغوطة والمتوافقة مع هوية السندات المالية

function QualityGateCards({ activeGate, setActiveGate, queue = [] }) {
  const gates = window.QUALITY_GATES || [];

  const getGateIcon = (id) => {
    if (id === 'receiving') {
      return (
        <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    }
    if (id === 'in_process') {
      return (
        <svg className="w-3.5 h-3.5 text-sky-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.828 2.828a2 2 0 11-2.828-2.828L9 9m5.121 5.121L9 9" />
        </svg>
      );
    }
    return (
      <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 select-none" dir="rtl">
      {gates.map(gate => {
        const isSelected = activeGate === gate.id;
        const gateItemsCount = queue.filter(q => q.gate_id === gate.id && q.status === 'pending').length;
        const reworkCount = queue.filter(q => q.gate_id === gate.id && q.status === 'rework').length;

        return (
          <div
            key={gate.id}
            onClick={() => setActiveGate(isSelected ? 'all' : gate.id)}
            className={`p-2 rounded-xl bg-white dark:bg-[#111C38] border transition cursor-pointer shadow-xs ${
              isSelected
                ? 'border-emerald-500 ring-1 ring-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {/* 1. السطر العلوي المدمج: الكود والعنوان والشارة في صف واحد */}
            <div className="flex items-center justify-between gap-1.5 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#0B132B] text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-800 shrink-0">
                  {gate.code}
                </span>
                <div className="flex items-center gap-1 min-w-0">
                  {getGateIcon(gate.id)}
                  <h3 className="text-slate-900 dark:text-white font-bold text-xs truncate">
                    {gate.name}
                  </h3>
                </div>
              </div>
              <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${gate.badgeColor}`}>
                {gate.stageLabel}
              </span>
            </div>

            {/* 2. الوصف المختصر في سطر واحد دون تضخم رأسي */}
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-1 leading-tight" title={gate.description}>
              {gate.description}
            </p>

            {/* 3. شريط العدادات وحالة التحديد المدمج */}
            <div className="mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10.5px]">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  بانتظار الفحص: <strong className="text-slate-900 dark:text-white font-bold font-mono">{gateItemsCount}</strong>
                </span>
                {reworkCount > 0 && (
                  <span className="text-rose-600 dark:text-rose-400 font-medium">
                    تعديل: <strong className="font-bold font-mono">{reworkCount}</strong>
                  </span>
                )}
              </div>
              <button
                type="button"
                className={`h-5 px-1.5 text-[9.5px] font-medium rounded transition flex items-center gap-0.5 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{isSelected ? '✓ محددة' : 'عرض الطابور'}</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

window.QualityGateCards = QualityGateCards;
