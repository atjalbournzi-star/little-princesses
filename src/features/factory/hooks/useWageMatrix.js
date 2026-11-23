/**
 * useWageMatrix.js - محرك الربط الديناميكي لأجور مراحل الإنتاج بدون أي قيم ثابتة
 * Little Princesses ERP - Dynamic Stage Wage Binding Engine
 */

(function(window) {
  'use strict';

  function getSystemDefaultWages() {
    try {
      if (window.appSettings?.default_stage_wages) return window.appSettings.default_stage_wages;
    } catch(e) {}
    return {};
  }

  function isProductObj(obj) {
    return Boolean(obj && (obj.stage_wages || obj.bom || (obj.model_name && !obj.order_no) || (obj.category && obj.base_price !== undefined)));
  }

  function resolveStageWages(arg1 = {}, arg2 = null) {
    let product = arg1;
    let fallback = arg2;
    if (!isProductObj(arg1) && isProductObj(arg2)) {
      product = arg2;
      fallback = arg1;
    }

    const sysDefaults = fallback?.default_stage_wages || getSystemDefaultWages();
    let bomObj = product?.bom || fallback?.bom;
    if (typeof bomObj === 'string') {
      try { bomObj = JSON.parse(bomObj); } catch(e) { bomObj = {}; }
    }
    const bomMeta = (bomObj && typeof bomObj === 'object' && !Array.isArray(bomObj)) ? (bomObj.meta || {}) : {};
    const prodWages = product?.stage_wages || fallback?.stage_wages || product?.meta?.stage_wages || bomMeta.stage_wages || {};

    const pickWage = (key, altKeys = []) => {
      const candidates = [
        prodWages[key],
        ...altKeys.map(k => prodWages[k]),
        bomMeta[key],
        ...altKeys.map(k => bomMeta[k]),
        product?.[key],
        ...altKeys.map(k => product?.[k]),
        fallback?.[key],
        ...altKeys.map(k => fallback?.[k]),
        sysDefaults[key],
        ...altKeys.map(k => sysDefaults[k])
      ];
      for (const val of candidates) {
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val);
        }
      }
      return '';
    };

    const cutter = pickWage('cutter_wage', ['cutter']);
    const tailor = pickWage('tailor_wage', ['tailor']);
    const embroiderer = pickWage('embroiderer_wage', ['embroiderer', 'embroidery']);
    const finisher = pickWage('finisher_wage', ['finisher', 'ironing']);
    const packager = pickWage('packager_wage', ['packager', 'packaging_cost', 'pkg_cost']);

    const res = {
      cutter_wage: cutter,
      tailor_wage: tailor,
      embroiderer_wage: embroiderer,
      finisher_wage: finisher,
      packager_wage: packager,
      packaging_cost: packager
    };

    Object.entries(prodWages).forEach(([k, v]) => {
      if (res[k] === undefined && v !== '' && v !== null && v !== undefined) {
        res[k] = String(v);
      }
    });

    return res;
  }

  function hydrateStageWages(product, setForm, form = {}) {
    if (!setForm) return;
    const resolved = resolveStageWages(product, form);
    setForm(prev => {
      const updates = {};
      Object.entries(resolved).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) {
          updates[k] = v;
        }
      });
      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
    return resolved;
  }

  function useWageMatrix(product, form, setForm) {
    const { useEffect } = React;
    useEffect(() => {
      if (product && setForm) {
        hydrateStageWages(product, setForm, form);
      }
    }, [product?.id, product?.product_id, product?.model_name]);

    return resolveStageWages(product);
  }

  window.WageMatrixService = {
    getSystemDefaultWages,
    resolveStageWages,
    hydrateStageWages,
    useWageMatrix
  };
  window.useWageMatrix = useWageMatrix;

})(typeof window !== 'undefined' ? window : globalThis);
