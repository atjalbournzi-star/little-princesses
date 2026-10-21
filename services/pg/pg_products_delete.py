# services/pg/pg_products_delete.py
# Safe product and BOM model deletion with cascading archive protection

from .db_pool import get_db_cursor, clean_str

def delete_product(payload):
    data = payload.get('data') if isinstance(payload, dict) and isinstance(payload.get('data'), dict) else payload
    pid = clean_str(data.get('id') if isinstance(data, dict) else payload)
    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT COUNT(*) as cnt FROM orders WHERE product_id = %s;", (pid,))
        r = cur.fetchone()
        if r and r['cnt'] > 0:
            cur.execute("UPDATE products SET status = 'Inactive' WHERE id = %s;", (pid,))
            return {"deleted": False, "archived": True, "success": True, "id": pid, "message": "تم تعطيل وأرشفة الموديل لوجود طلبات مبيعات سابقة مرتبطة به 📦"}
        cur.execute("DELETE FROM production_orders WHERE product_id = %s;", (pid,))
        cur.execute("DELETE FROM products WHERE id = %s;", (pid,))
    return {"deleted": True, "success": True, "id": pid, "message": "تم حذف الموديل بنجاح 🗑️"}

def delete_bom_model(payload):
    return delete_product(payload)
