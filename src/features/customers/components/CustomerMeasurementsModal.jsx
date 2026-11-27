// src/features/customers/components/CustomerMeasurementsModal.jsx
const { useState, useEffect, useMemo } = React;

function CustomerMeasurementsModal({
  isOpen, onClose, customer, products = [], currency = { display: 'YER', symbol: '﷼' }, onSaveMeasurements, onProceedToFinance, isSaving = false, showToast, getKnownPrincesses, currentStep = 2, onSwitchStep
}) {
  const { calculateAge, emptyMeasurement, getSmartModelMatch, KIDS_MEASUREMENT_FIELDS, ADULT_MEASUREMENT_FIELDS } = window.customerUtils || {};
  const safeStr = (v, fb = '') => { if (!v) return fb; if (typeof v !== 'object') return String(v); const val = v.ar || v.name || v.model_name || v.label || v.title || v.child_name || v.value; return (val && typeof val !== 'object') ? String(val) : ((val && typeof val === 'object') ? safeStr(val, fb) : fb); };
  const custNameStr = safeStr(customer?.name), derivedChild = (custNameStr ? custNameStr.replace(/^(ام|أم|والدة)\s+/i, '').trim() : '');
  const getEmpty = (mode = 'kids', idx = 0) => (emptyMeasurement ? emptyMeasurement(mode) : { id: Date.now() + idx, child_name: mode === 'women_adults' ? custNameStr : (idx === 0 && derivedChild !== custNameStr ? derivedChild : ''), unit: 'سم', target_mode: mode }), calcAge = calculateAge || (() => ''), smartMatch = getSmartModelMatch || (() => null);
  const [measurements, setMeasurements] = useState([]), [activeChildIdx, setActiveChildIdx] = useState(0), [targetMode, setTargetMode] = useState('kids'), [prods, setProds] = useState(products || []);
  useEffect(() => { if (products?.length) setProds(products); else fetch('/api/products').then(r => r.json()).then(d => { const l = d?.data || d || []; if (l.length) setProds(l); }).catch(() => {}); }, [products]);
  const activeProds = (prods?.length) ? prods : (products || []);

  useEffect(() => {
    if (!isOpen || !customer) return;
    const cN = v => (v === undefined || v === null || v === '' || parseFloat(v) === 0) ? '' : (parseFloat(v) || v);
    const hydrateList = (raw) => {
      if (!raw || !raw.length) { setMeasurements([getEmpty('kids', 0)]); setActiveChildIdx(0); return; }
      if (raw.some(m => m.target_mode === 'women_adults' || m.hips_circ || m.arm_circ || m.bust_drop)) setTargetMode('women_adults');
      setMeasurements(raw.map((m, i) => {
        const cName = safeStr(m.child_name || m.name || customer?.children?.[i]?.child_name).trim();
        const chName = cName || (m.target_mode === 'women_adults' ? custNameStr : (i === 0 && derivedChild !== custNameStr ? derivedChild : ''));
        const comfort = Array.isArray(m.comfort_profile) ? m.comfort_profile : (typeof m.comfort_profile === 'string' && m.comfort_profile ? m.comfort_profile.replace(/[\[\]']/g, '').split(',').map(s => s.trim()).filter(Boolean) : []);
        const rawU = String(m.unit || '').trim(), u = /^(inch|in|إنش|انش)$/i.test(rawU) ? 'إنش' : 'سم', dL = cN(m.dress_length ?? m.dress_len), tH = cN(m.total_height ?? m.total_len), mod = m.selected_model || m.model_name || '';
        const o = { id: m.id || (Date.now() + i), child_id: m.child_id || customer?.children?.[i]?.id || '', child_name: chName, wearer_type: m.wearer_type || (m.target_mode === 'women_adults' ? 'SELF' : 'DEPENDENT'), target_segment: m.target_segment || (m.target_mode === 'women_adults' ? 'WOMEN_APPAREL' : 'GIRLS_DRESS'), target_mode: m.target_mode || (raw.some(x => x.target_mode === 'women_adults') ? 'women_adults' : 'kids'), unit: u, selected_model: mod, dress_color: m.dress_color || '', meas_date: m.meas_date || m.measurement_date || (typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : ''), event_date: m.event_date || m.date || '', model_image: m.model_image || m.model_img || '', total_height: tH, dress_length: dL, fabric_type: m.fabric_type || '', fabric_meters: cN(m.fabric_meters), adjusted_price: cN(m.adjusted_price), comfort_profile: comfort, sewing_notes: m.sewing_notes || m.notes || '', estimated_age: m.estimated_age || calcAge(dL || tH, mod, u, activeProds), fabrics_breakdown: m.fabrics_breakdown || [] };
        ['total_height','dress_length','chest_length','skirt_length','sleeve_length','chest_circ','waist_circ','shoulder_width','armhole_circ','neck_circ','hips_circ','hip_circ','arm_circ','bust_drop'].forEach(f => { o[f] = cN(m[f]); });
        if (!o.hips_circ && o.hip_circ) o.hips_circ = o.hip_circ;
        return o;
      }));
      setActiveChildIdx(0);
    };

    if (customer.measurements?.length) hydrateList(customer.measurements);
    else if (customer.children?.length) hydrateList(customer.children);
    else {
      const cid = customer.customer_id || customer.id;
      if (!cid || cid.startsWith('CUST-NEW')) return setMeasurements([getEmpty('kids', 0)]);
      fetch('/api/crm/customers').then(r => r.json()).then(d => { const l = d?.data || d || [], m = l.find(c => (c.customer_id || c.id) === cid || (customer.phone && c.phone === customer.phone)); hydrateList(m?.measurements?.length ? m.measurements : m?.children); }).catch(() => setMeasurements([getEmpty('kids', 0)]));
    }
  }, [customer, isOpen]);

  const currM = measurements[activeChildIdx] || measurements[0] || getEmpty(targetMode, 0);
  const effectiveIsAdult = String(currM?.wearer_type || '').toUpperCase() === 'SELF' || String(currM?.target_segment || '').toUpperCase() === 'WOMEN_APPAREL' || currM?.target_mode === 'women_adults' || targetMode === 'women_adults';
  const effectiveMode = effectiveIsAdult ? 'women_adults' : 'kids', activeFields = (effectiveIsAdult ? ADULT_MEASUREMENT_FIELDS : KIDS_MEASUREMENT_FIELDS) || [];
  const knownPrincesses = useMemo(() => typeof getKnownPrincesses === 'function' ? getKnownPrincesses(customer) : [], [customer, getKnownPrincesses]);
  const dLen = parseFloat(currM?.dress_length || currM?.dress_len), cCirc = parseFloat(currM?.chest_circ || currM?.chest_circumference), hasBasicMeasurements = !isNaN(dLen) && dLen > 0 && !isNaN(cCirc) && cCirc > 0;
  const selectedProduct = useMemo(() => activeProds.find(x => safeStr(x.name || x.model_name).trim() === safeStr(currM?.selected_model).trim()) || null, [activeProds, currM?.selected_model]);
  const bespokeBOM = useMemo(() => {
    if (!hasBasicMeasurements) return { ageTier: '6-9Y', calculatedBomItems: [], calculatedPrice: 0, bomSummary: '' };
    return (window.useBespokeBOM ? window.useBespokeBOM(selectedProduct, currM, targetMode) : (window.BespokeBOMService?.deriveBespokeBOM ? window.BespokeBOMService.deriveBespokeBOM(selectedProduct, currM, targetMode) : null)) || { ageTier: '6-9Y', calculatedBomItems: [], calculatedPrice: 0, bomSummary: '' };
  }, [selectedProduct, currM, targetMode, hasBasicMeasurements]);
  const { ageTier: calculatedAgeTier, calculatedBomItems, calculatedPrice } = bespokeBOM;
  const isCurrInch = /^(inch|in|إنش|انش)$/i.test(String(currM?.unit || '').trim());
  const outOfRangeViolations = useMemo(() => {
    const list = [], isAd = targetMode === 'women_adults';
    const RANGES = isAd ? { dress_length: ['طول الفستان', 60, 200], chest_circ: ['محيط الصدر', 60, 160], waist_circ: ['محيط الخصر', 50, 150], hips_circ: ['محيط الأوراك', 60, 180], shoulder_width: ['عرض الكتفين', 28, 60], sleeve_length: ['طول الكم', 20, 80], arm_circ: ['دوران الذراع', 18, 60], bust_drop: ['نزول الصدر', 15, 45] } : { dress_length: ['طول الفستان', 20, 160], chest_circ: ['محيط الصدر', 30, 115], waist_circ: ['محيط الخصر', 30, 110], shoulder_width: ['عرض الكتفين', 14, 52], chest_length: ['طول الصدر', 10, 50], skirt_length: ['طول التنورة', 15, 120], sleeve_length: ['طول الكم', 10, 75], armhole_circ: ['محيط الإبط', 14, 52], neck_circ: ['محيط الرقبة', 16, 46], total_height: ['الطول الكلي', 40, 180] };
    Object.entries(RANGES).forEach(([k, [lbl, min, max]]) => {
      const num = parseFloat(currM?.[k]);
      if (!isNaN(num) && num > 0) { const cm = isCurrInch ? (window.UnitConversionService ? window.UnitConversionService.convert(num, 'إنش', 'سم') : (num * 2.54)) : num; if (cm < min || cm > max) list.push(lbl); }
    });
    return list;
  }, [currM, isCurrInch, targetMode]);

  const uniqueModels = useMemo(() => {
    const s = new Set();
    activeProds.forEach(p => { const n = safeStr(p.name || p.model_name).trim(); if (n) s.add(n); });
    measurements.forEach(m => { const n = safeStr(m.selected_model || m.model_name).trim(); if (n) s.add(n); });
    if (safeStr(currM?.selected_model).trim()) s.add(safeStr(currM?.selected_model).trim());
    return Array.from(s).filter(Boolean);
  }, [activeProds, measurements, currM?.selected_model]);

  const updateMeasurement = (idx, field, value) => setMeasurements(prev => prev.map((m, i) => {
    if (i !== idx) return m;
    const next = (field && typeof field === 'object') ? { ...m, ...field } : { ...m, [field]: value };
    if (next.target_mode && next.target_mode !== targetMode) setTargetMode(next.target_mode);
    if ((field && typeof field === 'object') || ['dress_length', 'total_height', 'selected_model', 'unit'].includes(field)) next.estimated_age = calcAge(next.dress_length || next.total_height, next.selected_model, next.unit, activeProds);
    return next;
  }));

  const handleSelectModel = (modelName) => {
    const p = activeProds.find(x => safeStr(x.name || x.model_name).trim() === safeStr(modelName).trim()), img = p?.image_url || p?.image || p?.image_data || '', pId = p?.id || p?.product_id || '';
    let rawCols = p?.colors || p?.approved_colors || [];
    if (typeof rawCols === 'string') { try { rawCols = JSON.parse(rawCols); } catch (e) { rawCols = rawCols.split(',').map(s => s.trim()).filter(Boolean); } }
    const cols = Array.isArray(rawCols) ? rawCols : [], matchedCol = cols.includes(currM?.dress_color) ? currM.dress_color : (cols[0] || '');
    setMeasurements(prev => prev.map((m, i) => i === activeChildIdx ? { ...m, selected_model: modelName, model_id: pId, product_id: pId, model_image: img, model_img: img, dress_color: matchedCol, selected_color: matchedCol, color: matchedCol } : m));
  };

  const formatSavedLength = (p) => {
    if (!p) return '';
    const rawLen = parseFloat(p.dress_length || p.dress_len);
    if (isNaN(rawLen) || rawLen <= 0) return '';
    const pMeas = (customer?.measurements || []).find(m => String(m.child_name || m.name || '').trim() === String(p.child_name || '').trim());
    const rawU = String(p.unit || pMeas?.unit || '').trim(), isPInch = /^(inch|in|إنش|انش)$/i.test(rawU) || (!rawU && rawLen <= 45);
    const val = isCurrInch ? (isPInch ? rawLen : (rawLen / 2.54)) : (isPInch ? (rawLen * 2.54) : rawLen);
    return `${Number(val.toFixed(1))} ${isCurrInch ? 'إنش' : 'سم'}`;
  };

  const toggleUnit = (idx) => {
    const m = measurements?.[idx] || currM || measurements?.[0];
    if (!m) return;
    const isInch = /^(inch|in|إنش|انش)$/i.test(String(m?.unit || '').trim()), fromU = isInch ? 'إنش' : 'سم', toU = isInch ? 'سم' : 'إنش';
    const conv = (v) => (v === undefined || v === null || v === '' || isNaN(parseFloat(v))) ? v : (window.UnitConversionService?.convert ? window.UnitConversionService.convert(parseFloat(v), fromU, toU, 1) : parseFloat((isInch ? (parseFloat(v) * 2.54) : (parseFloat(v) / 2.54)).toFixed(1)));
    const upd = { ...m, unit: toU };
    ['total_height','dress_length','chest_length','skirt_length','sleeve_length','chest_circ','waist_circ','shoulder_width','armhole_circ','neck_circ','hips_circ','arm_circ','bust_drop'].forEach(f => { if (m[f] !== undefined && m[f] !== null && m[f] !== '' && !isNaN(parseFloat(m[f]))) upd[f] = conv(m[f]); });
    upd.estimated_age = calcAge(upd.dress_length || upd.total_height, upd.selected_model, upd.unit, activeProds);
    setMeasurements(prev => (prev && prev.length) ? prev.map((item, i) => i === idx ? upd : item) : [upd]);
  };

  const handleSelectKnownPrincess = (p) => {
    const cN = v => (v === undefined || v === null || v === '' || parseFloat(v) === 0) ? '' : (parseFloat(v) || v), pMeas = (customer?.measurements || []).find(m => String(m.child_name || m.name || '').trim() === String(p.child_name || '').trim()) || p;
    const rawU = String(p.unit || pMeas?.unit || '').trim(), rawL = parseFloat(p.dress_length || pMeas.dress_length), isPInch = /^(inch|in|إنش|انش)$/i.test(rawU) || (!rawU && rawL <= 45), factor = (isPInch !== isCurrInch) ? (isCurrInch ? (1 / 2.54) : 2.54) : 1;
    setMeasurements(prev => prev.map((m, i) => {
      if (i !== activeChildIdx) return m;
      const upd = { ...m, child_name: p.child_name || m.child_name, selected_model: p.selected_model || p.model_name || m.selected_model, unit: isCurrInch ? 'إنش' : 'سم' };
      ['total_height','dress_length','chest_length','skirt_length','sleeve_length','chest_circ','waist_circ','shoulder_width','armhole_circ','neck_circ'].forEach(f => { const val = cN(pMeas[f] !== undefined ? pMeas[f] : p[f]); if (val !== '') { const n = parseFloat(val); upd[f] = isNaN(n) ? val : (factor === 1 ? n : parseFloat((n * factor).toFixed(1))); } });
      upd.estimated_age = calcAge(upd.dress_length || upd.total_height, upd.selected_model, upd.unit, activeProds);
      return upd;
    }));
    showToast && showToast(`✨ تم ربط مقاسات (${safeStr(p.child_name)}) بنجاح`);
  };

  const buildEnriched = () => {
    const inv = measurements.find(m => !safeStr(m.child_name).trim() || !safeStr(m.selected_model).trim());
    if (inv) {
      const msg = !safeStr(inv.child_name).trim() ? 'يرجى تحديد اسم صاحبة المقاس ⚠️' : 'يرجى اختيار الموديل المطلوب ⚠️';
      showToast && showToast(msg, 'error'); return null;
    }
    return measurements.map((m, idx) => {
      const isAd = targetMode === 'women_adults', p = activeProds.find(x => safeStr(x.name || x.model_name).trim() === safeStr(m.selected_model).trim());
      const bData = window.BespokeBOMService?.deriveBespokeBOM ? window.BespokeBOMService.deriveBespokeBOM(p, m, targetMode) : null;
      const mImg = m.model_image || m.model_img || p?.image_url || p?.image || '', mId = m.model_id || m.product_id || p?.id || '', col = m.selected_color || m.dress_color || m.color || '';
      const fbList = bData?.calculatedBomItems || m.fabrics_breakdown || m.bom_items || [];
      const vAlert = bData?.varianceAlert || '', oNotes = m.sewing_notes || m.notes || '', fNotes = vAlert && !oNotes.includes('تنبيه فني') ? (oNotes ? `${oNotes} | ${vAlert}` : vAlert) : oNotes;
      const wType = String(m.wearer_type || (isAd ? 'SELF' : 'DEPENDENT')).toUpperCase();
      const tSeg = String(m.target_segment || (wType === 'SELF' ? 'WOMEN_APPAREL' : 'GIRLS_DRESS')).toUpperCase();
      const chNameVal = safeStr(m.child_name).trim() || (wType === 'SELF' || isAd ? (custNameStr || 'العميلة نفسها') : '');
      return {
        ...m, id: m.id || m.measurement_id || (Date.now() + idx), measurement_id: m.id || m.measurement_id || (Date.now() + idx),
        child_id: wType === 'SELF' ? '' : (m.child_id || customer?.children?.[idx]?.id || ''), wearer_type: wType, target_segment: tSeg,
        hip_circ: m.hips_circ || m.hip_circ || '', arm_circ: m.arm_circ || '', armpit_circ: m.armhole_circ || m.armpit_circ || '',
        target_mode: targetMode, child_name: chNameVal,
        model_id: mId, product_id: mId, model_image: mImg, model_img: mImg, image_url: mImg, dress_color: col, color: col, selected_color: col,
        age_tier: bData?.ageTier || (isAd ? 'M' : '6-9Y'), size_code: bData?.ageTier || (isAd ? 'M' : '6-9Y'), estimated_age: isAd ? 'مقاس كبار / نسائي' : (m.estimated_age || bData?.ageTier || '6-9Y'),
        adjusted_price: bData?.calculatedPrice || parseFloat(m.adjusted_price || 0), price: bData?.calculatedPrice || parseFloat(m.adjusted_price || 0), total_amount: bData?.calculatedPrice || parseFloat(m.adjusted_price || 0), bom_items: fbList, fabrics_data: fbList, fabrics_breakdown: fbList, fabric_summary: bData?.bomSummary || '', sewing_notes: fNotes, notes: fNotes
      };
    });
  };

  const handleSave = async (andProceed = false) => {
    const enriched = buildEnriched();
    if (!enriched) return;
    if (andProceed && (!customer?.id || customer?.isDraftOrder || customer?.isNew)) {
      if (onProceedToFinance) onProceedToFinance(enriched, { ...customer, measurements: enriched });
      return;
    }
    if (!onSaveMeasurements) return andProceed && onProceedToFinance ? onProceedToFinance(enriched) : (onClose && onClose());
    try {
      const saved = await onSaveMeasurements(customer, enriched);
      if (saved) { if (saved.measurements?.length) setMeasurements(saved.measurements); if (andProceed && onProceedToFinance) onProceedToFinance(saved.measurements || enriched, saved); else onClose && onClose(); }
    } catch (err) { showToast && showToast(err?.message || 'فشل حفظ المقاسات بالسيرفر ⚠️', 'error'); }
  };
  if (!isOpen || !customer) return null;
  const Layout = window.UnifiedCustomerModalLayout, isAdult = effectiveIsAdult, Form = window.CustomerMeasurementsForm, modalTitle = customer ? `سجل المقاسات والتفصيل • ${safeStr(customer.name)}` : 'سجل المقاسات والتفصيل';
  const handleBackToStep1 = () => { const enriched = (measurements.some(m => safeStr(m.child_name).trim()) ? buildEnriched() : null) || measurements; if (onProceedToFinance) onProceedToFinance(enriched, { ...customer, measurements: enriched }); if (onSwitchStep) onSwitchStep(1); };
  return (
    <Layout isOpen={isOpen} onClose={onClose} step={2} onSwitchStep={onSwitchStep} title={modalTitle} customerCode={customer?.customer_id || customer?.id}
      footerRight={<div className="flex items-center gap-2"><button type="button" onClick={onClose} className="h-7 px-3 text-xs text-[#334155] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white rounded-lg border border-[#CBD5E1] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">إلغاء</button>{onSwitchStep && <button type="button" onClick={handleBackToStep1} className="h-7 px-3 text-xs text-[#334155] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white rounded-lg border border-[#CBD5E1] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"><span>السابق: بيانات العميل</span><span>➡️</span></button>}</div>}
      footerLeft={<div className="flex items-center gap-2"><button type="button" onClick={() => handleSave(false)} disabled={isSaving} className="h-8 px-3.5 border border-pink-300 dark:border-pink-700/60 bg-pink-50 dark:bg-transparent text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-950/40 text-xs font-bold rounded-lg transition cursor-pointer disabled:opacity-60">{isSaving ? 'جاري الحفظ...' : 'حفظ المقاسات فقط 💾'}</button><button type="button" onClick={() => handleSave(true)} disabled={isSaving} className="h-8 px-4 text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white rounded-lg shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"><span>التالي: الحساب المالي ⬅️</span></button></div>}>
      <div className="space-y-2">
        {/* Tabs for Profiles */}
        <div className="flex items-center justify-between flex-wrap gap-1.5 pb-1 border-b border-[#CBD5E1] dark:border-slate-800">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {measurements.map((m, idx) => {
              const isSelfTab = String(m.wearer_type || '').toUpperCase() === 'SELF';
              return (
                <button key={m.id || idx} type="button" onClick={() => setActiveChildIdx(idx)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition ${activeChildIdx === idx ? 'bg-pink-600 text-white border-pink-500' : 'bg-white dark:bg-[#0F172A] text-[#334155] dark:text-slate-300 border-[#CBD5E1] dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'}`}>{safeStr(m.child_name, isSelfTab ? `العميلة (${idx + 1})` : `مستفيد (${idx + 1})`)}</button>
              );
            })}
            <button type="button" onClick={() => { setMeasurements(p => [...p, getEmpty(effectiveMode)]); setActiveChildIdx(measurements.length); }} className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-800/60 hover:bg-pink-100 dark:hover:bg-pink-900/60 cursor-pointer">+ مستفيد آخر</button>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#F1F5F9] dark:bg-slate-800 text-pink-700 dark:text-pink-300 border border-[#CBD5E1] dark:border-slate-700">الوحدة: <b className="text-[#0F172A] dark:text-white font-mono">{isCurrInch ? 'إنش' : 'سم'}</b></span>
            <button type="button" onClick={() => toggleUnit(activeChildIdx)} className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/50 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 cursor-pointer">تحويل إلى ({isCurrInch ? 'سم' : 'إنش'}) 🔄</button>
            {measurements.length > 1 && <button type="button" onClick={() => { setMeasurements(p => p.filter((_, i) => i !== activeChildIdx)); setActiveChildIdx(0); }} className="px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer">حذف 🗑️</button>}
          </div>
        </div>

        {!isAdult && knownPrincesses.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap p-1.5 bg-[#F8FAFC] dark:bg-[#0B132B] rounded-lg border border-[#CBD5E1] dark:border-slate-800">
            <span className="text-[10px] font-bold text-[#334155] dark:text-slate-400">👑 مقاسات محفوظة:</span>
            {knownPrincesses.map((p, idx) => (<button key={idx} type="button" onClick={() => handleSelectKnownPrincess(p)} className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 hover:bg-purple-700 hover:text-white transition cursor-pointer">{safeStr(p.child_name)}{formatSavedLength(p) ? ` (${formatSavedLength(p)})` : ''} ↵</button>))}
          </div>
        )}

        {Form && <Form currM={currM} activeChildIdx={activeChildIdx} targetMode={effectiveMode} customerName={custNameStr} uniqueModels={uniqueModels} activeFields={activeFields} onUpdate={updateMeasurement} onSelectModel={handleSelectModel} selectedProduct={selectedProduct} />}
        {outOfRangeViolations.length > 0 && <div className="p-1 px-2 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">⚠️ تنبيه: قيمة ({outOfRangeViolations.join('، ')}) خارج النطاق المعتاد، يرجى التحقق من الرقم المدخل.</div>}

        {/* Persistent Real-Time Summary Bar */}
        {hasBasicMeasurements ? (
          <div className="flex flex-wrap items-center justify-between p-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0B132B] border border-[#CBD5E1] dark:border-slate-800 text-[11px] mt-1.5 font-bold">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-cyan-700 dark:text-cyan-400">👗 الموديل: {safeStr(selectedProduct?.name || selectedProduct?.model_name || currM.selected_model, '---')}</span>
              <span className={`px-1.5 py-0.2 rounded border text-[10px] font-mono ${bespokeBOM?.isExceeded ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-600/80' : 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-700/60'}`}>{bespokeBOM?.isExceeded ? `⚠️ الفئة: ${calculatedAgeTier}` : `🏷️ الفئة: ${calculatedAgeTier}`}</span>
              {calculatedBomItems?.map((item, idx) => (<span key={idx} className="bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-white px-1.5 py-0.5 rounded border border-[#CBD5E1] dark:border-slate-700 text-[10.5px]">🧵 {safeStr(item?.name || item, 'خامة')}: {Number(item?.qty || 0).toFixed(2)} {safeStr(item?.unit, 'متر')}</span>))}
            </div>
            <div className="text-emerald-700 dark:text-emerald-400 font-black whitespace-nowrap text-xs">💰 الإجمالي: {Number(calculatedPrice || 0).toLocaleString('en-US')} {safeStr(currency?.symbol || currency?.code || 'YER')}</div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0B132B]/80 border border-dashed border-[#CBD5E1] dark:border-slate-700 text-[#64748B] dark:text-slate-400 text-[11px] font-semibold mt-1.5 text-center">✨ أدخل المقاسات لحساب استهلاك الأقمشة والتكلفة تلقائياً</div>
        )}
      </div>
    </Layout>
  );
}
window.CustomerMeasurementsModal = window.BespokeMeasurementsModal = CustomerMeasurementsModal;
