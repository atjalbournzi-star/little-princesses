// src/features/marketing/components/MarketingCustomerIntel.jsx
// ====================================================================
// Component: MarketingCustomerIntel — تبويب ذكاء العملاء
// ====================================================================

function MarketingCustomerIntel({ customerSegments, setSelectedCustomerDetail }) {
  const isEmpty = !customerSegments ||
    Object.keys(customerSegments).length === 0 ||
    Object.values(customerSegments).every(list => !list || list.length === 0);

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div>
          <h3 className="font-black text-slate-800 text-sm">👥 نظام ذكاء العملاء الشامل (Customer Intelligence Center)</h3>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">تصنيف العقول الشرائية للعملاء واستخراج النية المباشرة من الرسائل والمحادثات</p>
        </div>

        {isEmpty ? (
          <div className="text-center py-10 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-slate-200">
            لا توجد شرائح عملاء مسجلة بعد • سيتم تصنيف العملاء آلياً عند تسجيل أولى المحادثات والطلبيات 👥
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(customerSegments || {}).map(([segKey, segList]) => (
              <div key={segKey} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-black text-slate-900 text-xs uppercase">{segKey.replace('_', ' ')}</h4>
                  <span className="bg-rose-100 text-rose-800 font-black text-[10px] px-2 py-0.5 rounded">{segList.length} عملاء</span>
                </div>
                <div className="space-y-2">
                  {segList.map(c => (
                    <div key={c.id} className="bg-white p-3 rounded-xl border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-900 text-xs">{c.name}</span>
                        <span className="text-[10px] font-mono font-bold text-indigo-600">نية {c.intent_score}/100</span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-bold">{c.notes}</p>
                      <button
                        onClick={() => setSelectedCustomerDetail(c)}
                        className="w-full mt-1 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-black text-[10px] rounded-lg transition"
                      >
                        💬 فتح سجل المحادثة والتحليل Conversation Intelligence
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

window.MarketingCustomerIntel = MarketingCustomerIntel;
