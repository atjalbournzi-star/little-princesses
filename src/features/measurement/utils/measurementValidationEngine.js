// src/features/measurement/utils/measurementValidationEngine.js
// MeasurementValidationEngine v4.0 - Uncertainty Estimation & Independent Metrology Verification
// Architecture Standard: Rule 1 & 2 (< 220 lines)

(function(window) {
  'use strict';

  function verifyIndependentGroundTruthScale(a4Corners, a4Orientation, H_imgToWorld) {
    if (!a4Corners || a4Corners.length !== 4 || !H_imgToWorld) {
      return { isValid: false, maxErrorMm: null, avgErrorMm: null, percentError: null };
    }
    var RealEngine = window.RealWorldMeasurementEngine;
    if (!RealEngine || !RealEngine.pixelToCalibratedMm) {
      return { isValid: false, maxErrorMm: null, avgErrorMm: null, percentError: null };
    }

    var isLandscape = a4Orientation === 'landscape';
    var trueW = isLandscape ? 297.0 : 210.0;
    var trueH = isLandscape ? 210.0 : 297.0;
    var trueDiag = Math.hypot(trueW, trueH);

    var wPts = a4Corners.map(function(c) {
      return RealEngine.pixelToCalibratedMm(c, H_imgToWorld);
    });
    if (wPts.some(function(p) { return !p; })) {
      return { isValid: false, maxErrorMm: null, avgErrorMm: null, percentError: null };
    }

    var edge01 = Math.hypot(wPts[1].x - wPts[0].x, wPts[1].y - wPts[0].y);
    var edge12 = Math.hypot(wPts[2].x - wPts[1].x, wPts[2].y - wPts[1].y);
    var edge23 = Math.hypot(wPts[3].x - wPts[2].x, wPts[3].y - wPts[2].y);
    var edge30 = Math.hypot(wPts[0].x - wPts[3].x, wPts[0].y - wPts[3].y);
    var diag02 = Math.hypot(wPts[2].x - wPts[0].x, wPts[2].y - wPts[0].y);

    var errW1 = Math.abs(edge01 - trueW);
    var errW2 = Math.abs(edge23 - trueW);
    var errH1 = Math.abs(edge12 - trueH);
    var errH2 = Math.abs(edge30 - trueH);
    var errDiag = Math.abs(diag02 - trueDiag);

    var maxErr = Math.max(errW1, errW2, errH1, errH2, errDiag);
    var avgErr = (errW1 + errW2 + errH1 + errH2 + errDiag) / 5;
    var pct = (avgErr / ((trueW + trueH) / 2)) * 100;

    return {
      isValid: maxErr <= 4.0,
      maxErrorMm: Number(maxErr.toFixed(2)),
      avgErrorMm: Number(avgErr.toFixed(2)),
      percentError: Number(pct.toFixed(2)),
      diagMeasuredMm: Number(diag02.toFixed(1)),
      diagTrueMm: Number(trueDiag.toFixed(1)),
      summary: maxErr <= 2.0 ? 'دقة متناهية (خطأ < 2 مم)' : (maxErr <= 4.0 ? 'دقة مقبولة' : 'انحراف في المعايرة')
    };
  }

  function evaluateMeasurementStatus(spec, rawMm, context) {
    var Grades = window.RealWorldMeasurementEngine?.QUALITY_GRADES || {};
    if (!context.H_imgToWorld || rawMm <= 0) {
      return { uncertaintyMm: 0, qualityGrade: Grades.UNAVAILABLE || 'unavailable', statusReason: 'بانتظار المعايرة والصورة' };
    }
    if (spec.isCustom && !spec.placed) {
      return { uncertaintyMm: 0, qualityGrade: Grades.MANUAL || 'manual_measurement', statusReason: 'قياس مدخل يدوياً' };
    }

    // 1. Base resolution uncertainty (from Ground Sample Distance)
    var res = context.diagnostics?.resolution?.mmPerPx || 0.6;
    var u_pixel = res * 1.5;

    // 2. Reprojection & scale error uncertainty
    var scaleCheck = verifyIndependentGroundTruthScale(context.a4Corners, context.a4Orientation, context.H_imgToWorld);
    var u_scale = scaleCheck.avgErrorMm || 0.8;

    // 3. Perspective tilt contribution
    var tiltDeg = context.diagnostics?.quality?.tiltDegrees || 10;
    var u_tilt = (tiltDeg / 90) * 1.2;

    // 4. Depth / elevation contribution (Mode B only)
    var isDepthComp = context.operationMode === 'mode_b_assisted_25d';
    var u_depth = (isDepthComp && context.fabricElevationMm) ? (context.fabricElevationMm * 0.08) : 0;

    // Combined Standard Uncertainty (Square root of sum of squares)
    var totalUncertainty = Math.sqrt(u_pixel * u_pixel + u_scale * u_scale + u_tilt * u_tilt + u_depth * u_depth);
    var uncertaintyMm = Number(Math.max(0.5, Math.min(8.0, totalUncertainty * 1.6)).toFixed(1));

    // Determine quality grade
    var isCirc = Boolean(spec.isCircumference);
    var grade = Grades.VALIDATED;
    var reason = 'قياس هندسي مؤكد بالمليمتر';

    if (spec.id === 'hip' && isDepthComp) {
      grade = Grades.ESTIMATED;
      reason = 'محيط منفوش مقدر هندسياً (Mode B)';
    } else if (isCirc && isDepthComp) {
      grade = Grades.LIMITED;
      reason = 'محيط مركب مدعوم بفرق الارتفاع';
    } else if (scaleCheck.maxErrorMm > 3.0) {
      grade = Grades.LIMITED;
      reason = 'دقة المعايرة محدودة (انحراف مرجعي)';
    }

    return {
      uncertaintyMm: uncertaintyMm,
      qualityGrade: grade,
      statusReason: reason,
      scaleCheck: scaleCheck
    };
  }

  window.MeasurementValidationEngine = {
    verifyIndependentGroundTruthScale: verifyIndependentGroundTruthScale,
    evaluateMeasurementStatus: evaluateMeasurementStatus
  };

})(typeof window !== 'undefined' ? window : globalThis);
