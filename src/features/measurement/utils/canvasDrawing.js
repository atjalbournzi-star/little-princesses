// src/features/measurement/utils/canvasDrawing.js
// Precision Canvas Drawing: Crosshairs, 3-Point Bézier Curves & Loupe 8x
// Architecture Standard: Rule 1 & 2 (< 220 lines)

function drawFineCrosshairPin(ctx, x, y, color, label, invScale, isSel = false) {
  ctx.save();
  const s = Math.max(0.2, invScale || 1), arm = (isSel ? 9 : 7) * s, gap = 2.5 * s;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)'; ctx.lineWidth = (isSel ? 3.5 : 2.5) * s;
  ctx.beginPath();
  ctx.moveTo(x - arm, y); ctx.lineTo(x - gap, y); ctx.moveTo(x + gap, y); ctx.lineTo(x + arm, y);
  ctx.moveTo(x, y - arm); ctx.lineTo(x, y - gap); ctx.moveTo(x, y + gap); ctx.lineTo(x, y + arm);
  ctx.stroke();

  ctx.strokeStyle = color; ctx.lineWidth = (isSel ? 2 : 1.4) * s;
  ctx.beginPath();
  ctx.moveTo(x - arm, y); ctx.lineTo(x - gap, y); ctx.moveTo(x + gap, y); ctx.lineTo(x + arm, y);
  ctx.moveTo(x, y - arm); ctx.lineTo(x, y - gap); ctx.moveTo(x, y + gap); ctx.lineTo(x, y + arm);
  ctx.stroke();

  ctx.strokeStyle = isSel ? '#ffffff' : color; ctx.lineWidth = 1.2 * s;
  ctx.beginPath(); ctx.arc(x, y, 3.5 * s, 0, Math.PI * 2); ctx.stroke();

  if (label) {
    const fontSize = Math.max(8, Math.round(9 * s));
    ctx.font = `bold ${fontSize}px monospace`;
    const lx = x + (arm + 4 * s), ly = y - (arm - 2 * s);
    ctx.fillStyle = 'rgba(11, 19, 43, 0.9)'; ctx.strokeStyle = isSel ? '#ffffff' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1 * s;
    ctx.beginPath(); ctx.roundRect(lx - 2 * s, ly - 7 * s, 15 * s, 11 * s, 3 * s); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, lx + 5.5 * s, ly - 1.5 * s);
  }
  ctx.restore();
}

function drawControlPointHandle(ctx, x, y, color, invScale, isSel = false) {
  ctx.save();
  const s = Math.max(0.2, invScale || 1), r = (isSel ? 5.5 : 4) * s;
  ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 2 * s;
  ctx.fillStyle = isSel ? '#38bdf8' : '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 1.5 * s; ctx.stroke();
  ctx.restore();
}

function drawBadge(ctx, x, y, text, borderColor, invScale, isHighlighted = false) {
  ctx.save();
  const s = Math.max(0.15, invScale || 1), fontSize = Math.max(8, Math.round((isHighlighted ? 11 : 9.5) * s));
  ctx.font = `bold ${fontSize}px Cairo, sans-serif`;
  const metrics = ctx.measureText(text), padX = 5.5 * s, padY = 3 * s;
  const boxW = metrics.width + padX * 2, boxH = fontSize + padY * 2;
  ctx.fillStyle = 'rgba(17, 28, 56, 0.94)'; ctx.strokeStyle = borderColor; ctx.lineWidth = (isHighlighted ? 1.8 : 1.1) * s;
  ctx.beginPath(); ctx.roundRect(x - boxW / 2, y - boxH / 2, boxW, boxH, 4 * s); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5 * s);
  ctx.restore();
}

function drawA4Overlay(ctx, a4Corners, a4Orientation, H_worldToImg, showGrid, invScale, selectedPin) {
  if (!a4Corners || a4Corners.length !== 4) return;
  const MathUtils = window.MeasurementHomographyMath || {};
  const isValid = MathUtils.isQuadStrictlyConvex ? MathUtils.isQuadStrictlyConvex(a4Corners) : true;
  const color = isValid ? '#38bdf8' : '#f43f5e';

  ctx.save();
  ctx.fillStyle = isValid ? 'rgba(56, 189, 248, 0.12)' : 'rgba(244, 63, 94, 0.22)';
  ctx.beginPath(); ctx.moveTo(a4Corners[0].x, a4Corners[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(a4Corners[i].x, a4Corners[i].y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 1.8 * invScale; ctx.stroke();

  const cx = (a4Corners[0].x + a4Corners[1].x + a4Corners[2].x + a4Corners[3].x) / 4;
  const cy = (a4Corners[0].y + a4Corners[1].y + a4Corners[2].y + a4Corners[3].y) / 4;
  const dim = (window.MeasurementCvDetector?.A4_DIMENSIONS || {})[a4Orientation] || { widthMm: 210, heightMm: 297, widthCm: 21, heightCm: 29.7 };
  const wDisp = dim.widthCm || (dim.widthMm ? dim.widthMm / 10 : 21);
  const hDisp = dim.heightCm || (dim.heightMm ? dim.heightMm / 10 : 29.7);
  drawBadge(ctx, cx, cy, isValid ? `A4 (${wDisp}×${hDisp} سم)` : '⚠️ زوايا متقاطعة!', color, invScale);

  a4Corners.forEach((pt, idx) => {
    const isSel = selectedPin?.type === 'a4' && selectedPin?.index === idx;
    drawFineCrosshairPin(ctx, pt.x, pt.y, color, String(idx + 1), invScale, isSel);
  });
  ctx.restore();
}

function drawMeasurementLines(ctx, measurements, activeId, unit, H_imgToWorld, invScale, selectedPin, opts = {}) {
  const MathUtils = window.MeasurementHomographyMath || {};
  (measurements || []).forEach((m, idx) => {
    if (!m.visible) return;
    const isSel = activeId === m.id;
    const hasCp = m.cp && (Math.hypot(m.cp.x - (m.p1.x + m.p2.x) / 2, m.cp.y - (m.p1.y + m.p2.y) / 2) > 3.5);
    const flatCm = H_imgToWorld && MathUtils.calculateTrueDistanceCm ?
      MathUtils.calculateTrueDistanceCm(H_imgToWorld, m.p1, m.p2, opts, hasCp ? m.cp : null) : 0;
    const finalVal = (flatCm * (m.isCircumference ? 2 : (m.multiplier || 1))) + (parseFloat(m.easeCm) || 0);
    const dispVal = unit === 'inch' ? `${(finalVal / 2.54).toFixed(2)}"` : `${finalVal.toFixed(1)} سم`;

    ctx.save();
    // Shadow & Base curve
    ctx.strokeStyle = 'rgba(11, 19, 43, 0.85)'; ctx.lineWidth = (isSel ? 4.5 : 3.2) * invScale; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(m.p1.x, m.p1.y);
    if (hasCp) ctx.quadraticCurveTo(m.cp.x, m.cp.y, m.p2.x, m.p2.y);
    else ctx.lineTo(m.p2.x, m.p2.y);
    ctx.stroke();

    // Colored stroke
    ctx.strokeStyle = m.color; ctx.lineWidth = (isSel ? 2.5 : 1.8) * invScale;
    ctx.beginPath(); ctx.moveTo(m.p1.x, m.p1.y);
    if (hasCp) ctx.quadraticCurveTo(m.cp.x, m.cp.y, m.p2.x, m.p2.y);
    else ctx.lineTo(m.p2.x, m.p2.y);
    ctx.stroke();

    // Control point dotted guide & handle when selected
    const cpPt = m.cp || { x: (m.p1.x + m.p2.x) / 2, y: (m.p1.y + m.p2.y) / 2 };
    if (isSel) {
      ctx.setLineDash([3 * invScale, 3 * invScale]); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1 * invScale;
      ctx.beginPath(); ctx.moveTo(m.p1.x, m.p1.y); ctx.lineTo(cpPt.x, cpPt.y); ctx.lineTo(m.p2.x, m.p2.y); ctx.stroke();
      ctx.setLineDash([]);
      const isCpSel = selectedPin?.type === 'measure' && selectedPin?.id === m.id && selectedPin?.end === 'cp';
      drawControlPointHandle(ctx, cpPt.x, cpPt.y, m.color, invScale, isCpSel);
    }

    // Endpoint Crosshairs
    [['p1', m.p1], ['p2', m.p2]].forEach(([endKey, pt]) => {
      const isPinSel = selectedPin?.type === 'measure' && selectedPin?.id === m.id && selectedPin?.end === endKey;
      drawFineCrosshairPin(ctx, pt.x, pt.y, m.color, null, invScale, isPinSel);
    });

    // Badge positioned at mid-curve (t = 0.5)
    const midX = hasCp ? (0.25 * m.p1.x + 0.5 * m.cp.x + 0.25 * m.p2.x) : (m.p1.x + m.p2.x) / 2;
    const midY = hasCp ? (0.25 * m.p1.y + 0.5 * m.cp.y + 0.25 * m.p2.y) : (m.p1.y + m.p2.y) / 2;
    const dx = m.p2.x - m.p1.x, dy = m.p2.y - m.p1.y, len = Math.hypot(dx, dy) || 1;
    const offsetDir = (idx % 2 === 0 ? 1 : -1) * (14 * invScale);
    const badgeX = midX - (dy / len) * offsetDir, badgeY = midY + (dx / len) * offsetDir;
    const curveTag = hasCp ? ' ⌒' : '';
    drawBadge(ctx, badgeX, badgeY, `${m.shortName || m.nameAr}${curveTag}: ${dispVal}`, m.color, invScale, isSel);
    ctx.restore();
  });
}

function drawMagnifierLoupe(ctx, canvas, processedCanvas, imgPt, targetInfo, zoom, panX, panY, loupePower = 8) {
  if (!loupePower || !imgPt || !processedCanvas?.width) return;
  const sxScreen = imgPt.x * zoom + panX, syScreen = imgPt.y * zoom + panY, r = 78;
  let lx = sxScreen - 110, ly = syScreen - 110;
  if (lx - r < 10) lx = sxScreen + 110;
  if (ly - r < 45) ly = syScreen + 110;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(lx, ly, r, 0, Math.PI * 2); ctx.fillStyle = '#0f172a'; ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(lx, ly, r - 3, 0, Math.PI * 2); ctx.clip();
  const sampleR = r / (zoom * loupePower);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(processedCanvas, imgPt.x - sampleR, imgPt.y - sampleR, sampleR * 2, sampleR * 2, lx - r, ly - r, r * 2, r * 2);

  // Sub-pixel 8x precision grid & reticle
  const accColor = targetInfo?.type === 'a4' ? '#38bdf8' : (targetInfo?.end === 'cp' ? '#f59e0b' : '#10b981');
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.lineWidth = 0.5;
  for (let d = -r; d <= r; d += 16) {
    ctx.beginPath(); ctx.moveTo(lx + d, ly - r); ctx.lineTo(lx + d, ly + r); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx - r, ly + d); ctx.lineTo(lx + r, ly + d); ctx.stroke();
  }
  ctx.strokeStyle = accColor; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(lx - r, ly); ctx.lineTo(lx + r, ly); ctx.moveTo(lx, ly - r); ctx.lineTo(lx, ly + r); ctx.stroke();
  ctx.beginPath(); ctx.arc(lx, ly, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = accColor; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(lx, ly, r, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function createAnnotatedExportCanvas(processedCanvas, a4Corners, a4Orientation, measurements, unit, H_imgToWorld, orderId, customerName, opts = {}) {
  if (!processedCanvas?.width) return null;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = processedCanvas.width; outCanvas.height = processedCanvas.height;
  const ctx = outCanvas.getContext('2d'); ctx.drawImage(processedCanvas, 0, 0);
  const invScale = Math.max(0.6, processedCanvas.width / 1100);
  drawA4Overlay(ctx, a4Corners, a4Orientation, null, false, invScale, null);
  drawMeasurementLines(ctx, measurements, null, unit, H_imgToWorld, invScale, null, opts);

  const bannerH = Math.max(34, Math.round(38 * invScale));
  ctx.save();
  ctx.fillStyle = 'rgba(17, 28, 56, 0.95)'; ctx.fillRect(0, 0, outCanvas.width, bannerH);
  ctx.fillStyle = '#ffffff'; ctx.font = `bold ${Math.round(12 * invScale)}px Cairo, sans-serif`;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(`استوديو مقاسات التفصيل (A4 Homography v2.5) | طلب: ${orderId || '---'} | الزبونة: ${customerName || '---'}`, outCanvas.width - 16 * invScale, bannerH / 2);
  ctx.restore();
  return outCanvas;
}

window.MeasurementCanvasDrawing = {
  drawFineCrosshairPin, drawControlPointHandle, drawBadge, drawA4Overlay,
  drawMeasurementLines, drawMagnifierLoupe, createAnnotatedExportCanvas
};
