/**
 * ============================================================================
 * BrandService.js — Dynamic White-Label Branding Engine for ERP Master
 * Single Source of Truth for Organization Name, Logo, Address, Tax ID, and Meta
 * ============================================================================
 */
(function(window) {
  'use strict';

  var STORAGE_KEY_PROFILE = 'erp_company_profile_v1';
  var EVENT_BRAND_CHANGED = 'erp:brandProfileChanged';

  var DEFAULT_PROFILE = {
    name: 'مؤسسة الأميرات الصغيرات',
    shortName: 'الأميرات الصغيرات',
    tradeName: 'دار الأميرات الصغيرات للأزياء الفاخرة',
    tagline: 'دار الأزياء والتفصيل الراقي لفساتين الأميرات ✨',
    phone: '776773458',
    address: 'اليمن - صنعاء - شارع حدة',
    email: 'info@littleprincesses.com',
    taxNumber: 'CR-1010-009283',
    commercialRegister: 'CR-1010-009283',
    logoUrl: 'logo.png',
    systemIcon: '👑',
    footerNote: 'وثيقة رسمية معتمدة عبر Little Princesses ERP'
  };

  function cleanText(text, fallback) {
    if (!text || typeof text !== 'string') return fallback || '';
    var cleaned = text.trim();
    return cleaned || fallback || '';
  }

  function getProfile() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY_PROFILE);
      var legacyName = localStorage.getItem('erp_company_name');
      var legacyPhone = localStorage.getItem('erp_phone');
      var legacyAddress = localStorage.getItem('erp_address');
      var legacyEmail = localStorage.getItem('erp_email');
      var legacyLogo = localStorage.getItem('erp_company_logo');

      var profile = stored ? JSON.parse(stored) : {};

      var name = profile.name || legacyName || DEFAULT_PROFILE.name;
      var email = profile.email || legacyEmail || DEFAULT_PROFILE.email;

      return {
        name: name,
        shortName: profile.shortName || (name ? name.split('|')[0].trim() : DEFAULT_PROFILE.shortName),
        tradeName: profile.tradeName || DEFAULT_PROFILE.tradeName,
        tagline: profile.tagline || DEFAULT_PROFILE.tagline,
        phone: profile.phone || legacyPhone || DEFAULT_PROFILE.phone,
        address: profile.address || legacyAddress || DEFAULT_PROFILE.address,
        email: email,
        taxNumber: profile.taxNumber || profile.tax_id || DEFAULT_PROFILE.taxNumber,
        commercialRegister: profile.commercialRegister || profile.cr_number || DEFAULT_PROFILE.commercialRegister,
        logoUrl: profile.logoUrl || legacyLogo || DEFAULT_PROFILE.logoUrl,
        systemIcon: profile.systemIcon || DEFAULT_PROFILE.systemIcon,
        footerNote: profile.footerNote || DEFAULT_PROFILE.footerNote
      };
    } catch(e) {
      return Object.assign({}, DEFAULT_PROFILE);
    }
  }

  function saveProfile(newProfile) {
    try {
      var current = getProfile();
      var merged = Object.assign({}, current, newProfile);
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(merged));
      if (merged.name) localStorage.setItem('erp_company_name', merged.name);
      if (merged.phone) localStorage.setItem('erp_phone', merged.phone);
      if (merged.address) localStorage.setItem('erp_address', merged.address);
      if (merged.email) localStorage.setItem('erp_email', merged.email);
      if (merged.logoUrl) localStorage.setItem('erp_company_logo', merged.logoUrl);

      // Notify entire app of profile change
      window.dispatchEvent(new CustomEvent(EVENT_BRAND_CHANGED, { detail: merged }));
      return { success: true, profile: merged };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }

  async function syncFromBackend() {
    try {
      var res = await fetch('/api/settings');
      if (res.ok) {
        var d = await res.json();
        var comp = d.company || d.company_profile;
        if (comp && comp.company_name) {
          saveProfile({
            name: comp.company_name,
            phone: comp.phone || DEFAULT_PROFILE.phone,
            address: comp.address || DEFAULT_PROFILE.address,
            email: comp.email || DEFAULT_PROFILE.email,
            logoUrl: comp.logo_url || DEFAULT_PROFILE.logoUrl,
            taxNumber: comp.tax_id || DEFAULT_PROFILE.taxNumber,
            commercialRegister: comp.cr_number || DEFAULT_PROFILE.commercialRegister
          });
        }
      }
    } catch(e) {}
  }

  // Auto-sync on startup in browser environment
  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    setTimeout(syncFromBackend, 500);
  }

  window.BrandService = {
    getProfile: getProfile,
    saveProfile: saveProfile,
    cleanText: cleanText,
    syncFromBackend: syncFromBackend,
    DEFAULT_PROFILE: DEFAULT_PROFILE,
    EVENT_BRAND_CHANGED: EVENT_BRAND_CHANGED
  };

})(typeof window !== 'undefined' ? window : global);
