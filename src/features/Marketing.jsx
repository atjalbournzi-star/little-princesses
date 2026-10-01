const { useState } = React;
// ============================================================
// Marketing.jsx — Entry Point (Modular Architecture v2.0)
// يستدعي فقط الـ Hooks والمكونات الفرعية دون أي منطق مضمّن
// ============================================================

function Marketing({ campaigns = [], setCampaigns, products = [], accounts = [], showToast, currency }) {
  // ── حالة التبويب النشط ──
  const [activeTab, setActiveTab] = useState('ads');

  // ── حالات المودالات المرتبطة بالمكون الرئيسي ──
  const [selectedCampaignDetail, setSelectedCampaignDetail] = useState(null);
  const [selectedContentDetail, setSelectedContentDetail] = useState(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // ── المدى الزمني للمؤشرات التنفيذية ──
  const [timeframe, setTimeframe] = useState('30d');

  const currLabel = typeof currency === 'object'
    ? (currency.display || currency.symbol || 'YER ﷼')
    : (currency || 'YER ﷼');

  // ── استدعاء الـ Hooks من window (المعمارية المعيارية) ──
  const useData = window.useMarketingData || (() => ({}));
  const useActions = window.useMarketingActions || (() => ({}));

  const {
    loading, setLoading, search, setSearch,
    localCampaigns, platformsData, matrixData, contentData,
    webhookLogs, dailyBriefData, nlpCommentsData, intentConvsData,
    productsAIData, campaignAttrData, aiRecsData,
    executiveKPIs, funnelData, smartAlerts, customerSegments, userPermissions,
    filteredCampaigns, fetchAllMarketingData
  } = useData({ campaigns, setCampaigns, showToast, timeframe });

  const {
    campaignName, setCampaignName, platform, setPlatform,
    modelName, setModelName, paymentAccount, setPaymentAccount,
    objective, setObjective, budget, setBudget,
    status, setStatus, startDate, setStartDate,
    weightsMap, setWeightsMap,
    chatInput, setChatInput, chatMessages, chatLoading,
    handleSubmitCampaign, handleTogglePlatform, handleOAuthConnect,
    handleTriggerSync, handleApproveRec, handleSaveWeights, handleSendAIChat
  } = useActions({ products, accounts, showToast, fetchAllMarketingData, setLoading });

  // ── استدعاء المكونات من window ──
  const CommandCenter = window.MarketingCommandCenter;
  const CustomerIntel = window.MarketingCustomerIntel;
  const CampaignForm = window.MarketingCampaignForm;
  const PlatformsComp = window.MarketingPlatforms;
  const DailyBrief = window.MarketingDailyBrief;
  const ProductsAI = window.MarketingProductsAI;
  const NLPIntent = window.MarketingNLPIntent;
  const RecsWeights = window.MarketingRecsWeights;
  const AIChat = window.MarketingAIChat;
  const Modals = window.MarketingModals;

  const TABS = [
    { id: 'command_center', label: '📊 مركز القيادة KPIs' },
    { id: 'customer_intel', label: '👥 ذكاء العملاء Intelligence' },
    { id: 'ads', label: '📢 إدارة الحملات الإعلانية' },
    { id: 'daily_brief', label: '🧠 الموجز اليومي والتوجهات' },
    { id: 'products_ai', label: '📈 تحليلات المنتجات والإسناد' },
    { id: 'nlp_intent', label: '💬 المشاعر ونية الشراء (NLP)' },
    { id: 'recs_weights', label: '💡 التوصيات والأوزان AI' },
    { id: 'ai_chat', label: '🤖 اسأل مدير التسويق AI' },
    { id: 'platforms', label: '🌐 إدارة المنصات وOAuth' },
    { id: 'webhooks', label: '🔌 سجل Webhooks' }
  ];

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* ── رأس الصفحة: مركز القيادة التسويقية ── */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-5 text-white shadow-xl flex flex-wrap items-center justify-between gap-4 border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📢</span>
            <h1 className="font-black text-lg text-amber-300">مركز القيادة التسويقية الذكي (Marketing Command Center)</h1>
          </div>
          <p className="text-[11px] text-slate-300 font-semibold">نظام إدارة التسويق والتحليلات التنفيذية الموحد — ERP Marketing Suite</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { name: 'Instagram', status: 'connected', label: 'Instagram 🟢' },
            { name: 'Facebook', status: 'connected', label: 'Facebook 🟢' },
            { name: 'WhatsApp', status: 'connected', label: 'WhatsApp 🟢' },
            { name: 'TikTok', status: 'disconnected', label: 'TikTok ⚪' },
            { name: 'Google Ads', status: 'disconnected', label: 'Google Ads ⚪' }
          ].map(p => (
            <span key={p.name} className={`px-3 py-1.5 rounded-xl font-black border text-[11px] backdrop-blur-sm ${p.status === 'connected' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : 'bg-slate-800/60 text-slate-400 border-slate-700'}`}>
              {p.label}
            </span>
          ))}
          <button onClick={() => setShowExportModal(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs hover:opacity-90 transition shadow-md flex items-center gap-1.5">
            📥 تصدير التقارير (Sheets / PDF / Excel)
          </button>
        </div>
      </div>

      {/* ── فلتر المدى الزمني ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
        <div className="flex items-center gap-1">
          <span className="text-xs font-black text-slate-500 px-3">المدى الزمني:</span>
          {[{ id: 'today', label: 'اليوم (Today)' }, { id: '7d', label: 'آخر 7 أيام (7 Days)' }, { id: '30d', label: 'آخر 30 يوم (30 Days)' }, { id: '90d', label: 'آخر 90 يوم (90 Days)' }].map(tf => (
            <button key={tf.id} onClick={() => setTimeframe(tf.id)} className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${timeframe === tf.id ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}>{tf.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <span>آخر مزامنة: <strong className="text-emerald-600">الآن 🟢</strong></span>
          <span className="text-slate-300">•</span>
          <span>الصلاحية: <strong className="text-indigo-600">{userPermissions?.role || 'Admin'} 🛡️</strong></span>
        </div>
      </div>

      {/* ── شريط التبويبات ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex gap-1 overflow-x-auto shadow-sm">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
            {t.label}
          </button>
        ))}
        <button onClick={handleTriggerSync} disabled={loading}
          className="py-2.5 px-4 rounded-xl font-black text-xs bg-slate-800 text-white hover:bg-slate-700 transition flex items-center gap-1.5">
          ☁️ مزامنة
        </button>
      </div>

      {/* ── محتوى التبويبات ── */}
      {(activeTab === 'command_center' || !activeTab) && CommandCenter && (
        <CommandCenter executiveKPIs={executiveKPIs} funnelData={funnelData} smartAlerts={smartAlerts}
          productsAIData={productsAIData} dailyBriefData={dailyBriefData} currLabel={currLabel}
          setSelectedProductDetail={setSelectedProductDetail} />
      )}
      {activeTab === 'customer_intel' && CustomerIntel && (
        <CustomerIntel customerSegments={customerSegments} setSelectedCustomerDetail={setSelectedCustomerDetail} />
      )}
      {activeTab === 'ads' && CampaignForm && (
        <CampaignForm products={products} accounts={accounts} loading={loading}
          campaignName={campaignName} setCampaignName={setCampaignName}
          platform={platform} setPlatform={setPlatform}
          modelName={modelName} setModelName={setModelName}
          paymentAccount={paymentAccount} setPaymentAccount={setPaymentAccount}
          objective={objective} setObjective={setObjective}
          budget={budget} setBudget={setBudget}
          status={status} setStatus={setStatus}
          startDate={startDate} setStartDate={setStartDate}
          handleSubmitCampaign={handleSubmitCampaign}
          filteredCampaigns={filteredCampaigns || []} search={search} setSearch={setSearch} />
      )}
      {activeTab === 'daily_brief' && DailyBrief && <DailyBrief dailyBriefData={dailyBriefData} />}
      {activeTab === 'products_ai' && ProductsAI && (
        <ProductsAI productsAIData={productsAIData} campaignAttrData={campaignAttrData} currLabel={currLabel} />
      )}
      {activeTab === 'nlp_intent' && NLPIntent && (
        <NLPIntent nlpCommentsData={nlpCommentsData} intentConvsData={intentConvsData} />
      )}
      {activeTab === 'recs_weights' && RecsWeights && (
        <RecsWeights aiRecsData={aiRecsData} handleApproveRec={handleApproveRec}
          weightsMap={weightsMap} setWeightsMap={setWeightsMap} handleSaveWeights={handleSaveWeights} />
      )}
      {activeTab === 'ai_chat' && AIChat && (
        <AIChat chatMessages={chatMessages} chatLoading={chatLoading}
          chatInput={chatInput} setChatInput={setChatInput} handleSendAIChat={handleSendAIChat} />
      )}
      {['platforms', 'matrix', 'content', 'webhooks'].includes(activeTab) && PlatformsComp && (
        <PlatformsComp activeTab={activeTab} platformsData={platformsData} matrixData={matrixData}
          contentData={contentData} webhookLogs={webhookLogs}
          handleTogglePlatform={handleTogglePlatform} handleOAuthConnect={handleOAuthConnect}
          currLabel={currLabel} />
      )}

      {/* ── المودالات ── */}
      {Modals && (
        <Modals showExportModal={showExportModal} setShowExportModal={setShowExportModal}
          selectedCustomerDetail={selectedCustomerDetail} setSelectedCustomerDetail={setSelectedCustomerDetail}
          selectedProductDetail={selectedProductDetail} setSelectedProductDetail={setSelectedProductDetail}
          showToast={showToast} currLabel={currLabel} />
      )}
    </div>
  );
}
