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
    name: 'نظام الإدارة المتكامل',
    shortName: 'ERP Master',
    tradeName: 'نظام الإدارة المتكامل',
    tagline: 'نظام تخطيط موارد المؤسسات الموحد',
    phone: '',
    address: '',
    email: '',
    taxNumber: '',
    commercialRegister: '',
    logoUrl: '',
    systemIcon: '🏢',
    footerNote: ''
  };

  function loadCachedDisplayProfile() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return Object.assign({}, DEFAULT_PROFILE, {
            name: parsed.name || DEFAULT_PROFILE.name,
            shortName: parsed.shortName || DEFAULT_PROFILE.shortName,
            tagline: parsed.tagline || DEFAULT_PROFILE.tagline,
            logoUrl: parsed.logoUrl || '',
            systemIcon: parsed.systemIcon || '🏢'
          });
        }
      }
    } catch(e) {}
    return Object.assign({}, DEFAULT_PROFILE);
  }

  function cacheDisplayProfile(profile) {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify({
        name: profile.name || DEFAULT_PROFILE.name,
        shortName: profile.shortName || DEFAULT_PROFILE.shortName,
        tagline: profile.tagline || DEFAULT_PROFILE.tagline,
        logoUrl: profile.logoUrl || '',
        systemIcon: profile.systemIcon || '🏢'
      }));
    } catch(e) {}
  }

  function updateDocumentTitle(profile) {
    if (typeof document !== 'undefined' && profile) {
      var titleName = (profile.name && profile.name.trim()) ? profile.name.trim() : DEFAULT_PROFILE.name;
      document.title = titleName + ' | ERP Master';
    }
  }

  var _currentProfile = loadCachedDisplayProfile();
  updateDocumentTitle(_currentProfile);

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
      cacheDisplayProfile(_currentProfile);
      updateDocumentTitle(_currentProfile);

      // Save exclusively to PostgreSQL backend when authenticated
      var token = (typeof localStorage !== 'undefined') ? localStorage.getItem('erp_auth_token') : null;
      if (typeof fetch === 'function' && token) {
        fetch('/api/system/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
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
      var token = (typeof localStorage !== 'undefined') ? localStorage.getItem('erp_auth_token') : null;
      if (!token) return;
      var res = await fetch('/api/settings', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (res.ok) {
        var d = await res.json();
        var comp = d.company || d.company_profile;
        if (comp && (comp.company_name || comp.name)) {
          var name = comp.company_name || comp.name || DEFAULT_PROFILE.name;
          _currentProfile = {
            name: name,
            shortName: comp.shortName || (name ? name.split('|')[0].trim() : DEFAULT_PROFILE.shortName),
            tradeName: comp.tradeName || name,
            tagline: comp.tagline || DEFAULT_PROFILE.tagline,
            phone: comp.phone || '',
            address: comp.address || '',
            email: comp.email || '',
            taxNumber: comp.tax_id || comp.taxNumber || '',
            commercialRegister: comp.cr_number || comp.commercialRegister || '',
            logoUrl: comp.logo_url || comp.logoUrl || '',
            systemIcon: comp.systemIcon || '🏢',
            footerNote: comp.footerNote || ''
          };
          cacheDisplayProfile(_currentProfile);
          updateDocumentTitle(_currentProfile);
          window.dispatchEvent(new CustomEvent(EVENT_BRAND_CHANGED, { detail: _currentProfile }));
        }
      }
    } catch(e) {}
  }

  // Only sync from backend on startup if an auth token already exists
  if (typeof window !== 'undefined' && typeof fetch === 'function' && localStorage.getItem('erp_auth_token')) {
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
