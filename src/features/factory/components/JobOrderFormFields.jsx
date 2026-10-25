/**
 * JobOrderFormFields.jsx - حقول إدخال وتفاصيل أمر التشغيل والموديل
 * Little Princesses ERP - Production Floor Architecture
 */

const mc = () => window.MeasurementConverter || {};

const sizeKeyForModel = (product = {}, form = {}) => {
  const m = form.measurements_spec || form.measurements || {};
  return mc().resolveSizeCode ? mc().resolveSizeCode(m, product?.target_segment || form.target_segment || 'kids') : (product?.target_segment === 'women_adults' ? 'M' : (form.size_code || '6-9Y'));
};

const getPriceFromMatrix = (product = {}, sizeKey = '6-9Y') => mc().resolveUnitPrice ? mc().resolveUnitPrice(product, sizeKey) : Number(product?.price_matrix?.[sizeKey] ?? product?.base_price ?? product?.sell_price ?? product?.price ?? 0);

const buildBomItems = (product = {}, sizeKey = '6-9Y', quantity = 1, fabricInventory = [], measurements = {}, fallbackOrder = null) => {
  const inches = mc().resolveDressLengthInches ? mc().resolveDressLengthInches(measurements) : 26;
  if (mc().buildBomItems) return mc().buildBomItems(product, sizeKey, inches, quantity, fabricInventory, fallbackOrder);
  const rawBom = Array.isArray(product?.bom) ? product.bom : (Array.isArray(product?.materials) ? product.materials : []);
  return rawBom.map(it => ({ fabric_id: it.fabric_id || it.id || '', fabric_name: it.fabric_name || it.name || 'قماش', cut_meters: String(((parseFloat(it.meters || it.cut_meters || 1.5)) * quantity).toFixed(2)), cut_unit: it.unit || 'متر', unit: it.unit || 'متر', meters: String(((parseFloat(it.meters || 1.5)) * quantity).toFixed(2)), deduct_inventory: true }));
};

const syncProductModel = (productObj, setForm, form, qty = Number(form.quantity) || 1, fabricInventory = []) => {
  if (!productObj) return;
  const measurements = form.measurements_spec || form.measurements || {}, sizeKey = sizeKeyForModel(productObj, { ...form, measurements_spec: measurements });
  const price = getPriceFromMatrix(productObj, sizeKey), bomItems = buildBomItems(productObj, sizeKey, qty, fabricInventory, measurements);
  const meterTotal = bomItems.reduce((sum, item) => sum + (parseFloat(item.meters || item.cut_meters) || 0), 0);
  const wageSvc = window.WageMatrixService || {}, stageWages = wageSvc.resolveStageWages ? wageSvc.resolveStageWages(form, productObj) : {};
  setForm(prev => ({
    ...prev, product_id: productObj.id || productObj.product_id || prev.product_id,
    product: productObj.model_name || productObj.name || prev.product, product_name: productObj.model_name || productObj.name || prev.product_name,
    target_segment: productObj.target_segment || prev.target_segment || 'kids', size_code: sizeKey, price, total_price: price * (Number(prev.quantity) || qty),
    bom: bomItems, materials: bomItems, bom_items: bomItems, cut_meters: bomItems[0]?.cut_meters || meterTotal.toFixed(2),
    standard_cut_meters: meterTotal.toFixed(2), cut_unit: bomItems[0]?.cut_unit || 'متر',
    cutter_wage: String(productObj.cutter_wage || prev.cutter_wage || stageWages.cutter_wage || ''),
    tailor_wage: String(productObj.tailor_wage || prev.tailor_wage || stageWages.tailor_wage || ''),
    embroiderer_wage: String(productObj.embroiderer_wage || prev.embroiderer_wage || stageWages.embroiderer_wage || ''),
    finisher_wage: String(productObj.finisher_wage || prev.finisher_wage || stageWages.finisher_wage || ''),
    packager_wage: String(productObj.packager_wage || prev.packager_wage || stageWages.packager_wage || '')
  }));
};

function JobOrderFormFields({
  form = {}, setForm, orders = [], employees = [], products = [], stages = [], customers = [],
  handleOrderSelect, handleStageEmpChange, handleStageChange, handleProductChange,
  handleSizeChange, setModelPreviewData, fabricInventory = []
}) {
  const inputCls = 'w-full h-8 px-2.5 py-1 rounded-lg border border-slate-700/80 bg-slate-950/80 text-slate-100 text-xs font-medium focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition-all outline-none';
  const labelCls = 'block text-[11px] font-semibold text-slate-200 mb-1';
  const sizeChart = window.FactorySizeChart || {}, isReadyToWear = form.production_type === 'ready_to_wear', isOrderSelected = !isReadyToWear && Boolean(form.order_no);
  const bespokeList = window.FactoryUtils?.getBespokeOrdersList ? window.FactoryUtils.getBespokeOrdersList(orders, customers, products) : (orders || []);
  const selectedOrder = bespokeList.find(o => String(o.order_no || o.id) === String(form.order_no));
  const activeModelIdentifier = form.product_id || form.product || selectedOrder?.product_id || selectedOrder?.model_id || selectedOrder?.product_name || selectedOrder?.model_name || selectedOrder?.item_name || '';
  const curProduct = (products || []).find(p => {
    if (!activeModelIdentifier) return false;
    const target = String(activeModelIdentifier).trim().toLowerCase(), productId = String(p.id || p.product_id || '').trim().toLowerCase(), productName = String(p.name || p.model_name || '').trim().toLowerCase();
    return productId === target || productName === target || (productName && (target.includes(productName) || productName.includes(target)));
  });
  const prodImg = curProduct?.image_url || curProduct?.imageUrl || curProduct?.image || form.image_url || form.prod_image_url || selectedOrder?.image_url || selectedOrder?.prod_image_url || selectedOrder?.image || '';
  const stdSpecs = isReadyToWear && sizeChart.getStandardSpecs ? sizeChart.getStandardSpecs(form.size_code || '6-9Y') : null;
  const sizeBadge = form.size_badge || (!isReadyToWear && (form.measurements_spec?.dress_len || form.measurements_spec?.dress_length || form.measurements_spec?.['طول الفستان']) ? `[ الفئة: ${sizeKeyForModel(curProduct || {}, form)} ]` : '');
  const availableSizes = sizeChart.sizes || ['2Y', '3Y', '4Y', '5Y', '6-9Y', '10-12Y', 'S', 'M', 'L', 'XL'];

  const applyProductDetails = (productObj, qty = Number(form.quantity) || 1) => {
    if (productObj) syncProductModel(productObj, setForm, { ...form, measurements_spec: form.measurements_spec || {} }, qty, fabricInventory);
  };

  const onModelSelectChange = (e) => {
    const val = e.target.value;
    const selected = (products || []).find(p => String(p.id) === String(val) || String(p.product_id) === String(val));
    if (selected) {
      applyProductDetails(selected, Number(form.quantity) || 1);
      if (handleProductChange) handleProductChange(val);
    } else {
      setForm(prev => ({ ...prev, product_id: '', product: val }));
    }
  };

  const onInternalOrderSelect = (e) => {
    const val = e.target.value;
    if (typeof handleOrderSelect === 'function') handleOrderSelect(e);
    const chosen = (bespokeList || []).find(o => String(o.order_no || o.id) === String(val) || String(o.display_code) === String(val));
    if (!chosen) { setForm(prev => ({ ...prev, order_no: val })); return; }
    const quantity = Number(chosen.quantity || chosen.qty || 1) || 1;
    const targetModel = String(chosen.product_id || chosen.product_name || chosen.product || chosen.items?.[0]?.product_name || '').trim().toLowerCase();
    const selectedModel = (products || []).find(p => {
      const pId = String(p.id || p.product_id || '').trim().toLowerCase(), pName = String(p.model_name || p.name || '').trim().toLowerCase();
      return (targetModel && (pId === targetModel || pName === targetModel || (pName && (targetModel.includes(pName) || pName.includes(targetModel)))));
    }) || curProduct;
    const measurements = chosen.measurements_spec || chosen.measurements || {};
    const sizeKey = sizeKeyForModel(selectedModel || {}, { ...form, measurements_spec: measurements, size_code: form.size_code || '6-9Y' });
    const unitPrice = getPriceFromMatrix(selectedModel || {}, sizeKey || '6-9Y'), bomItems = buildBomItems(selectedModel, sizeKey || '6-9Y', quantity, fabricInventory, measurements, chosen);
    const meterTotal = bomItems.reduce((sum, item) => sum + (parseFloat(item.meters || item.cut_meters) || 0), 0);
    const custName = chosen.customer_name || chosen.customer || form.customer_name || form.customer || '', chName = chosen.child_name || form.child_name || '';
    const wageSvc = window.WageMatrixService || {}, stageWages = wageSvc.resolveStageWages ? wageSvc.resolveStageWages(form, selectedModel) : {};
    const delFee = Number(chosen.delivery_fee || chosen.delivery || 0);
    const rawTotal = chosen.total_amount ?? chosen.total_price ?? chosen.grand_total ?? chosen.total ?? chosen.price ?? chosen.base_amount;
    const finalTotal = (rawTotal !== undefined && rawTotal !== null && rawTotal !== '') ? Number(rawTotal) : ((unitPrice * quantity) + delFee);
    const rawPaid = chosen.paid_amount ?? chosen.advance_paid ?? chosen.paid ?? chosen.deposit ?? chosen.deposit_amount ?? chosen.paid_total ?? 0;
    const finalPaid = Number(rawPaid) || 0, finalRem = Math.max(0, finalTotal - finalPaid), targetDue = chosen.delivery_date || chosen.due_date || form.due_date;
    const autoM = window.FactoryUtils?.autoDistributeMilestones ? window.FactoryUtils.autoDistributeMilestones(form.start_date || new Date().toISOString().slice(0, 10), targetDue) : {};

    setForm(prev => ({
      ...prev, order_no: chosen.order_no || chosen.id || val, customer: custName, customer_name: custName, child_name: chName,
      delivery_date: targetDue, due_date: targetDue, cutting_due_date: chosen.cutting_due_date || autoM.cutting || '',
      sewing_due_date: chosen.sewing_due_date || autoM.sewing || '', embroidery_due_date: chosen.embroidery_due_date || autoM.embroidery || '', finishing_due_date: chosen.finishing_due_date || autoM.finishing || '',
      product: selectedModel?.model_name || selectedModel?.name || chosen.product_name || chosen.product || prev.product,
      product_name: selectedModel?.model_name || selectedModel?.name || chosen.product_name || chosen.product || prev.product_name,
      product_id: selectedModel?.id || selectedModel?.product_id || chosen.product_id || prev.product_id,
      image_url: selectedModel?.image_url || selectedModel?.imageUrl || selectedModel?.image || chosen.image_url || chosen.prod_image_url || prev.image_url || '',
      quantity, measurements_spec: measurements, size_code: sizeKey || prev.size_code || '6-9Y', price: unitPrice, delivery_fee: delFee,
      total_price: finalTotal, total_amount: finalTotal, paid_amount: finalPaid, advance_paid: finalPaid, deposit: finalPaid,
      remaining_balance: finalRem, remaining_amount: finalRem, remaining: finalRem, subtotal: Number(chosen.subtotal ?? (finalTotal - delFee)),
      currency: chosen.currency || prev.currency || 'YER', fabric_name: bomItems[0]?.fabric_name || prev.fabric_name, cut_meters: bomItems[0]?.cut_meters || meterTotal.toFixed(2),
      standard_cut_meters: meterTotal.toFixed(2), bom_items: bomItems, bom: bomItems, materials: bomItems, cut_unit: bomItems[0]?.cut_unit || 'متر', deduct_inventory: true,
      cutter_wage: String(selectedModel?.cutter_wage || prev.cutter_wage || stageWages.cutter_wage || ''), tailor_wage: String(selectedModel?.tailor_wage || prev.tailor_wage || stageWages.tailor_wage || ''),
      embroiderer_wage: String(selectedModel?.embroiderer_wage || prev.embroiderer_wage || stageWages.embroiderer_wage || ''), finisher_wage: String(selectedModel?.finisher_wage || prev.finisher_wage || stageWages.finisher_wage || ''),
      packager_wage: String(selectedModel?.packager_wage || prev.packager_wage || stageWages.packager_wage || '')
    }));
  };

  const totVal = Number(form.total_amount || form.total_price || 0);
  const paidVal = Number(form.paid_amount || form.deposit || 0);
  const remVal = Number(form.remaining_amount || form.remaining_balance || (totVal - paidVal));
  const isPaid = remVal <= 0 && totVal > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2.5">
      <div className="lg:col-span-2">
        <label className={labelCls}>{isReadyToWear ? 'رقم دفعة الإنتاج الجاهز' : 'رقم الطلب والفاتورة'} <span className="text-rose-400 font-bold">*</span></label>
        {!isReadyToWear ? (
          <select className={inputCls} value={form.order_no || form.id || ''} onChange={onInternalOrderSelect}>
            <option value="" className="bg-slate-900 text-slate-200">-- اختر الطلب المعمد --</option>
            {bespokeList.map(o => <option key={o.order_no || o.id} value={o.order_no || o.id} className="bg-slate-900 text-slate-200">[{o.display_code || o.order_no || o.id || 'ORD'}]{(o.customer_name || o.customer) ? ` - ${o.customer_name || o.customer}` : ''}{o.child_name ? ` (${o.child_name})` : ''}</option>)}
          </select>
        ) : <input type="text" className={inputCls + ' font-mono font-bold text-cyan-400'} value={form.order_no || ''} onChange={e => setForm({ ...form, order_no: e.target.value })} />}
      </div>

      {!isReadyToWear ? (
        <>
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-1"><label className={labelCls + ' mb-0'}>اسم العميلة (الأم)</label>{isOrderSelected && <span className="text-[10px] text-rose-400 font-semibold">🔒 مقفل</span>}</div>
            <input type="text" readOnly={isOrderSelected} className={inputCls + (isOrderSelected ? ' bg-slate-900/80 text-slate-400 cursor-not-allowed border-slate-800' : ' font-semibold')} value={form.customer || form.customer_name || ''} onChange={e => setForm({ ...form, customer: e.target.value, customer_name: e.target.value })} />
          </div>
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-1"><label className={labelCls + ' mb-0 text-rose-400'}>اسم الطفلة (الأميرة)</label>{isOrderSelected && <span className="text-[10px] text-rose-400 font-semibold">🔒 مقفل</span>}</div>
            <input type="text" readOnly={isOrderSelected} className={inputCls + (isOrderSelected ? ' bg-rose-500/10 font-semibold text-rose-300 border-rose-500/20 cursor-not-allowed' : ' bg-rose-500/10 font-semibold text-rose-300 border-rose-500/20')} value={form.child_name || ''} onChange={e => setForm({ ...form, child_name: e.target.value })} />
          </div>
        </>
      ) : (
        <>
          <div className="lg:col-span-2"><label className={labelCls}>الفئة المستهدفة</label><select className={inputCls + ' bg-slate-900 text-cyan-400 font-semibold'} value={form.target_segment || 'kids'} onChange={e => { const seg = e.target.value; const defSize = seg === 'women_adults' ? 'M' : '6-9Y'; setForm(p => ({ ...p, target_segment: seg, size_code: defSize })); if (handleSizeChange) handleSizeChange(defSize); }}><option value="kids" className="bg-slate-900">👧 أطفال وأميرات</option><option value="women_adults" className="bg-slate-900">👩 نسائي / كبار</option></select></div>
          <div className="lg:col-span-2"><label className={labelCls + ' text-cyan-400 font-semibold'}>المقاس القياسي الجاهز <span className="text-rose-400">*</span></label><select className={inputCls + ' bg-cyan-500/10 text-cyan-300 font-bold font-mono border-cyan-500/20'} value={form.size_code || '6-9Y'} onChange={e => handleSizeChange ? handleSizeChange(e.target.value) : setForm({ ...form, size_code: e.target.value })}>{availableSizes.map(sz => <option key={sz} value={sz} className="bg-slate-900">{sz}</option>)}</select>{stdSpecs && <span className="block text-[10px] font-mono text-cyan-400 mt-1 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">طول: {stdSpecs.dress_len} سم | صدر: {stdSpecs.chest_circ} سم | خصر: {stdSpecs.waist_circ} سم</span>}</div>
        </>
      )}

      {!isReadyToWear && isOrderSelected && (totVal > 0 || paidVal > 0) && (
        <div className="lg:col-span-6 p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-pink-400 font-bold text-[11px]">💳 موقف سداد الفستان:</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isPaid ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' : (paidVal > 0 ? 'bg-amber-950/60 text-amber-300 border-amber-800' : 'bg-rose-950/60 text-rose-300 border-rose-800')}`}>
              {isPaid ? '✅ خالص ومسدد' : (paidVal > 0 ? '⏳ مسدد عربون' : '⚠️ غير مسدد')}
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] flex-wrap">
            <span className="text-slate-300">الإجمالي: <strong className="text-white">{totVal.toLocaleString()} {form.currency || 'YER'}</strong></span>
            <span className="text-cyan-400">العربون: <strong>{paidVal.toLocaleString()} {form.currency || 'YER'}</strong></span>
            <span className={remVal > 0 ? "text-pink-400 font-bold" : "text-emerald-400 font-bold"}>
              المتبقي: <strong>{remVal.toLocaleString()} {form.currency || 'YER'}</strong>
            </span>
          </div>
        </div>
      )}

      <div className="lg:col-span-3">
        <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <label className={labelCls + ' mb-0'}>الموديل والتصميم <span className="text-rose-400 font-bold">*</span></label>
            {isOrderSelected && (curProduct || form.product_name || form.product) && <span className="text-[10px] text-rose-400 font-semibold">🔒 معتمد</span>}
            {sizeBadge && <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-medium border border-cyan-500/20">{sizeBadge}</span>}
          </div>
          {(curProduct || prodImg) && (
            <button type="button" onClick={() => setModelPreviewData && setModelPreviewData({ isOpen: true, product: curProduct, imageUrl: prodImg, modelName: curProduct?.model_name || curProduct?.name || form.product_name || form.product })} className="text-[10px] text-rose-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"><span>👁️ معاينة وتكبير</span></button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div onClick={() => { if (setModelPreviewData && (prodImg || curProduct)) setModelPreviewData({ isOpen: true, product: curProduct, imageUrl: prodImg, modelName: curProduct?.model_name || curProduct?.name || form.product_name || form.product }); }} className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer overflow-hidden transition-all ${prodImg ? 'border-rose-500/40 hover:ring-2 hover:ring-rose-500 bg-slate-900' : 'border-slate-800 bg-slate-900'}`} title={prodImg ? 'انقر لتكبير صورة الموديل 🔍' : 'معاينة الموديل'}>
            {prodImg ? <img src={prodImg} alt={form.product || 'model'} className="w-full h-full object-cover" /> : <span className="text-sm">👗</span>}
          </div>
          <select className={inputCls + ' font-semibold'} value={curProduct ? (curProduct.id || curProduct.product_id) : (form.product_id || form.product_name || form.product || '')} onChange={onModelSelectChange}>
            <option value="" className="bg-slate-900">-- اختر الموديل من الكتالوج --</option>
            {Boolean((form.product_name || form.product) && !curProduct) && <option value={form.product_id || form.product_name || form.product} className="bg-slate-900">{form.product_name || form.product} [معتمد بالطلب]</option>}
            {products.map(p => <option key={p.id || p.product_id || p.sku} value={p.id || p.product_id} className="bg-slate-900">{p.model_name || p.name} {p.target_segment === 'women_adults' ? '[نسائي]' : '[أطفال]'}</option>)}
          </select>
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="flex justify-between items-center mb-1"><label className={labelCls + ' mb-0'}>الكمية</label>{isOrderSelected && <span className="text-[10px] text-rose-400 font-semibold">🔒</span>}</div>
        <input type="number" min="1" className={inputCls + ' font-bold text-cyan-400 font-mono text-center'} value={form.quantity !== undefined && form.quantity !== null && form.quantity !== '' ? form.quantity : ''} onChange={e => { const q = parseFloat(e.target.value) || ''; setForm(prev => { if (!curProduct) return { ...prev, quantity: q }; const sizeKey = sizeKeyForModel(curProduct, prev); const price = getPriceFromMatrix(curProduct, sizeKey); const numQ = Number(q) || 1; const bom = buildBomItems(curProduct, sizeKey, numQ, fabricInventory, prev.measurements_spec); const total = bom.reduce((sum, item) => sum + (parseFloat(item.meters || item.cut_meters) || 0), 0); return { ...prev, quantity: q, price, total_price: price * numQ, bom, materials: bom, bom_items: bom, cut_meters: bom[0]?.cut_meters || total.toFixed(2), standard_cut_meters: total.toFixed(2), cut_unit: bom[0]?.cut_unit || 'متر' }; }); }} />
      </div>
      <div className="lg:col-span-2"><label className={labelCls}>المرحلة الحالية للتشغيل</label><select className={inputCls + ' bg-rose-500/10 text-rose-300 font-semibold border-rose-500/20'} value={form.stage} onChange={handleStageChange}>{stages.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}</select></div>
      <div className="lg:col-span-3"><label className={labelCls}>تاريخ البدء في المشغل</label><input type="date" lang="en-GB" dir="ltr" style={{ direction: 'ltr', textAlign: 'left' }} className={inputCls + ' font-mono text-left'} value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
      <div className="lg:col-span-3">
        <div className="flex justify-between items-center mb-1">
          <label className={labelCls + ' mb-0'}>موعد التسليم المتوقع <span className="text-rose-400 font-bold">*</span></label>
          {Boolean(form.due_date && ((new Date(form.due_date) - new Date(form.start_date || new Date().toISOString().slice(0,10))) / 86400000 <= 2)) && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">🔥 طلب مستعجل (خلال 48 ساعة)</span>
          )}
        </div>
        <input type="date" lang="en-GB" dir="ltr" style={{ direction: 'ltr', textAlign: 'left' }} className={inputCls + ' font-mono font-bold text-rose-400 text-left cursor-pointer'} value={form.due_date || ''} onChange={e => { const newDue = e.target.value; const autoM = window.FactoryUtils?.autoDistributeMilestones ? window.FactoryUtils.autoDistributeMilestones(form.start_date, newDue) : {}; setForm(prev => ({ ...prev, due_date: newDue, cutting_due_date: autoM.cutting || prev.cutting_due_date, sewing_due_date: autoM.sewing || prev.sewing_due_date, embroidery_due_date: autoM.embroidery || prev.embroidery_due_date, finishing_due_date: autoM.finishing || prev.finishing_due_date })); }} />
      </div>
    </div>
  ); }
window.JobOrderFormFields = JobOrderFormFields;

