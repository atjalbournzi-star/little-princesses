function Feedback({ feedback, setFeedback, customers, orders, showToast }) {
  const { useState, useMemo } = window;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    order_id: '',
    girl_name: '',
    overall_satisfaction: '5',
    fit_error_origin: 'مضبوط بدون أخطاء',
    sewing_rating: 'ممتاز',
    comfort_rating: 'مريحة جداً',
    packaging_rating: 'تغليف فاخر',
    status: 'تم التقييم',
    loyalty_ambassador: false,
    notes: ''
  });

  const totalFeedbacks = feedback.length;
  const npsAvg = totalFeedbacks > 0 
    ? (feedback.reduce((sum, f) => sum + Number(f['التقييم_العام'] || f['درجة_الرضا_الكلية'] || 5), 0) / totalFeedbacks).toFixed(1) 
    : '0.0';
  
  const workshopErrorsCount = feedback.filter(f => String(f['مصدر_خطأ_المقاس'] || f['مصدر_خطأ_المقاسات'] || '').includes('ورشة')).length;
  const onlineErrorsCount = feedback.filter(f => String(f['مصدر_خطأ_المقاس'] || f['مصدر_خطأ_المقاسات'] || '').includes('عميلة')).length;
  const pendingCount = feedback.filter(f => (f['حالة_المتابعة'] || f['حالة_متابعة_التقييم']) === 'قيد الانتظار').length;
  const activeTicketsCount = feedback.filter(f => 
    String(f['مصدر_خطأ_المقاس'] || f['مصدر_خطأ_المقاسات'] || '').includes('ورشة') && 
    (f['حالة_المتابعة'] || f['حالة_متابعة_التقييم']) !== 'تم الإغلاق والتسوية'
  ).length;

  const customerOrders = useMemo(() => {
    if (!orders) return [];
    if (!formData.customer_id) return orders;
    const cust = customers.find(c => c['كود_العميل'] === formData.customer_id);
    if (!cust) return orders;
    return orders.filter(o => o['اسم_العميل'] === cust['اسم_العميل'] || o['customer_name'] === cust['اسم_العميل']);
  }, [formData.customer_id, customers, orders]);

  const handleCustomerSelect = (e) => {
    const custId = e.target.value;
    const cust = customers.find(c => c['كود_العميل'] === custId);
    if (cust) {
      let kids = cust['أسماء_الأطفال'] ? cust['أسماء_الأطفال'].split('،').map(k => k.trim()) : [];
      let defaultGirl = kids.length > 0 ? kids[0] : '';
      setFormData(prev => ({
        ...prev,
        customer_id: custId,
        customer_name: cust['اسم_العميل'],
        order_id: '',
        girl_name: defaultGirl
      }));
    } else {
      setFormData(prev => ({ ...prev, customer_id: '', customer_name: '', order_id: '', girl_name: '' }));
    }
  };

  const handleOrderSelect = (e) => {
    const orderNo = e.target.value;
    const ord = orders.find(o => (o['رقم_الطلب'] || o['order_no']) === orderNo);
    
    let newFormData = { ...formData, order_id: orderNo };
    
    if (ord) {
      const cust = customers.find(c => c['اسم_العميل'] === (ord['اسم_العميل'] || ord['customer_name']));
      if (cust) {
         newFormData.customer_id = cust['كود_العميل'];
         newFormData.customer_name = cust['اسم_العميل'];
      }
      
      let girlName = '';
      const prod = ord['اسم_المنتج'] || ord['product_name'] || '';
      if (prod.includes('طفلة')) {
          girlName = prod.split('-')[1]?.trim() || '';
      }
      if (!girlName && cust && cust['أسماء_الأطفال']) {
          girlName = cust['أسماء_الأطفال'].split('،')[0]?.trim() || '';
      }
      newFormData.girl_name = girlName;
    }
    
    setFormData(newFormData);
  };

  const generateWhatsAppLink = (cust, orderId, templateType = 'survey', extra = '') => {
    const phone = cust['الهاتف_الرئيسي'] || cust['الهاتف_السيار'] || '';
    if (!phone) return showToast('لا يوجد رقم هاتف مسجل للعميلة', 'error');
    let formattedPhone = phone.trim();
    let message = '';

    if (templateType === 'survey') {
        message = 'أهلاً بكِ أختي ' + cust['اسم_العميل'] + ' 🌸\nنتمنى أن تكون أميرتنا الصغيرة بأتم الصحة.\nنود أن نسألك عن تقييمك لجودة الفستان والمقاسات للطلب رقم (' + orderId + ').\nملاحظاتك تهمنا جداً لتطوير الجودة! ✨\nرابط التقييم السريع: [ضع الرابط هنا]\n- إدارة Little Princesses';
    } else if (templateType === 'coupon') {
        message = 'أهلاً بكِ أختي ' + cust['اسم_العميل'] + ' 🌸\nشكراً لثقتك وتقييمك الرائع (5 نجوم) لطلبك رقم (' + orderId + ')!\nتقديراً لكونك من عملائنا المميزين، نهديكِ كود خصم خاص للطلب القادم: LOYALTY10 🎁✨\n- إدارة Little Princesses';
    }

    const encoded = encodeURIComponent(message);
    window.open('https://wa.me/' + formattedPhone + '?text=' + encoded, '_blank');
  };

  const openWhatsAppFromTable = (f, type = 'survey') => {
    const cust = customers.find(c => c['اسم_العميل'] === f['اسم_العميل'] || c['كود_العميل'] === f['كود_العميل']);
    if (cust) generateWhatsAppLink(cust, f['رقم_الطلب'], type);
    else showToast('لم يتم العثور على بيانات العميل', 'error');
  };

  const openWaForNew = () => {
    if (!formData.customer_id) return showToast('الرجاء اختيار العميل أولاً', 'error');
    const cust = customers.find(c => c['كود_العميل'] === formData.customer_id);
    generateWhatsAppLink(cust, formData.order_id || '---', 'survey');
  };

  const printTicket = (f) => {
    showToast('تم نسخ بيانات التذكرة المجانية للورشة!');
    navigator.clipboard.writeText(`تذكرة صيانة للورشة ✂️\nالطلب: ${f['رقم_الطلب']}\nالعميل: ${f['اسم_العميل']}\nملاحظات: ${f['ملاحظات']}`);
  };

  const convertPendingToImplicit = async () => {
    if(!window.updateFeedbackStatus) {
       return showToast('تحديث الحالة غير مدعوم حاليا (الرجاء التأكد من تحديث GAS)', 'error');
    }
    setIsConverting(true);
    try {
      const res = await window.updateFeedbackStatus({ status_from: 'قيد الانتظار', status_to: 'تم الاستلام - رضا ضمني (4/5)' });
      if (res && res.success) {
         showToast('تم تحويل الحالات المعلقة بنجاح!');
         // Optimistically update UI
         setFeedback(prev => prev.map(f => (f['حالة_المتابعة'] || f['حالة_متابعة_التقييم']) === 'قيد الانتظار' ? { ...f, 'حالة_المتابعة': 'تم الاستلام - رضا ضمني (4/5)', 'التقييم_العام': '4' } : f));
      } else {
         showToast(res.message || 'فشل التحديث', 'error');
      }
    } catch(e) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
    setIsConverting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_id) return showToast('الرجاء تحديد العميل', 'error');
    
    let finalOrderId = formData.order_id || 'ORD-GENERAL';
    let finalStatus = formData.status;
    let finalNotes = formData.notes;
    
    if (formData.fit_error_origin.includes('ورشة')) {
        finalNotes = '[تذكرة صيانة مجانية] ' + finalNotes;
        if (finalStatus === 'تم التقييم') finalStatus = 'جارٍ التعديل بالورشة';
    } else if (formData.fit_error_origin.includes('عميلة')) {
        finalNotes = '[خطأ مقاسات أونلاين - تم التعديل بخصم وتسوية] ' + finalNotes;
    }

    let finalOverall = formData.overall_satisfaction;
    if (formData.status === 'تم الاستلام - لم يتم الرد') finalOverall = '4';

    const payload = {
        ...formData,
        order_id: finalOrderId,
        status: finalStatus,
        notes: finalNotes,
        overall_satisfaction: finalOverall,
        date: window.TODAY_STR_ISO
    };

    setIsSubmitting(true);
    try {
      const res = await window.addFeedback(payload);
      if (res && res.success) {
        // -- الترحيل التلقائي لتكلفة الصيانة في حال وجود خطأ ورشة (Synergy) --
        if (payload.fit_error_origin.includes('ورشة')) {
          window.callGAS('addExpense', {
            id: Date.now(), exp_no: 'AUTOMAINT-' + payload.order_id, exp_type: 'مصاريف صيانة وتعديلات الورشة', amount: 15, currency: 'USD $', date: window.TODAY_STR_ISO, notes: `قيد آلي: تكلفة صيانة مجانية للطلب ${payload.order_id} (${payload.customer_name})`
          }).catch(e => console.log('Expense sync error', e));
        }

        showToast('تم حفظ التقييم والجودة بنجاح!');
        const newRecord = {
          'تاريخ_التقييم': window.TODAY_STR_ISO,
          'كود_العميل': payload.customer_id,
          'اسم_العميل': payload.customer_name,
          'رقم_الطلب': payload.order_id,
          'اسم_الطفلة': payload.girl_name,
          'التقييم_العام': payload.overall_satisfaction,
          'مصدر_خطأ_المقاس': payload.fit_error_origin,
          'جودة_الخياطة': payload.sewing_rating,
          'راحة_الطفلة': payload.comfort_rating,
          'جودة_التغليف': payload.packaging_rating,
          'حالة_المتابعة': payload.status,
          'سفير_البراند': payload.loyalty_ambassador ? 'نعم' : 'لا',
          'ملاحظات': payload.notes
        };
        setFeedback(prev => [...prev, newRecord]);
        setIsModalOpen(false);
        setFormData({
          customer_id: '', customer_name: '', order_id: '', girl_name: '',
          overall_satisfaction: '5', fit_error_origin: 'مضبوط بدون أخطاء',
          sewing_rating: 'ممتاز', comfort_rating: 'مريحة جداً', packaging_rating: 'تغليف فاخر',
          status: 'تم التقييم', loyalty_ambassador: false, notes: ''
        });
      } else {
        showToast(res.message || 'حدث خطأ أثناء الحفظ', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'خطأ في الاتصال بالخادم', 'error');
    }
    setIsSubmitting(false);
  };

  const statusColors = {
    'قيد الانتظار': 'bg-amber-100 text-amber-800',
    'تم التقييم': 'bg-emerald-100 text-emerald-800',
    'تم الاستلام - لم يتم الرد': 'bg-slate-100 text-slate-800',
    'تم الاستلام - رضا ضمني (4/5)': 'bg-blue-50 text-blue-700',
    'جارٍ التعديل بالورشة': 'bg-rose-100 text-rose-800',
    'تم الإغلاق والتسوية': 'bg-blue-100 text-blue-800'
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="text-purple-600"><Icons.Star /></span>
            إدارة الجودة ورضا العملاء
          </h1>
          <p className="text-slate-500 mt-1">متابعة مؤشرات الرضا (NPS)، جودة الخياطة، وإدارة تذاكر التعديلات</p>
        </div>
        <div className="flex gap-3">
          {pendingCount > 0 && (
            <button 
              onClick={convertPendingToImplicit}
              disabled={isConverting}
              className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 border border-amber-200"
            >
              <span>{isConverting ? 'جاري التحويل...' : 'أتمتة المعلق إلى رضا ضمني'}</span>
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-purple-200 flex items-center gap-2"
          >
            <span>إضافة تقييم جديد</span>
          </button>
        </div>
      </div>

      {/* KPIs Banner */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-r-4 border-r-emerald-500">
          <div className="text-xs font-semibold text-slate-500 mb-1">إجمالي التقييمات</div>
          <div className="text-2xl font-bold text-slate-800">{totalFeedbacks}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-r-4 border-r-purple-500">
          <div className="text-xs font-semibold text-slate-500 mb-1">متوسط الرضا (NPS)</div>
          <div className="text-2xl font-bold text-slate-800">{npsAvg} <span className="text-sm text-slate-400">/ 5</span></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-r-4 border-r-amber-500">
          <div className="text-xs font-semibold text-slate-500 mb-1">تذاكر الضمان النشطة</div>
          <div className="text-2xl font-bold text-rose-600">{activeTicketsCount}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-r-4 border-r-rose-400">
          <div className="text-xs font-semibold text-slate-500 mb-1">أخطاء الورشة ✂️</div>
          <div className="text-2xl font-bold text-slate-800">{workshopErrorsCount}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-r-4 border-r-blue-400">
          <div className="text-xs font-semibold text-slate-500 mb-1">أخطاء قياس العميلة 📱</div>
          <div className="text-2xl font-bold text-slate-800">{onlineErrorsCount}</div>
        </div>
      </div>

      {/* Expanded Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-medium whitespace-nowrap">
              <tr>
                <th className="px-4 py-4">التاريخ والطلب</th>
                <th className="px-4 py-4">العميلة والطفلة</th>
                <th className="px-4 py-4">الرضا الكلي</th>
                <th className="px-4 py-4">جودة الخياطة والراحة</th>
                <th className="px-4 py-4">حالة المتابعة</th>
                <th className="px-4 py-4">أخطاء المقاسات</th>
                <th className="px-4 py-4">إجراءات سريعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {feedback.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">لا توجد بيانات مسجلة حالياً</td>
                </tr>
              ) : (
                feedback.map((f, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4">
                        <div className="text-slate-500 text-xs">{String(f['تاريخ_التقييم']).split('T')[0]}</div>
                        <div className="font-semibold text-slate-700">#{f['رقم_الطلب']}</div>
                    </td>
                    <td className="px-4 py-4">
                        <div className="font-medium text-slate-800">{f['اسم_العميل']}</div>
                        <div className="text-xs text-purple-600">الطفلة: {f['اسم_الطفلة'] || '--'}</div>
                        {f['سفير_البراند'] === 'نعم' && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full mt-1 inline-block">👑 سفيرة براند</span>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-amber-400">
                        <span className="font-bold text-slate-800">{f['التقييم_العام'] || f['درجة_الرضا_الكلية']}</span>
                        <Icons.Star />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs space-y-1">
                        <div><span className="text-slate-400">خياطة:</span> {f['جودة_الخياطة'] || f['تقييم_الخياطة_والقماش']}</div>
                        <div><span className="text-slate-400">راحة:</span> {f['راحة_الطفلة'] || '--'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[f['حالة_المتابعة'] || f['حالة_متابعة_التقييم']] || 'bg-slate-100'}`}>
                        {f['حالة_المتابعة'] || f['حالة_متابعة_التقييم']}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {(f['مصدر_خطأ_المقاس'] || f['مصدر_خطأ_المقاسات']) === 'مضبوط بدون أخطاء' || (f['مصدر_خطأ_المقاس'] || f['مصدر_خطأ_المقاسات']) === 'بدون أخطاء' ? (
                        <span className="text-emerald-500 text-xs font-medium">✓ مضبوط 100%</span>
                      ) : (
                        <span className={`text-[11px] font-medium px-2 py-1 rounded ${String(f['مصدر_خطأ_المقاس'] || f['مصدر_خطأ_المقاسات']).includes('ورشة') ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                          {f['مصدر_خطأ_المقاس'] || f['مصدر_خطأ_المقاسات']}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                          <button onClick={() => openWhatsAppFromTable(f, 'survey')} className="text-emerald-600 hover:text-emerald-700 transition-colors bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200" title="إرسال استبيان واتساب">
                            استبيان
                          </button>
                          {(f['التقييم_العام'] === 5 || f['التقييم_العام'] === '5') && (
                            <button onClick={() => openWhatsAppFromTable(f, 'coupon')} className="text-purple-600 hover:text-purple-700 transition-colors bg-purple-50 px-3 py-1 rounded-full text-xs font-bold border border-purple-200" title="إرسال كوبون خصم للولاء">
                              كوبون 🎁
                            </button>
                          )}
                          {String(f['مصدر_خطأ_المقاس'] || '').includes('ورشة') && (
                            <button onClick={() => printTicket(f)} className="text-rose-600 hover:text-rose-700 transition-colors bg-rose-50 px-3 py-1 rounded-full text-xs font-bold border border-rose-200" title="إصدار تذكرة تعديل مجانية">
                              تذكرة 🎟️
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

      {/* Smart Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">نموذج الجودة الذكي وتقييم الرضا</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Icons.Close />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto no-scrollbar">
              <form id="feedbackForm" onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">العميلة</label>
                    <select required value={formData.customer_id} onChange={handleCustomerSelect} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                      <option value="">-- اختر --</option>
                      {customers.map(c => <option key={c['كود_العميل']} value={c['كود_العميل']}>{c['اسم_العميل']}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">رقم الطلب</label>
                    <select value={formData.order_id} onChange={handleOrderSelect} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                      <option value="">-- اختر الطلب --</option>
                      <option value="ORD-GENERAL">طلب عام / بدون رقم مسجل</option>
                      {customerOrders.map((o, idx) => <option key={idx} value={o['رقم_الطلب'] || o['order_no']}>#{o['رقم_الطلب'] || o['order_no']} - {o['اسم_المنتج'] || o['product_name']}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">اسم الطفلة</label>
                    <input type="text" list="girls_list" value={formData.girl_name} onChange={e => setFormData({...formData, girl_name: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                    <datalist id="girls_list">
                      {customers.find(c => c['كود_العميل'] === formData.customer_id)?.['أسماء_الأطفال']?.split('،').map((name, i) => <option key={i} value={name.trim()} />)}
                    </datalist>
                  </div>
                </div>
                
                {/* 2. Rating Details */}
                <div>
                  <h3 className="text-sm font-bold text-purple-700 mb-3">تفاصيل التقييم (Customer Experience)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">الرضا الكلي (NPS)</label>
                      <input type="number" min="1" max="5" step="0.5" value={formData.overall_satisfaction} disabled={formData.status === 'تم الاستلام - لم يتم الرد'} onChange={e => setFormData({...formData, overall_satisfaction: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm disabled:bg-slate-100" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">جودة الخياطة</label>
                      <select value={formData.sewing_rating} onChange={e => setFormData({...formData, sewing_rating: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
                        <option>ممتاز (Perfect)</option>
                        <option>جيد (معقول)</option>
                        <option>سيء (سوء تشطيب)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">راحة الطفلة باللبس</label>
                      <select value={formData.comfort_rating} onChange={e => setFormData({...formData, comfort_rating: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
                        <option>مريحة جداً</option>
                        <option>تحك بالبشرة قليلاً</option>
                        <option>غير مريحة</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">التغليف والنظافة</label>
                      <select value={formData.packaging_rating} onChange={e => setFormData({...formData, packaging_rating: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
                        <option>تغليف فاخر ونظيف</option>
                        <option>تغليف عادي</option>
                        <option>وصلت القطعة متسخة</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Errors & Smart Sorting */}
                <div>
                  <h3 className="text-sm font-bold text-rose-600 mb-3">تحليل الأخطاء وضبط المقاسات</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">تحديد المشكلة إن وُجدت (Auto-Sorting)</label>
                      <select value={formData.fit_error_origin} onChange={e => setFormData({...formData, fit_error_origin: e.target.value})} className={`w-full px-3 py-2 border rounded-lg text-sm font-medium ${formData.fit_error_origin.includes('ورشة') ? 'bg-rose-50 border-rose-200 text-rose-700' : formData.fit_error_origin.includes('عميلة') ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                        <option value="مضبوط بدون أخطاء">مضبوط 100% (لا يوجد خطأ)</option>
                        <option value="خطأ ورشة - تذكرة صيانة">خطأ من الورشة ➔ تذكرة صيانة مجانية عاجلة</option>
                        <option value="خطأ عميلة أونلاين - تسوية">خطأ بالقياس من الأم ➔ تعديل وتسوية بلطف</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">حالة المتابعة والتذكرة</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
                        <option>قيد الانتظار</option>
                        <option>تم التقييم</option>
                        <option>تم الاستلام - لم يتم الرد</option>
                        <option>جارٍ التعديل بالورشة</option>
                        <option>تم الإغلاق والتسوية</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 4. Loyalty Loop & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <h3 className="text-sm font-bold text-purple-800 mb-2">دورة الولاء (Loyalty Loop) ✨</h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.loyalty_ambassador} onChange={e => setFormData({...formData, loyalty_ambassador: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                      <span className="text-sm text-purple-900 font-medium">تحويل العميلة لـ "سفيرة براند" وإرسال كوبون خصم للطلب القادم مقابل صورة الطفلة.</span>
                    </label>
                    <button type="button" onClick={openWaForNew} className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white w-full py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
                        إرسال رسالة واتساب للتقييم الآن
                    </button>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">الملاحظات أو المقاسات المصححة</label>
                    <textarea rows="4" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="سجّل هنا أي تعديلات نهائية للمقاسات ليتم اعتمادها في الطلبات القادمة..." className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none resize-none"></textarea>
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">إلغاء</button>
              <button type="submit" form="feedbackForm" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-8 py-2 rounded-xl font-bold transition-colors">
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ بيانات الجودة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
