# services/pg/pg_size_matrices.py
# Multi-Segment Standard Size Matrices Service (Women Apparel, Girls Dress, School Uniform)

import json
from .db_pool import get_db_cursor, clean_str, to_decimal, generate_id
from .ref_cache import get_cached_ref, invalidate_ref
from .pg_audit import log_audit_event, get_active_user_context

VALID_SEGMENTS = ('WOMEN_APPAREL', 'GIRLS_DRESS', 'SCHOOL_UNIFORM')


def _format_row(row):
    r = dict(row)
    for k in ('chest_cm', 'waist_cm', 'hip_cm', 'dress_length_cm', 'shoulder_cm', 'sleeve_cm', 'fabric_factor'):
        if r.get(k) is not None:
            r[k] = float(r[k])
    for k in ('created_at', 'updated_at'):
        if r.get(k):
            r[k] = str(r[k])
    if isinstance(r.get('extra_measurements_json'), str):
        try:
            r['extra_measurements_json'] = json.loads(r['extra_measurements_json'])
        except Exception:
            r['extra_measurements_json'] = {}
    return r


def _fetch_matrices_uncached(segment_code=None, include_inactive=False):
    clauses, args = [], []
    if segment_code:
        clauses.append("segment_code = %s")
        args.append(clean_str(segment_code).upper())
    if not include_inactive:
        clauses.append("is_active = TRUE")
    where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    sql = f"""
        SELECT id, segment_code, segment_name_ar, size_label, display_unit,
               chest_cm, waist_cm, hip_cm, dress_length_cm, shoulder_cm, sleeve_cm,
               extra_measurements_json, fabric_factor, sort_order, is_active,
               created_at, updated_at
        FROM public.standard_size_matrices
        {where_sql}
        ORDER BY segment_code ASC, sort_order ASC, id ASC;
    """
    with get_db_cursor(commit=False) as cur:
        cur.execute(sql, tuple(args))
        return [_format_row(r) for r in (cur.fetchall() or [])]


def get_size_matrices(segment_code=None, include_inactive=False):
    seg = clean_str(segment_code).upper() if segment_code else 'ALL'
    flag = '1' if include_inactive else '0'
    cache_key = f"size_matrices:{seg}:{flag}"
    return get_cached_ref(
        cache_key,
        lambda: _fetch_matrices_uncached(segment_code=segment_code, include_inactive=include_inactive),
        ttl=180,
    )


def save_size_matrix(payload, matrix_id=None):
    data = payload.get('data') if isinstance(payload.get('data'), dict) else (payload or {})
    seg_code = clean_str(data.get('segment_code')).upper()
    if seg_code not in VALID_SEGMENTS:
        raise ValueError(f"فئة المقاس غير صالحة. القيم المسموحة: {', '.join(VALID_SEGMENTS)}")
    size_label = clean_str(data.get('size_label'))
    if not size_label:
        raise ValueError("اسم المقاس (size_label) مطلوب")
    seg_name_ar = clean_str(data.get('segment_name_ar')) or seg_code
    display_unit = clean_str(data.get('display_unit') or 'cm')

    rec_id = clean_str(matrix_id or data.get('id')) or generate_id('SM')
    extra_raw = data.get('extra_measurements_json')
    if isinstance(extra_raw, str):
        try:
            extra_raw = json.loads(extra_raw)
        except Exception:
            extra_raw = {}
    extra_json = json.dumps(extra_raw if isinstance(extra_raw, dict) else {}, ensure_ascii=False)

    def _opt_dec(val):
        if val is None or str(val).strip() == '':
            return None
        return to_decimal(val)

    chest = _opt_dec(data.get('chest_cm'))
    waist = _opt_dec(data.get('waist_cm'))
    hip = _opt_dec(data.get('hip_cm'))
    dress_len = _opt_dec(data.get('dress_length_cm'))
    shoulder = _opt_dec(data.get('shoulder_cm'))
    sleeve = _opt_dec(data.get('sleeve_cm'))
    fab_factor = to_decimal(data.get('fabric_factor') if data.get('fabric_factor') is not None else '1')
    sort_order = int(to_decimal(data.get('sort_order') or 0))
    is_active = bool(data.get('is_active', True))
    user_id = get_active_user_context('admin')

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT id FROM public.standard_size_matrices WHERE id = %s LIMIT 1;", (rec_id,))
        exists = bool(cur.fetchone())
        cur.execute("""
            INSERT INTO public.standard_size_matrices (
                id, segment_code, segment_name_ar, size_label, display_unit,
                chest_cm, waist_cm, hip_cm, dress_length_cm, shoulder_cm, sleeve_cm,
                extra_measurements_json, fabric_factor, sort_order, is_active, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                segment_code = EXCLUDED.segment_code,
                segment_name_ar = EXCLUDED.segment_name_ar,
                size_label = EXCLUDED.size_label,
                display_unit = EXCLUDED.display_unit,
                chest_cm = EXCLUDED.chest_cm,
                waist_cm = EXCLUDED.waist_cm,
                hip_cm = EXCLUDED.hip_cm,
                dress_length_cm = EXCLUDED.dress_length_cm,
                shoulder_cm = EXCLUDED.shoulder_cm,
                sleeve_cm = EXCLUDED.sleeve_cm,
                extra_measurements_json = EXCLUDED.extra_measurements_json,
                fabric_factor = EXCLUDED.fabric_factor,
                sort_order = EXCLUDED.sort_order,
                is_active = EXCLUDED.is_active,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        """, (
            rec_id, seg_code, seg_name_ar, size_label, display_unit,
            chest, waist, hip, dress_len, shoulder, sleeve,
            extra_json, fab_factor, sort_order, is_active,
        ))
        saved = _format_row(cur.fetchone())
        log_audit_event(
            entity_type='standard_size_matrices',
            entity_id=rec_id,
            action='UPDATE' if exists else 'INSERT',
            new_values={'id': rec_id, 'segment_code': seg_code, 'size_label': size_label},
            user_id=user_id,
            document_no=rec_id,
            details=f"حفظ مقاس قياسي {size_label} ({seg_code})",
            cur=cur,
        )

    invalidate_ref('size_matrices:')
    return saved


def delete_size_matrix(matrix_id):
    rec_id = clean_str(matrix_id)
    if not rec_id:
        raise ValueError("معرف المقاس القياسي مطلوب")
    user_id = get_active_user_context('admin')
    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            UPDATE public.standard_size_matrices
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING *;
        """, (rec_id,))
        row = cur.fetchone()
        if not row:
            raise ValueError(f"لم يتم العثور على المقاس القياسي: {rec_id}")
        log_audit_event(
            entity_type='standard_size_matrices',
            entity_id=rec_id,
            action='DEACTIVATE',
            user_id=user_id,
            document_no=rec_id,
            details=f"تعطيل المقاس القياسي {rec_id}",
            cur=cur,
        )
    invalidate_ref('size_matrices:')
    return _format_row(row)
