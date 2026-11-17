# routes/products_bp.py
# Products, BOM, Categories & SKU Sequence Blueprint
from flask import Blueprint, request, jsonify
import pg_service

products_bp = Blueprint('products_bp', __name__)


@products_bp.route('/api/products/categories', methods=['GET'])
@products_bp.route('/api/categories', methods=['GET'])
def get_categories():
    """جلب خيارات التصنيف الفني ديناميكياً من قاعدة البيانات"""
    try:
        cats = pg_service.get_product_categories()
        return jsonify({'success': True, 'data': cats, 'categories': cats}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@products_bp.route('/api/products/next-sku', methods=['GET'])
@products_bp.route('/api/sequences/next-sku', methods=['GET'])
def get_next_sku():
    """معاينة حية للكود التسلسلي التالي للموديل بناء على الفئة"""
    try:
        seg = request.args.get('segment') or request.args.get('target_segment') or 'kids'
        cat = request.args.get('category')
        res = pg_service.get_next_product_sku(segment=seg, category=cat)
        return jsonify(res), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@products_bp.route('/api/products', methods=['GET'])
@products_bp.route('/api/bom', methods=['GET'])
@products_bp.route('/api/products/<path:product_id>', methods=['GET'])
def list_products(product_id=None):
    try:
        pid = product_id or request.args.get('id') or request.args.get('sku') or request.args.get('product_id')
        if pid and pid not in ('bom', 'list', 'categories', 'next-sku'):
            prod = pg_service.get_product_by_id(pid)
            if prod: return jsonify({'success': True, 'data': prod}), 200
            return jsonify({'success': False, 'error': 'الموديل غير موجود'}), 404
        bom_data = pg_service.get_bom_models()
        return jsonify({'success': True, 'data': bom_data.get('data', []), 'count': len(bom_data.get('data', [])), 'kpis': bom_data.get('kpis', {})}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@products_bp.route('/api/products', methods=['POST', 'PUT', 'PATCH'])
@products_bp.route('/api/products/<path:product_id>', methods=['POST', 'PUT', 'PATCH'])
def save_product(product_id=None):
    try:
        data = request.get_json(silent=True) or {}
        if product_id and product_id not in ('update', 'bom') and not data.get('id'): data['id'] = product_id
        res = pg_service.save_bom_model(data)
        return jsonify(res), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@products_bp.route('/api/products/delete', methods=['POST'])
def delete_product():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.delete_product(data)
        return jsonify(res), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400
