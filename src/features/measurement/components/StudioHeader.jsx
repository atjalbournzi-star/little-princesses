// src/features/measurement/components/StudioHeader.jsx
// StudioHeader v4.0 - Toolbar, Resolution & Image Quality Metrology Gauge
// Architecture Standard: Rule 1 & 2 (< 220 lines)

function StudioHeader({
  unit, onSetUnit, onAutoDetect, onExportImage, onCopyWhatsApp, onOpenJsonModal,
  syncStatus, onSaveDraft, onApprove, isDetecting = false, diagnostics,
  perpendicularLock, onTogglePerpendicularLock, showCenterline, onToggleCenterline,
  blueprintMode, onToggleBlueprintMode, backdropDim, onToggleBackdropDim,
  showUncertainty = true, onToggleUncertainty
}) {
  const res = diagnostics?.resolution || { mmPerPx: null, label: '--', grade: 'unknown' };
  const rmse = diagnostics?.rmse || 0;

  return (
    <header className="shrink-0 space-y-1 select-none p-1.5 bg-[#0B132B] border-b border-slate-800" dir="rtl">
      <div className="h-8 min-h-[32px] px-2.5 bg-[#111C38] border border-slate-700/60 rounded-lg flex items-center justify-between shrink-0">
        {/* Right: Screen Title & Metrology Badges */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-[11.5px] font-bold text-white flex items-center gap-1.5 shrink-0">
            <svg className="w-3.5 h-3.5 text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="tracking-wide">استوديو القياس الهندسي (v4.0 Real Measurement)</span>
          </div>

          {/* Sub-mm Resolution Meter Badge */}
          {res.mmPerPx ? (
            <span
              className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono bg-teal-950/60 text-teal-300 border border-teal-600/50"
              title={`دقة الاستشعار: ${res.label} | خطأ الإسقاط: ${rmse} px`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              <span dir="ltr">{res.mmPerPx} مم/px</span>
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono bg-teal-500/15 text-teal-300 border border-teal-500/30">
              Metrology Engine v4.0
            </span>
          )}

          {syncStatus === 'saving' && <span className="text-[10px] text-amber-400 animate-pulse font-medium">جار الحفظ...</span>}
          {syncStatus === 'saved' && <span className="hidden md:inline-flex text-[10px] text-emerald-400 font-medium">تم الحفظ</span>}
        </div>

        {/* Left: Compact Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Uncertainty Display Toggle */}
          <button
            type="button"
            onClick={() => onToggleUncertainty && onToggleUncertainty(!showUncertainty)}
            className={`h-6 px-1.5 text-[9.5px] font-mono font-medium rounded-md border flex items-center gap-0.5 cursor-pointer transition ${
              showUncertainty ? 'bg-amber-500/25 text-amber-300 border-amber-500/50' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="تبديل إظهار هامش عدم اليقين (Value ± Uncertainty)"
          >
            <span>عدم اليقين (±)</span>
          </button>

          {/* 90° CAD Blueprint View Toggle */}
          <button
            type="button"
            onClick={() => onToggleBlueprintMode && onToggleBlueprintMode(!blueprintMode)}
            className={`h-6 px-1.5 text-[9.5px] font-mono font-medium rounded-md border flex items-center gap-1 cursor-pointer transition ${
              blueprintMode ? 'bg-sky-600/40 text-sky-200 border-sky-400/80 shadow-xs' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="تبديل شبكة الـ CAD المليمترية (90° Orthographic View)"
          >
            <span>شبكة CAD</span>
          </button>

          {/* Garment 90° Perpendicular Snap Lock */}
          <button
            type="button"
            onClick={() => onTogglePerpendicularLock && onTogglePerpendicularLock(!perpendicularLock)}
            className={`h-6 px-1.5 text-[9.5px] font-mono font-medium rounded-md border flex items-center gap-1 cursor-pointer transition ${
              perpendicularLock ? 'bg-teal-600/30 text-teal-300 border-teal-500/60' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="قفل تعامد خطوط العرض 90° على خط المنتصف"
          >
            <span>تعامد 90°</span>
          </button>

          {/* Sub-Pixel A4 Auto Detect */}
          <button
            type="button"
            onClick={onAutoDetect}
            disabled={isDetecting}
            className="h-6 px-2 text-[10px] font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-md flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
            title="كشف تلقائي لزوايا ورقة A4 بدقة كسر البكسل"
          >
            <span>{isDetecting ? 'كشف...' : 'كشف A4'}</span>
          </button>

          {/* Unit Toggle: cm / mm / inch */}
          <div className="h-6 flex items-center bg-[#0B132B] p-0.5 rounded-md border border-slate-700/60">
            {['cm', 'mm', 'inch'].map(u => (
              <button
                key={u} type="button" onClick={() => onSetUnit(u)}
                className={`h-5 px-1.5 rounded text-[9.5px] font-mono font-bold transition cursor-pointer ${
                  unit === u ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {u === 'cm' ? 'سم' : (u === 'mm' ? 'مم' : 'إنش')}
              </button>
            ))}
          </div>

          {/* Save Draft */}
          <button type="button" onClick={onSaveDraft} className="h-6 px-2 text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-md flex items-center gap-1 transition cursor-pointer">
            <span className="hidden sm:inline">مسودة</span>
          </button>

          {/* Export Image */}
          <button type="button" onClick={onExportImage} className="h-6 px-2 text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-md flex items-center gap-1 transition cursor-pointer">
            <span className="hidden md:inline">صورة</span>
          </button>

          {/* Copy WhatsApp */}
          <button type="button" onClick={onCopyWhatsApp} className="h-6 px-2 text-[10px] font-medium bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 rounded-md flex items-center gap-1 transition cursor-pointer">
            <span className="hidden md:inline">واتساب</span>
          </button>

          {/* Approve Button */}
          <button type="button" onClick={onApprove || onOpenJsonModal} className="h-6 px-2.5 text-[10px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer">
            <span>اعتماد للمعمل</span>
          </button>
        </div>
      </div>
    </header>
  );
}

window.StudioHeader = StudioHeader;
