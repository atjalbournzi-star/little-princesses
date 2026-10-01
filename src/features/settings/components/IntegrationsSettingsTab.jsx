const { useState } = React;

function IntegrationsSettingsTab({
  messageTemplates,
  setMessageTemplates,
  showToast
}) {
  const [templates, setTemplates] = useState(messageTemplates || {
    newOrder: 'مرحباً {customer_name}، تم تسجيل طلبكم رقم {order_no} بنجاح لدى دار الأميرات الصغيرات. يسعدنا خدمتكم!',
    readyForDelivery: 'عميلتنا العزيزة {customer_name}، نود إبلاغكم بأن فستانكم للطلب رقم {order_no} أصبح جاهزاً للاستلام 🎀',
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
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E5EA]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-lg font-bold">
            💬
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#25232A]">تكاملات رسائل WhatsApp وإشعارات العملاء</h3>
            <p className="text-xs text-[#6F6B75]">تخصيص قوالب الرسائل التلقائية لحالات الطلبات، والتسليم، والسندات</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="h-10 px-6 bg-[#B0005A] hover:bg-[#8E0049] text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <span>💾</span>
          <span>حفظ القوالب والتكاملات</span>
        </button>
      </div>

      {/* شريط المتغيرات المتاحة */}
      <div className="bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl p-3.5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-[#6F6B75]">المتغيرات الديناميكية المدعومة:</span>
        {tags.map(t => (
          <span key={t} className="px-2.5 py-1 bg-white border border-[#E8E5EA] text-[#8F2A87] font-mono text-[11px] font-bold rounded-lg shadow-2xs">
            {t}
          </span>
        ))}
      </div>

      {/* شبكة القوالب */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. قالب طلب جديد */}
        <div className="bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl p-4 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="font-bold text-xs text-[#25232A]">1. إشعار تسجيل طلب جديد (New Order)</span>
            <button type="button" onClick={() => handleTestWhatsApp(templates.newOrder)} className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700">تجربة 📲</button>
          </div>
          <textarea
            rows={3}
            value={templates.newOrder}
            onChange={e => setTemplates({...templates, newOrder: e.target.value})}
            className="w-full p-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs outline-none focus:border-[#B0005A]"
          />
        </div>

        {/* 2. قالب الجاهزية للتسليم */}
        <div className="bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl p-4 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="font-bold text-xs text-[#25232A]">2. إشعار جاهزية الفستان (Ready for Delivery)</span>
            <button type="button" onClick={() => handleTestWhatsApp(templates.readyForDelivery)} className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700">تجربة 📲</button>
          </div>
          <textarea
            rows={3}
            value={templates.readyForDelivery}
            onChange={e => setTemplates({...templates, readyForDelivery: e.target.value})}
            className="w-full p-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs outline-none focus:border-[#B0005A]"
          />
        </div>

        {/* 3. قالب استلام دفعة مالية */}
        <div className="bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl p-4 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="font-bold text-xs text-[#25232A]">3. إشعار سند قبض / دفعة (Payment Received)</span>
            <button type="button" onClick={() => handleTestWhatsApp(templates.paymentReceived)} className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700">تجربة 📲</button>
          </div>
          <textarea
            rows={3}
            value={templates.paymentReceived}
            onChange={e => setTemplates({...templates, paymentReceived: e.target.value})}
            className="w-full p-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs outline-none focus:border-[#B0005A]"
          />
        </div>

        {/* 4. قالب مرحلة التفصيل */}
        <div className="bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl p-4 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="font-bold text-xs text-[#25232A]">4. تحديث مرحلة التفصيل والورشة (Workshop Stage)</span>
            <button type="button" onClick={() => handleTestWhatsApp(templates.tailoringUpdate)} className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700">تجربة 📲</button>
          </div>
          <textarea
            rows={3}
            value={templates.tailoringUpdate}
            onChange={e => setTemplates({...templates, tailoringUpdate: e.target.value})}
            className="w-full p-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs outline-none focus:border-[#B0005A]"
          />
        </div>
      </div>

      {/* هاتف التجربة والأمان */}
      <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#25232A]">رقم هاتف تجربة الإرسال:</span>
          <input
            type="text"
            value={testPhone}
            onChange={e => setTestPhone(e.target.value)}
            className="h-9 px-3 rounded-lg border border-[#E8E5EA] bg-white font-mono text-xs outline-none"
            placeholder="776773458"
          />
        </div>
        <div className="text-[11px] text-[#6F6B75] flex items-center gap-1.5">
          <span>🔒</span>
          <span>يتم الإرسال عبر واجهة WhatsApp Web الرسمية بأمان كامل ودون تخزين أي مفاتيح خارجية.</span>
        </div>
      </div>
    </div>
  );
}

window.IntegrationsSettingsTab = IntegrationsSettingsTab;
