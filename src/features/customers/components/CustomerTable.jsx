// src/features/customers/components/CustomerTable.jsx

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
      <div className="text-center py-12 bg-[#111C38] rounded-xl border border-slate-800 p-6 space-y-2 select-none">
        <div className="w-10 h-10 rounded-xl bg-slate-800/80 text-gray-400 flex items-center justify-center text-xl mx-auto">
          👥
        </div>
        <h3 className="text-xs font-bold text-white">لا يوجد عملاء يطابقون شروط البحث</h3>
        <p className="text-[11px] text-slate-400">يمكنك تعديل معايير الفلترة أو إضافة عميل جديد للقائمة</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#111C38] shadow-xs select-none">
      <table className="w-full text-right table-auto">
        <thead className="sticky top-0 z-20 bg-[#111C38] border-b border-slate-800 shadow-xs">
          <tr className="h-6">
            <th className="py-1 px-2 h-6 text-right truncate text-[10px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap">الكود</th>
            <th className="py-1 px-2 h-6 text-right truncate text-[10px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap">اسم العميل</th>
            <th className="py-1 px-2 h-6 text-right truncate text-[10px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap">الهاتف والمنصة</th>
            <th className="py-1 px-2 h-6 text-right truncate text-[10px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap">المدينة</th>
            <th className="py-1 px-2 h-6 text-right truncate text-[10px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap">الفئة</th>
            <th className="py-1 px-2 h-6 text-right truncate text-[10px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap">أميرات العميل والمقاسات</th>
            <th className="py-1 px-2 h-6 text-center truncate text-[10px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap min-w-[100px]">الرصيد المتبقي</th>
            <th className="sticky left-0 z-30 bg-[#111C38] border-l border-slate-800 py-1 px-2 h-6 text-center truncate text-[10px] font-bold text-slate-400 uppercase tracking-tight w-28 whitespace-nowrap">الإجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {customers.map((c, idx) => {
            const custId = c.customer_id || c.id || `CUST-${idx + 1001}`;
            const custOrder = (orders || []).find(o => String(o.customer_id) === String(custId) || String(o.customer_id) === String(c.id) || (o.customer_name && String(o.customer_name).trim() === String(c.name || c.customer_name).trim()));
            const ordTotal = custOrder ? Number(custOrder.total_price || custOrder.total_amount || custOrder.total || 0) : 0;
            const ordPaid = custOrder ? Number(custOrder.paid_amount || custOrder.paid || custOrder.deposit || 0) : 0;
            const legTotal = parseFloat(c.ledger?.total_sales || c.total_sales || 0) + parseFloat(c.ledger?.delivery || c.ledger?.delivery_fee || c.delivery_fee || 0);
            const legPaid = parseFloat(c.ledger?.total_paid || c.ledger?.deposit || c.total_paid || c.deposit || 0);
            const trueTotal = ordTotal > 0 ? ordTotal : legTotal;
            const truePaid = Math.max(ordPaid, legPaid);
            const rem = trueTotal > 0 ? Math.max(0, trueTotal - truePaid) : parseFloat(c.ledger?.remaining ?? c.remaining ?? c.current_balance ?? 0);
            const measurementsList = Array.isArray(c.measurements) ? c.measurements : [];
            const childrenList = Array.isArray(c.children) ? c.children : [];

            return (
              <tr key={custId} className="h-7 max-h-7 border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors group">
                {/* كود العميل */}
                <td className="h-7 max-h-7 py-0.5 px-2 text-[10.5px] font-mono font-semibold text-slate-200 whitespace-nowrap truncate">
                  {custId}
                </td>

                {/* اسم العميل */}
                <td className="h-7 max-h-7 py-0.5 px-2 text-[11px] font-medium text-white whitespace-nowrap truncate max-w-[130px]" title={c.name || c.customer_name}>
                  <button type="button" onClick={() => onEditCustomer && onEditCustomer(c)} className="text-right text-white hover:text-pink-400 hover:underline transition-colors font-medium cursor-pointer truncate max-w-full">
                    {c.name || c.customer_name || 'بدون اسم'}
                  </button>
                </td>

                {/* الهاتف والمنصة */}
                <td className="h-7 max-h-7 py-0.5 px-2 text-[10.5px] font-mono font-semibold text-slate-200 whitespace-nowrap truncate">
                  <span className="dir-ltr text-right inline-block">{c.phone || '—'}</span>
                  {c.platform && <span className="text-[9.5px] text-slate-400 mr-1 font-sans">({c.platform.split(' ')[0]})</span>}
                </td>

                {/* المدينة */}
                <td className="h-7 max-h-7 py-0.5 px-2 text-[11px] font-medium text-slate-200 whitespace-nowrap truncate max-w-[90px]" title={cleanCity(c.city)} dir="rtl">
                  <span className="font-sans font-medium text-slate-200">{cleanCity(c.city)}</span>
                </td>

                {/* فئة العميل */}
                <td className="h-7 max-h-7 py-0.5 px-2 whitespace-nowrap truncate">
                  <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${getColor(c.category || 'جديد')}`}>
                    {c.category || 'جديد'}
                  </span>
                </td>

                {/* استعراض المقاسات والأميرات (نقر لفتح الخطوة 2) */}
                <td onClick={() => onOpenMeasurements && onOpenMeasurements(c)} className="h-7 max-h-7 py-0.5 px-2 text-right whitespace-nowrap truncate max-w-[180px] cursor-pointer hover:opacity-80 transition" title="فتح سجل المقاسات (الخطوة 2)">
                  {measurementsList.length > 0 ? (
                    <div className="flex items-center gap-1 overflow-hidden truncate">
                      {measurementsList.slice(0, 2).map((m, mIdx) => (
                        <span key={m.id || mIdx} className="text-[10px] py-0.2 px-1.5 bg-[#0B132B] border border-slate-700/60 rounded text-slate-200 font-medium truncate shrink-0 max-w-[100px]" title={`${m.child_name || 'الأميرة'}: ${m.selected_model || ''}`}>
                          👑 {m.child_name || 'الأميرة'}
                        </span>
                      ))}
                      {measurementsList.length > 2 && <span className="text-[9.5px] text-purple-300 font-mono font-bold">+{measurementsList.length - 2}</span>}
                    </div>
                  ) : childrenList.length > 0 ? (
                    <span className="text-[10px] text-slate-400 truncate">👧 {childrenList[0]?.child_name || 'الأميرة'}</span>
                  ) : (
                    <span className="text-slate-500 text-[10px]">—</span>
                  )}
                </td>

                {/* الرصيد المتبقي (نقر لفتح الخطوة 3) */}
                <td onClick={() => onOpenHistory && onOpenHistory(c)} className="h-7 max-h-7 py-0.5 px-2 whitespace-nowrap cursor-pointer hover:opacity-80 transition" title="فتح الحساب المالي (الخطوة 3)">
                  <div className="flex items-center justify-center">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                      rem > 0
                        ? 'bg-amber-950/60 text-amber-300 border-amber-600/60'
                        : 'bg-emerald-950/60 text-emerald-300 border-emerald-600/60'
                    }`}>
                      {rem > 0 ? `${rem.toLocaleString('en-US')} ${currency.symbol || ''}` : 'مسدد ✅'}
                    </span>
                  </div>
                </td>

                {/* أزرار الإجراءات الموحدة (مغروزة ومثبتة أقصى اليسار) */}
                <td className="sticky left-0 z-20 bg-[#111C38] group-hover:bg-slate-800/80 border-l border-slate-800 h-7 max-h-7 py-0.5 px-1.5 text-center w-28 whitespace-nowrap">
                  <div className="flex items-center gap-1 justify-center">
                    <button type="button" onClick={() => onEditCustomer ? onEditCustomer(c) : (onOpenMeasurements && onOpenMeasurements(c))} className="w-5 h-5 flex items-center justify-center p-1 rounded hover:bg-slate-700 text-xs transition cursor-pointer" title="تعديل بيانات العميل (الخطوة 1)">✏️</button>
                    <button type="button" onClick={() => onOpenHistory && onOpenHistory(c)} className="w-5 h-5 flex items-center justify-center p-1 rounded hover:bg-slate-700 text-xs transition cursor-pointer" title="الحساب المالي والعربون (الخطوة 3)">💳</button>
                    <button type="button" onClick={() => onPrintUnified ? onPrintUnified(c) : (onPrintInvoice && onPrintInvoice(c))} className="w-5 h-5 flex items-center justify-center p-1 rounded hover:bg-slate-700 text-xs transition cursor-pointer" title="مركز الطباعة">🖨️</button>
                    <button 
                      type="button"
                      onClick={() => onDeleteCustomer && onDeleteCustomer(c)} 
                      title="حذف العميل"
                      className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
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

window.CustomerTable = CustomerTable;
window.CustomerList = CustomerTable;
