function VouchersTable({
  vouchers = [],
  accounts = [],
  activeTargetCurr = 'YER',
  currencyDisplay = 'YER ﷼',
  onViewVoucher,
  onOpenReverseModal,
  onSendWhatsApp
}) {
  if (!vouchers || !vouchers.length) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
        لا توجد سندات مسجلة تطابق البحث 🧾
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
      <table className="w-full text-xs table-fixed border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <th className="px-3 py-3 text-right w-[8%]">النوع</th>
            <th className="px-3 py-3 text-right w-[11%]">رقم السند</th>
            <th className="px-3 py-3 text-right w-[14%]">الطرف (المستفيد / العميل)</th>
            <th className="px-3 py-3 text-left w-[13%]">المبلغ ({activeTargetCurr})</th>
            <th className="px-3 py-3 text-right w-[10%]">طريقة الدفع</th>
            <th className="px-3 py-3 text-right w-[15%]">الحساب المالي</th>
            <th className="px-3 py-3 text-right w-[17%]">الحساب المقابل</th>
            <th className="px-3 py-3 text-center w-[9%]">التاريخ</th>
            <th className="px-3 py-3 text-center w-[9%]">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
          {(vouchers || []).map(v => {
            const rawAcc = v.account || v.acc_code || v.account_id || v.payment_source || '';
            const accCodeOnly = String(rawAcc).trim().split(' - ')[0].trim();
            const match = (accounts || []).find(a => 
              String(a.id || '') === accCodeOnly || String(a.code || '') === accCodeOnly ||
              String(a.acc_code || '') === accCodeOnly || String(a.id || '') === `ACC-${accCodeOnly}` ||
              String(a.code || '') === accCodeOnly.replace(/^ACC-/, '')
            );
            const accLabel = match ? `${match.code || match.acc_code} - ${match.name || match.account_name || match.acc_name || match.name_en || match.code}` : (rawAcc || '101 - الصندوق الرئيسي');

            const rawTarget = v.target_account || v.target_acc || (v.isReceipt ? '104' : '201');
            const targetCodeOnly = String(rawTarget).trim().split(' - ')[0].trim();
            const targetMatch = (accounts || []).find(a => 
              String(a.id || '') === targetCodeOnly || String(a.code || '') === targetCodeOnly ||
              String(a.acc_code || '') === targetCodeOnly || String(a.id || '') === `ACC-${targetCodeOnly}` ||
              String(a.code || '') === targetCodeOnly.replace(/^ACC-/, '')
            );
            const targetLabel = targetMatch 
              ? `${targetMatch.code || targetMatch.acc_code} - ${targetMatch.name || targetMatch.account_name || targetMatch.acc_name || targetMatch.code}`
              : (rawTarget.includes('202') ? '202 - عرابين وأمانات العملاء' : (rawTarget.includes('104') ? '104 - ذمم العملاء' : rawTarget));
            const isAdvance = String(targetCodeOnly).includes('202') || (v.notes && (v.notes.includes('عربون') || v.notes.includes('حجز')));

            const vCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(v.currency) : (v.currency || 'YER');
            const isSameCurr = vCurr === activeTargetCurr;
            const convertedAmt = (activeTargetCurr === 'YER' && parseFloat(v.base_amount) > 0)
              ? parseFloat(v.base_amount)
              : (window.CurrencyService ? window.CurrencyService.convert(v.amount, vCurr, activeTargetCurr, v.exchange_rate) : v.amount);
            const isReversed = v.status === 'reversed';

            return (
              <tr key={v.id || v.v_no} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-200 dark:border-slate-800">
                <td className="px-3 py-3 text-right align-middle whitespace-nowrap">
                  {isReversed ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-300 dark:border-gray-700">
                      ملغى بقيد عكسي ↩️
                    </span>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border whitespace-nowrap ${
                      v.v_type === 'إيداع رأس مال'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                        : (v.v_type && (v.v_type.includes('قيد') || v.v_type.includes('تسوية')))
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                        : (v.isReceipt ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800')
                    }`}>
                      {v.v_type}
                    </span>
                  )}
                </td>

                <td className="px-3 py-3 text-right align-middle font-bold text-fuchsia-700 dark:text-fuchsia-400 text-xs whitespace-nowrap truncate" title={v.v_no}>
                  <span className="font-mono">{v.v_no}</span>
                </td>

                <td className="px-3 py-3 text-right align-middle font-bold text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap truncate" title={v.party}>
                  {v.party || '—'}
                </td>

                <td className="px-3 py-3 text-left align-middle font-bold text-xs whitespace-nowrap dir-ltr">
                  {isSameCurr ? (
                    <div className="flex items-baseline gap-1">
                      <span className={`font-mono tabular-nums ${isReversed ? 'line-through text-gray-400' : 'text-slate-900 dark:text-white'}`}>
                        {(parseFloat(v.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: activeTargetCurr === 'YER' ? 0 : 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400">{activeTargetCurr}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start leading-tight">
                      <div className="flex items-baseline gap-1">
                        <span className={`font-mono tabular-nums font-bold ${isReversed ? 'line-through text-gray-400' : 'text-teal-700 dark:text-teal-400'}`}>
                          {convertedAmt.toLocaleString('en-US', { minimumFractionDigits: activeTargetCurr === 'YER' ? 0 : 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400">{activeTargetCurr}</span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 font-mono mt-0.5" title="المبلغ الأصلي المسجل بالسند">
                        ({(parseFloat(v.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} {vCurr})
                      </span>
                    </div>
                  )}
                </td>

                <td className="px-3 py-3 text-right align-middle text-slate-800 dark:text-slate-200 text-xs font-medium whitespace-nowrap truncate">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px]">
                    {v.pay_method || 'نقدي'}
                  </span>
                </td>

                <td className="px-3 py-3 text-right align-middle text-slate-800 dark:text-slate-200 text-xs font-medium whitespace-nowrap truncate" title={accLabel}>
                  {accLabel}
                </td>

                <td className="px-3 py-3 text-right align-middle whitespace-nowrap truncate" title={targetLabel}>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border truncate ${isAdvance ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' : 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800'}`}>
                    {targetLabel}
                  </span>
                </td>

                <td className="px-3 py-3 text-center align-middle text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                  <span className="font-mono tabular-nums">{v.date || '—'}</span>
                </td>

                <td className="px-3 py-3 text-center align-middle whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5">
                    <a
                      href={`/voucher.html?id=${encodeURIComponent(v.v_no || v.payment_no || v.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="عرض وتنزيل بطاقة السند كصورة 🖼️"
                      className="p-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg transition cursor-pointer flex items-center justify-center font-bold"
                    >
                      <span className="text-xs">🖼️</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => onSendWhatsApp?.(v)}
                      title="إرسال إشعار رسمي عبر واتساب WhatsApp"
                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg transition cursor-pointer flex items-center justify-center font-bold"
                    >
                      <span className="text-xs">⚡</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onViewVoucher?.(v)}
                      title="معاينة وطباعة السند"
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-400 border border-slate-200 dark:border-slate-700 rounded-lg transition cursor-pointer flex items-center justify-center"
                    >
                      👁️
                    </button>
                    {!isReversed ? (
                      <button
                        type="button"
                        onClick={() => onOpenReverseModal?.(v)}
                        title="إلغاء السند بقيد عكسي معتمد محاسبياً"
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 text-[11px] font-bold"
                      >
                        <span>↩️</span>
                        <span>إلغاء</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded">
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
