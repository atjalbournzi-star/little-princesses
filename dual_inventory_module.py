# dual_inventory_module.py
# Little Princesses ERP - Dual Inventory UI Module (BOM, Finished Stock, Production)

import tkinter as tk
from tkinter import ttk, messagebox
import inventory_dual_service as service


class DualInventoryModule:
    def __init__(self, app_instance, frame):
        self.app = app_instance
        self.frame = frame
        self.db_file = getattr(self.app, 'db_file', 'little_princesses.db')
        self.build_ui()

    def build_ui(self):
        self.notebook = ttk.Notebook(self.frame)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        self.tab_bom = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_bom, text="📋 بطاقات الخامات (BOM)")
        self.build_bom_ui(self.tab_bom)

        self.tab_stock = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_stock, text="👗 المخزون الجاهز والمرتجعات")
        self.build_stock_ui(self.tab_stock)

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
        tk.Button(f_in, text="💾 حفظ بطاقة الخامة", bg="#2980b9", fg="white", font=("Arial", 10, "bold"),
                  command=self.save_bom).grid(row=1, column=0, columnspan=6, pady=10)

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
        prods, items = service.get_dropdown_options(self.db_file)
        self.combo_b_product['values'] = prods
        self.combo_b_inventory['values'] = items

    def save_bom(self):
        prod = self.combo_b_product.get()
        inv_item = self.combo_b_inventory.get()
        try: qty = float(self.ent_b_qty.get())
        except: qty = 0.0
        if not prod or not inv_item or qty <= 0:
            messagebox.showerror("خطأ", "يرجى تعبئة جميع الحقول بشكل صحيح")
            return
        service.save_bom(prod, inv_item, qty, self.db_file)
        messagebox.showinfo("نجاح", "تم إضافة بطاقة الخامة بنجاح.")
        self.ent_b_qty.delete(0, tk.END)
        self.load_bom()

    def load_bom(self):
        for row in self.tree_bom.get_children(): self.tree_bom.delete(row)
        for r in service.fetch_bom_list(self.db_file):
            self.tree_bom.insert("", "end", values=(r["id"], r["product_name"], r["inventory_item_name"], r["qty_needed"]))

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
        tk.Button(f_in, text="💾 حفظ القطعة", bg="#27ae60", fg="white", font=("Arial", 10, "bold"),
                  command=self.save_stock).grid(row=1, column=0, columnspan=4, pady=10)

        f_act = tk.Frame(frame)
        f_act.pack(fill=tk.X, padx=10)
        tk.Button(f_act, text="🔄 تحويل المرتجع إلى (تسليم فوري)", bg="#f39c12", fg="white",
                  font=("Arial", 10, "bold"), command=self.convert_to_immediate).pack(side=tk.LEFT, pady=5)

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
        prods, _ = service.get_dropdown_options(self.db_file)
        self.combo_s_model['values'] = prods

    def save_stock(self):
        sku, model = self.ent_s_sku.get(), self.combo_s_model.get()
        size, status, loc = self.ent_s_size.get(), self.combo_s_status.get(), self.ent_s_loc.get()
        try: price = float(self.ent_s_price.get())
        except: price = 0.0
        if not sku or not model:
            messagebox.showerror("خطأ", "يرجى تعبئة الكود والموديل")
            return
        try:
            service.save_finished_stock(sku, model, size, status, price, loc, self.db_file)
            messagebox.showinfo("نجاح", "تم حفظ القطعة بنجاح.")
            self.load_stock()
        except Exception as e:
            messagebox.showerror("خطأ", f"خطأ أثناء الحفظ: {e}")

    def load_stock(self):
        for row in self.tree_stock.get_children(): self.tree_stock.delete(row)
        for r in service.fetch_finished_stock(self.db_file):
            self.tree_stock.insert("", "end", values=(r["id"], r["sku"], r["model_name"], r["size"], r["status"], r["price"], r["location"]))

    def convert_to_immediate(self):
        selected = self.tree_stock.selection()
        if not selected:
            messagebox.showwarning("تنبيه", "الرجاء تحديد قطعة من الجدول")
            return
        item = self.tree_stock.item(selected)['values']
        service.convert_stock_to_immediate(item[0], item[1], item[2], item[3], item[5], item[6], self.db_file)
        messagebox.showinfo("نجاح", f"تم تحويل القطعة {item[1]} إلى تسليم فوري.")
        self.load_stock()

    def build_production_ui(self, frame):
        f_act = tk.LabelFrame(frame, text=" ✂️ تغيير حالة الطلب والخصم التلقائي للخامات ", font=("Arial", 11, "bold"), padx=10, pady=10)
        f_act.pack(fill=tk.X, padx=10, pady=5)
        tk.Button(f_act, text="🔄 تحويل إلى 'جاري التفصيل' وخصم الخامات (BOM)", bg="#8e44ad", fg="white",
                  font=("Arial", 10, "bold"), command=self.start_production).pack(pady=5)

        columns = ("ord_no", "cust", "prod", "qty", "status")
        self.tree_orders = ttk.Treeview(frame, columns=columns, show="headings")
        headings = ["رقم الفاتورة", "اسم العميل", "الموديل", "العدد", "الحالة"]
        for col, h in zip(columns, headings):
            self.tree_orders.heading(col, text=h)
            self.tree_orders.column(col, anchor="center")
        self.tree_orders.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        self.load_orders()

    def load_orders(self):
        for row in self.tree_orders.get_children(): self.tree_orders.delete(row)
        for r in service.fetch_pending_orders(self.db_file):
            self.tree_orders.insert("", "end", values=(r["order_no"], r["customer_name"], r["product_name"], r["quantity"], r["status"]))

    def start_production(self):
        selected = self.tree_orders.selection()
        if not selected:
            messagebox.showwarning("تنبيه", "الرجاء تحديد طلبية من الجدول")
            return
        item = self.tree_orders.item(selected)['values']
        if item[4] == 'جاري التفصيل ✂️':
            messagebox.showinfo("تنبيه", "الطلب بالفعل في مرحلة جاري التفصيل وتم خصم خاماته سابقاً.")
            return
        try: qty = float(item[3])
        except: qty = 1.0
        service.process_order_production_start(item[0], item[2], qty, self.db_file)
        messagebox.showinfo("نجاح", f"تم تحويل الطلب {item[0]} إلى 'جاري التفصيل' وتم سحب الخامات من المخزون وإنشاء القيود المحاسبية.")
        self.load_orders()
