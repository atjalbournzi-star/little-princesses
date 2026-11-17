// src/features/measurement/utils/garmentLandmarkDetector.js
// Garment Silhouette Segmentation & Anatomical Landmark Detection
// Architecture Standard: Rule 1 & 2 (< 220 lines, zero hardcoded dummies)

function isPointInPolyWithMargin(pt, poly, margin = 8) {
  if (!poly || poly.length < 3) return false;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    if (poly[i].x < minX) minX = poly[i].x; if (poly[i].x > maxX) maxX = poly[i].x;
    if (poly[i].y < minY) minY = poly[i].y; if (poly[i].y > maxY) maxY = poly[i].y;
  }
  if (pt.x < minX - margin || pt.x > maxX + margin || pt.y < minY - margin || pt.y > maxY + margin) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function detectGarmentLandmarks(pCanvas, a4Corners, existingMeasurements = []) {
  if (!pCanvas || !pCanvas.width || !pCanvas.height) return existingMeasurements;
  const W = pCanvas.width, H = pCanvas.height;
  const scale = Math.min(1, 380 / Math.max(W, H));
  const sW = Math.max(60, Math.round(W * scale)), sH = Math.max(60, Math.round(H * scale));

  const tCanvas = document.createElement('canvas');
  tCanvas.width = sW; tCanvas.height = sH;
  const tCtx = tCanvas.getContext('2d');
  tCtx.drawImage(pCanvas, 0, 0, sW, sH);
  const data = tCtx.getImageData(0, 0, sW, sH).data;

  // 1. Multi-Corner Background Sampling (Immunity to Carpet Patterns)
  let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
  const cSz = Math.max(4, Math.round(Math.min(sW, sH) * 0.08));
  for (let y = 0; y < sH; y++) {
    for (let x = 0; x < sW; x++) {
      if ((x < cSz || x >= sW - cSz) && (y < cSz || y >= sH - cSz)) {
        const idx = (y * sW + x) * 4;
        bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2];
        bgCount++;
      }
    }
  }
  bgR /= Math.max(1, bgCount); bgG /= Math.max(1, bgCount); bgB /= Math.max(1, bgCount);

  // 2. Garment Core Sampling (Excluding A4 polygon)
  const scaledA4 = (a4Corners || []).map(p => ({ x: p.x * scale, y: p.y * scale }));
  let cR = 0, cG = 0, cB = 0, cCount = 0;
  for (let y = Math.round(sH * 0.25); y < Math.round(sH * 0.75); y++) {
    for (let x = Math.round(sW * 0.25); x < Math.round(sW * 0.75); x++) {
      if (scaledA4.length === 4 && isPointInPolyWithMargin({ x, y }, scaledA4, 8)) continue;
      const idx = (y * sW + x) * 4;
      cR += data[idx]; cG += data[idx + 1]; cB += data[idx + 2];
      cCount++;
    }
  }
  cR /= Math.max(1, cCount); cG /= Math.max(1, cCount); cB /= Math.max(1, cCount);

  // 3. Strict Garment Saliency Mask
  const rawMask = new Uint8Array(sW * sH);
  for (let y = 1; y < sH - 1; y++) {
    for (let x = 1; x < sW - 1; x++) {
      if (scaledA4.length === 4 && isPointInPolyWithMargin({ x, y }, scaledA4, 8)) continue;
      const idx = (y * sW + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const distBg = Math.hypot(r - bgR, g - bgG, b - bgB);
      const distCore = Math.hypot(r - cR, g - cG, b - cB);
      if (distCore <= 52 && (distCore < distBg * 0.85 || distBg > 32)) rawMask[y * sW + x] = 1;
    }
  }

  // 4. Connected Component Analysis (Keep Largest Central Mass)
  const visited = new Uint8Array(sW * sH);
  let bestBlob = [], maxBlobSize = 0;
  for (let y = 1; y < sH - 1; y++) {
    for (let x = 1; x < sW - 1; x++) {
      const idx = y * sW + x;
      if (rawMask[idx] === 1 && !visited[idx]) {
        const queue = [idx], blob = [];
        visited[idx] = 1;
        while (queue.length > 0) {
          const curr = queue.pop(); blob.push(curr);
          for (const n of [curr - 1, curr + 1, curr - sW, curr + sW]) {
            if (n >= 0 && n < sW * sH && rawMask[n] === 1 && !visited[n]) {
              visited[n] = 1; queue.push(n);
            }
          }
        }
        if (blob.length > maxBlobSize) { maxBlobSize = blob.length; bestBlob = blob; }
      }
    }
  }

  const mask = new Uint8Array(sW * sH);
  let bMinX = sW, bMaxX = 0, bMinY = sH, bMaxY = 0;
  bestBlob.forEach(idx => {
    mask[idx] = 1;
    const px = idx % sW, py = Math.floor(idx / sW);
    if (px < bMinX) bMinX = px; if (px > bMaxX) bMaxX = px;
    if (py < bMinY) bMinY = py; if (py > bMaxY) bMaxY = py;
  });

  const hasGoodBlob = bestBlob.length >= sW * sH * 0.03 && (bMaxY - bMinY) >= sH * 0.20;
  let minY = hasGoodBlob ? bMinY : Math.round(sH * 0.15);
  let maxY = hasGoodBlob ? bMaxY : Math.round(sH * 0.85);
  let minX = hasGoodBlob ? bMinX : Math.round(sW * 0.25);
  let maxX = hasGoodBlob ? bMaxX : Math.round(sW * 0.75);

  const profile = [];
  let maxW = 0;
  for (let y = minY; y <= maxY; y++) {
    let rMin = sW, rMax = 0, count = 0;
    for (let x = minX; x <= maxX; x++) {
      if (mask[y * sW + x] === 1) { count++; if (x < rMin) rMin = x; if (x > rMax) rMax = x; }
    }
    if (count > maxW) maxW = count;
    profile[y] = { count, minX: rMin <= rMax ? rMin : minX, maxX: rMax >= rMin ? rMax : maxX, width: rMax >= rMin ? (rMax - rMin) : 0 };
  }

  // Filter noise rows at extreme top/bottom
  if (hasGoodBlob && maxW > 0) {
    while (minY < maxY && (profile[minY]?.count || 0) < maxW * 0.12) minY++;
    while (maxY > minY && (profile[maxY]?.count || 0) < maxW * 0.12) maxY--;
  }

  const dressH = maxY - minY;
  let sumAxisX = 0, axisCount = 0;
  for (let y = Math.round(minY + dressH * 0.15); y <= Math.round(minY + dressH * 0.45); y++) {
    if (profile[y]?.width > 0) { sumAxisX += (profile[y].minX + profile[y].maxX) / 2; axisCount++; }
  }
  const centralAxisX = axisCount > 0 ? (sumAxisX / axisCount) : ((minX + maxX) / 2);

  const yShoulder = Math.round(minY + dressH * 0.10);
  const yChest = Math.round(minY + dressH * 0.24);
  let yWaist = Math.round(minY + dressH * 0.40), minWaistW = Infinity;
  for (let y = Math.round(minY + dressH * 0.32); y <= Math.round(minY + dressH * 0.48); y++) {
    const w = profile[y]?.width || Infinity;
    if (w < minWaistW) { minWaistW = w; yWaist = y; }
  }
  const yHip = Math.round(yWaist + (maxY - yWaist) * 0.28);

  const getHalfW = (y, fallbackRatio) => {
    const row = profile[y];
    const raw = (row && row.width > sW * 0.08) ? row.width / 2 : (dressH * fallbackRatio);
    return Math.max(sW * 0.06, Math.min(sW * 0.45, raw));
  };

  const chH = getHalfW(yChest, 0.24);
  const shH = Math.min(getHalfW(yShoulder, 0.20), chH * 1.05);
  const wH = Math.min(getHalfW(yWaist, 0.18), chH * 0.90);
  const hH = Math.max(getHalfW(yHip, 0.30), wH * 1.20);

  const clampX = (x) => Math.max(minX, Math.min(maxX, Math.round(x)));
  const toFull = (sx, sy) => ({ x: Math.round(sx / scale), y: Math.round(sy / scale) });

  const landmarks = {
    shoulder: { p1: toFull(clampX(centralAxisX - shH), yShoulder), p2: toFull(clampX(centralAxisX + shH), yShoulder) },
    chest: { p1: toFull(clampX(centralAxisX - chH), yChest), p2: toFull(clampX(centralAxisX + chH), yChest) },
    waist: { p1: toFull(clampX(centralAxisX - wH), yWaist), p2: toFull(clampX(centralAxisX + wH), yWaist) },
    hip: { p1: toFull(clampX(centralAxisX - hH), yHip), p2: toFull(clampX(centralAxisX + hH), yHip) },
    bodice_length: { p1: toFull(clampX(centralAxisX - shH * 0.45), yShoulder), p2: toFull(clampX(centralAxisX - shH * 0.45), yWaist) },
    total_length: { p1: toFull(centralAxisX, minY), p2: toFull(centralAxisX, maxY) },
    sleeve_armhole: { p1: toFull(clampX(centralAxisX + shH), yShoulder), p2: toFull(clampX(centralAxisX + chH), yChest) }
  };

  const template = (existingMeasurements && existingMeasurements.length >= 7)
    ? existingMeasurements
    : (window.MeasurementCvDetector?.DEFAULT_MEASUREMENTS || []);

  return template.map(m => {
    const l = landmarks[m.id];
    if (!l) return m;
    const cp = { x: Math.round((l.p1.x + l.p2.x) / 2), y: Math.round((l.p1.y + l.p2.y) / 2) };
    return { ...m, p1: l.p1, p2: l.p2, cp };
  });
}

window.GarmentLandmarkDetector = {
  detectGarmentLandmarks
};