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
    name: '',
    shortName: '',
    tradeName: '',
    tagline: '',
    phone: '',
    address: '',
    email: '',
    taxNumber: '',
    commercialRegister: '',
    logoUrl: '',
    systemIcon: '',
    footerNote: ''
  };

  var _currentProfile = Object.assign({}, DEFAULT_PROFILE);

  function cleanText(text, fallback) {
    if (!text || typeof text !== 'string') return fallback || '';
    var cleaned = text.trim();
    return cleaned || fallback || '';
  }

  function getProfile() {
    return Object.assign({}, _currentProfile);
  }

  function saveProfile(newProfile) {
    try {
      _currentProfile = Object.assign({}, _currentProfile, newProfile);

      // Save exclusively to PostgreSQL backend
      if (typeof fetch === 'function') {
        fetch('/api/system/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: _currentProfile.name || _currentProfile.company_name || '',
            phone: _currentProfile.phone || '',
            address: _currentProfile.address || '',
            email: _currentProfile.email || '',
            logo_url: _currentProfile.logoUrl || _currentProfile.logo_url || ''
          })
        }).catch(function(err) {
          console.warn("BrandService saveProfile sync note:", err);
        });
      }

      // Notify entire app of profile change
      window.dispatchEvent(new CustomEvent(EVENT_BRAND_CHANGED, { detail: _currentProfile }));
      return { success: true, profile: _currentProfile };
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
        if (comp && (comp.company_name || comp.name)) {
          var name = comp.company_name || comp.name || '';
          _currentProfile = {
            name: name,
            shortName: comp.shortName || (name ? name.split('|')[0].trim() : ''),
            tradeName: comp.tradeName || name,
            tagline: comp.tagline || '',
            phone: comp.phone || '',
            address: comp.address || '',
            email: comp.email || '',
            taxNumber: comp.tax_id || comp.taxNumber || '',
            commercialRegister: comp.cr_number || comp.commercialRegister || '',
            logoUrl: comp.logo_url || comp.logoUrl || '',
            systemIcon: comp.systemIcon || '',
            footerNote: comp.footerNote || ''
          };
          window.dispatchEvent(new CustomEvent(EVENT_BRAND_CHANGED, { detail: _currentProfile }));
        }
      }
    } catch(e) {}
  }

  // Auto-sync exclusively from PostgreSQL on startup
  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    syncFromBackend();
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
