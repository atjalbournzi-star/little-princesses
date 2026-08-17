import tkinter as tk
from tkinter import ttk, messagebox
import sqlite3
import datetime

class MarketingModule:
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
        # Top Dashboard
        self.dash_frame = tk.LabelFrame(self.frame, text=" 📊 مؤشرات الأداء التسويقي (Marketing Intelligence) ", font=("Arial", 11, "bold"), padx=10, pady=10)
        self.dash_frame.pack(fill=tk.X, padx=10, pady=5)

        self.lbl_spend = tk.Label(self.dash_frame, text="إجمالي الإنفاق: $0", font=("Arial", 11, "bold"), fg="#c0392b")
        self.lbl_spend.grid(row=0, column=4, padx=20, pady=5)

        self.lbl_revenue = tk.Label(self.dash_frame, text="إجمالي الإيرادات (للإعلانات): $0", font=("Arial", 11, "bold"), fg="#27ae60")
        self.lbl_revenue.grid(row=0, column=3, padx=20, pady=5)

        self.lbl_cac = tk.Label(self.dash_frame, text="تكلفة اكتساب العميل (CAC): $0", font=("Arial", 11, "bold"), fg="#2980b9")
        self.lbl_cac.grid(row=0, column=2, padx=20, pady=5)

        self.lbl_roas = tk.Label(self.dash_frame, text="العائد الإعلاني (ROAS): 0x", font=("Arial", 11, "bold"), fg="#8e44ad")
        self.lbl_roas.grid(row=0, column=1, padx=20, pady=5)

        self.lbl_winning = tk.Label(self.dash_frame, text="🏆 الإعلان الفائز: لا يوجد", font=("Arial", 11, "bold"), fg="#f39c12")
        self.lbl_winning.grid(row=0, column=0, padx=20, pady=5)

        # Campaign Entry Form
        f_in = tk.LabelFrame(self.frame, text=" ➕ إضافة حملة إعلانية جديدة ", font=("Arial", 11, "bold"), padx=10, pady=10)
        f_in.pack(fill=tk.X, padx=10, pady=5)

        tk.Label(f_in, text="اسم الحملة:").grid(row=0, column=7, padx=5, pady=5, sticky="e")
        self.ent_campaign_name = tk.Entry(f_in, font=("Arial", 10), justify="right", width=15)
        self.ent_campaign_name.grid(row=0, column=6, padx=5, pady=5)

        tk.Label(f_in, text="المنصة:").grid(row=0, column=5, padx=5, pady=5, sticky="e")
        self.combo_platform = ttk.Combobox(f_in, values=["Instagram", "Facebook", "TikTok", "WhatsApp", "Organic", "Other"], state="readonly", width=12)
        self.combo_platform.grid(row=0, column=4, padx=5, pady=5)
        self.combo_platform.current(0)

        tk.Label(f_in, text="نوع المحتوى:").grid(row=0, column=3, padx=5, pady=5, sticky="e")
        self.combo_creative = ttk.Combobox(f_in, values=["فيديو خياطة وبطانة", "صور فوتوسيشن", "فيديوهات أطفال", "أخرى"], state="readonly", width=15)
        self.combo_creative.grid(row=0, column=2, padx=5, pady=5)
        self.combo_creative.current(0)

        tk.Label(f_in, text="الإنفاق ($):").grid(row=0, column=1, padx=5, pady=5, sticky="e")
        self.ent_spend = tk.Entry(f_in, font=("Arial", 10), justify="right", width=8)
        self.ent_spend.grid(row=0, column=0, padx=5, pady=5)

        btn_add = tk.Button(f_in, text="🚀 إطلاق الحملة / حفظ", bg="#2980b9", fg="white", font=("Arial", 10, "bold"), command=self.save_campaign)
        btn_add.grid(row=1, column=0, columnspan=8, pady=10)

        # Treeview
        columns = ("id", "name", "platform", "creative", "spend", "date", "status")
        self.tree = ttk.Treeview(self.frame, columns=columns, show="headings")
        headings = ["ID", "اسم الحملة", "المنصة", "نوع المحتوى", "الإنفاق ($)", "تاريخ البدء", "الحالة"]
        for col, h in zip(columns, headings):
            self.tree.heading(col, text=h)
            self.tree.column(col, anchor="center")
        self.tree.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        self.load_data()

    def save_campaign(self):
        name = self.ent_campaign_name.get().strip()
        platform = self.combo_platform.get()
        creative = self.combo_creative.get()
        try:
            spend = float(self.ent_spend.get())
        except:
            spend = 0.0

        if not name:
            messagebox.showerror("خطأ", "يرجى إدخال اسم الحملة")
            return

        date_now = datetime.datetime.now().strftime("%Y-%m-%d")
        conn = self.get_db()
        c = conn.cursor()
        try:
            c.execute("INSERT INTO marketing_campaigns (campaign_name, platform, creative_type, spend, start_date) VALUES (?, ?, ?, ?, ?)",
                      (name, platform, creative, spend, date_now))
            
            # Post to expenses
            c.execute("INSERT INTO expenses (exp_type, amount, currency, notes, date) VALUES (?, ?, ?, ?, ?)",
                      ("إعلانات وتسويق", spend, "USD $", f"حملة: {name} - {platform}", date_now))
            
            conn.commit()
            
            try:
                import urllib.request
                import json
                gas_payload = {
                    "action": "addMarketingCampaign",
                    "data": {
                        "campaign_name": name,
                        "platform": platform,
                        "creative_type": creative,
                        "spend": spend,
                        "status": "نشط",
                        "start_date": date_now
                    }
                }
                req = urllib.request.Request("http://127.0.0.1:5000/api/gas", data=json.dumps(gas_payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
                urllib.request.urlopen(req, timeout=3)
            except Exception as e:
                print("GAS Sync error:", e)
                
            messagebox.showinfo("نجاح", "تم حفظ الحملة وتسجيل المصروف بنجاح.")
            
            self.ent_campaign_name.delete(0, tk.END)
            self.ent_spend.delete(0, tk.END)
            self.load_data()
        except Exception as e:
            messagebox.showerror("خطأ", f"تعذر حفظ الحملة:\n{e}")
        finally:
            conn.close()

    def load_data(self):
        for row in self.tree.get_children():
            self.tree.delete(row)

        conn = self.get_db()
        c = conn.cursor()
        
        c.execute("SELECT * FROM marketing_campaigns ORDER BY id DESC")
        rows = c.fetchall()
        for r in rows:
            self.tree.insert("", "end", values=(r["id"], r["campaign_name"], r["platform"], r["creative_type"], f"${r['spend']}", r["start_date"], r["status"]))
        
        # Calculate Analytics
        c.execute("SELECT SUM(spend) as total_spend FROM marketing_campaigns")
        res = c.fetchone()
        total_spend = res["total_spend"] if res and res["total_spend"] else 0.0

        # Query revenue from orders linked to customers acquired from campaigns
        # assuming customers_full has ad_campaign and orders_full (or sales_orders) links to customer_name
        # Note: Depending on exactly which order table is used (sales_orders, sales_orders_full, orders). 
        # Using orders table since it seems primary in some views. We will check `sales_orders_full` and `orders`.
        # For safety we check `sales_orders_full` or `orders` joining `customers_full` or `customers`.
        
        # First let's check customers_full join sales_orders
        try:
            c.execute("""
            SELECT COUNT(DISTINCT c.id) as cust_count, SUM(o.total_amount) as total_rev
            FROM customers c
            JOIN orders o ON c.name = o.customer_name
            WHERE c.ad_campaign != '' AND c.ad_campaign IS NOT NULL
            """)
            analytics = c.fetchone()
            cust_count = analytics["cust_count"] if analytics and analytics["cust_count"] else 0
            total_rev = analytics["total_rev"] if analytics and analytics["total_rev"] else 0.0
        except:
            cust_count = 0
            total_rev = 0.0

        cac = total_spend / cust_count if cust_count > 0 else 0
        roas = total_rev / total_spend if total_spend > 0 else 0

        self.lbl_spend.config(text=f"إجمالي الإنفاق: ${total_spend:.2f}")
        self.lbl_revenue.config(text=f"إجمالي الإيرادات: ${total_rev:.2f}")
        self.lbl_cac.config(text=f"CAC: ${cac:.2f}")
        self.lbl_roas.config(text=f"ROAS: {roas:.2f}x")

        # Winning Ad Logic
        try:
            c.execute("""
                SELECT c.ad_campaign, SUM(o.total_amount) as rev
                FROM customers c
                JOIN orders o ON c.name = o.customer_name
                WHERE c.ad_campaign != '' AND c.ad_campaign IS NOT NULL
                GROUP BY c.ad_campaign
                ORDER BY rev DESC LIMIT 1
            """)
            winner = c.fetchone()
            if winner and winner["rev"] > 0:
                self.lbl_winning.config(text=f"🏆 الإعلان الفائز: {winner['ad_campaign']} (${winner['rev']:.2f})")
            else:
                self.lbl_winning.config(text="🏆 الإعلان الفائز: لا يوجد بيانات مبيعات")
        except:
            pass

        conn.close()
