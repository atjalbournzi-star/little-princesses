// src/features/measurement/utils/centerlineSnap.js
// Garment Centerline, 90° Orthogonal Snap & Floor Plane Alignment Guide
// Architecture Standard: Rule 1 & 2 (< 220 lines)

function computeGarmentCenterline(measurements, imgW = 1000, imgH = 1000) {
  if (!Array.isArray(measurements)) {
    return { top: { x: imgW * 0.5, y: imgH * 0.18 }, bottom: { x: imgW * 0.5, y: imgH * 0.82 } };
  }
  const shoulder = measurements.find(m => m.id === 'shoulder');
  const totalLen = measurements.find(m => m.id === 'total_length');
  const chest = measurements.find(m => m.id === 'chest');
  const waist = measurements.find(m => m.id === 'waist');

  let top = null, bottom = null;
  if (totalLen && totalLen.p1 && totalLen.p2) {
    top = { ...totalLen.p1 };
    bottom = { ...totalLen.p2 };
  } else if (shoulder && shoulder.p1 && shoulder.p2) {
    top = { x: (shoulder.p1.x + shoulder.p2.x) / 2, y: (shoulder.p1.y + shoulder.p2.y) / 2 };
  }

  if (!bottom) {
    if (waist && waist.p1 && waist.p2) {
      const wMid = { x: (waist.p1.x + waist.p2.x) / 2, y: (waist.p1.y + waist.p2.y) / 2 };
      bottom = { x: wMid.x, y: wMid.y + (imgH * 0.35) };
    } else {
      bottom = { x: imgW * 0.5, y: imgH * 0.85 };
    }
  }
  if (!top) top = { x: bottom.x, y: imgH * 0.18 };

  return { top, bottom };
}

function applyPerpendicularLock(m, centerline) {
  if (!m || !centerline || !centerline.top || !centerline.bottom) return m;

  // Only apply to transverse / horizontal cross measurements
  const crossTypes = ['chest', 'waist', 'hip', 'shoulder'];
  if (!crossTypes.includes(m.id) && m.type !== 'circumference') return m;

  // Garment centerline unit vector in image space
  const cDx = centerline.bottom.x - centerline.top.x;
  const cDy = centerline.bottom.y - centerline.top.y;
  const cLen = Math.hypot(cDx, cDy);
  if (cLen < 1e-4) return m;
  const uX = cDx / cLen, uY = cDy / cLen;

  // Perpendicular normal vector (90 degrees)
  const nX = -uY, nY = uX;

  // Current midpoint and full span width
  const midX = (m.p1.x + m.p2.x) / 2;
  const midY = (m.p1.y + m.p2.y) / 2;
  const halfDist = Math.max(25, Math.hypot(m.p2.x - m.p1.x, m.p2.y - m.p1.y) / 2);

  // Re-orient symmetrically along perpendicular normal, strictly preserving full width!
  const newP1 = { x: Math.round((midX - halfDist * nX) * 10) / 10, y: Math.round((midY - halfDist * nY) * 10) / 10 };
  const newP2 = { x: Math.round((midX + halfDist * nX) * 10) / 10, y: Math.round((midY + halfDist * nY) * 10) / 10 };

  return {
    ...m,
    p1: newP1,
    p2: newP2,
    cp: m.cp ? { x: Math.round(((newP1.x + newP2.x) / 2) * 10) / 10, y: Math.round(((newP1.y + newP2.y) / 2) * 10) / 10 } : m.cp
  };
}

function calculateImageResolutionMmPerPx(H_i2w, a4Corners, a4Orientation = 'portrait') {
  if (!a4Corners || a4Corners.length !== 4) return { mmPerPx: null, label: '--', grade: 'unknown' };
  const topPx = Math.hypot(a4Corners[1].x - a4Corners[0].x, a4Corners[1].y - a4Corners[0].y);
  const sidePx = Math.hypot(a4Corners[3].x - a4Corners[0].x, a4Corners[3].y - a4Corners[0].y);
  const avgPx = (topPx + sidePx) / 2;

  const wMm = a4Orientation === 'landscape' ? 297.0 : 210.0;
  const hMm = a4Orientation === 'landscape' ? 210.0 : 297.0;
  const avgMm = (wMm + hMm) / 2;

  const mmPerPx = avgPx > 0 ? (avgMm / avgPx) : 0;
  const val = Number(mmPerPx.toFixed(2));

  let grade = 'optimal', label = 'دقة مجهرية ممتازة';
  if (val < 0.45) { grade = 'ultra'; label = 'دقة مجهرية فائقة (<0.45 مم/px)'; }
  else if (val <= 0.85) { grade = 'optimal'; label = 'دقة قياسية مثالية (0.45-0.85 مم/px)'; }
  else if (val <= 1.30) { grade = 'moderate'; label = 'دقة مقبولة (0.85-1.3 مم/px)'; }
  else { grade = 'low'; label = 'دقة منخفضة (الصورة بعيدة عن الفستان)'; }

  return { mmPerPx: val, label, grade };
}

function evaluateFloorPlaneParallelism(line1, line2, H_i2w) {
  const MathUtils = window.MeasurementHomographyMath || {};
  const applyH = MathUtils.applyHomographyPoint;
  if (!line1 || !line2 || !H_i2w || !applyH) return { isParallel: false, angleDiffDeg: null };

  const p1W = applyH(H_i2w, line1.p1), p2W = applyH(H_i2w, line1.p2);
  const q1W = applyH(H_i2w, line2.p1), q2W = applyH(H_i2w, line2.p2);
  if (!p1W || !p2W || !q1W || !q2W) return { isParallel: false, angleDiffDeg: null };

  const a1 = Math.atan2(p2W.y - p1W.y, p2W.x - p1W.x);
  const a2 = Math.atan2(q2W.y - q1W.y, q2W.x - q1W.x);
  let diff = Math.abs((a1 - a2) * (180 / Math.PI));
  if (diff > 180) diff = 360 - diff;
  if (diff > 90) diff = Math.abs(180 - diff);

  return {
    isParallel: diff < 2.0,
    angleDiffDeg: Number(diff.toFixed(2)),
    statusText: diff < 2.0 ? 'أرضية متوازية ومستوية 100%' : `انحراف في استواء الأرضية (${diff.toFixed(1)}°)`
  };
}

window.CenterlineSnap = {
  computeGarmentCenterline,
  applyPerpendicularLock,
  calculateImageResolutionMmPerPx,
  evaluateFloorPlaneParallelism
};
