// src/features/purchases/components/PurchaseHeaderForm.jsx
// نموذج بيانات رأس فاتورة المشتريات والمورد والمستودع المستلم وطريقة الدفع

function PurchaseHeaderForm({
  headerData, setHeaderData, genBillNo, setShowQuickAddSupplier,
  supplierDropdownRef, supplierSearch, setSupplierSearch,
  isSupplierDropdownOpen, setIsSupplierDropdownOpen, isLoadingSuppliers,
  filteredSuppliersList, handleSelectSupplier, selectedSupplierObj,
  accounts = [], handleFileUpload, setPreviewImage, setPreviewTitle,
  inputCls, labelCls
}) {
  const currenciesList = (typeof CURRENCIES !== 'undefined' ? CURRENCIES : (window.CURRENCIES || ['YER ﷼', 'SAR ﷼', 'USD $']));
  const payMethodsList = (typeof PAY_METHODS !== 'undefined' ? PAY_METHODS : (window.PAY_METHODS || ['نقدي', 'حوالة بنكية', 'آجل']));
  const SupplierSelectComp = window.PurchaseSupplierSelect || PurchaseSupplierSelect;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-[#FAFAFB] dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
      {/* 1. المورد المعتمد */}
      <SupplierSelectComp
        headerData={headerData}
        setHeaderData={setHeaderData}
        setShowQuickAddSupplier={setShowQuickAddSupplier}
        supplierDropdownRef={supplierDropdownRef}
        supplierSearch={supplierSearch}
        setSupplierSearch={setSupplierSearch}
        isSupplierDropdownOpen={isSupplierDropdownOpen}
        setIsSupplierDropdownOpen={setIsSupplierDropdownOpen}
        isLoadingSuppliers={isLoadingSuppliers}
        filteredSuppliersList={filteredSuppliersList}
        handleSelectSupplier={handleSelectSupplier}
        selectedSupplierObj={selectedSupplierObj}
        inputCls={inputCls}
        labelCls={labelCls}
      />

      {/* 2. تاريخ الفاتورة */}
      <div>
        <label className={labelCls}>تاريخ الفاتورة</label>
        <input type="date" lang="en-GB" dir="ltr" className={inputCls} value={headerData.date} onChange={e => setHeaderData(p => ({ ...p, date: e.target.value }))} />
      </div>

      {/* 3. المستودع المستلم */}
      <div>
        <label className={labelCls}>المستودع المستلم *</label>
        <select
          className={inputCls + " font-bold text-teal-700 dark:text-teal-400 bg-teal-50/20"}
          value={headerData.warehouse_id || ''}
          onChange={e => setHeaderData(p => ({ ...p, warehouse_id: e.target.value }))}
          required
        >
          <option value="">-- اختر المستودع المستلم --</option>
          {(Array.isArray(window.inventoryUtils?.WAREHOUSES) ? window.inventoryUtils.WAREHOUSES : []).map(w => (
            <option key={w.id || w.code} value={w.id || w.code}>
              {w.name} ({w.code || w.id})
            </option>
          ))}
        </select>
      </div>

      {/* 4. العملة */}
      <div>
        <label className={labelCls}>العملة</label>
        <select
          className={inputCls}
          value={headerData.currency}
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
      </div>

      {headerData.currency && window.CurrencyService && window.CurrencyService.normalizeCode(headerData.currency) !== 'YER' && (
        <div>
          <label className={labelCls}>سعر الصرف (1 {window.CurrencyService.normalizeCode(headerData.currency)} = ? YER)</label>
          <input
            type="number" step="0.01" className={inputCls + " font-mono font-bold text-fuchsia-700 dark:text-fuchsia-400 bg-amber-50 dark:bg-amber-950/20"}
            value={headerData.exchange_rate || (window.CurrencyService ? window.CurrencyService.getRate(headerData.currency) : 1)}
            onChange={e => setHeaderData(p => ({ ...p, exchange_rate: e.target.value }))}
          />
        </div>
      )}

      {/* 5. طريقة الدفع */}
      <div>
        <label className={labelCls}>طريقة الدفع</label>
        <select
          className={inputCls}
          value={headerData.pay_type}
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

      {/* 6. حساب الدفع */}
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

      {/* 7. رقم الحوالة */}
      <div>
        <label className={labelCls}>رقم الحوالة أو الإشعار</label>
        <input type="text" className={inputCls + " font-mono text-fuchsia-700 dark:text-fuchsia-400"} placeholder="" value={headerData.transfer_no} onChange={e => setHeaderData(p => ({ ...p, transfer_no: e.target.value }))} />
      </div>

      {/* 8. الملاحظات */}
      <div className={headerData.currency && window.CurrencyService && window.CurrencyService.normalizeCode(headerData.currency) !== 'YER' ? "sm:col-span-2 lg:col-span-4" : "sm:col-span-2 lg:col-span-1"}>
        <label className={labelCls}>ملاحظات الفاتورة والبيان</label>
        <input type="text" className={inputCls} placeholder="" value={headerData.notes} onChange={e => setHeaderData(p => ({ ...p, notes: e.target.value }))} />
      </div>

      {/* 9. المرفقات: Dropzones أنيقة */}
      <div className="sm:col-span-2 lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
        <div className="p-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-fuchsia-600 bg-white dark:bg-slate-900 transition flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl">📄</span>
            <div className="min-w-0">
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">صورة الفاتورة</span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {headerData.invoice_image_url ? 'تم إرفاق الفاتورة بنجاح ✓' : 'انقر لرفع صورة الفاتورة'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <label className="px-3 py-1.5 rounded-lg text-xs font-bold text-fuchsia-700 dark:text-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/40 hover:bg-fuchsia-100 transition cursor-pointer">
              {headerData.invoice_image_url ? 'تغيير' : 'رفع ملف'}
              <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'invoice_image_url', 'صورة الفاتورة')} />
            </label>
            {headerData.invoice_image_url && (
              <button type="button" onClick={() => { setPreviewImage(headerData.invoice_image_url); setPreviewTitle('صورة الفاتورة'); }} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 transition cursor-pointer" title="معاينة الفاتورة">
                معاينة
              </button>
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-600 bg-white dark:bg-slate-900 transition flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl">💳</span>
            <div className="min-w-0">
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">صورة السند أو الإشعار</span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {headerData.receipt_url ? 'تم إرفاق السند بنجاح ✓' : 'انقر لرفع سند الصرف'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <label className="px-3 py-1.5 rounded-lg text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 transition cursor-pointer">
              {headerData.receipt_url ? 'تغيير' : 'رفع ملف'}
              <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'receipt_url', 'صورة السند')} />
            </label>
            {headerData.receipt_url && (
              <button type="button" onClick={() => { setPreviewImage(headerData.receipt_url); setPreviewTitle('صورة السند'); }} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 transition cursor-pointer" title="معاينة السند">
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
