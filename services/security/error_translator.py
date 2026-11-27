# services/security/error_translator.py
# Central Shield Error Handler & Arabic DB-Error Translator
# Translates Layer 1 PostgreSQL triggers & Layer 2 constraints to clear Arabic messages
# Standard: Strictly < 220 lines per file

import re
import logging
from flask import jsonify, request

logger = logging.getLogger("LittlePrincesses_ErrorTranslator")


class FiscalPeriodLockedError(Exception):
    """Raised when posting into a locked fiscal period."""
    pass


class IdempotencyConflictError(Exception):
    """Raised when an operation with the same idempotency key is in flight."""
    pass


class ForbiddenRoleError(Exception):
    """Raised when user role is not authorized for a sovereign operation."""
    pass


class UnauthorizedError(Exception):
    """Raised when request lacks a valid authenticated session token."""
    pass


class WorkflowGuardError(Exception):
    """Raised when a workflow state guard blocks an operation (409 Conflict)."""
    pass


def translate_shield_error(exc):
    """
    Translates PostgreSQL trigger exceptions and security errors into
    appropriate HTTP status codes (400, 401, 403, 409, 422, 423) and Arabic messages.
    """
    msg = str(exc or "")

    # 0. Unauthorized (Missing / Invalid Token)
    if isinstance(exc, UnauthorizedError):
        return 401, msg or "يرجى تسجيل الدخول للوصول إلى هذا المورد"

    # 0b. Workflow State Guard (409 Conflict)
    if isinstance(exc, WorkflowGuardError) or "AWAITING_MEASUREMENTS" in msg or "بانتظار تأكيد المقاسات" in msg:
        return 409, msg or "محظور تشغيلياً: حالة أمر التشغيل لا تسمح بهذه العملية"

    # 1. Fiscal Period Lock
    if isinstance(exc, FiscalPeriodLockedError) or "الفترة المحاسبية مغلقة" in msg or "period_locked" in msg:
        return 423, "الفترة المحاسبية مغلقة ولا يمكن الترحيل فيها"

    # 2. RBAC Forbidden Role
    if isinstance(exc, ForbiddenRoleError):
        return 403, msg or "عفواً، ليس لديك الصلاحية الكافية لتنفيذ هذه العملية السيادية"

    # 3. Idempotency Conflict
    if isinstance(exc, IdempotencyConflictError) or "قيد المعالجة" in msg:
        return 409, "العملية قيد المعالجة حالياً، يرجى الانتظار لتفادي التكرار"

    # 4. Shield 1: Double-Entry Balance Guard
    if "Double-Entry Guard" in msg or "غير متزن" in msg or "سطرين محاسبيين" in msg:
        return 422, "المخالفة المحاسبية (درع التوازن): القيد المحاسبي غير متزن! يجب تطابق إجمالي المدين والدائن بدقة."

    # 5. Shield 2: IFRS Immutability (Posted entries, lines, piece rates)
    if "IFRS Immutability" in msg or "محظور نهائياً حذف القيد" in msg or "محظور تعديل رقم القيد" in msg or "مجمد تماماً" in msg:
        return 409, "مخالفة معايير المحاسبة (IFRS): القيود المحاسبية المرحلة مجمدة وغير قابلة للحذف أو التعديل. استخدم القيد العكسي."

    if "محظور نهائياً حذف أسطر القيد" in msg or "محظور تعديل مبالغ أو حسابات أسطر القيد" in msg:
        return 409, "مخالفة معايير المحاسبة (IFRS): محظور حذف أو تعديل أسطر القيود المرحلة. يجب إجراء قيد عكسي."

    if "أجر القطعة" in msg and ("مسدد ومصروف" in msg or "محظور نهائياً حذف" in msg or "محظور التلاعب" in msg):
        return 409, "المخالفة التشغيلية والمالية: محظور حذف أو تعديل سجلات أجور القطع المسددة والمصروفة مالياً."

    # 6. Shield 3: Hard Uniqueness Constraints
    if "uq_piece_rate_order_worker_stage" in msg:
        return 409, "تعارض تكرار: أجر القطعة مسجل مسبقاً لهذا الخياط في نفس المرحلة وأمر التشغيل."

    if "uq_tailor_commissions_order_stage" in msg:
        return 409, "تعارض تكرار: عمولة الخياطة مسجلة مسبقاً لهذا الموظف في نفس المرحلة وأمر التشغيل."

    if "uq_suppliers_phone" in msg or "suppliers_phone_key" in msg:
        return 409, "تعارض بيانات: رقم هاتف المورد مسجل مسبقاً في النظام."

    # 7. Shield 4: Zero-Negative Stock & Referential Integrity Protection
    if "chk_warehouse_stock_quantity_non_negative" in msg or "chk_inventory_quantity_non_negative" in msg or "المخزون السالب" in msg or "نفد الرصيد" in msg or "غير كافٍ" in msg or "لا يتوفر رصيد" in msg:
        base_clean = msg.split('\nCONTEXT:')[0].split('CONTEXT:')[0].strip()
        if any(k in base_clean for k in ("نفد الرصيد", "غير كافٍ", "لا يتوفر رصيد", "المخزون السالب")):
            return 409, base_clean
        return 409, "محظور تشغيلياً: العملية تؤدي إلى رصيد مخزني سالب في المستودع."

    if "chk_jline_debit_credit_valid" in msg or "chk_jline_base_valid" in msg:
        return 422, "خطأ محاسبي: أسطر القيد غير صالحة، لا يمكن أن يكون السطر مديناً ودائناً معاً أو بقيم سالبة."

    if "chk_journal_entries_amounts_non_negative" in msg or "chk_payments_amounts_non_negative" in msg:
        return 422, "خطأ مالي: لا يمكن قبول مبالغ سالبة أو أسعار صرف غير صالحة."

    if "fn_guard_customer_deletion" in msg or "لا يمكن حذف العميل" in msg:
        return 409, "محظور تشغيلياً: لا يمكن حذف العميل لوجود طلبات تجارية أو سندات مالية مرتبطة به."

    if "fn_guard_employee_deletion" in msg or "لا يمكن حذف الموظف" in msg:
        return 409, "محظور تشغيلياً: لا يمكن حذف الموظف لوجود سجلات رواتب أو أجور قطع أو عمولات مرتبطة به."

    if "foreign key" in msg.lower() or "fkey" in msg.lower() or "on delete restrict" in msg.lower():
        return 409, "محظور: لا يمكن حذف أو تعديل هذا السجل لوجود ارتباطات مرجعية في النظام."

    if "unique_violation" in msg.lower() or "duplicate key" in msg.lower():
        return 409, "تعارض تكرار: الرقم المرجعي أو البيانات الفريدة مسجلة مسبقاً في النظام."

    if "check_violation" in msg.lower():
        return 422, "مخالفة قيود السلامة والتحقق من صحة البيانات في قاعدة البيانات."

    # Extract clean Arabic message if ValueError or DB trigger already produced one
    base_msg = msg.split('\nCONTEXT:')[0].split('CONTEXT:')[0].strip()
    ar_match = re.search(
        r'[\u0600-\u06FF][\u0600-\u06FFA-Za-z0-9\s\(\)\[\]\{\}\.\:\-\_\/\\,،؛!؟%+\*\'\"«»]+',
        base_msg
    )
    if ar_match and (isinstance(exc, ValueError) or len(ar_match.group(0).strip()) > 10):
        clean_ar = ar_match.group(0).strip()
        if any(nf in clean_ar for nf in ('غير موجود', 'لم يتم العثور')):
            return 404, clean_ar
        return 400, clean_ar
    if isinstance(exc, ValueError) and re.search(r'[\u0600-\u06FF]', base_msg):
        if any(nf in base_msg for nf in ('غير موجود', 'لم يتم العثور')):
            return 404, base_msg
        return 400, base_msg

    return 500, "حدث خطأ داخلي في معالجة العملية المالية أو المخزنية"


def register_shield_error_handlers(app):
    """Registers global error handlers on Flask application instance."""
    @app.errorhandler(FiscalPeriodLockedError)
    def handle_fiscal_period_locked(e):
        code, ar_msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': ar_msg, 'message': ar_msg}), code

    @app.errorhandler(UnauthorizedError)
    def handle_unauthorized(e):
        code, ar_msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': ar_msg, 'message': ar_msg}), code

    @app.errorhandler(ForbiddenRoleError)
    def handle_forbidden_role(e):
        code, ar_msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': ar_msg, 'message': ar_msg}), code

    @app.errorhandler(IdempotencyConflictError)
    def handle_idempotency_conflict(e):
        code, ar_msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': ar_msg, 'message': ar_msg}), code

    @app.errorhandler(WorkflowGuardError)
    def handle_workflow_guard(e):
        code, ar_msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': ar_msg, 'message': ar_msg}), code

    import psycopg2
    @app.errorhandler(psycopg2.Error)
    def handle_psycopg2_error(e):
        code, ar_msg = translate_shield_error(e)
        logger.warning(f"🛡️ Intercepted psycopg2 DB Shield Error [{code}]: {ar_msg}")
        return jsonify({'success': False, 'error': ar_msg, 'message': ar_msg}), code
