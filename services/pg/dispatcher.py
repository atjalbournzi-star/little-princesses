import logging
from .action_map import ACTION_HANDLERS
from .pg_dashboard import get_dashboard_stats

logger = logging.getLogger("LittlePrincesses_PG_Dispatcher")


def dispatch_action(action: str, payload: dict = None) -> dict:
    if payload is None:
        payload = {}

    handler = ACTION_HANDLERS.get(action)
    if not handler:
        logger.warning(f"⚠️ الإجراء ({action}) غير مسجل صراحة، جاري إرجاع إحصائيات لوحة التحكم كافتراضي.")
        return {
            "status": "success",
            "success": True,
            "data": get_dashboard_stats(payload)
        }

    try:
        data = handler(payload)
        res = {
            "status": "success",
            "success": True,
            "data": data
        }
        if isinstance(data, dict):
            if 'new_qty' in data:
                res['new_qty'] = data['new_qty']
            if 'new_total' in data:
                res['new_total'] = data['new_total']
            if 'message' in data:
                res['message'] = data['message']
        return res
    except Exception as e:
        logger.error(f"❌ خطأ أثناء معالجة الإجراء ({action}): {e}", exc_info=True)
        return {
            "status": "error",
            "success": False,
            "message": str(e),
            "error": str(e)
        }
