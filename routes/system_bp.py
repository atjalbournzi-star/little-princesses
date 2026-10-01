# routes/system_bp.py
# System Settings, FX Rates, Health, Backup, Sync, and GAS Proxy Flask Blueprint

from flask import Blueprint, request, jsonify
import pg_service
from domains.system.db_connection import get_db

system_bp = Blueprint('system_bp', __name__)


@system_bp.route('/api/health', methods=['GET'])
@system_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'service': 'Little Princesses ERP Master Server',
        'version': '2.0.0'
    }), 200


@system_bp.route('/api/dashboard/stats', methods=['GET'])
@system_bp.route('/api/stats', methods=['GET'])
def dashboard_stats():
    try:
        data = pg_service.get_dashboard_stats()
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@system_bp.route('/api/settings', methods=['GET'])
@system_bp.route('/api/system/settings', methods=['GET'])
def get_settings():
    try:
        res = pg_service.get_system_settings()
        return jsonify({'success': True, **res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@system_bp.route('/api/settings', methods=['POST'])
@system_bp.route('/api/system/settings', methods=['POST'])
def save_settings():
    try:
        payload = request.get_json(silent=True) or {}
        payload['ip_address'] = request.remote_addr or '127.0.0.1'
        res = pg_service.save_system_settings(payload)
        return jsonify({'success': True, **res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@system_bp.route('/api/currencies', methods=['GET'])
@system_bp.route('/api/currencies/list', methods=['GET'])
def get_currencies():
    try:
        currencies = pg_service.get_currencies()
        return jsonify({'success': True, 'data': currencies}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@system_bp.route('/api/exchange-rates', methods=['GET'])
@system_bp.route('/api/rates', methods=['GET'])
def get_exchange_rates():
    try:
        currencies = pg_service.get_currencies()
        rates = {r['code']: float(r['exchange_rate']) for r in currencies if r.get('code')}
        rates['YER'] = 1.0
        return jsonify({'success': True, 'rates': rates}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@system_bp.route('/api/exchange-rates', methods=['POST'])
@system_bp.route('/api/rates', methods=['POST'])
@system_bp.route('/api/settings/fx-rates', methods=['POST'])
def update_exchange_rates():
    try:
        data = request.get_json(silent=True) or {}
        rates = data.get('rates') or data
        for curr, rate in rates.items():
            if curr != 'YER' and float(rate) > 0:
                pg_service.update_exchange_rate({'code': curr, 'rate': float(rate)})
        currencies = pg_service.get_currencies()
        updated_rates = {r['code']: float(r['exchange_rate']) for r in currencies if r.get('code')}
        updated_rates['YER'] = 1.0
        return jsonify({'success': True, 'rates': updated_rates, 'message': 'تم تحديث أسعار الصرف بنجاح'}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@system_bp.route('/api/audit-logs', methods=['GET'])
@system_bp.route('/api/audit-log', methods=['GET'])
def audit_logs():
    try:
        data = pg_service.get_audit_logs()
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@system_bp.route('/api/backup/status', methods=['GET'])
def backup_status():
    try:
        data = pg_service.get_backup_status()
        return jsonify({'success': True, **data}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@system_bp.route('/api/backup/snapshot', methods=['POST'])
def backup_snapshot():
    try:
        data = pg_service.create_backup_snapshot()
        return jsonify({'success': True, **data}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@system_bp.route('/api/sync/status', methods=['GET'])
def sync_status():
    return jsonify({
        'success': True,
        'connected': True,
        'status_label': '🟢 متصل',
        'last_sync': 'الآن',
        'message': 'المزامنة سارية وقاعدة البيانات السحابية بحالة ممتازة 👑'
    }), 200


@system_bp.route('/api/sync/google-sheets', methods=['POST'])
def sync_sheets():
    return jsonify({
        'success': True,
        'message': 'متصل بنجاح مع قاعدة بيانات PostgreSQL 👑',
        'status': '🟢 متصل'
    }), 200


@system_bp.route('/api/gas', methods=['GET', 'POST'])
@system_bp.route('/save', methods=['POST'])
def gas_proxy():
    try:
        if request.method == 'GET':
            action = request.args.get('action', 'getDashboardStats')
            params = {k: v for k, v in request.args.items()}
            res = pg_service.dispatch_action(action, params)
        else:
            data = request.get_json(silent=True) or {}
            action = data.get('action') or 'getDashboardStats'
            payload = data.get('data') or data
            res = pg_service.dispatch_action(action, payload)
        return jsonify(res), 200
    except Exception as e:
        return jsonify({'status': 'error', 'success': False, 'message': str(e), 'error': str(e)}), 500
