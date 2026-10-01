const { useState, useCallback } = React;

function useSettingsActions({
  formData, setFormData,
  themeMode, setThemeMode,
  sarRate, usdRate,
  localCurrency,
  fetchBackupStatus,
  fetchUsers,
  setAuditLogs, setTotalLogs, setLoadingAudit,
  showToast
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  // ── تطبيق المظهر ──
  const applyTheme = useCallback((mode) => {
    setThemeMode(mode);
    try {
      localStorage.setItem('lp_theme', mode);
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
        document.body && document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body && document.body.classList.remove('dark');
      }
      window.dispatchEvent(new CustomEvent('lp:themeChanged', { detail: { theme: mode } }));
    } catch(e) {}
  }, [setThemeMode]);

  // ── حفظ إعدادات المنشأة ──
  const handleSaveProfile = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsSaving(true);
    try {
      if (window.BrandService) {
        window.BrandService.saveProfile({
          name: formData.companyName,
          shortName: formData.shortName,
          tagline: formData.tagline,
          commercialRegister: formData.commercialRegister,
          phone: formData.phone,
          address: formData.address,
          email: formData.email,
          logoUrl: formData.logoUrl
        });
      }
      localStorage.setItem('erp_company_name', formData.companyName);
      localStorage.setItem('erp_phone',        formData.phone);
      localStorage.setItem('erp_address',      formData.address);
      localStorage.setItem('erp_fiscal_date',  formData.fiscalDate);
      localStorage.setItem('erp_email',        formData.email);
      localStorage.setItem('lp_theme',         themeMode);

      if (window.CurrencyService) {
        if (parseFloat(sarRate) > 0) window.CurrencyService.setRate('SAR', parseFloat(sarRate));
        if (parseFloat(usdRate) > 0) window.CurrencyService.setRate('USD', parseFloat(usdRate));
      }

      const payload = {
        company_name: formData.companyName,
        phone: formData.phone,
        address: formData.address,
        fiscal_date: formData.fiscalDate,
        email: formData.email,
        theme_mode: themeMode,
        base_currency: localCurrency ? localCurrency.code : 'YER',
        rates: {
          YER: 1.0,
          SAR: parseFloat(sarRate) || 142.0,
          USD: parseFloat(usdRate) || 535.0
        }
      };

      if (window.settingsAPI && window.settingsAPI.saveSettings) {
        const res = await window.settingsAPI.saveSettings(payload);
        showToast && showToast(res?.message || '✅ تم حفظ إعدادات المنشأة والمظهر بنجاح 🏢');
      } else {
        showToast && showToast('✅ تم حفظ الإعدادات بنجاح 🏢');
      }
    } catch(err) {
      showToast && showToast('تم الحفظ محلياً ⚡', 'warning');
    } finally {
      setIsSaving(false);
    }
  }, [formData, themeMode, sarRate, usdRate, localCurrency, showToast]);

  // ── إدارة النسخ الاحتياطي ──
  const handleCreateSnapshot = useCallback(async (setLoadingBackup) => {
    setLoadingBackup(true);
    try {
      if (window.backupAPI && window.backupAPI.createSnapshot) {
        const res = await window.backupAPI.createSnapshot();
        if (res && res.success) {
          showToast && showToast(res.message || 'تم حفظ نقطة الاستعادة بنجاح 📸💾');
          await fetchBackupStatus();
        } else {
          showToast && showToast(res?.message || 'فشل حفظ نقطة الاستعادة', 'error');
        }
      }
    } catch(err) {
      showToast && showToast('تعذر الاتصال بالخادم لإنشاء النسخة', 'error');
    } finally {
      setLoadingBackup(false);
    }
  }, [fetchBackupStatus, showToast]);

  const handleDownloadBackup = useCallback((format = 'json') => {
    window.open(`/api/backup/export?format=${format}`, '_blank');
    showToast && showToast(`بدأ تنزيل ملف النسخة الاحتياطية (${format.toUpperCase()}) 💾📥`);
  }, [showToast]);

  const handleExecuteRestore = useCallback(async (backupFileContent, onDone) => {
    if (!backupFileContent) return showToast && showToast('يرجى اختيار ملف صالح ⚠️', 'error');
    if (!window.confirm('⚠️ تنبيه أمني:\nهل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم تحديث الجداول المالية والتشغيلية.')) return;

    setIsRestoring(true);
    try {
      if (window.backupAPI && window.backupAPI.restoreBackup) {
        const res = await window.backupAPI.restoreBackup(backupFileContent);
        if (res && res.success) {
          showToast && showToast(res.message || 'تمت استعادة البيانات بنجاح 🔄', 'success');
          onDone && onDone();
          await fetchBackupStatus();
        } else {
          showToast && showToast(res?.message || 'فشلت عملية الاستعادة', 'error');
        }
      }
    } catch(err) {
      showToast && showToast('خطأ أثناء إرسال بيانات الاستعادة للخادم', 'error');
    } finally {
      setIsRestoring(false);
    }
  }, [fetchBackupStatus, showToast]);

  const handleFactoryReset = useCallback(async () => {
    if (!window.confirm('⚠️ تحذير عالي الخطورة:\n\nهل أنت متأكد من تصفير كافة البيانات التشغيلية؟\nسيتم مسح الطلبات والفواتير والمخزون مع الاحتفاظ بالحسابات.')) return;
    const confirmText = window.prompt("للتأكيد النهائي، يرجى كتابة كلمة 'تصفير' أدناه:");
    if (confirmText !== 'تصفير') {
      showToast && showToast('تم إلغاء عملية التصفير', 'info');
      return;
    }

    setIsWiping(true);
    try {
      const res = await fetch('/api/gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clearAllData', data: {} })
      }).then(r => r.json());

      if (res && res.success !== false) {
        ['erp_active_customer', 'cached_orders', 'offline_queue', 'lp_cached_data', 'draft_order'].forEach(k => {
          try { localStorage.removeItem(k); } catch(e) {}
        });
        showToast && showToast('تم تصفير النظام بنجاح 100% والبدء كنسخة نظيفة!', 'success');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        throw new Error(res?.error || res?.message || 'فشل تنفيذ عملية التصفير');
      }
    } catch(err) {
      showToast && showToast('خطأ أثناء التصفير: ' + (err.message || String(err)), 'error');
    } finally {
      setIsWiping(false);
    }
  }, [showToast]);

  // ── إدارة سجلات التدقيق ──
  const fetchAuditLogs = useCallback(async (filter) => {
    setLoadingAudit(true);
    try {
      if (window.auditAPI && window.auditAPI.getLogs) {
        const params = {};
        if (filter?.action) params.action = filter.action;
        if (filter?.entity_type) params.entity_type = filter.entity_type;
        if (filter?.search) params.search = filter.search;
        const res = await window.auditAPI.getLogs(params);
        if (res && res.success) {
          setAuditLogs(res.logs || []);
          setTotalLogs(res.total || 0);
        }
      }
    } catch(e) {}
    finally { setLoadingAudit(false); }
  }, [setAuditLogs, setTotalLogs, setLoadingAudit]);

  // ── إدارة المستخدمين ──
  const handleSaveUser = useCallback(async (userData, onSuccess) => {
    try {
      if (window.usersAPI && window.usersAPI.saveUser) {
        const res = await window.usersAPI.saveUser(userData);
        if (res && res.success) {
          showToast && showToast(res.message || 'تم حفظ بيانات المستخدم بنجاح ✅');
          await fetchUsers();
          onSuccess && onSuccess();
        } else {
          showToast && showToast(res?.message || 'فشل حفظ المستخدم', 'error');
        }
      }
    } catch(e) {
      showToast && showToast('خطأ في الاتصال بالخادم', 'error');
    }
  }, [fetchUsers, showToast]);

  const handleDeleteUser = useCallback(async (user) => {
    if (user.username === 'admin') return alert('لا يمكن حذف حساب المدير العام الرئيسي');
    if (!window.confirm(`هل أنت متأكد من حذف الحساب "${user.full_name || user.username}"؟`)) return;
    try {
      if (window.usersAPI && window.usersAPI.deleteUser) {
        const res = await window.usersAPI.deleteUser(user.id);
        if (res && res.success) {
          showToast && showToast('تم حذف المستخدم بنجاح ✅');
          await fetchUsers();
        } else {
          alert(res?.message || 'حدث خطأ أثناء الحذف');
        }
      }
    } catch(e) { alert('تعذر الاتصال بالخادم'); }
  }, [fetchUsers, showToast]);

  return {
    isSaving, isRestoring, isWiping,
    applyTheme, handleSaveProfile,
    handleCreateSnapshot, handleDownloadBackup,
    handleExecuteRestore, handleFactoryReset,
    fetchAuditLogs, handleSaveUser, handleDeleteUser
  };
}

window.useSettingsActions = useSettingsActions;
