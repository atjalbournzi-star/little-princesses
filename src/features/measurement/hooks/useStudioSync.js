// src/features/measurement/hooks/useStudioSync.js
// Supabase/PostgreSQL persistence, auto-save, draft loading & atelier approval hook v4.0
// Architecture Standard: Rule 1, 2 & 4 (< 180 lines, zero regressions)

const { useState, useEffect, useRef, useCallback } = React;

function useStudioSync({ state, imgState, showToast }) {
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const autoSaveTimerRef = useRef(null);

  const api = window.measurementApi || window.API?.measurement;
  const RealEngine = window.RealWorldMeasurementEngine;

  // Build current session payload with v4.0 Metrology schema
  const buildPayload = useCallback((status = 'draft') => {
    const enrichedMeasurements = (state.measurements || []).map(m => {
      if (RealEngine && RealEngine.buildRealMeasurementRecord && state.H_imgToWorld) {
        return RealEngine.buildRealMeasurementRecord(m, state);
      }
      return m;
    });

    return {
      id: sessionId,
      order_id: state.orderId,
      customer_name: state.customerName,
      preferred_unit: state.unit,
      a4_orientation: state.a4Orientation,
      a4_corners: state.a4Corners,
      measurements_data: enrichedMeasurements,
      homography_matrix: state.H_imgToWorld,
      diagnostics: state.diagnostics,
      operation_mode: state.operationMode || 'mode_a_flat_2d',
      camera_profile: state.cameraProfileKey || 'generic_rectilinear',
      garment_profile: state.garmentProfileKey || 'ballgown',
      algorithm_version: '4.0.0',
      status: status,
      image_url: (function() {
        const p = imgState?.processedCanvas;
        if (!p?.width) return null;
        const Drawing = window.MeasurementCanvasDrawing;
        const out = Drawing?.createAnnotatedExportCanvas ?
          Drawing.createAnnotatedExportCanvas(p, state.a4Corners, state.a4Orientation, state.measurements, state.unit, state.H_imgToWorld, state.orderId, state.customerName) : p;
        return (out || p).toDataURL('image/jpeg', 0.85);
      })()
    };
  }, [sessionId, state, imgState?.processedCanvas, RealEngine]);

  // Save Session (Draft)
  const saveSession = useCallback(async (isManual = false) => {
    if (!api?.saveStudioSession) return;
    setSyncStatus('saving');
    try {
      const payload = buildPayload('draft');
      const res = await api.saveStudioSession(payload);
      if (res && res.success) {
        if (res.data?.id) setSessionId(res.data.id);
        setSyncStatus('saved');
        setLastSavedAt(new Date());
        if (isManual) {
          showToast && showToast('تم حفظ جلسة المقاسات الهندسية كمسودة في قاعدة البيانات 💾', 'success');
        }
        return res.data;
      } else {
        throw new Error(res?.error || 'تعذر الحفظ');
      }
    } catch (err) {
      setSyncStatus('error');
      if (isManual) {
        showToast && showToast(`فشل الحفظ: ${err.message}`, 'error');
      }
    }
  }, [api, buildPayload, showToast]);

  // Approve Measurements for Atelier/Factory
  const approveSession = useCallback(async () => {
    if (!api?.approveStudioSession) return;
    setSyncStatus('saving');
    try {
      await saveSession(false);
      const res = await api.approveStudioSession({
        id: sessionId,
        order_id: state.orderId,
        status: 'approved',
        algorithm_version: '4.0.0'
      });
      if (res && res.success) {
        setSyncStatus('saved');
        setLastSavedAt(new Date());
        showToast && showToast('تم اعتماد المقاسات هندسياً وتمريرها لقسم التصنيع بنجاح! 🚀', 'success');
        return res.data;
      } else {
        throw new Error(res?.error || 'تعذر الاعتماد');
      }
    } catch (err) {
      setSyncStatus('error');
      showToast && showToast(`فشل اعتماد المقاسات: ${err.message}`, 'error');
    }
  }, [api, sessionId, state.orderId, saveSession, showToast]);

  // Load Session by Order ID
  const loadSessionByOrderId = useCallback(async (customOrderId) => {
    const targetOrder = customOrderId || state.orderId;
    if (!targetOrder || !targetOrder.trim() || !api?.fetchSessionByOrderId) return;
    setSyncStatus('loading');
    try {
      const res = await api.fetchSessionByOrderId(targetOrder.trim());
      if (res && res.success && res.data) {
        const d = res.data;
        if (d.id) setSessionId(d.id);
        if (d.order_id) state.setOrderId(d.order_id);
        if (d.customer_name) state.setCustomerName(d.customer_name);
        if (d.preferred_unit) state.setUnit(d.preferred_unit);
        if (d.a4_orientation) state.setA4Orientation(d.a4_orientation);
        if (Array.isArray(d.a4_corners) && d.a4_corners.length === 4) state.setA4Corners(d.a4_corners);
        if (Array.isArray(d.measurements_data) && d.measurements_data.length > 0) state.setMeasurements(d.measurements_data);
        if (d.operation_mode && state.setOperationMode) state.setOperationMode(d.operation_mode);
        if (d.camera_profile && state.selectCameraProfile) state.selectCameraProfile(d.camera_profile);
        if (d.garment_profile && state.selectGarmentProfile) state.selectGarmentProfile(d.garment_profile);
        if (d.image_url && imgState?.loadImage) {
          imgState.loadImage(d.image_url, () => {
            state.setHasImage(true);
          });
        }
        state.pushSnapshot();
        setSyncStatus('saved');
        setLastSavedAt(new Date(d.updated_at || d.created_at));
        showToast && showToast(`تم استرجاع مقاسات الطلب (${targetOrder}) من قاعدة البيانات! 📐`, 'success');
      } else {
        setSyncStatus('idle');
        showToast && showToast(`لم يتم العثور على مقاسات مسجلة مسبقاً للطلب (${targetOrder})`, 'info');
      }
    } catch (err) {
      setSyncStatus('error');
      showToast && showToast(`تعذر استرجاع المقاسات: ${err.message}`, 'error');
    }
  }, [api, state, imgState, showToast]);

  // Debounced Auto-save
  useEffect(() => {
    if (!autoSaveEnabled || !sessionId) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveSession(false);
    }, 2500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [state.a4Corners, state.measurements, autoSaveEnabled, sessionId, saveSession]);

  return {
    syncStatus, lastSavedAt, sessionId, autoSaveEnabled, setAutoSaveEnabled,
    saveSession, approveSession, loadSessionByOrderId
  };
}

window.useStudioSync = useStudioSync;
