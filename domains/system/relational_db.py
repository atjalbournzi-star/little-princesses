import sqlite3
import json
import time
from domains.system.db_connection import get_db
from domains.system.relational_tables import create_enterprise_tables

def init_enterprise_relational_db(conn=None):
    close_at_end = False
    if conn is None:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        close_at_end = True
    c = conn.cursor()
    create_enterprise_tables(c)
    conn.commit()
    if close_at_end:
        conn.close()

def get_next_sequence_id(conn, entity, prefix=None, padding=6):
    c = conn.cursor()
    if not prefix:
        prefix_map = {
            'customers': 'CUST', 'children': 'CHLD', 'products': 'PROD', 'sales_orders': 'ORD',
            'orders': 'ORD', 'invoices': 'INV', 'payments': 'PAY', 'suppliers': 'SUP',
            'purchases': 'PUR', 'production_orders': 'PROD-ORD', 'materials': 'MAT',
            'fabrics': 'FAB', 'warehouses': 'WH', 'employees': 'EMP', 'expenses': 'EXP',
            'journal_entries': 'JV', 'campaigns': 'CMP', 'measurement_profiles': 'MEAS',
            'inventory_transactions': 'INV-TXN', 'audit_logs': 'AUD', 'users': 'USR'
        }
        prefix = prefix_map.get(entity, entity[:4].upper())
    
    c.execute("SELECT current_number, padding FROM number_sequences WHERE entity=? OR prefix=?", (entity, prefix))
    row = c.fetchone()
    cur_num = (row[0] if isinstance(row, (list, tuple)) else row['current_number']) if row else 0
    pad = (row[1] if isinstance(row, (list, tuple)) else row['padding']) if row else padding
    
    next_num = cur_num
    cand_id = ""
    while True:
        next_num += 1
        cand_id = f"{prefix}-{str(next_num).zfill(pad)}"
        try:
            c.execute(f"SELECT id FROM {entity} WHERE id=?", (cand_id,))
            if not c.fetchone():
                break
        except Exception:
            break
    
    now = time.strftime('%Y-%m-%d')
    if row:
        c.execute("UPDATE number_sequences SET current_number=?, updated_at=? WHERE entity=? OR prefix=?", (next_num, now, entity, prefix))
    else:
        seq_id = f"SEQ-{prefix}"
        c.execute("INSERT INTO number_sequences (id, entity, prefix, current_number, padding, updated_at) VALUES (?, ?, ?, ?, ?, ?)", (seq_id, entity, prefix, next_num, pad, now))
    conn.commit()
    return cand_id

def log_audit(conn, entity_type, entity_id, action, old_val=None, new_val=None, user_id='system'):
    try:
        c = conn.cursor()
        audit_id = get_next_sequence_id(conn, 'audit_logs', 'AUD')
        old_str = json.dumps(old_val, ensure_ascii=False) if isinstance(old_val, (dict, list)) else str(old_val or '')
        new_str = json.dumps(new_val, ensure_ascii=False) if isinstance(new_val, (dict, list)) else str(new_val or '')
        c.execute('''
            INSERT INTO audit_logs (id, entity_type, entity_id, action, old_values, new_values, user_id, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ''', (audit_id, entity_type, entity_id, action, old_str, new_str, user_id or 'system'))
        conn.commit()
    except Exception as e:
        print(f"[Audit Log Error]: {e}")

def record_inventory_movement(conn, product_id='', variant_id='', fabric_id='', warehouse_id='WH-MAIN', txn_type='ADJUSTMENT', qty=0.0, unit_cost=0.0, ref_type='MANUAL', ref_id='', notes='', created_by='system'):
    try:
        c = conn.cursor()
        txn_id = get_next_sequence_id(conn, 'inventory_transactions', 'INV-TXN')
        c.execute('''
            INSERT INTO inventory_transactions (id, product_id, variant_id, fabric_id, warehouse_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes, created_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        ''', (txn_id, product_id, variant_id, fabric_id, warehouse_id, txn_type, float(qty), float(unit_cost), ref_type, ref_id, notes, created_by))
        conn.commit()
        return txn_id
    except Exception as e:
        print(f"[Inventory Movement Error]: {e}")
        return None
