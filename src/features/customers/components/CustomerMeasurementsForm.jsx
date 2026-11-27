// src/features/customers/components/CustomerMeasurementsForm.jsx
// نموذج مدخلات المقاسات الفنية واختيار الموديل والألوان المعتمدة لنمطي الأطفال والكبار

function CustomerMeasurementsForm({
  currM, activeChildIdx, targetMode, customerName = '', uniqueModels, activeFields,
  inputCls, labelCls, onUpdate, onSelectModel, selectedProduct
}) {
  const { useState, useEffect, useMemo } = React;
  const mData = currM || {};
  const [sizeMatrices, setSizeMatrices] = useState([]);
  useEffect(() => {
    let active = true;
    const load = window.TailoringAPI?.getSizeMatrices ? window.TailoringAPI.getSizeMatrices('', false) : fetch('/api/size-matrices').then(r => r.json());
    Promise.resolve(load).then(res => {
      if (!active) return;
      const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setSizeMatrices(rows);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const isSelf = String(mData.wearer_type || (targetMode === 'women_adults' ? 'SELF' : 'DEPENDENT')).toUpperCase() === 'SELF';
  const activeSegment = String(mData.target_segment || (isSelf ? 'WOMEN_APPAREL' : 'GIRLS_DRESS')).toUpperCase();
  const isAdult = targetMode === 'women_adults' || isSelf || activeSegment === 'WOMEN_APPAREL';
  const segMatrices = useMemo(() => (sizeMatrices || []).filter(m => String(m.segment_code || '').toUpperCase() === activeSegment), [sizeMatrices, activeSegment]);
  const KIDS_FIELDS = [
    ['dress_length', 'طول الفستان'], ['chest_circ', 'محيط الصدر'], ['waist_circ', 'محيط الخصر'],
    ['shoulder_width', 'عرض الكتفين'], ['chest_length', 'طول الصدر'], ['skirt_length', 'طول التنورة'],
    ['sleeve_length', 'طول الكم'], ['armhole_circ', 'محيط الإبط'], ['neck_circ', 'محيط الرقبة'], ['total_height', 'الطول الكلي']
  ];
  const ADULT_FIELDS = [
    ['chest_circ', 'محيط الصدر'], ['waist_circ', 'محيط الخصر'], ['hips_circ', 'محيط الأرداف'],
    ['dress_length', 'طول الفستان'], ['shoulder_width', 'عرض الكتفين'], ['sleeve_length', 'طول الكم'],
    ['arm_circ', 'محيط الذراع'], ['chest_length', 'طول الصدر'], ['skirt_length', 'طول التنورة'],
    ['armhole_circ', 'محيط الإبط'], ['neck_circ', 'محيط الرقبة'], ['bust_drop', 'نزول الصدر']
  ];
  const fieldsToRender = isAdult ? ADULT_FIELDS : KIDS_FIELDS;
  const modelImg = mData.model_image || mData.model_img || selectedProduct?.image_url || selectedProduct?.image || selectedProduct?.image_data;
  const rawColors = selectedProduct?.colors || selectedProduct?.approved_colors || [];
  let approvedColors = [];
  if (Array.isArray(rawColors)) approvedColors = rawColors;
  else if (typeof rawColors === 'string' && rawColors.trim()) {
    try { const p = JSON.parse(rawColors); approvedColors = Array.isArray(p) ? p : [String(p).trim()]; }
    catch (e) { approvedColors = rawColors.split(',').map(s => s.trim()).filter(Boolean); }
  }
  const selectedCol = mData.dress_color || mData.selected_color || '';
  const matchResult = window.SmartSizingMatcher?.matchClientMeasurementToCategory ? window.SmartSizingMatcher.matchClientMeasurementToCategory(mData, selectedProduct) : null;
  const varianceAlert = matchResult?.varianceAlert || '';

  const handleSelectStandardSize = (val) => {
    const patch = { manual_tier: val, size_code: val };
    const mat = segMatrices.find(t => String(t.size_label) === String(val));
    if (mat) {
      const isInch = /^(inch|in|إنش|انش)$/i.test(String(mData?.unit || '').trim());
      const conv = (cm) => (cm === null || cm === undefined || cm === '') ? '' : (isInch ? Number((parseFloat(cm) / 2.54).toFixed(1)) : parseFloat(cm));
      if (mat.chest_cm) patch.chest_circ = conv(mat.chest_cm);
      if (mat.waist_cm) patch.waist_circ = conv(mat.waist_cm);
      if (mat.hip_cm) patch.hips_circ = conv(mat.hip_cm);
      if (mat.dress_length_cm) patch.dress_length = conv(mat.dress_length_cm);
      if (mat.shoulder_cm) patch.shoulder_width = conv(mat.shoulder_cm);
      if (mat.sleeve_cm) patch.sleeve_length = conv(mat.sleeve_cm);
    }
    onUpdate(activeChildIdx, patch);
  };

  const fldCls = "w-full h-7 px-2 text-xs font-bold bg-white dark:bg-[#111C38] border border-[#CBD5E1] dark:border-slate-700 rounded-lg text-[#0F172A] dark:text-white placeholder-[#64748B] outline-none focus:border-pink-500";
  const lblCls = "block text-[10px] font-semibold text-[#334155] dark:text-slate-300 mb-0.5";

  return (
    <div className="space-y-2 select-none" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 bg-[#F8FAFC] dark:bg-[#0B132B] rounded-xl border border-[#CBD5E1] dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-[#334155] dark:text-slate-300 shrink-0">نوع المستفيد:</span>
          <select value={mData.wearer_type || (isAdult ? 'SELF' : 'DEPENDENT')} onChange={e => {
            const v = e.target.value, isS = v === 'SELF';
            onUpdate(activeChildIdx, { wearer_type: v, target_segment: isS ? 'WOMEN_APPAREL' : 'GIRLS_DRESS', target_mode: isS ? 'women_adults' : 'kids', manual_tier: '', size_code: '', ...(isS && customerName && !mData.child_name ? { child_name: customerName } : {}) });
          }} className="h-7 flex-1 px-2 text-[11px] font-bold bg-white dark:bg-[#111C38] border border-[#CBD5E1] dark:border-slate-700 rounded-lg text-[#0F172A] dark:text-white outline-none focus:border-pink-500">
            <option value="SELF">العميلة نفسها (مقاس شخصي)</option>
            <option value="DEPENDENT">تابع / ابنة</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-[#334155] dark:text-slate-300 shrink-0">الفئة القياسية:</span>
          <select value={activeSegment} onChange={e => {
            const v = e.target.value;
            onUpdate(activeChildIdx, { target_segment: v, target_mode: v === 'WOMEN_APPAREL' ? 'women_adults' : 'kids', manual_tier: '', size_code: '' });
          }} className="h-7 flex-1 px-2 text-[11px] font-bold bg-white dark:bg-[#111C38] border border-[#CBD5E1] dark:border-slate-700 rounded-lg text-[#0F172A] dark:text-white outline-none focus:border-pink-500">
            <option value="WOMEN_APPAREL">ملابس نسائية</option>
            <option value="GIRLS_DRESS">فساتين بنات</option>
            <option value="SCHOOL_UNIFORM">زي مدرسي</option>
          </select>
        </div>
      </div>
      {/* Model & Basic Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 p-2 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl border border-[#CBD5E1] dark:border-slate-800">
        <div>
          <label className={lblCls}>{isSelf ? 'اسم العميلة (شخصي) *' : 'اسم المستفيدة / الابنة *'}</label>
          <input value={mData.child_name || ''} onChange={e => onUpdate(activeChildIdx, 'child_name', e.target.value)} className={fldCls} />
        </div>
        <div>
          <label className={lblCls}>الموديل من الكتالوج</label>
          <div className="flex items-center gap-1.5">
            {modelImg && (
              <div className="w-7 h-7 rounded-md bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 overflow-hidden shrink-0">
                <img src={modelImg} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <select value={mData.selected_model || ''} onChange={e => onSelectModel(e.target.value)} className={fldCls + " cursor-pointer"}>
              <option value="">-- اختر الموديل --</option>
              {uniqueModels.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={lblCls}>اللون المختار للطلب</label>
          <select value={selectedCol} onChange={e => { const val = e.target.value; onUpdate(activeChildIdx, { dress_color: val, selected_color: val, color: val }); }} className={fldCls + " cursor-pointer"}>
            <option value="">-- اختر اللون المعتمد --</option>
            {approvedColors.map(c => <option key={c} value={c}>{c}</option>)}
            {selectedCol && !approvedColors.includes(selectedCol) && <option value={selectedCol}>{selectedCol}</option>}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="block text-[10px] font-semibold text-[#334155] dark:text-slate-300">المقاس المعياري</label>
            {mData.manual_tier && (
              <button type="button" onClick={() => onUpdate(activeChildIdx, { manual_tier: '', size_code: '' })} className="text-[9px] text-pink-600 dark:text-pink-400 hover:underline cursor-pointer">آلي ↺</button>
            )}
          </div>
          <select value={mData.manual_tier || mData.size_code || ''} onChange={e => handleSelectStandardSize(e.target.value)} className={fldCls + " cursor-pointer"}>
            <option value="">-- اختر المقاس المعياري --</option>
            {segMatrices.map(t => <option key={t.id} value={t.size_label}>{t.size_label}</option>)}
          </select>
        </div>
        <div>
          <label className={lblCls}>تاريخ المناسبة والتسليم</label>
          <input type="date" lang="en" dir="ltr" value={mData.event_date || ''} onChange={e => onUpdate(activeChildIdx, 'event_date', e.target.value)} className={fldCls + " font-mono text-left"} />
        </div>
      </div>

      {/* إنذار التباين الفني (Fit Variance Alert) للقصاص */}
      {varianceAlert && (
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-600/70 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="text-sm">⚠️</span>
            <span>{varianceAlert}</span>
          </div>
          <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 font-mono shrink-0">إنذار فني للورشة</span>
        </div>
      )}

      {/* شريط الألوان المعتمدة للموديل إن وجدت */}
      {approvedColors.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap p-1.5 bg-[#F8FAFC] dark:bg-[#0B132B] rounded-lg border border-[#CBD5E1] dark:border-slate-800 text-[10.5px]">
          <span className="font-bold text-pink-700 dark:text-pink-300 shrink-0">🎨 ألوان الموديل المعتمدة:</span>
          {approvedColors.map(col => {
            const isSel = String(selectedCol).trim() === String(col).trim();
            return (
              <button key={col} type="button" onClick={() => onUpdate(activeChildIdx, { dress_color: col, selected_color: col, color: col })}
                className={`h-6 px-2.5 rounded-md text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${isSel ? 'bg-pink-600 text-white shadow ring-2 ring-pink-400 font-extrabold' : 'bg-white dark:bg-slate-800 text-[#334155] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white border border-[#CBD5E1] dark:border-slate-700'}`}>
                <span>{col}</span>
                {isSel && <span>✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Micro-Dimension 5x2 Grid */}
      <div className={`grid grid-cols-2 ${isAdult ? 'sm:grid-cols-4' : 'sm:grid-cols-5'} gap-1.5`}>
        {fieldsToRender.map(([f, lbl]) => {
          const val = mData[f], hasVal = val !== undefined && val !== null && val !== '' && !isNaN(parseFloat(val)), num = hasVal ? parseFloat(val) : null;
          const isInch = /^(inch|in|إنش|انش)$/i.test(String(mData?.unit || '').trim());
          const sub = hasVal ? (isInch ? `≈ ${window.UnitConversionService ? window.UnitConversionService.convert(num, 'إنش', 'سم', 1) : (num * 2.54).toFixed(1)} سم` : `≈ ${window.UnitConversionService ? window.UnitConversionService.convert(num, 'سم', 'إنش', 1) : (num / 2.54).toFixed(1)}"`) : '';
          return (
            <div key={f} className="h-10 p-1 bg-white dark:bg-slate-900/80 border border-[#CBD5E1] dark:border-slate-700 rounded-lg text-center flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#334155] dark:text-slate-300 leading-tight px-1">
                <span className="truncate">{lbl}</span>
                <span className="text-[8.5px] text-[#64748B] dark:text-slate-400 font-mono">{sub}</span>
              </div>
              <input type="number" step="0.1" lang="en" dir="ltr" value={val ?? ''} onChange={e => onUpdate(activeChildIdx, f, e.target.value)}
                className="h-5 w-full text-center text-xs font-mono font-bold text-[#0F172A] dark:text-white bg-transparent outline-none focus:border-pink-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
          );
        })}
      </div>

      {/* Preferences & Workshop Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
        <div className="p-1.5 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl border border-[#CBD5E1] dark:border-slate-800">
          <label className="block text-[10.5px] font-bold text-[#0F172A] dark:text-slate-200 mb-1">✨ تفضيلات الراحة والتفصيل:</label>
          <div className="grid grid-cols-2 gap-1">
            {['حساسية من التل', 'بطانة قطن ناعم', 'فتحة سحاب مخفي', 'كشكشة مضاعفة'].map(pref => {
              const checked = (mData.comfort_profile || []).includes(pref);
              return (
                <label key={pref} className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-semibold cursor-pointer transition-colors ${checked ? 'bg-pink-50 dark:bg-pink-950/60 border-pink-400 dark:border-pink-700 text-pink-700 dark:text-pink-300' : 'bg-white dark:bg-[#111C38] border-[#CBD5E1] dark:border-slate-700 text-[#334155] dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600'}`}>
                  <input type="checkbox" checked={checked} onChange={e => {
                    const cur = mData.comfort_profile || [];
                    onUpdate(activeChildIdx, 'comfort_profile', e.target.checked ? [...cur, pref] : cur.filter(p => p !== pref));
                  }} className="accent-pink-600" />
                  <span className="truncate">{pref}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="p-1.5 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl border border-[#CBD5E1] dark:border-slate-800">
          <label className="block text-[10.5px] font-bold text-[#0F172A] dark:text-slate-200 mb-1">🧵 تعليمات التشغيل والقص للمعمل:</label>
          <textarea rows={2} value={mData.sewing_notes || ''} onChange={e => onUpdate(activeChildIdx, 'sewing_notes', e.target.value)} className="w-full h-11 p-1.5 text-xs font-medium bg-white dark:bg-[#111C38] border border-[#CBD5E1] dark:border-slate-700 rounded-lg text-[#0F172A] dark:text-white placeholder-[#64748B] outline-none focus:border-pink-500 resize-none" />
        </div>
      </div>
    </div>
  );
}

window.CustomerMeasurementsForm = CustomerMeasurementsForm;
