# inventory_dual_service.py
# Dual Inventory Service - BOM, Finished Stock, Production & Material Accounting

import sqlite3
import datetime
from decimal import Decimal
import json
import urllib.request


def get_db(db_file='little_princesses.db'):
    conn = sqlite3.connect(db_file)
    conn.row_factory = sqlite3.Row
    return conn


def get_dropdown_options(db_file='little_princesses.db'):
    conn = get_db(db_file)
    c = conn.cursor()
    c.execute("SELECT name FROM products ORDER BY name ASC")
    products = [row["name"] for row in c.fetchall()]
    c.execute("SELECT item_name FROM inventory ORDER BY item_name ASC")
    items = [row["item_name"] for row in c.fetchall()]
    conn.close()
    return products, items


def save_bom(prod, inv_item, qty, db_file='little_princesses.db'):
    conn = get_db(db_file)
    c = conn.cursor()
    c.execute("INSERT INTO bom (product_name, inventory_item_name, qty_needed) VALUES (?, ?, ?)", (prod, inv_item, qty))
    conn.commit()
    conn.close()


def fetch_bom_list(db_file='little_princesses.db'):
    conn = get_db(db_file)
    c = conn.cursor()
    c.execute("SELECT * FROM bom ORDER BY id DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


def save_finished_stock(sku, model, size, status, price, loc, db_file='little_princesses.db'):
    conn = get_db(db_file)
    c = conn.cursor()
    c.execute("INSERT INTO finished_stock (sku, model_name, size, status, price, location) VALUES (?, ?, ?, ?, ?, ?)",
              (sku, model, size, status, price, loc))
    conn.commit()
    conn.close()
    sync_to_gas(sku, model, size, status, price, loc)


def fetch_finished_stock(db_file='little_princesses.db'):
    conn = get_db(db_file)
    c = conn.cursor()
    c.execute("SELECT * FROM finished_stock ORDER BY id DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


def convert_stock_to_immediate(s_id, sku, model, size, price, loc, db_file='little_princesses.db'):
    conn = get_db(db_file)
    c = conn.cursor()
    c.execute("UPDATE finished_stock SET status = 'تسليم فوري' WHERE id = ?", (s_id,))
    conn.commit()
    conn.close()
    sync_to_gas(sku, model, size, 'تسليم فوري', price, loc)


def sync_to_gas(sku, model, size, status, price, loc):
    try:
        gas_payload = {
            "action": "addFinishedStock",
            "data": {
                "sku": sku, "model_name": model, "size": size,
                "status": status, "price": price, "location": loc
            }
        }
        req = urllib.request.Request(
            "http://127.0.0.1:5000/api/gas",
            data=json.dumps(gas_payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        urllib.request.urlopen(req, timeout=3)
    except Exception as e:
        print("GAS Sync notice:", e)


def fetch_pending_orders(db_file='little_princesses.db'):
    conn = get_db(db_file)
    c = conn.cursor()
    c.execute("SELECT order_no, customer_name, product_name, quantity, status FROM orders WHERE status != 'جاهز للتسليم 🎁' ORDER BY id DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


def process_order_production_start(ord_no, prod, qty, db_file='little_princesses.db'):
    """Deducts BOM raw materials, calculates exact material cost, and records journal entry."""
    conn = get_db(db_file)
    c = conn.cursor()
    c.execute("SELECT inventory_item_name, qty_needed FROM bom WHERE product_name = ?", (prod,))
    bom_items = c.fetchall()

    total_cost = Decimal("0.00")
    for b in bom_items:
        item_name = b["inventory_item_name"]
        qty_deduct = Decimal(str(b["qty_needed"])) * Decimal(str(qty))
        c.execute("SELECT quantity_meters, cost_per_meter FROM inventory WHERE item_name = ?", (item_name,))
        inv = c.fetchone()
        if inv:
            new_qty = float(Decimal(str(inv["quantity_meters"])) - qty_deduct)
            cost = Decimal(str(inv["cost_per_meter"]))
            total_cost += cost * qty_deduct
            c.execute("UPDATE inventory SET quantity_meters = ? WHERE item_name = ?", (new_qty, item_name))

    c.execute("UPDATE orders SET status = 'جاري التفصيل ✂️' WHERE order_no = ?", (ord_no,))

    if total_cost > Decimal("0.00"):
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        e_no = f"JV-BOM-{datetime.datetime.now().strftime('%M%S')}"
        notes = f"خصم آلي لخامات الطلب {ord_no} موديل {prod}"
        c.execute("INSERT INTO journal_entries (entry_no, entry_date, debit_acc, credit_acc, amount, notes) VALUES (?, ?, ?, ?, ?, ?)",
                  (e_no, now_str, "501 - مصاريف الخياطة والتشغيل المباشرة", "102 - مخزون الأقمشة والمستلزمات", float(total_cost), notes))
        c.execute("UPDATE accounts SET balance = balance + ? WHERE acc_code = 501", (float(total_cost),))
        c.execute("UPDATE accounts SET balance = balance - ? WHERE acc_code = 102", (float(total_cost),))

    conn.commit()
    conn.close()
    return True, len(bom_items) > 0
