import tkinter as tk
from tkinter import ttk, messagebox
import sqlite3
import datetime

class DualInventoryModule:
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
        self.notebook = ttk.Notebook(self.frame)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Tab 1: BOM
        self.tab_bom = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_bom, text="📋 بطاقات الخامات (BOM)")
        self.build_bom_ui(self.tab_bom)

        # Tab 2: Finished Stock & Returns
        self.tab_stock = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_stock, text="👗 المخزون الجاهز والمرتجعات")
        self.build_stock_ui(self.tab_stock)

        # Tab 3: Production & Status
        self.tab_prod = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_prod, text="⚙️ الإنتاج والجودة")
        self.build_production_ui(self.tab_prod)

    def build_bom_ui(self, frame):
        f_in = tk.LabelFrame(frame, text=" ➕ إضافة خامة لموديل ", font=("Arial", 11, "bold"), padx=10, pady=10)
        f_in.pack(fill=tk.X, padx=10, pady=5)

        tk.Label(f_in, text="اسم الموديل/الفستان:").grid(row=0, column=5, padx=5, pady=5, sticky="e")
        self.combo_b_product = ttk.Combobox(f_in, state="normal", width=25)
        self.combo_b_product.grid(row=0, column=4, padx=5, pady=5)

        tk.Label(f_in, text="اسم القماش/الخامة:").grid(row=0, column=3, padx=5, pady=5, sticky="e")
        self.combo_b_inventory = ttk.Combobox(f_in, state="normal", width=25)
        self.combo_b_inventory.grid(row=0, column=2, padx=5, pady=5)

        tk.Label(f_in, text="الكمية (أمتار/حبة):").grid(row=0, column=1, padx=5, pady=5, sticky="e")
        self.ent_b_qty = tk.Entry(f_in, font=("Arial", 10), justify="right", width=10)
        self.ent_b_qty.grid(row=0, column=0, padx=5, pady=5)

        btn_add = tk.Button(f_in, text="💾 حفظ بطاقة الخامة", bg="#2980b9", fg="white", font=("Arial", 10, "bold"), command=self.save_bom)
        btn_add.grid(row=1, column=0, columnspan=6, pady=10)

        # Treeview
        columns = ("id", "product", "item", "qty")
        self.tree_bom = ttk.Treeview(frame, columns=columns, show="headings")
        headings = ["ID", "اسم الموديل", "اسم القماش/الخامة", "الكمية المستهلكة"]
        for col, h in zip(columns, headings):
            self.tree_bom.heading(col, text=h)
            self.tree_bom.column(col, anchor="center")
        self.tree_bom.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        self.refresh_bom_dropdowns()
        self.load_bom()

    def refresh_bom_dropdowns(self):
        conn = self.get_db()
        c = conn.cursor()
        c.execute("SELECT name FROM products ORDER BY name ASC")
        self.combo_b_product['values'] = [row["name"] for row in c.fetchall()]

        c.execute("SELECT item_name FROM inventory ORDER BY item_name ASC")
        self.combo_b_inventory['values'] = [row["item_name"] for row in c.fetchall()]
        conn.close()

    def save_bom(self):
        prod = self.combo_b_product.get()
        inv_item = self.combo_b_inventory.get()
        try:
            qty = float(self.ent_b_qty.get())
        except:
            qty = 0.0

        if not prod or not inv_item or qty <= 0:
            messagebox.showerror("خطأ", "يرجى تعبئة جميع الحقول بشكل صحيح")
            return

        conn = self.get_db()
        c = conn.cursor()
        c.execute("INSERT INTO bom (product_name, inventory_item_name, qty_needed) VALUES (?, ?, ?)", (prod, inv_item, qty))
        conn.commit()
        conn.close()
        messagebox.showinfo("نجاح", "تم إضافة بطاقة الخامة بنجاح.")
        self.ent_b_qty.delete(0, tk.END)
        self.load_bom()

    def load_bom(self):
        for row in self.tree_bom.get_children():
            self.tree_bom.delete(row)
        conn = self.get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM bom ORDER BY id DESC")
        for r in c.fetchall():
            self.tree_bom.insert("", "end", values=(r["id"], r["product_name"], r["inventory_item_name"], r["qty_needed"]))
        conn.close()

    def build_stock_ui(self, frame):
        f_in = tk.LabelFrame(frame, text=" ➕ إضافة قطعة جاهزة / مرتجع ", font=("Arial", 11, "bold"), padx=10, pady=10)
        f_in.pack(fill=tk.X, padx=10, pady=5)

        tk.Label(f_in, text="SKU/الكود:").grid(row=0, column=7, padx=5, pady=5, sticky="e")
        self.ent_s_sku = tk.Entry(f_in, font=("Arial", 10), justify="right", width=15)
        self.ent_s_sku.grid(row=0, column=6, padx=5, pady=5)
        
        tk.Label(f_in, text="الموديل:").grid(row=0, column=5, padx=5, pady=5, sticky="e")
        self.combo_s_model = ttk.Combobox(f_in, state="normal", width=20)
        self.combo_s_model.grid(row=0, column=4, padx=5, pady=5)

        tk.Label(f_in, text="المقاس:").grid(row=0, column=3, padx=5, pady=5, sticky="e")
        self.ent_s_size = tk.Entry(f_in, font=("Arial", 10), justify="right", width=10)
        self.ent_s_size.grid(row=0, column=2, padx=5, pady=5)

        tk.Label(f_in, text="السعر:").grid(row=0, column=1, padx=5, pady=5, sticky="e")
        self.ent_s_price = tk.Entry(f_in, font=("Arial", 10), justify="right", width=10)
        self.ent_s_price.grid(row=0, column=0, padx=5, pady=5)

        tk.Label(f_in, text="الحالة:").grid(row=1, column=7, padx=5, pady=5, sticky="e")
        self.combo_s_status = ttk.Combobox(f_in, values=["إنتاج مسبق", "مرتجع للتعديل", "تسليم فوري"], state="readonly", width=15)
        self.combo_s_status.grid(row=1, column=6, padx=5, pady=5)
        self.combo_s_status.current(0)

        tk.Label(f_in, text="الموقع:").grid(row=1, column=5, padx=5, pady=5, sticky="e")
        self.ent_s_loc = tk.Entry(f_in, font=("Arial", 10), justify="right", width=20)
        self.ent_s_loc.insert(0, "المعرض الرئيسي")
        self.ent_s_loc.grid(row=1, column=4, padx=5, pady=5)

        btn_add = tk.Button(f_in, text="💾 حفظ القطعة", bg="#27ae60", fg="white", font=("Arial", 10, "bold"), command=self.save_stock)
        btn_add.grid(row=1, column=0, columnspan=4, pady=10)

        # Actions
        f_act = tk.Frame(frame)
        f_act.pack(fill=tk.X, padx=10)
        btn_convert = tk.Button(f_act, text="🔄 تحويل المرتجع إلى (تسليم فوري)", bg="#f39c12", fg="white", font=("Arial", 10, "bold"), command=self.convert_to_immediate)
        btn_convert.pack(side=tk.LEFT, pady=5)

        # Treeview
        columns = ("id", "sku", "model", "size", "status", "price", "loc")
        self.tree_stock = ttk.Treeview(frame, columns=columns, show="headings")
        headings = ["ID", "SKU", "الموديل", "المقاس", "الحالة", "السعر", "الموقع"]
        for col, h in zip(columns, headings):
            self.tree_stock.heading(col, text=h)
            self.tree_stock.column(col, anchor="center")
        self.tree_stock.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        self.refresh_stock_dropdowns()
        self.load_stock()

    def refresh_stock_dropdowns(self):
        conn = self.get_db()
        c = conn.cursor()
        c.execute("SELECT name FROM products ORDER BY name ASC")
        self.combo_s_model['values'] = [row["name"] for row in c.fetchall()]
        conn.close()

    def save_stock(self):
        sku = self.ent_s_sku.get()
        model = self.combo_s_model.get()
        size = self.ent_s_size.get()
        status = self.combo_s_status.get()
        loc = self.ent_s_loc.get()
        try:
            price = float(self.ent_s_price.get())
        except:
            price = 0.0

        if not sku or not model:
            messagebox.showerror("خطأ", "يرجى تعبئة الكود والموديل")
            return

        conn = self.get_db()
        c = conn.cursor()
        try:
            c.execute("INSERT INTO finished_stock (sku, model_name, size, status, price, location) VALUES (?, ?, ?, ?, ?, ?)", (sku, model, size, status, price, loc))
            conn.commit()
            self.sync_to_gas(sku, model, size, status, price, loc)
            messagebox.showinfo("نجاح", "تم حفظ القطعة بنجاح.")
            self.load_stock()
        except sqlite3.IntegrityError:
            messagebox.showerror("خطأ", "الكود (SKU) موجود مسبقاً!")
        finally:
            conn.close()

    def load_stock(self):
        for row in self.tree_stock.get_children():
            self.tree_stock.delete(row)
        conn = self.get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM finished_stock ORDER BY id DESC")
        for r in c.fetchall():
            self.tree_stock.insert("", "end", values=(r["id"], r["sku"], r["model_name"], r["size"], r["status"], r["price"], r["location"]))
        conn.close()

    def convert_to_immediate(self):
        selected = self.tree_stock.selection()
        if not selected:
            messagebox.showwarning("تنبيه", "الرجاء تحديد قطعة من الجدول")
            return
        
        item = self.tree_stock.item(selected)['values']
        s_id = item[0]
        sku = item[1]
        
        conn = self.get_db()
        c = conn.cursor()
        c.execute("UPDATE finished_stock SET status = 'تسليم فوري' WHERE id = ?", (s_id,))
        conn.commit()
        conn.close()
        
        messagebox.showinfo("نجاح", f"تم تحويل القطعة {sku} إلى تسليم فوري.")
        self.load_stock()
        
        # Sync update to cloud
        self.sync_to_gas(sku, item[2], item[3], 'تسليم فوري', item[5], item[6])

    def sync_to_gas(self, sku, model, size, status, price, loc):
        try:
            import urllib.request
            import json
            gas_payload = {
                "action": "addFinishedStock",
                "data": {
                    "sku": sku,
                    "model_name": model,
                    "size": size,
                    "status": status,
                    "price": price,
                    "location": loc
                }
            }
            req = urllib.request.Request("http://127.0.0.1:5000/api/gas", data=json.dumps(gas_payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
            urllib.request.urlopen(req, timeout=3)
        except Exception as e:
            print("GAS Sync error:", e)

    def build_production_ui(self, frame):
        f_act = tk.LabelFrame(frame, text=" ✂️ تغيير حالة الطلب والخصم التلقائي للخامات ", font=("Arial", 11, "bold"), padx=10, pady=10)
        f_act.pack(fill=tk.X, padx=10, pady=5)
        
        btn_start_prod = tk.Button(f_act, text="🔄 تحويل إلى 'جاري التفصيل' وخصم الخامات (BOM)", bg="#8e44ad", fg="white", font=("Arial", 10, "bold"), command=self.start_production)
        btn_start_prod.pack(pady=5)
        
        # Treeview
        columns = ("ord_no", "cust", "prod", "qty", "status")
        self.tree_orders = ttk.Treeview(frame, columns=columns, show="headings")
        headings = ["رقم الفاتورة", "اسم العميل", "الموديل", "العدد", "الحالة"]
        for col, h in zip(columns, headings):
            self.tree_orders.heading(col, text=h)
            self.tree_orders.column(col, anchor="center")
        self.tree_orders.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        self.load_orders()

    def load_orders(self):
        for row in self.tree_orders.get_children():
            self.tree_orders.delete(row)
        conn = self.get_db()
        c = conn.cursor()
        c.execute("SELECT order_no, customer_name, product_name, quantity, status FROM orders WHERE status != 'جاهز للتسليم 🎁' ORDER BY id DESC")
        for r in c.fetchall():
            self.tree_orders.insert("", "end", values=(r["order_no"], r["customer_name"], r["product_name"], r["quantity"], r["status"]))
        conn.close()

    def start_production(self):
        selected = self.tree_orders.selection()
        if not selected:
            messagebox.showwarning("تنبيه", "الرجاء تحديد طلبية من الجدول")
            return
        
        item = self.tree_orders.item(selected)['values']
        ord_no = item[0]
        prod = item[2]
        qty = float(item[3])
        status = item[4]
        
        if status == 'جاري التفصيل ✂️':
            messagebox.showinfo("تنبيه", "الطلب بالفعل في مرحلة جاري التفصيل وتم خصم خاماته سابقاً.")
            return

        conn = self.get_db()
        c = conn.cursor()
        
        # Fetch BOM for this product
        c.execute("SELECT inventory_item_name, qty_needed FROM bom WHERE product_name = ?", (prod,))
        bom_items = c.fetchall()
        
        if not bom_items:
            # Optionally just change status without deducting
            res = messagebox.askyesno("تحذير", f"لا توجد بطاقة خامات (BOM) للموديل {prod}. هل تريد تغيير الحالة إلى جاري التفصيل بدون خصم المخزون؟")
            if not res:
                conn.close()
                return
        
        total_material_cost = 0.0
        
        for b in bom_items:
            item_name = b["inventory_item_name"]
            qty_deduct = b["qty_needed"] * qty
            
            c.execute("SELECT quantity_meters, cost_per_meter FROM inventory WHERE item_name = ?", (item_name,))
            inv = c.fetchone()
            if inv:
                new_qty = inv["quantity_meters"] - qty_deduct
                cost = inv["cost_per_meter"]
                total_material_cost += (cost * qty_deduct)
                
                c.execute("UPDATE inventory SET quantity_meters = ? WHERE item_name = ?", (new_qty, item_name))
        
        # Update order status
        c.execute("UPDATE orders SET status = 'جاري التفصيل ✂️' WHERE order_no = ?", (ord_no,))
        
        # Financial Journal Entry
        if total_material_cost > 0:
            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
            e_no = f"JV-BOM-{datetime.datetime.now().strftime('%M%S')}"
            notes = f"خصم آلي لخامات الطلب {ord_no} موديل {prod}"
            c.execute("INSERT INTO journal_entries (entry_no, entry_date, debit_acc, credit_acc, amount, notes) VALUES (?, ?, ?, ?, ?, ?)",
                      (e_no, now_str, "501 - مصاريف الخياطة والتشغيل المباشرة", "102 - مخزون الأقمشة والمستلزمات", total_material_cost, notes))
            
            # Need to find actual account codes if they vary, assuming standard IDs here
            c.execute("UPDATE accounts SET balance = balance + ? WHERE acc_code = 501", (total_material_cost,))
            c.execute("UPDATE accounts SET balance = balance - ? WHERE acc_code = 102", (total_material_cost,))

        conn.commit()
        conn.close()
        
        messagebox.showinfo("نجاح", f"تم تحويل الطلب {ord_no} إلى 'جاري التفصيل' وتم سحب الخامات من المخزون وإنشاء القيود المحاسبية.")
        self.load_orders()
