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

function Customers({ customers = [], setCustomers, products = [], showToast, currency = { display: 'YER', symbol: '﷼' } }) {

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
      const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(currency?.display || 'YER') : 'YER';
      const rate = window.CurrencyService ? window.CurrencyService.getRate(currCode) : 1.0;

      if (payload.ledger.total_sales > 0) {
        const salesBase = window.CurrencyService ? window.CurrencyService.toBase(payload.ledger.total_sales, currCode, rate) : { base_amount: payload.ledger.total_sales, exchange_rate: rate };
        callGAS('addJournalEntry', {
          id: Date.now(),
          transaction_id: `TX-CUST-SALES-${custId}`,
          entry_no: 'AUTOSALES-' + custId,
          debit: '104', // ذمم العملاء
          credit: '401', // إيرادات المبيعات
          amount: payload.ledger.total_sales,
          currency: currCode,
          exchange_rate: rate,
          base_amount: salesBase.base_amount,
          ref_type: 'فاتورة عميل',
          ref_id: String(custId),
          date: TODAY_STR_ISO,
          notes: `قيد آلي: مبيعات العميل ${name.trim()}`
        }).catch(e => console.log('Journal Sync Failed', e));
      }
      if (payload.ledger.deposit > 0) {
        const depBase = window.CurrencyService ? window.CurrencyService.toBase(payload.ledger.deposit, currCode, rate) : { base_amount: payload.ledger.deposit, exchange_rate: rate };
        callGAS('addJournalEntry', {
          id: Date.now() + 1,
          transaction_id: `TX-CUST-DEP-${custId}`,
          entry_no: 'AUTODEP-' + custId,
          debit: '101', // الصندوق الرئيسي
          credit: '104', // ذمم العملاء
          amount: payload.ledger.deposit,
          currency: currCode,
          exchange_rate: rate,
          base_amount: depBase.base_amount,
          ref_type: 'عربون مبيعات',
          ref_id: String(custId),
          date: TODAY_STR_ISO,
          notes: `قيد آلي: استلام عربون من ${name.trim()}`
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
                  currency: currency?.display || 'YER ﷼', 
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
    'جديد': 'bg-[#E2F5F7] text-[#007F8C] border-[#C5ECF0]',
    'دائم': 'bg-[#F2E7F3] text-[#8F2A87] border-[#E5CEE7] font-bold',
    'VIP':  'bg-[#FCE8F2] text-[#B0005A] border-[#F2A4CB] font-black shadow-2xs'
  }[cat] || 'bg-[#FAFAFB] text-[#25232A] border-[#E8E5EA]');

  const formatCleanDate = (d) => {
    if (!d) return '—';
    if (typeof d === 'string') {
      const clean = d.includes('T') ? d.split('T')[0] : d;
      return clean.replace(/-/g, '/');
    }
    return d;
  };

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#B0005A] focus:ring-2 focus:ring-[#FCE8F2] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  const currM = measurements[activeChildIdx] || measurements[0] || emptyMeasurement();

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">

      {/* ══════════════════════════════════════════
          👑 Luxury Customer Profile Master Card
          ══════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        
        {/* Profile Header with Avatar, ID & Quick Actions */}
        <div className="p-6 border-b border-[#E8E5EA] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FCE8F2] text-[#B0005A] border border-[#F2A4CB]/50 flex items-center justify-center text-xl font-bold shadow-xs shrink-0">
              {name.trim() ? name.trim()[0] : '👸'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-base md:text-lg font-bold text-[#25232A]">
                  {name.trim() || 'ملف عميلة جديدة'}
                </h1>
                <span className="text-xs bg-[#FFF1DC] text-[#C97300] border border-[#FFE4B9] rounded-lg px-2.5 py-0.5 font-mono font-bold">
                  {custId}
                </span>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-md border font-semibold ${catColor(category)}`}>
                  {category}
                </span>
              </div>
              <p className="text-xs text-[#6F6B75] mt-0.5 flex items-center gap-2">
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
              className="h-10 px-4 bg-[#F2E7F3] hover:bg-[#E5CEE7] text-[#8F2A87] font-bold text-xs rounded-xl border border-[#E5CEE7] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Icons.Plus className="w-4 h-4" />
              <span>إضافة طفلة ({measurements.length})</span>
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
              <span>حفظ وتوثيق العميلة</span>
            </button>
          </div>
        </div>

        {/* ── KPI Financial & Operational Metric Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#E8E5EA] bg-[#FAFAFB] divide-x divide-x-reverse divide-[#E8E5EA]">
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي المبيعات</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#25232A] mt-1 block">
              {Number(totalSales || 0).toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">{currency.display}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">العربون / المدفوع</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] mt-1 block">
              {Number(deposit || totalPaid || 0).toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">{currency.display}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">المبلغ المتبقي</span>
            <span className={`text-xl font-extrabold font-mono tabular-nums mt-1 block ${parseFloat(remaining) > 0 ? 'text-[#F28A00]' : 'text-[#007F8C]'}`}>
              {Number(remaining || 0).toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">{currency.display}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">عدد الأطفال والفساتين</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#8F2A87] mt-1 block">
              {measurements.length} <span className="text-xs font-medium text-[#6F6B75]">{measurements.length === 1 ? 'فستان' : (measurements.length === 2 ? 'فستانان' : 'فساتين')}</span>
            </span>
          </div>
        </div>

        {/* ── Tabs Navigation Bar ── */}
        <div className="px-6 border-b border-[#E8E5EA] flex items-center gap-2 overflow-x-auto no-scrollbar bg-white">
          {[
            { id: 'crm', label: 'الملف وبيانات التواصل', icon: Icons.Users },
            { id: 'measurements', label: `سجل المقاسات وبطاقات الأطفال (${measurements.length})`, icon: Icons.Scissors },
            { id: 'ledger', label: 'كشف الحساب والمدفوعات', icon: Icons.Vouchers },
            { id: 'directory', label: `سجل العملاء المعتمدين (${filtered.length})`, icon: Icons.Dashboard }
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
                    ? 'border-[#B0005A] text-[#B0005A] bg-[#FCE8F2]/30'
                    : 'border-transparent text-[#6F6B75] hover:text-[#25232A] hover:bg-[#FAFAFB]'
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
              {/* 1. اسم العميلة */}
              <div>
                <label className={labelCls}>اسم العميلة (الأم / الأب) <span className="text-[#D64545] font-bold">*</span></label>
                <input required value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="" />
              </div>

              {/* 2. الهاتف الرئيسي */}
              <div>
                <label className={labelCls}>الهاتف الرئيسي (واتساب) <span className="text-[#D64545] font-bold">*</span></label>
                <div className="relative">
                  <input required value={phone} onChange={e => setPhone(e.target.value)} className={inputCls + " pr-11 pl-3 font-mono"} placeholder="" type="tel" dir="ltr" style={{textAlign:'right'}} />
                  {phone && (
                    <a href={`https://wa.me/${String(phone).replace(/^0+/, '967').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" 
                       className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-[#E2F5F7] hover:bg-[#009FAE] hover:text-white text-[#007F8C] rounded-lg transition border border-[#C5ECF0]" title="مراسلة واتساب">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </a>
                  )}
                </div>
              </div>

              {/* 3. الهاتف البديل */}
              <div>
                <label className={labelCls}>الهاتف البديل (خطي)</label>
                <input value={phoneAlt} onChange={e => setPhoneAlt(e.target.value)} className={inputCls + " font-mono"} placeholder="" type="tel" dir="ltr" style={{textAlign:'right'}} />
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
                <input value={handle} onChange={e => setHandle(e.target.value)} className={inputCls} placeholder="" dir="ltr" style={{textAlign:'right'}} />
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
                <input value={city} onChange={e => setCity(e.target.value)} className={inputCls} placeholder="" />
              </div>

              {/* 8. الشارع */}
              <div>
                <label className={labelCls}>الشارع / المبنى</label>
                <input value={street} onChange={e => setStreet(e.target.value)} className={inputCls} placeholder="" />
              </div>

              {/* 9. تاريخ التسجيل */}
              <div>
                <label className={labelCls}>تاريخ التسجيل</label>
                <input type="date" value={regDate} onChange={e => setRegDate(e.target.value)} className={inputCls} />
              </div>

              {/* 10. ملاحظات إضافية */}
              <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <label className={labelCls}>ملاحظات إضافية وتفضيلات خاصة بالعميلة</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls + " h-auto min-h-[56px] resize-none"} placeholder="" />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#E8E5EA]">
              <button
                type="button"
                onClick={() => setActiveCustomerSubTab('measurements')}
                className="px-6 py-2.5 bg-[#8F2A87] hover:bg-[#73216C] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>الانتقال لسجل المقاسات</span>
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
              <div className="text-center py-16 bg-[#FAFAFB] border border-dashed border-[#E8E5EA] rounded-2xl p-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#FCE8F2] text-[#B0005A] border border-[#F2A4CB]/50 flex items-center justify-center text-3xl mx-auto shadow-xs">
                  👧
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#25232A]">لا توجد بطاقات مقاسات مضافة بعد</h3>
                  <p className="text-xs text-[#6F6B75] mt-1">انقر على الزر أدناه لإضافة بطاقة مقاسات وموديل الطفلة</p>
                </div>
                <button
                  type="button"
                  onClick={addChildCard}
                  className="px-5 py-2.5 bg-[#B0005A] hover:bg-[#8E0049] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-2 mx-auto cursor-pointer"
                >
                  <Icons.Plus className="w-4 h-4" />
                  <span>إضافة بطاقة طفلة جديدة</span>
                </button>
              </div>
            ) : (
              <>
                {/* Children Tabs / Sub-selector */}
                <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-[#E8E5EA]">
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
                              : 'bg-[#FAFAFB] text-[#25232A] border-[#E8E5EA] hover:bg-[#FCE8F2]'
                          }`}
                        >
                          <span>{m.child_name || `طفلة (${idx + 1})`}</span>
                          {m.estimated_age && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded ${isCur ? 'bg-white/20 text-white' : 'bg-[#E2F5F7] text-[#007F8C]'}`}>
                              {m.estimated_age}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleUnit(activeChildIdx)}
                      className="h-9 px-3 bg-white text-[#007F8C] border border-[#C5ECF0] hover:bg-[#E2F5F7] text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🔄</span> الوحدة: {currM ? currM.unit : 'سم'} (تبديل)
                    </button>

                    <button
                      type="button"
                      onClick={() => removeChildCard(activeChildIdx)}
                      className="h-9 px-3 bg-rose-50 text-[#D64545] border border-rose-200 hover:bg-rose-100 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      حذف الطفلة
                    </button>
                  </div>
                </div>

                {/* Current Child Card Content */}
                <div className="space-y-6">
                  {/* 1. Basic Child Info & Model */}
                  <div className="bg-[#FAFAFB] p-5 rounded-2xl border border-[#E8E5EA] space-y-4">
                    <h4 className="text-xs font-bold text-[#25232A] flex items-center gap-2">
                      <span className="text-[#B0005A]">👧</span> بيانات الطفلة والموديل المختار
                    </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>اسم الطفلة <span className="text-[#D64545] font-bold">*</span></label>
                    <input value={currM.child_name} onChange={e => updateMeasurement(activeChildIdx,'child_name',e.target.value)} className={inputCls} placeholder="" />
                  </div>
                  <div>
                    <label className={labelCls}>تاريخ أخذ المقاس</label>
                    <input type="date" value={currM.meas_date} onChange={e => updateMeasurement(activeChildIdx,'meas_date',e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>تاريخ المناسبة / التسليم</label>
                    <input type="date" value={currM.event_date} onChange={e => updateMeasurement(activeChildIdx,'event_date',e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>لون الفستان المختار</label>
                    <input type="text" value={currM.dress_color || ''} onChange={e => updateMeasurement(activeChildIdx,'dress_color',e.target.value)} className={inputCls} placeholder="" />
                  </div>
                  <div>
                    <label className={labelCls}>الموديل المعتمد</label>
                    <select value={currM.selected_model || ''} onChange={e => updateMeasurement(activeChildIdx,'selected_model',e.target.value)} className={inputCls}>
                      <option value="">-- اختر الموديل المعتمد --</option>
                      {(products || []).map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
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
                      }} className="block w-full text-xs text-[#6F6B75] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#FCE8F2] file:text-[#B0005A] hover:file:bg-[#F8D1E5] border border-[#E8E5EA] rounded-xl p-1 bg-white cursor-pointer h-11" />
                      {currM.model_image && <img src={currM.model_image} alt="معاينة" className="w-11 h-11 object-cover rounded-xl border border-[#E8E5EA] shadow-2xs" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Longitudinal Measurements */}
              <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#25232A] flex items-center gap-2">
                    <span className="text-[#009FAE]">📐</span> القياسات الطولية
                  </h4>
                  <span className="text-[11px] font-semibold text-[#007F8C] bg-[#E2F5F7] px-2.5 py-0.5 rounded-md border border-[#C5ECF0]">
                    الوحدة: {currM.unit}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[
                    ['total_height','الطول الكلي للطفلة'],
                    ['dress_length','طول الفستان الكلي'],
                    ['chest_length','طول الصدر'],
                    ['skirt_length','طول التنورة'],
                    ['sleeve_length','طول الكم']
                  ].map(([field, lbl]) => (
                    <div key={field} className="bg-[#FAFAFB] p-3 rounded-xl border border-[#E8E5EA] transition hover:border-[#B0005A]/40">
                      <label className="block text-[11px] font-semibold text-[#6F6B75] mb-1.5 text-center truncate">
                        {lbl} ({currM.unit})
                      </label>
                      <input 
                        type="number" 
                        step="0.1" 
                        value={currM[field]} 
                        onChange={e => updateMeasurement(activeChildIdx,field,e.target.value)} 
                        className="w-full h-10 px-2 text-center font-bold text-sm text-[#25232A] bg-white border border-[#E8E5EA] rounded-lg focus:border-[#B0005A] outline-none transition" 
                        placeholder="—" 
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Circumference Measurements */}
              <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#25232A] flex items-center gap-2">
                    <span className="text-[#8F2A87]">🔄</span> القياسات المحيطية والعرضية
                  </h4>
                  <span className="text-[11px] font-semibold text-[#8F2A87] bg-[#F2E7F3] px-2.5 py-0.5 rounded-md border border-[#E5CEE7]">
                    الوحدة: {currM.unit}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[
                    ['chest_circ','محيط الصدر (Chest)'],
                    ['waist_circ','محيط الخصر (Waist)'],
                    ['shoulder_width','عرض الكتفين (Shoulder)'],
                    ['armhole_circ','محيط الإبط (Armhole)'],
                    ['neck_circ','محيط الرقبة (Neck)']
                  ].map(([field, lbl]) => (
                    <div key={field} className="bg-[#FAFAFB] p-3 rounded-xl border border-[#E8E5EA] transition hover:border-[#8F2A87]/40">
                      <label className="block text-[11px] font-semibold text-[#6F6B75] mb-1.5 text-center truncate">
                        {lbl} ({currM.unit})
                      </label>
                      <input 
                        type="number" 
                        step="0.1" 
                        value={currM[field]} 
                        onChange={e => updateMeasurement(activeChildIdx,field,e.target.value)} 
                        className="w-full h-10 px-2 text-center font-bold text-sm text-[#25232A] bg-white border border-[#E8E5EA] rounded-lg focus:border-[#8F2A87] outline-none transition" 
                        placeholder="—" 
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Comfort Preferences & Tailoring Directives */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#FAFAFB] border border-[#E8E5EA] rounded-2xl p-4.5">
                  <label className="block text-xs font-bold text-[#25232A] mb-3 flex items-center gap-1.5">
                    <span className="text-[#F28A00]">✨</span> تفضيلات الراحة والأقمشة (اختيار متعدد)
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {['حساسية من التل', 'بطانة قطن ناعم', 'فتحة سحاب مخفي', 'كشكشة مضاعفة'].map(pref => {
                      const isChecked = (currM.comfort_profile || []).includes(pref);
                      return (
                        <label key={pref} className={`flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          isChecked ? 'bg-[#FCE8F2] border-[#B0005A] text-[#B0005A]' : 'bg-white border-[#E8E5EA] text-[#25232A] hover:bg-[#FAFAFB]'
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

                <div className="bg-[#FAFAFB] border border-[#E8E5EA] rounded-2xl p-4.5 flex flex-col">
                  <label className="block text-xs font-bold text-[#25232A] mb-2 flex items-center gap-1.5">
                    <span className="text-[#8F2A87]">🧵</span> تعليمات وتوجيهات الخياطة والقص
                  </label>
                  <textarea 
                    className={inputCls + " flex-1 h-auto min-h-[70px] resize-none bg-white"} 
                    placeholder="أي ملاحظات دقيقة خاصة بالمعمل أو طريقة القص، التطريز، والتبطين..." 
                    value={currM.sewing_notes || ''} 
                    onChange={e => updateMeasurement(activeChildIdx, 'sewing_notes', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              {/* 5. Auto Model & BOM Summary Box */}
              <div className="bg-gradient-to-r from-[#FCE8F2]/60 via-[#F2E7F3]/40 to-[#E2F5F7]/60 border border-[#E8E5EA] rounded-2xl p-4.5 flex flex-col items-center justify-center text-center gap-2">
                {(() => {
                  const selMod = currM.selected_model;
                  const len = currM.dress_length;
                  const estAge = currM.estimated_age;
                  
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
                    
                    const jumbo = getJumboFactor(currM);
                    if (jumbo.factor > 1) {
                      price = (price * jumbo.factor).toFixed(1);
                      baseMeters = (baseMeters * jumbo.factor).toFixed(2);
                    }

                    return (
                      <>
                        <div className="flex items-center gap-3 flex-wrap justify-center text-xs font-bold text-[#25232A]">
                          <span className="bg-white px-3 py-1.5 rounded-xl border border-[#E8E5EA] shadow-2xs">👗 الفستان: <strong className="text-[#B0005A]">{selMod}</strong></span>
                          <span>•</span>
                          <span className="bg-white px-3 py-1.5 rounded-xl border border-[#E8E5EA] shadow-2xs">العمر التقديري: <strong className="text-[#8F2A87]">{estAge || 'غير محدد'}</strong></span>
                          <span>•</span>
                          <span className="bg-[#E2F5F7] text-[#007F8C] px-3 py-1.5 rounded-xl border border-[#C5ECF0] shadow-2xs">السعر التقديري: <strong className="font-mono">{price} {currency.display}</strong></span>
                        </div>
                        {productData && productData.bom && (
                           <span className="text-xs text-[#6F6B75] font-medium">
                             أمتار الأقمشة المقدرة ({bracket}): <strong className="text-[#007F8C] font-mono">{baseMeters} متر</strong>
                           </span>
                        )}
                        {jumbo.factor > 1 && (
                          <div className="text-xs font-semibold text-[#C97300] bg-[#FFF1DC] px-3 py-1 rounded-lg border border-[#FFE4B9] mt-1 shadow-2xs">
                            ⚠️ تم تطبيق معامل عرض إضافي ({jumbo.factor.toFixed(2)}x) لضبط استهلاك القماش والتكلفة
                          </div>
                        )}
                      </>
                    );
                  } else {
                    return (
                      <span className="text-xs text-[#6F6B75] font-medium">
                        💡 اختر الموديل المعتمد وطول الفستان لحساب العمر التقديري، الأمتار، والتكلفة آلياً
                      </span>
                    );
                  }
                })()}
              </div>
            </div>
            </>
            )}

            <div className="flex justify-between pt-4 border-t border-[#E8E5EA]">
              <button
                type="button"
                onClick={() => setActiveCustomerSubTab('crm')}
                className="px-5 py-2 bg-white hover:bg-[#FAFAFB] text-[#6F6B75] border border-[#E8E5EA] text-xs font-bold rounded-xl transition cursor-pointer"
              >
                السابق (البيانات)
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
                    ? 'bg-[#FFF1DC] border-[#FFE4B9] text-[#C97300]' 
                    : 'bg-[#E2F5F7] border-[#C5ECF0] text-[#007F8C]'
                }`}>
                  {remaining} {currency.display} {parseFloat(remaining) <= 0 ? '(مسدد بالكامل ✅)' : ''}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#E8E5EA]">
              <div>
                <label className={labelCls}>طريقة الدفع</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className={inputCls}>
                  {['نقد (كاش)','حوالة بنكية','آجل (على الحساب)','تحويل إلكتروني'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>📎 رفع صورة السند / الإيصال المالي</label>
                <input type="file" accept="image/*" onChange={handleReceiptChange}
                  className="w-full h-11 p-1 rounded-xl border border-[#E8E5EA] bg-white text-xs font-semibold cursor-pointer file:mr-2 file:text-xs file:font-bold file:text-[#B0005A] file:bg-[#FCE8F2] file:border-0 file:rounded-lg file:px-3 file:py-1.5 hover:file:bg-[#F8D1E5]" />
                {receiptPreview && (
                  <div className="mt-2.5 flex items-center gap-3 p-3 bg-[#E2F5F7] rounded-xl border border-[#C5ECF0]">
                    <img src={receiptPreview} alt="معاينة السند" className="w-12 h-12 object-cover rounded-xl border border-[#C5ECF0] shadow-2xs" />
                    <div className="text-xs text-[#25232A] flex-1 flex items-center justify-between">
                      <span className="text-[#007F8C] font-bold">✅ تم إرفاق صورة السند بنجاح</span>
                      <button type="button" onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                        className="text-[#D64545] hover:underline text-xs font-bold cursor-pointer">إزالة الصورة</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-[#E8E5EA]">
              <button
                type="button"
                onClick={() => setActiveCustomerSubTab('measurements')}
                className="px-5 py-2 bg-white hover:bg-[#FAFAFB] text-[#6F6B75] border border-[#E8E5EA] text-xs font-bold rounded-xl transition cursor-pointer"
              >
                السابق (المقاسات)
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-2.5 bg-[#B0005A] hover:bg-[#8E0049] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                {loading ? 'جاري الحفظ...' : 'حفظ وتوثيق ملف العميلة بالكامل 💾'}
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
                <span className="text-xs font-bold text-[#25232A]">إجمالي العملاء المسجلين:</span>
                <span className="text-xs bg-[#FCE8F2] text-[#B0005A] font-bold px-2 py-0.5 rounded-md font-mono">{filtered.length}</span>
              </div>
              <div className="relative">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-3 pr-8 h-10 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-medium w-72 focus:bg-white focus:outline-none focus:border-[#B0005A] focus:ring-2 focus:ring-[#FCE8F2]"
                  placeholder="بحث بالاسم، رقم الهاتف، أو الكود..." />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] text-xs pointer-events-none">🔍</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-[#6F6B75] text-xs font-medium">
                  لا يوجد عملاء مسجلون يطابقون البحث 👤
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                      {['الكود','اسم العميلة','الهاتف','المنصة','المدينة','الفئة','التسجيل','الأطفال','المتبقي','الإجراءات'].map(h => (
                        <th key={h} className="px-4 py-3 text-right whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E5EA] bg-white">
                    {filtered.map((c, i) => {
                      const rem = parseFloat(c.ledger?.remaining) || 0;
                      return (
                        <tr key={c.id || c.customer_id || i} className="hover:bg-[#FAFAFB] transition-colors">
                          <td className="px-4 py-3 font-mono text-[11.5px] text-[#B0005A] font-bold whitespace-nowrap">{c.customer_id || `CUST-${i+1001}`}</td>
                          <td className="px-4 py-3 font-bold text-[#25232A] whitespace-nowrap">{c.name || '—'}</td>
                          <td className="px-4 py-3 font-mono text-[#6F6B75] whitespace-nowrap" dir="ltr" style={{textAlign:'right'}}>{c.phone || '—'}</td>
                          <td className="px-4 py-3 text-[#6F6B75] whitespace-nowrap">{c.platform ? c.platform.split(' ')[0] : '—'}</td>
                          <td className="px-4 py-3 text-[#6F6B75] whitespace-nowrap">{c.city || c.address || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-[10.5px] font-semibold px-2.5 py-0.5 rounded-md border ${catColor(c.category)}`}>{c.category || 'جديد'}</span>
                          </td>
                          <td className="px-4 py-3 text-[#6F6B75] font-mono whitespace-nowrap">{formatCleanDate(c.reg_date)}</td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {c.measurements && c.measurements.length > 0 ? (
                              <div className="flex flex-col gap-1 items-center">
                                {c.measurements.map((m, idx) => {
                                  const isStale = m.meas_date ? isMeasurementStale(m.meas_date) : false;
                                  return (
                                    <span key={idx} className="bg-[#FAFAFB] px-2 py-0.5 rounded text-[11px] font-medium text-[#25232A] border border-[#E8E5EA] flex items-center justify-between gap-1.5 min-w-[75px]">
                                      <span>{m.child_name || 'بدون اسم'}</span>
                                      {isStale && <span title="المقاس قديم (+90 يوم)" className="w-1.5 h-1.5 rounded-full bg-[#D64545]" />}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md border ${
                              rem > 0 ? 'bg-[#FFF1DC] text-[#C97300] border-[#FFE4B9]' : 'bg-[#E2F5F7] text-[#007F8C] border-[#C5ECF0]'
                            }`}>
                              {rem > 0 ? `${rem} ${currency.display}` : 'مسدد ✅'}
                            </span>
                          </td>
                          <td className="px-4 py-3 flex items-center gap-1.5 justify-center whitespace-nowrap">
                            <button onClick={() => setSelectedInvoice(c)} title="طباعة فاتورة مالية (PDF)" 
                              className="w-8 h-8 rounded-xl bg-white hover:bg-[#FCE8F2] text-[#6F6B75] hover:text-[#B0005A] border border-[#E8E5EA] transition-all flex items-center justify-center cursor-pointer">
                              <Icons.Vouchers className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setSelectedJobCard(c)} title="بطاقة المعمل والقص (Job Card)" 
                              className="w-8 h-8 rounded-xl bg-white hover:bg-[#F2E7F3] text-[#6F6B75] hover:text-[#8F2A87] border border-[#E8E5EA] transition-all flex items-center justify-center cursor-pointer">
                              <Icons.Factory className="w-3.5 h-3.5" />
                            </button>
                            <a href={`https://wa.me/${String(c.phone||'').replace(/^0+/, '967').replace(/\D/g,'')}?text=${encodeURIComponent('مرحباً ' + c.name + '، إليك كشف الحساب الخاص بك من مؤسسة الأميرات الصغيرات.')}`} 
                              target="_blank" rel="noopener noreferrer" title="إرسال كشف واتساب" 
                              className="w-8 h-8 rounded-xl bg-white hover:bg-[#E2F5F7] text-[#6F6B75] hover:text-[#007F8C] border border-[#E8E5EA] transition-all flex items-center justify-center cursor-pointer">
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

      {selectedInvoice && ReactDOM.createPortal(
        <InvoiceModal customer={selectedInvoice} onClose={() => setSelectedInvoice(null)} currency={currency} />,
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
function InvoiceModal({ customer, onClose, currency = { display: 'YER' } }) {
  if (!customer) return null;
  const cur = currency.display || "YER ريال";
  const ledger = customer.ledger || {};
  const remaining = Math.max(0, (parseFloat(ledger.total_sales) || 0) - (parseFloat(ledger.total_paid) || 0));

  const handlePrint = () => {
    const html = `
      <html dir="rtl"><head><meta charset="utf-8"><title>فاتورة - ${customer.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #25232A; }
        h2 { color: #B0005A; text-align: center; margin: 0 0 4px; }
        h3 { text-align: center; color: #6F6B75; margin: 0 0 20px; }
        hr { border: none; border-top: 1px dashed #E8E5EA; margin: 16px 0; }
        .row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
        .label { color: #6F6B75; }
        .val { font-weight: bold; }
        .rem { color: ${remaining > 0 ? '#C97300' : '#007F8C'}; font-weight: 900; font-size: 16px; }
        .children { background:#FAFAFB; border: 1px solid #E8E5EA; border-radius:8px; padding:12px; margin:12px 0; }
        .child-row { font-size:12px; color:#6F6B75; margin:4px 0; }
        .qr { text-align: center; margin-top: 20px; }
        .footer { text-align:center; font-size:11px; color:#6F6B75; margin-top:20px; }
      </style></head><body>
      <h2>👑 Little Princesses ERP</h2>
      <h3>كشف حساب وفاتورة عميلة</h3>
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
      <div class="children"><strong>الأطفال المسجلون والفساتين:</strong>
      ${customer.measurements.map(m => `<div class="child-row">• ${m.child_name||'—'} | العمر: ${m.estimated_age||'—'} | الموديل: ${m.selected_model||'—'} | التسليم: ${m.event_date||'—'}</div>`).join('')}
      </div>` : ''}
      <div class="qr">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=Customer:${customer.customer_id}|Remaining:${remaining}" alt="QR"/>
        <p style="font-size:11px;color:#6F6B75;">امسح الكود لعرض ملف العميلة</p>
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
    <div style={{position:'fixed',inset:0,background:'rgba(37,35,42,0.6)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:16,padding:28,maxWidth:460,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,0.15)',border:'1px solid #E8E5EA'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h3 style={{margin:0,color:'#B0005A',fontSize:16,fontWeight:'bold'}}>👑 فاتورة العميلة: {customer.name}</h3>
          <button onClick={onClose} style={{background:'#FAFAFB',border:'1px solid #E8E5EA',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:16,color:'#6F6B75'}}>✕</button>
        </div>
        <div style={{fontSize:13,lineHeight:2,color:'#25232A'}}>
          <div><strong>📞 الهاتف:</strong> {customer.phone || '—'}</div>
          <div><strong>🏙️ المدينة:</strong> {customer.city || '—'}</div>
          <div><strong>💰 إجمالي المبيعات:</strong> {(parseFloat(customer.ledger?.total_sales)||0).toLocaleString('en-US')} {cur}</div>
          <div><strong>✅ المدفوع:</strong> {(parseFloat(customer.ledger?.total_paid)||0).toLocaleString('en-US')} {cur}</div>
          <div style={{color: remaining>0?'#C97300':'#007F8C', fontWeight:900}}>
            <strong>⚠️ المتبقي:</strong> {remaining.toLocaleString('en-US')} {cur} {remaining===0?'(مسدد بالكامل ✅)':''}
          </div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:20}}>
          <button onClick={handlePrint} style={{flex:1,padding:'10px',background:'#B0005A',color:'#fff',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer',fontSize:13}}>
            🖨️ طباعة الفاتورة
          </button>
          <button onClick={onClose} style={{padding:'10px 16px',background:'#FAFAFB',border:'1px solid #E8E5EA',borderRadius:10,cursor:'pointer',fontWeight:600,color:'#25232A'}}>
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
        body { font-family: Arial, sans-serif; padding: 24px; color: #25232A; }
        h2 { color: #8F2A87; text-align: center; margin:0 0 4px; }
        hr { border:none; border-top:1px dashed #E8E5EA; margin:14px 0; }
        .card { background:#FAFAFB; border:1px solid #E8E5EA; border-radius:10px; padding:14px; margin:12px 0; }
        .row { display:flex; justify-content:space-between; font-size:13px; margin:6px 0; }
        .label { color:#8F2A87; font-weight:600; }
        .val { font-weight:bold; color:#25232A; }
        .footer { text-align:center; font-size:11px; color:#6F6B75; margin-top:20px; }
      </style></head><body>
      <h2>✂️ بطاقة المعمل والقص — Little Princesses</h2>
      <hr/>
      <div class="row"><span class="label">العميلة</span><span class="val">${customer.name || '—'}</span></div>
      <div class="row"><span class="label">الهاتف</span><span class="val">${customer.phone || '—'}</span></div>
      ${(customer.measurements||[]).map((m,i) => `
      <div class="card">
        <strong>الطفلة ${i+1}: ${m.child_name||'غير مسمى'}</strong>
        <div class="row"><span class="label">الموديل المعتمد</span><span class="val">${m.selected_model||'—'}</span></div>
        <div class="row"><span class="label">العمر التقديري</span><span class="val">${m.estimated_age||'—'}</span></div>
        <div class="row"><span class="label">موعد التسليم</span><span class="val">${m.event_date||'—'}</span></div>
        <div class="row"><span class="label">الطول الكلي</span><span class="val">${m.total_height||'—'} ${m.unit||'سم'}</span></div>
        <div class="row"><span class="label">محيط الصدر</span><span class="val">${m.chest_circ||'—'} ${m.unit||'سم'}</span></div>
        <div class="row"><span class="label">محيط الخصر</span><span class="val">${m.waist_circ||'—'} ${m.unit||'سم'}</span></div>
        <div class="row"><span class="label">طول الفستان</span><span class="val">${m.dress_length||'—'} ${m.unit||'سم'}</span></div>
        <div class="row"><span class="label">ملاحظات وتوجيهات الخياطة</span><span class="val">${m.sewing_notes||'—'}</span></div>
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
    <div style={{position:'fixed',inset:0,background:'rgba(37,35,42,0.6)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:16,padding:28,maxWidth:480,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,0.15)',maxHeight:'85vh',overflowY:'auto',border:'1px solid #E8E5EA'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h3 style={{margin:0,color:'#8F2A87',fontSize:16,fontWeight:'bold'}}>✂️ بطاقة المعمل: {customer.name}</h3>
          <button onClick={onClose} style={{background:'#FAFAFB',border:'1px solid #E8E5EA',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:16,color:'#6F6B75'}}>✕</button>
        </div>
        {(customer.measurements||[]).length === 0 ? (
          <p style={{textAlign:'center',color:'#6F6B75'}}>لا توجد مقاسات مسجلة لهذه العميلة</p>
        ) : (customer.measurements||[]).map((m,i) => (
          <div key={i} style={{background:'#FAFAFB',borderRadius:12,padding:14,marginBottom:10,fontSize:12,lineHeight:1.8,border:'1px solid #E8E5EA'}}>
            <div style={{fontWeight:'bold',color:'#8F2A87',marginBottom:6}}>الطفلة: {m.child_name||'غير مسمى'} — {m.selected_model||'بدون موديل'}</div>
            <div><strong>العمر:</strong> {m.estimated_age||'—'} | <strong>التسليم:</strong> {m.event_date||'—'}</div>
            <div><strong>الطول الكلي:</strong> {m.total_height||'—'} | <strong>محيط الصدر:</strong> {m.chest_circ||'—'} | <strong>الخصر:</strong> {m.waist_circ||'—'}</div>
            <div><strong>طول الفستان:</strong> {m.dress_length||'—'} | <strong>طول الكم:</strong> {m.sleeve_length||'—'}</div>
            {m.sewing_notes && <div style={{color:'#6F6B75',marginTop:4}}>📝 {m.sewing_notes}</div>}
          </div>
        ))}
        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button onClick={handlePrint} style={{flex:1,padding:'10px',background:'#8F2A87',color:'#fff',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer',fontSize:13}}>
            🖨️ طباعة بطاقة المعمل
          </button>
          <button onClick={onClose} style={{padding:'10px 16px',background:'#FAFAFB',border:'1px solid #E8E5EA',borderRadius:10,cursor:'pointer',fontWeight:600,color:'#25232A'}}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
