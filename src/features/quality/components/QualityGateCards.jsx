// src/features/quality/components/QualityGateCards.jsx
// بوابات التفتيش الفني الثلاث (The 3 Operational Inspection Gate Cards)

function QualityGateCards({ activeGate, setActiveGate, queue = [] }) {
  const gates = window.QUALITY_GATES || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 select-none">
      {gates.map(gate => {
        const isSelected = activeGate === gate.id;
        const gateItemsCount = queue.filter(q => q.gate_id === gate.id && q.status === 'pending').length;
        const reworkCount = queue.filter(q => q.gate_id === gate.id && q.status === 'rework').length;

        return (
          <div
            key={gate.id}
            onClick={() => setActiveGate(isSelected ? 'all' : gate.id)}
            className={`relative p-3.5 rounded-2xl bg-[#111C38] border transition-all cursor-pointer shadow-xl ${
              isSelected
                ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-gradient-to-b from-[#162447] to-[#111C38]'
                : 'border-slate-700/80 hover:border-slate-600 hover:bg-[#142142]'
            }`}
          >
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-700/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#0B132B] text-slate-400 font-bold border border-slate-800">
                    {gate.code}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">{gate.subtitle}</span>
                </div>
                <h3 className="text-white font-bold text-sm pt-0.5 flex items-center gap-1.5">
                  <span>{gate.icon}</span>
                  <span>{gate.name}</span>
                </h3>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${gate.badgeColor}`}>
                {gate.stageLabel}
              </span>
            </div>

            <p className="text-slate-300 text-xs mt-2 leading-relaxed min-h-[32px]">
              {gate.description}
            </p>

            <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-300 font-medium">
                  بانتظار الفحص: <strong className="text-white font-bold">{gateItemsCount}</strong>
                </span>
                {reworkCount > 0 && (
                  <span className="text-xs text-rose-300 font-medium">
                    تعديل: <strong className="text-rose-400 font-bold">{reworkCount}</strong>
                  </span>
                )}
              </div>
              <button
                type="button"
                className={`text-[11px] font-bold px-3 py-1 rounded-lg transition ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {isSelected ? '✓ البوابة محددة' : 'عرض الطابور ←'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

window.QualityGateCards = QualityGateCards;
