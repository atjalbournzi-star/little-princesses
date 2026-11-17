/**
 * src/services/api/jobRolesApi.js
 * Centralized Job Roles and Technical Specialties Network Client
 * Little Princesses ERP - Dynamic Role Architecture
 */

(function(window) {
  'use strict';

  async function getJobRoles(params) {
    try {
      const qs = params ? new URLSearchParams(params).toString() : '';
      const url = '/api/hr/job-roles' + (qs ? '?' + qs : '');
      const res = await fetch(url).then(r => r.json());
      if (res && res.success && Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    } catch (e) {
      console.warn('Failed to fetch job roles:', e);
      return [];
    }
  }

  async function addJobRole(data) {
    const res = await fetch('/api/hr/job-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json());
    if (res && res.success) {
      return res.data;
    }
    throw new Error(res?.error || 'فشل في حفظ المسمى الوظيفي');
  }

  window.jobRolesAPI = {
    getJobRoles,
    addJobRole
  };
  window.JobRolesService = window.jobRolesAPI;

})(typeof window !== 'undefined' ? window : globalThis);
