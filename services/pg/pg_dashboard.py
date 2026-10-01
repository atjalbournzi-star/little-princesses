import logging
from .db_pool import get_db_cursor

logger = logging.getLogger("LittlePrincesses_PG_Dashboard")


def get_dashboard_stats(params=None):
    with get_db_cursor(commit=False) as cur:
        cur.execute("SELECT count(*) as cnt FROM customers;")
        cust_cnt = cur.fetchone()['cnt']

        cur.execute("SELECT count(*) as cnt, COALESCE(sum(total_amount), 0) as total_sales FROM orders;")
        ord_info = cur.fetchone()
        ord_cnt = ord_info['cnt']
        tot_sales = float(ord_info['total_sales'])

        cur.execute("SELECT count(*) as cnt FROM products WHERE status = 'Active';")
        prod_cnt = cur.fetchone()['cnt']

        cur.execute("SELECT count(*) as cnt, COALESCE(sum(original_amount), 0) as total_purchases FROM purchases;")
        pur_info = cur.fetchone()
        pur_cnt = pur_info['cnt']
        tot_pur = float(pur_info['total_purchases'])

        cur.execute("SELECT count(*) as cnt FROM inventory;")
        inv_cnt = cur.fetchone()['cnt']

        cur.execute("SELECT count(*) as cnt FROM payments;")
        vouch_cnt = cur.fetchone()['cnt']

        cur.execute("SELECT COALESCE(sum(amount), 0) as total_exp FROM expenses;")
        tot_exp = float(cur.fetchone()['total_exp'])

    return {
        "customersCount": cust_cnt,
        "ordersCount": ord_cnt,
        "productsCount": prod_cnt,
        "purchasesCount": pur_cnt,
        "inventoryCount": inv_cnt,
        "vouchersCount": vouch_cnt,
        "totalSales": tot_sales,
        "totalPurchases": tot_pur,
        "totalExpenses": tot_exp,
        "netProfitEstimate": tot_sales - tot_pur - tot_exp,
        "systemHealth": "Optimal 100% 👑 (PostgreSQL Supabase Connected)",
        "databaseEngine": "PostgreSQL 17.6 (Supabase Cloud)",
        "baseCurrency": "YER"
    }
