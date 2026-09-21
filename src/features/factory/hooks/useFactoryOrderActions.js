function useFactoryOrderActions(props) {
  const {
    form, setForm, factory, setFactory, employees, orders,
    products, inventory, setInventory, customers, showToast, todayStrIso,
    stages, fabricInventory, setPrintModalData
  } = props;

  const service = window.FactoryService || {};
  const utils = window.FactoryUtils || {};

  const handleStageEmpChange = (stageRole, empName) => {
    const matched = (employees || []).find(e => e.name === empName || e.id === empName);
    const defSalary = matched ? (matched.salary || matched.baseSalary || matched.base_salary) : null;
    const numWage = (defSalary && parseFloat(defSalary) > 0) ? String(defSalary) : null;
    if (stageRole === 'cutter') setForm(p => ({ ...p, cutter_name: empName, cutter_wage: numWage || p.cutter_wage || '2000' }));
    else if (stageRole === 'tailor') setForm(p => ({ ...p, tailor_name: empName, tailor: empName, tailor_wage: numWage || p.tailor_wage || '5000' }));
    else if (stageRole === 'embroiderer') setForm(p => ({ ...p, embroiderer_name: empName, embroiderer_wage: numWage || p.embroiderer_wage || '3000' }));
    else if (stageRole === 'finisher') setForm(p => ({ ...p, finisher_name: empName, finisher_wage: numWage || p.finisher_wage || '1500' }));
  };

  const selectLatestCustomer = () => {
    if (!customers || customers.length === 0) return showToast('لا يوجد عملاء مسجلون حالياً ⚠️', 'warning');
    const lastCust = customers[0];
    const latestMeas = (lastCust.measurements && lastCust.measurements.length > 0) ? lastCust.measurements[0] : null;
    const chName = latestMeas?.child_name || (lastCust.children?.[0]?.child_name || 'الأميرة');
    const prodName = latestMeas?.selected_model || latestMeas?.model_name || 'فستان سندرلا';
    const matchingOrder = (orders || []).find(o => o.customer_id === lastCust.id || o.customer_id === lastCust.customer_id || (o.customer_name && o.customer_name === lastCust.name));
    const autoCalc = utils.calculateMetersForModel ? utils.calculateMetersForModel(prodName, chName, lastCust.name, products, customers, fabricInventory) : { fabric: 'تفتة تركي', meters: 3 };
    const targetDueDate = matchingOrder?.delivery_date || (utils.addDays ? utils.addDays(todayStrIso, 4) : '');
    const autoM = utils.autoDistributeMilestones ? utils.autoDistributeMilestones(todayStrIso, targetDueDate) : {};
    setForm(p => ({
      ...p, order_no: matchingOrder ? (matchingOrder.order_no || matchingOrder.id) : `ORD-${lastCust.customer_id || lastCust.id || '1001'}-${Date.now().toString().slice(-4)}`,
      customer: lastCust.name || lastCust.customer_name, child_name: chName, product: prodName, product_id: matchingOrder?.product_id || '',
      quantity: matchingOrder?.qty || 1, tailor: p.tailor || (employees?.find(emp => emp.status === 'نشط')?.name || 'المعلم سليم (خياط أول)'),
      stage: stages[0], progress: '20', start_date: todayStrIso, due_date: targetDueDate,
      cutting_due_date: autoM.cutting, sewing_due_date: autoM.sewing, embroidery_due_date: autoM.embroidery, finishing_due_date: autoM.finishing,
      fabric_name: autoCalc.fabric, cut_meters: String(autoCalc.meters), deduct_inventory: true
    }));
    showToast(`تم تحميل بيانات آخر زبونة: (${lastCust.name}) بنجاح ⚡👗`, 'success');
  };

  const handleOrderSelect = (e) => {
    const val = e.target.value;
    const ord = (orders || []).find(o => o.order_no === val || o.id === val);
    if (ord) {
      const existing = (factory || []).find(f => f.order_no === val || f.id === val);
      const cust = (customers || []).find(c => c.id === ord.customer_id || (c.name && ord.customer_name && c.name.includes(ord.customer_name)));
      const child = cust?.children?.find(ch => ch.id === ord.child_id || ch.child_name === ord.child_name) || cust?.children?.[0];
      const customerName = ord.customer_name || cust?.name || existing?.customer_name || existing?.customer || 'ام هنادي';
      let childName = ord.child_name || child?.child_name || child?.name || existing?.child_name;
      if (!childName || childName === customerName || childName.startsWith('ام ') || childName.startsWith('أم ')) {
        const measChild = cust?.measurements?.find(m => m.child_name && m.child_name !== customerName)?.child_name;
        childName = measChild || childName || 'هنادي';
      }
      const productName = ord.product_name || existing?.product_name || existing?.product || 'فستان سندرلا';
      const orderQty = ord.qty || ord.quantity || existing?.quantity || 1;
      const autoCalc = utils.calculateMetersForModel ? utils.calculateMetersForModel(productName, childName, customerName, products, customers, fabricInventory) : { fabric: 'تفتة تركي', meters: 3 };
      const targetDueDate = existing?.due_date || ord.delivery_date || (utils.addDays ? utils.addDays(ord.order_date || todayStrIso, 4) : '');
      const autoM = utils.autoDistributeMilestones ? utils.autoDistributeMilestones(existing?.start_date || todayStrIso, targetDueDate) : {};
      setForm(p => ({
        ...p, order_no: val, customer: customerName, child_name: childName, product: productName, product_id: ord.product_id || existing?.product_id || '',
        quantity: orderQty, tailor: existing?.tailor_name || existing?.tailor || p.tailor || (employees?.find(emp => emp.status === 'نشط')?.name || 'المعلم سليم (خياط أول)'),
        tailor_name: existing?.tailor_name || existing?.tailor || p.tailor_name || '', cutter_name: existing?.cutter_name || p.cutter_name || '',
        cutter_wage: existing?.cutter_wage ? String(existing.cutter_wage) : p.cutter_wage, tailor_wage: existing?.tailor_wage ? String(existing.tailor_wage) : p.tailor_wage,
        embroiderer_name: existing?.embroiderer_name || p.embroiderer_name || '', embroiderer_wage: existing?.embroiderer_wage ? String(existing.embroiderer_wage) : p.embroiderer_wage,
        finisher_name: existing?.finisher_name || p.finisher_name || '', finisher_wage: existing?.finisher_wage ? String(existing.finisher_wage) : p.finisher_wage,
        stage: existing?.stage || stages[0], progress: existing?.progress ? String(existing.progress).replace('%', '') : (utils.STAGE_PROGRESS?.[existing?.stage || stages[0]] || 20),
        start_date: existing?.start_date || todayStrIso, due_date: targetDueDate, cutting_due_date: existing?.cutting_due_date || autoM.cutting,
        sewing_due_date: existing?.sewing_due_date || autoM.sewing, embroidery_due_date: existing?.embroidery_due_date || autoM.embroidery,
        finishing_due_date: existing?.finishing_due_date || autoM.finishing, fabric_name: autoCalc.fabric, cut_meters: String(autoCalc.meters * orderQty), deduct_inventory: true
      }));
    } else {
      setForm({ ...form, order_no: val, customer: '', child_name: '', product: '', product_id: '', quantity: 1, due_date: '', fabric_name: '', cut_meters: '' });
    }
  };

  const handleStageChange = (e) => {
    const stage = e.target.value;
    setForm({ ...form, stage, progress: utils.STAGE_PROGRESS?.[stage] || 20 });
  };

  const loadIntoForm = (f) => {
    const ord = (orders || []).find(o => o.order_no === f.order_no || o.id === f.order_no);
    const cName = f.customer_name || f.customer || ord?.customer_name || 'ام هنادي';
    let chName = f.child_name || ord?.child_name;
    if (!chName || chName === cName || chName.startsWith('ام ') || chName.startsWith('أم ')) {
      const cust = (customers || []).find(c => c.id === ord?.customer_id || (c.name && cName.includes(c.name)));
      const measChild = cust?.measurements?.find(m => m.child_name && m.child_name !== cName)?.child_name;
      chName = measChild || chName || 'هنادي';
    }
    const orderQty = f.quantity || ord?.qty || ord?.quantity || 1;
    setForm({
      order_no: f.order_no || f.id, customer: cName, child_name: chName, product: f.product || f.product_name || ord?.product_name || 'فستان سندرلا',
      product_id: f.product_id || ord?.product_id || '', quantity: orderQty, tailor: f.tailor_name || f.tailor || '', tailor_name: f.tailor_name || f.tailor || '',
      stage: f.stage || stages[0], progress: f.progress ? String(f.progress).replace('%', '') : (utils.STAGE_PROGRESS?.[f.stage] || 20),
      start_date: f.start_date || todayStrIso, due_date: f.due_date || ord?.delivery_date || '', cutting_due_date: f.cutting_due_date || '',
      sewing_due_date: f.sewing_due_date || '', embroidery_due_date: f.embroidery_due_date || '', finishing_due_date: f.finishing_due_date || '',
      cutter_name: f.cutter_name || '', cutter_wage: String(f.cutter_wage || '2000'), tailor_wage: String(f.tailor_wage || '5000'),
      embroiderer_name: f.embroiderer_name || '', embroiderer_wage: String(f.embroiderer_wage || '3000'), finisher_name: f.finisher_name || '',
      finisher_wage: String(f.finisher_wage || '1500'), fabric_name: f.fabric_name || '', cut_meters: f.cut_meters ? String(f.cut_meters) : '',
      cut_unit: f.cut_unit || 'متر', deduct_inventory: false
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`تم تحميل بيانات أمر التشغيل (${f.order_no || f.id}) للتعديل ✏️`, 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.order_no) return showToast('يرجى اختيار الطلب أو الزبون ⚠️', 'error');
    if (!form.tailor) return showToast('يرجى تحديد الفني المسند إليه ⚠️', 'error');
    const cutQty = parseFloat(form.cut_meters || 0), cutUnit = form.cut_unit || 'متر';
    const curFabric = (fabricInventory || []).find(i => (i.name || i.item_name) === form.fabric_name || i.id === form.fabric_name);
    const stockUnit = curFabric?.unit || 'وار (ياردة)';
    let deduction = { deductAmount: cutQty, summaryText: `${cutQty} ${cutUnit}`, isConverted: false };
    if (window.UnitConversionService?.calculateDeduction) deduction = window.UnitConversionService.calculateDeduction(cutQty, cutUnit, stockUnit);
    if (cutQty > 0 && form.deduct_inventory && typeof setInventory === 'function') {
      setInventory(p => (p || []).map(item => {
        if ((item.name || item.item_name) === form.fabric_name || item.id === form.fabric_name) {
          const oldQ = parseFloat(item.quantity || item.qty || item.quantity_meters || 0);
          const newQ = Math.max(0, oldQ - deduction.deductAmount);
          return { ...item, quantity: newQ, qty: newQ, quantity_meters: newQ };
        }
        return item;
      }));
    }
    const existing = (factory || []).find(f => f.order_no === form.order_no || f.id === form.order_no);
    const newF = {
      id: existing ? existing.id : Date.now(), ...form, customer_name: form.customer, child_name: form.child_name,
      product_name: form.product, quantity: form.quantity, cut_meters: cutQty, cut_quantity: cutQty, cut_unit: cutUnit,
      stock_unit: stockUnit, deduct_amount_stock: deduction.deductAmount, fabric_name: form.fabric_name,
      deduct_inventory: form.deduct_inventory, cutter_name: form.cutter_name, cutter_wage: parseFloat(form.cutter_wage || 0),
      tailor_name: form.tailor_name || form.tailor, tailor: form.tailor_name || form.tailor, tailor_wage: parseFloat(form.tailor_wage || 0),
      embroiderer_name: form.embroiderer_name, embroiderer_wage: parseFloat(form.embroiderer_wage || 0), finisher_name: form.finisher_name,
      finisher_wage: parseFloat(form.finisher_wage || 0), cutting_due_date: form.cutting_due_date, sewing_due_date: form.sewing_due_date,
      embroidery_due_date: form.embroidery_due_date, finishing_due_date: form.finishing_due_date
    };
    try {
      const res = await (service.updateStage ? service.updateStage(newF) : { success: true });
      if (existing) setFactory(factory.map(f => (f.order_no === form.order_no || f.id === form.order_no) ? newF : f));
      else setFactory([newF, ...factory]);
      if (cutQty > 0 && form.deduct_inventory) showToast(`تم تعميد أمر الإنتاج واقتطاع ${deduction.summaryText} من خامة [${form.fabric_name || 'القماش'}] من المخزن بنجاح ✂️📦`, 'success');
      else if (res?.accounting_completed) showToast('تم تحديث المشغل وترحيل قيد إقفال المخزون التام (Dr 1153 / Cr 1152) بنجاح 📦✨', 'success');
      else showToast(res?.message || 'تم حفظ وتحديث أمر المشغل بنجاح 🚀', 'success');
    } catch (err) {
      showToast('تم التحديث محلياً ⚡', 'warning');
      if (existing) setFactory(factory.map(f => (f.order_no === form.order_no || f.id === form.order_no) ? newF : f));
      else setFactory([newF, ...factory]);
    }
  };

  const advanceToNextStage = async (f) => {
    const curIdx = stages.indexOf(f.stage);
    if (curIdx < stages.length - 1) {
      const nextStage = stages[curIdx + 1];
      const nextProg = utils.STAGE_PROGRESS?.[nextStage] || 100;
      const updatedF = { ...f, stage: nextStage, progress: nextProg, order_no: f.order_no || f.id };
      try {
        await (service.updateStage ? service.updateStage(updatedF) : {});
        setFactory(p => p.map(i => (i.order_no === f.order_no || i.id === f.id) ? { ...i, stage: nextStage, progress: nextProg } : i));
        if (nextProg === 100) showToast(`تم إنجاز الطلب ${f.order_no} وترحيل قيد إقفال المخزون (Dr 1153 / Cr 1152) بنجاح 📦✨`, 'success');
        else showToast(`تم ترقية الطلب ${f.order_no} إلى مرحلة [${nextStage}] بنجاح 🧵`, 'success');
      } catch (err) {
        setFactory(p => p.map(i => (i.order_no === f.order_no || i.id === f.id) ? { ...i, stage: nextStage, progress: nextProg } : i));
        showToast(`تم ترقية الطلب إلى ${nextStage} محلياً ⚡`, 'warning');
      }
    } else {
      showToast('الطلب في مرحلته النهائية بالفعل (جاهز للتسليم 📦)', 'info');
    }
  };

  const handleDeleteOrder = async (f) => {
    const orderLabel = f.order_no || f.id;
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف أمر التشغيل رقم [${orderLabel}] نهائياً من سوبابيز وقاعدة البيانات؟ ⚠️`)) return;
    try {
      const res = await (service.deleteOrder ? service.deleteOrder(f.id, f.order_no) : {});
      if (res && res.success === false) return showToast(res.error || 'فشل حذف أمر التشغيل ❌', 'error');
      setFactory(p => p.filter(i => i.id !== f.id && i.order_no !== f.order_no));
      showToast(res?.message || `تم حذف أمر التشغيل [${orderLabel}] بنجاح من سوبابيز 🗑️`, 'success');
    } catch (err) {
      showToast('خطأ أثناء حذف أمر التشغيل: ' + err.message, 'error');
    }
  };

  const handleOpenPrintModal = (f) => {
    const ord = (orders || []).find(o => o.order_no === f.order_no || o.id === f.order_no) || {
      order_no: f.order_no, customer_name: f.customer || f.customer_name, product_name: f.product || f.product_name,
      child_name: f.child_name, delivery_date: f.due_date, qty: f.quantity || 1, quantity: f.quantity || 1
    };
    const targetCust = (ord.customer_name || f.customer || f.customer_name || '').trim();
    const c = (customers || []).find(cust => {
      const cName = (cust.name || cust.customer_name || '').trim();
      return cName === targetCust || targetCust.includes(cName) || (cName && cName.length > 3 && targetCust.includes(cName));
    });
    const targetChild = (ord.child_name && ord.child_name !== targetCust) ? ord.child_name : (f.child_name && f.child_name !== targetCust ? f.child_name : '');
    const childMeas = (targetChild && c?.measurements?.find(m => m.child_name === targetChild)) ||
                      c?.measurements?.find(m => m.child_name && m.child_name !== targetCust) || c?.measurements?.[0];
    const resolvedChildName = targetChild || childMeas?.child_name || ord.child_name || f.child_name || 'هنادي';
    const targetProdName = (ord.product_name || f.product || f.product_name || '').trim();
    const targetProdId = ord.product_id || f.product_id;
    const prod = (products || []).find(p => (targetProdId && (String(p.id) === String(targetProdId) || String(p.product_id) === String(targetProdId))) ||
      p.name === targetProdName || p.model_name === targetProdName || (targetProdName && p.name && targetProdName.includes(p.name)) ||
      (targetProdName && p.model_name && targetProdName.includes(p.model_name)));
    setPrintModalData({
      order: { ...ord, child_name: resolvedChildName, product_name: ord.product_name || f.product || f.product_name, product_id: targetProdId || prod?.id, qty: f.quantity || ord.qty || ord.quantity || 1, quantity: f.quantity || ord.quantity || ord.qty || 1 },
      customer: c, measurements: childMeas, product: prod, products: products
    });
  };

  return {
    handleStageEmpChange, selectLatestCustomer, handleOrderSelect, handleStageChange,
    loadIntoForm, handleSubmit, advanceToNextStage, handleDeleteOrder, handleOpenPrintModal
  };
}

window.useFactoryOrderActions = useFactoryOrderActions;
