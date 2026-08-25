const { useState, useEffect, useMemo, useCallback, useRef } = React;
function JobCardModal({ customer, onClose }) {
  if (!customer) return null;

  const handlePrint = () => {
    window.print();
  };
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 print:bg-white print:z-auto backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl relative flex flex-col my-auto print:shadow-none print:m-0 print:w-full">
        {/* Header */}
        <div className="p-6 border-b print:hidden flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-800">بطاقة المعمل والقص (Work Order)</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">طباعة (Print)</button>
            <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">إغلاق</button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="p-8 print:p-0" dir="rtl">
          <div className="flex justify-between items-start mb-8 border-b-2 border-indigo-900 pb-4">
            <div>
              <h1 className="text-3xl font-black text-indigo-900 mb-2">مؤسسة الأميرات الصغيرات</h1>
              <p className="text-lg text-slate-600 font-semibold">بطاقة أمر تشغيل ومعمل (Work Order Job Card)</p>
            </div>
            <div className="text-left">
              <p className="text-sm text-slate-500 mb-1">تاريخ الطلب: {customer.reg_date}</p>
              <p className="text-sm text-slate-500 mb-1">العميل: {customer.name}</p>
              <p className="text-lg font-bold text-indigo-900 border border-indigo-200 px-3 py-1 rounded-lg bg-indigo-50 mt-2">طلب رقم: {customer.customer_id}</p>
            </div>
          </div>

          <div className="space-y-12">
            {customer.measurements && customer.measurements.map((m, idx) => (
              <div key={idx} className="border-2 border-slate-200 rounded-xl p-6 bg-slate-50 break-inside-avoid">
                <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-200">
                  <div className="flex gap-4 items-center">
                    {m.model_image ? (
                      <img src={m.model_image} alt="الموديل" className="w-24 h-24 object-cover rounded-xl border-2 border-indigo-200 shadow-sm" />
                    ) : (
                      <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                         <span className="text-[10px] text-slate-400">لا توجد صورة</span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 bg-white px-4 py-1 rounded-lg shadow-sm border border-slate-200 mb-2">
                        الطفلة: {m.child_name || 'غير محدد'}
                      </h3>
                      {m.dress_color && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200 text-xs font-bold">
                          🎨 لون الفستان: {m.dress_color}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center bg-white p-2 rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-500 mb-1">موعد التسليم</p>
                      <p className="font-bold text-red-600">{m.event_date || 'غير محدد'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-center">
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">الطول الكلي</p>
                    <p className="font-bold text-lg font-mono tabular-nums">{m.total_height || '-'} <span className="text-xs font-sans font-normal text-slate-500">{m.unit}</span></p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">طول الفستان</p>
                    <p className="font-bold text-lg font-mono tabular-nums">{m.dress_length || '-'} <span className="text-xs font-sans font-normal text-slate-500">{m.unit}</span></p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">محيط الصدر</p>
                    <p className="font-bold text-lg font-mono tabular-nums">{m.chest_circ || '-'} <span className="text-xs font-sans font-normal text-slate-500">{m.unit}</span></p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">محيط الخصر</p>
                    <p className="font-bold text-lg font-mono tabular-nums">{m.waist_circ || '-'} <span className="text-xs font-sans font-normal text-slate-500">{m.unit}</span></p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">طول الصدر</p>
                    <p className="font-bold text-lg font-mono tabular-nums">{m.chest_length || '-'} <span className="text-xs font-sans font-normal text-slate-500">{m.unit}</span></p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">طول التنورة</p>
                    <p className="font-bold text-lg font-mono tabular-nums">{m.skirt_length || '-'} <span className="text-xs font-sans font-normal text-slate-500">{m.unit}</span></p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">طول الكم</p>
                    <p className="font-bold text-lg font-mono tabular-nums">{m.sleeve_length || '-'} <span className="text-xs font-sans font-normal text-slate-500">{m.unit}</span></p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">عرض الكتفين</p>
                    <p className="font-bold text-lg font-mono tabular-nums">{m.shoulder_width || '-'} <span className="text-xs font-sans font-normal text-slate-500">{m.unit}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Comfort Profile */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                    <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      تفضيلات الراحة والأقمشة
                    </h4>
                    {m.comfort_profile && m.comfort_profile.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {m.comfort_profile.map((pref, i) => (
                          <span key={i} className="px-3 py-1 bg-white border border-indigo-200 text-indigo-700 text-sm font-medium rounded-full shadow-sm">
                            {pref}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm italic">لا توجد تفضيلات محددة</p>
                    )}
                  </div>

                  {/* Sewing Notes */}
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <h4 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      ملاحظات الخياطة
                    </h4>
                    <p className="text-slate-700 whitespace-pre-wrap">{m.sewing_notes || <span className="text-slate-500 text-sm italic">لا توجد ملاحظات إضافية</span>}</p>
                  </div>
                </div>

                {/* Tracking QR Code */}
                <div className="mt-6 flex justify-end">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent('رقم الطلب: ' + customer.customer_id + '\nالطفلة: ' + (m.child_name || ''))}`} alt="QR Code" className="w-20 h-20 rounded-lg border-2 border-slate-200" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center border-t-2 border-slate-200 pt-4 pb-4">
             <p className="text-slate-500 text-sm">مؤسسة الأميرات الصغيرات للأزياء - يرجى تسليم القطعة للمشرف بعد الانتهاء من العمل.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
