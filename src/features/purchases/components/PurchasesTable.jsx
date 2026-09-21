function PurchasesTable({ filteredPurchases = [], handleOpenEdit, handleDeleteRecord, setPreviewImage, setPreviewTitle }) {
  const normalizePurchase = (p) => {
    if (!p || typeof p !== 'object') return { item_name: '', qty: 0, price: 0, total: 0, unit: 'متر', date: '', transfer: '', supplier_phone: '', discount: 0, notes: '', invoice_image_url: '', receipt_url: '' };
    const itemName = String(p.fabric_name || p.item_name || p.item || p.name || '').trim();
    const rawUnit = p.unit || p.unit_name || 'متر';
    const rawQty = p.quantity !== undefined && p.quantity !== '' ? p.quantity : (p.qty !== undefined && p.qty !== '' ? p.qty : p.quantity_meters);
    const rawPrice = p.unit_price !== undefined && p.unit_price !== '' ? p.unit_price : (p.price !== undefined && p.price !== '' ? p.price : (p.cost_per_unit || p.cost_per_meter));
    const rawTotal = p.total !== undefined && p.total !== '' ? p.total : (p.total_amount_yer || p.base_amount || p.amount_yer || p.original_amount);
    let rawDate = p.date || p.invoice_date || p.created_at || p.supply_date || '';
    if (rawDate && String(rawDate).includes('T')) rawDate = String(rawDate).split('T')[0];
    else if (rawDate && String(rawDate).includes(' ')) rawDate = String(rawDate).split(' ')[0];
    let rawTransfer = p.transfer_no || p.transfer_number || '';
    if (rawTransfer && /^\d{4}-\d{2}-\d{2}/.test(String(rawTransfer))) {
      if (!rawDate) rawDate = String(rawTransfer).slice(0, 10);
      rawTransfer = '';
    }
    const qty = parseFloat(rawQty || 0), price = parseFloat(rawPrice || 0);
    let total = parseFloat(rawTotal || 0);
    if (total <= 0 && qty > 0 && price > 0) total = qty * price;
    const discount = parseFloat(p.discount !== undefined && p.discount !== '' ? p.discount : (p.discount_amount || 0)) || 0;
    const supplier_phone = String(p.supplier_phone || p.supplier_number || p.phone || '').trim();
    const notes = String(p.notes || p.statement || p.description || '').trim();
    const receipt_url = String(p.receipt_attachment || p.receipt_url || p.image_path || p.receipt || '').trim();
    const invoice_image_url = String(p.invoice_attachment || p.invoice_image_url || p.invoice_url || p.bill_attachment || '').trim();
    return { item_name: itemName, qty, price, total, unit: rawUnit, date: String(rawDate || ''), transfer: String(rawTransfer || ''), supplier_phone, discount, notes, receipt_url, invoice_image_url };
  };

  if (filteredPurchases.length === 0) {
    return (
      <div className="text-center py-12 text-[#6F6B75] font-medium bg-[#FAFAFB] rounded-2xl border border-dashed border-[#E8E5EA]">
        لا توجد فواتير مسجلة تطابق البحث 🛍️
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E8E5EA] shadow-xs">
      <table className="w-full text-right text-xs border-collapse min-w-[900px]">
        <thead>
          <tr className="bg-[#FAFAFB] text-[#6F6B75] font-bold border-b border-[#E8E5EA]">
            <th className="px-4 py-3.5 text-right whitespace-nowrap sticky right-0 z-10 bg-[#FAFAFB] shadow-[-2px_0_4px_rgba(0,0,0,0.02)]">رقم الفاتورة والتاريخ</th>
            <th className="px-4 py-3.5 text-right whitespace-nowrap">المورد وبيانات التواصل</th>
            <th className="px-4 py-3.5 text-right whitespace-nowrap">الصنف / تفاصيل الكمية والسعر</th>
            <th className="px-4 py-3.5 text-center whitespace-nowrap">الخصم / النقل</th>
            <th className="px-4 py-3.5 text-center whitespace-nowrap">الصافي الإجمالي (YER)</th>
            <th className="px-4 py-3.5 text-right whitespace-nowrap">حساب الدفع والبيان</th>
            <th className="px-4 py-3.5 text-center whitespace-nowrap sticky left-0 z-10 bg-[#FAFAFB] shadow-[2px_0_4px_rgba(0,0,0,0.02)]">المرفقات والإجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E8E5EA] bg-white">
          {filteredPurchases.map((p, idx) => {
            const n = normalizePurchase(p);
            const itemName = n.item_name || p.fabric_name || p.item || p.item_name || p.name || '—';
            const supplier = p.supplier_name || p.supplier || '—';
            const billNo = p.bill_no || p.purchase_no || p.invoice_no || p.id || '—';
            const currRaw = p.currency || p.Original_Currency || 'YER';
            const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(currRaw) : (String(currRaw).includes('SAR') ? 'SAR' : (String(currRaw).includes('USD') ? 'USD' : 'YER'));
            const isForeign = currCode !== 'YER';
            const rate = parseFloat(p.exchange_rate || p.exchangeRate) || (window.CurrencyService ? window.CurrencyService.getRate(currCode) : (currCode === 'SAR' ? 142 : (currCode === 'USD' ? 535 : 1)));
            const freight = parseFloat(p.freight_cost || p.shipping_cost) || 0;
            const fees = parseFloat(p.transfer_fees || p.transfer_fee) || 0;
            const discountAmt = parseFloat(n.discount) || 0;
            const origAmount = parseFloat(p.subtotal_original || p.original_amount || p.originalAmount) || (n.qty > 0 && n.price > 0 ? (n.qty * n.price) : n.total);
            const netOriginal = Math.max(0, origAmount - discountAmt);
            const grandTotalYER = parseFloat(p.grand_total_yer || p.total_amount_yer) || (isForeign ? ((netOriginal * rate) + (freight * rate) + (fees * rate)) : (netOriginal + freight + fees));
            const paySrc = p.payment_source || p.payment_account_code || '101 - الصندوق الرئيسي';
            const payType = p.pay_type || p.payment_method || 'نقدي';
            const dateDisplay = n.date || p.invoice_date || p.date || p.created_at || '—';

            return (
              <tr key={p.id || idx} className="hover:bg-[#FAFAFB] transition-colors group">
                {/* 1. رقم الفاتورة والتاريخ */}
                <td className="px-4 py-3 whitespace-nowrap sticky right-0 z-10 bg-white group-hover:bg-[#FAFAFB] shadow-[-2px_0_4px_rgba(0,0,0,0.02)]">
                  <div className="font-mono font-bold text-xs text-[#8F2A87]">{billNo}</div>
                  <div className="font-mono text-[11px] text-[#6F6B75] mt-0.5 flex items-center gap-1">
                    <span>📅</span><span>{dateDisplay}</span>
                  </div>
                </td>

                {/* 2. المورد وبيانات التواصل */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="font-bold text-[#25232A] text-xs">{supplier}</div>
                  {n.supplier_phone ? (
                    <div className="text-[11px] font-mono text-[#6F6B75] mt-0.5 flex items-center gap-1">
                      <span>📱</span><span className="dir-ltr">{n.supplier_phone}</span>
                    </div>
                  ) : <span className="text-[11px] text-[#6F6B75]">—</span>}
                </td>

                {/* 3. الصنف / تفاصيل الكمية والسعر */}
                <td className="px-4 py-3">
                  {p.items && p.items.length > 0 ? (
                    <div className="space-y-1.5">
                      {p.items.map((it, iIdx) => (
                        <div key={it.id || iIdx} className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[#25232A] text-xs">{it.item_name || it.item || 'خامة'}</span>
                          <span className="text-[10px] font-mono text-[#25232A] bg-[#FAFAFB] px-1.5 py-0.5 rounded border border-[#E8E5EA] inline-flex items-center gap-1">
                            <span className="font-bold">{parseFloat(it.qty || it.quantity || 0).toLocaleString('en-US')}</span>
                            <span className="text-[#8F2A87] font-semibold">{it.unit || 'متر'}</span>
                            <span className="text-[#6F6B75]">×</span>
                            <span className="text-[#8F2A87] font-bold">{parseFloat(it.cost || it.unit_price || it.price || 0).toLocaleString('en-US')} {currCode}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="font-bold text-[#25232A] text-xs max-w-[220px] truncate" title={itemName}>
                        {itemName !== '—' ? itemName : <span className="text-[#D64545] font-bold text-[11px] cursor-pointer underline" onClick={() => handleOpenEdit(p)}>⚠️ فارغ — تعديل</span>}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-mono text-[#25232A] bg-[#FAFAFB] px-2 py-0.5 rounded-md border border-[#E8E5EA] inline-flex items-center gap-1">
                          <span className="font-bold">{n.qty > 0 ? n.qty.toLocaleString('en-US') : 0}</span>
                          <span className="text-[#8F2A87] font-semibold">{n.unit}</span>
                          <span className="text-[#6F6B75]">×</span>
                          <span className="text-[#8F2A87] font-bold">{n.price > 0 ? n.price.toLocaleString('en-US') : 0} {currCode}</span>
                        </span>
                      </div>
                    </>
                  )}
                </td>

                {/* 4. الخصم والنقل والرسوم */}
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  {discountAmt > 0 && (
                    <div className="inline-block bg-rose-50 text-[#D64545] font-bold font-mono px-2 py-0.5 rounded-md border border-rose-200 text-[11px]">
                      💸 -{discountAmt.toLocaleString('en-US')} {currCode}
                    </div>
                  )}
                  {(freight + fees) > 0 && (
                    <div className={`text-[10.5px] font-mono text-[#C97300] font-bold ${discountAmt > 0 ? 'mt-1' : ''}`}>
                      🚚 +{(freight + fees).toLocaleString('en-US')} ﷼
                    </div>
                  )}
                  {discountAmt <= 0 && (freight + fees) <= 0 && <span className="text-[#6F6B75]">—</span>}
                </td>

                {/* 5. الصافي الإجمالي (YER) */}
                <td className="px-4 py-3 text-center whitespace-nowrap bg-[#E2F5F7]/25">
                  <div className="font-extrabold font-mono text-sm text-[#007F8C]">
                    {grandTotalYER > 0 ? `${grandTotalYER.toLocaleString('en-US', { minimumFractionDigits: 2 })} ﷼` : '0.00 ﷼'}
                  </div>
                  {isForeign && origAmount > 0 && (
                    <div className="text-[10px] font-mono text-[#8F2A87] mt-0.5 font-bold">
                      {origAmount.toLocaleString('en-US')} {currCode} @ {rate}
                    </div>
                  )}
                </td>

                {/* 6. حساب الدفع والبيان */}
                <td className="px-4 py-3 max-w-[240px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${
                      payType === 'آجل' ? 'bg-[#FFF1DC] text-[#C97300] border-[#FFE4B9]' : 'bg-[#E2F5F7] text-[#007F8C] border-[#C5ECF0]'
                    }`}>
                      {payType}
                    </span>
                    <span className="text-xs text-[#25232A] font-semibold truncate" title={paySrc}>{paySrc}</span>
                  </div>
                  {n.notes && <div className="text-[11px] text-[#6F6B75] truncate mt-1 line-clamp-1" title={n.notes}>📝 {n.notes}</div>}
                </td>

                {/* 7. المرفقات والإجراءات */}
                <td className="px-4 py-3 text-center whitespace-nowrap sticky left-0 z-10 bg-white group-hover:bg-[#FAFAFB] shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-center gap-1.5">
                    {n.invoice_image_url && (
                      <button type="button" onClick={() => { setPreviewImage(n.invoice_image_url); setPreviewTitle(`🧾 فاتورة ${billNo}`); }} title="معاينة صورة الفاتورة 🧾" className="w-8 h-8 rounded-lg bg-[#F2E7F3] hover:bg-[#E5CEE7] text-[#8F2A87] border border-[#E5CEE7] flex items-center justify-center text-xs transition cursor-pointer shadow-2xs">🧾</button>
                    )}
                    {n.receipt_url && (
                      <button type="button" onClick={() => { setPreviewImage(n.receipt_url); setPreviewTitle(`💳 سند ${billNo}`); }} title="معاينة صورة السند 💳" className="w-8 h-8 rounded-lg bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C] border border-[#C5ECF0] flex items-center justify-center text-xs transition cursor-pointer shadow-2xs">💳</button>
                    )}
                    <button type="button" onClick={() => handleOpenEdit(p)} title="تعديل بيانات الفاتورة" className="w-8 h-8 rounded-lg bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] border border-[#E8E5EA] flex items-center justify-center text-xs transition cursor-pointer shadow-2xs">✏️</button>
                    <button type="button" onClick={() => handleDeleteRecord(p)} title="حذف الفاتورة" className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#D64545] border border-rose-200 flex items-center justify-center text-xs transition cursor-pointer shadow-2xs">🗑️</button>
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
