import tkinter as tk
from tkinter import ttk, messagebox
import sqlite3
import datetime

class PurchasesModule:
    def __init__(self, app_instance, frame):
        self.app = app_instance
        self.frame = frame
        self.db_file = getattr(self.app, 'db_file', 'little_princesses.db')
        self.build_ui()

    def get_db(self):
        conn = sqlite3.connect(self.db_file)
        conn.row_factory = sqlite3.Row
        return conn

    def build_ui(self):
        f_in = tk.LabelFrame(self.frame, text=" 🛒 فاتورة شراء أقمشة ومستلزمات جديدة ", font=("Arial", 11, "bold"), padx=10, pady=10)
        f_in.pack(fill=tk.X, padx=10, pady=5)

        tk.Label(f_in, text="المورد:").grid(row=0, column=7, padx=5, pady=5, sticky="e")
        self.ent_supplier = tk.Entry(f_in, font=("Arial", 10), justify="right", width=20)
        self.ent_supplier.grid(row=0, column=6, padx=5, pady=5)

        tk.Label(f_in, text="الصنف (مربوط بالمخزون):").grid(row=0, column=5, padx=5, pady=5, sticky="e")
        self.combo_item = ttk.Combobox(f_in, state="normal", width=20)
        self.combo_item.grid(row=0, column=4, padx=5, pady=5)

        tk.Label(f_in, text="الكمية (أمتار/حبة):").grid(row=0, column=3, padx=5, pady=5, sticky="e")
        self.ent_qty = tk.Entry(f_in, font=("Arial", 10), justify="right", width=10)
        self.ent_qty.grid(row=0, column=2, padx=5, pady=5)

        tk.Label(f_in, text="السعر الإجمالي للصنف ($):").grid(row=0, column=1, padx=5, pady=5, sticky="e")
        self.ent_price = tk.Entry(f_in, font=("Arial", 10), justify="right", width=12)
        self.ent_price.grid(row=0, column=0, padx=5, pady=5)

        tk.Label(f_in, text="طريقة الدفع:").grid(row=1, column=7, padx=5, pady=5, sticky="e")
        self.combo_pay = ttk.Combobox(f_in, values=["نقد (كاش)", "حوالة مالية", "آجل (ذمم)"], state="readonly", width=15)
        self.combo_pay.grid(row=1, column=6, padx=5, pady=5)
        self.combo_pay.current(0)

        tk.Label(f_in, text="رقم الحوالة:").grid(row=1, column=5, padx=5, pady=5, sticky="e")
        self.ent_trans = tk.Entry(f_in, font=("Arial", 10), justify="right", width=15)
        self.ent_trans.grid(row=1, column=4, padx=5, pady=5)

        btn_save = tk.Button(f_in, text="💾 حفظ الفاتورة وتحديث المخزون والمالية", bg="#27ae60", fg="white", font=("Arial", 10, "bold"), command=self.save_purchase)
        btn_save.grid(row=1, column=0, columnspan=4, pady=10)

        # Treeview
        columns = ("id", "bill_no", "supplier", "item", "qty", "price", "pay_type", "date")
        self.tree_purch = ttk.Treeview(self.frame, columns=columns, show="headings")
        headings = ["ID", "رقم الفاتورة", "المورد", "الصنف", "الكمية", "الإجمالي ($)", "طريقة الدفع", "التاريخ"]
        for col, h in zip(columns, headings):
            self.tree_purch.heading(col, text=h)
            self.tree_purch.column(col, anchor="center")
        self.tree_purch.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        self.refresh_items_dropdown()
        self.load_purchases()

    def refresh_items_dropdown(self):
        conn = self.get_db()
        c = conn.cursor()
        c.execute("SELECT item_name FROM inventory ORDER BY item_name ASC")
        self.combo_item['values'] = [row["item_name"] for row in c.fetchall()]
        conn.close()

    def save_purchase(self):
        supplier = self.ent_supplier.get()
        item = self.combo_item.get()
        pay = self.combo_pay.get()
        trans = self.ent_trans.get()

        try:
            qty = float(self.ent_qty.get())
            price = float(self.ent_price.get())
        except:
            messagebox.showerror("خطأ", "يرجى إدخال أرقام صحيحة للكمية والسعر")
            return

        if not supplier or not item or qty <= 0:
            messagebox.showerror("خطأ", "يرجى تعبئة الحقول الأساسية!")
            return

        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        bill_no = f"PUR-{datetime.datetime.now().strftime('%M%S')}"

        conn = self.get_db()
        c = conn.cursor()

        try:
            # 1. Update Inventory and calculate Average Cost
            c.execute("SELECT quantity_meters, cost_per_meter, category, min_alert_qty FROM inventory WHERE item_name = ?", (item,))
            inv = c.fetchone()
            
            if inv:
                old_qty = inv["quantity_meters"]
                old_cost = inv["cost_per_meter"]
                
                # New Average Cost Calculation
                total_old_value = old_qty * old_cost
                new_total_value = total_old_value + price
                new_qty = old_qty + qty
                
                new_avg_cost = new_total_value / new_qty if new_qty > 0 else 0.0
                
                c.execute("UPDATE inventory SET quantity_meters = ?, cost_per_meter = ? WHERE item_name = ?", (new_qty, new_avg_cost, item))
            else:
                # New item entered through purchase
                unit_price = price / qty if qty > 0 else 0.0
                c.execute("INSERT INTO inventory (item_name, category, quantity_meters, cost_per_meter, min_alert_qty) VALUES (?, ?, ?, ?, ?)",
                          (item, "أقمشة ومستلزمات (تلقائي)", qty, unit_price, 5.0))

            # 2. Insert Purchase Record
            c.execute("INSERT INTO purchases (bill_no, supplier, item, qty, price, pay_type, transfer_no, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                      (bill_no, supplier, item, qty, price, pay, trans, now_str))

            # 3. Financial Journal Entry
            e_no = f"JV-PUR-{datetime.datetime.now().strftime('%M%S')}"
            notes = f"فاتورة شراء {bill_no} من المورد {supplier} للصنف {item}"
            
            credit_acc = "101 - الصندوق / الخزينة الرئيسية"
            credit_acc_code = 101
            if pay == "حوالة مالية":
                credit_acc = "103 - الحساب البنكي / الحوالات"
                credit_acc_code = 103
            elif pay == "آجل (ذمم)":
                credit_acc = "201 - مستحقات الخياطين والموردين"
                credit_acc_code = 201
                
            c.execute("INSERT INTO journal_entries (entry_no, entry_date, debit_acc, credit_acc, amount, notes) VALUES (?, ?, ?, ?, ?, ?)",
                      (e_no, now_str, "102 - مخزون الأقمشة والمستلزمات", credit_acc, price, notes))
            
            c.execute("UPDATE accounts SET balance = balance + ? WHERE acc_code = 102", (price,))
            if pay == "آجل (ذمم)":
                c.execute("UPDATE accounts SET balance = balance + ? WHERE acc_code = ?", (price, credit_acc_code)) # Liability increases
            else:
                c.execute("UPDATE accounts SET balance = balance - ? WHERE acc_code = ?", (price, credit_acc_code)) # Asset decreases
                
            conn.commit()

            # 4. Cloud Sync
            self.sync_to_gas(bill_no, supplier, item, qty, price, now_str)

            messagebox.showinfo("نجاح", "تم حفظ فاتورة الشراء وتحديث المخزون والمالية بنجاح.")
            self.ent_supplier.delete(0, tk.END)
            self.ent_qty.delete(0, tk.END)
            self.ent_price.delete(0, tk.END)
            self.load_purchases()
            self.refresh_items_dropdown()
            
            if hasattr(self.app, 'load_accounts'):
                self.app.load_accounts()
            if hasattr(self.app, 'update_dashboard_cash'):
                self.app.update_dashboard_cash()

        except Exception as e:
            messagebox.showerror("خطأ", f"حدث خطأ أثناء الحفظ:\n{e}")
        finally:
            conn.close()

    def load_purchases(self):
        for row in self.tree_purch.get_children():
            self.tree_purch.delete(row)
        conn = self.get_db()
        c = conn.cursor()
        c.execute("SELECT id, bill_no, supplier, item, qty, price, pay_type, date FROM purchases ORDER BY id DESC")
        for r in c.fetchall():
            self.tree_purch.insert("", "end", values=(r["id"], r["bill_no"], r["supplier"], r["item"], r["qty"], f"${r['price']:.2f}", r["pay_type"], r["date"]))
        conn.close()

    def sync_to_gas(self, bill_no, supplier, item, qty, price, date):
        import threading
        
        unit_price = price / qty if qty > 0 else 0
        pay_type = self.combo_pay.get() if hasattr(self, 'combo_pay') else "نقد (كاش)"
        
        purchase_data = ["", bill_no, supplier, item, qty, unit_price, price, "YER", pay_type, date]
        
        gas_payload = {
            "action": "append_row",
            "sheet_name": "المشتريات",
            "row": purchase_data
        }
        
        def send_sync():
            try:
                import urllib.request
                import json
                req = urllib.request.Request(
                    "http://127.0.0.1:5000/api/gas", 
                    data=json.dumps(gas_payload, ensure_ascii=False).encode('utf-8'), 
                    headers={'Content-Type': 'application/json; charset=utf-8'}
                )
                with urllib.request.urlopen(req, timeout=10) as response:
                    if response.status == 200:
                        print("[Google Sheets Sync] Purchases Status: 200 OK (from purchases_module.py)")
            except Exception as e:
                print("GAS Sync error in background:", e)
                
        threading.Thread(target=send_sync, daemon=True).start()
