# services/pg/pg_customer_tracking.py
# Customer order tracking portal queries and fitting confirmations

from .db_pool import get_db_cursor, clean_str, clean_num


def get_customer_order_tracking(order_target):
    """جلب بيانات تتبع فستان الأميرة ومراحل الإنتاج والبروفة لبوابة العميلة track.html"""
    if not order_target:
        return {"error": "رقم الطلب أو الفاتورة مطلوب"}
    target = clean_str(order_target)

    with get_db_cursor(commit=False) as cur:
        cur.execute("""
            SELECT o.*,
                   COALESCE(c.name, '') as real_customer_name,
                   COALESCE(c.phone, '') as customer_phone,
                   COALESCE(c.id, o.customer_id, '') as real_customer_id,
                   COALESCE(p.model_name, po.product_name, 'موديل راقي خاص') as real_product_name,
                   COALESCE(p.image_url, '') as product_image,
                   COALESCE(ch.child_name, po.child_name, 'الأميرة') as real_child_name,
                   COALESCE(ch.age::text, '') as child_age,
                   po.stage as factory_stage,
                   po.progress as factory_progress,
                   po.status as factory_status
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN products p ON o.product_id = p.id
            LEFT JOIN children ch ON o.child_id = ch.id
            LEFT JOIN production_orders po ON po.order_id = o.id OR po.production_order_no = 'PO-' || o.order_no
            WHERE o.id = %s OR o.order_no = %s OR o.order_no = 'ORD-' || %s OR o.id = 'ORD-' || %s
            ORDER BY o.created_at DESC
            LIMIT 1;
        """, (target, target, target, target))
        ord_row = cur.fetchone()

        if not ord_row:
            cur.execute("""
                SELECT po.*,
                       COALESCE(c.name, '') as real_customer_name,
                       COALESCE(c.phone, '') as customer_phone,
                       COALESCE(c.id, o.customer_id, '') as real_customer_id,
                       COALESCE(p.model_name, po.product_name, 'موديل راقي خاص') as real_product_name,
                       COALESCE(p.image_url, '') as product_image,
                       COALESCE(po.child_name, 'الأميرة') as real_child_name,
                       po.stage as factory_stage,
                       po.progress as factory_progress,
                       po.status as factory_status
                FROM production_orders po
                LEFT JOIN orders o ON po.order_id = o.id
                LEFT JOIN customers c ON o.customer_id = c.id
                LEFT JOIN products p ON COALESCE(po.product_id, o.product_id) = p.id
                WHERE po.id = %s OR po.production_order_no = %s OR po.order_id = %s
                LIMIT 1;
            """, (target, target, target))
            ord_row = cur.fetchone()

        if not ord_row:
            return {"error": f"عذراً، لم نتمكن من العثور على طلب برقم: {target}"}

        d = dict(ord_row)
        cust_id = d.get('real_customer_id') or d.get('customer_id')
        child_name = d.get('real_child_name') or d.get('child_name')
        meas = None
        if cust_id:
            if child_name:
                cur.execute("""
                    SELECT * FROM measurements 
                    WHERE customer_id = %s AND (child_name = %s OR child_name ILIKE %s)
                    ORDER BY created_at DESC LIMIT 1;
                """, (cust_id, child_name, f"%{child_name}%"))
                meas = cur.fetchone()
            if not meas:
                cur.execute("""
                    SELECT * FROM measurements 
                    WHERE customer_id = %s 
                    ORDER BY created_at DESC LIMIT 1;
                """, (cust_id,))
                meas = cur.fetchone()

        meas_dict = {}
        if meas:
            m = dict(meas)
            dress_l = clean_num(m.get('dress_len'))
            est_age = ''
            if dress_l > 0:
                if dress_l <= 45: est_age = '1-2 سنوات'
                elif dress_l <= 55: est_age = '2-3 سنوات'
                elif dress_l <= 60: est_age = '4 سنوات'
                elif dress_l <= 65: est_age = '5 سنوات'
                elif dress_l <= 70: est_age = '6 سنوات'
                elif dress_l <= 75: est_age = '7 سنوات'
                elif dress_l <= 80: est_age = '8 سنوات'
                elif dress_l <= 85: est_age = '9 سنوات'
                elif dress_l <= 90: est_age = '10 سنوات'
                elif dress_l <= 95: est_age = '11 سنة'
                elif dress_l <= 100: est_age = '12 سنة'
                else: est_age = 'أكثر من 12 سنة'

            ev_date = str(m.get('date') or '') if m.get('date') else ''
            ms_date = str(m.get('measurement_date') or '') if m.get('measurement_date') else ''

            meas_dict = {
                'dress_length': m.get('dress_len'),
                'chest': m.get('chest_circ'),
                'waist': m.get('waist_circ'),
                'shoulder': m.get('shoulder_w'),
                'sleeve_length': m.get('sleeve_len'),
                'arm_hole': m.get('armpit_circ'),
                'neck': m.get('neck_circ'),
                'notes': m.get('notes'),
                'unit': m.get('unit') or 'سم',
                'comfort_profile': m.get('comfort_profile') or '',
                'event_date': ev_date,
                'meas_date': ms_date,
                'estimated_age': est_age
            }
            if not d.get('delivery_date') and ev_date:
                d['delivery_date'] = ev_date
            if not d.get('order_date') and ms_date:
                d['order_date'] = ms_date
            if not d.get('child_age') and est_age:
                d['child_age'] = est_age
        d['measurements'] = meas_dict

        if d.get('product_id'):
            cur.execute("SELECT bom, image_url FROM products WHERE id = %s;", (str(d.get('product_id')),))
            p_extra = cur.fetchone()
            if p_extra:
                if not d.get('product_image') and p_extra.get('image_url'):
                    d['product_image'] = p_extra.get('image_url')
                p_bom = p_extra.get('bom') or {}
                items = p_bom.get('items', []) if isinstance(p_bom, dict) else []
                f_names = [it.get('fabric_name') for it in items if it.get('fabric_name')]
                if f_names:
                    d['fabric_type'] = " + ".join(f_names)

        tot = clean_num(d.get('total') or d.get('total_amount') or 0.0)
        pd = clean_num(d.get('paid') or d.get('paid_amount') or 0.0)
        cur.execute("""
            SELECT COALESCE(SUM(amount), 0) as paid_vouchers FROM payments
            WHERE (order_id = %s OR order_id = %s OR customer_id = %s)
              AND payment_type = 'Receipt' AND status != 'Cancelled';
        """, (str(d.get('id') or ''), str(d.get('order_no') or ''), str(cust_id or '')))
        pay_row = cur.fetchone()
        pd = max(pd, clean_num(pay_row.get('paid_vouchers') if pay_row else 0.0))
        d['total'] = tot
        d['paid'] = pd
        d['remaining'] = max(0.0, tot - pd)
        d['currency'] = d.get('currency') or 'YER'

        for fld in ['order_date', 'delivery_date', 'start_date', 'due_date', 'created_at', 'updated_at']:
            if d.get(fld):
                d[fld] = str(d[fld])

        raw_stage = d.get('factory_stage') or d.get('stage') or d.get('production_status') or 'القص والتحضير'
        stage_map = {
            'Preparation': 'القص والتحضير ✂️', 'Cutting': 'القص والتحضير ✂️',
            'Sewing': 'الخياطة والتركيب 🪡', 'Embroidery': 'التطريز والشك الملكي ✨',
            'Fitting': 'جاهز للبروفة 👑', 'Quality': 'مراقبة الجودة الملكية 🔍',
            'Finished': 'مكتمل وجاهز للتسليم 🎀', 'Delivered': 'تم التسليم بنجاح 💖',
            'Pending': 'قيد التجهيز ✂️',
        }
        cur_stage = stage_map.get(raw_stage, raw_stage)
        d['current_stage'] = cur_stage

        raw_prog = clean_num(d.get('factory_progress') or d.get('progress') or 0)
        if raw_prog <= 0:
            stage_low = cur_stage.lower()
            if any(w in stage_low for w in ['قص', 'تحضير', 'prep', 'cut']):
                raw_prog = 20
            elif any(w in stage_low for w in ['خياط', 'حياك', 'تركيب', 'sew']):
                raw_prog = 50
            elif any(w in stage_low for w in ['تطريز', 'شك', 'embroidery']):
                raw_prog = 75
            elif any(w in stage_low for w in ['جود', 'فحص', 'تدقيق', 'qc', 'quality']):
                raw_prog = 90
            elif any(w in stage_low for w in ['بروف', 'تسليم', 'مكتمل', 'جاهز', 'fit', 'finish', 'ready']):
                raw_prog = 100
        d['progress'] = int(raw_prog)

        notes_str = str(d.get('notes') or '')
        d['fitting_confirmed'] = 'تم تأكيد موعد البروفة' in notes_str
        return d


def confirm_customer_fitting(order_target, notes=""):
    """تأكيد حضور الأم والطفلة لموعد البروفة من خلال بوابة التتبع"""
    target = clean_str(order_target)
    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            UPDATE orders
            SET notes = COALESCE(notes, '') || ' | ✅ تم تأكيد موعد البروفة من العميلة عبر البوابة الإلكترونية',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s OR order_no = %s OR order_no = 'ORD-' || %s OR id = 'ORD-' || %s
            RETURNING *;
        """, (target, target, target, target))
        row = cur.fetchone()
        if not row:
            cur.execute("""
                UPDATE production_orders
                SET notes = COALESCE(notes, '') || ' | ✅ تم تأكيد موعد البروفة من العميلة عبر البوابة الإلكترونية',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s OR production_order_no = %s OR order_id = %s
                RETURNING *;
            """, (target, target, target))
            row = cur.fetchone()
        return {"success": True, "message": "تم تأكيد موعد البروفة بنجاح! يسعدنا تشريفكم في الموعد المحدد 👑🌸"}
