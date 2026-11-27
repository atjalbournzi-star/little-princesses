# services/pg/journal_lines_helper.py
# Deadlock-free sorted journal_entry_lines insertion helper

from .db_pool import generate_id


def insert_sorted_journal_lines(cur, entry_id, lines):
    """
    Inserts journal_entry_lines sorted ascending by account_id to prevent
    row-lock Deadlocks on chart_of_accounts inside trg_journal_line_balance.
    Each item in lines: (account_id, line_description, debit, credit, debit_base, credit_base)
    """
    if not lines:
        return
    sorted_lines = sorted(lines, key=lambda x: str(x[0] or ''))
    sql = """
        INSERT INTO public.journal_entry_lines (
            id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
    """
    for acc_id, ldesc, dr, cr, dr_b, cr_b in sorted_lines:
        cur.execute(sql, (generate_id("JVL"), entry_id, acc_id, ldesc, dr, cr, dr_b, cr_b))
