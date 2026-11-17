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
    <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col h-[520px] animate-fadeIn select-none">
      {/* Header */}
      <div className="h-7.5 px-3 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          <h3 className="font-bold text-[11px] text-slate-800 dark:text-white">مدير التسويق الذكي (AI Marketing Director)</h3>
        </div>
        <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-2 py-0.2 rounded-md font-bold border border-indigo-200 dark:border-indigo-800 font-mono">
          سجلات حقيقية
        </span>
      </div>

      {/* Quick Questions */}
      <div className="bg-slate-50 dark:bg-[#0F172A] px-2.5 py-1.5 border-b border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto custom-scrollbar">
        {quickQuestions.map(q => (
          <button
            key={q}
            onClick={() => handleSendAIChat(q)}
            className="h-6 px-2 bg-white dark:bg-[#111C38] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10.5px] font-bold whitespace-nowrap transition cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-slate-50/50 dark:bg-[#0F172A]/50">
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] rounded-lg p-2.5 text-[11px] font-medium leading-relaxed shadow-xs ${
              msg.sender === 'user'
                ? 'bg-pink-600 text-white'
                : 'bg-white dark:bg-[#111C38] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 space-y-1'
            }`}>
              <p className="whitespace-pre-line">{msg.text}</p>
              {msg.source && (
                <span className="block text-[9.5px] text-indigo-600 dark:text-indigo-400 font-mono font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
                  المصدر: {msg.source}
                </span>
              )}
            </div>
          </div>
        ))}
        {chatLoading && (
          <div className="flex justify-end">
            <div className="bg-white dark:bg-[#111C38] p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 animate-pulse">
              جاري استعلام قاعدة البيانات وتوليد الإجابة...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-2 bg-white dark:bg-[#111C38] border-t border-slate-200 dark:border-slate-800 flex gap-1.5">
        <input
          type="text"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendAIChat()}
          placeholder="اسأل مدير التسويق AI..."
          className="flex-1 h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white text-[11px] font-medium outline-none focus:border-pink-500 transition"
        />
        <button
          onClick={() => handleSendAIChat()}
          disabled={chatLoading}
          className="h-7 px-3 rounded-md bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs transition shadow-xs disabled:opacity-50 cursor-pointer"
        >
          إرسال
        </button>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.MarketingAIChat = MarketingAIChat;
}
