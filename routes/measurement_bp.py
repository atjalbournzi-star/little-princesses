# routes/measurement_bp.py
# Flask Blueprint for A4 Homography Measurement Studio
# Architecture Standard: Rule 1 & 3 (< 220 lines, atomic error handling)

from flask import Blueprint, request, jsonify
import pg_service

measurement_bp = Blueprint('measurement_bp', __name__)


@measurement_bp.route('/api/measurements/studio/save', methods=['POST'])
@measurement_bp.route('/api/measurements/save', methods=['POST'])
def save_studio_session():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.save_measurement_session(data)
        return jsonify({
            'success': True,
            'data': res,
            'message': 'تم حفظ وتحديث جلسة المعايرة والمقاسات بنجاح 📐'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@measurement_bp.route('/api/measurements/studio/recent', methods=['GET'])
def get_recent_sessions():
    try:
        limit = int(request.args.get('limit', 20))
        res = pg_service.get_recent_measurement_sessions(limit)
        return jsonify({'success': True, 'data': res, 'count': len(res)}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@measurement_bp.route('/api/measurements/studio/<order_id>', methods=['GET'])
def get_session_by_path(order_id):
    try:
        res = pg_service.get_measurement_session_by_order(order_id)
        if res:
            return jsonify({'success': True, 'data': res}), 200
        return jsonify({'success': False, 'error': f'لم يتم العثور على جلسة للطلب: {order_id}', 'data': None}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': None}), 500


@measurement_bp.route('/api/measurements/studio', methods=['GET'])
def get_session_by_query():
    try:
        order_param = request.args.get('order') or request.args.get('order_id') or request.args.get('id')
        if not order_param:
            return jsonify({'success': False, 'error': 'معرف الطلب مطلوب'}), 400
        res = pg_service.get_measurement_session_by_order(order_param)
        if res:
            return jsonify({'success': True, 'data': res}), 200
        return jsonify({'success': False, 'error': 'لم يتم العثور على جلسة', 'data': None}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': None}), 500


@measurement_bp.route('/api/measurements/studio/approve', methods=['POST'])
@measurement_bp.route('/api/measurements/approve', methods=['POST'])
def approve_session():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.approve_measurement_session(data)
        return jsonify({
            'success': True,
            'data': res,
            'message': 'تم اعتماد المقاسات وتمريرها للمعمل بنجاح 🚀'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@measurement_bp.route('/api/measurements/studio/detect-a4-subpixel', methods=['POST'])
def detect_a4_subpixel():
    try:
        import base64
        from domains.tailoring.subpixel_a4_detector import detect_a4_corners_subpixel
        payload = request.get_json(silent=True) or {}
        img_b64 = payload.get('image') or payload.get('image_base64') or ''
        if ',' in img_b64:
            img_b64 = img_b64.split(',', 1)[1]
        raw_bytes = base64.b64decode(img_b64)
        result = detect_a4_corners_subpixel(raw_bytes)
        status = 200 if result.get('success') else 422
        return jsonify(result), status
    except Exception as e:
        return jsonify({'success': False, 'error': f'فشل الكشف بالدقة الفائقة: {str(e)}'}), 500

