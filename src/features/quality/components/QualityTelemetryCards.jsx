// src/features/quality/components/QualityTelemetryCards.jsx
// بطاقات القياس الذكية والمؤشرات الحيوية للجودة (Haute-Couture QC Telemetry Cards)

function QualityTelemetryCards({ kpis = {} }) {
  const cards = [
    {
      id: 'pending',
      title: 'قيد الفحص اليوم',
      subtitle: 'Pending Inspections',
      value: kpis.pending ?? 0,
      unit: 'قطعة',
      icon: '🔍',
      badge: 'طابور نشط',
      gradient: 'from-blue-600/15 to-indigo-600/10 border-blue-500/30 text-blue-400',
      badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
    },
    {
      id: 'fpy',
      title: 'معدل القبول من أول مرة',
      subtitle: 'First Pass Yield (FPY)',
      value: kpis.fpy || '98.4%',
      unit: '',
      icon: '⭐',
      badge: 'معيار الكوتور العالمي',
      gradient: 'from-emerald-600/15 to-teal-600/10 border-emerald-500/30 text-emerald-400',
      badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    },
    {
      id: 'rework',
      title: 'تذاكر التعديل المفتوحة',
      subtitle: 'Active Rework Tickets',
      value: kpis.rework ?? 0,
      unit: 'تذكرة',
      icon: '✂️',
      badge: 'مرتجع للورشة',
      gradient: 'from-rose-600/15 to-pink-600/10 border-rose-500/30 text-rose-400',
      badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
    },
    {
      id: 'copq',
      title: 'تكلفة جودة العيوب',
      subtitle: 'Cost of Poor Quality (COPQ)',
      value: kpis.copq || '0 ريال',
      unit: '',
      icon: '💰',
      badge: 'وفر مالي محقق',
      gradient: 'from-amber-600/15 to-orange-600/10 border-amber-500/30 text-amber-400',
      badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 select-none">
      {cards.map(c => (
        <div
          key={c.id}
          className={`relative p-3.5 rounded-xl bg-[#111C38] border ${c.gradient} shadow-lg transition-all hover:scale-[1.01]`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">{c.subtitle}</span>
              <h3 className="text-white font-bold text-sm mt-0.5">{c.title}</h3>
            </div>
            <span className="w-8 h-8 rounded-lg bg-[#0B132B]/80 flex items-center justify-center text-base border border-slate-700/60 shadow-xs">
              {c.icon}
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white tracking-tight">{c.value}</span>
              {c.unit && <span className="text-xs text-slate-400 font-medium">{c.unit}</span>}
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.badgeColor}`}>
              {c.badge}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

window.QualityTelemetryCards = QualityTelemetryCards;
