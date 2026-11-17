// src/features/measurement/utils/geometryMeasurementEngine.js
// GeometryMeasurementEngine v4.0 - Adaptive Numerical Integration & Metric Curves
// Architecture Standard: Rule 1 & 2 (< 220 lines)

(function(window) {
  'use strict';

  function euclideanDistanceMm(w1, w2) {
    if (!w1 || !w2) return 0;
    return Math.hypot(w2.x - w1.x, w2.y - w1.y);
  }

  function polylineLengthMm(points) {
    if (!Array.isArray(points) || points.length < 2) return 0;
    var total = 0;
    for (var i = 0; i < points.length - 1; i++) {
      total += euclideanDistanceMm(points[i], points[i + 1]);
    }
    return total;
  }

  // Gauss-Legendre 5-point weights and abscissae for interval [-1, 1]
  var GAUSS_5_POINTS = [
    { x: 0.0, w: 0.5688888888888889 },
    { x: -0.5384693101056831, w: 0.47862867049936647 },
    { x: 0.5384693101056831, w: 0.47862867049936647 },
    { x: -0.9061798459386640, w: 0.23692688505618908 },
    { x: 0.9061798459386640, w: 0.23692688505618908 }
  ];

  function bezierArcLengthAdaptiveMm(p1, cp, p2, H_i2w, cameraEngine, depthContext) {
    if (!p1 || !p2 || !H_i2w) return 0;
    var RealEngine = window.RealWorldMeasurementEngine;
    if (!RealEngine || !RealEngine.pixelToCalibratedMm) return 0;

    // If control point is almost collinear, use direct Euclidean
    var midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
    if (!cp || Math.hypot(cp.x - midX, cp.y - midY) < 2.5) {
      var w1 = RealEngine.pixelToCalibratedMm(p1, H_i2w, cameraEngine);
      var w2 = RealEngine.pixelToCalibratedMm(p2, H_i2w, cameraEngine);
      return euclideanDistanceMm(w1, w2);
    }

    // Adaptive integration over 8 sub-intervals using 5-point Gauss-Legendre
    var intervals = 8;
    var totalLengthMm = 0;

    for (var k = 0; k < intervals; k++) {
      var a = k / intervals, b = (k + 1) / intervals;
      var h = (b - a) / 2, c = (a + b) / 2;
      var subSum = 0;

      for (var g = 0; g < GAUSS_5_POINTS.length; g++) {
        var gp = GAUSS_5_POINTS[g];
        var t = c + h * gp.x;
        var it = 1 - t;
        // B'(t) tangent vector in image coordinates
        var dX_dt = 2 * it * (cp.x - p1.x) + 2 * t * (p2.x - cp.x);
        var dY_dt = 2 * it * (cp.y - p1.y) + 2 * t * (p2.y - cp.y);

        // Point B(t) on image
        var pt_t = {
          x: it * it * p1.x + 2 * it * t * cp.x + t * t * p2.x,
          y: it * it * p1.y + 2 * it * t * cp.y + t * t * p2.y
        };
        // Small delta dt = 1e-4 to transform tangent vector into metric space
        var dt = 1e-4;
        var pt_t2 = { x: pt_t.x + dX_dt * dt, y: pt_t.y + dY_dt * dt };
        var w_t = RealEngine.pixelToCalibratedMm(pt_t, H_i2w, cameraEngine);
        var w_t2 = RealEngine.pixelToCalibratedMm(pt_t2, H_i2w, cameraEngine);

        var speedMetric = (w_t && w_t2) ? (Math.hypot(w_t2.x - w_t.x, w_t2.y - w_t.y) / dt) : Math.hypot(dX_dt, dY_dt);
        subSum += gp.w * speedMetric;
      }
      totalLengthMm += h * subSum;
    }

    return Number(totalLengthMm.toFixed(2));
  }

  function measureLineOrCurveMm(H_i2w, p1, p2, cp, context) {
    if (!H_i2w || !p1 || !p2) return 0;
    var cameraEngine = window.CameraCalibrationEngine;
    var hasCurve = cp && (Math.hypot(cp.x - (p1.x + p2.x) / 2, cp.y - (p1.y + p2.y) / 2) > 3.0);

    if (hasCurve) {
      return bezierArcLengthAdaptiveMm(p1, cp, p2, H_i2w, cameraEngine, context);
    }
    var RealEngine = window.RealWorldMeasurementEngine;
    var w1 = RealEngine?.pixelToCalibratedMm(p1, H_i2w, cameraEngine);
    var w2 = RealEngine?.pixelToCalibratedMm(p2, H_i2w, cameraEngine);
    return euclideanDistanceMm(w1, w2);
  }

  function pointToLineDistanceMm(pt, lineP1, lineP2, H_i2w) {
    var RealEngine = window.RealWorldMeasurementEngine;
    var wPt = RealEngine?.pixelToCalibratedMm(pt, H_i2w);
    var w1 = RealEngine?.pixelToCalibratedMm(lineP1, H_i2w);
    var w2 = RealEngine?.pixelToCalibratedMm(lineP2, H_i2w);
    if (!wPt || !w1 || !w2) return 0;
    var lineLen = Math.hypot(w2.x - w1.x, w2.y - w1.y);
    if (lineLen < 1e-5) return Math.hypot(wPt.x - w1.x, wPt.y - w1.y);
    var num = Math.abs((w2.y - w1.y) * wPt.x - (w2.x - w1.x) * wPt.y + w2.x * w1.y - w2.y * w1.x);
    return num / lineLen;
  }

  window.MeasurementGeometryEngine = {
    euclideanDistanceMm: euclideanDistanceMm,
    polylineLengthMm: polylineLengthMm,
    bezierArcLengthAdaptiveMm: bezierArcLengthAdaptiveMm,
    measureLineOrCurveMm: measureLineOrCurveMm,
    pointToLineDistanceMm: pointToLineDistanceMm
  };

})(typeof window !== 'undefined' ? window : globalThis);
