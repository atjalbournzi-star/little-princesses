// src/features/marketing/components/MarketingAIChat.jsx
// ====================================================================
// Component: MarketingAIChat — تبويب اسأل مدير التسويق AI
// ====================================================================

function MarketingAIChat({
  chatMessages, chatLoading, chatInput, setChatInput, handleSendAIChat
}) {
  const quickQuestions = [
    'ما أفضل موديل؟',
    'لماذا انخفضت المبيعات؟',
    'ما الإعلان الذي يهدر الميزانية؟',
    'ما أكثر لون مطلوب؟',
    'ما أكثر سؤال من العملاء؟',
    'ما الذي أنشره غداً؟'
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[600px] animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-l from-slate-900 to-indigo-950 px-6 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="font-black text-sm text-amber-300">مدير التسويق الذكي (AI Marketing Director)</h3>
            <p className="text-[10px] text-slate-300 font-semibold">إجابات فورية صادقة ومستندة 100% لبيانات السجلات الحقيقية</p>
          </div>
        </div>
        <span className="text-xs bg-indigo-500/30 text-indigo-200 px-3 py-1 rounded-full font-bold border border-indigo-400/30">
          Grounded in DB Facts 🟢
        </span>
      </div>

      {/* Quick Questions */}
      <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex gap-2 overflow-x-auto">
        {quickQuestions.map(q => (
          <button
            key={q}
            onClick={() => handleSendAIChat(q)}
            className="py-1.5 px-3 bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition shadow-xs"
          >
            ❓ {q}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] rounded-3xl p-4 text-xs font-semibold leading-relaxed shadow-sm ${
              msg.sender === 'user'
                ? 'bg-rose-600 text-white rounded-tr-none'
                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none space-y-1'
            }`}>
              <p className="whitespace-pre-line">{msg.text}</p>
              {msg.source && (
                <span className="block text-[9px] text-indigo-600 font-mono font-bold pt-1 border-t border-slate-100">
                  مصدر البيانات: {msg.source}
                </span>
              )}
            </div>
          </div>
        ))}
        {chatLoading && (
          <div className="flex justify-end">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 text-xs font-bold text-slate-500 animate-pulse">
              ⏳ جاري استعلام قاعدة البيانات وتوليد الإجابة الدقيقة...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendAIChat()}
          placeholder="اسأل مدير التسويق AI..."
          className="flex-1 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold outline-none focus:bg-white focus:border-rose-400 transition"
        />
        <button
          onClick={() => handleSendAIChat()}
          disabled={chatLoading}
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-800 text-white font-black text-xs hover:opacity-90 transition shadow-md disabled:opacity-50"
        >
          إرسال 🚀
        </button>
      </div>
    </div>
  );
}

window.MarketingAIChat = MarketingAIChat;
