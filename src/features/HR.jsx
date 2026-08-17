const { useState, useMemo } = React;

window.HR = function HR({ employees, setEmployees, payroll, setPayroll, accounts, journal, setJournal, factory, showToast, currency }) {
  const [activeTab, setActiveTab] = useState('employees');
  
  // Employee Form State
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('خياط');
  const [empType, setEmpType] = useState('راتب شهري'); // 'راتب شهري' or 'بالقطعة'
  const [empSalary, setEmpSalary] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empDate, setEmpDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Payroll Generator State
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [bonus, setBonus] = useState({});
  const [deduction, setDeduction] = useState({});

  // ── Employee Management ──
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!empName) return showToast("يرجى إدخال اسم الموظف", "error");
    if (!empSalary) return showToast("يرجى إدخال الراتب الأساسي أو سعر القطعة", "error");
    
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
      showToast("خطأ في الاتصال بالسحابة", "error");
    }
  };

  const toggleEmpStatus = async (id) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    const newStatus = emp.status === 'نشط' ? 'موقوف' : 'نشط';
    
    try {
      await window.callGAS('updateEmployee', { id, status: newStatus });
      setEmployees(employees.map(e => e.id === id ? { ...e, status: newStatus } : e));
      showToast("تم تحديث حالة الموظف");
    } catch (err) {
      showToast("حدث خطأ أثناء التحديث", "error");
    }
  };

  const deleteEmp = async (id) => {
    if (confirm("هل أنت متأكد من حذف الموظف نهائياً؟ 🗑️")) {
      try {
        await window.callGAS('deleteEmployee', { id });
        setEmployees(employees.filter(e => e.id !== id));
        showToast("تم حذف الموظف");
      } catch(err) {
        showToast("حدث خطأ أثناء الحذف", "error");
      }
    }
  };

  // ── Auto-calculate Pieces from Factory ──
  const calculatePiecesForTailor = (empName, monthStr) => {
    if (!factory) return 0;
    const tasks = factory.filter(f => 
      f.tailor === empName && 
      (f.stage === 'تشطيب' || f.stage === 'جاهز للتسليم' || f.stage === 'تسليم' || f.stage === 'مكتمل') && 
      f.due_date && f.due_date.startsWith(monthStr)
    );
    return tasks.length;
  };

  const calculateEmployeeCompletedTasks = (empName) => {
    if (!factory) return 0;
    return factory.filter(f => 
      f.tailor === empName && 
      (f.stage === 'تشطيب' || f.stage === 'جاهز للتسليم' || f.stage === 'تسليم' || f.stage === 'مكتمل')
    ).length;
  };

  // ── Payroll Management ──
  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'نشط'), [employees]);
  
  const handleGeneratePayroll = async () => {
    if (activeEmployees.length === 0) return showToast("لا يوجد موظفين نشطين لإصدار رواتبهم", "error");
    
    const existingRecords = payroll.filter(p => p.month === payrollMonth);
    if (existingRecords.length > 0) {
      return showToast("تم إصدار مسير رواتب لهذا الشهر مسبقاً، يمكنك التعديل على الجداول مباشرة.", "error");
    }
    
    const newRecords = activeEmployees.map((emp, index) => {
      let p = 0;
      let piecesCount = 0;
      let piecesStatement = "";
      
      if (emp.type === 'بالقطعة' && factory) {
         const tailorTasks = factory.filter(f => 
           f.tailor === emp.name && 
           (f.stage === 'تشطيب' || f.stage === 'جاهز للتسليم' || f.stage === 'تسليم' || f.stage === 'مكتمل') && 
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
      showToast("فشل توليد المسير. تحقق من الاتصال.", "error");
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
    if (isNaN(amount) || amount <= 0) return showToast("مبلغ غير صحيح", "error");
    
    const newEntry = {
      id: Date.now(),
      entry_no: `ADV-${Date.now().toString().slice(-4)}`,
      debit: `سلف الموظفين - ${record.name}`,
      credit: "الصندوق",
      amount: amount,
      currency: currency.display,
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
    
    const newEntry = {
      id: Date.now(),
      entry_no: `PAY-${Date.now().toString().slice(-4)}`,
      debit: "أجور عمالة الورشة التشغيلية",
      credit: "الصندوق",
      amount: finalNet,
      currency: currency.display,
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

  // deletePayrollProcess removed because records are flat and we don't have a batch delete by month right now

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-indigo-950 to-blue-900 text-white p-6 rounded-3xl shadow-lg border border-indigo-800 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-blue-300">إدارة الموارد البشرية والرواتب (HR V2.0) 👥</h2>
          <p className="text-sm text-indigo-200 mt-1">منظومة مرتبطة بالمحاسبة والورشة آلياً ومزامنة سحابياً.</p>
        </div>
        <div className="bg-white/10 p-3 rounded-2xl shadow-inner border border-white/20">
          <span className="text-3xl">💼</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('employees')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'employees' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-indigo-50 border'
          }`}>
          سجل الموظفين
        </button>
        <button onClick={() => setActiveTab('payroll')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'payroll' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-indigo-50 border'
          }`}>
          مسير الرواتب والسلف
        </button>
      </div>

      {/* ── Employees Tab ── */}
      {activeTab === 'employees' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Form */}
          <div className="bg-white p-6 rounded-3xl border shadow-sm h-fit">
            <h3 className="font-black text-indigo-900 mb-4 flex items-center gap-2">
              <span>➕</span> إضافة موظف جديد
            </h3>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الاسم الرباعي *</label>
                <input type="text" value={empName} onChange={e => setEmpName(e.target.value)} required
                  className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">رقم الهاتف</label>
                <input type="tel" value={empPhone} onChange={e => setEmpPhone(e.target.value)} placeholder="05XXXXXXXX"
                  className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none focus:border-indigo-400" dir="ltr" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">نظام الدفع</label>
                  <select value={empType} onChange={e => setEmpType(e.target.value)}
                    className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none focus:border-indigo-400">
                    <option value="راتب شهري">راتب شهري ثابت</option>
                    <option value="بالقطعة">أجر بالقطعة / الحبة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">المسمى الوظيفي</label>
                  <select value={empRole} onChange={e => setEmpRole(e.target.value)}
                    className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none focus:border-indigo-400">
                    <option value="خياط">خياط</option>
                    <option value="قصاص">قصاص</option>
                    <option value="تشطيب">تشطيب</option>
                    <option value="إدارة">إدارة</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  {empType === 'راتب شهري' ? `الراتب الأساسي (${currency.display}) *` : `أجر القطعة الافتراضي (${currency.display}) *`}
                </label>
                <input type="number" min="0" value={empSalary} onChange={e => setEmpSalary(e.target.value)} required
                  className="w-full p-3 bg-slate-50 border rounded-xl font-black text-indigo-700 text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">تاريخ التعيين</label>
                <input type="date" value={empDate} onChange={e => setEmpDate(e.target.value)}
                  className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none focus:border-indigo-400" />
              </div>
              <button type="submit" className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md transition-colors">
                حفظ بيانات الموظف 💾
              </button>
            </form>
          </div>

          {/* Employee List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2 mb-2">
              <span>👥</span> قائمة الكادر ({employees.length})
            </h3>
            
            {employees.length === 0 ? (
              <div className="bg-white border rounded-3xl p-12 text-center text-slate-400 font-bold">
                <span className="text-4xl block mb-2">📭</span>
                لا يوجد موظفين مسجلين حالياً
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {employees.map(emp => (
                  <div key={emp.id} className="bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                    <div className={`absolute top-0 right-0 w-1.5 h-full ${emp.status === 'نشط' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-black text-slate-900 text-base">{emp.name}</h4>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">{emp.role}</span>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-full ${emp.status === 'نشط' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {emp.status}
                          </span>
                        </div>
                      </div>
                      
                      {['خياط', 'قصاص', 'تشطيب'].includes(emp.role) && (
                         <div className="text-center bg-purple-50 px-3 py-1 rounded-xl border border-purple-100">
                           <div className="text-2xl font-black text-purple-700">{calculateEmployeeCompletedTasks(emp.name)}</div>
                           <div className="text-[9px] text-purple-500 font-bold">مهام منجزة</div>
                         </div>
                      )}
                    </div>
                    
                    <div className="space-y-1.5 mb-4">
                      {emp.phone && (
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-500">رقم الهاتف:</span>
                          <span className="text-slate-600" dir="ltr">{emp.phone}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-500">نظام الدفع:</span>
                        <span className={`px-2 py-0.5 rounded ${emp.type === 'بالقطعة' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {emp.type || 'راتب شهري'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-500">{emp.type === 'بالقطعة' ? 'أجر القطعة:' : 'الراتب الأساسي:'}</span>
                        <span className="text-slate-800 font-black">{emp.baseSalary.toLocaleString('en-US')} {currency.display}</span>
                      </div>
                      {emp.hireDate && (
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-500">تاريخ التعيين:</span>
                          <span className="text-slate-600">{typeof emp.hireDate === 'string' ? emp.hireDate.split('T')[0] : emp.hireDate}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button onClick={() => toggleEmpStatus(emp.id)} 
                        className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 border rounded-lg text-xs font-bold text-slate-700 transition-colors">
                        {emp.status === 'نشط' ? 'إيقاف مؤقت ⏸️' : 'تنشيط ▶️'}
                      </button>
                      <button onClick={() => deleteEmp(emp.id)} 
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg text-rose-600 transition-colors">
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
        <div className="bg-white p-6 rounded-3xl border shadow-sm min-h-[500px]">
          {/* Header controls */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 p-4 rounded-2xl border mb-6">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="font-black text-slate-700">شهر الرواتب (المسير):</label>
              <input type="month" value={payrollMonth} onChange={e => setPayrollMonth(e.target.value)}
                className="p-2 border rounded-xl font-bold bg-white text-indigo-700 outline-none" />
            </div>
            
            <button onClick={handleGeneratePayroll}
              className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md transition-colors flex items-center justify-center gap-2">
              <span>⚙️</span> استيراد وإصدار رواتب ({payrollMonth})
            </button>
          </div>

          {/* Current Payroll Display */}
          {!currentPayroll ? (
            <div className="text-center p-12 text-slate-400">
              <span className="text-5xl block mb-3">🧾</span>
              <h3 className="text-lg font-black text-slate-500">لم يتم إصدار مسير رواتب لهذا الشهر</h3>
              <p className="text-sm mt-1">اضغط على الزر أعلاه لتوليد الرواتب واحتساب مستحقات الورشة تلقائياً.</p>
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-lg text-slate-800">
                    كشف رواتب شهر <span className="text-indigo-600">{currentPayroll.month}</span>
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    currentPayroll.status === 'مكتمل' ? 'bg-emerald-100 text-emerald-700' : 
                    currentPayroll.status === 'قيد الصرف' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    الحالة: {currentPayroll.status}
                  </span>
                </div>
                {/* Delete button removed since records are now flat */}
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-black border-b">
                    <tr>
                      <th className="p-3">اسم الموظف</th>
                      <th className="p-3">الوظيفة</th>
                      <th className="p-3">القطع المنجزة</th>
                      <th className="p-3">إجمالي الاستحقاق</th>
                      <th className="p-3 text-rose-700">سلف وخصميات</th>
                      <th className="p-3 text-emerald-700">مكافآت إضافية</th>
                      <th className="p-3 text-indigo-800">الصافي المستحق</th>
                      <th className="p-3 text-center">إجراءات الدفع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-bold">
                    {currentPayroll.records.map(r => (
                      <tr key={r.empId} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="p-3 font-black text-slate-900">{r.name}</td>
                        <td className="p-3 text-[10px] text-slate-500">{r.role} • {r.type}</td>
                        <td className="p-3">
                          {r.type === 'بالقطعة' ? (
                            <div className="flex flex-col group relative">
                              <span className="text-purple-600 font-black cursor-help border-b border-dashed border-purple-300 w-fit flex items-center gap-1">
                                {r.piecesCount} قطعة منفذة
                                {r.piecesStatement && <span className="text-[10px]">📄</span>}
                              </span>
                              <span className="text-[9px] text-slate-400">المعدل: {r.baseSalary} {currency.display}</span>
                              
                              {r.piecesStatement && (
                                <div className="absolute top-full mt-1 right-0 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                  <div className="font-bold mb-2 text-purple-300 border-b border-slate-600 pb-1 flex items-center gap-1">📄 تفاصيل القطع المنجزة:</div>
                                  <pre className="whitespace-pre-wrap font-sans leading-relaxed text-[10px] text-slate-100">{r.piecesStatement}</pre>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-800">
                            {r.type === 'بالقطعة' ? r.pieceWages.toLocaleString('en-US') : r.baseSalary.toLocaleString('en-US')} {currency.display}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-rose-600 font-black w-12 text-center">{r.deduction > 0 ? `-${r.deduction.toLocaleString('en-US')}` : '0'}</span>
                            {!r.status.includes('تم الصرف') && (
                              <button onClick={() => handleAddAdvance(r)} title="تسجيل سلفة نقدية وخصمها من الصندوق"
                                className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-2 py-0.5 rounded text-[10px]">
                                تسجيل سلفة
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          {!r.status.includes('تم الصرف') ? (
                            <input type="number" placeholder="0" 
                              className="w-16 p-1 border rounded bg-emerald-50 text-emerald-700 outline-none text-center"
                              value={bonus[r.empId] || ''}
                              onChange={e => setBonus({...bonus, [r.empId]: e.target.value})}
                              title="أدخل المكافأة واضغط صرف ليتم التحديث"
                            />
                          ) : (
                            <span className="text-emerald-600">{r.bonus > 0 ? `+${r.bonus.toLocaleString('en-US')}` : '0'}</span>
                          )}
                        </td>
                        <td className="p-3 font-black text-indigo-700 text-sm bg-indigo-50/50">
                          {r.netSalary.toLocaleString('en-US')} {currency.display}
                        </td>
                        <td className="p-3 text-center">
                          {!r.status.includes('تم الصرف') ? (
                            <button onClick={() => handlePaySalary(r)} 
                              className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg shadow transition-colors text-[11px] font-black whitespace-nowrap">
                              صرف الراتب 💸
                            </button>
                          ) : (
                            <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-[10px]">تم الصرف ✅</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-indigo-50 border-t-2 border-indigo-200">
                    <tr>
                      <td colSpan="6" className="p-3 text-left font-black text-indigo-900">إجمالي الرواتب الصافية لهذا الشهر:</td>
                      <td colSpan="2" className="p-3 font-black text-indigo-700 text-base">
                        {currentPayroll.records.reduce((sum, r) => sum + r.netSalary, 0).toLocaleString('en-US')} {currency.display}
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
};
