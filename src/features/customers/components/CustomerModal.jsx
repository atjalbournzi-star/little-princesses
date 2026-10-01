// src/features/customers/components/CustomerModal.jsx
const { useState, useEffect, useMemo, useRef } = React;

function CustomerModal({
  isOpen, onClose, customer, customers = [], onSave, onDeleteCustomer,
  isSaving = false, showToast, currentStep = 1, onSwitchStep
}) {
  const { genCustId } = window.customerUtils || {};
  const todayStr = (typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : (window.TODAY_STR_ISO || new Date().toISOString().slice(0, 10)));

  const [custId, setCustId] = useState(''), [name, setName] = useState(''), [phone, setPhone] = useState(''), [phoneAlt, setPhoneAlt] = useState('');
  const [platform, setPlatform] = useState('واتساب (WhatsApp)'), [handle, setHandle] = useState(''), [category, setCategory] = useState('جديد');
  const [city, setCity] = useState(''), [street, setStreet] = useState(''), [regDate, setRegDate] = useState(todayStr), [notes, setNotes] = useState('');
  const [importedMeasurements, setImportedMeasurements] = useState([]), [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const cleanCity = v => (v && String(v).trim().toLowerCase() === 'cloin') ? 'صنعاء' : (v || '');
    if (customer) {
      setCustId(customer.customer_id || customer.id || (genCustId ? genCustId(customers) : 'CUST-1001'));
      setName(customer.name || customer.customer_name || ''); setPhone(customer.phone || ''); setPhoneAlt(customer.phone_alt || '');
      setPlatform(customer.platform || 'واتساب (WhatsApp)'); setHandle(customer.handle || ''); setCategory(customer.category || 'جديد');
      setCity(cleanCity(customer.city)); setStreet(customer.street || customer.address || ''); setRegDate(customer.reg_date || customer.created_at || todayStr); setNotes(customer.notes || '');
      setImportedMeasurements(Array.isArray(customer.measurements) ? customer.measurements : []);
    } else {
      setCustId(genCustId ? genCustId(customers) : `CUST-${(customers.length || 0) + 1001}`);
      setName(''); setPhone(''); setPhoneAlt(''); setPlatform('واتساب (WhatsApp)'); setHandle('');
      setCategory('جديد'); setCity(''); setStreet(''); setRegDate(todayStr); setNotes('');
      setImportedMeasurements([]);
    }
  }, [customer, isOpen, customers, genCustId, todayStr]);

  useEffect(() => {
    const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMatches = useMemo(() => {
    if (customer) return [];
    const q = (name || '').trim().toLowerCase(), cleanQ = q.replace(/\D/g, '');
    if (!q) return (customers || []).slice(0, 8);
    return (customers || []).filter(c => {
      const cName = String(c.name || c.customer_name || '').toLowerCase();
      const cPhone = String(c.phone || '').replace(/\D/g, ''), cAlt = String(c.phone_alt || '').replace(/\D/g, '');
      const cId = String(c.customer_id || c.id || '').toLowerCase();
      return cName.includes(q) || cId.includes(q) || (cleanQ.length > 0 && (cPhone.includes(cleanQ) || cAlt.includes(cleanQ)));
    }).slice(0, 8);
  }, [name, customers, customer]);

  const selectExistingCustomer = (c) => {
    setCustId(c.customer_id || c.id || (genCustId ? genCustId(customers) : 'CUST-1001'));
    setName(c.name || c.customer_name || ''); setPhone(c.phone || ''); setPhoneAlt(c.phone_alt || '');
    setPlatform(c.platform || 'واتساب (WhatsApp)'); setHandle(c.handle || ''); setCategory(c.category || 'جديد');
    setCity((c.city && String(c.city).trim().toLowerCase() === 'cloin') ? 'صنعاء' : (c.city || ''));
    setStreet(c.street || c.address || ''); setRegDate(c.reg_date || c.created_at || todayStr); setNotes(c.notes || '');
    let prevMeas = Array.isArray(c.measurements) && c.measurements.length > 0 ? c.measurements : [];
    if (!prevMeas.length && Array.isArray(c.children) && c.children.length > 0) {
      prevMeas = c.children.map(ch => ({ child_name: ch.child_name, child_id: ch.id, unit: 'سم' }));
    }
    if (!prevMeas.length) {
      const match = (customers || []).find(x => (x.customer_id === (c.customer_id || c.id) || x.id === (c.customer_id || c.id) || (c.phone && x.phone === c.phone)) && Array.isArray(x.measurements) && x.measurements.length > 0);
      if (match) prevMeas = match.measurements;
    }
    setImportedMeasurements(prevMeas); setShowDropdown(false);
    showToast && showToast(`✅ تم استيراد بيانات (${c.name})${prevMeas.length > 0 ? ` مع ${prevMeas.length} مقاس سابق 📏` : ''}`, 'success');
  };

  const handleSubmit = (e, proceedToMeasurements = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!name.trim()) return showToast && showToast('اسم العميل مطلوب ⚠️', 'error');
    if (!phone.trim()) return showToast && showToast('رقم الهاتف مطلوب ⚠️', 'error');
    const mList = (importedMeasurements.length > 0 ? importedMeasurements : (customer?.measurements || []));
    const chList = (customer?.children && customer.children.length > 0) ? customer.children : mList.map((m, i) => ({ child_name: m.child_name || `الأميرة (${i + 1})`, id: m.child_id || '' }));
    const payload = {
      ...(customer || {}),
      customer_id: custId, name: name.trim(), phone: phone.trim(), phone_alt: phoneAlt.trim(), platform, handle: handle.trim(),
      category, city: city.trim(), street: street.trim(), reg_date: regDate, notes: notes.trim(),
      measurements: mList, children: chList,
      ledger: customer?.ledger || { total_sales: 0, deposit: 0, total_paid: 0, remaining: 0 }
    };
    onSave && onSave(payload, proceedToMeasurements);
  };

  if (!isOpen) return null;
  const Layout = window.UnifiedCustomerModalLayout;
  const inputCls = "w-full h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-900/80 text-white font-bold text-xs placeholder:text-slate-500 focus:border-pink-500 outline-none transition-all";
  const labelCls = "block text-[10.5px] font-semibold text-slate-300 mb-0.5";
  const modalTitle = customer ? `إدارة ملف العميل • ${customer.name || customer.customer_name || ''}` : 'إضافة عميل جديد للنظام';

  const footerRightButtons = (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onClose} className="h-7 px-3 text-xs text-slate-400 hover:text-white rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer">
        إلغاء
      </button>
      {customer && onDeleteCustomer && (
        <button 
          type="button" 
          onClick={() => onDeleteCustomer(customer)} 
          className="h-7 px-2.5 text-[11px] font-bold text-red-400 hover:text-white hover:bg-red-600/80 border border-red-500/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          title="حذف العميل"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
          </svg>
          <span>حذف العميل</span>
        </button>
      )}
    </div>
  );

  const footerLeftButtons = (
    <div className="flex items-center gap-2">
      <button type="button" onClick={e => handleSubmit(e, true)} disabled={isSaving} className="h-8 px-3.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs">
        <span>حفظ ومتابعة للمقاسات 📏</span>
      </button>
      <button type="button" onClick={e => handleSubmit(e, false)} disabled={isSaving} className="h-8 px-4 text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white rounded-lg shadow-md transition flex items-center gap-1 cursor-pointer disabled:opacity-60">
        {isSaving ? 'جاري الحفظ...' : 'حفظ وإغلاق 💾'}
      </button>
    </div>
  );

  return (
    <Layout
      isOpen={isOpen} onClose={onClose} step={1} onSwitchStep={onSwitchStep}
      title={modalTitle} customerCode={custId}
      footerRight={footerRightButtons} footerLeft={footerLeftButtons}
    >
      <form onSubmit={e => handleSubmit(e, false)} className="space-y-2.5">
        {importedMeasurements.length > 0 && (
          <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-800/60 flex items-center justify-between text-xs animate-fadeIn">
            <div className="flex items-center gap-1.5 text-purple-300 text-[11px] font-medium">
              <span>📏</span>
              <span>تم استيراد المقاسات ({importedMeasurements.length} مقاس: {importedMeasurements.map(m => m.child_name || 'الأميرة').join('، ')})</span>
            </div>
            <span className="text-[9.5px] font-bold text-purple-300 bg-[#0F172A] px-2 py-0.5 rounded border border-purple-800/40">معتمد للطلب الجديد ✨</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {/* اسم العميل */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-0.5">
              <label className={labelCls}>اسم العميل / المنشأة <span className="text-rose-500">*</span></label>
              {!customer && (
                <button type="button" onClick={() => setShowDropdown(p => !p)} className="text-[9.5px] font-bold text-purple-300 hover:text-pink-300 bg-purple-950/50 px-1.5 py-0.2 rounded border border-purple-800/50 transition cursor-pointer" title="استيراد عميل مسجل">
                  🔍 استيراد
                </button>
              )}
            </div>
            <div className="relative">
              <input required value={name} onChange={e => { setName(e.target.value); if (!customer) setShowDropdown(true); }} onFocus={() => { if (!customer) setShowDropdown(true); }} className={inputCls} placeholder="اكتب الاسم أو الهاتف..." autoComplete="off" />
              {name && !customer && <button type="button" onClick={() => { setName(''); setShowDropdown(true); }} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-[10px] cursor-pointer">✕</button>}
            </div>
            {showDropdown && !customer && (
              <div className="absolute z-50 right-0 left-0 mt-1 bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-800 animate-fadeIn">
                <div className="p-1.5 text-[10px] font-bold text-slate-400 bg-slate-900 flex justify-between items-center">
                  <span>{name.trim() ? `نتائج (${name.trim()}):` : 'عملاء سابقون:'}</span>
                  <span className="text-[9.5px] font-mono text-slate-500">{filteredMatches.length}</span>
                </div>
                {filteredMatches.length > 0 ? filteredMatches.map(c => {
                  const mCount = Array.isArray(c.measurements) ? c.measurements.length : 0;
                  return (
                    <div key={c.id || c.customer_id} onClick={() => selectExistingCustomer(c)} className="p-2 hover:bg-slate-800 cursor-pointer flex justify-between items-center text-xs transition">
                      <div>
                        <div className="flex items-center gap-1.5"><span className="font-bold text-white text-[11px]">{c.name || c.customer_name}</span><span className="text-[9px] px-1 rounded bg-purple-950 text-purple-300">{c.category || 'جديد'}</span></div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono"><span>📞 {c.phone || '—'}</span>{mCount > 0 && <span className="text-purple-300 font-sans">📏 {mCount}</span>}</div>
                      </div>
                      <span className="text-[9.5px] text-pink-300 font-bold bg-pink-950/60 px-1.5 py-0.5 rounded border border-pink-800/60">استيراد ↵</span>
                    </div>
                  );
                }) : <div className="p-2.5 text-center text-[10.5px] text-slate-400">لا يوجد عميل مطابق ⚠️</div>}
              </div>
            )}
          </div>

          {/* الهاتف الرئيسي */}
          <div>
            <div className="flex justify-between items-center mb-0.5">
              <label className={labelCls}>الهاتف (واتساب) <span className="text-rose-500">*</span></label>
              {phone && <a href={`https://wa.me/${String(phone).replace(/^0+/, '967').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-cyan-400 hover:underline font-bold">💬 واتساب</a>}
            </div>
            <input required value={phone} onChange={e => setPhone(e.target.value)} className={inputCls + " font-mono text-left"} placeholder="مثال: 771234567" type="tel" dir="ltr" />
          </div>

          <div>
            <label className={labelCls}>الهاتف الإضافي / البديل</label>
            <input value={phoneAlt} onChange={e => setPhoneAlt(e.target.value)} className={inputCls + " font-mono text-left"} placeholder="رقم هاتف ثانٍ..." type="tel" dir="ltr" />
          </div>
          <div>
            <label className={labelCls}>منصة التواصل</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)} className={inputCls}>
              {['واتساب (WhatsApp)','انستغرام (Instagram)','فيسبوك (Facebook)','تيك توك (TikTok)','سناب شات (Snapchat)','مباشر / زيارة المعرض'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>اسم الحساب / المعرف</label>
            <input value={handle} onChange={e => setHandle(e.target.value)} className={inputCls} placeholder="@user_handle" dir="ltr" />
          </div>
          <div>
            <label className={labelCls}>فئة العميل (CRM Tier)</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
              {['جديد', 'دائم', 'VIP'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>المدينة / المنطقة</label>
            <input value={city} onChange={e => setCity(e.target.value)} className={inputCls} placeholder="مثال: صنعاء، عدن..." />
          </div>
          <div>
            <label className={labelCls}>الشارع / العنوان التفصيلي</label>
            <input value={street} onChange={e => setStreet(e.target.value)} className={inputCls} placeholder="الشارع، نقطة دالة..." />
          </div>
          <div>
            <label className={labelCls}>تاريخ التسجيل</label>
            <input type="date" lang="en-GB" dir="ltr" value={regDate} onChange={e => setRegDate(e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={labelCls}>ملاحظات وتفضيلات العميل</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} placeholder="أي تفضيلات أو ملاحظات إضافية..." />
          </div>
        </div>
      </form>
    </Layout>
  );
}

window.CustomerModal = CustomerModal;
window.CustomerBasicInfoModal = CustomerModal;
