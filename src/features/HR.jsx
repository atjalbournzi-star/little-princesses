const { useState, useMemo } = React;

function HR({ employees = [], setEmployees, payroll = [], setPayroll, accounts = [], journal = [], setJournal, factory = [], showToast, currency }) {
  const [activeTab, setActiveTab] = useState('employees');
  
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
      id: Date.now(),
      name: empName,
      role: empRole,
      type: empType,
      baseSalary: parseFloat(empSalary) || 0,
      phone: empPhone,
      hireDate: empDate,
      status: 'نشط'
    };
    
    try {
      await window.callGAS('addEmployee', newEmp);
      setEmployees([newEmp, ...employees]);
      showToast("تم تسجيل الموظف بنجاح 👤");
      setEmpName('');
      setEmpRole('خياط');
      setEmpSalary('');
      setEmpPhone('');
    } catch (err) {
      setEmployees([newEmp, ...employees]);
      showToast("تم الحفظ محلياً ⚡");
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
    
    const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(currencyDisplay) : 'SAR';
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
    
    try {
       await window.callGAS("addJournalEntry", newEntry);
       if (setJournal) setJournal([newEntry, ...journal]);
       
       const newDeduction = record.deduction + amount;
       const newNet = record.netSalary - amount;
       
       await window.callGAS("updatePayrollRecord", { id: record.id, deductions: newDeduction, netSalary: newNet });
       
       setPayroll(payroll.map(p => p.id === record.id ? { ...p, deductions: newDeduction, netSalary: newNet } : p));
       
       showToast("تم تسجيل السلفة وتقييدها باليومية ✅", "success");
    } catch(e) {
       showToast("فشل تسجيل السلفة", "error");
    }
  };

  const handlePaySalary = async (record) => {
    if (!currentPayroll) return;
    
    const b = bonus[record.empId] ? parseFloat(bonus[record.empId]) : 0;
    const finalBonus = record.bonus + b;
    const finalNet = record.netSalary + b;
    
    const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(currencyDisplay) : 'SAR';
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
    
    try {
      await window.callGAS("addJournalEntry", newEntry);
      if (setJournal) setJournal([newEntry, ...journal]);
      
      await window.callGAS("updatePayrollRecord", { id: record.id, status: 'تم الصرف ✅', bonus: finalBonus, netSalary: finalNet });
      
      setPayroll(payroll.map(p => p.id === record.id ? { ...p, status: 'تم الصرف ✅', bonus: finalBonus, netSalary: finalNet } : p));
      
      const newBonusState = { ...bonus };
      delete newBonusState[record.empId];
      setBonus(newBonusState);
      
      showToast("تم تسليم الراتب وإنشاء القيد المحاسبي 💸", "success");
    } catch (e) {
      showToast("حدث خطأ أثناء صرف الراتب", "error");
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

          <div className="flex gap-2">
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
                <input type="date" value={empDate} onChange={e => setEmpDate(e.target.value)} className={inputCls} />
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
              <input type="month" value={payrollMonth} onChange={e => setPayrollMonth(e.target.value)}
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
    </div>
  );
}
