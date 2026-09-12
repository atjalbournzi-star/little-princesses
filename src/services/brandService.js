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
    name: 'نظام الإدارة المتكامل الذكي | ERP Master',
    shortName: 'ERP Master',
    tradeName: 'إدارة المعامل والإنتاج الذكي',
    tagline: 'منظومة تخطيط موارد المؤسسات وإدارة العمليات والإنتاج',
    phone: '776773458',
    address: 'اليمن - صنعاء',
    email: 'info@erpmaster.com',
    taxNumber: '',
    commercialRegister: '',
    logoUrl: '',
    systemIcon: '🏢',
    footerNote: 'نظام الإدارة المتكامل والعمليات السحابية الذكية'
  };

  function getProfile() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY_PROFILE);
      var legacyName = localStorage.getItem('erp_company_name');
      var legacyPhone = localStorage.getItem('erp_phone');
      var legacyAddress = localStorage.getItem('erp_address');
      var legacyEmail = localStorage.getItem('erp_email');
      var legacyLogo = localStorage.getItem('erp_company_logo');

      var profile = stored ? JSON.parse(stored) : {};

      // Filter out hardcoded legacy brand names if found
      var name = profile.name || legacyName || DEFAULT_PROFILE.name;
      if (name.indexOf('الأميرات') !== -1 || name.indexOf('Princesses') !== -1) {
        name = DEFAULT_PROFILE.name;
      }

      var email = profile.email || legacyEmail || DEFAULT_PROFILE.email;
      if (email.indexOf('littleprincesses') !== -1) {
        email = DEFAULT_PROFILE.email;
      }

      return {
        name: name,
        shortName: profile.shortName || (name ? name.split('|')[0].trim() : DEFAULT_PROFILE.shortName),
        tradeName: profile.tradeName || DEFAULT_PROFILE.tradeName,
        tagline: profile.tagline || DEFAULT_PROFILE.tagline,
        phone: profile.phone || legacyPhone || DEFAULT_PROFILE.phone,
        address: profile.address || legacyAddress || DEFAULT_PROFILE.address,
        email: email,
        taxNumber: profile.taxNumber || profile.tax_id || '',
        commercialRegister: profile.commercialRegister || profile.cr_number || '',
        logoUrl: profile.logoUrl || legacyLogo || '',
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

  window.BrandService = {
    getProfile: getProfile,
    saveProfile: saveProfile,
    DEFAULT_PROFILE: DEFAULT_PROFILE,
    EVENT_BRAND_CHANGED: EVENT_BRAND_CHANGED
  };

})(typeof window !== 'undefined' ? window : global);
