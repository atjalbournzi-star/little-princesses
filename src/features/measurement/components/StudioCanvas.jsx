// src/features/measurement/components/StudioCanvas.jsx
// StudioCanvas v4.0 - 1:1 Stage with SVG Overlay & 8x Precision HUD Loupe
// Architecture Standard: Rule 1 & 2 (< 220 lines)

const { useRef, useEffect, useState, useCallback } = React;

function StudioCanvas({
  processedCanvas, hasImage, a4Corners, onUpdateA4Corners, measurements, onUpdateMeasurements, a4Orientation,
  H_imgToWorld, H_worldToImg, unit, canUndo, canRedo, onUndo, onRedo, onPushSnapshot,
  selectedPin, onSelectPin, activeMeasurementId, onSelectMeasurement,
  viewMode, clickToPlaceStep, onSetClickToPlaceStep,
  edgeSnapEnabled, onToggleEdgeSnap, lensCorrection, a4Placement, fabricElevationMm,
  centerline, showCenterline, perpendicularLock, showFloorGuide, floorLines,
  blueprintMode, backdropDim, fabricTurnAllowanceCm,
  focusActiveLine, drawingLineId, onSetDrawingLineId, drawingStep, onSetDrawingStep,
  operationMode, showUncertainty, a4Detected
}) {
  const canvasRef = useRef(null), containerRef = useRef(null), stageRef = useRef(null), loupeCanvasRef = useRef(null);
  const [tool, setTool] = useState('edit'), [zoom, setZoom] = useState(1.0), [pan, setPan] = useState({ x: 0, y: 0 });
  const [loupePower, setLoupePower] = useState(8), [cursorPos, setCursorPos] = useState({ px: { x: 0, y: 0 }, mm: { x: 0, y: 0 } });
  const [activeDragPin, setActiveDragPin] = useState(null);
  const isPanningRef = useRef(false), panStartRef = useRef({ x: 0, y: 0 });

  const Drawing = window.MeasurementCanvasDrawing || {}, MathUtils = window.MeasurementHomographyMath || {};
  const CadGrid = window.MeasurementCadGridView || {}, SvgOverlayComp = window.StudioSvgOverlay;

  const fitImage = useCallback(() => {
    const cont = containerRef.current, p = processedCanvas;
    if (!cont || !p?.width || !hasImage) return;
    const pad = 24, w = cont.clientWidth - pad * 2, h = cont.clientHeight - pad * 2;
    const nextZ = Math.max(0.15, Math.min(w / p.width, h / p.height, 1.4));
    setZoom(nextZ);
    setPan({ x: (cont.clientWidth - p.width * nextZ) / 2, y: (cont.clientHeight - p.height * nextZ) / 2 });
  }, [processedCanvas, hasImage]);

  useEffect(() => { fitImage(); }, [processedCanvas, hasImage, fitImage]);

  const zoomBy = (factor) => {
    setZoom(prev => {
      const next = Math.min(5.0, Math.max(0.2, prev * factor)), cont = containerRef.current;
      if (cont) {
        const cx = cont.clientWidth / 2, cy = cont.clientHeight / 2;
        setPan(p => ({ x: cx - (cx - p.x) * (next / prev), y: cy - (cy - p.y) * (next / prev) }));
      }
      return next;
    });
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current, p = processedCanvas;
    if (!canvas || !hasImage || !p?.width) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(p, 0, 0);
    if (backdropDim && CadGrid.drawBackdropDimmer) CadGrid.drawBackdropDimmer(ctx, p.width, p.height);
    if (blueprintMode && CadGrid.drawCadPerspectiveGrid) CadGrid.drawCadPerspectiveGrid(ctx, p.width, p.height, H_worldToImg, MathUtils, unit);

    const loupeC = loupeCanvasRef.current;
    if (loupeC) {
      const lCtx = loupeC.getContext('2d');
      lCtx.clearRect(0, 0, loupeC.width, loupeC.height);
      let loupeTarget = activeDragPin?.coords, loupePin = activeDragPin?.pin;
      if (!loupeTarget && (clickToPlaceStep >= 0 || drawingLineId)) {
        loupeTarget = cursorPos.px;
        loupePin = clickToPlaceStep >= 0 ? { type: 'a4', index: clickToPlaceStep } : { type: 'measure', id: drawingLineId, end: drawingStep === 0 ? 'p1' : 'p2' };
      }
      if (loupePower > 0 && loupeTarget && Drawing.drawMagnifierLoupe) {
        Drawing.drawMagnifierLoupe(lCtx, loupeC, p, loupeTarget, loupePin, zoom, pan.x, pan.y, loupePower);
      }
    }
  }, [processedCanvas, hasImage, pan, zoom, loupePower, activeDragPin, cursorPos.px, clickToPlaceStep, drawingLineId, drawingStep, Drawing, backdropDim, blueprintMode, H_worldToImg, MathUtils, CadGrid, unit]);

  useEffect(() => {
    const updateSize = () => {
      const cont = containerRef.current, loupeC = loupeCanvasRef.current;
      if (cont && loupeC) { loupeC.width = cont.clientWidth; loupeC.height = cont.clientHeight; }
      render();
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [render]);

  const toImgCoords = (clientX, clientY) => {
    if (!stageRef.current) return { x: 0, y: 0 };
    const rect = stageRef.current.getBoundingClientRect();
    const W = processedCanvas?.width || 1000, H = processedCanvas?.height || 800;
    const x = Math.max(0, Math.min(W, (clientX - rect.left) / zoom));
    const y = Math.max(0, Math.min(H, (clientY - rect.top) / zoom));
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  };

  const handlePointerDown = (clientX, clientY) => {
    const clampedPt = toImgCoords(clientX, clientY);
    if (clickToPlaceStep >= 0 && clickToPlaceStep < 4) {
      const nA4 = [...a4Corners]; nA4[clickToPlaceStep] = clampedPt;
      onUpdateA4Corners(nA4);
      if (clickToPlaceStep === 3) { onSetClickToPlaceStep(-1); onPushSnapshot && onPushSnapshot(); }
      else onSetClickToPlaceStep(clickToPlaceStep + 1);
      return;
    }
    if (drawingLineId) {
      if (drawingStep === 0) {
        onUpdateMeasurements(measurements.map(m => m.id === drawingLineId ? { ...m, p1: clampedPt, cp: clampedPt, p2: clampedPt, placed: true } : m));
        onSetDrawingStep(1);
      } else if (drawingStep === 1) {
        onUpdateMeasurements(measurements.map(m => m.id !== drawingLineId ? m : { ...m, p2: clampedPt, cp: { x: Math.round((m.p1.x + clampedPt.x) / 2), y: Math.round((m.p1.y + clampedPt.y) / 2) }, placed: true }));
        onSetDrawingLineId(null); onSetDrawingStep(-1); onPushSnapshot && onPushSnapshot();
      }
      return;
    }
    isPanningRef.current = true;
    panStartRef.current = { x: clientX - pan.x, y: clientY - pan.y };
  };

  const handlePointerMove = (clientX, clientY) => {
    const imgPt = toImgCoords(clientX, clientY);
    const worldPt = H_imgToWorld && MathUtils.applyHomographyPoint ? MathUtils.applyHomographyPoint(H_imgToWorld, imgPt) : null;
    setCursorPos({
      px: { x: Math.round(imgPt.x), y: Math.round(imgPt.y) },
      mm: { x: worldPt && Number.isFinite(worldPt.x) ? Math.round(worldPt.x) : '--', y: worldPt && Number.isFinite(worldPt.y) ? Math.round(worldPt.y) : '--' }
    });
    if (isPanningRef.current) setPan({ x: clientX - panStartRef.current.x, y: clientY - panStartRef.current.y });
    if (clickToPlaceStep >= 0 || drawingLineId) render();
  };

  return (
    <section className="flex-1 min-w-[380px] h-full min-h-0 flex flex-col relative overflow-hidden bg-[#090D16] border border-slate-700/60 rounded-xl shadow-md" ref={containerRef}>
      <div className="absolute top-2 left-2 right-2 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none z-10">
        <div className="flex items-center gap-1 bg-[#111C38] px-2 py-1 rounded-lg border border-slate-700/60 shadow-lg pointer-events-auto">
          <button type="button" onClick={() => setTool('edit')} className={`h-6 px-2 text-[10.5px] font-medium rounded transition cursor-pointer ${tool === 'edit' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:text-white'}`}>تحريك النقاط</button>
          <button type="button" onClick={() => setTool('pan')} className={`h-6 px-2 text-[10.5px] font-medium rounded transition cursor-pointer ${tool === 'pan' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:text-white'}`}>سحب اللوحة</button>
          <div className="h-4 w-[1px] bg-slate-700 mx-0.5" />
          <button type="button" onClick={() => onToggleEdgeSnap && onToggleEdgeSnap(!edgeSnapEnabled)} className={`h-6 px-2 text-[10.5px] font-medium rounded cursor-pointer transition ${edgeSnapEnabled ? 'bg-teal-600/30 text-teal-300 border border-teal-500/50' : 'bg-slate-800 text-slate-400'}`}>
            {edgeSnapEnabled ? 'مغناطيس: نشط' : 'مغناطيس: معطل'}
          </button>
          <div className="h-4 w-[1px] bg-slate-700 mx-0.5" />
          <button type="button" onClick={onUndo} disabled={!canUndo} className="h-6 w-6 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer flex items-center justify-center font-bold text-xs">↶</button>
          <button type="button" onClick={onRedo} disabled={!canRedo} className="h-6 w-6 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer flex items-center justify-center font-bold text-xs">↷</button>
        </div>

        <div className="flex items-center gap-1 bg-[#111C38] px-2 py-1 rounded-lg border border-slate-700/60 shadow-lg pointer-events-auto">
          <button type="button" onClick={() => zoomBy(1.2)} className="h-6 w-6 rounded hover:bg-slate-800 text-slate-200 cursor-pointer font-bold text-xs">+</button>
          <span className="text-[11px] font-bold font-mono text-teal-400 px-1 min-w-[38px] text-center">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => zoomBy(0.8)} className="h-6 w-6 rounded hover:bg-slate-800 text-slate-200 cursor-pointer font-bold text-xs">-</button>
          <button type="button" onClick={fitImage} className="h-6 px-2 rounded bg-slate-800 hover:bg-slate-700 text-[10.5px] text-slate-200 cursor-pointer">ملاءمة</button>
          <div className="h-4 w-[1px] bg-slate-700 mx-0.5" />
          <button type="button" onClick={() => setLoupePower(p => p === 0 ? 8 : 0)} className={`h-6 px-2 text-[10.5px] font-medium rounded cursor-pointer transition ${loupePower ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}>
            {loupePower ? 'عدسة 8x نشطة' : 'عدسة: إيقاف'}
          </button>
        </div>
      </div>

      <div
        className={`flex-1 w-full h-full relative overflow-hidden select-none ${tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
        onPointerDown={e => { e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); handlePointerDown(e.clientX, e.clientY); }}
        onPointerMove={e => handlePointerMove(e.clientX, e.clientY)}
        onPointerUp={e => { e.currentTarget.releasePointerCapture && e.currentTarget.releasePointerCapture(e.pointerId); isPanningRef.current = false; }}
        onPointerCancel={() => { isPanningRef.current = false; }}
        onWheel={e => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.15 : 0.85); }}
      >
        {hasImage && processedCanvas?.width && (
          <div
            ref={stageRef}
            style={{ position: 'absolute', left: `${pan.x}px`, top: `${pan.y}px`, width: `${processedCanvas.width}px`, height: `${processedCanvas.height}px`, transform: `scale(${zoom})`, transformOrigin: '0 0', display: 'inline-block' }}
          >
            <canvas ref={canvasRef} width={processedCanvas.width} height={processedCanvas.height} className="block w-full h-full" />
            {SvgOverlayComp && (
              <SvgOverlayComp
                imgWidth={processedCanvas.width} imgHeight={processedCanvas.height} zoom={zoom}
                a4Corners={a4Corners} onUpdateA4Corners={onUpdateA4Corners}
                measurements={measurements} onUpdateMeasurements={onUpdateMeasurements}
                activeMeasurementId={activeMeasurementId} onSelectMeasurement={onSelectMeasurement}
                selectedPin={selectedPin} onSelectPin={onSelectPin} viewMode={viewMode} unit={unit}
                H_imgToWorld={H_imgToWorld} H_worldToImg={H_worldToImg} lensCorrection={lensCorrection}
                a4Placement={a4Placement} fabricElevationMm={fabricElevationMm} edgeSnapEnabled={edgeSnapEnabled}
                processedCanvas={processedCanvas} onPushSnapshot={onPushSnapshot}
                onActiveDrag={(pin, coords) => setActiveDragPin({ pin, coords })} onEndDrag={() => setActiveDragPin(null)}
                centerline={centerline} showCenterline={showCenterline} perpendicularLock={perpendicularLock}
                showFloorGuide={showFloorGuide} floorLines={floorLines} blueprintMode={blueprintMode}
                backdropDim={backdropDim} fabricTurnAllowanceCm={fabricTurnAllowanceCm} focusActiveLine={focusActiveLine}
                operationMode={operationMode} showUncertainty={showUncertainty} a4Detected={a4Detected} clickToPlaceStep={clickToPlaceStep}
              />
            )}
          </div>
        )}

        <canvas ref={loupeCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-20" />

        {clickToPlaceStep >= 0 && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-bold px-3.5 py-1.5 rounded-full text-xs shadow-xl flex items-center gap-2.5 z-20 pointer-events-auto border border-white">
            <span>📐 انقر زاوية A4 #{clickToPlaceStep + 1} ({['أعلى-يسار', 'أعلى-يمين', 'أسفل-يمين', 'أسفل-يسار'][clickToPlaceStep]})</span>
            <button type="button" onClick={() => onSetClickToPlaceStep(-1)} className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10.5px] cursor-pointer transition">إلغاء المعايرة</button>
          </div>
        )}
      </div>

      <div className="h-7 bg-[#111C38] border-t border-slate-700/60 px-3 flex items-center justify-between text-[11px] text-slate-300 shrink-0">
        <span className="truncate">عدسة التكبير 8x تتبع مؤشر الماوس بدقة البكسل</span>
        <div className="flex items-center gap-3 font-mono text-[10.5px] shrink-0">
          <span>PX: {cursorPos.px.x},{cursorPos.px.y}</span>
          <span className="text-teal-400 font-bold">MM: {cursorPos.mm.x},{cursorPos.mm.y}</span>
        </div>
      </div>
    </section>
  );
}

window.StudioCanvas = StudioCanvas;
