-- scripts/create_measurement_studio_table.sql
-- Little Princesses ERP - DDL Schema for A4 Homography Studio Sessions

CREATE TABLE IF NOT EXISTS garment_measurements_studio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(64) NULL,
    customer_id VARCHAR(64) NULL REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    image_url TEXT,
    image_storage_path TEXT,
    a4_orientation VARCHAR(16) DEFAULT 'portrait',
    a4_corners JSONB NOT NULL DEFAULT '[]'::jsonb,
    homography_matrix JSONB NOT NULL DEFAULT '[]'::jsonb,
    measurements_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    diagnostics JSONB DEFAULT '{}'::jsonb,
    preferred_unit VARCHAR(8) DEFAULT 'cm',
    status VARCHAR(32) DEFAULT 'draft',
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_studio_meas_order_id ON garment_measurements_studio(order_id);
CREATE INDEX IF NOT EXISTS idx_studio_meas_customer_id ON garment_measurements_studio(customer_id);
CREATE INDEX IF NOT EXISTS idx_studio_meas_status ON garment_measurements_studio(status);
CREATE INDEX IF NOT EXISTS idx_studio_meas_is_deleted ON garment_measurements_studio(is_deleted);
CREATE INDEX IF NOT EXISTS idx_studio_meas_created_at ON garment_measurements_studio(created_at DESC);

-- Trigger for auto-updating updated_at
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_set_updated_at') THEN
        DROP TRIGGER IF EXISTS trg_studio_meas_updated_at ON garment_measurements_studio;
        CREATE TRIGGER trg_studio_meas_updated_at
        BEFORE UPDATE ON garment_measurements_studio
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    END IF;
END $$;

-- Enable Row Level Security and permissive policy for ERP
ALTER TABLE garment_measurements_studio ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'garment_measurements_studio' AND policyname = 'Allow all studio measurements'
    ) THEN
        CREATE POLICY "Allow all studio measurements" ON garment_measurements_studio
        FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
