function VouchersTable({
  vouchers = [],
  accounts = [],
  activeTargetCurr = 'YER',
  currencyDisplay = 'YER ﷼',
  onViewVoucher,
  onOpenReverseModal,
  onSendWhatsApp
}) {
  if (!vouchers.length) {
    return (
      <div className="text-center py-12 text-[#6F6B75] text-xs font-medium border border-[#E8E5EA] rounded-xl bg-white">
        لا توجد سندات مسجلة تطابق البحث 🧾
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E8E5EA] overflow-hidden bg-white">
      <table className="w-full text-xs table-fixed border-collapse">
        <thead>
          <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
            <th className="px-3 py-3 text-right w-[9%]">النوع</th>
            <th className="px-3 py-3 text-right w-[14%]">رقم السند</th>
            <th className="px-3 py-3 text-right w-[16%]">الطرف (المستفيد / العميل)</th>
            <th className="px-3 py-3 text-left w-[14%]">المبلغ ({activeTargetCurr})</th>
            <th className="px-3 py-3 text-right w-[11%]">طريقة الدفع</th>
            <th className="px-3 py-3 text-right w-[18%]">الحساب المالي</th>
            <th className="px-3 py-3 text-center w-[10%]">التاريخ</th>
            <th className="px-3 py-3 text-center w-[9%]">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E8E5EA] bg-white">
          {vouchers.map(v => {
            const rawAcc = v.account || v.acc_code || v.account_id || v.payment_source || '';
            const accCodeOnly = String(rawAcc).trim().split(' - ')[0].trim();
            const match = (accounts || []).find(a => String(a.code || a.acc_code || a.id) === accCodeOnly);
            const accLabel = match ? `${match.code || match.acc_code} - ${match.name || match.account_name || match.acc_name || match.name_en || match.code}` : (rawAcc || '101 - الصندوق الرئيسي');

            const vCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(v.currency) : (v.currency || 'YER');
            const isSameCurr = vCurr === activeTargetCurr;
            const convertedAmt = window.CurrencyService ? window.CurrencyService.convert(v.amount, vCurr, activeTargetCurr, v.exchange_rate) : v.amount;
            const isReversed = v.status === 'reversed';

            return (
              <tr key={v.id || v.v_no} className="hover:bg-[#FAFAFB] transition-colors border-b border-[#E8E5EA]">
                <td className="px-3 py-3 text-right align-middle whitespace-nowrap">
                  {isReversed ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border bg-gray-100 text-gray-500 border-gray-300">
                      ملغى بقيد عكسي ↩️
                    </span>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border whitespace-nowrap ${v.isReceipt ? 'bg-[#E2F5F7] text-[#007F8C] border-[#C5ECF0]' : 'bg-rose-50 text-[#D64545] border-rose-200'}`}>
                      {v.v_type}
                    </span>
                  )}
                </td>

                <td className="px-3 py-3 text-right align-middle font-bold text-[#8F2A87] text-xs whitespace-nowrap truncate" title={v.v_no}>
                  <span className="font-mono">{v.v_no}</span>
                </td>

                <td className="px-3 py-3 text-right align-middle font-bold text-[#25232A] text-xs whitespace-nowrap truncate" title={v.party}>
                  {v.party || '—'}
                </td>

                <td className="px-3 py-3 text-left align-middle font-bold text-xs whitespace-nowrap dir-ltr">
                  {isSameCurr ? (
                    <div className="flex items-baseline gap-1">
                      <span className={`font-mono tabular-nums ${isReversed ? 'line-through text-gray-400' : 'text-[#25232A]'}`}>
                        {(parseFloat(v.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: activeTargetCurr === 'YER' ? 0 : 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] font-bold text-[#007F8C]">{activeTargetCurr}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start leading-tight">
                      <div className="flex items-baseline gap-1">
                        <span className={`font-mono tabular-nums font-bold ${isReversed ? 'line-through text-gray-400' : 'text-[#007F8C]'}`}>
                          {convertedAmt.toLocaleString('en-US', { minimumFractionDigits: activeTargetCurr === 'YER' ? 0 : 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] font-bold text-[#007F8C]">{activeTargetCurr}</span>
                      </div>
                      <span className="text-[10px] font-medium text-[#6F6B75] font-mono mt-0.5" title="المبلغ الأصلي المسجل بالسند">
                        ({(parseFloat(v.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} {vCurr})
                      </span>
                    </div>
                  )}
                </td>

                <td className="px-3 py-3 text-right align-middle text-[#25232A] text-xs font-medium whitespace-nowrap truncate">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-[#FAFAFB] border border-[#E8E5EA] text-[#25232A] text-[11px]">
                    {v.pay_method || 'نقدي'}
                  </span>
                </td>

                <td className="px-3 py-3 text-right align-middle text-[#25232A] text-xs font-medium whitespace-nowrap truncate" title={accLabel}>
                  {accLabel}
                </td>

                <td className="px-3 py-3 text-center align-middle text-[#6F6B75] text-xs whitespace-nowrap">
                  <span className="font-mono tabular-nums">{v.date || '—'}</span>
                </td>

                <td className="px-3 py-3 text-center align-middle whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5">
                    <a
                      href={`/voucher.html?id=${encodeURIComponent(v.v_no || v.payment_no || v.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="عرض وتنزيل بطاقة السند كصورة 🖼️"
                      className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition cursor-pointer flex items-center justify-center font-bold"
                    >
                      <span className="text-xs">🖼️</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => onSendWhatsApp?.(v)}
                      title="إرسال إشعار رسمي عبر واتساب WhatsApp"
                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-lg transition cursor-pointer flex items-center justify-center font-bold"
                    >
                      <span className="text-xs">⚡</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onViewVoucher?.(v)}
                      title="معاينة وطباعة السند"
                      className="p-1.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#007F8C] border border-[#E8E5EA] rounded-lg transition cursor-pointer flex items-center justify-center"
                    >
                      👁️
                    </button>
                    {!isReversed ? (
                      <button
                        type="button"
                        onClick={() => onOpenReverseModal?.(v)}
                        title="إلغاء السند بقيد عكسي معتمد محاسبياً"
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-[#D64545] border border-rose-200 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 text-[11px] font-bold"
                      >
                        <span>↩️</span>
                        <span>إلغاء</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
                        معكوس
                      </span>
                    )}
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

window.VouchersTable = VouchersTable;
