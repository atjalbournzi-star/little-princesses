// src/features/customers/components/CustomerMeasurementsModal.jsx
const { useState, useEffect, useMemo } = React;

function CustomerMeasurementsModal({
  isOpen, onClose, customer, products = [], currency = { display: 'YER', symbol: '﷼' },
  onSaveMeasurements, onProceedToFinance, isSaving = false, showToast, getKnownPrincesses,
  currentStep = 2, onSwitchStep
}) {
  const { calculateAge, emptyMeasurement, getSmartModelMatch, KIDS_MEASUREMENT_FIELDS, ADULT_MEASUREMENT_FIELDS } = window.customerUtils || {};
  const safeStr = (v, fb = '') => {
    if (v === null || v === undefined) return fb;
    if (typeof v !== 'object') return String(v);
    const val = v.ar || v.name || v.model_name || v.label || v.title || v.child_name || v.value;
    return (val && typeof val !== 'object') ? String(val) : ((val && typeof val === 'object') ? safeStr(val, fb) : fb);
  };
  const custNameStr = safeStr(customer?.name), derivedChild = (custNameStr ? custNameStr.replace(/^(ام|أم|والدة)\s+/i, '').trim() : '');
  const getEmpty = (mode = 'kids', idx = 0) => (emptyMeasurement ? emptyMeasurement(mode) : { id: Date.now() + idx, child_name: mode === 'women_adults' ? (custNameStr || 'الأم') : (idx === 0 && derivedChild !== custNameStr ? derivedChild : ''), unit: 'سم', target_mode: mode }), calcAge = calculateAge || (() => ''), smartMatch = getSmartModelMatch || (() => null);
  const [measurements, setMeasurements] = useState([]), [activeChildIdx, setActiveChildIdx] = useState(0), [targetMode, setTargetMode] = useState('kids'), [prods, setProds] = useState(products || []);

  useEffect(() => {
    if (products?.length) setProds(products);
    else fetch('/api/products').then(r => r.json()).then(d => { const l = d?.data || d || []; if (l.length) setProds(l); }).catch(() => {});
  }, [products]);
  const activeProds = (prods?.length) ? prods : (products || []);

  useEffect(() => {
    if (!isOpen || !customer) return;
    const cN = v => (v === undefined || v === null || v === '' || parseFloat(v) === 0) ? '' : (parseFloat(v) || v);
    const NUM_FIELDS = ['total_height','dress_length','chest_length','skirt_length','sleeve_length','chest_circ','waist_circ','shoulder_width','armhole_circ','neck_circ','hips_circ','arm_circ','bust_drop'];
    const hydrateList = (raw) => {
      if (!raw || !raw.length) { setMeasurements([getEmpty('kids', 0)]); setActiveChildIdx(0); return; }
      if (raw.some(m => m.target_mode === 'women_adults' || m.hips_circ || m.arm_circ || m.bust_drop)) setTargetMode('women_adults');
      setMeasurements(raw.map((m, i) => {
        const cName = safeStr(m.child_name || m.name || customer?.children?.[i]?.child_name).trim();
        const chName = cName || (m.target_mode === 'women_adults' ? (custNameStr || 'الأم') : (i === 0 && derivedChild !== custNameStr ? derivedChild : `الأميرة (${i + 1})`));
        const comfort = Array.isArray(m.comfort_profile) ? m.comfort_profile : (typeof m.comfort_profile === 'string' && m.comfort_profile ? m.comfort_profile.replace(/[\[\]']/g, '').split(',').map(s => s.trim()).filter(Boolean) : []);
        const rawU = String(m.unit || '').trim(), u = /^(inch|in|إنش|انش)$/i.test(rawU) ? 'إنش' : 'سم', dL = cN(m.dress_length ?? m.dress_len), tH = cN(m.total_height ?? m.total_len), mod = m.selected_model || m.model_name || '';
        const o = {
          id: m.id || (Date.now() + i), child_id: m.child_id || customer?.children?.[i]?.id || '', child_name: chName,
          target_mode: m.target_mode || (raw.some(x => x.target_mode === 'women_adults') ? 'women_adults' : 'kids'), unit: u, selected_model: mod, dress_color: m.dress_color || '',
          meas_date: m.meas_date || m.measurement_date || (typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : ''), event_date: m.event_date || m.date || '', model_image: m.model_image || m.model_img || '',
          total_height: tH, dress_length: dL, fabric_type: m.fabric_type || '', fabric_meters: cN(m.fabric_meters), adjusted_price: cN(m.adjusted_price), comfort_profile: comfort,
          sewing_notes: m.sewing_notes || m.notes || '', estimated_age: m.estimated_age || calcAge(dL || tH, mod, u, activeProds), fabrics_breakdown: m.fabrics_breakdown || []
        };
        NUM_FIELDS.forEach(f => { o[f] = cN(m[f]); });
        return o;
      }));
      setActiveChildIdx(0);
    };

    if (customer.measurements?.length) hydrateList(customer.measurements);
    else if (customer.children?.length) hydrateList(customer.children);
    else {
      const cid = customer.customer_id || customer.id;
      if (!cid) return setMeasurements([getEmpty('kids', 0)]);
      fetch('/api/crm/customers').then(r => r.json()).then(d => {
        const list = d?.data || d || [], match = list.find(c => (c.customer_id || c.id) === cid || (customer.phone && c.phone === customer.phone));
        hydrateList(match?.measurements?.length ? match.measurements : match?.children);
      }).catch(() => setMeasurements([getEmpty('kids', 0)]));
    }
  }, [customer, isOpen]);

  const currM = measurements[activeChildIdx] || measurements[0] || getEmpty(targetMode, 0), activeFields = (targetMode === 'women_adults' ? ADULT_MEASUREMENT_FIELDS : KIDS_MEASUREMENT_FIELDS) || [];
  const knownPrincesses = useMemo(() => typeof getKnownPrincesses === 'function' ? getKnownPrincesses(customer) : [], [customer, getKnownPrincesses]);
  const dLen = parseFloat(currM?.dress_length || currM?.dress_len), cCirc = parseFloat(currM?.chest_circ || currM?.chest_circumference), hasBasicMeasurements = !isNaN(dLen) && dLen > 0 && !isNaN(cCirc) && cCirc > 0;
  const selectedProduct = useMemo(() => activeProds.find(x => safeStr(x.name || x.model_name).trim() === safeStr(currM?.selected_model).trim()) || null, [activeProds, currM?.selected_model]);
  const bespokeBOM = useMemo(() => {
    if (!hasBasicMeasurements) return { ageTier: '6-9Y', calculatedBomItems: [], calculatedPrice: 0, bomSummary: '' };
    return (window.useBespokeBOM ? window.useBespokeBOM(selectedProduct, currM, targetMode) : (window.BespokeBOMService?.deriveBespokeBOM ? window.BespokeBOMService.deriveBespokeBOM(selectedProduct, currM, targetMode) : null)) || { ageTier: '6-9Y', calculatedBomItems: [], calculatedPrice: 0, bomSummary: '' };
  }, [selectedProduct, currM, targetMode, hasBasicMeasurements]);
  const { ageTier: calculatedAgeTier, calculatedBomItems, calculatedPrice } = bespokeBOM;

  const uniqueModels = useMemo(() => {
    const s = new Set();
    activeProds.forEach(p => { const n = safeStr(p.name || p.model_name).trim(); if (n) s.add(n); });
    measurements.forEach(m => { const n = safeStr(m.selected_model || m.model_name).trim(); if (n) s.add(n); });
    const cM = safeStr(currM?.selected_model).trim(); if (cM) s.add(cM);
    return Array.from(s).filter(Boolean);
  }, [activeProds, measurements, currM?.selected_model]);

  const updateMeasurement = (idx, field, value) => {
    setMeasurements(prev => prev.map((m, i) => {
      if (i !== idx) return m;
      const upd = { ...m, [field]: value };
      if (['dress_length', 'total_height', 'selected_model', 'unit'].includes(field)) upd.estimated_age = calcAge(upd.dress_length || upd.total_height, upd.selected_model, upd.unit, activeProds);
      return upd;
    }));
  };

  const handleSelectModel = (modelName) => {
    const p = activeProds.find(x => safeStr(x.name || x.model_name).trim() === safeStr(modelName).trim());
    const img = p?.image_url || p?.image || p?.image_data || '', pId = p?.id || p?.product_id || '';
    let rawCols = p?.colors || p?.approved_colors || [];
    if (typeof rawCols === 'string') { try { rawCols = JSON.parse(rawCols); } catch (e) { rawCols = rawCols.split(',').map(s => s.trim()).filter(Boolean); } }
    const cols = Array.isArray(rawCols) ? rawCols : [];
    const matchedCol = (cols.includes(currM?.dress_color) ? currM.dress_color : (cols[0] || ''));
    setMeasurements(prev => prev.map((m, i) => i === activeChildIdx ? { ...m, selected_model: modelName, model_id: pId, product_id: pId, model_image: img, model_img: img, dress_color: matchedCol, selected_color: matchedCol, color: matchedCol } : m));
  };

  const isCurrInch = /^(inch|in|إنش|انش)$/i.test(String(currM?.unit || '').trim());
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
    const m = measurements[idx], isInch = /^(inch|in|إنش|انش)$/i.test(String(m?.unit || '').trim()), factor = isInch ? 2.54 : (1 / 2.54), upd = { ...m, unit: isInch ? 'سم' : 'إنش' };
    ['total_height','dress_length','chest_length','skirt_length','sleeve_length','chest_circ','waist_circ','shoulder_width','armhole_circ','neck_circ','hips_circ','arm_circ','bust_drop'].forEach(f => { if (m[f] !== '' && !isNaN(parseFloat(m[f]))) upd[f] = (parseFloat(m[f]) * factor).toFixed(1); });
    upd.estimated_age = calcAge(upd.dress_length || upd.total_height, upd.selected_model, upd.unit, activeProds);
    setMeasurements(prev => prev.map((item, i) => i === idx ? upd : item));
  };

  const handleSelectKnownPrincess = (p) => {
    const cN = v => (v === undefined || v === null || v === '' || parseFloat(v) === 0) ? '' : (parseFloat(v) || v);
    const pMeas = (customer?.measurements || []).find(m => String(m.child_name || m.name || '').trim() === String(p.child_name || '').trim()) || p;
    const rawU = String(p.unit || pMeas?.unit || '').trim(), rawL = parseFloat(p.dress_length || pMeas.dress_length);
    const isPInch = /^(inch|in|إنش|انش)$/i.test(rawU) || (!rawU && rawL <= 45), factor = (isPInch !== isCurrInch) ? (isCurrInch ? (1 / 2.54) : 2.54) : 1;
    setMeasurements(prev => prev.map((m, i) => {
      if (i !== activeChildIdx) return m;
      const upd = { ...m, child_name: p.child_name || m.child_name, selected_model: p.selected_model || p.model_name || m.selected_model, unit: isCurrInch ? 'إنش' : 'سم' };
      ['total_height','dress_length','chest_length','skirt_length','sleeve_length','chest_circ','waist_circ','shoulder_width','armhole_circ','neck_circ'].forEach(f => {
        const val = cN(pMeas[f] !== undefined ? pMeas[f] : p[f]);
        if (val !== '') { const n = parseFloat(val); upd[f] = isNaN(n) ? val : (factor === 1 ? n : parseFloat((n * factor).toFixed(1))); }
      });
      upd.estimated_age = calcAge(upd.dress_length || upd.total_height, upd.selected_model, upd.unit, activeProds);
      return upd;
    }));
    showToast && showToast(`✨ تم ربط مقاسات الأميرة (${safeStr(p.child_name)}) بنجاح`);
  };

  const buildEnriched = () => {
    if (!measurements.some(m => (safeStr(m.child_name) || '').trim())) { showToast && showToast('يرجى تحديد اسم صاحبة المقاس ⚠️', 'error'); return null; }
    return measurements.map((m, idx) => {
      const isAd = targetMode === 'women_adults', p = activeProds.find(x => safeStr(x.name || x.model_name).trim() === safeStr(m.selected_model).trim());
      const bData = window.BespokeBOMService?.deriveBespokeBOM ? window.BespokeBOMService.deriveBespokeBOM(p, m, targetMode) : null;
      const mImg = m.model_image || m.model_img || p?.image_url || p?.image || '', mId = m.model_id || m.product_id || p?.id || '', col = m.selected_color || m.dress_color || m.color || '';
      const fbList = bData?.calculatedBomItems || m.fabrics_breakdown || m.bom_items || [];
      return {
        ...m, id: m.id || m.measurement_id || (Date.now() + idx), measurement_id: m.id || m.measurement_id || (Date.now() + idx),
        child_id: m.child_id || customer?.children?.[idx]?.id || '', target_mode: targetMode,
        child_name: safeStr(m.child_name).trim() || (isAd ? `العميلة (${idx + 1})` : `الأميرة (${idx + 1})`),
        model_id: mId, product_id: mId, model_image: mImg, model_img: mImg, image_url: mImg, dress_color: col, color: col, selected_color: col,
        age_tier: bData?.ageTier || (isAd ? 'M' : '6-9Y'), estimated_age: isAd ? 'مقاس كبار / نسائي' : (m.estimated_age || bData?.ageTier || '6-9Y'),
        adjusted_price: bData?.calculatedPrice || parseFloat(m.adjusted_price || 0), bom_items: fbList,
        fabrics_data: fbList, fabrics_breakdown: fbList, fabric_summary: bData?.bomSummary || ''
      };
    });
  };

  const handleSave = async (andProceed = false) => {
    const enriched = buildEnriched();
    if (!enriched) return;
    if (onSaveMeasurements) await onSaveMeasurements(customer, enriched);
    if (andProceed && onProceedToFinance) onProceedToFinance(enriched); else onClose && onClose();
  };

  if (!isOpen || !customer) return null;
  const Layout = window.UnifiedCustomerModalLayout, isAdult = targetMode === 'women_adults', Form = window.CustomerMeasurementsForm;
  const modalTitle = customer ? `سجل المقاسات والتفصيل • ${safeStr(customer.name)}` : 'سجل المقاسات والتفصيل';
  return (
    <Layout
      isOpen={isOpen} onClose={onClose} step={2} onSwitchStep={onSwitchStep} title={modalTitle} customerCode={customer?.customer_id || customer?.id}
      extraHeaderLeft={<div className="flex items-center bg-[#0F172A] p-0.5 rounded-lg border border-slate-700"><button type="button" onClick={() => { setTargetMode('kids'); if (!measurements.length) setMeasurements([getEmpty('kids')]); }} className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition cursor-pointer ${!isAdult ? 'bg-pink-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}>👧 أطفال</button><button type="button" onClick={() => { setTargetMode('women_adults'); if (!measurements.length) setMeasurements([getEmpty('women_adults')]); }} className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition cursor-pointer ${isAdult ? 'bg-pink-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}>👗 نسائي/كبار</button></div>}
      footerRight={<div className="flex items-center gap-2"><button type="button" onClick={onClose} className="h-7 px-3 text-xs text-slate-400 hover:text-white rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer">إلغاء</button>{onSwitchStep && <button type="button" onClick={() => onSwitchStep(1)} className="h-7 px-3 text-xs text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"><span>السابق: بيانات العميل</span><span>➡️</span></button>}</div>}
      footerLeft={<div className="flex items-center gap-2"><button type="button" onClick={() => handleSave(false)} disabled={isSaving} className="h-8 px-3.5 border border-pink-700/60 text-pink-300 hover:bg-pink-950/40 text-xs font-bold rounded-lg transition cursor-pointer disabled:opacity-60">{isSaving ? 'جاري الحفظ...' : 'حفظ المقاسات فقط 💾'}</button><button type="button" onClick={() => handleSave(true)} disabled={isSaving} className="h-8 px-4 text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white rounded-lg shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"><span>التالي: الحساب المالي ⬅️</span></button></div>}
    >
      <div className="space-y-2">
        {/* Tabs for Profiles */}
        <div className="flex items-center justify-between flex-wrap gap-1.5 pb-1 border-b border-slate-800">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {measurements.map((m, idx) => (
              <button key={m.id || idx} type="button" onClick={() => setActiveChildIdx(idx)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition ${activeChildIdx === idx ? 'bg-pink-600 text-white border-pink-500' : 'bg-[#0F172A] text-slate-300 border-slate-700 hover:border-slate-600'}`}>{safeStr(m.child_name, isAdult ? `العميلة (${idx + 1})` : `الأميرة (${idx + 1})`)}</button>
            ))}
            <button type="button" onClick={() => { setMeasurements(p => [...p, getEmpty(targetMode)]); setActiveChildIdx(measurements.length); }} className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-pink-950/40 text-pink-300 border border-pink-800/60 hover:bg-pink-900/60 cursor-pointer">➕ {isAdult ? 'مقاس كبار آخر' : 'طفلة أخرى'}</button>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => toggleUnit(activeChildIdx)} className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-950/40 text-cyan-300 border border-cyan-800/50 hover:bg-cyan-900/50 cursor-pointer">تحويل ({isCurrInch ? 'سم' : 'إنش'}) 🔄</button>
            {measurements.length > 1 && <button type="button" onClick={() => { setMeasurements(p => p.filter((_, i) => i !== activeChildIdx)); setActiveChildIdx(0); }} className="px-1.5 py-0.5 text-[10px] font-bold text-rose-400 hover:bg-rose-950/40 rounded cursor-pointer">حذف 🗑️</button>}
          </div>
        </div>

        {/* Known Princesses (Kids Mode) */}
        {!isAdult && knownPrincesses.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap p-1.5 bg-[#0B132B] rounded-lg border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400">👑 مقاسات محفوظة:</span>
            {knownPrincesses.map((p, idx) => (
              <button key={idx} type="button" onClick={() => handleSelectKnownPrincess(p)} className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/50 text-purple-300 border border-purple-800/50 hover:bg-purple-800 hover:text-white transition cursor-pointer">{safeStr(p.child_name)}{formatSavedLength(p) ? ` (${formatSavedLength(p)})` : ''} ↵</button>
            ))}
          </div>
        )}

        {Form && <Form currM={currM} activeChildIdx={activeChildIdx} targetMode={targetMode} uniqueModels={uniqueModels} activeFields={activeFields} onUpdate={updateMeasurement} onSelectModel={handleSelectModel} selectedProduct={selectedProduct} />}

        {/* Persistent Real-Time Summary Bar */}
        {hasBasicMeasurements ? (
          <div className="flex flex-wrap items-center justify-between p-2 rounded-lg bg-[#0B132B] border border-slate-800 text-[11px] mt-1.5">
            <div className="flex items-center gap-2 flex-wrap font-bold">
              <span className="text-cyan-400">👗 الموديل: {safeStr(selectedProduct?.name || selectedProduct?.model_name || currM.selected_model, '---')}</span>
              {calculatedBomItems?.length > 0 && <span className="text-slate-600">|</span>}
              {calculatedBomItems?.map((item, idx) => (
                <span key={idx} className="bg-[#0F172A] text-white font-bold px-1.5 py-0.5 rounded border border-slate-700 text-[10.5px]">🧵 {safeStr(item?.name || item, 'خامة')}: {Number(item?.qty || 0).toFixed(2)} {safeStr(item?.unit, 'متر')}</span>
              ))}
            </div>
            <div className="text-emerald-400 font-black whitespace-nowrap text-xs">💰 الإجمالي: {Number(calculatedPrice || 0).toLocaleString()} {safeStr(currency?.display || currency, 'YER')}</div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-2 rounded-lg bg-[#0B132B]/80 border border-dashed border-slate-700 text-slate-400 text-[11px] font-semibold mt-1.5 text-center">✨ أدخل المقاسات لحساب استهلاك الأقمشة والتكلفة تلقائياً</div>
        )}
      </div>
    </Layout>
  );
}
window.CustomerMeasurementsModal = window.BespokeMeasurementsModal = CustomerMeasurementsModal;
