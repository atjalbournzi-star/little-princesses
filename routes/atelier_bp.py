# routes/atelier_bp.py
# Factory, Atelier Production, Watchdog, Alterations & QC Flask Blueprint

from flask import Blueprint, request, jsonify
import pg_service

atelier_bp = Blueprint('atelier_bp', __name__)


@atelier_bp.route('/api/factory', methods=['GET'])
@atelier_bp.route('/api/factory/orders', methods=['GET'])
@atelier_bp.route('/api/production/pipeline', methods=['GET'])
def list_factory_orders():
    try:
        data = pg_service.get_factory()
        return jsonify({'success': True, 'data': data, 'pipeline': data, 'count': len(data)}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e), 'data': [], 'count': 0}), 500


@atelier_bp.route('/api/factory/analytics', methods=['GET'])
@atelier_bp.route('/api/production/analytics', methods=['GET'])
def factory_analytics():
    try:
        data = pg_service.get_factory_analytics()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@atelier_bp.route('/api/atelier/watchdog', methods=['GET'])
@atelier_bp.route('/api/factory/watchdog', methods=['GET'])
def atelier_watchdog():
    try:
        data = pg_service.get_atelier_watchdog()
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@atelier_bp.route('/api/alterations', methods=['GET'])
@atelier_bp.route('/api/factory/alterations', methods=['GET'])
def list_alterations():
    try:
        params = {k: v for k, v in request.args.items()}
        data = pg_service.get_fitting_alterations(params)
        return jsonify({'success': True, 'data': data, 'count': len(data)}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@atelier_bp.route('/api/alterations', methods=['POST'])
def add_alteration():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.add_fitting_alteration(data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@atelier_bp.route('/api/alterations/update-status', methods=['POST'])
def update_alteration_status():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.update_fitting_alteration_status(data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@atelier_bp.route('/api/factory', methods=['POST'])
@atelier_bp.route('/api/factory/update', methods=['POST'])
@atelier_bp.route('/api/production/update-stage', methods=['POST'])
@atelier_bp.route('/api/production/assign', methods=['POST'])
@atelier_bp.route('/api/atelier/orders', methods=['POST'])
@atelier_bp.route('/api/job-orders', methods=['POST'])
@atelier_bp.route('/api/factory/orders', methods=['POST'])
def update_factory():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.update_factory(data)
        ded_count = res.get('deducted_items', 0) if isinstance(res, dict) else 0
        return jsonify({
            'success': True,
            'status': 'success',
            'data': res,
            'deducted_items': ded_count,
            'message': f'تم تحديث أمر الإنتاج واقتطاع {ded_count} أصناف قماش بنجاح 🚀'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'status': 'error', 'error': str(e)}), 400


@atelier_bp.route('/api/factory/delete', methods=['POST'])
def delete_factory():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.delete_factory_order(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@atelier_bp.route('/api/factory/stock-inflow', methods=['POST'])
def stock_inflow():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.process_stock_inflow(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@atelier_bp.route('/api/factory/stock-inflow/reverse', methods=['POST'])
def reverse_stock_inflow():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.reverse_stock_inflow(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@atelier_bp.route('/api/factory/job-card/approve', methods=['POST'])
def approve_job_card():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.approve_tailor_commission_and_qc(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@atelier_bp.route('/api/factory/job-card/rework', methods=['POST'])
def rework_job_card():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.submit_tailor_stage_completion(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@atelier_bp.route('/api/quality/feedback', methods=['GET'])
@atelier_bp.route('/api/feedback', methods=['GET'])
def get_quality_feedback_route():
    try:
        data = pg_service.get_quality_feedback()
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@atelier_bp.route('/api/quality/feedback', methods=['POST'])
@atelier_bp.route('/api/feedback', methods=['POST'])
def add_quality_feedback_route():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.add_quality_feedback(data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@atelier_bp.route('/api/quality/dashboard', methods=['GET'])
def get_quality_dashboard_route():
    try:
        data = pg_service.get_quality_dashboard_pg(dict(request.args))
        return jsonify({'success': True, 'data': data, **data}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# Dynamic Registration of 8 Quality Blueprint Routes
QA_ROUTES = {
    'inspections': (pg_service.get_quality_inspections, pg_service.add_quality_inspection),
    'defects': (pg_service.get_quality_defects, pg_service.add_quality_defect),
    'complaints': (pg_service.get_quality_complaints, pg_service.add_quality_complaint),
    'returns': (pg_service.get_quality_returns, pg_service.add_quality_return),
    'corrective_actions': (pg_service.get_quality_actions, pg_service.add_quality_action),
    'checkpoints': (pg_service.get_quality_checkpoints, pg_service.save_quality_checkpoint),
    'settings': (pg_service.get_quality_settings, pg_service.save_quality_settings),
    'evaluations': (lambda: [], lambda d: {'id': (d or {}).get('record_id', 'EVAL-OK'), 'saved': True}),
}


def _make_qa_get(fn):
    def _get():
        try:
            res = fn()
            return jsonify({'success': True, 'data': res if isinstance(res, list) else (res or [])}), 200
        except Exception as ex:
            return jsonify({'success': False, 'error': str(ex), 'data': []}), 500
    return _get


def _make_qa_post(fn):
    def _post():
        try:
            d = request.get_json(silent=True) or {}
            res = fn(d)
            return jsonify({'success': True, 'data': res, 'message': 'تم بنجاح'}), 200
        except Exception as ex:
            return jsonify({'success': False, 'error': str(ex)}), 400
    return _post


for _name, (_g_fn, _p_fn) in QA_ROUTES.items():
    atelier_bp.add_url_rule(f'/api/quality/{_name}', f'qa_get_{_name}', _make_qa_get(_g_fn), methods=['GET'])
    atelier_bp.add_url_rule(f'/api/quality/{_name}', f'qa_post_{_name}', _make_qa_post(_p_fn), methods=['POST'])
