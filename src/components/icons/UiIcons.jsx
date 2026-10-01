/**
 * ============================================================================
 * UiIcons.jsx — General Interface & Action SVG Icons
 * Architecture: Modular Icons System | Little Princesses ERP
 * ============================================================================
 */

(function(window) {
  'use strict';

  window.UiIcons = {
    Close: ({ className = "w-5 h-5" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    ),
    Star: ({ className = "w-5 h-5" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    Search: ({ className = "w-4 h-4" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    Bell: ({ className = "w-5 h-5" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    ChevronRight: ({ className = "w-4 h-4" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    ),
    ChevronLeft: ({ className = "w-4 h-4" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    ),
    ChevronDown: ({ className = "w-4 h-4" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    ),
    Plus: ({ className = "w-4 h-4" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    Filter: ({ className = "w-4 h-4" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
    ),
    Check: ({ className = "w-4 h-4" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    TrendingUp: ({ className = "w-4 h-4" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
    TrendingDown: ({ className = "w-4 h-4" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
        <polyline points="17 18 23 18 23 12" />
      </svg>
    ),
    Layers: ({ className = "w-5 h-5 shrink-0" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
    Sparkles: ({ className = "w-5 h-5" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364l-2.121 2.121M7.757 16.243l-2.121 2.121m12.728 0l-2.121-2.121M7.757 7.757L5.636 5.636" />
      </svg>
    ),
    Menu: ({ className = "w-5 h-5" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    ),
    Edit: ({ className = "w-4 h-4" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    Trash: ({ className = "w-4 h-4" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    ),
    Eye: ({ className = "w-4 h-4" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    Tag: ({ className = "w-4 h-4" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
    X: ({ className = "w-5 h-5" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    )
  };

})(window);
