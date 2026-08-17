const { useState, useEffect, useMemo, useCallback, useRef } = React;
// ============================================================
// Customers.jsx - قسم العملاء والمقاسات والحسابات
// Three integrated sections: Info + Measurements + Ledger
// ============================================================

// ── مساعد: هل المقاس قديم (مر عليه أكثر من 90 يوماً)؟ ──
function isMeasurementStale(measDate) {
  if (!measDate) return false;
  try {
    const d = new Date(measDate);
    const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 90;
  } catch { return false; }
}

function Customers({ customers = [], setCustomers, products = [], showToast }) {

  // ── توليد Customer ID تلقائياً ──
  const genCustId = () => {
    const lastNum = (customers || []).reduce((acc, c) => {
      const match = String(c.customer_id || '').match(/CUST-(\d+)/);
      return match ? Math.max(acc, parseInt(match[1])) : acc;
    }, 1000);
    return `CUST-${lastNum + 1}`;
  };

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

  const [measurements, setMeasurements] = useState([emptyMeasurement()]);

  const addChildCard = () => {
    setMeasurements(prev => [...prev, emptyMeasurement()]);
    showToast('تمت إضافة بطاقة طفلة جديدة ➕');
  };

  const removeChildCard = (idx) => {
    if (measurements.length <= 1) return showToast('يجب أن تبقى بطاقة مقاس واحدة على الأقل ⚠️', 'error');
    setMeasurements(prev => prev.filter((_, i) => i !== idx));
  };

  const calculateAge = (length, selectedModelName) => {
    if (!length) return '';
    const l = parseFloat(length);
    if (isNaN(l)) return '';

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

  const updateMeasurement = (idx, field, value) => {
    setMeasurements(prev => prev.map((m, i) => {
      if (i === idx) {
        const updated = { ...m, [field]: value };
        if (field === 'dress_length' || field === 'selected_model') {
          updated.estimated_age = calculateAge(updated.dress_length, updated.selected_model);
        }
        return updated;
      }
      return m;
    }));
  };

  // تحويل وحدة القياس (سم ↔ إنش)
  const toggleUnit = (idx) => {
    const m = measurements[idx];
    const factor = m.unit === 'سم' ? (1 / 2.54) : 2.54;
    const fields = ['total_height','dress_length','chest_length','skirt_length','sleeve_length','chest_circ','waist_circ','shoulder_width','armhole_circ','neck_circ'];
    const updated = { ...m, unit: m.unit === 'سم' ? 'إنش' : 'سم' };
    fields.forEach(f => {
      if (m[f] !== '' && !isNaN(parseFloat(m[f]))) {
        updated[f] = (parseFloat(m[f]) * factor).toFixed(1);
      }
    });
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

  // ── حساب إجمالي المبيعات تلقائياً ──
  useEffect(() => {
    let sum = 0;
    measurements.forEach(m => {
      const selMod = m.selected_model;
      const len = m.dress_length;
      const estAge = m.estimated_age;
      
      if (selMod && len) {
        const productData = (products || []).find(p => p.name === selMod);
        let price = productData ? parseFloat(productData.sell_price) || 0 : 0;
        
        const bracket = getBroadBracket(estAge);
        if (productData && productData.price_matrix && productData.price_matrix[bracket]) {
            price = parseFloat(productData.price_matrix[bracket]);
        }
        
        const jumbo = getJumboFactor(m);
        if (jumbo.factor > 1) {
          price = (price * jumbo.factor);
        }
        sum += price;
      }
    });
    
    if (sum !== autoCalculatedSum) {
       setAutoCalculatedSum(sum);
       if (sum > 0) setTotalSales(sum.toFixed(1));
       else setTotalSales('');
    }
  }, [measurements, products, autoCalculatedSum]);

  const remaining = (() => {
    const s = Number(totalSales) || 0;
    const c = Number(delivery) || 0;
    const d = Number(deposit) || 0;
    return (s + c) > 0 ? ((s + c) - d).toFixed(2) : '';
  })();

  const handleReceiptChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setReceiptFile(ev.target.result); // base64
      setReceiptPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  // ── حالة الحفظ وعرض السجلات ──
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedJobCard, setSelectedJobCard] = useState(null);

  // ── دالة الحفظ الرئيسية ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return showToast('اسم العميلة مطلوب ⚠️', 'error');
    if (!phone.trim()) return showToast('رقم الهاتف مطلوب ⚠️', 'error');
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
        const j = getJumboFactor(m);
        const pData = (products || []).find(p => p.name === m.selected_model);
        
        let fabric_deductions = [];
        let baseMetersSum = 0;
        let baseCostSum = 0;
        
        if (pData && pData.bom) {
           const bracket = getBroadBracket(m.estimated_age);
           fabric_deductions = pData.bom.map(fab => {
             const br = fab.brackets || {};
             const meters = br[bracket] || 0;
             const adjMeters = parseFloat((j.factor > 1 ? meters * j.factor : meters).toFixed(2));
             
             baseMetersSum += meters;
             baseCostSum += (meters * fab.unit_cost);
             
             return {
               fabric_name: fab.fabric_name,
               meters: adjMeters
             };
           });
        }
        
        const adjMeters = j.factor > 1 ? (baseMetersSum * j.factor).toFixed(2) : baseMetersSum.toFixed(2);
        let basePrice = pData ? parseFloat(pData.sell_price) || 0 : 0;
        if (pData && pData.price_matrix) {
            const bracket = getBroadBracket(m.estimated_age);
            basePrice = parseFloat(pData.price_matrix[bracket] || basePrice);
        }
        const adjPrice = j.factor > 1 ? (basePrice * j.factor).toFixed(2) : basePrice.toFixed(2);

        return {
          ...m,
          child_name: m.child_name.trim() || 'طفلة ' + (idx + 1),
          jumbo_factor: j.factor.toFixed(2),
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
      const response = await callGAS('addCustomer', payload);
      const newRecord = (response && response.data) ? response.data : { ...payload, id: custId };
      if (setCustomers) setCustomers(prev => [newRecord, ...(prev || [])]);
      
      // -- الترحيل التلقائي إلى القيود اليومية (Synergy) --
      if (payload.ledger.total_sales > 0) {
        callGAS('addJournalEntry', {
          id: Date.now(), entry_no: 'AUTOSALES-' + custId, debit: '1100', credit: '4100', amount: payload.ledger.total_sales, currency: 'USD $', date: TODAY_STR_ISO, notes: `قيد آلي: مبيعات العميل ${name.trim()}`
        }).catch(e => console.log('Journal Sync Failed', e));
      }
      if (payload.ledger.deposit > 0) {
        callGAS('addJournalEntry', {
          id: Date.now() + 1, entry_no: 'AUTODEP-' + custId, debit: '1000', credit: '1100', amount: payload.ledger.deposit, currency: 'USD $', date: TODAY_STR_ISO, notes: `قيد آلي: استلام عربون من ${name.trim()}`
        }).catch(e => console.log('Journal Sync Failed', e));
      }

      // ارسال بيانات تفصيلية للأمتار المخصومة إلى الورشة والطلبات والمخزون
      for (const m of payload.measurements) {
        if (m.selected_model) {
          const notesText = m.jumbo_factor > 1 
            ? `أمتار القص المخصومة (جامبو):\n` + (m.fabric_deductions||[]).map(f => `${f.fabric_name}: ${f.meters}م`).join('\n') 
            : `أمتار القص:\n` + (m.fabric_deductions||[]).map(f => `${f.fabric_name}: ${f.meters}م`).join('\n');
          
          fetch('/api/gas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
              action: 'addOrder',
              customer_name: payload.name,
              product_name: m.selected_model,
              qty: 1,
              total: m.adjusted_price,
              notes: notesText
            })
          }).catch(console.error);

          fetch('/api/gas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
              action: 'updateFactory',
              order_no: custId,
              customer_name: payload.name,
              product_name: m.selected_model,
              stage: 'مرحلة القص ✂️',
              notes: notesText
            })
          }).catch(console.error);

          // Automatic Deduct Engine for Inventory
          if (m.fabric_deductions && m.fabric_deductions.length > 0) {
            m.fabric_deductions.forEach((item, index) => {
              if (item.meters > 0) {
                callGAS('addInventory', { 
                  id: Date.now() + 2 + index, 
                  item_name: `${item.fabric_name} (منصرف آلي للعميل - ${custId})`, 
                  category: 'أقمشة', 
                  qty: -item.meters, 
                  cost: 0, 
                  currency: 'USD $', 
                  supply_date: TODAY_STR_ISO 
                }).catch(e=>e);
              }
            });
          }
        }
      }
      
      showToast(`✅ تم حفظ بيانات ${name} سحابياً في Google Sheets 👑`);

    } catch (err) {
      console.error(err);
      const localRecord = { ...payload, id: custId };
      if (setCustomers) setCustomers(prev => [localRecord, ...(prev || [])]);
      showToast('تم الحفظ محلياً ⚡ — يُرجى مراجعة الاتصال', 'warning');
    } finally {
      setLoading(false);
      // إعادة تهيئة النموذج
      setName(''); setPhone(''); setPhoneAlt(''); setHandle('');
      setCity(''); setStreet(''); setNotes('');
      setTotalSales(''); setTotalPaid(''); setDeposit(''); setDelivery('');
      setReceiptFile(null); setReceiptPreview(null);
      setMeasurements([emptyMeasurement()]);
      setCustId(genCustId());
    }
  };

  // ── فلترة قائمة العملاء ──
  const filtered = (customers || []).filter(c =>
    !search || (c.name || '').includes(search) || (c.phone || '').includes(search) || (c.customer_id || '').includes(search)
  );

  const catColor = (cat) => ({
    'جديد': 'bg-blue-50 text-blue-800 border-blue-200',
    'دائم': 'bg-cyan-50 text-[#006064] border-cyan-200 font-bold',
    'VIP':  'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-900 border-amber-300 font-black shadow-2xs'
  }[cat] || 'bg-slate-100 text-slate-700 border-slate-200');

  const formatCleanDate = (d) => {
    if (!d) return '—';
    if (typeof d === 'string') {
      const clean = d.includes('T') ? d.split('T')[0] : d;
      return clean.replace(/-/g, '/');
    }
    return d;
  };

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:border-[#00ACC1] focus:ring-4 focus:ring-cyan-100/80 transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-slate-700 mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ══════════════════════════════════════════
            👑 البطاقة الأولى: بيانات العميلة الأساسية
            ══════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] overflow-hidden transition-all">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-pink-50/25 to-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0F172A] text-[#00ACC1] flex items-center justify-center text-base font-bold shadow-xs border border-slate-700">
                👑
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  بيانات العميلة وقنوات التواصل
                  <span className="text-[11px] bg-[#FFF3E0] text-[#E65100] border border-[#FFE0B2] rounded-lg px-2.5 py-0.5 font-mono font-bold shadow-2xs">
                    {custId}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">الملف الشخصي، تفاصيل العنوان، والتصنيف (CRM)</p>
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline-flex items-center gap-1">
              <span className="text-rose-500 font-bold">*</span> الحقول الإلزامية
            </span>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {/* 1. اسم العميل */}
              <div>
                <label className={labelCls}>اسم العميلة (الأم / الأب) <span className="text-rose-500 font-bold">*</span></label>
                <input required value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="مثال: أميرة الأهدل" />
              </div>

              {/* 2. الهاتف الرئيسي */}
              <div>
                <label className={labelCls}>الهاتف الرئيسي (واتساب) <span className="text-rose-500 font-bold">*</span></label>
                <div className="relative">
                  <input required value={phone} onChange={e => setPhone(e.target.value)} className={inputCls + " pr-11 pl-3 font-mono"} placeholder="771234567" type="tel" dir="ltr" style={{textAlign:'right'}} />
                  {phone && (
                    <a href={`https://wa.me/${String(phone).replace(/^0+/, '967').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" 
                       className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 rounded-lg transition border border-emerald-200 shadow-2xs" title="مراسلة واتساب">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </a>
                  )}
                </div>
              </div>

              {/* 3. الهاتف البديل */}
              <div>
                <label className={labelCls}>الهاتف البديل (خطي)</label>
                <input value={phoneAlt} onChange={e => setPhoneAlt(e.target.value)} className={inputCls + " font-mono"} placeholder="71XXXXXXX (اختياري)" type="tel" dir="ltr" style={{textAlign:'right'}} />
              </div>

              {/* 4. منصة التواصل */}
              <div>
                <label className={labelCls}>منصة التواصل الاجتماعي</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} className={inputCls}>
                  {['واتساب (WhatsApp)','انستغرام (Instagram)','فيسبوك (Facebook)','تيك توك (TikTok)','سناب شات (Snapchat)','تليجرام (Telegram)','مباشر / زيارة المحل'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* 5. المعرف */}
              <div>
                <label className={labelCls}>اسم الحساب / المعرف</label>
                <input value={handle} onChange={e => setHandle(e.target.value)} className={inputCls} placeholder="@username" dir="ltr" style={{textAlign:'right'}} />
              </div>

              {/* 6. فئة العميل */}
              <div>
                <label className={labelCls}>فئة العميل (CRM)</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                  {['جديد','دائم','VIP'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* 7. المدينة */}
              <div>
                <label className={labelCls}>المدينة / المنطقة</label>
                <input value={city} onChange={e => setCity(e.target.value)} className={inputCls} placeholder="مثال: صنعاء - حدة" />
              </div>

              {/* 8. الشارع */}
              <div>
                <label className={labelCls}>الشارع / المبنى</label>
                <input value={street} onChange={e => setStreet(e.target.value)} className={inputCls} placeholder="مثال: شارع الستين - بناية الأمين" />
              </div>

              {/* 9. تاريخ التسجيل */}
              <div>
                <label className={labelCls}>تاريخ التسجيل (YYYY/MM/DD)</label>
                <input type="date" value={regDate} onChange={e => setRegDate(e.target.value)} className={inputCls} />
              </div>

              {/* 10. ملاحظات إضافية */}
              <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <label className={labelCls}>ملاحظات إضافية وتفضيلات خاصة</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls + " h-auto min-h-[52px] resize-none"} placeholder="أي ملاحظات خاصة بالعميلة، تفضيلات الألوان، أو تعليمات التسليم..." />
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            ✂️ البطاقة الثانية: مقاسات الأطفال والموديلات
            ══════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] overflow-hidden transition-all">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-gradient-to-r from-slate-50 via-pink-50/25 to-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0F172A] text-[#00ACC1] flex items-center justify-center text-base font-bold shadow-xs border border-slate-700">
                ✂️
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  مقاسات الأطفال وبطاقات الموديل
                  <span className="text-[11px] bg-pink-100 text-[#AD1457] font-bold px-2 py-0.5 rounded-full border border-pink-200">
                    {measurements.length} {measurements.length > 1 ? 'أطفال' : 'طفلة'}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">تسجيل القياسات المفصلة وتحديد الموديل والأقمشة</p>
              </div>
            </div>

            {/* زر إضافة طفلة الأنيق في رأس البطاقة */}
            <button type="button" onClick={addChildCard}
              className="h-10 px-4 bg-gradient-to-r from-[#D81B60] to-[#AD1457] hover:from-[#C2185B] hover:to-[#880E4F] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer border border-[#C2185B]">
              <span className="text-sm">➕</span> إضافة طفلة جديدة
            </button>
          </div>

          <div className="p-6 space-y-6">
            {measurements.map((m, idx) => (
              <div key={m.id} className="border border-pink-100 rounded-2xl overflow-hidden bg-slate-50/40 transition-all shadow-2xs">
                {/* رأس بطاقة الطفلة */}
                <div className="bg-gradient-to-r from-pink-50/90 via-slate-50 to-pink-50/60 px-5 py-3 border-b border-pink-100 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-[#0F172A] text-[#00ACC1] flex items-center justify-center text-xs font-black shadow-2xs border border-slate-700">
                        {idx + 1}
                      </span>
                      <span>{m.child_name ? `الطفلة: ${m.child_name}` : `طفلة رقم (${idx + 1})`}</span>
                    </span>
                    {m.estimated_age && (
                      <span className="text-[11px] bg-cyan-50 text-[#006064] px-2.5 py-0.5 rounded-lg font-semibold border border-cyan-200 shadow-2xs">
                        🏷️ العمر التقديري: {m.estimated_age} ({m.dress_length} {m.unit})
                      </span>
                    )}
                    {isOlderThan90Days(m.meas_date) && (
                      <span className="text-[11px] bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-lg font-bold border border-rose-200 flex items-center gap-1.5 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        مقاس قديم (+90 يوم)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => toggleUnit(idx)}
                      className="h-8 text-xs bg-white hover:bg-cyan-50 text-[#00838F] border border-cyan-200 px-3 rounded-lg font-bold transition shadow-2xs flex items-center gap-1.5">
                      <span>🔄</span> الوحدة: {m.unit} (تبديل)
                    </button>
                    {measurements.length > 1 && (
                      <button type="button" onClick={() => removeChildCard(idx)}
                        className="h-8 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 rounded-lg font-bold transition flex items-center gap-1">
                        <span>🗑</span> حذف
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-5 bg-white">
                  {/* معلومات الطفلة وتفاصيل الفستان */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <span className="text-[#D81B60]">👧</span> بيانات الطفلة والموديل المختار
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      <div>
                        <label className={labelCls}>اسم الطفلة <span className="text-rose-500 font-bold">*</span></label>
                        <input value={m.child_name} onChange={e => updateMeasurement(idx,'child_name',e.target.value)} className={inputCls} placeholder="مثال: ريم" />
                      </div>
                      <div>
                        <label className={labelCls}>تاريخ أخذ المقاس (YYYY/MM/DD)</label>
                        <input type="date" value={m.meas_date} onChange={e => updateMeasurement(idx,'meas_date',e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>تاريخ المناسبة / التسليم (YYYY/MM/DD)</label>
                        <input type="date" value={m.event_date} onChange={e => updateMeasurement(idx,'event_date',e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>لون الفستان المختار</label>
                        <input type="text" value={m.dress_color || ''} onChange={e => updateMeasurement(idx,'dress_color',e.target.value)} className={inputCls} placeholder="مثال: لؤلؤي ملكي / وردي بودرة" />
                      </div>
                      <div>
                        <label className={labelCls}>الموديل المختار</label>
                        <select value={m.selected_model || ''} onChange={e => updateMeasurement(idx,'selected_model',e.target.value)} className={inputCls}>
                          <option value="">-- اختر الموديل المعتمد --</option>
                          {(products || []).map(p => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>صورة الموديل (اختياري)</label>
                        <div className="flex gap-2 items-center">
                          <input type="file" accept="image/*" onChange={(e) => {
                            const file = e.target.files[0];
                            if(file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => updateMeasurement(idx, 'model_image', ev.target.result);
                              reader.readAsDataURL(file);
                            }
                          }} className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-pink-50 file:text-[#D81B60] hover:file:bg-pink-100 border border-slate-200 rounded-xl p-1 bg-slate-50/60 cursor-pointer h-11" />
                          {m.model_image && <img src={m.model_image} alt="معاينة" className="w-11 h-11 object-cover rounded-xl shadow-2xs border border-pink-200" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* شبكة المقاسات الطولية (5 أعمدة - بدون شارات بنفسجية مكررة) */}
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[#0F172A] font-bold">
                        <span className="text-[#00ACC1]">📐</span> القياسات الطولية
                      </span>
                      <span className="text-[10px] font-bold text-[#00838F] bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                        الوحدة الحالية: {m.unit}
                      </span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {[
                        ['total_height','الطول الكلي للطفلة'],
                        ['dress_length','طول الفستان الكلي'],
                        ['chest_length','طول الصدر'],
                        ['skirt_length','طول التنورة'],
                        ['sleeve_length','طول الكم']
                      ].map(([field, lbl]) => (
                        <div key={field} className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/90 transition hover:border-cyan-300 hover:bg-cyan-50/20">
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 text-center truncate">
                            {lbl} <span className="text-slate-400 font-normal text-[10px]">({m.unit})</span>
                          </label>
                          <input 
                            type="number" 
                            step="0.1" 
                            value={m[field]} 
                            onChange={e => updateMeasurement(idx,field,e.target.value)} 
                            className="w-full h-11 px-3 py-2 text-center font-bold text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:border-[#00ACC1] focus:ring-4 focus:ring-cyan-100/80 outline-none transition" 
                            placeholder="—" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* شبكة المقاسات العرضية والمحيطية (5 أعمدة - بدون شارات بنفسجية مكررة) */}
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[#0F172A] font-bold">
                        <span className="text-[#00ACC1]">🔄</span> القياسات المحيطية والعرضية
                      </span>
                      <span className="text-[10px] font-bold text-[#00838F] bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                        الوحدة الحالية: {m.unit}
                      </span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {[
                        ['chest_circ','محيط الصدر (Chest)'],
                        ['waist_circ','محيط الخصر (Waist)'],
                        ['shoulder_width','عرض الكتفين (Shoulder)'],
                        ['armhole_circ','محيط الإبط (Armhole)'],
                        ['neck_circ','محيط الرقبة (Neck)']
                      ].map(([field, lbl]) => (
                        <div key={field} className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/90 transition hover:border-cyan-300 hover:bg-cyan-50/20">
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 text-center truncate">
                            {lbl} <span className="text-slate-400 font-normal text-[10px]">({m.unit})</span>
                          </label>
                          <input 
                            type="number" 
                            step="0.1" 
                            value={m[field]} 
                            onChange={e => updateMeasurement(idx,field,e.target.value)} 
                            className="w-full h-11 px-3 py-2 text-center font-bold text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:border-[#00ACC1] focus:ring-4 focus:ring-cyan-100/80 outline-none transition" 
                            placeholder="—" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* تفضيلات الراحة وملاحظات الخياطة */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                    {/* Comfort Profile */}
                    <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4">
                      <label className="block text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                        <span className="text-[#FB8C00]">✨</span> تفضيلات الراحة والأقمشة (اختيار متعدد)
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {['حساسية من التل', 'بطانة قطن ناعم', 'فتحة سحاب مخفي', 'كشكشة مضاعفة'].map(pref => {
                          const isChecked = (m.comfort_profile || []).includes(pref);
                          return (
                            <label key={pref} className={`flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                              isChecked ? 'bg-pink-50/90 border-[#D81B60] text-[#880E4F] font-black shadow-2xs ring-1 ring-[#D81B60]/40' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}>
                              <input type="checkbox" className="rounded text-[#D81B60] focus:ring-[#00ACC1] w-4 h-4 accent-[#D81B60] cursor-pointer" 
                                checked={isChecked}
                                onChange={(e) => {
                                  const current = m.comfort_profile || [];
                                  const updated = e.target.checked ? [...current, pref] : current.filter(p => p !== pref);
                                  updateMeasurement(idx, 'comfort_profile', updated);
                                }}
                              />
                              <span className="text-[11px] truncate">{pref}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sewing Notes */}
                    <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 flex flex-col">
                      <label className="block text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                        <span className="text-[#D81B60]">🧵</span> تعليمات وتوجيهات الخياطة والقص
                      </label>
                      <textarea 
                        className={inputCls + " flex-1 h-auto min-h-[64px] resize-none"} 
                        placeholder="أضف أي ملاحظات دقيقة خاصة بالمعمل أو طريقة القص، التطريز، والتبطين..." 
                        value={m.sewing_notes || ''} 
                        onChange={e => updateMeasurement(idx, 'sewing_notes', e.target.value)}
                        rows={2}
                      ></textarea>
                    </div>
                  </div>

                  {/* Auto-Calculated Model Summary Card */}
                  <div className="bg-gradient-to-r from-pink-50/80 via-cyan-50/60 to-pink-50/80 border border-pink-200/80 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-2xs gap-2">
                    {(() => {
                      const selMod = m.selected_model;
                      const len = m.dress_length;
                      const estAge = m.estimated_age;
                      
                      if (selMod && len) {
                        const productData = (products || []).find(p => p.name === selMod);
                        let price = productData ? parseFloat(productData.sell_price) || 0 : 0;
                        
                        let baseMeters = 0;
                        const bracket = getBroadBracket(estAge);
                        
                        if (productData && productData.price_matrix && productData.price_matrix[bracket]) {
                            price = parseFloat(productData.price_matrix[bracket]);
                        }
                        
                        if (productData && productData.bom) {
                           productData.bom.forEach(f => {
                             baseMeters += (f.brackets && f.brackets[bracket]) || 0;
                           });
                        } else {
                           baseMeters = productData ? parseFloat(productData.yards_used) || 0 : 0;
                        }
                        
                        const jumbo = getJumboFactor(m);
                        if (jumbo.factor > 1) {
                          price = (price * jumbo.factor).toFixed(1);
                          baseMeters = (baseMeters * jumbo.factor).toFixed(2);
                        }

                        return (
                          <>
                            <div className="flex items-center gap-3 flex-wrap justify-center text-xs font-bold text-slate-800">
                              <span className="bg-white px-2.5 py-1 rounded-lg border border-pink-200 shadow-2xs">👗 فستان: <strong className="text-[#D81B60]">{selMod}</strong></span>
                              <span>•</span>
                              <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">العمر: <strong className="text-slate-900">{estAge || 'غير محدد'}</strong></span>
                              <span>•</span>
                              <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">السعر التقديري: <strong className="font-mono">{price} YER</strong></span>
                            </div>
                            {productData && productData.bom && (
                               <span className="text-[11px] text-slate-600 font-medium">
                                 أمتار الأقمشة المطلوبة للشريحة ({bracket}): <strong className="text-[#006064] font-mono">{baseMeters} متر</strong>
                               </span>
                            )}
                            {jumbo.factor > 1 && (
                              <div className="text-xs font-semibold text-amber-900 bg-amber-50 px-3 py-1 rounded-lg border border-amber-300 mt-1 shadow-2xs">
                                ⚠️ تم تطبيق معامل عرض إضافي ({jumbo.factor.toFixed(2)}x) لضبط أمتار الأقمشة والتكلفة
                              </div>
                            )}
                          </>
                        );
                      } else {
                        return (
                          <span className="text-xs text-slate-500 font-medium">
                            💡 اختر الموديل وأدخل طول الفستان لحساب العمر التقديري، الأمتار، والتكلفة آلياً
                          </span>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            💰 البطاقة الثالثة: كشف الحساب المالي
            ══════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] overflow-hidden transition-all">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-emerald-50/20 to-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0F172A] text-[#FB8C00] flex items-center justify-center text-base font-bold shadow-xs border border-slate-700">
                💰
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">كشف الحساب المالي والدفعات</h2>
                <p className="text-[11px] text-slate-500 font-medium">تسجيل المبيعات والعربون وتتبع المبلغ المتبقي</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
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
                <div className={`w-full h-11 px-3 rounded-xl border font-mono font-black text-sm flex items-center justify-center shadow-2xs ${
                  parseFloat(remaining) > 0 
                    ? 'bg-rose-50 border-rose-200 text-rose-700' 
                    : 'bg-[#E0F7FA] border-cyan-200 text-[#006064]'
                }`}>
                  {remaining ? `${remaining} YER ${parseFloat(remaining) === 0 ? '(مسدد بالكامل ✅)' : ''}` : '0.00 YER (مسدد بالكامل ✅)'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div>
                <label className={labelCls}>طريقة الدفع</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className={inputCls}>
                  {['نقد (كاش)','حوالة بنكية','آجل (على الحساب)','تحويل إلكتروني'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>📎 رفع صورة السند / الإيصال</label>
                <input type="file" accept="image/*" onChange={handleReceiptChange}
                  className="w-full h-11 p-1 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold cursor-pointer file:mr-2 file:text-xs file:font-bold file:text-[#D81B60] file:bg-pink-50 file:border-0 file:rounded-lg file:px-3 file:py-1.5 hover:file:bg-pink-100" />
                {receiptPreview && (
                  <div className="mt-2.5 flex items-center gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <img src={receiptPreview} alt="معاينة السند" className="w-12 h-12 object-cover rounded-xl border border-emerald-300 shadow-2xs" />
                    <div className="text-xs text-slate-700 flex-1 flex items-center justify-between">
                      <span className="text-emerald-800 font-bold">✅ تم إرفاق صورة السند بنجاح</span>
                      <button type="button" onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                        className="text-rose-600 hover:text-rose-800 text-xs font-bold underline cursor-pointer">إزالة الصورة</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── زر الحفظ الرئيسي المحترف ── */}
        <div className="flex items-center justify-end">
          <button type="submit" disabled={loading}
            className="w-full sm:w-auto h-12 px-10 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#D81B60] via-[#C2185B] to-[#AD1457] hover:from-[#C2185B] hover:to-[#880E4F] shadow-md hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-3 cursor-pointer active:scale-[0.98] border border-[#C2185B]">
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>جاري الحفظ في السحابة...</span>
              </>
            ) : (
              <>
                <span className="text-base">💾</span>
                <span>حفظ وتوثيق ملف العميلة</span>
                <span className="text-xs bg-white/20 text-white border border-white/30 px-2 py-0.5 rounded-md font-semibold">
                  {measurements.length} {measurements.length > 1 ? 'أطفال' : 'طفلة'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* ══════════════════════════════════════════
          📋 سجل العملاء
          ══════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-gradient-to-r from-slate-50 via-pink-50/20 to-slate-50">
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-sm text-slate-900">سجل العملاء والطلبات المعتمدة</h3>
            <span className="text-xs bg-pink-100 text-[#AD1457] px-2.5 py-0.5 rounded-full font-mono font-bold border border-pink-200">{filtered.length}</span>
          </div>
          <div className="relative">
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="pl-3 pr-8 h-9 rounded-xl border border-slate-200 bg-white text-xs font-medium w-64 focus:outline-none focus:border-[#00ACC1] focus:ring-2 focus:ring-cyan-100"
              placeholder="بحث بالاسم، رقم الهاتف، أو الكود..." />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              لا يوجد عملاء مسجلون يطابقون البحث 👤
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  {['الكود','اسم العميلة','الهاتف','المنصة','المدينة','الفئة','التسجيل','الأطفال','المتبقي','الإجراءات'].map(h => (
                    <th key={h} className="px-3.5 py-3 text-right whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c, i) => {
                  const rem = parseFloat(c.ledger?.remaining) || 0;
                  return (
                    <tr key={c.id || c.customer_id || i} className="hover:bg-pink-50/30 transition-colors">
                      <td className="px-3.5 py-3 font-mono text-[11px] text-[#D81B60] font-bold whitespace-nowrap">{c.customer_id || `CUST-${i+1001}`}</td>
                      <td className="px-3.5 py-3 font-bold text-slate-900 whitespace-nowrap">{c.name || '—'}</td>
                      <td className="px-3.5 py-3 font-mono text-slate-600 whitespace-nowrap" dir="ltr" style={{textAlign:'right'}}>{c.phone || '—'}</td>
                      <td className="px-3.5 py-3 text-slate-500 whitespace-nowrap">{c.platform ? c.platform.split(' ')[0] : '—'}</td>
                      <td className="px-3.5 py-3 text-slate-500 whitespace-nowrap">{c.city || c.address || '—'}</td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md border ${catColor(c.category)}`}>{c.category || 'جديد'}</span>
                      </td>
                      <td className="px-3.5 py-3 text-slate-500 font-mono whitespace-nowrap">{formatCleanDate(c.reg_date)}</td>
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        {c.measurements && c.measurements.length > 0 ? (
                          <div className="flex flex-col gap-1 items-center">
                            {c.measurements.map((m, idx) => {
                              const isStale = m.meas_date ? isMeasurementStale(m.meas_date) : false;
                              return (
                                <span key={idx} className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 border border-slate-200 flex items-center justify-between gap-1.5 min-w-[75px]">
                                  <span>{m.child_name || 'بدون اسم'}</span>
                                  {isStale && <span title="المقاس قديم (مر عليه أكثر من 90 يوماً)" className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>}
                                </span>
                              );
                            })}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md border ${
                          rem > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-[#E0F7FA] text-[#006064] border-cyan-200'
                        }`}>
                          {rem > 0 ? `${rem} YER` : 'مسدد بالكامل ✅'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 flex items-center gap-1.5 justify-center whitespace-nowrap">
                        <button onClick={() => setSelectedInvoice(c)} title="طباعة فاتورة مالية (PDF)" 
                          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-[#D81B60] text-slate-600 hover:text-white border border-slate-200 transition-all flex items-center justify-center shadow-2xs cursor-pointer">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                        </button>
                        <button onClick={() => setSelectedJobCard(c)} title="بطاقة المعمل والقص (Job Card)" 
                          className="w-8 h-8 rounded-full bg-cyan-50 hover:bg-[#00ACC1] text-[#00838F] hover:text-white border border-cyan-200 transition-all flex items-center justify-center shadow-2xs cursor-pointer">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                        </button>
                        <a href={`https://wa.me/${String(c.phone||'').replace(/^0+/, '967').replace(/\D/g,'')}?text=${encodeURIComponent('مرحباً ' + c.name + '، إليك كشف الحساب الخاص بك من مؤسسة الأميرات الصغيرات.')}`} 
                          target="_blank" rel="noopener noreferrer" title="إرسال كشف واتساب" 
                          className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 transition-all flex items-center justify-center shadow-2xs cursor-pointer">
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
      {selectedInvoice && ReactDOM.createPortal(
        <InvoiceModal customer={selectedInvoice} onClose={() => setSelectedInvoice(null)} />,
        document.body
      )}
      {selectedJobCard && ReactDOM.createPortal(
        <JobCardModal customer={selectedJobCard} onClose={() => setSelectedJobCard(null)} />
      , document.body)}
    </div>
  );
}

// ============================================================
// InvoiceModal — فاتورة مالية للطباعة
// ============================================================
function InvoiceModal({ customer, onClose }) {
  if (!customer) return null;
  const cur = "YER ريال";
  const ledger = customer.ledger || {};
  const remaining = Math.max(0, (parseFloat(ledger.total_sales) || 0) - (parseFloat(ledger.total_paid) || 0));

  const handlePrint = () => {
    const html = `
      <html dir="rtl"><head><meta charset="utf-8"><title>فاتورة - ${customer.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #1e293b; }
        h2 { color: #d81b60; text-align: center; margin: 0 0 4px; }
        h3 { text-align: center; color: #475569; margin: 0 0 20px; }
        hr { border: none; border-top: 1px dashed #cbd5e1; margin: 16px 0; }
        .row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
        .label { color: #64748b; }
        .val { font-weight: bold; }
        .rem { color: ${remaining > 0 ? '#dc2626' : '#00838f'}; font-weight: 900; font-size: 16px; }
        .children { background:#f8fafc; border-radius:8px; padding:12px; margin:12px 0; }
        .child-row { font-size:12px; color:#475569; margin:4px 0; }
        .qr { text-align: center; margin-top: 20px; }
        .footer { text-align:center; font-size:11px; color:#94a3b8; margin-top:20px; }
      </style></head><body>
      <h2>👑 Little Princesses ERP</h2>
      <h3>كشف حساب عميلة</h3>
      <hr/>
      <div class="row"><span class="label">اسم العميلة</span><span class="val">${customer.name || '—'}</span></div>
      <div class="row"><span class="label">رقم الهاتف</span><span class="val">${customer.phone || '—'}</span></div>
      <div class="row"><span class="label">المدينة</span><span class="val">${customer.city || '—'}</span></div>
      <div class="row"><span class="label">الفئة</span><span class="val">${customer.category || '—'}</span></div>
      <hr/>
      <div class="row"><span class="label">إجمالي المبيعات</span><span class="val">${(parseFloat(ledger.total_sales)||0).toLocaleString('en-US')} ${cur}</span></div>
      <div class="row"><span class="label">إجمالي المدفوعات</span><span class="val">${(parseFloat(ledger.total_paid)||0).toLocaleString('en-US')} ${cur}</span></div>
      <div class="row"><span class="label">المبلغ المتبقي</span><span class="rem">${remaining.toLocaleString('en-US')} ${cur} ${remaining===0?'✅':''}</span></div>
      ${customer.measurements && customer.measurements.length > 0 ? `
      <hr/>
      <div class="children"><strong>الأطفال المسجلون:</strong>
      ${customer.measurements.map(m => `<div class="child-row">• ${m.child_name||'—'} | العمر: ${m.estimated_age||'—'} | الموديل: ${m.selected_model||'—'} | التسليم: ${m.event_date||'—'}</div>`).join('')}
      </div>` : ''}
      <div class="qr">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=Customer:${customer.customer_id}|Remaining:${remaining}" alt="QR"/>
        <p style="font-size:11px;color:#94a3b8;">امسح الكود لعرض ملف العميلة</p>
      </div>
      <div class="footer">👑 Little Princesses ERP — تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}</div>
      </body></html>`;
    const w = window.open('', '', 'width=680,height=900');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:16,padding:28,maxWidth:460,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h3 style={{margin:0,color:'#d81b60',fontSize:16}}>👑 فاتورة العميلة: {customer.name}</h3>
          <button onClick={onClose} style={{background:'#f1f5f9',border:'none',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:16}}>✕</button>
        </div>
        <div style={{fontSize:13,lineHeight:2,color:'#475569'}}>
          <div><strong>📞 الهاتف:</strong> {customer.phone || '—'}</div>
          <div><strong>🏙️ المدينة:</strong> {customer.city || '—'}</div>
          <div><strong>💰 إجمالي المبيعات:</strong> {(parseFloat(customer.ledger?.total_sales)||0).toLocaleString('en-US')} YER</div>
          <div><strong>✅ المدفوع:</strong> {(parseFloat(customer.ledger?.total_paid)||0).toLocaleString('en-US')} YER</div>
          <div style={{color: remaining>0?'#dc2626':'#00838f', fontWeight:900}}>
            <strong>⚠️ المتبقي:</strong> {remaining.toLocaleString('en-US')} YER {remaining===0?'(مسدد بالكامل ✅)':''}
          </div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:20}}>
          <button onClick={handlePrint} style={{flex:1,padding:'10px',background:'#d81b60',color:'#fff',border:'none',borderRadius:10,fontWeight:900,cursor:'pointer',fontSize:13}}>
            🖨️ طباعة الفاتورة
          </button>
          <button onClick={onClose} style={{padding:'10px 16px',background:'#f1f5f9',border:'none',borderRadius:10,cursor:'pointer',fontWeight:700}}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// JobCardModal — بطاقة المعمل للخياطة
// ============================================================
function JobCardModal({ customer, onClose }) {
  if (!customer) return null;

  const handlePrint = () => {
    const html = `
      <html dir="rtl"><head><meta charset="utf-8"><title>بطاقة المعمل - ${customer.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
        h2 { color: #00acc1; text-align: center; margin:0 0 4px; }
        hr { border:none; border-top:1px dashed #b2ebf2; margin:14px 0; }
        .card { background:#f0fdfa; border:1px solid #ccfbf1; border-radius:10px; padding:14px; margin:12px 0; }
        .row { display:flex; justify-content:space-between; font-size:13px; margin:6px 0; }
        .label { color:#00838f; font-weight:600; }
        .val { font-weight:bold; color:#1e293b; }
        .footer { text-align:center; font-size:11px; color:#94a3b8; margin-top:20px; }
      </style></head><body>
      <h2>✂️ بطاقة المعمل — Little Princesses</h2>
      <hr/>
      <div class="row"><span class="label">العميلة</span><span class="val">${customer.name || '—'}</span></div>
      <div class="row"><span class="label">الهاتف</span><span class="val">${customer.phone || '—'}</span></div>
      ${(customer.measurements||[]).map((m,i) => `
      <div class="card">
        <strong>الطفلة ${i+1}: ${m.child_name||'غير مسمى'}</strong>
        <div class="row"><span class="label">الموديل</span><span class="val">${m.selected_model||'—'}</span></div>
        <div class="row"><span class="label">العمر</span><span class="val">${m.estimated_age||'—'}</span></div>
        <div class="row"><span class="label">موعد التسليم</span><span class="val">${m.event_date||'—'}</span></div>
        <div class="row"><span class="label">الطول الكلي</span><span class="val">${m.total_height||'—'} سم</span></div>
        <div class="row"><span class="label">محيط الصدر</span><span class="val">${m.chest_circ||'—'} سم</span></div>
        <div class="row"><span class="label">محيط الخصر</span><span class="val">${m.waist_circ||'—'} سم</span></div>
        <div class="row"><span class="label">طول الفستان</span><span class="val">${m.dress_length||'—'} سم</span></div>
        <div class="row"><span class="label">ملاحظات الخياطة</span><span class="val">${m.sewing_notes||'—'}</span></div>
      </div>`).join('')}
      <div class="footer">✂️ Little Princesses ERP — ${new Date().toLocaleDateString('ar-SA')}</div>
      </body></html>`;
    const w = window.open('', '', 'width=680,height=960');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:16,padding:28,maxWidth:480,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',maxHeight:'85vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h3 style={{margin:0,color:'#00838f',fontSize:16}}>✂️ بطاقة المعمل: {customer.name}</h3>
          <button onClick={onClose} style={{background:'#f1f5f9',border:'none',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:16}}>✕</button>
        </div>
        {(customer.measurements||[]).length === 0 ? (
          <p style={{textAlign:'center',color:'#94a3b8'}}>لا توجد مقاسات مسجلة لهذه العميلة</p>
        ) : (customer.measurements||[]).map((m,i) => (
          <div key={i} style={{background:'#f0fdfa',borderRadius:10,padding:12,marginBottom:10,fontSize:12,lineHeight:1.8,border:'1px solid #ccfbf1'}}>
            <div style={{fontWeight:900,color:'#00838f',marginBottom:6}}>الطفلة: {m.child_name||'غير مسمى'} — {m.selected_model||'بدون موديل'}</div>
            <div><strong>العمر:</strong> {m.estimated_age||'—'} | <strong>التسليم:</strong> {m.event_date||'—'}</div>
            <div><strong>الطول الكلي:</strong> {m.total_height||'—'} | <strong>محيط الصدر:</strong> {m.chest_circ||'—'} | <strong>الخصر:</strong> {m.waist_circ||'—'}</div>
            <div><strong>طول الفستان:</strong> {m.dress_length||'—'} | <strong>طول الكم:</strong> {m.sleeve_length||'—'}</div>
            {m.sewing_notes && <div style={{color:'#6b7280',marginTop:4}}>📝 {m.sewing_notes}</div>}
          </div>
        ))}
        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button onClick={handlePrint} style={{flex:1,padding:'10px',background:'#00acc1',color:'#fff',border:'none',borderRadius:10,fontWeight:900,cursor:'pointer',fontSize:13}}>
            🖨️ طباعة بطاقة المعمل
          </button>
          <button onClick={onClose} style={{padding:'10px 16px',background:'#f1f5f9',border:'none',borderRadius:10,cursor:'pointer',fontWeight:700}}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
