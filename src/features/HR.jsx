// HR.jsx - المنسق والمجمع الرئيسي لإدارة الموارد البشرية والرواتب
const { useState, useMemo } = React;

function HR({
  employees = [], setEmployees, payroll = [], setPayroll,
  accounts = [], journal = [], setJournal, factory = [], showToast, currency
}) {
  const [activeTab, setActiveTab] = useState('employees');
  const [payrollMonth, setPayrollMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [bonus, setBonus] = useState({});
  const [deduction, setDeduction] = useState({});

  // فلاتر ونوافذ الموظفين والسلف
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [advanceEmp, setAdvanceEmp] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceBox, setAdvanceBox] = useState('ACC-101-1');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [submittingAdvance, setSubmittingAdvance] = useState(false);

  // صرف مستحقات الخياطين وسندات الطباعة
  const [selectedTailorForPayout, setSelectedTailorForPayout] = useState(null);
  const [payoutCashAccount, setPayoutCashAccount] = useState('ACC-101');
  const [payoutMethod, setPayoutMethod] = useState('نقدي / كاش');
  const [payoutDeductions, setPayoutDeductions] = useState(0);
  const [payoutNotes, setPayoutNotes] = useState('');
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [activeVoucherForPrint, setActiveVoucherForPrint] = useState(null);
  const currencyDisplay = currency?.display || 'SAR';

  // خطافات البيانات والإجراءات
  const hrData = useHRData({ activeTab, payrollMonth });
  const { commissions, tailorSummaries, selectedTailorForPieces, setSelectedTailorForPieces,
    tailorPieces, loadingPieces, advances, setAdvances, loadingAdvances, loadCommissions,
    loadTailorSummaries, loadAdvances, handleOpenPiecesModal } = hrData;

  const currentPayroll = useMemo(() => {
    const recordsForMonth = payroll.filter(p => p.month === payrollMonth);
    if (recordsForMonth.length === 0) return null;
    const mapped = recordsForMonth.map(r => {
      const emp = employees.find(e => e.name === r.empName) || {};
      return {
        id: r.id, empId: emp.id || r.id, name: r.empName, role: emp.role || 'غير محدد',
        type: r.type, baseSalary: r.baseValue, piecesCount: r.piecesCount, totalDue: r.totalDue,
        pieceWages: r.totalDue, bonus: r.bonus, deduction: r.deductions, netSalary: r.netSalary,
        status: r.status, piecesStatement: r.piecesStatement || ""
      };
    });
    return { month: payrollMonth, status: mapped.every(r => r.status.includes('تم الصرف')) ? 'مكتمل' : 'قيد الصرف', records: mapped };
  }, [payroll, payrollMonth, employees]);

  const hrActions = useHRActions({
    employees, setEmployees, payroll, setPayroll, journal, setJournal, factory,
    payrollMonth, bonus, setBonus, deduction, currentPayroll, currencyDisplay, showToast,
    setAdvances, setAdvanceModalOpen, setActiveVoucherForPrint, loadTailorSummaries, loadCommissions
  });
  const { calculateEmployeeCompletedTasks, handleSaveEmployee, toggleEmpStatus, deleteEmp,
    handleGeneratePayroll, handleSubmitAdvance, handlePaySalary, handleSubmitPayout } = hrActions;

  const filteredEmployees = useMemo(() => employees.filter(emp => {
    const matchSearch = !searchQuery || emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) || emp.phone?.includes(searchQuery);
    const matchRole = roleFilter === 'all' || emp.role === roleFilter;
    const matchStatus = statusFilter === 'all' || emp.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  }), [employees, searchQuery, roleFilter, statusFilter]);

  const onAdvanceSubmit = async (e) => {
    if (e) e.preventDefault();
    const amt = parseFloat(advanceAmount);
    if (!amt || amt <= 0) return showToast("يرجى إدخال مبلغ صحيح للسلفة ⚠️", "error");
    if (!advanceEmp) return showToast("يرجى اختيار الموظف ⚠️", "error");
    setSubmittingAdvance(true);
    try {
      const empObj = employees.find(emp => emp.id === advanceEmp || emp.name === advanceEmp);
      const ok = await handleSubmitAdvance({
        empId: empObj ? empObj.id : advanceEmp, empName: empObj ? empObj.name : advanceEmp,
        amount: amt, accountId: advanceBox, notes: advanceNotes
      });
      if (ok) { setAdvanceModalOpen(false); setAdvanceAmount(''); setAdvanceNotes(''); }
    } finally { setSubmittingAdvance(false); }
  };

  const onPayoutSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedTailorForPayout) return;
    setSubmittingPayout(true);
    try {
      const ok = await handleSubmitPayout({
        employee_name: selectedTailorForPayout.employee_name, employee_id: selectedTailorForPayout.employee_id,
        account_id: payoutCashAccount, payment_method: payoutMethod === 'نقدي / كاش' ? 'Cash' : 'Bank Transfer',
        deductions: parseFloat(payoutDeductions) || 0, notes: payoutNotes, created_by: 'المحاسب العام 🧾'
      });
      if (ok) setSelectedTailorForPayout(null);
    } finally { setSubmittingPayout(false); }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      <HRHeader
        activeTab={activeTab} setActiveTab={setActiveTab} employees={employees}
        payroll={payroll} advances={advances} commissions={commissions} currencyDisplay={currencyDisplay}
      />

      {activeTab === 'employees' && (
        <div className="space-y-4">
          <HRFilterBar
            searchQuery={searchQuery} setSearchQuery={setSearchQuery} roleFilter={roleFilter}
            setRoleFilter={setRoleFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            onOpenAddModal={() => { setEditingEmployee(null); setEmployeeModalOpen(true); }} totalEmployees={employees.length}
          />
          <EmployeeTable
            employees={filteredEmployees} currencyDisplay={currencyDisplay}
            calculateEmployeeCompletedTasks={calculateEmployeeCompletedTasks} toggleEmpStatus={toggleEmpStatus}
            deleteEmp={deleteEmp} onEditEmployee={(emp) => { setEditingEmployee(emp); setEmployeeModalOpen(true); }}
          />
        </div>
      )}

      {activeTab === 'payroll' && (
        <PayrollView
          payrollMonth={payrollMonth} setPayrollMonth={setPayrollMonth} currentPayroll={currentPayroll}
          bonus={bonus} setBonus={setBonus} currencyDisplay={currencyDisplay}
          handleGeneratePayroll={handleGeneratePayroll}
          handleAddAdvance={(rec) => {
            setAdvanceEmp(rec.empId || rec.name); setAdvanceAmount(''); setAdvanceBox('ACC-101-1');
            setAdvanceNotes(`سلفة نقدية للموظف ${rec.name} - شهر ${payrollMonth}`); setAdvanceModalOpen(true);
          }}
          handlePaySalary={handlePaySalary}
        />
      )}

      {activeTab === 'advances' && (
        <AdvancesView
          advances={advances} loadingAdvances={loadingAdvances} payrollMonth={payrollMonth}
          setPayrollMonth={setPayrollMonth} loadAdvances={loadAdvances}
          onOpenNewAdvanceModal={() => { setAdvanceEmp(''); setAdvanceAmount(''); setAdvanceBox('ACC-101-1'); setAdvanceNotes(''); setAdvanceModalOpen(true); }}
          onPrintVoucher={(adv) => setActiveVoucherForPrint({
            voucher_no: adv.payment_no || `PAY-ADV-${adv.id}`, date: adv.date ? adv.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
            employee_name: adv.employee_name, payment_method: 'نقدي (كاش)', account_id: adv.account_id || 'ACC-101-1', pieces_count: 0,
            entry_no: adv.entry_no || 'قيد مرحل', net_amount: parseFloat(adv.amount || 0), currency: adv.currency || currencyDisplay,
            title: 'سند صرف سلفة نقدية (Advance Payment Voucher)', notes: adv.notes || `سلفة نقدية للموظف ${adv.employee_name}`, created_by: 'أمين الصندوق'
          })}
          currencyDisplay={currencyDisplay}
        />
      )}

      {activeTab === 'commissions' && (
        <CommissionsView
          commissions={commissions} tailorSummaries={tailorSummaries} loadCommissions={loadCommissions}
          loadTailorSummaries={loadTailorSummaries} onOpenPiecesModal={(t) => handleOpenPiecesModal(t, showToast)}
          onOpenPayoutModal={(t) => { setSelectedTailorForPayout(t); setPayoutCashAccount('ACC-101'); setPayoutMethod('نقدي / كاش'); setPayoutDeductions(0); setPayoutNotes(''); }}
          currencyDisplay={currencyDisplay}
        />
      )}

      <EmployeeModal
        isOpen={employeeModalOpen} onClose={() => setEmployeeModalOpen(false)}
        onSave={handleSaveEmployee} editingEmployee={editingEmployee} currencyDisplay={currencyDisplay}
      />

      <AdvancesModal
        isOpen={advanceModalOpen} onClose={() => setAdvanceModalOpen(false)} onSubmitAdvance={onAdvanceSubmit}
        employees={employees} advanceEmp={advanceEmp} setAdvanceEmp={setAdvanceEmp}
        advanceAmount={advanceAmount} setAdvanceAmount={setAdvanceAmount} advanceBox={advanceBox}
        setAdvanceBox={setAdvanceBox} advanceNotes={advanceNotes} setAdvanceNotes={setAdvanceNotes}
        submittingAdvance={submittingAdvance}
      />

      <PiecesModal
        selectedTailorForPieces={selectedTailorForPieces} onClose={() => setSelectedTailorForPieces(null)}
        loadingPieces={loadingPieces} tailorPieces={tailorPieces} currencyDisplay={currencyDisplay}
        onProceedToPayout={(t) => {
          setSelectedTailorForPieces(null); setSelectedTailorForPayout(t);
          setPayoutCashAccount('ACC-101'); setPayoutMethod('نقدي / كاش'); setPayoutDeductions(0); setPayoutNotes('');
        }}
      />

      <PayoutModal
        selectedTailorForPayout={selectedTailorForPayout} onClose={() => setSelectedTailorForPayout(null)}
        onSubmitPayout={onPayoutSubmit} payoutCashAccount={payoutCashAccount} setPayoutCashAccount={setPayoutCashAccount}
        payoutMethod={payoutMethod} setPayoutMethod={setPayoutMethod} payoutDeductions={payoutDeductions}
        setPayoutDeductions={setPayoutDeductions} payoutNotes={payoutNotes} setPayoutNotes={setPayoutNotes}
        submittingPayout={submittingPayout} currencyDisplay={currencyDisplay}
      />

      <PayoutVoucher activeVoucherForPrint={activeVoucherForPrint} onClose={() => setActiveVoucherForPrint(null)} />
    </div>
  );
}
