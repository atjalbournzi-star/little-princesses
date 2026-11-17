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

  function resolveStageWages(arg1 = {}, arg2 = null) {
    let product = arg1;
    let fallback = arg2;
    if (arg2 && (arg2.bom || arg2.model_name || arg2.product_id || arg2.cutter_wage || arg2.labor_cost)) {
      product = arg2;
      fallback = arg1;
    } else if (arg1 && !arg1.bom && !arg1.model_name && !arg1.cutter_wage && arg2) {
      product = arg2;
      fallback = arg1;
    }

    const sysDefaults = fallback?.default_stage_wages || getSystemDefaultWages();
    let bomObj = product?.bom;
    if (typeof bomObj === 'string') {
      try { bomObj = JSON.parse(bomObj); } catch(e) { bomObj = {}; }
    }
    const bomMeta = (bomObj && typeof bomObj === 'object' && !Array.isArray(bomObj)) ? (bomObj.meta || {}) : {};
    const prodWages = product?.stage_wages || product?.meta?.stage_wages || bomMeta.stage_wages || {};

    const cutter = prodWages.cutter_wage ?? prodWages.cutter ?? bomMeta.cutter_wage ?? product?.cutter_wage ?? product?.meta?.cutter_wage ?? sysDefaults.cutter_wage ?? sysDefaults.cutter ?? '';
    const tailor = prodWages.tailor_wage ?? prodWages.tailor ?? bomMeta.tailor_wage ?? product?.tailor_wage ?? product?.meta?.tailor_wage ?? sysDefaults.tailor_wage ?? sysDefaults.tailor ?? '';
    const embroiderer = prodWages.embroiderer_wage ?? prodWages.embroiderer ?? bomMeta.embroiderer_wage ?? product?.embroiderer_wage ?? product?.meta?.embroiderer_wage ?? sysDefaults.embroiderer_wage ?? sysDefaults.embroiderer ?? '';
    const finisher = prodWages.finisher_wage ?? prodWages.finisher ?? bomMeta.finisher_wage ?? product?.finisher_wage ?? product?.meta?.finisher_wage ?? sysDefaults.finisher_wage ?? sysDefaults.finisher ?? '';
    const packager = prodWages.packaging_cost ?? prodWages.packager_wage ?? prodWages.packager ?? bomMeta.packaging_cost ?? bomMeta.packager_wage ?? product?.packaging_cost ?? product?.packager_wage ?? product?.pkg_cost ?? product?.meta?.packaging_cost ?? product?.meta?.packager_wage ?? sysDefaults.packaging_cost ?? sysDefaults.packager_wage ?? sysDefaults.packager ?? '';

    const res = {
      cutter_wage: cutter !== '' && cutter !== null && cutter !== undefined ? String(cutter) : '',
      tailor_wage: tailor !== '' && tailor !== null && tailor !== undefined ? String(tailor) : '',
      embroiderer_wage: embroiderer !== '' && embroiderer !== null && embroiderer !== undefined ? String(embroiderer) : '',
      finisher_wage: finisher !== '' && finisher !== null && finisher !== undefined ? String(finisher) : '',
      packager_wage: packager !== '' && packager !== null && packager !== undefined ? String(packager) : '',
      packaging_cost: packager !== '' && packager !== null && packager !== undefined ? String(packager) : ''
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
