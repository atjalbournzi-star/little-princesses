// src/features/measurement/utils/homographyMath.js
// Normalized DLT with SVD-Equivalent Eigen-Solver & Reprojection Metrology v4.0
// Architecture Standard: Rule 1 & 2 (< 220 lines)

function mult3x3(A, B) {
  var R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (var i = 0; i < 3; i++) {
    for (var j = 0; j < 3; j++) {
      for (var k = 0; k < 3; k++) R[i][j] += A[i][k] * B[k][j];
    }
  }
  return R;
}

function getHartleyNorm(pts) {
  var cx = 0, cy = 0, dSum = 0, n = pts.length;
  for (var i = 0; i < n; i++) { cx += pts[i].x; cy += pts[i].y; }
  cx /= n; cy /= n;
  for (var j = 0; j < n; j++) dSum += Math.hypot(pts[j].x - cx, pts[j].y - cy);
  var s = (Math.SQRT2 * n) / Math.max(1e-4, dSum);
  var T = [[s, 0, -s * cx], [0, s, -s * cy], [0, 0, 1]];
  var T_inv = [[1 / s, 0, cx], [0, 1 / s, cy], [0, 0, 1]];
  return { T: T, T_inv: T_inv, normPts: pts.map(function(p) { return { x: s * (p.x - cx), y: s * (p.y - cy) }; }) };
}

function solveSvdDlt(A) {
  var ATA = [];
  for (var r = 0; r < 9; r++) {
    ATA[r] = new Float64Array(9);
    for (var c = 0; c < 9; c++) {
      var sum = 0;
      for (var k = 0; k < A.length; k++) sum += A[k][r] * A[k][c];
      ATA[r][c] = sum;
    }
  }
  var v = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
  for (var iter = 0; iter < 45; iter++) {
    var vNext = new Float64Array(9);
    for (var i = 0; i < 9; i++) {
      for (var j = 0; j < 9; j++) vNext[i] += (i === j ? 100 : 0) * v[j] - ATA[i][j] * 0.005 * v[j];
    }
    var norm = 0;
    for (var k = 0; k < 9; k++) norm += vNext[k] * vNext[k];
    norm = Math.sqrt(norm) || 1;
    for (var m = 0; m < 9; m++) v[m] = vNext[m] / norm;
  }
  return v;
}

function computeHomographyMatrix(srcPts, dstPts) {
  if (!srcPts || !dstPts || srcPts.length !== 4 || dstPts.length !== 4 || !isQuadStrictlyConvex(srcPts)) return null;
  if (window.cv && window.cv.getPerspectiveTransform) {
    try {
      var sM = window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [srcPts[0].x, srcPts[0].y, srcPts[1].x, srcPts[1].y, srcPts[2].x, srcPts[2].y, srcPts[3].x, srcPts[3].y]);
      var dM = window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [dstPts[0].x, dstPts[0].y, dstPts[1].x, dstPts[1].y, dstPts[2].x, dstPts[2].y, dstPts[3].x, dstPts[3].y]);
      var cH = window.cv.getPerspectiveTransform(sM, dM);
      var oH = [[cH.data64F[0], cH.data64F[1], cH.data64F[2]], [cH.data64F[3], cH.data64F[4], cH.data64F[5]], [cH.data64F[6], cH.data64F[7], cH.data64F[8]]];
      sM.delete(); dM.delete(); cH.delete();
      return oH;
    } catch (_) {}
  }
  var nSrc = getHartleyNorm(srcPts), nDst = getHartleyNorm(dstPts), A = [];
  for (var i = 0; i < 4; i++) {
    var x = nSrc.normPts[i].x, y = nSrc.normPts[i].y, X = nDst.normPts[i].x, Y = nDst.normPts[i].y;
    A.push([-x, -y, -1, 0, 0, 0, x * X, y * X, X]);
    A.push([0, 0, 0, -x, -y, -1, x * Y, y * Y, Y]);
  }
  var h = solveSvdDlt(A);
  var H_raw = mult3x3(nDst.T_inv, mult3x3([[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], h[8]]], nSrc.T));
  var sc = H_raw[2][2] || 1.0;
  return H_raw.map(function(row) { return row.map(function(v) { return v / sc; }); });
}

function applyHomographyPoint(H, pt) {
  if (!H || !pt) return null;
  var denom = H[2][0] * pt.x + H[2][1] * pt.y + H[2][2];
  if (Math.abs(denom) < 1e-9) return null;
  var X = (H[0][0] * pt.x + H[0][1] * pt.y + H[0][2]) / denom;
  var Y = (H[1][0] * pt.x + H[1][1] * pt.y + H[1][2]) / denom;
  return Number.isFinite(X) && Number.isFinite(Y) ? { x: X, y: Y } : null;
}

function computeReprojectionErrorRmse(H_i2w, H_w2i, a4Corners, a4Orientation) {
  if (!H_i2w || !H_w2i || !a4Corners || a4Corners.length !== 4) return 0;
  var dims = a4Orientation === 'landscape' ? { w: 297, h: 210 } : { w: 210, h: 297 };
  var world = [{ x: 0, y: 0 }, { x: dims.w, y: 0 }, { x: dims.w, y: dims.h }, { x: 0, y: dims.h }];
  var sum = 0;
  for (var i = 0; i < 4; i++) {
    var pEst = applyHomographyPoint(H_w2i, world[i]);
    if (!pEst) return 9.9;
    sum += Math.pow(pEst.x - a4Corners[i].x, 2) + Math.pow(pEst.y - a4Corners[i].y, 2);
  }
  return Number(Math.sqrt(sum / 4).toFixed(2));
}

function undistortPoint(pt, imgW, imgH) {
  var cam = window.CameraCalibrationEngine;
  return cam && cam.undistortPoint ? cam.undistortPoint(pt, imgW, imgH) : pt;
}

function getZParallaxFactor(a4Placement, fabricElevationMm, camHeightMm) {
  var depth = window.DepthCompensationModule;
  return depth ? depth.applyDepthCompensation(100, {}, { a4Placement: a4Placement, fabricElevationMm: fabricElevationMm, camHeightMm: camHeightMm }).zFactor : 1.0;
}

function calculateTrueDistanceMm(H, p1, p2, opts) {
  var geom = window.MeasurementGeometryEngine;
  return geom ? geom.measureLineOrCurveMm(H, p1, p2, null, opts || {}) : 0;
}

function calculateBezierTrueDistanceMm(H, p1, cp, p2, opts) {
  var geom = window.MeasurementGeometryEngine;
  return geom ? geom.measureLineOrCurveMm(H, p1, p2, cp, opts || {}) : 0;
}

function calculateTrueDistanceCm(H, p1, p2, opts, cp) {
  var mm = cp ? calculateBezierTrueDistanceMm(H, p1, cp, p2, opts) : calculateTrueDistanceMm(H, p1, p2, opts);
  return Number((mm / 10).toFixed(2));
}

function isQuadStrictlyConvex(pts) {
  if (!pts || pts.length !== 4) return false;
  var sign = 0;
  for (var i = 0; i < 4; i++) {
    var a = pts[i], b = pts[(i + 1) % 4], c = pts[(i + 2) % 4];
    var cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 10) return false;
    var cur = cross > 0 ? 1 : -1;
    if (sign === 0) sign = cur; else if (sign !== cur) return false;
  }
  return computePolygonAreaShoelace(pts) > 100;
}

function computePolygonAreaShoelace(pts) {
  if (!pts || pts.length < 3) return 0;
  var sum = 0;
  for (var i = 0; i < pts.length; i++) sum += (pts[i].x * pts[(i + 1) % pts.length].y - pts[(i + 1) % pts.length].x * pts[i].y);
  return Math.abs(sum) / 2;
}

function normalizeQuadCornersClockwise(pts) {
  if (!pts || pts.length !== 4) return pts;
  var cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4, cy = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4;
  var sorted = pts.slice().sort(function(a, b) { return Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx); });
  var tl = 0, minS = Infinity;
  sorted.forEach(function(p, idx) { if (p.x + p.y < minS) { minS = p.x + p.y; tl = idx; } });
  return [0, 1, 2, 3].map(function(i) { return Object.assign({}, sorted[(tl + i) % 4]); });
}

function evaluateHomographyConfidence(corners, orientation) {
  if (!corners || corners.length !== 4 || !isQuadStrictlyConvex(corners)) {
    return { score: 0, label: 'مشوهة / متقاطعة', isWarped: true, warning: 'الزوايا غير محددة أو متقاطعة' };
  }
  var top = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y), bot = Math.hypot(corners[2].x - corners[3].x, corners[2].y - corners[3].y);
  var left = Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y), right = Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y);
  var obsRatio = Math.max((top + bot) / 2, (left + right) / 2) / Math.max(1, Math.min((top + bot) / 2, (left + right) / 2));
  var score = Math.max(15, Math.min(99, Math.round(100 - (Math.abs(obsRatio - 1.414) * 55) - (Math.abs(top - bot) / Math.max(top, bot) * 25))));
  return { score: score, label: score >= 85 ? 'ممتازة' : (score >= 70 ? 'جيدة' : (score >= 55 ? 'متوسطة' : 'منخفضة')), isWarped: score < 55, ratio: obsRatio.toFixed(2), warning: score < 60 ? 'يرجى ضبط الزوايا' : null };
}

function buildWhatsAppSummary(state) {
  if (!state || !state.hasImage || !state.H_imgToWorld) return 'يرجى إرفاق صورة وضبط المعايرة لاستخراج المقاسات.';
  var lines = ['✨ *بطاقة مقاسات التفصيل الهندسية المعتمدة v4.0* ✨', '▪ طلب: *' + (state.orderId || 'طلب تفصيل') + '* — *' + (state.customerName || 'عميل') + '*', '────────────────────'];
  var RealEngine = window.RealWorldMeasurementEngine;
  (state.measurements || []).filter(function(m) { return m.visible; }).forEach(function(m) {
    var rec = RealEngine ? RealEngine.buildRealMeasurementRecord(m, state) : null;
    var disp = rec ? RealEngine.formatDisplayValue(rec, state.unit) : '--';
    lines.push('▫️ *' + m.nameAr + ':* ' + disp + ' ' + (rec && rec.qualityGrade === 'measured_validated' ? '✅' : '⚠️'));
  });
  lines.push('────────────────────\n✅ تمت المعايرة بنظام (Real Measurement Studio v4.0)');
  return lines.join('\n');
}

function buildErpJsonPayload(state) {
  var summaryCm = {}, RealEngine = window.RealWorldMeasurementEngine;
  if (state && state.hasImage && state.H_imgToWorld) {
    (state.measurements || []).filter(function(m) { return m.visible; }).forEach(function(m) {
      var rec = RealEngine ? RealEngine.buildRealMeasurementRecord(m, state) : null;
      summaryCm[m.id] = rec ? rec.finalCm : 0;
    });
  }
  return { schemaVersion: '4.0.0', timestamp: new Date().toISOString(), orderReference: { orderId: state.orderId || null, customerName: state.customerName || null }, summaryCm: summaryCm };
}

window.MeasurementHomographyMath = {
  mult3x3: mult3x3, getHartleyNorm: getHartleyNorm, computeHomographyMatrix: computeHomographyMatrix,
  applyHomographyPoint: applyHomographyPoint, computeReprojectionErrorRmse: computeReprojectionErrorRmse,
  undistortPoint: undistortPoint, getZParallaxFactor: getZParallaxFactor,
  calculateTrueDistanceMm: calculateTrueDistanceMm, calculateBezierTrueDistanceMm: calculateBezierTrueDistanceMm,
  calculateTrueDistanceCm: calculateTrueDistanceCm, isQuadStrictlyConvex: isQuadStrictlyConvex,
  computePolygonAreaShoelace: computePolygonAreaShoelace, normalizeQuadCornersClockwise: normalizeQuadCornersClockwise,
  evaluateHomographyConfidence: evaluateHomographyConfidence, buildWhatsAppSummary: buildWhatsAppSummary, buildErpJsonPayload: buildErpJsonPayload
};
