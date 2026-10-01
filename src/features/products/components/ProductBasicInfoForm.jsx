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
    selectedColors = [], toggleColor
  } = actions;

  const u = window.productUtils || {};
  const segments = u.SEGMENTS || {};
  const currentSeg = segments[targetSegment] || segments.kids || { sizes: [] };
  const currentSizes = currentSeg.sizes || ['1-2Y', '3-5Y', '6-9Y', '10-13Y'];
  const defaultColors = u.DEFAULT_COLORS || ['أبيض ملكي', 'وردي فاتح', 'سكري / أوف وايت', 'موف أميرات', 'ذهبي شامبين', 'أحمر قرمزي'];

  const ImageUploaderComp = window.ProductImageUploader || null;
  const inputCls = "w-full h-10 px-3 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-[#FAFAFB] dark:bg-slate-900 text-xs font-medium text-[#25232A] dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:border-[#8F2A87] dark:focus:border-purple-500 outline-none transition";
  const labelCls = "block text-xs font-semibold text-[#25232A] dark:text-slate-300 mb-1";

  return (
    <div className="space-y-4">
      {/* 1. شبكة الحقول الأساسية المبسطة بدون تشتيت */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <div>
          <label className={labelCls}>اسم الموديل <span className="text-rose-500">*</span></label>
          <input required type="text" value={modelName} onChange={e => setModelName(e.target.value)} className={inputCls} placeholder="مثال: فستان سندريلا الملكي" />
        </div>

        {/* قائمة اختيار الفئة المستهدفة */}
        <div>
          <label className={labelCls}>الفئة المستهدفة <span className="text-rose-500">*</span></label>
          <select
            value={targetSegment}
            onChange={e => setTargetSegment && setTargetSegment(e.target.value)}
            className={inputCls + " font-bold text-[#8F2A87] dark:text-purple-400"}
          >
            <option value="kids">👧 أطفال (Kids)</option>
            <option value="women_adults">👗 نسائي وكبار (Adults)</option>
            <option value="custom_free">✂️ تفصيل ومقاس حر (Custom)</option>
          </select>
        </div>

        {/* حقل التكويد الذكي الموحد */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-[#25232A] dark:text-slate-300">
              كود الموديل / SKU الذكي
            </label>
            <button
              type="button"
              onClick={generateNewSmartCode}
              title="توليد كود تلقائي جديد"
              className="text-[11px] text-[#8F2A87] dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <span>🔄</span>
              <span>توليد تلقائي</span>
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={smartCode}
              onChange={e => setSmartCode(e.target.value)}
              className={inputCls + " font-mono font-bold pr-3 pl-8 text-[#8F2A87] dark:text-purple-300"}
              placeholder="LP-KID-1001"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs opacity-60">🏷️</span>
          </div>
        </div>

        <div>
          <label className={labelCls}>التصنيف الفني</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
            {(availableCategories.length ? availableCategories : ['فساتين وبدلات خاصة', 'فساتين أميرات سهرة', 'أطقم مواليد وسبوع']).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>التصنيف الفرعي</label>
          <input type="text" value={subcategory} onChange={e => setSubcategory(e.target.value)} className={inputCls} placeholder="أميرات / ملكي / تطريز خاص" />
        </div>

        <div>
          <label className={labelCls}>الكولكشن / التشكيلة</label>
          <input type="text" list="modal-collections" value={collection} onChange={e => setCollection(e.target.value)} className={inputCls} placeholder="تشكيلة العيد 2026" />
          <datalist id="modal-collections">{availableCollections.map(c => <option key={c} value={c} />)}</datalist>
        </div>
      </div>

      {/* 2. مكون رفع ومعاينة صور الفستان الحقيقي Drag & Drop */}
      <div className="p-3.5 bg-[#FAFAFB] dark:bg-slate-900/60 rounded-xl border border-[#E8E5EA] dark:border-slate-800">
        {ImageUploaderComp ? (
          <ImageUploaderComp imageUrl={imageUrl} setImageUrl={setImageUrl} />
        ) : (
          <div>
            <label className={labelCls}>رابط صورة الموديل:</label>
            <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className={inputCls} placeholder="https://..." />
          </div>
        )}
      </div>

      {/* 3. المقاسات المتاحة للفئة المحددة والألوان */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className="p-3 bg-[#FAFAFB] dark:bg-slate-900/60 rounded-xl border border-[#E8E5EA] dark:border-slate-800">
          <label className={labelCls}>
            المقاسات المتاحة ({targetSegment === 'kids' ? 'مقاسات أطفال' : (targetSegment === 'women_adults' ? 'مقاسات نسائية' : 'تفصيل حر')}):
          </label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {currentSizes.map(sz => {
              const active = (selectedSizes || []).includes(sz);
              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() => toggleSize && toggleSize(sz)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold font-mono border transition cursor-pointer ${
                    active
                      ? 'bg-[#8F2A87] text-white border-[#8F2A87] shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-[#6F6B75] dark:text-slate-300 border-[#E8E5EA] dark:border-slate-700 hover:border-[#8F2A87]'
                  }`}
                >
                  {sz} {active ? '✓' : ''}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3 bg-[#FAFAFB] dark:bg-slate-900/60 rounded-xl border border-[#E8E5EA] dark:border-slate-800">
          <label className={labelCls}>الألوان المتوفرة للتفصيل:</label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {defaultColors.map(col => {
              const active = (selectedColors || []).includes(col);
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => toggleColor && toggleColor(col)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    active
                      ? 'bg-[#007F8C] text-white border-[#007F8C] shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-[#6F6B75] dark:text-slate-300 border-[#E8E5EA] dark:border-slate-700 hover:border-[#007F8C]'
                  }`}
                >
                  {col} {active ? '✓' : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. الوصف وملاحظات التصميم */}
      <div>
        <label className={labelCls}>وصف الموديل ومواصفات الخياطة والتطريز:</label>
        <textarea
          rows="2"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full p-3 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-[#FAFAFB] dark:bg-slate-900 text-xs text-[#25232A] dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:border-[#8F2A87] dark:focus:border-purple-500 outline-none transition"
          placeholder="تفاصيل التصميم، نوع البطانة المقترحة، ملاحظات الكشكشة والشك اليدوي..."
        />
      </div>
    </div>
  );
}

window.ProductBasicInfoForm = ProductBasicInfoForm;
