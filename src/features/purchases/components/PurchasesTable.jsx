// src/features/purchases/components/PurchasesTable.jsx
// جدول استعراض سجل المشتريات والفواتير السحابية (Compact Executive UI aligned with Vouchers)

function PurchasesTable({ filteredPurchases = [], handleOpenEdit, handleDeleteRecord, setPreviewImage, setPreviewTitle }) {
  const normalizePurchase = (p) => {
    if (!p || typeof p !== 'object') return { item_name: '', qty: 0, price: 0, total: 0, unit: 'متر', date: '', supplier_phone: '', discount: 0, notes: '', invoice_image_url: '', receipt_url: '' };
    const itemName = String(p.fabric_name || p.item_name || p.item || p.name || '').trim(), rawUnit = p.unit || p.unit_name || 'متر';
    const rawQty = p.quantity !== undefined && p.quantity !== '' ? p.quantity : (p.qty !== undefined && p.qty !== '' ? p.qty : p.quantity_meters);
    const rawPrice = p.unit_price !== undefined && p.unit_price !== '' ? p.unit_price : (p.price !== undefined && p.price !== '' ? p.price : (p.cost_per_unit || p.cost_per_meter));
    const rawTotal = p.total !== undefined && p.total !== '' ? p.total : (p.total_amount_yer || p.base_amount || p.amount_yer || p.original_amount);
    let rawDate = p.date || p.invoice_date || p.created_at || p.supply_date || '';
    if (rawDate && (rawDate.includes('T') || rawDate.includes(' '))) rawDate = rawDate.split(/[T ]/)[0];
    const qty = parseFloat(rawQty || 0), price = parseFloat(rawPrice || 0);
    const total = (parseFloat(rawTotal || 0) > 0 || (qty <= 0 || price <= 0)) ? parseFloat(rawTotal || 0) : qty * price;
    return {
      item_name: itemName, qty, price, total, unit: rawUnit, date: String(rawDate || ''),
      supplier_phone: String(p.supplier_phone || p.supplier_number || p.phone || '').trim(),
      discount: parseFloat(p.discount !== undefined && p.discount !== '' ? p.discount : (p.discount_amount || 0)) || 0,
      notes: String(p.notes || p.statement || p.description || '').trim(),
      receipt_url: String(p.receipt_attachment || p.receipt_url || p.image_path || p.receipt || '').trim(),
      invoice_image_url: String(p.invoice_attachment || p.invoice_image_url || p.invoice_url || p.bill_attachment || '').trim()
    };
  };

  if (filteredPurchases.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-slate-700 dark:text-slate-300 text-xs font-semibold select-none">
        <svg className="w-7 h-7 text-slate-400 dark:text-slate-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <span>لا توجد فواتير مسجلة تطابق معايير البحث والفلترة</span>
      </div>
    );
  }

  const columns = [
    { key: 'bill_no', label: 'رقم الفاتورة والتاريخ', width: 'w-[130px]', align: 'text-right' },
    { key: 'supplier', label: 'المورد والتواصل', width: 'w-[14%]', align: 'text-right' },
    { key: 'items', label: 'الصنف والكمية والسعر', width: 'w-[23%]', align: 'text-right' },
    { key: 'discount_freight', label: 'الخصم / النقل', width: 'w-[110px]', align: 'text-center' },
    { key: 'grand_total', label: 'الصافي الإجمالي (YER)', width: 'w-[110px]', align: 'text-center' },
    { key: 'payment_account', label: 'طريقة الدفع والحساب', width: 'w-[145px]', align: 'text-right' },
    { key: 'actions', label: 'المرفقات والإجراءات', width: 'w-[100px]', align: 'text-center' }
  ];

  return (
    <div className="overflow-x-auto custom-scrollbar rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 select-none">
      <table className="w-full min-w-[980px] table-fixed text-right border-collapse">
        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 shadow-xs">
          <tr className="h-7.5">
            {columns.map(c => (
              <th key={c.key} className={`h-7.5 py-1.5 px-2 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden ${c.width} ${c.align}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-transparent">
          {filteredPurchases.map((p, idx) => {
            const n = normalizePurchase(p), itemName = n.item_name || p.fabric_name || p.item || p.item_name || p.name || '—';
            const supplier = p.supplier_name || p.supplier || '—', billNo = p.bill_no || p.purchase_no || p.invoice_no || p.id || '—';
            const currRaw = p.currency || p.Original_Currency || 'YER';
            const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(currRaw) : (String(currRaw).includes('SAR') ? 'SAR' : (String(currRaw).includes('USD') ? 'USD' : 'YER'));
            const isForeign = currCode !== 'YER', rate = parseFloat(p.exchange_rate || p.exchangeRate) || (window.CurrencyService ? window.CurrencyService.getRate(currCode) : (currCode === 'SAR' ? 142 : (currCode === 'USD' ? 535 : 1)));
            const freight = parseFloat(p.freight_cost || p.shipping_cost) || 0, fees = parseFloat(p.transfer_fees || p.transfer_fee) || 0;
            const discountAmt = parseFloat(n.discount) || 0, origAmount = parseFloat(p.subtotal_original || p.original_amount || p.originalAmount) || (n.qty > 0 && n.price > 0 ? (n.qty * n.price) : n.total);
            const netOriginal = Math.max(0, origAmount - discountAmt);
            const grandTotalYER = parseFloat(p.grand_total_yer || p.total_amount_yer) || (isForeign ? ((netOriginal * rate) + (freight * rate) + (fees * rate)) : (netOriginal + freight + fees));
            const paySrc = p.payment_source || p.payment_account_code || '101 - الصندوق الرئيسي', payType = p.pay_type || p.payment_method || 'نقدي';
            const dateDisplay = n.date || p.invoice_date || p.date || p.created_at || '—';

            return (
              <tr key={p.id || idx} className="h-8 border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[11px] font-medium transition-colors">
                {/* 1. رقم الفاتورة والتاريخ */}
                <td className="w-[130px] py-1.5 px-2 text-right truncate overflow-hidden whitespace-nowrap">
                  <span className="font-mono text-slate-600 dark:text-slate-400 font-bold text-[11px] block truncate">{billNo}</span>
                  <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                    <svg className="w-2.5 h-2.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span>{dateDisplay}</span>
                  </div>
                  {p.warehouse_id && (
                    <div className="mt-0.5">
                      <span className="text-[9.5px] text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800/40 px-1 rounded truncate inline-block max-w-[115px]">
                        {window.inventoryUtils?.getWarehouseName ? window.inventoryUtils.getWarehouseName(p.warehouse_id) : p.warehouse_id}
                      </span>
                    </div>
                  )}
                </td>

                {/* 2. المورد وبيانات التواصل */}
                <td className="w-[14%] py-1.5 px-2 text-right truncate overflow-hidden whitespace-nowrap" title={supplier}>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-[11.5px] block truncate">{supplier}</div>
                  {n.supplier_phone ? (
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 dir-ltr">
                      <svg className="w-2.5 h-2.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      <span>{n.supplier_phone}</span>
                    </div>
                  ) : <span className="text-[10px] text-slate-400 dark:text-slate-500">—</span>}
                </td>

                {/* 3. الصنف والكمية والسعر */}
                <td className="w-[23%] py-1.5 px-2 text-right overflow-hidden">
                  {p.items && p.items.length > 0 ? (
                    <div className="space-y-0.5">
                      {p.items.map((it, iIdx) => (
                        <div key={it.id || iIdx} className="text-[11px] text-slate-800 dark:text-slate-200 truncate">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{it.item_name || it.item || 'خامة'}</span>{' '}
                          <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300">
                            ({parseFloat(it.qty || it.quantity || 0).toLocaleString('en-US')} {it.unit || 'متر'} × {parseFloat(it.cost || it.unit_price || it.price || 0).toLocaleString('en-US')} {currCode})
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-[11px] truncate" title={itemName}>
                        {itemName !== '—' ? itemName : <span className="text-rose-500 underline cursor-pointer" onClick={() => handleOpenEdit(p)}>فارغ — تعديل</span>}
                      </div>
                      <div className="text-[10px] font-mono text-slate-600 dark:text-slate-300 truncate mt-0.5">
                        ({n.qty > 0 ? n.qty.toLocaleString('en-US') : 0} {n.unit} × {n.price > 0 ? n.price.toLocaleString('en-US') : 0} {currCode})
                      </div>
                    </>
                  )}
                </td>

                {/* 4. الخصم والنقل */}
                <td className="w-[110px] py-1.5 px-2 text-center truncate overflow-hidden whitespace-nowrap">
                  {discountAmt > 0 && (
                    <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold block truncate">
                      خصم: -{discountAmt.toLocaleString('en-US')} {currCode}
                    </span>
                  )}
                  {(freight + fees) > 0 && (
                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-medium block truncate">
                      نقل: +{(freight + fees).toLocaleString('en-US')} {currCode}
                    </span>
                  )}
                  {discountAmt <= 0 && (freight + fees) <= 0 && <span className="text-slate-400 dark:text-slate-500 text-[11px]">—</span>}
                </td>

                {/* 5. الصافي الإجمالي (YER) */}
                <td className="w-[110px] py-1.5 px-2 text-center truncate overflow-hidden whitespace-nowrap">
                  <div className="font-bold font-mono text-xs text-slate-900 dark:text-white tracking-tight">
                    {grandTotalYER > 0 ? grandTotalYER.toLocaleString('en-US', { minimumFractionDigits: 0 }) : '0'}
                  </div>
                  {isForeign && origAmount > 0 ? (
                    <div className="text-[9.5px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {origAmount.toLocaleString('en-US')} {currCode} @ {rate}
                    </div>
                  ) : (
                    <div className="text-[9.5px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                      عملة محلية
                    </div>
                  )}
                </td>

                {/* 6. طريقة الدفع والحساب */}
                <td className="w-[145px] py-1.5 px-2 text-right truncate overflow-hidden whitespace-nowrap" title={`${payType} - ${paySrc}`}>
                  <div className="flex items-center gap-1 truncate">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/70 whitespace-nowrap shrink-0">
                      {payType}
                    </span>
                    <span className="text-[10.5px] text-slate-600 dark:text-slate-300 truncate" title={paySrc}>
                      {paySrc}
                    </span>
                  </div>
                  {n.notes && <div className="text-[9.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5" title={n.notes}>{n.notes}</div>}
                </td>

                {/* 7. المرفقات والإجراءات */}
                <td className="w-[100px] py-1.5 px-2 text-center whitespace-nowrap overflow-hidden">
                  <div className="flex items-center justify-center gap-1">
                    {n.invoice_image_url && (
                      <button type="button" onClick={() => { setPreviewImage(n.invoice_image_url); setPreviewTitle(`فاتورة ${billNo}`); }} title="معاينة صورة الفاتورة" className="w-5.5 h-5.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-600 dark:text-teal-400 border border-slate-300 dark:border-slate-700 rounded transition cursor-pointer flex items-center justify-center shrink-0 hover:scale-105">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </button>
                    )}
                    {n.receipt_url && (
                      <button type="button" onClick={() => { setPreviewImage(n.receipt_url); setPreviewTitle(`سند ${billNo}`); }} title="معاينة صورة السند" className="w-5.5 h-5.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-600 dark:text-teal-400 border border-slate-300 dark:border-slate-700 rounded transition cursor-pointer flex items-center justify-center shrink-0 hover:scale-105">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </button>
                    )}
                    <button type="button" onClick={() => handleOpenEdit(p)} title="تعديل بيانات الفاتورة" className="w-5.5 h-5.5 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 rounded transition cursor-pointer flex items-center justify-center shrink-0 hover:scale-105">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button type="button" onClick={() => handleDeleteRecord(p)} title="حذف الفاتورة" className="w-5.5 h-5.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded transition cursor-pointer flex items-center justify-center shrink-0 hover:scale-105">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

window.PurchasesTable = PurchasesTable;