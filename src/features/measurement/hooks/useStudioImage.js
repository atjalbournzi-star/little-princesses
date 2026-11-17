// src/features/measurement/hooks/useStudioImage.js
// State & image filters processing for tailoring calibration canvas

const { useState, useRef, useCallback } = React;

function useStudioImage() {
  const [rawImage, setRawImage] = useState(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [fineAngle, setFineAngle] = useState(0);
  const [baseRotation90, setBaseRotation90] = useState(0);
  const [highContrastSeam, setHighContrastSeam] = useState(false);

  const processedCanvasRef = useRef(document.createElement('canvas'));

  const rebuildCanvas = useCallback((img, b = brightness, c = contrast, fa = fineAngle, rot = baseRotation90, seam = highContrastSeam) => {
    if (!img) return null;
    const pCanvas = processedCanvasRef.current;
    const srcW = img.width, srcH = img.height;
    const normRot = ((rot % 360) + 360) % 360;
    const swapped = normRot === 90 || normRot === 270;
    const tw = swapped ? srcH : srcW;
    const th = swapped ? srcW : srcH;

    pCanvas.width = tw; pCanvas.height = th;
    const pCtx = pCanvas.getContext('2d');
    pCtx.save();
    pCtx.fillStyle = '#090d16';
    pCtx.fillRect(0, 0, tw, th);

    let filter = `brightness(${b}%) contrast(${c}%)`;
    if (seam) filter += ' saturate(140%) contrast(135%)';
    pCtx.filter = filter;

    pCtx.translate(tw / 2, th / 2);
    const rad = ((normRot + fa) * Math.PI) / 180;
    pCtx.rotate(rad);
    pCtx.drawImage(img, -srcW / 2, -srcH / 2);
    pCtx.restore();
    return pCanvas;
  }, [brightness, contrast, fineAngle, baseRotation90, highContrastSeam]);

  const loadImage = useCallback((src, onLoaded) => {
    const img = new Image();
    img.onload = () => {
      setRawImage(img);
      setBrightness(100); setContrast(100); setFineAngle(0);
      setBaseRotation90(0); setHighContrastSeam(false);
      rebuildCanvas(img, 100, 100, 0, 0, false);
      if (onLoaded) onLoaded(img);
    };
    img.src = src;
  }, [rebuildCanvas]);

  const rotate90 = useCallback((deltaDeg, a4Corners, measurements, onRotated) => {
    if (!rawImage) return;
    const nextRot = (((baseRotation90 + deltaDeg) % 360) + 360) % 360;
    setBaseRotation90(nextRot);
    const pCanvas = rebuildCanvas(rawImage, brightness, contrast, fineAngle, nextRot, highContrastSeam);
    const nw = pCanvas.width, nh = pCanvas.height;

    const rotPt = (pt) => deltaDeg === 90 ? { x: nw - pt.y, y: pt.x } : { x: pt.y, y: nh - pt.x };
    const MathUtils = window.MeasurementHomographyMath || {};
    const newA4 = a4Corners ? (MathUtils.normalizeQuadCornersClockwise ? MathUtils.normalizeQuadCornersClockwise(a4Corners.map(rotPt)) : a4Corners.map(rotPt)) : null;
    const newM = (measurements || []).map(m => ({ ...m, p1: rotPt(m.p1), p2: rotPt(m.p2) }));

    if (onRotated) onRotated({ newA4, newMeasurements: newM, pCanvas });
  }, [rawImage, baseRotation90, brightness, contrast, fineAngle, highContrastSeam, rebuildCanvas]);

  const adjustFineAngle = useCallback((deltaDeg, a4Corners, measurements, onRotated) => {
    if (!rawImage) return;
    const nextAngle = Math.max(-45, Math.min(45, Math.round((fineAngle + deltaDeg) * 10) / 10));
    setFineAngle(nextAngle);
    const pCanvas = rebuildCanvas(rawImage, brightness, contrast, nextAngle, baseRotation90, highContrastSeam);
    if (!pCanvas) return;
    const rad = (deltaDeg * Math.PI) / 180;
    const cosR = Math.cos(rad), sinR = Math.sin(rad);
    const cx = pCanvas.width / 2, cy = pCanvas.height / 2;
    const rotPt = pt => pt ? ({
      x: Math.round(cx + (pt.x - cx) * cosR - (pt.y - cy) * sinR),
      y: Math.round(cy + (pt.x - cx) * sinR + (pt.y - cy) * cosR)
    }) : pt;
    const newA4 = a4Corners ? a4Corners.map(rotPt) : null;
    const newM = (measurements || []).map(m => ({ ...m, p1: rotPt(m.p1), p2: rotPt(m.p2), cp: rotPt(m.cp) }));
    if (onRotated) onRotated({ newA4, newMeasurements: newM, pCanvas, fineAngle: nextAngle });
    return pCanvas;
  }, [rawImage, fineAngle, brightness, contrast, baseRotation90, highContrastSeam, rebuildCanvas]);

  const resetFilters = useCallback(() => {
    setBrightness(100); setContrast(100); setFineAngle(0); setHighContrastSeam(false);
    if (rawImage) rebuildCanvas(rawImage, 100, 100, 0, baseRotation90, false);
  }, [rawImage, baseRotation90, rebuildCanvas]);

  return {
    rawImage,
    processedCanvas: processedCanvasRef.current,
    brightness, setBrightness,
    contrast, setContrast,
    fineAngle, setFineAngle,
    baseRotation90,
    highContrastSeam, setHighContrastSeam,
    rebuildCanvas,
    loadImage,
    rotate90,
    adjustFineAngle,
    resetFilters
  };
}

window.useStudioImage = useStudioImage;
