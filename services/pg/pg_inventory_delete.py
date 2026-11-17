# services/pg/pg_inventory_delete.py
# Inventory item deletion and associated transaction cleanup

from .db_pool import get_db_cursor, clean_str


def delete_inventory(payload):
    """حذف صنف المخزون وحركاته المرتبطة بأمان"""
    data = payload.get('data') or payload
    iid = clean_str(data.get('id') or data.get('item_id'))
    with get_db_cursor(commit=True) as cur:
        cur.execute("DELETE FROM inventory_transactions WHERE inventory_id = %s;", (iid,))
        cur.execute("DELETE FROM inventory WHERE id = %s;", (iid,))
    return {"deleted": True, "id": iid}
