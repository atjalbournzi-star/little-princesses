// src/features/measurement/utils/cameraCalibrationEngine.js
// CameraCalibrationEngine v4.0 - Brown-Conrady Distortion Model & Intrinsics
// Architecture Standard: Rule 1 & 2 (< 220 lines)

(function(window) {
  'use strict';

  var CAMERA_PROFILES = {
    generic_rectilinear: {
      name: 'عدسة مستقيمة قياسية (بدون تشوه افتراضي)',
      k1: 0.0, k2: 0.0, p1: 0.0, p2: 0.0, fFactor: 1.15, isCalibrated: false
    },
    iphone_wide: {
      name: 'آبل آيفون (الكاميرا الرئيسية 24-26 مم)',
      k1: -0.042, k2: 0.003, p1: 0.0008, p2: -0.0004, fFactor: 1.08, isCalibrated: true
    },
    samsung_galaxy: {
      name: 'سامسونج جالاكسي S22/S23/S24 (رئيسية 24 مم)',
      k1: -0.038, k2: 0.0025, p1: 0.0005, p2: -0.0002, fFactor: 1.10, isCalibrated: true
    },
    ipad_tablet: {
      name: 'جهاز لوحي iPad Pro / Air (كاميرا خلفية)',
      k1: -0.025, k2: 0.0015, p1: 0.0002, p2: 0.0001, fFactor: 1.20, isCalibrated: true
    }
  };

  var activeProfileKey = 'generic_rectilinear';

  function getActiveProfile() {
    return CAMERA_PROFILES[activeProfileKey] || CAMERA_PROFILES.generic_rectilinear;
  }

  function setCameraProfile(key) {
    if (CAMERA_PROFILES[key]) {
      activeProfileKey = key;
      try { localStorage.setItem('lp_studio_camera_profile', key); } catch (_) {}
      return true;
    }
    return false;
  }

  function initCameraProfiles() {
    try {
      var saved = localStorage.getItem('lp_studio_camera_profile');
      if (saved && CAMERA_PROFILES[saved]) activeProfileKey = saved;
    } catch (_) {}
  }
  initCameraProfiles();

  function undistortPoint(pt, imgW, imgH, profileOverride) {
    if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return pt;
    var W = imgW || 1000, H = imgH || 800;
    var prof = profileOverride || getActiveProfile();
    var k1 = prof.k1 || 0, k2 = prof.k2 || 0, p1 = prof.p1 || 0, p2 = prof.p2 || 0;
    if (Math.abs(k1) < 1e-6 && Math.abs(k2) < 1e-6 && Math.abs(p1) < 1e-6 && Math.abs(p2) < 1e-6) {
      return { x: pt.x, y: pt.y };
    }

    var cx = W / 2, cy = H / 2;
    var f = Math.max(W, H) * (prof.fFactor || 1.15);
    var x = (pt.x - cx) / f, y = (pt.y - cy) / f;

    // Iterative Newton-Raphson inverse of Brown-Conrady model (5 iterations)
    var x_corr = x, y_corr = y;
    for (var iter = 0; iter < 5; iter++) {
      var r2 = x_corr * x_corr + y_corr * y_corr;
      var radial = 1.0 + k1 * r2 + k2 * r2 * r2;
      var dx_tangential = 2.0 * p1 * x_corr * y_corr + p2 * (r2 + 2.0 * x_corr * x_corr);
      var dy_tangential = p1 * (r2 + 2.0 * y_corr * y_corr) + 2.0 * p2 * x_corr * y_corr;
      x_corr = (x - dx_tangential) / radial;
      y_corr = (y - dy_tangential) / radial;
    }

    return {
      x: Number((cx + x_corr * f).toFixed(2)),
      y: Number((cy + y_corr * f).toFixed(2))
    };
  }

  function distortPoint(pt, imgW, imgH, profileOverride) {
    if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return pt;
    var W = imgW || 1000, H = imgH || 800;
    var prof = profileOverride || getActiveProfile();
    var k1 = prof.k1 || 0, k2 = prof.k2 || 0, p1 = prof.p1 || 0, p2 = prof.p2 || 0;
    if (Math.abs(k1) < 1e-6 && Math.abs(k2) < 1e-6) return { x: pt.x, y: pt.y };

    var cx = W / 2, cy = H / 2;
    var f = Math.max(W, H) * (prof.fFactor || 1.15);
    var x = (pt.x - cx) / f, y = (pt.y - cy) / f;
    var r2 = x * x + y * y;
    var radial = 1.0 + k1 * r2 + k2 * r2 * r2;
    var x_dist = x * radial + (2.0 * p1 * x * y + p2 * (r2 + 2.0 * x * x));
    var y_dist = y * radial + (p1 * (r2 + 2.0 * y * y) + 2.0 * p2 * x * y);

    return {
      x: Number((cx + x_dist * f).toFixed(2)),
      y: Number((cy + y_dist * f).toFixed(2))
    };
  }

  function getCalibrationStatus() {
    var p = getActiveProfile();
    return {
      profileKey: activeProfileKey,
      profileName: p.name,
      isCalibrated: p.isCalibrated,
      statusLabel: p.isCalibrated ? 'بروفايل كاميرا موثق' : 'عدسة افتراضية (غير معايرة قطيعاً)',
      warning: p.isCalibrated ? null : 'لم تتم معايرة العدسة بلوحة شطرنج؛ يُعتمد تحويل المستوى فقط'
    };
  }

  window.CameraCalibrationEngine = {
    CAMERA_PROFILES: CAMERA_PROFILES,
    getActiveProfile: getActiveProfile,
    setCameraProfile: setCameraProfile,
    undistortPoint: undistortPoint,
    distortPoint: distortPoint,
    getCalibrationStatus: getCalibrationStatus
  };

})(typeof window !== 'undefined' ? window : globalThis);
