// src/features/measurement/utils/realWorldMeasurementEngine.js
// RealWorldMeasurementEngine v4.0 - Coordinate Separation & Metric Conversion
// Architecture Standard: Rule 1 & 2 (< 220 lines)

(function(window) {
  'use strict';

  var COORD_SYSTEMS = {
    IMAGE_PIXEL: 'image_pixel',
    UNDISTORTED_IMAGE: 'undistorted_image',
    CALIBRATED_PLANE_MM: 'calibrated_plane_mm',
    GARMENT_MEASUREMENT_MM: 'garment_measurement_mm',
    DISPLAY_CANVAS: 'display_canvas'
  };

  var QUALITY_GRADES = {
    VALIDATED: 'measured_validated',
    LIMITED: 'limited_confidence',
    ESTIMATED: 'estimated',
    MANUAL: 'manual_measurement',
    UNAVAILABLE: 'unavailable'
  };

  function pixelToCalibratedMm(pt, H_imgToWorld, cameraEngine) {
    if (!pt || !H_imgToWorld) return null;
    var MathUtils = window.MeasurementHomographyMath;
    if (!MathUtils || !MathUtils.applyHomographyPoint) return null;
    var undist = pt;
    if (cameraEngine && typeof cameraEngine.undistortPoint === 'function') {
      undist = cameraEngine.undistortPoint(pt);
    }
    var world = MathUtils.applyHomographyPoint(H_imgToWorld, undist);
    if (!world || !Number.isFinite(world.x) || !Number.isFinite(world.y)) return null;
    return { x: Number(world.x.toFixed(2)), y: Number(world.y.toFixed(2)), system: COORD_SYSTEMS.CALIBRATED_PLANE_MM };
  }

  function calibratedMmToPixel(worldPt, H_worldToImg, cameraEngine) {
    if (!worldPt || !H_worldToImg) return null;
    var MathUtils = window.MeasurementHomographyMath;
    if (!MathUtils || !MathUtils.applyHomographyPoint) return null;
    var imgPt = MathUtils.applyHomographyPoint(H_worldToImg, worldPt);
    if (!imgPt || !Number.isFinite(imgPt.x) || !Number.isFinite(imgPt.y)) return null;
    if (cameraEngine && typeof cameraEngine.distortPoint === 'function') {
      imgPt = cameraEngine.distortPoint(imgPt);
    }
    return { x: Number(imgPt.x.toFixed(2)), y: Number(imgPt.y.toFixed(2)), system: COORD_SYSTEMS.IMAGE_PIXEL };
  }

  function buildRealMeasurementRecord(rawSpec, context) {
    var H = context.H_imgToWorld;
    var unit = context.unit || 'cm';
    var depthModule = window.DepthCompensationModule;
    var validationEngine = window.MeasurementValidationEngine;
    var geomEngine = window.MeasurementGeometryEngine;

    var rawMm = 0;
    if (H && geomEngine && typeof geomEngine.measureLineOrCurveMm === 'function') {
      rawMm = geomEngine.measureLineOrCurveMm(H, rawSpec.p1, rawSpec.p2, rawSpec.cp, context);
    }

    // 1. Raw Measurement (Flat Optical Metric Plane)
    rawMm = Number(Math.max(0, rawMm).toFixed(2));

    // 2. Garment Measurement (Flat vs Circumference logic & 2.5D compensation)
    var isCirc = Boolean(rawSpec.isCircumference);
    var mult = isCirc ? (rawSpec.multiplier || 2) : 1;
    var compResult = { compensatedMm: rawMm * mult, zFactor: 1.0, reason: '' };
    if (depthModule && typeof depthModule.applyDepthCompensation === 'function') {
      compResult = depthModule.applyDepthCompensation(rawMm * mult, rawSpec, context);
    }
    var garmentMm = Number(compResult.compensatedMm.toFixed(2));

    // 3. Production Adjustments (Ease, Seam, Hem, Turn)
    var easeCm = parseFloat(rawSpec.easeCm) || 0;
    var easeMm = easeCm * 10;
    var seamMm = (parseFloat(rawSpec.seamAllowanceMm) || 0);
    var hemMm = (parseFloat(rawSpec.hemAllowanceMm) || 0);
    var turnMm = isCirc ? ((context.fabricTurnAllowanceCm || 0) * 10) : 0;
    var totalAdjustmentsMm = easeMm + seamMm + hemMm + turnMm;

    var finalMm = Number(Math.max(0, garmentMm + totalAdjustmentsMm).toFixed(2));
    var finalCm = Number((finalMm / 10).toFixed(2));
    var finalInch = Number((finalMm / 25.4).toFixed(3));

    // Uncertainty and Quality Grade
    var valStatus = { uncertaintyMm: 1.5, qualityGrade: QUALITY_GRADES.VALIDATED, statusReason: 'معايرة صالحة' };
    if (validationEngine && typeof validationEngine.evaluateMeasurementStatus === 'function') {
      valStatus = validationEngine.evaluateMeasurementStatus(rawSpec, rawMm, context);
    }

    return {
      id: rawSpec.id,
      nameAr: rawSpec.nameAr,
      shortName: rawSpec.shortName || rawSpec.nameAr,
      color: rawSpec.color || '#10b981',
      unit: unit,
      type: isCirc ? 'circumference' : 'linear',
      isCircumference: isCirc,
      visible: rawSpec.visible !== false,
      p1: rawSpec.p1,
      p2: rawSpec.p2,
      cp: rawSpec.cp,
      rawMm: rawMm,
      rawCm: Number((rawMm / 10).toFixed(2)),
      garmentMm: garmentMm,
      garmentCm: Number((garmentMm / 10).toFixed(2)),
      productionAdjustments: {
        easeMm: easeMm,
        easeCm: easeCm,
        seamMm: seamMm,
        hemMm: hemMm,
        turnMm: turnMm
      },
      finalMm: finalMm,
      finalCm: finalCm,
      finalInch: finalInch,
      uncertaintyMm: valStatus.uncertaintyMm,
      uncertaintyCm: Number((valStatus.uncertaintyMm / 10).toFixed(2)),
      qualityGrade: valStatus.qualityGrade,
      statusReason: valStatus.statusReason,
      method: rawSpec.cp ? 'bezier_adaptive_integral' : 'euclidean_2d',
      source: rawSpec.isCustom ? 'manual' : (context.isAiLandmark ? 'ai_landmark' : 'optical_calibrated'),
      calibrationStatus: H ? 'valid' : 'uncalibrated',
      verifiedAt: new Date().toISOString(),
      algorithmVersion: '4.0.0'
    };
  }

  function formatDisplayValue(record, targetUnit, showUncertainty) {
    if (!record || record.rawMm <= 0) return '--';
    var u = targetUnit || record.unit || 'cm';
    var val = u === 'mm' ? record.finalMm : (u === 'inch' ? record.finalInch : record.finalCm);
    var uLabel = u === 'mm' ? ' مم' : (u === 'inch' ? '"' : ' سم');
    var unc = u === 'mm' ? record.uncertaintyMm : (u === 'inch' ? (record.uncertaintyMm / 25.4).toFixed(1) : record.uncertaintyCm);
    if (showUncertainty && unc > 0) {
      return val.toFixed(1) + ' ± ' + unc + uLabel;
    }
    return val.toFixed(1) + uLabel;
  }

  window.RealWorldMeasurementEngine = {
    COORD_SYSTEMS: COORD_SYSTEMS,
    QUALITY_GRADES: QUALITY_GRADES,
    pixelToCalibratedMm: pixelToCalibratedMm,
    calibratedMmToPixel: calibratedMmToPixel,
    buildRealMeasurementRecord: buildRealMeasurementRecord,
    formatDisplayValue: formatDisplayValue
  };

})(typeof window !== 'undefined' ? window : globalThis);
