// src/components/tailoring/OrderTailoringAxesBar.jsx
// شريط الاختيار السريع للمحاور الثلاثة في نافذة الطلب (نمط البند، مصدر القماش، نمط المقاس + عهدة CMT + التصميم الخاص)

function OrderTailoringAxesBar({
  itemMode, setItemMode,
  materialSource, setMaterialSource,
  sizingMode, setSizingMode,
  customDesignTitle, setCustomDesignTitle,
  customDesignImage, setCustomDesignImage,
  custody, setCustody,
  sizeMatrixId, setSizeMatrixId,
  sizeAdjustments, setSizeAdjustments,
}) {
  const { useRef, useState } = React;
  const designImgRef = useRef(null);
  const cmtImgRef = useRef(null);
  const [imgInfo, setImgInfo] = useState('');
  const [cmtImgInfo, setCmtImgInfo] = useState('');

  const handleCompressUpload = async (file, onDone, setMeta) => {
    if (!file) return;
    try {
      if (window.ImageCompressor?.compressImageFile) {
        const res = await window.ImageCompressor.compressImageFile(file, { maxWidth: 800, maxKb: 80 });
        onDone(res.dataUrl);
        setMeta(`${res.sizeKb} KB (${res.width}px)`);
      } else {
        const reader = new FileReader();
        reader.onload = ev => onDone(ev.target.result);
        reader.readAsDataURL(file);
      }
    } catch (err) {
      if (window.showToast) window.showToast(err.message || 'تعذر ضغط الصورة', 'error');
    }
  };

  const SizePicker = window.OrderStandardSizePicker;
  const cmt = custody || { fabric_description: '', received_qty: '', unit: 'meter', condition_notes: '', reference_image: '' };
  const updateCmt = (k, v) => setCustody && setCustody({ ...cmt, [k]: v });

  const pillCls = (active) =>
    `px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-150 active:scale-[0.98] cursor-pointer border ${
      active
        ? 'bg-[#B0005A] text-white border-[#B0005A] shadow-xs'
        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#B0005A]/50'
    }`;

  const SCENARIOS = [
    { id: 'cat_custom', icon: '👗', title: 'موديل كتالوج (مقاسات خاصة)', im: 'CATALOG_MTO', ms: 'WORKSHOP_STOCK', sm: 'CUSTOM' },
    { id: 'cat_std', icon: '📏', title: 'موديل كتالوج (مقاس قياسي / عمر)', im: 'CATALOG_MTO', ms: 'WORKSHOP_STOCK', sm: 'STANDARD_SIZE' },
    { id: 'bespoke_bto', icon: '🧵', title: 'تصميم خاص (نشتري القماش)', im: 'CUSTOM_BESPOKE', ms: 'BUY_TO_ORDER', sm: 'CUSTOM' },
    { id: 'bespoke_cmt', icon: '📦', title: 'تصميم خاص (القماش من العميل)', im: 'CUSTOM_BESPOKE', ms: 'CUSTOMER_CMT', sm: 'CUSTOM' },
  ];
  const applyScenario = (sc) => { setItemMode(sc.im); setMaterialSource(sc.ms); setSizingMode(sc.sm); };

  const inputCls = "w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none focus:border-[#B0005A]";

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/40 space-y-3 text-right" dir="rtl">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {SCENARIOS.map(sc => {
          const isActive = itemMode === sc.im && materialSource === sc.ms && (sc.id === 'bespoke_bto' ? (sizingMode === sc.sm || sizingMode === 'STANDARD_SIZE' || sizingMode === 'DEFERRED') : sizingMode === sc.sm);
          return (
            <button key={sc.id} type="button" onClick={() => applyScenario(sc)}
              className={`p-2 rounded-xl border text-right transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center gap-2 ${isActive ? 'bg-[#B0005A] text-white border-[#B0005A] shadow-xs' : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-[#B0005A]/60'}`}>
              <span className="text-base shrink-0">{sc.icon}</span>
              <span className="text-[11px] font-bold leading-snug">{sc.title}</span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-1 border-t border-slate-200/80 dark:border-slate-700/60">
        <div>
          <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">1. نمط البند</span>
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={() => setItemMode('READY_STOCK')} className={pillCls(itemMode === 'READY_STOCK')}>جاهز من المخزن</button>
            <button type="button" onClick={() => setItemMode('CATALOG_MTO')} className={pillCls(itemMode === 'CATALOG_MTO')}>موديل كتالوج</button>
            <button type="button" onClick={() => setItemMode('CUSTOM_BESPOKE')} className={pillCls(itemMode === 'CUSTOM_BESPOKE')}>تصميم خاص</button>
          </div>
        </div>

        <div>
          <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">2. مصدر القماش</span>
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={() => setMaterialSource('WORKSHOP_STOCK')} className={pillCls(materialSource === 'WORKSHOP_STOCK')}>مخزون الورشة</button>
            <button type="button" onClick={() => setMaterialSource('BUY_TO_ORDER')} className={pillCls(materialSource === 'BUY_TO_ORDER')}>شراء خاص (BTO)</button>
            <button type="button" onClick={() => setMaterialSource('CUSTOMER_CMT')} className={pillCls(materialSource === 'CUSTOMER_CMT')}>قماش العميل (CMT)</button>
          </div>
        </div>

        <div>
          <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">3. نمط المقاس</span>
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={() => setSizingMode('CUSTOM')} className={pillCls(sizingMode === 'CUSTOM')}>مقاسات خاصة</button>
            <button type="button" onClick={() => setSizingMode('STANDARD_SIZE')} className={pillCls(sizingMode === 'STANDARD_SIZE')}>مقاس قياسي</button>
            <button type="button" onClick={() => setSizingMode('DEFERRED')} className={pillCls(sizingMode === 'DEFERRED')}>مؤجّلة لاحقاً</button>
          </div>
        </div>
      </div>

      {itemMode === 'CUSTOM_BESPOKE' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900/70 border border-pink-200 dark:border-pink-800/50 erp-slide-down">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">عنوان / وصف التصميم الخاص *</label>
            <input
              type="text"
              value={customDesignTitle || ''}
              onChange={e => setCustomDesignTitle && setCustomDesignTitle(e.target.value)}
              placeholder="مثال: فستان سهرة مطرز بقصة حورية حسب صورة العميلة"
              className={inputCls}
              required
            />
          </div>
          <div className="flex items-end gap-2">
            <input ref={designImgRef} type="file" accept="image/*" className="hidden" onChange={e => handleCompressUpload(e.target.files?.[0], v => setCustomDesignImage && setCustomDesignImage(v), setImgInfo)} />
            <button type="button" onClick={() => designImgRef.current?.click()} className="h-9 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 text-xs font-bold cursor-pointer flex-1">
              {customDesignImage ? `تغيير الصورة (${imgInfo || 'مضغوطة'})` : 'رفع صورة مرجعية مضغوطة'}
            </button>
            {customDesignImage && <img src={customDesignImage} alt="مرجع" className="w-9 h-9 rounded-lg object-cover border border-slate-300 dark:border-slate-600 shrink-0" />}
          </div>
        </div>
      )}

      {materialSource === 'CUSTOMER_CMT' && (
        <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 space-y-2 erp-slide-down">
          <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300">بيانات عهدة قماش العميل (تُسجل ذرياً برقم CMT-)</div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input type="text" placeholder="وصف القماش *" value={cmt.fabric_description || ''} onChange={e => updateCmt('fabric_description', e.target.value)} className={inputCls} required />
            <input type="number" step="0.1" min="0.1" placeholder="الكمية المستلمة *" value={cmt.received_qty || ''} onChange={e => updateCmt('received_qty', e.target.value)} className={inputCls + " font-mono text-center"} required />
            <select value={cmt.unit || 'meter'} onChange={e => updateCmt('unit', e.target.value)} className={inputCls}>
              <option value="meter">متر (meter)</option>
              <option value="yard">ياردة (yard)</option>
              <option value="piece">قطعة (piece)</option>
            </select>
            <div className="flex items-center gap-1.5">
              <input type="text" placeholder="ملاحظات الحالة" value={cmt.condition_notes || ''} onChange={e => updateCmt('condition_notes', e.target.value)} className={inputCls} />
              <input ref={cmtImgRef} type="file" accept="image/*" className="hidden" onChange={e => handleCompressUpload(e.target.files?.[0], v => updateCmt('reference_image', v), setCmtImgInfo)} />
              <button type="button" onClick={() => cmtImgRef.current?.click()} className="h-9 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-[11px] font-bold text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer" title={cmtImgInfo || 'صورة اختيارية للعهدة'}>
                {cmt.reference_image ? 'صورة ✓' : 'صورة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {sizingMode === 'STANDARD_SIZE' && SizePicker && (
        <div className="erp-slide-down">
          <SizePicker
            sizeMatrixId={sizeMatrixId}
            setSizeMatrixId={setSizeMatrixId}
            sizeAdjustments={sizeAdjustments}
            setSizeAdjustments={setSizeAdjustments}
          />
        </div>
      )}
    </div>
  );
}

window.OrderTailoringAxesBar = OrderTailoringAxesBar;
