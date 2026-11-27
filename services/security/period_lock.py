# services/security/period_lock.py
# Dynamic Fiscal Period Lock Guard & Period Management Service
# Architectural Standards: Strictly < 220 lines per file

import datetime
from db_client import get_db_cursor
from .error_translator import FiscalPeriodLockedError


def normalize_date(val):
    """Normalize date value to datetime.date object and string YYYY-MM-DD."""
    if not val:
        d = datetime.date.today()
        return d, d.strftime("%Y-%m-%d"), d.strftime("%Y-%m")
    if isinstance(val, (datetime.date, datetime.datetime)):
        d = val if isinstance(val, datetime.date) else val.date()
        return d, d.strftime("%Y-%m-%d"), d.strftime("%Y-%m")
    val_str = str(val).strip()[:10]
    try:
        d = datetime.datetime.strptime(val_str, "%Y-%m-%d").date()
        return d, val_str, val_str[:7]
    except Exception:
        d = datetime.date.today()
        return d, d.strftime("%Y-%m-%d"), d.strftime("%Y-%m")


def assert_period_open(cur, tx_date):
    """
    Central financial period guard.
    Raises FiscalPeriodLockedError if tx_date falls into a locked fiscal period.
    """
    d_obj, d_str, period_key = normalize_date(tx_date)

    cur.execute("""
        SELECT period_key, is_locked, locked_by, locked_at
        FROM public.fiscal_periods
        WHERE (start_date <= %s AND end_date >= %s) OR period_key = %s
        LIMIT 1;
    """, (d_obj, d_obj, period_key))
    row = cur.fetchone()

    if row and row.get('is_locked'):
        raise FiscalPeriodLockedError("الفترة المحاسبية مغلقة ولا يمكن الترحيل فيها")
    return True


def get_fiscal_periods():
    """Retrieve all defined fiscal periods ordered by period key."""
    with get_db_cursor(commit=False) as cur:
        cur.execute("""
            SELECT period_key, start_date, end_date, is_locked, locked_by, locked_at, notes, created_at
            FROM public.fiscal_periods
            ORDER BY period_key ASC;
        """)
        rows = cur.fetchall() or []
        res = []
        for r in rows:
            item = dict(r)
            if item.get('start_date'): item['start_date'] = str(item['start_date'])
            if item.get('end_date'): item['end_date'] = str(item['end_date'])
            if item.get('locked_at'): item['locked_at'] = str(item['locked_at'])
            if item.get('created_at'): item['created_at'] = str(item['created_at'])
            res.append(item)
        return res


def toggle_fiscal_period(period_key, is_locked, user_id=None, notes=None):
    """Lock or unlock a fiscal period dynamically with audit trail."""
    period_key = str(period_key or "").strip()
    if not period_key or len(period_key) < 7:
        raise ValueError("رمز الفترة المحاسبية غير صالح (الصيغة المطلوبة: YYYY-MM)")

    parts = period_key.split('-')
    year, month = int(parts[0]), int(parts[1])
    import calendar
    last_day = calendar.monthrange(year, month)[1]
    start_d = f"{year:04d}-{month:02d}-01"
    end_d = f"{year:04d}-{month:02d}-{last_day:02d}"

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            INSERT INTO public.fiscal_periods (period_key, start_date, end_date, is_locked, locked_by, locked_at, notes)
            VALUES (%s, %s, %s, %s, %s, CASE WHEN %s THEN CURRENT_TIMESTAMP ELSE NULL END, %s)
            ON CONFLICT (period_key) DO UPDATE SET
                is_locked = EXCLUDED.is_locked,
                locked_by = EXCLUDED.locked_by,
                locked_at = EXCLUDED.locked_at,
                notes = COALESCE(EXCLUDED.notes, fiscal_periods.notes)
            RETURNING *;
        """, (period_key, start_d, end_d, is_locked, user_id, is_locked, notes))
        row = dict(cur.fetchone())
        try:
            from services.pg.pg_audit import log_audit_event
            log_audit_event(
                entity_type='FISCAL_PERIOD',
                entity_id=period_key,
                action='LOCK' if is_locked else 'UNLOCK',
                new_values={'period_key': period_key, 'is_locked': bool(is_locked), 'notes': notes},
                user_id=user_id,
                document_no=period_key,
                details=f"{'قفل' if is_locked else 'فتح'} الفترة المحاسبية {period_key}",
                cur=cur
            )
        except Exception:
            pass
        if row.get('start_date'): row['start_date'] = str(row['start_date'])
        if row.get('end_date'): row['end_date'] = str(row['end_date'])
        if row.get('locked_at'): row['locked_at'] = str(row['locked_at'])
        if row.get('created_at'): row['created_at'] = str(row['created_at'])
        return row
