/**
 * ============================================================================
 * accountingEngine.js — Central Accounting Engine & General Ledger Pipeline
 * Little Princesses ERP - Integrated Double-Entry Multi-Currency Core
 * ============================================================================
 */

(function(window) {
  'use strict';

  var AccountingEngine = {
    
    // Validates a journal entry's double-entry balance in base currency (YER)
    validateEntry: function(entry, accounts) {
      if (!entry) return { valid: false, error: 'بيانات القيد غير متوفرة' };
      if (!entry.debit) return { valid: false, error: 'حساب المدين مطلوب' };
      if (!entry.credit) return { valid: false, error: 'حساب الدائن مطلوب' };
      if (String(entry.debit) === String(entry.credit)) {
        return { valid: false, error: 'لا يمكن أن يكون حساب المدين والدائن متطابقين' };
      }

      var amount = parseFloat(entry.amount) || 0;
      if (amount <= 0) return { valid: false, error: 'مبلغ القيد يجب أن يكون أكبر من الصفر' };

      // Validate accounts exist and are postable (not group accounts)
      if (accounts && Array.isArray(accounts)) {
        var debitAcc = accounts.find(function(a) { return String(a.code || a.acc_code || a.id) === String(entry.debit); });
        var creditAcc = accounts.find(function(a) { return String(a.code || a.acc_code || a.id) === String(entry.credit); });

        if (debitAcc && Number(debitAcc.is_group) === 1) {
          return { valid: false, error: 'لا يمكن تسجيل قيود على حساب تجميعي (' + (debitAcc.name || debitAcc.code) + ')' };
        }
        if (creditAcc && Number(creditAcc.is_group) === 1) {
          return { valid: false, error: 'لا يمكن تسجيل قيود على حساب تجميعي (' + (creditAcc.name || creditAcc.code) + ')' };
        }
      }

      // Convert and check YER balance
      var currency = entry.currency || 'YER';
      var rate = entry.exchange_rate || (window.CurrencyService ? window.CurrencyService.getRate(currency) : 1.0);
      var baseObj = window.CurrencyService ? window.CurrencyService.toBase(amount, currency, rate) : { base_amount: amount, exchange_rate: rate };

      return {
        valid: true,
        base_amount: baseObj.base_amount,
        exchange_rate: baseObj.exchange_rate,
        currency: window.CurrencyService ? window.CurrencyService.normalizeCode(currency) : currency
      };
    },

    // Generates a standardized multi-currency journal payload with transaction idempotency ID
    createJournalPayload: function(params) {
      var curr = params.currency || 'YER';
      var rate = params.exchange_rate || (window.CurrencyService ? window.CurrencyService.getRate(curr) : 1.0);
      var baseObj = window.CurrencyService ? window.CurrencyService.toBase(params.amount, curr, rate) : { base_amount: params.amount, exchange_rate: rate };

      var txId = params.transaction_id || params.ref_id || ('TX-' + Date.now() + '-' + Math.floor(Math.random()*1000));
      var entryNo = params.entry_no || ('JV-' + Date.now().toString().slice(-6));

      return {
        id: params.id || Date.now(),
        transaction_id: txId,
        entry_no: entryNo,
        debit: String(params.debit),
        credit: String(params.credit),
        amount: parseFloat(params.amount) || 0,
        currency: baseObj.currency || curr,
        exchange_rate: baseObj.exchange_rate || rate,
        base_amount: baseObj.base_amount,
        ref_type: params.ref_type || 'MANUAL',
        ref_id: params.ref_id || '',
        date: params.date || (window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]),
        notes: params.notes || '',
        status: 'posted',
        created_at: new Date().toISOString()
      };
    },

    // ──────────────────────────────────────────────────────────────────────────
    // 🏢 12 Enterprise Operational Accounting Generators (وفق معايير دار الأزياء)
    // ──────────────────────────────────────────────────────────────────────────

    // 1. سند صرف (Payment Voucher)
    createPaymentVoucher: function(p) {
      var debitCode = p.debitAccount || '5211';
      var creditCode = p.creditAccount || '1111';
      var amount = parseFloat(p.amount) || 0;
      var rate = parseFloat(p.exchangeRate) || 1.0;
      var entryNo = p.entryNumber || ('PV-' + Date.now().toString().slice(-6));
      return {
        entry_number: entryNo,
        entry_date: p.date || (window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]),
        description: p.description || ('سند صرف - ' + (p.partyName || '')),
        source_module: 'PAYMENT_VOUCHER',
        source_id: p.sourceId || entryNo,
        total_amount: amount,
        currency: p.currency || 'YER',
        exchange_rate: rate,
        base_amount: amount * rate,
        is_posted: true,
        lines: [
          { account_id: debitCode, debit: amount, credit: 0, line_description: p.description, sub_ledger_type: p.subLedgerType || 'NONE', sub_ledger_id: p.subLedgerId || p.partyName },
          { account_id: creditCode, debit: 0, credit: amount, line_description: p.description, sub_ledger_type: 'NONE', sub_ledger_id: '' }
        ]
      };
    },

    // 2. سند قبض (Receipt Voucher)
    createReceiptVoucher: function(p) {
      var debitCode = p.debitAccount || '1111';
      var creditCode = p.creditAccount || '4111';
      var amount = parseFloat(p.amount) || 0;
      var rate = parseFloat(p.exchangeRate) || 1.0;
      var entryNo = p.entryNumber || ('RV-' + Date.now().toString().slice(-6));
      return {
        entry_number: entryNo,
        entry_date: p.date || (window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]),
        description: p.description || ('سند قبض - ' + (p.partyName || '')),
        source_module: 'RECEIPT_VOUCHER',
        source_id: p.sourceId || entryNo,
        total_amount: amount,
        currency: p.currency || 'YER',
        exchange_rate: rate,
        base_amount: amount * rate,
        is_posted: true,
        lines: [
          { account_id: debitCode, debit: amount, credit: 0, line_description: p.description, sub_ledger_type: 'NONE', sub_ledger_id: '' },
          { account_id: creditCode, debit: 0, credit: amount, line_description: p.description, sub_ledger_type: p.subLedgerType || 'NONE', sub_ledger_id: p.subLedgerId || p.partyName }
        ]
      };
    },

    // 3. عربون حجز فستان (Booking Deposit)
    createBookingDeposit: function(p) {
      var debitCode = p.cashAccount || '1111'; // 1111 صندوق أو 1112 بنك
      var creditCode = '2121'; // دفعات مقدمة وعرابين حجز
      var amount = parseFloat(p.depositAmount) || 0;
      var rate = parseFloat(p.exchangeRate) || 1.0;
      var entryNo = 'DEP-' + (p.orderId || Date.now().toString().slice(-6));
      return {
        entry_number: entryNo,
        entry_date: p.date || (window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]),
        description: p.description || ('عربون حجز فستان للعميلة: ' + (p.customerName || '')),
        source_module: 'BOOKING_DEPOSIT',
        source_id: String(p.orderId || entryNo),
        total_amount: amount,
        currency: p.currency || 'YER',
        exchange_rate: rate,
        base_amount: amount * rate,
        is_posted: true,
        lines: [
          { account_id: debitCode, debit: amount, credit: 0, line_description: 'استلام عربون حجز', sub_ledger_type: 'NONE', sub_ledger_id: '' },
          { account_id: creditCode, debit: 0, credit: amount, line_description: 'عربون دائن بذمة المشغل للعميلة', sub_ledger_type: 'CUSTOMER', sub_ledger_id: p.customerId || p.customerName }
        ]
      };
    },

    // 4. تحصيل الطلب والتسليم النهائي (Order Collection & Revenue Recognition)
    createOrderCollection: function(p) {
      var totalOrder = parseFloat(p.totalAmount) || 0;
      var depositUsed = parseFloat(p.depositAmount) || 0;
      var remainingCash = parseFloat(p.remainingPaid) || (totalOrder - depositUsed);
      var cashAcc = p.cashAccount || '1111';
      var rate = parseFloat(p.exchangeRate) || 1.0;
      var entryNo = 'ORD-REC-' + (p.orderId || Date.now().toString().slice(-6));

      var lines = [];
      if (remainingCash > 0) {
        lines.push({ account_id: cashAcc, debit: remainingCash, credit: 0, line_description: 'تحصيل متبقي قيمة الفستان', sub_ledger_type: 'NONE', sub_ledger_id: '' });
      }
      if (depositUsed > 0) {
        lines.push({ account_id: '2121', debit: depositUsed, credit: 0, line_description: 'إقفال واستحقاق العربون المحجوز', sub_ledger_type: 'CUSTOMER', sub_ledger_id: p.customerId || p.customerName });
      }
      lines.push({ account_id: '4111', debit: 0, credit: totalOrder, line_description: 'إيراد تفصيل وتصميم الفستان كاملاً', sub_ledger_type: 'CUSTOMER', sub_ledger_id: p.customerId || p.customerName });

      return {
        entry_number: entryNo,
        entry_date: p.date || (window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]),
        description: p.description || ('تسليم فستان وتحصيل إيراد الطلب: ' + (p.orderId || '')),
        source_module: 'ORDER_COLLECTION',
        source_id: String(p.orderId || entryNo),
        total_amount: totalOrder,
        currency: p.currency || 'YER',
        exchange_rate: rate,
        base_amount: totalOrder * rate,
        is_posted: true,
        lines: lines
      };
    },

    // 5. مبيعات فساتين المعرض الجاهزة (Showroom Ready-Made Sale + Stock Cost)
    createShowroomSale: function(p) {
      var salePrice = parseFloat(p.salePrice) || 0;
      var costPrice = parseFloat(p.costPrice) || 0;
      var cashAcc = p.cashAccount || '1111';
      var rate = parseFloat(p.exchangeRate) || 1.0;
      var entryNo = 'SHW-' + Date.now().toString().slice(-6);

      var lines = [
        { account_id: cashAcc, debit: salePrice, credit: 0, line_description: 'مقبوضات مبيعات فستان معرض', sub_ledger_type: 'NONE', sub_ledger_id: '' },
        { account_id: '4121', debit: 0, credit: salePrice, line_description: 'إيراد بيع فستان جاهز من المعرض', sub_ledger_type: 'NONE', sub_ledger_id: '' }
      ];

      // إذا توفرت تكلفة الفستان يتم توليد أسطر تكلفة البضاعة والمخزون التام
      if (costPrice > 0) {
        lines.push({ account_id: '5111', debit: costPrice, credit: 0, line_description: 'تكلفة الفستان المباع', sub_ledger_type: 'NONE', sub_ledger_id: '' });
        lines.push({ account_id: '1153', debit: 0, credit: costPrice, line_description: 'تخفيض مخزون الفساتين التامة', sub_ledger_type: 'NONE', sub_ledger_id: '' });
      }

      return {
        entry_number: entryNo,
        entry_date: p.date || (window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]),
        description: p.description || ('مبيعات فستان معرض: ' + (p.dressName || '')),
        source_module: 'SHOWROOM_SALE',
        source_id: String(p.saleId || entryNo),
        total_amount: salePrice,
        currency: p.currency || 'YER',
        exchange_rate: rate,
        base_amount: salePrice * rate,
        is_posted: true,
        lines: lines
      };
    },

    // 6. مرتجع وتسويات العميلات (Customer Return & Refund)
    createCustomerReturn: function(p) {
      var refundAmt = parseFloat(p.amount) || 0;
      var cashAcc = p.cashAccount || '1111';
      var rate = parseFloat(p.exchangeRate) || 1.0;
      var entryNo = 'RET-' + Date.now().toString().slice(-6);
      return {
        entry_number: entryNo,
        entry_date: p.date || (window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]),
        description: p.description || ('مرتجع / استرداد دفعة عميلة: ' + (p.customerName || '')),
        source_module: 'CUSTOMER_RETURN',
        source_id: String(p.returnId || entryNo),
        total_amount: refundAmt,
        currency: p.currency || 'YER',
        exchange_rate: rate,
        base_amount: refundAmt * rate,
        is_posted: true,
        lines: [
          { account_id: '4111', debit: refundAmt, credit: 0, line_description: 'عكس إيراد الفستان المرتجع', sub_ledger_type: 'CUSTOMER', sub_ledger_id: p.customerName },
          { account_id: cashAcc, debit: 0, credit: refundAmt, line_description: 'صرف المبلغ المسترد للعميلة', sub_ledger_type: 'NONE', sub_ledger_id: '' }
        ]
      };
    },

    // 7. سلف الخياطين والعاملين (Tailor Advance)
    createTailorAdvance: function(p) {
      var amount = parseFloat(p.amount) || 0;
      var cashAcc = p.cashAccount || '1111';
      var rate = parseFloat(p.exchangeRate) || 1.0;
      var entryNo = 'ADV-' + Date.now().toString().slice(-6);
      return {
        entry_number: entryNo,
        entry_date: p.date || (window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]),
        description: p.description || ('صرف سلفة نقدية للخياط: ' + (p.tailorName || '')),
        source_module: 'TAILOR_ADVANCE',
        source_id: String(p.advanceId || entryNo),
        total_amount: amount,
        currency: p.currency || 'YER',
        exchange_rate: rate,
        base_amount: amount * rate,
        is_posted: true,
        lines: [
          { account_id: '1141', debit: amount, credit: 0, line_description: 'سلفة في ذمة الخياط', sub_ledger_type: 'TAILOR', sub_ledger_id: p.tailorId || p.tailorName },
          { account_id: cashAcc, debit: 0, credit: amount, line_description: 'صرف السلفة من الصندوق', sub_ledger_type: 'NONE', sub_ledger_id: '' }
        ]
      };
    },

    // 8. تصفية أجور الخياطين مع خصم السلف (Tailor Payroll Settlement)
    createTailorWageSettlement: function(p) {
      var grossWage = parseFloat(p.grossWage) || 0;
      var advanceDeducted = parseFloat(p.advanceDeducted) || 0;
      var netPaid = parseFloat(p.netPaid) || (grossWage - advanceDeducted);
      var cashAcc = p.cashAccount || '1111';
      var rate = parseFloat(p.exchangeRate) || 1.0;
      var entryNo = 'PAY-' + Date.now().toString().slice(-6);

      var lines = [
        { account_id: '5121', debit: grossWage, credit: 0, line_description: 'إجمالي أجور خياطة وتصنيع مباشرة', sub_ledger_type: 'TAILOR', sub_ledger_id: p.tailorId || p.tailorName }
      ];
      if (advanceDeducted > 0) {
        lines.push({ account_id: '1141', debit: 0, credit: advanceDeducted, line_description: 'استقطاع وسداد السلفة السابقة', sub_ledger_type: 'TAILOR', sub_ledger_id: p.tailorId || p.tailorName });
      }
      if (netPaid > 0) {
        lines.push({ account_id: cashAcc, debit: 0, credit: netPaid, line_description: 'صرف صافي أجر الخياط نقداً', sub_ledger_type: 'NONE', sub_ledger_id: '' });
      }

      return {
        entry_number: entryNo,
        entry_date: p.date || (window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]),
        description: p.description || ('تصفية وصرف أجور الخياط: ' + (p.tailorName || '')),
        source_module: 'TAILOR_WAGE',
        source_id: String(p.settlementId || entryNo),
        total_amount: grossWage,
        currency: p.currency || 'YER',
        exchange_rate: rate,
        base_amount: grossWage * rate,
        is_posted: true,
        lines: lines
      };
    },

    // 9. صرف عهدة نقدية للورشة (Workshop Petty Cash Issuance)
    createPettyCashIssue: function(p) {
      var amount = parseFloat(p.amount) || 0;
      var cashAcc = p.cashAccount || '1111';
      var rate = parseFloat(p.exchangeRate) || 1.0;
      var entryNo = 'CSH-ISS-' + Date.now().toString().slice(-6);
      return {
        entry_number: entryNo,
        entry_date: p.date || (window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]),
        description: p.description || ('صرف عهدة نقدية لمشرف الورشة: ' + (p.supervisorName || '')),
        source_module: 'PETTY_CASH_ISSUE',
        source_id: String(p.custodyId || entryNo),
        total_amount: amount,
        currency: p.currency || 'YER',
        exchange_rate: rate,
        base_amount: amount * rate,
        is_posted: true,
        lines: [
          { account_id: '1121', debit: amount, credit: 0, line_description: 'عهدة نقدية في ذمة المشرف', sub_ledger_type: 'CUSTODY_HOLDER', sub_ledger_id: p.supervisorId || p.supervisorName },
          { account_id: cashAcc, debit: 0, credit: amount, line_description: 'صرف العهدة من الصندوق', sub_ledger_type: 'NONE', sub_ledger_id: '' }
        ]
      };
    },

    // 10. تسوية وإقفال العهدة النقدية (Petty Cash Settlement)
    createPettyCashSettlement: function(p) {
      var invoicesTotal = parseFloat(p.invoicesTotal) || 0;
      var cashReturned = parseFloat(p.cashReturned) || 0;
      var totalCustody = invoicesTotal + cashReturned;
      var cashAcc = p.cashAccount || '1111';
      var rate = parseFloat(p.exchangeRate) || 1.0;
      var entryNo = 'CSH-SET-' + Date.now().toString().slice(-6);

      var lines = [
        { account_id: '5211', debit: invoicesTotal, credit: 0, line_description: 'مصاريف تشغيل وصيانة المشغل بالفواتير', sub_ledger_type: 'NONE', sub_ledger_id: '' }
      ];
      if (cashReturned > 0) {
        lines.push({ account_id: cashAcc, debit: cashReturned, credit: 0, line_description: 'استرجاع متبقي العهدة للصندوق', sub_ledger_type: 'NONE', sub_ledger_id: '' });
      }
      lines.push({ account_id: '1121', debit: 0, credit: totalCustody, line_description: 'إقفال وتصفير العهدة النقدية للمشرف', sub_ledger_type: 'CUSTODY_HOLDER', sub_ledger_id: p.supervisorId || p.supervisorName });

      return {
        entry_number: entryNo,
        entry_date: p.date || (window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]),
        description: p.description || ('تسوية وإقفال عهدة: ' + (p.supervisorName || '')),
        source_module: 'PETTY_CASH_SETTLEMENT',
        source_id: String(p.settlementId || entryNo),
        total_amount: totalCustody,
        currency: p.currency || 'YER',
        exchange_rate: rate,
        base_amount: totalCustody * rate,
        is_posted: true,
        lines: lines
      };
    },

    // 11. توريد أقمشة ومستلزمات (Fabric Procurement)
    createInventoryPurchase: function(p) {
      var amount = parseFloat(p.amount) || 0;
      var isCash = p.isCash || false;
      var creditAcc = isCash ? (p.cashAccount || '1111') : '2111';
      var rate = parseFloat(p.exchangeRate) || 1.0;
      var entryNo = 'FAB-PUR-' + Date.now().toString().slice(-6);
      return {
        entry_number: entryNo,
        entry_date: p.date || (window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]),
        description: p.description || ('توريد أقمشة وخامات من المورد: ' + (p.supplierName || '')),
        source_module: 'INVENTORY_PURCHASE',
        source_id: String(p.purchaseId || entryNo),
        total_amount: amount,
        currency: p.currency || 'YER',
        exchange_rate: rate,
        base_amount: amount * rate,
        is_posted: true,
        lines: [
          { account_id: '1151', debit: amount, credit: 0, line_description: 'إثبات استلام أقمشة في المخزن', sub_ledger_type: 'NONE', sub_ledger_id: '' },
          { account_id: creditAcc, debit: 0, credit: amount, line_description: isCash ? 'سداد نقدي لتوريد الأقمشة' : 'مستحقات المورد الآجلة', sub_ledger_type: isCash ? 'NONE' : 'SUPPLIER', sub_ledger_id: p.supplierId || p.supplierName }
        ]
      };
    },

    // 12. تسليم أقمشة للورشة وبدء التشغيل (Issue to Production / WIP)
    createInventoryIssueToWIP: function(p) {
      var costAmt = parseFloat(p.amount) || 0;
      var rate = parseFloat(p.exchangeRate) || 1.0;
      var entryNo = 'WIP-' + Date.now().toString().slice(-6);
      return {
        entry_number: entryNo,
        entry_date: p.date || (window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]),
        description: p.description || ('صرف قماش لبدء خياطة الفستان: ' + (p.orderId || p.dressName || '')),
        source_module: 'INVENTORY_ISSUE',
        source_id: String(p.issueId || entryNo),
        total_amount: costAmt,
        currency: p.currency || 'YER',
        exchange_rate: rate,
        base_amount: costAmt * rate,
        is_posted: true,
        lines: [
          { account_id: '1152', debit: costAmt, credit: 0, line_description: 'إنتاج تحت التشغيل (أقمشة قيد الخياطة)', sub_ledger_type: 'NONE', sub_ledger_id: '' },
          { account_id: '1151', debit: 0, credit: costAmt, line_description: 'صرف قماش من مخزون الخامات', sub_ledger_type: 'NONE', sub_ledger_id: '' }
        ]
      };
    },

    // 13. مراجعة وتسوية فروقات الجرد (Inventory Stock Audit)
    createInventoryAudit: function(p) {
      var diffAmt = parseFloat(p.amount) || 0;
      var isShortage = p.type === 'shortage' || p.isShortage;
      var rate = parseFloat(p.exchangeRate) || 1.0;
      var entryNo = 'AUD-' + Date.now().toString().slice(-6);

      var lines = [];
      if (isShortage) {
        lines.push({ account_id: '5221', debit: diffAmt, credit: 0, line_description: 'خسائر وفروقات عجز الجرد', sub_ledger_type: 'NONE', sub_ledger_id: '' });
        lines.push({ account_id: '1151', debit: 0, credit: diffAmt, line_description: 'تخفيض المخزون لمطابقة الجرد الفعلي', sub_ledger_type: 'NONE', sub_ledger_id: '' });
      } else {
        lines.push({ account_id: '1151', debit: diffAmt, credit: 0, line_description: 'زيادة المخزون لمطابقة الجرد الفعلي', sub_ledger_type: 'NONE', sub_ledger_id: '' });
        lines.push({ account_id: '4211', debit: 0, credit: diffAmt, line_description: 'أرباح تسويات وفائض المخزون', sub_ledger_type: 'NONE', sub_ledger_id: '' });
      }

      return {
        entry_number: entryNo,
        entry_date: p.date || (window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]),
        description: p.description || ('تسوية فروقات جرد مخزون الأقمشة: ' + (isShortage ? 'عجز' : 'زيادة')),
        source_module: 'INVENTORY_AUDIT',
        source_id: String(p.auditId || entryNo),
        total_amount: diffAmt,
        currency: p.currency || 'YER',
        exchange_rate: rate,
        base_amount: diffAmt * rate,
        is_posted: true,
        lines: lines
      };
    },

    // 14. القيد المركب اليدوي المتزن (Manual Balanced Journal Entry)
    createManualJournal: function(p) {
      var lines = Array.isArray(p.lines) ? p.lines : [];
      var totalDebit = lines.reduce(function(sum, l) { return sum + (parseFloat(l.debit) || 0); }, 0);
      var totalCredit = lines.reduce(function(sum, l) { return sum + (parseFloat(l.credit) || 0); }, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error('القيد غير متوازن! إجمالي المدين (' + totalDebit + ') لا يساوي إجمالي الدائن (' + totalCredit + ')');
      }

      var rate = parseFloat(p.exchangeRate) || 1.0;
      var entryNo = p.entryNumber || ('JV-MAN-' + Date.now().toString().slice(-6));
      return {
        entry_number: entryNo,
        entry_date: p.date || (window.TODAY_STR_ISO || new Date().toISOString().split('T')[0]),
        description: p.description || 'قيد مركب وتسويات يدوية',
        source_module: 'MANUAL',
        source_id: String(p.sourceId || entryNo),
        total_amount: totalDebit,
        currency: p.currency || 'YER',
        exchange_rate: rate,
        base_amount: totalDebit * rate,
        is_posted: true,
        lines: lines
      };
    },

    // ──────────────────────────────────────────────────────────────────────────
    // 📊 General Ledger & Reporting Pipeline
    // ──────────────────────────────────────────────────────────────────────────

    // Derives General Ledger (دفتر الأستاذ العام) on the fly from Journal Entries
    generateGeneralLedger: function(journalEntries, accounts, filterAccountId, dateRange) {
      var entries = Array.isArray(journalEntries) ? journalEntries : [];
      var accList = Array.isArray(accounts) ? accounts : [];

      // Helper to parse clean account code
      var parseAccCode = function(rawStr) {
        if (!rawStr) return '';
        var s = String(rawStr).trim();
        if (s.indexOf(' - ') !== -1) {
          s = s.split(' - ')[0].trim();
        }
        var m = s.match(/^(\d+([.-]\d+)?)/);
        if (m) return m[1];
        var mAcc = s.match(/^ACC[-_]?(\d+([.-]\d+)?)/i);
        if (mAcc) return mAcc[1];
        return s;
      };

      var findAcc = function(rawVal, rawCode) {
        var strVal = String(rawVal || '').trim();
        var strCode = String(rawCode || '').trim();
        var c1 = parseAccCode(strCode);
        var c2 = parseAccCode(strVal);
        return accList.find(function(a) {
          var aId = String(a.id || '').trim();
          var aCode = String(a.code || a.account_code || '').trim();
          return aId === strVal ||
                 aCode === strVal ||
                 (c1 && aCode === c1) ||
                 (c2 && aCode === c2) ||
                 (c1 && aId === ('ACC-' + c1)) ||
                 (c2 && aId === ('ACC-' + c2)) ||
                 aId.replace(/[-_.]/g, '') === strVal.replace(/[-_.]/g, '') ||
                 aCode.replace(/[-_.]/g, '') === strVal.replace(/[-_.]/g, '');
        });
      };

      // Sort chronologically
      var sorted = entries.slice().sort(function(a, b) {
        var dateA = a.date || a.entry_date || '';
        var dateB = b.date || b.entry_date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return (a.id || 0) - (b.id || 0);
      });

      // Target filter account
      var targetAcc = filterAccountId ? findAcc(filterAccountId, filterAccountId) : null;
      var targetNature = targetAcc ? (targetAcc.nature || (['خصوم', 'حقوق ملكية', 'إيرادات', 'liabilities', 'equity', 'revenue'].includes(String(targetAcc.account_type || '').toLowerCase()) ? 'credit' : 'debit')) : 'debit';
      var targetAccCode = targetAcc ? String(targetAcc.code || targetAcc.account_code || targetAcc.id) : String(filterAccountId || '');
      var targetAccName = targetAcc ? (targetAcc.name || targetAcc.account_name || targetAcc.name_ar || targetAccCode) : targetAccCode;

      // Calculate opening balance prior to dateRange.start
      var openingBalanceBase = targetAcc ? (parseFloat(targetAcc.opening_balance) || 0) : 0;
      var openingBalanceOrig = openingBalanceBase;

      var ledgerRows = [];

      sorted.forEach(function(j) {
        var entryDate = (j.date || j.entry_date || '').split('T')[0];
        var isPrior = Boolean(dateRange && dateRange.start && entryDate < dateRange.start);
        var isInPeriod = (!dateRange || !dateRange.start || entryDate >= dateRange.start) &&
                         (!dateRange || !dateRange.end || entryDate <= dateRange.end);

        if (!isPrior && !isInPeriod) return; // After dateRange.end

        var curr = j.currency || 'YER';
        var normCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(curr) : curr;
        var rawRate = parseFloat(j.exchange_rate);
        var rate = (rawRate && rawRate > 0 && !(rawRate === 1.0 && normCurr !== 'YER')) ? rawRate : (window.CurrencyService ? window.CurrencyService.getRate(normCurr) : (normCurr === 'SAR' ? 142.0 : (normCurr === 'USD' ? 535.0 : 1.0)));

        // If entry has multi-leg lines, process each line
        if (Array.isArray(j.lines) && j.lines.length > 0) {
          j.lines.forEach(function(l, lineIdx) {
            var accRaw = String(l.account_id || '');
            var accObj = findAcc(accRaw, accRaw);
            var aCode = accObj ? String(accObj.code || accObj.account_code || accObj.id) : parseAccCode(accRaw);
            var aName = accObj ? (accObj.name || accObj.account_name || accObj.name_ar || aCode) : accRaw;
            var aNature = accObj ? (accObj.nature || (['خصوم', 'حقوق ملكية', 'إيرادات', 'liabilities', 'equity', 'revenue'].includes(String(accObj.account_type || '').toLowerCase()) ? 'credit' : 'debit')) : 'debit';

            var dOrig = parseFloat(l.debit) || 0;
            var cOrig = parseFloat(l.credit) || 0;
            var dBase = l.debit_base !== undefined ? (parseFloat(l.debit_base) || 0) : (dOrig * rate);
            var cBase = l.credit_base !== undefined ? (parseFloat(l.credit_base) || 0) : (cOrig * rate);

            var isMatch = !filterAccountId ||
                          aCode === targetAccCode ||
                          accRaw === String(filterAccountId) ||
                          (targetAcc && (accObj && accObj.id === targetAcc.id));

            if (!isMatch) return;

            if (isPrior) {
              if (targetNature === 'credit') {
                openingBalanceBase += (cBase - dBase);
                openingBalanceOrig += (cOrig - dOrig);
              } else {
                openingBalanceBase += (dBase - cBase);
                openingBalanceOrig += (dOrig - cOrig);
              }
            } else if (isInPeriod) {
              ledgerRows.push({
                id: (j.id || '') + '-L' + (l.id || lineIdx),
                journal_id: j.id,
                entry_no: j.entry_no || ('JV-' + j.id),
                date: entryDate,
                account_code: aCode,
                account_name: aName,
                account_nature: aNature,
                side: dBase > 0 ? 'debit' : 'credit',
                debit_orig: dOrig,
                credit_orig: cOrig,
                debit_base: dBase,
                credit_base: cBase,
                currency: curr,
                exchange_rate: rate,
                ref_type: j.ref_type || 'قيد يومية',
                ref_id: j.ref_id || '',
                notes: l.line_description || j.notes || j.statement || ('حركة حساب ' + aName)
              });
            }
          });
        } else {
          // Standard 2-leg header fallback
          var amount = parseFloat(j.amount) || 0;
          var rawBase = parseFloat(j.base_amount);
          var baseAmount = (rawBase && rawBase > 0 && !(normCurr !== 'YER' && Math.abs(rawBase - amount) < 0.01)) ? rawBase : (amount * rate);

          var dRaw = String(j.debit || j.debit_account_id || '');
          var cRaw = String(j.credit || j.credit_account_id || '');
          var dCode = String(j.debit_code || parseAccCode(dRaw));
          var cCode = String(j.credit_code || parseAccCode(cRaw));

          var debitAccObj = findAcc(dRaw, dCode);
          var creditAccObj = findAcc(cRaw, cCode);

          var dFinalCode = debitAccObj ? String(debitAccObj.code || debitAccObj.acc_code || dCode) : dCode;
          var cFinalCode = creditAccObj ? String(creditAccObj.code || creditAccObj.acc_code || cCode) : cCode;
          var dFinalName = debitAccObj ? (debitAccObj.name || debitAccObj.account_name || debitAccObj.acc_name || dFinalCode) : dRaw.replace(dCode + ' - ', '').trim();
          var cFinalName = creditAccObj ? (creditAccObj.name || creditAccObj.account_name || creditAccObj.acc_name || cFinalCode) : cRaw.replace(cCode + ' - ', '').trim();
          var dNature = debitAccObj ? (debitAccObj.nature || 'debit') : 'debit';
          var cNature = creditAccObj ? (creditAccObj.nature || 'credit') : 'credit';

          var isDebitMatch = !filterAccountId || dFinalCode === targetAccCode || dRaw === String(filterAccountId) || (targetAcc && debitAccObj && debitAccObj.id === targetAcc.id);
          var isCreditMatch = !filterAccountId || cFinalCode === targetAccCode || cRaw === String(filterAccountId) || (targetAcc && creditAccObj && creditAccObj.id === targetAcc.id);

          if (isPrior) {
            if (isDebitMatch) {
              if (targetNature === 'credit') { openingBalanceBase -= baseAmount; openingBalanceOrig -= amount; }
              else { openingBalanceBase += baseAmount; openingBalanceOrig += amount; }
            }
            if (isCreditMatch) {
              if (targetNature === 'credit') { openingBalanceBase += baseAmount; openingBalanceOrig += amount; }
              else { openingBalanceBase -= baseAmount; openingBalanceOrig -= amount; }
            }
          } else if (isInPeriod) {
            if (isDebitMatch) {
              ledgerRows.push({
                id: (j.id || '') + '-DR',
                journal_id: j.id,
                entry_no: j.entry_no || ('JV-' + j.id),
                date: entryDate,
                account_code: dFinalCode,
                account_name: dFinalName,
                account_nature: dNature,
                side: 'debit',
                debit_orig: amount,
                credit_orig: 0,
                debit_base: baseAmount,
                credit_base: 0,
                currency: curr,
                exchange_rate: rate,
                ref_type: j.ref_type || 'قيد يومية',
                ref_id: j.ref_id || '',
                notes: j.notes || j.statement || ('قيد مدين إلى ' + cFinalName)
              });
            }
            if (isCreditMatch) {
              ledgerRows.push({
                id: (j.id || '') + '-CR',
                journal_id: j.id,
                entry_no: j.entry_no || ('JV-' + j.id),
                date: entryDate,
                account_code: cFinalCode,
                account_name: cFinalName,
                account_nature: cNature,
                side: 'credit',
                debit_orig: 0,
                credit_orig: amount,
                debit_base: 0,
                credit_base: baseAmount,
                currency: curr,
                exchange_rate: rate,
                ref_type: j.ref_type || 'قيد يومية',
                ref_id: j.ref_id || '',
                notes: j.notes || j.statement || ('قيد دائن من ' + dFinalName)
              });
            }
          }
        }
      });

      // If filterAccountId is selected and dateRange.start is given, prepend opening balance row
      if (filterAccountId && dateRange && dateRange.start) {
        ledgerRows.unshift({
          id: 'OPENING-' + targetAccCode,
          journal_id: 'OPENING',
          entry_no: 'رصيد سابق',
          date: dateRange.start,
          account_code: targetAccCode,
          account_name: targetAccName,
          account_nature: targetNature,
          side: targetNature === 'credit' ? 'credit' : 'debit',
          debit_orig: 0,
          credit_orig: 0,
          debit_base: 0,
          credit_base: 0,
          currency: 'YER',
          exchange_rate: 1.0,
          ref_type: 'رصيد افتتاحي / سابق',
          ref_id: '',
          notes: 'الرصيد السابق / الافتتاحي حتى تاريخ ' + dateRange.start,
          running_balance_base: openingBalanceBase,
          running_balance_orig: openingBalanceOrig,
          is_opening: true
        });
      }

      // Calculate running balances
      var runningBase = (filterAccountId && dateRange && dateRange.start) ? openingBalanceBase : 0;
      var runningOrig = (filterAccountId && dateRange && dateRange.start) ? openingBalanceOrig : 0;

      ledgerRows.forEach(function(row) {
        if (row.is_opening) {
          row.running_balance_base = runningBase;
          row.running_balance_orig = runningOrig;
          return;
        }

        if (row.account_nature === 'credit') {
          runningBase += (row.credit_base - row.debit_base);
          runningOrig += (row.credit_orig - row.debit_orig);
        } else {
          runningBase += (row.debit_base - row.credit_base);
          runningOrig += (row.debit_orig - row.credit_orig);
        }
        row.running_balance_base = runningBase;
        row.running_balance_orig = runningOrig;
      });

      return ledgerRows;
    },

    // Generates Trial Balance (ميزان المراجعة بالمجاميع والأرصدة) in Base Currency (YER)
    generateTrialBalance: function(journalEntries, accounts, dateRange) {
      var accList = Array.isArray(accounts) ? accounts.filter(function(a) { return Number(a.is_group) !== 1; }) : [];

      var parseAccCode = function(rawStr) {
        if (!rawStr) return '';
        var s = String(rawStr).trim();
        if (s.indexOf(' - ') !== -1) {
          s = s.split(' - ')[0].trim();
        }
        var m = s.match(/^(\d+([.-]\d+)?)/);
        if (m) return m[1];
        var mAcc = s.match(/^ACC[-_]?(\d+([.-]\d+)?)/i);
        if (mAcc) return mAcc[1];
        return s;
      };

      var findAcc = function(rawVal) {
        var strVal = String(rawVal || '').trim();
        var c1 = parseAccCode(strVal);
        return accList.find(function(a) {
          var aId = String(a.id || '').trim();
          var aCode = String(a.code || a.account_code || '').trim();
          return aId === strVal ||
                 aCode === strVal ||
                 (c1 && aCode === c1) ||
                 (c1 && aId === ('ACC-' + c1)) ||
                 aId.replace(/[-_.]/g, '') === strVal.replace(/[-_.]/g, '') ||
                 aCode.replace(/[-_.]/g, '') === strVal.replace(/[-_.]/g, '');
        });
      };

      var totalsMap = {};
      accList.forEach(function(a) {
        var aId = String(a.id || '').trim();
        var code = String(a.code || a.account_code || parseAccCode(aId) || aId).trim();
        var nature = a.nature || (['خصوم', 'حقوق ملكية', 'إيرادات', 'liabilities', 'equity', 'revenue'].includes(String(a.account_type || a.acc_type || '').toLowerCase()) ? 'credit' : 'debit');

        totalsMap[aId] = {
          id: aId,
          code: code,
          name: a.account_name || a.name_ar || a.name || code,
          type: a.account_type || a.acc_type || 'أصول',
          nature: nature,
          opening_balance_base: parseFloat(a.opening_balance) || 0,
          total_debit_base: 0,
          total_credit_base: 0,
          debit_balance_base: 0,
          credit_balance_base: 0,
          net_balance_base: 0
        };
      });

      var entries = Array.isArray(journalEntries) ? journalEntries : [];

      entries.forEach(function(j) {
        var entryDate = (j.date || j.entry_date || '').split('T')[0];
        var isPrior = Boolean(dateRange && dateRange.start && entryDate < dateRange.start);
        var isInPeriod = (!dateRange || !dateRange.start || entryDate >= dateRange.start) &&
                         (!dateRange || !dateRange.end || entryDate <= dateRange.end);

        if (!isPrior && !isInPeriod) return;

        var curr = j.currency || 'YER';
        var normCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(curr) : curr;
        var rawRate = parseFloat(j.exchange_rate);
        var rate = (rawRate && rawRate > 0 && !(rawRate === 1.0 && normCurr !== 'YER')) ? rawRate : (window.CurrencyService ? window.CurrencyService.getRate(normCurr) : (normCurr === 'SAR' ? 142.0 : (normCurr === 'USD' ? 535.0 : 1.0)));

        if (Array.isArray(j.lines) && j.lines.length > 0) {
          j.lines.forEach(function(l) {
            var accRaw = String(l.account_id || '');
            var accObj = findAcc(accRaw);
            var mapKey = accObj ? accObj.id : accRaw;

            if (!totalsMap[mapKey]) {
              var fCode = accObj ? String(accObj.code || accObj.account_code || accObj.id) : parseAccCode(accRaw);
              totalsMap[mapKey] = {
                id: mapKey,
                code: fCode,
                name: accObj ? (accObj.account_name || accObj.name_ar || accObj.name || fCode) : accRaw,
                type: accObj ? (accObj.account_type || 'أصول') : 'أصول',
                nature: accObj ? (accObj.nature || 'debit') : 'debit',
                opening_balance_base: 0,
                total_debit_base: 0,
                total_credit_base: 0,
                debit_balance_base: 0,
                credit_balance_base: 0,
                net_balance_base: 0
              };
            }

            var dOrig = parseFloat(l.debit) || 0;
            var cOrig = parseFloat(l.credit) || 0;
            var dBase = l.debit_base !== undefined ? (parseFloat(l.debit_base) || 0) : (dOrig * rate);
            var cBase = l.credit_base !== undefined ? (parseFloat(l.credit_base) || 0) : (cOrig * rate);

            if (isPrior) {
              if (totalsMap[mapKey].nature === 'credit') {
                totalsMap[mapKey].opening_balance_base += (cBase - dBase);
              } else {
                totalsMap[mapKey].opening_balance_base += (dBase - cBase);
              }
            } else if (isInPeriod) {
              totalsMap[mapKey].total_debit_base += dBase;
              totalsMap[mapKey].total_credit_base += cBase;
            }
          });
        } else {
          // Standard 2-leg header fallback
          var amount = parseFloat(j.amount) || 0;
          var rawBase = parseFloat(j.base_amount);
          var baseAmount = (rawBase && rawBase > 0 && !(normCurr !== 'YER' && Math.abs(rawBase - amount) < 0.01)) ? rawBase : (amount * rate);

          var dRaw = String(j.debit || j.debit_account_id || '');
          var cRaw = String(j.credit || j.credit_account_id || '');
          var debitAccObj = findAcc(dRaw);
          var creditAccObj = findAcc(cRaw);

          var dKey = debitAccObj ? debitAccObj.id : dRaw;
          var cKey = creditAccObj ? creditAccObj.id : cRaw;

          [dKey, cKey].forEach(function(k, idx) {
            if (!totalsMap[k]) {
              var obj = idx === 0 ? debitAccObj : creditAccObj;
              var raw = idx === 0 ? dRaw : cRaw;
              var fCode = obj ? String(obj.code || obj.account_code || obj.id) : parseAccCode(raw);
              totalsMap[k] = {
                id: k,
                code: fCode,
                name: obj ? (obj.account_name || obj.name_ar || obj.name || fCode) : raw,
                type: obj ? (obj.account_type || 'أصول') : 'أصول',
                nature: obj ? (obj.nature || (idx === 0 ? 'debit' : 'credit')) : (idx === 0 ? 'debit' : 'credit'),
                opening_balance_base: 0,
                total_debit_base: 0,
                total_credit_base: 0,
                debit_balance_base: 0,
                credit_balance_base: 0,
                net_balance_base: 0
              };
            }
          });

          if (isPrior) {
            if (totalsMap[dKey].nature === 'credit') totalsMap[dKey].opening_balance_base -= baseAmount;
            else totalsMap[dKey].opening_balance_base += baseAmount;

            if (totalsMap[cKey].nature === 'credit') totalsMap[cKey].opening_balance_base += baseAmount;
            else totalsMap[cKey].opening_balance_base -= baseAmount;
          } else if (isInPeriod) {
            totalsMap[dKey].total_debit_base += baseAmount;
            totalsMap[cKey].total_credit_base += baseAmount;
          }
        }
      });

      var allRows = Object.values(totalsMap);

      // Filter to accounts with opening balance or period activity
      var rows = allRows.filter(function(r) {
        return Math.abs(r.opening_balance_base) > 0.001 || r.total_debit_base > 0 || r.total_credit_base > 0;
      });

      if (rows.length === 0) {
        rows = allRows;
      }

      // Sort by code hierarchically
      rows.sort(function(a, b) {
        return String(a.code).localeCompare(String(b.code), undefined, { numeric: true, sensitivity: 'base' });
      });

      var grandDebit = 0;
      var grandCredit = 0;
      var grandDebitBal = 0;
      var grandCreditBal = 0;
      var grandOpening = 0;

      rows.forEach(function(r) {
        // Calculate closing balance combining opening balance + net movements
        var net = (r.total_debit_base - r.total_credit_base);
        var finalNet = (r.nature === 'credit') ? (r.opening_balance_base - net) : (r.opening_balance_base + net);

        if (r.nature === 'debit') {
          if (finalNet >= 0) {
            r.debit_balance_base = finalNet;
            r.credit_balance_base = 0;
          } else {
            r.debit_balance_base = 0;
            r.credit_balance_base = Math.abs(finalNet);
          }
        } else {
          if (finalNet >= 0) {
            r.credit_balance_base = finalNet;
            r.debit_balance_base = 0;
          } else {
            r.credit_balance_base = 0;
            r.debit_balance_base = Math.abs(finalNet);
          }
        }
        r.net_balance_base = finalNet;

        grandDebit += r.total_debit_base;
        grandCredit += r.total_credit_base;
        grandDebitBal += r.debit_balance_base;
        grandCreditBal += r.credit_balance_base;
        grandOpening += r.opening_balance_base;
      });

      var diffMovements = Math.abs(grandDebit - grandCredit);
      var diffBalances = Math.abs(grandDebitBal - grandCreditBal);

      return {
        rows: rows,
        grand_total_opening: Math.round(grandOpening * 100) / 100,
        grand_total_debit: Math.round(grandDebit * 100) / 100,
        grand_total_credit: Math.round(grandCredit * 100) / 100,
        grand_total_debit_balance: Math.round(grandDebitBal * 100) / 100,
        grand_total_credit_balance: Math.round(grandCreditBal * 100) / 100,
        is_balanced: diffMovements < 0.05 && diffBalances < 0.05,
        diff: Math.round(Math.max(diffMovements, diffBalances) * 100) / 100
      };
    }
  };

  window.AccountingEngine = AccountingEngine;

})(window);
