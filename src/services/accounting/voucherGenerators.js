/**
 * ============================================================================
 * voucherGenerators.js — Operational Vouchers & Sales Revenue Generators
 * Domain: Accounting Core Services | Architecture Standard: Rule 1, 3 & 5
 * ============================================================================
 */

(function(window) {
  'use strict';

  var VoucherGenerators = {
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
      var debitCode = p.cashAccount || '1111';
      var creditCode = '2121';
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
    }
  };

  window.VoucherGenerators = VoucherGenerators;

})(typeof window !== 'undefined' ? window : globalThis);
