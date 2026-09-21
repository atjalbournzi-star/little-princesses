// src/features/feedback/components/FeedbackComplaintsReturnsTab.jsx
// جداول شكاوى العملاء والمقاسات وسجل مرتجعات الفساتين

function FeedbackComplaintsReturnsTab({
  activeTab,
  complaints = [],
  returns = [],
  currencyDisplay = "YER ريال",
  onOpenModal,
  onUpdateComplaintStatus,
  onUpdateReturnStatus
}) {
  return (
    <div className="space-y-6">
      {/* 1. تبويب سجل الشكاوى والمقاسات */}
      {activeTab === 'complaints' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E8E5EA]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#25232A]">سجل شكاوى العملاء والمقاسات (Customer Complaints)</h3>
                <span className="text-[11px] bg-rose-50 text-[#D64545] font-bold px-2 py-0.5 rounded-full border border-rose-200">
                  {complaints.filter(c => (c.status||'') !== 'Closed').length} شكوى مفتوحة
                </span>
              </div>
              <p className="text-xs text-[#6F6B75] mt-0.5">متابعة دقيقة لشكاوى المقاسات والتشطيب والتسليم وحالات الإغلاق والتعويض المالي</p>
            </div>
            <button
              onClick={() => onOpenModal('complaint')}
              className="px-4 py-2 bg-[#D64545] hover:bg-[#B53535] text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 self-start sm:self-auto transition"
            >
              <span>➕ تسجيل شكوى جديدة</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="p-3">رقم الشكوى والتاريخ</th>
                  <th className="p-3">اسم العميلة والطلب</th>
                  <th className="p-3">نوع الشكوى</th>
                  <th className="p-3 text-center">الخطورة</th>
                  <th className="p-3">التفاصيل</th>
                  <th className="p-3 text-center">التعويض (COPQ)</th>
                  <th className="p-3 text-center">الحالة الحالية</th>
                  <th className="p-3 text-center">الإجراء السريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {complaints.length === 0 ? (
                  <tr><td colSpan="8" className="p-10 text-center text-[#6F6B75]">لا توجد شكاوى مسجلة حتى الآن 🟢</td></tr>
                ) : (
                  complaints.map((c, idx) => (
                    <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="p-3">
                        <div className="font-bold font-mono text-[#D64545]">#{c.id || c.complaint_id || `CMP-${idx+1}`}</div>
                        <div className="text-[11px] text-[#6F6B75] font-mono">{String(c.complaint_date || c.created_at || '').split('T')[0]}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-[#25232A]">{c.customer_name || 'عميلة راقية'}</div>
                        {c.order_id && <div className="text-[11px] text-[#8F2A87] font-mono">طلب #{c.order_id}</div>}
                      </td>
                      <td className="p-3 font-semibold text-[#25232A]">
                        {c.complaint_type === 'sizing' ? 'مقاسات وتعديل 👗' : c.complaint_type === 'finishing' ? 'تشطيب وخياطة ✂️' : c.complaint_type === 'delivery' ? 'تأخير تسليم ⏱️' : (c.complaint_type || 'عام')}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (c.severity === 'critical' || c.severity === 'Critical') ? 'bg-rose-100 text-[#D64545]' :
                          (c.severity === 'high' || c.severity === 'High') ? 'bg-amber-100 text-[#C97300]' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {c.severity || 'Medium'}
                        </span>
                      </td>
                      <td className="p-3 text-[#6F6B75] max-w-xs truncate">{c.description || '--'}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#D64545]">
                        {(parseFloat(c.compensation_cost || 0)).toLocaleString('en-US')} {currencyDisplay}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                          c.status === 'Closed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          c.status === 'resolved' ? 'bg-[#E2F5F7] text-[#007F8C] border border-[#C5ECF0]' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {c.status === 'Closed' ? 'مغلقة 🔒' : c.status === 'resolved' ? 'تم الحل 🟢' : 'قيد التحقيق 🟡'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {c.status !== 'resolved' && c.status !== 'Closed' && (
                            <button
                              onClick={() => onUpdateComplaintStatus(c, 'resolved')}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold transition cursor-pointer"
                            >
                              حل ✅
                            </button>
                          )}
                          {c.status !== 'Closed' && (
                            <button
                              onClick={() => onUpdateComplaintStatus(c, 'Closed')}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition cursor-pointer"
                            >
                              إغلاق 🔒
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. تبويب سجل المرتجعات و COPQ */}
      {activeTab === 'returns' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E8E5EA]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#25232A]">سجل مرتجعات الفساتين وتكاليف الاسترجاع (Returns & COPQ)</h3>
                <span className="text-[11px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                  {returns.length} مرتجع مسجل
                </span>
              </div>
              <p className="text-xs text-[#6F6B75] mt-0.5">توثيق أسباب الإرجاع، حالة الفستان (قابل للإصلاح / هالك)، ومبالغ الاسترداد والاستبدال</p>
            </div>
            <button
              onClick={() => onOpenModal('return')}
              className="px-4 py-2 bg-[#6B21A8] hover:bg-[#581C87] text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 self-start sm:self-auto transition"
            >
              <span>➕ تسجيل مرتجع فستان</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="p-3">رقم المرتجع والتاريخ</th>
                  <th className="p-3">العميلة والطلب</th>
                  <th className="p-3">سبب الإرجاع</th>
                  <th className="p-3 text-center">حالة الفستان</th>
                  <th className="p-3">الإجراء المتخذ</th>
                  <th className="p-3 text-center">مبلغ الاسترداد</th>
                  <th className="p-3 text-center">تكلفة الاستبدال</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {returns.length === 0 ? (
                  <tr><td colSpan="9" className="p-10 text-center text-[#6F6B75]">لا توجد مرتجعات مسجلة حتى الآن 👗✨</td></tr>
                ) : (
                  returns.map((ret, idx) => (
                    <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="p-3">
                        <div className="font-bold font-mono text-[#6B21A8]">#{ret.id || ret.return_id || `RET-${idx+1}`}</div>
                        <div className="text-[11px] text-[#6F6B75] font-mono">{String(ret.return_date || ret.created_at || '').split('T')[0]}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-[#25232A]">{ret.customer_name || 'عميلة الأميرات'}</div>
                        {ret.order_id && <div className="text-[11px] text-[#8F2A87] font-mono">طلب #{ret.order_id}</div>}
                      </td>
                      <td className="p-3 font-semibold text-[#25232A]">{ret.return_reason || 'عيب جودة'}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ret.condition === 'damaged' ? 'bg-rose-100 text-[#D64545]' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {ret.condition === 'damaged' ? 'هالك / تالف ❌' : 'قابل للإصلاح ✂️'}
                        </span>
                      </td>
                      <td className="p-3 text-[#6F6B75] max-w-xs truncate">{ret.action_taken || '--'}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#D64545]">
                        {(parseFloat(ret.refund_amount || 0)).toLocaleString('en-US')} {currencyDisplay}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-[#8F2A87]">
                        {(parseFloat(ret.replacement_cost || 0)).toLocaleString('en-US')} {currencyDisplay}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-[#FAFAFB] border border-[#E8E5EA] text-[10.5px] font-bold">
                          {ret.status || 'Processing'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {ret.status !== 'Completed' && (
                          <button
                            onClick={() => onUpdateReturnStatus(ret, 'Completed')}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold transition cursor-pointer"
                          >
                            اكتمال ✅
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

window.FeedbackComplaintsReturnsTab = FeedbackComplaintsReturnsTab;
