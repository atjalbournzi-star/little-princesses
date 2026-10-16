// useHRActions.js - دوال إدارة الموظفين، صرف السلف، الرواتب، واعتماد المستحقات
const { useMemo } = React;

function useHRActions({
  employees, setEmployees, payroll, setPayroll, journal, setJournal,
  factory, payrollMonth, bonus, setBonus, deduction, currentPayroll,
  currencyDisplay, showToast, setAdvances, setAdvanceModalOpen,
  setActiveVoucherForPrint, loadTailorSummaries, loadCommissions, commissions,
}) {
  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'نشط'), [employees]);

  const calculateEmployeeCompletedTasks = (empName) => {
    if (commissions && commissions.length > 0) {
      const list = commissions.filter(c => (c.employee_name === empName || c.employee_id === empName) && c.status === 'Approved');
      if (list.length > 0) return list.reduce((sum, c) => sum + Number(c.pieces_count || 1), 0);
    }
    if (!factory) return 0;
    return factory.filter(f => {
      const isC = f.cutter_name === empName, isT = f.tailor === empName || f.tailor_name === empName;
      const isE = f.embroiderer_name === empName, isF = f.finisher_name === empName;
      if (!isC && !isT && !isE && !isF) return false;
      const prog = Number(f.progress || 0);
      const isReady = f.stage?.includes('جاهز') || f.stage?.includes('تسليم');
      return isReady || (isC && prog >= 40) || (isT && prog >= 60) || (isE && prog >= 80) || (isF && prog >= 100);
    }).length;
  };

  const handleSaveEmployee = async (e, { id, empName, empRole, empType, empSalary, empPhone, empDate, empStatus, resetForm }) => {
    if (e) e.preventDefault();
    if (!empName) return showToast("يرجى إدخال اسم الموظف ⚠️", "error");
    if (!empSalary && empType === 'راتب شهري') return showToast("يرجى إدخال الراتب الأساسي ⚠️", "error");
    const numSal = parseFloat(empSalary) || 0;
    const empData = {
      id: id || ('EMP-' + Date.now()), name: empName, full_name: empName, role: empRole,
      type: empType, employment_type: empType, baseSalary: numSal, base_salary: numSal,
      phone: empPhone, hireDate: empDate, hire_date: empDate, status: empStatus || 'نشط'
    };
    try {
      if (window.hrAPI?.addEmployee) await window.hrAPI.addEmployee(empData);
      else await window.callGAS(id ? 'updateEmployee' : 'addEmployee', empData);
      setEmployees(id ? employees.map(emp => emp.id === id ? { ...emp, ...empData } : emp) : [empData, ...employees]);
      showToast(id ? "تم تحديث بيانات الموظف بنجاح ✅" : "تم تسجيل الموظف بنجاح 👤");
    } catch (err) {
      setEmployees(id ? employees.map(emp => emp.id === id ? { ...emp, ...empData } : emp) : [empData, ...employees]);
      showToast("تم الحفظ محلياً ⚡");
    }
    if (resetForm) resetForm();
  };

  const toggleEmpStatus = async (id) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    const updated = { ...emp, status: emp.status === 'نشط' ? 'موقوف' : 'نشط' };
    try {
      if (window.hrAPI?.addEmployee) await window.hrAPI.addEmployee(updated);
      else await window.callGAS('updateEmployee', updated);
      showToast("تم تحديث حالة الموظف 🔄");
    } catch (err) { showToast("تم التحديث محلياً ⚡"); }
    setEmployees(employees.map(e => e.id === id ? updated : e));
  };

  const deleteEmp = async (id) => {
    if (!confirm("هل أنت متأكد من حذف الموظف نهائياً؟ 🗑️")) return;
    try {
      if (window.hrAPI?.deleteEmployee) await window.hrAPI.deleteEmployee(id);
      else await window.callGAS('deleteEmployee', { id });
      showToast("تم حذف الموظف 🗑️");
    } catch (err) { showToast("تم الحذف محلياً ⚡"); }
    setEmployees(employees.filter(e => e.id !== id));
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
        const tailorTasks = factory.filter(f => (f.tailor === emp.name || f.tailor_name === emp.name || f.cutter_name === emp.name || f.embroiderer_name === emp.name || f.finisher_name === emp.name) && (f.stage === 'تشطيب' || f.stage?.includes('جاهز') || f.stage?.includes('تسليم') || f.stage === 'مكتمل' || (f.progress && Number(f.progress) >= 80)) && (!payrollMonth || f.due_date?.startsWith(payrollMonth)));
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
    const safeCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(currencyDisplay) : (String(currencyDisplay).includes('SAR') ? 'SAR' : (String(currencyDisplay).includes('USD') ? 'USD' : 'YER'));
    const payload = { emp_id: empId, emp_name: empName, amount, currency: safeCurr, account_id: accountId, month: payrollMonth, notes: notes || `سلفة نقدية للموظف ${empName}` };
    const res = await window.hrAPI.addAdvance(payload);
    if (res?.success) {
      showToast(res.message || "تم صرف السلفة وتقييدها باليومية بنجاح ✅", "success");
      if (window.hrAPI.getAdvances) {
        const freshAdv = await window.hrAPI.getAdvances(payrollMonth);
        setAdvances(freshAdv || []);
      }
      if (typeof window.loadAccounts === 'function') window.loadAccounts();
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
        const res = await fetch('/api/hr/payroll/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month: currentPayroll.month, records: [{ ...record, bonus: finalBonus, netSalary: finalNet }] }) }).then(r => r.json());
        if (res?.success) {
          setPayroll(payroll.map(p => p.id === record.id ? { ...p, status: 'تم الصرف ✅', bonus: finalBonus, netSalary: finalNet } : p));
          const newBonus = { ...bonus }; delete newBonus[record.empId]; setBonus(newBonus);
          showToast(res.message || "تم تسليم الراتب بنجاح 💸", "success");
        }
      }
    } catch (e) { showToast(e.message || "حدث خطأ أثناء صرف الراتب", "error"); }
  };

  const handleConsolidatedPayrollPay = async (pendingRecords) => {
    if (!currentPayroll || !pendingRecords || pendingRecords.length === 0) return false;
    try {
      const recordsToPay = pendingRecords.map(r => {
        const b = bonus[r.empId] ? parseFloat(bonus[r.empId]) : 0;
        return { ...r, bonus: (r.bonus || 0) + b, netSalary: (r.netSalary || 0) + b };
      });
      const res = await fetch('/api/hr/payroll/disburse-bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: currentPayroll.month, records: recordsToPay })
      }).then(r => r.json());
      if (res?.success) {
        showToast(res.message || "تم اعتماد وصرف المسير المجمع بنجاح 💸", "success");
        const paidIds = new Set(recordsToPay.map(r => r.id || r.empId));
        setPayroll(payroll.map(p => (paidIds.has(p.id) || paidIds.has(p.employee_id)) ? { ...p, status: 'تم الصرف ✅' } : p));
        setBonus({});
        if (loadTailorSummaries) loadTailorSummaries();
        if (loadCommissions) loadCommissions();
        return true;
      }
      showToast(res?.message || res?.error || "فشل الصرف المجمع", "error");
    } catch (e) { showToast(e.message || "حدث خطأ أثناء الصرف المجمع", "error"); }
    return false;
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

  return { activeEmployees, calculateEmployeeCompletedTasks, handleSaveEmployee, toggleEmpStatus, deleteEmp, handleGeneratePayroll, handleSubmitAdvance, handlePaySalary, handleConsolidatedPayrollPay, handleSubmitPayout };
}

window.useHRActions = useHRActions;
