// src/features/measurement/utils/measurementCvDetector.js
// Achromatic A4 Detector (<18 RGB diff), Geometric Quad Constraints & Garment Silhouette Pins
// Architecture Standard: Rule 1 & 2 (< 220 lines)

const A4_DIMENSIONS = {
  portrait: { widthMm: 210.0, heightMm: 297.0, widthCm: 21.0, heightCm: 29.7 },
  landscape: { widthMm: 297.0, heightMm: 210.0, widthCm: 29.7, heightCm: 21.0 }
};

const DEFAULT_MEASUREMENTS = [
  { id: 'chest', nameAr: 'الصدر (من الإبط للإبط)', shortName: 'الصدر', color: '#10b981', type: 'circumference', multiplier: 2, isCircumference: true, easeCm: 0, visible: true, isCustom: false, p1: { x: 380, y: 280 }, cp: { x: 500, y: 280 }, p2: { x: 620, y: 280 } },
  { id: 'waist', nameAr: 'الخصر', shortName: 'الخصر', color: '#f59e0b', type: 'circumference', multiplier: 2, isCircumference: true, easeCm: 0, visible: true, isCustom: false, p1: { x: 410, y: 400 }, cp: { x: 500, y: 400 }, p2: { x: 590, y: 400 } },
  { id: 'hip', nameAr: 'محيط الورك / الجيبون', shortName: 'الورك', color: '#6366f1', type: 'circumference', multiplier: 2, isCircumference: true, easeCm: 0, visible: true, isCustom: false, p1: { x: 330, y: 550 }, cp: { x: 500, y: 550 }, p2: { x: 670, y: 550 } },
  { id: 'shoulder', nameAr: 'عرض الكتف', shortName: 'عرض الكتف', color: '#38bdf8', type: 'linear', multiplier: 1, isCircumference: false, easeCm: 0, visible: true, isCustom: false, p1: { x: 420, y: 170 }, cp: { x: 500, y: 170 }, p2: { x: 580, y: 170 } },
  { id: 'bodice_length', nameAr: 'طول الصدر (من الكتف للخصر)', shortName: 'طول الصدر', color: '#ec4899', type: 'linear', multiplier: 1, isCircumference: false, easeCm: 0, visible: true, isCustom: false, p1: { x: 450, y: 170 }, cp: { x: 450, y: 285 }, p2: { x: 450, y: 400 } },
  { id: 'total_length', nameAr: 'الطول الكلي للفستان', shortName: 'الطول الكلي', color: '#a855f7', type: 'linear', multiplier: 1, isCircumference: false, easeCm: 0, visible: true, isCustom: false, p1: { x: 500, y: 170 }, cp: { x: 500, y: 460 }, p2: { x: 500, y: 750 } },
  { id: 'sleeve_armhole', nameAr: 'طول الكم / حردة الإبط', shortName: 'الكم / الإبط', color: '#fb7185', type: 'linear', multiplier: 1, isCircumference: false, easeCm: 0, visible: true, isCustom: false, p1: { x: 580, y: 170 }, cp: { x: 640, y: 240 }, p2: { x: 700, y: 310 } }
];

function isConvexQuad(corners) {
  if (!corners || corners.length !== 4) return false;
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const p1 = corners[i], p2 = corners[(i + 1) % 4], p3 = corners[(i + 2) % 4];
    const cross = (p2.x - p1.x) * (p3.y - p2.y) - (p2.y - p1.y) * (p3.x - p2.x);
    if (Math.abs(cross) < 1e-4) return false;
    const cur = cross > 0 ? 1 : -1;
    if (sign === 0) sign = cur; else if (cur !== sign) return false;
  }
  return true;
}

function checkQuadAngles(corners) {
  if (!corners || corners.length !== 4 || !isConvexQuad(corners)) return false;
  for (let i = 0; i < 4; i++) {
    const c = corners[i], prev = corners[(i + 3) % 4], next = corners[(i + 1) % 4];
    const dot = (prev.x - c.x) * (next.x - c.x) + (prev.y - c.y) * (next.y - c.y);
    const mag = Math.hypot(prev.x - c.x, prev.y - c.y) * Math.hypot(next.x - c.x, next.y - c.y);
    if (mag < 1e-4 || Math.abs(dot / mag) > 0.40) return false;
  }
  return true;
}

function findLocalEdgeSnap(pCanvas, cx, cy, radius = 6) {
  if (!pCanvas || !pCanvas.width) return { x: cx, y: cy, snapped: false };
  const W = pCanvas.width, H = pCanvas.height, ix = Math.round(cx), iy = Math.round(cy);
  if (ix - radius < 1 || ix + radius >= W - 1 || iy - radius < 1 || iy + radius >= H - 1) return { x: cx, y: cy, snapped: false };
  try {
    const ctx = pCanvas.getContext('2d', { willReadFrequently: true });
    const side = radius * 2 + 1;
    const imgData = ctx.getImageData(ix - radius, iy - radius, side, side).data;
    let maxGrad = 0, bestDx = 0, bestDy = 0;
    for (let r = 1; r < side - 1; r++) {
      for (let c = 1; c < side - 1; c++) {
        const getL = (row, col) => {
          const idx = (row * side + col) * 4;
          return 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
        };
        const gx = getL(r, c + 1) - getL(r, c - 1), gy = getL(r + 1, c) - getL(r - 1, c);
        const grad = Math.hypot(gx, gy);
        if (grad > maxGrad) { maxGrad = grad; bestDx = c - radius; bestDy = r - radius; }
      }
    }
    if (maxGrad > 42) {
      return { x: cx + bestDx * 0.6, y: cy + bestDy * 0.6, snapped: true, confidence: Math.min(1.0, maxGrad / 120) };
    }
  } catch (_) {}
  return { x: cx, y: cy, snapped: false };
}

function runLocalComputerVisionDetector(pCanvas) {
  if (!pCanvas || !pCanvas.width) return null;
  const W = pCanvas.width, H = pCanvas.height;
  const scale = Math.min(1, 380 / Math.max(W, H));
  const sW = Math.max(80, Math.round(W * scale)), sH = Math.max(80, Math.round(H * scale));

  const tCanvas = document.createElement('canvas');
  tCanvas.width = sW; tCanvas.height = sH;
  const tCtx = tCanvas.getContext('2d');
  tCtx.drawImage(pCanvas, 0, 0, sW, sH);
  const data = tCtx.getImageData(0, 0, sW, sH).data;

  // 1. Adaptive White-Balance & Luminance Paper Mask (Warm/Yellow home light support)
  let maxLum = 0;
  for (let i = 0; i < data.length; i += 16) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (l > maxLum) maxLum = l;
  }
  const minLumThreshold = Math.max(130, Math.min(160, Math.round(maxLum * 0.68)));

  const paperMask = new Uint8Array(sW * sH);
  for (let y = 0; y < sH; y++) {
    for (let x = 0; x < sW; x++) {
      const idx = (y * sW + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
      const sat = maxC === 0 ? 0 : ((maxC - minC) / maxC) * 100;
      const rgbDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
      // Adaptive Paper Filter: High luminance, neutral achromatic or warm light tolerance
      if (lum >= minLumThreshold && rgbDiff <= 28 && sat <= 22) paperMask[y * sW + x] = 1;
    }
  }

  // Clear outer boundary pixels connected to frame (floors/bedsheets)
  const borderQ = [];
  for (let x = 0; x < sW; x++) {
    const b = (sH - 1) * sW + x;
    if (paperMask[x] === 1) { paperMask[x] = 2; borderQ.push(x); }
    if (paperMask[b] === 1) { paperMask[b] = 2; borderQ.push(b); }
  }
  for (let y = 0; y < sH; y++) {
    const l = y * sW, r = y * sW + (sW - 1);
    if (paperMask[l] === 1) { paperMask[l] = 2; borderQ.push(l); }
    if (paperMask[r] === 1) { paperMask[r] = 2; borderQ.push(r); }
  }
  let head = 0;
  while (head < borderQ.length) {
    const curr = borderQ[head++];
    for (const n of [curr - 1, curr + 1, curr - sW, curr + sW]) {
      if (n >= 0 && n < sW * sH && paperMask[n] === 1) { paperMask[n] = 2; borderQ.push(n); }
    }
  }

  const visited = new Uint8Array(sW * sH);
  let bestPaper = null, bestScore = -1, totPx = sW * sH;
  const MathUtils = window.MeasurementHomographyMath || {};
  const Refiner = window.SubpixelCornerRefiner || {};

  for (let y = 3; y < sH - 3; y++) {
    for (let x = 3; x < sW - 3; x++) {
      const sIdx = y * sW + x;
      if (paperMask[sIdx] === 1 && !visited[sIdx]) {
        const queue = [sIdx], pts = [];
        let lumSum = 0, lumSqSum = 0;
        visited[sIdx] = 1;
        while (queue.length > 0) {
          const curr = queue.pop(), cy = Math.floor(curr / sW), cx = curr % sW;
          pts.push({ x: cx, y: cy });
          const pxIdx = curr * 4;
          const l = 0.299 * data[pxIdx] + 0.587 * data[pxIdx + 1] + 0.114 * data[pxIdx + 2];
          lumSum += l; lumSqSum += l * l;
          for (const n of [curr - 1, curr + 1, curr - sW, curr + sW]) {
            if (n >= 0 && n < totPx && paperMask[n] === 1 && !visited[n]) {
              visited[n] = 1; queue.push(n);
            }
          }
        }

        // Geometric Constraints: Min 2.5% area of canvas (rejects dress patches & artifacts)
        const areaRatio = pts.length / totPx;
        if (areaRatio >= 0.025 && areaRatio <= 0.38) {
          // Low texture variance check (paper is smooth, dress fabric has high variance)
          const meanL = lumSum / pts.length;
          const variance = (lumSqSum / pts.length) - (meanL * meanL);
          if (variance < 550) {
            let corners = Refiner.extract4EdgeSubpixelCorners ? Refiner.extract4EdgeSubpixelCorners(pts, sW, sH) : null;
            if (!corners && pts.length >= 40) {
              let minS = 1e9, maxS = -1e9, minD = 1e9, maxD = -1e9, tl = pts[0], br = pts[0], bl = pts[0], tr = pts[0];
              for (let i = 0; i < pts.length; i++) {
                const p = pts[i], s = p.x + p.y, d = p.x - p.y;
                if (s < minS) { minS = s; tl = p; } if (s > maxS) { maxS = s; br = p; }
                if (d < minD) { minD = d; bl = p; } if (d > maxD) { maxD = d; tr = p; }
              }
              corners = [tl, tr, br, bl];
            }
            if (corners && MathUtils.normalizeQuadCornersClockwise) {
              corners = MathUtils.normalizeQuadCornersClockwise(corners);
              const edges = [0, 1, 2, 3].map(i => Math.hypot(corners[(i + 1) % 4].x - corners[i].x, corners[(i + 1) % 4].y - corners[i].y) / scale);
              const minEdgeFullPx = Math.min(...edges);

              // Reject if shortest edge < 70 px or internal angles are not between 66° and 114°
              if (minEdgeFullPx >= 70 && checkQuadAngles(corners)) {
                const area = Math.max(1, MathUtils.computePolygonAreaShoelace ? MathUtils.computePolygonAreaShoelace(corners) : 1);
                const fillRatio = Math.min(1.15, pts.length / area);
                const avgW = (edges[0] + edges[2]) / 2, avgH = (edges[1] + edges[3]) / 2;
                const aspect = Math.max(avgW, avgH) / Math.max(1, Math.min(avgW, avgH));

                if (fillRatio > 0.60 && aspect >= 1.15 && aspect <= 1.85) {
                  const score = pts.length * (fillRatio ** 2) / (1 + Math.abs(aspect - 1.414) * 2.0);
                  if (score > bestScore) { bestScore = score; bestPaper = { corners }; }
                }
              }
            }
          }
        }
      }
    }
  }

  let detectedA4 = null, orient = 'portrait';
  if (bestPaper && bestPaper.corners) {
    const scaledCorners = bestPaper.corners.map(pt => ({ x: pt.x / scale, y: pt.y / scale }));
    detectedA4 = Refiner.refineAllA4CornersSubpixel ? Refiner.refineAllA4CornersSubpixel(pCanvas, scaledCorners, 15) : scaledCorners;
    const tw = Math.hypot(detectedA4[1].x - detectedA4[0].x, detectedA4[1].y - detectedA4[0].y);
    const sh = Math.hypot(detectedA4[3].x - detectedA4[0].x, detectedA4[3].y - detectedA4[0].y);
    orient = tw > sh * 1.08 ? 'landscape' : 'portrait';
  }

  return { a4Corners: detectedA4, a4Orientation: orient };
}

window.MeasurementCvDetector = {
  A4_DIMENSIONS,
  DEFAULT_MEASUREMENTS,
  isConvexQuad,
  checkQuadAngles,
  findLocalEdgeSnap,
  runLocalComputerVisionDetector
};
