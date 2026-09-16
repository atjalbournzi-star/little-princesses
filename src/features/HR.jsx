const { useState, useMemo, useEffect } = React;

function HR({ employees = [], setEmployees, payroll = [], setPayroll, accounts = [], journal = [], setJournal, factory = [], showToast, currency }) {
  const [activeTab, setActiveTab] = useState('employees');
  
  // Commission & Piece-rate Records State
  const [commissions, setCommissions] = useState([]);
  const [tailorSummaries, setTailorSummaries] = useState([]);
  const [selectedTailorForPieces, setSelectedTailorForPieces] = useState(null);
  const [tailorPieces, setTailorPieces] = useState([]);
  const [loadingPieces, setLoadingPieces] = useState(false);
  const [selectedTailorForPayout, setSelectedTailorForPayout] = useState(null);
  const [payoutCashAccount, setPayoutCashAccount] = useState('ACC-101');
  const [payoutMethod, setPayoutMethod] = useState('نقدي / كاش');
  const [payoutDeductions, setPayoutDeductions] = useState(0);
  const [payoutNotes, setPayoutNotes] = useState('');
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [activeVoucherForPrint, setActiveVoucherForPrint] = useState(null);

  const loadCommissions = async () => {
    try {
      const res = await fetch('/api/hr/commissions').then(r => r.json());
      if (res && res.success) {
        setCommissions(res.data || []);
      }
    } catch (e) {}
  };

  const loadTailorSummaries = async () => {
    try {
      const res = await fetch('/api/hr/tailors-summary').then(r => r.json());
      if (res && res.success) {
        setTailorSummaries(res.data || []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadCommissions();
    loadTailorSummaries();
  }, []);

  useEffect(() => {
    if (activeTab === 'commissions') {
      loadCommissions();
      loadTailorSummaries();
    }
  }, [activeTab]);

  const handleOpenPiecesModal = async (tailor) => {
    setSelectedTailorForPieces(tailor);
    setLoadingPieces(true);
    try {
      const res = await fetch(`/api/hr/tailor-pieces?employee_name=${encodeURIComponent(tailor.employee_name)}&status=unpaid`).then(r => r.json());
      if (res && res.success) {
        setTailorPieces(res.data || []);
      }
    } catch (e) {
      if (showToast) showToast("تعذر جلب كشف القطع ⚠️", "error");
    } finally {
      setLoadingPieces(false);
    }
  };

  const handleOpenPayoutModal = (tailor) => {
    setSelectedTailorForPayout(tailor);
    setPayoutCashAccount('ACC-101');
    setPayoutMethod('نقدي / كاش');
    setPayoutDeductions(0);
    setPayoutNotes('');
  };

  const handleSubmitPayout = async (e) => {
    if (e) e.preventDefault();
    if (!selectedTailorForPayout) return;
    setSubmittingPayout(true);
    try {
      const payload = {
        employee_name: selectedTailorForPayout.employee_name,
        employee_id: selectedTailorForPayout.employee_id,
        account_id: payoutCashAccount,
        payment_method: payoutMethod === 'نقدي / كاش' ? 'Cash' : 'Bank Transfer',
        deductions: parseFloat(payoutDeductions) || 0,
        notes: payoutNotes,
        created_by: 'المحاسب العام 🧾'
      };
      const res = await fetch('/api/hr/tailor-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res && res.success) {
        if (showToast) showToast(res.message || "تم إصدار سند الصرف وترحيله بنجاح ✅", "success");
        setSelectedTailorForPayout(null);
        loadTailorSummaries();
        loadCommissions();
        if (res.voucher) {
          setActiveVoucherForPrint(res.voucher);
        }
      } else {
        if (showToast) showToast(res.message || res.error || "فشل إصدار السند", "error");
      }
    } catch (err) {
      if (showToast) showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setSubmittingPayout(false);
    }
  };

  // Employee Form State
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('خياط');
  const [empType, setEmpType] = useState('راتب شهري');
  const [empSalary, setEmpSalary] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empDate, setEmpDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Payroll Generator State
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7));
  const [bonus, setBonus] = useState({});
  const [deduction, setDeduction] = useState({});

  const currencyDisplay = currency?.display || 'SAR';

  // ── Employee Management ──
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!empName) return showToast("يرجى إدخال اسم الموظف ⚠️", "error");
    if (!empSalary) return showToast("يرجى إدخال الراتب الأساسي أو سعر القطعة ⚠️", "error");
    
    const newEmp = {
      id: 'EMP-' + Date.now(),
      name: empName,
      role: empRole,
      type: empType,
      baseSalary: parseFloat(empSalary) || 0,
      base_salary: parseFloat(empSalary) || 0,
      phone: empPhone,
      hireDate: empDate,
      hire_date: empDate,
      status: 'نشط'
    };
    
    try {
      if (window.hrAPI && window.hrAPI.addEmployee) {
        const res = await window.hrAPI.addEmployee(newEmp);
        setEmployees([newEmp, ...employees]);
        showToast(res.message || "تم تسجيل الموظف بنجاح 👤");
      } else {
        await window.callGAS('addEmployee', newEmp);
        setEmployees([newEmp, ...employees]);
        showToast("تم تسجيل الموظف بنجاح 👤");
      }
      setEmpName('');
      setEmpRole('خياط');
      setEmpSalary('');
      setEmpPhone('');
    } catch (err) {
      setEmployees([newEmp, ...employees]);
      showToast(err.message || "تم الحفظ محلياً ⚡");
    }
  };

  const toggleEmpStatus = async (id) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    const newStatus = emp.status === 'نشط' ? 'موقوف' : 'نشط';
    
    try {
      await window.callGAS('updateEmployee', { id, status: newStatus });
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
        await window.callGAS('deleteEmployee', { id });
        setEmployees(employees.filter(e => e.id !== id));
        showToast("تم حذف الموظف 🗑️");
      } catch(err) {
        setEmployees(employees.filter(e => e.id !== id));
        showToast("تم الحذف محلياً ⚡");
      }
    }
  };

  const calculateEmployeeCompletedTasks = (empName) => {
    if (!factory) return 0;
    return factory.filter(f => 
      f.tailor === empName && 
      (f.stage === 'تشطيب' || f.stage === 'جاهز للتسليم' || f.stage === 'تسليم' || f.stage === 'مكتمل' || (f.progress && Number(f.progress) >= 80))
    ).length;
  };

  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'نشط'), [employees]);
  
  const handleGeneratePayroll = async () => {
    if (activeEmployees.length === 0) return showToast("لا يوجد موظفين نشطين لإصدار رواتبهم ⚠️", "error");
    
    const existingRecords = payroll.filter(p => p.month === payrollMonth);
    if (existingRecords.length > 0) {
      return showToast("تم إصدار مسير رواتب لهذا الشهر مسبقاً ⚠️", "error");
    }
    
    const newRecords = activeEmployees.map((emp, index) => {
      let p = 0;
      let piecesCount = 0;
      let piecesStatement = "";
      
      if (emp.type === 'بالقطعة' && factory) {
         const tailorTasks = factory.filter(f => 
           f.tailor === emp.name && 
           (f.stage === 'تشطيب' || f.stage === 'جاهز للتسليم' || f.stage === 'تسليم' || f.stage === 'مكتمل' || (f.progress && Number(f.progress) >= 80)) && 
           f.due_date && f.due_date.startsWith(payrollMonth)
         );
         piecesCount = tailorTasks.length;
         p = piecesCount * (emp.baseSalary || 0);
         piecesStatement = tailorTasks.map(t => `- طلب #${t.order_no} / ${t.product || 'بدون اسم'} | القطع: ${t.start_date} | الإنجاز: ${t.due_date}`).join('\n');
      } else {
         p = emp.baseSalary;
      }
      
      const b = bonus[emp.id] ? parseFloat(bonus[emp.id]) : 0;
      const d = deduction[emp.id] ? parseFloat(deduction[emp.id]) : 0;
      const net = p + b - d;
      
      return {
        id: Date.now() + index,
        month: payrollMonth,
        empName: emp.name,
        type: emp.type || 'راتب شهري',
        baseValue: emp.baseSalary,
        piecesCount: piecesCount,
        totalDue: p,
        deductions: d,
        bonus: b,
        netSalary: net,
        status: 'معلق',
        piecesStatement: piecesStatement
      };
    });
    
    try {
      await window.callGAS("addPayrollBatch", { records: newRecords });
      setPayroll([...newRecords, ...payroll]);
      showToast("تم توليد مسير الرواتب بنجاح 📋");
      setBonus({});
      setDeduction({});
    } catch(err) {
      setPayroll([...newRecords, ...payroll]);
      showToast("تم حفظ المسير محلياً ⚡");
    }
  };

  const currentPayroll = useMemo(() => {
    const recordsForMonth = payroll.filter(p => p.month === payrollMonth);
    if (recordsForMonth.length === 0) return null;
    
    const mappedRecords = recordsForMonth.map(r => {
      const emp = employees.find(e => e.name === r.empName) || {};
      return {
        id: r.id,
        empId: emp.id || r.id,
        name: r.empName,
        role: emp.role || 'غير محدد',
        type: r.type,
        baseSalary: r.baseValue,
        piecesCount: r.piecesCount,
        totalDue: r.totalDue,
        pieceWages: r.totalDue,
        bonus: r.bonus,
        deduction: r.deductions,
        netSalary: r.netSalary,
        status: r.status,
        piecesStatement: r.piecesStatement || ""
      };
    });
    
    const isAllPaid = mappedRecords.every(r => r.status.includes('تم الصرف'));
    return {
      month: payrollMonth,
      status: isAllPaid ? 'مكتمل' : 'قيد الصرف',
      records: mappedRecords
    };
  }, [payroll, payrollMonth, employees]);

  const handleAddAdvance = async (record) => {
    if (!currentPayroll) return;
    const amountStr = prompt(`أدخل مبلغ السلفة للموظف ${record.name} (سيتم خصمها من الصندوق مباشرة وتضاف لخصميات الشهر):`);
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return showToast("مبلغ غير صحيح ⚠️", "error");
    
    try {
      if (window.hrAPI && window.hrAPI.addAdvance) {
        const res = await window.hrAPI.addAdvance({
          emp_id: record.empId,
          emp_name: record.name,
          amount: amount,
          notes: `سلفة نقدية للموظف ${record.name} لشهر ${currentPayroll.month}`
        });
        
        const newDeduction = (record.deduction || 0) + amount;
        const newNet = (record.netSalary || 0) - amount;
        
        setPayroll(payroll.map(p => p.id === record.id ? { ...p, deductions: newDeduction, netSalary: newNet } : p));
        showToast(res.message || "تم تسجيل السلفة وتقييدها باليومية ✅", "success");
      } else {
        const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(currencyDisplay) : 'YER';
        const rate = window.CurrencyService ? window.CurrencyService.getRate(currCode) : 1.0;
        const baseObj = window.CurrencyService ? window.CurrencyService.toBase(amount, currCode, rate) : { base_amount: amount, exchange_rate: rate };

        const newEntry = {
          id: Date.now(),
          transaction_id: `TX-ADV-${Date.now()}`,
          entry_no: `ADV-${Date.now().toString().slice(-4)}`,
          debit: '1141',
          credit: '1111',
          amount: amount,
          currency: currCode,
          exchange_rate: rate,
          base_amount: baseObj.base_amount,
          ref_type: "سلفة نقدية",
          date: new Date().toISOString().split('T')[0],
          notes: `سلفة للموظف ${record.name} لشهر ${currentPayroll.month}`
        };
        await window.callGAS("addJournalEntry", newEntry);
        if (setJournal) setJournal([newEntry, ...journal]);
        
        const newDeduction = record.deduction + amount;
        const newNet = record.netSalary - amount;
        
        setPayroll(payroll.map(p => p.id === record.id ? { ...p, deductions: newDeduction, netSalary: newNet } : p));
        showToast("تم تسجيل السلفة وتقييدها باليومية ✅", "success");
      }
    } catch(e) {
       showToast(e.message || "فشل تسجيل السلفة", "error");
    }
  };

  const handlePaySalary = async (record) => {
    if (!currentPayroll) return;
    
    const b = bonus[record.empId] ? parseFloat(bonus[record.empId]) : 0;
    const finalBonus = record.bonus + b;
    const finalNet = record.netSalary + b;
    
    try {
      if (window.hrAPI && window.hrAPI.postPayroll) {
        const updatedRecord = { ...record, bonus: finalBonus, netSalary: finalNet, status: 'تم الصرف ✅' };
        const res = await window.hrAPI.postPayroll({
          month: currentPayroll.month,
          records: [updatedRecord]
        });
        
        setPayroll(payroll.map(p => p.id === record.id ? { ...p, status: 'تم الصرف ✅', bonus: finalBonus, netSalary: finalNet } : p));
        
        const newBonusState = { ...bonus };
        delete newBonusState[record.empId];
        setBonus(newBonusState);
        
        showToast(res.message || "تم تسليم الراتب وإنشاء القيد المحاسبي المركب 💸", "success");
      } else {
        const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(currencyDisplay) : 'YER';
        const rate = window.CurrencyService ? window.CurrencyService.getRate(currCode) : 1.0;
        const baseObj = window.CurrencyService ? window.CurrencyService.toBase(finalNet, currCode, rate) : { base_amount: finalNet, exchange_rate: rate };

        const newEntry = {
          id: Date.now(),
          transaction_id: `TX-PAY-${Date.now()}`,
          entry_no: `PAY-${Date.now().toString().slice(-4)}`,
          debit: "5121",
          credit: "1111",
          amount: finalNet,
          currency: currCode,
          exchange_rate: rate,
          base_amount: baseObj.base_amount,
          ref_type: "صرف راتب",
          date: new Date().toISOString().split('T')[0],
          notes: `راتب ${record.name} لشهر ${currentPayroll.month}`
        };
        await window.callGAS("addJournalEntry", newEntry);
        if (setJournal) setJournal([newEntry, ...journal]);
        
        await window.callGAS("updatePayrollRecord", { id: record.id, status: 'تم الصرف ✅', bonus: finalBonus, netSalary: finalNet });
        setPayroll(payroll.map(p => p.id === record.id ? { ...p, status: 'تم الصرف ✅', bonus: finalBonus, netSalary: finalNet } : p));
        
        const newBonusState = { ...bonus };
        delete newBonusState[record.empId];
        setBonus(newBonusState);
        
        showToast("تم تسليم الراتب وإنشاء القيد المحاسبي 💸", "success");
      }
    } catch (e) {
      showToast(e.message || "حدث خطأ أثناء صرف الراتب", "error");
    }
  };

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* ── Studio Header & KPI Strip ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F2E7F3] text-[#8F2A87] border border-[#E5CEE7] flex items-center justify-center text-xl font-bold shadow-xs">
              {Icons.HR ? <Icons.HR className="w-6 h-6" /> : (Icons.Users ? <Icons.Users className="w-6 h-6" /> : <span>👥</span>)}
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#25232A]">
                إدارة الموارد البشرية والرواتب (HR & Payroll Studio)
              </h1>
              <p className="text-xs text-[#6F6B75] mt-0.5">
                سجل الكادر، احتساب أجور القطعة آلياً من الورشة، ومسير الرواتب المالي
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setActiveTab('employees')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'employees' ? 'bg-[#8F2A87] text-white shadow-xs' : 'bg-[#FAFAFB] text-[#25232A] hover:bg-[#E8E5EA] border border-[#E8E5EA]'
              }`}>
              سجل الموظفين
            </button>
            <button onClick={() => setActiveTab('payroll')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'payroll' ? 'bg-[#8F2A87] text-white shadow-xs' : 'bg-[#FAFAFB] text-[#25232A] hover:bg-[#E8E5EA] border border-[#E8E5EA]'
              }`}>
              مسير الرواتب والسلف
            </button>
            <button onClick={() => setActiveTab('commissions')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'commissions' ? 'bg-[#8F2A87] text-white shadow-xs' : 'bg-[#FAFAFB] text-[#25232A] hover:bg-[#E8E5EA] border border-[#E8E5EA]'
              }`}>
              <span>⭐</span>
              <span>عمولات وأجور الخياطين</span>
              {commissions.length > 0 && (
                <span className="bg-white/20 px-1.5 py-0.2 rounded-full font-mono text-[10px]">{commissions.length}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Employees Tab ── */}
      {activeTab === 'employees' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] h-fit space-y-4">
            <h3 className="font-bold text-sm text-[#25232A] flex items-center gap-2 border-b border-[#E8E5EA] pb-3">
              <span className="text-[#8F2A87]">➕</span> إضافة موظف أو فني جديد
            </h3>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className={labelCls}>الاسم الرباعي <span className="text-[#D64545] font-bold">*</span></label>
                <input type="text" value={empName} onChange={e => setEmpName(e.target.value)} required className={inputCls} placeholder="اسم الموظف..." />
              </div>
              <div>
                <label className={labelCls}>رقم الهاتف</label>
                <input type="tel" value={empPhone} onChange={e => setEmpPhone(e.target.value)} placeholder="05XXXXXXXX" className={inputCls} dir="ltr" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>نظام الدفع</label>
                  <select value={empType} onChange={e => setEmpType(e.target.value)} className={inputCls}>
                    <option value="راتب شهري">راتب شهري ثابت</option>
                    <option value="بالقطعة">أجر بالقطعة / الحبة</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>المسمى الوظيفي</label>
                  <select value={empRole} onChange={e => setEmpRole(e.target.value)} className={inputCls}>
                    <option value="خياط">خياط</option>
                    <option value="قصاص">قصاص</option>
                    <option value="تشطيب">تشطيب</option>
                    <option value="تطريز">تطريز</option>
                    <option value="إدارة">إدارة</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>
                  {empType === 'راتب شهري' ? `الراتب الأساسي (${currencyDisplay}) *` : `أجر القطعة الافتراضي (${currencyDisplay}) *`}
                </label>
                <input type="number" min="0" value={empSalary} onChange={e => setEmpSalary(e.target.value)} required className={inputCls + " font-mono font-bold text-[#8F2A87]"} />
              </div>
              <div>
                <label className={labelCls}>تاريخ التعيين</label>
                <input type="date" lang="en-GB" dir="ltr" value={empDate} onChange={e => setEmpDate(e.target.value)} className={inputCls} />
              </div>
              <button type="submit" className="w-full py-3 bg-[#8F2A87] hover:bg-[#73216C] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer">
                حفظ بيانات الموظف 💾
              </button>
            </form>
          </div>

          {/* Employee List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#25232A] flex items-center gap-2">
                <span>👥</span> قائمة الكادر وفريق العمل ({employees.length})
              </h3>
            </div>
            
            {employees.length === 0 ? (
              <div className="bg-white border border-[#E8E5EA] rounded-2xl p-12 text-center text-[#6F6B75] font-medium">
                <span className="text-4xl block mb-2">📭</span>
                لا يوجد موظفون مسجلون حالياً
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {employees.map(emp => (
                  <div key={emp.id} className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-md transition-all relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-1.5 h-full ${emp.status === 'نشط' ? 'bg-[#009FAE]' : 'bg-[#D64545]'}`}></div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-[#25232A] text-sm">{emp.name}</h4>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-[11px] font-bold text-[#8F2A87] bg-[#F2E7F3] px-2 py-0.5 rounded-md border border-[#E5CEE7]">{emp.role}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${emp.status === 'نشط' ? 'bg-[#E2F5F7] text-[#007F8C]' : 'bg-rose-50 text-[#D64545]'}`}>
                            {emp.status}
                          </span>
                        </div>
                      </div>
                      
                      {['خياط', 'قصاص', 'تشطيب', 'تطريز'].includes(emp.role) && (
                         <div className="text-center bg-[#F2E7F3] px-3 py-1 rounded-xl border border-[#E5CEE7]">
                           <div className="text-xl font-bold font-mono text-[#8F2A87]">{calculateEmployeeCompletedTasks(emp.name)}</div>
                           <div className="text-[9px] text-[#8F2A87] font-semibold">مهام منجزة</div>
                         </div>
                      )}
                    </div>
                    
                    <div className="space-y-1.5 mb-4 text-xs">
                      {emp.phone && (
                        <div className="flex justify-between font-medium">
                          <span className="text-[#6F6B75]">رقم الهاتف:</span>
                          <span className="text-[#25232A] font-mono" dir="ltr">{emp.phone}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium">
                        <span className="text-[#6F6B75]">نظام الدفع:</span>
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${emp.type === 'بالقطعة' ? 'bg-[#FFF1DC] text-[#C97300]' : 'bg-[#E2F5F7] text-[#007F8C]'}`}>
                          {emp.type || 'راتب شهري'}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="text-[#6F6B75]">{emp.type === 'بالقطعة' ? 'أجر القطعة:' : 'الراتب الأساسي:'}</span>
                        <span className="text-[#25232A] font-bold font-mono tabular-nums">
                          {(emp.baseSalary || 0).toLocaleString('en-US')} <span className="text-[10px] font-medium text-[#6F6B75] font-sans">{currencyDisplay}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-[#E8E5EA]">
                      <button onClick={() => toggleEmpStatus(emp.id)} 
                        className="flex-1 py-1.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] border border-[#E8E5EA] rounded-lg text-xs font-bold text-[#25232A] transition cursor-pointer">
                        {emp.status === 'نشط' ? 'إيقاف مؤقت ⏸️' : 'تنشيط ▶️'}
                      </button>
                      <button onClick={() => deleteEmp(emp.id)} 
                        className="w-8 h-8 flex items-center justify-center bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-[#D64545] transition cursor-pointer">
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Payroll Tab ── */}
      {activeTab === 'payroll' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] min-h-[450px] space-y-5">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#FAFAFB] p-4 rounded-xl border border-[#E8E5EA]">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="font-bold text-xs text-[#25232A]">شهر مسير الرواتب:</label>
              <input type="month" lang="en-GB" dir="ltr" value={payrollMonth} onChange={e => setPayrollMonth(e.target.value)}
                className="h-10 px-3 border border-[#E8E5EA] rounded-xl font-bold bg-white text-[#8F2A87] text-xs outline-none" />
            </div>
            
            <button onClick={handleGeneratePayroll}
              className="w-full md:w-auto px-6 py-2.5 bg-[#8F2A87] hover:bg-[#73216C] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer">
              <span>⚙️</span> احتساب وإصدار مسير الرواتب ({payrollMonth})
            </button>
          </div>

          {!currentPayroll ? (
            <div className="text-center p-12 text-[#6F6B75]">
              <span className="text-5xl block mb-3">🧾</span>
              <h3 className="text-sm font-bold text-[#25232A]">لم يتم إصدار مسير رواتب لهذا الشهر بعد</h3>
              <p className="text-xs mt-1">اضغط على الزر أعلاه لتوليد الرواتب واحتساب مستحقات الورشة تلقائياً.</p>
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#25232A]">
                    كشف رواتب شهر <span className="text-[#8F2A87] font-mono">{currentPayroll.month}</span>
                  </h3>
                  <span className={`text-[10.5px] px-2.5 py-0.5 rounded-full font-bold ${
                    currentPayroll.status === 'مكتمل' ? 'bg-[#E2F5F7] text-[#007F8C]' : 'bg-[#FFF1DC] text-[#C97300]'
                  }`}>
                    الحالة: {currentPayroll.status}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                    <tr>
                      <th className="p-3">اسم الموظف</th>
                      <th className="p-3">الوظيفة</th>
                      <th className="p-3">القطع المنجزة</th>
                      <th className="p-3">إجمالي الاستحقاق</th>
                      <th className="p-3 text-[#D64545]">سلف وخصميات</th>
                      <th className="p-3 text-[#007F8C]">مكافآت إضافية</th>
                      <th className="p-3 text-[#8F2A87]">الصافي المستحق</th>
                      <th className="p-3 text-center">إجراءات الصرف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E5EA] bg-white font-medium">
                    {currentPayroll.records.map(r => (
                      <tr key={r.empId} className="hover:bg-[#FAFAFB] transition-colors">
                        <td className="p-3 font-bold text-[#25232A]">{r.name}</td>
                        <td className="p-3 text-[11px] text-[#6F6B75]">{r.role} • {r.type}</td>
                        <td className="p-3">
                          {r.type === 'بالقطعة' ? (
                            <div className="flex flex-col group relative">
                              <span className="text-[#8F2A87] font-bold cursor-help border-b border-dashed border-[#E5CEE7] w-fit flex items-center gap-1 font-mono">
                                {r.piecesCount} قطعة
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#6F6B75] text-[10px]">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-[#25232A] font-mono tabular-nums">
                            {(r.type === 'بالقطعة' ? r.pieceWages : r.baseSalary).toLocaleString('en-US')} <span className="text-[10px] font-medium text-[#6F6B75] font-sans">{currencyDisplay}</span>
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[#D64545] font-bold font-mono tabular-nums">{r.deduction > 0 ? `-${r.deduction.toLocaleString('en-US')}` : '0'}</span>
                            {!r.status.includes('تم الصرف') && (
                              <button onClick={() => handleAddAdvance(r)} title="تسجيل سلفة نقدية"
                                className="bg-rose-50 hover:bg-rose-100 text-[#D64545] px-2 py-0.5 rounded text-[10px] font-bold border border-rose-200 cursor-pointer">
                                سلفة
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          {!r.status.includes('تم الصرف') ? (
                            <input type="number" placeholder="0" 
                              className="w-16 p-1 border border-[#E8E5EA] rounded-lg bg-[#FAFAFB] text-[#007F8C] outline-none text-center font-bold font-mono tabular-nums"
                              value={bonus[r.empId] || ''}
                              onChange={e => setBonus({...bonus, [r.empId]: e.target.value})}
                            />
                          ) : (
                            <span className="text-[#007F8C] font-bold font-mono tabular-nums">{r.bonus > 0 ? `+${r.bonus.toLocaleString('en-US')}` : '0'}</span>
                          )}
                        </td>
                        <td className="p-3 font-bold font-mono tabular-nums text-[#8F2A87]">
                          {r.netSalary.toLocaleString('en-US')} <span className="text-[10px] font-medium text-[#6F6B75] font-sans">{currencyDisplay}</span>
                        </td>
                        <td className="p-3 text-center">
                          {!r.status.includes('تم الصرف') ? (
                            <button onClick={() => handlePaySalary(r)} 
                              className="bg-[#009FAE] hover:bg-[#007F8C] text-white px-3 py-1.5 rounded-lg shadow-xs transition text-[11px] font-bold cursor-pointer">
                              صرف الراتب 💸
                            </button>
                          ) : (
                            <span className="text-[#007F8C] bg-[#E2F5F7] px-2 py-1 rounded-md text-[10.5px] font-bold border border-[#C5ECF0]">تم الصرف ✅</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#FAFAFB] border-t-2 border-[#E8E5EA]">
                    <tr>
                      <td colSpan="6" className="p-3 text-left font-bold text-[#25232A]">إجمالي الرواتب الصافية لهذا الشهر:</td>
                      <td colSpan="2" className="p-3 font-bold font-mono tabular-nums text-[#8F2A87] text-sm">
                        {currentPayroll.records.reduce((sum, r) => sum + r.netSalary, 0).toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75] font-sans">{currencyDisplay}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Commissions & Tailor Quality Gate Tab ── */}
      {activeTab === 'commissions' && (
        <div className="space-y-5 animate-fadeIn">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
              <span className="text-xs text-[#6F6B75] font-semibold block">إجمالي العمولات المعتمدة</span>
              <span className="text-xl font-black font-mono text-[#8F2A87] mt-1 block">
                {commissions.reduce((sum, c) => sum + (c.wage_amount || 0), 0).toLocaleString()} <span className="text-xs text-[#6F6B75] font-sans">{currencyDisplay}</span>
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
              <span className="text-xs text-[#6F6B75] font-semibold block">القطع والمهام المعتمدة</span>
              <span className="text-xl font-black font-mono text-[#007F8C] mt-1 block">
                {commissions.length} <span className="text-xs font-sans text-[#6F6B75]">مهمة</span>
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
              <span className="text-xs text-[#6F6B75] font-semibold block">معدل الالتزام بالمواعيد ⏱️</span>
              <span className="text-xl font-black font-mono text-emerald-600 mt-1 block">
                {commissions.length > 0 
                  ? Math.round((commissions.filter(c => c.is_on_time !== false).length / commissions.length) * 100) 
                  : 100}%
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
              <span className="text-xs text-[#6F6B75] font-semibold block">متوسط تقييم الجودة ⭐</span>
              <span className="text-xl font-black font-mono text-amber-500 mt-1 block">
                {commissions.length > 0
                  ? (commissions.reduce((sum, c) => sum + (c.quality_score || 5), 0) / commissions.length).toFixed(1)
                  : '5.0'} <span className="text-sm">★</span>
              </span>
            </div>
          </div>

          {/* 💼 محفظة أجور القطع التراكمية للخياطين (Accrued Piece-Rate Pool) */}
          <div className="bg-white p-6 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
              <div className="flex items-center gap-2.5">
                <span className="text-xl text-[#8F2A87]">💼</span>
                <div>
                  <h3 className="text-sm font-bold text-[#25232A]">محفظة أجور القطع التراكمية للخياطين (أمر المحاسب)</h3>
                  <p className="text-xs text-[#6F6B75]">تجميع القطع المعتمدة من المعمل، وجاهزة للصرف بسند رسمي وتصفية فورية من الخزينة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { loadTailorSummaries(); loadCommissions(); }}
                className="px-3 py-1.5 rounded-xl bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] text-xs font-bold border border-[#E8E5EA] transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <span>🔄</span>
                <span>تحديث المحفظة</span>
              </button>
            </div>

            {tailorSummaries.length === 0 ? (
              <div className="p-8 text-center text-[#6F6B75] bg-[#FAFAFB] rounded-xl border border-dashed border-[#E8E5EA]">
                <span className="text-3xl block mb-2">🧵</span>
                <p className="text-xs font-bold text-[#25232A]">لا توجد أجور قطع معلقة بانتظار الصرف حالياً</p>
                <p className="text-[11px] text-[#6F6B75] mt-0.5">عندما يعتمد المشرف جودة الفساتين في المعمل ستتجمع القطع هنا تلقائياً لكل خياط.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                    <tr>
                      <th className="p-3">الفني / الخياط</th>
                      <th className="p-3 text-center">القطع المنجزة المعلقة</th>
                      <th className="p-3">المستحق المعلق (جاهز للصرف)</th>
                      <th className="p-3 text-center">متوسط الجودة</th>
                      <th className="p-3 text-center">نسبة الالتزام ⏱️</th>
                      <th className="p-3 text-center">القطع المصروفة سابقاً</th>
                      <th className="p-3 text-center">إجراءات المحاسب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E5EA] bg-white font-medium">
                    {tailorSummaries.map((t, idx) => (
                      <tr key={idx} className="hover:bg-[#FAFAFB] transition-colors">
                        <td className="p-3">
                          <span className="font-bold text-[#25232A] block">{t.employee_name}</span>
                          <span className="text-[10px] text-[#8F2A87] bg-[#F2E7F3] px-2 py-0.5 rounded border border-[#E5CEE7] inline-block mt-0.5">
                            {t.role || 'خياط'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`font-mono font-bold px-2.5 py-1 rounded-full text-xs ${
                            t.unpaid_pieces_count > 0 ? 'bg-[#F2E7F3] text-[#8F2A87] border border-[#E5CEE7]' : 'bg-[#FAFAFB] text-[#6F6B75]'
                          }`}>
                            {t.unpaid_pieces_count} قطعة
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold font-mono text-[#8F2A87] text-sm tabular-nums block">
                            {t.unpaid_total_amount.toLocaleString()} <span className="text-[10px] text-[#6F6B75] font-sans">{currencyDisplay}</span>
                          </span>
                          {t.unpaid_tasks_count > 0 && (
                            <span className="text-[10px] text-[#6F6B75]">({t.unpaid_tasks_count} أمر تشغيل)</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-amber-500 font-bold text-xs">★ {t.avg_quality || '5.0'}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded ${
                            t.on_time_rate >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {t.on_time_rate}%
                          </span>
                        </td>
                        <td className="p-3 text-center text-[#6F6B75] font-mono text-[11px]">
                          {t.paid_pieces_count > 0 ? (
                            <span>{t.paid_pieces_count} قطعة ({t.paid_total_amount.toLocaleString()} {currencyDisplay})</span>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenPiecesModal(t)}
                              className="px-2.5 py-1.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] border border-[#E8E5EA] rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              title="استعراض كشف الفساتين والقطع"
                            >
                              <span>👁️</span>
                              <span>كشف القطع</span>
                            </button>
                            {t.unpaid_pieces_count > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleOpenPayoutModal(t)}
                                className="px-3 py-1.5 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-lg text-[11px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                                title="إصدار سند صرف نقدي رسمي من الخزينة"
                              >
                                <span>💵</span>
                                <span>صرف المستحقات</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md font-bold">
                                مصفى بالكامل ✅
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Commissions Ledger Table */}
          <div className="bg-white p-6 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
              <div className="flex items-center gap-2.5">
                <span className="text-lg text-[#8F2A87]">📋</span>
                <div>
                  <h3 className="text-sm font-bold text-[#25232A]">سجل عمولات وأجور الفنيين وتقييمات الجودة المعتمدة</h3>
                  <p className="text-xs text-[#6F6B75]">مربوطة بأوامر المشغل وفحص جودة المقاسات وتوثيق سندات الصرف</p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadCommissions}
                className="px-3 py-1.5 rounded-xl bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] text-xs font-bold border border-[#E8E5EA] transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <span>🔄</span>
                <span>تحديث السجل</span>
              </button>
            </div>

            {commissions.length === 0 ? (
              <div className="p-12 text-center text-[#6F6B75]">
                <span className="text-5xl block mb-3">🧵</span>
                <h4 className="text-sm font-bold text-[#25232A]">لا توجد عمولات معتمدة مسجلة حتى الآن</h4>
                <p className="text-xs mt-1">عندما يقوم الخياط برفع إنجازه من بطاقة العمل الرقمية ويعتمد المشرف الجودة، ستظهر العمولات والتقييمات هنا تلقائياً.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                    <tr>
                      <th className="p-3">رقم الأمر والموديل</th>
                      <th className="p-3">الفني / الخياط</th>
                      <th className="p-3">نوع الإنتاج والقطع</th>
                      <th className="p-3">تاريخ الأمر والإنجاز</th>
                      <th className="p-3">الأجر المستحق</th>
                      <th className="p-3 text-center">حالة الصرف</th>
                      <th className="p-3 text-center">الجودة والالتزام</th>
                      <th className="p-3">ملاحظات الفحص والاعتماد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E5EA] bg-white font-medium">
                    {commissions.map(c => (
                      <tr key={c.id} className="hover:bg-[#FAFAFB] transition-colors">
                        <td className="p-3">
                          <span className="font-mono font-bold text-[#8F2A87] block">{c.order_no || c.production_order_id}</span>
                          <span className="text-[11px] text-[#25232A] font-bold mt-0.5 block">{c.product_name}</span>
                          <span className="text-[10px] text-[#6F6B75]">{c.stage}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-[#25232A] block">{c.employee_name || 'الخياط'}</span>
                          <span className="text-[10px] text-[#6F6B75]">{c.role || 'خياط'}</span>
                        </td>
                        <td className="p-3">
                          {c.production_type === 'stock' || (!c.child_name || c.child_name.includes('مخزن')) ? (
                            <div>
                              <span className="text-[10.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md inline-block">
                                🏭 إنتاج مخزني
                              </span>
                              <span className="font-mono font-bold text-xs text-[#25232A] block mt-1">
                                {c.pieces_count || 1} قطع
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[10.5px] font-bold text-pink-700 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-md inline-block">
                                👧 تفصيل خاص
                              </span>
                              <span className="text-[11px] font-bold text-[#25232A] block mt-1">
                                {c.child_name || 'الأميرة'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="space-y-0.5 text-[11px] font-mono">
                            <div className="text-[#6F6B75]">أمر: <span className="text-[#25232A] font-semibold">{c.order_date || (c.created_at ? c.created_at.slice(0, 10) : '—')}</span></div>
                            <div className="text-[#6F6B75]">إنجاز: <span className="text-emerald-700 font-semibold">{c.completed_at ? c.completed_at.slice(0, 10) : '—'}</span></div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-bold font-mono text-[#8F2A87] text-sm tabular-nums">
                            {parseFloat(c.wage_amount || 0).toLocaleString()} <span className="text-[10px] text-[#6F6B75] font-sans">{currencyDisplay}</span>
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {c.status === 'Paid' || c.paid_at ? (
                            <div>
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md inline-block">
                                تم الصرف ✅
                              </span>
                              {c.payout_voucher_no && (
                                <span className="text-[9px] font-mono text-[#6F6B75] block mt-0.5">
                                  {c.payout_voucher_no}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md inline-block">
                              جاهز للصرف ⏳
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-0.5 text-amber-400 text-sm">
                            {Array.from({ length: Math.round(c.quality_score || 5) }).map((_, i) => (
                              <span key={i}>★</span>
                            ))}
                          </div>
                          <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block ${c.is_on_time !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {c.is_on_time !== false ? 'في الموعد ⏱️' : 'متأخر ⚠️'}
                          </span>
                        </td>
                        <td className="p-3">
                          <p className="text-[11px] text-[#25232A] leading-tight max-w-xs">{c.quality_notes || '—'}</p>
                          <span className="text-[9.5px] text-[#6F6B75] mt-1 block">
                            بواسطة: {c.approved_by || 'المشرف'} {c.approved_at ? `(${c.approved_at.slice(0, 10)})` : ''}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Modal 1: كشف القطع المفصل للخياط ── */}
          {selectedTailorForPieces && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-3xl w-full border border-[#E8E5EA] shadow-2xl overflow-hidden animate-scaleUp">
                <div className="p-5 border-b border-[#E8E5EA] flex justify-between items-center bg-[#FAFAFB]">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📋</span>
                    <div>
                      <h3 className="font-bold text-sm text-[#25232A]">
                        كشف تفصيلي بالقطع المنجزة: {selectedTailorForPieces.employee_name}
                      </h3>
                      <p className="text-xs text-[#6F6B75]">
                        عدد القطع المعلقة: <span className="font-bold text-[#8F2A87] font-mono">{selectedTailorForPieces.unpaid_pieces_count} قطعة</span> | 
                        إجمالي المستحق: <span className="font-bold text-[#8F2A87] font-mono">{selectedTailorForPieces.unpaid_total_amount.toLocaleString()} {currencyDisplay}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTailorForPieces(null)}
                    className="w-8 h-8 rounded-full bg-white border border-[#E8E5EA] flex items-center justify-center text-sm font-bold text-[#6F6B75] hover:bg-[#E8E5EA] transition cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5 max-h-[60vh] overflow-y-auto">
                  {loadingPieces ? (
                    <div className="p-12 text-center text-[#6F6B75]">جاري تحميل كشف القطع... ⏳</div>
                  ) : tailorPieces.length === 0 ? (
                    <div className="p-8 text-center text-[#6F6B75]">لا توجد قطع معلقة لهذا الخياط</div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                          <tr>
                            <th className="p-2.5">رقم الأمر والموديل</th>
                            <th className="p-2.5">نوع الإنتاج</th>
                            <th className="p-2.5 text-center">الكمية</th>
                            <th className="p-2.5">تاريخ الأمر</th>
                            <th className="p-2.5">تاريخ الإنجاز</th>
                            <th className="p-2.5 text-center">الجودة</th>
                            <th className="p-2.5">الأجر المستحق</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E5EA]">
                          {tailorPieces.map(p => (
                            <tr key={p.id} className="hover:bg-[#FAFAFB]">
                              <td className="p-2.5">
                                <span className="font-mono font-bold text-[#8F2A87] block">{p.order_no}</span>
                                <span className="text-[11px] text-[#25232A] font-bold">{p.product_name}</span>
                              </td>
                              <td className="p-2.5">
                                {p.production_type === 'stock' ? (
                                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                                    🏭 إنتاج مخزني
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-pink-700 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded">
                                    👧 {p.child_name || 'تفصيل خاص'}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold">
                                {p.pieces_count || 1}
                              </td>
                              <td className="p-2.5 font-mono text-[11px] text-[#6F6B75]">
                                {p.order_date || '—'}
                              </td>
                              <td className="p-2.5 font-mono text-[11px] text-emerald-700 font-semibold">
                                {p.completed_at ? p.completed_at.slice(0, 10) : '—'}
                              </td>
                              <td className="p-2.5 text-center text-amber-500 font-bold">
                                ★ {p.quality_score || 5}
                              </td>
                              <td className="p-2.5 font-mono font-bold text-[#8F2A87]">
                                {parseFloat(p.wage_amount || 0).toLocaleString()} {currencyDisplay}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-[#E8E5EA] bg-[#FAFAFB] flex justify-between items-center">
                  <span className="text-xs text-[#6F6B75]">
                    جاهزة للاعتماد والصرف في سند واحد
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTailorForPieces(null)}
                      className="px-4 py-2 bg-white border border-[#E8E5EA] rounded-xl text-xs font-bold text-[#25232A] hover:bg-[#E8E5EA] transition cursor-pointer"
                    >
                      إغلاق
                    </button>
                    {selectedTailorForPieces.unpaid_pieces_count > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const t = selectedTailorForPieces;
                          setSelectedTailorForPieces(null);
                          handleOpenPayoutModal(t);
                        }}
                        className="px-4 py-2 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>💵</span>
                        <span>الانتقال لصرف هذا الكشف</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Modal 2: نافذة إصدار سند الصرف النقدي للمحاسب ── */}
          {selectedTailorForPayout && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full border border-[#E8E5EA] shadow-2xl overflow-hidden animate-scaleUp">
                <div className="p-5 border-b border-[#E8E5EA] flex justify-between items-center bg-gradient-to-r from-[#F2E7F3] via-white to-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#8F2A87] text-white flex items-center justify-center text-lg font-bold">
                      💵
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#25232A]">إصدار سند صرف مستحقات (أمر المحاسب)</h3>
                      <p className="text-xs text-[#6F6B75]">الخياط: <span className="font-bold text-[#8F2A87]">{selectedTailorForPayout.employee_name}</span></p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTailorForPayout(null)}
                    className="w-8 h-8 rounded-full bg-white border border-[#E8E5EA] flex items-center justify-center text-sm font-bold text-[#6F6B75] hover:bg-[#E8E5EA] transition cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmitPayout} className="p-6 space-y-4">
                  <div className="bg-[#FAFAFB] p-4 rounded-xl border border-[#E8E5EA] grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[#6F6B75] block">القطع المنجزة المعتمدة:</span>
                      <span className="font-mono font-bold text-sm text-[#25232A] mt-0.5 block">{selectedTailorForPayout.unpaid_pieces_count} قطعة</span>
                    </div>
                    <div>
                      <span className="text-[#6F6B75] block">إجمالي أجور القطع:</span>
                      <span className="font-mono font-bold text-sm text-[#8F2A87] mt-0.5 block">{selectedTailorForPayout.unpaid_total_amount.toLocaleString()} {currencyDisplay}</span>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>الخزينة / الصندوق المنصرف منه <span className="text-[#D64545]">*</span></label>
                    <select
                      value={payoutCashAccount}
                      onChange={e => setPayoutCashAccount(e.target.value)}
                      className={inputCls}
                      required
                    >
                      <option value="ACC-101">الصندوق الرئيسي (خزينة الورشة) - ACC-101</option>
                      <option value="ACC-101-1">صندوق الريال اليمني (YER) - ACC-101.1</option>
                      <option value="ACC-103">حساب بنك الكريمي (YER) - ACC-103</option>
                      <option value="ACC-101-2">صندوق الريال السعودي (SAR) - ACC-101.2</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>طريقة الدفع</label>
                      <select
                        value={payoutMethod}
                        onChange={e => setPayoutMethod(e.target.value)}
                        className={inputCls}
                      >
                        <option value="نقدي / كاش">نقدي / كاش</option>
                        <option value="تحويل بنكي / كريمي">تحويل بنكي / كريمي</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>سلف أو خصميات (إن وجدت)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={payoutDeductions}
                        onChange={e => setPayoutDeductions(e.target.value)}
                        className={inputCls + " font-mono font-bold text-[#D64545]"}
                      />
                    </div>
                  </div>

                  <div className="bg-[#F2E7F3] p-4 rounded-xl border border-[#E5CEE7] flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-[#8F2A87] block">صافي المبلغ المنصرف للخياط:</span>
                      <span className="text-[11px] text-[#6F6B75]">يخصم مباشرة من الخزينة ويقيد أجور تشغيل</span>
                    </div>
                    <div className="text-left font-mono font-black text-lg text-[#8F2A87]">
                      {(selectedTailorForPayout.unpaid_total_amount - (parseFloat(payoutDeductions) || 0)).toLocaleString()} {currencyDisplay}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>ملاحظات وبيان السند</label>
                    <textarea
                      rows="2"
                      value={payoutNotes}
                      onChange={e => setPayoutNotes(e.target.value)}
                      placeholder="مثال: صرف مستحقات تفصيل فساتين دفعة منتصف الشهر..."
                      className={inputCls + " h-auto py-2"}
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedTailorForPayout(null)}
                      className="flex-1 py-3 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] font-bold text-xs rounded-xl border border-[#E8E5EA] transition cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={submittingPayout}
                      className="flex-2 py-3 bg-[#8F2A87] hover:bg-[#73216C] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>💸</span>
                      <span>{submittingPayout ? 'جاري الترحيل...' : 'تأكيد الصرف وترحيل السند للخزينة'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── Modal 3: سند الصرف الملكي الرسمي القابل للطباعة ── */}
          {activeVoucherForPrint && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white">
              <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#E8E5EA] shadow-2xl overflow-hidden print:border-none print:shadow-none animate-scaleUp">
                
                {/* Print action header (hidden on print) */}
                <div className="p-4 bg-[#FAFAFB] border-b border-[#E8E5EA] flex justify-between items-center print:hidden">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <span>✅</span>
                    <span>تم حفظ القيد وترحيل السند بنجاح! جاهز للطباعة والتوقيع:</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-[#8F2A87] hover:bg-[#73216C] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🖨️</span>
                      <span>طباعة السند</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveVoucherForPrint(null)}
                      className="w-8 h-8 rounded-full bg-white border border-[#E8E5EA] flex items-center justify-center text-sm font-bold text-[#6F6B75] hover:bg-[#E8E5EA] transition cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Printable Voucher Body */}
                <div className="p-8 space-y-6 text-right font-sans">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b-2 border-[#8F2A87] pb-4">
                    <div>
                      <h2 className="text-xl font-black text-[#8F2A87] flex items-center gap-2">
                        <span>👑</span>
                        <span>معمل الأميرات الصغيرات للخياطة الراقية</span>
                      </h2>
                      <p className="text-[11px] text-[#6F6B75] mt-0.5">Little Princesses Atelier • سند صرف نقدي رسمي (Payment Voucher)</p>
                    </div>
                    <div className="text-left font-mono">
                      <span className="text-xs text-[#6F6B75] block">رقم السند:</span>
                      <span className="text-sm font-black text-[#25232A] block">{activeVoucherForPrint.voucher_no}</span>
                      <span className="text-[11px] text-[#6F6B75] block mt-0.5">{activeVoucherForPrint.date}</span>
                    </div>
                  </div>

                  {/* Voucher Info Grid */}
                  <div className="grid grid-cols-2 gap-4 bg-[#FAFAFB] p-4 rounded-2xl border border-[#E8E5EA] text-xs">
                    <div>
                      <span className="text-[#6F6B75] block">يصرف للأخ الفني / الخياط:</span>
                      <span className="font-bold text-sm text-[#25232A] mt-0.5 block">{activeVoucherForPrint.employee_name}</span>
                    </div>
                    <div>
                      <span className="text-[#6F6B75] block">طريقة الصرف والخزينة:</span>
                      <span className="font-bold text-xs text-[#25232A] mt-0.5 block">{activeVoucherForPrint.payment_method} ({activeVoucherForPrint.account_id})</span>
                    </div>
                    <div>
                      <span className="text-[#6F6B75] block">إجمالي عدد القطع المشمولة:</span>
                      <span className="font-mono font-bold text-sm text-[#8F2A87] mt-0.5 block">{activeVoucherForPrint.pieces_count} قطعة</span>
                    </div>
                    <div>
                      <span className="text-[#6F6B75] block">رقم قيد اليومية المحاسبي:</span>
                      <span className="font-mono font-bold text-xs text-[#25232A] mt-0.5 block">{activeVoucherForPrint.entry_no}</span>
                    </div>
                  </div>

                  {/* Net Amount Banner */}
                  <div className="bg-[#F2E7F3] p-5 rounded-2xl border border-[#E5CEE7] flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-[#8F2A87] block">المبلغ الصافي المنصرف:</span>
                      <span className="text-xs text-[#6F6B75] mt-0.5 block">فقط وقدره أجور إنجاز القطع المعتمدة بالمعمل</span>
                    </div>
                    <div className="text-left font-mono font-black text-2xl text-[#8F2A87]">
                      {activeVoucherForPrint.net_amount.toLocaleString()} <span className="text-sm font-bold font-sans">{activeVoucherForPrint.currency}</span>
                    </div>
                  </div>

                  {/* Pieces Breakdown Table */}
                  {activeVoucherForPrint.pieces && activeVoucherForPrint.pieces.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
                      <table className="w-full text-right text-[11px]">
                        <thead className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                          <tr>
                            <th className="p-2">رقم الأمر والموديل</th>
                            <th className="p-2">نوع الإنتاج</th>
                            <th className="p-2 text-center">الكمية</th>
                            <th className="p-2">الأجر</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E5EA]">
                          {activeVoucherForPrint.pieces.map((p, i) => (
                            <tr key={i}>
                              <td className="p-2">
                                <span className="font-bold text-[#25232A]">{p.product_name}</span>
                                <span className="text-[10px] text-[#6F6B75] font-mono block">({p.order_no})</span>
                              </td>
                              <td className="p-2">
                                {p.production_type === 'stock' ? '🏭 إنتاج مخزني' : `👧 ${p.child_name || 'تفصيل خاص'}`}
                              </td>
                              <td className="p-2 text-center font-mono font-bold">{p.pieces_count || 1}</td>
                              <td className="p-2 font-mono font-bold text-[#8F2A87]">{parseFloat(p.wage_amount).toLocaleString()} {activeVoucherForPrint.currency}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Signatures */}
                  <div className="pt-8 border-t border-[#E8E5EA] grid grid-cols-3 gap-4 text-center text-xs">
                    <div>
                      <span className="text-[#6F6B75] block font-bold mb-8">توقيع المستلم (الخياط)</span>
                      <div className="border-t border-dashed border-[#6F6B75] mx-4 pt-1 font-bold text-[#25232A]">
                        {activeVoucherForPrint.employee_name}
                      </div>
                    </div>
                    <div>
                      <span className="text-[#6F6B75] block font-bold mb-8">المحاسب المالي</span>
                      <div className="border-t border-dashed border-[#6F6B75] mx-4 pt-1 font-bold text-[#25232A]">
                        {activeVoucherForPrint.created_by}
                      </div>
                    </div>
                    <div>
                      <span className="text-[#6F6B75] block font-bold mb-8">اعتماد المدير العام</span>
                      <div className="border-t border-dashed border-[#6F6B75] mx-4 pt-1 font-bold text-[#25232A]">
                        معتمد ✅
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
