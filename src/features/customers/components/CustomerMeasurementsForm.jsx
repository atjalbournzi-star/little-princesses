// src/features/customers/components/CustomerMeasurementsForm.jsx
// نموذج مدخلات المقاسات الفنية واختيار الموديل والأقمشة لنمطي الأطفال والكبار

function CustomerMeasurementsForm({
  currM, activeChildIdx, targetMode, uniqueModels, activeFields,
  inputCls, labelCls, onUpdate, onSelectModel
}) {
  const isAdult = targetMode === 'women_adults';
  const KIDS_FIELDS = [
    ['dress_length', 'طول الفستان'], ['chest_circ', 'محيط الصدر'], ['waist_circ', 'محيط الخصر'],
    ['shoulder_width', 'عرض الكتفين'], ['chest_length', 'طول الصدر'], ['skirt_length', 'طول التنورة'],
    ['sleeve_length', 'طول الكم'], ['armhole_circ', 'محيط الإبط'], ['neck_circ', 'محيط الرقبة'], ['total_height', 'الطول الكلي']
  ];
  const ADULT_FIELDS = [
    ['chest_circ', 'محيط الصدر'], ['waist_circ', 'محيط الخصر'], ['hips_circ', 'محيط الأوراك'],
    ['dress_length', 'طول الفستان'], ['shoulder_width', 'عرض الكتفين'], ['sleeve_length', 'طول الكم'],
    ['arm_circ', 'دوران الذراع'], ['bust_drop', 'نزول الصدر']
  ];
  const fieldsToRender = isAdult ? ADULT_FIELDS : KIDS_FIELDS;

  return (
    <div className="space-y-2">
      {/* Model & Basic Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 p-2 bg-[#0F172A] rounded-xl border border-slate-800">
        <div>
          <label className="block text-[10px] font-semibold text-slate-300 mb-0.5">{isAdult ? 'اسم السيدة / العميلة *' : 'اسم الطفلة (الأميرة) *'}</label>
          <input value={currM.child_name || ''} onChange={e => onUpdate(activeChildIdx, 'child_name', e.target.value)} className="w-full h-7 px-2 text-xs font-bold bg-[#111C38] border border-slate-700 rounded-lg text-white outline-none focus:border-pink-500" placeholder={isAdult ? "اسم السيدة..." : "اسم الطفلة..."} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-300 mb-0.5">الموديل من الكتالوج</label>
          <select value={currM.selected_model || ''} onChange={e => onSelectModel(e.target.value)} className="w-full h-7 px-2 text-xs font-bold bg-[#111C38] border border-slate-700 rounded-lg text-white outline-none focus:border-pink-500 cursor-pointer">
            <option value="">-- اختر الموديل --</option>
            {uniqueModels.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-300 mb-0.5">اللون / تفضيل الخامة</label>
          <input value={currM.dress_color || ''} onChange={e => onUpdate(activeChildIdx, 'dress_color', e.target.value)} className="w-full h-7 px-2 text-xs font-bold bg-[#111C38] border border-slate-700 rounded-lg text-white outline-none focus:border-pink-500" placeholder="مثال: زهري ملكي، كريب..." />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-300 mb-0.5">تاريخ المناسبة والتسليم</label>
          <input type="date" lang="en-GB" dir="ltr" value={currM.event_date || ''} onChange={e => onUpdate(activeChildIdx, 'event_date', e.target.value)} className="w-full h-7 px-2 text-xs font-bold bg-[#111C38] border border-slate-700 rounded-lg text-white outline-none focus:border-pink-500" />
        </div>
      </div>

      {/* Micro-Dimension 5x2 Grid */}
      <div className={`grid grid-cols-2 ${isAdult ? 'sm:grid-cols-4' : 'sm:grid-cols-5'} gap-1.5`}>
        {fieldsToRender.map(([f, lbl]) => {
          const val = currM[f], hasVal = val !== undefined && val !== null && val !== '' && !isNaN(parseFloat(val));
          const num = hasVal ? parseFloat(val) : null;
          const sub = hasVal ? (currM.unit === 'إنش' ? `≈ ${(num*2.54).toFixed(1)} سم` : `≈ ${(num/2.54).toFixed(1)}"`) : `(${currM.unit || 'سم'})`;
          return (
            <div key={f} className="h-10 p-1 bg-slate-900/80 border border-slate-700 rounded-lg text-center flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 leading-tight px-1">
                <span className="truncate">{lbl}</span>
                <span className="text-[8.5px] text-slate-400 font-mono">{sub}</span>
              </div>
              <input
                type="number"
                step="0.1"
                value={val ?? ''}
                onChange={e => onUpdate(activeChildIdx, f, e.target.value)}
                className="h-5 w-full text-center text-xs font-bold text-white bg-transparent outline-none focus:border-pink-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="—"
              />
            </div>
          );
        })}
      </div>

      {/* Preferences & Workshop Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
        <div className="p-1.5 bg-[#0F172A] rounded-xl border border-slate-800">
          <label className="block text-[10.5px] font-bold text-slate-200 mb-1">✨ تفضيلات الراحة والتفصيل:</label>
          <div className="grid grid-cols-2 gap-1">
            {['حساسية من التل', 'بطانة قطن ناعم', 'فتحة سحاب مخفي', 'كشكشة مضاعفة'].map(pref => {
              const checked = (currM.comfort_profile || []).includes(pref);
              return (
                <label key={pref} className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-semibold cursor-pointer transition-colors ${checked ? 'bg-pink-950/60 border-pink-700 text-pink-300' : 'bg-[#111C38] border-slate-700 text-slate-300 hover:border-slate-600'}`}>
                  <input type="checkbox" checked={checked} onChange={e => {
                    const cur = currM.comfort_profile || [];
                    onUpdate(activeChildIdx, 'comfort_profile', e.target.checked ? [...cur, pref] : cur.filter(p => p !== pref));
                  }} className="accent-pink-600" />
                  <span className="truncate">{pref}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="p-1.5 bg-[#0F172A] rounded-xl border border-slate-800">
          <label className="block text-[10.5px] font-bold text-slate-200 mb-1">🧵 تعليمات التشغيل والقص للمعمل:</label>
          <textarea rows={2} value={currM.sewing_notes || ''} onChange={e => onUpdate(activeChildIdx, 'sewing_notes', e.target.value)} className="w-full h-11 p-1.5 text-xs font-medium bg-[#111C38] border border-slate-700 rounded-lg text-white outline-none focus:border-pink-500 resize-none" placeholder="ملاحظات تفصيلية للمشغل..." />
        </div>
      </div>
    </div>
  );
}

window.CustomerMeasurementsForm = CustomerMeasurementsForm;
