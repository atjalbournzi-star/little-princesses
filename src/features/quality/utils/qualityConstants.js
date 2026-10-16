// src/features/quality/utils/qualityConstants.js
// ثوابت ومحددات محطة الفحص الفني للأزياء الراقية (Haute-Couture QC Gates & Standards)

const QUALITY_GATES = [
  {
    id: 'receiving',
    code: 'GATE-01',
    name: 'بوابة فحص الخامات والأقمشة',
    subtitle: 'Fabric & Trim Receiving QC',
    icon: '🧵',
    stageLabel: 'خامات وأقمشة',
    color: 'from-amber-600/20 to-amber-900/40 border-amber-500/40 text-amber-300',
    badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    description: 'فحص التفته، الحرير، التل، والشك فور التوريد (خلو العيوب، مطابقة اللون، قياس العرض والأمتار).'
  },
  {
    id: 'in_process',
    code: 'GATE-02',
    name: 'بوابة فحص مرحلة التجميع',
    subtitle: 'In-Process Tailoring QC',
    icon: '🪡',
    stageLabel: 'تجميع وخياطة',
    color: 'from-sky-600/20 to-sky-900/40 border-sky-500/40 text-sky-300',
    badgeColor: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    description: 'فحص الباترون، استقامة درزات الخياطة، والسحاب المخفي قبل تقفيل الفستان نهائياً.'
  },
  {
    id: 'final',
    code: 'GATE-03',
    name: 'بوابة الاعتماد والتسليم النهائي',
    subtitle: 'Final Garment Inspection Gate',
    icon: '👑',
    stageLabel: 'اعتماد نهائي',
    color: 'from-emerald-600/20 to-emerald-900/40 border-emerald-500/40 text-emerald-300',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    description: 'فحص القياسات بالسنتيمتر، ثبات الكريستال والشك اليدوي، النظافة التامة والكي الفاخر.'
  }
];

const QC_CHECKLIST_SPECS = [
  { id: 'measurements', title: 'مطابقة المقاسات', desc: 'مطابقة محيط الصدر، الخصر، وطول الفستان مع جدول مقاسات الأميرة بالسنتيمتر.' },
  { id: 'stitching', title: 'سلامة الدرزات والسحاب', desc: 'نظافة السرفلة الداخلية، استقامة الخياطة، وسلاسة السحاب المخفي دون تعليق.' },
  { id: 'embellishment', title: 'ثبات الشك والتطريز', desc: 'ثبات الخرز والكريستال والفيونكات اليدوية بدون ارتخاء أي خيوط.' },
  { id: 'finishing', title: 'النظافة الفائقة والكي', desc: 'خلو القماش تماماً من البقع أو الوبر والكي البخاري الفندقي الفاخر.' }
];

const DEFECT_REASONS = [
  'مطابقة المقاسات للأميرة',
  'استقامة الدرزات أو عيب في السحاب',
  'ارتخاء خرز أو عيب في التطريز والشك',
  'بقعة قماش أو حاجة لكي إضافي',
  'عدم تماثل أطراف الفستان'
];

window.QUALITY_GATES = QUALITY_GATES;
window.QC_CHECKLIST_SPECS = QC_CHECKLIST_SPECS;
window.DEFECT_REASONS = DEFECT_REASONS;
