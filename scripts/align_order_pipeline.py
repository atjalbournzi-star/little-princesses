# scripts/align_order_pipeline.py
# Production-Ready Architecture & Data Pipeline Alignment
# Little Princesses ERP - Self-Healing & End-to-End Alignment Script

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import json
from services.pg.db_pool import get_db_cursor, clean_num, clean_str, generate_id, today_str
from services.pg.pg_account_code import generate_sequential_voucher_no
from services.pg.pg_order_stages import create_order_stages, resolve_product_stages


def align_pipeline():
    print("🚀 Starting Little Princesses ERP Pipeline Alignment...")
    with get_db_cursor(commit=True) as cur:
        # ---------------------------------------------------------
        # 1. SPECIFIC HEALING: ORD-2501587-C4D6
        # ---------------------------------------------------------
        cur.execute("""
            SELECT o.*, c.name as customer_name, ch.child_name
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN children ch ON o.child_id = ch.id
            WHERE o.id = 'ORD-2501587-C4D6' OR o.order_no = 'ORD-2026-1020-12';
        """)
        target_order = cur.fetchone()
        if target_order:
            o_id = target_order['id']
            o_no = target_order['order_no']
            c_id = target_order['customer_id']
            ch_id = target_order['child_id']
            p_id = target_order['product_id']
            paid = float(target_order['paid_amount'] or 5000.0)
            tot = float(target_order['total_amount'] or 12500.0)
            rem = float(target_order['remaining_amount'] or (tot - paid))

            cur.execute("""
                SELECT id, fabrics_data, model_name
                FROM measurements
                WHERE child_id = %s OR customer_id = %s
                ORDER BY created_at DESC LIMIT 1;
            """, (ch_id, c_id))
            m_row = cur.fetchone()
            meas_id = m_row['id'] if m_row else None
            m_fabrics = json.dumps(m_row.get('fabrics_data') or [], ensure_ascii=False) if m_row else '[]'

            cur.execute("SELECT id FROM order_items WHERE order_id = %s;", (o_id,))
            items = cur.fetchall()
            for itm in items:
                cur.execute("""
                    UPDATE order_items
                    SET measurement_id = COALESCE(%s, measurement_id),
                        fabrics_data = %s::jsonb,
                        paid_amount = %s,
                        remaining_amount = %s,
                        total_amount = %s,
                        total_price = %s,
                        model_image = ''
                    WHERE id = %s;
                """, (meas_id, m_fabrics, paid, rem, tot, tot, itm['id']))
                stages = create_order_stages(cur, o_id, itm['id'], p_id, 'فستان موف', f"PO-{o_no}")
                print(f"✅ Generated {len(stages)} stages for ORD-2501587-C4D6 item {itm['id']}")

            po_no = f"PO-{o_no}"
            cur.execute("SELECT id FROM production_orders WHERE order_id = %s OR production_order_no = %s LIMIT 1;", (o_id, po_no))
            if not cur.fetchone():
                cur.execute("""
                    INSERT INTO production_orders (
                        id, production_order_no, order_id, customer_id, customer_name, product_id, model_id, product_name, child_name,
                        selected_color, color, model_image, product_image, stage, progress, status,
                        total_amount, deposit_amount, remaining_amount, fabrics_data, notes
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'فستان موف', %s, 'ابيض', 'ابيض', '', '', 'القص والتحضير ✂️', 20, 'In Progress', %s, %s, %s, %s::jsonb, 'طلب تفصيل سندس')
                    ON CONFLICT (production_order_no) DO NOTHING;
                """, (generate_id("PRD"), po_no, o_id, c_id, target_order.get('customer_name') or 'ام سندس', p_id, p_id, target_order.get('child_name') or 'سندس', tot, paid, rem, m_fabrics))
                print(f"✅ Created production order {po_no} for factory floor WIP")

        # ---------------------------------------------------------
        # 2. UNIVERSAL ORDER & ORDER_ITEMS HEALING
        # ---------------------------------------------------------
        cur.execute("SELECT * FROM orders ORDER BY created_at ASC;")
        all_orders = cur.fetchall()
        print(f"📦 Auditing {len(all_orders)} total orders in system...")

        for ord_row in all_orders:
            ord_id = ord_row['id']
            ord_no = ord_row['order_no']
            cust_id = ord_row['customer_id']
            ch_id = ord_row['child_id']
            p_id = ord_row['product_id']
            ord_paid = float(ord_row['paid_amount'] or 0.0)
            ord_tot = float(ord_row['total_amount'] or 0.0)
            ord_rem = float(ord_row['remaining_amount'] or max(0.0, ord_tot - ord_paid))
            ord_color = clean_str(ord_row.get('selected_color') or ord_row.get('color') or '')

            cur.execute("""
                SELECT id, fabrics_data, model_name, child_name
                FROM measurements
                WHERE (child_id = %s AND child_id IS NOT NULL) OR (customer_id = %s)
                ORDER BY created_at DESC LIMIT 1;
            """, (ch_id, cust_id))
            meas_row = cur.fetchone()
            dyn_meas_id = meas_row['id'] if meas_row else None
            dyn_fb_json = json.dumps(meas_row.get('fabrics_data') or [], ensure_ascii=False) if (meas_row and meas_row.get('fabrics_data')) else None

            cur.execute("SELECT * FROM order_items WHERE order_id = %s;", (ord_id,))
            ord_items = cur.fetchall()

            if not ord_items and p_id:
                new_item_id = generate_id("OITM")
                cur.execute("""
                    INSERT INTO order_items (
                        id, order_id, product_id, model_id, measurement_id, product_name,
                        selected_color, color, model_image, image_url, quantity, unit_price,
                        total_price, total_amount, paid_amount, remaining_amount, fabrics_data
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, '', '', 1, %s, %s, %s, %s, %s, %s::jsonb);
                """, (new_item_id, ord_id, p_id, p_id, dyn_meas_id, meas_row.get('model_name') if meas_row else 'فستان أميرات', ord_color, ord_color, ord_tot, ord_tot, ord_tot, ord_paid, ord_rem, dyn_fb_json or '[]'))
                ord_items = [{'id': new_item_id, 'measurement_id': dyn_meas_id, 'product_id': p_id, 'product_name': meas_row.get('model_name') if meas_row else 'فستان أميرات'}]

            for itm in ord_items:
                cur_meas = itm.get('measurement_id') or dyn_meas_id
                cur_fb = itm.get('fabrics_data')
                fb_str = json.dumps(cur_fb, ensure_ascii=False) if (cur_fb and cur_fb != []) else (dyn_fb_json or '[]')
                cur.execute("""
                    UPDATE order_items
                    SET measurement_id = COALESCE(order_items.measurement_id, %s),
                        fabrics_data = CASE WHEN order_items.fabrics_data IS NULL OR order_items.fabrics_data = '[]'::jsonb THEN %s::jsonb ELSE order_items.fabrics_data END,
                        paid_amount = CASE WHEN order_items.paid_amount = 0 THEN %s ELSE order_items.paid_amount END,
                        remaining_amount = CASE WHEN order_items.remaining_amount = 0 THEN %s ELSE order_items.remaining_amount END,
                        model_image = CASE WHEN length(order_items.model_image) > 500 THEN '' ELSE order_items.model_image END
                    WHERE id = %s;
                """, (cur_meas, fb_str, ord_paid, ord_rem, itm['id']))

                cur.execute("SELECT COUNT(*) as cnt FROM order_stages WHERE order_item_id = %s;", (itm['id'],))
                if cur.fetchone()['cnt'] == 0:
                    prod_ref = itm.get('product_id') or p_id
                    p_name = itm.get('product_name') or (meas_row.get('model_name') if meas_row else 'فستان أميرات')
                    create_order_stages(cur, ord_id, itm['id'], prod_ref, p_name, f"PO-{ord_no}")
                    print(f"  ⚡ Auto-generated 5 stages for order {ord_no} item {itm['id']}")

            po_key = f"PO-{ord_no}"
            cur.execute("SELECT id FROM production_orders WHERE order_id = %s OR production_order_no = %s LIMIT 1;", (ord_id, po_key))
            if not cur.fetchone():
                cur.execute("""
                    INSERT INTO production_orders (
                        id, production_order_no, order_id, customer_id, product_id, model_id, product_name, child_name,
                        selected_color, color, model_image, product_image, stage, progress, status,
                        total_amount, deposit_amount, remaining_amount, fabrics_data, notes
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, '', '', 'القص والتحضير ✂️', 20, 'In Progress', %s, %s, %s, %s::jsonb, %s)
                    ON CONFLICT (production_order_no) DO NOTHING;
                """, (generate_id("PRD"), po_key, ord_id, cust_id, p_id, p_id, meas_row.get('model_name') if meas_row else 'فستان أميرات', meas_row.get('child_name') if meas_row else '', ord_color, ord_color, ord_tot, ord_paid, ord_rem, dyn_fb_json or '[]', f"طلب تفصيل {ord_no}"))

        # ---------------------------------------------------------
        # 3. BASE64 IMAGE CLEANUP (STORAGE RATIONALIZATION)
        # ---------------------------------------------------------
        cur.execute("UPDATE customers SET model_image = '' WHERE model_image LIKE 'data:image%' AND length(model_image) > 500;")
        cur.execute("UPDATE orders SET model_image = '' WHERE model_image LIKE 'data:image%' AND length(model_image) > 500;")
        cur.execute("UPDATE order_items SET model_image = '' WHERE model_image LIKE 'data:image%' AND length(model_image) > 500;")
        cur.execute("UPDATE production_orders SET model_image = '', product_image = '' WHERE (model_image LIKE 'data:image%' AND length(model_image) > 500) OR (product_image LIKE 'data:image%' AND length(product_image) > 500);")
        print("🧹 Cleaned redundant heavy Base64 strings from customers and order_items tables.")

        # ---------------------------------------------------------
        # 4. SEQUENTIAL VOUCHER NUMBERING & ACCOUNTING UNIFICATION
        # ---------------------------------------------------------
        # Standardize fragmented vouchers like RV-CUST-*, REC-* to sequential RV-YYYY-MMDD-XX
        cur.execute("""
            SELECT id, payment_no, payment_type, date, customer_id, party_name, amount, notes
            FROM payments
            WHERE (payment_no LIKE 'RV-CUST-%%' OR payment_no LIKE 'REC-%%')
              AND notes NOT ILIKE '%%رأس المال%%'
            ORDER BY created_at ASC;
        """)
        frag_vouchers = cur.fetchall()
        print(f"📑 Standardizing {len(frag_vouchers)} fragmented receipt vouchers...")
        for fv in frag_vouchers:
            p_date_str = str(fv.get('date') or today_str())
            new_pno = generate_sequential_voucher_no(cur, 'Receipt', p_date_str)
            old_pno = fv['payment_no']
            cur.execute("UPDATE payments SET payment_no = %s, target_account_id = 'ACC-202' WHERE id = %s;", (new_pno, fv['id']))

            old_jv = f"AUTO-VCH-{old_pno}"
            new_jv = f"AUTO-VCH-{new_pno}"
            cur.execute("UPDATE journal_entries SET entry_no = %s, credit_account_id = 'ACC-202' WHERE entry_no = %s OR ref_id = %s;", (new_jv, old_jv, fv['id']))
            cur.execute("""
                UPDATE journal_entry_lines
                SET account_id = 'ACC-202', line_description = 'دائن - أمانات وعرابين فساتين'
                WHERE entry_id IN (SELECT id FROM journal_entries WHERE entry_no = %s) AND credit > 0;
            """, (new_jv,))
            print(f"  🔄 Converted voucher {old_pno} -> {new_pno} (Liability 202)")

        # ---------------------------------------------------------
        # 5. ACCOUNTING PURGE OF PREMATURE REVENUE (401) FOR ORDERS NOT DELIVERED
        # ---------------------------------------------------------
        cur.execute("""
            SELECT j.id, j.entry_no, j.ref_id, o.status as order_status, o.order_no
            FROM journal_entries j
            JOIN orders o ON (j.ref_id = o.id OR j.entry_no = 'JV-' || o.order_no OR j.entry_no = 'AUTO-INV-' || o.order_no OR j.entry_no = 'JV-INV-' || o.order_no)
            WHERE j.ref_type IN ('Order', 'Invoice')
              AND j.credit_account_id = 'ACC-401'
              AND o.status != 'delivered'
              AND j.notes NOT ILIKE '%%رأس المال%%'
              AND j.notes NOT ILIKE '%%PUR-%%';
        """)
        premature_jvs = cur.fetchall()
        print(f"⚖️ Found {len(premature_jvs)} premature 401 revenue entries for in-production orders.")
        for pjv in premature_jvs:
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (pjv['id'],))
            cur.execute("DELETE FROM journal_entries WHERE id = %s;", (pjv['id'],))
            print(f"  🚫 Removed premature revenue JV {pjv['entry_no']} for non-delivered order {pjv['order_no']}")

        print("✨ End-to-end alignment completed successfully!")


if __name__ == '__main__':
    align_pipeline()
