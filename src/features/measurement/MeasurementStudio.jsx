// src/features/measurement/MeasurementStudio.jsx
// Orchestrator: Real Measurement Studio v4.0 - Metrology & Quality Pipelines
// Architecture Standard: Rule 1 & 2 (< 220 lines)

const { useState, useCallback, useMemo } = React;

function MeasurementStudio({ showToast }) {
  const state = window.useStudioState ? window.useStudioState() : {};
  const imgState = window.useStudioImage ? window.useStudioImage() : {};
  const sync = window.useStudioSync ? window.useStudioSync({ state, imgState, showToast }) : {};

  const [customModalOpen, setCustomModalOpen] = useState(false), [jsonModalOpen, setJsonModalOpen] = useState(false), [isDetecting, setIsDetecting] = useState(false);

  const Header = window.StudioHeader, CalibSidebar = window.StudioCalibrationSidebar;
  const CanvasComp = window.StudioCanvas, MeasSidebar = window.StudioMeasurementsSidebar;
  const ModalsComp = window.StudioModals, CvDetector = window.MeasurementCvDetector;
  const MathUtils = window.MeasurementHomographyMath, Refiner = window.SubpixelCornerRefiner, api = window.measurementApi;

  const runAutoPipeline = useCallback(async (targetCanvas, runGarment = true) => {
    const canvas = targetCanvas || imgState.processedCanvas;
    if (!canvas?.width) return;
    setIsDetecting(true);
    let corners = null, orient = null;

    if (CvDetector?.runLocalComputerVisionDetector) {
      const res = CvDetector.runLocalComputerVisionDetector(canvas);
      if (res?.a4Corners?.length === 4) {
        corners = Refiner?.refineAllA4CornersSubpixel ? Refiner.refineAllA4CornersSubpixel(canvas, res.a4Corners, 15) : res.a4Corners;
        orient = res.a4Orientation || 'portrait';
      }
    }

    if (!corners && api?.detectA4Subpixel) {
      try {
        const b64 = canvas.toDataURL('image/jpeg', 0.92);
        const res = await api.detectA4Subpixel(b64);
        if (res?.success && res.corners) {
          corners = Refiner?.refineAllA4CornersSubpixel ? Refiner.refineAllA4CornersSubpixel(canvas, res.corners, 15) : res.corners;
          orient = res.orientation || 'portrait';
        }
      } catch (err) { console.warn('Detector notice:', err.message); }
    }

    if (corners) {
      state.setA4Corners(corners);
      if (orient) state.setA4Orientation(orient);
      state.setA4Detected && state.setA4Detected(true);
    } else {
      state.setA4Detected && state.setA4Detected(false);
    }

    let gOk = false;
    if (runGarment && state.autoDetectGarmentSilhouette) {
      gOk = state.autoDetectGarmentSilhouette(canvas, corners);
    }

    if (corners && gOk) showToast && showToast('تم كشف ورقة A4 وتحديد مجسم الفستان ونقاط القياس السبعة تلقائياً! 👗📐', 'success');
    else if (corners) showToast && showToast('تم كشف زوايا A4 بدقة تقاطع الأضلاع Sub-Pixel! 🎯');
    else if (gOk) showToast && showToast('تم ضبط أضلاع الفستان على القماش! 👗 أدخل الطول الحقيقي للمعايرة في الشريط الجانبي 📏', 'info');
    else showToast && showToast('لم يتم العثور على ورقة واضحة؛ يرجى مطابقة الزوايا يدوياً', 'info');

    setIsDetecting(false);
    state.pushSnapshot();
  }, [imgState.processedCanvas, api, CvDetector, Refiner, state, showToast]);

  const onImageReady = () => {
    state.setHasImage(true); state.setA4Detected && state.setA4Detected(false); state.setClickToPlaceStep(-1);
    setTimeout(() => runAutoPipeline(imgState.processedCanvas, true), 60);
  };

  const handleUploadFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => imgState.loadImage(ev.target.result, () => { showToast && showToast('تم تحميل صورة الفستان! 📸'); onImageReady(); });
    reader.readAsDataURL(file);
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard?.read) {
        for (const item of await navigator.clipboard.read()) {
          const t = item.types.find(x => x.startsWith('image/'));
          if (t) {
            const blob = await item.getType(t), reader = new FileReader();
            reader.onload = ev => imgState.loadImage(ev.target.result, () => { showToast && showToast('تم لصق صورة الفستان! 📋'); onImageReady(); });
            reader.readAsDataURL(blob); return;
          }
        }
      }
    } catch (_) {}
    showToast && showToast('اضغط Ctrl+V للصق الصورة من الحافظة', 'info');
  };

  const handleAutoDeskew = () => {
    const tot = state.measurements.find(m => m.id === 'total_length');
    const tilt = (tot?.p1 && tot?.p2 && Math.abs(tot.p2.y - tot.p1.y) > 30) ? Math.round((Math.atan2(tot.p2.x - tot.p1.x, tot.p2.y - tot.p1.y) * 180) / Math.PI) : 0;
    if (Math.abs(tilt) >= 1) {
      imgState.adjustFineAngle(-tilt, state.a4Corners, state.measurements, ({ newA4, newMeasurements, pCanvas }) => {
        if (newA4) state.setA4Corners(newA4); if (newMeasurements) state.setMeasurements(newMeasurements);
        state.autoDetectGarmentSilhouette(pCanvas || imgState.processedCanvas);
        showToast && showToast(`تم استعدال ميلان الفستان (${tilt > 0 ? `+${tilt}°` : `${tilt}°`}) بدقة! 📐👗`);
      });
    } else showToast && showToast('الفستان مستقيم ومتعامد بالفعل! 📐');
  };

  const runSubPixelAutoMeasure = useCallback((customB64) => runAutoPipeline(imgState.processedCanvas, true), [runAutoPipeline, imgState.processedCanvas]);

  const whatsappText = useMemo(() => MathUtils?.buildWhatsAppSummary ? MathUtils.buildWhatsAppSummary(state) : '', [state.orderId, state.customerName, state.measurements, state.H_imgToWorld, state.lensCorrection, state.a4Placement, state.fabricElevationMm, state.fabricTurnAllowanceCm, state.operationMode, MathUtils]);

  const copyText = (txt, msg) => {
    navigator.clipboard?.writeText ? navigator.clipboard.writeText(txt).then(() => showToast && showToast(msg)) : (showToast && showToast(msg));
  };

  const exportImage = () => {
    const p = imgState.processedCanvas;
    if (!p?.width) return;
    const Drawing = window.MeasurementCanvasDrawing;
    const canvas = Drawing?.createAnnotatedExportCanvas ?
      Drawing.createAnnotatedExportCanvas(p, state.a4Corners, state.a4Orientation, state.measurements, state.unit, state.H_imgToWorld, state.orderId, state.customerName, { lensCorrection: state.lensCorrection, a4Placement: state.a4Placement, fabricElevationMm: state.fabricElevationMm, operationMode: state.operationMode }) : p;
    const link = document.createElement('a');
    link.href = (canvas || p).toDataURL('image/png'); link.download = `dress-${state.orderId || 'order'}-measured-v4.png`; link.click();
    showToast && showToast('تم تصدير صورة الفستان الهندسية بنجاح! 📸');
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#090D16] text-slate-100 overflow-hidden select-none border border-slate-700/60 rounded-xl shadow-2xl">
      {Header && (
        <Header
          unit={state.unit} onSetUnit={state.setUnit} onAutoDetect={() => runSubPixelAutoMeasure()}
          isDetecting={isDetecting} onExportImage={exportImage}
          onCopyWhatsApp={() => copyText(whatsappText, 'تم نسخ بطاقة المقاسات للواتساب')}
          onOpenJsonModal={() => setJsonModalOpen(true)} syncStatus={sync.syncStatus}
          onSaveDraft={() => sync.saveSession && sync.saveSession(true)} onApprove={sync.approveSession}
          diagnostics={state.diagnostics} perpendicularLock={state.perpendicularLock} onTogglePerpendicularLock={state.setPerpendicularLock}
          showCenterline={state.showCenterline} onToggleCenterline={state.setShowCenterline} blueprintMode={state.blueprintMode} onToggleBlueprintMode={state.setBlueprintMode}
          backdropDim={state.backdropDim} onToggleBackdropDim={state.setBackdropDim} showUncertainty={state.showUncertainty} onToggleUncertainty={state.setShowUncertainty}
        />
      )}

      <main className="flex-1 flex flex-row items-stretch gap-2.5 p-2 h-[calc(100vh-125px)] min-h-0 overflow-hidden relative" dir="rtl">
        {CalibSidebar && (
          <CalibSidebar
            orderId={state.orderId} onSetOrderId={state.setOrderId} customerName={state.customerName} onSetCustomerName={state.setCustomerName}
            diagnostics={state.diagnostics} onAutoDetectA4={() => runSubPixelAutoMeasure()} viewMode={state.viewMode} onSetViewMode={state.setViewMode}
            onSetPresetA4={pos => state.setA4PresetPosition(pos, imgState.processedCanvas?.width, imgState.processedCanvas?.height)}
            onUploadFile={handleUploadFile} onPasteClipboard={handlePasteClipboard} onLoadOrder={sync.loadSessionByOrderId} syncStatus={sync.syncStatus}
            lensCorrection={state.lensCorrection} onToggleLensCorrection={state.setLensCorrection} a4Placement={state.a4Placement} onSetA4Placement={state.setA4Placement}
            fabricElevationMm={state.fabricElevationMm} onSetFabricElevationMm={state.setFabricElevationMm} a4Corners={state.a4Corners}
            showFloorGuide={state.showFloorGuide} onToggleFloorGuide={state.setShowFloorGuide} showCenterline={state.showCenterline} onToggleCenterline={state.setShowCenterline}
            fabricType={state.fabricType} onSetFabricType={state.setFabricType} clickToPlaceStep={state.clickToPlaceStep} onSetClickToPlaceStep={state.setClickToPlaceStep}
            onAutoDetectGarment={() => { const ok = state.autoDetectGarmentSilhouette(imgState.processedCanvas); showToast && showToast(ok ? 'تم عزل مجسم الفستان وتوزيع المقاسات السبعة بنجاح! 👗' : 'يرجى إرفاق صورة واضحة للفستان'); }}
            fineAngle={imgState.fineAngle} onAutoDeskew={handleAutoDeskew}
            onAdjustFineAngle={(d) => imgState.adjustFineAngle(d, state.a4Corners, state.measurements, ({ newA4, newMeasurements }) => { if (newA4) state.setA4Corners(newA4); if (newMeasurements) state.setMeasurements(newMeasurements); })}
            onApplyReferenceLength={(cm) => { const ok = state.applyReferenceTotalLengthCm(cm); showToast && showToast(ok ? `تمت معايرة المقاسات بالطول (${cm} سم)! 📏` : 'طول غير صالح'); }}
            operationMode={state.operationMode} onSetOperationMode={state.setOperationMode} cameraProfileKey={state.cameraProfileKey} onSelectCameraProfile={state.selectCameraProfile}
            garmentProfileKey={state.garmentProfileKey} onSelectGarmentProfile={state.selectGarmentProfile}
          />
        )}

        {CanvasComp && (
          <CanvasComp
            processedCanvas={imgState.processedCanvas} hasImage={state.hasImage}
            a4Corners={state.a4Corners} onUpdateA4Corners={state.setA4Corners}
            measurements={state.measurements} onUpdateMeasurements={state.setMeasurements}
            a4Orientation={state.a4Orientation} H_imgToWorld={state.H_imgToWorld} H_worldToImg={state.H_worldToImg}
            unit={state.unit} canUndo={state.canUndo} canRedo={state.canRedo}
            onUndo={state.undo} onRedo={state.redo} onPushSnapshot={state.pushSnapshot}
            selectedPin={state.selectedPin} onSelectPin={state.setSelectedPin}
            activeMeasurementId={state.activeMeasurementId} onSelectMeasurement={state.setActiveMeasurementId}
            viewMode={state.viewMode} clickToPlaceStep={state.clickToPlaceStep} onSetClickToPlaceStep={state.setClickToPlaceStep}
            edgeSnapEnabled={state.edgeSnapEnabled} onToggleEdgeSnap={state.setEdgeSnapEnabled}
            lensCorrection={state.lensCorrection} a4Placement={state.a4Placement} fabricElevationMm={state.fabricElevationMm}
            centerline={state.centerline} showCenterline={state.showCenterline}
            perpendicularLock={state.perpendicularLock} showFloorGuide={state.showFloorGuide} floorLines={state.floorLines}
            blueprintMode={state.blueprintMode} backdropDim={state.backdropDim} fabricTurnAllowanceCm={state.fabricTurnAllowanceCm}
            focusActiveLine={state.focusActiveLine} drawingLineId={state.drawingLineId} onSetDrawingLineId={state.setDrawingLineId}
            drawingStep={state.drawingStep} onSetDrawingStep={state.setDrawingStep}
            operationMode={state.operationMode} showUncertainty={state.showUncertainty} a4Detected={state.a4Detected}
          />
        )}

        {MeasSidebar && (
          <MeasSidebar
            measurements={state.measurements} onSelectMeasurement={state.setActiveMeasurementId}
            onToggleVisibility={state.toggleVisibility} onStepEase={state.stepEase}
            onToggleCircumference={state.toggleCircumference} hasImage={state.hasImage}
            onCenterLine={id => { const W = imgState.processedCanvas?.width || 1000, H = imgState.processedCanvas?.height || 800; state.setMeasurements(prev => prev.map(m => m.id === id ? { ...m, p1: { x: Math.round(W * 0.4), y: Math.round(H * 0.45) }, cp: { x: Math.round(W * 0.5), y: Math.round(H * 0.45) }, p2: { x: Math.round(W * 0.6), y: Math.round(H * 0.45) } } : m)); }}
            onDeleteMeasurement={state.deleteMeasurement} onOpenAddCustomModal={() => setCustomModalOpen(true)}
            activeId={state.activeMeasurementId} unit={state.unit} H_imgToWorld={state.H_imgToWorld}
            lensCorrection={state.lensCorrection} a4Placement={state.a4Placement} fabricElevationMm={state.fabricElevationMm}
            sanityWarnings={state.sanityWarnings} fabricTurnAllowanceCm={state.fabricTurnAllowanceCm}
            focusActiveLine={state.focusActiveLine} onToggleFocusActiveLine={state.setFocusActiveLine}
            drawingLineId={state.drawingLineId}
            onStart2ClickDrawing={(id) => { state.setActiveMeasurementId(id); state.setDrawingLineId(id); state.setDrawingStep(0); showToast && showToast('انقر نقطة البداية على الصورة، ثم نقطة النهاية 🎯'); }}
            operationMode={state.operationMode} showUncertainty={state.showUncertainty} a4Detected={state.a4Detected}
          />
        )}
      </main>

      {ModalsComp && (
        <ModalsComp
          customModalOpen={customModalOpen} onCloseCustomModal={() => setCustomModalOpen(false)}
          onConfirmAddCustom={state.addCustomMeasurement} jsonModalOpen={jsonModalOpen}
          onCloseJsonModal={() => setJsonModalOpen(false)} jsonPayload={state.H_imgToWorld ? { status: 'ready', order_id: state.orderId } : {}}
          whatsappText={whatsappText} onCopyText={copyText} onApprove={sync.approveSession}
          syncStatus={sync.syncStatus}
        />
      )}
    </div>
  );
}

window.MeasurementStudio = MeasurementStudio;
