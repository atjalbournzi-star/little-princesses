const { useState, useEffect, useMemo, useCallback, useRef } = React;
// === FILE: src/features/InvoiceModal.jsx ===
function InvoiceModal({ customer, onClose }) {
  if (!customer) return null;

  const { ledger = {}, measurements = [] } = customer;
  const qrData = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`رقم الفاتورة: ${customer.customer_id}\nالعميل: ${customer.name}\nالمتبقي: ${ledger.remaining || 0} YER`)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const text = `مرحباً ${customer.name}،\n\nنشكركم لاختيار مؤسسة الأميرات الصغيرات للأزياء الفاخرة.\n\nرقم الفاتورة: ${customer.customer_id}\nإجمالي المبيعات: ${ledger.total_sales || 0}\nكلفة التوصيل: ${ledger.delivery || 0}\nالعربون المدفوع: ${ledger.deposit || 0}\n*المبلغ المتبقي: ${ledger.remaining || 0}*\n\nنسعد بخدمتكم دائماً! 👑`;
    const url = `https://wa.me/${(customer.phone||'').replace(/^0+/, '967').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:p-0 print:bg-white print:block">
      
      {/* Container */}
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-w-none print:rounded-none print:shadow-none print:max-h-none print:overflow-visible relative">
        
        {/* Close Button (Hidden in Print) */}
        <button onClick={onClose} className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full transition z-10 print:hidden">
          ✕
        </button>

        <div className="overflow-y-auto print:overflow-visible p-8 sm:p-10">
          
          {/* Header */}
          <div className="border-b-4 border-rose-900 pb-6 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-black text-rose-900 mb-1">مؤسسة الأميرات الصغيرات</h1>
              <p className="text-sm font-bold text-slate-500 tracking-wider">لـلأزيـاء الفــاخـــرة 👑</p>
            </div>
            <div className="text-left">
              <div className="inline-block bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 text-rose-900">
                <p className="text-xs font-bold text-rose-700 mb-1">فاتورة إلكترونية / INVOICE</p>
                <p className="text-lg font-black font-mono">{customer.customer_id}</p>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100 print:border-none print:bg-transparent print:p-0">
            <div>
              <p className="text-[10px] font-black text-slate-400 mb-1">بيانات العميل / CUSTOMER INFO</p>
              <h3 className="text-lg font-black text-slate-800">{customer.name}</h3>
              <p className="text-sm font-bold text-slate-600 flex items-center gap-2 mt-1">📞 {customer.phone}</p>
              <p className="text-sm font-bold text-slate-600 flex items-center gap-2 mt-1">📍 {customer.city} {customer.street ? `- ${customer.street}` : ''}</p>
            </div>
            <div className="sm:text-left">
              <p className="text-[10px] font-black text-slate-400 mb-1">تواريخ الفاتورة / DATES</p>
              <div className="space-y-2 mt-1">
                <p className="text-sm font-bold text-slate-600"><span className="inline-block w-24 text-slate-400">تاريخ الإصدار:</span> {customer.reg_date || customer.ledger?.updated_at || '—'}</p>
                <p className="text-sm font-bold text-slate-600"><span className="inline-block w-24 text-slate-400">الاستلام المتوقع:</span> {measurements[0]?.event_date || 'غير محدد'}</p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mb-8 rounded-2xl overflow-hidden border border-slate-200 print:border-none">
            <table className="w-full text-sm">
              <thead className="bg-rose-900 text-white">
                <tr>
                  <th className="py-3 px-4 text-right font-black">البيان / تفاصيل الفستان</th>
                  <th className="py-3 px-4 text-center font-black">الكمية</th>
                  <th className="py-3 px-4 text-right font-black">الإجمالي (غير شامل التوصيل)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {measurements.map((m, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="py-4 px-4">
                      <p className="font-black text-slate-800 text-base mb-1">فستان فاخر - تفصيل خاص</p>
                      <p className="text-xs font-bold text-slate-500">👧 الطفلة: {m.child_name || 'غير مسجل'}</p>
                      <p className="text-[10px] text-slate-400 mt-1">المقاسات: (الطول: {m.total_height||'-'} | الصدر: {m.chest_circ||'-'} | الخصر: {m.waist_circ||'-'})</p>
                    </td>
                    <td className="py-4 px-4 text-center font-black text-slate-700">1</td>
                    {idx === 0 ? (
                      <td rowSpan={measurements.length} className="py-4 px-4 text-right font-black text-lg text-slate-800 align-top border-r border-slate-100">
                        {ledger.total_sales || 0} <span className="text-xs text-slate-500">YER</span>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="flex flex-col sm:flex-row gap-6 mb-8">
            <div className="flex-1 print:hidden">
              {/* Optional notes block could go here */}
            </div>
            <div className="w-full sm:w-80 bg-slate-900 text-white p-6 rounded-2xl shadow-xl print:shadow-none print:border print:border-slate-800 print:text-black print:bg-transparent">
              <p className="text-[10px] font-black text-slate-400 mb-4 print:text-slate-500">ملخص الحساب / FINANCIAL SUMMARY</p>
              <div className="space-y-3 text-sm font-bold">
                <div className="flex justify-between">
                  <span className="text-slate-300 print:text-slate-600">إجمالي الفساتين:</span>
                  <span>{ledger.total_sales || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300 print:text-slate-600">رسوم التوصيل:</span>
                  <span>{ledger.delivery || 0}</span>
                </div>
                <div className="flex justify-between border-b border-slate-700 print:border-slate-200 pb-3">
                  <span className="text-slate-300 print:text-slate-600">العربون المدفوع:</span>
                  <span className="text-emerald-400 print:text-emerald-700">-{ledger.deposit || 0}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-base text-rose-200 print:text-rose-900 font-black">المبلغ المتبقي:</span>
                  <span className="text-2xl font-black text-white print:text-black">{ledger.remaining || 0} <span className="text-xs font-bold">YER</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer & QR */}
          <div className="border-t-2 border-dashed border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-right">
              <p className="text-base font-black text-rose-900 mb-2">شكراً لاختياركم مؤسسة الأميرات الصغيرات</p>
              <p className="text-xs font-bold text-slate-500">" ننسج أحلام أميرتكم بحب وعناية فائقة 🎀 "</p>
            </div>
            <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm print:border-none print:shadow-none">
              <img src={qrData} alt="QR Code" className="w-20 h-20" />
            </div>
          </div>

        </div>

        {/* Actions (Hidden in Print) */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex gap-3 justify-end print:hidden">
          <button onClick={handleWhatsApp} className="px-5 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-black text-sm rounded-xl transition flex items-center gap-2">
            📱 إرسال واتساب
          </button>
          <button onClick={handlePrint} className="px-5 py-2.5 bg-rose-900 hover:bg-rose-800 text-white font-black text-sm rounded-xl transition shadow-lg shadow-rose-900/30 flex items-center gap-2">
            🖨️ طباعة / حفظ PDF
          </button>
        </div>

      </div>
    </div>
  );
}
