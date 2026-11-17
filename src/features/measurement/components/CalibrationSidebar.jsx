// src/features/measurement/components/CalibrationSidebar.jsx
// Smart Metrology Calibration Sidebar: Mode A/B/C, Quality Meter & Ground Truth v4.0
// Architecture Standard: Rule 1 & 2 (< 220 lines)

function CalibrationSidebar({
  orderId, onSetOrderId, customerName, onSetCustomerName,
  diagnostics, viewMode, onSetViewMode, onSetPresetA4,
  onUploadFile, onPasteClipboard, onLoadOrder, syncStatus,
  lensCorrection, onToggleLensCorrection, a4Placement, onSetA4Placement,
  fabricElevationMm, onSetFabricElevationMm, a4Corners,
  showFloorGuide, onToggleFloorGuide, showCenterline, onToggleCenterline,
  fabricType, onSetFabricType, clickToPlaceStep, onSetClickToPlaceStep,
  onAutoDetectGarment, fineAngle, onAdjustFineAngle, onAutoDeskew,
  onApplyReferenceLength,
  operationMode, onSetOperationMode,
  cameraProfileKey, onSelectCameraProfile,
  garmentProfileKey, onSelectGarmentProfile
}) {
  const cornerLabels = ['أعلى-يسار (TL)', 'أعلى-يمين (TR)', 'أسفل-يمين (BR)', 'أسفل-يسار (BL)'];
  const conf = diagnostics?.confidence || { score: 0, label: 'بانتظار المعايرة' };
  const res = diagnostics?.resolution || { mmPerPx: null, label: '--' };
  const groundTruth = diagnostics?.groundTruth || {};
  const cam = window.CameraCalibrationEngine?.getActiveProfile() || {};

  return (
    <aside className="w-[285px] shrink-0 h-full bg-[#0B132B] border border-slate-700/60 rounded-xl flex flex-col overflow-y-auto text-right text-slate-100 select-none shadow-md" dir="rtl">
      {/* 1. Order & Customer Info Card */}
      <div className="p-2 border-b border-slate-700/60 bg-[#111C38]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-white flex items-center gap-1">
            <svg className="w-3 h-3 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>بيانات طلب التفصيل</span>
          </span>
          <button
            type="button" onClick={() => onLoadOrder && onLoadOrder(orderId)} disabled={syncStatus === 'loading' || !orderId}
            className="text-[9.5px] text-teal-400 hover:text-teal-300 font-medium cursor-pointer disabled:opacity-40"
          >
            {syncStatus === 'loading' ? 'استرجاع...' : 'استرجاع'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <input value={orderId} onChange={e => onSetOrderId(e.target.value)} placeholder="رقم الطلب" className="w-full h-7 bg-[#090D16] border border-slate-700 rounded px-2 text-[10.5px] text-white font-mono outline-none focus:border-teal-500" />
          <input value={customerName} onChange={e => onSetCustomerName(e.target.value)} placeholder="اسم الزبونة" className="w-full h-7 bg-[#090D16] border border-slate-700 rounded px-2 text-[10.5px] text-white outline-none focus:border-teal-500" />
        </div>
      </div>

      {/* 2. Image Upload & AI Silhouette */}
      <div className="p-2 border-b border-slate-700/60 space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <label className="h-7 flex items-center justify-center gap-1 rounded bg-slate-800 hover:bg-slate-700 text-[10.5px] font-medium text-white border border-slate-700 cursor-pointer transition">
            <span>رفع ملف</span>
            <input type="file" accept="image/*" onChange={onUploadFile} className="hidden" />
          </label>
          <button type="button" onClick={onPasteClipboard} className="h-7 flex items-center justify-center gap-1 rounded bg-slate-800 hover:bg-slate-700 text-[10.5px] font-medium text-white border border-slate-700 cursor-pointer transition">
            <span>لصق حافظة</span>
          </button>
        </div>

        {/* Fine Rotation & Deskew Controls */}
        <div className="flex items-center justify-between bg-[#090D16] px-2 py-1 rounded border border-slate-700 text-[9.5px]">
          <span className="text-slate-300 font-bold">استعدال الميلان:</span>
          <div className="flex items-center gap-1 font-mono">
            <button type="button" onClick={() => onAdjustFineAngle && onAdjustFineAngle(-1)} className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600">-1°</button>
            <span className="text-teal-400 font-bold px-1">{fineAngle > 0 ? `+${fineAngle}°` : `${fineAngle || 0}°`}</span>
            <button type="button" onClick={() => onAdjustFineAngle && onAdjustFineAngle(1)} className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600">+1°</button>
            <button type="button" onClick={onAutoDeskew} className="px-1.5 py-0.5 rounded bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 border border-teal-500/50 font-bold cursor-pointer">استعدال 📐</button>
          </div>
        </div>

        <button
          type="button" onClick={onAutoDetectGarment}
          className="w-full h-6.5 flex items-center justify-center gap-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/50 text-[10px] font-bold cursor-pointer transition"
        >
          <span>👗 كشف مجسم الفستان ومقاساته تلقائياً</span>
        </button>
      </div>

      {/* 3. Metrology Modes (Mode A / B / C) */}
      <div className="p-2 border-b border-slate-700/60 bg-[#111C38] space-y-1.5">
        <div className="flex items-center justify-between text-[10.5px] font-bold text-white">
          <span>وضع القياس المترولوجي</span>
          <span className="font-mono text-[9.5px] text-teal-400">{operationMode === 'mode_a_flat_2d' ? 'Mode A (2D)' : 'Mode B (2.5D)'}</span>
        </div>
        <div className="grid grid-cols-3 gap-1 text-[9.5px]">
          {[
            ['mode_a_flat_2d', 'Mode A مسطح', 'فستان مسطح تماماً على المستوى المرجعي (قطعي)'],
            ['mode_b_assisted_25d', 'Mode B مدعوم', 'تعويض هندسي لمنظور النفش والارتفاع (مقدر)'],
            ['mode_c_3d_surface', 'Mode C مجسم', 'واجهة المسح ثلاثي الأبعاد والكاميرات المتعددة']
          ].map(([m, lbl, tit]) => (
            <button
              key={m} type="button" onClick={() => onSetOperationMode && onSetOperationMode(m)} title={tit}
              className={`py-1 rounded font-bold border text-center transition cursor-pointer ${
                operationMode === m ? 'bg-teal-600 text-white border-teal-400' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* Camera Profile Selector & Brown-Conrady Check */}
        <div className="bg-[#090D16] p-1.5 rounded border border-slate-700 space-y-1">
          <div className="flex items-center justify-between text-[9.5px]">
            <span className="text-slate-300">بروفايل الكاميرا:</span>
            <span className="text-teal-400 font-bold">{cam.isCalibrated ? 'معاير' : 'افتراضي'}</span>
          </div>
          <select
            value={cameraProfileKey} onChange={e => onSelectCameraProfile && onSelectCameraProfile(e.target.value)}
            className="w-full bg-[#111C38] text-[9.5px] text-white border border-slate-700 rounded px-1.5 py-1 outline-none"
          >
            <option value="generic_rectilinear">عدسة مستقيمة قياسية (بدون تشوه)</option>
            <option value="iphone_wide">آبل آيفون (رئيسية 24-26 مم)</option>
            <option value="samsung_galaxy">سامسونج جالاكسي S22/S23/S24</option>
            <option value="ipad_tablet">لوحي iPad Pro / Air</option>
          </select>
        </div>

        {/* Fabric Type & Elevation Control in Mode B */}
        {operationMode === 'mode_b_assisted_25d' && (
          <div className="bg-[#090D16] p-1.5 rounded border border-amber-500/30 space-y-1 text-[9.5px]">
            <div className="flex items-center justify-between text-amber-300">
              <span>ارتفاع القماش (ΔZ):</span>
              <div className="flex items-center gap-1 font-mono">
                {[15, 25, 40].map(v => (
                  <button
                    key={v} type="button" onClick={() => onSetFabricElevationMm && onSetFabricElevationMm(v)}
                    className={`px-1 py-0.2 rounded ${fabricElevationMm === v ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}
                  >
                    {v} مم
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Independent Scale Verification & Diagnostics */}
      <div className="p-2 border-b border-slate-700/60 space-y-1">
        <div className="flex items-center justify-between text-[10.5px] font-bold text-white">
          <span>التحقق المتري المستقل</span>
          <span className="font-mono text-teal-400 text-[9.5px]">{res.mmPerPx ? `${res.mmPerPx} مم/px` : '--'}</span>
        </div>

        {groundTruth.isValid !== undefined && (
          <div className={`p-1.5 rounded border text-[9.5px] flex items-center justify-between ${
            groundTruth.isValid ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300' : 'bg-amber-950/40 border-amber-700/60 text-amber-300'
          }`}>
            <span className="font-bold">خطأ مقياس الورقة:</span>
            <span className="font-mono font-bold" dir="ltr">±{groundTruth.maxErrorMm || 0} مم ({groundTruth.percentError || 0}%)</span>
          </div>
        )}

        {/* Confidence & Reprojection Error */}
        <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
          <div className="bg-[#111C38] p-1 rounded border border-slate-800 flex justify-between"><span className="text-slate-400">ثقة الورقة:</span><span className="text-teal-400 font-bold" dir="ltr">{conf.score}%</span></div>
          <div className="bg-[#111C38] p-1 rounded border border-slate-800 flex justify-between"><span className="text-slate-400">خطأ الإسقاط:</span><span className="text-sky-400 font-bold">{diagnostics?.rmse || 0} px</span></div>
        </div>
      </div>

      {/* 5. A4 4 Corners & Manual 4-Click Calibration */}
      <div className="p-2 flex-1 space-y-1.5">
        <div className="flex items-center justify-between text-[10.5px] font-bold text-white">
          <span>زوايا ورقة A4 (Sub-Pixel)</span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[9px]">
          {(a4Corners || []).map((pt, idx) => (
            <div key={idx} className="bg-[#111C38] px-1.5 py-0.5 rounded border border-slate-700/60">
              <span className="text-slate-400 truncate">#{idx + 1} {cornerLabels[idx]}</span>
              <span className="font-mono text-teal-400 font-bold block">X:{Number(pt.x).toFixed(1)} Y:{Number(pt.y).toFixed(1)}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onSetClickToPlaceStep && onSetClickToPlaceStep(clickToPlaceStep >= 0 ? -1 : 0)}
          className={`w-full h-6.5 rounded text-[10px] font-bold border cursor-pointer transition ${
            clickToPlaceStep >= 0 ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse' : 'bg-teal-600 hover:bg-teal-500 text-white border-teal-400 shadow'
          }`}
        >
          {clickToPlaceStep >= 0 ? `إلغاء التحديد (انقر زاوية #${clickToPlaceStep + 1}/4)` : '🎯 تحديد زوايا الورقة يدوياً (4 نقرات)'}
        </button>

        {/* Reference Scale Calibration */}
        <div className={`p-1.5 rounded border space-y-1 text-[9.5px] transition ${conf.score === 0 ? 'bg-amber-950/30 border-amber-500/60 shadow' : 'bg-[#090D16] border-teal-500/40'}`}>
          <div className="flex items-center justify-between">
            <span className={`font-bold ${conf.score === 0 ? 'text-amber-300' : 'text-teal-300'}`}>معايرة بالطول الحقيقي:</span>
            {conf.score === 0 && <span className="text-[8.5px] text-amber-400 font-bold">بدون A4</span>}
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number" id="refLengthInput" placeholder="أدخل الطول سم (مثال: 60)"
              className="flex-1 bg-[#111C38] text-white px-1.5 py-0.5 rounded border border-slate-700 text-center font-mono outline-none text-[9.5px]"
            />
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('refLengthInput');
                const v = parseFloat(el?.value);
                if (v > 0 && onApplyReferenceLength) onApplyReferenceLength(v);
              }}
              className="px-2 py-0.5 rounded bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer transition shadow"
            >
              تطبيق 📏
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

window.StudioCalibrationSidebar = CalibrationSidebar;
