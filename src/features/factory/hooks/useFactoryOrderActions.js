function useFactoryOrderActions(props) {
  const { form, setForm, factory, setFactory, employees, orders, products, setInventory, customers, showToast, todayStrIso, stages, fabricInventory, setPrintModalData } = props;
  const service = window.FactoryService || {}, utils = window.FactoryUtils || {};
  const [actionLoadingId, setActionLoadingId] = React.useState(null);

  const handleStageEmpChange = (stageRole, empName) => {
    const matched = (employees || []).find(e => e.name === empName || e.id === empName);
    const pW = matched ? (matched.piece_rate ?? matched.piece_wage ?? matched.pieceRate ?? matched.pieceWage ?? matched.salary ?? matched.baseSalary ?? matched.base_salary) : '';
    const wage = (pW !== undefined && pW !== '' && pW !== null) ? String(pW) : '';
    const dW = (window.WageMatrixService?.resolveStageWages) ? window.WageMatrixService.resolveStageWages(form) : {};
    const keyMap = { cutter: 'cutter', tailor: 'tailor', embroiderer: 'embroiderer', finisher: 'finisher', packager: 'packager' };
    const prefix = keyMap[stageRole] || stageRole;
    setForm(p => ({
      ...p, [`${prefix}_name`]: empName, ...(prefix === 'tailor' ? { tailor: empName } : {}),
      [`${prefix}_wage`]: wage !== '' ? wage : (p[`${prefix}_wage`] || String(dW[`${prefix}_wage`] || ''))
    }));
  };

  const selectLatestCustomer = () => {
    if (!customers?.length) return showToast('لا يوجد عملاء مسجلون حالياً ⚠️', 'warning');
    const c = customers[0], m = c.measurements?.[0], ch = m?.child_name || c.children?.[0]?.child_name || 'الأميرة', pName = m?.selected_model || m?.model_name || '';
    const ord = (orders || []).find(o => o.customer_id === c.id || o.customer_id === c.customer_id || (o.customer_name && o.customer_name === c.name));
    const autoCalc = utils.calculateMetersForModel ? utils.calculateMetersForModel(pName, ch, c.name, products, customers, fabricInventory) : { fabric: 'تفتة تركي', meters: 3 };
    const due = ord?.delivery_date || (utils.addDays ? utils.addDays(todayStrIso, 4) : ''), autoM = utils.autoDistributeMilestones ? utils.autoDistributeMilestones(todayStrIso, due) : {};
    setForm(p => ({
      ...p, order_no: ord ? (ord.order_no || ord.id) : `ORD-${c.customer_id || c.id || '1001'}-${Date.now().toString().slice(-4)}`,
      customer: c.name || c.customer_name, customer_name: c.name || c.customer_name, child_name: ch, product: pName, product_name: pName, product_id: ord?.product_id || '',
      quantity: ord?.qty || 1, tailor: p.tailor || (employees?.find(e => e.status === 'نشط')?.name || ''),
      stage: stages[0], progress: '0', start_date: todayStrIso, due_date: due, cutting_due_date: autoM.cutting, sewing_due_date: autoM.sewing,
      embroidery_due_date: autoM.embroidery, finishing_due_date: autoM.finishing, fabric_name: autoCalc.fabric, cut_meters: String(autoCalc.meters), deduct_inventory: true
    }));
    showToast(`تم تحميل بيانات آخر زبونة: (${c.name}) بنجاح ⚡👗`, 'success');
  };

  const handleOrderSelect = (e) => {
    const val = e?.target?.value ?? e;
    if (!val) {
      return setForm(p => ({
        ...p, order_no: '', customer: '', customer_name: '', child_name: '', product: '', product_name: '', product_id: '',
        target_segment: 'kids', size_code: '6-9Y', size_badge: '', image_url: '', due_date: '', fabric_name: '', cut_meters: '',
        bom_items: [], total_amount: 0, paid_amount: 0, remaining_amount: 0, measurements_spec: {}
      }));
    }
    const allProds = (products?.length ? products : (window.products || window.FactoryProducts || []));
    const bespoke = props.bespokeOrders || (utils.getBespokeOrdersList ? utils.getBespokeOrdersList(orders, customers, allProds) : (orders || []));
    const ord = bespoke.find(o => String(o.order_no) === String(val) || String(o.id) === String(val) || String(o.display_code) === String(val)) || (orders || []).find(o => String(o.order_no || o.id) === String(val));
    if (!ord) return setForm(p => ({ ...p, order_no: val }));

    const targetModel = String(ord.product_id || ord.product_name || ord.product || '').trim().toLowerCase();
    const prod = (allProds || []).find(p => (ord.product_id && String(p.id) === String(ord.product_id)) || (targetModel && (String(p.id) === targetModel || p.name?.toLowerCase() === targetModel || p.model_name?.toLowerCase() === targetModel)));
    const childMeas = ord.measurements_spec || ord.measurements || {}, orderQty = parseFloat(ord.qty || ord.quantity || 1) || 1;
    const conv = window.MeasurementConverter, selectedSize = conv ? conv.resolveSizeCode(childMeas, prod?.target_segment || 'kids') : (form.size_code || '6-9Y'), dressInches = conv ? conv.resolveDressLengthInches(childMeas) : 26;
    const bomItems = conv ? conv.buildBomItems(prod, selectedSize, dressInches, orderQty, fabricInventory, ord) : [], firstBom = bomItems[0] || {}, unitPrice = conv ? conv.resolveUnitPrice(prod, selectedSize) : 0;
    const delFee = parseFloat(ord.delivery_fee ?? ord.delivery ?? 0), delMode = ord.delivery_payment_mode || 'DIRECT_TO_COURIER', isPrepaid = delMode === 'PREPAID_VIA_ATELIER';
    const rawOrdTot = ord.total_amount ?? ord.total_price ?? ord.grand_total ?? ord.total ?? ord.price ?? ord.base_amount, ordTotNum = (rawOrdTot !== undefined && rawOrdTot !== null && rawOrdTot !== '') ? parseFloat(rawOrdTot) : 0;
    const baseDressTot = unitPrice > 0 ? (unitPrice * orderQty) : (ordTotNum - (isPrepaid ? delFee : 0)), finalTot = ordTotNum > 0 ? ordTotNum : (baseDressTot + (isPrepaid ? delFee : 0));
    const ordPd = parseFloat(ord.paid_amount ?? ord.advance_paid ?? ord.paid ?? ord.deposit ?? ord.deposit_amount ?? ord.paid_total ?? 0) || 0, ordRem = Math.max(0, finalTot - ordPd);
    const targetDueDate = ord.delivery_date || ord.due_date || ord.delivery_date_iso || ord.target_date || (utils.addDays ? utils.addDays(todayStrIso, 4) : ''), autoM = utils.autoDistributeMilestones ? utils.autoDistributeMilestones(todayStrIso, targetDueDate) : {};
    const wageSvc = window.WageMatrixService || {}, stageWages = wageSvc.resolveStageWages ? wageSvc.resolveStageWages(form, prod) : {};

    setForm(p => ({
      ...p, order_no: ord.order_no || val, customer: ord.customer_name || ord.customer || '', customer_name: ord.customer_name || ord.customer || '',
      child_name: ord.child_name || '', product: prod?.model_name || prod?.name || ord.product_name || ord.product || '', product_name: prod?.model_name || prod?.name || ord.product_name || ord.product || '',
      product_id: prod?.id || ord.product_id || '', image_url: prod?.image_url || prod?.image || p.image_url || '', target_segment: prod?.target_segment || 'kids', quantity: orderQty,
      measurements_spec: childMeas, size_code: selectedSize, size_badge: `[ الفئة: ${selectedSize} - طول ${dressInches.toFixed(1)}" ]`,
      tailor: p.tailor || (employees?.find(e => e.status === 'نشط' && e.role === 'خياط')?.name || employees?.find(e => e.status === 'نشط')?.name || ''),
      tailor_name: p.tailor_name || '', cutter_name: p.cutter_name || '', cutter_wage: String(prod?.cutter_wage || prod?.meta?.cutter_wage || p.cutter_wage || stageWages.cutter_wage || ''),
      tailor_wage: String(prod?.tailor_wage || prod?.meta?.tailor_wage || p.tailor_wage || stageWages.tailor_wage || ''),
      embroiderer_name: p.embroiderer_name || '', embroiderer_wage: String(prod?.embroiderer_wage || prod?.meta?.embroiderer_wage || p.embroiderer_wage || stageWages.embroiderer_wage || ''),
      finisher_name: p.finisher_name || '', finisher_wage: String(prod?.finisher_wage || prod?.meta?.finisher_wage || p.finisher_wage || stageWages.finisher_wage || ''),
      packager_name: p.packager_name || '', packager_wage: String(prod?.packager_wage || prod?.meta?.packager_wage || p.packager_wage || stageWages.packager_wage || ''),
      stage: p.stage || stages[0], progress: p.progress || '0', start_date: todayStrIso, due_date: targetDueDate, cutting_due_date: autoM.cutting, sewing_due_date: autoM.sewing,
      embroidery_due_date: autoM.embroidery, finishing_due_date: autoM.finishing, fabric_name: firstBom.fabric_name || p.fabric_name, cut_meters: firstBom.cut_meters || '1.50',
      cut_unit: firstBom.cut_unit || 'متر', deduct_inventory: true, production_type: 'bespoke', bom_items: bomItems, bom: bomItems, materials: bomItems,
      delivery_fee: delFee, delivery_payment_mode: delMode, price: unitPrice, total_price: finalTot, total_amount: finalTot, paid_amount: ordPd, advance_paid: ordPd, deposit: ordPd,
      remaining_balance: ordRem, remaining_amount: ordRem, remaining: ordRem, subtotal: Number(ord.subtotal ?? (finalTot - delFee)), currency: ord.currency || 'YER'
    }));
  };

  const handleStageChange = (e) => {
    const stage = e?.target?.value ?? e;
    const prog = utils.calculateDynamicProgress ? utils.calculateDynamicProgress(stage) : (utils.STAGE_PROGRESS?.[stage] ?? 0);
    setForm(p => ({ ...p, stage, progress: prog }));
  };

  const loadIntoForm = (f) => {
    const fTot = parseFloat(f.total_amount ?? f.total_price ?? f.total ?? 0);
    const fPd = parseFloat(f.paid_amount ?? f.advance_paid ?? f.paid ?? f.deposit ?? 0);
    const fRem = Math.max(0, fTot - fPd);
    setForm({
      order_no: f.order_no || f.id, customer: f.customer || f.customer_name || '', customer_name: f.customer_name || f.customer || '',
      child_name: f.child_name || '', product: f.product || f.product_name || '', product_name: f.product || f.product_name || '',
      product_id: f.product_id || '', quantity: f.quantity || 1, tailor: f.tailor_name || f.tailor || '', tailor_name: f.tailor_name || f.tailor || '',
      stage: f.stage || stages[0], progress: f.progress ? String(f.progress).replace('%', '') : (utils.calculateDynamicProgress ? String(utils.calculateDynamicProgress(f.stage)) : '0'),
      start_date: f.start_date || todayStrIso, due_date: f.due_date || '', cutting_due_date: f.cutting_due_date || '', sewing_due_date: f.sewing_due_date || '',
      embroidery_due_date: f.embroidery_due_date || '', finishing_due_date: f.finishing_due_date || '', cutter_name: f.cutter_name || '', cutter_wage: String(f.cutter_wage || ''),
      tailor_wage: String(f.tailor_wage || ''), embroiderer_name: f.embroiderer_name || '', embroidery_wage: String(f.embroiderer_wage || ''),
      finisher_name: f.finisher_name || '', finisher_wage: String(f.finisher_wage || ''), packager_name: f.packager_name || '', packager_wage: String(f.packager_wage || ''),
      fabric_name: f.fabric_name || '', cut_meters: f.cut_meters ? String(f.cut_meters) : '', cut_unit: f.cut_unit || 'متر', bom_items: f.bom_items || [],
      delivery_fee: f.delivery_fee || 0, total_amount: fTot, paid_amount: fPd, advance_paid: fPd, deposit: fPd, remaining_balance: fRem, remaining_amount: fRem, remaining: fRem, subtotal: f.subtotal, deduct_inventory: false
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`تم تحميل بيانات أمر التشغيل (${f.order_no || f.id}) للتعديل ✏️`, 'info');
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') { e.preventDefault(); e.stopPropagation(); }
    if (!form.order_no) return showToast('يرجى اختيار الطلب أو الزبون ⚠️', 'error');
    if (!form.tailor) return showToast('يرجى تحديد الفني المسند إليه ⚠️', 'error');

    const rawBom = (Array.isArray(form.bom_items) && form.bom_items.length > 0)
      ? form.bom_items : [{ fabric_name: form.fabric_name || '', cut_meters: form.cut_meters || '', cut_unit: form.cut_unit || 'متر' }];

    if (form.deduct_inventory && typeof setInventory === 'function') {
      setInventory(prev => {
        let list = [...(prev || [])];
        rawBom.forEach(b => {
          const cutQty = parseFloat(b.cut_meters || 0), name = b.fabric_name || form.fabric_name;
          if (cutQty <= 0) return;
          const fi = (fabricInventory || []).find(i => (i.name || i.item_name) === name || i.id === name);
          const ded = window.UnitConversionService?.calculateDeduction ? window.UnitConversionService.calculateDeduction(cutQty, b.cut_unit || form.cut_unit || 'متر', fi?.unit || 'وار (ياردة)') : { deductAmount: cutQty };
          list = list.map(item => ((item.name || item.item_name) === name || item.id === name) ? { ...item, quantity: Math.max(0, (parseFloat(item.quantity || item.qty || 0)) - ded.deductAmount) } : item);
        });
        return list;
      });
    }

    const first = rawBom[0] || {};
    const existing = (factory || []).find(f => f.order_no === form.order_no || f.id === form.order_no);
    const subTot = parseFloat(form.total_amount ?? form.total_price ?? form.total ?? 0);
    const subPd = parseFloat(form.paid_amount ?? form.advance_paid ?? form.paid ?? form.deposit ?? 0);
    const subRem = Math.max(0, subTot - subPd);
    const newF = {
      id: existing ? existing.id : Date.now(), ...form, customer_name: form.customer || form.customer_name, child_name: form.child_name,
      product_name: form.product || form.product_name, quantity: form.quantity || 1, cut_meters: parseFloat(first.cut_meters || form.cut_meters || 0),
      cut_quantity: parseFloat(first.cut_meters || form.cut_meters || 0), cut_unit: first.cut_unit || form.cut_unit || 'متر', fabric_name: first.fabric_name || form.fabric_name,
      total_amount: subTot, paid_amount: subPd, advance_paid: subPd, deposit: subPd, remaining_amount: subRem, remaining_balance: subRem, remaining: subRem,
      bom_items: rawBom, bom: rawBom, materials: rawBom, fabrics: rawBom, deduct_inventory: form.deduct_inventory !== false,
      cutter_name: form.cutter_name, cutter_wage: parseFloat(form.cutter_wage || 0), tailor_name: form.tailor_name || form.tailor, tailor: form.tailor_name || form.tailor,
      tailor_wage: parseFloat(form.tailor_wage || 0), embroiderer_name: form.embroiderer_name, embroiderer_wage: parseFloat(form.embroiderer_wage || 0),
      finisher_name: form.finisher_name, finisher_wage: parseFloat(form.finisher_wage || 0), packager_name: form.packager_name, packager_wage: parseFloat(form.packager_wage || 0)
    };

    try {
      const res = await (service.updateStage ? service.updateStage(newF) : { success: false, error: 'خدمة التحديث غير متوفرة' });
      if (res && (res.success === false || res.status === 'error')) throw new Error(res.error || res.message || 'فشل حفظ أمر التشغيل');
      setFactory(prev => existing ? prev.map(f => (f.order_no === form.order_no || f.id === form.order_no) ? newF : f) : [newF, ...prev]);
      showToast(res?.message || 'تم اعتماد أمر التشغيل وحفظه بنجاح في قاعدة البيانات 🚀', 'success');
      window.dispatchEvent(new CustomEvent('erp:factoryChanged', { detail: { orderNo: form.order_no, status: 'updated' } }));
      window.dispatchEvent(new CustomEvent('erp:ordersChanged', { detail: { orderNo: form.order_no } }));
    } catch (err) {
      showToast(`فشل الحفظ في قاعدة البيانات ❌: ${err.message || 'خطأ في الاتصال بالخادم'}`, 'error');
    }
  };

  const advanceToNextStage = async (f) => {
    const orderId = f.order_no || f.id;
    if (actionLoadingId) return;
    setActionLoadingId(orderId);
    try {
      const curIdx = stages.indexOf(f.stage);
      if (curIdx >= stages.length - 1) return showToast('الطلب في مرحلته النهائية بالفعل (جاهز للتسليم 📦)', 'info');
      const nextStage = stages[curIdx + 1];
      const nextProg = utils.calculateDynamicProgress ? utils.calculateDynamicProgress(nextStage) : (utils.STAGE_PROGRESS?.[nextStage] ?? 100);
      const updatedF = { ...f, stage: nextStage, progress: nextProg, order_no: orderId };
      const res = await (service.updateStage ? service.updateStage(updatedF) : { success: false, error: 'خدمة التحديث غير متوفرة' });
      if (res && (res.success === false || res.status === 'error')) throw new Error(res.error || res.message || 'فشل ترقية المرحلة');
      setFactory(p => p.map(i => (i.order_no === f.order_no || i.id === f.id) ? { ...i, stage: nextStage, progress: nextProg } : i));
      showToast(nextProg === 100 ? `تم إنجاز مراحل تصنيع الطلب [${orderId}] بنجاح 📦✨` : `تم ترقية الطلب إلى [${nextStage}] بنسبة (${nextProg}%) 🧵`, 'success');
      window.dispatchEvent(new CustomEvent('erp:factoryChanged', { detail: { orderNo: f.order_no } }));
    } catch (err) {
      showToast(`فشل الترقية في قاعدة البيانات ❌: ${err.message || 'خطأ في الاتصال'}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleFastTrackQc = async (f) => {
    const cleanNo = String(f.order_no || f.id || '').replace(/^#/, '').trim();
    if (!cleanNo || actionLoadingId) return;
    setActionLoadingId(cleanNo);
    const readyState = { status: 'ready_for_delivery', stage: 'جاهز للتسليم 📦', production_status: 'ready', tailor_status: 'approved', wage_credited: true, quality_score: 5.0, quality_status: 'passed', progress: 100 };
    const payload = { order_no: cleanNo, orderId: cleanNo, status: 'passed', quality_score: 5.0, stage: 'جاهز للتسليم 📦', tailor_status: 'approved', customer_name: f.customer || f.customer_name || '', child_name: f.child_name || '', product_name: f.product || f.product_name || '', tailor_name: f.tailor || f.tailor_name || '' };
    try {
      if (service.updateStage) await service.updateStage({ ...f, ...readyState, order_no: cleanNo });
      try { await fetch('/api/factory/job-card/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch (_e) {}
      setFactory(p => (p || []).map(i => [i.order_no, i.id].some(v => String(v || '').replace(/^#/, '').trim().toLowerCase() === cleanNo.toLowerCase()) ? { ...i, ...readyState } : i));
      if (typeof setOrders === 'function') setOrders(p => (p || []).map(i => [i.order_no, i.id].some(v => String(v || '').replace(/^#/, '').trim().toLowerCase() === cleanNo.toLowerCase()) ? { ...i, ...readyState } : i));
      ['order_qc_updated', 'orders-updated', 'erp:factoryChanged', 'erp:ordersChanged'].forEach(ev => window.dispatchEvent(new CustomEvent(ev, { detail: payload })));
      showToast(`تم الاعتماد الفوري لجودة الطلب [${cleanNo}] بنجاح 👑 وجاهز للتسليم 🛍️`, 'success');
    } catch (err) {
      showToast(`خطأ في الاعتماد الفوري: ${err.message || 'تعذر الاتصال بالخادم'}`, 'error');
    } finally { setActionLoadingId(null); }
  };

  const handleDeleteOrder = async (f) => {
    const orderLabel = f.order_no || f.id;
    if (!window.confirm(`هل أنت متأكد من حذف أمر التشغيل [${orderLabel}]؟ ⚠️`)) return;
    try {
      const res = await (service.deleteOrder ? service.deleteOrder(f.id, f.order_no) : {});
      if (res?.success === false) return showToast(res.error || 'فشل الحذف ❌', 'error');
      setFactory(p => p.filter(i => i.id !== f.id && i.order_no !== f.order_no));
      showToast(res?.message || `تم حذف أمر التشغيل [${orderLabel}] 🗑️`, 'success');
    } catch (err) { showToast('خطأ أثناء حذف أمر التشغيل: ' + err.message, 'error'); }
  };

  const handleOpenPrintModal = (f) => {
    setPrintModalData(utils.preparePrintData ? utils.preparePrintData(f, orders, customers, products) : { order: f });
  };

  return {
    handleStageEmpChange, selectLatestCustomer, handleOrderSelect, handleStageChange,
    loadIntoForm, handleSubmit, advanceToNextStage, handleFastTrackQc, actionLoadingId,
    handleDeleteOrder, handleOpenPrintModal
  };
}

window.useFactoryOrderActions = useFactoryOrderActions;