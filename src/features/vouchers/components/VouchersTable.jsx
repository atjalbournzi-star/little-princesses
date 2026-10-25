// src/features/vouchers/components/VouchersTable.jsx
// جدول السندات والمعاملات المالية التفصيلي المتوافق مع الهوية البصرية وشاشة المنتجات
function VouchersTable({
  vouchers = [],
  accounts = [],
  activeTargetCurr = 'YER',
  currencyDisplay = 'YER ﷼',
  onViewVoucher,
  onOpenReverseModal,
  onSendWhatsApp
}) {
  const formatPay = (m) => {
    if (!m) return 'نقدي';
    const s = String(m).toLowerCase();
    if (s.includes('kuraimi') || s.includes('كريمي')) return 'كريمي إكسبرس';
    if (s.includes('jawali') || s.includes('جوالي')) return 'محفظة جوالي';
    if (s.includes('floosak') || s.includes('فلوسك')) return 'محفظة فلوسك';
    if (s.includes('onecash') || s.includes('ون كاش') || s.includes('ونكاش')) return 'ون كاش';
    if (s.includes('bank') || s.includes('تحويل') || s.includes('بنك')) return 'تحويل بنكي';
    if (s.includes('cheque') || s.includes('شيك')) return 'شيك بنكي';
    if (s.includes('network') || s.includes('شبكة')) return 'شبكة مصرفية';
    return (s === 'cash' || s === 'كاش') ? 'نقدي' : m;
  };

  const getAccLabel = (raw, fallback) => {
    if (!raw) return fallback;
    const code = String(raw).trim().split(' - ')[0].trim();
    const m = (accounts || []).find(a => [String(a.id), String(a.code), String(a.acc_code), `ACC-${a.code}`].includes(code) || String(a.id) === `ACC-${code}`);
    return m ? `${m.code || m.acc_code} - ${m.name || m.account_name || m.acc_name || m.name_en || m.code}` : raw;
  };

  if (!vouchers || !vouchers.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-slate-700 dark:text-white text-xs font-semibold select-none">
        <svg className="w-7 h-7 text-slate-400 dark:text-slate-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>لا توجد سندات مسجلة تطابق معايير البحث والتصفية</span>
      </div>
    );
  }

  const columns = [
    { key: 'type', label: 'النوع', width: 'w-[78px]', align: 'text-center' },
    { key: 'v_no', label: 'رقم السند', width: 'w-[125px]', align: 'text-right' },
    { key: 'party', label: 'الطرف / المستفيد', width: 'w-[12%]', align: 'text-right' },
    { key: 'amount', label: `المبلغ (${activeTargetCurr})`, width: 'w-[85px]', align: 'text-left' },
    { key: 'pay_method', label: 'طريقة الدفع', width: 'w-[92px]', align: 'text-center' },
    { key: 'account', label: 'الحساب المالي', width: 'w-auto', align: 'text-right' },
    { key: 'target_account', label: 'الحساب المقابل', width: 'w-auto', align: 'text-right' },
    { key: 'date', label: 'التاريخ', width: 'w-[88px]', align: 'text-center' },
    { key: 'actions', label: 'إجراءات', width: 'w-[95px]', align: 'text-center' }
  ];

  return (
    <div className="overflow-x-auto custom-scrollbar rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 select-none">
      <table className="w-full min-w-[980px] table-fixed text-right border-collapse">
        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 shadow-xs">
          <tr className="h-7.5">
            {columns.map(c => (
              <th
                key={c.key}
                className={`h-7.5 py-1.5 px-2 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden ${c.width} ${c.align}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-transparent">
          {vouchers.map(v => {
            const rawAcc = v.account || v.acc_code || v.account_id || v.payment_source || '';
            const accLabel = getAccLabel(rawAcc, rawAcc || '101 - الصندوق الرئيسي');
            const rawTarget = v.target_account || v.target_acc || (v.isReceipt ? '104' : '201');
            const targetLabel = getAccLabel(rawTarget, (String(rawTarget).includes('202') ? '202 - عرابين وأمانات العملاء' : (String(rawTarget).includes('104') ? '104 - ذمم العملاء' : rawTarget)));

            const vCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(v.currency) : (v.currency || 'YER');
            const isSameCurr = vCurr === activeTargetCurr;
            const rawNum = isSameCurr
              ? (parseFloat(v.amount) || 0)
              : ((activeTargetCurr === 'YER' && parseFloat(v.base_amount) > 0)
                  ? parseFloat(v.base_amount)
                  : (window.CurrencyService ? window.CurrencyService.convert(v.amount, vCurr, activeTargetCurr, v.exchange_rate) : v.amount));
            const formattedAmt = (parseFloat(rawNum) || 0).toLocaleString('en-US', {
              minimumFractionDigits: activeTargetCurr === 'YER' ? 0 : 2,
              maximumFractionDigits: 2
            });
            const amtTooltip = !isSameCurr
              ? `${formattedAmt} ${activeTargetCurr} (المسجل: ${(parseFloat(v.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${vCurr})`
              : `${formattedAmt} ${activeTargetCurr}`;
            const isReversed = v.status === 'reversed';

            return (
              <tr key={v.id || v.v_no} className="h-8 border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[11px] font-medium transition-colors">
                {/* 1. النوع */}
                <td className="w-[78px] py-1.5 px-1 text-center truncate overflow-hidden whitespace-nowrap" title={v.v_type}>
                  {isReversed ? (
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700">ملغى بقيد</span>
                  ) : (
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${
                      v.v_type === 'إيداع رأس مال' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                      : (v.v_type && (v.v_type.includes('قيد') || v.v_type.includes('تسوية'))) ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60'
                      : (v.isReceipt ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800/60')
                    }`}>
                      {v.v_type}
                    </span>
                  )}
                </td>

                {/* 2. رقم السند - فضي تقني هادئ */}
                <td className="w-[125px] py-1.5 px-2 text-right truncate overflow-hidden whitespace-nowrap" dir="ltr" title={v.v_no}>
                  <span className="font-mono text-slate-600 dark:text-slate-400 font-medium text-[11px] block truncate">{v.v_no}</span>
                </td>

                {/* 3. الطرف / المستفيد */}
                <td className="w-[12%] py-1.5 px-2 text-right truncate overflow-hidden whitespace-nowrap" title={v.party || '—'}>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-[11px] block truncate">{v.party || '—'}</span>
                </td>

                {/* 4. المبلغ - أبيض واضح بدون تكرار رمز العملة الملون */}
                <td className="w-[85px] py-1.5 px-2 text-left truncate overflow-hidden whitespace-nowrap dir-ltr" title={amtTooltip}>
                  <span className={`font-mono font-bold text-xs tabular-nums block truncate ${isReversed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                    {formattedAmt}
                  </span>
                </td>

                {/* 5. طريقة الدفع - شارة داكنة محايدة هادئة */}
                <td className="w-[92px] py-1.5 px-1.5 text-center truncate overflow-hidden whitespace-nowrap" title={formatPay(v.pay_method)}>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/70 whitespace-nowrap truncate max-w-full">
                    {formatPay(v.pay_method)}
                  </span>
                </td>

                {/* 6. الحساب المالي - نص محاسبي نظيف بدون إطار */}
                <td className="w-auto py-1.5 px-2 text-right truncate overflow-hidden whitespace-nowrap" title={accLabel}>
                  <span className="text-slate-700 dark:text-slate-200 text-[11px] font-medium block truncate">{accLabel}</span>
                </td>

                {/* 7. الحساب المقابل - نص محاسبي نظيف بدون إطار ملون */}
                <td className="w-auto py-1.5 px-2 text-right truncate overflow-hidden whitespace-nowrap" title={targetLabel}>
                  <span className="text-slate-700 dark:text-slate-200 text-[11px] font-medium block truncate">{targetLabel}</span>
                </td>

                {/* 8. التاريخ - رمادي فضي هادئ */}
                <td className="w-[88px] py-1.5 px-1.5 text-center truncate overflow-hidden whitespace-nowrap" dir="ltr" title={v.date || '—'}>
                  <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px] block truncate">{v.date || '—'}</span>
                </td>

                {/* 9. إجراءات - 3 أيقونات نقية ومكتملة الظهور بدون قص */}
                <td className="w-[95px] py-1.5 px-2 text-center whitespace-nowrap overflow-hidden">
                  <div className="flex items-center justify-center gap-1.5">
                    {/* 1. معاينة وطباعة وتنزيل بطاقة السند الرسمية */}
                    <a
                      href={`/voucher.html?id=${encodeURIComponent(v.v_no || v.payment_no || v.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="معاينة وطباعة وتنزيل بطاقة السند الرسمية"
                      className="w-5.5 h-5.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-600 dark:text-teal-400 border border-slate-300 dark:border-slate-700 rounded transition cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </a>

                    {/* 2. إرسال إشعار السند عبر واتساب مباشرة */}
                    <button
                      type="button"
                      onClick={() => onSendWhatsApp?.(v)}
                      title="إرسال إشعار السند عبر واتساب مباشرة"
                      className="w-5.5 h-5.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded transition cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>

                    {/* 3. إلغاء السند بقيد عكسي معتمد محاسبياً */}
                    {!isReversed ? (
                      <button
                        type="button"
                        onClick={() => onOpenReverseModal?.(v)}
                        title="إلغاء السند بقيد عكسي معتمد محاسبياً"
                        className="w-5.5 h-5.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded transition cursor-pointer flex items-center justify-center shrink-0"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a5 5 0 015 5v2m0 0l-3-3m3 3l3-3M3 10l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                    ) : (
                      <span className="text-[9.5px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">
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
