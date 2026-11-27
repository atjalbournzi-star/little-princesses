-- Migration 001: Luxury Apparel Ready-to-Wear Products & POS Matrix Upgrade (Additive & Safe)
-- 1. Extend inventory table with ready-product metadata
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS item_type VARCHAR(30) DEFAULT 'raw_material';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS selling_price NUMERIC(18, 4) DEFAULT 0.0000;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS style_code VARCHAR(100);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS season_collection VARCHAR(120);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS care_notes TEXT;

UPDATE public.inventory
SET item_type = CASE
    WHEN LOWER(COALESCE(category, '')) LIKE '%فساتين%' OR LOWER(COALESCE(category, '')) LIKE '%جاهز%' OR LOWER(COALESCE(type, '')) IN ('product', 'finished_product', 'dress')
    THEN 'finished_product'
    ELSE 'raw_material'
END
WHERE item_type IS NULL;

-- 2. Create product_variants table with strict stock_qty >= 0 guard, indexes, and RLS
CREATE TABLE IF NOT EXISTS public.product_variants (
    id VARCHAR(64) PRIMARY KEY,
    inventory_id VARCHAR(64) NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
    warehouse_id VARCHAR(64) REFERENCES public.warehouses(id) ON DELETE SET NULL,
    age_size VARCHAR(50) NOT NULL,
    color_name VARCHAR(80),
    color_hex VARCHAR(20),
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    cost_price NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    selling_price NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    stock_qty NUMERIC(14, 4) NOT NULL DEFAULT 0.0000 CHECK (stock_qty >= 0),
    min_stock NUMERIC(14, 4) NOT NULL DEFAULT 1.0000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_barcode ON public.product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_product_variants_inventory_id ON public.product_variants(inventory_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_warehouse_id ON public.product_variants(warehouse_id);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_product_variants" ON public.product_variants;
CREATE POLICY "service_role_all_product_variants" ON public.product_variants FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "postgres_all_product_variants" ON public.product_variants;
CREATE POLICY "postgres_all_product_variants" ON public.product_variants FOR ALL TO postgres USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_active_product_variants" ON public.product_variants;
CREATE POLICY "anon_read_active_product_variants" ON public.product_variants FOR SELECT TO anon USING (is_active = true);

-- 3. Link order_items, inventory_transactions, stock_movements, and orders to variants & POS options
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id VARCHAR(64);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS age_size VARCHAR(50);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS color_name VARCHAR(80);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(18, 4) DEFAULT 0.0000;

ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS variant_id VARCHAR(64);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gift_wrap BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gift_wrap_fee NUMERIC(18, 4) DEFAULT 0.0000;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS split_payment_details JSONB DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS exchange_ref_order_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_inv_txns_variant_id ON public.inventory_transactions(variant_id);
