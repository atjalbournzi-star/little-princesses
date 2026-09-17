# domains/accounting/code_generator.py
# Account code generation and auto-incrementing

import sqlite3
import pg_service
from domains.system.db_connection import get_db

def suggest_next_account_code(parent_id, conn=None):
    try:
        return pg_service.suggest_account_code(parent_id)
    except Exception:
        pass
    close_at_end = False
    if conn is None:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        close_at_end = True
    c = conn.cursor()
    
    delimiter = "."
    pad_len = 2
    
    c.execute("SELECT value FROM settings WHERE key='coa_delimiter'")
    r_del = c.fetchone()
    if r_del: delimiter = r_del[0] if isinstance(r_del, (list, tuple)) else r_del['value']
    
    c.execute("SELECT value FROM settings WHERE key='coa_pad_length'")
    r_pad = c.fetchone()
    if r_pad:
        try: pad_len = int(r_pad[0] if isinstance(r_pad, (list, tuple)) else r_pad['value'])
        except: pass
        
    if not parent_id or str(parent_id) == '0' or str(parent_id).strip() == '':
        c.execute("SELECT MAX(CAST(code AS INTEGER)) FROM accounts WHERE parent_id IS NULL OR parent_id=''")
        mx = c.fetchone()[0]
        next_code = str((mx or 0) + 1)
    else:
        pid_clean = str(parent_id).replace('ACC-', '').replace('ACC_', '').strip()
        c.execute("SELECT id, code, account_id, account_code FROM accounts WHERE id=? OR code=? OR account_id=? OR account_code=? OR code=?", 
                  (parent_id, str(parent_id), f"ACC-{pid_clean}", pid_clean, pid_clean))
        p = c.fetchone()
        if not p:
            next_code = f"{pid_clean}.01" if pid_clean else "1111.01"
        else:
            p_id = p['id'] if isinstance(p, dict) or hasattr(p, 'keys') else p[0]
            p_code = p['code'] if isinstance(p, dict) or hasattr(p, 'keys') else p[1]
            
            c.execute("SELECT code, account_code FROM accounts WHERE parent_id=? OR parent_account_id=? OR parent_account_code=?", (p_id, p_id, p_code))
            child_rows = c.fetchall()
            child_codes = [r[0] if isinstance(r, (list, tuple)) else (r['code'] or r['account_code']) for r in child_rows]
            
            max_seq = 0
            for cc in child_codes:
                if str(cc).startswith(str(p_code)):
                    suffix = str(cc)[len(str(p_code)):].lstrip(delimiter)
                    try:
                        seq = int(suffix)
                        if seq > max_seq: max_seq = seq
                    except: pass
            
            seq_str = str(max_seq + 1).zfill(pad_len)
            if delimiter and delimiter != 'none':
                next_code = f"{p_code}{delimiter}{seq_str}"
            else:
                next_code = f"{p_code}{seq_str}"
                
    if close_at_end: conn.close()
    return next_code
