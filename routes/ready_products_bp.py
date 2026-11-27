# routes/ready_products_bp.py
# Ready-to-Wear Apparel, Local Image Upload, POS Catalog, Barcode Lookup & Size Exchange

import os
import uuid
from flask import Blueprint, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import pg_service
from services.security import (
    idempotent_op, require_roles, ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_WORKSHOP_MANAGER, translate_shield_error
)

ready_products_bp = Blueprint('ready_products_bp', __name__)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
UPLOAD_SUBDIR = os.path.join('static', 'uploads', 'products')
UPLOAD_ABS_DIR = os.path.join(ROOT_DIR, UPLOAD_SUBDIR)
ALLOWED_EXTENSIONS = {'.webp', '.jpg', '.jpeg', '.png'}
MAX_IMAGE_BYTES = 2 * 1024 * 1024  # 2 MB


def _is_valid_image_magic(data: bytes, ext: str) -> bool:
    if not data or len(data) < 12:
        return False
    if ext == '.png':
        return data.startswith(b'\x89PNG\r\n\x1a\n')
    if ext in ('.jpg', '.jpeg'):
        return data.startswith(b'\xff\xd8\xff')
    if ext == '.webp':
        return data[:4] == b'RIFF' and data[8:12] == b'WEBP'
    return False


@ready_products_bp.route('/api/uploads/product-image', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_WORKSHOP_MANAGER)
def upload_product_image():
    try:
        file_obj = request.files.get('image') or request.files.get('file')
        if not file_obj or not file_obj.filename:
            return jsonify({'success': False, 'error': 'لم يتم إرفاق ملف صورة صالح'}), 400

        safe_orig = secure_filename(file_obj.filename)
        ext = os.path.splitext(safe_orig)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return jsonify({'success': False, 'error': 'صيغة الصورة غير مدعومة (المسموح: WebP, JPG, PNG)'}), 400

        file_bytes = file_obj.read(MAX_IMAGE_BYTES + 1)
        if not file_bytes:
            return jsonify({'success': False, 'error': 'ملف الصورة فارغ'}), 400
        if len(file_bytes) > MAX_IMAGE_BYTES:
            return jsonify({'success': False, 'error': 'حجم الصورة يتجاوز الحد المسموح (2 ميجابايت)'}), 400
        if not _is_valid_image_magic(file_bytes, ext):
            return jsonify({'success': False, 'error': 'محتوى الملف لا يطابق توقيع صورة صالحة (Magic Bytes)'}), 400

        os.makedirs(UPLOAD_ABS_DIR, exist_ok=True)
        fname = f"dress_{uuid.uuid4().hex[:12]}{ext}"
        fpath = os.path.join(UPLOAD_ABS_DIR, fname)
        with open(fpath, 'wb') as f_out:
            f_out.write(file_bytes)

        return jsonify({'success': True, 'url': f"/static/uploads/products/{fname}"}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code


@ready_products_bp.route('/static/uploads/products/<path:filename>', methods=['GET'])
def serve_product_upload(filename):
    return send_from_directory(UPLOAD_ABS_DIR, filename)


@ready_products_bp.route('/api/inventory/ready-products', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_WORKSHOP_MANAGER)
@idempotent_op('ready_product_create')
def create_ready_product_route():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.create_ready_product_with_variants(data)
        return jsonify({'success': True, 'data': res, 'message': res.get('message')}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code


@ready_products_bp.route('/api/pos/catalog', methods=['GET'])
def get_pos_catalog_route():
    try:
        data = pg_service.get_pos_catalog(request.args.to_dict())
        return jsonify({'success': True, 'data': data, 'count': len(data)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg, 'data': []}), code


@ready_products_bp.route('/api/pos/barcode/<path:barcode>', methods=['GET'])
def lookup_pos_barcode_route(barcode):
    try:
        item = pg_service.lookup_pos_barcode(barcode)
        if not item:
            return jsonify({'success': False, 'error': f'لم يتم العثور على مقاس بالباركود: {barcode}'}), 404
        return jsonify({'success': True, 'data': item}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code


@ready_products_bp.route('/api/pos/orders/<path:order_ref>/items', methods=['GET'])
def get_pos_order_items_route(order_ref):
    try:
        items = pg_service.get_pos_order_items(order_ref)
        return jsonify({'success': True, 'data': items, 'count': len(items)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg, 'data': []}), code


@ready_products_bp.route('/api/pos/exchange-size', methods=['POST'])
@idempotent_op('pos_exchange_size')
def exchange_pos_size_route():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.exchange_pos_size_atomic(data)
        return jsonify({'success': True, 'data': res, 'message': res.get('message')}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code


@ready_products_bp.route('/api/pos/orders/<path:order_id>/return', methods=['POST'])
@idempotent_op('pos_order_return')
def return_pos_order_route(order_id):
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.return_pos_order_atomic(order_id, data)
        return jsonify({'success': True, 'data': res, 'message': res.get('message')}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code
