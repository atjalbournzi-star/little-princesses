/**
 * useWageMatrix.js - محرك الربط الديناميكي لأجور مراحل الإنتاج بدون أي قيم ثابتة
 * Little Princesses ERP - Dynamic Stage Wage Binding Engine
 */

(function(window) {
  'use strict';

  function getSystemDefaultWages() {
    try {
      const cached = localStorage.getItem('lp_system_stage_wages') || localStorage.getItem('lp_stage_wages');
      if (cached) return JSON.parse(cached);
      if (window.appSettings?.default_stage_wages) return window.appSettings.default_stage_wages;
    } catch(e) {}
    return {};
  }

  function resolveStageWages(product = {}, systemSettings = null) {
    const sysDefaults = systemSettings?.default_stage_wages || getSystemDefaultWages();
    const prodWages = product?.stage_wages || product?.meta?.stage_wages || {};

    const cutter = prodWages.cutter_wage ?? prodWages.cutter ?? product?.cutter_wage ?? product?.meta?.cutter_wage ?? sysDefaults.cutter_wage ?? sysDefaults.cutter ?? '';
    const tailor = prodWages.tailor_wage ?? prodWages.tailor ?? product?.tailor_wage ?? product?.meta?.tailor_wage ?? sysDefaults.tailor_wage ?? sysDefaults.tailor ?? '';
    const embroiderer = prodWages.embroiderer_wage ?? prodWages.embroiderer ?? product?.embroiderer_wage ?? product?.meta?.embroiderer_wage ?? sysDefaults.embroiderer_wage ?? sysDefaults.embroiderer ?? '';
    const finisher = prodWages.finisher_wage ?? prodWages.finisher ?? product?.finisher_wage ?? product?.meta?.finisher_wage ?? sysDefaults.finisher_wage ?? sysDefaults.finisher ?? '';

    return {
      cutter_wage: cutter !== '' && cutter !== null && cutter !== undefined ? String(cutter) : '',
      tailor_wage: tailor !== '' && tailor !== null && tailor !== undefined ? String(tailor) : '',
      embroiderer_wage: embroiderer !== '' && embroiderer !== null && embroiderer !== undefined ? String(embroiderer) : '',
      finisher_wage: finisher !== '' && finisher !== null && finisher !== undefined ? String(finisher) : ''
    };
  }

  function hydrateStageWages(product, setForm, form = {}) {
    if (!setForm) return;
    const resolved = resolveStageWages(product);
    setForm(prev => {
      const updates = {};
      if (resolved.cutter_wage && (!prev.cutter_wage || Number(prev.cutter_wage) === 0)) updates.cutter_wage = resolved.cutter_wage;
      if (resolved.tailor_wage && (!prev.tailor_wage || Number(prev.tailor_wage) === 0)) updates.tailor_wage = resolved.tailor_wage;
      if (resolved.embroiderer_wage && (!prev.embroiderer_wage || Number(prev.embroiderer_wage) === 0)) updates.embroiderer_wage = resolved.embroiderer_wage;
      if (resolved.finisher_wage && (!prev.finisher_wage || Number(prev.finisher_wage) === 0)) updates.finisher_wage = resolved.finisher_wage;
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
