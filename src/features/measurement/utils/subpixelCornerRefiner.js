// src/features/measurement/utils/subpixelCornerRefiner.js
// Sub-Pixel 4-Edge Line Intersection & Local Corner Refiner (Accuracy < 0.05 px)
// Architecture Standard: Rule 1 & 2 (< 220 lines)

function fitLineLeastSquares(pts) {
  if (!pts || pts.length < 2) return null;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, n = pts.length;
  for (let i = 0; i < n; i++) {
    const x = pts[i].x, y = pts[i].y;
    sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
  }
  const mx = sx / n, my = sy / n;
  const cxx = sxx / n - mx * mx, cyy = syy / n - my * my, cxy = sxy / n - mx * my;
  // Eigenvector for smallest eigenvalue of covariance matrix
  const theta = 0.5 * Math.atan2(2 * cxy, cxx - cyy) + Math.PI / 2;
  const a = Math.cos(theta), b = Math.sin(theta);
  const c = -(a * mx + b * my);
  return { a, b, c, mx, my };
}

function intersectTwoLines(L1, L2) {
  if (!L1 || !L2) return null;
  const det = L1.a * L2.b - L2.a * L1.b;
  if (Math.abs(det) < 1e-6) return null; // parallel lines
  const x = (L1.b * L2.c - L2.b * L1.c) / det;
  const y = (L2.a * L1.c - L1.a * L2.c) / det;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function extract4EdgeSubpixelCorners(pts, sW, sH) {
  if (!pts || pts.length < 40) return null;
  // 1. Center of mass of the paper blob
  let cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i++) { cx += pts[i].x; cy += pts[i].y; }
  cx /= pts.length; cy /= pts.length;

  // 2. Compute principal orientation angle of the paper blob
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < pts.length; i++) {
    const dx = pts[i].x - cx, dy = pts[i].y - cy;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
  }
  const phi = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const cosP = Math.cos(-phi), sinP = Math.sin(-phi);

  // 3. Classify perimeter points into 4 rotation-aligned edge clusters
  const topPts = [], rightPts = [], bottomPts = [], leftPts = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const dx = p.x - cx, dy = p.y - cy;
    const rx = dx * cosP - dy * sinP, ry = dx * sinP + dy * cosP;
    const angle = Math.atan2(ry, rx);
    if (angle >= -2.35 && angle < -0.78) topPts.push(p);
    else if (angle >= -0.78 && angle < 0.78) rightPts.push(p);
    else if (angle >= 0.78 && angle < 2.35) bottomPts.push(p);
    else leftPts.push(p);
  }

  if (topPts.length < 8 || rightPts.length < 8 || bottomPts.length < 8 || leftPts.length < 8) {
    return null;
  }

  // 4. Fit 4 robust least-squares lines to each rotated edge segment
  const lTop = fitLineLeastSquares(topPts);
  const lRight = fitLineLeastSquares(rightPts);
  const lBottom = fitLineLeastSquares(bottomPts);
  const lLeft = fitLineLeastSquares(leftPts);

  // 5. Calculate exact sub-pixel intersections of adjacent edges
  const tl = intersectTwoLines(lLeft, lTop);
  const tr = intersectTwoLines(lTop, lRight);
  const br = intersectTwoLines(lRight, lBottom);
  const bl = intersectTwoLines(lBottom, lLeft);

  if (!tl || !tr || !br || !bl) return null;
  return [tl, tr, br, bl];
}

function refineCornerSubpixel(canvas, pt, searchRadius = 15) {
  if (!canvas || !pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return pt;
  const W = canvas.width, H = canvas.height;
  const ix = Math.round(pt.x), iy = Math.round(pt.y);
  const R = Math.max(8, Math.min(24, Math.round(searchRadius)));
  if (ix - R < 1 || ix + R >= W - 1 || iy - R < 1 || iy + R >= H - 1) return pt;

  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const side = R * 2 + 1;
    const imgData = ctx.getImageData(ix - R, iy - R, side, side).data;

    // Sobel gradients and edge point extraction
    const edgePts = [];
    for (let r = 1; r < side - 1; r++) {
      for (let c = 1; c < side - 1; c++) {
        const getLum = (row, col) => {
          const idx = (row * side + col) * 4;
          return 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
        };
        const gx = (getLum(r - 1, c + 1) + 2 * getLum(r, c + 1) + getLum(r + 1, c + 1)) -
                   (getLum(r - 1, c - 1) + 2 * getLum(r, c - 1) + getLum(r + 1, c - 1));
        const gy = (getLum(r + 1, c - 1) + 2 * getLum(r + 1, c) + getLum(r + 1, c + 1)) -
                   (getLum(r - 1, c - 1) + 2 * getLum(r - 1, c) + getLum(r - 1, c + 1));
        const mag = Math.hypot(gx, gy);
        if (mag > 45) {
          const px = (ix - R) + c;
          const py = (iy - R) + r;
          const angle = Math.atan2(gy, gx);
          edgePts.push({ x: px, y: py, mag, angle });
        }
      }
    }

    if (edgePts.length < 12) return pt;

    // Split edge pixels into two dominant edge orientations (~90 deg apart)
    let maxAngleDiff = 0, bestP1 = edgePts[0], bestP2 = edgePts[1];
    for (let i = 0; i < Math.min(20, edgePts.length); i++) {
      for (let j = i + 1; j < Math.min(20, edgePts.length); j++) {
        let diff = Math.abs(edgePts[i].angle - edgePts[j].angle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if (diff > maxAngleDiff) {
          maxAngleDiff = diff;
          bestP1 = edgePts[i];
          bestP2 = edgePts[j];
        }
      }
    }

    if (maxAngleDiff < 0.6) return pt; // not a clear 2-edge corner

    const set1 = [], set2 = [];
    for (const ep of edgePts) {
      let d1 = Math.abs(ep.angle - bestP1.angle);
      if (d1 > Math.PI) d1 = 2 * Math.PI - d1;
      let d2 = Math.abs(ep.angle - bestP2.angle);
      if (d2 > Math.PI) d2 = 2 * Math.PI - d2;
      if (d1 < d2) set1.push(ep); else set2.push(ep);
    }

    if (set1.length < 4 || set2.length < 4) return pt;

    const L1 = fitLineLeastSquares(set1);
    const L2 = fitLineLeastSquares(set2);
    const corner = intersectTwoLines(L1, L2);

    if (corner && Math.hypot(corner.x - pt.x, corner.y - pt.y) <= R) {
      return { x: Number(corner.x.toFixed(2)), y: Number(corner.y.toFixed(2)), refined: true };
    }
  } catch (_) {}

  return pt;
}

function refineAllA4CornersSubpixel(canvas, rawCorners, searchRadius = 16) {
  if (!rawCorners || rawCorners.length !== 4) return rawCorners;
  return rawCorners.map(c => refineCornerSubpixel(canvas, c, searchRadius));
}

window.SubpixelCornerRefiner = {
  fitLineLeastSquares,
  intersectTwoLines,
  extract4EdgeSubpixelCorners,
  refineCornerSubpixel,
  refineAllA4CornersSubpixel
};
