// src/features/measurement/utils/measurementConfigManager.js
// MeasurementConfigManager v4.0 - Versioned Settings, Garment Profiles & Tolerances
// Architecture Standard: Rule 1 & 2 (< 220 lines)

(function(window) {
  'use strict';

  var CONFIG_SCHEMA_VERSION = '4.0.0';

  var GARMENT_PROFILES = {
    ballgown: {
      name: 'فستان منفوش (Ballgown / جيبون)',
      defaultMode: 'mode_b_assisted_25d',
      elevationMm: 30,
      fabricType: 'tulle',
      defaultEaseCm: { chest: 2.5, waist: 2.0, hip: 4.0 }
    },
    aline: {
      name: 'فستان إيه لاين (A-Line كلاسيكي)',
      defaultMode: 'mode_a_flat_2d',
      elevationMm: 15,
      fabricType: 'taffeta',
      defaultEaseCm: { chest: 2.0, waist: 1.5, hip: 2.5 }
    },
    princess: {
      name: 'فستان برنسيس ملكي (Princess Cut)',
      defaultMode: 'mode_a_flat_2d',
      elevationMm: 20,
      fabricType: 'taffeta',
      defaultEaseCm: { chest: 2.0, waist: 1.5, hip: 3.0 }
    },
    sheath: {
      name: 'فستان ناعم مستقيم (Sheath / Simple)',
      defaultMode: 'mode_a_flat_2d',
      elevationMm: 0,
      fabricType: 'light',
      defaultEaseCm: { chest: 1.5, waist: 1.0, hip: 1.5 }
    }
  };

  var TOLERANCES = {
    maxAllowableErrorMm: 4.0,
    targetAccuracyMm: 2.0,
    maxTiltAngleDeg: 35.0,
    minAreaRatio: 0.025,
    maxScaleDivergence: 0.35
  };

  var activeGarmentProfileKey = 'ballgown';

  function getGarmentProfile(key) {
    return GARMENT_PROFILES[key || activeGarmentProfileKey] || GARMENT_PROFILES.ballgown;
  }

  function setGarmentProfile(key) {
    if (GARMENT_PROFILES[key]) {
      activeGarmentProfileKey = key;
      try { localStorage.setItem('lp_studio_garment_profile', key); } catch (_) {}
      return true;
    }
    return false;
  }

  function initGarmentProfile() {
    try {
      var saved = localStorage.getItem('lp_studio_garment_profile');
      if (saved && GARMENT_PROFILES[saved]) activeGarmentProfileKey = saved;
    } catch (_) {}
  }
  initGarmentProfile();

  function applyProfileToMeasurements(measurements, profileKey) {
    var prof = getGarmentProfile(profileKey);
    if (!prof || !Array.isArray(measurements)) return measurements;
    var easeMap = prof.defaultEaseCm || {};
    return measurements.map(function(m) {
      if (easeMap[m.id] !== undefined && (m.easeCm === 0 || m.easeCm === undefined)) {
        return Object.assign({}, m, { easeCm: easeMap[m.id] });
      }
      return m;
    });
  }

  function exportConfigJson() {
    return {
      schemaVersion: CONFIG_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      activeGarmentProfile: activeGarmentProfileKey,
      tolerances: TOLERANCES,
      cameraProfile: window.CameraCalibrationEngine?.getActiveProfile() || {}
    };
  }

  window.MeasurementConfigManager = {
    CONFIG_SCHEMA_VERSION: CONFIG_SCHEMA_VERSION,
    GARMENT_PROFILES: GARMENT_PROFILES,
    TOLERANCES: TOLERANCES,
    getGarmentProfile: getGarmentProfile,
    setGarmentProfile: setGarmentProfile,
    applyProfileToMeasurements: applyProfileToMeasurements,
    exportConfigJson: exportConfigJson
  };

})(typeof window !== 'undefined' ? window : globalThis);
