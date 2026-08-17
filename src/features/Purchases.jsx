const { useState, useEffect, useMemo, useCallback, useRef } = React;
function Purchases({ purchases = [], setPurchases, inventory = [], setInventory, accounts = [], showToast, currency }) {
  const UNITS = ['متر', 'وار (ياردة)', 'سم', 'حبة (قطعة)', 'رول (طاقة)'];
  const VALID_UNITS = ['متر', 'وار (ياردة)', 'سم', 'حبة (قطعة)', 'رول (طاقة)', 'يارده', 'وار'];
  const genBillNo = () => `PUR-${Math.floor(1000 + Math.random() * 9000)}`;
  const defaultCurrency = (typeof CURRENCIES !== 'undefined' ? (typeof CURRENCIES[0] === 'object' ? CURRENCIES[0].value : CURRENCIES[0]) : 'YER ﷼');
  const defaultPayType = (typeof PAY_METHODS !== 'undefined' ? PAY_METHODS[0] : 'نقدي');

  const emptyHeader = () => ({ bill_no: genBillNo(), supplier: '', currency: defaultCurrency, pay_type: defaultPayType, transfer_no: '', payment_source: '', receipt_url: '', date: TODAY_STR_ISO, freight_cost: '', transfer_fees: '' });
  const emptyItem = () => ({ item: '', unit: 'متر', qty: '', price: '', total: '' });

  const [headerData, setHeaderData] = React.useState(emptyHeader);
  const [itemData, setItemData] = React.useState(emptyItem);
  const [editingIndex, setEditingIndex] = React.useState(null);
  const [billItems, setBillItems] = React.useState([]);
  const [previewImage, setPreviewImage] = React.useState(null);

  // ── نافذة تعديل سجل موجود ──
  const [editRecord, setEditRecord] = React.useState(null); // السجل المفتوح للتعديل
  const [editSaving, setEditSaving] = React.useState(false);

  // ── رفع صورة السند ──
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return showToast('حجم الصورة كبير جداً (أقصاه 5 ميجابايت) ⚠️', 'error');
    const reader = new FileReader();
    reader.onloadend = () => { setHeaderData(prev => ({ ...prev, receipt_url: reader.result })); showToast('تم إرفاق صورة السند من الاستوديو 🖼️'); };
    reader.readAsDataURL(file);
  };

  // ── الحاسبة التفاعلية ──
  const handleQtyChange = (val) => { const q = parseFloat(val)||0, p = parseFloat(itemData.price)||0; setItemData(prev => ({ ...prev, qty: val, total: q>0&&p>0 ? String((q*p).toFixed(2)) : prev.total })); };
  const handlePriceChange = (val) => { const p = parseFloat(val)||0, q = parseFloat(itemData.qty)||0; setItemData(prev => ({ ...prev, price: val, total: q>0&&p>0 ? String((q*p).toFixed(2)) : prev.total })); };
  const handleTotalChange = (val) => { const tot = parseFloat(val)||0, q = parseFloat(itemData.qty)||0; setItemData(prev => ({ ...prev, total: val, price: q>0&&tot>0 ? String((tot/q).toFixed(2)) : prev.price })); };

  // ── إضافة / تعديل صنف ──
  const handleAddOrUpdateItem = (e) => {
    e.preventDefault();
    if (!itemData.item.trim()) return showToast('اسم الصنف مطلوب ⚠️', 'error');
    const q = parseFloat(itemData.qty); if (!q || q <= 0) return showToast('الكمية مطلوبة ⚠️', 'error');
    let p = parseFloat(itemData.price)||0, tot = parseFloat(itemData.total)||0;
    if (tot>0&&p<=0) p=tot/q; else if (p>0&&tot<=0) tot=q*p;
    if (p<=0&&tot<=0) return showToast('السعر أو الإجمالي مطلوب ⚠️', 'error');
    const obj = { item: itemData.item.trim(), unit: itemData.unit||'متر', qty: q, price: parseFloat(p.toFixed(2)), total: parseFloat(tot.toFixed(2)) };
    if (editingIndex !== null) { const u=[...billItems]; u[editingIndex]=obj; setBillItems(u); setEditingIndex(null); showToast('تم تحديث الصنف ✏️'); }
    else { setBillItems(prev=>[...prev,obj]); showToast('تمت إضافة الصنف ➕'); }
    setItemData(emptyItem());
  };

  const grandTotal = billItems.reduce((acc,curr)=>acc+(parseFloat(curr.total)||0),0) + (parseFloat(headerData.freight_cost)||0);

  // ── حفظ الفاتورة الجديدة ──
  const handleSaveFullBill = async () => {
    if (!headerData.supplier.trim()) return showToast('اسم المورد مطلوب ⚠️', 'error');
    if (billItems.length === 0) return showToast('الفاتورة فارغة! أضف صنفاً ⚠️', 'error');
    try {
      const payload = {
        bill_no: headerData.bill_no,
        supplier: headerData.supplier,
        pay_type: headerData.pay_type || defaultPayType,
        payment_source: headerData.payment_source || '',
        transfer_no: headerData.transfer_no || '',
        currency: headerData.currency || defaultCurrency,
        date: headerData.date || TODAY_STR_ISO,
        freight_cost: parseFloat(headerData.freight_cost) || 0,
        transfer_fees: parseFloat(headerData.transfer_fees) || 0,
        receipt_url: headerData.receipt_url || '',
        items: billItems.map(itm => ({
          item_name: itm.item,
          unit: itm.unit || 'متر',
          qty: parseFloat(itm.qty) || 0,
          cost: parseFloat(itm.price) || 0
        }))
      };

      const res = await fetch("http://127.0.0.1:5002/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "فشل الحفظ");

      showToast(`✅ تم حفظ الفاتورة ${headerData.bill_no} محلياً وجاري المزامنة السحابية 👑`);
      
      const nextNo = genBillNo();
      setHeaderData({bill_no:nextNo,supplier:'',currency:defaultCurrency,pay_type:defaultPayType,transfer_no:'',payment_source:'',receipt_url:'',date:TODAY_STR_ISO,freight_cost:'',transfer_fees:''});
      setBillItems([]); setItemData(emptyItem()); setEditingIndex(null);
    } catch(err) { console.error(err); showToast('خطأ أثناء الحفظ ⚠️ تأكد من تشغيل الخادم الخلفي', 'error'); }
  };

  // ── تعديل سجل موجود وحفظه في Google Sheets مباشرة ──
  const handleOpenEdit = (p) => {
    const VALID_UNITS_CHECK = ['متر', 'وار (ياردة)', 'سم', 'حبة (قطعة)', 'رول (طاقة)', 'يارده', 'وار'];
    let rawUnit=p.unit, rawQty=p.qty, rawPrice=p.price, rawTotal=p.total;
    const unitIsNum = rawUnit!==undefined && rawUnit!=='' && !isNaN(parseFloat(rawUnit)) && !VALID_UNITS_CHECK.includes(String(rawUnit));
    if (unitIsNum) { rawQty=parseFloat(rawUnit); rawPrice=parseFloat(p.qty)||0; rawTotal=parseFloat(p.price)||0; rawUnit='متر'; }
    setEditRecord({ ...p, item: p.item||p.item_name||'', unit: rawUnit||'متر', qty: rawQty||'', price: rawPrice||'', total: rawTotal||'' });
  };

  const handleEditRecordChange = (field, val) => {
    setEditRecord(prev => {
      const updated = { ...prev, [field]: val };
      if (field==='qty'||field==='price') { const q=parseFloat(updated.qty)||0, p2=parseFloat(updated.price)||0; if(q>0&&p2>0) updated.total=String((q*p2).toFixed(2)); }
      if (field==='total') { const tot=parseFloat(val)||0, q=parseFloat(updated.qty)||0; if(q>0&&tot>0) updated.price=String((tot/q).toFixed(2)); }
      return updated;
    });
  };

  const handleSaveEditRecord = async () => {
    if (!editRecord) return;
    if (!editRecord.item || !String(editRecord.item).trim()) return showToast('اسم الصنف مطلوب ⚠️', 'error');
    const qty = parseFloat(editRecord.qty)||0;
    if (qty <= 0) return showToast('الكمية مطلوبة ⚠️', 'error');
    let price = parseFloat(editRecord.price)||0, total = parseFloat(editRecord.total)||0;
    if (total>0&&price<=0) price=total/qty;
    else if (price>0&&total<=0) total=qty*price;
    setEditSaving(true);
    try {
      const payload = { id: String(editRecord.id), bill_no: editRecord.bill_no, supplier: editRecord.supplier, item: String(editRecord.item).trim(), item_name: String(editRecord.item).trim(), unit: editRecord.unit||'متر', qty, price: parseFloat(price.toFixed(2)), total: parseFloat(total.toFixed(2)), currency: editRecord.currency, pay_type: editRecord.pay_type, transfer_no: editRecord.transfer_no||'', payment_source: editRecord.payment_source||'', date: editRecord.date };
      await callGAS('updatePurchase', payload);
      if (setPurchases) setPurchases(prev => prev.map(r => String(r.id)===String(editRecord.id) ? { ...r, ...payload } : r));
      showToast('✅ تم تحديث السجل في Google Sheets بنجاح');
      setEditRecord(null);
    } catch(err) { console.error(err); showToast('خطأ أثناء التحديث ⚠️', 'error'); }
    setEditSaving(false);
  };

  const handleDeleteRecord = async (p) => {
    if (!window.confirm(`هل أنت متأكد من حذف الفاتورة ${p.bill_no||p.id}؟`)) return;
    try {
      await callGAS('deletePurchase', { id: String(p.id) });
      if (setPurchases) setPurchases(prev => prev.filter(r => String(r.id) !== String(p.id)));
      showToast('🗑️ تم حذف السجل من Google Sheets');
    } catch(err) { showToast('خطأ أثناء الحذف ⚠️', 'error'); }
  };

  // ── تطبيع البيانات القديمة ──
  const normalizePurchase = (p) => {
    let rawUnit=p.unit, rawQty=p.qty, rawPrice=p.price, rawTotal=p.total, rawDate=p.date, rawTransfer=p.transfer_no;
    const unitIsNum = rawUnit!==undefined && rawUnit!=='' && !isNaN(parseFloat(rawUnit)) && !VALID_UNITS.includes(String(rawUnit));
    if (unitIsNum) { rawQty=parseFloat(rawUnit); rawPrice=parseFloat(p.qty)||0; rawTotal=parseFloat(p.price)||0; rawUnit='متر'; }
    const transferIsDate = rawTransfer && /^\d{4}-\d{2}-\d{2}/.test(String(rawTransfer));
    if (transferIsDate) { if (!rawDate||rawDate==='') rawDate=String(rawTransfer).slice(0,10); rawTransfer=''; }
    if (rawDate && String(rawDate).includes('T')) rawDate=String(rawDate).slice(0,10);
    const qty=parseFloat(rawQty||0), price=parseFloat(rawPrice||0);
    let total=parseFloat(rawTotal||0); if(total<=0&&qty>0&&price>0) total=qty*price;
    return { qty, price, total, unit: VALID_UNITS.includes(String(rawUnit)) ? rawUnit : (rawUnit||'متر'), date: rawDate||'', transfer: rawTransfer||'' };
  };

  return (
    <div className="space-y-6 animate-fadeIn text-xs" dir="rtl">

      {/* نافذة معاينة الصورة */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setPreviewImage(null)}>
          <div className="relative max-w-2xl w-full bg-white p-3 rounded-3xl" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-2 mb-2">
              <span className="font-black text-slate-900 text-xs">🖼️ صورة السند المرفق</span>
              <button onClick={()=>setPreviewImage(null)} className="text-rose-600 font-black px-2">✕</button>
            </div>
            <img src={previewImage} alt="السند" className="w-full max-h-[75vh] object-contain rounded-2xl border" />
          </div>
        </div>
      )}

      {/* ── نافذة تعديل سجل موجود ── */}
      {editRecord && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3" onClick={()=>setEditRecord(null)}>
          <div className="bg-white rounded-3xl p-5 w-full max-w-xl shadow-2xl space-y-4" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-purple-950 text-sm">✏️ تعديل سجل — {editRecord.bill_no||editRecord.id}</h3>
              <button onClick={()=>setEditRecord(null)} className="text-rose-500 font-black text-lg leading-none">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1">📦 اسم الصنف / القماش *</label>
                <input type="text" className="w-full p-2.5 rounded-xl border font-bold bg-purple-50 border-purple-300" placeholder="أدخل اسم الصنف" value={editRecord.item||''} onChange={e=>handleEditRecordChange('item',e.target.value)} />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">📐 وحدة القياس</label>
                <select className="w-full p-2.5 rounded-xl border font-bold bg-white" value={editRecord.unit||'متر'} onChange={e=>handleEditRecordChange('unit',e.target.value)}>
                  {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">الكمية *</label>
                <input type="number" step="0.01" min="0" className="w-full p-2.5 rounded-xl border font-bold bg-white text-center" value={editRecord.qty||''} onChange={e=>handleEditRecordChange('qty',e.target.value)} />
              </div>
              <div>
                <label className="block font-bold text-purple-800 mb-1">🏷️ السعر الإفرادي</label>
                <input type="number" step="0.01" min="0" className="w-full p-2.5 rounded-xl border font-bold text-center text-purple-900" value={editRecord.price||''} onChange={e=>handleEditRecordChange('price',e.target.value)} />
              </div>
              <div>
                <label className="block font-bold text-emerald-800 mb-1">💰 الإجمالي</label>
                <input type="number" step="0.01" min="0" className="w-full p-2.5 rounded-xl border font-bold text-center text-emerald-800 bg-emerald-50" value={editRecord.total||''} onChange={e=>handleEditRecordChange('total',e.target.value)} />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المورد</label>
                <input type="text" className="w-full p-2.5 rounded-xl border font-bold bg-white" value={editRecord.supplier||''} onChange={e=>handleEditRecordChange('supplier',e.target.value)} />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">📲 رقم الحوالة</label>
                <input type="text" className="w-full p-2.5 rounded-xl border font-bold bg-white" placeholder="TRF-12345" value={editRecord.transfer_no||''} onChange={e=>handleEditRecordChange('transfer_no',e.target.value)} />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">حساب الدفع</label>
                <select className="w-full p-2.5 rounded-xl border font-bold bg-white" value={editRecord.payment_source||''} onChange={e=>handleEditRecordChange('payment_source',e.target.value)}>
                  <option value="">-- اختر --</option>
                  {(accounts||[]).map(a=>{const c=a.acc_code||a.code||'',n=a.acc_name||a.name||'';return <option key={c} value={String(c)}>{c} - {n}</option>;})}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">📅 التاريخ</label>
                <input type="date" className="w-full p-2.5 rounded-xl border font-bold bg-white" value={editRecord.date||''} onChange={e=>handleEditRecordChange('date',e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <button onClick={handleSaveEditRecord} disabled={editSaving} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl transition">
                {editSaving ? '⏳ جاري الحفظ...' : '☁️ حفظ التعديلات في Google Sheets'}
              </button>
              <button onClick={()=>setEditRecord(null)} className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ── بطاقة الفاتورة الجديدة ── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="border-b pb-3">
          <h2 className="font-black text-sm text-slate-900">🛍️ فاتورة مشتريات جديدة — رقم: <span className="text-purple-900">{headerData.bill_no}</span></h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border">
          <div><label className="block font-bold text-slate-700 mb-1">رقم الفاتورة</label><input type="text" className="w-full p-2.5 rounded-xl border font-bold bg-white" value={headerData.bill_no} onChange={e=>setHeaderData(p=>({...p,bill_no:e.target.value}))} /></div>
          <div><label className="block font-bold text-slate-700 mb-1">اسم المورد *</label><input type="text" className="w-full p-2.5 rounded-xl border font-bold bg-white" placeholder="بن محمود للأقمشة" value={headerData.supplier} onChange={e=>setHeaderData(p=>({...p,supplier:e.target.value}))} /></div>
          <div><label className="block font-bold text-slate-700 mb-1">العملة</label>
            <select className="w-full p-2.5 rounded-xl border font-bold bg-white" value={headerData.currency} onChange={e=>setHeaderData(p=>({...p,currency:e.target.value}))}>
              {(CURRENCIES||['YER ﷼','USD $','SAR ﷼']).map(c=>{const v=typeof c==='object'?c.value:c,l=typeof c==='object'?c.label:c;return <option key={v} value={v}>{l}</option>;})}
            </select>
          </div>
          <div><label className="block font-bold text-slate-700 mb-1">طريقة الدفع</label>
            <select className="w-full p-2.5 rounded-xl border font-bold bg-white" value={headerData.pay_type} onChange={e=>setHeaderData(p=>({...p,pay_type:e.target.value}))}>
              {(typeof PAY_METHODS!=='undefined'?PAY_METHODS:['نقدي','حوالة بنكية','آجل']).map(pt=><option key={pt} value={pt}>{pt}</option>)}
            </select>
          </div>
          <div><label className="block font-bold text-slate-700 mb-1">حساب الدفع</label>
            <select className="w-full p-2.5 rounded-xl border font-bold bg-white" value={headerData.payment_source} onChange={e=>setHeaderData(p=>({...p,payment_source:e.target.value}))}>
              <option value="">-- اختر حساب الدفع --</option>
              {(accounts||[]).map(a=>{const c=a.acc_code||a.code||'',n=a.acc_name||a.name||'';return <option key={c} value={String(c)}>{c} - {n}</option>;})}
            </select>
          </div>
          <div><label className="block font-bold text-slate-700 mb-1">📲 رقم الحوالة</label><input type="text" className="w-full p-2.5 rounded-xl border font-bold bg-white text-purple-900" placeholder="TRF-12345" value={headerData.transfer_no} onChange={e=>setHeaderData(p=>({...p,transfer_no:e.target.value}))} /></div>
          <div><label className="block font-bold text-slate-700 mb-1">🖼️ إرفاق صورة السند</label>
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-900 font-bold p-2.5 rounded-xl text-center flex items-center justify-center">📷 اختر صورة<input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></label>
              {headerData.receipt_url && <button type="button" onClick={()=>setPreviewImage(headerData.receipt_url)} className="p-2 bg-emerald-100 text-emerald-900 rounded-xl font-black">🖼️</button>}
            </div>
          </div>
          <div><label className="block font-bold text-slate-700 mb-1">📅 تاريخ الفاتورة</label><input type="date" className="w-full p-2.5 rounded-xl border font-bold bg-white" value={headerData.date} onChange={e=>setHeaderData(p=>({...p,date:e.target.value}))} /></div>
          <div><label className="block font-bold text-purple-800 mb-1">🚚 تكلفة النقل والتوصيل</label><input type="number" step="0.01" min="0" className="w-full p-2.5 rounded-xl border font-bold bg-purple-50 text-purple-900" placeholder="0.00" value={headerData.freight_cost} onChange={e=>setHeaderData(p=>({...p,freight_cost:e.target.value}))} /></div>
          <div><label className="block font-bold text-rose-800 mb-1">💸 رسوم التحويل</label><input type="number" step="0.01" min="0" className="w-full p-2.5 rounded-xl border font-bold bg-rose-50 text-rose-900" placeholder="0.00" value={headerData.transfer_fees} onChange={e=>setHeaderData(p=>({...p,transfer_fees:e.target.value}))} /></div>
        </div>

        {/* نموذج الصنف */}
        <form onSubmit={handleAddOrUpdateItem} className="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-3">
          <div className="flex justify-between items-center border-b border-purple-200 pb-2">
            <span className="font-black text-purple-950">{editingIndex!==null?'✏️ تعديل الصنف':'➕ إضافة صنف جديد'}</span>
            {editingIndex!==null&&<button type="button" onClick={()=>{setEditingIndex(null);setItemData(emptyItem());}} className="text-rose-500 font-bold underline">إلغاء</button>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-end">
            <div className="col-span-2 sm:col-span-2"><label className="block font-bold text-slate-700 mb-1">اسم الصنف / القماش *</label><input type="text" required className="w-full p-2.5 rounded-xl border bg-white font-bold" placeholder="تفتة تركي / تل ناعم فسفوري..." value={itemData.item} onChange={e=>setItemData(p=>({...p,item:e.target.value}))} /></div>
            <div><label className="block font-bold text-slate-700 mb-1">📐 وحدة القياس</label><select className="w-full p-2.5 rounded-xl border bg-white font-bold" value={itemData.unit} onChange={e=>setItemData(p=>({...p,unit:e.target.value}))}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
            <div><label className="block font-bold text-slate-700 mb-1">الكمية</label><input type="number" step="0.01" min="0" className="w-full p-2.5 rounded-xl border bg-white text-center font-bold" placeholder="الكمية" value={itemData.qty} onChange={e=>handleQtyChange(e.target.value)} /></div>
            <div><label className="block font-bold text-purple-800 mb-1">🏷️ السعر الإفرادي</label><input type="number" step="0.01" min="0" className="w-full p-2.5 rounded-xl border bg-white text-center font-black text-purple-900" placeholder="سعر الوحدة" value={itemData.price} onChange={e=>handlePriceChange(e.target.value)} /></div>
            <div><label className="block font-bold text-emerald-800 mb-1">💰 الإجمالي</label><input type="number" step="0.01" min="0" className="w-full p-2.5 rounded-xl border bg-emerald-50 text-center font-black text-emerald-800 border-emerald-300" placeholder="الإجمالي" value={itemData.total} onChange={e=>handleTotalChange(e.target.value)} /></div>
          </div>
          <button type="submit" className={`w-full py-3 font-black text-xs rounded-xl transition shadow ${editingIndex!==null?'bg-amber-500 hover:bg-amber-600 text-white':'bg-purple-900 hover:bg-purple-950 text-white'}`}>{editingIndex!==null?'💾 تحديث الصنف':'➕ إضافة الصنف إلى الفاتورة'}</button>
        </form>

        {/* مسودة الفاتورة */}
        {billItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between"><span className="font-black text-slate-900">📋 أصناف الفاتورة ({billItems.length} صنف)</span><span className="font-extrabold text-purple-900">إجمالي: {grandTotal.toLocaleString()} {headerData.currency}</span></div>
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full text-right text-[11px]">
                <thead><tr className="bg-purple-950 text-white font-black"><th className="p-2">#</th><th className="p-2">الصنف</th><th className="p-2 text-center">الوحدة</th><th className="p-2 text-center">الكمية</th><th className="p-2 text-center">السعر</th><th className="p-2 text-center">الإجمالي</th><th className="p-2 text-center">إجراءات</th></tr></thead>
                <tbody className="divide-y">
                  {billItems.map((bi,idx)=>(
                    <tr key={idx} className={editingIndex===idx?'bg-amber-50':'hover:bg-slate-50'}>
                      <td className="p-2 text-slate-400">{idx+1}</td>
                      <td className="p-2 font-black text-purple-900">{bi.item}</td>
                      <td className="p-2 text-center"><span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded text-[10px] font-bold">{bi.unit}</span></td>
                      <td className="p-2 text-center font-bold">{bi.qty}</td>
                      <td className="p-2 text-center text-purple-800 font-bold">{bi.price} {headerData.currency}</td>
                      <td className="p-2 text-center font-black text-emerald-700">{parseFloat(bi.total).toLocaleString()} {headerData.currency}</td>
                      <td className="p-2 text-center space-x-1 space-x-reverse">
                        <button type="button" onClick={()=>{setItemData({item:bi.item,unit:bi.unit||'متر',qty:String(bi.qty),price:String(bi.price),total:String(bi.total)});setEditingIndex(idx);}} className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-black text-[10px]">✏️</button>
                        <button type="button" onClick={()=>{setBillItems(prev=>prev.filter((_,i)=>i!==idx));if(editingIndex===idx){setEditingIndex(null);setItemData(emptyItem());}}} className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded font-black text-[10px]">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={handleSaveFullBill} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg transition">
              ☁️ حفظ الفاتورة بالكامل في Google Sheets ({billItems.length} أصناف) — الإجمالي: {grandTotal.toLocaleString()} {headerData.currency}
            </button>
          </div>
        )}
      </div>

      {/* ── سجل المشتريات ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-3">
        <h3 className="font-black text-slate-900 text-xs">📜 سجل المشتريات والفواتير السحابية ({purchases.length} سجل)</h3>
        {purchases.length === 0 ? (
          <div className="text-center py-10 text-slate-400 font-bold"><p className="text-2xl mb-2">🛍️</p><p>لا توجد فواتير مسجلة بعد</p></div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-right text-[11px] min-w-[900px]">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-black border-b">
                  <th className="p-2.5">رقم الفاتورة</th><th className="p-2.5">المورد</th><th className="p-2.5">الصنف / القماش</th>
                  <th className="p-2.5 text-center">وحدة القياس</th><th className="p-2.5 text-center">الكمية</th>
                  <th className="p-2.5 text-center">السعر الإفرادي</th><th className="p-2.5 text-center">الإجمالي</th>
                  <th className="p-2.5 text-center">تكلفة النقل</th>
                  <th className="p-2.5">رقم الحوالة</th><th className="p-2.5">حساب الدفع</th>
                  <th className="p-2.5 text-center">السند</th><th className="p-2.5">التاريخ</th>
                  <th className="p-2.5 text-center">تعديل</th>
                </tr>
              </thead>
              <tbody className="divide-y font-semibold">
                {purchases.map((p, idx) => {
                  const n = normalizePurchase(p);
                  const itemName = p.item || p.item_name || '';
                  const paymentSrc = String(p.payment_source||'');
                  const accObj = (accounts||[]).find(a=>String(a.acc_code||a.code)===paymentSrc);
                  const accLabel = accObj ? `${accObj.acc_code||accObj.code} - ${accObj.acc_name||accObj.name}` : (paymentSrc||'');
                  return (
                    <tr key={p.id||idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-purple-900">{p.bill_no||'—'}</td>
                      <td className="p-2.5 font-black text-slate-900">{p.supplier||'—'}</td>
                      <td className="p-2.5 font-black text-purple-800">
                        {itemName ? itemName : <span className="text-rose-400 font-bold text-[10px] cursor-pointer underline" onClick={()=>handleOpenEdit(p)}>⚠️ فارغ — انقر للتعديل</span>}
                      </td>
                      <td className="p-2.5 text-center"><span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded text-[10px] font-bold">{n.unit}</span></td>
                      <td className="p-2.5 text-center font-bold">{n.qty>0?n.qty:'—'}</td>
                      <td className="p-2.5 text-center text-purple-800 font-bold">{n.price>0?`${n.price.toLocaleString()} ${p.currency||''}`:'—'}</td>
                      <td className="p-2.5 text-center font-black text-emerald-700">{n.total>0?`${n.total.toLocaleString()} ${p.currency||''}`:'—'}</td>
                      <td className="p-2.5 text-center font-bold text-amber-700">{parseFloat(p.freight_cost)>0?`${parseFloat(p.freight_cost).toLocaleString()} ${p.currency||''}`:'—'}</td>
                      <td className="p-2.5 font-mono text-blue-900 text-[10px]">{n.transfer||'—'}</td>
                      <td className="p-2.5 text-slate-700 text-[10px]">{accLabel||'—'}</td>
                      <td className="p-2.5 text-center">
                        {p.receipt_url ? <button type="button" onClick={()=>setPreviewImage(p.receipt_url)} className="bg-sky-100 hover:bg-sky-200 text-sky-900 px-2 py-1 rounded font-black text-[10px]">🖼️ عرض</button> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="p-2.5 text-slate-500 font-bold">{n.date||'—'}</td>
                      <td className="p-2.5 text-center space-x-1 space-x-reverse">
                        <button type="button" onClick={()=>handleOpenEdit(p)} className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-black text-[10px]">✏️</button>
                        <button type="button" onClick={()=>handleDeleteRecord(p)} className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded font-black text-[10px]">🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
