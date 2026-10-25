// src/features/purchases/components/PurchaseHeaderForm.jsx
// نموذج بيانات رأس فاتورة المشتريات والمورد والمستودع المستلم وطريقة الدفع

function PurchaseHeaderForm(props) {
  const {
    headerData, setHeaderData, genBillNo, setShowQuickAddSupplier,
    supplierDropdownRef, supplierSearch, setSupplierSearch,
    isSupplierDropdownOpen, setIsSupplierDropdownOpen, isLoadingSuppliers,
    filteredSuppliersList, handleSelectSupplier, selectedSupplierObj,
    accounts = [], handleFileUpload, setPreviewImage, setPreviewTitle,
    inputCls, labelCls
  } = props;

  const currenciesList = (typeof CURRENCIES !== 'undefined' ? CURRENCIES : (window.CURRENCIES || ['YER ﷼', 'SAR ﷼', 'USD $']));
  const payMethodsList = (typeof PAY_METHODS !== 'undefined' ? PAY_METHODS : (window.PAY_METHODS || ['نقدي', 'حوالة بنكية', 'آجل']));
  const SupplierSelectComp = window.PurchaseSupplierSelect || (typeof PurchaseSupplierSelect !== 'undefined' ? PurchaseSupplierSelect : null);
  const isForeign = headerData.currency && window.CurrencyService && window.CurrencyService.normalizeCode(headerData.currency) !== 'YER';

  return (
    <div className="space-y-3 p-3.5 bg-slate-900/50 rounded-xl border border-slate-800">
      {/* الصف الأول: شبكة من 4 أعمدة متوازنة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* 1. رقم الفاتورة مع زر التوليد */}
        <div>
          <label className={labelCls}>رقم الفاتورة *</label>
          <div className="flex items-center gap-1">
            <input type="text" className={inputCls + " font-mono font-bold text-pink-300"} value={headerData.bill_no || ''} onChange={e => setHeaderData(p => ({ ...p, bill_no: e.target.value }))} />
            {typeof genBillNo === 'function' && (
              <button type="button" onClick={() => setHeaderData(p => ({ ...p, bill_no: genBillNo() }))} className="h-8 px-2 text-[10px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shrink-0 cursor-pointer" title="توليد رقم تسلسلي تلقائي">
                توليد
              </button>
            )}
          </div>
        </div>

        {/* 2. المورد المعتمد مع زر إضافة مورد */}
        {SupplierSelectComp && (
          <SupplierSelectComp
            headerData={headerData} setHeaderData={setHeaderData} setShowQuickAddSupplier={setShowQuickAddSupplier}
            supplierDropdownRef={supplierDropdownRef} supplierSearch={supplierSearch} setSupplierSearch={setSupplierSearch}
            isSupplierDropdownOpen={isSupplierDropdownOpen} setIsSupplierDropdownOpen={setIsSupplierDropdownOpen}
            isLoadingSuppliers={isLoadingSuppliers} filteredSuppliersList={filteredSuppliersList}
            handleSelectSupplier={handleSelectSupplier} selectedSupplierObj={selectedSupplierObj}
            inputCls={inputCls} labelCls={labelCls}
          />
        )}

        {/* 3. تاريخ الفاتورة */}
        <div>
          <label className={labelCls}>تاريخ الفاتورة</label>
          <input type="date" lang="en-GB" dir="ltr" className={inputCls} value={headerData.date || ''} onChange={e => setHeaderData(p => ({ ...p, date: e.target.value }))} />
        </div>

        {/* 4. المستودع المستلم */}
        <div>
          <label className={labelCls}>المستودع المستلم *</label>
          <select className={inputCls + " font-semibold text-teal-400"} value={headerData.warehouse_id || ''} onChange={e => setHeaderData(p => ({ ...p, warehouse_id: e.target.value }))} required>
            <option value="">-- اختر المستودع المستلم --</option>
            {(Array.isArray(window.inventoryUtils?.WAREHOUSES) ? window.inventoryUtils.WAREHOUSES : []).map(w => (
              <option key={w.id || w.code} value={w.id || w.code}>{w.name} ({w.code || w.id})</option>
            ))}
          </select>
        </div>
      </div>

      {/* الصف الثاني: شبكة من 4 أعمدة متوازنة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* 1. العملة وسعر الصرف */}
        <div>
          <label className={labelCls}>{isForeign ? 'العملة وسعر الصرف' : 'العملة'}</label>
          <div className="flex items-center gap-1.5">
            <select
              className={inputCls} value={headerData.currency}
              onChange={e => {
                const newC = e.target.value;
                const norm = window.CurrencyService ? window.CurrencyService.normalizeCode(newC) : 'YER';
                let autoBox = norm === 'SAR' ? '101.2 - صندوق الريال السعودي (SAR)' : (norm === 'USD' ? '101.3 - صندوق الدولار (USD)' : '101.1 - صندوق الريال اليمني (YER)');
                setHeaderData(p => ({ ...p, currency: newC, payment_source: autoBox, exchange_rate: window.CurrencyService ? window.CurrencyService.getRate(newC) : '' }));
              }}
            >
              {currenciesList.map(c => {
                const v = typeof c === 'object' ? c.value : c, l = typeof c === 'object' ? c.label : c;
                return <option key={v} value={v}>{l}</option>;
              })}
            </select>
            {isForeign && (
              <input
                type="number" step="0.01" className={inputCls + " font-mono font-bold text-fuchsia-400 w-24 shrink-0 text-center"}
                value={headerData.exchange_rate || (window.CurrencyService ? window.CurrencyService.getRate(headerData.currency) : 1)}
                onChange={e => setHeaderData(p => ({ ...p, exchange_rate: e.target.value }))}
                title="سعر الصرف مقابل الريال اليمني"
              />
            )}
          </div>
        </div>

        {/* 2. طريقة الدفع */}
        <div>
          <label className={labelCls}>طريقة الدفع</label>
          <select
            className={inputCls} value={headerData.pay_type}
            onChange={e => {
              const pt = e.target.value;
              const autoBox = pt === 'آجل' ? '201 - ذمم الموردين ومحلات الأقمشة' : (
                headerData.currency && String(headerData.currency).includes('SAR') ? '101.2 - صندوق الريال السعودي (SAR)' : (
                  headerData.currency && String(headerData.currency).includes('USD') ? '101.3 - صندوق الدولار (USD)' : '101.1 - صندوق الريال اليمني (YER)'
                )
              );
              setHeaderData(p => ({ ...p, pay_type: pt, payment_source: autoBox }));
            }}
          >
            {payMethodsList.map(pt => <option key={pt} value={pt}>{pt}</option>)}
          </select>
        </div>

        {/* 3. حساب الدفع */}
        <div>
          <label className={labelCls}>حساب الدفع</label>
          <select className={inputCls} value={headerData.payment_source} onChange={e => setHeaderData(p => ({ ...p, payment_source: e.target.value }))}>
            <option value="">-- اختر حساب الدفع --</option>
            {(accounts || []).map(a => {
              const c = a.acc_code || a.code || a.account_code || '', n = a.acc_name || a.name || a.account_name || '';
              return <option key={c} value={n ? `${c} - ${n}` : String(c)}>{n ? `${c} - ${n}` : String(c)}</option>;
            })}
          </select>
        </div>

        {/* 4. رقم الحوالة أو الإشعار */}
        <div>
          <label className={labelCls}>رقم الحوالة أو الإشعار</label>
          <input type="text" className={inputCls + " font-mono text-pink-300"} value={headerData.transfer_no || ''} onChange={e => setHeaderData(p => ({ ...p, transfer_no: e.target.value }))} />
        </div>
      </div>

      {/* الصف الثالث: حقل ملاحظات الفاتورة والبيان يمتد على كامل العرض بارتفاع مدمج */}
      <div className="w-full">
        <label className={labelCls}>ملاحظات الفاتورة والبيان</label>
        <input type="text" className={inputCls} value={headerData.notes || ''} onChange={e => setHeaderData(p => ({ ...p, notes: e.target.value }))} />
      </div>

      {/* الصف الرابع: شبكة من عمودين لبطاقتي رفع صورة الفاتورة وصورة السند أو الإشعار */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2.5 border-t border-slate-800">
        <div className="h-10 px-3 rounded-lg border border-dashed border-slate-700 hover:border-fuchsia-500/60 bg-slate-900/90 transition-all flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm">📄</span>
            <span className="text-xs font-medium text-slate-200 truncate">صورة الفاتورة {headerData.invoice_image_url ? '✓' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <label className="h-7 px-2.5 rounded-md text-[11px] font-semibold text-fuchsia-300 bg-slate-800/90 border border-fuchsia-500/30 hover:bg-slate-700 transition flex items-center cursor-pointer">
              {headerData.invoice_image_url ? 'تغيير' : 'رفع ملف'}
              <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'invoice_image_url', 'صورة الفاتورة')} />
            </label>
            {headerData.invoice_image_url && (
              <button type="button" onClick={() => { setPreviewImage(headerData.invoice_image_url); setPreviewTitle('صورة الفاتورة'); }} className="h-7 px-2 rounded-md text-[11px] font-semibold text-teal-300 bg-slate-800/90 border border-teal-500/30 hover:bg-slate-700 transition flex items-center cursor-pointer" title="معاينة الفاتورة">
                معاينة
              </button>
            )}
          </div>
        </div>

        <div className="h-10 px-3 rounded-lg border border-dashed border-slate-700 hover:border-teal-500/60 bg-slate-900/90 transition-all flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm">💳</span>
            <span className="text-xs font-medium text-slate-200 truncate">صورة السند أو الإشعار {headerData.receipt_url ? '✓' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <label className="h-7 px-2.5 rounded-md text-[11px] font-semibold text-teal-300 bg-slate-800/90 border border-teal-500/30 hover:bg-slate-700 transition flex items-center cursor-pointer">
              {headerData.receipt_url ? 'تغيير' : 'رفع ملف'}
              <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'receipt_url', 'صورة السند')} />
            </label>
            {headerData.receipt_url && (
              <button type="button" onClick={() => { setPreviewImage(headerData.receipt_url); setPreviewTitle('صورة السند'); }} className="h-7 px-2 rounded-md text-[11px] font-semibold text-teal-300 bg-slate-800/90 border border-teal-500/30 hover:bg-slate-700 transition flex items-center cursor-pointer" title="معاينة السند">
                معاينة
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

window.PurchaseHeaderForm = PurchaseHeaderForm;
if (typeof module !== 'undefined' && module.exports) module.exports = PurchaseHeaderForm;
