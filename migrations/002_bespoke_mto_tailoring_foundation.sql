-- Migration 002: Bespoke & MTO Tailoring Foundation (Multi-Segment Size Matrices & CMT Custody)
-- Idempotent & Additive Only: Zero changes to accounting/inventory triggers or existing columns

-- 1. Standard Size Matrices (Women Apparel, Girls Dress, School Uniform)
CREATE TABLE IF NOT EXISTS public.standard_size_matrices (
    id TEXT PRIMARY KEY,
    segment_code TEXT NOT NULL,
    segment_name_ar TEXT NOT NULL,
    size_label TEXT NOT NULL,
    display_unit TEXT DEFAULT 'cm',
    chest_cm NUMERIC(14, 4),
    waist_cm NUMERIC(14, 4),
    hip_cm NUMERIC(14, 4),
    dress_length_cm NUMERIC(14, 4),
    shoulder_cm NUMERIC(14, 4),
    sleeve_cm NUMERIC(14, 4),
    extra_measurements_json JSONB DEFAULT '{}'::jsonb,
    fabric_factor NUMERIC(10, 4) DEFAULT 1.0000,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_size_matrices_segment ON public.standard_size_matrices(segment_code, sort_order);
CREATE INDEX IF NOT EXISTS idx_size_matrices_active ON public.standard_size_matrices(is_active);

ALTER TABLE public.standard_size_matrices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_standard_size_matrices" ON public.standard_size_matrices;
CREATE POLICY "service_role_all_standard_size_matrices" ON public.standard_size_matrices FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "postgres_all_standard_size_matrices" ON public.standard_size_matrices;
CREATE POLICY "postgres_all_standard_size_matrices" ON public.standard_size_matrices FOR ALL TO postgres USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_read_standard_size_matrices" ON public.standard_size_matrices;
CREATE POLICY "authenticated_read_standard_size_matrices" ON public.standard_size_matrices FOR SELECT TO authenticated USING (is_active = true);

-- Seed Reference Size Matrices (Women, Girls, School Uniform)
INSERT INTO public.standard_size_matrices
    (id, segment_code, segment_name_ar, size_label, display_unit, chest_cm, waist_cm, hip_cm, dress_length_cm, shoulder_cm, sleeve_cm, extra_measurements_json, fabric_factor, sort_order, is_active)
VALUES
    -- WOMEN_APPAREL (XS 36 .. XXL 48)
    ('SM-WMN-XS',  'WOMEN_APPAREL',  'ملابس نسائية', 'XS (36)', 'cm',  84.0000,  66.0000,  90.0000, 136.0000, 36.0000, 58.0000, '{"armpit_circ":38,"chest_len":34,"arm_circ":27}'::jsonb, 2.5000, 10, TRUE),
    ('SM-WMN-S',   'WOMEN_APPAREL',  'ملابس نسائية', 'S (38)',  'cm',  88.0000,  70.0000,  94.0000, 138.0000, 37.5000, 59.0000, '{"armpit_circ":40,"chest_len":35,"arm_circ":28}'::jsonb, 2.7500, 20, TRUE),
    ('SM-WMN-M',   'WOMEN_APPAREL',  'ملابس نسائية', 'M (40)',  'cm',  94.0000,  76.0000, 100.0000, 140.0000, 39.0000, 60.0000, '{"armpit_circ":42,"chest_len":36,"arm_circ":30}'::jsonb, 3.0000, 30, TRUE),
    ('SM-WMN-L',   'WOMEN_APPAREL',  'ملابس نسائية', 'L (42)',  'cm', 102.0000,  84.0000, 108.0000, 142.0000, 41.0000, 61.0000, '{"armpit_circ":44,"chest_len":37,"arm_circ":32}'::jsonb, 3.2500, 40, TRUE),
    ('SM-WMN-XL',  'WOMEN_APPAREL',  'ملابس نسائية', 'XL (44)', 'cm', 110.0000,  92.0000, 116.0000, 144.0000, 43.0000, 62.0000, '{"armpit_circ":47,"chest_len":38,"arm_circ":35}'::jsonb, 3.5000, 50, TRUE),
    ('SM-WMN-XXL', 'WOMEN_APPAREL',  'ملابس نسائية', 'XXL (48)','cm', 118.0000, 100.0000, 124.0000, 145.0000, 45.0000, 63.0000, '{"armpit_circ":50,"chest_len":39,"arm_circ":38}'::jsonb, 3.8000, 60, TRUE),
    -- GIRLS_DRESS (2Y .. 13Y)
    ('SM-GRL-02Y', 'GIRLS_DRESS',    'فساتين البنات', '2Y',  'cm', 52.0000, 50.0000, 54.0000,  52.0000, 22.0000, 31.0000, '{"armpit_circ":24,"chest_len":20,"skirt_len":32}'::jsonb, 1.2500, 10, TRUE),
    ('SM-GRL-03Y', 'GIRLS_DRESS',    'فساتين البنات', '3Y',  'cm', 55.0000, 52.0000, 57.0000,  58.0000, 23.0000, 34.0000, '{"armpit_circ":25,"chest_len":21,"skirt_len":37}'::jsonb, 1.4000, 20, TRUE),
    ('SM-GRL-04Y', 'GIRLS_DRESS',    'فساتين البنات', '4Y',  'cm', 58.0000, 54.0000, 60.0000,  63.0000, 24.5000, 36.0000, '{"armpit_circ":26,"chest_len":22,"skirt_len":41}'::jsonb, 1.5000, 30, TRUE),
    ('SM-GRL-05Y', 'GIRLS_DRESS',    'فساتين البنات', '5Y',  'cm', 60.0000, 56.0000, 63.0000,  68.0000, 25.5000, 38.0000, '{"armpit_circ":27,"chest_len":23,"skirt_len":45}'::jsonb, 1.6500, 40, TRUE),
    ('SM-GRL-06Y', 'GIRLS_DRESS',    'فساتين البنات', '6Y',  'cm', 63.0000, 58.0000, 66.0000,  73.0000, 26.5000, 41.0000, '{"armpit_circ":28,"chest_len":24,"skirt_len":49}'::jsonb, 1.8000, 50, TRUE),
    ('SM-GRL-07Y', 'GIRLS_DRESS',    'فساتين البنات', '7Y',  'cm', 66.0000, 60.0000, 69.0000,  78.0000, 28.0000, 43.0000, '{"armpit_circ":29,"chest_len":25,"skirt_len":53}'::jsonb, 1.9500, 60, TRUE),
    ('SM-GRL-08Y', 'GIRLS_DRESS',    'فساتين البنات', '8Y',  'cm', 69.0000, 62.0000, 72.0000,  83.0000, 29.0000, 45.0000, '{"armpit_circ":30,"chest_len":26,"skirt_len":57}'::jsonb, 2.1000, 70, TRUE),
    ('SM-GRL-09Y', 'GIRLS_DRESS',    'فساتين البنات', '9Y',  'cm', 72.0000, 63.0000, 76.0000,  88.0000, 30.5000, 47.0000, '{"armpit_circ":31,"chest_len":27,"skirt_len":61}'::jsonb, 2.2500, 80, TRUE),
    ('SM-GRL-10Y', 'GIRLS_DRESS',    'فساتين البنات', '10Y', 'cm', 75.0000, 65.0000, 80.0000,  93.0000, 32.0000, 49.0000, '{"armpit_circ":32,"chest_len":28,"skirt_len":65}'::jsonb, 2.4000, 90, TRUE),
    ('SM-GRL-11Y', 'GIRLS_DRESS',    'فساتين البنات', '11Y', 'cm', 78.0000, 66.0000, 83.0000,  98.0000, 33.0000, 51.0000, '{"armpit_circ":33,"chest_len":29,"skirt_len":69}'::jsonb, 2.5500, 100, TRUE),
    ('SM-GRL-12Y', 'GIRLS_DRESS',    'فساتين البنات', '12Y', 'cm', 81.0000, 68.0000, 87.0000, 103.0000, 34.5000, 53.0000, '{"armpit_circ":34,"chest_len":30,"skirt_len":73}'::jsonb, 2.7000, 110, TRUE),
    ('SM-GRL-13Y', 'GIRLS_DRESS',    'فساتين البنات', '13Y', 'cm', 84.0000, 70.0000, 90.0000, 108.0000, 35.5000, 55.0000, '{"armpit_circ":35,"chest_len":31,"skirt_len":77}'::jsonb, 2.8500, 120, TRUE),
    -- SCHOOL_UNIFORM (5-6Y .. 17-18Y)
    ('SM-UNI-05', 'SCHOOL_UNIFORM', 'الزي المدرسي', '5-6Y',   'cm', 62.0000, 57.0000, 65.0000,  68.0000, 26.0000, 40.0000, '{"armpit_circ":28,"chest_len":24,"skirt_len":44}'::jsonb, 1.5000, 10, TRUE),
    ('SM-UNI-07', 'SCHOOL_UNIFORM', 'الزي المدرسي', '7-8Y',   'cm', 68.0000, 61.0000, 71.0000,  76.0000, 28.5000, 44.0000, '{"armpit_circ":30,"chest_len":26,"skirt_len":50}'::jsonb, 1.7500, 20, TRUE),
    ('SM-UNI-09', 'SCHOOL_UNIFORM', 'الزي المدرسي', '9-10Y',  'cm', 74.0000, 64.0000, 78.0000,  84.0000, 31.0000, 48.0000, '{"armpit_circ":32,"chest_len":28,"skirt_len":56}'::jsonb, 2.0000, 30, TRUE),
    ('SM-UNI-11', 'SCHOOL_UNIFORM', 'الزي المدرسي', '11-12Y', 'cm', 80.0000, 67.0000, 85.0000,  92.0000, 34.0000, 52.0000, '{"armpit_circ":34,"chest_len":30,"skirt_len":62}'::jsonb, 2.2500, 40, TRUE),
    ('SM-UNI-13', 'SCHOOL_UNIFORM', 'الزي المدرسي', '13-14Y', 'cm', 86.0000, 71.0000, 92.0000, 100.0000, 36.5000, 56.0000, '{"armpit_circ":36,"chest_len":32,"skirt_len":68}'::jsonb, 2.5000, 50, TRUE),
    ('SM-UNI-15', 'SCHOOL_UNIFORM', 'الزي المدرسي', '15-16Y', 'cm', 92.0000, 75.0000, 98.0000, 106.0000, 38.5000, 58.0000, '{"armpit_circ":39,"chest_len":34,"skirt_len":72}'::jsonb, 2.7500, 60, TRUE),
    ('SM-UNI-17', 'SCHOOL_UNIFORM', 'الزي المدرسي', '17-18Y', 'cm', 98.0000, 80.0000, 104.0000, 112.0000, 40.5000, 60.0000, '{"armpit_circ":41,"chest_len":36,"skirt_len":76}'::jsonb, 3.0000, 70, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2. Customer Material Custody (CMT - Zero Accounting Value)
CREATE TABLE IF NOT EXISTS public.customer_material_custody (
    id TEXT PRIMARY KEY,
    custody_no TEXT UNIQUE NOT NULL,
    order_id TEXT,
    order_item_id TEXT,
    production_order_id TEXT,
    customer_id TEXT,
    fabric_description TEXT NOT NULL,
    received_qty NUMERIC(14, 4) NOT NULL,
    unit TEXT DEFAULT 'meter',
    condition_notes TEXT,
    reference_image TEXT,
    leftover_returned_qty NUMERIC(14, 4) DEFAULT 0,
    status TEXT DEFAULT 'RECEIVED',
    received_by TEXT,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cmt_order_id ON public.customer_material_custody(order_id);
CREATE INDEX IF NOT EXISTS idx_cmt_customer_id ON public.customer_material_custody(customer_id);
CREATE INDEX IF NOT EXISTS idx_cmt_prod_order_id ON public.customer_material_custody(production_order_id);
CREATE INDEX IF NOT EXISTS idx_cmt_status ON public.customer_material_custody(status);

ALTER TABLE public.customer_material_custody ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_customer_material_custody" ON public.customer_material_custody;
CREATE POLICY "service_role_all_customer_material_custody" ON public.customer_material_custody FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "postgres_all_customer_material_custody" ON public.customer_material_custody;
CREATE POLICY "postgres_all_customer_material_custody" ON public.customer_material_custody FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Register CMT Sequence (Initial Value = 0)
INSERT INTO public.number_sequences (id, entity, sequence_key, prefix, current_number, padding, description)
VALUES ('SEQ-CMT', 'customer_material_custody', 'CMT', 'CMT-', 0, 6, 'تسلسل عهدة قماش العميل CMT')
ON CONFLICT (sequence_key) DO NOTHING;

-- 3. Non-Destructive Additive Alterations to Existing Tables
ALTER TABLE public.measurements ADD COLUMN IF NOT EXISTS wearer_type TEXT DEFAULT 'DEPENDENT';
ALTER TABLE public.measurements ADD COLUMN IF NOT EXISTS target_segment TEXT DEFAULT 'GIRLS_DRESS';
ALTER TABLE public.measurements ADD COLUMN IF NOT EXISTS hip_circ NUMERIC(10, 4);
ALTER TABLE public.measurements ADD COLUMN IF NOT EXISTS arm_circ NUMERIC(10, 4);
ALTER TABLE public.measurements ADD COLUMN IF NOT EXISTS extra_measurements_json JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fulfillment_mode TEXT DEFAULT 'READY_STOCK';

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS item_mode TEXT DEFAULT 'CATALOG_MTO';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS material_source TEXT DEFAULT 'WORKSHOP_STOCK';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS sizing_mode TEXT DEFAULT 'CUSTOM';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS size_matrix_id TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS size_adjustments_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS custom_design_title TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS standard_size_disclaimer BOOLEAN DEFAULT FALSE;

ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS item_mode TEXT DEFAULT 'CATALOG_MTO';
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS material_source TEXT DEFAULT 'WORKSHOP_STOCK';
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS sizing_mode TEXT DEFAULT 'CUSTOM';
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS size_matrix_id TEXT;
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS size_adjustments_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS custom_design_title TEXT;
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS standard_size_disclaimer BOOLEAN DEFAULT FALSE;
