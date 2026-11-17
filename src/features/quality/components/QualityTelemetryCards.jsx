// src/features/quality/components/QualityTelemetryCards.jsx
// بطاقات القياس الذكية والمؤشرات الحيوية للجودة المتوافقة مع هوية السندات المالية

function QualityTelemetryCards({ kpis = {} }) {
  const cards = [
    {
      id: 'pending',
      title: 'قيد الفحص اليوم',
      value: kpis.pending ?? 0,
      unit: 'قطعة',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      id: 'fpy',
      title: 'معدل القبول FPY',
      value: kpis.fpy || '98.4%',
      unit: '',
      color: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      id: 'rework',
      title: 'تذاكر التعديل',
      value: kpis.rework ?? 0,
      unit: 'تذكرة',
      color: 'text-rose-600 dark:text-rose-400'
    },
    {
      id: 'copq',
      title: 'تكلفة جودة العيوب',
      value: kpis.copq || '0 ريال',
      unit: '',
      color: 'text-amber-600 dark:text-amber-400'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 my-0.5 shrink-0 select-none" dir="rtl">
      {cards.map(c => (
        <div
          key={c.id}
          className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap"
        >
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{c.title}</span>
          <span className={`text-[11px] font-bold ${c.color} font-mono tracking-tight`}>
            {c.value} {c.unit && <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-sans">{c.unit}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

window.QualityTelemetryCards = QualityTelemetryCards;
