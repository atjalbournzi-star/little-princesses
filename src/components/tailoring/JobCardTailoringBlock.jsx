// src/components/tailoring/JobCardTailoringBlock.jsx
// كتلة عرض مصدر القماش (BTO/CMT) وجدول المقاس القياسي مع تمييز التعديلات الموضعية (highlighted_changes) في بطاقة العمل

function JobCardTailoringBlock({ job = {}, specs = {} }) {
  const ms = typeof specs === 'string' ? (() => { try { return JSON.parse(specs); } catch (e) { return {}; } })() : (specs || {});
  const isStd = String(ms.sizing_mode || job.sizing_mode || '').toUpperCase() === 'STANDARD_SIZE' || Boolean(ms.standard_size_disclaimer);
  const highlighted = ms.highlighted_changes || {};
  const finalMeas = ms.final_measurements || {};
  const matSrc = String(job.material_source || ms.material_source || '').toUpperCase();
  const cmtNo = job.custody_no || job.cmt_custody_no || ms.custody_no || '';

  const dimLabels = {
    chest_cm: 'الصدر',
    waist_cm: 'الخصر',
    hip_cm: 'الأرداف',
    dress_length_cm: 'الطول',
    shoulder_cm: 'الكتف',
    sleeve_cm: 'الكم',
  };

  if (!isStd && !matSrc && !cmtNo) return null;

  return (
    <div className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-2 text-xs text-right" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {matSrc && (
            <span className="px-2 py-0.5 rounded bg-white border border-slate-300 font-bold text-[10.5px] text-slate-800">
              مصدر القماش: {matSrc === 'CUSTOMER_CMT' ? 'قماش عميل (CMT)' : (matSrc === 'BUY_TO_ORDER' ? 'شراء خاص (BTO)' : 'مخزون الورشة')}
            </span>
          )}
          {cmtNo && (
            <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-400 font-mono font-black text-[10.5px] text-amber-900">
              عهدة: {cmtNo}
            </span>
          )}
        </div>
        {isStd && (
          <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold text-[10px]">
            مقاس قياسي: {ms.size_label || job.size_code || 'قياسي'}
          </span>
        )}
      </div>

      {isStd && Object.keys(finalMeas).length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center">
          {Object.entries(dimLabels).map(([k, lbl]) => {
            const val = finalMeas[k];
            const chg = highlighted[k];
            const isChanged = Boolean(chg);
            return (
              <div key={k} className={`p-1.5 rounded-lg border ${isChanged ? 'bg-amber-100 border-amber-500 ring-1 ring-amber-400' : 'bg-white border-slate-200'}`}>
                <div className="text-[9.5px] font-bold text-slate-600">{lbl}</div>
                <div className={`font-mono font-black text-xs ${isChanged ? 'text-amber-950' : 'text-slate-900'}`}>
                  {val !== undefined && val !== null ? `${val} سم` : '—'}
                </div>
                {isChanged && (
                  <div className="text-[9px] font-mono font-bold text-rose-700">
                    أصلي: {chg.original ?? '—'} ({Number(chg.adjustment) > 0 ? `+${chg.adjustment}` : chg.adjustment})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

window.JobCardTailoringBlock = JobCardTailoringBlock;
