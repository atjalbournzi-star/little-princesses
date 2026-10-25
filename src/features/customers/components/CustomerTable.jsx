// src/features/customers/components/CustomerTable.jsx
// جدول استعراض العملاء وسجل المقاسات والحساب المالي والإجراءات المؤطرة

function CustomerTable({
  customers = [],
  orders = [],
  currency = { display: 'YER', symbol: '﷼' },
  onEditCustomer,
  onOpenMeasurements,
  onOpenHistory,
  onSendToFactory,
  onPrintInvoice,
  onPrintJobCard,
  onOpenDressCard,
  onSendWhatsApp,
  onDeleteCustomer,
  onPrintUnified
}) {
  const { catColor, formatCleanDate, isMeasurementStale } = window.customerUtils || {};
  const getColor = catColor || (() => 'bg-gray-100 text-gray-700');
  const formatDate = formatCleanDate || (d => d || '—');
  const checkStale = isMeasurementStale || (() => false);
  const cleanCity = v => {
    if (!v) return '—';
    const s = String(v).trim();
    return (s.toLowerCase() === 'cloin' || s.toLowerCase().includes('cloin')) ? 'صنعاء' : s;
  };

  if (!customers || customers.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-8 text-center space-y-2 select-none">
        <div className="w-10 h-10 rounded-xl bg-slate-800/80 text-gray-400 flex items-center justify-center text-xl mx-auto">
          👥
        </div>
        <h3 className="text-xs font-bold text-white">لا يوجد عملاء يطابقون شروط البحث</h3>
        <p className="text-[11px] text-slate-400">يمكنك تعديل معايير الفلترة أو إضافة عميل جديد للقائمة</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden select-none bg-[#111C38]">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-right table-fixed border-collapse" dir="rtl">
          <thead className="sticky top-0 z-10 bg-[#0F172A] border-b border-slate-800 shadow-xs">
            <tr className="h-7.5">
              <th className="h-7.5 py-1.5 px-2 text-right w-[13%] text-[11px] font-bold text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden">الكود</th>
              <th className="h-7.5 py-1.5 px-2 text-right w-[16%] text-[11px] font-bold text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden">اسم العميل</th>
              <th className="h-7.5 py-1.5 px-2 text-right w-[18%] text-[11px] font-bold text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden">الهاتف والمنصة</th>
              <th className="h-7.5 py-1.5 px-2 text-right w-[7%] text-[11px] font-bold text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden">المدينة</th>
              <th className="h-7.5 py-1.5 px-2 text-right w-[6%] text-[11px] font-bold text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden">الفئة</th>
              <th className="h-7.5 py-1.5 px-2 text-right w-[16%] text-[11px] font-bold text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden">أميرات العميل والمقاسات</th>
              <th className="h-7.5 py-1.5 px-2 text-center w-[10%] text-[11px] font-bold text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden">الرصيد المتبقي</th>
              <th className="h-7.5 py-1.5 px-2 text-center w-[14%] text-[11px] font-bold text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/20">
            {customers.map((c, idx) => {
              const custId = c.customer_id || c.id || `CUST-${idx + 1001}`;
              const cOrders = (orders || []).filter(o => (o.customer_id && (String(o.customer_id) === String(custId) || String(o.customer_id) === String(c.id))) || (o.customer_name && String(o.customer_name).trim() === String(c.name || c.customer_name).trim()));
              const custOrder = cOrders[0] || null;
              const delMode = c.ledger?.delivery_payment_mode || c.delivery_payment_mode || custOrder?.delivery_payment_mode || 'DIRECT_TO_COURIER';
              const isPrepaidDel = delMode === 'PREPAID_VIA_ATELIER';
              const delFee = isPrepaidDel ? parseFloat(c.ledger?.delivery || c.ledger?.delivery_fee || c.delivery_fee || custOrder?.delivery_fee || 0) : 0;
              let ordTotal = custOrder ? Number(custOrder.total_price || custOrder.total_amount || custOrder.total || 0) : 0;
              const ordDelFee = Number(custOrder?.delivery_fee || 0);
              if (!isPrepaidDel && ordDelFee > 0 && custOrder?.subtotal && ordTotal > Number(custOrder.subtotal)) {
                ordTotal = Number(custOrder.subtotal);
              }
              const ordPaid = custOrder ? Number(custOrder.paid_amount || custOrder.paid || custOrder.deposit || 0) : 0;
              const legTotal = parseFloat(c.ledger?.total_sales || c.total_sales || 0) + delFee;
              const legPaid = parseFloat(c.ledger?.total_paid || c.ledger?.deposit || c.total_paid || c.deposit || 0);
              const trueTotal = ordTotal > 0 ? ordTotal : legTotal;
              const truePaid = Math.max(ordPaid, legPaid);
              const rem = trueTotal > 0 ? Math.max(0, trueTotal - truePaid) : parseFloat(c.ledger?.remaining ?? c.remaining ?? c.current_balance ?? 0);
              const measurementsList = Array.isArray(c.measurements) ? c.measurements : [];
              const childrenList = Array.isArray(c.children) ? c.children : [];
              const hasReadyOrder = cOrders.some(o => o.stage === 'جاهز للتسليم 📦' || o.status === 'ready_for_delivery' || o.status === 'ready' || o.production_status === 'ready' || o.stage === 'ready');
              const shouldPulseDebt = rem > 0 && hasReadyOrder;

              return (
                <tr key={custId} className="h-8 border-b border-slate-800/60 hover:bg-slate-800/40 text-[11px] font-medium transition-colors">
                  {/* كود العميل */}
                  <td className="py-1.5 px-2 text-[11px] whitespace-nowrap overflow-hidden">
                    <span className="font-mono bg-slate-800/90 text-sky-300 border border-slate-700/80 px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums shrink-0 shadow-xs inline-block truncate max-w-full">
                      {custId}
                    </span>
                  </td>

                  {/* اسم العميل */}
                  <td className="py-1.5 px-2 text-[11px] whitespace-nowrap truncate overflow-hidden" title={c.name || c.customer_name}>
                    <button type="button" onClick={() => onEditCustomer && onEditCustomer(c)} className="text-right text-slate-100 hover:text-pink-400 hover:underline transition-colors font-semibold text-[11px] cursor-pointer truncate max-w-full block">
                      {c.name || c.customer_name || 'بدون اسم'}
                    </button>
                  </td>

                  {/* الهاتف والمنصة */}
                  <td className="py-1.5 px-2 text-[11px] whitespace-nowrap overflow-hidden">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-bold text-slate-100 tracking-wide" dir="ltr">{c.phone || '—'}</span>
                      {c.platform && (
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded font-medium bg-slate-800/90 text-slate-300 border border-slate-700/80 shrink-0 font-sans">
                          {c.platform}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* المدينة */}
                  <td className="py-1.5 px-2 text-[11px] whitespace-nowrap truncate overflow-hidden" title={cleanCity(c.city)} dir="rtl">
                    <span className="font-medium text-[11px] text-slate-200 truncate block">{cleanCity(c.city)}</span>
                  </td>

                  {/* فئة العميل */}
                  <td className="py-1.5 px-2 text-[11px] whitespace-nowrap overflow-hidden">
                    <span className={`inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${getColor(c.category || 'جديد')}`}>
                      {c.category || 'جديد'}
                    </span>
                  </td>

                  {/* استعراض المقاسات والأميرات */}
                  <td onClick={() => onOpenMeasurements && onOpenMeasurements(c)} className="py-1.5 px-2 text-[11px] text-right cursor-pointer hover:opacity-85 transition overflow-hidden" title="فتح سجل المقاسات (الخطوة 2)">
                    {measurementsList.length > 0 ? (
                      <div className="flex flex-wrap gap-1 items-center">
                        {measurementsList.slice(0, 2).map((m, mIdx) => (
                          <span key={m.id || mIdx} className="text-[9.5px] py-0.5 px-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 font-medium flex items-center gap-1 shrink-0">
                            <span>👑</span>
                            <span className="truncate max-w-[65px]">{m.child_name || ''}</span>
                          </span>
                        ))}
                        {measurementsList.length > 2 && (
                          <span className="text-[9.5px] px-1 py-0.2 rounded bg-purple-950/70 text-purple-200 border border-purple-800/60 font-mono font-bold">
                            +{measurementsList.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (childrenList.length > 0 && childrenList[0]?.child_name) ? (
                      <span className="text-[10px] text-slate-300 font-medium truncate block">👧 {childrenList[0].child_name}</span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">—</span>
                    )}
                  </td>

                  {/* الرصيد المتبقي (نقر لفتح الخطوة 3) */}
                  <td onClick={() => onOpenHistory && onOpenHistory(c)} className="py-1.5 px-2 text-[11px] whitespace-nowrap cursor-pointer hover:opacity-85 transition text-center overflow-hidden" title="فتح الحساب المالي (الخطوة 3)">
                    <div className="flex items-center justify-center">
                      {rem > 0 ? (
                        <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border tabular-nums ${
                          shouldPulseDebt
                            ? 'bg-amber-500/25 text-amber-300 border-amber-500/80 animate-pulse ring-1 ring-amber-500/40 shadow-xs'
                            : 'bg-amber-950/70 text-amber-300 border-amber-600/70'
                        }`}>
                          {rem.toLocaleString('en-US')} {currency.symbol || ''}
                        </span>
                      ) : (trueTotal > 0 && rem === 0) ? (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border bg-emerald-950/70 text-emerald-300 border-emerald-600/70">
                          مسدد ✅
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          —
                        </span>
                      )}
                    </div>
                  </td>

                  {/* أزرار الإجراءات المؤطرة الخمسة المدمجة w-5.5 h-5.5 بأيقونات دلالية ملونة */}
                  <td className="py-1.5 px-2 text-center whitespace-nowrap overflow-hidden">
                    <div className="flex items-center gap-1 justify-center">
                      <button type="button" onClick={() => onEditCustomer && onEditCustomer(c)} className="w-5.5 h-5.5 rounded border border-slate-700/80 bg-slate-900 text-sky-400 hover:bg-sky-500/15 hover:border-sky-500/50 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0" title="تعديل بيانات العميل (الخطوة 1)">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button type="button" onClick={() => onOpenMeasurements && onOpenMeasurements(c)} className="w-5.5 h-5.5 rounded border border-slate-700/80 bg-slate-900 text-fuchsia-400 hover:bg-fuchsia-500/15 hover:border-fuchsia-500/50 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0" title="فتح سجل المقاسات والتفصيل (الخطوة 2)">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879a3 3 0 11-4.242-4.242L10.757 7.757m3.364 6.364l-6.364-6.364" /></svg>
                      </button>
                      <button type="button" onClick={() => onOpenHistory && onOpenHistory(c)} className={`w-5.5 h-5.5 rounded border bg-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0 ${shouldPulseDebt ? 'border-amber-500/80 bg-amber-500/20 text-amber-300 animate-pulse' : 'border-slate-700/80 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/50'}`} title="الحساب المالي والعربون (الخطوة 3)">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      </button>
                      <button type="button" onClick={() => onPrintUnified ? onPrintUnified(c) : (onPrintInvoice && onPrintInvoice(c))} className="w-5.5 h-5.5 rounded border border-slate-700/80 bg-slate-900 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0" title="مركز الطباعة">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      </button>
                      <button type="button" onClick={() => onDeleteCustomer && onDeleteCustomer(c)} className="w-5.5 h-5.5 rounded border border-slate-700/80 bg-slate-900 text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/50 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0" title="حذف العميل">
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
    </div>
  );
}

window.CustomerTable = CustomerTable;
window.CustomerList = CustomerTable;
