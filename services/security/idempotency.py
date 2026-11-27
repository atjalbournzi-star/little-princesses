# services/security/idempotency.py
# Network Idempotency Shield & Double-Submission Prevention Decorator
# Architectural Standards: Strictly < 220 lines per file

import hashlib
import json
import threading
import time
from functools import wraps
from flask import request, jsonify, Response
from db_client import get_db_cursor
from .error_translator import IdempotencyConflictError

_MEM_LOCK = threading.RLock()
_MEM_OPS = {}
_MEM_WINDOW_SECS = 8.0


def _prune_mem_ops(now):
    stale = [k for k, v in _MEM_OPS.items() if now > v[0]]
    for k in stale:
        _MEM_OPS.pop(k, None)


def _conflict_response():
    msg = 'العملية قيد المعالجة حالياً، يرجى الانتظار لتفادي التكرار'
    return jsonify({'success': False, 'error': msg, 'message': msg}), 409


def compute_request_hash(req):
    """Generates deterministic SHA-256 hash of HTTP method, path, and payload."""
    try:
        body = req.get_data(as_text=True) or ""
    except Exception:
        body = ""
    raw = f"{req.method}:{req.path}:{body}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def extract_response_data(resp):
    """Extracts JSON serializable dict and status code from Flask response object/tuple."""
    status_code = 200
    res_obj = resp
    if isinstance(resp, tuple):
        res_obj = resp[0]
        if len(resp) > 1:
            status_code = int(resp[1])

    if isinstance(res_obj, Response):
        status_code = res_obj.status_code
        try:
            data = res_obj.get_json(silent=True) or {}
        except Exception:
            data = {"raw": res_obj.get_data(as_text=True)}
        return data, status_code
    elif isinstance(res_obj, dict):
        return res_obj, status_code
    return {"data": str(res_obj)}, status_code


def idempotent_op(endpoint_name=None):
    """
    Decorator attached to sensitive financial and inventory write endpoints.
    Guarantees exactly-once execution against network retries and double clicks.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if request.method in ('GET', 'HEAD', 'OPTIONS'):
                return fn(*args, **kwargs)
            idem_key = request.headers.get('Idempotency-Key') or request.headers.get('idempotency-key')
            ep = endpoint_name or request.path
            req_hash = compute_request_hash(request)
            actor = (getattr(request, 'active_user', None) or {}).get('id') or request.remote_addr or 'anon'
            mem_key = f"{ep}:{actor}:{req_hash}"
            has_idem_key = bool(idem_key and str(idem_key).strip())
            now = time.monotonic()

            with _MEM_LOCK:
                _prune_mem_ops(now)
                existing_mem = _MEM_OPS.get(mem_key)
                if existing_mem is not None:
                    _exp, m_state, m_json, m_code = existing_mem
                    if m_state == 'processing':
                        return _conflict_response()
                    if m_state == 'completed' and not has_idem_key:
                        return jsonify(m_json), m_code
                _MEM_OPS[mem_key] = (now + 30.0, 'processing', None, None)

            if not has_idem_key:
                try:
                    res = fn(*args, **kwargs)
                    resp_json, status_code = extract_response_data(res)
                    with _MEM_LOCK:
                        if status_code < 400:
                            _MEM_OPS[mem_key] = (time.monotonic() + _MEM_WINDOW_SECS, 'completed', resp_json, status_code)
                        else:
                            _MEM_OPS.pop(mem_key, None)
                    return res
                except Exception:
                    with _MEM_LOCK:
                        _MEM_OPS.pop(mem_key, None)
                    raise

            idem_key = str(idem_key).strip()

            # 1. Check existing idempotency key in DB
            try:
                with get_db_cursor(commit=False) as cur:
                    cur.execute("""
                        SELECT idempotency_key, endpoint, request_hash, status_code, response_json, state
                        FROM public.idempotency_keys
                        WHERE idempotency_key = %s;
                    """, (idem_key,))
                    row = cur.fetchone()
            except Exception:
                row = None

            if row:
                st = str(row.get('state') or '').lower()
                if st == 'processing':
                    return _conflict_response()
                if st == 'completed':
                    with _MEM_LOCK:
                        _MEM_OPS.pop(mem_key, None)
                    stored_hash = str(row.get('request_hash') or '')
                    if stored_hash and stored_hash != req_hash:
                        return jsonify({
                            'success': False,
                            'error': 'تعارض مفتاح منع التكرار: تم استخدام نفس المفتاح مسبقاً ببيانات مختلفة',
                            'message': 'تعارض مفتاح منع التكرار: تم استخدام نفس المفتاح مسبقاً ببيانات مختلفة'
                        }), 409
                    cached_json = row.get('response_json') or {}
                    cached_code = int(row.get('status_code') or 200)
                    return jsonify(cached_json), cached_code

            # 2. Atomically register key as 'processing' via ON CONFLICT DO NOTHING
            claimed = False
            try:
                with get_db_cursor(commit=True) as cur:
                    cur.execute("""
                        INSERT INTO public.idempotency_keys (idempotency_key, endpoint, request_hash, state)
                        VALUES (%s, %s, %s, 'processing')
                        ON CONFLICT (idempotency_key) DO NOTHING
                        RETURNING idempotency_key;
                    """, (idem_key, ep, req_hash))
                    claimed = bool(cur.fetchone())
                    if not claimed:
                        cur.execute("""
                            SELECT idempotency_key, endpoint, request_hash, status_code, response_json, state
                            FROM public.idempotency_keys
                            WHERE idempotency_key = %s;
                        """, (idem_key,))
                        row = cur.fetchone()
                        if row and str(row.get('state') or '').lower() == 'failed':
                            cur.execute("""
                                UPDATE public.idempotency_keys
                                SET state = 'processing', endpoint = %s, request_hash = %s
                                WHERE idempotency_key = %s AND state = 'failed'
                                RETURNING idempotency_key;
                            """, (ep, req_hash, idem_key))
                            claimed = bool(cur.fetchone())
            except Exception:
                with _MEM_LOCK:
                    _MEM_OPS.pop(mem_key, None)
                return _conflict_response()

            if not claimed:
                with _MEM_LOCK:
                    _MEM_OPS.pop(mem_key, None)
                if row and str(row.get('state') or '').lower() == 'completed':
                    stored_hash = str(row.get('request_hash') or '')
                    if stored_hash and stored_hash != req_hash:
                        return jsonify({
                            'success': False,
                            'error': 'تعارض مفتاح منع التكرار: تم استخدام نفس المفتاح مسبقاً ببيانات مختلفة',
                            'message': 'تعارض مفتاح منع التكرار: تم استخدام نفس المفتاح مسبقاً ببيانات مختلفة'
                        }), 409
                    return jsonify(row.get('response_json') or {}), int(row.get('status_code') or 200)
                return _conflict_response()

            # 3. Execute target function
            try:
                res = fn(*args, **kwargs)
                resp_json, status_code = extract_response_data(res)

                if status_code < 400:
                    with get_db_cursor(commit=True) as cur:
                        cur.execute("""
                            UPDATE public.idempotency_keys
                            SET state = 'completed', status_code = %s, response_json = %s
                            WHERE idempotency_key = %s;
                        """, (status_code, json.dumps(resp_json, default=str), idem_key))
                    with _MEM_LOCK:
                        _MEM_OPS[mem_key] = (time.monotonic() + _MEM_WINDOW_SECS, 'completed', resp_json, status_code)
                else:
                    with _MEM_LOCK:
                        _MEM_OPS.pop(mem_key, None)
                    with get_db_cursor(commit=True) as cur:
                        cur.execute("DELETE FROM public.idempotency_keys WHERE idempotency_key = %s;", (idem_key,))
                return res
            except Exception as e:
                with _MEM_LOCK:
                    _MEM_OPS.pop(mem_key, None)
                with get_db_cursor(commit=True) as cur:
                    cur.execute("DELETE FROM public.idempotency_keys WHERE idempotency_key = %s;", (idem_key,))
                raise e

        return wrapper
    return decorator
