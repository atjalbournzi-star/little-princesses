# domains/quality/routes_actions.py
# Quality evaluations, inspections, and defects POST HTTP routes

import json
import time
import pg_service
from domains.system.db_connection import get_db
from domains.quality.db_init import sync_quality_to_gas_async


def handle_post(handler, path, parsed_url) -> bool:
    if path == '/api/quality/evaluations':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            d = json.loads(post_data.decode('utf-8'))
            conn = get_db()
            c = conn.cursor()
            rec_id = d.get('record_id') or ('EVAL-' + str(int(time.time() * 1000)))
            score = float(d.get('score', 5.0))
            max_score = float(d.get('max_score', 5.0))
            pct = round((score / max_score * 100), 1) if max_score > 0 else 100.0
            c.execute('''
                INSERT INTO quality_master_evaluations (
                    record_id, record_date, evaluation_type, entity_type, entity_id, entity_name,
                    department, related_product_id, related_order_id, related_production_order_id,
                    related_customer_id, related_supplier_id, related_material_id, related_employee_id,
                    model_id, sku, color, size, fabric_id, production_stage, quality_criteria,
                    metric_code, score, max_score, percentage, status, severity, issue_type,
                    defect_type, comment, evidence_url, root_cause, corrective_action, responsible_id,
                    due_date, resolution_date, cost, source_module, source_record_id, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                rec_id, d.get('record_date', ''), d.get('evaluation_type', 'Customer'), d.get('entity_type', 'Product'),
                d.get('entity_id', ''), d.get('entity_name', ''), d.get('department', 'الإنتاج'),
                d.get('related_product_id', d.get('product_id', '')), d.get('related_order_id', d.get('order_id', '')),
                d.get('related_production_order_id', d.get('production_order_id', '')),
                d.get('related_customer_id', d.get('customer_id', '')),
                d.get('related_supplier_id', d.get('supplier_id', '')),
                d.get('related_material_id', d.get('material_id', '')),
                d.get('related_employee_id', d.get('employee_id', '')),
                d.get('model_id', ''), d.get('sku', ''), d.get('color', ''), d.get('size', ''),
                d.get('fabric_id', ''), d.get('production_stage', 'الفحص النهائي'),
                d.get('quality_criteria', 'معايير الجودة العامة'), d.get('metric_code', 'OQS'),
                score, max_score, pct, d.get('status', 'Active'), d.get('severity', 'Low'),
                d.get('issue_type', 'None'), d.get('defect_type', ''), d.get('comment', ''),
                d.get('evidence_url', ''), d.get('root_cause', ''), d.get('corrective_action', ''),
                d.get('responsible_id', ''), d.get('due_date', ''), d.get('resolution_date', ''),
                float(d.get('cost', 0)), d.get('source_module', 'Quality'), d.get('source_record_id', ''),
                d.get('created_by', 'مفتش الجودة')
            ))
            conn.commit()
            conn.close()

            sync_quality_to_gas_async('addQualityEvaluation', d)

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'تم تسجيل التقييم في سجل الجودة بنجاح', 'id': rec_id}, ensure_ascii=False).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    if path == '/api/quality/inspections':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            d = json.loads(post_data.decode('utf-8'))
            res = pg_service.add_quality_inspection(d)
            sync_quality_to_gas_async('addQualityInspection', d)

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'تم تسجيل فحص الجودة في سوبابيز بنجاح', 'id': res.get('id'), 'data': res}, ensure_ascii=False, default=str).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    if path == '/api/quality/defects':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            d = json.loads(post_data.decode('utf-8'))
            res = pg_service.add_quality_defect(d)
            sync_quality_to_gas_async('addQualityDefect', d)

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'تم تسجيل عيب الجودة في سوبابيز بنجاح', 'id': res.get('id'), 'data': res}, ensure_ascii=False, default=str).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    return False
