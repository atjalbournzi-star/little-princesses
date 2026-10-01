function useFactoryOrderActions(props) {
  const {
    form, setForm, factory, setFactory, employees, orders,
    products, setInventory, customers, showToast, todayStrIso,
    stages, fabricInventory, setPrintModalData
  } = props;

  const service = window.FactoryService || {};
  const utils = window.FactoryUtils || {};

  const handleStageEmpChange = (stageRole, empName) => {
    const matched = (employees || []).find(e => e.name === empName || e.id === empName);
    const wage = matched ? String(matched.salary || matched.baseSalary || matched.base_salary || '') : '';
    const wageSvc = window.WageMatrixService || {};
    const dW = wageSvc.resolveStageWages ? wageSvc.resolveStageWages(form) : {};
    if (stageRole === 'cutter') setForm(p => ({ ...p, cutter_name: empName, cutter_wage: wage || p.cutter_wage || String(dW.cutter_wage || '') }));
    else if (stageRole === 'tailor') setForm(p => ({ ...p, tailor_name: empName, tailor: empName, tailor_wage: wage || p.tailor_wage || String(dW.tailor_wage || '') }));
    else if (stageRole === 'embroiderer') setForm(p => ({ ...p, embroiderer_name: empName, embroiderer_wage: wage || p.embroiderer_wage || String(dW.embroiderer_wage || '') }));
    else if (stageRole === 'finisher') setForm(p => ({ ...p, finisher_name: empName, finisher_wage: wage || p.finisher_wage || String(dW.finisher_wage || '') }));
  };

  const selectLatestCustomer = () => {
    if (!customers?.length) return showToast('لا يوجد عملاء مسجلون حالياً ⚠️', 'warning');
    const c = customers[0], m = c.measurements?.[0], ch = m?.child_name || c.children?.[0]?.child_name || 'الأميرة';
    const pName = m?.selected_model || m?.model_name || 'فستان سندرلا';
    const ord = (orders || []).find(o => o.customer_id === c.id || o.customer_id === c.customer_id || (o.customer_name && o.customer_name === c.name));
    const autoCalc = utils.calculateMetersForModel ? utils.calculateMetersForModel(pName, ch, c.name, products, customers, fabricInventory) : { fabric: 'تفتة تركي', meters: 3 };
    const due = ord?.delivery_date || (utils.addDays ? utils.addDays(todayStrIso, 4) : '');
    const autoM = utils.autoDistributeMilestones ? utils.autoDistributeMilestones(todayStrIso, due) : {};
    setForm(p => ({
      ...p, order_no: ord ? (ord.order_no || ord.id) : `ORD-${c.customer_id || c.id || '1001'}-${Date.now().toString().slice(-4)}`,
      customer: c.name || c.customer_name, customer_name: c.name || c.customer_name, child_name: ch, product: pName, product_name: pName, product_id: ord?.product_id || '',
      quantity: ord?.qty || 1, tailor: p.tailor || (employees?.find(e => e.status === 'نشط')?.name || 'المعلم سليم (خياط أول)'),
      stage: stages[0], progress: '20', start_date: todayStrIso, due_date: due, cutting_due_date: autoM.cutting, sewing_due_date: autoM.sewing,
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
    const childMeas = ord.measurements_spec || ord.measurements || {};
    const orderQty = parseFloat(ord.qty || ord.quantity || 1) || 1;
    const conv = window.MeasurementConverter;
    const selectedSize = conv ? conv.resolveSizeCode(childMeas, prod?.target_segment || 'kids') : (form.size_code || '6-9Y');
    const dressInches = conv ? conv.resolveDressLengthInches(childMeas) : 26;
    const bomItems = conv ? conv.buildBomItems(prod, selectedSize, dressInches, orderQty, fabricInventory, ord) : [];
    const firstBom = bomItems[0] || {};
    const unitPrice = conv ? conv.resolveUnitPrice(prod, selectedSize) : 0;
    const delFee = parseFloat(ord.delivery_fee ?? ord.delivery ?? 0);
    const delMode = ord.delivery_payment_mode || 'DIRECT_TO_COURIER';
    const isPrepaid = delMode === 'PREPAID_VIA_ATELIER';
    const baseDressTot = unitPrice > 0 ? (unitPrice * orderQty) : (parseFloat(ord.total_amount ?? ord.total ?? ord.total_price ?? 0) - (isPrepaid ? delFee : 0));
    const finalTot = baseDressTot + (isPrepaid ? delFee : 0);
    const ordPd = parseFloat(ord.paid_amount ?? ord.paid ?? ord.deposit ?? 0);
    const targetDueDate = ord.delivery_date || ord.due_date || (utils.addDays ? utils.addDays(todayStrIso, 4) : '');
    const autoM = utils.autoDistributeMilestones ? utils.autoDistributeMilestones(todayStrIso, targetDueDate) : {};
    const wageSvc = window.WageMatrixService || {};
    const stageWages = wageSvc.resolveStageWages ? wageSvc.resolveStageWages(form, prod) : {};

    setForm(p => ({
      ...p, order_no: ord.order_no || val, customer: ord.customer_name || ord.customer || 'عميلة كريمة', customer_name: ord.customer_name || ord.customer || 'عميلة كريمة',
      child_name: ord.child_name || 'الأميرة', product: prod?.model_name || prod?.name || ord.product_name || ord.product || '', product_name: prod?.model_name || prod?.name || ord.product_name || ord.product || '',
      product_id: prod?.id || ord.product_id || '', image_url: prod?.image_url || prod?.image || p.image_url || '', target_segment: prod?.target_segment || 'kids', quantity: orderQty,
      measurements_spec: childMeas, size_code: selectedSize, size_badge: `[ الفئة: ${selectedSize} - طول ${dressInches.toFixed(1)}" ]`,
      tailor: p.tailor || (employees?.find(e => e.status === 'نشط' && e.role === 'خياط')?.name || employees?.find(e => e.status === 'نشط')?.name || ''),
      tailor_name: p.tailor_name || '', cutter_name: p.cutter_name || '',
      cutter_wage: String(prod?.cutter_wage || prod?.meta?.cutter_wage || p.cutter_wage || stageWages.cutter_wage || ''),
      tailor_wage: String(prod?.tailor_wage || prod?.meta?.tailor_wage || p.tailor_wage || stageWages.tailor_wage || ''),
      embroiderer_name: p.embroiderer_name || '',
      embroiderer_wage: String(prod?.embroiderer_wage || prod?.meta?.embroiderer_wage || p.embroiderer_wage || stageWages.embroiderer_wage || ''),
      finisher_name: p.finisher_name || '',
      finisher_wage: String(prod?.finisher_wage || prod?.meta?.finisher_wage || p.finisher_wage || stageWages.finisher_wage || ''),
      stage: p.stage || stages[0], progress: p.progress || '20', start_date: todayStrIso, due_date: targetDueDate, cutting_due_date: autoM.cutting, sewing_due_date: autoM.sewing,
      embroidery_due_date: autoM.embroidery, finishing_due_date: autoM.finishing, fabric_name: firstBom.fabric_name || p.fabric_name, cut_meters: firstBom.cut_meters || '1.50',
      cut_unit: firstBom.cut_unit || 'متر', deduct_inventory: true, production_type: 'bespoke', bom_items: bomItems, bom: bomItems, materials: bomItems,
      delivery_fee: delFee, delivery_payment_mode: delMode, price: unitPrice, total_price: finalTot,
      total_amount: Number(ord.total_amount ?? ord.base_amount ?? finalTot), paid_amount: Number(ord.paid_amount ?? ord.advance_paid ?? ordPd),
      advance_paid: Number(ord.paid_amount ?? ord.advance_paid ?? ordPd), remaining_balance: Number(ord.remaining_balance ?? ord.remaining_amount ?? ord.remaining ?? (finalTot - ordPd)),
      remaining_amount: Number(ord.remaining_balance ?? ord.remaining_amount ?? ord.remaining ?? (finalTot - ordPd)), subtotal: Number(ord.subtotal ?? (finalTot - delFee)), currency: ord.currency || 'YER'
    }));
  };

  const handleStageChange = (e) => {
    const stage = e?.target?.value ?? e;
    setForm(p => ({ ...p, stage, progress: utils.STAGE_PROGRESS?.[stage] || 20 }));
  };

  const loadIntoForm = (f) => {
    setForm({
      order_no: f.order_no || f.id, customer: f.customer || f.customer_name || 'ام هنادي', customer_name: f.customer_name || f.customer || 'ام هنادي',
      child_name: f.child_name || 'هنادي', product: f.product || f.product_name || 'فستان سندرلا', product_name: f.product || f.product_name || 'فستان سندرلا',
      product_id: f.product_id || '', quantity: f.quantity || 1, tailor: f.tailor_name || f.tailor || '', tailor_name: f.tailor_name || f.tailor || '',
      stage: f.stage || stages[0], progress: f.progress ? String(f.progress).replace('%', '') : (utils.STAGE_PROGRESS?.[f.stage] || 20),
      start_date: f.start_date || todayStrIso, due_date: f.due_date || '', cutting_due_date: f.cutting_due_date || '', sewing_due_date: f.sewing_due_date || '',
      embroidery_due_date: f.embroidery_due_date || '', finishing_due_date: f.finishing_due_date || '', cutter_name: f.cutter_name || '',
      cutter_wage: String(f.cutter_wage || ''), tailor_wage: String(f.tailor_wage || ''), embroiderer_name: f.embroiderer_name || '',
      embroidery_wage: String(f.embroiderer_wage || ''), finisher_name: f.finisher_name || '', finisher_wage: String(f.finisher_wage || ''),
      fabric_name: f.fabric_name || '', cut_meters: f.cut_meters ? String(f.cut_meters) : '', cut_unit: f.cut_unit || 'متر', bom_items: f.bom_items || [],
      delivery_fee: f.delivery_fee || 0, total_amount: f.total_amount, paid_amount: f.paid_amount, advance_paid: f.advance_paid || f.paid_amount,
      remaining_balance: f.remaining_balance || f.remaining_amount, remaining_amount: f.remaining_amount || f.remaining_balance, subtotal: f.subtotal, deduct_inventory: false
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`تم تحميل بيانات أمر التشغيل (${f.order_no || f.id}) للتعديل ✏️`, 'info');
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!form.order_no) return showToast('يرجى اختيار الطلب أو الزبون ⚠️', 'error');
    if (!form.tailor) return showToast('يرجى تحديد الفني المسند إليه ⚠️', 'error');

    const rawBom = (Array.isArray(form.bom_items) && form.bom_items.length > 0)
      ? form.bom_items : [{ fabric_name: form.fabric_name || '', cut_meters: form.cut_meters || '', cut_unit: form.cut_unit || 'متر' }];

    if (form.deduct_inventory && typeof setInventory === 'function') {
      setInventory(prev => {
        let list = [...(prev || [])];
        rawBom.forEach(b => {
          const cutQty = parseFloat(b.cut_meters || 0);
          if (cutQty <= 0) return;
          const name = b.fabric_name || form.fabric_name;
          const fi = (fabricInventory || []).find(i => (i.name || i.item_name) === name || i.id === name);
          const stockU = fi?.unit || 'وار (ياردة)', cutU = b.cut_unit || form.cut_unit || 'متر';
          const ded = window.UnitConversionService?.calculateDeduction ? window.UnitConversionService.calculateDeduction(cutQty, cutU, stockU) : { deductAmount: cutQty };
          list = list.map(item => ((item.name || item.item_name) === name || item.id === name) ? { ...item, quantity: Math.max(0, (parseFloat(item.quantity || item.qty || 0)) - ded.deductAmount) } : item);
        });
        return list;
      });
    }

    const first = rawBom[0] || {};
    const existing = (factory || []).find(f => f.order_no === form.order_no || f.id === form.order_no);
    const newF = {
      id: existing ? existing.id : Date.now(), ...form, customer_name: form.customer || form.customer_name, child_name: form.child_name,
      product_name: form.product || form.product_name, quantity: form.quantity || 1, cut_meters: parseFloat(first.cut_meters || form.cut_meters || 0),
      cut_quantity: parseFloat(first.cut_meters || form.cut_meters || 0), cut_unit: first.cut_unit || form.cut_unit || 'متر', fabric_name: first.fabric_name || form.fabric_name,
      bom_items: rawBom, bom: rawBom, materials: rawBom, fabrics: rawBom,
      deduct_inventory: form.deduct_inventory !== false, cutter_name: form.cutter_name, cutter_wage: parseFloat(form.cutter_wage || 0),
      tailor_name: form.tailor_name || form.tailor, tailor: form.tailor_name || form.tailor, tailor_wage: parseFloat(form.tailor_wage || 0),
      embroiderer_name: form.embroiderer_name, embroiderer_wage: parseFloat(form.embroiderer_wage || 0), finisher_name: form.finisher_name, finisher_wage: parseFloat(form.finisher_wage || 0)
    };

    try {
      const res = await (service.updateStage ? service.updateStage(newF) : { success: true });
      if (existing) setFactory(factory.map(f => (f.order_no === form.order_no || f.id === form.order_no) ? newF : f));
      else setFactory([newF, ...factory]);
      showToast(res?.message || 'تم حفظ وتحديث أمر المشغل واقتطاع القماش بنجاح 🚀', 'success');
    } catch (err) {
      if (existing) setFactory(factory.map(f => (f.order_no === form.order_no || f.id === form.order_no) ? newF : f));
      else setFactory([newF, ...factory]);
      showToast('تم الحفظ محلياً ⚡', 'warning');
    }
  };

  const advanceToNextStage = async (f) => {
    const curIdx = stages.indexOf(f.stage);
    if (curIdx < stages.length - 1) {
      const nextStage = stages[curIdx + 1], nextProg = utils.STAGE_PROGRESS?.[nextStage] || 100;
      const updatedF = { ...f, stage: nextStage, progress: nextProg, order_no: f.order_no || f.id };
      try {
        await (service.updateStage ? service.updateStage(updatedF) : {});
        setFactory(p => p.map(i => (i.order_no === f.order_no || i.id === f.id) ? { ...i, stage: nextStage, progress: nextProg } : i));
        showToast(nextProg === 100 ? `تم إنجاز الطلب ${f.order_no} بنجاح 📦✨` : `تم ترقية الطلب إلى [${nextStage}] 🧵`, 'success');
      } catch (err) {
        setFactory(p => p.map(i => (i.order_no === f.order_no || i.id === f.id) ? { ...i, stage: nextStage, progress: nextProg } : i));
        showToast(`تم الترقية محلياً ⚡`, 'warning');
      }
    } else {
      showToast('الطلب في مرحلته النهائية بالفعل (جاهز للتسليم 📦)', 'info');
    }
  };

  const handleDeleteOrder = async (f) => {
    const orderLabel = f.order_no || f.id;
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف أمر التشغيل رقم [${orderLabel}]؟ ⚠️`)) return;
    try {
      const res = await (service.deleteOrder ? service.deleteOrder(f.id, f.order_no) : {});
      if (res?.success === false) return showToast(res.error || 'فشل الحذف ❌', 'error');
      setFactory(p => p.filter(i => i.id !== f.id && i.order_no !== f.order_no));
      showToast(res?.message || `تم حذف أمر التشغيل [${orderLabel}] 🗑️`, 'success');
    } catch (err) {
      showToast('خطأ أثناء حذف أمر التشغيل: ' + err.message, 'error');
    }
  };

  const handleOpenPrintModal = (f) => {
    const data = utils.preparePrintData ? utils.preparePrintData(f, orders, customers, products) : { order: f };
    setPrintModalData(data);
  };

  return {
    handleStageEmpChange, selectLatestCustomer, handleOrderSelect, handleStageChange,
    loadIntoForm, handleSubmit, advanceToNextStage, handleDeleteOrder, handleOpenPrintModal
  };
}

window.useFactoryOrderActions = useFactoryOrderActions;