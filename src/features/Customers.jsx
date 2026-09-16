const { useState, useEffect, useMemo, useCallback, useRef } = React;

// ── مساعد: هل المقاس قديم (مر عليه أكثر من 90 يوماً)؟ ──
function isMeasurementStale(measDate) {
  if (!measDate) return false;
  try {
    const d = new Date(measDate);
    const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 90;
  } catch { return false; }
}

function Customers({ customers = [], setCustomers, products = [], showToast, currency = { display: 'YER', symbol: '﷼' }, onSendToFactory }) {

  // ── توليد Customer ID تلقائياً ──
  const genCustId = () => {
    const lastNum = (customers || []).reduce((acc, c) => {
      const match = String(c.customer_id || '').match(/CUST-(\d+)/);
      return match ? Math.max(acc, parseInt(match[1])) : acc;
    }, 1000);
    return `CUST-${lastNum + 1}`;
  };

  // ── التبويب النشط داخل ملف العميل (Profile Sub-Tabs) ──
  const [activeCustomerSubTab, setActiveCustomerSubTab] = useState('crm'); // 'crm' | 'measurements' | 'ledger' | 'directory'
  const [activeChildIdx, setActiveChildIdx] = useState(0);

  // ── حالات القسم الأول: بيانات العميل ──
  const [custId, setCustId]      = useState(genCustId);
  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');
  const [phoneAlt, setPhoneAlt]   = useState('');
  const [platform, setPlatform]   = useState('واتساب (WhatsApp)');
  const [handle, setHandle]       = useState('');
  const [city, setCity]           = useState('');
  const [street, setStreet]       = useState('');
  const [category, setCategory]   = useState('جديد');
  const [regDate, setRegDate]     = useState(TODAY_STR_ISO);
  const [notes, setNotes]         = useState('');

  // ── حالات ومراجع القوائم المنسدلة الذكية للعملاء والأميرات ──
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showChildDropdown, setShowChildDropdown]       = useState(false);
  const customerDropdownRef = useRef(null);
  const childDropdownRef    = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
      if (childDropdownRef.current && !childDropdownRef.current.contains(e.target)) {
        setShowChildDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!name || !name.trim()) return (customers || []).slice(0, 10);
    const q = name.trim().toLowerCase();
    return (customers || []).filter(c => {
      const cName = (c.name || c.customer_name || '').toLowerCase();
      const cPhone = String(c.phone || '');
      const cId = String(c.customer_id || c.id || '').toLowerCase();
      return cName.includes(q) || cPhone.includes(q) || cId.includes(q);
    }).slice(0, 10);
  }, [name, customers]);

  // ── حالات القسم الثاني: مقاسات الأطفال (متعددة) ──
  const isOlderThan90Days = (dateStr) => {
    if (!dateStr) return false;
    const diff = (new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24);
    return diff > 90;
  };

  const emptyMeasurement = () => ({
    id: Date.now() + Math.floor(Math.random() * 999),
    child_name: '',
    event_date: '',
    meas_date: TODAY_STR_ISO,
    unit: 'سم',
    total_height: '',
    dress_length: '',
    chest_length: '',
    skirt_length: '',
    sleeve_length: '',
    chest_circ: '',
    waist_circ: '',
    shoulder_width: '',
    armhole_circ: '',
    neck_circ: '',
    comfort_profile: [],
    sewing_notes: '',
    model_image: '',
    dress_color: '',
    selected_model: '',
    estimated_age: ''
  });

  const [measurements, setMeasurements] = useState([]);

  // ── قائمة الأميرات/البنات المسجلات للعميلة الحالية لاسترجاع مقاساتهن فوراً ──
  const knownPrincesses = useMemo(() => {
    const list = [];
    const seen = new Set();
    const curCust = (customers || []).find(c => 
      (c.customer_id && c.customer_id === custId) || 
      (c.id && c.id === custId) || 
      (phone && c.phone === phone) || 
      (name && c.name === name)
    );
    const allMeas = [
      ...(curCust?.measurements || []),
      ...(measurements || [])
    ];
    allMeas.forEach(m => {
      const cName = (m.child_name || m.name || '').trim();
      if (cName && !seen.has(cName)) {
        seen.add(cName);
        list.push({
          child_name: cName,
          selected_model: m.selected_model || m.model_name || '',
          total_height: m.total_height || m.total_len || '',
          dress_length: m.dress_length || m.dress_len || '',
          chest_length: m.chest_length || m.chest_len || '',
          skirt_length: m.skirt_length || m.skirt_len || '',
          sleeve_length: m.sleeve_length || m.sleeve_len || '',
          chest_circ: m.chest_circ || '',
          waist_circ: m.waist_circ || '',
          shoulder_width: m.shoulder_width || m.shoulder_w || '',
          armhole_circ: m.armhole_circ || m.armpit_circ || '',
          neck_circ: m.neck_circ || '',
          comfort_profile: Array.isArray(m.comfort_profile) ? m.comfort_profile : (typeof m.comfort_profile === 'string' ? m.comfort_profile.split(',').map(s=>s.trim()).filter(Boolean) : []),
          sewing_notes: m.sewing_notes || m.notes || '',
          dress_color: m.dress_color || '',
          meas_date: m.meas_date || m.date || TODAY_STR_ISO,
          event_date: m.event_date || ''
        });
      }
    });
    return list;
  }, [custId, phone, name, customers, measurements]);

  const addChildCard = () => {
    setMeasurements(prev => {
      const next = [...prev, emptyMeasurement()];
      setActiveChildIdx(prev.length);
      return next;
    });
    showToast('تمت إضافة بطاقة طفلة جديدة ➕');
  };

  const removeChildCard = (idx) => {
    setMeasurements(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (activeChildIdx >= next.length && next.length > 0) {
        setActiveChildIdx(next.length - 1);
      } else if (next.length === 0) {
        setActiveChildIdx(0);
      }
      return next;
    });
    showToast('تم حذف بطاقة الطفلة 🗑️');
  };

  const calculateAge = (length, selectedModelName, unit = 'سم') => {
    if (!length) return '';
    let l = parseFloat(length);
    if (isNaN(l)) return '';
    if (unit === 'إنش' || unit === 'انش' || unit === 'inch' || unit === '"') {
      l = l * 2.54;
    }

    if (selectedModelName && products && products.length > 0) {
       const model = products.find(p => p.name === selectedModelName);
       if (model && model.age_chart && model.age_chart.length > 0) {
         const match = model.age_chart.find(r => l >= r.min && l <= r.max);
         if (match) return match.age;
       }
    }

    if (l <= 45) return '1-2 سنوات';
    if (l <= 55) return '2-3 سنوات';
    if (l <= 60) return '4 سنوات';
    if (l <= 65) return '5 سنوات';
    if (l <= 70) return '6 سنوات';
    if (l <= 75) return '7 سنوات';
    if (l <= 80) return '8 سنوات';
    if (l <= 85) return '9 سنوات';
    if (l <= 90) return '10 سنوات';
    if (l <= 95) return '11 سنة';
    if (l <= 100) return '12 سنة';
    return 'أكثر من 12 سنة';
  };

  const getJumboFactor = (m) => {
    const STANDARD_CHEST = {
      '1-2 سنوات': 52, '2-3 سنوات': 54, '4 سنوات': 56, '5 سنوات': 58,
      '6 سنوات': 60, '7 سنوات': 62, '8 سنوات': 64, '9 سنوات': 66,
      '10 سنوات': 68, '11 سنة': 72, '12 سنة': 76, 'أكثر من 12 سنة': 80,
      '4-5 سنوات': 57, '6-7 سنوات': 61, '8-10 سنوات': 66, '10-12 سنة': 74, '12-14 سنة': 80
    };
    if (!m.estimated_age || !m.chest_circ) return { factor: 1, msg: '' };
    
    let standard = STANDARD_CHEST[m.estimated_age] || 60;
    let actualCm = parseFloat(m.chest_circ);
    if (isNaN(actualCm)) return { factor: 1, msg: '' };
    if (m.unit === 'إنش') actualCm = actualCm * 2.54;
    
    if (actualCm > standard * 1.10) {
      const factor = actualCm / standard;
      return { factor, standard, actualCm };
    }
    return { factor: 1 };
  };

  const getBroadBracket = (ageStr) => {
    if (!ageStr) return '6-9 سنوات';
    if (ageStr.includes('1-2') || ageStr === '1-2 سنوات') return '1-2 سنة';
    if (ageStr.includes('2-3') || ageStr.includes('3-4') || ageStr.includes('4-5') || ageStr.includes('4 ') || ageStr.includes('5 ')) return '3-5 سنوات';
    if (ageStr.includes('6-7') || ageStr.includes('8-10') || ageStr.includes('6 ') || ageStr.includes('7 ') || ageStr.includes('8 ') || ageStr.includes('9 ')) return '6-9 سنوات';
    return '10-13 سنة';
  };

  // ── قائمة الموديلات المعتمدة المجمعة بدون أي تكرار ──
  const uniqueModels = useMemo(() => {
    const set = new Set();
    (products || []).forEach(p => {
      const n = (p.name || p.model_name || '').trim();
      if (n) set.add(n);
    });
    return Array.from(set);
  }, [products]);

  // ── محرك التسعير الذكي وربط الفئة العمرية تلقائياً بالمقاسات ──
  const getSmartModelMatch = useCallback((m, productsList = []) => {
    const selMod = (m?.selected_model || '').trim();
    if (!selMod) return null;

    const allMatches = (productsList || []).filter(p => {
      const pName = (p.name || p.model_name || '').trim();
      return pName === selMod || pName.startsWith(selMod);
    });

    if (allMatches.length === 0) return null;

    let length = parseFloat(m.dress_length || m.total_height || 0);
    if (m.unit === 'إنش' && length > 0) length = length * 2.54;

    let tier = 'toddler';
    let ageLabel = '1-3 سنوات (الأميرات الصغيرات)';
    let broadBracket = '1-2 سنة';

    if (length > 0) {
      if (length <= 55) {
        tier = 'toddler';
        ageLabel = '1-3 سنوات (الأميرات الصغيرات)';
        broadBracket = '1-2 سنة';
      } else if (length <= 75) {
        tier = 'kids';
        ageLabel = '4-7 سنوات (فئة الوسط)';
        broadBracket = '3-5 سنوات';
      } else if (length <= 95) {
        tier = 'junior';
        ageLabel = '8-11 سنة (فئة الكبار)';
        broadBracket = '6-9 سنوات';
      } else {
        tier = 'teen';
        ageLabel = '12+ سنة (فئة اليافعات)';
        broadBracket = '10-13 سنة';
      }
    } else if (m.estimated_age) {
      broadBracket = getBroadBracket(m.estimated_age);
      ageLabel = m.estimated_age;
    }

    // إذا كان الموديل مسجلاً بعدة أصناف/تسعيرات منفصلة في الكتالوج (مثل فساتين ساندريلا الثلاثة):
    let matchedProduct = allMatches[0];
    if (allMatches.length > 1) {
      const sortedByPrice = [...allMatches].sort((a, b) => {
        const pA = parseFloat(a.sell_price || a.price || a.base_price || 0);
        const pB = parseFloat(b.sell_price || b.price || b.base_price || 0);
        return pA - pB;
      });

      if (tier === 'toddler') {
        matchedProduct = sortedByPrice[0];
      } else if (tier === 'kids') {
        matchedProduct = sortedByPrice[Math.min(1, sortedByPrice.length - 1)];
      } else {
        matchedProduct = sortedByPrice[sortedByPrice.length - 1];
      }
    }

    let finalPrice = parseFloat(matchedProduct.sell_price || matchedProduct.price || matchedProduct.base_price || 0);
    if (matchedProduct.price_matrix && matchedProduct.price_matrix[broadBracket]) {
      finalPrice = parseFloat(matchedProduct.price_matrix[broadBracket]);
    }

    const jumbo = getJumboFactor(m);
    if (jumbo.factor > 1) {
      finalPrice = finalPrice * jumbo.factor;
    }

    let fabricMeters = 0;
    if (matchedProduct.bom && Array.isArray(matchedProduct.bom)) {
      matchedProduct.bom.forEach(f => {
        fabricMeters += (f.brackets && f.brackets[broadBracket]) || parseFloat(f.meters || 0);
      });
    } else {
      fabricMeters = parseFloat(matchedProduct.yards_used || (tier === 'toddler' ? 1.5 : (tier === 'kids' ? 2.5 : 3.5)));
    }
    if (jumbo.factor > 1) {
      fabricMeters = fabricMeters * jumbo.factor;
    }

    return {
      product: matchedProduct,
      modelName: selMod,
      ageLabel,
      broadBracket,
      price: Math.round(finalPrice),
      fabricMeters: parseFloat(fabricMeters.toFixed(2)),
      jumboFactor: jumbo.factor
    };
  }, [products]);

  const updateMeasurement = (idx, field, value) => {
    setMeasurements(prev => prev.map((m, i) => {
      if (i === idx) {
        const updated = { ...m, [field]: value };
        if (field === 'dress_length' || field === 'total_height' || field === 'selected_model' || field === 'unit') {
          updated.estimated_age = calculateAge(updated.dress_length || updated.total_height, updated.selected_model, updated.unit);
        }
        return updated;
      }
      return m;
    }));
  };

  // تحويل وحدة القياس (سم ↔ إنش)
  const toggleUnit = (idx) => {
    const m = measurements[idx];
    const isCm = m.unit === 'سم';
    const factor = isCm ? (1 / 2.54) : 2.54;
    const targetUnit = isCm ? 'إنش' : 'سم';
    const fields = ['total_height','dress_length','chest_length','skirt_length','sleeve_length','chest_circ','waist_circ','shoulder_width','armhole_circ','neck_circ'];
    const updated = { ...m, unit: targetUnit };
    fields.forEach(f => {
      if (m[f] !== '' && !isNaN(parseFloat(m[f]))) {
        updated[f] = (parseFloat(m[f]) * factor).toFixed(1);
      }
    });
    updated.estimated_age = calculateAge(updated.dress_length || updated.total_height, updated.selected_model, updated.unit);
    setMeasurements(prev => prev.map((item, i) => i === idx ? updated : item));
  };

  // ── حالات القسم الثالث: كشف الحساب ──
  const [totalSales, setTotalSales]     = useState('');
  const [totalPaid, setTotalPaid]       = useState('');
  const [deposit, setDeposit]           = useState('');
  const [payMethod, setPayMethod]       = useState('نقد (كاش)');
  const [receiptFile, setReceiptFile]   = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [delivery, setDelivery]         = useState('');
  const [autoCalculatedSum, setAutoCalculatedSum] = useState(0);

  // ── حساب إجمالي المبيعات تلقائياً بالمحرك الذكي ──
  useEffect(() => {
    let sum = 0;
    measurements.forEach(m => {
      const match = getSmartModelMatch(m, products);
      if (match && match.price > 0) {
        sum += match.price;
      }
    });
    
    if (sum !== autoCalculatedSum) {
       setAutoCalculatedSum(sum);
       if (sum > 0) setTotalSales(sum.toFixed(1));
       else setTotalSales('');
    }
  }, [measurements, products, autoCalculatedSum, getSmartModelMatch]);

  const remaining = (() => {
    const s = Number(totalSales) || 0;
    const c = Number(delivery) || 0;
    const d = Number(deposit) || 0;
    return (s + c) > 0 ? ((s + c) - d).toFixed(2) : '0.00';
  })();

  const handleReceiptChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setReceiptFile(ev.target.result);
      setReceiptPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  // ── حالة الحفظ وعرض السجلات ──
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedJobCard, setSelectedJobCard] = useState(null);

  // ── فتح وتعديل ملف العميلة ──
  const loadCustomerForEdit = (c) => {
    if (!c) return;
    setCustId(c.id || c.customer_id || genCustId());
    setName(c.name || c.customer_name || '');
    setPhone(c.phone || '');
    setPhoneAlt(c.phone_alt || '');
    setPlatform(c.platform || 'واتساب (WhatsApp)');
    setHandle(c.handle || '');
    setCity(c.city || '');
    setStreet(c.street || c.address || '');
    setCategory(c.category || 'جديد');
    setRegDate(c.reg_date || TODAY_STR_ISO);
    if (Array.isArray(c.measurements) && c.measurements.length > 0) {
      setMeasurements(c.measurements.map((m, idx) => ({
        id: m.id || (Date.now() + idx),
        child_id: m.child_id || '',
        child_name: m.child_name || m.name || '',
        event_date: m.event_date || '',
        meas_date: m.meas_date || m.date || TODAY_STR_ISO,
        unit: m.unit || 'سم',
        total_height: m.total_height || m.total_len || '',
        dress_length: m.dress_length || m.dress_len || '',
        chest_length: m.chest_length || m.chest_len || '',
        skirt_length: m.skirt_length || m.skirt_len || '',
        sleeve_length: m.sleeve_length || m.sleeve_len || '',
        chest_circ: m.chest_circ || '',
        waist_circ: m.waist_circ || '',
        shoulder_width: m.shoulder_width || m.shoulder_w || '',
        armhole_circ: m.armhole_circ || m.armpit_circ || '',
        neck_circ: m.neck_circ || '',
        comfort_profile: Array.isArray(m.comfort_profile) ? m.comfort_profile : (typeof m.comfort_profile === 'string' && m.comfort_profile ? m.comfort_profile.split(',').map(s=>s.trim()).filter(Boolean) : []),
        sewing_notes: m.sewing_notes || m.notes || '',
        model_image: m.model_image || m.model_img || '',
        dress_color: m.dress_color || '',
        selected_model: m.selected_model || m.model_name || '',
        estimated_age: m.estimated_age || calculateAge(m.dress_length || m.dress_len || m.total_height || m.total_len, m.selected_model || m.model_name)
      })));
    } else {
      setMeasurements([emptyMeasurement()]);
    }
    const salesVal = c.total_sales !== undefined ? c.total_sales : (c.ledger?.total_sales !== undefined ? c.ledger.total_sales : '');
    const paidVal = c.total_paid !== undefined ? c.total_paid : (c.ledger?.total_paid !== undefined ? c.ledger.total_paid : '');
    const depVal = c.deposit !== undefined ? c.deposit : (c.ledger?.deposit !== undefined ? c.ledger.deposit : '');
    if (salesVal) setTotalSales(String(salesVal));
    if (paidVal) setTotalPaid(String(paidVal));
    if (depVal) setDeposit(String(depVal));
    setActiveCustomerSubTab('crm');
    showToast(`تم فتح وتعديل ملف العميلة: ${c.name || c.customer_name}`);
  };

  // ── دالة الحفظ الرئيسية ──
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!name.trim()) {
      setActiveCustomerSubTab('crm');
      return showToast('اسم العميلة مطلوب ⚠️', 'error');
    }
    if (!phone.trim()) {
      setActiveCustomerSubTab('crm');
      return showToast('رقم الهاتف مطلوب ⚠️', 'error');
    }
    setLoading(true);

    const payload = {
      customer_id:     custId,
      name:            name.trim(),
      phone:           phone.trim(),
      phone_alt:       phoneAlt.trim(),
      platform,
      handle:          handle.trim(),
      city:            city.trim(),
      street:          street.trim(),
      category,
      reg_date:        regDate,
      purchase_count:  0,
      items_count:     0,
      notes:           notes.trim(),
      measurements:    measurements.map((m, idx) => {
        const match = getSmartModelMatch(m, products);
        const adjPrice = match ? match.price : 0;
        const adjMeters = match ? match.fabricMeters : 0;
        const pData = match ? match.product : null;
        const jFactor = match ? match.jumboFactor : 1;
        
        let fabric_deductions = [];
        let baseCostSum = 0;
        
        if (pData && pData.bom) {
           const bracket = match ? match.broadBracket : '6-9 سنوات';
           fabric_deductions = pData.bom.map(fab => {
             const br = fab.brackets || {};
             const meters = br[bracket] || 0;
             const mAdj = parseFloat((jFactor > 1 ? meters * jFactor : meters).toFixed(2));
             baseCostSum += (mAdj * (fab.unit_cost || 0));
             
             return {
               fabric_name: fab.fabric_name,
               meters: mAdj
             };
           });
        }

        return {
          ...m,
          child_name: m.child_name.trim() || 'الأميرة ' + (idx + 1),
          estimated_age: match ? match.ageLabel : (m.estimated_age || ''),
          jumbo_factor: jFactor.toFixed(2),
          adjusted_meters: adjMeters,
          fabric_deductions,
          adjusted_price: adjPrice,
          bom_cost: baseCostSum.toFixed(2)
        };
      }),
      ledger: {
        total_sales:   parseFloat(totalSales) || 0,
        total_paid:    parseFloat(totalPaid) || 0,
        deposit:       parseFloat(deposit) || 0,
        pay_method:    payMethod,
        receipt_b64:   receiptFile || '',
        remaining:     Number(remaining) || 0,
        delivery:      Number(delivery) || 0,
        updated_at:    TODAY_STR_ISO
      }
    };

    try {
      let apiRes = null;
      try {
        const res = await fetch('/api/crm/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        apiRes = await res.json();
        if (!res.ok || apiRes.success === false) {
          throw new Error(apiRes.error || 'فشل حفظ بيانات العميلة');
        }
      } catch (backendErr) {
        if (backendErr.message && backendErr.message.includes('مسجل مسبقاً')) {
          setLoading(false);
          setActiveCustomerSubTab('crm');
          return showToast(backendErr.message, 'error');
        }
        apiRes = await callGAS('addCustomer', payload);
      }

      const newRecord = (apiRes && (apiRes.data || apiRes.customer)) ? (apiRes.data || apiRes.customer) : { ...payload, id: custId };
      const finalCustId = newRecord.id || newRecord.customer_id || custId;
      if (setCustomers) {
        setCustomers(prev => [
          newRecord,
          ...(prev || []).filter(c => {
            const cid = c.customer_id || c.id;
            return cid !== finalCustId && cid !== custId && (!phone.trim() || c.phone !== phone.trim());
          })
        ]);
      }
      
      const depAmt = parseFloat(payload.ledger?.deposit || 0);
      const successMsg = depAmt > 0
        ? `✅ تم حفظ ${name} وقطع سند قبض بمبلغ (${depAmt.toLocaleString('en-US')}) وتوريده للصندوق وتحديث المخزون بنجاح`
        : `✅ تم حفظ بيانات ${name} وربط طلب التفصيل والمخزون بنجاح`;
      showToast(successMsg);

    } catch (err) {
      console.error(err);
      const localRecord = { ...payload, id: custId };
      if (setCustomers) {
        setCustomers(prev => [
          localRecord,
          ...(prev || []).filter(c => {
            const cid = c.customer_id || c.id;
            return cid !== custId && (!phone.trim() || c.phone !== phone.trim());
          })
        ]);
      }
      showToast('تم الحفظ محلياً ⚡ — يُرجى مراجعة الاتصال', 'warning');
    } finally {
      setLoading(false);
      setName(''); setPhone(''); setPhoneAlt(''); setHandle('');
      setCity(''); setStreet(''); setNotes('');
      setTotalSales(''); setTotalPaid(''); setDeposit(''); setDelivery('');
      setReceiptFile(null); setReceiptPreview(null);
      setMeasurements([]);
      setCustId(genCustId());
      setActiveChildIdx(0);
    }
  };

  // ── فلترة قائمة العملاء ──
  const filtered = useMemo(() => {
    return (customers || []).filter(c =>
      !search || 
      (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
      (c.phone || '').includes(search) || 
      (c.customer_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.city || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [customers, search]);

  const catColor = (cat) => ({
    'جديد': 'bg-[#E2F5F7] dark:bg-cyan-950/40 text-[#007F8C] dark:text-cyan-300 border-[#C5ECF0] dark:border-cyan-800/50',
    'دائم': 'bg-[#F2E7F3] dark:bg-purple-950/40 text-[#8F2A87] dark:text-purple-300 border-[#E5CEE7] dark:border-purple-800/50 font-bold',
    'VIP':  'bg-[#FCE8F2] dark:bg-rose-950/40 text-[#B0005A] dark:text-rose-300 border-[#F2A4CB] dark:border-rose-800/50 font-black shadow-2xs'
  }[cat] || 'bg-[#FAFAFB] dark:bg-slate-800 text-[#25232A] dark:text-slate-200 border-[#E8E5EA] dark:border-slate-700');

  const formatCleanDate = (d) => {
    if (!d) return '—';
    if (typeof d === 'string') {
      const clean = d.includes('T') ? d.split('T')[0] : d;
      return clean.replace(/-/g, '/');
    }
    return d;
  };

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#25232A] dark:text-slate-100 text-xs font-medium placeholder:text-[#6F6B75] dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#B0005A] dark:focus:border-rose-500 focus:ring-2 focus:ring-[#FCE8F2] dark:focus:ring-rose-950 transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] dark:text-slate-200 mb-1.5";

  const currM = measurements[activeChildIdx] || measurements[0] || emptyMeasurement();

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">

      {/* ══════════════════════════════════════════
          Customer Profile Master Card
          ══════════════════════════════════════════ */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#E8E5EA] dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        
        {/* Profile Header with Avatar, ID & Quick Actions */}
        <div className="p-6 border-b border-[#E8E5EA] dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white dark:from-[#0f172a] dark:via-[#131d31] dark:to-[#0f172a]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FCE8F2] dark:bg-rose-950/40 text-[#B0005A] dark:text-rose-300 border border-[#F2A4CB]/50 dark:border-rose-900/50 flex items-center justify-center text-xl font-bold shadow-xs shrink-0">
              {name.trim() ? name.trim()[0] : '👤'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-base md:text-lg font-bold text-[#25232A] dark:text-slate-100">
                  {name.trim() || 'ملف عميل جديد'}
                </h1>
                <span className="text-xs bg-[#FFF1DC] dark:bg-amber-950/50 text-[#C97300] dark:text-amber-400 border border-[#FFE4B9] dark:border-amber-800/50 rounded-lg px-2.5 py-0.5 font-mono font-bold">
                  {custId}
                </span>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-md border font-semibold ${catColor(category)}`}>
                  {category}
                </span>
              </div>
              <p className="text-xs text-[#6F6B75] dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{platform}</span>
                <span>•</span>
                <span>{phone || 'لم يُحدد رقم الهاتف بعد'}</span>
                {city && (
                  <>
                    <span>•</span>
                    <span>{city}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <button
              type="button"
              onClick={addChildCard}
              className="h-10 px-4 bg-[#F2E7F3] dark:bg-purple-950/40 hover:bg-[#E5CEE7] dark:hover:bg-purple-900/50 text-[#8F2A87] dark:text-purple-300 font-bold text-xs rounded-xl border border-[#E5CEE7] dark:border-purple-800/50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Icons.Plus className="w-4 h-4" />
              <span>إضافة بطاقة مواصفات ({measurements.length})</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="h-10 px-5 bg-[#B0005A] hover:bg-[#8E0049] text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Icons.Check className="w-4 h-4" />
              )}
              <span>حفظ وتوثيق العميل</span>
            </button>
          </div>
        </div>

        {/* ── KPI Financial & Operational Metric Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#E8E5EA] dark:border-slate-800 bg-[#FAFAFB] dark:bg-slate-900/60 divide-x divide-x-reverse divide-[#E8E5EA] dark:divide-slate-800">
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] dark:text-slate-400 block">إجمالي المبيعات</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#25232A] dark:text-slate-100 mt-1 block">
              {Number(totalSales || 0).toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75] dark:text-slate-500">{currency.display}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] dark:text-slate-400 block">العربون / المدفوع</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] dark:text-cyan-400 mt-1 block">
              {Number(deposit || totalPaid || 0).toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75] dark:text-slate-500">{currency.display}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] dark:text-slate-400 block">المبلغ المتبقي</span>
            <span className={`text-xl font-extrabold font-mono tabular-nums mt-1 block ${parseFloat(remaining) > 0 ? 'text-[#F28A00] dark:text-amber-400' : 'text-[#007F8C] dark:text-cyan-400'}`}>
              {Number(remaining || 0).toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75] dark:text-slate-500">{currency.display}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] dark:text-slate-400 block">سجلات المواصفات والطلبات</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#8F2A87] dark:text-purple-400 mt-1 block">
              {measurements.length} <span className="text-xs font-medium text-[#6F6B75] dark:text-slate-500">{measurements.length === 1 ? 'سجل' : (measurements.length === 2 ? 'سجلان' : 'سجلات')}</span>
            </span>
          </div>
        </div>

        {/* ── Tabs Navigation Bar ── */}
        <div className="px-6 border-b border-[#E8E5EA] dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar bg-white dark:bg-[#0f172a]">
          {[
            { id: 'crm', label: 'الملف وبيانات التواصل', icon: Icons.Users },
            { id: 'measurements', label: `سجل المواصفات والقياسات (${measurements.length})`, icon: Icons.Scissors },
            { id: 'ledger', label: 'كشف الحساب والمدفوعات', icon: Icons.Vouchers },
            { id: 'directory', label: `سجل ودليل العملاء (${filtered.length})`, icon: Icons.Dashboard }
          ].map(tab => {
            const isActive = activeCustomerSubTab === tab.id;
            const IconComp = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCustomerSubTab(tab.id)}
                className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#B0005A] text-[#B0005A] dark:text-rose-400 bg-[#FCE8F2]/30 dark:bg-rose-950/30'
                    : 'border-transparent text-[#6F6B75] dark:text-slate-400 hover:text-[#25232A] dark:hover:text-slate-100 hover:bg-[#FAFAFB] dark:hover:bg-slate-800/60'
                }`}
              >
                {IconComp && <IconComp className="w-4 h-4" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════
            TAB 1: الملف وبيانات التواصل (CRM)
            ══════════════════════════════════════════ */}
        {activeCustomerSubTab === 'crm' && (
          <div className="p-6 animate-fadeIn space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {/* 1. اسم العميل مع قائمة منسدلة ذكية للعملاء السابقين */}
              <div className="relative" ref={customerDropdownRef}>
                <div className="flex justify-between items-center mb-1">
                  <label className={labelCls + " mb-0"}>اسم العميل / المنشأة <span className="text-[#D64545] font-bold">*</span></label>
                  {name && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustId(genCustId());
                        setName('');
                        setPhone('');
                        setPhoneAlt('');
                        setPlatform('واتساب (WhatsApp)');
                        setHandle('');
                        setCity('');
                        setStreet('');
                        setCategory('جديد');
                        setRegDate(TODAY_STR_ISO);
                        setNotes('');
                        setMeasurements([emptyMeasurement()]);
                        setTotalSales('');
                        setTotalPaid('');
                        setDeposit('');
                        showToast('تمت تهيئة نموذج عميل جديد 👤✨');
                      }}
                      className="text-[10px] text-[#B0005A] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                      title="تفريغ النموذج والبدء بعميل جديد"
                    >
                      <span>+ عميل جديد</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    required
                    value={name}
                    onChange={e => {
                      setName(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className={inputCls + " pl-8"}
                    placeholder="ابحث بالاسم أو الهاتف، أو اكتب اسماً جديداً..."
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCustomerDropdown(prev => !prev)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer p-0.5"
                    tabIndex={-1}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>

                {/* القائمة المنسدلة الذكية للعملاء السابقين */}
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 right-0 left-0 mt-1.5 bg-white dark:bg-slate-900 border border-[#E8E5EA] dark:border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
                    <div className="p-2 text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/60 flex justify-between items-center sticky top-0 backdrop-blur-xs">
                      <span>👥 عملاء مسجلون سابقاً (انقر لاختيار العميل وتعبئة بياناته):</span>
                      <button type="button" onClick={() => setShowCustomerDropdown(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xs px-1">✕</button>
                    </div>
                    {filteredCustomers.map(c => {
                      const cName = c.name || c.customer_name;
                      const cId = c.customer_id || c.id;
                      const cPhone = c.phone || 'بدون هاتف';
                      const childrenCount = (c.measurements?.length || c.children?.length || 0);
                      return (
                        <div
                          key={cId}
                          onClick={() => {
                            loadCustomerForEdit(c);
                            setShowCustomerDropdown(false);
                          }}
                          className="p-2.5 hover:bg-[#FCE8F2] dark:hover:bg-slate-800 cursor-pointer transition flex items-center justify-between text-right"
                        >
                          <div>
                            <div className="text-xs font-bold text-[#25232A] dark:text-white flex items-center gap-1.5">
                              <span>{cName}</span>
                              <span className="text-[10px] font-mono font-normal text-[#8F2A87] bg-[#F2E7F3] dark:bg-purple-950/40 px-1.5 py-0.2 rounded">{cId}</span>
                              {childrenCount > 0 && (
                                <span className="text-[10px] font-normal text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded">👧 {childrenCount} أميرات</span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono mt-0.5">📞 {cPhone} {c.city ? `• ${c.city}` : ''}</div>
                          </div>
                          <div className="text-left shrink-0">
                            <span className="text-[10.5px] text-[#B0005A] font-bold bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800/40 px-2 py-0.5 rounded-lg">اختيار ↵</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. الهاتف الرئيسي */}
              <div>
                <label className={labelCls}>الهاتف الرئيسي (واتساب) <span className="text-[#D64545] font-bold">*</span></label>
                <div className="relative">
                  <input required value={phone} onChange={e => setPhone(e.target.value)} className={inputCls + " pr-11 pl-3 font-mono"} placeholder="" type="tel" dir="ltr" style={{textAlign:'right'}} />
                  {phone && (
                    <a href={`https://wa.me/${String(phone).replace(/^0+/, '967').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" 
                       className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-[#E2F5F7] dark:bg-cyan-950/50 hover:bg-[#009FAE] hover:text-white text-[#007F8C] dark:text-cyan-300 rounded-lg transition border border-[#C5ECF0] dark:border-cyan-800/50" title="مراسلة واتساب">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </a>
                  )}
                </div>
              </div>

              {/* 3. الهاتف البديل */}
              <div>
                <label className={labelCls}>الهاتف الإضافي / البديل</label>
                <input value={phoneAlt} onChange={e => setPhoneAlt(e.target.value)} className={inputCls + " font-mono"} placeholder="" type="tel" dir="ltr" style={{textAlign:'right'}} />
              </div>

              {/* 4. منصة التواصل */}
              <div>
                <label className={labelCls}>منصة التواصل</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} className={inputCls}>
                  {['واتساب (WhatsApp)','انستغرام (Instagram)','فيسبوك (Facebook)','تيك توك (TikTok)','سناب شات (Snapchat)','تليجرام (Telegram)','مباشر / زيارة المعرض'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* 5. المعرف */}
              <div>
                <label className={labelCls}>اسم الحساب / المعرف</label>
                <input value={handle} onChange={e => setHandle(e.target.value)} className={inputCls} placeholder="" dir="ltr" style={{textAlign:'right'}} />
              </div>

              {/* 6. فئة العميل */}
              <div>
                <label className={labelCls}>فئة العميل (CRM Tier)</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                  {['جديد','دائم','VIP'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* 7. المدينة */}
              <div>
                <label className={labelCls}>المدينة / المنطقة</label>
                <input value={city} onChange={e => setCity(e.target.value)} className={inputCls} placeholder="" />
              </div>

              {/* 8. الشارع */}
              <div>
                <label className={labelCls}>الشارع / العنوان التفصيلي</label>
                <input value={street} onChange={e => setStreet(e.target.value)} className={inputCls} placeholder="" />
              </div>

              {/* 9. تاريخ التسجيل */}
              <div>
                <label className={labelCls}>تاريخ التسجيل</label>
                <input type="date" lang="en-GB" dir="ltr" value={regDate} onChange={e => setRegDate(e.target.value)} className={inputCls} />
              </div>

              {/* 10. ملاحظات إضافية */}
              <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <label className={labelCls}>ملاحظات إضافية ومحددات العمل والتفضيلات</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls + " h-auto min-h-[56px] resize-none"} placeholder="" />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#E8E5EA] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveCustomerSubTab('measurements')}
                className="px-6 py-2.5 bg-[#8F2A87] dark:bg-purple-900/60 hover:bg-[#73216C] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>الانتقال لسجل المواصفات والقياسات</span>
                <Icons.ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB 2: سجل المقاسات وبطاقات الأطفال
            ══════════════════════════════════════════ */}
        {activeCustomerSubTab === 'measurements' && (
          <div className="p-6 animate-fadeIn space-y-6">
            {measurements.length === 0 ? (
              <div className="text-center py-16 bg-[#FAFAFB] dark:bg-slate-900/50 border border-dashed border-[#E8E5EA] dark:border-slate-800 rounded-2xl p-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#FCE8F2] dark:bg-rose-950/40 text-[#B0005A] dark:text-rose-300 border border-[#F2A4CB]/50 dark:border-rose-900/50 flex items-center justify-center text-3xl mx-auto shadow-xs">
                  📋
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#25232A] dark:text-slate-100">لا توجد بطاقات مواصفات أو قياسات مضافة بعد</h3>
                  <p className="text-xs text-[#6F6B75] dark:text-slate-400 mt-1">انقر على الزر أدناه لإضافة بطاقة مواصفات ومقاسات فنية للعميل</p>
                </div>
                <button
                  type="button"
                  onClick={addChildCard}
                  className="px-5 py-2.5 bg-[#B0005A] hover:bg-[#8E0049] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-2 mx-auto cursor-pointer"
                >
                  <Icons.Plus className="w-4 h-4" />
                  <span>إضافة بطاقة مواصفات وقياسات جديدة</span>
                </button>
              </div>
            ) : (
              <>
                {/* Children / Specs Tabs / Sub-selector */}
                <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-[#E8E5EA] dark:border-slate-800">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {measurements.map((m, idx) => {
                      const isCur = activeChildIdx === idx;
                      return (
                        <button
                          key={m.id || idx}
                          type="button"
                          onClick={() => setActiveChildIdx(idx)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                            isCur
                              ? 'bg-[#B0005A] text-white border-[#B0005A] shadow-xs'
                              : 'bg-[#FAFAFB] dark:bg-slate-800 text-[#25232A] dark:text-slate-200 border-[#E8E5EA] dark:border-slate-700 hover:bg-[#FCE8F2] dark:hover:bg-slate-700'
                          }`}
                        >
                          <span>{m.child_name || `الأميرة (${idx + 1})`}</span>
                          {m.estimated_age && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded ${isCur ? 'bg-white/20 text-white' : 'bg-[#E2F5F7] dark:bg-cyan-950/60 text-[#007F8C] dark:text-cyan-300'}`}>
                              {m.estimated_age}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* محول وحدة القياس العالمي (إنش / سم) */}
                    <div className="flex items-center bg-[#F2E7F3] dark:bg-purple-950/60 p-1 rounded-xl border border-[#E5CEE7] dark:border-purple-800">
                      <button
                        type="button"
                        onClick={() => currM.unit !== 'إنش' && toggleUnit(activeChildIdx)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          currM.unit === 'إنش'
                            ? 'bg-[#8F2A87] text-white shadow-xs'
                            : 'text-[#8F2A87] hover:bg-white/60 dark:text-purple-300'
                        }`}
                        title="القياس بشريط المازورة بالإنش (بوصة)"
                      >
                        <span>📏 إنش (بوصة ")</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => currM.unit !== 'سم' && toggleUnit(activeChildIdx)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          currM.unit === 'سم'
                            ? 'bg-[#007F8C] text-white shadow-xs'
                            : 'text-[#007F8C] hover:bg-white/60 dark:text-cyan-300'
                        }`}
                        title="القياس بالسنتيمتر (سم)"
                      >
                        <span>📐 سم (سنتيمتر)</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeChildCard(activeChildIdx)}
                      className="h-9 px-3 bg-rose-50 dark:bg-rose-950/30 text-[#D64545] dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      حذف البطاقة
                    </button>
                  </div>
                </div>

                {/* Current Spec Card Content */}
                <div className="space-y-6">
                  {/* 1. Basic Spec Info & Model */}
                  <div className="bg-[#FAFAFB] dark:bg-slate-900/50 p-5 rounded-2xl border border-[#E8E5EA] dark:border-slate-800 space-y-4">
                    <h4 className="text-xs font-bold text-[#25232A] dark:text-slate-100 flex items-center gap-2">
                      <span className="text-[#B0005A]">📋</span> مواصفات الطلب والموديل المعتمد
                    </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* اسم الطفلة / الأميرة مع الربط التلقائي بالمقاسات السابقة */}
                  <div className="relative" ref={childDropdownRef}>
                    <div className="flex justify-between items-center mb-1">
                      <label className={labelCls + " mb-0"}>👧 اسم الطفلة (الأميرة) <span className="text-[#D64545] font-bold">*</span></label>
                      <button
                        type="button"
                        onClick={addChildCard}
                        className="text-[10px] text-[#8F2A87] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                        title="إضافة بطاقة جديدة لطفلة أخرى لنفس العميلة"
                      >
                        <span>+ طفلة أخرى</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        value={currM.child_name}
                        onChange={e => {
                          updateMeasurement(activeChildIdx, 'child_name', e.target.value);
                          setShowChildDropdown(true);
                        }}
                        onFocus={() => setShowChildDropdown(true)}
                        className={inputCls + (knownPrincesses.length > 0 ? " pl-8" : "")}
                        placeholder="مثال: الأميرة هنادي..."
                        autoComplete="off"
                      />
                      {knownPrincesses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowChildDropdown(prev => !prev)}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer p-0.5"
                          tabIndex={-1}
                          title="عرض أميرات العميلة المسجلات"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                      )}
                    </div>

                    {/* قائمة منسدلة بأميرات العميلة المسجلات سابقاً */}
                    {showChildDropdown && knownPrincesses.length > 0 && (
                      <div className="absolute z-40 right-0 left-0 mt-1 bg-white dark:bg-slate-900 border border-[#E8E5EA] dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
                        <div className="p-1.5 text-[9.5px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/60 flex justify-between items-center">
                          <span>👑 أميرات العميلة المسجلات (انقر لتحميل المقاسات فوراً):</span>
                          <button type="button" onClick={() => setShowChildDropdown(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xs px-1">✕</button>
                        </div>
                        {knownPrincesses.map((p, pIdx) => (
                          <div
                            key={pIdx}
                            onClick={() => {
                              setMeasurements(prev => prev.map((m, i) => {
                                if (i !== activeChildIdx) return m;
                                return {
                                  ...m,
                                  child_name: p.child_name,
                                  selected_model: p.selected_model || m.selected_model,
                                  total_height: p.total_height || m.total_height,
                                  dress_length: p.dress_length || m.dress_length,
                                  chest_length: p.chest_length || m.chest_length,
                                  skirt_length: p.skirt_length || m.skirt_length,
                                  sleeve_length: p.sleeve_length || m.sleeve_length,
                                  chest_circ: p.chest_circ || m.chest_circ,
                                  waist_circ: p.waist_circ || m.waist_circ,
                                  shoulder_width: p.shoulder_width || m.shoulder_width,
                                  armhole_circ: p.armhole_circ || m.armhole_circ,
                                  neck_circ: p.neck_circ || m.neck_circ,
                                  comfort_profile: p.comfort_profile || m.comfort_profile,
                                  sewing_notes: p.sewing_notes || m.sewing_notes,
                                  dress_color: p.dress_color || m.dress_color,
                                  meas_date: p.meas_date || m.meas_date,
                                  event_date: p.event_date || m.event_date,
                                  estimated_age: calculateAge(p.dress_length || p.total_height || m.dress_length || m.total_height, p.selected_model || m.selected_model)
                                };
                              }));
                              setShowChildDropdown(false);
                              showToast(`✨ تم ربط مقاسات الأميرة (${p.child_name}) المحفوظة بنجاح، يمكنك تعديلها أو اختيار موديل آخر بكل سهولة!`);
                            }}
                            className="p-2 hover:bg-[#F2E7F3] dark:hover:bg-purple-950/30 cursor-pointer transition flex items-center justify-between text-right"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#8F2A87] dark:text-purple-300">👑 {p.child_name}</span>
                              {p.dress_length && (
                                <span className="text-[10px] text-gray-500 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">طول: {p.dress_length}سم</span>
                              )}
                              {p.selected_model && (
                                <span className="text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">{p.selected_model}</span>
                              )}
                            </div>
                            <span className="text-[9.5px] text-[#8F2A87] font-bold bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/40 px-1.5 py-0.5 rounded">ربط المقاسات ↵</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* أزرار اختيار سريعة (Pills) للأميرات المسجلات */}
                    {knownPrincesses.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {knownPrincesses.map((p, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => {
                              setMeasurements(prev => prev.map((m, i) => {
                                if (i !== activeChildIdx) return m;
                                return {
                                  ...m,
                                  child_name: p.child_name,
                                  selected_model: p.selected_model || m.selected_model,
                                  total_height: p.total_height || m.total_height,
                                  dress_length: p.dress_length || m.dress_length,
                                  chest_length: p.chest_length || m.chest_length,
                                  skirt_length: p.skirt_length || m.skirt_length,
                                  sleeve_length: p.sleeve_length || m.sleeve_length,
                                  chest_circ: p.chest_circ || m.chest_circ,
                                  waist_circ: p.waist_circ || m.waist_circ,
                                  shoulder_width: p.shoulder_width || m.shoulder_width,
                                  armhole_circ: p.armhole_circ || m.armhole_circ,
                                  neck_circ: p.neck_circ || m.neck_circ,
                                  comfort_profile: p.comfort_profile || m.comfort_profile,
                                  sewing_notes: p.sewing_notes || m.sewing_notes,
                                  dress_color: p.dress_color || m.dress_color,
                                  meas_date: p.meas_date || m.meas_date,
                                  event_date: p.event_date || m.event_date,
                                  estimated_age: calculateAge(p.dress_length || p.total_height || m.dress_length || m.total_height, p.selected_model || m.selected_model)
                                };
                              }));
                              showToast(`✨ تم ربط مقاسات الأميرة (${p.child_name}) المحفوظة بنجاح، يمكنك تعديلها أو اختيار موديل آخر بكل سهولة!`);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer ${
                              currM.child_name === p.child_name
                                ? 'bg-[#8F2A87] text-white shadow-xs'
                                : 'bg-[#F2E7F3] dark:bg-purple-950/40 text-[#8F2A87] dark:text-purple-300 hover:bg-[#8F2A87] hover:text-white'
                            }`}
                            title="انقر لربط وتعبئة المقاسات المحفوظة لهذه الطفلة فوراً"
                          >
                            <span>👑 {p.child_name}</span>
                            {p.dress_length && <span className="text-[9px] opacity-80">({p.dress_length}سم)</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>تاريخ أخذ المقاس</label>
                    <input type="date" lang="en-GB" dir="ltr" value={currM.meas_date} onChange={e => updateMeasurement(activeChildIdx,'meas_date',e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>تاريخ المناسبة / التسليم المطلوب</label>
                    <input type="date" lang="en-GB" dir="ltr" value={currM.event_date} onChange={e => updateMeasurement(activeChildIdx,'event_date',e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>اللون المعتمد / الخامة</label>
                    <input type="text" value={currM.dress_color || ''} onChange={e => updateMeasurement(activeChildIdx,'dress_color',e.target.value)} className={inputCls} placeholder="" />
                  </div>
                  <div>
                    <label className={labelCls}>الموديل المعتمد</label>
                    <select value={currM.selected_model || ''} onChange={e => updateMeasurement(activeChildIdx,'selected_model',e.target.value)} className={inputCls}>
                      <option value="">-- اختر الموديل المعتمد --</option>
                      {uniqueModels.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>صورة الموديل المرفقة</label>
                    <div className="flex gap-2 items-center">
                      <input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files[0];
                        if(file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => updateMeasurement(activeChildIdx, 'model_image', ev.target.result);
                          reader.readAsDataURL(file);
                        }
                      }} className="block w-full text-xs text-[#6F6B75] dark:text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#FCE8F2] dark:file:bg-rose-950/80 file:text-[#B0005A] dark:file:text-rose-300 hover:file:bg-[#F8D1E5] border border-[#E8E5EA] dark:border-slate-700 rounded-xl p-1 bg-white dark:bg-slate-800 cursor-pointer h-11" />
                      {currM.model_image && <img src={currM.model_image} alt="معاينة" className="w-11 h-11 object-cover rounded-xl border border-[#E8E5EA] dark:border-slate-700 shadow-2xs" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Longitudinal Measurements */}
              <div className="bg-white dark:bg-[#0f172a] p-5 rounded-2xl border border-[#E8E5EA] dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-bold text-[#25232A] dark:text-slate-100 flex items-center gap-2">
                    <span className="text-[#009FAE]">📐</span> القياسات الطولية الفنية
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#007F8C] dark:text-cyan-300 bg-[#E2F5F7] dark:bg-cyan-950/50 px-2.5 py-0.5 rounded-md border border-[#C5ECF0] dark:border-cyan-800/50">
                      الوحدة الحالية: {currM.unit === 'إنش' ? 'إنش (بوصة ")' : 'سم (سنتيمتر)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleUnit(activeChildIdx)}
                      className="text-[11px] font-bold text-[#8F2A87] dark:text-purple-300 hover:bg-[#F2E7F3] dark:hover:bg-purple-950/40 px-2 py-0.5 rounded-md border border-[#E5CEE7] dark:border-purple-800 transition cursor-pointer"
                    >
                      تحويل إلى ({currM.unit === 'إنش' ? 'سم' : 'إنش'}) 🔄
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[
                    ['total_height','الطول الكلي'],
                    ['dress_length','طول القطعة / الفستان'],
                    ['chest_length','طول الصدر'],
                    ['skirt_length','طول التنورة / السفلي'],
                    ['sleeve_length','طول الكم']
                  ].map(([field, lbl]) => (
                    <div key={field} className="bg-[#FAFAFB] dark:bg-slate-900/60 p-3 rounded-xl border border-[#E8E5EA] dark:border-slate-800 transition hover:border-[#B0005A]/40">
                      <label className="block text-[11px] font-semibold text-[#6F6B75] dark:text-slate-400 mb-1.5 text-center truncate">
                        {lbl} ({currM.unit})
                      </label>
                      <input 
                        type="number" 
                        step="0.1" 
                        value={currM[field]} 
                        onChange={e => updateMeasurement(activeChildIdx,field,e.target.value)} 
                        className="w-full h-10 px-2 text-center font-bold text-sm text-[#25232A] dark:text-slate-100 bg-white dark:bg-slate-800 border border-[#E8E5EA] dark:border-slate-700 rounded-lg focus:border-[#B0005A] dark:focus:border-rose-500 outline-none transition" 
                        placeholder="—" 
                      />
                      {currM[field] !== '' && !isNaN(parseFloat(currM[field])) && parseFloat(currM[field]) > 0 && (
                        <span className="block text-[10.5px] text-center font-mono font-bold text-[#007F8C] dark:text-cyan-400 mt-1 bg-white/80 dark:bg-slate-800/80 rounded py-0.5 border border-[#E8E5EA] dark:border-slate-700 shadow-2xs">
                          ≈ {currM.unit === 'إنش' 
                              ? (parseFloat(currM[field]) * 2.54).toFixed(1) + ' سم' 
                              : (parseFloat(currM[field]) / 2.54).toFixed(1) + ' "'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Circumference Measurements */}
              <div className="bg-white dark:bg-[#0f172a] p-5 rounded-2xl border border-[#E8E5EA] dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-bold text-[#25232A] dark:text-slate-100 flex items-center gap-2">
                    <span className="text-[#8F2A87]">🔄</span> القياسات المحيطية والعرضية
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#8F2A87] dark:text-purple-300 bg-[#F2E7F3] dark:bg-purple-950/50 px-2.5 py-0.5 rounded-md border border-[#E5CEE7] dark:border-purple-800/50">
                      الوحدة الحالية: {currM.unit === 'إنش' ? 'إنش (بوصة ")' : 'سم (سنتيمتر)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleUnit(activeChildIdx)}
                      className="text-[11px] font-bold text-[#8F2A87] dark:text-purple-300 hover:bg-[#F2E7F3] dark:hover:bg-purple-950/40 px-2 py-0.5 rounded-md border border-[#E5CEE7] dark:border-purple-800 transition cursor-pointer"
                    >
                      تحويل إلى ({currM.unit === 'إنش' ? 'سم' : 'إنش'}) 🔄
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[
                    ['chest_circ','محيط الصدر (Chest)'],
                    ['waist_circ','محيط الخصر (Waist)'],
                    ['shoulder_width','عرض الكتفين (Shoulder)'],
                    ['armhole_circ','محيط الإبط (Armhole)'],
                    ['neck_circ','محيط الرقبة (Neck)']
                  ].map(([field, lbl]) => (
                    <div key={field} className="bg-[#FAFAFB] dark:bg-slate-900/60 p-3 rounded-xl border border-[#E8E5EA] dark:border-slate-800 transition hover:border-[#8F2A87]/40">
                      <label className="block text-[11px] font-semibold text-[#6F6B75] dark:text-slate-400 mb-1.5 text-center truncate">
                        {lbl} ({currM.unit})
                      </label>
                      <input 
                        type="number" 
                        step="0.1" 
                        value={currM[field]} 
                        onChange={e => updateMeasurement(activeChildIdx,field,e.target.value)} 
                        className="w-full h-10 px-2 text-center font-bold text-sm text-[#25232A] dark:text-slate-100 bg-white dark:bg-slate-800 border border-[#E8E5EA] dark:border-slate-700 rounded-lg focus:border-[#8F2A87] outline-none transition" 
                        placeholder="—" 
                      />
                      {currM[field] !== '' && !isNaN(parseFloat(currM[field])) && parseFloat(currM[field]) > 0 && (
                        <span className="block text-[10.5px] text-center font-mono font-bold text-[#8F2A87] dark:text-purple-300 mt-1 bg-white/80 dark:bg-slate-800/80 rounded py-0.5 border border-[#E8E5EA] dark:border-slate-700 shadow-2xs">
                          ≈ {currM.unit === 'إنش' 
                              ? (parseFloat(currM[field]) * 2.54).toFixed(1) + ' سم' 
                              : (parseFloat(currM[field]) / 2.54).toFixed(1) + ' "'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Comfort Preferences & Tailoring Directives */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#FAFAFB] dark:bg-slate-900/50 border border-[#E8E5EA] dark:border-slate-800 rounded-2xl p-4.5">
                  <label className="block text-xs font-bold text-[#25232A] dark:text-slate-100 mb-3 flex items-center gap-1.5">
                    <span className="text-[#F28A00]">✨</span> تفضيلات الراحة والأقمشة (اختيار متعدد)
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {['حساسية من التل', 'بطانة قطن ناعم', 'فتحة سحاب مخفي', 'كشكشة مضاعفة'].map(pref => {
                      const isChecked = (currM.comfort_profile || []).includes(pref);
                      return (
                        <label key={pref} className={`flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          isChecked ? 'bg-[#FCE8F2] dark:bg-rose-950/40 border-[#B0005A] dark:border-rose-600 text-[#B0005A] dark:text-rose-300' : 'bg-white dark:bg-slate-800 border-[#E8E5EA] dark:border-slate-700 text-[#25232A] dark:text-slate-200 hover:bg-[#FAFAFB] dark:hover:bg-slate-700'
                        }`}>
                          <input type="checkbox" className="rounded text-[#B0005A] focus:ring-[#B0005A] w-4 h-4 accent-[#B0005A] cursor-pointer" 
                            checked={isChecked}
                            onChange={(e) => {
                              const current = currM.comfort_profile || [];
                              const updated = e.target.checked ? [...current, pref] : current.filter(p => p !== pref);
                              updateMeasurement(activeChildIdx, 'comfort_profile', updated);
                            }}
                          />
                          <span className="text-[11.5px] truncate">{pref}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#FAFAFB] dark:bg-slate-900/50 border border-[#E8E5EA] dark:border-slate-800 rounded-2xl p-4.5 flex flex-col">
                  <label className="block text-xs font-bold text-[#25232A] dark:text-slate-100 mb-2 flex items-center gap-1.5">
                    <span className="text-[#8F2A87]">🧵</span> تعليمات وتوجيهات التشغيل والقص
                  </label>
                  <textarea 
                    className={inputCls + " flex-1 h-auto min-h-[70px] resize-none"} 
                    placeholder="أي ملاحظات دقيقة خاصة بالمعمل أو طريقة القص، التطريز، والتبطين..." 
                    value={currM.sewing_notes || ''} 
                    onChange={e => updateMeasurement(activeChildIdx, 'sewing_notes', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              {/* 5. Auto Model & BOM Summary Box */}
              <div className="bg-gradient-to-r from-[#FCE8F2]/60 via-[#F2E7F3]/40 to-[#E2F5F7]/60 dark:from-rose-950/30 dark:via-purple-950/20 dark:to-cyan-950/30 border border-[#E8E5EA] dark:border-slate-800 rounded-2xl p-4.5 flex flex-col items-center justify-center text-center gap-2">
                {(() => {
                  const match = getSmartModelMatch(currM, products);
                  if (match) {
                    return (
                      <>
                        <div className="flex items-center gap-3 flex-wrap justify-center text-xs font-bold text-[#25232A] dark:text-slate-100">
                          <span className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-[#E8E5EA] dark:border-slate-700 shadow-2xs">📦 الموديل: <strong className="text-[#B0005A] dark:text-rose-400">{match.modelName}</strong></span>
                          <span>•</span>
                          <span className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-[#E8E5EA] dark:border-slate-700 shadow-2xs">الفئة المقدرة: <strong className="text-[#8F2A87] dark:text-purple-300">{match.ageLabel}</strong></span>
                          <span>•</span>
                          <span className="bg-[#E2F5F7] dark:bg-cyan-950/50 text-[#007F8C] dark:text-cyan-300 px-3 py-1.5 rounded-xl border border-[#C5ECF0] dark:border-cyan-800/50 shadow-2xs">السعر المعتمد تلقائياً: <strong className="font-mono text-sm">{match.price.toLocaleString()} {currency.display}</strong></span>
                        </div>
                        {match.fabricMeters > 0 && (
                          <span className="text-xs text-[#6F6B75] dark:text-slate-400 font-medium">
                            أمتار الأقمشة والمواد المقدرة ({match.broadBracket}): <strong className="text-[#007F8C] dark:text-cyan-400 font-mono">{match.fabricMeters} متر</strong>
                          </span>
                        )}
                        {match.jumboFactor > 1 && (
                          <div className="text-xs font-semibold text-[#C97300] dark:text-amber-300 bg-[#FFF1DC] dark:bg-amber-950/40 px-3 py-1 rounded-lg border border-[#FFE4B9] dark:border-amber-800/50 mt-1 shadow-2xs">
                            ⚠️ تم تطبيق معامل استهلاك إضافي ({match.jumboFactor.toFixed(2)}x) لضبط استهلاك المواد والتكلفة بناءً على مقاسات الصدر
                          </div>
                        )}
                      </>
                    );
                  } else {
                    return (
                      <span className="text-xs text-[#6F6B75] dark:text-slate-400 font-medium">
                        💡 اختر الموديل المعتمد وطول القطعة أو الطول الكلي لحساب الفئة العمرية، السعر، والأمتار آلياً
                      </span>
                    );
                  }
                })()}
              </div>
            </div>
            </>
            )}

            <div className="flex justify-between pt-4 border-t border-[#E8E5EA] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveCustomerSubTab('crm')}
                className="px-5 py-2 bg-white dark:bg-slate-800 hover:bg-[#FAFAFB] dark:hover:bg-slate-700 text-[#6F6B75] dark:text-slate-300 border border-[#E8E5EA] dark:border-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                السابق (بيانات العميل)
              </button>
              <button
                type="button"
                onClick={() => setActiveCustomerSubTab('ledger')}
                className="px-6 py-2.5 bg-[#009FAE] hover:bg-[#007F8C] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>الانتقال لكشف الحساب والدفعات</span>
                <Icons.ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB 3: كشف الحساب والمدفوعات (Ledger)
            ══════════════════════════════════════════ */}
        {activeCustomerSubTab === 'ledger' && (
          <div className="p-6 animate-fadeIn space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className={labelCls}>إجمالي المبيعات</label>
                <input type="number" step="0.01" value={totalSales} onChange={e => setTotalSales(e.target.value)} className={inputCls + " font-mono font-bold text-center"} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>إجمالي المدفوعات</label>
                <input type="number" step="0.01" value={totalPaid} onChange={e => setTotalPaid(e.target.value)} className={inputCls + " font-mono font-bold text-center"} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>العربون المدفوع</label>
                <input type="number" step="0.01" value={deposit} onChange={e => setDeposit(e.target.value)} className={inputCls + " font-mono font-bold text-center"} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>كلفة التوصيل</label>
                <input type="number" step="0.01" value={delivery} onChange={e => setDelivery(e.target.value)} className={inputCls + " font-mono font-bold text-center"} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>المبلغ المتبقي (آلي)</label>
                <div className={`w-full h-11 px-3 rounded-xl border font-mono font-bold text-xs flex items-center justify-center shadow-2xs ${
                  parseFloat(remaining) > 0 
                    ? 'bg-[#FFF1DC] dark:bg-amber-950/40 border-[#FFE4B9] dark:border-amber-800/50 text-[#C97300] dark:text-amber-300' 
                    : 'bg-[#E2F5F7] dark:bg-cyan-950/40 border-[#C5ECF0] dark:border-cyan-800/50 text-[#007F8C] dark:text-cyan-300'
                }`}>
                  {remaining} {currency.display} {parseFloat(remaining) <= 0 ? '(مسدد بالكامل ✅)' : ''}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#E8E5EA] dark:border-slate-800">
              <div>
                <label className={labelCls}>طريقة الدفع</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className={inputCls}>
                  {['نقد (كاش)','حوالة بنكية','آجل (على الحساب)','تحويل إلكتروني'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>📎 إرفاق صورة السند / الإيصال المالي</label>
                <input type="file" accept="image/*" onChange={handleReceiptChange}
                  className="w-full h-11 p-1 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-[#25232A] dark:text-slate-200 cursor-pointer file:mr-2 file:text-xs file:font-bold file:text-[#B0005A] dark:file:text-rose-300 file:bg-[#FCE8F2] dark:file:bg-rose-950 file:border-0 file:rounded-lg file:px-3 file:py-1.5 hover:file:bg-[#F8D1E5]" />
                {receiptPreview && (
                  <div className="mt-2.5 flex items-center gap-3 p-3 bg-[#E2F5F7] dark:bg-cyan-950/40 rounded-xl border border-[#C5ECF0] dark:border-cyan-800/50">
                    <img src={receiptPreview} alt="معاينة السند" className="w-12 h-12 object-cover rounded-xl border border-[#C5ECF0] dark:border-cyan-800/50 shadow-2xs" />
                    <div className="text-xs text-[#25232A] dark:text-slate-100 flex-1 flex items-center justify-between">
                      <span className="text-[#007F8C] dark:text-cyan-300 font-bold">✅ تم إرفاق صورة السند بنجاح</span>
                      <button type="button" onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                        className="text-[#D64545] hover:underline text-xs font-bold cursor-pointer">إزالة الصورة</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-[#E8E5EA] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveCustomerSubTab('measurements')}
                className="px-5 py-2 bg-white dark:bg-slate-800 hover:bg-[#FAFAFB] dark:hover:bg-slate-700 text-[#6F6B75] dark:text-slate-300 border border-[#E8E5EA] dark:border-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                السابق (المواصفات)
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-2.5 bg-[#B0005A] hover:bg-[#8E0049] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                {loading ? 'جاري الحفظ...' : 'حفظ وتوثيق ملف العميل بالكامل 💾'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB 4: سجل العملاء المعتمدين (Directory Table)
            ══════════════════════════════════════════ */}
        {activeCustomerSubTab === 'directory' && (
          <div className="p-6 animate-fadeIn space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#25232A] dark:text-slate-200">إجمالي العملاء المسجلين:</span>
                <span className="text-xs bg-[#FCE8F2] dark:bg-rose-950/40 text-[#B0005A] dark:text-rose-300 font-bold px-2 py-0.5 rounded-md font-mono">{filtered.length}</span>
              </div>
              <div className="relative">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-3 pr-8 h-10 rounded-xl border border-[#E8E5EA] dark:border-slate-700 bg-[#FAFAFB] dark:bg-slate-900 text-xs font-medium text-[#25232A] dark:text-slate-100 w-72 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-[#B0005A] focus:ring-2 focus:ring-[#FCE8F2] dark:focus:ring-rose-950 transition-all"
                  placeholder="بحث بالاسم، رقم الهاتف، أو الكود..." />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] text-xs pointer-events-none">🔍</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E8E5EA] dark:border-slate-800 shadow-xs">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-[#6F6B75] dark:text-slate-400 text-xs font-medium">
                  لا يوجد عملاء مسجلون يطابقون البحث 👤
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#FAFAFB] dark:bg-slate-900/80 text-[#6F6B75] dark:text-slate-400 font-semibold border-b border-[#E8E5EA] dark:border-slate-800">
                      {['الكود','اسم العميل','الهاتف','المنصة','المدينة','الفئة','التسجيل','المواصفات','المتبقي','الإجراءات'].map(h => (
                        <th key={h} className="px-4 py-3 text-right whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E5EA] dark:divide-slate-800/70 bg-white dark:bg-[#0f172a]">
                    {filtered.map((c, i) => {
                      const rem = parseFloat(c.ledger?.remaining) || 0;
                      return (
                        <tr key={c.id || c.customer_id || i} className="hover:bg-[#FAFAFB] dark:hover:bg-slate-800/60 transition-colors">
                          <td className="px-4 py-3 font-mono text-[11.5px] text-[#B0005A] dark:text-rose-400 font-bold whitespace-nowrap">{c.customer_id || c.id || `CUST-${i+1001}`}</td>
                          <td className="px-4 py-3 font-bold text-[#25232A] dark:text-slate-100 whitespace-nowrap">{c.name || '—'}</td>
                          <td className="px-4 py-3 font-mono text-[#6F6B75] dark:text-slate-400 whitespace-nowrap" dir="ltr" style={{textAlign:'right'}}>{c.phone || '—'}</td>
                          <td className="px-4 py-3 text-[#6F6B75] dark:text-slate-400 whitespace-nowrap">{c.platform ? c.platform.split(' ')[0] : '—'}</td>
                          <td className="px-4 py-3 text-[#6F6B75] dark:text-slate-400 whitespace-nowrap">{c.city || c.address || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-[10.5px] font-semibold px-2.5 py-0.5 rounded-md border ${catColor(c.category)}`}>{c.category || 'جديد'}</span>
                          </td>
                          <td className="px-4 py-3 text-[#6F6B75] dark:text-slate-400 font-mono whitespace-nowrap">{formatCleanDate(c.reg_date || c.created_at)}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {c.measurements && c.measurements.length > 0 ? (
                              <div className="flex flex-col gap-1.5 items-start">
                                {c.measurements.map((m, idx) => {
                                  const isStale = m.meas_date ? isMeasurementStale(m.meas_date) : false;
                                  const model = m.model_name || m.selected_model || '';
                                  const dressLen = m.dress_len || m.dress_length || '';
                                  const chestCirc = m.chest_circ || '';
                                  const waistCirc = m.waist_circ || '';
                                  return (
                                    <div key={idx} className="bg-[#FAFAFB] dark:bg-slate-800 px-2 py-1 rounded-md border border-[#E8E5EA] dark:border-slate-700 min-w-[130px] max-w-[200px]">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-[#8F2A87] dark:text-purple-300 text-[11px] truncate">
                                          👧 {m.child_name || 'الأميرة'}
                                        </span>
                                        {isStale ? (
                                          <span title="المقاس قديم (+90 يوم)" className="text-[9px] bg-rose-100 text-rose-600 px-1 rounded">قديم</span>
                                        ) : (
                                          <span title="المقاس معتمد" className="text-[9px] text-emerald-600 font-bold">✓</span>
                                        )}
                                      </div>
                                      {model && (
                                        <div className="text-[10px] text-[#25232A] dark:text-slate-200 font-medium truncate mt-0.5" title={model}>
                                          👗 {model}
                                        </div>
                                      )}
                                      <div className="text-[9.5px] text-[#6F6B75] dark:text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                                        {dressLen ? <span>طول:<strong className="text-[#007F8C]">{dressLen}</strong></span> : null}
                                        {chestCirc ? <span>صدر:<strong className="text-[#007F8C]">{chestCirc}</strong></span> : null}
                                        {waistCirc ? <span>خصر:<strong className="text-[#007F8C]">{waistCirc}</strong></span> : null}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (c.children && c.children.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {c.children.map((ch, idx) => (
                                  <span key={idx} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-[#6F6B75] px-1.5 py-0.5 rounded border border-slate-200">
                                    👧 {ch.child_name || 'الأميرة'} (بانتظار القياس)
                                  </span>
                                ))}
                              </div>
                            ) : '—')}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md border ${
                              rem > 0 ? 'bg-[#FFF1DC] dark:bg-amber-950/40 text-[#C97300] dark:text-amber-300 border-[#FFE4B9] dark:border-amber-800/50' : 'bg-[#E2F5F7] dark:bg-cyan-950/40 text-[#007F8C] dark:text-cyan-300 border-[#C5ECF0] dark:border-cyan-800/50'
                            }`}>
                              {rem > 0 ? `${rem} ${currency.display}` : 'مسدد ✅'}
                            </span>
                          </td>
                          <td className="px-4 py-3 flex items-center gap-1.5 justify-center whitespace-nowrap">
                            <button onClick={() => loadCustomerForEdit(c)} title="فتح وتعديل ملف العميل" 
                              className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#F2E7F3] dark:hover:bg-slate-700 text-[#6F6B75] dark:text-slate-300 hover:text-[#8F2A87] dark:hover:text-purple-300 border border-[#E8E5EA] dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer">
                              <Icons.Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => {
                              if (typeof onSendToFactory === 'function') {
                                const latestMeas = (c.measurements && c.measurements.length > 0) ? c.measurements[0] : null;
                                onSendToFactory({
                                  customer_id: c.customer_id || c.id,
                                  customer: c.name || c.customer_name,
                                  customer_name: c.name || c.customer_name,
                                  child_name: latestMeas?.child_name || (c.children?.[0]?.child_name || 'هنادي'),
                                  product: latestMeas?.selected_model || latestMeas?.model_name || 'فستان سندرلا',
                                  product_name: latestMeas?.selected_model || latestMeas?.model_name || 'فستان سندرلا',
                                  measurements: latestMeas,
                                  quantity: 1,
                                  notes: `أمر تشغيل صادر من سجل العملاء - العميل: ${c.name}`
                                });
                                showToast(`تم نقل بيانات (${c.name}) إلى خطوط التصنيع ✂️🧵`, 'success');
                              }
                            }} title="إصدار أمر تصنيع وتشغيل في المعمل" 
                              className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#F2E7F3] dark:hover:bg-slate-700 text-[#8F2A87] dark:text-purple-300 border border-[#E5CEE7] dark:border-purple-800/50 transition-all flex items-center justify-center cursor-pointer">
                              <Icons.Scissors className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setSelectedInvoice(c)} title="طباعة فاتورة مالية (PDF)" 
                              className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#FCE8F2] dark:hover:bg-slate-700 text-[#6F6B75] dark:text-slate-300 hover:text-[#B0005A] dark:hover:text-rose-300 border border-[#E8E5EA] dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer">
                              <Icons.Vouchers className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setSelectedJobCard(c)} title="بطاقة المعمل والقص (Job Card)" 
                              className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#F2E7F3] dark:hover:bg-slate-700 text-[#6F6B75] dark:text-slate-300 hover:text-[#8F2A87] dark:hover:text-purple-300 border border-[#E8E5EA] dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer">
                              <Icons.Factory className="w-3.5 h-3.5" />
                            </button>
                            <a href={`https://wa.me/${String(c.phone||'').replace(/^0+/, '967').replace(/\D/g,'')}?text=${encodeURIComponent('مرحباً ' + c.name + '، إليك كشف الحساب الخاص بك من ' + ((typeof window !== 'undefined' && window.BrandService) ? window.BrandService.getProfile().name : 'إدارة الحسابات') + '.')}`} 
                              target="_blank" rel="noopener noreferrer" title="إرسال كشف واتساب" 
                              className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#E2F5F7] dark:hover:bg-slate-700 text-[#6F6B75] dark:text-slate-300 hover:text-[#007F8C] dark:hover:text-cyan-300 border border-[#E8E5EA] dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* مودال الطباعة الحرارية وبطاقة المعمل الموحد */}
      {selectedInvoice && typeof PrintModal !== 'undefined' && (
        <PrintModal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          customer={selectedInvoice}
          order={{
            order_no: selectedInvoice.latest_order_no || `INV-${selectedInvoice.customer_id || selectedInvoice.id}`,
            customer_name: selectedInvoice.name,
            child_name: selectedInvoice.measurements?.[0]?.child_name || 'الأميرة',
            phone: selectedInvoice.phone,
            total: parseFloat(selectedInvoice.ledger?.total_sales || selectedInvoice.total_sales || 0),
            paid: parseFloat(selectedInvoice.ledger?.deposit || selectedInvoice.ledger?.total_paid || selectedInvoice.deposit || selectedInvoice.total_paid || 0),
            remaining: parseFloat(selectedInvoice.ledger?.remaining !== undefined ? selectedInvoice.ledger.remaining : (selectedInvoice.remaining || Math.max(0, (selectedInvoice.total_sales || 0) - (selectedInvoice.deposit || 0)))),
            currency: currency?.display || 'YER ﷼',
            delivery_date: selectedInvoice.measurements?.[0]?.event_date || 'يحدد لاحقاً',
            items: (selectedInvoice.measurements && selectedInvoice.measurements.length > 0)
              ? selectedInvoice.measurements.map((m, idx) => ({
                  id: m.id || idx,
                  name: m.model_name || m.selected_model || 'تفصيل فستان فاخر',
                  product_name: m.model_name || m.selected_model || 'تفصيل فستان فاخر',
                  qty: 1,
                  price: parseFloat(m.adjusted_price || selectedInvoice.ledger?.total_sales || selectedInvoice.total_sales || 0),
                  total_price: parseFloat(m.adjusted_price || selectedInvoice.ledger?.total_sales || selectedInvoice.total_sales || 0)
                }))
              : [{
                  name: 'تفصيل فستان فاخر',
                  product_name: 'تفصيل فستان فاخر',
                  qty: 1,
                  price: parseFloat(selectedInvoice.ledger?.total_sales || selectedInvoice.total_sales || 0),
                  total_price: parseFloat(selectedInvoice.ledger?.total_sales || selectedInvoice.total_sales || 0)
                }]
          }}
          measurements={selectedInvoice.measurements?.[0] || {}}
          product={products?.find(p => p.name === (selectedInvoice.measurements?.[0]?.model_name || selectedInvoice.measurements?.[0]?.selected_model) || p.model_name === (selectedInvoice.measurements?.[0]?.model_name || selectedInvoice.measurements?.[0]?.selected_model))}
          products={products}
          defaultTemplate="thermal"
        />
      )}

      {selectedJobCard && typeof PrintModal !== 'undefined' && (
        <PrintModal
          isOpen={!!selectedJobCard}
          onClose={() => setSelectedJobCard(null)}
          customer={selectedJobCard}
          order={{
            order_no: `JOB-${selectedJobCard.customer_id || selectedJobCard.id}`,
            customer_name: selectedJobCard.name,
            phone: selectedJobCard.phone,
            product_name: selectedJobCard.measurements?.[0]?.model_name || selectedJobCard.measurements?.[0]?.selected_model || 'تفصيل مخصص',
            child_name: selectedJobCard.measurements?.[0]?.child_name || 'الأميرة',
            delivery_date: selectedJobCard.measurements?.[0]?.event_date || 'يحدد لاحقاً',
            currency: currency?.display || 'YER ﷼'
          }}
          measurements={selectedJobCard.measurements?.[0] || {}}
          product={products?.find(p => p.name === (selectedJobCard.measurements?.[0]?.model_name || selectedJobCard.measurements?.[0]?.selected_model) || p.model_name === (selectedJobCard.measurements?.[0]?.model_name || selectedJobCard.measurements?.[0]?.selected_model))}
          products={products}
          defaultTemplate="job_ticket"
        />
      )}
    </div>
  );
}
