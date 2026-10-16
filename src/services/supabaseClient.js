/**
 * src/services/supabaseClient.js
 * Facade re-exporting window.supabaseClient for modular services
 */
(function(window) {
  'use strict';
  if (typeof window !== 'undefined') {
    window.supabaseClient = window.supabaseClient || window.supabase;
  }
})(typeof window !== 'undefined' ? window : this);
