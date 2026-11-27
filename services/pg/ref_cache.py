# services/pg/ref_cache.py
# Lightweight thread-safe in-memory TTL cache for semi-static reference tables ONLY.
# Financial ledgers, balances, orders, payments, and inventory moves are NEVER cached here.

import copy
import time
import threading

_LOCK = threading.RLock()
_STORE = {}
DEFAULT_REF_TTL = 180  # seconds (within 120-300s governance window)


def get_cached_ref(key, loader, ttl=DEFAULT_REF_TTL):
    """Return cached reference data if fresh; otherwise invoke loader() and store a safe copy."""
    now = time.monotonic()
    with _LOCK:
        entry = _STORE.get(key)
        if entry is not None:
            expires_at, val = entry
            if now < expires_at:
                return copy.deepcopy(val)
            _STORE.pop(key, None)

    fresh = loader()
    with _LOCK:
        _STORE[key] = (time.monotonic() + max(1, int(ttl)), copy.deepcopy(fresh))
    return fresh


def invalidate_ref(*keys):
    """Immediately invalidate one or more exact cache keys or key prefixes (ending with ':')."""
    if not keys:
        return
    with _LOCK:
        for k in keys:
            if not k:
                continue
            if k.endswith(':'):
                to_del = [existing for existing in _STORE if existing.startswith(k)]
                for existing in to_del:
                    _STORE.pop(existing, None)
            else:
                _STORE.pop(k, None)


def clear_all_ref_cache():
    """Clear all cached semi-static reference datasets."""
    with _LOCK:
        _STORE.clear()
