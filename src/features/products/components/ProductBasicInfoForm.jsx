// src/features/products/components/ProductBasicInfoForm.jsx
// تفاصيل الموديل الأساسية: الاسم، الكود الذكي، الفئة المستهدفة، الصورة، والمواصفات

function ProductBasicInfoForm({
  actions,
  availableCategories = [],
  availableCollections = [],
  onCategoryCreated
}) {
  const {
    modelName, setModelName, smartCode, setSmartCode, generateNewSmartCode,
    targetSegment = 'kids', setTargetSegment, fulfillmentMode = 'CATALOG_MTO', setFulfillmentMode, category, setCategory,
    collection, setCollection, imageUrl, setImageUrl,
    selectedSizes = [], toggleSize, selectedColors = [], setSelectedColors, toggleColor
  } = actions;

  const u = window.productUtils || {};
  const segments = u.SEGMENTS || {};
  const segAliases = { kids: 'GIRLS_DRESS', women_adults: 'WOMEN_APPAREL', custom_free: 'GENERAL', general: 'GENERAL' };
  const normalizedSegment = segAliases[targetSegment] || targetSegment || 'GIRLS_DRESS';
  const currentSeg = segments[normalizedSegment] || segments[targetSegment] || segments.GIRLS_DRESS || { sizes: [] };
  const currentSizes = currentSeg.sizes || ['1-2Y', '3-5Y', '6-9Y', '10-13Y'];

  const [customColorInput, setCustomColorInput] = React.useState('');
  const [showAddCat, setShowAddCat] = React.useState(false);
  const [newCatName, setNewCatName] = React.useState('');
  const [isAddingCat, setIsAddingCat] = React.useState(false);

  const handleSaveNewCat = async () => {
    const clean = (newCatName || '').trim();
    if (!clean) return;
    setIsAddingCat(true);
    try {
      const res = await fetch('/api/products/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean })
      }).then(r => r.json());
      if (res?.success) {
        const catSaved = res.category || res.data?.name || clean;
        if (typeof onCategoryCreated === 'function') onCategoryCreated(catSaved);
        if (typeof setCategory === 'function') setCategory(catSaved);
        setNewCatName('');
        setShowAddCat(false);
      } else {
        const msg = res?.error || "تعذر إضافة التصنيف ⚠️";
        if (window.showToast) window.showToast(msg, "error");
        else alert(msg);
      }
    } catch (e) {
      if (window.showToast) window.showToast("خطأ في الاتصال بالخادم ⚠️", "error");
    } finally { setIsAddingCat(false); }
  };

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
  const removeImage = (e) => { if (e?.stopPropagation) e.stopPropagation(); if (setImageUrl) setImageUrl(''); };

  const isSizeActive = (sz) => {
    if (!selectedSizes || !Array.isArray(selectedSizes)) return false;
    if (selectedSizes.includes(sz)) return true;
    const aliases = { '1-2Y': '1-2 سنة', '1-2 سنة': '1-2Y', '3-5Y': '3-5 سنوات', '3-5 سنوات': '3-5Y', '6-9Y': '6-9 سنوات', '6-9 سنوات': '6-9Y', '10-13Y': '10-13 سنة', '10-13 سنة': '10-13Y' };
    return Boolean(aliases[sz] && selectedSizes.includes(aliases[sz]));
  };

  const inputCls = "w-full h-7 px-2.5 rounded-lg border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-[#0F172A] dark:text-white placeholder-[#64748B] outline-none focus:border-pink-500 transition font-medium";
  const labelCls = "block text-[11px] font-semibold text-[#334155] dark:text-slate-300 mb-0.5";

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
          <select value={normalizedSegment} onChange={e => setTargetSegment && setTargetSegment(e.target.value)} className={inputCls + " font-bold text-pink-700 dark:text-pink-400 cursor-pointer"}>
            <option value="GIRLS_DRESS">فساتين بنات</option>
            <option value="WOMEN_APPAREL">ملابس نسائية</option>
            <option value="SCHOOL_UNIFORM">زي مدرسي</option>
            <option value="GENERAL">عام</option>
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-300">كود SKU الذكي</label>
            <button type="button" onClick={generateNewSmartCode} title="توليد كود تلقائي جديد" className="text-[10px] text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 flex items-center gap-0.5 cursor-pointer font-bold">
              <span>🔄 تلقائي</span>
            </button>
          </div>
          <input type="text" value={smartCode} onChange={e => setSmartCode(e.target.value)} className={inputCls + " font-mono font-bold text-pink-700 dark:text-pink-300"} />
        </div>
      </div>

      {/* 2. Form Row 2: 3 inline classifications with fulfillment_mode & dynamic category (+) button */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className={labelCls}>نمط التنفيذ <span className="text-pink-500">*</span></label>
          <select value={fulfillmentMode} onChange={e => setFulfillmentMode && setFulfillmentMode(e.target.value)} className={inputCls + " font-bold text-teal-700 dark:text-teal-300 cursor-pointer"}>
            <option value="READY_STOCK">جاهز من المخزن</option>
            <option value="CATALOG_MTO">تفصيل حسب الطلب</option>
            <option value="BOTH">جاهز وتفصيل معاً</option>
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-300">التصنيف الفني</label>
            <button type="button" onClick={() => setShowAddCat(p => !p)} className="text-[10px] text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 font-bold flex items-center gap-0.5 cursor-pointer" title="إضافة تصنيف فني جديد">
              <span>{showAddCat ? '✕ إلغاء' : '+ إضافة تصنيف'}</span>
            </button>
          </div>
          {showAddCat ? (
            <div className="flex items-center gap-1">
              <input type="text" autoFocus placeholder="اسم التصنيف الجديد..." value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveNewCat(); } }} className={inputCls + " flex-1 border-pink-500"} />
              <button type="button" disabled={isAddingCat} onClick={handleSaveNewCat} className="h-7 px-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50">
                {isAddingCat ? '...' : 'حفظ'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls + " cursor-pointer flex-1"}>
                <option value="">-- اختر التصنيف --</option>
                {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                {category && !availableCategories.includes(category) && <option value={category}>{category}</option>}
              </select>
              <button type="button" onClick={() => setShowAddCat(true)} className="h-7 w-7 bg-[#F1F5F9] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-pink-600 dark:text-pink-400 border border-[#CBD5E1] dark:border-slate-700 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer" title="إضافة تصنيف فني جديد">+</button>
            </div>
          )}
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
        <div onClick={() => fileInputRef.current?.click()} className="p-2 bg-[#F8FAFC] dark:bg-slate-900/70 border border-[#CBD5E1] dark:border-slate-800 hover:border-pink-500/70 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition select-none group" title="انقر هنا لرفع أو استبدال صورة الموديل">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 group-hover:border-pink-500/80 transition">
              {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-contain" /> : <svg className="w-5 h-5 text-slate-400 group-hover:text-pink-500 transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
            </div>
            <div className="min-w-0 text-right">
              <span className="text-[11px] font-bold text-[#0F172A] dark:text-slate-200 block truncate group-hover:text-pink-600 dark:group-hover:text-pink-300">{imageUrl ? "تغيير صورة الموديل" : "رفع صورة الموديل 📷"}</span>
              <span className="text-[9.5px] text-[#64748B] dark:text-slate-400 block truncate">{imageUrl ? "انقر للاستبدال" : "انقر لاختيار الصورة"}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="h-6 px-2.5 text-[10px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white rounded-md cursor-pointer border border-[#CBD5E1] dark:border-slate-700">{imageUrl ? "تغيير" : "رفع"}</button>
            {imageUrl && <button type="button" onClick={removeImage} className="h-6 px-2 text-[10px] font-bold bg-red-50 dark:bg-red-600/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-600/50 rounded-md transition cursor-pointer border border-red-200 dark:border-red-500/30">حذف</button>}
          </div>
        </div>

        {/* Left Card: Available Sizes */}
        <div className="p-2 bg-[#F8FAFC] dark:bg-slate-900/70 border border-[#CBD5E1] dark:border-slate-800 rounded-xl flex flex-col justify-center gap-1">
          <span className="text-[11px] text-[#334155] dark:text-slate-300 font-semibold">المقاسات المتاحة:</span>
          <div className="flex items-center gap-1 flex-wrap">
            {currentSizes.map(size => (
              <button key={size} type="button" onClick={() => toggleSize && toggleSize(size)} className={`h-6 px-2 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${isSizeActive(size) ? 'bg-pink-600 text-white shadow-md ring-1 ring-pink-400 font-extrabold' : 'bg-white dark:bg-slate-800 text-[#334155] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white border border-[#CBD5E1] dark:border-slate-700'}`}>
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Row 4: Dedicated Custom Colors Container */}
      <div className="p-2 bg-[#F8FAFC] dark:bg-slate-900/70 border border-[#CBD5E1] dark:border-slate-800 rounded-xl space-y-1">
        <span className="text-[11px] text-[#334155] dark:text-slate-300 font-semibold block">الألوان المعتمدة للموديل:</span>
        <div className="flex items-center gap-2">
          <input type="text" value={customColorInput} onChange={e => setCustomColorInput(e.target.value)} onKeyDown={handleKeyDown} className="h-7 flex-1 text-xs px-2.5 bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-lg text-[#0F172A] dark:text-white placeholder-[#64748B] outline-none focus:border-pink-500 font-medium" />
          <button type="button" onClick={handleAddCustomColor} className="h-7 px-3 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0">+ إضافة لون</button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap min-h-[22px]">
          {(selectedColors || []).length > 0 ? (selectedColors || []).map((color, idx) => (
            <span key={idx} className="h-5.5 px-2 bg-pink-50 dark:bg-pink-600/20 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30 rounded-md text-[10px] font-medium flex items-center gap-1.5 shrink-0">
              <span>{typeof color === 'object' && color !== null ? (color.name || color.color || color.label || JSON.stringify(color)) : String(color)}</span>
              <button type="button" onClick={() => removeColor(color)} className="text-pink-600 dark:text-pink-400 hover:text-pink-900 dark:hover:text-white font-bold cursor-pointer text-sm leading-none">&times;</button>
            </span>
          )) : <span className="text-[10px] text-[#64748B] dark:text-slate-500 italic">لم يتم إضافة ألوان بعد (أضف ألوان الموديل بالأعلى)</span>}
        </div>
      </div>
    </div>
  );
}

window.ProductBasicInfoForm = ProductBasicInfoForm;
window.BOMBasicInfo = ProductBasicInfoForm;
