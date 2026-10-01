function QualityCheckModal({
  qcModalData,
  setQcModalData,
  setFactory,
  showToast
}) {
  if (!qcModalData) return null;
  const service = window.FactoryService || {};
  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  const handleApprove = async () => {
    try {
      const res = await (service.approveQc ? service.approveQc({
        order_id: qcModalData.id || qcModalData.order_no,
        quality_score: qcModalData.score || 5.0,
        quality_notes: qcModalData.notes || '',
        wage_amount: parseFloat(qcModalData.wage || qcModalData.tailor_wage || 0),
        approved_by: 'سارة مديرة الورشة ✂️'
      }) : { success: true });
      if (res.success) {
        showToast(res.message || 'تم اعتماد الجودة وتوثيق الفحص في Supabase وترحيل العمولة بنجاح 👑', 'success');
        setFactory(prev => prev.map(item => (item.order_no === qcModalData.order_no || item.id === qcModalData.id) ? {
          ...item, tailor_status: 'approved', wage_credited: true, quality_score: qcModalData.score || 5.0,
          quality_notes: qcModalData.notes, stage: res.data?.stage || item.stage, progress: res.data?.progress || item.progress
        } : item));
        setQcModalData(null);
      } else showToast(res.error || 'حدث خطأ أثناء الاعتماد', 'error');
    } catch (err) {
      showToast('خطأ في الاتصال: ' + err.message, 'error');
    }
  };

  const handleRework = async () => {
    try {
      const res = await (service.reworkQc ? service.reworkQc({
        order_id: qcModalData.id || qcModalData.order_no,
        defect_type: qcModalData.defect_type || 'مقاسات غير مطابقة',
        severity: qcModalData.severity || 'Medium',
        corrective_action: qcModalData.corrective_action || 'إعادة ضبط المقاسات والسحاب ومعالجة العيب',
        notes: qcModalData.defect_notes || '',
        inspector_name: 'سارة مديرة الورشة ✂️'
      }) : { success: true });
      if (res.success) {
        showToast(res.message || 'تم توثيق العيب في Supabase وإرجاع الفستان للخياط بنجاح ⚠️', 'success');
        setFactory(prev => prev.map(item => (item.order_no === qcModalData.order_no || item.id === qcModalData.id) ? {
          ...item, tailor_status: 'rework', wage_credited: false, quality_score: 2.0,
          notes: (item.notes || '') + ` | ⚠️ مطلوب تعديل: ${qcModalData.defect_type || 'عيب خياطة'}`
        } : item));
        setQcModalData(null);
      } else showToast(res.error || 'حدث خطأ أثناء رصد العيب', 'error');
    } catch (err) {
      showToast('خطأ في الاتصال: ' + err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E8E5EA] space-y-4 text-right max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#8F2A87] to-[#B0005A] flex items-center justify-center text-white text-xl shadow-xs">
              {qcModalData.qc_mode === 'rework' ? '⚠️' : '👑'}
            </div>
            <div>
              <h3 className="text-sm font-black text-[#25232A]">محطة الفحص والرقابة الملكية للجودة</h3>
              <p className="text-[11px] text-[#6F6B75]">أمر تشغيل: {qcModalData.order_no || qcModalData.id} • متزامن مع Supabase ☁️</p>
            </div>
          </div>
          <button onClick={() => setQcModalData(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm cursor-pointer transition">✕</button>
        </div>

        <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-50/70 to-pink-50/70 border border-[#E5CEE7] flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-[#8F2A87] font-bold block">الأميرة والموديل:</span>
            <span className="font-extrabold text-[#25232A]">{qcModalData.child_name || 'الأميرة'} — {qcModalData.product || qcModalData.product_name}</span>
          </div>
          <div className="text-left">
            <span className="text-[10px] text-[#6F6B75] block">الفني المنفذ:</span>
            <span className="font-bold text-[#8F2A87]">{qcModalData.tailor || qcModalData.tailor_name || 'المعلم سليم'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-[#F5F4F7] rounded-2xl">
          <button type="button" onClick={() => setQcModalData({ ...qcModalData, qc_mode: 'pass' })} className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${qcModalData.qc_mode !== 'rework' ? 'bg-white text-[#8F2A87] shadow-sm border border-[#E5CEE7]' : 'text-[#6F6B75] hover:text-[#25232A]'}`}>
            <span>✅</span><span>فحص معتمد (PASS)</span>
          </button>
          <button type="button" onClick={() => setQcModalData({ ...qcModalData, qc_mode: 'rework' })} className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${qcModalData.qc_mode === 'rework' ? 'bg-rose-50 text-rose-700 shadow-sm border border-rose-200' : 'text-[#6F6B75] hover:text-rose-600'}`}>
            <span>⚠️</span><span>إرجاع للتعديل (REWORK)</span>
          </button>
        </div>

        <div className="bg-[#FAFAFB] p-3 rounded-2xl border border-[#E8E5EA] space-y-2 text-xs">
          <span className="text-[11px] font-bold text-[#25232A] block">معايير فحص الفستان (Checkpoints) 🔍:</span>
          <label className="flex items-center gap-2 p-1 rounded-xl hover:bg-white transition cursor-pointer">
            <input type="checkbox" checked={qcModalData.chk_measurements !== false} onChange={e => setQcModalData({ ...qcModalData, chk_measurements: e.target.checked })} className="w-4 h-4 accent-[#8F2A87] rounded" />
            <span className="text-[#25232A] font-medium">📏 مطابقة المقاسات لمواصفات الأميرة (±1 سم)</span>
          </label>
          <label className="flex items-center gap-2 p-1 rounded-xl hover:bg-white transition cursor-pointer">
            <input type="checkbox" checked={qcModalData.chk_lining !== false} onChange={e => setQcModalData({ ...qcModalData, chk_lining: e.target.checked })} className="w-4 h-4 accent-[#8F2A87] rounded" />
            <span className="text-[#25232A] font-medium">🪡 نعومة البطانة وحماية بشرة الطفلة</span>
          </label>
          <label className="flex items-center gap-2 p-1 rounded-xl hover:bg-white transition cursor-pointer">
            <input type="checkbox" checked={qcModalData.chk_seams !== false} onChange={e => setQcModalData({ ...qcModalData, chk_seams: e.target.checked })} className="w-4 h-4 accent-[#8F2A87] rounded" />
            <span className="text-[#25232A] font-medium">✨ سلاسة السحاب وتثبيت الشك واللؤلؤ</span>
          </label>
          <label className="flex items-center gap-2 p-1 rounded-xl hover:bg-white transition cursor-pointer">
            <input type="checkbox" checked={qcModalData.chk_packaging !== false} onChange={e => setQcModalData({ ...qcModalData, chk_packaging: e.target.checked })} className="w-4 h-4 accent-[#8F2A87] rounded" />
            <span className="text-[#25232A] font-medium">👑 الكوي بالبخار والتغليف الملكي الفاخر</span>
          </label>
        </div>

        {qcModalData.qc_mode !== 'rework' ? (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>تقييم الجودة وإتقان الخياطة (1 إلى 5 نجوم):</label>
              <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA]">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => setQcModalData({ ...qcModalData, score: star })} className={`text-2xl transition transform hover:scale-125 cursor-pointer ${star <= (qcModalData.score || 5) ? 'text-amber-400' : 'text-gray-300'}`}>★</button>
                ))}
                <span className="text-xs font-bold text-[#8F2A87] mr-2">({qcModalData.score || 5} من 5 نجوم)</span>
              </div>
            </div>
            <div>
              <label className={labelCls}>مبلغ الأجر / العمولة المعتمد للترحيل إلى HR (ر.ي):</label>
              <input type="number" className={inputCls + " font-mono font-bold text-[#8F2A87] text-center"} value={qcModalData.wage || qcModalData.tailor_wage || 500} onChange={e => setQcModalData({ ...qcModalData, wage: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>ملاحظات تقرير الفحص (تُسجل في Supabase):</label>
              <textarea rows="2" className={inputCls + " h-auto py-2 resize-none"} value={qcModalData.notes || 'تم فحص المقاسات ومطابقة الموديل بجودة ممتازة وسليم تماماً.'} onChange={e => setQcModalData({ ...qcModalData, notes: e.target.value })} />
            </div>
            <div className="pt-2 flex items-center gap-2">
              <button type="button" onClick={handleApprove} className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#8F2A87] to-[#B0005A] hover:opacity-95 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer">
                <span>✅</span><span>اعتماد الفحص وترحيل المستحق لـ HR</span>
              </button>
              <button type="button" onClick={() => setQcModalData(null)} className="py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer">إلغاء</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>نوع العيب المرصود ⚠️:</label>
                <select className={inputCls} value={qcModalData.defect_type || 'مقاسات غير مطابقة'} onChange={e => setQcModalData({ ...qcModalData, defect_type: e.target.value })}>
                  <option value="مقاسات غير مطابقة">📏 مقاسات غير مطابقة للأميرة</option>
                  <option value="السحاب يعلق أو تالف">🤐 السحاب يعلق أو تالف</option>
                  <option value="عيب في خياطة وتجميع القطعة">🪡 عيب في الخياطة والدرزات</option>
                  <option value="عيب في التطريز والشك">✨ عيب في التطريز واللؤلؤ</option>
                  <option value="عيب أو بقعة في القماش">✂️ بقعة أو عيب في القماش</option>
                  <option value="بطانة خشنة تسبب حكة">⚠️ بطانة خشنة تؤذي الطفلة</option>
                  <option value="أخرى">📝 أخرى</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>درجة الخطورة:</label>
                <select className={inputCls} value={qcModalData.severity || 'Medium'} onChange={e => setQcModalData({ ...qcModalData, severity: e.target.value })}>
                  <option value="Low">بسيط (Low)</option><option value="Medium">متوسط (Medium)</option><option value="Critical">حرج (Critical)</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>الإجراء التصحيحي المطلوب من الخياط:</label>
              <input type="text" className={inputCls} placeholder="مثال: إعادة فك السحاب وضبط محيط الصدر 2 سم" value={qcModalData.corrective_action || ''} onChange={e => setQcModalData({ ...qcModalData, corrective_action: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>ملاحظات إضافية عن العيب:</label>
              <textarea rows="2" className={inputCls + " h-auto py-2 resize-none"} placeholder="اكتبي تفاصيل العيب بدقة ليتداركها الفني..." value={qcModalData.defect_notes || ''} onChange={e => setQcModalData({ ...qcModalData, defect_notes: e.target.value })} />
            </div>
            <div className="pt-2 flex items-center gap-2">
              <button type="button" onClick={handleRework} className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer">
                <span>⚠️</span><span>توثيق العيب في Supabase وإرجاع للتعديل</span>
              </button>
              <button type="button" onClick={() => setQcModalData(null)} className="py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer">إلغاء</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.QualityCheckModal = QualityCheckModal;
