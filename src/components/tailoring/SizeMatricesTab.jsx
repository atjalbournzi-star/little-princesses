// src/components/tailoring/SizeMatricesTab.jsx
// تبويب إدارة مصفوفة المقاسات القياسية في الإعدادات (WOMEN_APPAREL, GIRLS_DRESS, SCHOOL_UNIFORM)

function SizeMatricesTab({ showToast }) {
  const { useState, useEffect, useMemo } = React;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [segmentFilter, setSegmentFilter] = useState('ALL');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadMatrices = async () => {
    if (!window.TailoringAPI?.getSizeMatrices) return;
    setLoading(true);
    try {
      const res = await window.TailoringAPI.getSizeMatrices('', true);
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      showToast && showToast(e.message || 'تعذر تحميل مصفوفة المقاسات', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMatrices(); }, []);

  const filtered = useMemo(() => {
    if (segmentFilter === 'ALL') return rows;
    return rows.filter(r => String(r.segment_code || '').toUpperCase() === segmentFilter);
  }, [rows, segmentFilter]);

  const openNew = () => setEditing({
    segment_code: segmentFilter === 'ALL' ? 'GIRLS_DRESS' : segmentFilter,
    segment_name_ar: '', size_label: '', display_unit: 'cm',
    chest_cm: '', waist_cm: '', hip_cm: '', dress_length_cm: '', shoulder_cm: '', sleeve_cm: '',
    fabric_factor: '1', sort_order: '0', is_active: true,
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editing || saving) return;
    setSaving(true);
    try {
      const segNames = { WOMEN_APPAREL: 'ملابس نسائية', GIRLS_DRESS: 'فساتين بنات', SCHOOL_UNIFORM: 'زي مدرسي' };
      const payload = { ...editing, segment_name_ar: editing.segment_name_ar || segNames[editing.segment_code] || editing.segment_code };
      await window.TailoringAPI.saveSizeMatrix(payload, editing.id || null);
      showToast && showToast('تم حفظ المقاس القياسي بنجاح ✅', 'success');
      setEditing(null);
      loadMatrices();
    } catch (err) {
      showToast && showToast(err.message || 'فشل حفظ المقاس', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (row) => {
    try {
      if (row.is_active) await window.TailoringAPI.deleteSizeMatrix(row.id);
      else await window.TailoringAPI.saveSizeMatrix({ ...row, is_active: true }, row.id);
      showToast && showToast(row.is_active ? 'تم تعطيل المقاس' : 'تم تفعيل المقاس', 'success');
      loadMatrices();
    } catch (err) {
      showToast && showToast(err.message || 'تعذر تغيير الحالة', 'error');
    }
  };

  const inputCls = "w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none focus:border-pink-500";
  const segLabels = { WOMEN_APPAREL: 'ملابس نسائية', GIRLS_DRESS: 'فساتين بنات', SCHOOL_UNIFORM: 'زي مدرسي' };

  return (
    <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 text-right" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {['ALL', 'WOMEN_APPAREL', 'GIRLS_DRESS', 'SCHOOL_UNIFORM'].map(seg => (
            <button key={seg} type="button" onClick={() => setSegmentFilter(seg)} className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer border transition ${segmentFilter === seg ? 'bg-pink-600 text-white border-pink-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
              {seg === 'ALL' ? 'الكل' : segLabels[seg]}
            </button>
          ))}
        </div>
        <button type="button" onClick={openNew} className="px-3.5 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold cursor-pointer">+ إضافة مقاس قياسي</button>
      </div>

      {editing && (
        <form onSubmit={handleSave} className="p-3 rounded-xl border border-pink-200 dark:border-pink-800/60 bg-pink-50/40 dark:bg-slate-900/60 space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div><label className="block text-[10.5px] font-bold mb-0.5 text-slate-700 dark:text-slate-300">الفئة</label><select value={editing.segment_code} onChange={e => setEditing({ ...editing, segment_code: e.target.value })} className={inputCls}><option value="WOMEN_APPAREL">WOMEN_APPAREL</option><option value="GIRLS_DRESS">GIRLS_DRESS</option><option value="SCHOOL_UNIFORM">SCHOOL_UNIFORM</option></select></div>
            <div><label className="block text-[10.5px] font-bold mb-0.5 text-slate-700 dark:text-slate-300">اسم المقاس *</label><input type="text" value={editing.size_label} onChange={e => setEditing({ ...editing, size_label: e.target.value })} placeholder="مثال: M أو 6-9Y" className={inputCls} required /></div>
            <div><label className="block text-[10.5px] font-bold mb-0.5 text-slate-700 dark:text-slate-300">معامل القماش</label><input type="number" step="0.05" value={editing.fabric_factor} onChange={e => setEditing({ ...editing, fabric_factor: e.target.value })} className={inputCls + " font-mono"} /></div>
            <div><label className="block text-[10.5px] font-bold mb-0.5 text-slate-700 dark:text-slate-300">الترتيب</label><input type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: e.target.value })} className={inputCls + " font-mono"} /></div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[['chest_cm','الصدر'],['waist_cm','الخصر'],['hip_cm','الأرداف'],['dress_length_cm','الطول'],['shoulder_cm','الكتف'],['sleeve_cm','الكم']].map(([k, lbl]) => (
              <div key={k}><label className="block text-[10px] font-bold mb-0.5 text-slate-600 dark:text-slate-400">{lbl} (سم)</label><input type="number" step="0.5" value={editing[k] ?? ''} onChange={e => setEditing({ ...editing, [k]: e.target.value })} className={inputCls + " font-mono text-center"} /></div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer">إلغاء</button>
            <button type="submit" disabled={saving} className="px-4 py-1 rounded-lg bg-pink-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50">{saving ? 'جاري الحفظ...' : 'حفظ المقاس'}</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-right text-xs border-collapse">
          <thead className="bg-slate-50 dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-2">المقاس</th><th className="p-2">الفئة</th><th className="p-2 text-center">الصدر</th><th className="p-2 text-center">الخصر</th><th className="p-2 text-center">الأرداف</th><th className="p-2 text-center">الطول</th><th className="p-2 text-center">الكتف</th><th className="p-2 text-center">الكم</th><th className="p-2 text-center">معامل القماش</th><th className="p-2 text-center">الحالة</th><th className="p-2 text-center">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan="11" className="p-6 text-center text-slate-400">جاري التحميل...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="11" className="p-6 text-center text-slate-400">لا توجد مقاسات قياسية مسجلة</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="p-2 font-mono font-bold text-slate-900 dark:text-white">{r.size_label}</td>
                <td className="p-2 text-[11px] text-slate-600 dark:text-slate-300">{segLabels[r.segment_code] || r.segment_code}</td>
                <td className="p-2 text-center font-mono">{r.chest_cm ?? '—'}</td>
                <td className="p-2 text-center font-mono">{r.waist_cm ?? '—'}</td>
                <td className="p-2 text-center font-mono">{r.hip_cm ?? '—'}</td>
                <td className="p-2 text-center font-mono">{r.dress_length_cm ?? '—'}</td>
                <td className="p-2 text-center font-mono">{r.shoulder_cm ?? '—'}</td>
                <td className="p-2 text-center font-mono">{r.sleeve_cm ?? '—'}</td>
                <td className="p-2 text-center font-mono">{r.fabric_factor ?? 1}</td>
                <td className="p-2 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.is_active ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'}`}>{r.is_active ? 'نشط' : 'معطّل'}</span></td>
                <td className="p-2 text-center space-x-1 space-x-reverse">
                  <button type="button" onClick={() => setEditing({ ...r })} className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-[10.5px] font-bold cursor-pointer">تعديل</button>
                  <button type="button" onClick={() => handleToggleActive(r)} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10.5px] font-bold cursor-pointer">{r.is_active ? 'تعطيل' : 'تفعيل'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.SizeMatricesTab = SizeMatricesTab;
