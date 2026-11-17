// src/features/measurement/components/MeasurementsSidebar.jsx
// 3-Tier Metric Breakdown (Raw, Garment, Production) & Metrology Uncertainty v4.0
// Architecture Standard: Rule 1 & 2 (< 220 lines)

function MeasurementsSidebar({
  measurements, onSelectMeasurement, onToggleVisibility,
  onStepEase, onToggleCircumference, onCenterLine, onDeleteMeasurement,
  onOpenAddCustomModal, activeId, unit, H_imgToWorld,
  hasImage, lensCorrection, a4Placement, fabricElevationMm,
  sanityWarnings = {}, fabricTurnAllowanceCm = 0,
  focusActiveLine = false, onToggleFocusActiveLine,
  drawingLineId = null, onStart2ClickDrawing,
  operationMode = 'mode_a_flat_2d', showUncertainty = true
}) {
  const RealEngine = window.RealWorldMeasurementEngine || {};
  const activeCount = (measurements || []).filter(m => m.visible).length;

  const getRecord = (m) => {
    if (!RealEngine?.buildRealMeasurementRecord) return null;
    return RealEngine.buildRealMeasurementRecord(m, {
      H_imgToWorld, unit, lensCorrection, a4Placement, fabricElevationMm,
      fabricTurnAllowanceCm, operationMode
    });
  };

  return (
    <aside className="w-[340px] shrink-0 h-full bg-[#0B132B] border border-slate-700/60 rounded-xl flex flex-col overflow-hidden text-right select-none text-slate-100 shadow-md" dir="rtl">
      {/* 1. Header with Focus Toggle & Add Custom Button */}
      <div className="h-8 min-h-[32px] px-2 bg-[#111C38] border-b border-slate-700/60 flex items-center justify-between shrink-0">
        <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
          </svg>
          <span>المقاسات الهندسية (v4.0)</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleFocusActiveLine && onToggleFocusActiveLine(!focusActiveLine)}
            className={`h-5 px-1.5 rounded text-[9px] font-bold border transition cursor-pointer ${
              focusActiveLine ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="إخفاء باقي الخطوط وعزل الضلع النشط فقط"
          >
            {focusActiveLine ? 'عزل: مفعّل' : 'عزل خط'}
          </button>
          <button
            type="button" onClick={onOpenAddCustomModal}
            className="h-5 px-1.5 rounded bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 border border-teal-500/40 text-[9.5px] font-medium flex items-center gap-1 cursor-pointer transition"
          >
            + مخصص
          </button>
        </div>
      </div>

      {/* 2. Measurements List with 3-Level Display & Uncertainty */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {(measurements || []).map(m => {
          const isSel = activeId === m.id;
          const rec = (hasImage && H_imgToWorld) ? getRecord(m) : null;
          const dispFinal = rec ? RealEngine.formatDisplayValue(rec, unit, false) : '--';
          const dispRaw = rec ? (unit === 'mm' ? `${rec.rawMm} مم` : `${rec.rawCm} سم`) : '--';
          const dispGarment = rec ? (unit === 'mm' ? `${rec.garmentMm} مم` : `${rec.garmentCm} سم`) : '--';
          const warning = sanityWarnings[m.id];
          const grade = rec?.qualityGrade || 'unavailable';

          const gradeBadgeClass = grade === 'measured_validated' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40' :
            (grade === 'estimated' ? 'bg-amber-950/60 text-amber-300 border-amber-600/40' : 'bg-sky-950/60 text-sky-300 border-sky-600/40');

          return (
            <div
              key={m.id}
              onClick={() => { onSelectMeasurement(m.id); onStart2ClickDrawing && onStart2ClickDrawing(m.id); }}
              className={`rounded-lg border px-2 py-1 transition cursor-pointer ${
                !m.visible ? 'bg-[#090D16]/40 border-slate-800 opacity-50' :
                isSel ? 'bg-[#111C38] border-teal-500 shadow-md ring-1 ring-teal-500/50' : 'bg-[#111C38]/80 border-slate-700/60 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <div className="flex items-center gap-1.5 truncate">
                  <input
                    type="checkbox" checked={m.visible}
                    onChange={e => { e.stopPropagation(); onToggleVisibility(m.id); }}
                    className="w-3 h-3 rounded accent-teal-500 cursor-pointer"
                  />
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                  <span className="text-[11px] font-bold text-white truncate" title={m.nameAr}>{m.nameAr}</span>
                  {m.cp && <span className="text-[8.5px] text-sky-400 font-mono">⌒</span>}
                  {warning && <span className="text-[8.5px] px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 truncate" title={warning}>⚠️</span>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {m.type === 'circumference' ? (
                    <button
                      type="button" onClick={e => { e.stopPropagation(); onToggleCircumference && onToggleCircumference(m.id); }}
                      className={`text-[9px] font-mono px-1 rounded border transition cursor-pointer ${
                        m.isCircumference ? 'bg-teal-950/60 text-teal-300 border-teal-600/50' : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}
                      title="التبديل بين المحيط (×2) والعرض المسطح (1:1)"
                    >
                      {m.isCircumference ? '×2 محيط' : '1:1 مسطح'}
                    </button>
                  ) : (
                    <span className="text-[9px] font-mono px-1 bg-slate-900 text-slate-300 rounded border border-slate-800">طولي</span>
                  )}
                  <button type="button" onClick={e => { e.stopPropagation(); onCenterLine(m.id); }} className="text-slate-400 hover:text-white px-0.5 text-xs" title="توسيط">⌖</button>
                  {isSel && (
                    <button
                      type="button" onClick={e => { e.stopPropagation(); onStart2ClickDrawing && onStart2ClickDrawing(m.id); }}
                      className={`text-[8.5px] font-bold px-1 rounded border transition cursor-pointer ${
                        drawingLineId === m.id ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse' : 'bg-teal-600/30 text-teal-300 border-teal-500/40'
                      }`}
                    >
                      {drawingLineId === m.id ? '1-2' : 'رسم'}
                    </button>
                  )}
                  {m.isCustom && <button type="button" onClick={e => { e.stopPropagation(); onDeleteMeasurement(m.id); }} className="text-rose-400 hover:text-rose-300 px-0.5 text-xs">✕</button>}
                  <span className={`font-mono text-[10.5px] font-bold px-1.5 py-0.2 rounded border ${gradeBadgeClass}`}>
                    {dispFinal}
                  </span>
                </div>
              </div>

              {/* 3-Tier Breakdown: Raw -> Garment -> Production */}
              <div className="grid grid-cols-3 gap-1 bg-[#090D16] rounded px-1.5 py-0.5 text-[9.5px] items-center">
                <div className="text-slate-400 truncate" title="القياس البصري الخام على مستوى الصورة">
                  <span>خام: </span><span className="font-mono text-slate-200">{dispRaw}</span>
                </div>
                <div className="text-slate-400 border-x border-slate-800 px-1 text-center truncate" title="مقاس القطعة بعد دوران القماش أو تعويض الارتفاع">
                  <span>قطعة: </span><span className="font-mono text-amber-300">{dispGarment}</span>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <span className="text-slate-400">راحة:</span>
                  <button type="button" onClick={e => { e.stopPropagation(); onStepEase(m.id, -0.5); }} className="w-3.5 h-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-mono text-xs flex items-center justify-center cursor-pointer">-</button>
                  <span className="font-mono text-teal-400 min-w-[14px] text-center font-bold">{m.easeCm || 0}</span>
                  <button type="button" onClick={e => { e.stopPropagation(); onStepEase(m.id, 0.5); }} className="w-3.5 h-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-mono text-xs flex items-center justify-center cursor-pointer">+</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Live Verified Summary Table */}
      <div className="border-t border-slate-700/60 bg-[#111C38] p-2 shrink-0">
        <div className="flex items-center justify-between mb-1 text-[11px] font-bold text-white">
          <span>ملخص الاعتماد الهندسي</span>
          <span className="font-mono text-teal-400 text-[10px]">{activeCount} مقاسات نشطة</span>
        </div>

        <div className="max-h-44 overflow-y-auto rounded border border-slate-700/60 bg-[#090D16]">
          <table className="w-full text-right text-[10px]">
            <thead className="bg-[#111C38] text-slate-300 sticky top-0 border-b border-slate-700/60">
              <tr>
                <th className="py-1 px-1.5 font-bold text-white">القياس</th>
                <th className="py-1 px-1.5 font-bold text-center text-teal-400">المقاس (سم)</th>
                <th className="py-1 px-1.5 font-bold text-center text-sky-400">إنش</th>
                <th className="py-1 px-1.5 font-bold text-center text-amber-300">عدم اليقين</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(measurements || []).filter(m => m.visible && m.placed !== false).map(m => {
                const rec = (hasImage && H_imgToWorld) ? getRecord(m) : null;
                return (
                  <tr key={m.id} className="hover:bg-[#111C38]/60">
                    <td className="py-0.5 px-1.5 text-white font-medium">{m.shortName || m.nameAr}</td>
                    <td className="py-0.5 px-1.5 text-center font-mono font-bold text-teal-400">
                      {rec ? `${rec.finalCm} سم` : '--'}
                    </td>
                    <td className="py-0.5 px-1.5 text-center font-mono font-bold text-sky-400" dir="ltr">
                      {rec ? `${Number(rec.finalInch).toFixed(1)}"` : '--'}
                    </td>
                    <td className="py-0.5 px-1.5 text-center font-mono text-[9px] text-amber-300" dir="ltr">
                      {rec ? `±${rec.uncertaintyMm} مم` : '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </aside>
  );
}

window.StudioMeasurementsSidebar = MeasurementsSidebar;
