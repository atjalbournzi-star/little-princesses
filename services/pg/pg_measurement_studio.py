# services/pg/pg_measurement_studio.py
# Little Princesses ERP - A4 Homography Measurement Studio Persistence Layer
# Architecture Standard: Rule 1, 3 & 5 (< 220 lines, atomic transactions, soft-delete)

import json
import logging
from services.pg.db_pool import get_db_cursor, clean_str, now_iso

logger = logging.getLogger("pg_measurement_studio")


_STUDIO_SCHEMA_CHECKED = False


def ensure_measurement_studio_schema():
    """Ensure table and indexes exist in Supabase/PostgreSQL."""
    global _STUDIO_SCHEMA_CHECKED
    if _STUDIO_SCHEMA_CHECKED:
        return
    try:
        with get_db_cursor(commit=True) as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS garment_measurements_studio (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    order_id VARCHAR(64) NULL,
                    customer_id VARCHAR(64) NULL REFERENCES customers(id) ON DELETE SET NULL,
                    customer_name VARCHAR(255),
                    image_url TEXT,
                    image_storage_path TEXT,
                    a4_orientation VARCHAR(16) DEFAULT 'portrait',
                    a4_corners JSONB NOT NULL DEFAULT '[]'::jsonb,
                    homography_matrix JSONB NOT NULL DEFAULT '[]'::jsonb,
                    measurements_data JSONB NOT NULL DEFAULT '[]'::jsonb,
                    diagnostics JSONB DEFAULT '{}'::jsonb,
                    preferred_unit VARCHAR(8) DEFAULT 'cm',
                    status VARCHAR(32) DEFAULT 'draft',
                    notes TEXT,
                    created_by VARCHAR(100),
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW(),
                    is_deleted BOOLEAN DEFAULT FALSE
                );
                CREATE INDEX IF NOT EXISTS idx_studio_meas_order_id ON garment_measurements_studio(order_id);
                CREATE INDEX IF NOT EXISTS idx_studio_meas_customer_id ON garment_measurements_studio(customer_id);
                CREATE INDEX IF NOT EXISTS idx_studio_meas_status ON garment_measurements_studio(status);
                CREATE INDEX IF NOT EXISTS idx_studio_meas_is_deleted ON garment_measurements_studio(is_deleted);
                CREATE INDEX IF NOT EXISTS idx_studio_meas_created_at ON garment_measurements_studio(created_at DESC);
            """)
        _STUDIO_SCHEMA_CHECKED = True
    except Exception as e:
        logger.warning(f"Schema verification notice: {e}")


def _serialize_json(val, default):
    if val is None:
        return json.dumps(default)
    if isinstance(val, (dict, list)):
        return json.dumps(val, ensure_ascii=False)
    if isinstance(val, str):
        try:
            json.loads(val)
            return val
        except Exception:
            return json.dumps(default)
    return json.dumps(default)


def save_measurement_session(payload: dict) -> dict:
    """Atomic Upsert for A4 Homography Studio measurement sessions."""
    ensure_measurement_studio_schema()
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload

    session_id = clean_str(data.get("id")) or None
    order_id = clean_str(data.get("order_id") or data.get("orderId")) or None
    raw_cust_id = clean_str(data.get("customer_id") or data.get("customerId")) or None
    customer_name = clean_str(data.get("customer_name") or data.get("customerName"))
    image_url = clean_str(data.get("image_url") or data.get("imageUrl")) or None
    storage_path = clean_str(data.get("image_storage_path") or data.get("imageStoragePath")) or None
    orientation = clean_str(data.get("a4_orientation") or data.get("a4Orientation") or "portrait")
    unit = clean_str(data.get("preferred_unit") or data.get("preferredUnit") or data.get("unit") or "cm")
    status = clean_str(data.get("status") or "draft")
    notes = clean_str(data.get("notes")) or None
    created_by = clean_str(data.get("created_by") or data.get("createdBy") or "المصمم")

    corners_json = _serialize_json(data.get("a4_corners") or data.get("a4Corners"), [])
    homography_json = _serialize_json(data.get("homography_matrix") or data.get("H_imgToWorld") or data.get("homographyMatrix"), [])
    measurements_json = _serialize_json(data.get("measurements_data") or data.get("measurements") or data.get("measurementsData"), [])
    diagnostics_json = _serialize_json(data.get("diagnostics"), {})

    with get_db_cursor(commit=True) as cur:
        # Validate customer foreign key safely
        valid_cust_id = None
        if raw_cust_id:
            cur.execute("SELECT id FROM customers WHERE id = %s LIMIT 1;", (raw_cust_id,))
            c_row = cur.fetchone()
            if c_row:
                valid_cust_id = c_row.get("id")

        saved_row = None
        if session_id:
            cur.execute("""
                UPDATE garment_measurements_studio
                SET order_id = %s, customer_id = %s, customer_name = %s,
                    image_url = %s, image_storage_path = %s, a4_orientation = %s,
                    a4_corners = %s::jsonb, homography_matrix = %s::jsonb,
                    measurements_data = %s::jsonb, diagnostics = %s::jsonb,
                    preferred_unit = %s, status = %s, notes = %s, updated_at = NOW()
                WHERE id = %s::uuid AND is_deleted = FALSE
                RETURNING *;
            """, (
                order_id, valid_cust_id, customer_name,
                image_url, storage_path, orientation,
                corners_json, homography_json,
                measurements_json, diagnostics_json,
                unit, status, notes, session_id
            ))
            saved_row = cur.fetchone()

        if not saved_row:
            cur.execute("""
                INSERT INTO garment_measurements_studio (
                    id, order_id, customer_id, customer_name,
                    image_url, image_storage_path, a4_orientation,
                    a4_corners, homography_matrix, measurements_data,
                    diagnostics, preferred_unit, status, notes, created_by
                ) VALUES (COALESCE(%s::uuid, gen_random_uuid()), %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s, %s, %s, %s)
                RETURNING *;
            """, (session_id, order_id, valid_cust_id, customer_name, image_url, storage_path, orientation, corners_json, homography_json, measurements_json, diagnostics_json, unit, status, notes, created_by))
            saved_row = cur.fetchone()

        return dict(saved_row) if saved_row else {}


def get_measurement_session_by_order(identifier: str) -> dict:
    """Fetch the latest active measurement studio session by order_id or session UUID."""
    if not identifier:
        return {}
    ensure_measurement_studio_schema()
    ident = clean_str(identifier)
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT * FROM garment_measurements_studio
            WHERE is_deleted = FALSE AND (
                order_id = %s OR id::text = %s
            )
            ORDER BY created_at DESC
            LIMIT 1;
        """, (ident, ident))
        row = cur.fetchone()
        if row:
            return dict(row)
        try:
            cur.execute("SELECT order_no, customer_name, customer_id, model_image, product_image FROM orders WHERE id::text = %s OR order_no = %s LIMIT 1;", (ident, ident))
            o_row = cur.fetchone()
            if o_row:
                return {"order_id": o_row.get("order_no") or ident, "customer_name": o_row.get("customer_name") or "", "customer_id": o_row.get("customer_id"), "image_url": o_row.get("model_image") or o_row.get("product_image"), "status": "draft"}
        except Exception:
            pass
        return {}


def get_recent_measurement_sessions(limit: int = 20) -> list:
    """List recent measurement studio sessions for quick retrieval."""
    ensure_measurement_studio_schema()
    safe_limit = max(1, min(int(limit or 20), 100))
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT id, order_id, customer_id, customer_name, a4_orientation,
                   preferred_unit, status, notes, created_by, created_at, updated_at,
                   diagnostics,
                   jsonb_array_length(CASE WHEN jsonb_typeof(measurements_data) = 'array' THEN measurements_data ELSE '[]'::jsonb END) AS lines_count
            FROM garment_measurements_studio
            WHERE is_deleted = FALSE
            ORDER BY created_at DESC
            LIMIT %s;
        """, (safe_limit,))
        return [dict(r) for r in cur.fetchall() or []]


def approve_measurement_session(payload: dict) -> dict:
    """Approve measurement session and mark ready for atelier production."""
    ensure_measurement_studio_schema()
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    target = clean_str(data.get("id") or data.get("order_id") or data.get("orderId"))
    next_status = clean_str(data.get("status") or "approved")

    if not target:
        raise ValueError("معرف الجلسة أو رقم الطلب مطلوب للاعتماد")

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            UPDATE garment_measurements_studio
            SET status = %s, updated_at = NOW()
            WHERE is_deleted = FALSE AND (id::text = %s OR order_id = %s)
            RETURNING *;
        """, (next_status, target, target))
        row = cur.fetchone()
        if not row:
            raise ValueError(f"لم يتم العثور على جلسة مقاسات بالمعرف {target}")

        try:
            m_data = json.dumps(row.get("measurements_data") or [], ensure_ascii=False)
            ord_id = clean_str(row.get("order_id") or target)
            cur.execute("""
                UPDATE production_orders
                SET measurements_spec = %s::jsonb, updated_at = CURRENT_TIMESTAMP
                WHERE order_id = %s OR production_order_no = %s OR id::text = %s;
            """, (m_data, ord_id, f"PO-{ord_id}", target))
        except Exception as p_err:
            logger.warning(f"Production order spec sync: {p_err}")

        return dict(row)
