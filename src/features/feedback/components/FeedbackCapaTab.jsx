// src/features/feedback/components/FeedbackCapaTab.jsx
// تبويب خطط الإجراءات التصحيحية والوقائية (CAPA Studio)

function FeedbackCapaTab({
  correctiveActions = [],
  onOpenModal,
  onUpdateCAPAStatus
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E8E5EA]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-[#25232A]">خطط الإجراءات التصحيحية والوقائية (CAPA Studio)</h3>
            <span className="text-[11px] bg-[#E2F5F7] text-[#007F8C] font-bold px-2 py-0.5 rounded-full border border-[#C5ECF0]">
              {correctiveActions.filter(a => a.status !== 'Completed').length} خطة قيد التنفيذ
            </span>
          </div>
          <p className="text-xs text-[#6F6B75] mt-0.5">معالجة الأسباب الجذرية للعيوب وشكاوى المعمل لمنع تكرارها وتحقيق المطابقة الصناعية</p>
        </div>
        <button
          onClick={() => onOpenModal('capa')}
          className="px-4 py-2 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 self-start sm:self-auto transition"
        >
          <span>➕ خطة تصحيح جديدة</span>
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
              <th className="p-3">رقم الإجراء والتاريخ</th>
              <th className="p-3">النوع</th>
              <th className="p-3">المشكلة المرصودة</th>
              <th className="p-3">السبب الجذري</th>
              <th className="p-3">الإجراء المعتمد</th>
              <th className="p-3">المسؤول</th>
              <th className="p-3 text-center">الأولوية</th>
              <th className="p-3 text-center">الحالة</th>
              <th className="p-3 text-center">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E5EA] bg-white">
            {correctiveActions.length === 0 ? (
              <tr><td colSpan="9" className="p-10 text-center text-[#6F6B75]">لا توجد إجراءات تصحيحية مسجلة حالياً 🛡️</td></tr>
            ) : (
              correctiveActions.map((act, idx) => (
                <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                  <td className="p-3">
                    <div className="font-bold font-mono text-[#8F2A87]">#{act.id || act.action_id || `CAPA-${idx+1}`}</div>
                    <div className="text-[11px] text-[#6F6B75] font-mono">{String(act.start_date || act.created_at || '').split('T')[0]}</div>
                  </td>
                  <td className="p-3 font-semibold text-[#25232A]">
                    {act.action_type === 'preventive' ? 'وقائي 🛡️' : 'تصحيحي 🔧'}
                  </td>
                  <td className="p-3 font-bold text-[#25232A] max-w-xs truncate">{act.problem_statement || act.problem || act.title || '--'}</td>
                  <td className="p-3 text-[#6F6B75] max-w-xs truncate">{act.root_cause || '--'}</td>
                  <td className="p-3 text-[#6F6B75] max-w-xs truncate">{act.action_description || act.description || '--'}</td>
                  <td className="p-3 text-[#25232A] font-medium">{act.responsible_person || act.responsible || 'مدير المعمل'}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      act.priority === 'High' ? 'bg-rose-100 text-[#D64545]' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {act.priority || 'Medium'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                      act.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {act.status === 'Completed' ? 'مكتمل ✅' : 'قيد التنفيذ ⏳'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {act.status !== 'Completed' && (
                      <button
                        onClick={() => onUpdateCAPAStatus(act, 'Completed')}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold transition cursor-pointer"
                      >
                        إنهاء الإجراء ✅
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
  );
}

window.FeedbackCapaTab = FeedbackCapaTab;
