import tkinter as tk
from tkinter import ttk, messagebox
import sqlite3
import urllib.request
import json

class ProductsModule:
    def __init__(self, app, frame):
        self.app = app
        self.frame = frame
        self.build_ui()

    def build_ui(self):
        # Frame for Data Entry
        f_in = tk.LabelFrame(self.frame, text=" إضافة موديل / منتج جديد ", font=("Arial", 11, "bold"), padx=10, pady=10)
        f_in.pack(fill=tk.X, padx=10, pady=5)

        # Row 0
        tk.Label(f_in, text="اسم الموديل:").grid(row=0, column=7, padx=5, pady=5, sticky="e")
        self.ent_name = tk.Entry(f_in, font=("Arial", 10), justify="right")
        self.ent_name.grid(row=0, column=6, padx=5, pady=5)

        tk.Label(f_in, text="التصنيف:").grid(row=0, column=5, padx=5, pady=5, sticky="e")
        self.combo_cat = ttk.Combobox(f_in, values=["فساتين سهرة", "فساتين زفاف", "كاجوال", "زي مدرسي"], font=("Arial", 10), justify="right")
        self.combo_cat.grid(row=0, column=4, padx=5, pady=5)

        tk.Label(f_in, text="اسم القماش:").grid(row=0, column=3, padx=5, pady=5, sticky="e")
        self.combo_fabric = ttk.Combobox(f_in, font=("Arial", 10), justify="right", state="readonly")
        self.combo_fabric.grid(row=0, column=2, padx=5, pady=5)
        self.combo_fabric.bind("<<ComboboxSelected>>", self.on_fabric_select)

        # Row 1
        tk.Label(f_in, text="الأمتار المستهلكة:").grid(row=1, column=7, padx=5, pady=5, sticky="e")
        self.ent_meters = tk.Entry(f_in, font=("Arial", 10), justify="right")
        self.ent_meters.grid(row=1, column=6, padx=5, pady=5)
        self.ent_meters.bind("<KeyRelease>", self.calc_total)

        tk.Label(f_in, text="تكلفة متر القماش:").grid(row=1, column=5, padx=5, pady=5, sticky="e")
        self.ent_fab_cost = tk.Entry(f_in, font=("Arial", 10), justify="right", state='readonly')
        self.ent_fab_cost.grid(row=1, column=4, padx=5, pady=5)

        tk.Label(f_in, text="أجرة الخياطة:").grid(row=1, column=3, padx=5, pady=5, sticky="e")
        self.ent_tailor = tk.Entry(f_in, font=("Arial", 10), justify="right")
        self.ent_tailor.grid(row=1, column=2, padx=5, pady=5)
        self.ent_tailor.bind("<KeyRelease>", self.calc_total)

        # Row 2
        tk.Label(f_in, text="التغليف والتنظيف:").grid(row=2, column=7, padx=5, pady=5, sticky="e")
        self.ent_clean = tk.Entry(f_in, font=("Arial", 10), justify="right")
        self.ent_clean.grid(row=2, column=6, padx=5, pady=5)
        self.ent_clean.bind("<KeyRelease>", self.calc_total)

        tk.Label(f_in, text="إجمالي التكلفة (آلي):", fg="blue", font=("Arial", 10, "bold")).grid(row=2, column=5, padx=5, pady=5, sticky="e")
        self.lbl_total = tk.Label(f_in, text="0.0", font=("Arial", 10, "bold"), fg="red")
        self.lbl_total.grid(row=2, column=4, padx=5, pady=5, sticky="w")

        btn_save = tk.Button(f_in, text="💾 حفظ الموديل", bg="#2196F3", fg="white", font=("Arial", 11, "bold"), command=self.save_product)
        btn_save.grid(row=2, column=2, padx=5, pady=5, sticky="we")

        # Treeview
        columns = ("id", "name", "cat", "fabric", "meters", "fab_cost", "tailor", "clean", "total")
        self.tree = ttk.Treeview(self.frame, columns=columns, show="headings", height=15)
        
        headers = ["ID", "اسم الموديل", "التصنيف", "اسم القماش", "الأمتار", "تكلفة القماش (للمتر)", "أجرة الخياطة", "التغليف", "إجمالي التكلفة"]
        for col, h in zip(columns, headers):
            self.tree.heading(col, text=h)
            self.tree.column(col, anchor="center", width=100)
            
        self.tree.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        self.load_dropdowns()
        self.load_data()

    def load_dropdowns(self):
        conn = sqlite3.connect('little_princesses.db')
        c = conn.cursor()
        c.execute("SELECT item_name, cost_per_meter FROM inventory ORDER BY item_name ASC")
        rows = c.fetchall()
        conn.close()
        
        self.fabrics_data = {r[0]: r[1] for r in rows}
        self.combo_fabric['values'] = list(self.fabrics_data.keys())

    def on_fabric_select(self, event=None):
        fab = self.combo_fabric.get()
        cost = self.fabrics_data.get(fab, 0.0)
        self.ent_fab_cost.config(state='normal')
        self.ent_fab_cost.delete(0, tk.END)
        self.ent_fab_cost.insert(0, str(cost))
        self.ent_fab_cost.config(state='readonly')
        self.calc_total()

    def calc_total(self, event=None):
        try:
            m = float(self.ent_meters.get() or 0.0)
            fc = float(self.ent_fab_cost.get() or 0.0)
            t = float(self.ent_tailor.get() or 0.0)
            c = float(self.ent_clean.get() or 0.0)
            
            tot = (m * fc) + t + c
            self.lbl_total.config(text=f"{tot:.2f}")
        except ValueError:
            self.lbl_total.config(text="خطأ في الإدخال")

    def save_product(self):
        name = self.ent_name.get()
        cat = self.combo_cat.get()
        fab = self.combo_fabric.get()
        
        if not name or not fab:
            messagebox.showwarning("تنبيه", "يرجى كتابة اسم الموديل واختيار القماش!")
            return
            
        try:
            m = float(self.ent_meters.get() or 0.0)
            fc = float(self.ent_fab_cost.get() or 0.0)
            t = float(self.ent_tailor.get() or 0.0)
            c = float(self.ent_clean.get() or 0.0)
            tot = (m * fc) + t + c
            
            conn = sqlite3.connect('little_princesses.db')
            cursor = conn.cursor()
            # Ensure columns exist, though we ran ALTER already.
            cursor.execute("""
                INSERT INTO products 
                (name, category, fabric_name, yards_used, fabric_cost, labor_cost, packaging_cost, total_cost)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (name, cat, fab, m, fc, t, c, tot))
            
            p_id = cursor.lastrowid
            
            # Also update BOM in dual inventory automatically
            cursor.execute("""
                INSERT OR REPLACE INTO model_bom (model_name, material_name, qty_needed)
                VALUES (?, ?, ?)
            """, (name, fab, m))
            
            conn.commit()
            conn.close()
            
            messagebox.showinfo("نجاح", "تم حفظ الموديل بنجاح!")
            self.load_data()
            
            # Google Sheets Sync
            self.sync_to_gas(p_id, name, cat, fab, m, fc, t, c, tot)
            
        except Exception as e:
            messagebox.showerror("خطأ", f"حدث خطأ أثناء الحفظ:\\n{str(e)}")
            
    def sync_to_gas(self, p_id, name, cat, fab, m, fc, t, c, tot):
        try:
            payload = {
                "action": "addProduct",
                "data": {
                    "id": p_id,
                    "name": name,
                    "category": cat,
                    "fabric": fab,
                    "meters": m,
                    "fab_cost": fc,
                    "tailor": t,
                    "clean": c,
                    "total": tot
                }
            }
            req = urllib.request.Request("http://127.0.0.1:5000/api/gas", 
                                         data=json.dumps(payload).encode('utf-8'), 
                                         headers={'Content-Type': 'application/json'})
            urllib.request.urlopen(req, timeout=3)
        except Exception as e:
            print("GAS Sync Error (Products):", e)

    def load_data(self):
        for r in self.tree.get_children():
            self.tree.delete(r)
            
        conn = sqlite3.connect('little_princesses.db')
        c = conn.cursor()
        try:
            c.execute("SELECT id, name, category, fabric_name, yards_used, fabric_cost, labor_cost, packaging_cost, total_cost FROM products ORDER BY id DESC")
            for row in c.fetchall():
                self.tree.insert("", tk.END, values=row)
        except Exception as e:
            print("Load err:", e)
        conn.close()
