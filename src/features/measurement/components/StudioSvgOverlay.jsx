// src/features/measurement/components/StudioSvgOverlay.jsx
// Interactive SVG Vector Overlay with Uncertainty & Collision-Free Badges v4.0
// Architecture Standard: Rule 1 & 2 (< 220 lines)

const { useRef, useState, useEffect, useMemo } = React;

function StudioSvgOverlay({
  pan = { x: 0, y: 0 }, zoom = 1, imgWidth = 1000, imgHeight = 800,
  a4Corners = [], onUpdateA4Corners, measurements = [], onUpdateMeasurements,
  activeMeasurementId, onSelectMeasurement, onSelectPin, viewMode = 'all',
  unit = 'cm', H_imgToWorld, H_worldToImg, lensCorrection, a4Placement, fabricElevationMm,
  edgeSnapEnabled, processedCanvas, onPushSnapshot, onActiveDrag, onEndDrag,
  centerline, showCenterline = true, perpendicularLock = true, showFloorGuide = false, floorLines,
  fabricTurnAllowanceCm = 0, blueprintMode = false, focusActiveLine = false,
  operationMode = 'mode_a_flat_2d', showUncertainty = true, a4Detected = false, clickToPlaceStep = -1
}) {
  const svgRootRef = useRef(null), dragRef = useRef(null);
  const [draggingPin, setDraggingPin] = useState(null);
  const MathUtils = window.MeasurementHomographyMath || {};
  const CvDetector = window.MeasurementCvDetector || {};
  const Snap = window.CenterlineSnap || {};
  const RealEngine = window.RealWorldMeasurementEngine || {};

  const inv = 1 / (zoom || 1), rPin = 4.5 * inv, rHit = 14 * inv, dDiamond = 6 * inv;

  const handlePointerDown = (e, pinSpec) => {
    e.stopPropagation();
    dragRef.current = pinSpec; setDraggingPin(pinSpec);
    onSelectPin && onSelectPin(pinSpec);
    if (pinSpec.type === 'measure' && onSelectMeasurement) onSelectMeasurement(pinSpec.id);
    if (svgRootRef.current) {
      const rect = svgRootRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(imgWidth, (e.clientX - rect.left) / zoom));
      const y = Math.max(0, Math.min(imgHeight, (e.clientY - rect.top) / zoom));
      onActiveDrag && onActiveDrag(pinSpec, { x, y });
    }
  };

  useEffect(() => {
    if (!draggingPin) return;
    const onMove = (e) => {
      if (!dragRef.current || !svgRootRef.current) return;
      const rect = svgRootRef.current.getBoundingClientRect();
      let x = Math.max(0, Math.min(imgWidth, (e.clientX - rect.left) / zoom));
      let y = Math.max(0, Math.min(imgHeight, (e.clientY - rect.top) / zoom));

      if (edgeSnapEnabled && dragRef.current.end !== 'cp' && CvDetector.findLocalEdgeSnap && processedCanvas) {
        const snap = CvDetector.findLocalEdgeSnap(processedCanvas, x, y, 6);
        if (snap && snap.snapped) { x = snap.x; y = snap.y; }
      }

      if (dragRef.current.type === 'a4') {
        const next = [...a4Corners]; next[dragRef.current.index] = { x, y };
        onUpdateA4Corners && onUpdateA4Corners(next);
      } else if (dragRef.current.type === 'measure') {
        const end = dragRef.current.end;
        let updated = measurements.map(m => m.id === dragRef.current.id ? { ...m, [end]: { x, y } } : m);
        if (perpendicularLock && end !== 'cp' && centerline && Snap.applyPerpendicularLock) {
          const targetM = updated.find(m => m.id === dragRef.current.id);
          const lockedM = Snap.applyPerpendicularLock(targetM, centerline);
          updated = updated.map(m => m.id === dragRef.current.id ? lockedM : m);
        }
        onUpdateMeasurements && onUpdateMeasurements(updated);
      }
      onActiveDrag && onActiveDrag(dragRef.current, { x, y });
    };

    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null; setDraggingPin(null);
        onEndDrag && onEndDrag(); onPushSnapshot && onPushSnapshot();
      }
    };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [draggingPin, imgWidth, imgHeight, pan.x, pan.y, zoom, a4Corners, measurements, edgeSnapEnabled, processedCanvas, perpendicularLock, centerline]);

  const a4PolyPoints = useMemo(() => {
    return Array.isArray(a4Corners) && a4Corners.length === 4 ? a4Corners.map(p => `${p.x},${p.y}`).join(' ') : '';
  }, [a4Corners]);

  return (
    <svg ref={svgRootRef} viewBox={`0 0 ${imgWidth} ${imgHeight}`} className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-visible" style={{ touchAction: 'none' }}>
      {showCenterline && centerline?.top && centerline?.bottom && (
        <g>
          <line x1={centerline.top.x} y1={centerline.top.y} x2={centerline.bottom.x} y2={centerline.bottom.y}
            stroke="#0D9488" strokeWidth={1.2 * inv} strokeDasharray={`${4 * inv} ${3 * inv}`} opacity={0.65} />
          <circle cx={centerline.top.x} cy={centerline.top.y} r={3 * inv} fill="#14B8A6" opacity={0.8} />
          <circle cx={centerline.bottom.x} cy={centerline.bottom.y} r={3 * inv} fill="#14B8A6" opacity={0.8} />
        </g>
      )}

      {viewMode !== 'measure_only' && a4PolyPoints && (a4Detected || clickToPlaceStep >= 0) && (
        <g>
          <polygon points={a4PolyPoints} fill="rgba(16, 185, 129, 0.16)" stroke="#10b981" strokeWidth={2.4 * inv} strokeDasharray={`${6 * inv} ${3 * inv}`} />
          {a4Corners.map((pt, idx) => (
            <g key={`a4-${idx}`} className="cursor-grab active:cursor-grabbing pointer-events-auto" onPointerDown={e => handlePointerDown(e, { type: 'a4', index: idx })}>
              <circle cx={pt.x} cy={pt.y} r={rHit} fill="transparent" />
              <circle cx={pt.x} cy={pt.y} r={rPin + 2.5 * inv} fill="#10b981" stroke="#FFFFFF" strokeWidth={2 * inv} />
              <rect x={pt.x + 8 * inv} y={pt.y - 18 * inv} width={20 * inv} height={15 * inv} rx={3 * inv} fill="#064E3B" stroke="#34D399" strokeWidth={1.2 * inv} />
              <text x={pt.x + 18 * inv} y={pt.y - 7 * inv} textAnchor="middle" fill="#FFFFFF" fontSize={9.5 * inv} fontWeight="bold" fontFamily="monospace">#{idx + 1}</text>
            </g>
          ))}
        </g>
      )}

      {viewMode !== 'a4_only' && (measurements || []).filter(m => m.visible && (!focusActiveLine || m.id === activeMeasurementId)).map(m => {
        const isSel = activeMeasurementId === m.id;
        const cp = m.cp || { x: (m.p1.x + m.p2.x) / 2, y: (m.p1.y + m.p2.y) / 2 };
        const hasCurve = Math.hypot(cp.x - (m.p1.x + m.p2.x) / 2, cp.y - (m.p1.y + m.p2.y) / 2) > 3.5;
        const isDraggingThis = draggingPin && draggingPin.id === m.id;

        let labelText = '';
        if (H_imgToWorld && a4Detected && RealEngine.buildRealMeasurementRecord) {
          const rec = RealEngine.buildRealMeasurementRecord(m, {
            H_imgToWorld, unit, lensCorrection, a4Placement, fabricElevationMm,
            fabricTurnAllowanceCm, operationMode
          });
          if (rec && rec.rawMm > 0) {
            labelText = RealEngine.formatDisplayValue(rec, unit);
          }
        }

        const midX = (m.p1.x + m.p2.x) / 2, midY = (m.p1.y + m.p2.y) / 2;
        let bX = midX, bY = midY - 14 * inv;
        if (m.id === 'chest' || m.id === 'shoulder') {
          bX = Math.max(m.p1.x, m.p2.x) + 36 * inv; bY = m.p2.y;
        } else if (m.id === 'waist' || m.id === 'hip') {
          bX = Math.min(m.p1.x, m.p2.x) - 36 * inv; bY = m.p1.y;
        } else if (m.id === 'bodice_length') {
          bX = m.p1.x - 36 * inv; bY = midY;
        } else if (m.id === 'total_length') {
          bX = m.p1.x + 36 * inv; bY = midY;
        }

        return (
          <g key={m.id} onClick={() => onSelectMeasurement && onSelectMeasurement(m.id)}>
            {labelText && (
              <line x1={midX} y1={midY} x2={bX} y2={bY} stroke="rgba(255,255,255,0.25)" strokeWidth={0.9 * inv} strokeDasharray={`${2.5 * inv} ${2 * inv}`} />
            )}
            {hasCurve ? (
              <path d={`M ${m.p1.x} ${m.p1.y} Q ${cp.x} ${cp.y} ${m.p2.x} ${m.p2.y}`} fill="none" stroke={m.color || '#38BDF8'} strokeWidth={(isSel ? 3.2 : 1.8) * inv} />
            ) : (
              <line x1={m.p1.x} y1={m.p1.y} x2={m.p2.x} y2={m.p2.y} stroke={m.color || '#38BDF8'} strokeWidth={(isSel ? 3.2 : 1.8) * inv} />
            )}
            {['p1', 'p2'].map(end => (
              <g key={end} className="cursor-grab active:cursor-grabbing pointer-events-auto" onPointerDown={e => handlePointerDown(e, { type: 'measure', id: m.id, end })}>
                <circle cx={m[end].x} cy={m[end].y} r={rHit} fill="transparent" />
                <circle cx={m[end].x} cy={m[end].y} r={rPin + (isSel ? 1 * inv : 0)} fill={m.color || '#38BDF8'} stroke="#FFFFFF" strokeWidth={1.8 * inv} />
              </g>
            ))}
            {isSel && (
              <g className="cursor-move pointer-events-auto" onPointerDown={e => handlePointerDown(e, { type: 'measure', id: m.id, end: 'cp' })}>
                <circle cx={cp.x} cy={cp.y} r={rHit} fill="transparent" />
                <polygon points={`${cp.x},${cp.y - dDiamond} ${cp.x + dDiamond},${cp.y} ${cp.x},${cp.y + dDiamond} ${cp.x - dDiamond},${cp.y}`} fill="#F59E0B" stroke="#FFFFFF" strokeWidth={1.2 * inv} />
              </g>
            )}
            {labelText && (
              <g transform={`translate(${bX}, ${bY})`} style={{ opacity: isDraggingThis ? 0.35 : 1.0 }} className="pointer-events-none select-none">
                <rect x={-34 * inv} y={-9 * inv} width={68 * inv} height={18 * inv} rx={4 * inv} fill={isSel ? 'rgba(11, 19, 43, 0.95)' : 'rgba(15, 23, 42, 0.85)'} stroke={isSel ? m.color || '#14B8A6' : 'rgba(148, 163, 184, 0.4)'} strokeWidth={(isSel ? 1.5 : 1) * inv} />
                <text x={0} y={3.5 * inv} textAnchor="middle" fill="#FFFFFF" fontSize={(isSel ? 10 : 9) * inv} fontWeight="bold" fontFamily="monospace">{labelText}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

window.StudioSvgOverlay = StudioSvgOverlay;
