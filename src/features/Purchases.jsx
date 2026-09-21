const { useState, useMemo } = React;

function Purchases({ purchases = [], setPurchases, inventory = [], setInventory, accounts = [], setAccounts, vouchers = [], setVouchers, journal = [], setJournal, showToast, currency }) {
  const UNITS = ['متر', 'وار (ياردة)', 'سم', 'حبة (قطعة)', 'رول (طاقة)'];
  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  const defaultCurrency = (typeof CURRENCIES !== 'undefined' ? (typeof CURRENCIES[0] === 'object' ? CURRENCIES[0].value : CURRENCIES[0]) : (window.CURRENCIES ? window.CURRENCIES[0] : 'YER ﷼'));
  const defaultPayType = (typeof PAY_METHODS !== 'undefined' ? PAY_METHODS[0] : (window.PAY_METHODS ? window.PAY_METHODS[0] : 'نقدي'));
  const todayStrIso = typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : (window.TODAY_STR_ISO || new Date().toISOString().slice(0, 10));

  const genBillNo = () => {
    const lastNum = (purchases || []).reduce((acc, p) => {
      const match = String(p.bill_no || p.purchase_no || p.id || '').match(/PUR-(\d+)/);
      return match ? Math.max(acc, parseInt(match[1])) : acc;
    }, 1000);
    return `PUR-${lastNum + 1}`;
  };

  const emptyHeader = () => ({ bill_no: '', supplier_id: '', supplier: '', supplier_phone: '', discount: '', notes: '', currency: defaultCurrency, exchange_rate: '', pay_type: defaultPayType, transfer_no: '', payment_source: '', receipt_url: '', invoice_image_url: '', date: todayStrIso, freight_cost: '', transfer_fees: '' });
  const emptyItem = () => ({ item: '', unit: 'متر', qty: '', price: '', total: '' });

  const [headerData, setHeaderData] = useState(emptyHeader), [itemData, setItemData] = useState(emptyItem), [editingIndex, setEditingIndex] = useState(null);
  const [billItems, setBillItems] = useState([]), [previewImage, setPreviewImage] = useState(null), [previewTitle, setPreviewTitle] = useState('صورة المرفق');
  const [editRecord, setEditRecord] = useState(null), [showQuickAddSupplier, setShowQuickAddSupplier] = useState(false);

  // Subcomponents & Hooks
  const useData = window.usePurchasesData || (() => ({}));
  const useActions = window.usePurchaseActions || (() => ({}));
  const { SupplierQuickAddModal: QuickAddModal, PurchaseItemsTable: ItemsTable, PurchaseModal: ModalComponent, PurchasesFilterBar: FilterBar, PurchasesTable: DataTable } = window;

  const {
    suppliers, setSuppliers, isLoadingSuppliers, supplierSearch, setSupplierSearch,
    isSupplierDropdownOpen, setIsSupplierDropdownOpen, supplierDropdownRef, fetchSuppliers,
    handleSelectSupplier, filteredSuppliersList, selectedSupplierObj,
    search, setSearch, isHistoryOpen, setIsHistoryOpen, filteredPurchases
  } = useData({ purchases, setPurchases, headerData, setHeaderData });

  const rawItemsSum = billItems.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0) + (parseFloat(headerData.freight_cost) || 0) + (parseFloat(headerData.transfer_fees) || 0);
  const discountVal = parseFloat(headerData.discount) || 0;
  const grandTotal = Math.max(0, rawItemsSum - discountVal);

  const { isSaving, editSaving, handleSaveFullBill, handleSaveEditRecord, handleDeleteRecord } = useActions({
    headerData, setHeaderData, emptyHeader, billItems, setBillItems, emptyItem, setItemData, setEditingIndex,
    setSupplierSearch, fetchSuppliers, purchases, setPurchases, inventory, setInventory, accounts, setAccounts,
    vouchers, setVouchers, journal, setJournal, showToast, defaultCurrency, defaultPayType, todayStrIso,
    genBillNo, discountVal, grandTotal
  });

  const handleOpenEdit = (p) => {
    const VALID_UNITS_CHECK = ['متر', 'وار (ياردة)', 'سم', 'حبة (قطعة)', 'رول (طاقة)', 'يارده', 'وار'];
    let rawUnit = p.unit, rawQty = p.qty, rawPrice = p.price, rawTotal = p.total;
    if (rawUnit !== undefined && rawUnit !== '' && !isNaN(parseFloat(rawUnit)) && !VALID_UNITS_CHECK.includes(String(rawUnit))) {
      rawQty = parseFloat(rawUnit); rawPrice = parseFloat(p.qty) || 0; rawTotal = parseFloat(p.price) || 0; rawUnit = 'متر';
    }
    setEditRecord({
      ...p, supplier_id: p.supplier_id || '', item: p.item || p.item_name || '', unit: rawUnit || 'متر',
      qty: rawQty || '', price: rawPrice || '', total: rawTotal || '', supplier_phone: p.supplier_phone || p.phone || p.supplier_number || '',
      discount: p.discount !== undefined ? p.discount : (p.discount_amount || ''), notes: p.notes || '',
      receipt_url: p.receipt_url || '', invoice_image_url: p.invoice_image_url || p.invoice_url || ''
    });
  };

  const handleFileUpload = (e, field, label) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return showToast('حجم الصورة كبير جداً (أقصاه 5 ميجابايت) ⚠️', 'error');
    const reader = new FileReader();
    reader.onloadend = () => { setHeaderData(prev => ({ ...prev, [field]: reader.result })); showToast(`تم إرفاق ${label}`); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-xs text-right" dir="rtl">
      {ModalComponent && (
        <ModalComponent
          editRecord={editRecord} setEditRecord={setEditRecord} editSaving={editSaving}
          handleSaveEditRecord={handleSaveEditRecord} accounts={accounts} previewImage={previewImage}
          setPreviewImage={setPreviewImage} previewTitle={previewTitle} setPreviewTitle={setPreviewTitle}
          showToast={showToast} UNITS={UNITS} inputCls={inputCls} labelCls={labelCls}
        />
      )}

      {QuickAddModal && (
        <QuickAddModal
          show={showQuickAddSupplier} onClose={() => setShowQuickAddSupplier(false)} initialName={supplierSearch}
          suppliers={suppliers} setSuppliers={setSuppliers} setHeaderData={setHeaderData}
          setSupplierSearch={setSupplierSearch} setIsSupplierDropdownOpen={setIsSupplierDropdownOpen}
          fetchSuppliers={fetchSuppliers} showToast={showToast} inputCls={inputCls} labelCls={labelCls}
        />
      )}

      {/* ── بطاقة الفاتورة الجديدة ── */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-5">
        <div className="border-b border-[#E8E5EA] pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#F2E7F3] text-[#8F2A87] flex items-center justify-center font-bold">🛒</span>
            <div>
              <h2 className="font-bold text-sm text-[#25232A]">فاتورة مشتريات وتوريد جديدة</h2>
              <p className="text-[11px] text-[#6F6B75]">إصدار فاتورة شراء، توريد المخزون، وتوليد القيود وسندات الصرف آلياً</p>
            </div>
          </div>
          <span className="text-[#8F2A87] font-mono font-bold text-xs bg-[#F2E7F3] px-3 py-1 rounded-xl">
            {headerData.bill_no ? headerData.bill_no : `تلقائي: ${genBillNo()}`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-[#FAFAFB] rounded-2xl border border-[#E8E5EA]">
          <div><label className={labelCls}>رقم الفاتورة</label><input type="text" className={inputCls + " font-mono"} placeholder={`مثال: ${genBillNo()}`} value={headerData.bill_no} onChange={e => setHeaderData(p => ({ ...p, bill_no: e.target.value }))} /></div>

          {/* اختيار المورد */}
          <div className="relative" ref={supplierDropdownRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelCls}>المورد المعتمد *</label>
              <button type="button" onClick={() => setShowQuickAddSupplier(true)} className="text-[11px] font-bold text-[#8F2A87] hover:text-[#73216C] bg-[#F2E7F3] hover:bg-[#E5CEE7] px-2 py-0.5 rounded-lg flex items-center gap-1 transition cursor-pointer">➕ مورد جديد</button>
            </div>
            <div className="relative flex items-center">
              <input type="text" className={inputCls + " pl-12 pr-8 font-medium " + (headerData.supplier_id ? "border-[#8F2A87] bg-purple-50/20" : "")} placeholder="ابحث بالاسم أو الهاتف..." value={supplierSearch || headerData.supplier} onFocus={() => setIsSupplierDropdownOpen(true)} onChange={e => { setSupplierSearch(e.target.value); setHeaderData(p => ({ ...p, supplier: e.target.value, supplier_id: '' })); setIsSupplierDropdownOpen(true); }} />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] pointer-events-none text-xs">👤</span>
              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {(headerData.supplier || supplierSearch) && <button type="button" onClick={() => { setHeaderData(p => ({ ...p, supplier_id: '', supplier: '', supplier_phone: '' })); setSupplierSearch(''); }} className="text-[#6F6B75] hover:text-[#D64545] p-1 text-xs cursor-pointer">✕</button>}
                <button type="button" onClick={() => setIsSupplierDropdownOpen(prev => !prev)} className="text-[#6F6B75] hover:text-[#8F2A87] p-1 text-xs cursor-pointer">▼</button>
              </div>
            </div>
            {isSupplierDropdownOpen && (
              <div className="absolute top-full right-0 left-0 mt-1 bg-white rounded-xl border border-[#E8E5EA] shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-[#F2E7F3]">
                {isLoadingSuppliers ? <div className="p-3 text-center text-[#6F6B75] text-xs">⏳ جاري جلب الموردين...</div> : (filteredSuppliersList || []).length === 0 ? (
                  <div className="p-3 text-center space-y-2"><p className="text-[#6F6B75] text-xs">لا يوجد موردون مسجلون</p><button type="button" onClick={() => setShowQuickAddSupplier(true)} className="px-3 py-1 bg-[#8F2A87] text-white text-xs font-bold rounded-lg hover:bg-[#73216C] transition inline-flex items-center gap-1 cursor-pointer">➕ إضافة مورد جديد</button></div>
                ) : filteredSuppliersList.map(s => (
                  <div key={s.id} onClick={() => handleSelectSupplier(s)} className={`p-2.5 hover:bg-[#F2E7F3]/40 cursor-pointer flex items-center justify-between transition-colors ${String(headerData.supplier_id) === String(s.id) ? 'bg-[#F2E7F3] border-r-4 border-[#8F2A87]' : ''}`}>
                    <div>
                      <div className="font-bold text-xs text-[#25232A] flex items-center gap-1.5"><span>{s.name}</span>{s.city && <span className="text-[10px] text-[#6F6B75] bg-[#FAFAFB] px-1.5 py-0.2 rounded border border-[#E8E5EA]">{s.city}</span>}</div>
                      {s.phone && <div className="text-[11px] font-mono text-[#6F6B75] mt-0.5 dir-ltr">📱 {s.phone}</div>}
                    </div>
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200">{parseFloat(s.current_balance || s.balance || 0).toLocaleString('en-US')} ﷼</span>
                  </div>
                ))}
              </div>
            )}
            {selectedSupplierObj && (
              <div className="mt-1.5 flex items-center justify-between px-2.5 py-1 bg-[#F2E7F3]/40 border border-[#E5CEE7] rounded-lg text-[11px]">
                <span className="text-[#6F6B75] font-medium truncate max-w-[120px]" title={selectedSupplierObj.name}>💼 {selectedSupplierObj.name}</span>
                <span className="font-mono font-bold text-[11px] text-[#8F2A87]">الرصيد: {parseFloat(selectedSupplierObj.current_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ﷼</span>
              </div>
            )}
          </div>

          <div><label className={labelCls}>هاتف المورد 📱</label><input type="text" className={inputCls + " font-mono"} placeholder="يُملأ آلياً" value={headerData.supplier_phone} onChange={e => setHeaderData(p => ({ ...p, supplier_phone: e.target.value }))} /></div>
          <div><label className={labelCls}>العملة</label>
            <select className={inputCls} value={headerData.currency} onChange={e => {
              const newC = e.target.value, norm = window.CurrencyService ? window.CurrencyService.normalizeCode(newC) : 'YER';
              let autoBox = norm === 'SAR' ? '101.2 - صندوق الريال السعودي (SAR)' : (norm === 'USD' ? '101.3 - صندوق الدولار (USD)' : '101.1 - صندوق الريال اليمني (YER)');
              setHeaderData(p => ({ ...p, currency: newC, payment_source: autoBox, exchange_rate: window.CurrencyService ? window.CurrencyService.getRate(newC) : '' }));
            }}>
              {(typeof CURRENCIES !== 'undefined' ? CURRENCIES : ['YER ﷼','SAR ﷼','USD $']).map(c => { const v = typeof c === 'object' ? c.value : c, l = typeof c === 'object' ? c.label : c; return <option key={v} value={v}>{l}</option>; })}
            </select>
          </div>

          {headerData.currency && window.CurrencyService && window.CurrencyService.normalizeCode(headerData.currency) !== 'YER' && (
            <div><label className={labelCls}>سعر الصرف (1 {window.CurrencyService.normalizeCode(headerData.currency)} = ? YER)</label><input type="number" step="0.01" className={inputCls + " font-mono font-bold text-[#8F2A87] bg-amber-50"} value={headerData.exchange_rate || (window.CurrencyService ? window.CurrencyService.getRate(headerData.currency) : 1)} onChange={e => setHeaderData(p => ({ ...p, exchange_rate: e.target.value }))} /></div>
          )}

          <div><label className={labelCls}>الخصم والتخفيض 💸</label><input type="number" step="0.01" min="0" className={inputCls + " font-mono font-bold text-[#D64545]"} placeholder="0.00" value={headerData.discount} onChange={e => setHeaderData(p => ({ ...p, discount: e.target.value }))} /></div>
          <div><label className={labelCls}>طريقة الدفع</label>
            <select className={inputCls} value={headerData.pay_type} onChange={e => {
              const pt = e.target.value, autoBox = pt === 'آجل' ? '201 - ذمم الموردين ومحلات الأقمشة' : (headerData.currency && String(headerData.currency).includes('SAR') ? '101.2 - صندوق الريال السعودي (SAR)' : (headerData.currency && String(headerData.currency).includes('USD') ? '101.3 - صندوق الدولار (USD)' : '101.1 - صندوق الريال اليمني (YER)'));
              setHeaderData(p => ({ ...p, pay_type: pt, payment_source: autoBox }));
            }}>
              {(typeof PAY_METHODS !== 'undefined' ? PAY_METHODS : ['نقدي','حوالة بنكية','آجل']).map(pt => <option key={pt} value={pt}>{pt}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>حساب الدفع</label>
            <select className={inputCls} value={headerData.payment_source} onChange={e => setHeaderData(p => ({ ...p, payment_source: e.target.value }))}>
              <option value="">-- اختر حساب الدفع --</option>
              {(accounts || []).map(a => { const c = a.acc_code || a.code || a.account_code || '', n = a.acc_name || a.name || a.account_name || '', label = n ? `${c} - ${n}` : String(c); return <option key={c} value={label}>{label}</option>; })}
            </select>
          </div>
          <div><label className={labelCls}>رقم الحوالة</label><input type="text" className={inputCls + " font-mono text-[#8F2A87]"} value={headerData.transfer_no} onChange={e => setHeaderData(p => ({ ...p, transfer_no: e.target.value }))} /></div>
          <div><label className={labelCls}>صورة الفاتورة 🧾</label><div className="flex gap-2"><label className="flex-1 cursor-pointer bg-white hover:bg-[#FAFAFB] border border-[#E8E5EA] text-[#25232A] font-bold p-2.5 rounded-xl text-center flex items-center justify-center h-11">🧾 اختر صورة<input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'invoice_image_url', 'صورة الفاتورة 🧾')} /></label>{headerData.invoice_image_url && <button type="button" onClick={() => { setPreviewImage(headerData.invoice_image_url); setPreviewTitle('🧾 صورة الفاتورة'); }} className="p-2 bg-[#F2E7F3] text-[#8F2A87] rounded-xl font-bold border border-[#E5CEE7] h-11 px-3 cursor-pointer">🧾</button>}</div></div>
          <div><label className={labelCls}>صورة السند 💳</label><div className="flex gap-2"><label className="flex-1 cursor-pointer bg-white hover:bg-[#FAFAFB] border border-[#E8E5EA] text-[#25232A] font-bold p-2.5 rounded-xl text-center flex items-center justify-center h-11">📷 اختر صورة<input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'receipt_url', 'صورة السند 💳')} /></label>{headerData.receipt_url && <button type="button" onClick={() => { setPreviewImage(headerData.receipt_url); setPreviewTitle('💳 صورة السند'); }} className="p-2 bg-[#E2F5F7] text-[#007F8C] rounded-xl font-bold border border-[#C5ECF0] h-11 px-3 cursor-pointer">🖼️</button>}</div></div>
          <div><label className={labelCls}>تاريخ الفاتورة</label><input type="date" lang="en-GB" dir="ltr" className={inputCls} value={headerData.date} onChange={e => setHeaderData(p => ({ ...p, date: e.target.value }))} /></div>
          <div><label className={labelCls}>تكلفة النقل</label><input type="number" step="0.01" min="0" className={inputCls + " font-mono font-bold text-[#8F2A87]"} placeholder="0.00" value={headerData.freight_cost} onChange={e => setHeaderData(p => ({ ...p, freight_cost: e.target.value }))} /></div>
          <div><label className={labelCls}>رسوم التحويل</label><input type="number" step="0.01" min="0" className={inputCls + " font-mono font-bold text-[#D64545]"} placeholder="0.00" value={headerData.transfer_fees} onChange={e => setHeaderData(p => ({ ...p, transfer_fees: e.target.value }))} /></div>
          <div className="sm:col-span-2 lg:col-span-2"><label className={labelCls}>ملاحظات الفاتورة والبيان 📝</label><input type="text" className={inputCls} placeholder="ملاحظات وتفاصيل الفاتورة" value={headerData.notes} onChange={e => setHeaderData(p => ({ ...p, notes: e.target.value }))} /></div>
        </div>

        {ItemsTable && (
          <ItemsTable
            itemData={itemData} setItemData={setItemData} emptyItem={emptyItem} editingIndex={editingIndex}
            setEditingIndex={setEditingIndex} billItems={billItems} setBillItems={setBillItems} headerData={headerData}
            grandTotal={grandTotal} isSaving={isSaving} handleSaveFullBill={handleSaveFullBill} showToast={showToast}
            UNITS={UNITS} inputCls={inputCls} labelCls={labelCls}
          />
        )}
      </div>

      {/* ── سجل المشتريات القابل للطي ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300">
        {FilterBar && <FilterBar isHistoryOpen={isHistoryOpen} setIsHistoryOpen={setIsHistoryOpen} filteredPurchasesCount={(filteredPurchases || []).length} search={search} setSearch={setSearch} />}
        {isHistoryOpen && DataTable && (
          <div className="p-5 space-y-4 animate-fade-in">
            <DataTable filteredPurchases={filteredPurchases} handleOpenEdit={handleOpenEdit} handleDeleteRecord={handleDeleteRecord} setPreviewImage={setPreviewImage} setPreviewTitle={setPreviewTitle} />
          </div>
        )}
      </div>
    </div>
  );
}

window.Purchases = Purchases;
