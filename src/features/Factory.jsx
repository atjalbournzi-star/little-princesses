const { useState, useEffect, useMemo, useCallback, useRef } = React;

function Factory({ factory = [], setFactory, employees = [], orders = [], setOrders, products = [], setProducts, inventory = [], setInventory, customers = [], setCustomers, accounts = [], showToast, targetJob, onClearTargetJob }) {
  const FACTORY_STAGES = [
    'القص والتحضير ✂️',
    'مرحلة الخياطة 🪡',
    'التطريز والشك ✨',
    'الفحص والتشطيب النهائي 🔍',
    'جاهز للتسليم 📦'
  ];

  const STAGE_PROGRESS = {
    'القص والتحضير ✂️': 20,
    'مرحلة الخياطة 🪡': 40,
    'التطريز والشك ✨': 60,
    'الفحص والتشطيب النهائي 🔍': 80,
    'جاهز للتسليم 📦': 100
  };

  // ── التبويب الرئيسي: خطوط الإنتاج والتشغيل مقابل لوحة التحليلات والتكاليف ──
  const [activeMainTab, setActiveMainTab]             = useState('pipeline'); // 'pipeline' | 'analytics'
  const [analyticsData, setAnalyticsData]             = useState(null);
  const [loadingAnalytics, setLoadingAnalytics]       = useState(false);
  const [stockInflowLoading, setStockInflowLoading]   = useState({});
  const [deliveryModalData, setDeliveryModalData]     = useState(null);
  const [deliveryForm, setDeliveryForm]               = useState({
    amount_collected: '',
    discount: '0',
    account_id: 'ACC-101',
    payment_method: 'نقد (كاش)',
    notes: ''
  });
  const [submittingDelivery, setSubmittingDelivery]   = useState(false);
  const [deliveredSuccessData, setDeliveredSuccessData] = useState(null);

  // جلب تحليلات المشغل ومؤشرات الأداء من سوبابيز
  const fetchFactoryAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch('/api/factory/analytics');
      const data = await res.json();
      if (data.success) {
        setAnalyticsData(data.data);
      } else {
        showToast(data.error || 'تعذر جلب تحليلات المشغل', 'error');
      }
    } catch (err) {
      console.error('Error fetching factory analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (activeMainTab === 'analytics' && !analyticsData) {
      fetchFactoryAnalytics();
    }
  }, [activeMainTab, analyticsData, fetchFactoryAnalytics]);

  // قائمة خامات الأقمشة المتاحة في المخزن
  const fabricInventory = useMemo(() => {
    return (inventory || []).filter(item => {
      const cat = (item.category || '').toLowerCase();
      const type = (item.type || '').toLowerCase();
      const unit = (item.unit || '').toLowerCase();
      const name = (item.name || item.item_name || '').toLowerCase();
      return cat.includes('أقمش') || cat.includes('قماش') || cat.includes('خام') ||
             type.includes('fabric') || unit.includes('متر') || unit.includes('وار') ||
             unit.includes('يارد') || name.includes('تل') || name.includes('تفتة') ||
             name.includes('حرير') || name.includes('اوركنزا') || name.includes('شيفون') ||
             name.includes('صدفة') || name.includes('بطان');
    });
  }, [inventory]);

  const [form, setForm] = useState({
    order_no: '', customer: '', child_name: '', product: '', product_id: '', quantity: 1, tailor: '', stage: FACTORY_STAGES[0], progress: '20', start_date: TODAY_STR_ISO, due_date: '',
    cutting_due_date: '', sewing_due_date: '', embroidery_due_date: '', finishing_due_date: '',
    cutter_name: '', cutter_wage: '2000',
    tailor_name: '', tailor_wage: '5000',
    embroiderer_name: '', embroiderer_wage: '3000',
    finisher_name: '', finisher_wage: '1500',
    fabric_name: '', cut_meters: '', cut_unit: 'متر', deduct_inventory: true
  });
  const [selectedJobCustomer, setSelectedJobCustomer] = useState(null);
  const [printModalData, setPrintModalData]           = useState(null);
  const [qcModalData, setQcModalData]                 = useState(null);
  const [stageFilter, setStageFilter]                 = useState('الكل');
  const [search, setSearch]                           = useState('');

  // الربط التلقائي بأجر الفني المسجل في الموارد البشرية عند اختياره (HR Default Wage Auto-fill)
  const handleStageEmpChange = (stageRole, empName) => {
    const matched = (employees || []).find(e => e.name === empName || e.id === empName);
    const defaultSalary = matched ? (matched.salary || matched.baseSalary || matched.base_salary) : null;
    const numWage = (defaultSalary && parseFloat(defaultSalary) > 0) ? String(defaultSalary) : null;

    if (stageRole === 'cutter') {
      setForm(prev => ({
        ...prev,
        cutter_name: empName,
        cutter_wage: numWage || prev.cutter_wage || '2000'
      }));
    } else if (stageRole === 'tailor') {
      setForm(prev => ({
        ...prev,
        tailor_name: empName,
        tailor: empName,
        tailor_wage: numWage || prev.tailor_wage || '5000'
      }));
    } else if (stageRole === 'embroiderer') {
      setForm(prev => ({
        ...prev,
        embroiderer_name: empName,
        embroiderer_wage: numWage || prev.embroiderer_wage || '3000'
      }));
    } else if (stageRole === 'finisher') {
      setForm(prev => ({
        ...prev,
        finisher_name: empName,
        finisher_wage: numWage || prev.finisher_wage || '1500'
      }));
    }
  };

  // حذف أمر التشغيل والإنتاج نهائياً من سوبابيز
  const handleDeleteOrder = async (f) => {
    const orderLabel = f.order_no || f.id;
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف أمر التشغيل رقم [${orderLabel}] نهائياً من سوبابيز وقاعدة البيانات؟ ⚠️`)) {
      return;
    }
    try {
      let res = null;
      try {
        const response = await fetch('/api/factory/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: f.id, order_no: f.order_no })
        });
        res = await response.json();
      } catch (_httpErr) {
        res = await callGAS('deleteFactoryOrder', { id: f.id, order_no: f.order_no });
      }

      if (res && res.success === false) {
        showToast(res.error || 'فشل حذف أمر التشغيل ❌', 'error');
        return;
      }

      setFactory(prev => prev.filter(item => (item.id !== f.id && item.order_no !== f.order_no)));
      showToast(res?.message || `تم حذف أمر التشغيل [${orderLabel}] بنجاح من سوبابيز 🗑️`, 'success');
    } catch (err) {
      showToast('خطأ أثناء حذف أمر التشغيل: ' + err.message, 'error');
    }
  };

  // ── المسار الأول: توريد الفساتين التامة للمخزن واحتساب التكلفة الفعلية آلياً ──
  const handleStockInflow = async (f) => {
    const poNo = f.order_no || f.id;
    setStockInflowLoading(prev => ({ ...prev, [poNo]: true }));
    try {
      const res = await fetch('/api/factory/stock-inflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: f.id,
          production_order_no: poNo,
          product_name: f.product || f.product_name,
          quantity: f.quantity || 1
        })
      }).then(r => r.json());

      if (res.success) {
        showToast(res.message || `تم توريد [${f.product || f.product_name}] للمخزن بنجاح 📦`, 'success');
        setFactory(prev => prev.map(item => (item.id === f.id || item.order_no === f.order_no) ? {
          ...item,
          stock_received: true,
          stage: 'جاهز للتسليم 📦',
          progress: 100
        } : item));

        // تحديث رصيد المخزن محلياً
        if (typeof setInventory === 'function') {
          const prodName = f.product || f.product_name;
          const pieces = parseFloat(f.quantity || 1);
          setInventory(prev => {
            const found = (prev || []).some(i => (i.name || i.item_name) === prodName);
            if (found) {
              return prev.map(i => (i.name || i.item_name) === prodName ? { ...i, quantity: (parseFloat(i.quantity || 0) + pieces) } : i);
            } else {
              return [...prev, { id: 'INV-' + Date.now(), name: prodName, quantity: pieces, unit: 'قطعة', type: 'Finished' }];
            }
          });
        }
      } else {
        showToast(res.error || 'فشل التوريد للمخزن ❌', 'error');
      }
    } catch (err) {
      showToast('خطأ في الاتصال: ' + err.message, 'error');
    } finally {
      setStockInflowLoading(prev => ({ ...prev, [poNo]: false }));
    }
  };

  // إلغاء التوريد المخزني وعكس الحركة لإتاحة التعديل
  const handleReverseStockInflow = async (f) => {
    const poNo = f.order_no || f.id;
    if (!window.confirm(`هل أنت متأكد من رغبتك في إلغاء التوريد المخزني لأمر التشغيل [${poNo}]؟\nسيتم خصم الكمية من المخزن وإتاحة التعديل من جديد 🔄`)) {
      return;
    }
    setStockInflowLoading(prev => ({ ...prev, [poNo]: true }));
    try {
      const res = await fetch('/api/factory/stock-inflow/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: f.id,
          production_order_no: poNo
        })
      }).then(r => r.json());

      if (res.success) {
        showToast(res.message || 'تم إلغاء التوريد بنجاح 🔄', 'success');
        setFactory(prev => prev.map(item => (item.id === f.id || item.order_no === f.order_no) ? {
          ...item,
          stock_received: false
        } : item));

        // خصم الكمية من المخزن محلياً
        if (typeof setInventory === 'function') {
          const prodName = f.product || f.product_name;
          const pieces = parseFloat(f.quantity || 1);
          setInventory(prev => (prev || []).map(i => (i.name || i.item_name) === prodName ? { ...i, quantity: Math.max(0, parseFloat(i.quantity || 0) - pieces) } : i));
        }
      } else {
        showToast(res.error || 'تعذر إلغاء التوريد', 'error');
      }
    } catch (err) {
      showToast('خطأ: ' + err.message, 'error');
    } finally {
      setStockInflowLoading(prev => ({ ...prev, [poNo]: false }));
    }
  };

  // ── المسار الثاني: تسليم فستان الأميرة وتحصيل المتبقي والترحيل المحاسبي ──
  const handleOpenDeliveryModal = (f) => {
    const orderLabel = f.order_no || f.id;
    const ord = orders.find(o => o.order_no === orderLabel || o.id === orderLabel) || {
      order_no: orderLabel,
      customer_name: f.customer || f.customer_name,
      child_name: f.child_name,
      product_name: f.product || f.product_name,
      total_amount: f.total_amount || 0,
      total: f.total || 0,
      paid_amount: f.paid_amount || 0,
      paid: f.paid || 0,
      qty: f.quantity || 1
    };

    const tot = parseFloat(ord.total_amount ?? ord.total ?? 0);
    const pd = parseFloat(ord.paid_amount ?? ord.paid ?? 0);
    const rem = Math.max(0, tot - pd);

    setDeliveryForm({
      amount_collected: String(rem),
      discount: '0',
      account_id: 'ACC-101',
      payment_method: 'نقد (كاش)',
      notes: ''
    });
    setDeliveredSuccessData(null);
    setDeliveryModalData({
      ...f,
      order: ord,
      resolvedTotal: tot,
      resolvedPaid: pd,
      resolvedRemaining: rem
    });
  };

  const handleConfirmDelivery = async () => {
    if (!deliveryModalData) return;
    setSubmittingDelivery(true);
    const orderNo = deliveryModalData.order?.order_no || deliveryModalData.order_no || deliveryModalData.id;
    const amt = parseFloat(deliveryForm.amount_collected || 0);
    const disc = parseFloat(deliveryForm.discount || 0);

    try {
      const res = await fetch('/api/sales/orders/deliver-and-settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderNo,
          amount_collected: amt,
          discount: disc,
          account_id: deliveryForm.account_id,
          payment_method: deliveryForm.payment_method,
          notes: deliveryForm.notes
        })
      }).then(r => r.json());

      if (res.success) {
        showToast(res.message || 'تم تسليم الفستان للأميرة وتقييد التحصيل المالي بنجاح 👑🎉', 'success');

        // تحديث محلي في أوامر الإنتاج
        setFactory(prev => prev.map(item => (item.id === deliveryModalData.id || item.order_no === deliveryModalData.order_no) ? {
          ...item,
          stage: 'تم التسليم ✅',
          progress: 100
        } : item));

        // تحديث محلي في سجل الطلبات إذا كان متوفراً
        if (typeof setOrders === 'function') {
          setOrders(prev => (prev || []).map(o => (o.order_no === orderNo || o.id === orderNo) ? {
            ...o,
            status: 'تم التسليم ✅',
            production_status: 'Delivered',
            paid: (parseFloat(o.paid || 0) + amt),
            paid_amount: (parseFloat(o.paid_amount || 0) + amt),
            remaining: Math.max(0, (parseFloat(o.total || o.total_amount || 0) - disc) - (parseFloat(o.paid || o.paid_amount || 0) + amt))
          } : o));
        }

        setDeliveredSuccessData(res.data || { order_no: orderNo, collected_amount: amt });
      } else {
        showToast(res.error || 'فشلت عملية التسليم والتحصيل ❌', 'error');
      }
    } catch (err) {
      showToast('خطأ أثناء التسليم: ' + err.message, 'error');
    } finally {
      setSubmittingDelivery(false);
    }
  };

  const handleReverseDelivery = async (f) => {
    const orderNo = f.order_no || f.id;
    if (!window.confirm(`هل أنت متأكد من رغبتك في إلغاء تسليم الطلب رقم [${orderNo}]؟\nسيتم عكس قيد التحصيل وسند القبض وإعادة الطلب لقائمة الجاهز للتسليم 🔄`)) {
      return;
    }
    try {
      const res = await fetch('/api/sales/orders/reverse-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderNo })
      }).then(r => r.json());

      if (res.success) {
        showToast(res.message || 'تم إلغاء التسليم بنجاح وإعادة الطلب إلى جاهز للتسليم 🔄', 'success');
        setFactory(prev => prev.map(item => (item.id === f.id || item.order_no === f.order_no) ? {
          ...item,
          stage: 'جاهز للتسليم 📦',
          progress: 95
        } : item));
        if (typeof setOrders === 'function') {
          setOrders(prev => (prev || []).map(o => (o.order_no === orderNo || o.id === orderNo) ? {
            ...o,
            status: 'جاهز للتسليم 🛍️',
            production_status: 'Ready'
          } : o));
        }
      } else {
        showToast(res.error || 'فشل إلغاء التسليم', 'error');
      }
    } catch (err) {
      showToast('خطأ: ' + err.message, 'error');
    }
  };

  const sendWhatsAppDeliveryGreeting = (data) => {
    const cName = data?.customer_name || deliveryModalData?.customer_name || deliveryModalData?.customer || 'العميلة الكريمة';
    const chName = data?.child_name || deliveryModalData?.child_name || 'الأميرة';
    const pName = data?.product_name || deliveryModalData?.product || 'فستان الأميرات الفاخر';
    const orderNo = data?.order_no || deliveryModalData?.order_no || deliveryModalData?.id;
    const paidAmt = parseFloat(deliveryForm?.amount_collected || 0);

    const msg = `👑 *ليتل برنسيس للأزياء الفاخرة* 👑\n\nألف مبارك استلام الفستان الملكي لأميرتنا الجميلة *${chName}*! 🌸✨\n\n👗 *الموديل:* ${pName}\n📋 *رقم الطلب:* ${orderNo}\n${paidAmt > 0 ? `💰 *المبلغ المحصل عند التسليم:* ${paidAmt.toLocaleString()} ر.ي\n` : ''}✅ *حالة الطلب:* تم التسليم بالكامل وبأعلى معايير الجودة الملكية.\n\nنتمنى لأميرتنا الصغيرة إطلالة ساحرة تملأ قلوبكم بهجة وسعادة! نسعد دائماً بخدمتكم وتجدد لقائكم معنا 💖👑`;

    const cust = customers.find(c => (c.name && cName.includes(c.name)) || (cName && c.name && cName.includes(c.name)));
    const phone = (cust?.phone || cust?.['رقم الهاتف'] || '').replace(/[^0-9]/g, '');
    const waUrl = phone 
      ? `https://api.whatsapp.com/send?phone=${phone.startsWith('0') ? '967' + phone.substring(1) : (phone.startsWith('967') ? phone : '967' + phone)}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  // Calculate 4 days from a date string
  const addDays = (dateStr, days) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // التوزيع التلقائي الذكي لمواعيد المراحل الأربع (القص، الخياطة، التطريز، التشطيب)
  const autoDistributeMilestones = (startDateStr, dueDateStr) => {
    const start = new Date(startDateStr || TODAY_STR_ISO);
    const end = new Date(dueDateStr || addDays(TODAY_STR_ISO, 5));
    const totalDiffMs = Math.max(86400000, end - start);
    const totalDays = Math.max(1, Math.round(totalDiffMs / 86400000));
    
    const cutDays = Math.max(1, Math.round(totalDays * 0.25));
    const sewDays = Math.max(cutDays + 1, Math.round(totalDays * 0.60));
    const embDays = Math.max(sewDays + 1, Math.round(totalDays * 0.85));
    
    const dCut = new Date(start.getTime() + cutDays * 86400000).toISOString().split('T')[0];
    const dSew = new Date(start.getTime() + sewDays * 86400000).toISOString().split('T')[0];
    const dEmb = new Date(start.getTime() + embDays * 86400000).toISOString().split('T')[0];
    const dFin = end.toISOString().split('T')[0];
    return { cutting: dCut, sewing: dSew, embroidery: dEmb, finishing: dFin };
  };

  // إرسال بطاقة العمل الرقمية ورابط المقاسات إلى هاتف الخياط عبر واتساب
  const sendWhatsAppToTailor = (f) => {
    const phone = f.tailor_phone || '';
    const orderNo = f.order_no || f.id;
    const host = window.location.origin || 'http://localhost:5000';
    const jobCardUrl = `${host}/job_card.html?id=${encodeURIComponent(orderNo)}`;
    const text = `👑 *ليتل برنسيس للأزياء الفاخرة* 👑\nأهلاً بك يا ${f.tailor || 'معلم'}، تم إسناد أمر تشغيل وتفصيل جديد إليك:\n👗 *الموديل:* ${f.product || f.product_name}\n👧 *للأميرة:* ${f.child_name || 'الأميرة'}\n📋 *رقم الأمر:* ${orderNo}\n💰 *أجر القطعة:* ${f.tailor_wage || 5000} ر.ي\n⏱️ *موعد التسليم النهائي:* ${f.due_date || 'محدد في البطاقة'}\n\n📲 *رابط بطاقة التشغيل والمقاسات التفصيلية للجوال:*\n${jobCardUrl}\n\nيرجى فتح الرابط لبدء التنفيذ والضغط على (أتممت عملي) فور الانتهاء لاعتماد الجودة والعمولة ✂️✨`;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const waUrl = cleanPhone ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // احتساب خامة القماش والأمتار التقديرية للموديل
  const calculateMetersForModel = (productName, childName, customerName) => {
    const p = (products || []).find(prod => prod.name === productName || prod.model_name === productName);
    const c = (customers || []).find(cust => (cust.name && cust.name === customerName) || (cust.customer_name && cust.customer_name === customerName));
    const m = c?.measurements?.find(meas => meas.child_name === childName) || c?.measurements?.[0];
    const ageBracket = m?.estimated_age || '6-9 سنوات';
    
    if (p && Array.isArray(p.bom) && p.bom.length > 0) {
      const firstBom = p.bom[0];
      const br = firstBom.brackets || {};
      const meters = parseFloat(br[ageBracket] || br['6-9 سنوات'] || firstBom.meters || 0);
      return {
        fabric: firstBom.fabric_name || firstBom.name || (fabricInventory[0]?.name || fabricInventory[0]?.item_name || 'تفتة تركي'),
        meters: meters || 3.0
      };
    }
    
    let dressLen = parseFloat(m?.dress_len || m?.dress_length || 0);
    if (m?.unit === 'إنش' || m?.unit === 'انش' || m?.unit === 'inch') {
      dressLen = dressLen * 2.54; // تحويل الإنش إلى سم للمطابقة الدقيقة
    }
    let estimatedM = 3.0;
    if (dressLen > 0) {
      if (dressLen <= 55) estimatedM = 2.0;
      else if (dressLen <= 75) estimatedM = 3.0;
      else if (dressLen <= 95) estimatedM = 4.0;
      else estimatedM = 5.0;
    }
    return {
      fabric: (fabricInventory.length > 0 ? (fabricInventory[0].name || fabricInventory[0].item_name) : 'تفتة تركي'),
      meters: estimatedM,
      unit: 'متر'
    };
  };

  // الاستماع لتحويل عميل مباشرة من شاشة CRM
  useEffect(() => {
    if (targetJob) {
      const autoCalc = calculateMetersForModel(targetJob.product, targetJob.child_name, targetJob.customer_name);
      setForm(prev => ({
        ...prev,
        order_no: targetJob.order_no || `JOB-${targetJob.customer_id || 'CUST'}-${Date.now().toString().slice(-4)}`,
        customer: targetJob.customer_name || targetJob.customer || '',
        child_name: targetJob.child_name || '',
        product: targetJob.product || targetJob.product_name || '',
        product_id: targetJob.product_id || '',
        quantity: targetJob.quantity || 1,
        tailor: prev.tailor || (employees?.find(emp => emp.status === 'نشط')?.name || 'المعلم سليم (خياط أول)'),
        stage: FACTORY_STAGES[0],
        progress: '20',
        start_date: TODAY_STR_ISO,
        due_date: addDays(TODAY_STR_ISO, 4),
        fabric_name: autoCalc.fabric,
        cut_meters: String(autoCalc.meters),
        deduct_inventory: true
      }));
      if (typeof onClearTargetJob === 'function') onClearTargetJob();
    }
  }, [targetJob]);

  // زر سريع: اختيار آخر زبون مسجل في النظام
  const selectLatestCustomer = () => {
    if (!customers || customers.length === 0) {
      return showToast('لا يوجد عملاء مسجلون حالياً ⚠️', 'warning');
    }
    const lastCust = customers[0];
    const latestMeas = (lastCust.measurements && lastCust.measurements.length > 0) ? lastCust.measurements[0] : null;
    const chName = latestMeas?.child_name || (lastCust.children?.[0]?.child_name || 'الأميرة');
    const prodName = latestMeas?.selected_model || latestMeas?.model_name || 'فستان سندرلا';
    const matchingOrder = orders.find(o => o.customer_id === lastCust.id || o.customer_id === lastCust.customer_id || (o.customer_name && o.customer_name === lastCust.name));
    
    const autoCalc = calculateMetersForModel(prodName, chName, lastCust.name);
    const targetDueDate = matchingOrder?.delivery_date || addDays(TODAY_STR_ISO, 4);
    const autoM = autoDistributeMilestones(TODAY_STR_ISO, targetDueDate);
    
    setForm(prev => ({
      ...prev,
      order_no: matchingOrder ? (matchingOrder.order_no || matchingOrder.id) : `ORD-${lastCust.customer_id || lastCust.id || '1001'}-${Date.now().toString().slice(-4)}`,
      customer: lastCust.name || lastCust.customer_name,
      child_name: chName,
      product: prodName,
      product_id: matchingOrder?.product_id || '',
      quantity: matchingOrder?.qty || 1,
      tailor: prev.tailor || (employees?.find(emp => emp.status === 'نشط')?.name || 'المعلم سليم (خياط أول)'),
      stage: FACTORY_STAGES[0],
      progress: '20',
      start_date: TODAY_STR_ISO,
      due_date: targetDueDate,
      cutting_due_date: autoM.cutting,
      sewing_due_date: autoM.sewing,
      embroidery_due_date: autoM.embroidery,
      finishing_due_date: autoM.finishing,
      fabric_name: autoCalc.fabric,
      cut_meters: String(autoCalc.meters),
      deduct_inventory: true
    }));
    showToast(`تم تحميل بيانات آخر زبونة: (${lastCust.name}) بنجاح ⚡👗`, 'success');
  };

  const handleOrderSelect = (e) => {
    const val = e.target.value;
    const ord = orders.find(o => o.order_no === val || o.id === val);
    if (ord) {
      const existing = factory.find(f => f.order_no === val || f.id === val);
      const cust = customers.find(c => c.id === ord.customer_id || (c.name && ord.customer_name && c.name.includes(ord.customer_name)));
      const child = cust?.children?.find(ch => ch.id === ord.child_id || ch.child_name === ord.child_name) || cust?.children?.[0];
      const customerName = ord.customer_name || cust?.name || existing?.customer_name || existing?.customer || 'ام هنادي';
      let childName = ord.child_name || child?.child_name || child?.name || existing?.child_name;
      if (!childName || childName === customerName || childName.startsWith('ام ') || childName.startsWith('أم ')) {
        const measChild = cust?.measurements?.find(m => m.child_name && m.child_name !== customerName)?.child_name;
        if (measChild) childName = measChild;
        else if (!childName) childName = 'هنادي';
      }
      const productName = ord.product_name || existing?.product_name || existing?.product || 'فستان سندرلا';
      const orderQty = ord.qty || ord.quantity || existing?.quantity || 1;

      const autoCalc = calculateMetersForModel(productName, childName, customerName);
      const targetDueDate = existing?.due_date || ord.delivery_date || addDays(ord.order_date || TODAY_STR_ISO, 4);
      const autoM = autoDistributeMilestones(existing?.start_date || TODAY_STR_ISO, targetDueDate);

      setForm(prev => ({
        ...prev,
        order_no: val,
        customer: customerName,
        child_name: childName,
        product: productName,
        product_id: ord.product_id || existing?.product_id || '',
        quantity: orderQty,
        tailor: existing?.tailor_name || existing?.tailor || prev.tailor || (employees?.find(emp => emp.status === 'نشط')?.name || 'المعلم سليم (خياط أول)'),
        tailor_name: existing?.tailor_name || existing?.tailor || prev.tailor_name || '',
        cutter_name: existing?.cutter_name || prev.cutter_name || '',
        cutter_wage: existing?.cutter_wage ? String(existing.cutter_wage) : prev.cutter_wage,
        tailor_wage: existing?.tailor_wage ? String(existing.tailor_wage) : prev.tailor_wage,
        embroiderer_name: existing?.embroiderer_name || prev.embroiderer_name || '',
        embroiderer_wage: existing?.embroiderer_wage ? String(existing.embroiderer_wage) : prev.embroiderer_wage,
        finisher_name: existing?.finisher_name || prev.finisher_name || '',
        finisher_wage: existing?.finisher_wage ? String(existing.finisher_wage) : prev.finisher_wage,
        stage: existing?.stage || FACTORY_STAGES[0],
        progress: existing?.progress ? String(existing.progress).replace('%', '') : (STAGE_PROGRESS[existing?.stage || FACTORY_STAGES[0]] || 20),
        start_date: existing?.start_date || TODAY_STR_ISO,
        due_date: targetDueDate,
        cutting_due_date: existing?.cutting_due_date || autoM.cutting,
        sewing_due_date: existing?.sewing_due_date || autoM.sewing,
        embroidery_due_date: existing?.embroidery_due_date || autoM.embroidery,
        finishing_due_date: existing?.finishing_due_date || autoM.finishing,
        fabric_name: autoCalc.fabric,
        cut_meters: String(autoCalc.meters * orderQty),
        deduct_inventory: true
      }));
    } else {
      setForm({ ...form, order_no: val, customer: '', child_name: '', product: '', product_id: '', quantity: 1, due_date: '', fabric_name: '', cut_meters: '' });
    }
  };

  const handleStageChange = (e) => {
    const stage = e.target.value;
    setForm({ ...form, stage, progress: STAGE_PROGRESS[stage] || 20 });
  };

  const advanceToNextStage = async (f) => {
    const curIdx = FACTORY_STAGES.indexOf(f.stage);
    if (curIdx < FACTORY_STAGES.length - 1) {
      const nextStage = FACTORY_STAGES[curIdx + 1];
      const nextProg = STAGE_PROGRESS[nextStage] || 100;
      const updatedF = {
        ...f,
        stage: nextStage,
        progress: nextProg,
        order_no: f.order_no || f.id
      };
      
      try {
        let res = null;
        if (window.productionAPI && typeof window.productionAPI.updateStage === 'function') {
          res = await window.productionAPI.updateStage(updatedF);
        } else {
          res = await callGAS('updateFactory', updatedF);
        }

        setFactory(prev => prev.map(item => (item.order_no === f.order_no || item.id === f.id) ? { ...item, stage: nextStage, progress: nextProg } : item));
        
        if (nextProg === 100) {
          showToast(`تم إنجاز الطلب ${f.order_no} وترحيل قيد إقفال المخزون (Dr 1153 / Cr 1152) بنجاح 📦✨`, 'success');
        } else {
          showToast(`تم ترقية الطلب ${f.order_no} إلى مرحلة [${nextStage}] بنجاح 🧵`, 'success');
        }
      } catch (err) {
        setFactory(prev => prev.map(item => (item.order_no === f.order_no || item.id === f.id) ? { ...item, stage: nextStage, progress: nextProg } : item));
        showToast(`تم ترقية الطلب إلى ${nextStage} محلياً ⚡`, 'warning');
      }
    } else {
      showToast('الطلب في مرحلته النهائية بالفعل (جاهز للتسليم 📦)', 'info');
    }
  };

  const loadIntoForm = (f) => {
    const ord = orders.find(o => o.order_no === f.order_no || o.id === f.order_no);
    const cName = f.customer_name || f.customer || ord?.customer_name || 'ام هنادي';
    let chName = f.child_name || ord?.child_name;
    if (!chName || chName === cName || chName.startsWith('ام ') || chName.startsWith('أم ')) {
      const cust = customers.find(c => c.id === ord?.customer_id || (c.name && cName.includes(c.name)));
      const measChild = cust?.measurements?.find(m => m.child_name && m.child_name !== cName)?.child_name;
      if (measChild) chName = measChild;
      else if (!chName) chName = 'هنادي';
    }
    const orderQty = f.quantity || ord?.qty || ord?.quantity || 1;

    setForm({
      order_no: f.order_no || f.id,
      customer: cName,
      child_name: chName,
      product: f.product || f.product_name || ord?.product_name || 'فستان سندرلا',
      product_id: f.product_id || ord?.product_id || '',
      quantity: orderQty,
      tailor: f.tailor_name || f.tailor || '',
      tailor_name: f.tailor_name || f.tailor || '',
      stage: f.stage || FACTORY_STAGES[0],
      progress: f.progress ? String(f.progress).replace('%', '') : (STAGE_PROGRESS[f.stage] || 20),
      start_date: f.start_date || TODAY_STR_ISO,
      due_date: f.due_date || ord?.delivery_date || '',
      cutting_due_date: f.cutting_due_date || '',
      sewing_due_date: f.sewing_due_date || '',
      embroidery_due_date: f.embroidery_due_date || '',
      finishing_due_date: f.finishing_due_date || '',
      cutter_name: f.cutter_name || '',
      cutter_wage: String(f.cutter_wage || '2000'),
      tailor_wage: String(f.tailor_wage || '5000'),
      embroiderer_name: f.embroiderer_name || '',
      embroiderer_wage: String(f.embroiderer_wage || '3000'),
      finisher_name: f.finisher_name || '',
      finisher_wage: String(f.finisher_wage || '1500'),
      fabric_name: f.fabric_name || '',
      cut_meters: f.cut_meters ? String(f.cut_meters) : '',
      cut_unit: f.cut_unit || 'متر',
      deduct_inventory: false
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`تم تحميل بيانات أمر التشغيل (${f.order_no || f.id}) للتعديل ✏️`, 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.order_no) return showToast('يرجى اختيار الطلب أو الزبون ⚠️', 'error');
    if (!form.tailor) return showToast('يرجى تحديد الفني المسند إليه ⚠️', 'error');

    const cutQty = parseFloat(form.cut_meters || 0);
    const cutUnit = form.cut_unit || 'متر';

    // العثور على الصنف في المخزن لمعرفة وحدته الأساسية (وار / متر)
    const curFabricItem = (fabricInventory || []).find(i => (i.name || i.item_name) === form.fabric_name || i.id === form.fabric_name);
    const stockUnit = curFabricItem?.unit || 'وار (ياردة)';
    
    // حساب الاقتطاع الفعلي بوحدة المخزن الأصلية
    let deduction = { deductAmount: cutQty, summaryText: `${cutQty} ${cutUnit}`, isConverted: false };
    if (window.UnitConversionService && typeof window.UnitConversionService.calculateDeduction === 'function') {
      deduction = window.UnitConversionService.calculateDeduction(cutQty, cutUnit, stockUnit);
    }

    // 1. الخصم التلقائي والمباشر من المخزون محلياً وفي السيرفر بالوحدة الأصلية للمخزن
    if (cutQty > 0 && form.deduct_inventory && typeof setInventory === 'function') {
      setInventory(prev => (prev || []).map(item => {
        const iName = item.name || item.item_name || '';
        if (iName === form.fabric_name || item.id === form.fabric_name) {
          const oldQ = parseFloat(item.quantity || item.qty || item.quantity_meters || 0);
          const newQ = Math.max(0, oldQ - deduction.deductAmount);
          return { ...item, quantity: newQ, qty: newQ, quantity_meters: newQ };
        }
        return item;
      }));
    }

    const existing = factory.find(f => f.order_no === form.order_no || f.id === form.order_no);
    const newF = { 
      id: existing ? existing.id : Date.now(), 
      ...form,
      customer_name: form.customer,
      child_name: form.child_name,
      product_name: form.product,
      quantity: form.quantity,
      cut_meters: cutQty,
      cut_quantity: cutQty,
      cut_unit: cutUnit,
      stock_unit: stockUnit,
      deduct_amount_stock: deduction.deductAmount,
      fabric_name: form.fabric_name,
      deduct_inventory: form.deduct_inventory,
      cutter_name: form.cutter_name,
      cutter_wage: parseFloat(form.cutter_wage || 0),
      tailor_name: form.tailor_name || form.tailor,
      tailor: form.tailor_name || form.tailor,
      tailor_wage: parseFloat(form.tailor_wage || 0),
      embroiderer_name: form.embroiderer_name,
      embroiderer_wage: parseFloat(form.embroiderer_wage || 0),
      finisher_name: form.finisher_name,
      finisher_wage: parseFloat(form.finisher_wage || 0),
      cutting_due_date: form.cutting_due_date,
      sewing_due_date: form.sewing_due_date,
      embroidery_due_date: form.embroidery_due_date,
      finishing_due_date: form.finishing_due_date
    };
    
    try {
      let res = null;
      if (window.productionAPI && typeof window.productionAPI.updateStage === 'function') {
        res = await window.productionAPI.updateStage(newF);
      } else {
        res = await callGAS('updateFactory', newF);
      }

      if (existing) {
        setFactory(factory.map(f => (f.order_no === form.order_no || f.id === form.order_no) ? newF : f));
      } else {
        setFactory([newF, ...factory]);
      }

      if (cutQty > 0 && form.deduct_inventory) {
        showToast(`تم تعميد أمر الإنتاج واقتطاع ${deduction.summaryText} من خامة [${form.fabric_name || 'القماش'}] من المخزن بنجاح ✂️📦`, 'success');
      } else if (res && res.accounting_completed) {
        showToast('تم تحديث المشغل وترحيل قيد إقفال المخزون التام (Dr 1153 / Cr 1152) بنجاح 📦✨', 'success');
      } else {
        showToast(res && res.message ? res.message : 'تم حفظ وتحديث أمر المشغل بنجاح 🚀', 'success');
      }
    } catch (err) {
      showToast('تم التحديث محلياً ⚡', 'warning');
      if (existing) {
        setFactory(factory.map(f => (f.order_no === form.order_no || f.id === form.order_no) ? newF : f));
      } else {
        setFactory([newF, ...factory]);
      }
    }
  };

  const getDaysLeft = (dueDate) => {
    if (!dueDate) return '—';
    const diff = new Date(dueDate) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return <span className="text-[#D64545] font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">متأخر {-days} يوم ⚠️</span>;
    if (days === 0) return <span className="text-[#C97300] font-bold bg-[#FFF1DC] px-2 py-0.5 rounded-md border border-[#FFE4B9]">التسليم اليوم! 🔥</span>;
    return <span className="text-[#007F8C] font-bold bg-[#E2F5F7] px-2 py-0.5 rounded-md border border-[#C5ECF0]">متبقي {days} يوم</span>;
  };

  const filteredFactory = useMemo(() => {
    return (factory || []).filter(f => {
      const matchSearch = !search ||
        (f.order_no || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.customer || f.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.product || f.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.tailor || '').toLowerCase().includes(search.toLowerCase());
      const matchStage = stageFilter === 'الكل' || f.stage === stageFilter;
      return matchSearch && matchStage;
    });
  }, [factory, search, stageFilter]);

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* ── Studio Header & KPI Summary ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F2E7F3] text-[#8F2A87] border border-[#E5CEE7] flex items-center justify-center text-xl font-bold shadow-xs">
              <Icons.Scissors className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#25232A]">
                إدارة المعمل والمشغل وخطوط الإنتاج (Production Pipeline)
              </h1>
              <p className="text-xs text-[#6F6B75] mt-0.5">
                تتبع مراحل القص، الخياطة، التطريز، والتشطيب، وإسناد الطلبات للفنيين
              </p>
            </div>
          </div>

          {/* ── أزرار التبديل الرئيسية: خطوط الإنتاج والتشغيل مقابل التحليلات ومؤشرات الأداء ── */}
          <div className="flex items-center bg-[#FAFAFB] p-1 rounded-2xl border border-[#E8E5EA] shadow-2xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveMainTab('pipeline')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMainTab === 'pipeline'
                  ? 'bg-[#8F2A87] text-white shadow-xs'
                  : 'text-[#6F6B75] hover:text-[#25232A]'
              }`}
            >
              <span>🧵 خطوط الإنتاج والتشغيل</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeMainTab === 'pipeline' ? 'bg-white/20 text-white' : 'bg-[#E8E5EA] text-[#25232A]'
              }`}>
                {factory.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMainTab('analytics')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMainTab === 'analytics'
                  ? 'bg-[#8F2A87] text-white shadow-xs'
                  : 'text-[#6F6B75] hover:text-[#25232A]'
              }`}
            >
              <span>📊 تحليلات التكاليف والربحية (KPIs)</span>
              <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-full font-bold">جديد ✨</span>
            </button>
          </div>
        </div>

        {/* ── 5 Stage Metric Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-[#E8E5EA] bg-[#FAFAFB] divide-x divide-x-reverse divide-[#E8E5EA]">
          {FACTORY_STAGES.map((stg) => {
            const count = factory.filter(f => f.stage === stg).length;
            return (
              <div key={stg} className="p-4 text-center">
                <span className="text-[11px] font-semibold text-[#6F6B75] block truncate">{stg}</span>
                <span className="text-base font-bold font-mono text-[#8F2A87] mt-0.5 block">{count} طلب</span>
              </div>
            );
          })}
        </div>
      </div>

      {activeMainTab === 'pipeline' && (
        <>
          {/* ── بطاقة تحديث حالة الورشة ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-2">
            <span className="text-[#8F2A87]">🧵</span>
            <h2 className="text-sm font-bold text-[#25232A]">
              تحديث وتعيين أوامر التشغيل والإنتاج
            </h2>
          </div>
          
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={selectLatestCustomer}
              className="px-3.5 py-1.5 rounded-xl bg-[#F2E7F3] hover:bg-[#E5CEE7] text-[#8F2A87] font-bold text-xs border border-[#E5CEE7] transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>⚡</span>
              <span>اختيار آخر زبون مسجل</span>
            </button>
            <span className="text-xs text-[#6F6B75]">
              <span className="text-[#D64545] font-bold">*</span> الحقول الإلزامية
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-1.5">
                <label className={labelCls + " mb-0"}>رقم الطلب والفاتورة <span className="text-[#D64545] font-bold">*</span></label>
                <span className="text-[10.5px] text-[#6F6B75]">({orders.length} طلبات متاحة)</span>
              </div>
              <select className={inputCls} value={form.order_no} onChange={handleOrderSelect}>
                <option value="">-- اختر الطلب المعمد أو أدخل مخصصاً --</option>
                {orders.map(o => (
                  <option key={o.order_no || o.id} value={o.order_no || o.id}>
                    {o.order_no || o.id} - {o.customer_name || ''} {o.child_name ? `(الطفلة: ${o.child_name})` : ''} {o.product_name ? `[${o.product_name}]` : ''} {o.paid > 0 ? '🟢 مسدد العربون' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>اسم العميلة (الأم)</label>
              <input 
                type="text" 
                className={inputCls + " font-bold text-[#25232A]"} 
                value={form.customer} 
                onChange={e => setForm({...form, customer: e.target.value})} 
                placeholder="اسم العميلة" 
              />
            </div>
            <div>
              <label className={labelCls + " text-[#8F2A87]"}>اسم الطفلة (الأميرة)</label>
              <input 
                type="text" 
                className={inputCls + " bg-[#FDF8FE] font-bold text-[#8F2A87] border-[#E5CEE7]"} 
                value={form.child_name} 
                onChange={e => setForm({...form, child_name: e.target.value})} 
                placeholder="اسم الطفلة" 
              />
            </div>
            <div>
              <label className={labelCls}>المنتج / الموديل</label>
              <input 
                type="text" 
                className={inputCls + " font-bold text-[#25232A]"} 
                value={form.product} 
                onChange={e => setForm({...form, product: e.target.value})} 
                placeholder="اسم الموديل والتصميم" 
              />
            </div>
            <div>
              <label className={labelCls}>عدد الفساتين (الكمية)</label>
              <input 
                type="number" 
                min="1" 
                className={inputCls + " font-bold text-[#007F8C] font-mono text-center"} 
                value={form.quantity} 
                onChange={e => {
                  const q = parseFloat(e.target.value) || 1;
                  setForm(prev => ({
                    ...prev, 
                    quantity: q,
                    cut_meters: prev.cut_meters ? String((parseFloat(prev.cut_meters) / (prev.quantity || 1) * q).toFixed(1)) : prev.cut_meters
                  }));
                }} 
              />
            </div>
            
            <div className="lg:col-span-2">
              <label className={labelCls}>الخياط / الفني المسند إليه <span className="text-[#D64545] font-bold">*</span></label>
              <select className={inputCls} value={form.tailor} onChange={e => setForm({...form, tailor: e.target.value})}>
                <option value="">-- اختر الفني المسؤول --</option>
                {employees?.filter(e => e.status === 'نشط' || !e.status).map(emp => (
                  <option key={emp.id || emp.name} value={emp.name}>{emp.name} ({emp.job_title || emp.role || emp.type || 'فني مشغل'})</option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className={labelCls}>مرحلة الإنتاج الحالية</label>
              <select className={inputCls + " bg-[#F2E7F3] text-[#8F2A87] font-bold border-[#E5CEE7]"} value={form.stage} onChange={handleStageChange}>
                {FACTORY_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>تاريخ البدء</label>
              <input type="date" lang="en-GB" dir="ltr" className={inputCls} value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
            </div>
            <div>
              <label className={labelCls}>موعد التسليم المتوقع</label>
              <input type="date" lang="en-GB" dir="ltr" className={inputCls + " font-mono"} value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
            </div>
          </div>

          {/* ── قسم مصفوفة مواعيد وأجور مراحل الإنتاج (Multi-Technician Stage Schedule & Wage Matrix) ── */}
          <div className="p-5 rounded-2xl bg-[#FAFAFB] border border-[#E8E5EA] space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E8E5EA]">
              <div className="flex items-center gap-2">
                <span className="text-xl">🗓️</span>
                <div>
                  <h4 className="text-xs font-bold text-[#25232A]">مصفوفة مواعيد وأجور مراحل الإنتاج (Stage Schedule & Piece-Rate Wage Matrix)</h4>
                  <p className="text-[11px] text-[#6F6B75] mt-0.5">تحديد الفني المسؤول، موعد الإنجاز، وأجر القطعة لكل مرحلة مع الجلب التلقائي لأجر الموظف من HR 👑</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const m = autoDistributeMilestones(form.start_date, form.due_date);
                  setForm(prev => ({
                    ...prev,
                    cutting_due_date: m.cutting,
                    sewing_due_date: m.sewing,
                    embroidery_due_date: m.embroidery,
                    finishing_due_date: m.finishing
                  }));
                  showToast('تم احتساب وتوزيع المواعيد الأربع تلقائياً بناءً على تاريخ التسليم ⚡', 'info');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#F2E7F3] hover:bg-[#E5CEE7] text-[#8F2A87] text-xs font-bold border border-[#E5CEE7] transition flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
              >
                <span>⚡</span>
                <span>توزيع المواعيد تلقائياً حسب التسليم</span>
              </button>
            </div>

            {/* بطاقات المراحل الأربع */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
              {/* 1. القص والتحضير */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E8E5EA] shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#F2E7F3]">
                  <span className="text-xs font-bold text-[#8F2A87] flex items-center gap-1.5">
                    <span>✂️</span> 1. القص والتحضير
                  </span>
                  <span className="text-[10px] bg-[#F2E7F3] text-[#8F2A87] font-bold px-2 py-0.5 rounded-md font-mono">20%</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#25232A] mb-1">فني القص (Cutter)</label>
                  <select 
                    className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs font-medium focus:border-[#8F2A87] outline-none"
                    value={form.cutter_name || ''} 
                    onChange={e => handleStageEmpChange('cutter', e.target.value)}
                  >
                    <option value="">-- اختر فني القص --</option>
                    {employees?.filter(e => e.status === 'نشط' || !e.status).map(emp => (
                      <option key={emp.id || emp.name} value={emp.name}>{emp.name} ({emp.job_title || emp.role || 'قص وتفصيل'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#25232A] mb-1">موعد إنجاز القص</label>
                  <input 
                    type="date" 
                    lang="en-GB" 
                    dir="ltr" 
                    className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs font-mono font-bold text-[#8F2A87] focus:border-[#8F2A87] outline-none" 
                    value={form.cutting_due_date || ''} 
                    onChange={e => setForm({...form, cutting_due_date: e.target.value})} 
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-[#25232A]">أجر القص بالقطعة</label>
                    <span className="text-[10px] text-[#6F6B75]">ر.ي</span>
                  </div>
                  <input 
                    type="number" 
                    step="100" 
                    min="0"
                    className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-mono font-bold text-[#8F2A87] text-center focus:border-[#8F2A87] outline-none" 
                    value={form.cutter_wage || ''} 
                    onChange={e => setForm({...form, cutter_wage: e.target.value})} 
                    placeholder="2000"
                  />
                </div>
              </div>

              {/* 2. الخياطة والتجميع */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E8E5EA] shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#F2E7F3]">
                  <span className="text-xs font-bold text-[#8F2A87] flex items-center gap-1.5">
                    <span>🪡</span> 2. الخياطة والتجميع
                  </span>
                  <span className="text-[10px] bg-[#F2E7F3] text-[#8F2A87] font-bold px-2 py-0.5 rounded-md font-mono">40%</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#25232A] mb-1">الخياط (Tailor)</label>
                  <select 
                    className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs font-medium focus:border-[#8F2A87] outline-none"
                    value={form.tailor_name || form.tailor || ''} 
                    onChange={e => handleStageEmpChange('tailor', e.target.value)}
                  >
                    <option value="">-- اختر الخياط --</option>
                    {employees?.filter(e => e.status === 'نشط' || !e.status).map(emp => (
                      <option key={emp.id || emp.name} value={emp.name}>{emp.name} ({emp.job_title || emp.role || 'خياط'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#25232A] mb-1">موعد إنجاز الخياطة</label>
                  <input 
                    type="date" 
                    lang="en-GB" 
                    dir="ltr" 
                    className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs font-mono font-bold text-[#8F2A87] focus:border-[#8F2A87] outline-none" 
                    value={form.sewing_due_date || ''} 
                    onChange={e => setForm({...form, sewing_due_date: e.target.value})} 
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-[#25232A]">أجر الخياطة بالقطعة</label>
                    <span className="text-[10px] text-[#6F6B75]">ر.ي</span>
                  </div>
                  <input 
                    type="number" 
                    step="100" 
                    min="0"
                    className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-mono font-bold text-[#8F2A87] text-center focus:border-[#8F2A87] outline-none" 
                    value={form.tailor_wage || ''} 
                    onChange={e => setForm({...form, tailor_wage: e.target.value})} 
                    placeholder="5000"
                  />
                </div>
              </div>

              {/* 3. التطريز والشك */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E8E5EA] shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#F2E7F3]">
                  <span className="text-xs font-bold text-[#8F2A87] flex items-center gap-1.5">
                    <span>✨</span> 3. التطريز والشك
                  </span>
                  <span className="text-[10px] bg-[#F2E7F3] text-[#8F2A87] font-bold px-2 py-0.5 rounded-md font-mono">60%</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#25232A] mb-1">فني التطريز (Embroiderer)</label>
                  <select 
                    className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs font-medium focus:border-[#8F2A87] outline-none"
                    value={form.embroiderer_name || ''} 
                    onChange={e => handleStageEmpChange('embroiderer', e.target.value)}
                  >
                    <option value="">-- اختر فني التطريز --</option>
                    {employees?.filter(e => e.status === 'نشط' || !e.status).map(emp => (
                      <option key={emp.id || emp.name} value={emp.name}>{emp.name} ({emp.job_title || emp.role || 'تطريز وشك'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#25232A] mb-1">موعد إنجاز التطريز</label>
                  <input 
                    type="date" 
                    lang="en-GB" 
                    dir="ltr" 
                    className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs font-mono font-bold text-[#8F2A87] focus:border-[#8F2A87] outline-none" 
                    value={form.embroidery_due_date || ''} 
                    onChange={e => setForm({...form, embroidery_due_date: e.target.value})} 
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-[#25232A]">أجر التطريز بالقطعة</label>
                    <span className="text-[10px] text-[#6F6B75]">ر.ي</span>
                  </div>
                  <input 
                    type="number" 
                    step="100" 
                    min="0"
                    className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-mono font-bold text-[#8F2A87] text-center focus:border-[#8F2A87] outline-none" 
                    value={form.embroiderer_wage || ''} 
                    onChange={e => setForm({...form, embroiderer_wage: e.target.value})} 
                    placeholder="3000"
                  />
                </div>
              </div>

              {/* 4. الفحص والتشطيب */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E8E5EA] shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8E5EA]">
                  <span className="text-xs font-bold text-[#007F8C] flex items-center gap-1.5">
                    <span>🔍</span> 4. الفحص والتشطيب
                  </span>
                  <span className="text-[10px] bg-[#E2F5F7] text-[#007F8C] font-bold px-2 py-0.5 rounded-md font-mono">80%</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#25232A] mb-1">فني التشطيب (Finisher)</label>
                  <select 
                    className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs font-medium focus:border-[#8F2A87] outline-none"
                    value={form.finisher_name || ''} 
                    onChange={e => handleStageEmpChange('finisher', e.target.value)}
                  >
                    <option value="">-- اختر فني التشطيب --</option>
                    {employees?.filter(e => e.status === 'نشط' || !e.status).map(emp => (
                      <option key={emp.id || emp.name} value={emp.name}>{emp.name} ({emp.job_title || emp.role || 'تشطيب وجودة'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#25232A] mb-1">موعد إنجاز التشطيب</label>
                  <input 
                    type="date" 
                    lang="en-GB" 
                    dir="ltr" 
                    className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs font-mono font-bold text-[#007F8C] focus:border-[#007F8C] outline-none" 
                    value={form.finishing_due_date || form.due_date || ''} 
                    onChange={e => setForm({...form, finishing_due_date: e.target.value})} 
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-[#25232A]">أجر التشطيب بالقطعة</label>
                    <span className="text-[10px] text-[#6F6B75]">ر.ي</span>
                  </div>
                  <input 
                    type="number" 
                    step="100" 
                    min="0"
                    className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-mono font-bold text-[#007F8C] text-center focus:border-[#007F8C] outline-none" 
                    value={form.finisher_wage || ''} 
                    onChange={e => setForm({...form, finisher_wage: e.target.value})} 
                    placeholder="1500"
                  />
                </div>
              </div>
            </div>

            {/* شريط الإجماليات المالية للأجور */}
            {(() => {
              const cWage = parseFloat(form.cutter_wage || 0);
              const tWage = parseFloat(form.tailor_wage || 0);
              const eWage = parseFloat(form.embroiderer_wage || 0);
              const fWage = parseFloat(form.finisher_wage || 0);
              const singleDressTotal = cWage + tWage + eWage + fWage;
              const qty = parseFloat(form.quantity || 1);
              const grandTotalWages = singleDressTotal * qty;
              return (
                <div className="p-3 rounded-xl bg-white border border-[#E8E5EA] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[#8F2A87]">💰 تفصيل أجور مراحل الفستان:</span>
                    <span className="bg-[#FAFAFB] px-2 py-0.5 rounded border border-[#E8E5EA] text-[#6F6B75]">✂️ قص: <strong className="text-[#25232A] font-mono">{cWage.toLocaleString()}</strong></span>
                    <span className="bg-[#FAFAFB] px-2 py-0.5 rounded border border-[#E8E5EA] text-[#6F6B75]">🪡 خياطة: <strong className="text-[#25232A] font-mono">{tWage.toLocaleString()}</strong></span>
                    <span className="bg-[#FAFAFB] px-2 py-0.5 rounded border border-[#E8E5EA] text-[#6F6B75]">✨ تطريز: <strong className="text-[#25232A] font-mono">{eWage.toLocaleString()}</strong></span>
                    <span className="bg-[#FAFAFB] px-2 py-0.5 rounded border border-[#E8E5EA] text-[#6F6B75]">🔍 تشطيب: <strong className="text-[#25232A] font-mono">{fWage.toLocaleString()}</strong></span>
                  </div>
                  <div className="flex items-center gap-3 font-bold font-mono">
                    <span className="text-[#6F6B75]">إجمالي الفستان: <strong className="text-[#8F2A87] text-sm">{singleDressTotal.toLocaleString()}</strong> ر.ي</span>
                    {qty > 1 && (
                      <span className="text-[#007F8C] bg-[#E2F5F7] px-2.5 py-1 rounded-lg border border-[#C5ECF0]">
                        إجمالي الأمر ({qty} فساتين): {grandTotalWages.toLocaleString()} ر.ي
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── قسم اقتطاع القماش المحدد حق الموديل من المخزن ومواصفات الطفلة ── */}
          <div className="p-4 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E8E5EA]">
              <div className="flex items-center gap-2">
                <span className="text-base">✂️</span>
                <span className="text-xs font-bold text-[#25232A]">خامة القماش واقتطاع الأمتار من المخزون (Fabric & Inventory Deduction)</span>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-[#6F6B75] cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={form.deduct_inventory} 
                  onChange={e => setForm({...form, deduct_inventory: e.target.checked})} 
                  className="rounded text-[#8F2A87] focus:ring-[#8F2A87]"
                />
                <span className="font-medium text-[#25232A]">خصم الأمتار تلقائياً من رصيد المخزن عند الحفظ</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>خامة القماش المخصصة للموديل</label>
                <select 
                  className={inputCls} 
                  value={form.fabric_name} 
                  onChange={e => setForm({...form, fabric_name: e.target.value})}
                >
                  <option value="">-- اختر خامة القماش من المخزن --</option>
                  {fabricInventory.map(item => (
                    <option key={item.id || item.item_code || item.name} value={item.name || item.item_name}>
                      {item.name || item.item_name} (المتوفر: {parseFloat(item.quantity || item.qty || item.quantity_meters || 0)} {item.unit || 'متر/وار'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className={labelCls + " mb-0"}>كمية القص المطلوبة</label>
                  {/* وحدة القص المحددة */}
                  <div className="flex items-center bg-[#F2E7F3] dark:bg-purple-950/60 p-0.5 rounded-lg border border-[#E5CEE7] text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, cut_unit: 'متر' })}
                      className={`px-2 py-0.5 rounded transition cursor-pointer ${(!form.cut_unit || form.cut_unit === 'متر') ? 'bg-[#007F8C] text-white shadow-2xs' : 'text-[#6F6B75]'}`}
                    >
                      متر
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, cut_unit: 'وار' })}
                      className={`px-2 py-0.5 rounded transition cursor-pointer ${form.cut_unit === 'وار' ? 'bg-[#8F2A87] text-white shadow-2xs' : 'text-[#6F6B75]'}`}
                    >
                      وار
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0"
                    className={inputCls + " font-mono font-bold text-[#8F2A87] pl-16"} 
                    value={form.cut_meters} 
                    onChange={e => setForm({...form, cut_meters: e.target.value})} 
                    placeholder="مثال: 3.5"
                  />
                  <span className="absolute left-2.5 top-2.5 text-xs font-bold text-[#6F6B75] pointer-events-none">
                    {form.cut_unit || 'متر'}
                  </span>
                </div>
                {form.cut_meters && parseFloat(form.cut_meters) > 0 && (
                  <span className="block text-[10px] font-mono text-[#007F8C] mt-1">
                    ({(parseFloat(form.cut_meters) / (parseFloat(form.quantity) || 1)).toFixed(2)} {form.cut_unit || 'متر'}/فستان)
                  </span>
                )}
              </div>

              <div className="flex flex-col justify-center">
                <label className={labelCls}>رصيد المخزن والتحويل الذكي</label>
                {(() => {
                  const curItem = fabricInventory.find(i => (i.name || i.item_name) === form.fabric_name);
                  const curStock = curItem ? parseFloat(curItem.quantity || curItem.qty || curItem.quantity_meters || 0) : null;
                  const cutQty = parseFloat(form.cut_meters || 0);
                  if (curStock === null) {
                    return <span className="text-xs text-[#6F6B75] bg-white px-3 py-2 rounded-xl border border-[#E8E5EA]">اختر الخامة لعرض الرصيد</span>;
                  }
                  const stockUnit = curItem?.unit || 'وار';
                  const cutUnit = form.cut_unit || 'متر';
                  
                  let deduction = { deductAmount: cutQty, summaryText: `${cutQty} ${cutUnit}`, isConverted: false };
                  if (window.UnitConversionService && typeof window.UnitConversionService.calculateDeduction === 'function') {
                    deduction = window.UnitConversionService.calculateDeduction(cutQty, cutUnit, stockUnit);
                  }
                  
                  const remaining = curStock - deduction.deductAmount;
                  const isLow = remaining < 0;
                  return (
                    <div className={`p-2 rounded-xl border text-xs flex flex-col gap-1 font-mono ${isLow ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-[#E8E5EA] text-[#25232A]'}`}>
                      <div className="flex items-center justify-between">
                        <span>المخزون: <strong>{curStock}</strong> {stockUnit}</span>
                        <span>المتبقي: <strong className={isLow ? 'text-rose-600 font-bold' : 'text-[#007F8C] font-bold'}>{remaining.toFixed(2)}</strong> {stockUnit}</span>
                      </div>
                      {deduction.isConverted && cutQty > 0 && (
                        <div className="text-[10px] text-[#8F2A87] bg-[#F2E7F3] px-2 py-0.5 rounded border border-[#E5CEE7] flex items-center justify-between">
                          <span>🔄 المقدار المحول:</span>
                          <strong>{cutQty} {cutUnit} ≈ {deduction.deductAmount} {stockUnit}</strong>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* بطاقة مواصفات وقياسات الطفلة الحالية */}
            {(() => {
              const cust = (customers || []).find(c => (c.name && form.customer && c.name.includes(form.customer)) || (form.customer && c.name && form.customer.includes(c.name)));
              const meas = cust?.measurements?.find(m => m.child_name === form.child_name) || cust?.measurements?.[0];
              if (!meas) return null;
              return (
                <div className="pt-2 border-t border-[#E8E5EA] flex items-center justify-between flex-wrap gap-2 text-[11px] text-[#6F6B75]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#8F2A87]">👧 مواصفات {meas.child_name || form.child_name}:</span>
                    {meas.dress_len ? <span className="bg-white px-2 py-0.5 rounded border border-[#E8E5EA]">طول الفستان: <strong className="text-[#25232A]">{meas.dress_len} سم</strong></span> : null}
                    {meas.chest_circ ? <span className="bg-white px-2 py-0.5 rounded border border-[#E8E5EA]">الصدر: <strong className="text-[#25232A]">{meas.chest_circ} سم</strong></span> : null}
                    {meas.waist_circ ? <span className="bg-white px-2 py-0.5 rounded border border-[#E8E5EA]">الخصر: <strong className="text-[#25232A]">{meas.waist_circ} سم</strong></span> : null}
                    {meas.estimated_age ? <span className="bg-white px-2 py-0.5 rounded border border-[#E8E5EA]">العمر: <strong className="text-[#007F8C]">{meas.estimated_age}</strong></span> : null}
                  </div>
                  {meas.comfort_profile && (
                    <span className="text-[10px] text-[#007F8C] bg-[#E2F5F7] px-2 py-0.5 rounded">
                      ملاحظات الراحة: {Array.isArray(meas.comfort_profile) ? meas.comfort_profile.join('، ') : String(meas.comfort_profile)}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
          
          <div className="pt-4 border-t border-[#E8E5EA] flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="w-full sm:flex-1">
              <div className="flex justify-between text-xs mb-1.5 font-bold text-[#25232A]">
                <span>نسبة الإنجاز الحالية في المشغل</span>
                <span className="text-[#8F2A87] font-mono">{form.progress}%</span>
              </div>
              <div className="w-full bg-[#FAFAFB] rounded-full h-2.5 border border-[#E8E5EA]" dir="ltr">
                <div className="bg-[#8F2A87] h-2.5 rounded-full transition-all duration-500" style={{width: `${form.progress}%`}}></div>
              </div>
            </div>
            <button type="submit" className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs text-white bg-[#8F2A87] hover:bg-[#73216C] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer">
              <Icons.Check className="w-4 h-4" />
              <span>تحديث وحفظ حالة أمر الإنتاج واقتطاع القماش 🚀</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── لوحة التتبع الحية للورشة ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <h3 className="font-bold text-sm text-[#25232A]">لوحة التتبع الحية للورشة (Live Pipeline)</h3>
            <span className="text-xs bg-[#F2E7F3] text-[#8F2A87] font-bold px-2.5 py-0.5 rounded-full font-mono">{filteredFactory.length}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-semibold text-[#25232A] outline-none"
            >
              <option value="الكل">جميع المراحل</option>
              {FACTORY_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <div className="relative flex-1 sm:w-64">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-3 pr-8 h-10 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-medium w-full focus:bg-white focus:border-[#8F2A87] outline-none"
                placeholder="بحث برقم الطلب، العميلة، أو الخياط..."
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] text-xs pointer-events-none">🔍</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                <th className="px-4 py-3.5 text-right whitespace-nowrap">الطلب والعميلة</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">الموديل والتفاصيل</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">فريق العمل والمراحل</th>
                <th className="px-4 py-3.5 text-right w-1/4 whitespace-nowrap">مرحلة ونسبة الإنجاز</th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap">الوقت المتبقي</th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap sticky left-0 z-10 bg-[#FAFAFB] shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5EA] bg-white">
              {filteredFactory.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-[#6F6B75] font-medium">
                    لا توجد طلبيات جارية في الورشة 🧵
                  </td>
                </tr>
              ) : filteredFactory.map(f => {
                const orderLabel = f.order_no || f.id;
                const isReady = f.tailor_status === 'ready_for_inspection';
                const isApproved = f.tailor_status === 'approved';
                const isDelivered = f.stage === 'تم التسليم ✅' || f.stage === 'Delivered';
                const isDone = f.progress >= 100 || f.stage === 'جاهز للتسليم 📦' || isDelivered;
                const isStockOrder = f.production_type === 'stock' || (f.order_no && String(f.order_no).startsWith('STOCK')) || (!f.customer && !f.customer_name) || f.customer === 'المخزن' || f.customer_name === 'المخزن';

                return (
                  <tr key={f.id || f.order_no} className="group hover:bg-[#FAFAFB] transition-colors">
                    {/* 1. الطلب والعميلة والطفلة */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#8F2A87] font-mono text-[11.5px]">{orderLabel}</div>
                      <div className="text-[11px] font-semibold text-[#25232A] mt-0.5">{f.customer_name || f.customer}</div>
                      {(f.child_name || 'هنادي') && (
                        <div className="text-[10.5px] text-[#8F2A87] mt-0.5 flex items-center gap-1 font-medium">
                          <span>👧 الطفلة:</span>
                          <span className="font-bold">{f.child_name || 'هنادي'}</span>
                        </div>
                      )}
                      <div className="text-[10px] text-[#6F6B75] font-mono mt-0.5">
                        البدء: {f.start_date ? String(f.start_date).slice(0, 10) : '—'}
                      </div>
                    </td>

                    {/* 2. الموديل والتفاصيل */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#25232A] flex items-center gap-1.5">
                        <span>{f.product || f.product_name}</span>
                        <span className="text-[10px] bg-[#E2F5F7] text-[#007F8C] font-mono px-1.5 py-0.5 rounded font-bold">
                          {f.quantity || 1} قطعة
                        </span>
                      </div>
                      {f.fabric_name && (
                        <div className="text-[10.5px] text-[#6F6B75] mt-1 flex items-center gap-1">
                          <span>🧵 الخامة:</span>
                          <span className="font-medium text-[#25232A]">{f.fabric_name}</span>
                          {f.cut_meters ? <span className="text-[#8F2A87] font-mono font-bold">({f.cut_meters} {f.cut_unit || 'متر'})</span> : null}
                        </div>
                      )}
                    </td>

                    {/* 3. فريق العمل والمراحل الأربع */}
                    <td className="px-4 py-3">
                      <div className="space-y-1 text-[10.5px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#8F2A87] font-bold">✂️ قص:</span>
                          <span className="text-[#25232A] font-medium">{f.cutter_name || '—'}</span>
                          {f.cutter_wage > 0 && <span className="text-[9.5px] text-[#6F6B75] font-mono">({f.cutter_wage} ر.ي)</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#8F2A87] font-bold">🪡 خياطة:</span>
                          <span className="text-[#25232A] font-medium">{f.tailor_name || f.tailor || '—'}</span>
                          {f.tailor_wage > 0 && <span className="text-[9.5px] text-[#6F6B75] font-mono">({f.tailor_wage} ر.ي)</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#8F2A87] font-bold">✨ تطريز:</span>
                          <span className="text-[#25232A] font-medium">{f.embroiderer_name || '—'}</span>
                          {f.embroiderer_wage > 0 && <span className="text-[9.5px] text-[#6F6B75] font-mono">({f.embroiderer_wage} ر.ي)</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#007F8C] font-bold">🔍 تشطيب:</span>
                          <span className="text-[#25232A] font-medium">{f.finisher_name || '—'}</span>
                          {f.finisher_wage > 0 && <span className="text-[9.5px] text-[#6F6B75] font-mono">({f.finisher_wage} ر.ي)</span>}
                        </div>
                      </div>
                    </td>

                    {/* 4. مرحلة ونسبة الإنجاز وأزرار الترقية السريعة */}
                    <td className="px-4 py-3">
                      <div className="flex justify-between text-[11px] mb-1 font-semibold">
                        <span className="text-[#25232A] font-bold">{f.stage}</span>
                        <span className="text-[#8F2A87] font-mono font-bold">{f.progress}%</span>
                      </div>
                      <div className="w-full bg-[#FAFAFB] rounded-full h-2 border border-[#E8E5EA]" dir="ltr">
                        <div className={`h-2 rounded-full transition-all duration-500 ${f.progress >= 100 ? 'bg-[#009FAE]' : 'bg-[#8F2A87]'}`} style={{width: `${f.progress}%`}}></div>
                      </div>

                      {/* إجراءات تقدم المرحلة المدمجة هنا لعدم ازدحام شريط الإجراءات */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {isReady && (
                          <button 
                            onClick={() => setQcModalData({
                              ...f,
                              score: 5,
                              wage: f.tailor_wage || 5000,
                              notes: 'تم فحص المقاسات ومطابقة الموديل بجودة ممتازة وسليم تماماً.'
                            })}
                            title="الفني أتم العمل وجاهز لفحص واعتماد الجودة والعمولة"
                            className="text-[11px] bg-amber-400 hover:bg-amber-500 text-amber-950 font-black px-2.5 py-1 rounded-lg transition shadow-xs border border-amber-500 cursor-pointer flex items-center gap-1 animate-pulse"
                          >
                            <span>⭐ اعتماد الجودة والعمولة</span>
                          </button>
                        )}
                        {isApproved && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                            <span>✅ معتمد ({f.quality_score || 5} ⭐)</span>
                          </span>
                        )}
                        {!isDone && (
                          <button 
                            onClick={() => advanceToNextStage(f)} 
                            title="ترقية الطلب للمرحلة التالية"
                            className="text-[11px] bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C] font-bold px-2.5 py-1 rounded-lg transition border border-[#C5ECF0] cursor-pointer flex items-center gap-1"
                          >
                            <span>المرحلة التالية ⏩</span>
                          </button>
                        )}

                        {/* المسار 1: التوريد للمخزن لطلبات المخزن */}
                        {isStockOrder && isDone && (
                          !f.stock_received ? (
                            <button
                              type="button"
                              onClick={() => handleStockInflow(f)}
                              disabled={stockInflowLoading[orderLabel]}
                              className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-black px-2.5 py-1 rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer animate-pulse"
                              title="توريد للمخزن واحتساب تكلفة القماش وأجور الفنيين آلياً"
                            >
                              <span>📦 {stockInflowLoading[orderLabel] ? 'جاري التوريد...' : 'توريد للمخزن والتكلفة'}</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-300">
                                ✅ بالمخزن
                              </span>
                              <button
                                type="button"
                                onClick={() => handleReverseStockInflow(f)}
                                disabled={stockInflowLoading[orderLabel]}
                                className="text-[10px] text-amber-700 hover:bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300 font-bold transition cursor-pointer"
                                title="إلغاء التوريد وعكس حركة المخزن"
                              >
                                ↩️ إلغاء
                              </button>
                            </div>
                          )
                        )}

                        {/* المسار 2: تسليم فستان الأميرة والتحصيل للطلبات المخصصة */}
                        {!isStockOrder && (f.stage === 'جاهز للتسليم 📦' || (isDone && !isDelivered)) && (
                          <button
                            type="button"
                            onClick={() => handleOpenDeliveryModal(f)}
                            className="text-[11px] bg-gradient-to-r from-[#8F2A87] to-[#B0005A] hover:opacity-95 text-white font-black px-2.5 py-1 rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer"
                            title="تسليم الفستان للأميرة وتحصيل المتبقي وقيد سند القبض المالي"
                          >
                            <span>🛍️ تسليم للأميرة وتحصيل</span>
                          </button>
                        )}
                        {!isStockOrder && isDelivered && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] bg-purple-50 text-[#8F2A87] font-bold px-2 py-0.5 rounded-md border border-[#E5CEE7]">
                              👑 تم التسليم
                            </span>
                            <button
                              type="button"
                              onClick={() => handleReverseDelivery(f)}
                              className="text-[10px] text-[#6F6B75] hover:bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300 font-bold transition cursor-pointer"
                              title="إلغاء التسليم وإعادة الطلب للجاهز"
                            >
                              ↩️
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 5. الوقت المتبقي */}
                    <td className="px-4 py-3 text-center text-[11px] whitespace-nowrap">
                      {getDaysLeft(f.due_date)}
                      <div className="text-[10px] text-[#6F6B75] font-mono mt-1">
                        التسليم: {f.due_date ? String(f.due_date).slice(0, 10) : '—'}
                      </div>
                    </td>

                    {/* 6. الإجراءات (Sticky Left - على غرار جدول المشتريات) */}
                    <td className="px-4 py-3 text-center whitespace-nowrap sticky left-0 z-10 bg-white group-hover:bg-[#FAFAFB] shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* 0. إجراء التوريد أو التسليم السريع */}
                        {isStockOrder && isDone && !f.stock_received && (
                          <button
                            type="button"
                            onClick={() => handleStockInflow(f)}
                            disabled={stockInflowLoading[orderLabel]}
                            title="توريد القطع للمخزن واحتساب التكلفة آلياً 📦"
                            className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 flex items-center justify-center text-xs transition cursor-pointer shadow-2xs animate-pulse"
                          >
                            📦
                          </button>
                        )}
                        {!isStockOrder && (f.stage === 'جاهز للتسليم 📦' || (isDone && !isDelivered)) && (
                          <button
                            type="button"
                            onClick={() => handleOpenDeliveryModal(f)}
                            title="تسليم فستان الأميرة وتحصيل المتبقي 🛍️"
                            className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#8F2A87] to-[#B0005A] hover:opacity-95 text-white flex items-center justify-center text-xs transition cursor-pointer shadow-2xs"
                          >
                            🛍️
                          </button>
                        )}
                        {/* 1. طباعة بطاقة التشغيل */}
                        <button 
                          type="button"
                          onClick={() => {
                            const ord = orders.find(o => o.order_no === f.order_no || o.id === f.order_no) || {
                              order_no: f.order_no,
                              customer_name: f.customer || f.customer_name,
                              product_name: f.product || f.product_name,
                              child_name: f.child_name,
                              delivery_date: f.due_date,
                              qty: f.quantity || 1,
                              quantity: f.quantity || 1
                            };
                            const targetCust = (ord.customer_name || f.customer || f.customer_name || '').trim();
                            const c = customers.find(c => {
                              const cName = (c.name || c.customer_name || '').trim();
                              return cName === targetCust || targetCust.includes(cName) || (cName && cName.length > 3 && targetCust.includes(cName));
                            });
                            const targetChild = (ord.child_name && ord.child_name !== targetCust) ? ord.child_name : (f.child_name && f.child_name !== targetCust ? f.child_name : '');
                            const childMeas = (targetChild && c?.measurements?.find(m => m.child_name === targetChild)) || 
                                              c?.measurements?.find(m => m.child_name && m.child_name !== targetCust) || 
                                              c?.measurements?.[0];
                            
                            const resolvedChildName = targetChild || childMeas?.child_name || ord.child_name || f.child_name || 'هنادي';

                            const targetProdName = (ord.product_name || f.product || f.product_name || '').trim();
                            const targetProdId = ord.product_id || f.product_id;
                            const prod = products.find(p => 
                              (targetProdId && (String(p.id) === String(targetProdId) || String(p.product_id) === String(targetProdId))) ||
                              p.name === targetProdName ||
                              p.model_name === targetProdName ||
                              (targetProdName && p.name && targetProdName.includes(p.name)) ||
                              (targetProdName && p.model_name && targetProdName.includes(p.model_name))
                            );

                            setPrintModalData({
                              order: {
                                ...ord,
                                child_name: resolvedChildName,
                                product_name: ord.product_name || f.product || f.product_name,
                                product_id: targetProdId || prod?.id,
                                qty: f.quantity || ord.qty || ord.quantity || 1,
                                quantity: f.quantity || ord.quantity || ord.qty || 1
                              },
                              customer: c,
                              measurements: childMeas,
                              product: prod,
                              products: products
                            });
                          }}
                          title="طباعة بطاقة التشغيل وتذكرة الورشة 📋"
                          className="w-8 h-8 rounded-lg bg-[#F2E7F3] hover:bg-[#E5CEE7] text-[#8F2A87] border border-[#E5CEE7] flex items-center justify-center text-xs transition cursor-pointer shadow-2xs"
                        >
                          📋
                        </button>

                        {/* 2. فتح بطاقة الجوال الرقمية */}
                        <a 
                          href={`/job_card.html?id=${encodeURIComponent(orderLabel)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="فتح بطاقة التشغيل الرقمية للجوال 📱"
                          className="w-8 h-8 rounded-lg bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C] border border-[#C5ECF0] flex items-center justify-center text-xs transition cursor-pointer shadow-2xs"
                        >
                          📱
                        </a>

                        {/* 3. إرسال واتساب للفني */}
                        <button 
                          type="button"
                          onClick={() => sendWhatsAppToTailor(f)}
                          title="إرسال بطاقة العمل والمقاسات للفني عبر واتساب 📲"
                          className="w-8 h-8 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] border border-[#25D366]/30 flex items-center justify-center text-xs transition cursor-pointer shadow-2xs"
                        >
                          📲
                        </button>

                        {/* 4. تعديل أمر التشغيل */}
                        <button 
                          type="button"
                          onClick={() => loadIntoForm(f)} 
                          title="تعديل بيانات أمر التشغيل والمراحل ✏️"
                          className="w-8 h-8 rounded-lg bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] border border-[#E8E5EA] flex items-center justify-center text-xs transition cursor-pointer shadow-2xs"
                        >
                          ✏️
                        </button>

                        {/* 5. حذف أمر التشغيل */}
                        <button 
                          type="button"
                          onClick={() => handleDeleteOrder(f)} 
                          title="حذف أمر التشغيل نهائياً من سوبابيز 🗑️"
                          className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#D64545] border border-rose-200 flex items-center justify-center text-xs transition cursor-pointer shadow-2xs"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          المسار الثالث: لوحة تحليلات تكاليف الموديلات ومؤشرات أداء الفنيين (Analytics & KPIs)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeMainTab === 'analytics' && (
        <div className="space-y-6 animate-fadeIn">
          {loadingAnalytics && !analyticsData ? (
            <div className="bg-white rounded-2xl border border-[#E8E5EA] p-16 text-center shadow-xs">
              <div className="text-4xl animate-spin mb-3">🔄</div>
              <p className="text-sm font-bold text-[#25232A]">جاري جلب واحتساب تحليلات التكاليف وهوامش الربح من سوبابيز...</p>
              <p className="text-xs text-[#6F6B75] mt-1">يتم الآن تحليل استهلاك الأقمشة وأجور مراحل الفنيين ومقارنتها بأسعار البيع</p>
            </div>
          ) : (
            <>
              {/* ── 4 بطاقات إحصائيات مالية وإنتاجية شاملة ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. أوامر الإنتاج */}
                <div className="bg-white rounded-2xl border border-[#E8E5EA] p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#6F6B75]">إجمالي أوامر الإنتاج</span>
                    <span className="w-9 h-9 rounded-xl bg-[#F2E7F3] text-[#8F2A87] flex items-center justify-center text-base font-bold">📋</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-[#8F2A87]">
                    {analyticsData?.atelier_stats?.total_orders || factory.length}
                    <span className="text-xs font-semibold text-[#6F6B75] mr-1.5">أمر</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#E8E5EA] text-[11px]">
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                      ✅ {analyticsData?.atelier_stats?.completed_orders || factory.filter(f => f.progress >= 100 || f.stage === 'جاهز للتسليم 📦' || f.stage === 'تم التسليم ✅').length} مكتمل
                    </span>
                    <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded">
                      ⏳ {analyticsData?.atelier_stats?.in_progress_orders || factory.filter(f => f.progress < 100 && f.stage !== 'جاهز للتسليم 📦' && f.stage !== 'تم التسليم ✅').length} قيد التشغيل
                    </span>
                  </div>
                </div>

                {/* 2. القطع المنتجة */}
                <div className="bg-white rounded-2xl border border-[#E8E5EA] p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#6F6B75]">إجمالي الفساتين المنتجة</span>
                    <span className="w-9 h-9 rounded-xl bg-[#E2F5F7] text-[#007F8C] flex items-center justify-center text-base font-bold">👗</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-[#007F8C]">
                    {(analyticsData?.atelier_stats?.total_pieces || factory.reduce((s, f) => s + (parseInt(f.quantity || 1)), 0)).toLocaleString()}
                    <span className="text-xs font-semibold text-[#6F6B75] mr-1.5">فستان فاخر</span>
                  </div>
                  <div className="text-[11px] text-[#6F6B75] mt-2 pt-2 border-t border-[#E8E5EA] flex items-center justify-between">
                    <span>التوريد المخزني:</span>
                    <span className="font-bold text-emerald-700 font-mono">{factory.filter(f => f.stock_received).length} أمر مورّد</span>
                  </div>
                </div>

                {/* 3. استهلاك الأقمشة */}
                <div className="bg-white rounded-2xl border border-[#E8E5EA] p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#6F6B75]">استهلاك خامات الأقمشة</span>
                    <span className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-base font-bold">✂️</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-purple-800">
                    {parseFloat(analyticsData?.atelier_stats?.total_fabric_meters || factory.reduce((s, f) => s + (parseFloat(f.cut_meters || 0)), 0)).toFixed(1)}
                    <span className="text-xs font-semibold text-[#6F6B75] mr-1.5">متر قماش مقصوص</span>
                  </div>
                  <div className="text-[11px] text-[#6F6B75] mt-2 pt-2 border-t border-[#E8E5EA] flex items-center justify-between">
                    <span>المتوسط للفستان:</span>
                    <span className="font-bold text-purple-700 font-mono">2.8 متر/فستان</span>
                  </div>
                </div>

                {/* 4. أجور مراحل الفنيين */}
                <div className="bg-white rounded-2xl border border-[#E8E5EA] p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#6F6B75]">إجمالي مستحقات الفنيين</span>
                    <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-base font-bold">💰</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-amber-900">
                    {parseFloat(analyticsData?.atelier_stats?.total_labor_wages || 0).toLocaleString()}
                    <span className="text-xs font-semibold text-[#6F6B75] mr-1.5">ر.ي</span>
                  </div>
                  <div className="text-[11px] text-[#6F6B75] mt-2 pt-2 border-t border-[#E8E5EA] flex items-center justify-between">
                    <span>مراحل العمل:</span>
                    <span className="font-bold text-[#8F2A87]">قص + خياطة + تطريز + تشطيب</span>
                  </div>
                </div>
              </div>

              {/* ── جدول تكاليف الموديلات وهوامش الربحية (Cost & Profitability Sheet) ── */}
              <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">📊</span>
                    <div>
                      <h3 className="font-bold text-sm text-[#25232A]">جدول التكلفة الفعلية وهوامش الربحية للموديلات (Cost & Margin Sheet)</h3>
                      <p className="text-xs text-[#6F6B75] mt-0.5">احتساب تكلفة القماش + أجور الفنيين الأربعة ومقارنتها بسعر البيع ونسبة هامش الربح</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={fetchFactoryAnalytics}
                    className="px-3.5 py-1.5 rounded-xl bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] font-bold text-xs border border-[#E8E5EA] transition flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
                  >
                    <span>🔄</span>
                    <span>تحديث البيانات من سوبابيز</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                        <th className="px-4 py-3.5 text-right whitespace-nowrap">اسم الموديل والتصنيف</th>
                        <th className="px-4 py-3.5 text-center whitespace-nowrap">القطع المنجزة</th>
                        <th className="px-4 py-3.5 text-center whitespace-nowrap">متوسط القماش</th>
                        <th className="px-4 py-3.5 text-center whitespace-nowrap">تكلفة القماش</th>
                        <th className="px-4 py-3.5 text-center whitespace-nowrap">أجور الفنيين (4 مراحل)</th>
                        <th className="px-4 py-3.5 text-center whitespace-nowrap bg-purple-50/50">إجمالي التكلفة الفعلية</th>
                        <th className="px-4 py-3.5 text-center whitespace-nowrap">سعر البيع للجمهور</th>
                        <th className="px-4 py-3.5 text-center whitespace-nowrap bg-emerald-50/50">صافي الربح / فستان</th>
                        <th className="px-4 py-3.5 text-center whitespace-nowrap">نسبة الهامش %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E5EA] bg-white">
                      {(analyticsData?.models_costing || []).length === 0 ? (
                        <tr>
                          <td colSpan="9" className="p-10 text-center text-[#6F6B75] font-medium">
                            لا توجد بيانات تكاليف كافية حالياً، يتم الاحتساب تلقائياً مع تنفيذ أوامر التشغيل 🧵
                          </td>
                        </tr>
                      ) : (analyticsData.models_costing.map((m, idx) => (
                        <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-[#25232A] text-xs">{m.product_name}</div>
                            <div className="text-[10px] text-[#6F6B75] mt-0.5">{m.category || 'موديل تفصيل'}</div>
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-[#8F2A87]">
                            {m.total_pieces_produced} قطعة
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-[#25232A]">
                            {m.avg_cut_meters} م
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-[#6F6B75]">
                            {m.fabric_cost.toLocaleString()} ر.ي
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="font-mono font-bold text-[#8F2A87]">{m.labor_cost.toLocaleString()} ر.ي</div>
                            <div className="text-[9.5px] text-[#6F6B75]">قص {m.cutter_wage} • خياطة {m.tailor_wage}</div>
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-black text-purple-900 bg-purple-50/50">
                            {m.unit_cost.toLocaleString()} ر.ي
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-[#007F8C]">
                            {m.selling_price.toLocaleString()} ر.ي
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-black text-emerald-800 bg-emerald-50/50">
                            +{m.unit_profit.toLocaleString()} ر.ي
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-black font-mono ${
                              m.margin_pct >= 50 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              (m.margin_pct >= 30 ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-amber-100 text-amber-800 border border-amber-300')
                            }`}>
                              {m.margin_pct}% {m.margin_rating}
                            </span>
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── بطاقات تقييم أداء الفنيين والحرفيين (Craftsmen Scorecards & KPIs) ── */}
              <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#E8E5EA]">
                  <span className="text-xl">⭐</span>
                  <div>
                    <h3 className="font-bold text-sm text-[#25232A]">بطاقات تقييم أداء الفنيين والحرفيين (Craftsmen Scorecards)</h3>
                    <p className="text-xs text-[#6F6B75] mt-0.5">معدل الإنجاز وجودة التنفيذ ومستحقات الأجور المسجلة لكل فني</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(analyticsData?.technicians_kpi || []).map((tech, idx) => (
                    <div key={tech.id || idx} className="p-4 rounded-2xl border border-[#E8E5EA] bg-[#FAFAFB] hover:bg-white hover:border-[#8F2A87] transition shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#E8E5EA]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-[#F2E7F3] text-[#8F2A87] flex items-center justify-center font-bold text-sm">
                            {tech.name?.charAt(0) || 'ف'}
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-[#25232A]">{tech.name}</h4>
                            <span className="text-[10px] text-[#6F6B75]">{tech.role || 'فني خياطة وتشغيل'}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {tech.on_time_rate || '100%'} التزام
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-white rounded-xl border border-[#E8E5EA] text-center">
                          <span className="text-[10px] text-[#6F6B75] block">المهام المنجزة</span>
                          <span className="font-mono font-bold text-[#8F2A87] text-sm mt-0.5 block">{tech.completed_tasks} من {tech.tasks_assigned}</span>
                        </div>
                        <div className="p-2 bg-white rounded-xl border border-[#E8E5EA] text-center">
                          <span className="text-[10px] text-[#6F6B75] block">تقييم الجودة</span>
                          <span className="font-mono font-bold text-amber-500 text-sm mt-0.5 block">★ {tech.avg_quality}</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-purple-50/60 rounded-xl border border-[#E5CEE7] flex items-center justify-between text-xs">
                        <span className="text-[#8F2A87] font-semibold">إجمالي مستحقات الأجور:</span>
                        <span className="font-mono font-black text-[#8F2A87]">{tech.total_earnings?.toLocaleString()} ر.ي</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── نافذة تسليم فستان الأميرة وتحصيل المتبقي والترحيل الخزني (Delivery & Settlement Modal) ── */}
      {deliveryModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E8E5EA] space-y-4 text-right">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">👑</span>
                <div>
                  <h3 className="text-sm font-bold text-[#25232A]">تسليم فستان الأميرة والتحصيل النهائي</h3>
                  <p className="text-[11px] text-[#6F6B75]">أمر رقم: {deliveryModalData.order?.order_no || deliveryModalData.order_no || deliveryModalData.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setDeliveryModalData(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* إذا تمت العملية بنجاح: عرض كرت التهنئة وزر الواتساب */}
            {deliveredSuccessData ? (
              <div className="space-y-4 py-2">
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <span className="text-4xl block animate-bounce">🎉</span>
                  <h4 className="text-sm font-black text-emerald-900">تم تسليم الفستان الملكي بنجاح!</h4>
                  <p className="text-xs text-emerald-800">
                    تم تحصيل مبلغ <strong>{deliveredSuccessData.collected_amount?.toLocaleString() || deliveryForm.amount_collected} ر.ي</strong> وإصدار سند القبض وترحيل قيد الخزينة المزدوج آلياً.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => sendWhatsAppDeliveryGreeting(deliveredSuccessData)}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>📲</span>
                  <span>إرسال بطاقة تهنئة التسليم للأميرة عبر واتساب 🌸</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryModalData(null)}
                  className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
                >
                  إغلاق النافذة
                </button>
              </div>
            ) : (
              /* نموذج التحصيل والتسليم */
              <div className="space-y-3.5">
                {/* بطاقة معلومات الأميرة والطلب */}
                <div className="p-3.5 rounded-2xl bg-[#F2E7F3]/60 border border-[#E5CEE7] space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#8F2A87]">👧 الأميرة: {deliveryModalData.child_name || deliveryModalData.order?.child_name || 'الأميرة'}</span>
                    <span className="text-[#6F6B75]">العميلة: {deliveryModalData.customer_name || deliveryModalData.customer || deliveryModalData.order?.customer_name}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-1 border-t border-[#E5CEE7]">
                    <span>👗 الموديل: <strong>{deliveryModalData.product || deliveryModalData.product_name}</strong></span>
                    <span className="font-mono text-[#8F2A87]">الكمية: {deliveryModalData.quantity || 1} قطعة</span>
                  </div>
                </div>

                {/* الحسابات المالية اللحظية */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-[#FAFAFB] rounded-xl border border-[#E8E5EA]">
                    <span className="text-[10.5px] text-[#6F6B75] block">إجمالي الفاتورة</span>
                    <span className="font-mono font-bold text-[#25232A] mt-0.5 block">{deliveryModalData.resolvedTotal?.toLocaleString()} ر.ي</span>
                  </div>
                  <div className="p-2.5 bg-[#FAFAFB] rounded-xl border border-[#E8E5EA]">
                    <span className="text-[10.5px] text-[#6F6B75] block">العربون المسدد</span>
                    <span className="font-mono font-bold text-[#007F8C] mt-0.5 block">{deliveryModalData.resolvedPaid?.toLocaleString()} ر.ي</span>
                  </div>
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[10.5px] text-amber-800 font-bold block">المتبقي للتحصيل</span>
                    <span className="font-mono font-black text-[#8F2A87] mt-0.5 block">{deliveryModalData.resolvedRemaining?.toLocaleString()} ر.ي</span>
                  </div>
                </div>

                {/* حقول التحصيل والخزينة */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>المبلغ المحصل الآن (ر.ي) <span className="text-[#D64545] font-bold">*</span></label>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      className={inputCls + " font-mono font-bold text-[#8F2A87] text-center"}
                      value={deliveryForm.amount_collected}
                      onChange={e => setDeliveryForm({ ...deliveryForm, amount_collected: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>خصم إضافي إن وجد (ر.ي)</label>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      className={inputCls + " font-mono text-center"}
                      value={deliveryForm.discount}
                      onChange={e => setDeliveryForm({ ...deliveryForm, discount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>حساب الخزينة / الصندوق المورد إليه <span className="text-[#D64545] font-bold">*</span></label>
                    <select
                      className={inputCls}
                      value={deliveryForm.account_id}
                      onChange={e => setDeliveryForm({ ...deliveryForm, account_id: e.target.value })}
                    >
                      <option value="ACC-101">ACC-101 (الصندوق الرئيسي - كاش)</option>
                      <option value="ACC-103">ACC-103 (بنك الكريمي - تحويل بنكي)</option>
                      {(accounts || []).filter(a => a.id !== 'ACC-101' && a.id !== 'ACC-103' && (a.account_type === 'Asset' || a.category === 'خزينة')).map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.id} ({acc.name})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>طريقة الدفع</label>
                    <select
                      className={inputCls}
                      value={deliveryForm.payment_method}
                      onChange={e => setDeliveryForm({ ...deliveryForm, payment_method: e.target.value })}
                    >
                      <option value="نقد (كاش)">💵 نقد (كاش)</option>
                      <option value="تحويل كريمي">📲 تحويل كريمي</option>
                      <option value="شبكة / بطاقة">💳 شبكة / مدى</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>ملاحظات التسليم والتسوية</label>
                  <input
                    type="text"
                    className={inputCls}
                    value={deliveryForm.notes}
                    onChange={e => setDeliveryForm({ ...deliveryForm, notes: e.target.value })}
                    placeholder="تم تسليم الفستان للأميرة وفحص المقاسات بنجاح..."
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={submittingDelivery}
                    onClick={handleConfirmDelivery}
                    className="flex-1 py-3 px-4 rounded-xl brand-gradient hover:opacity-95 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{submittingDelivery ? 'جاري التسليم والترحيل...' : '✅ تأكيد التسليم النهائي والترحيل المالي'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryModalData(null)}
                    className="py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Supervisor QC & Commission Approval Modal ── */}
      {qcModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E8E5EA] space-y-4 text-right max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl brand-gradient flex items-center justify-center text-white text-xl shadow-xs">
                  {qcModalData.qc_mode === 'rework' ? '⚠️' : '👑'}
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#25232A]">محطة الفحص والرقابة الملكية للجودة</h3>
                  <p className="text-[11px] text-[#6F6B75]">أمر تشغيل: {qcModalData.order_no || qcModalData.id} • متزامن مع Supabase ☁️</p>
                </div>
              </div>
              <button 
                onClick={() => setQcModalData(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* Princess & Tailor Card */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-50/70 to-pink-50/70 border border-[#E5CEE7] flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-[#8F2A87] font-bold block">الأميرة والموديل:</span>
                <span className="font-extrabold text-[#25232A]">{qcModalData.child_name || 'الأميرة'} — {qcModalData.product || qcModalData.product_name}</span>
              </div>
              <div className="text-left">
                <span className="text-[10px] text-[#6F6B75] block">الفني المنفذ:</span>
                <span className="font-bold text-[#8F2A87]">{qcModalData.tailor || qcModalData.tailor_name || 'المعلم سليم'}</span>
              </div>
            </div>

            {/* Mode Switcher: PASS vs REWORK */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F5F4F7] rounded-2xl">
              <button
                type="button"
                onClick={() => setQcModalData({ ...qcModalData, qc_mode: 'pass' })}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  qcModalData.qc_mode !== 'rework' 
                    ? 'bg-white text-[#8F2A87] shadow-sm border border-[#E5CEE7]' 
                    : 'text-[#6F6B75] hover:text-[#25232A]'
                }`}
              >
                <span>✅</span>
                <span>فحص معتمد (PASS)</span>
              </button>
              <button
                type="button"
                onClick={() => setQcModalData({ ...qcModalData, qc_mode: 'rework' })}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  qcModalData.qc_mode === 'rework' 
                    ? 'bg-rose-50 text-rose-700 shadow-sm border border-rose-200' 
                    : 'text-[#6F6B75] hover:text-rose-600'
                }`}
              >
                <span>⚠️</span>
                <span>إرجاع للتعديل (REWORK)</span>
              </button>
            </div>

            {/* Live Inspection Checklist */}
            <div className="bg-[#FAFAFB] p-3 rounded-2xl border border-[#E8E5EA] space-y-2">
              <span className="text-[11px] font-bold text-[#25232A] block">معايير فحص الفستان (Checkpoints) 🔍:</span>
              <div className="grid grid-cols-1 gap-1.5 text-xs">
                <label className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white transition cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={qcModalData.chk_measurements !== false} 
                    onChange={e => setQcModalData({ ...qcModalData, chk_measurements: e.target.checked })}
                    className="w-4 h-4 accent-[#8F2A87] rounded"
                  />
                  <span className="text-[#25232A] font-medium">📏 مطابقة المقاسات لمواصفات الأميرة (سماحية ±1 سم)</span>
                </label>
                <label className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white transition cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={qcModalData.chk_lining !== false} 
                    onChange={e => setQcModalData({ ...qcModalData, chk_lining: e.target.checked })}
                    className="w-4 h-4 accent-[#8F2A87] rounded"
                  />
                  <span className="text-[#25232A] font-medium">🪡 نعومة البطانة وحماية بشرة الطفلة من التل الخشن</span>
                </label>
                <label className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white transition cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={qcModalData.chk_seams !== false} 
                    onChange={e => setQcModalData({ ...qcModalData, chk_seams: e.target.checked })}
                    className="w-4 h-4 accent-[#8F2A87] rounded"
                  />
                  <span className="text-[#25232A] font-medium">✨ سلاسة السحاب وتثبيت الشك واللؤلؤ والفيونكات</span>
                </label>
                <label className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white transition cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={qcModalData.chk_packaging !== false} 
                    onChange={e => setQcModalData({ ...qcModalData, chk_packaging: e.target.checked })}
                    className="w-4 h-4 accent-[#8F2A87] rounded"
                  />
                  <span className="text-[#25232A] font-medium">👑 الكوي بالبخار والتغليف الملكي الفاخر</span>
                </label>
              </div>
            </div>

            {/* TAB CONTENT 1: PASS */}
            {qcModalData.qc_mode !== 'rework' ? (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>تقييم الجودة وإتقان الخياطة (1 إلى 5 نجوم):</label>
                  <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA]">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setQcModalData({ ...qcModalData, score: star })}
                        className={`text-2xl transition transform hover:scale-125 cursor-pointer ${star <= (qcModalData.score || 5) ? 'text-amber-400' : 'text-gray-300'}`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="text-xs font-bold text-[#8F2A87] mr-2">({qcModalData.score || 5} من 5 نجوم)</span>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>مبلغ الأجر / العمولة المعتمد للترحيل إلى HR (ر.ي):</label>
                  <input 
                    type="number"
                    className={inputCls + " font-mono font-bold text-[#8F2A87] text-center"}
                    value={qcModalData.wage || qcModalData.tailor_wage || 5000}
                    onChange={e => setQcModalData({ ...qcModalData, wage: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelCls}>ملاحظات تقرير الفحص (تُسجل في Supabase):</label>
                  <textarea
                    rows="2"
                    className={inputCls + " h-auto py-2 resize-none"}
                    value={qcModalData.notes || 'تم فحص المقاسات ومطابقة الموديل بجودة ممتازة وسليم تماماً.'}
                    onChange={e => setQcModalData({ ...qcModalData, notes: e.target.value })}
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/factory/job-card/approve', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            order_id: qcModalData.id || qcModalData.order_no,
                            quality_score: qcModalData.score || 5.0,
                            quality_notes: qcModalData.notes || '',
                            wage_amount: parseFloat(qcModalData.wage || qcModalData.tailor_wage || 0),
                            approved_by: 'سارة مديرة الورشة ✂️'
                          })
                        }).then(r => r.json());

                        if (res.success) {
                          showToast(res.message || 'تم اعتماد الجودة وتوثيق الفحص في Supabase وترحيل العمولة بنجاح 👑', 'success');
                          setFactory(prev => prev.map(item => {
                            if (item.order_no === qcModalData.order_no || item.id === qcModalData.id) {
                              return {
                                ...item,
                                tailor_status: 'approved',
                                wage_credited: true,
                                quality_score: qcModalData.score || 5.0,
                                quality_notes: qcModalData.notes,
                                stage: res.data?.stage || item.stage,
                                progress: res.data?.progress || item.progress
                              };
                            }
                            return item;
                          }));
                          setQcModalData(null);
                        } else {
                          showToast(res.error || 'حدث خطأ أثناء الاعتماد', 'error');
                        }
                      } catch (err) {
                        showToast('خطأ في الاتصال: ' + err.message, 'error');
                      }
                    }}
                    className="flex-1 py-3 px-4 rounded-xl brand-gradient hover:opacity-95 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>✅</span>
                    <span>اعتماد الفحص وترحيل المستحق لـ HR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQcModalData(null)}
                    className="py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              /* TAB CONTENT 2: REWORK */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>نوع العيب المرصود ⚠️:</label>
                    <select
                      className={inputCls}
                      value={qcModalData.defect_type || 'مقاسات غير مطابقة'}
                      onChange={e => setQcModalData({ ...qcModalData, defect_type: e.target.value })}
                    >
                      <option value="مقاسات غير مطابقة">📏 مقاسات غير مطابقة للأميرة</option>
                      <option value="السحاب يعلق أو تالف">🤐 السحاب يعلق أو تالف</option>
                      <option value="عيب في خياطة وتجميع القطعة">🪡 عيب في الخياطة والدرزات</option>
                      <option value="عيب في التطريز والشك">✨ عيب في التطريز واللؤلؤ</option>
                      <option value="عيب أو بقعة في القماش">✂️ بقعة أو عيب في القماش</option>
                      <option value="بطانة خشنة تسبب حكة">⚠️ بطانة خشنة تؤذي الطفلة</option>
                      <option value="أخرى">📝 أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>درجة الخطورة:</label>
                    <select
                      className={inputCls}
                      value={qcModalData.severity || 'Medium'}
                      onChange={e => setQcModalData({ ...qcModalData, severity: e.target.value })}
                    >
                      <option value="Low">بسيط (Low)</option>
                      <option value="Medium">متوسط (Medium)</option>
                      <option value="Critical">حرج (Critical)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>الإجراء التصحيحي المطلوب من الخياط:</label>
                  <input 
                    type="text"
                    className={inputCls}
                    placeholder="مثال: إعادة فك السحاب وضبط محيط الصدر 2 سم"
                    value={qcModalData.corrective_action || ''}
                    onChange={e => setQcModalData({ ...qcModalData, corrective_action: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelCls}>ملاحظات إضافية عن العيب (تُسجل في quality_defects بسوبابيز):</label>
                  <textarea
                    rows="2"
                    className={inputCls + " h-auto py-2 resize-none"}
                    placeholder="اكتبي تفاصيل العيب بدقة ليتداركها الفني..."
                    value={qcModalData.defect_notes || ''}
                    onChange={e => setQcModalData({ ...qcModalData, defect_notes: e.target.value })}
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/factory/job-card/rework', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            order_id: qcModalData.id || qcModalData.order_no,
                            defect_type: qcModalData.defect_type || 'مقاسات غير مطابقة',
                            severity: qcModalData.severity || 'Medium',
                            corrective_action: qcModalData.corrective_action || 'إعادة ضبط المقاسات والسحاب ومعالجة العيب',
                            notes: qcModalData.defect_notes || '',
                            inspector_name: 'سارة مديرة الورشة ✂️'
                          })
                        }).then(r => r.json());

                        if (res.success) {
                          showToast(res.message || 'تم توثيق العيب في Supabase وإرجاع الفستان للخياط بنجاح ⚠️', 'success');
                          setFactory(prev => prev.map(item => {
                            if (item.order_no === qcModalData.order_no || item.id === qcModalData.id) {
                              return {
                                ...item,
                                tailor_status: 'rework',
                                wage_credited: false,
                                quality_score: 2.0,
                                notes: (item.notes || '') + ` | ⚠️ مطلوب تعديل: ${qcModalData.defect_type || 'عيب خياطة'}`
                              };
                            }
                            return item;
                          }));
                          setQcModalData(null);
                        } else {
                          showToast(res.error || 'حدث خطأ أثناء رصد العيب', 'error');
                        }
                      } catch (err) {
                        showToast('خطأ في الاتصال: ' + err.message, 'error');
                      }
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>⚠️</span>
                    <span>توثيق العيب في Supabase وإرجاع للتعديل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQcModalData(null)}
                    className="py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modern Workshop Job Ticket & Print Engine Modal */}
      {printModalData && typeof PrintModal !== 'undefined' && (
        <PrintModal
          isOpen={!!printModalData}
          order={printModalData.order}
          customer={printModalData.customer}
          measurements={printModalData.measurements}
          product={printModalData.product}
          products={printModalData.products || products}
          defaultTemplate="job_ticket"
          onClose={() => setPrintModalData(null)}
        />
      )}

      {selectedJobCustomer && typeof JobCardModal !== 'undefined' && (
        <JobCardModal customer={selectedJobCustomer} onClose={() => setSelectedJobCustomer(null)} />
      )}
    </div>
  );
}
