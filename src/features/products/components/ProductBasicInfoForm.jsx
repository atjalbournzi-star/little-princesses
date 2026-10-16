// src/features/products/components/ProductBasicInfoForm.jsx
// تفاصيل الموديل الأساسية: الاسم، الكود الذكي، الفئة المستهدفة، الصورة، والمواصفات

function ProductBasicInfoForm({
  actions,
  availableCategories = [],
  availableCollections = []
}) {
  const {
    modelName, setModelName,
    smartCode, setSmartCode, generateNewSmartCode,
    targetSegment = 'kids', setTargetSegment,
    category, setCategory,
    subcategory, setSubcategory,
    collection, setCollection,
    imageUrl, setImageUrl,
    description, setDescription,
    status, setStatus,
    selectedSizes = [], toggleSize,
    selectedColors = [], setSelectedColors, toggleColor
  } = actions;

  const u = window.productUtils || {};
  const segments = u.SEGMENTS || {};
  const currentSeg = segments[targetSegment] || segments.kids || { sizes: [] };
  const currentSizes = currentSeg.sizes || ['1-2Y', '3-5Y', '6-9Y', '10-13Y'];

  const [customColorInput, setCustomColorInput] = React.useState('');
  const handleAddCustomColor = (e) => {
    if (e?.preventDefault) e.preventDefault();
    const val = (customColorInput || '').trim();
    if (val && !(selectedColors || []).includes(val)) {
      if (typeof setSelectedColors === 'function') setSelectedColors([...selectedColors, val]);
      else if (typeof toggleColor === 'function') toggleColor(val);
    }
    setCustomColorInput('');
  };
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleAddCustomColor(e); };
  const removeColor = (color) => {
    if (typeof setSelectedColors === 'function') setSelectedColors((selectedColors || []).filter(c => c !== color));
    else if (typeof toggleColor === 'function') toggleColor(color);
  };

  const fileInputRef = React.useRef(null);
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if (setImageUrl) setImageUrl(ev.target.result); };
    reader.readAsDataURL(file);
  };
  const removeImage = (e) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (setImageUrl) setImageUrl('');
  };

  const isSizeActive = (sz) => {
    if (!selectedSizes || !Array.isArray(selectedSizes)) return false;
    if (selectedSizes.includes(sz)) return true;
    const aliases = { '1-2Y': '1-2 سنة', '1-2 سنة': '1-2Y', '3-5Y': '3-5 سنوات', '3-5 سنوات': '3-5Y', '6-9Y': '6-9 سنوات', '6-9 سنوات': '6-9Y', '10-13Y': '10-13 سنة', '10-13 سنة': '10-13Y' };
    return Boolean(aliases[sz] && selectedSizes.includes(aliases[sz]));
  };

  const inputCls = "w-full h-7 px-2.5 rounded-lg border border-slate-700 bg-slate-900 text-xs text-white outline-none focus:border-pink-500 transition font-medium";
  const labelCls = "block text-[11px] font-semibold text-slate-300 mb-0.5";

  return (
    <div className="flex-1 overflow-hidden p-2.5 space-y-1.5 min-h-0 select-none flex flex-col justify-between" dir="rtl">
      {/* 1. Form Row 1: 3 inline compact fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className={labelCls}>اسم الموديل <span className="text-pink-500">*</span></label>
          <input required type="text" value={modelName} onChange={e => setModelName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>الفئة المستهدفة <span className="text-pink-500">*</span></label>
          <select value={targetSegment} onChange={e => setTargetSegment && setTargetSegment(e.target.value)} className={inputCls + " font-bold text-pink-400 cursor-pointer"}>
            <option value="kids">👧 أطفال (Kids)</option>
            <option value="women_adults">👗 نسائي وكبار (Adults)</option>
            <option value="custom_free">✂️ تفصيل حر (Custom)</option>
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="text-[11px] font-semibold text-slate-300">كود SKU الذكي</label>
            <button type="button" onClick={generateNewSmartCode} title="توليد كود تلقائي جديد" className="text-[10px] text-pink-400 hover:text-pink-300 flex items-center gap-0.5 cursor-pointer font-bold">
              <span>🔄 تلقائي</span>
            </button>
          </div>
          <input type="text" value={smartCode} onChange={e => setSmartCode(e.target.value)} className={inputCls + " font-mono font-bold text-pink-300"} />
        </div>
      </div>

      {/* 2. Form Row 2: 2 inline classifications */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>التصنيف الفني</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls + " cursor-pointer"}>
            {(availableCategories.length ? availableCategories : ['فساتين وبدلات خاصة', 'فساتين أميرات سهرة', 'أطقم مواليد وسبوع']).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>الكولكشن / التشكيلة</label>
          <input type="text" list="modal-collections" value={collection} onChange={e => setCollection(e.target.value)} className={inputCls} />
          <datalist id="modal-collections">{availableCollections.map(c => <option key={c} value={c} />)}</datalist>
        </div>
      </div>

      {/* 3. Row 3: Media & Available Sizes (2-Column Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        <div
          onClick={() => fileInputRef.current?.click()}
          className="p-2 bg-slate-900/70 border border-slate-800 hover:border-pink-500/70 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition select-none group"
          title="انقر هنا لرفع أو استبدال صورة الموديل"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0 group-hover:border-pink-500/80 transition">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="w-full h-full object-contain" />
              ) : (
                <svg className="w-5 h-5 text-slate-400 group-hover:text-pink-400 transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              )}
            </div>
            <div className="min-w-0 text-right">
              <span className="text-[11px] font-bold text-slate-200 block truncate group-hover:text-pink-300">
                {imageUrl ? "تغيير صورة الموديل" : "رفع صورة الموديل 📷"}
              </span>
              <span className="text-[9.5px] text-slate-400 block truncate">
                {imageUrl ? "انقر في أي مكان للاستبدال" : "انقر في أي مكان لاختيار الصورة"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-6 px-2.5 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-md cursor-pointer flex items-center justify-center transition border border-slate-700"
            >
              {imageUrl ? "تغيير" : "رفع"}
            </button>
            {imageUrl && (
              <button type="button" onClick={removeImage} className="h-6 px-2 text-[10px] font-bold bg-red-600/30 text-red-300 hover:bg-red-600/50 rounded-md transition cursor-pointer border border-red-500/30">
                حذف
              </button>
            )}
          </div>
        </div>

        {/* Left Card: Available Sizes */}
        <div className="p-2 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col justify-center gap-1">
          <span className="text-[11px] text-slate-300 font-semibold">المقاسات المتاحة:</span>
          <div className="flex items-center gap-1 flex-wrap">
            {currentSizes.map(size => {
              const active = isSizeActive(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize && toggleSize(size)}
                  className={`h-6 px-2 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-pink-600 text-white shadow-md ring-1 ring-pink-400 font-extrabold'
                      : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Row 4: Dedicated Custom Colors Container */}
      <div className="p-2 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1">
        <span className="text-[11px] text-slate-300 font-semibold block">الألوان المعتمدة للموديل:</span>
        <div className="flex items-center gap-2">
          <input type="text" value={customColorInput} onChange={e => setCustomColorInput(e.target.value)} onKeyDown={handleKeyDown} className="h-7 flex-1 text-xs px-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-pink-500 font-medium" />
          <button type="button" onClick={handleAddCustomColor} className="h-7 px-3 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0">
            <span>+ إضافة لون</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap min-h-[22px]">
          {(selectedColors || []).length > 0 ? (selectedColors || []).map((color, idx) => (
            <span key={idx} className="h-5.5 px-2 bg-pink-600/20 text-pink-300 border border-pink-500/30 rounded-md text-[10px] font-medium flex items-center gap-1.5 shrink-0">
              <span>{color}</span>
              <button type="button" onClick={() => removeColor(color)} className="text-pink-400 hover:text-white font-bold cursor-pointer text-sm leading-none">&times;</button>
            </span>
          )) : (
            <span className="text-[10px] text-slate-500 italic">لم يتم إضافة ألوان بعد (أضف ألوان الموديل بالأعلى)</span>
          )}
        </div>
      </div>
    </div>
  );
}

window.ProductBasicInfoForm = ProductBasicInfoForm;
window.BOMBasicInfo = ProductBasicInfoForm;
