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
    { id: 'ads', label: 'الحملات الإعلانية' },
    { id: 'command_center', label: 'مركز القيادة KPIs' },
    { id: 'customer_intel', label: 'ذكاء العملاء' },
    { id: 'daily_brief', label: 'الموجز اليومي' },
    { id: 'products_ai', label: 'تحليلات المنتجات' },
    { id: 'nlp_intent', label: 'نية الشراء NLP' },
    { id: 'recs_weights', label: 'التوصيات AI' },
    { id: 'ai_chat', label: 'مساعد AI' },
    { id: 'platforms', label: 'المنصات' },
    { id: 'webhooks', label: 'Webhooks' }
  ];

  return (
    <div className="space-y-1.5 select-none animate-fadeIn">
      {/* ── رأس الصفحة: مركز القيادة التسويقية ── */}
      <div className="h-8 min-h-[32px] px-2.5 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-2 shrink-0 select-none">
        <div className="flex items-center gap-1.5 shrink-0">
          <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <h1 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">التسويق ونمو الأعمال</h1>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">(Marketing Suite)</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { name: 'Instagram', status: 'connected' },
            { name: 'Facebook', status: 'connected' },
            { name: 'WhatsApp', status: 'connected' },
            { name: 'TikTok', status: 'disconnected' },
            { name: 'Google Ads', status: 'disconnected' }
          ].map(p => (
            <span key={p.name} className={`h-5.5 px-1.5 rounded-md text-[10px] font-bold flex items-center gap-1 border shrink-0 ${
              p.status === 'connected'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'connected' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              <span>{p.name}</span>
            </span>
          ))}
          <button onClick={() => setShowExportModal(true)} className="h-5.5 px-2 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700/60 flex items-center gap-1 transition cursor-pointer shrink-0">
            <svg className="w-3 h-3 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            <span>تصدير</span>
          </button>
        </div>
      </div>

      {/* ── فلتر المدى الزمني ── */}
      <div className="h-8 min-h-[32px] px-2 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-1.5 shrink-0 select-none">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-bold text-slate-800 dark:text-white ml-1">المدى الزمني:</span>
          {[{ id: 'today', label: 'اليوم' }, { id: '7d', label: '7 أيام' }, { id: '30d', label: '30 يوم' }, { id: '90d', label: '90 يوم' }].map(tf => (
            <button key={tf.id} onClick={() => setTimeframe(tf.id)}
              className={`h-6 px-2.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                timeframe === tf.id
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[10.5px] font-medium text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1 font-mono">مزامنة: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">الآن</strong></span>
          <span className="text-slate-400">•</span>
          <span className="font-mono">الصلاحية: <strong className="text-slate-900 dark:text-white font-bold">{userPermissions?.role || 'Admin'}</strong></span>
        </div>
      </div>

      {/* ── شريط التبويبات ── */}
      <div className="h-8 min-h-[32px] px-1 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-1 overflow-x-auto custom-scrollbar select-none shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`h-6 px-2.5 rounded-md text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === t.id
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            {t.label}
          </button>
        ))}
        <button onClick={handleTriggerSync} disabled={loading}
          className="h-6 px-2.5 rounded-md font-bold text-[10.5px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 transition flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50 ml-auto"
        >
          <svg className="w-3 h-3 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          <span>مزامنة</span>
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

window.Marketing = Marketing;
window.MarketingLayout = Marketing;
