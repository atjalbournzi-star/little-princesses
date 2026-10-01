/**
 * JobOrderFormFields.jsx - حقول إدخال وتفاصيل أمر التشغيل والموديل
 * Little Princesses ERP - Production Floor Architecture
 */

const mc = () => window.MeasurementConverter || {};

const sizeKeyForModel = (product = {}, form = {}) => {
  const measurements = form.measurements_spec || form.measurements || {};
  if (mc().resolveSizeCode) {
    return mc().resolveSizeCode(measurements, product?.target_segment || form.target_segment || 'kids');
  }
  if (product?.target_segment === 'women_adults') return 'M';
  return form.size_code || '6-9Y';
};

const getPriceFromMatrix = (product = {}, sizeKey = '6-9Y') => {
  if (mc().resolveUnitPrice) return mc().resolveUnitPrice(product, sizeKey);
  const matrix = product?.price_matrix || {};
  return Number(matrix[sizeKey] ?? product?.base_price ?? product?.sell_price ?? product?.price ?? 0);
};

const buildBomItems = (product = {}, sizeKey = '6-9Y', quantity = 1, fabricInventory = [], measurements = {}, fallbackOrder = null) => {
  const inches = mc().resolveDressLengthInches ? mc().resolveDressLengthInches(measurements) : 26;
  if (mc().buildBomItems) {
    return mc().buildBomItems(product, sizeKey, inches, quantity, fabricInventory, fallbackOrder);
  }
  const rawBom = Array.isArray(product?.bom) ? product.bom : (Array.isArray(product?.materials) ? product.materials : []);
  return rawBom.map(item => ({
    fabric_id: item.fabric_id || item.id || '',
    fabric_name: item.fabric_name || item.name || 'قماش',
    cut_meters: String(((parseFloat(item.meters || item.cut_meters || 1.5)) * quantity).toFixed(2)),
    cut_unit: item.unit || 'متر',
    unit: item.unit || 'متر',
    meters: String(((parseFloat(item.meters || 1.5)) * quantity).toFixed(2)),
    deduct_inventory: true
  }));
};

const syncProductModel = (productObj, setForm, form, qty = Number(form.quantity) || 1, fabricInventory = []) => {
  if (!productObj) return;
  const measurements = form.measurements_spec || form.measurements || {};
  const sizeKey = sizeKeyForModel(productObj, { ...form, measurements_spec: measurements });
  const price = getPriceFromMatrix(productObj, sizeKey);
  const bomItems = buildBomItems(productObj, sizeKey, qty, fabricInventory, measurements);
  const meterTotal = bomItems.reduce((sum, item) => sum + (parseFloat(item.meters || item.cut_meters) || 0), 0);
  const firstUnit = bomItems[0]?.cut_unit || 'متر';
  const firstCutMeters = bomItems[0]?.cut_meters || meterTotal.toFixed(2);
  const wageSvc = window.WageMatrixService || {};
  const stageWages = wageSvc.resolveStageWages ? wageSvc.resolveStageWages(form, productObj) : {};
  setForm(prev => ({
    ...prev,
    product_id: productObj.id || productObj.product_id || prev.product_id,
    product: productObj.model_name || productObj.name || prev.product,
    product_name: productObj.model_name || productObj.name || prev.product_name,
    target_segment: productObj.target_segment || prev.target_segment || 'kids',
    size_code: sizeKey,
    price,
    total_price: price * (Number(prev.quantity) || qty),
    bom: bomItems,
    materials: bomItems,
    bom_items: bomItems,
    cut_meters: firstCutMeters,
    standard_cut_meters: meterTotal.toFixed(2),
    cut_unit: firstUnit,
    cutter_wage: String(productObj.cutter_wage || prev.cutter_wage || stageWages.cutter_wage || ''),
    tailor_wage: String(productObj.tailor_wage || prev.tailor_wage || stageWages.tailor_wage || ''),
    embroiderer_wage: String(productObj.embroiderer_wage || prev.embroiderer_wage || stageWages.embroiderer_wage || ''),
    finisher_wage: String(productObj.finisher_wage || prev.finisher_wage || stageWages.finisher_wage || '')
  }));
};

function JobOrderFormFields({
  form, setForm, orders = [], employees = [], products = [], stages = [], customers = [],
  handleOrderSelect, handleStageEmpChange, handleStageChange, handleProductChange,
  handleSizeChange, setModelPreviewData, fabricInventory = []
}) {
  const inputCls = 'w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none';
  const labelCls = 'block text-xs font-semibold text-[#25232A] mb-1.5';
  const sizeChart = window.FactorySizeChart || {};
  const isReadyToWear = form.production_type === 'ready_to_wear';
  const isOrderSelected = !isReadyToWear && Boolean(form.order_no);
  const availableSizes = sizeChart.getAvailableSizes ? sizeChart.getAvailableSizes(form.target_segment) : (isReadyToWear ? ['1-2Y', '3-5Y', '6-9Y', '10-13Y'] : []);
  const bespokeList = (orders && orders.length > 0) ? orders : ((window.FactoryUtils?.getBespokeOrdersList ? window.FactoryUtils.getBespokeOrdersList(orders, customers, products) : orders) || []);
  const selectedOrder = bespokeList.find(o => String(o.order_no || o.id) === String(form.order_no));
  const activeModelIdentifier = form.product_id || form.product || selectedOrder?.product_id || selectedOrder?.model_id || selectedOrder?.product_name || selectedOrder?.model_name || selectedOrder?.item_name || '';
  const curProduct = (products || []).find(p => {
    if (!activeModelIdentifier) return false;
    const target = String(activeModelIdentifier).trim().toLowerCase();
    const productId = String(p.id || p.product_id || '').trim().toLowerCase();
    const productName = String(p.name || p.model_name || '').trim().toLowerCase();
    return productId === target || productName === target || (productName && target.includes(productName)) || (productName && productName.includes(target));
  });
  const prodImg = curProduct?.image_url || curProduct?.imageUrl || curProduct?.image || selectedOrder?.image_url || selectedOrder?.image || '';
  const stdSpecs = isReadyToWear && sizeChart.getStandardSpecs ? sizeChart.getStandardSpecs(form.size_code || '6-9Y') : null;
  const sizeBadge = form.size_badge || (!isReadyToWear && (form.measurements_spec?.dress_len || form.measurements_spec?.dress_length || form.measurements_spec?.['طول الفستان']) ? `[ الفئة: ${sizeKeyForModel(curProduct || {}, form)} ]` : '');

  const applyProductDetails = (productObj, qty = Number(form.quantity) || 1) => {
    if (!productObj) return;
    syncProductModel(productObj, setForm, { ...form, measurements_spec: form.measurements_spec || {} }, qty, fabricInventory);
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
    if (!chosen) {
      setForm(prev => ({ ...prev, order_no: val }));
      return;
    }
    const quantity = Number(chosen.quantity || chosen.qty || 1) || 1;
    const targetModel = String(chosen.product_id || chosen.product_name || chosen.product || chosen.items?.[0]?.product_name || '').trim().toLowerCase();
    const selectedModel = (products || []).find(p => {
      const pId = String(p.id || p.product_id || '').trim().toLowerCase();
      const pName = String(p.model_name || p.name || '').trim().toLowerCase();
      return (targetModel && (pId === targetModel || pName === targetModel || (pName && targetModel.includes(pName)) || (targetModel && pName.includes(targetModel))));
    }) || curProduct;
    const measurements = chosen.measurements_spec || chosen.measurements || {};
    const sizeKey = sizeKeyForModel(selectedModel || {}, { ...form, measurements_spec: measurements, size_code: form.size_code || '6-9Y' });
    const unitPrice = getPriceFromMatrix(selectedModel || {}, sizeKey || '6-9Y');
    const bomItems = buildBomItems(selectedModel, sizeKey || '6-9Y', quantity, fabricInventory, measurements, chosen);
    const meterTotal = bomItems.reduce((sum, item) => sum + (parseFloat(item.meters || item.cut_meters) || 0), 0);
    const custName = chosen.customer_name || chosen.customer || form.customer_name || form.customer || '';
    const chName = chosen.child_name || form.child_name || '';
    const firstUnit = bomItems[0]?.cut_unit || 'متر';
    const firstCut = bomItems[0]?.cut_meters || meterTotal.toFixed(2);

    const wageSvc = window.WageMatrixService || {};
    const stageWages = wageSvc.resolveStageWages ? wageSvc.resolveStageWages(form, selectedModel) : {};
    const delFee = Number(chosen.delivery_fee || chosen.delivery || 0);
    const calculatedTotal = (unitPrice * quantity) + delFee;
    const finalTotal = chosen.total_price || chosen.total_amount || chosen.total ? Number(chosen.total_price || chosen.total_amount || chosen.total) : calculatedTotal;

    setForm(prev => ({
      ...prev,
      order_no: chosen.order_no || chosen.id || val,
      customer: custName,
      customer_name: custName,
      child_name: chName,
      delivery_date: chosen.delivery_date || chosen.due_date || prev.delivery_date,
      due_date: chosen.delivery_date || chosen.due_date || prev.due_date,
      product: selectedModel?.model_name || selectedModel?.name || chosen.product_name || chosen.product || prev.product,
      product_name: selectedModel?.model_name || selectedModel?.name || chosen.product_name || chosen.product || prev.product_name,
      product_id: selectedModel?.id || selectedModel?.product_id || chosen.product_id || prev.product_id,
      quantity,
      measurements_spec: measurements,
      size_code: sizeKey || prev.size_code || '6-9Y',
      price: unitPrice,
      delivery_fee: delFee,
      total_price: finalTotal,
      total_amount: Number(chosen.total_amount ?? chosen.base_amount ?? finalTotal),
      paid_amount: Number(chosen.paid_amount ?? chosen.advance_paid ?? chosen.paid ?? 0),
      advance_paid: Number(chosen.paid_amount ?? chosen.advance_paid ?? chosen.paid ?? 0),
      remaining_balance: Number(chosen.remaining_balance ?? chosen.remaining_amount ?? chosen.remaining ?? 0),
      remaining_amount: Number(chosen.remaining_balance ?? chosen.remaining_amount ?? chosen.remaining ?? 0),
      subtotal: Number(chosen.subtotal ?? (finalTotal - delFee)),
      currency: chosen.currency || prev.currency || 'YER',
      fabric_name: bomItems[0]?.fabric_name || prev.fabric_name,
      cut_meters: firstCut,
      standard_cut_meters: meterTotal.toFixed(2),
      bom_items: bomItems,
      bom: bomItems,
      materials: bomItems,
      cut_unit: firstUnit,
      deduct_inventory: true,
      cutter_wage: String(selectedModel?.cutter_wage || prev.cutter_wage || stageWages.cutter_wage || ''),
      tailor_wage: String(selectedModel?.tailor_wage || prev.tailor_wage || stageWages.tailor_wage || ''),
      embroiderer_wage: String(selectedModel?.embroiderer_wage || prev.embroiderer_wage || stageWages.embroiderer_wage || ''),
      finisher_wage: String(selectedModel?.finisher_wage || prev.finisher_wage || stageWages.finisher_wage || '')
    }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      <div className="lg:col-span-2"><label className={labelCls}>{isReadyToWear ? 'رقم دفعة الإنتاج الجاهز' : 'رقم الطلب والفاتورة'} <span className="text-[#D64545] font-bold">*</span></label>{!isReadyToWear ? <select className={inputCls} value={form.order_no || form.id || ''} onChange={onInternalOrderSelect}><option value="">-- اختر الطلب المعمد من المبيعات --</option>{bespokeList.map(o => <option key={o.order_no || o.id} value={o.order_no || o.id}>[{o.display_code || o.order_no || o.id || 'ORD'}] - {o.customer_name || o.customer || 'عميلة'} ({o.child_name || 'الأميرة'})</option>)}</select> : <input type="text" className={inputCls + ' font-mono font-bold text-[#007F8C]'} value={form.order_no || ''} onChange={e => setForm({ ...form, order_no: e.target.value })} placeholder="RTW-2026-001" />}</div>
      {!isReadyToWear ? <>
        <div className="lg:col-span-2"><div className="flex justify-between items-center mb-1.5"><label className={labelCls + ' mb-0'}>اسم العميلة (الأم)</label>{isOrderSelected && <span className="text-[10px] text-[#8F2A87] font-bold">🔒 مقفل</span>}</div><input type="text" readOnly={isOrderSelected} className={inputCls + (isOrderSelected ? ' bg-[#FAFAFB] text-[#25232A] cursor-not-allowed border-[#E8E5EA]' : ' font-bold')} value={form.customer || ''} onChange={e => setForm({ ...form, customer: e.target.value })} placeholder="اسم العميلة" /></div>
        <div className="lg:col-span-2"><div className="flex justify-between items-center mb-1.5"><label className={labelCls + ' mb-0 text-[#8F2A87]'}>اسم الطفلة (الأميرة)</label>{isOrderSelected && <span className="text-[10px] text-[#8F2A87] font-bold">🔒 مقفل</span>}</div><input type="text" readOnly={isOrderSelected} className={inputCls + (isOrderSelected ? ' bg-[#FDF8FE] font-bold text-[#8F2A87] border-[#E5CEE7] cursor-not-allowed' : ' bg-[#FDF8FE] font-bold text-[#8F2A87] border-[#E5CEE7]')} value={form.child_name || ''} onChange={e => setForm({ ...form, child_name: e.target.value })} placeholder="اسم الطفلة" /></div>
      </> : <>
        <div className="lg:col-span-2"><label className={labelCls}>الفئة المستهدفة</label><select className={inputCls + ' bg-[#F2F9FA] text-[#007F8C] font-bold'} value={form.target_segment || 'kids'} onChange={e => { const seg = e.target.value; const defSize = seg === 'women_adults' ? 'M' : '6-9Y'; setForm(p => ({ ...p, target_segment: seg, size_code: defSize })); if (handleSizeChange) handleSizeChange(defSize); }}><option value="kids">👧 أطفال وأميرات</option><option value="women_adults">👩 نسائي / كبار</option></select></div>
        <div className="lg:col-span-2"><label className={labelCls + ' text-[#007F8C] font-bold'}>المقاس القياسي الجاهز <span className="text-[#D64545]">*</span></label><select className={inputCls + ' bg-[#E2F5F7] text-[#007F8C] font-black font-mono border-[#C5ECF0]'} value={form.size_code || '6-9Y'} onChange={e => handleSizeChange ? handleSizeChange(e.target.value) : setForm({ ...form, size_code: e.target.value })}>{availableSizes.map(sz => <option key={sz} value={sz}>{sz}</option>)}</select>{stdSpecs && <span className="block text-[10.5px] font-mono text-[#007F8C] mt-1 bg-[#E2F5F7]/80 px-2 py-0.5 rounded-md border border-[#C5ECF0]">طول: {stdSpecs.dress_len} سم | صدر: {stdSpecs.chest_circ} سم | خصر: {stdSpecs.waist_circ} سم</span>}</div>
      </>}
      <div className="lg:col-span-3"><div className="flex justify-between items-center mb-1.5 flex-wrap gap-1"><div className="flex items-center gap-1.5 flex-wrap"><label className={labelCls + ' mb-0'}>الموديل والتصميم <span className="text-[#D64545] font-bold">*</span></label>{isOrderSelected && curProduct && <span className="text-[10px] text-[#8F2A87] font-bold">🔒 معتمد</span>}{sizeBadge && <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-[#E2F5F7] text-[#007F8C] font-bold border border-[#C5ECF0] shadow-2xs">{sizeBadge}</span>}</div>{curProduct && <button type="button" onClick={() => setModelPreviewData && setModelPreviewData({ isOpen: true, product: curProduct, imageUrl: prodImg, modelName: curProduct?.model_name || curProduct?.name || form.product })} className="text-[10.5px] text-[#8F2A87] hover:underline font-bold flex items-center gap-1 cursor-pointer"><span>👁️ معاينة وتكبير</span></button>}</div><div className="flex items-center gap-2"><div onClick={() => { if (setModelPreviewData && (prodImg || curProduct)) setModelPreviewData({ isOpen: true, product: curProduct, imageUrl: prodImg, modelName: curProduct?.model_name || curProduct?.name || form.product }); }} className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer overflow-hidden transition-all shadow-2xs ${prodImg ? 'border-[#E5CEE7] hover:ring-2 hover:ring-[#8F2A87] bg-white' : 'border-[#E8E5EA] bg-[#FAFAFB]'}`} title={prodImg ? 'انقر لتكبير صورة الموديل 🔍' : 'معاينة الموديل'}>{prodImg ? <img src={prodImg} alt={form.product || 'model'} className="w-full h-full object-cover" /> : <span className="text-lg">👗</span>}</div><select className={inputCls + ' font-bold'} value={curProduct ? (curProduct.id || curProduct.product_id) : (form.product_id || '')} onChange={onModelSelectChange}><option value="">-- اختر الموديل من الكتالوج (سحب تلقائي للـ BOM) --</option>{products.map(p => <option key={p.id || p.product_id || p.sku} value={p.id || p.product_id}>{p.model_name || p.name} {p.target_segment === 'women_adults' ? '[نسائي]' : '[أطفال]'}</option>)}</select></div></div>
      <div className="lg:col-span-1"><div className="flex justify-between items-center mb-1.5"><label className={labelCls + ' mb-0'}>الكمية</label>{isOrderSelected && <span className="text-[10px] text-[#8F2A87] font-bold">🔒</span>}</div><input type="number" min="1" className={inputCls + ' font-bold text-[#007F8C] font-mono text-center'} value={form.quantity || 1} onChange={e => { const q = parseFloat(e.target.value) || 1; setForm(prev => { if (!curProduct) return { ...prev, quantity: q }; const sizeKey = sizeKeyForModel(curProduct, prev); const price = getPriceFromMatrix(curProduct, sizeKey); const bom = buildBomItems(curProduct, sizeKey, q, fabricInventory, prev.measurements_spec); const total = bom.reduce((sum, item) => sum + (parseFloat(item.meters || item.cut_meters) || 0), 0); const firstCut = bom[0]?.cut_meters || total.toFixed(2); const firstUnit = bom[0]?.cut_unit || 'متر'; return { ...prev, quantity: q, price, total_price: price * q, bom, materials: bom, bom_items: bom, cut_meters: firstCut, standard_cut_meters: total.toFixed(2), cut_unit: firstUnit }; }); }} /></div>
      <div className="lg:col-span-2"><label className={labelCls}>المرحلة الحالية للتشغيل</label><select className={inputCls + ' bg-[#F2E7F3] text-[#8F2A87] font-bold border-[#E5CEE7]'} value={form.stage} onChange={handleStageChange}>{stages.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
      <div className="lg:col-span-3"><label className={labelCls}>تاريخ البدء في المشغل</label><input type="date" lang="en-GB" dir="ltr" className={inputCls} value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
      <div className="lg:col-span-3"><div className="flex justify-between items-center mb-1.5"><label className={labelCls + ' mb-0'}>موعد التسليم المتوقع</label>{isOrderSelected && <span className="text-[10px] text-[#8F2A87] font-bold">🔒 من المبيعات</span>}</div><input type="date" lang="en-GB" dir="ltr" readOnly={isOrderSelected} className={inputCls + (isOrderSelected ? ' bg-[#FAFAFB] cursor-not-allowed font-mono font-bold text-[#8F2A87]' : ' font-mono font-bold text-[#8F2A87]')} value={form.due_date || ''} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
    </div>
  );
}

window.JobOrderFormFields = JobOrderFormFields;
