# domains/accounting/db_schema.py
# Accounting & financial database initialization

import sqlite3
from domains.system.db_connection import get_db
from domains.accounting.db_accounts import init_accounts_table
from domains.accounting.db_financial import init_financial_tables

def init_accounts_db(conn=None):
    close_at_end = False
    if conn is None:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        close_at_end = True
    
    c = conn.cursor()
    init_accounts_table(c)
    conn.commit()
    init_financial_tables(c)
    conn.commit()
    if close_at_end:
        conn.close()
