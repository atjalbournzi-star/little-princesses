// src/components/tailoring/OrderStandardSizePicker.jsx
// اختيار المقاس القياسي (نساء / بنات / زي مدرسي) مع عرض الأبعاد والتعديلات الموضعية الاختيارية

function OrderStandardSizePicker({
  sizeMatrixId,
  setSizeMatrixId,
  sizeAdjustments = {},
  setSizeAdjustments,
}) {
  const { useState, useEffect, useMemo } = React;
  const [matrices, setMatrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [segment, setSegment] = useState('GIRLS_DRESS');

  useEffect(() => {
    let active = true;
    setLoading(true);
    const load = window.TailoringAPI?.getSizeMatrices
      ? window.TailoringAPI.getSizeMatrices('', false)
      : fetch('/api/size-matrices').then(r => r.json());
    Promise.resolve(load)
      .then(res => {
        if (!active) return;
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setMatrices(rows);
        if (sizeMatrixId) {
          const found = rows.find(m => m.id === sizeMatrixId);
          if (found?.segment_code) setSegment(found.segment_code);
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const segMatrices = useMemo(
    () => (matrices || []).filter(m => String(m.segment_code || '').toUpperCase() === segment),
    [matrices, segment]
  );

  const selectedMatrix = useMemo(
    () => (matrices || []).find(m => m.id === sizeMatrixId) || null,
    [matrices, sizeMatrixId]
  );

  const dimFields = [
    ['chest_cm', 'الصدر'],
    ['waist_cm', 'الخصر'],
    ['hip_cm', 'الأرداف'],
    ['dress_length_cm', 'الطول'],
    ['shoulder_cm', 'الكتف'],
    ['sleeve_cm', 'الكم'],
  ];

  const handleAdjChange = (key, val) => {
    const next = { ...(sizeAdjustments || {}) };
    if (val === '' || val === null || val === undefined) delete next[key];
    else {
      const n = parseFloat(val);
      if (!isNaN(n) && n !== 0) next[key] = n;
      else delete next[key];
    }
    setSizeAdjustments && setSizeAdjustments(next);
  };

  return (
    <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2.5 text-xs" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'WOMEN_APPAREL', label: 'نساء' },
            { id: 'GIRLS_DRESS', label: 'بنات' },
            { id: 'SCHOOL_UNIFORM', label: 'زي مدرسي' },
          ].map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setSegment(s.id); setSizeMatrixId && setSizeMatrixId(''); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                segment === s.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <select
          value={sizeMatrixId || ''}
          onChange={e => setSizeMatrixId && setSizeMatrixId(e.target.value)}
          className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold min-w-[180px] outline-none focus:border-indigo-500"
          required
        >
          <option value="">{loading ? 'جاري تحميل المقاسات...' : '-- اختر المقاس القياسي --'}</option>
          {segMatrices.map(m => (
            <option key={m.id} value={m.id}>
              {m.size_label} ({m.display_unit || 'cm'})
            </option>
          ))}
        </select>
      </div>

      {selectedMatrix && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {dimFields.map(([key, label]) => {
            const baseVal = selectedMatrix[key];
            const adjVal = sizeAdjustments?.[key] ?? '';
            const finalVal = (baseVal !== null && baseVal !== undefined && adjVal !== '')
              ? (parseFloat(baseVal) + parseFloat(adjVal || 0))
              : baseVal;
            return (
              <div key={key} className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center space-y-1">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{label}</div>
                <div className="font-mono text-xs font-black text-slate-900 dark:text-white">
                  {finalVal !== null && finalVal !== undefined ? `${finalVal}` : '—'}
                </div>
                <input
                  type="number"
                  step="0.5"
                  placeholder="تعديل ±"
                  value={adjVal}
                  onChange={e => handleAdjChange(key, e.target.value)}
                  className="w-full h-6 px-1 text-[10px] font-mono text-center rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                  title={`تعديل موضعي على ${label} (سم)`}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[10.5px] font-semibold">
        تنبيه: بند المقاس القياسي سيُطبع تلقائياً على فاتورة العميل (اعتماد جدول المقاسات القياسي دون أخذ مقاسات خاصة).
      </div>
    </div>
  );
}

window.OrderStandardSizePicker = OrderStandardSizePicker;
