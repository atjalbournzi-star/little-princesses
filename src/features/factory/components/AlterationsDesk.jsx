/**
 * AlterationsDesk - مكتب تذاكر تعديل البروفات ومتابعة الخياطين
 */
function AlterationsDesk({
  alterationsList = [],
  loadingAlterations = false,
  fetchAlterations,
  handleUpdateAlterationStatus
}) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-2xl font-bold shadow-2xs">
            ✂️
          </div>
          <div>
            <h2 className="text-base font-bold text-[#25232A]">مكتب تذاكر تعديل البروفات والمقاسات (Alterations Desk)</h2>
            <p className="text-xs text-[#6F6B75] mt-0.5">متابعة الفساتين العائدة لتعديل المقاسات، تصنيف الأسباب، وإعادة توجيهها للخياطين</p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAlterations}
          disabled={loadingAlterations}
          className="px-4 py-2 bg-[#FAFAFB] hover:bg-purple-50 text-purple-700 border border-[#E8E5EA] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
        >
          <span>{loadingAlterations ? 'جاري التحديث...' : '🔄 تحديث التذاكر'}</span>
        </button>
      </div>

      {/* Alterations Table / List */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#25232A]">قائمة تذاكر التعديل الحالية</span>
            <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full font-mono">
              {alterationsList.length} تذكرة
            </span>
          </div>
          <span className="text-xs text-[#6F6B75]">
            {alterationsList.filter(a => a.status !== 'completed').length} قيد التشغيل 🪡
          </span>
        </div>

        {alterationsList.length === 0 ? (
          <div className="py-16 text-center text-[#6F6B75] space-y-2">
            <span className="text-4xl block">✨</span>
            <p className="text-sm font-bold">لا توجد تذاكر تعديل مسجلة حالياً</p>
            <p className="text-xs text-[#007F8C]">جميع البروفات ومقاسات الفساتين دقيقة ومطابقة تماماً 👑</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-bold border-b border-[#E8E5EA]">
                  <th className="p-3 text-right">رقم الطلب</th>
                  <th className="p-3 text-right">العميلة / الأميرة</th>
                  <th className="p-3 text-right">الموديل</th>
                  <th className="p-3 text-right">سبب التعديل</th>
                  <th className="p-3 text-right">ملاحظات التعديل الدقيقة</th>
                  <th className="p-3 text-right">الأهمية</th>
                  <th className="p-3 text-right">الخياط المسند</th>
                  <th className="p-3 text-right">موعد الإنجاز</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA]">
                {alterationsList.map((alt) => (
                  <tr key={alt.id} className="hover:bg-purple-50/30 transition">
                    <td className="p-3 font-mono font-bold text-purple-700">{alt.order_no || ('ORD-' + alt.order_id)}</td>
                    <td className="p-3 font-bold text-[#25232A]">{alt.customer_name || 'عميلة'}</td>
                    <td className="p-3 text-[#25232A]">{alt.dress_type || 'فستان'}</td>
                    <td className="p-3 font-semibold text-purple-900">{alt.alteration_reason}</td>
                    <td className="p-3 text-[#6F6B75] max-w-xs truncate" title={alt.adjustment_notes}>{alt.adjustment_notes}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                        alt.severity === 'urgent'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}>
                        {alt.severity === 'urgent' ? 'عاجل ⚡' : 'عادي'}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-[#25232A]">{alt.assigned_tailor || 'غير مسند'}</td>
                    <td className="p-3 font-mono text-[#6F6B75]">{alt.target_date || '—'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                        alt.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : (alt.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-gray-100 text-gray-800 border border-gray-200')
                      }`}>
                        {alt.status === 'completed' ? 'تم الإنجاز ✅' : (alt.status === 'in_progress' ? 'قيد الخياطة 🪡' : 'معلق ⏳')}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {alt.status !== 'completed' && (
                        <div className="flex items-center justify-center gap-1.5">
                          {alt.status !== 'in_progress' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateAlterationStatus(alt.id, 'in_progress')}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10.5px] font-bold shadow-2xs cursor-pointer"
                              title="بدء الخياطة والتعديل"
                            >
                              بدء 🪡
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleUpdateAlterationStatus(alt.id, 'completed')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10.5px] font-bold shadow-2xs cursor-pointer"
                            title="اعتماد إتمام التعديل"
                          >
                            إنجاز ✅
                          </button>
                        </div>
                      )}
                      {alt.status === 'completed' && (
                        <span className="text-emerald-600 font-bold text-xs">جاهز للاستلام 👑</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.AlterationsDesk = AlterationsDesk;
}

