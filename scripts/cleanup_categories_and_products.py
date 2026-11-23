# scripts/cleanup_categories_and_products.py
# Atomic cleanup & synchronization for product_categories and products tables
import sys
import os
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import db_client
from services.pg.pg_audit import log_audit_event
from services.pg.db_pool import generate_id

def run_atomic_cleanup():
    print("🚀 Starting atomic cleanup and synchronization...")
    with db_client.get_db_cursor(commit=True) as cur:
        # 1. Fetch active user dynamically from users table
        cur.execute("SELECT id FROM users ORDER BY created_at ASC LIMIT 1;")
        user_row = cur.fetchone()
        active_user_id = user_row['id'] if user_row else None
        print(f"👤 Resolved active user for migration: {active_user_id}")

        # 2. Identify and delete orphan/test categories from product_categories
        cur.execute("""
            SELECT id, name FROM product_categories 
            WHERE TRIM(name) NOT IN (
                SELECT DISTINCT TRIM(category) 
                FROM products 
                WHERE category IS NOT NULL AND TRIM(category) != '' 
                  AND (COALESCE(base_price, 0) > 0 OR COALESCE(cost_price, 0) > 0)
            );
        """)
        orphan_cats = cur.fetchall()
        print(f"🗑️ Found {len(orphan_cats)} orphan categories to delete: {[c['name'] for c in orphan_cats]}")

        for cat in orphan_cats:
            cur.execute("DELETE FROM product_categories WHERE id = %s;", (cat['id'],))
            log_audit_event(
                entity_type='product_categories',
                entity_id=cat['id'],
                action='DELETE',
                old_values=dict(cat),
                user_id=active_user_id,
                document_no=cat['id'],
                details=f"حذف تصنيف فني يتيم أو اختباري غير مرتبط بأي منتج فعلي: {cat['name']}",
                cur=cur
            )

        # 3. Dynamically extract distinct categories from real products only
        cur.execute("""
            SELECT DISTINCT TRIM(category) AS cat_name 
            FROM products 
            WHERE category IS NOT NULL AND TRIM(category) != '' 
              AND (COALESCE(base_price, 0) > 0 OR COALESCE(cost_price, 0) > 0);
        """)
        real_cats = [r['cat_name'] for r in cur.fetchall() if r.get('cat_name')]
        print(f"📦 Real products categories found ({len(real_cats)}): {real_cats}")

        # 4. Insert missing categories into product_categories
        for cat_name in real_cats:
            cur.execute("SELECT id, name FROM product_categories WHERE LOWER(TRIM(name)) = LOWER(TRIM(%s)) LIMIT 1;", (cat_name,))
            existing = cur.fetchone()
            if not existing:
                cat_id = generate_id('CAT')
                cur.execute("""
                    INSERT INTO product_categories (id, name, created_by, created_at)
                    VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                    RETURNING id, name, created_by, created_at;
                """, (cat_id, cat_name, active_user_id))
                inserted = dict(cur.fetchone())
                print(f"✨ Inserted missing category into product_categories: {cat_name} ({cat_id})")
                log_audit_event(
                    entity_type='product_categories',
                    entity_id=cat_id,
                    action='INSERT',
                    new_values=inserted,
                    user_id=active_user_id,
                    document_no=cat_id,
                    details=f"مزامنة وإدراج تلقائي لتصنيف فني مستخرج من المنتجات الفعلية: {cat_name}",
                    cur=cur
                )
            else:
                print(f"ℹ️ Category already exists: {cat_name} ({existing['id']})")

        # 5. Delete zero-dummy products previously created as placeholders
        cur.execute("""
            SELECT id, sku, model_name, category, base_price, cost_price 
            FROM products 
            WHERE (COALESCE(base_price, 0) = 0 AND COALESCE(cost_price, 0) = 0)
              AND id NOT IN (SELECT DISTINCT product_id FROM orders WHERE product_id IS NOT NULL)
              AND id NOT IN (SELECT DISTINCT product_id FROM order_items WHERE product_id IS NOT NULL)
              AND id NOT IN (SELECT DISTINCT product_id FROM production_orders WHERE product_id IS NOT NULL)
              AND id NOT IN (SELECT DISTINCT product_id FROM inventory_transactions WHERE product_id IS NOT NULL)
              AND id NOT IN (SELECT DISTINCT product_id FROM quality_inspections WHERE product_id IS NOT NULL)
              AND id NOT IN (SELECT DISTINCT product_id FROM measurements WHERE product_id IS NOT NULL);
        """)
        dummy_products = cur.fetchall()
        print(f"🗑️ Found {len(dummy_products)} dummy zero-products to delete: {[p['sku'] or p['id'] for p in dummy_products]}")

        for prod in dummy_products:
            cur.execute("DELETE FROM products WHERE id = %s;", (prod['id'],))
            log_audit_event(
                entity_type='products',
                entity_id=prod['id'],
                action='DELETE',
                old_values=dict(prod),
                user_id=active_user_id,
                document_no=prod['sku'] or prod['id'],
                details=f"حذف سجل منتج وهمي صفري التكلفة وسعر البيع كان قد أُنشئ كتصنيف نائب: {prod['model_name']} ({prod['sku']})",
                cur=cur
            )

        print("✅ Atomic transaction completed successfully!")

if __name__ == '__main__':
    run_atomic_cleanup()
