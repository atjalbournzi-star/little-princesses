/**
 * ============================================================================
 * Icons.jsx — Central Application Icons Registry & Safe Proxy
 * Architecture: Modular Icons System | Little Princesses ERP
 * ============================================================================
 */

(function(window) {
  'use strict';

  var nav = window.NavIcons || {};
  var ui = window.UiIcons || {};

  var Icons = Object.assign({}, nav, ui);

  // Subagent & Feature aliases (100% backward compatibility)
  Icons.dashboard = Icons.Dashboard;
  Icons.users = Icons.Users;
  Icons.employees = Icons.Employees;
  Icons.employee = Icons.Employees;
  Icons.hr = Icons.HR;
  Icons.cart = Icons.ShoppingBag;
  Icons.box = Icons.Scissors;
  Icons.factory = Icons.Factory;
  Icons.briefcase = Icons.Accounts;
  Icons.receipt = Icons.Vouchers;
  Icons.chart = Icons.Reports;
  Icons.settings = Icons.Settings;
  Icons.search = Icons.Search;
  Icons.bell = Icons.Bell;
  Icons.plus = Icons.Plus;
  Icons.menu = Icons.Menu;
  Icons.edit = Icons.Edit;
  Icons.trash = Icons.Trash;
  Icons.eye = Icons.Eye;
  Icons.tag = Icons.Tag;
  Icons.collection = Icons.Tag;
  Icons.Close = Icons.Close || Icons.X;
  Icons.X = Icons.X || Icons.Close;

  // Safe fallback Proxy: If an unknown icon name is accessed, return a safe component instead of undefined (prevents React #130)
  if (typeof Proxy !== 'undefined') {
    var DefaultIcon = ({ className = "w-5 h-5 shrink-0" } = {}) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );

    window.Icons = new Proxy(Icons, {
      get(target, prop) {
        if (prop in target) return target[prop];
        return DefaultIcon;
      }
    });
  } else {
    window.Icons = Icons;
  }

})(window);
