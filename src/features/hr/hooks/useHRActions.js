// useHRActions.js - دوال إدارة الموظفين، صرف السلف، الرواتب، واعتماد المستحقات
const { useMemo } = React;

function useHRActions({
  employees, setEmployees, payroll, setPayroll, journal, setJournal,
  factory, payrollMonth, bonus, setBonus, deduction, currentPayroll,
  currencyDisplay, showToast, setAdvances, setAdvanceModalOpen,
  setActiveVoucherForPrint, loadTailorSummaries, loadCommissions,
}) {
  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'نشط'), [employees]);

  const calculateEmployeeCompletedTasks = (empName) => {
    if (!factory) return 0;
    return factory.filter(f => f.tailor === empName &&
      (f.stage === 'تشطيب' || f.stage === 'جاهز للتسليم' || f.stage === 'تسليم' || f.stage === 'مكتمل' || (f.progress && Number(f.progress) >= 80))
    ).length;
  };

  const handleSaveEmployee = async (e, { id, empName, empRole, empType, empSalary, empPhone, empDate, empStatus, resetForm }) => {
    if (e) e.preventDefault();
    if (!empName) return showToast("يرجى إدخال اسم الموظف ⚠️", "error");
    if (!empSalary) return showToast("يرجى إدخال الراتب الأساسي أو سعر القطعة ⚠️", "error");

    if (id) {
      const updated = { id, name: empName, role: empRole, type: empType, baseSalary: parseFloat(empSalary) || 0, base_salary: parseFloat(empSalary) || 0, phone: empPhone, hireDate: empDate, hire_date: empDate, status: empStatus || 'نشط' };
      try {
        if (window.hrAPI?.addEmployee) await window.hrAPI.addEmployee(updated);
        else await window.callGAS('updateEmployee', updated);
        setEmployees(employees.map(emp => emp.id === id ? { ...emp, ...updated } : emp));
        showToast("تم تحديث بيانات الموظف بنجاح ✅");
      } catch (err) {
        setEmployees(employees.map(emp => emp.id === id ? { ...emp, ...updated } : emp));
        showToast("تم التحديث محلياً ⚡");
      }
      if (resetForm) resetForm();
      return;
    }

    const newEmp = { id: 'EMP-' + Date.now(), name: empName, role: empRole, type: empType, baseSalary: parseFloat(empSalary) || 0, base_salary: parseFloat(empSalary) || 0, phone: empPhone, hireDate: empDate, hire_date: empDate, status: 'نشط' };
    try {
      if (window.hrAPI?.addEmployee) {
        const res = await window.hrAPI.addEmployee(newEmp);
        setEmployees([newEmp, ...employees]);
        showToast(res.message || "تم تسجيل الموظف بنجاح 👤");
      } else {
        await window.callGAS('addEmployee', newEmp);
        setEmployees([newEmp, ...employees]);
        showToast("تم تسجيل الموظف بنجاح 👤");
      }
      if (resetForm) resetForm();
    } catch (err) {
      setEmployees([newEmp, ...employees]);
      showToast(err.message || "تم الحفظ محلياً ⚡");
      if (resetForm) resetForm();
    }
  };

  const toggleEmpStatus = async (id) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    const newStatus = emp.status === 'نشط' ? 'موقوف' : 'نشط';
    try {
      if (window.hrAPI?.addEmployee) await window.hrAPI.addEmployee({ ...emp, status: newStatus });
      else await window.callGAS('updateEmployee', { id, status: newStatus });
      setEmployees(employees.map(e => e.id === id ? { ...e, status: newStatus } : e));
      showToast("تم تحديث حالة الموظف 🔄");
    } catch (err) {
      setEmployees(employees.map(e => e.id === id ? { ...e, status: newStatus } : e));
      showToast("تم التحديث محلياً ⚡");
    }
  };

  const deleteEmp = async (id) => {
    if (confirm("هل أنت متأكد من حذف الموظف نهائياً؟ 🗑️")) {
      try {
        if (window.hrAPI?.deleteEmployee) await window.hrAPI.deleteEmployee(id);
        else await window.callGAS('deleteEmployee', { id });
        setEmployees(employees.filter(e => e.id !== id));
        showToast("تم حذف الموظف 🗑️");
      } catch (err) {
        setEmployees(employees.filter(e => e.id !== id));
        showToast("تم الحذف محلياً ⚡");
      }
    }
  };

  const handleGeneratePayroll = async () => {
    if (activeEmployees.length === 0) return showToast("لا يوجد موظفين نشطين لإصدار رواتبهم ⚠️", "error");
    try {
      if (window.hrAPI?.calculatePayroll) {
        const calculated = await window.hrAPI.calculatePayroll(payrollMonth);
        if (calculated?.length > 0) {
          await fetch('/api/hr/payroll/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records: calculated, month: payrollMonth }) });
          const fresh = await window.hrAPI.getPayroll(payrollMonth);
          setPayroll([...fresh, ...payroll.filter(p => p.month !== payrollMonth)]);
          showToast(`تم احتساب وتحديث مسير رواتب شهر ${payrollMonth} بنجاح 📋`, "success");
          setBonus({}); return;
        }
      }
    } catch (err) { console.warn("Backend calculate payroll error:", err); }

    if (payroll.some(p => p.month === payrollMonth)) return showToast("تم إصدار مسير رواتب لهذا الشهر مسبقاً ⚠️", "error");

    const newRecords = activeEmployees.map((emp, index) => {
      let p = emp.baseSalary || 0, piecesCount = 0, piecesStatement = "";
      if (emp.type === 'بالقطعة' && factory) {
        const tailorTasks = factory.filter(f => f.tailor === emp.name && (f.stage === 'تشطيب' || f.stage === 'جاهز للتسليم' || f.stage === 'تسليم' || f.stage === 'مكتمل' || (f.progress && Number(f.progress) >= 80)) && f.due_date?.startsWith(payrollMonth));
        piecesCount = tailorTasks.length;
        p = piecesCount * (emp.baseSalary || 0);
        piecesStatement = tailorTasks.map(t => `- طلب #${t.order_no} / ${t.product || 'بدون اسم'} | الإنجاز: ${t.due_date}`).join('\n');
      }
      const b = bonus[emp.id] ? parseFloat(bonus[emp.id]) : 0;
      const d = deduction[emp.id] ? parseFloat(deduction[emp.id]) : 0;
      return { id: Date.now() + index, month: payrollMonth, empName: emp.name, type: emp.type || 'راتب شهري', baseValue: emp.baseSalary, piecesCount, totalDue: p, deductions: d, bonus: b, netSalary: p + b - d, status: 'معلق', piecesStatement };
    });

    try {
      await window.callGAS("addPayrollBatch", { records: newRecords });
      setPayroll([...newRecords, ...payroll]);
      showToast("تم توليد مسير الرواتب بنجاح 📋");
      setBonus({});
    } catch (err) {
      setPayroll([...newRecords, ...payroll]);
      showToast("تم حفظ المسير محلياً ⚡");
    }
  };

  const handleSubmitAdvance = async ({ empId, empName, amount, accountId, notes }) => {
    const payload = { emp_id: empId, emp_name: empName, amount, currency: currencyDisplay || 'YER', account_id: accountId, month: payrollMonth, notes: notes || `سلفة نقدية للموظف ${empName}` };
    const res = await window.hrAPI.addAdvance(payload);
    if (res?.success) {
      showToast(res.message || "تم صرف السلفة وتقييدها باليومية بنجاح ✅", "success");
      if (window.hrAPI.getAdvances) {
        const freshAdv = await window.hrAPI.getAdvances(payrollMonth);
        setAdvances(freshAdv || []);
      }
      const targetRec = currentPayroll?.records?.find(r => r.empId === empId || r.name === empName);
      if (targetRec) {
        const newDeduction = (targetRec.deduction || 0) + amount;
        const newNet = (targetRec.netSalary || 0) - amount;
        setPayroll(payroll.map(p => (p.id === targetRec.id || p.employee_id === empId) ? { ...p, deductions: newDeduction, netSalary: newNet } : p));
      }
      if (res.voucher) {
        setActiveVoucherForPrint({ voucher_no: res.voucher.voucher_no, date: res.voucher.date, employee_name: res.voucher.employee_name, payment_method: 'نقدي (كاش)', account_id: res.voucher.account_id, pieces_count: 0, entry_no: res.voucher.entry_no, net_amount: res.voucher.amount, currency: res.voucher.currency, title: 'سند صرف سلفة نقدية (Advance Payment Voucher)', created_by: 'أمين الصندوق' });
      }
      return true;
    }
    showToast(res?.error || "فشل تسجيل السلفة ⚠️", "error");
    return false;
  };

  const handlePaySalary = async (record) => {
    if (!currentPayroll) return;
    const b = bonus[record.empId] ? parseFloat(bonus[record.empId]) : 0;
    const finalBonus = record.bonus + b, finalNet = record.netSalary + b;
    try {
      if (window.hrAPI?.postPayroll) {
        const updatedRecord = { ...record, bonus: finalBonus, netSalary: finalNet, status: 'تم الصرف ✅' };
        const res = await window.hrAPI.postPayroll({ month: currentPayroll.month, records: [updatedRecord] });
        setPayroll(payroll.map(p => p.id === record.id ? { ...p, status: 'تم الصرف ✅', bonus: finalBonus, netSalary: finalNet } : p));
        const newBonus = { ...bonus }; delete newBonus[record.empId]; setBonus(newBonus);
        showToast(res.message || "تم تسليم الراتب وإنشاء القيد المحاسبي المركب 💸", "success");
        if (res.processed_records?.[0]) {
          const proc = res.processed_records[0];
          setActiveVoucherForPrint({ voucher_no: proc.payment_no, date: proc.date, employee_name: proc.emp_name, payment_method: 'نقدي (كاش)', account_id: 'ACC-101', pieces_count: record.piecesCount || 0, entry_no: proc.entry_no, net_amount: proc.net, currency: proc.currency || 'YER', title: `سند صرف راتب ومستحقات شهر ${currentPayroll.month}`, created_by: 'المحاسب المالي' });
        }
      } else {
        const currCode = window.CurrencyService?.normalizeCode(currencyDisplay) || 'YER';
        const rate = window.CurrencyService?.getRate(currCode) || 1.0;
        const baseObj = window.CurrencyService?.toBase(finalNet, currCode, rate) || { base_amount: finalNet, exchange_rate: rate };
        const newEntry = { id: Date.now(), transaction_id: `TX-PAY-${Date.now()}`, entry_no: `PAY-${Date.now().toString().slice(-4)}`, debit: "5121", credit: "1111", amount: finalNet, currency: currCode, exchange_rate: rate, base_amount: baseObj.base_amount, ref_type: "صرف راتب", date: new Date().toISOString().split('T')[0], notes: `راتب ${record.name} لشهر ${currentPayroll.month}` };
        await window.callGAS("addJournalEntry", newEntry);
        if (setJournal) setJournal([newEntry, ...journal]);
        await window.callGAS("updatePayrollRecord", { id: record.id, status: 'تم الصرف ✅', bonus: finalBonus, netSalary: finalNet });
        setPayroll(payroll.map(p => p.id === record.id ? { ...p, status: 'تم الصرف ✅', bonus: finalBonus, netSalary: finalNet } : p));
        const newBonus = { ...bonus }; delete newBonus[record.empId]; setBonus(newBonus);
        showToast("تم تسليم الراتب وإنشاء القيد المحاسبي 💸", "success");
      }
    } catch (e) { showToast(e.message || "حدث خطأ أثناء صرف الراتب", "error"); }
  };

  const handleSubmitPayout = async (payload) => {
    const res = await fetch('/api/hr/tailor-payout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json());
    if (res?.success) {
      showToast(res.message || "تم إصدار سند الصرف وترحيله بنجاح ✅", "success");
      loadTailorSummaries(); loadCommissions();
      if (res.voucher) setActiveVoucherForPrint(res.voucher);
      return true;
    }
    showToast(res?.message || res?.error || "فشل إصدار السند", "error");
    return false;
  };

  return { activeEmployees, calculateEmployeeCompletedTasks, handleSaveEmployee, toggleEmpStatus, deleteEmp, handleGeneratePayroll, handleSubmitAdvance, handlePaySalary, handleSubmitPayout };
}
