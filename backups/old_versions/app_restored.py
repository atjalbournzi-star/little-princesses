            tailor_cost = (c_res[1] if c_res else 0.0) * qty

            profit = total - (fabric_cost + tailor_cost)



            cursor.execute('''INSERT INTO orders 

                (order_no, customer_name, product_name, quantity, pay_method, transfer_no, order_date, delivery_date, delivery_fee, total_amount, paid_amount, remaining_amount, profit, qr_code_path) 

                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',

                (ord_no, cust, prod, qty, smethod, tno, now_str, deldate, delfee, total, paid, remain, profit, qr_path))



            cursor.execute("UPDATE accounts SET balance = balance + ? WHERE acc_code = 401", (total,))



            if paid > 0:

                v_no = f"VOUCH-{datetime.datetime.now().strftime('%M%S')}"

                cursor.execute("INSERT INTO vouchers (voucher_no, voucher_type, pay_method, transfer_no, party_name, amount, date_created, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",

                               (v_no, "سند قبض (عربون فاتورة)", smethod, tno, cust, paid, now_str, f"عربون عن الفاتورة رقم {ord_no}"))

                cursor.execute("UPDATE accounts SET balance = balance + ? WHERE acc_code = ?", (paid, target_acc))



            conn.commit()

            conn.close()



            messagebox.showinfo("نجاح الحجز", f"تم حفظ الفاتورة {ord_no} وتوليد رمز הـ QR بنجاح!")

            self.load_orders()

            self.load_vouchers()

            self.load_accounts()

            self.update_dashboard_cash()

        except ValueError:

            messagebox.showerror("خطأ", "ادخل أرقاماً صحيحة!")



    def send_whatsapp_driver(self):

        selected_item = self.tree_sales.selection()

        if not selected_item:

            messagebox.showwarning("تنبيه", "حدد طلبية أولاً!")

            return



        item_vals = self.tree_sales.item(selected_item)['values']

        ord_no = item_vals[1]



        conn = sqlite3.connect('little_princesses.db')

        cursor = conn.cursor()

        cursor.execute("SELECT customer_name, product_name, quantity, delivery_date, pickup_time, delivery_fee, remaining_amount FROM orders WHERE order_no = ?", (ord_no,))

        o_data = cursor.fetchone()



        cursor.execute("SELECT phone, address FROM customers WHERE name = ?", (o_data[0],))

        c_data = cursor.fetchone()

        conn.close()



        c_phone = c_data[0] if c_data else "غير مسجل"

        c_address = c_data[1] if (c_data and c_data[1]) else "العنوان محدد مع العميل"



        del_fee = o_data[5] if o_data[5] else 0.0

        remain = o_data[6] if o_data[6] else 0.0

        total_collect = remain + del_fee



        store = self.get_setting('store_name')



        driver_msg = f"""🛵 أمر توصيل جديد - {store}



📄 رقم الطلب: {ord_no}

⏱️ موعد التسليم للزبون: {o_data[3]}



👤 بيانات الزبون للتواصل:

• الاسم: {o_data[0]}

📞 رقم الهاتف: {c_phone}

📍 العنوان: {c_address}



👗 المنتج: {o_data[1]} (عدد: {o_data[2]})



💵 التحصيل المالي المطلوب من الزبون عند الباب:

• المتبقي من الفستان: ${remain:.2f}

• أجور التوصيل: ${del_fee:.2f}

💰 إجمالي المبلغ المطلوب تحصيله: ${total_collect:.2f}"""



        encoded_msg = urllib.parse.quote(driver_msg)

        webbrowser.open(f"https://api.whatsapp.com/send?text={encoded_msg}")



    def send_whatsapp_production(self):

        selected_item = self.tree_sales.selection()

        if not selected_item:

            messagebox.showwarning("تنبيه", "حدد طلبية أولاً!")

            return



        item_vals = self.tree_sales.item(selected_item)['values']

        ord_no = item_vals[1]



        conn = sqlite3.connect('little_princesses.db')

        cursor = conn.cursor()

        cursor.execute("SELECT customer_name, product_name, quantity, delivery_date FROM orders WHERE order_no = ?", (ord_no,))

        o_data = cursor.fetchone()



        cursor.execute("SELECT phone, unit, total_length, shoulder_width, bust_circ, waist_circ, sleeve_length, chest_length FROM customers WHERE name = ?", (o_data[0],))

        c_data = cursor.fetchone()

        conn.close()



        unit = c_data[1] if c_data else "سم"

        store = self.get_setting('store_name')



        wa_msg = f"""📣 أمر تفصيل وإنتاج جديد - {store}



📄 رقم الفاتورة: {ord_no}

👤 اسم العميل: {o_data[0]}

👗 الفستان: {o_data[1]} | العدد: {o_data[2]}



📐 المقاسات الكاملة ({unit}):

• الطول الكلي: {c_data[2] if c_data else '-'} | عرض الكتف: {c_data[3] if c_data else '-'}

• دوران الصدر: {c_data[4] if c_data else '-'} | دوران الخصر: {c_data[5] if c_data else '-'}

• طول الكم: {c_data[6] if c_data else '-'} | طول الصدر: {c_data[7] if c_data else '-'}



📅 موعد التسليم المطلوب: {o_data[3]}"""



        encoded_msg = urllib.parse.quote(wa_msg)

        webbrowser.open(f"https://api.whatsapp.com/send?text={encoded_msg}")



    def print_invoice(self):

        selected_item = self.tree_sales.selection()

        if not selected_item:

            messagebox.showwarning("تنبيه", "حدد فاتورة أولاً!")

            return



        item_vals = self.tree_sales.item(selected_item)['values']

        store = self.get_setting('store_name')

        ptype = self.get_setting('printer_type')



        win_p = tk.Toplevel(self.root)

        win_p.title(f"معاينة طباعة الإيصال والـ QR Code ({ptype})")

        win_p.geometry("480x650")



        inv_text = f"""

=============================================

         {store}

        إيصال بيع وتفصيل (حراري 80mm)

=============================================

رقم الفاتورة: {item_vals[1]}

العميل: {item_vals[2]}

الفستان: {item_vals[3]} | العدد: {item_vals[4]}

تاريخ التسليم: {item_vals[5]}

---------------------------------------------

المبلغ الإجمالي: ${item_vals[6]}

العربون المدفوع: ${item_vals[7]}

المتبقي عند الاستلام: ${item_vals[8]}

---------------------------------------------

طابعة المهيأة: {ptype}

=============================================

   رمز QR المرفق للطلبية بالفاتورة بالأسفل 👑

=============================================

        """



        txt_widget = tk.Text(win_p, font=("Consolas", 10), height=15, padX=10, padY=10)

        txt_widget.insert(tk.END, inv_text)

        txt_widget.pack(fill=tk.X)



        qr_p = f"qr_codes/{item_vals[1]}.png"

        if os.path.exists(qr_p):

            img = Image.open(qr_p)

            img = img.resize((140, 140), Image.Resampling.LANCZOS)

            photo = ImageTk.PhotoImage(img)



            lbl_qr = tk.Label(win_p, image=photo)

            lbl_qr.image = photo

            lbl_qr.pack(pady=5)



        btn_do_print = tk.Button(win_p, text="🖨️ أرسل للطابعة الحرارية الآن", bg="#27AE60", fg="white", font=("Arial", 11, "bold"), command=lambda: messagebox.showinfo("طباعة", f"تمت الطباعة بنجاح على {ptype}!"))

        btn_do_print.pack(pady=10)



    def load_orders(self):

        for r in self.tree_sales.get_children():

            self.tree_sales.delete(r)

        conn = sqlite3.connect('little_princesses.db')

        cursor = conn.cursor()

        cursor.execute("SELECT id, order_no, customer_name, product_name, quantity, delivery_date, total_amount, paid_amount, remaining_amount, status FROM orders ORDER BY id DESC")

        for row in cursor.fetchall():

            self.tree_sales.insert("", tk.END, values=row)

        conn.close()



    def build_journal_module(self, frame):

        f_in = tk.LabelFrame(frame, text=" قيد يومية مزدوج ", font=("Arial", 11, "bold"), padx=10, pady=10)

        f_in.pack(fill=tk.X, padx=10, pady=5)



        conn = sqlite3.connect('little_princesses.db')

        cursor = conn.cursor()

        cursor.execute("SELECT acc_code, acc_name FROM accounts ORDER BY acc_code ASC")

        acc_options = [f"{row[0]} - {row[1]}" for row in cursor.fetchall()]

        conn.close()



        tk.Label(f_in, text="مدين (من حـ/):").grid(row=0, column=3, padx=5, pady=5, sticky="e")

        self.combo_j_debit = ttk.Combobox(f_in, values=acc_options, state="readonly", width=35)

        self.combo_j_debit.grid(row=0, column=2, padx=5, pady=5)

        if acc_options: self.combo_j_debit.current(0)



        tk.Label(f_in, text="دائن (إلى حـ/):").grid(row=0, column=1, padx=5, pady=5, sticky="e")

        self.combo_j_credit = ttk.Combobox(f_in, values=acc_options, state="readonly", width=35)

        self.combo_j_credit.grid(row=0, column=0, padx=5, pady=5)

        if acc_options: self.combo_j_credit.current(0)



        tk.Label(f_in, text="المبلغ ($):").grid(row=1, column=3, padx=5, pady=5, sticky="e")

        self.ent_j_amount = tk.Entry(f_in, font=("Arial", 10), justify="right")

        self.ent_j_amount.grid(row=1, column=2, padx=5, pady=5)



        tk.Label(f_in, text="البيان:").grid(row=1, column=1, padx=5, pady=5, sticky="e")

        self.ent_j_notes = tk.Entry(f_in, font=("Arial", 10), justify="right", width=35)

        self.ent_j_notes.grid(row=1, column=0, padx=5, pady=5)



        btn_save_j = tk.Button(f_in, text="💾 رحّل القيد المزدوج", bg="#8E44AD", fg="white", font=("Arial", 10, "bold"), command=self.save_journal_entry)

        btn_save_j.grid(row=2, columnspan=4, pady=10)



        columns = ("id", "eno", "date", "debit", "credit", "amount", "notes")

        self.tree_journal = ttk.Treeview(frame, columns=columns, show="headings")

        headings = ["ID", "رقم القيد", "التاريخ", "من حـ/", "إلى حـ/", "المبلغ ($)", "البيان"]

        for col, h in zip(columns, headings):

            self.tree_journal.heading(col, text=h)

            self.tree_journal.column(col, anchor="center")

        self.tree_journal.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)



        self.load_journal_entries()



    def save_journal_entry(self):

        debit = self.combo_j_debit.get()

        credit = self.combo_j_credit.get()

        amount_str = self.ent_j_amount.get()

        notes = self.ent_j_notes.get()



        if not amount_str:

            messagebox.showwarning("تنبيه", "ادخل المبلغ!")

            return



        try:

            amount = float(amount_str)

            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

            e_no = f"JV-{datetime.datetime.now().strftime('%M%S')}"



            d_code = int(debit.split('-')[0].strip())

            c_code = int(credit.split('-')[0].strip())



            conn = sqlite3.connect('little_princesses.db')

            cursor = conn.cursor()



            cursor.execute("INSERT INTO journal_entries (entry_no, entry_date, debit_acc, credit_acc, amount, notes) VALUES (?, ?, ?, ?, ?, ?)",

                           (e_no, now_str, debit, credit, amount, notes))



            cursor.execute("UPDATE accounts SET balance = balance + ? WHERE acc_code = ?", (amount, d_code))

            cursor.execute("UPDATE accounts SET balance = balance - ? WHERE acc_code = ?", (amount, c_code))



            conn.commit()

            conn.close()



            messagebox.showinfo("نجاح", f"تم ترحيل القيد {e_no} بنجاح!")

            self.load_journal_entries()

            self.load_accounts()

            self.update_dashboard_cash()

        except ValueError:

            messagebox.showerror("خطأ", "ادخل مبلغاً صحيحاً!")



    def load_journal_entries(self):

        for r in self.tree_journal.get_children():

            self.tree_journal.delete(r)

        conn = sqlite3.connect('little_princesses.db')

        cursor = conn.cursor()

        cursor.execute("SELECT id, entry_no, entry_date, debit_acc, credit_acc, amount, notes FROM journal_entries ORDER BY id DESC")

        for row in cursor.fetchall():

            self.tree_journal.insert("", tk.END, values=row)

        conn.close()



    def build_products_module(self, frame):

        f_in = tk.LabelFrame(frame, text=" إضافة موديل / فستان جديد ", font=("Arial", 11, "bold"), padx=10, pady=10)

        f_in.pack(fill=tk.X, padx=10, pady=5)



        tk.Label(f_in, text="اسم الموديل:").grid(row=0, column=3, padx=5, pady=5, sticky="e")

        self.ent_p_name = tk.Entry(f_in, font=("Arial", 10), justify="right")

        self.ent_p_name.grid(row=0, column=2, padx=5, pady=5)



        tk.Label(f_in, text="التصنيف:").grid(row=0, column=1, padx=5, pady=5, sticky="e")

        categories_list = ["فستان أميرة (Princess)", "فستان زفاف للأطفال", "فستان حفلات", "فستان مناسبة", "فستان عيد", "زي مدرسي"]

        self.combo_p_cat = ttk.Combobox(f_in, values=categories_list, state="readonly", width=22)

        self.combo_p_cat.grid(row=0, column=0, padx=5, pady=5)

        self.combo_p_cat.current(0)



        tk.Label(f_in, text="سعر البيع ($):").grid(row=1, column=3, padx=5, pady=5, sticky="e")

        self.ent_p_price = tk.Entry(f_in, font=("Arial", 10), justify="right")

        self.ent_p_price.grid(row=1, column=2, padx=5, pady=5)



        tk.Label(f_in, text="تكلفة المواد ($):").grid(row=1, column=1, padx=5, pady=5, sticky="e")

        self.ent_p_fabric = tk.Entry(f_in, font=("Arial", 10), justify="right")

        self.ent_p_fabric.grid(row=1, column=0, padx=5, pady=5)



        tk.Label(f_in, text="تكلفة الخياطة ($):").grid(row=2, column=3, padx=5, pady=5, sticky="e")

        self.ent_p_tailor = tk.Entry(f_in, font=("Arial", 10), justify="right")

        self.ent_p_tailor.grid(row=2, column=2, padx=5, pady=5)



        btn_add_p = tk.Button(f_in, text="➕ إضافة الموديل", bg="#9B59B6", fg="white", font=("Arial", 10, "bold"), command=self.save_product)

        btn_add_p.grid(row=2, column=0, columnspan=2, pady=5)



        columns = ("id", "name", "cat", "price", "fabric", "tailor")

        self.tree_products = ttk.Treeview(frame, columns=columns, show="headings")

        headings = ["ID", "اسم الموديل", "التصنيف", "سعر البيع ($)", "تكلفة المواد ($)", "تكلفة الخياطة ($)"]

        for col, h in zip(columns, headings):

            self.tree_products.heading(col, text=h)

            self.tree_products.column(col, anchor="center")

        self.tree_products.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)



        self.load_products()



    def save_product(self):

        name = self.ent_p_name.get()

        cat = self.combo_p_cat.get()

        price_str = self.ent_p_price.get()

        fabric_str = self.ent_p_fabric.get() or "0"

        tailor_str = self.ent_p_tailor.get() or "0"



        if not name or not price_str:

            messagebox.showwarning("تنبيه", "ادخل الاسم والسعر!")

            return



        try:

            price = float(price_str)

            fabric = float(fabric_str)

            tailor = float(tailor_str)



            conn = sqlite3.connect('little_princesses.db')

            cursor = conn.cursor()

            cursor.execute("INSERT INTO products (name, category, selling_price, fabric_cost, tailoring_cost) VALUES (?, ?, ?, ?, ?)",

                           (name, cat, price, fabric, tailor))

            conn.commit()

            conn.close()



            messagebox.showinfo("نجاح", f"تم إضافة الموديل '{name}' بنجاح!")

            self.ent_p_name.delete(0, tk.END)

            self.ent_p_price.delete(0, tk.END)

            self.ent_p_fabric.delete(0, tk.END)

            self.ent_p_tailor.delete(0, tk.END)

            self.load_products()

            self.refresh_sales_dropdowns()

        except ValueError:

            messagebox.showerror("خطأ", "ادخل أسعار صحيحة!")



    def load_products(self):

        for r in self.tree_products.get_children():

            self.tree_products.delete(r)

        conn = sqlite3.connect('little_princesses.db')

        cursor = conn.cursor()

        cursor.execute("SELECT id, name, category, selling_price, fabric_cost, tailoring_cost FROM products ORDER BY id DESC")

        for row in cursor.fetchall():

            self.tree_products.insert("", tk.END, values=row)

        conn.close()



    # --- 6. موديول إدارة مخزون الأقمشة والمستلزمات v16.0 ---

    def build_inventory_module(self, frame):

        f_in = tk.LabelFrame(frame, text=" إضافة قماش / مستلزم جديد إلى الورشة ", font=("Arial", 11, "bold"), padx=10, pady=10)

        f_in.pack(fill=tk.X, padx=10, pady=5)



        tk.Label(f_in, text="اسم القماش/الصنف:").grid(row=0, column=5, padx=5, pady=5, sticky="e")

        self.ent_inv_name = tk.Entry(f_in, font=("Arial", 10), justify="right")

        self.ent_inv_name.grid(row=0, column=4, padx=5, pady=5)



        tk.Label(f_in, text="التصنيف:").grid(row=0, column=3, padx=5, pady=5, sticky="e")

        self.combo_inv_cat = ttk.Combobox(f_in, values=["قماش ساتان", "قماش تول", "قماش جوبير/دانتيل", "قماش زي مدرسي", "خيوط وسحابات", "إكسسوارات وخرز"], state="readonly", width=18)

        self.combo_inv_cat.grid(row=0, column=2, padx=5, pady=5)

        self.combo_inv_cat.current(0)



        tk.Label(f_in, text="الكمية المتاحة (بالأمتار):").grid(row=0, column=1, padx=5, pady=5, sticky="e")

        self.ent_inv_qty = tk.Entry(f_in, font=("Arial", 10), justify="right", width=12)

        self.ent_inv_qty.grid(row=0, column=0, padx=5, pady=5)



        tk.Label(f_in, text="تكلفة المتر ($):").grid(row=1, column=5, padx=5, pady=5, sticky="e")

        self.ent_inv_cost = tk.Entry(f_in, font=("Arial", 10), justify="right")

        self.ent_inv_cost.grid(row=1, column=4, padx=5, pady=5)



        tk.Label(f_in, text="حد التنبيه بالنفاذ (متر):").grid(row=1, column=3, padx=5, pady=5, sticky="e")

        self.ent_inv_min = tk.Entry(f_in, font=("Arial", 10), justify="right", width=18)

        self.ent_inv_min.insert(0, "5.0")

        self.ent_inv_min.grid(row=1, column=2, padx=5, pady=5)



        btn_add_inv = tk.Button(f_in, text="🧵 إضافة للمخزون", bg="#16A085", fg="white", font=("Arial", 10, "bold"), command=self.save_inventory_item)

        btn_add_inv.grid(row=1, column=0, columnspan=2, pady=5)



        columns = ("id", "name", "cat", "qty", "cost", "min")

        self.tree_inv = ttk.Treeview(frame, columns=columns, show="headings")

        headings = ["ID", "اسم القماش/الصنف", "التصنيف", "الكمية بالمخزون (متر)", "تكلفة المتر ($)", "حد التنبيه بالنفاذ"]

        for col, h in zip(columns, headings):

            self.tree_inv.heading(col, text=h)

            self.tree_inv.column(col, anchor="center")

        self.tree_inv.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)



        self.load_inventory()



    def save_inventory_item(self):

        name = self.ent_inv_name.get()

        cat = self.combo_inv_cat.get()

        qty_str = self.ent_inv_qty.get() or "0"

        cost_str = self.ent_inv_cost.get() or "0"

        min_str = self.ent_inv_min.get() or "5.0"



        if not name:

            messagebox.showwarning("تنبيه", "ادخل اسم القماش!")

            return



        try:

            qty = float(qty_str)

            cost = float(cost_str)

            min_alert = float(min_str)



            conn = sqlite3.connect('little_princesses.db')

            cursor = conn.cursor()

            cursor.execute("INSERT OR REPLACE INTO inventory (item_name, category, quantity_meters, cost_per_meter, min_alert_qty) VALUES (?, ?, ?, ?, ?)",

                           (name, cat, qty, cost, min_alert))

            conn.commit()

            conn.close()



            messagebox.showinfo("نجاح", f"تم حفظ القماش '{name}' بالمخزون بنجاح!")

            self.ent_inv_name.delete(0, tk.END)

            self.ent_inv_qty.delete(0, tk.END)

            self.ent_inv_cost.delete(0, tk.END)

            self.load_inventory()

        except ValueError:

            messagebox.showerror("خطأ", "ادخل أرقاماً صحيحة!")



    def load_inventory(self):

        for r in self.tree_inv.get_children():

            self.tree_inv.delete(r)

        conn = sqlite3.connect('little_princesses.db')

        cursor = conn.cursor()

        cursor.execute("SELECT id, item_name, category, quantity_meters, cost_per_meter, min_alert_qty FROM inventory ORDER BY id DESC")

        for row in cursor.fetchall():

            self.tree_inv.insert("", tk.END, values=row)

        conn.close()



    def build_customers_module(self, frame):

        f_in = tk.LabelFrame(frame, text=" تسجيل عميل جديد والمقاسات ومنصة التواصل الاجتماعي الذكية ", font=("Arial", 11, "bold"), padx=10, pady=10)

        f_in.pack(fill=tk.X, padx=10, pady=5)



        tk.Label(f_in, text="اسم العميل:").grid(row=0, column=5, padx=5, pady=5, sticky="e")

        self.ent_c_name = tk.Entry(f_in, font=("Arial", 10), justify="right")

        self.ent_c_name.grid(row=0, column=4, padx=5, pady=5)



        tk.Label(f_in, text="رقم الهاتف:").grid(row=0, column=3, padx=5, pady=5, sticky="e")

        self.ent_c_phone = tk.Entry(f_in, font=("Arial", 10), justify="right")

        self.ent_c_phone.grid(row=0, column=2, padx=5, pady=5)



        tk.Label(f_in, text="منصة التواصل:").grid(row=0, column=1, padx=5, pady=5, sticky="e")

        self.combo_c_social_platform = ttk.Combobox(f_in, values=["انستغرام (Instagram)", "تيك توك (TikTok)", "فيسبوك (Facebook)", "واتساب (WhatsApp)"], state="readonly", width=18)

        self.combo_c_social_platform.grid(row=0, column=0, padx=5, pady=5)

        self.combo_c_social_platform.current(0)



        tk.Label(f_in, text="اسم الحساب/المعرف (@):").grid(row=1, column=5, padx=5, pady=5, sticky="e")

        self.ent_c_social = tk.Entry(f_in, font=("Arial", 10), justify="right")

        self.ent_c_social.grid(row=1, column=4, padx=5, pady=5)



        tk.Label(f_in, text="العنوان:").grid(row=1, column=3, padx=5, pady=5, sticky="e")

        self.ent_c_address = tk.Entry(f_in, font=("Arial", 10), justify="right")

        self.ent_c_address.grid(row=1, column=2, padx=5, pady=5)



        tk.Label(f_in, text="وحدة القياس:").grid(row=1, column=1, padx=5, pady=5, sticky="e")

        self.combo_c_unit = ttk.Combobox(f_in, values=["سم (cm)", "إنش (inch)"], state="readonly", width=12)

        self.combo_c_unit.grid(row=1, column=0, padx=5, pady=5)

        self.combo_c_unit.current(0)



        tk.Label(f_in, text="الطول الكلي:").grid(row=2, column=5, padx=5, pady=5, sticky="e")

        self.ent_c_tlen = tk.Entry(f_in, font=("Arial", 10), justify="right", width=15)

        self.ent_c_tlen.grid(row=2, column=4, padx=5, pady=5)



        tk.Label(f_in, text="عرض الكتف:").grid(row=2, column=3, padx=5, pady=5, sticky="e")

        self.ent_c_shw = tk.Entry(f_in, font=("Arial", 10), justify="right", width=15)

        self.ent_c_shw.grid(row=2, column=2, padx=5, pady=5)



        tk.Label(f_in, text="دوران الصدر:").grid(row=2, column=1, padx=5, pady=5, sticky="e")

        self.ent_c_bust = tk.Entry(f_in, font=("Arial", 10), justify="right", width=12)

        self.ent_c_bust.grid(row=2, column=0, padx=5, pady=5)



        tk.Label(f_in, text="دوران الخصر:").grid(row=3, column=5, padx=5, pady=5, sticky="e")

        self.ent_c_waist = tk.Entry(f_in, font=("Arial", 10), justify="right", width=15)

        self.ent_c_waist.grid(row=3, column=4, padx=5, pady=5)



        tk.Label(f_in, text="طول الكم:").grid(row=3, column=3, padx=5, pady=5, sticky="e")

        self.ent_c_sleeve = tk.Entry(f_in, font=("Arial", 10), justify="right", width=15)

        self.ent_c_sleeve.grid(row=3, column=2, padx=5, pady=5)



        tk.Label(f_in, text="طول الصدر:").grid(row=3, column=1, padx=5, pady=5, sticky="e")

        self.ent_c_chestlen = tk.Entry(f_in, font=("Arial", 10), justify="right", width=12)

        self.ent_c_chestlen.grid(row=3, column=0, padx=5, pady=5)

        tk.Label(f_in, text="مصدر الاكتساب:").grid(row=4, column=5, padx=5, pady=5, sticky="e")
        self.combo_c_source = ttk.Combobox(f_in, values=["Organic", "Paid Ads", "Referral", "Other"], state="readonly", width=15)
        self.combo_c_source.grid(row=4, column=4, padx=5, pady=5)
        self.combo_c_source.current(0)

        tk.Label(f_in, text="اسم الحملة الإعلانية:").grid(row=4, column=3, padx=5, pady=5, sticky="e")
        self.ent_c_campaign = tk.Entry(f_in, font=("Arial", 10), justify="right", width=15)
        self.ent_c_campaign.grid(row=4, column=2, padx=5, pady=5)

        btn_add_c = tk.Button(f_in, text="📐 حفظ العميل والبيانات", bg="#E67E22", fg="white", font=("Arial", 10, "bold"), command=self.save_customer)

        btn_add_c.grid(row=5, column=3, columnspan=3, pady=10)



        btn_social_msg = tk.Button(f_in, text="📲 فتح حساب العميل / المراسلة الذكية", bg="#8E44AD", fg="white", font=("Arial", 10, "bold"), command=self.open_social_chat)

        btn_social_msg.grid(row=5, column=0, columnspan=3, pady=10)



        columns = ("id", "name", "phone", "platform", "social", "address", "unit", "tlen", "shw", "bust", "waist", "sleeve", "chestlen")

        self.tree_cust = ttk.Treeview(frame, columns=columns, show="headings")

        headings = ["ID", "اسم العميل", "الهاتف", "المنصة", "اسم الحساب", "العنوان", "الوحدة", "الطول الكلي", "عرض الكتف", "دوران الصدر", "دوران الخصر", "طول الكم", "طول الصدر"]

        for col, h in zip(columns, headings):

            self.tree_cust.heading(col, text=h)

            self.tree_cust.column(col, anchor="center", width=90)

        self.tree_cust.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)



        self.load_customers()



    def open_social_chat(self):

        selected_item = self.tree_cust.selection()

        if not selected_item:

            messagebox.showwarning("تنبيه", "حدد عميلاً من الجدول لمراسلته أو فتح حسابه!")

            return



        item_vals = self.tree_cust.item(selected_item)['values']

        phone = str(item_vals[2]).strip()

        platform = str(item_vals[3]).strip()

        social_handle = str(item_vals[4]).replace("@", "").strip()



        if "تيك توك" in platform:

            if social_handle:

                webbrowser.open(f"https://www.tiktok.com/@{social_handle}")

                messagebox.showinfo("توجيه تلقائي", f"تم فتح حساب تيك توك: @{social_handle}")

            else:

                messagebox.showwarning("تنبيه", "اسم حساب تيك توك غير مسجل!")

        elif "فيسبوك" in platform:

            if social_handle:

                webbrowser.open(f"https://www.facebook.com/{social_handle}")

                messagebox.showinfo("توجيه تلقائي", f"تم فتح حساب فيسبوك: {social_handle}")

            else:

                messagebox.showwarning("تنبيه", "اسم حساب فيسبوك غير مسجل!")

        elif "واتساب" in platform:

            if phone:

                webbrowser.open(f"https://api.whatsapp.com/send?phone={phone}")

                messagebox.showinfo("توجيه تلقائي", f"تم فتح المحادثة المباشرة عبر الواتساب مع {phone}")

            else:

                messagebox.showwarning("تنبيه", "رقم الهاتف غير مسجل!")

        else:

            if social_handle:

                webbrowser.open(f"https://www.instagram.com/{social_handle}")

                messagebox.showinfo("توجيه تلقائي", f"تم فتح حساب انستغرام: @{social_handle}")

            else:

                messagebox.showwarning("تنبيه", "اسم حساب انستغرام غير مسجل!")



    def save_customer(self):

        name = self.ent_c_name.get()

        phone = self.ent_c_phone.get()

        platform = self.combo_c_social_platform.get()

        social = self.ent_c_social.get()

        address = self.ent_c_address.get()

        unit = self.combo_c_unit.get()

        tlen = self.ent_c_tlen.get()

        shw = self.ent_c_shw.get()

        bust = self.ent_c_bust.get()

        waist = self.ent_c_waist.get()

        sleeve = self.ent_c_sleeve.get()

        chestlen = self.ent_c_chestlen.get()
        acq_source = getattr(self, "combo_c_source", None) and self.combo_c_source.get() or ""
        ad_campaign = getattr(self, "ent_c_campaign", None) and self.ent_c_campaign.get() or ""



        if not name:

            messagebox.showwarning("تنبيه", "ادخل اسم العميل!")

            return



        conn = sqlite3.connect('little_princesses.db')

        cursor = conn.cursor()

        cursor.execute(\'\'\'INSERT INTO customers 
            (name, phone, social_platform, social_handle, address, unit, total_length, shoulder_width, bust_circ, waist_circ, sleeve_length, chest_length, acquisition_source, ad_campaign) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\'\'\',
            (name, phone, platform, social, address, unit, tlen, shw, bust, waist, sleeve, chestlen, acq_source, ad_campaign))

        conn.commit()

        conn.close()



        messagebox.showinfo("نجاح", f"تم حفظ العميل '{name}' والمنصة والمقاسات بنجاح!")

        self.load_customers()

        self.refresh_sales_dropdowns()



    def load_customers(self):

        for r in self.tree_cust.get_children():

            self.tree_cust.delete(r)

        conn = sqlite3.connect('little_princesses.db')

        cursor = conn.cursor()

        cursor.execute("SELECT id, name, phone, social_platform, social_handle, address, unit, total_length, shoulder_width, bust_circ, waist_circ, sleeve_length, chest_length FROM customers ORDER BY id DESC")

        for row in cursor.fetchall():

            self.tree_cust.insert("", tk.END, values=row)

        conn.close()



    def build_statements_module(self, frame):

        f_top = tk.Frame(frame)

        f_top.pack(fill=tk.X, padx=10, pady=10)



        tk.Label(f_top, text="ابحث عن اسم العميل/الخياط لرؤية كشف الحساب المفصل:", font=("Arial", 11, "bold")).pack(side=tk.RIGHT, padx=5)

        self.ent_stmt_search = tk.Entry(f_top, font=("Arial", 10), justify="right")

        self.ent_stmt_search.pack(side=tk.RIGHT, padx=5)



        btn_search = tk.Button(f_top, text="🔍 عرض كشف الحساب", bg="#34495E", fg="white", font=("Arial", 10, "bold"), command=self.search_statement)

        btn_search.pack(side=tk.RIGHT, padx=5)



        columns = ("type", "ref_no", "date", "party", "amount", "notes")

        self.tree_stmt = ttk.Treeview(frame, columns=columns, show="headings")

        headings = ["نوع الحركة", "رقم المرجع", "التاريخ", "الطرف", "المبلغ ($)", "البيان والتفاصيل"]

        for col, h in zip(columns, headings):

            self.tree_stmt.heading(col, text=h)

            self.tree_stmt.column(col, anchor="center")

        self.tree_stmt.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)



    def search_statement(self):

        query = self.ent_stmt_search.get()

        if not query: return



        for r in self.tree_stmt.get_children():

            self.tree_stmt.delete(r)



        conn = sqlite3.connect('little_princesses.db')

        cursor = conn.cursor()



        cursor.execute("SELECT 'فاتورة مبيعات', order_no, order_date, customer_name, total_amount, product_name FROM orders WHERE customer_name LIKE ?", (f"%{query}%",))

        for row in cursor.fetchall():

            self.tree_stmt.insert("", tk.END, values=row)



        cursor.execute("SELECT voucher_type, voucher_no, date_created, party_name, amount, notes FROM vouchers WHERE party_name LIKE ?", (f"%{query}%",))

        for row in cursor.fetchall():

            self.tree_stmt.insert("", tk.END, values=row)



        conn.close()



    def build_accounts_module(self, frame):

        columns = ("code", "name", "type", "balance")

        self.tree_acc = ttk.Treeview(frame, columns=columns, show="headings")

        headings = ["رقم الحساب", "اسم الحساب", "نوع الحساب", "الرصيد الحالي ($)"]

        for col, h in zip(columns, headings):

            self.tree_acc.heading(col, text=h)

            self.tree_acc.column(col, anchor="center")

        self.tree_acc.pack(fill=tk.BOTH, expand=True, padx=10, pady=15)



        self.load_accounts()



    def load_accounts(self):

        if hasattr(self, 'tree_acc'):

            for r in self.tree_acc.get_children():

                self.tree_acc.delete(r)

            conn = sqlite3.connect('little_princesses.db')

            cursor = conn.cursor()

            cursor.execute("SELECT acc_code, acc_name, acc_type, balance FROM accounts ORDER BY acc_code ASC")

            for r in cursor.fetchall():

                self.tree_acc.insert("", tk.END, values=r)

            conn.close()



    def build_settings_module(self, frame):

        f_store = tk.LabelFrame(frame, text=" ⚙️ الإعدادات العامة للمتجر والطابعة ", font=("Arial", 11, "bold"), padx=10, pady=10)

        f_store.pack(fill=tk.X, padx=10, pady=5)



        tk.Label(f_store, text="اسم المتجر/المشروع:").grid(row=0, column=3, padx=5, pady=5, sticky="e")

        self.ent_sett_store = tk.Entry(f_store, font=("Arial", 10), justify="right", width=30)

        self.ent_sett_store.insert(0, self.get_setting('store_name'))

        self.ent_sett_store.grid(row=0, column=2, padx=5, pady=5)



        tk.Label(f_store, text="إيميل النسخ الاحتياطي:").grid(row=0, column=1, padx=5, pady=5, sticky="e")

        self.ent_sett_email = tk.Entry(f_store, font=("Arial", 10), justify="right", width=30)

        self.ent_sett_email.insert(0, self.get_setting('backup_email'))

        self.ent_sett_email.grid(row=0, column=0, padx=5, pady=5)



        tk.Label(f_store, text="نوع الطابعة المعرف:").grid(row=1, column=3, padx=5, pady=5, sticky="e")

        self.combo_sett_printer = ttk.Combobox(f_store, values=["طابعة حرارية 80mm (Thermal POS)", "طابعة مستندات ورقية (A4 / A5)"], state="readonly", width=28)

        self.combo_sett_printer.grid(row=1, column=2, padx=5, pady=5)

        self.combo_sett_printer.set(self.get_setting('printer_type'))



        btn_save_sett = tk.Button(f_store, text="💾 حفظ الإعدادات العامة", bg="#2980B9", fg="white", font=("Arial", 10, "bold"), command=self.save_general_settings)

        btn_save_sett.grid(row=1, column=0, columnspan=2, pady=5)



        f_users = tk.LabelFrame(frame, text=" 🔐 إدارة المستخدمين وتوزيع الصلاحيات ", font=("Arial", 11, "bold"), padx=10, pady=10)

        f_users.pack(fill=tk.X, padx=10, pady=5)



        tk.Label(f_users, text="اسم مستخدم جديد:").grid(row=0, column=5, padx=5, pady=5, sticky="e")

        self.ent_u_name = tk.Entry(f_users, font=("Arial", 10), justify="right", width=15)

        self.ent_u_name.grid(row=0, column=4, padx=5, pady=5)



        tk.Label(f_users, text="كلمة السر:").grid(row=0, column=3, padx=5, pady=5, sticky="e")

        self.ent_u_pass = tk.Entry(f_users, font=("Arial", 10), justify="right", width=15)

        self.ent_u_pass.grid(row=0, column=2, padx=5, pady=5)



        tk.Label(f_users, text="الصلاحية:").grid(row=0, column=1, padx=5, pady=5, sticky="e")

        self.combo_u_role = ttk.Combobox(f_users, values=["المدير العام", "كاشير ومبيعات", "مديرة الورشة"], state="readonly", width=15)

        self.combo_u_role.grid(row=0, column=0, padx=5, pady=5)

        self.combo_u_role.current(1)



        btn_add_user = tk.Button(f_users, text="👤 إضافة المستخدم", bg="#8E44AD", fg="white", font=("Arial", 10, "bold"), command=self.add_user)

        btn_add_user.grid(row=1, column=0, columnspan=6, pady=8)



        f_bk = tk.LabelFrame(frame, text=" 💾 النسخ الاحتياطي والاستعادة ", font=("Arial", 11, "bold"), padx=10, pady=10)

        f_bk.pack(fill=tk.X, padx=10, pady=5)



        btn_manual_bk = tk.Button(f_bk, text="📂 أخذ نسخة احتياطية فورية (Backup)", bg="#27AE60", fg="white", font=("Arial", 10, "bold"), command=self.manual_backup)

        btn_manual_bk.pack(side=tk.LEFT, padx=15)



    def save_general_settings(self):

        s_name = self.ent_sett_store.get()

        s_email = self.ent_sett_email.get()

        s_print = self.combo_sett_printer.get()



        conn = sqlite3.connect('little_princesses.db')

        cursor = conn.cursor()

        cursor.execute("REPLACE INTO settings (key, value) VALUES ('store_name', ?)", (s_name,))

        cursor.execute("REPLACE INTO settings (key, value) VALUES ('backup_email', ?)", (s_email,))

        cursor.execute("REPLACE INTO settings (key, value) VALUES ('printer_type', ?)", (s_print,))

        conn.commit()

        conn.close()



        messagebox.showinfo("نجاح", "تم حفظ الإعدادات العامة بنجاح!")



    def add_user(self):

        u = self.ent_u_name.get()

        p = self.ent_u_pass.get()

        r = self.combo_u_role.get()



        if not u or not p:

            messagebox.showwarning("تنبيه", "ادخل اسم المستخدم وكلمة السر!")

            return



        try:

            conn = sqlite3.connect('little_princesses.db')

            cursor = conn.cursor()

            cursor.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", (u, p, r))

            conn.commit()

            conn.close()

            messagebox.showinfo("نجاح", f"تم إضافة المستخدم '{u}' بنجاح!")

            self.ent_u_name.delete(0, tk.END)

            self.ent_u_pass.delete(0, tk.END)

        except sqlite3.IntegrityError:

            messagebox.showerror("خطأ", "اسم المستخدم موجود مسبقاً!")



    def manual_backup(self):

        try:

            if not os.path.exists('backups'):

                os.makedirs('backups')

            now_str = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")

            backup_path = f"backups/manual_backup_{now_str}.db"

            shutil.copy('little_princesses.db', backup_path)

            messagebox.showinfo("النسخ الاحتياطي", f"تم حفظ النسخة الاحتياطية بنجاح:\n{backup_path}")

        except Exception as e:

            messagebox.showerror("خطأ", f"حدث خطأ: {e}")



    def update_dashboard_cash(self):

        conn = sqlite3.connect('little_princesses.db')

        cursor = conn.cursor()

        cursor.execute("SELECT balance FROM accounts WHERE acc_code = 101")

        res = cursor.fetchone()

        cash_balance = res[0] if res else 0.0



        cursor.execute("SELECT balance FROM accounts WHERE acc_code = 103")

        res_b = cursor.fetchone()

        bank_balance = res_b[0] if res_b else 0.0



        cursor.execute("SELECT SUM(profit) FROM orders")

        res_p = cursor.fetchone()

        total_profit = res_p[0] if res_p[0] else 0.0

        conn.close()



        if hasattr(self, 'lbl_dash_cash'):

            self.lbl_dash_cash.config(text=f"${cash_balance:.2f}")

        if hasattr(self, 'lbl_dash_bank'):

            self.lbl_dash_bank.config(text=f"${bank_balance:.2f}")

        if hasattr(self, 'lbl_dash_profit'):

            self.lbl_dash_profit.config(text=f"${total_profit:.2f}")



if __name__ == "__main__":

    init_full_erp_db()

    root = tk.Tk()

    login_app = LoginWindow(root)

    root.mainloop()