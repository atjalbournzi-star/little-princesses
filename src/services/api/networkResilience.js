// src/services/api/networkResilience.js
// Network resilience layer: AbortController timeouts, offline/timeout Arabic UX preservation,
// and short-window in-flight GET deduplication to minimize Supabase & network bandwidth.

(function(window) {
  'use strict';

  const LP_OFFLINE_MSG = 'تعذّر الاتصال بالخادم حالياً، بياناتك ما زالت محفوظة في النموذج — يرجى إعادة المحاولة';
  const LP_TIMEOUT_MSG = 'انتهت مهلة الاتصال بالخادم، بياناتك ما زالت محفوظة في النموذج — يرجى إعادة المحاولة';
  const GET_DEDUP_MS = 4500;

  window.LP_OFFLINE_MSG = LP_OFFLINE_MSG;
  window.LP_TIMEOUT_MSG = LP_TIMEOUT_MSG;

  const _inFlightGets = new Map();
  const _recentGets = new Map();
  let _lastNetToastAt = 0;

  function _notifyNetworkFailure(msg, isTimeout, url) {
    const now = Date.now();
    if (now - _lastNetToastAt < 3000) return;
    _lastNetToastAt = now;
    try {
      window.dispatchEvent(new CustomEvent('lp:networkError', {
        detail: { message: msg, isTimeout: Boolean(isTimeout), url: String(url || '') }
      }));
    } catch (e) {}
  }

  function _normalizeGetKey(url) {
    return String(url || '').replace(/([?&])_t=\d+(&?)/, (_m, p1, p2) => (p2 ? p1 : '')).replace(/[?&]$/, '');
  }

  function _buildFetchError(origErr, isTimeout, url) {
    const msg = isTimeout ? LP_TIMEOUT_MSG : LP_OFFLINE_MSG;
    const err = new Error(msg);
    err.name = isTimeout ? 'TimeoutError' : 'NetworkError';
    err.isNetworkError = true;
    err.isTimeout = Boolean(isTimeout);
    err.userMessage = msg;
    err.cause = origErr;
    _notifyNetworkFailure(msg, isTimeout, url);
    return err;
  }

  function clearGetDedupCache() {
    _recentGets.clear();
  }

  function fetchWithTimeout(origFetch, url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const isMutation = method !== 'GET' && method !== 'HEAD';
    const reqUrl = String(url || '');

    if (isMutation) {
      _recentGets.clear();
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false && reqUrl.startsWith('/api/')) {
      return Promise.reject(_buildFetchError(new Error('offline'), false, reqUrl));
    }

    const canDedupGet = (method === 'GET') && reqUrl.startsWith('/api/') && !options.skipDedup && !reqUrl.includes('/api/backup/export');
    const getKey = canDedupGet ? _normalizeGetKey(reqUrl) : null;

    if (getKey) {
      const cached = _recentGets.get(getKey);
      if (cached && (Date.now() - cached.ts) < GET_DEDUP_MS) {
        return Promise.resolve(cached.res.clone());
      }
      if (_inFlightGets.has(getKey)) {
        return _inFlightGets.get(getKey).then(res => res.clone());
      }
    }

    const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : (isMutation ? 45000 : 25000);
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    let timedOut = false;
    let timerId = null;
    let externalAbortHandler = null;

    const fetchOpts = { ...options };
    delete fetchOpts.timeoutMs;
    delete fetchOpts.skipDedup;

    if (controller) {
      if (options.signal) {
        if (options.signal.aborted) controller.abort();
        else {
          externalAbortHandler = () => controller.abort();
          options.signal.addEventListener('abort', externalAbortHandler, { once: true });
        }
      }
      fetchOpts.signal = controller.signal;
      timerId = setTimeout(() => {
        timedOut = true;
        try { controller.abort(); } catch (e) {}
      }, timeoutMs);
    }

    const rawPromise = origFetch(url, fetchOpts).then(
      (res) => {
        if (timerId) clearTimeout(timerId);
        if (options.signal && externalAbortHandler) options.signal.removeEventListener('abort', externalAbortHandler);
        if (getKey && res && res.ok && res.status < 400) {
          _recentGets.set(getKey, { res: res.clone(), ts: Date.now() });
        }
        return res;
      },
      (err) => {
        if (timerId) clearTimeout(timerId);
        if (options.signal && externalAbortHandler) options.signal.removeEventListener('abort', externalAbortHandler);
        const isAbort = err && (err.name === 'AbortError' || err.name === 'TimeoutError');
        if (isAbort && !timedOut && options.signal && options.signal.aborted) {
          throw err; // Caller intentionally aborted
        }
        const isNet = timedOut || isAbort || (err && err.name === 'TypeError') || (typeof navigator !== 'undefined' && navigator.onLine === false);
        if (isNet) {
          throw _buildFetchError(err, timedOut, reqUrl);
        }
        throw err;
      }
    );

    if (getKey) {
      _inFlightGets.set(getKey, rawPromise);
      return rawPromise.finally(() => _inFlightGets.delete(getKey)).then(res => res.clone());
    }
    return rawPromise;
  }

  window.NetworkResilience = {
    LP_OFFLINE_MSG: LP_OFFLINE_MSG,
    LP_TIMEOUT_MSG: LP_TIMEOUT_MSG,
    fetchWithTimeout: fetchWithTimeout,
    clearGetDedupCache: clearGetDedupCache
  };
})(typeof window !== 'undefined' ? window : globalThis);
