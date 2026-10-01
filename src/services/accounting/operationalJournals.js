/**
 * ============================================================================
 * operationalJournals.js — Workshop, Tailor & Inventory Operations Journals
 * Domain: Accounting Core Services | Architecture Standard: Rule 1, 3 & 5
 * ============================================================================
 */

(function(window) {
  'use strict';

  var OperationalJournals = {
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
    }
  };

  window.OperationalJournals = OperationalJournals;

})(typeof window !== 'undefined' ? window : globalThis);
