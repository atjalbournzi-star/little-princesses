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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-[#FAFAFB] rounded-2xl border border-[#E8E5EA]">
      {/* 1. رقم الفاتورة */}
      <div>
        <label className={labelCls}>رقم الفاتورة</label>
        <input
          type="text" className={inputCls + " font-mono"}
          placeholder={`مثال: ${genBillNo()}`}
          value={headerData.bill_no}
          onChange={e => setHeaderData(p => ({ ...p, bill_no: e.target.value }))}
        />
      </div>

      {/* 2. اختيار المورد المعتمد */}
      {(() => {
        const SupplierSelectComp = window.PurchaseSupplierSelect || PurchaseSupplierSelect;
        return (
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
        );
      })()}

      {/* 3. المستودع المستلم (Multi-Warehouse Engine) */}
      <div>
        <label className={labelCls}>المستودع المستلم 🏢 *</label>
        <select
          className={inputCls + " font-bold text-[#007F8C] bg-cyan-50/20"}
          value={headerData.warehouse_id || 'WH-MAIN'}
          onChange={e => setHeaderData(p => ({ ...p, warehouse_id: e.target.value }))}
        >
          {(window.inventoryUtils?.WAREHOUSES || [
            { id: 'WH-MAIN', name: 'المستودع الرئيسي' },
            { id: 'WH-WORKSHOP', name: 'معمل وورشة الخياطة' },
            { id: 'WH-SHOWROOM', name: 'معرض وصالة التسليم' }
          ]).map(w => (
            <option key={w.id} value={w.id}>{w.name} ({w.id})</option>
          ))}
        </select>
      </div>

      {/* 4. هاتف المورد */}
      <div>
        <label className={labelCls}>هاتف المورد 📱</label>
        <input
          type="text" className={inputCls + " font-mono"}
          placeholder="يُملأ آلياً"
          value={headerData.supplier_phone}
          onChange={e => setHeaderData(p => ({ ...p, supplier_phone: e.target.value }))}
        />
      </div>

      {/* 5. العملة وسعر الصرف */}
      <div>
        <label className={labelCls}>العملة</label>
        <select
          className={inputCls}
          value={headerData.currency}
          onChange={e => {
            const newC = e.target.value;
            const norm = window.CurrencyService ? window.CurrencyService.normalizeCode(newC) : 'YER';
            let autoBox = norm === 'SAR' ? '101.2 - صندوق الريال السعودي (SAR)' : (norm === 'USD' ? '101.3 - صندوق الدولار (USD)' : '101.1 - صندوق الريال اليمني (YER)');
            setHeaderData(p => ({
              ...p, currency: newC, payment_source: autoBox,
              exchange_rate: window.CurrencyService ? window.CurrencyService.getRate(newC) : ''
            }));
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
            type="number" step="0.01" className={inputCls + " font-mono font-bold text-[#8F2A87] bg-amber-50"}
            value={headerData.exchange_rate || (window.CurrencyService ? window.CurrencyService.getRate(headerData.currency) : 1)}
            onChange={e => setHeaderData(p => ({ ...p, exchange_rate: e.target.value }))}
          />
        </div>
      )}

      {/* 6. الخصم وطريقة الدفع */}
      <div>
        <label className={labelCls}>الخصم والتخفيض 💸</label>
        <input
          type="number" step="0.01" min="0" className={inputCls + " font-mono font-bold text-[#D64545]"}
          placeholder="0.00" value={headerData.discount}
          onChange={e => setHeaderData(p => ({ ...p, discount: e.target.value }))}
        />
      </div>

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

      {/* 7. حساب الدفع ورقم الحوالة */}
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

      <div>
        <label className={labelCls}>رقم الحوالة</label>
        <input type="text" className={inputCls + " font-mono text-[#8F2A87]"} value={headerData.transfer_no} onChange={e => setHeaderData(p => ({ ...p, transfer_no: e.target.value }))} />
      </div>

      {/* 8. المرفقات والتاريخ والمصاريف */}
      <div>
        <label className={labelCls}>صورة الفاتورة 🧾</label>
        <div className="flex gap-2">
          <label className="flex-1 cursor-pointer bg-white hover:bg-[#FAFAFB] border border-[#E8E5EA] text-[#25232A] font-bold p-2.5 rounded-xl text-center flex items-center justify-center h-11">
            🧾 اختر صورة
            <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'invoice_image_url', 'صورة الفاتورة 🧾')} />
          </label>
          {headerData.invoice_image_url && (
            <button type="button" onClick={() => { setPreviewImage(headerData.invoice_image_url); setPreviewTitle('🧾 صورة الفاتورة'); }} className="p-2 bg-[#F2E7F3] text-[#8F2A87] rounded-xl font-bold border border-[#E5CEE7] h-11 px-3 cursor-pointer">🧾</button>
          )}
        </div>
      </div>

      <div>
        <label className={labelCls}>صورة السند 💳</label>
        <div className="flex gap-2">
          <label className="flex-1 cursor-pointer bg-white hover:bg-[#FAFAFB] border border-[#E8E5EA] text-[#25232A] font-bold p-2.5 rounded-xl text-center flex items-center justify-center h-11">
            📷 اختر صورة
            <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'receipt_url', 'صورة السند 💳')} />
          </label>
          {headerData.receipt_url && (
            <button type="button" onClick={() => { setPreviewImage(headerData.receipt_url); setPreviewTitle('💳 صورة السند'); }} className="p-2 bg-[#E2F5F7] text-[#007F8C] rounded-xl font-bold border border-[#C5ECF0] h-11 px-3 cursor-pointer">🖼️</button>
          )}
        </div>
      </div>

      <div>
        <label className={labelCls}>تاريخ الفاتورة</label>
        <input type="date" lang="en-GB" dir="ltr" className={inputCls} value={headerData.date} onChange={e => setHeaderData(p => ({ ...p, date: e.target.value }))} />
      </div>

      <div>
        <label className={labelCls}>تكلفة النقل</label>
        <input type="number" step="0.01" min="0" className={inputCls + " font-mono font-bold text-[#8F2A87]"} placeholder="0.00" value={headerData.freight_cost} onChange={e => setHeaderData(p => ({ ...p, freight_cost: e.target.value }))} />
      </div>

      <div>
        <label className={labelCls}>رسوم التحويل</label>
        <input type="number" step="0.01" min="0" className={inputCls + " font-mono font-bold text-[#D64545]"} placeholder="0.00" value={headerData.transfer_fees} onChange={e => setHeaderData(p => ({ ...p, transfer_fees: e.target.value }))} />
      </div>

      <div className="sm:col-span-2 lg:col-span-2">
        <label className={labelCls}>ملاحظات الفاتورة والبيان 📝</label>
        <input type="text" className={inputCls} placeholder="ملاحظات وتفاصيل الفاتورة" value={headerData.notes} onChange={e => setHeaderData(p => ({ ...p, notes: e.target.value }))} />
      </div>
    </div>
  );
}

window.PurchaseHeaderForm = PurchaseHeaderForm;
if (typeof module !== 'undefined' && module.exports) module.exports = PurchaseHeaderForm;
