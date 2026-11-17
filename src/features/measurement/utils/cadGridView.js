// src/features/measurement/utils/cadGridView.js
// 90° Orthographic CAD Grid View & Backdrop Dimmer for Perspective Rectification
// Architecture Standard: Rule 1 & 2 (< 220 lines)

function drawBackdropDimmer(ctx, width, height) {
  if (!ctx || !width || !height) return;
  ctx.save();
  ctx.fillStyle = 'rgba(9, 13, 22, 0.80)';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawCadPerspectiveGrid(ctx, width, height, H_w2i, MathUtils, unit = 'cm') {
  if (!ctx || !H_w2i || !MathUtils?.applyHomographyPoint) return;
  const project = (xMm, yMm) => MathUtils.applyHomographyPoint(H_w2i, { x: xMm, y: yMm });

  ctx.save();
  // Physical floor bounds in mm around the calibrated origin
  const xMin = -400, xMax = 1100, xStep = 50;
  const yMin = -300, yMax = 1600, yStep = 50;

  // 1. Draw Vertical (Y-aligned) physical grid lines
  for (let xMm = xMin; xMm <= xMax; xMm += xStep) {
    const isMajor = xMm % 100 === 0;
    const p1 = project(xMm, yMin), p2 = project(xMm, yMax);
    if (p1 && p2 && Number.isFinite(p1.x) && Number.isFinite(p2.x)) {
      ctx.strokeStyle = isMajor ? 'rgba(20, 184, 166, 0.45)' : 'rgba(14, 165, 233, 0.16)';
      ctx.lineWidth = isMajor ? 1.2 : 0.6;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      if (isMajor && p1.y >= -20 && p1.y <= height + 20) {
        const valDisp = unit === 'inch' ? `${(xMm / 25.4).toFixed(0)}"` : `${xMm / 10}cm`;
        ctx.fillStyle = 'rgba(45, 212, 191, 0.75)';
        ctx.font = '8.5px monospace';
        ctx.fillText(valDisp, p1.x + 2, Math.max(12, p1.y + 10));
      }
    }
  }

  // 2. Draw Horizontal (X-aligned) physical grid lines
  for (let yMm = yMin; yMm <= yMax; yMm += yStep) {
    const isMajor = yMm % 100 === 0;
    const p1 = project(xMin, yMm), p2 = project(xMax, yMm);
    if (p1 && p2 && Number.isFinite(p1.x) && Number.isFinite(p2.x)) {
      ctx.strokeStyle = isMajor ? 'rgba(20, 184, 166, 0.45)' : 'rgba(14, 165, 233, 0.16)';
      ctx.lineWidth = isMajor ? 1.2 : 0.6;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      if (isMajor && p1.x >= -20 && p1.x <= width + 20) {
        const valDisp = unit === 'inch' ? `${(yMm / 25.4).toFixed(0)}"` : `${yMm / 10}cm`;
        ctx.fillStyle = 'rgba(45, 212, 191, 0.75)';
        ctx.font = '8.5px monospace';
        ctx.fillText(valDisp, Math.max(6, p1.x + 3), p1.y - 2);
      }
    }
  }

  // 3. Physical Metric CAD Origin & Reference Axes (0,0)
  const o = project(0, 0), axX = project(120, 0), axY = project(0, 120);
  if (o && axX && axY) {
    // X axis (Red/Amber)
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(axX.x, axX.y); ctx.stroke();
    // Y axis (Teal)
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(axY.x, axY.y); ctx.stroke();
    // Origin Center Point
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(o.x, o.y, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 9px monospace'; ctx.fillText('CAD (0,0)', o.x + 5, o.y - 5);
  }

  ctx.restore();
}

window.MeasurementCadGridView = {
  drawBackdropDimmer,
  drawCadPerspectiveGrid
};
