import re
import sys

def main():
    try:
        with open('src/features/Customers.jsx', 'r', encoding='utf-8') as f:
            content = f.read()

        # 1. Add event_date to emptyMeasurement
        content = content.replace("child_name: '',", "child_name: '',\n    event_date: '',")

        # 2. Add isOlderThan90Days
        helper = """
  const isOlderThan90Days = (dateStr) => {
    if (!dateStr) return false;
    const diff = (new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24);
    return diff > 90;
  };
"""
        content = content.replace("  const emptyMeasurement =", helper + "\n  const emptyMeasurement =")

        # 3. Add 90 day warning to header
        header_target = "{idx + 1}{m.child_name ? `: ${m.child_name}` : ''}"
        header_replace = header_target + """
                  </span>
                  {isOlderThan90Days(m.meas_date) && (
                    <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold ml-2">
                      ⚠️ أكثر من 90 يوم
                    </span>
                  )}
"""
        content = content.replace(header_target + "\n                  </span>", header_replace)

        # 4. Add event_date input in the grid
        grid_target = """                      <input readOnly value={m.unit} className={inputCls + " bg-violet-50 cursor-default"} />
                    </div>
                  </div>"""
        grid_replace = """                      <input readOnly value={m.unit} className={inputCls + " bg-violet-50 cursor-default"} />
                    </div>
                    <div>
                      <label className={labelCls}>تاريخ المناسبة / التسليم</label>
                      <input type="date" value={m.event_date} onChange={e => updateMeasurement(idx,'event_date',e.target.value)} className={inputCls} />
                    </div>
                  </div>"""
        content = content.replace(grid_target, grid_replace)

        # 5. WhatsApp Icon next to phone
        phone_target = """<input required value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="77XXXXXXX" type="tel" />"""
        phone_replace = """<div className="relative">
                  <input required value={phone} onChange={e => setPhone(e.target.value)} className={inputCls + " pr-10 pl-2"} placeholder="77XXXXXXX" type="tel" dir="ltr" style={{textAlign:'right'}} />
                  {phone && (
                    <a href={`https://wa.me/${phone.replace(/^0+/, '967').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" 
                       className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-emerald-100 hover:bg-emerald-200 text-emerald-600 rounded-xl transition" title="مراسلة واتساب">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </a>
                  )}
                </div>"""
        content = content.replace(phone_target, phone_replace)

        # 6. Change grid-cols-1 sm:grid-cols-3 to grid-cols-1 sm:grid-cols-4 for the upper card
        content = content.replace('className="grid grid-cols-1 sm:grid-cols-3 gap-3"', 'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"')

        # 7. Add Quick Actions to Table
        headers_target = "['الكود','اسم العميلة','الهاتف','المنصة','المدينة','الفئة','التسجيل','الأطفال','المتبقي']"
        headers_replace = "['الكود','اسم العميلة','الهاتف','المنصة','المدينة','الفئة','التسجيل','الأطفال','المتبقي','الإجراءات']"
        content = content.replace(headers_target, headers_replace)

        row_target = """                    <td className={`px-3 py-2.5 text-center font-black whitespace-nowrap ${c.ledger?.remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {c.ledger?.remaining ? `${c.ledger.remaining}` : '—'}
                    </td>
                  </tr>"""
        row_replace = """                    <td className={`px-3 py-2.5 text-center font-black whitespace-nowrap ${c.ledger?.remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {c.ledger?.remaining ? `${c.ledger.remaining}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 flex items-center gap-1 justify-center whitespace-nowrap">
                      <button onClick={() => alert('سيتم طباعة البطاقة لاحقاً')} title="طباعة PDF" className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg></button>
                      <a href={`https://wa.me/${(c.phone||'').replace(/^0+/, '967').replace(/\D/g,'')}?text=${encodeURIComponent('مرحباً ' + c.name + '، إليك كشف الحساب الخاص بك من مؤسسة الأميرات الصغيرات.')}`} target="_blank" title="إرسال كشف واتساب" className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>
                      <button onClick={() => alert('سيتم تفعيل التعديل لاحقاً')} title="تعديل" className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                      <button onClick={() => alert('سيتم تفعيل الحذف لاحقاً')} title="حذف" className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                    </td>
                  </tr>"""
        content = content.replace(row_target, row_replace)

        with open('src/features/Customers.jsx', 'w', encoding='utf-8') as f:
            f.write(content)

        # 8. Now update bundle.jsx
        with open('src/bundle.jsx', 'r', encoding='utf-8') as f:
            bundle = f.read()

        start_header = bundle.find('// === FILE: src/features/Customers.jsx ===')
        end_idx = bundle.find('// === FILE: src/features/Products.jsx ===')
        if start_header == -1 or end_idx == -1:
            print('Could not find boundaries in bundle.jsx')
            sys.exit(1)

        new_bundle = bundle[:start_header] + "// === FILE: src/features/Customers.jsx ===\n" + content + "\n\n" + bundle[end_idx:]

        with open('src/bundle.jsx', 'w', encoding='utf-8') as f:
            f.write(new_bundle)
            
        print("Patched successfully.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
