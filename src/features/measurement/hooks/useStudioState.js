// src/features/measurement/hooks/useStudioState.js
// Real Measurement Studio v4.0 - Metrology State, Uncertainty & Governance
// Architecture Standard: Rule 1 & 2 (< 220 lines)

const { useState, useEffect, useCallback, useMemo } = React;

function useStudioState() {
  const CvDetector = window.MeasurementCvDetector || {}, MathUtils = window.MeasurementHomographyMath || {};
  const Snap = window.CenterlineSnap || {}, ValidationEngine = window.MeasurementValidationEngine || {};
  const ConfigMgr = window.MeasurementConfigManager || {}, CamEngine = window.CameraCalibrationEngine || {};

  const [orderId, setOrderId] = useState(''), [customerName, setCustomerName] = useState('');
  const [hasImage, setHasImage] = useState(false), [unit, setUnit] = useState('cm');
  const [a4Orientation, setA4Orientation] = useState('portrait'), [a4Detected, setA4Detected] = useState(false);
  const [a4Corners, setA4Corners] = useState([{ x: 135, y: 225 }, { x: 312, y: 238 }, { x: 294, y: 505 }, { x: 104, y: 488 }]);
  const [measurements, setMeasurements] = useState(() => (CvDetector.DEFAULT_MEASUREMENTS || []));
  const [activeMeasurementId, setActiveMeasurementId] = useState('chest');
  const [selectedPin, setSelectedPin] = useState({ type: 'a4', index: 0 });
  const [viewMode, setViewMode] = useState('all'), [clickToPlaceStep, setClickToPlaceStep] = useState(-1);
  const [focusActiveLine, setFocusActiveLine] = useState(false);
  const [drawingLineId, setDrawingLineId] = useState(null), [drawingStep, setDrawingStep] = useState(-1);
  const [blueprintMode, setBlueprintMode] = useState(false), [backdropDim, setBackdropDim] = useState(false);
  const [fabricType, setFabricType] = useState('none');

  // Metrology Modes & Camera Calibration (v4.0)
  const [operationMode, setOperationMode] = useState('mode_a_flat_2d');
  const [garmentProfileKey, setGarmentProfileKey] = useState('ballgown');
  const [cameraProfileKey, setCameraProfileKey] = useState('generic_rectilinear');
  const [showUncertainty, setShowUncertainty] = useState(true);
  const [lensCorrection, setLensCorrection] = useState(true);
  const [a4Placement, setA4Placement] = useState('coplanar');
  const [fabricElevationMm, setFabricElevationMm] = useState(20);
  const [edgeSnapEnabled, setEdgeSnapEnabled] = useState(false), [showCenterline, setShowCenterline] = useState(false);
  const [perpendicularLock, setPerpendicularLock] = useState(false), [showFloorGuide, setShowFloorGuide] = useState(false);
  const [floorLines, setFloorLines] = useState({ line1: { p1: { x: 200, y: 750 }, p2: { x: 800, y: 750 } }, line2: { p1: { x: 200, y: 790 }, p2: { x: 800, y: 790 } } });

  const [history, setHistory] = useState([]), [historyIdx, setHistoryIdx] = useState(-1);

  const fabricTurnAllowanceCm = useMemo(() => {
    if (!fabricType || fabricType === 'none') return 0.0;
    return fabricType === 'light' ? 1.5 : (fabricType === 'tulle' ? 2.5 : 2.0);
  }, [fabricType]);

  useEffect(() => {
    if (history.length === 0) { setHistory([JSON.stringify({ a4Orientation, a4Corners, measurements, lensCorrection, a4Placement, fabricElevationMm, operationMode })]); setHistoryIdx(0); }
  }, []);

  const { H_imgToWorld, H_worldToImg, diagnostics, centerline, sanityWarnings } = useMemo(() => {
    if (!hasImage) {
      return { H_imgToWorld: null, H_worldToImg: null, centerline: null, sanityWarnings: {}, diagnostics: { tilt: '--', pxPerCm: '--', resolution: { mmPerPx: null, label: '--' }, confidence: { score: 0, label: 'بانتظار الصورة' }, rmse: 0, groundTruth: {} } };
    }
    const dims = (CvDetector.A4_DIMENSIONS || {})[a4Orientation] || { widthMm: 210.0, heightMm: 297.0 };
    const wMm = dims.widthMm || 210.0, hMm = dims.heightMm || 297.0;
    const worldCorners = [{ x: 0, y: 0 }, { x: wMm, y: 0 }, { x: wMm, y: hMm }, { x: 0, y: hMm }];

    const compute = MathUtils.computeHomographyMatrix;
    const H_i2w = compute ? compute(a4Corners, worldCorners) : null;
    const H_w2i = compute ? compute(worldCorners, a4Corners) : null;
    const rawConf = MathUtils.evaluateHomographyConfidence ? MathUtils.evaluateHomographyConfidence(a4Corners, a4Orientation) : { score: 0, label: '--' };
    const confidence = a4Detected ? rawConf : { score: 0, label: 'ورقة A4 غير مرصودة' };
    const resolution = Snap.calculateImageResolutionMmPerPx ? Snap.calculateImageResolutionMmPerPx(H_i2w, a4Corners, a4Orientation) : { mmPerPx: 0.5, label: '--' };
    const cLine = Snap.computeGarmentCenterline ? Snap.computeGarmentCenterline(measurements) : null;
    const rmse = MathUtils.computeReprojectionErrorRmse ? MathUtils.computeReprojectionErrorRmse(H_i2w, H_w2i, a4Corners, a4Orientation) : 0;
    const groundTruth = ValidationEngine.verifyIndependentGroundTruthScale ? ValidationEngine.verifyIndependentGroundTruthScale(a4Corners, a4Orientation, H_i2w) : {};
    const camStatus = CamEngine.getCalibrationStatus ? CamEngine.getCalibrationStatus() : {};

    let pxPerCm = (resolution?.mmPerPx && resolution.mmPerPx > 0) ? (10.0 / resolution.mmPerPx).toFixed(1) : '--';

    const warnings = {};
    if (H_i2w && MathUtils.calculateTrueDistanceCm) {
      const getVal = id => { const m = measurements.find(x => x.id === id); return (m && m.visible) ? MathUtils.calculateTrueDistanceCm(H_i2w, m.p1, m.p2, { lensCorrection, a4Placement, fabricElevationMm }, m.cp) : 0; };
      const chest = getVal('chest'), shoulder = getVal('shoulder'), bodice = getVal('bodice_length'), totalLen = getVal('total_length'), waist = getVal('waist');
      if (chest > 0 && shoulder > 0 && (shoulder > chest * 1.15 || shoulder < chest * 0.45)) warnings.shoulder = 'عرض الكتف غير متناسب مع الصدر';
      if (bodice > 0 && totalLen > 0 && (bodice > totalLen * 0.6 || bodice < totalLen * 0.22)) warnings.bodice_length = 'طول الصدر غير متناسب مع طول الفستان';
      if (chest > 0 && waist > 0 && waist > chest * 1.35) warnings.waist = 'الخصر أكبر من الصدر بنسبة غير مألوفة';
    }

    return { H_imgToWorld: H_i2w, H_worldToImg: H_w2i, centerline: cLine, sanityWarnings: warnings, diagnostics: { pxPerCm, resolution, confidence, rmse, groundTruth, camStatus, ratio: confidence.ratio || '--' } };
  }, [hasImage, a4Orientation, a4Corners, measurements, lensCorrection, a4Placement, fabricElevationMm, CvDetector, MathUtils, Snap, ValidationEngine, CamEngine]);

  const pushSnapshot = useCallback(() => {
    const snap = JSON.stringify({ a4Orientation, a4Corners, measurements, lensCorrection, a4Placement, fabricElevationMm, fabricType, operationMode, garmentProfileKey });
    setHistory(prev => { const next = prev.slice(0, historyIdx + 1); next.push(snap); if (next.length > 30) next.shift(); return next; });
    setHistoryIdx(prev => Math.min(29, prev + 1));
  }, [a4Orientation, a4Corners, measurements, lensCorrection, a4Placement, fabricElevationMm, fabricType, operationMode, garmentProfileKey, historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx > 0) {
      const t = JSON.parse(history[historyIdx - 1]);
      setA4Orientation(t.a4Orientation); setA4Corners(t.a4Corners); setMeasurements(t.measurements);
      if (t.lensCorrection !== undefined) setLensCorrection(t.lensCorrection);
      if (t.a4Placement) setA4Placement(t.a4Placement);
      if (t.fabricElevationMm) setFabricElevationMm(t.fabricElevationMm);
      if (t.fabricType) setFabricType(t.fabricType);
      if (t.operationMode) setOperationMode(t.operationMode);
      setHistoryIdx(prev => prev - 1);
    }
  }, [historyIdx, history]);

  const redo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const t = JSON.parse(history[historyIdx + 1]);
      setA4Orientation(t.a4Orientation); setA4Corners(t.a4Corners); setMeasurements(t.measurements);
      if (t.lensCorrection !== undefined) setLensCorrection(t.lensCorrection);
      if (t.a4Placement) setA4Placement(t.a4Placement);
      if (t.fabricElevationMm) setFabricElevationMm(t.fabricElevationMm);
      if (t.fabricType) setFabricType(t.fabricType);
      if (t.operationMode) setOperationMode(t.operationMode);
      setHistoryIdx(prev => prev + 1);
    }
  }, [historyIdx, history]);

  const stepEase = useCallback((id, delta) => {
    const dCm = unit === 'inch' ? delta * 2.54 : delta;
    setMeasurements(prev => prev.map(m => m.id === id ? { ...m, easeCm: Math.round(((m.easeCm || 0) + dCm) * 100) / 100 } : m));
    pushSnapshot();
  }, [unit, pushSnapshot]);

  const toggleCircumference = useCallback(id => {
    setMeasurements(prev => prev.map(m => m.id === id ? { ...m, isCircumference: !m.isCircumference } : m));
    pushSnapshot();
  }, [pushSnapshot]);

  const toggleVisibility = useCallback(id => {
    setMeasurements(prev => prev.map(m => m.id === id ? { ...m, visible: !m.visible } : m));
    pushSnapshot();
  }, [pushSnapshot]);

  const addCustomMeasurement = useCallback((name, multiplier, color) => {
    const newId = 'custom_' + Date.now();
    setMeasurements(prev => [
      ...prev,
      { id: newId, nameAr: name, shortName: name, color, type: multiplier === 2 ? 'circumference' : 'linear', multiplier, isCircumference: multiplier === 2, easeCm: 0, visible: true, isCustom: true, p1: { x: 500, y: 400 }, cp: { x: 610, y: 400 }, p2: { x: 720, y: 400 } }
    ]);
    setActiveMeasurementId(newId);
    pushSnapshot();
  }, [pushSnapshot]);

  const deleteMeasurement = useCallback(id => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
    pushSnapshot();
  }, [pushSnapshot]);

  const setA4PresetPosition = useCallback((pos, imgW = 1000, imgH = 1000) => {
    let pw = Math.round(imgW * 0.22), ph = Math.round(pw * 1.414);
    if (a4Orientation === 'landscape') { const tmp = pw; pw = ph; ph = tmp; }
    let cx = imgW * (pos === 'left' ? 0.22 : (pos === 'right' ? 0.78 : 0.5)), cy = imgH * (pos === 'bottom' ? 0.82 : 0.5);
    setA4Corners([
      { x: Math.round(cx - pw / 2), y: Math.round(cy - ph / 2) }, { x: Math.round(cx + pw / 2), y: Math.round(cy - ph / 2) },
      { x: Math.round(cx + pw / 2), y: Math.round(cy + ph / 2) }, { x: Math.round(cx - pw / 2), y: Math.round(cy + ph / 2) }
    ]);
    pushSnapshot();
  }, [a4Orientation, pushSnapshot]);

  const autoDetectGarmentSilhouette = useCallback((canvas, customA4) => {
    const Detector = window.GarmentLandmarkDetector;
    if (Detector?.detectGarmentLandmarks && canvas?.width) {
      const updated = Detector.detectGarmentLandmarks(canvas, customA4 || a4Corners, measurements);
      setMeasurements(updated);
      pushSnapshot();
      return true;
    }
    return false;
  }, [a4Corners, measurements, pushSnapshot]);

  const selectGarmentProfile = useCallback(key => {
    setGarmentProfileKey(key);
    ConfigMgr.setGarmentProfile && ConfigMgr.setGarmentProfile(key);
    const prof = ConfigMgr.getGarmentProfile ? ConfigMgr.getGarmentProfile(key) : null;
    if (prof) {
      if (prof.defaultMode) setOperationMode(prof.defaultMode);
      if (prof.elevationMm !== undefined) setFabricElevationMm(prof.elevationMm);
      if (prof.fabricType) setFabricType(prof.fabricType);
      setMeasurements(prev => ConfigMgr.applyProfileToMeasurements(prev, key));
    }
    pushSnapshot();
  }, [ConfigMgr, pushSnapshot]);

  const selectCameraProfile = useCallback(key => {
    setCameraProfileKey(key);
    CamEngine.setCameraProfile && CamEngine.setCameraProfile(key);
    pushSnapshot();
  }, [CamEngine, pushSnapshot]);

  const applyReferenceTotalLengthCm = useCallback((knownLengthCm) => {
    if (!knownLengthCm || knownLengthCm <= 0) return false;
    const tot = measurements.find(m => m.id === 'total_length');
    if (!tot?.p1 || !tot?.p2) return false;
    const pxDist = Math.hypot(tot.p2.x - tot.p1.x, tot.p2.y - tot.p1.y);
    if (pxDist < 10) return false;
    const mmPerPx = (knownLengthCm * 10) / pxDist;
    const pw = 210.0 / mmPerPx, ph = 297.0 / mmPerPx;
    setA4Corners([{ x: 40, y: 40 }, { x: Math.round(40 + pw), y: 40 }, { x: Math.round(40 + pw), y: Math.round(40 + ph) }, { x: 40, y: Math.round(40 + ph) }]);
    setA4Detected(true);
    pushSnapshot();
    return true;
  }, [measurements, pushSnapshot]);

  return {
    orderId, setOrderId, customerName, setCustomerName, hasImage, setHasImage, unit, setUnit,
    a4Orientation, setA4Orientation, a4Corners, setA4Corners, measurements, setMeasurements,
    activeMeasurementId, setActiveMeasurementId, selectedPin, setSelectedPin, viewMode, setViewMode,
    clickToPlaceStep, setClickToPlaceStep, focusActiveLine, setFocusActiveLine, drawingLineId, setDrawingLineId,
    drawingStep, setDrawingStep, blueprintMode, setBlueprintMode, backdropDim, setBackdropDim,
    fabricType, setFabricType, fabricTurnAllowanceCm, lensCorrection, setLensCorrection, a4Placement, setA4Placement,
    fabricElevationMm, setFabricElevationMm, edgeSnapEnabled, setEdgeSnapEnabled, showCenterline, setShowCenterline,
    perpendicularLock, setPerpendicularLock, showFloorGuide, setShowFloorGuide, floorLines, setFloorLines,
    operationMode, setOperationMode, garmentProfileKey, selectGarmentProfile, cameraProfileKey, selectCameraProfile,
    showUncertainty, setShowUncertainty, setA4PresetPosition, H_imgToWorld, H_worldToImg, diagnostics, sanityWarnings,
    centerline, autoDetectGarmentSilhouette, a4Detected, setA4Detected, applyReferenceTotalLengthCm,
    canUndo: historyIdx > 0, canRedo: historyIdx < history.length - 1,
    undo, redo, pushSnapshot, stepEase, toggleCircumference, toggleVisibility, addCustomMeasurement, deleteMeasurement
  };
}

window.useStudioState = useStudioState;
