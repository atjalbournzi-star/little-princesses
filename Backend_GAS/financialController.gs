const AccountingController = {
  HEADERS: ["رمز الحساب", "اسم الحساب", "نوع الحساب", "الرصيد", "تاريخ التأسيس"],
  KEY_MAP: { "رمز الحساب": "acc_code", "اسم الحساب": "acc_name", "نوع الحساب": "acc_type", "الرصيد": "balance", "تاريخ التأسيس": "created_date" },
  
  getAccounts: function() {
    getOrCreateSheet(SHEET_ACCOUNTS, this.HEADERS);
    return getRowsMapped(SHEET_ACCOUNTS, this.HEADERS, this.KEY_MAP);
  },
  
  addAccount: function(data) {
    const sheet = getOrCreateSheet(SHEET_ACCOUNTS, this.HEADERS);
    sheet.appendRow([data.acc_code || "", data.acc_name || "", data.acc_type || "", data.balance || 0, data.created_date || todayISO()]);
    return { success: true, message: "Account added successfully" };
  }
};

const VoucherController = {
  HEADERS: ["رقم السند", "نوع السند", "الجهة / العميل", "المبلغ", "العملة", "طريقة الدفع", "رقم الحوالة", "الحساب المرتبط", "التاريخ", "البيان"],
  KEY_MAP: { "رقم السند": "voucher_no", "نوع السند": "type", "الجهة / العميل": "party_name", "المبلغ": "amount", "العملة": "currency", "طريقة الدفع": "pay_method", "رقم الحوالة": "transfer_no", "الحساب المرتبط": "acc_code", "التاريخ": "date", "البيان": "notes" },
  
  getVouchers: function() {
    getOrCreateSheet(SHEET_VOUCHERS, this.HEADERS);
    return getRowsMapped(SHEET_VOUCHERS, this.HEADERS, this.KEY_MAP);
  },
  
  addVoucher: function(data) {
    const sheet = getOrCreateSheet(SHEET_VOUCHERS, this.HEADERS);
    sheet.appendRow([data.voucher_no || "", data.type || "", data.party_name || "", data.amount || 0, data.currency || "USD", data.pay_method || "", data.transfer_no || "", data.acc_code || "", data.date || todayISO(), data.notes || ""]);
    return { success: true, message: "Voucher added successfully" };
  }
};

const ExpenseController = {
  HEADERS: ["ID", "نوع المصروف", "المبلغ", "العملة", "طريقة الدفع", "حساب الدفع", "التاريخ", "ملاحظات"],
  KEY_MAP: { "ID": "id", "نوع المصروف": "exp_type", "المبلغ": "amount", "العملة": "currency", "طريقة الدفع": "pay_method", "حساب الدفع": "source_acc", "التاريخ": "date", "ملاحظات": "notes" },
  
  getExpenses: function() {
    getOrCreateSheet(SHEET_EXPENSES, this.HEADERS);
    return getRowsMapped(SHEET_EXPENSES, this.HEADERS, this.KEY_MAP);
  },
  
  addExpense: function(data) {
    const sheet = getOrCreateSheet(SHEET_EXPENSES, this.HEADERS);
    const newId = Utilities.getUuid();
    sheet.appendRow([newId, data.exp_type || "", data.amount || 0, data.currency || "USD", data.pay_method || "", data.source_acc || "", data.date || todayISO(), data.notes || ""]);
    return { success: true, message: "Expense added successfully", id: newId };
  }
};

const JournalController = {
  HEADERS: ["ID", "رقم القيد", "المدين", "الدائن", "المبلغ", "العملة", "نوع المرجع", "التاريخ", "الشرح"],
  KEY_MAP: { "ID": "id", "رقم القيد": "entry_no", "المدين": "debit", "الدائن": "credit", "المبلغ": "amount", "العملة": "currency", "نوع المرجع": "ref_type", "التاريخ": "date", "الشرح": "notes" },
  
  getJournalEntries: function() {
    getOrCreateSheet(SHEET_JOURNAL, this.HEADERS);
    return getRowsMapped(SHEET_JOURNAL, this.HEADERS, this.KEY_MAP);
  },
  
  addJournalEntry: function(data) {
    const sheet = getOrCreateSheet(SHEET_JOURNAL, this.HEADERS);
    const newId = Utilities.getUuid();
    sheet.appendRow([newId, data.entry_no || "", data.debit || "", data.credit || "", data.amount || 0, data.currency || "USD", data.ref_type || "", data.date || todayISO(), data.notes || ""]);
    return { success: true, message: "Journal entry added successfully", id: newId };
  }
};
