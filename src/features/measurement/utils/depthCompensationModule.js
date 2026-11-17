// src/features/measurement/utils/depthCompensationModule.js
// DepthCompensationModule v4.0 - Mode A (2D), Mode B (2.5D Assisted), Mode C (3D Interface)
// Architecture Standard: Rule 1 & 2 (< 220 lines)

(function(window) {
  'use strict';

  var OPERATION_MODES = {
    MODE_A_FLAT_2D: 'mode_a_flat_2d',
    MODE_B_ASSISTED_25D: 'mode_b_assisted_25d',
    MODE_C_3D_SURFACE: 'mode_c_3d_surface'
  };

  var activeMode = OPERATION_MODES.MODE_A_FLAT_2D;

  function setOperationMode(mode) {
    if (OPERATION_MODES[mode] || Object.values(OPERATION_MODES).includes(mode)) {
      activeMode = mode;
      return true;
    }
    return false;
  }

  function getOperationMode() {
    return activeMode;
  }

  function applyDepthCompensation(rawMm, spec, context) {
    var mode = context.operationMode || activeMode;
    var elevationMm = Math.max(0, parseFloat(context.fabricElevationMm) || 0);
    var camDistanceMm = Math.max(600, parseFloat(context.camHeightMm) || 1200);
    var a4Placement = context.a4Placement || 'coplanar';

    // Mode A: Flat 2D (Direct planar homography, no synthetic elevation)
    if (mode === OPERATION_MODES.MODE_A_FLAT_2D || elevationMm === 0) {
      return {
        compensatedMm: rawMm,
        mode: OPERATION_MODES.MODE_A_FLAT_2D,
        zFactor: 1.0,
        isEstimated: false,
        methodNote: 'قياس مسطح مباشر على المستوى المرجعي (Mode A)'
      };
    }

    // Mode B: Assisted 2.5D (Geometric Perspective Height Compensation)
    if (mode === OPERATION_MODES.MODE_B_ASSISTED_25D) {
      var zFactor = 1.0;
      if (a4Placement === 'paper_on_puffy') {
        // Paper is elevated above flat ground -> dress is farther than paper
        zFactor = (camDistanceMm + elevationMm) / camDistanceMm;
      } else if (a4Placement === 'paper_on_floor' || a4Placement === 'on_surface') {
        // Paper is on floor, garment is elevated towards camera -> appears larger
        zFactor = (camDistanceMm - elevationMm) / camDistanceMm;
      }
      zFactor = Math.max(0.70, Math.min(1.30, zFactor));
      var compensated = rawMm * zFactor;

      return {
        compensatedMm: compensated,
        mode: OPERATION_MODES.MODE_B_ASSISTED_25D,
        zFactor: Number(zFactor.toFixed(4)),
        isEstimated: true,
        methodNote: 'تعويض منظوري مدعوم (Mode B — ΔZ = ' + elevationMm + ' مم)'
      };
    }

    // Mode C: 3D Surface Measurement (Future multi-view / depth sensor interface)
    return {
      compensatedMm: rawMm,
      mode: OPERATION_MODES.MODE_C_3D_SURFACE,
      zFactor: 1.0,
      isEstimated: true,
      methodNote: 'وضع ثلاثي الأبعاد بانتظار خريطة عمق مجسمة (Sensor/Stereo required)'
    };
  }

  function getModeDescription(mode) {
    switch (mode) {
      case OPERATION_MODES.MODE_A_FLAT_2D:
        return { label: 'Mode A — Flat 2D', desc: 'للفساتين المسطحة على مستوى الورقة بدون انتفاخ (قياس قطعي)' };
      case OPERATION_MODES.MODE_B_ASSISTED_25D:
        return { label: 'Mode B — Assisted 2.5D', desc: 'تعويض هندسي لارتفاع القماش والنفش (قياس مدعوم ومقدر)' };
      case OPERATION_MODES.MODE_C_3D_SURFACE:
        return { label: 'Mode C — 3D Scanner', desc: 'واجهة المسح ثلاثي الأبعاد وكاميرات العمق المستقبلية' };
      default:
        return { label: 'Flat 2D', desc: 'المستوى المرجعي' };
    }
  }

  window.DepthCompensationModule = {
    OPERATION_MODES: OPERATION_MODES,
    setOperationMode: setOperationMode,
    getOperationMode: getOperationMode,
    applyDepthCompensation: applyDepthCompensation,
    getModeDescription: getModeDescription
  };

})(typeof window !== 'undefined' ? window : globalThis);
