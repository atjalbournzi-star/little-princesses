// src/features/inventory/components/AddReadyProductModal.jsx
// نافذة مستقلة لإضافة فستان / منتج جاهز مع رفع صورة مضغوطة ومصفوفة الأعمار والألوان

const { useState, useEffect, useRef, useMemo } = React;

function AddReadyProductModal({ isOpen, onClose, showToast, onProductCreated, currency }) {
  const u = window.inventoryUtils || {};
  const MatrixTableComp = window.ReadyProductMatrixTable || null;
  const agePresets = window.READY_PRODUCT_AGE_PRESETS || ['1-2 سنة', '3-4 سنوات', '5-6 سنوات', '7-8 سنوات', '9-10 سنوات', '11-12 سنة'];
  const warehouses = Array.isArray(u.WAREHOUSES) ? u.WAREHOUSES : [];
  const defaultWh = warehouses.find(w => w.id === 'WH-SHOWROOM' || w.code === 'WH-SHOWROOM') || warehouses[0] || {};
  const currCode = typeof currency === 'string' ? currency.split(' ')[0] : (currency?.code || 'YER');

  const [name, setName] = useState('');
  const [styleCode, setStyleCode] = useState('');
  const [category, setCategory] = useState('فساتين جاهزة');
  const [seasonCollection, setSeasonCollection] = useState('');
  const [careNotes, setCareNotes] = useState('');
  const [warehouseId, setWarehouseId] = useState(defaultWh.id || 'WH-SHOWROOM');
  const [baseCost, setBaseCost] = useState('');
  const [baseSell, setBaseSell] = useState('');
  const [batchColorName, setBatchColorName] = useState('');
  const [batchColorHex, setBatchColorHex] = useState('#D00070');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [variants, setVariants] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && warehouses.length > 0 && !warehouseId) {
      const sr = warehouses.find(w => w.id === 'WH-SHOWROOM' || w.code === 'WH-SHOWROOM') || warehouses[0];
      if (sr) setWarehouseId(sr.id || sr.code);
    }
  }, [isOpen, warehouses.length]);

  const handleImageFile = async (file) => {
    if (!file || !file.type?.startsWith('image/')) return showToast?.('يرجى اختيار صورة صالحة ⚠️', 'error');
    setIsUploadingImg(true);
    try {
      const url = await window.compressAndUploadProductImage(file);
      setImageUrl(url);
      showToast?.('تم ضغط ورفع صورة الفستان بنجاح 📸');
    } catch (err) {
      showToast?.(err.message || 'فشل رفع الصورة ⚠️', 'error');
    } finally { setIsUploadingImg(false); }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items || [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type?.startsWith('image/')) { e.preventDefault(); handleImageFile(items[i].getAsFile()); break; }
    }
  };

  const toggleAgeSize = (age) => {
    const colKey = (batchColorName || '').trim();
    const idx = variants.findIndex(v => v.age_size === age && (v.color_name || '').trim() === colKey);
    if (idx > -1) setVariants(prev => prev.filter((_, i) => i !== idx));
    else setVariants(prev => [...prev, { _key: `${age}-${colKey}-${Date.now()}-${Math.random()}`, age_size: age, color_name: colKey, color_hex: batchColorHex, stock_qty: 1, cost_price: baseCost || 0, selling_price: baseSell || 0, min_stock: 1 }]);
  };

  const addAllAges = () => {
    const colKey = (batchColorName || '').trim();
    const existing = new Set(variants.filter(v => (v.color_name || '').trim() === colKey).map(v => v.age_size));
    const toAdd = agePresets.filter(a => !existing.has(a)).map((age, idx) => ({ _key: `${age}-${colKey}-${Date.now()}-${idx}`, age_size: age, color_name: colKey, color_hex: batchColorHex, stock_qty: 1, cost_price: baseCost || 0, selling_price: baseSell || 0, min_stock: 1 }));
    if (toAdd.length) setVariants(prev => [...prev, ...toAdd]);
  };

  const updateRow = (idx, field, val) => setVariants(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  const removeRow = (idx) => setVariants(prev => prev.filter((_, i) => i !== idx));

  const totals = useMemo(() => {
    let pieces = 0, costSum = 0, sellSum = 0;
    variants.forEach(v => {
      const q = parseFloat(v.stock_qty) || 0;
      pieces += q; costSum += q * (parseFloat(v.cost_price) || 0); sellSum += q * (parseFloat(v.selling_price) || 0);
    });
    return { pieces, costSum, sellSum };
  }, [variants]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return showToast?.('اسم الفستان / المنتج الجاهز مطلوب ⚠️', 'error');
    if (variants.length === 0) return showToast?.('اختر عمراً واحداً على الأقل في المصفوفة ⚠️', 'error');
    setIsSaving(true);
    try {
      const res = await window.submitReadyProduct({
        name: name.trim(), style_code: styleCode.trim(), category, season_collection: seasonCollection.trim(),
        care_notes: careNotes.trim(), warehouse_id: warehouseId || 'WH-SHOWROOM', currency: currCode,
        cost_price: parseFloat(baseCost) || 0, selling_price: parseFloat(baseSell) || 0, image_url: imageUrl,
        variants: variants.map(v => ({ age_size: v.age_size, color_name: v.color_name, color_hex: v.color_hex, stock_qty: parseFloat(v.stock_qty) || 0, cost_price: parseFloat(v.cost_price) || 0, selling_price: parseFloat(v.selling_price) || 0, min_stock: parseFloat(v.min_stock) || 1 }))
      });
      showToast?.(res.message || 'تم تسجيل الفستان الجاهز ومصفوفة الأعمار بنجاح 👗✨');
      onProductCreated?.(res.data);
      window.dispatchEvent(new CustomEvent('erp:inventoryChanged'));
      setName(''); setStyleCode(''); setSeasonCollection(''); setCareNotes(''); setBaseCost(''); setBaseSell(''); setImageUrl(''); setVariants([]);
      onClose?.();
    } catch (err) {
      showToast?.(err.message || 'خطأ أثناء حفظ المنتج الجاهز', 'error');
    } finally { setIsSaving(false); }
  };

  if (!isOpen) return null;
  const inp = "w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-xs text-slate-900 dark:text-white outline-none focus:border-pink-500";
  const lbl = "block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-sm animate-fadeIn" dir="rtl" onPaste={handlePaste}>
      <div className="w-full max-w-4xl max-h-[92vh] bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 bg-gradient-to-l from-pink-700 via-fuchsia-700 to-purple-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-lg">👗</span>
            <div>
              <h3 className="text-sm font-extrabold">إضافة فستان / منتج جاهز مع مصفوفة المقاسات</h3>
              <p className="text-[11px] text-pink-100">ضغط تلقائي للصورة، توليد SKU وباركود لكل مقاس، وإثبات محاسبي متزن</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-sm cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
            <div onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleImageFile(e.dataTransfer.files[0]); }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`aspect-[3/4] max-h-44 w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition ${isDragging ? 'border-pink-500 bg-pink-50/30' : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 hover:border-pink-500'}`}>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
              {imageUrl ? <img src={imageUrl} alt="صورة الفستان" className="w-full h-full object-cover object-top" /> : (
                <div className="p-2 text-center space-y-1 text-slate-500 dark:text-slate-400">
                  <span className="text-2xl block">{isUploadingImg ? '⏳' : '📸'}</span>
                  <span className="text-[11px] font-bold block">{isUploadingImg ? 'جاري الضغط والرفع...' : 'اسحب / تصفح / الصق الصورة'}</span>
                  <span className="text-[9.5px] opacity-75 block">حد أقصى 600px (WebP)</span>
                </div>
              )}
            </div>

            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className={lbl}>اسم الفستان / الموديل الجاهز *</label>
                <input required className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: فستان سندريلا دانتيل لؤلؤي" />
              </div>
              <div>
                <label className={lbl}>رمز الموديل (تلقائي إذا فُرغ)</label>
                <input className={inp + " font-mono"} dir="ltr" value={styleCode} onChange={e => setStyleCode(e.target.value)} placeholder="LP-RD-0001" />
              </div>
              <div>
                <label className={lbl}>التصنيف</label>
                <input className={inp} value={category} onChange={e => setCategory(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>الموسم / الكولكشن</label>
                <input className={inp} value={seasonCollection} onChange={e => setSeasonCollection(e.target.value)} placeholder="مثال: كولكشن العيد 2026" />
              </div>
              <div>
                <label className={lbl}>المستودع / المعرض</label>
                <select className={inp} value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                  {warehouses.map(w => <option key={w.id || w.code} value={w.id || w.code}>{w.name} ({w.code || w.id})</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>التكلفة الافتراضية ({currCode})</label>
                <input type="number" min="0" step="0.01" dir="ltr" className={inp + " font-mono tabular-nums"} value={baseCost} onChange={e => setBaseCost(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>سعر البيع الافتراضي ({currCode})</label>
                <input type="number" min="0" step="0.01" dir="ltr" className={inp + " font-mono tabular-nums"} value={baseSell} onChange={e => setBaseSell(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>ملاحظات العناية / القماش</label>
                <input className={inp} value={careNotes} onChange={e => setCareNotes(e.target.value)} placeholder="تنظيف جاف فقط" />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 ml-1">اختيار سريع للأعمار:</span>
                {agePresets.map(age => {
                  const active = variants.some(v => v.age_size === age && (v.color_name || '').trim() === (batchColorName || '').trim());
                  return (
                    <button key={age} type="button" onClick={() => toggleAgeSize(age)}
                      className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${active ? 'bg-pink-600 text-white shadow-xs' : 'bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:border-pink-400'}`}>
                      {age}
                    </button>
                  );
                })}
                <button type="button" onClick={addAllAges} className="h-7 px-2.5 rounded-lg text-[10.5px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 cursor-pointer">+ الكل</button>
              </div>
              <div className="flex items-center gap-1.5">
                <input type="color" value={batchColorHex} onChange={e => setBatchColorHex(e.target.value)} className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0" />
                <input type="text" value={batchColorName} onChange={e => setBatchColorName(e.target.value)} placeholder="اللون (اختياري)" className="w-28 h-7 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-[11px]" />
              </div>
            </div>
            {MatrixTableComp && <MatrixTableComp variants={variants} onUpdateRow={updateRow} onRemoveRow={removeRow} styleCodePreview={styleCode || 'LP-RD'} currencyCode={currCode} />}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-3">
              <span>إجمالي القطع: <b dir="ltr" className="font-mono tabular-nums text-pink-600">{totals.pieces}</b></span>
              <span>إجمالي التكلفة: <b dir="ltr" className="font-mono tabular-nums text-slate-900 dark:text-white">{totals.costSum.toLocaleString('en-US')} {currCode}</b></span>
              <span>القيمة البيعية: <b dir="ltr" className="font-mono tabular-nums text-emerald-600">{totals.sellSum.toLocaleString('en-US')} {currCode}</b></span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="h-9 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">إلغاء</button>
              <button type="submit" disabled={isSaving || isUploadingImg} className="h-9 px-5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-700 hover:from-pink-500 hover:to-purple-600 text-white text-xs font-extrabold shadow-sm cursor-pointer disabled:opacity-50">
                {isSaving ? '⏳ جاري الحفظ والترحيل...' : '👗 حفظ الفستان والمقاسات في المخزون'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

window.AddReadyProductModal = AddReadyProductModal;
