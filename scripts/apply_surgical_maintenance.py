# scripts/apply_surgical_maintenance.py
# Surgical maintenance and atomic synchronization across Little Princesses ERP PostgreSQL database
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.pg.db_pool import get_db_cursor, generate_id
from services.pg.pg_audit import log_audit_event, resolve_active_user_id

def run_surgical_maintenance():
    print("🚀 بدء تنفيذ المعاملة الذرية للصيانة والتصحيح الجراحي...")

    with get_db_cursor(commit=True) as cur:
        # استخراج معرف المستخدم الإداري النشط ديناميكياً من جدول users دون أي قيم ثابتة
        admin_uid = resolve_active_user_id(cur)
        print(f"👤 المستخدم الإداري المعتمد للعملية: {admin_uid}")

        # =========================================================================
        # المحور الأول: تنظيف وفصل التصنيفات الفنية وربطها بجدول product_categories
        # =========================================================================
        print("\n--- [المحور 1]: تنظيف product_categories وفصلها عن المنتجات الوهمية ---")

        # 1. حذف السجلات التجريبية واليتيمة من product_categories غير المرتبطة بأي منتج فعلي
        cur.execute("""
            DELETE FROM product_categories
            WHERE TRIM(name) NOT IN (
                SELECT DISTINCT TRIM(category)
                FROM products
                WHERE (base_price > 0 OR cost_price > 0)
                  AND category IS NOT NULL
                  AND TRIM(category) != ''
            );
        """)
        deleted_orphan_cats = cur.rowcount
        print(f"  ✓ تم حذف {deleted_orphan_cats} تصنيف يتيم/تجريبي من product_categories")

        # 2. استخراج جميع التصنيفات الفعلية من products وإدراج غير الموجود منها في product_categories
        cur.execute("""
            SELECT DISTINCT TRIM(category) AS cat_name
            FROM products
            WHERE (base_price > 0 OR cost_price > 0)
              AND category IS NOT NULL
              AND TRIM(category) != '';
        """)
        real_cats = [r['cat_name'] for r in cur.fetchall()]
        inserted_cats = 0
        for cat in real_cats:
            cur.execute("SELECT id FROM product_categories WHERE LOWER(TRIM(name)) = LOWER(TRIM(%s)) LIMIT 1;", (cat,))
            if not cur.fetchone():
                c_id = generate_id('CAT')
                cur.execute("""
                    INSERT INTO product_categories (id, name, created_by, created_at)
                    VALUES (%s, %s, %s, CURRENT_TIMESTAMP);
                """, (c_id, cat, admin_uid))
                log_audit_event(
                    entity_type='product_categories', entity_id=c_id, action='INSERT',
                    new_values={'id': c_id, 'name': cat}, user_id=admin_uid, document_no=c_id,
                    details=f"مزامنة وإدراج التصنيف الفني الفعلي: {cat}", cur=cur
                )
                inserted_cats += 1
        print(f"  ✓ تم إدراج {inserted_cats} تصنيف فعلي غير مسجل في product_categories")

        # 3. حذف السجلات الوهمية التي أُنشئت سابقاً كتصنيفات نائبة في products
        cur.execute("""
            DELETE FROM products
            WHERE base_price = 0 
              AND cost_price = 0
              AND id NOT IN (SELECT DISTINCT product_id FROM orders WHERE product_id IS NOT NULL)
              AND id NOT IN (SELECT DISTINCT model_id FROM orders WHERE model_id IS NOT NULL)
              AND sku NOT IN (SELECT DISTINCT model_id FROM orders WHERE model_id IS NOT NULL)
              AND id NOT IN (SELECT DISTINCT product_id FROM order_items WHERE product_id IS NOT NULL)
              AND id NOT IN (SELECT DISTINCT model_id FROM order_items WHERE model_id IS NOT NULL)
              AND sku NOT IN (SELECT DISTINCT model_id FROM order_items WHERE model_id IS NOT NULL)
              AND id NOT IN (SELECT DISTINCT product_id FROM production_orders WHERE product_id IS NOT NULL)
              AND id NOT IN (SELECT DISTINCT model_id FROM production_orders WHERE model_id IS NOT NULL)
              AND sku NOT IN (SELECT DISTINCT model_id FROM production_orders WHERE model_id IS NOT NULL);
        """)
        deleted_dummy_prods = cur.rowcount
        print(f"  ✓ تم حذف {deleted_dummy_prods} سجل وهمي/نائب من products")

        # =========================================================================
        # المحور الثاني: مزامنة رمز المنتج النهائي مع رمز الموديل والتصميم والباركود
        # =========================================================================
        print("\n--- [المحور 2]: مزامنة model_no و design_code و barcode مع SKU في products ---")
        cur.execute("""
            UPDATE products
            SET model_no = sku,
                design_code = sku,
                barcode = CASE 
                    WHEN barcode = model_no OR barcode LIKE 'LP-%' OR barcode = '' OR barcode IS NULL 
                    THEN sku 
                    ELSE barcode 
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE (base_price > 0 OR cost_price > 0)
              AND (model_no != sku OR design_code != sku OR (barcode LIKE 'LP-%' AND barcode != sku));
        """)
        synced_products = cur.rowcount
        print(f"  ✓ تم مزامنة {synced_products} منتج فعلي ليتطابق model_no و design_code و barcode مع SKU")

        # مزامنة barcode داخل bom JSONB إذا وجد
        cur.execute("""
            UPDATE products
            SET bom = jsonb_set(bom, '{meta,barcode}', to_jsonb(sku))
            WHERE (base_price > 0 OR cost_price > 0)
              AND bom ? 'meta'
              AND (bom->'meta'->>'barcode' != sku);
        """)
        synced_bom_prods = cur.rowcount
        if synced_bom_prods > 0:
            print(f"  ✓ تم تحديث باركود BOM في {synced_bom_prods} منتج")

        # =========================================================================
        # المحور الثالث: إحكام الربط الهرمي لحسابات المستودعات في chart_of_accounts
        # =========================================================================
        print("\n--- [المحور 3]: إحكام ربط parent_account_id في chart_of_accounts (Self-Join) ---")
        cur.execute("""
            UPDATE chart_of_accounts child
            SET parent_account_id = parent.id
            FROM chart_of_accounts parent
            WHERE (child.parent_account_id IS NULL OR child.parent_account_id = '')
              AND (child.parent_account_code IS NOT NULL AND child.parent_account_code != '')
              AND child.parent_account_code = parent.account_code;
        """)
        synced_accounts = cur.rowcount
        print(f"  ✓ تم ربط {synced_accounts} حساب فرعي بمعرف الحساب الأب (parent_account_id) عبر Self-Join")

        # توثيق الحدث الشامل في سجل التدقيق audit_logs
        log_audit_event(
            entity_type='system_maintenance', entity_id='SURGICAL_MAINTENANCE_V1',
            action='EXECUTE', user_id=admin_uid, document_no='MAINT-2026-V1',
            details=f"تنفيذ صيانة جراحية ذرية: تصنيفات {deleted_orphan_cats} محذوفة، منتجات {synced_products} متزامنة، حسابات {synced_accounts} مربوطة",
            cur=cur
        )

    print("\n✅ اكتملت المعاملة الذرية بنجاح وتم تثبيتها (Committed) في قاعدة البيانات!")

if __name__ == '__main__':
    run_surgical_maintenance()
