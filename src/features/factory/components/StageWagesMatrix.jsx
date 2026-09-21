function StageWagesMatrix({
  form,
  setForm,
  employees = [],
  handleStageEmpChange,
  showToast
}) {
  const utils = window.FactoryUtils || {};
  const cWage = parseFloat(form.cutter_wage || 0);
  const tWage = parseFloat(form.tailor_wage || 0);
  const eWage = parseFloat(form.embroiderer_wage || 0);
  const fWage = parseFloat(form.finisher_wage || 0);
  const singleDressTotal = cWage + tWage + eWage + fWage;
  const qty = parseFloat(form.quantity || 1);
  const grandTotalWages = singleDressTotal * qty;

  return (
    <div className="p-5 rounded-2xl bg-[#FAFAFB] border border-[#E8E5EA] space-y-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E8E5EA]">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗓️</span>
          <div>
            <h4 className="text-xs font-bold text-[#25232A]">مصفوفة مواعيد وأجور مراحل الإنتاج (Stage Schedule & Wage Matrix)</h4>
            <p className="text-[11px] text-[#6F6B75] mt-0.5">تحديد الفني المسؤول، موعد الإنجاز، وأجر القطعة لكل مرحلة مع الجلب التلقائي لأجر الموظف من HR 👑</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const m = utils.autoDistributeMilestones ? utils.autoDistributeMilestones(form.start_date, form.due_date) : {};
            setForm(prev => ({
              ...prev,
              cutting_due_date: m.cutting,
              sewing_due_date: m.sewing,
              embroidery_due_date: m.embroidery,
              finishing_due_date: m.finishing
            }));
            if (showToast) showToast('تم احتساب وتوزيع المواعيد الأربع تلقائياً بناءً على تاريخ التسليم ⚡', 'info');
          }}
          className="px-3.5 py-1.5 rounded-xl bg-[#F2E7F3] hover:bg-[#E5CEE7] text-[#8F2A87] text-xs font-bold border border-[#E5CEE7] transition flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <span>⚡</span>
          <span>توزيع المواعيد تلقائياً حسب التسليم</span>
        </button>
      </div>

      {/* بطاقات المراحل الأربع */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* 1. القص والتحضير */}
        <div className="p-3.5 rounded-xl bg-white border border-[#E8E5EA] shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#F2E7F3]">
            <span className="text-xs font-bold text-[#8F2A87] flex items-center gap-1.5"><span>✂️</span> 1. القص والتحضير</span>
            <span className="text-[10px] bg-[#F2E7F3] text-[#8F2A87] font-bold px-2 py-0.5 rounded-md font-mono">20%</span>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#25232A] mb-1">فني القص (Cutter)</label>
            <select className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs font-medium focus:border-[#8F2A87] outline-none" value={form.cutter_name || ''} onChange={e => handleStageEmpChange('cutter', e.target.value)}>
              <option value="">-- اختر فني القص --</option>
              {employees?.filter(e => e.status === 'نشط' || !e.status).map(emp => (
                <option key={emp.id || emp.name} value={emp.name}>{emp.name} ({emp.job_title || emp.role || 'قص وتفصيل'})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#25232A] mb-1">موعد إنجاز القص</label>
            <input type="date" lang="en-GB" dir="ltr" className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs font-mono font-bold text-[#8F2A87] focus:border-[#8F2A87] outline-none" value={form.cutting_due_date || ''} onChange={e => setForm({...form, cutting_due_date: e.target.value})} />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-[#25232A]">أجر القص بالقطعة</label>
              <span className="text-[10px] text-[#6F6B75]">ر.ي</span>
            </div>
            <input type="number" step="100" min="0" className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-mono font-bold text-[#8F2A87] text-center focus:border-[#8F2A87] outline-none" value={form.cutter_wage || ''} onChange={e => setForm({...form, cutter_wage: e.target.value})} placeholder="2000" />
          </div>
        </div>

        {/* 2. الخياطة والتجميع */}
        <div className="p-3.5 rounded-xl bg-white border border-[#E8E5EA] shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#F2E7F3]">
            <span className="text-xs font-bold text-[#8F2A87] flex items-center gap-1.5"><span>🪡</span> 2. الخياطة والتجميع</span>
            <span className="text-[10px] bg-[#F2E7F3] text-[#8F2A87] font-bold px-2 py-0.5 rounded-md font-mono">40%</span>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#25232A] mb-1">الخياط (Tailor)</label>
            <select className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs font-medium focus:border-[#8F2A87] outline-none" value={form.tailor_name || form.tailor || ''} onChange={e => handleStageEmpChange('tailor', e.target.value)}>
              <option value="">-- اختر الخياط --</option>
              {employees?.filter(e => e.status === 'نشط' || !e.status).map(emp => (
                <option key={emp.id || emp.name} value={emp.name}>{emp.name} ({emp.job_title || emp.role || 'خياط'})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#25232A] mb-1">موعد إنجاز الخياطة</label>
            <input type="date" lang="en-GB" dir="ltr" className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs font-mono font-bold text-[#8F2A87] focus:border-[#8F2A87] outline-none" value={form.sewing_due_date || ''} onChange={e => setForm({...form, sewing_due_date: e.target.value})} />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-[#25232A]">أجر الخياطة بالقطعة</label>
              <span className="text-[10px] text-[#6F6B75]">ر.ي</span>
            </div>
            <input type="number" step="100" min="0" className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-mono font-bold text-[#8F2A87] text-center focus:border-[#8F2A87] outline-none" value={form.tailor_wage || ''} onChange={e => setForm({...form, tailor_wage: e.target.value})} placeholder="5000" />
          </div>
        </div>

        {/* 3. التطريز والشك */}
        <div className="p-3.5 rounded-xl bg-white border border-[#E8E5EA] shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#F2E7F3]">
            <span className="text-xs font-bold text-[#8F2A87] flex items-center gap-1.5"><span>✨</span> 3. التطريز والشك</span>
            <span className="text-[10px] bg-[#F2E7F3] text-[#8F2A87] font-bold px-2 py-0.5 rounded-md font-mono">60%</span>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#25232A] mb-1">فني التطريز (Embroiderer)</label>
            <select className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs font-medium focus:border-[#8F2A87] outline-none" value={form.embroiderer_name || ''} onChange={e => handleStageEmpChange('embroiderer', e.target.value)}>
              <option value="">-- اختر فني التطريز --</option>
              {employees?.filter(e => e.status === 'نشط' || !e.status).map(emp => (
                <option key={emp.id || emp.name} value={emp.name}>{emp.name} ({emp.job_title || emp.role || 'تطريز وشك'})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#25232A] mb-1">موعد إنجاز التطريز</label>
            <input type="date" lang="en-GB" dir="ltr" className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs font-mono font-bold text-[#8F2A87] focus:border-[#8F2A87] outline-none" value={form.embroidery_due_date || ''} onChange={e => setForm({...form, embroidery_due_date: e.target.value})} />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-[#25232A]">أجر التطريز بالقطعة</label>
              <span className="text-[10px] text-[#6F6B75]">ر.ي</span>
            </div>
            <input type="number" step="100" min="0" className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-mono font-bold text-[#8F2A87] text-center focus:border-[#8F2A87] outline-none" value={form.embroiderer_wage || ''} onChange={e => setForm({...form, embroiderer_wage: e.target.value})} placeholder="3000" />
          </div>
        </div>

        {/* 4. الفحص والتشطيب */}
        <div className="p-3.5 rounded-xl bg-white border border-[#E8E5EA] shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E5EA]">
            <span className="text-xs font-bold text-[#007F8C] flex items-center gap-1.5"><span>🔍</span> 4. الفحص والتشطيب</span>
            <span className="text-[10px] bg-[#E2F5F7] text-[#007F8C] font-bold px-2 py-0.5 rounded-md font-mono">80%</span>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#25232A] mb-1">فني التشطيب (Finisher)</label>
            <select className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs font-medium focus:border-[#8F2A87] outline-none" value={form.finisher_name || ''} onChange={e => handleStageEmpChange('finisher', e.target.value)}>
              <option value="">-- اختر فني التشطيب --</option>
              {employees?.filter(e => e.status === 'نشط' || !e.status).map(emp => (
                <option key={emp.id || emp.name} value={emp.name}>{emp.name} ({emp.job_title || emp.role || 'تشطيب وجودة'})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#25232A] mb-1">موعد إنجاز التشطيب</label>
            <input type="date" lang="en-GB" dir="ltr" className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs font-mono font-bold text-[#007F8C] focus:border-[#007F8C] outline-none" value={form.finishing_due_date || form.due_date || ''} onChange={e => setForm({...form, finishing_due_date: e.target.value})} />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-[#25232A]">أجر التشطيب بالقطعة</label>
              <span className="text-[10px] text-[#6F6B75]">ر.ي</span>
            </div>
            <input type="number" step="100" min="0" className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-mono font-bold text-[#007F8C] text-center focus:border-[#007F8C] outline-none" value={form.finisher_wage || ''} onChange={e => setForm({...form, finisher_wage: e.target.value})} placeholder="1500" />
          </div>
        </div>
      </div>

      {/* شريط الإجماليات المالية للأجور */}
      <div className="p-3 rounded-xl bg-white border border-[#E8E5EA] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-[#8F2A87]">💰 تفصيل أجور مراحل الفستان:</span>
          <span className="bg-[#FAFAFB] px-2 py-0.5 rounded border border-[#E8E5EA] text-[#6F6B75]">✂️ قص: <strong className="text-[#25232A] font-mono">{cWage.toLocaleString()}</strong></span>
          <span className="bg-[#FAFAFB] px-2 py-0.5 rounded border border-[#E8E5EA] text-[#6F6B75]">🪡 خياطة: <strong className="text-[#25232A] font-mono">{tWage.toLocaleString()}</strong></span>
          <span className="bg-[#FAFAFB] px-2 py-0.5 rounded border border-[#E8E5EA] text-[#6F6B75]">✨ تطريز: <strong className="text-[#25232A] font-mono">{eWage.toLocaleString()}</strong></span>
          <span className="bg-[#FAFAFB] px-2 py-0.5 rounded border border-[#E8E5EA] text-[#6F6B75]">🔍 تشطيب: <strong className="text-[#25232A] font-mono">{fWage.toLocaleString()}</strong></span>
        </div>
        <div className="flex items-center gap-3 font-bold font-mono">
          <span className="text-[#6F6B75]">إجمالي الفستان: <strong className="text-[#8F2A87] text-sm">{singleDressTotal.toLocaleString()}</strong> ر.ي</span>
          {qty > 1 && (
            <span className="text-[#007F8C] bg-[#E2F5F7] px-2.5 py-1 rounded-lg border border-[#C5ECF0]">
              إجمالي الأمر ({qty} فساتين): {grandTotalWages.toLocaleString()} ر.ي
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

window.StageWagesMatrix = StageWagesMatrix;
