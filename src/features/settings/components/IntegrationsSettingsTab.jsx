// src/features/settings/components/IntegrationsSettingsTab.jsx
// تبويب تكاملات WhatsApp وإشعارات العملاء المتوافق مع هوية السندات المالية

const { useState } = React;

function IntegrationsSettingsTab({
  messageTemplates,
  setMessageTemplates,
  showToast
}) {
  const [templates, setTemplates] = useState(messageTemplates || {
    newOrder: 'مرحباً {customer_name}، تم تسجيل طلبكم رقم {order_no} بنجاح. يسعدنا خدمتكم!',
    readyForDelivery: 'عميلنا العزيز {customer_name}، نود إبلاغكم بأن فستانكم للطلب رقم {order_no} أصبح جاهزاً للاستلام 🎀',
    paymentReceived: 'تم استلام دفعة بقيمة {amount} {currency} للطلب رقم {order_no}. شاكرين ثقتكم الغالية 💐',
    tailoringUpdate: 'مرحباً {customer_name}، فستانكم في مرحلة {stage} الآن بأيدي أمهر خياطينا ✨'
  });

  const [testPhone, setTestPhone] = useState('776773458');

  const handleSave = () => {
    setMessageTemplates(templates);
    try {
      localStorage.setItem('erp_message_templates', JSON.stringify(templates));
      showToast && showToast('تم حفظ قوالب رسائل WhatsApp والتكاملات بنجاح 💬✅');
    } catch(e) {
      showToast && showToast('تعذر الحفظ محلياً', 'error');
    }
  };

  const handleTestWhatsApp = (templateText) => {
    const sampleMsg = templateText
      .replace('{customer_name}', 'أميرة القصر')
      .replace('{order_no}', 'ORD-2026-001')
      .replace('{amount}', '25,000')
      .replace('{currency}', 'YER ﷼')
      .replace('{stage}', 'التطريز اليدوي والشك');

    const cleanPhone = testPhone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('967') ? cleanPhone : (cleanPhone.startsWith('0') ? '967' + cleanPhone.slice(1) : '967' + cleanPhone);
    const waUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(sampleMsg)}`;
    window.open(waUrl, '_blank');
    showToast && showToast('تم تجهيز رسالة المعاينة في WhatsApp 📲');
  };

  const tags = ['{customer_name}', '{order_no}', '{amount}', '{currency}', '{stage}'];

  return (
    <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-xs space-y-2 select-none text-right" dir="rtl">
      {/* رأس التبويب الموحد */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="font-bold text-[11.5px] text-slate-800 dark:text-slate-100">
            تكاملات رسائل WhatsApp وإشعارات العملاء
          </h3>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="h-6 px-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-md font-medium text-[10.5px] shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0"
        >
          <span>💾</span>
          <span>حفظ القوالب والتكاملات</span>
        </button>
      </div>

      {/* شريط المتغيرات المتاحة */}
      <div className="bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-lg p-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400">المتغيرات المدعومة:</span>
        {tags.map(t => (
          <span key={t} className="px-1.5 py-0.5 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-700 text-pink-600 dark:text-pink-400 font-mono text-[10px] font-bold rounded">
            {t}
          </span>
        ))}
      </div>

      {/* شبكة القوالب الأربعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* 1. قالب طلب جديد */}
        <div className="bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="font-bold text-xs text-slate-900 dark:text-white">1. إشعار تسجيل طلب جديد</span>
            <button type="button" onClick={() => handleTestWhatsApp(templates.newOrder)} className="text-[10.5px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer">تجربة 📲</button>
          </div>
          <textarea
            rows={2}
            value={templates.newOrder}
            onChange={e => setTemplates({...templates, newOrder: e.target.value})}
            className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C38] text-slate-900 dark:text-white text-[11px] outline-none focus:border-pink-500"
          />
        </div>

        {/* 2. قالب الجاهزية للتسليم */}
        <div className="bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="font-bold text-xs text-slate-900 dark:text-white">2. إشعار جاهزية الفستان</span>
            <button type="button" onClick={() => handleTestWhatsApp(templates.readyForDelivery)} className="text-[10.5px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer">تجربة 📲</button>
          </div>
          <textarea
            rows={2}
            value={templates.readyForDelivery}
            onChange={e => setTemplates({...templates, readyForDelivery: e.target.value})}
            className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C38] text-slate-900 dark:text-white text-[11px] outline-none focus:border-pink-500"
          />
        </div>

        {/* 3. قالب استلام دفعة مالية */}
        <div className="bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="font-bold text-xs text-slate-900 dark:text-white">3. إشعار سند قبض / دفعة</span>
            <button type="button" onClick={() => handleTestWhatsApp(templates.paymentReceived)} className="text-[10.5px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer">تجربة 📲</button>
          </div>
          <textarea
            rows={2}
            value={templates.paymentReceived}
            onChange={e => setTemplates({...templates, paymentReceived: e.target.value})}
            className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C38] text-slate-900 dark:text-white text-[11px] outline-none focus:border-pink-500"
          />
        </div>

        {/* 4. قالب مرحلة التفصيل */}
        <div className="bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="font-bold text-xs text-slate-900 dark:text-white">4. تحديث مرحلة التفصيل</span>
            <button type="button" onClick={() => handleTestWhatsApp(templates.tailoringUpdate)} className="text-[10.5px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer">تجربة 📲</button>
          </div>
          <textarea
            rows={2}
            value={templates.tailoringUpdate}
            onChange={e => setTemplates({...templates, tailoringUpdate: e.target.value})}
            className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C38] text-slate-900 dark:text-white text-[11px] outline-none focus:border-pink-500"
          />
        </div>
      </div>

      {/* هاتف التجربة والأمان المدمج */}
      <div className="p-2 bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-700 dark:text-slate-300 text-[10.5px]">هاتف التجربة:</span>
          <input
            type="text"
            value={testPhone}
            onChange={e => setTestPhone(e.target.value)}
            className="h-6 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C38] font-mono text-[11px] outline-none text-slate-900 dark:text-white"
            placeholder="776773458"
          />
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <span>يتم الإرسال عبر واجهة WhatsApp Web الرسمية بأمان كامل.</span>
        </div>
      </div>
    </div>
  );
}

window.IntegrationsSettingsTab = IntegrationsSettingsTab;
